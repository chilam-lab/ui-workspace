import {
  CCA_CSV_HEADERS,
  allResultsCsv,
  allResultsExport,
  currentEdgeCsv,
  currentEdgeExport,
  toCcaCsv,
  toCcaJson,
} from './cca-export';
import { CcaResults } from './cca-inspector.types';

const results: CcaResults = {
  links: [
    {
      source_group: 'Antropometría',
      target_group: 'Estilo de vida',
      primary_correlation: 0.72,
      n_samples: 4200,
      source_rank: 8,
      target_rank: 6,
      canonical_pairs: [
        {
          correlation: 0.72,
          source_loadings: { 'imc.q2': 0.81, 'imc.q1': -0.42 },
          target_loadings: { 'actividad.q1': -0.77 },
        },
      ],
    },
    {
      source_group: 'Antropometría',
      target_group: 'Metabólico',
      primary_correlation: 0.64,
      canonical_pairs: [
        {
          correlation: 0.64,
          source_loadings: { 'imc.q3': 0.55 },
          target_loadings: { 'glucosa.q2': 0.69 },
        },
      ],
    },
  ],
  encoded_variable_info: {
    'imc.q2': { original_variable: 'IMC', bin_range: '(24, 29]' },
    'imc.q1': { original_variable: 'IMC', bin_range: '[18, 24]' },
    'actividad.q1': { original_variable: 'Actividad, física', original_category: 'Baja' },
    'imc.q3': { original_variable: 'IMC', bin_range: '(29, 35]' },
    'glucosa.q2': { original_variable: 'Glucosa', bin_range: '(100, 126]' },
  },
};

describe('CCA export helpers', () => {
  it('builds the current-edge payload with encoded information', () => {
    const encodedInfo = results.encoded_variable_info!;
    const payload = currentEdgeExport(results.links[0], encodedInfo);

    expect(payload.link).toBe(results.links[0]);
    expect(payload.encoded_variable_info).toBe(encodedInfo);
  });

  it('falls back to an empty encoded-info object', () => {
    expect(currentEdgeExport(results.links[0], null).encoded_variable_info).toEqual({});
  });

  it('returns the full results payload', () => {
    expect(allResultsExport(results)).toBe(results);
  });

  it('serialises JSON with indentation', () => {
    const json = toCcaJson({ a: 1 });
    expect(json).toContain('\n');
    expect(JSON.parse(json)).toEqual({ a: 1 });
  });

  it('writes the legacy CSV columns for a current edge', () => {
    const csv = currentEdgeCsv(results.links[0], results.encoded_variable_info);
    const lines = csv.split('\n');

    expect(lines[0]).toBe(CCA_CSV_HEADERS.join(','));
    expect(lines.length).toBe(4); // header + 2 source + 1 target
    expect(lines[1]).toContain('"Antropometría"');
    expect(lines[1]).toContain('"source"');
    expect(lines[1]).toContain('"imc.q2"');
    expect(lines[1]).toContain('"IMC"');
    expect(lines[1]).toContain('"(24, 29]"');
    expect(lines[1]).toContain('"0.81"');
  });

  it('escapes quotes and commas in CSV cells', () => {
    const csv = currentEdgeCsv(results.links[0], results.encoded_variable_info);
    expect(csv).toContain('"Actividad, física"');
    expect(csv).toContain('"Baja"');
  });

  it('writes every link for the all-results CSV', () => {
    const csv = allResultsCsv(results);
    const lines = csv.split('\n');

    expect(lines.length).toBe(6); // header + 3 from link 1 + 2 from link 2
    expect(csv).toContain('"Metabólico"');
    expect(csv).toContain('"glucosa.q2"');
  });

  it('allows callers to pass a subset of links', () => {
    const csv = toCcaCsv([results.links[1]], results.encoded_variable_info);
    expect(csv).not.toContain('"Estilo de vida"');
    expect(csv).toContain('"Metabólico"');
  });
});
