import {
  CcaEncodedVariable,
  CcaLink,
  CcaResults,
} from './cca-inspector.types';

export interface CurrentEdgeExport {
  link: CcaLink;
  encoded_variable_info: Record<string, CcaEncodedVariable>;
}

export const CCA_CSV_HEADERS = [
  'source_group',
  'target_group',
  'pair_index',
  'pair_correlation',
  'variable_group',
  'encoded_variable_name',
  'original_variable',
  'original_category_or_bin',
  'loading',
] as const;

/** Payload used by “Current edge” downloads. */
export function currentEdgeExport(
  link: CcaLink,
  encodedInfo: Record<string, CcaEncodedVariable> | null | undefined
): CurrentEdgeExport {
  return {
    link,
    encoded_variable_info: encodedInfo ?? {},
  };
}

/** Payload used by “All results” downloads. */
export function allResultsExport(results: CcaResults): CcaResults {
  return results;
}

export function toCcaJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function toCcaCsv(
  links: CcaLink[],
  encodedInfo: Record<string, CcaEncodedVariable> | null | undefined
): string {
  const rows: string[] = [CCA_CSV_HEADERS.join(',')];
  const info = encodedInfo ?? {};

  for (const link of links ?? []) {
    link.canonical_pairs?.forEach((pair, pairIndex) => {
      appendLoadings(
        rows,
        link,
        pairIndex,
        pair.correlation,
        'source',
        pair.source_loadings,
        info
      );
      appendLoadings(
        rows,
        link,
        pairIndex,
        pair.correlation,
        'target',
        pair.target_loadings,
        info
      );
    });
  }

  return rows.join('\n');
}

export function currentEdgeCsv(
  link: CcaLink,
  encodedInfo: Record<string, CcaEncodedVariable> | null | undefined
): string {
  return toCcaCsv([link], encodedInfo);
}

export function allResultsCsv(results: CcaResults): string {
  return toCcaCsv(results.links ?? [], results.encoded_variable_info);
}

function appendLoadings(
  rows: string[],
  link: CcaLink,
  pairIndex: number,
  correlation: number,
  variableGroup: 'source' | 'target',
  loadings: Record<string, number>,
  encodedInfo: Record<string, CcaEncodedVariable>
): void {
  for (const [encodedName, value] of Object.entries(loadings ?? {})) {
    const info = encodedInfo[encodedName];
    rows.push([
      link.source_group,
      link.target_group,
      pairIndex + 1,
      correlation,
      variableGroup,
      encodedName,
      info?.original_variable ?? 'N/A',
      info?.original_category ?? info?.bin_range ?? 'N/A',
      value,
    ].map(csvCell).join(','));
  }
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}
