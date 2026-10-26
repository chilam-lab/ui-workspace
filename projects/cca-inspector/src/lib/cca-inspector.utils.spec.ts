import {
  buildLoadings,
  correlationColor,
  formatVariance,
  getSignificance,
  loadingLabel,
  sanitizeFilePart,
} from './cca-inspector.utils';

describe('CCA inspector utilities', () => {
  it('prefers the permutation p-value when present', () => {
    const significance = getSignificance({
      correlation: 0.7,
      source_loadings: {},
      target_loadings: {},
      p_value: 0.03,
      permutation_p_value: 0.0005,
    });

    expect(significance?.kind).toBe('permutation');
    expect(significance?.display).toBe('< 0.001');
    expect(significance?.weak).toBeFalse();
  });

  it('falls back to the Bartlett p-value and flags weak evidence', () => {
    const significance = getSignificance({
      correlation: 0.4,
      source_loadings: {},
      target_loadings: {},
      p_value: 0.08,
    });

    expect(significance?.kind).toBe('bartlett');
    expect(significance?.display).toBe('0.080');
    expect(significance?.weak).toBeTrue();
  });

  it('returns null when no p-value exists', () => {
    expect(
      getSignificance({
        correlation: 0.4,
        source_loadings: {},
        target_loadings: {},
      })
    ).toBeNull();
  });

  it('sorts loadings by absolute magnitude and resolves labels', () => {
    const items = buildLoadings(
      { small: 0.2, largeNegative: -0.9, category: 0.5 },
      {
        small: { original_variable: 'IMC', bin_range: '[18, 24]' },
        largeNegative: { original_variable: 'Edad', bin_range: '(40, 50]' },
        category: { original_variable: 'Actividad física', original_category: 'Baja' },
      }
    );

    expect(items.map((item) => item.encodedName)).toEqual([
      'largeNegative',
      'category',
      'small',
    ]);
    expect(items[0].label).toBe('Edad (40, 50]');
    expect(items[1].label).toBe('Actividad física (Baja)');
    expect(items[2].label).toBe('IMC [18, 24]');
  });

  it('falls back to the encoded name when metadata is missing', () => {
    expect(loadingLabel('x.q1', undefined)).toBe('x.q1');
  });

  it('formats variance as one-decimal percentages', () => {
    expect(formatVariance(0.3456)).toBe('34.6');
    expect(formatVariance(null)).toBeNull();
  });

  it('produces a progressively weaker green for larger correlations', () => {
    const high = correlationColor(1);
    const low = correlationColor(0);
    expect(high).toBe('hsl(120, 70%, 75%)');
    expect(low).toBe('hsl(120, 70%, 95%)');
  });

  it('sanitises download file names', () => {
    expect(sanitizeFilePart('Antropometría / Estilo de vida')).toBe(
      'Antropometr_a_Estilo_de_vida'
    );
    expect(sanitizeFilePart('   ')).toBe('cca');
  });
});
