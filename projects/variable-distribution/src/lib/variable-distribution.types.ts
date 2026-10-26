export type VariableDistributionPlotType = 'kde' | 'histogram' | 'bar';

export interface VariableInfo {
  variable_type?: string;
  var_alias?: string;
  values?: { options?: Record<string, string> } | Record<string, string>;
  binning?: {
    params?: { edges?: number[]; n?: number };
    bin_definitions?: Record<string, unknown>;
  };
  treat_as_binned?: boolean;
  [key: string]: unknown;
}

export interface VariableContextEntry {
  original_variable?: string;
  original_category?: string | number;
  bin_range?: string | null;
  label?: string;
  value_description?: string;
  [key: string]: unknown;
}

export type VariableContext = Record<string, VariableContextEntry>;

export interface VariableDistributionVariable {
  name: string;
  label: string;
  info: VariableInfo;
}

export interface VariableSummaryPlotOptions {
  plot_type: VariableDistributionPlotType;
  hist_bins: number;
}

export interface VariableSummaryRequest {
  dataset_identifier: string;
  variable_name: string;
  variable_info: VariableInfo;
  plot_options: VariableSummaryPlotOptions;
}

export interface BarPlotData {
  labels: string[];
  values: number[];
  codes?: string[];
}

export interface HistogramPlotData {
  labels: number[];
  values: number[];
}

export interface KdePlotData {
  x: number[];
  y: number[];
}

export interface VariableSummaryResponse {
  plot_type: 'bar' | 'histogram' | 'kde';
  plot_data: BarPlotData | HistogramPlotData | KdePlotData;
  sample?: Array<number | string>;
  unique_values?: Array<number | string> | null;
}

export interface DistributionChartModel {
  kind: 'bar' | 'histogram' | 'kde';
  labels: string[];
  values: number[];
  points?: Array<{ x: number; y: number }>;
  samplePoints?: Array<{ x: number; y: number }>;
}

export function isBarPlotData(data: VariableSummaryResponse['plot_data']): data is BarPlotData {
  return Array.isArray((data as BarPlotData).labels)
    && Array.isArray((data as BarPlotData).values)
    && typeof (data as BarPlotData).labels[0] === 'string';
}

export function isHistogramPlotData(
  data: VariableSummaryResponse['plot_data']
): data is HistogramPlotData {
  return Array.isArray((data as HistogramPlotData).labels)
    && Array.isArray((data as HistogramPlotData).values)
    && typeof (data as HistogramPlotData).labels[0] === 'number';
}

export function isKdePlotData(data: VariableSummaryResponse['plot_data']): data is KdePlotData {
  return Array.isArray((data as KdePlotData).x) && Array.isArray((data as KdePlotData).y);
}
