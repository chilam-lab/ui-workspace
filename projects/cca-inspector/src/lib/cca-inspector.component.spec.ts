import { TestBed } from '@angular/core/testing';

import { CcaInspectorComponent } from './cca-inspector.component';
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
    'actividad.q1': { original_variable: 'Actividad física', original_category: 'Baja' },
    'imc.q3': { original_variable: 'IMC', bin_range: '(29, 35]' },
    'glucosa.q2': { original_variable: 'Glucosa', bin_range: '(100, 126]' },
  },
};

describe('CcaInspectorComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CcaInspectorComponent],
    }).compileComponents();
  });

  it('shows an empty state when there are no results', () => {
    const fixture = TestBed.createComponent(CcaInspectorComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.cca-empty')).toBeTruthy();
  });

  it('renders a selected link and expands its loadings', () => {
    const fixture = TestBed.createComponent(CcaInspectorComponent);
    fixture.componentRef.setInput('results', results);
    fixture.componentRef.setInput('selectedLink', results.links[0]);
    fixture.detectChanges();

    const headers = fixture.nativeElement.querySelectorAll('.cca-pair-header');
    expect(headers.length).toBe(1);
    expect(fixture.nativeElement.querySelector('.cca-link-title').textContent)
      .toContain('Antropometría');

    headers[0].click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.cca-loading-item').length).toBe(3);
  });

  it('defaults to the first link when the selector is enabled', () => {
    const fixture = TestBed.createComponent(CcaInspectorComponent);
    fixture.componentRef.setInput('results', results);
    fixture.componentRef.setInput('showLinkSelector', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('select')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.cca-link-title').textContent)
      .toContain('Estilo de vida');
  });

  it('switches links through the selector', () => {
    const fixture = TestBed.createComponent(CcaInspectorComponent);
    fixture.componentRef.setInput('results', results);
    fixture.componentRef.setInput('showLinkSelector', true);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.selectLink(1);
    fixture.detectChanges();

    expect(component.activeLink()?.target_group).toBe('Metabólico');
  });
});
