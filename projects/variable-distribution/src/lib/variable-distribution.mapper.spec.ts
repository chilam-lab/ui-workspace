import {
  toDistributionChartModel,
  formatDistributionNumber,
} from './variable-distribution.mapper';
import { VariableSummaryResponse } from './variable-distribution.types';

describe('toDistributionChartModel', () => {
  it('maps a bar response using the backend-provided labels', () => {
    const response: VariableSummaryResponse = {
      plot_type: 'bar',
      plot_data: {
        labels: ['Femenino (2)', 'Masculino (1)'],
        codes: ['2', '1'],
        values: [53, 47],
      },
    };

    const model = toDistributionChartModel(response);

    expect(model?.kind).toBe('bar');
    expect(model?.labels).toEqual(['Femenino (2)', 'Masculino (1)']);
    expect(model?.values).toEqual([53, 47]);
  });

  it('maps histogram edges into readable bin labels', () => {
    const response: VariableSummaryResponse = {
      plot_type: 'histogram',
      plot_data: {
        labels: [0, 10, 20],
        values: [4, 7],
      },
    };

    const model = toDistributionChartModel(response);

    expect(model?.kind).toBe('histogram');
    expect(model?.labels).toEqual(['0 – 10', '10 – 20']);
    expect(model?.values).toEqual([4, 7]);
  });

  it('maps a KDE response to points and adds a sample rug', () => {
    const response: VariableSummaryResponse = {
      plot_type: 'kde',
      plot_data: {
        x: [0, 1, 2],
        y: [0, 1, 0],
      },
      sample: [0.5, 1.5],
    };

    const model = toDistributionChartModel(response, { showPoints: true });

    expect(model?.kind).toBe('kde');
    expect(model?.points).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 0 },
    ]);
    expect(model?.samplePoints?.length).toBe(2);
    expect(model?.samplePoints?.[0].x).toBe(0.5);
  });

  it('omits the sample rug when showPoints is false', () => {
    const model = toDistributionChartModel(
      {
        plot_type: 'kde',
        plot_data: { x: [0, 1], y: [0, 1] },
        sample: [0.5],
      },
      { showPoints: false }
    );

    expect(model?.samplePoints).toBeUndefined();
  });

  it('returns null for an empty response', () => {
    expect(toDistributionChartModel(null)).toBeNull();
  });

  it('formats numeric labels', () => {
    expect(formatDistributionNumber(10)).toBe('10');
    expect(formatDistributionNumber(10.123)).toBe('10.12');
    expect(formatDistributionNumber(0.001)).toBe('1.00e-3');
  });
});
