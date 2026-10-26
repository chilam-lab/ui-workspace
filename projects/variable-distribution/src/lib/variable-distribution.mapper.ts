import {
  BarPlotData,
  DistributionChartModel,
  HistogramPlotData,
  KdePlotData,
  VariableSummaryResponse,
  isKdePlotData,
} from './variable-distribution.types';

export interface DistributionMapperOptions {
  showPoints?: boolean;
  formatNumber?: (value: number) => string;
}

/**
 * Converts the backend payload into the small model the Chart.js wrapper reads.
 * Kept pure so it can be tested without Angular or a browser canvas.
 */
export function toDistributionChartModel(
  response: VariableSummaryResponse | null | undefined,
  options: DistributionMapperOptions = {}
): DistributionChartModel | null {
  if (!response || !response.plot_data) return null;

  switch (response.plot_type) {
    case 'bar':
      return barModel(response.plot_data as BarPlotData);
    case 'histogram':
      return histogramModel(
        response.plot_data as HistogramPlotData,
        options.formatNumber ?? formatDistributionNumber
      );
    case 'kde':
      return isKdePlotData(response.plot_data)
        ? kdeModel(response.plot_data, response.sample, options.showPoints ?? true)
        : null;
    default:
      return null;
  }
}

function barModel(data: BarPlotData): DistributionChartModel | null {
  const labels = Array.isArray(data.labels) && data.labels.length
    ? data.labels
    : (data.codes ?? []);

  if (!labels.length || !Array.isArray(data.values) || !data.values.length) {
    return null;
  }

  const count = Math.min(labels.length, data.values.length);

  return {
    kind: 'bar',
    labels: labels.slice(0, count).map(String),
    values: data.values.slice(0, count).map(Number),
  };
}

function histogramModel(
  data: HistogramPlotData,
  format: (value: number) => string
): DistributionChartModel | null {
  const edges = Array.isArray(data.labels) ? data.labels.map(Number) : [];
  const counts = Array.isArray(data.values) ? data.values.map(Number) : [];

  if (!counts.length || !edges.length) return null;

  const hasEdges = edges.length === counts.length + 1;
  const labels = counts.map((_, index) => {
    if (!hasEdges) return format(edges[index]);
    const start = edges[index];
    const end = edges[index + 1];
    return `${format(start)} – ${format(end)}`;
  });

  return {
    kind: 'histogram',
    labels,
    values: counts,
  };
}

function kdeModel(
  data: KdePlotData,
  sample: Array<number | string> | undefined,
  showPoints: boolean
): DistributionChartModel | null {
  const count = Math.min(data.x?.length ?? 0, data.y?.length ?? 0);
  if (!count) return null;

  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < count; i++) {
    const x = Number(data.x[i]);
    const y = Number(data.y[i]);
    if (Number.isFinite(x) && Number.isFinite(y)) points.push({ x, y });
  }

  if (!points.length) return null;

  const samplePoints = showPoints
    ? buildSamplePoints(sample, points)
    : undefined;

  return {
    kind: 'kde',
    labels: [],
    values: [],
    points,
    samplePoints,
  };
}

function buildSamplePoints(
  sample: Array<number | string> | undefined,
  curve: Array<{ x: number; y: number }>
): Array<{ x: number; y: number }> | undefined {
  if (!sample?.length) return undefined;

  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < sample.length; i++) {
    const x = Number(sample[i]);
    if (!Number.isFinite(x)) continue;
    const curveY = interpolateY(curve, x);
    // Deterministic jitter keeps the rug stable across redraws.
    const jitter = 0.08 + (Math.abs(Math.sin((i + 1) * 12.9898) * 43758.5453) % 1) * 0.8;
    points.push({ x, y: curveY * jitter });
  }
  return points.length ? points : undefined;
}

function interpolateY(
  curve: Array<{ x: number; y: number }>,
  value: number
): number {
  if (value <= curve[0].x) return curve[0].y;
  const last = curve[curve.length - 1];
  if (value >= last.x) return last.y;

  for (let i = 0; i < curve.length - 1; i++) {
    const left = curve[i];
    const right = curve[i + 1];
    if (value >= left.x && value <= right.x) {
      const span = right.x - left.x;
      if (span === 0) return left.y;
      return left.y + ((value - left.x) * (right.y - left.y)) / span;
    }
  }
  return 0;
}

export function formatDistributionNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs !== 0 && (abs >= 1000 || abs < 0.01)) {
    return value.toExponential(2);
  }
  const digits = abs < 1 ? 3 : 2;
  return Number(value.toFixed(digits)).toString();
}
