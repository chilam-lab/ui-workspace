/** Metadata for one encoded/binned column used by CCA. */
export interface CcaEncodedVariable {
  original_variable?: string;
  original_category?: string | number | null;
  bin_range?: string | null;
  label?: string;
  subcategory?: string;
  value_description?: string;
  [key: string]: unknown;
}

/** One canonical pair produced by the DyAna CCA service. */
export interface CcaCanonicalPair {
  correlation: number;
  source_loadings: Record<string, number>;
  target_loadings: Record<string, number>;
  p_value?: number | null;
  permutation_p_value?: number | null;
  source_variance_explained?: number | null;
  target_variance_explained?: number | null;
}

/** One group-to-group CCA link. */
export interface CcaLink {
  source_group: string;
  target_group: string;
  primary_correlation: number;
  canonical_pairs: CcaCanonicalPair[];
  n_samples?: number | null;
  source_rank?: number | null;
  target_rank?: number | null;
  overfit_risk?: boolean;
}

/** Full response returned by `POST /cca-service/canonical-correlation`. */
export interface CcaResults {
  links: CcaLink[];
  encoded_variable_info?: Record<string, CcaEncodedVariable>;
  diagnostics?: Record<string, unknown> | null;
}

/** A loadings bar ready for rendering. */
export interface CcaLoadingItem {
  encodedName: string;
  label: string;
  value: number;
}

/** Significance information for one canonical pair. */
export interface CcaSignificance {
  /** `permutation` when a permutation p-value exists, otherwise `bartlett`. */
  kind: 'permutation' | 'bartlett';
  value: number;
  display: string;
  weak: boolean;
}

export type CcaDownloadScope = 'current' | 'all';
export type CcaDownloadFormat = 'json' | 'csv';
