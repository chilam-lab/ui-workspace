import {
  CcaCanonicalPair,
  CcaEncodedVariable,
  CcaLoadingItem,
  CcaSignificance,
} from './cca-inspector.types';

/** Significance label logic shared by the inspector and its tests. */
export function getSignificance(
  pair: CcaCanonicalPair
): CcaSignificance | null {
  const hasPermutation =
    pair.permutation_p_value !== null && pair.permutation_p_value !== undefined;
  const value = hasPermutation ? pair.permutation_p_value : pair.p_value;

  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  return {
    kind: hasPermutation ? 'permutation' : 'bartlett',
    value,
    display: value < 0.001 ? '< 0.001' : value.toFixed(3),
    weak: value > 0.05,
  };
}

/** Build loadings sorted by absolute magnitude, highest first. */
export function buildLoadings(
  loadings: Record<string, number>,
  encodedInfo: Record<string, CcaEncodedVariable> | null | undefined
): CcaLoadingItem[] {
  return Object.entries(loadings ?? {})
    .map(([encodedName, value]) => ({
      encodedName,
      label: loadingLabel(encodedName, encodedInfo?.[encodedName]),
      value: Number(value),
    }))
    .filter((item) => Number.isFinite(item.value))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
}

/** Human label for one encoded column, matching the legacy inspector. */
export function loadingLabel(
  encodedName: string,
  info: CcaEncodedVariable | undefined
): string {
  if (!info) return encodedName;

  const base = info.original_variable ?? info.label ?? encodedName;

  if (
    info.original_category !== null &&
    info.original_category !== undefined &&
    info.original_category !== ''
  ) {
    return `${base} (${info.original_category})`;
  }

  if (info.bin_range) {
    return `${base} ${info.bin_range}`;
  }

  return base;
}

/** Soft green background for a canonical pair header. */
export function correlationColor(correlation: number): string {
  const abs = Math.min(1, Math.abs(Number.isFinite(correlation) ? correlation : 0));
  const lightness = 95 - abs * 20;
  return `hsl(120, 70%, ${lightness}%)`;
}

export function formatVariance(percent: number | null | undefined): string | null {
  if (percent === null || percent === undefined || !Number.isFinite(percent)) {
    return null;
  }
  return (percent * 100).toFixed(1);
}

export function sanitizeFilePart(value: string): string {
  return (value || 'cca')
    .trim()
    .replace(/[^\w.-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'cca';
}
