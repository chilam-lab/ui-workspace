import { Component, computed, signal } from '@angular/core';

import { HistogramChartComponent } from 'histogram-chart';
import { TablaSpeciesComponent } from 'tabla-species';
import { NichoStepDef, NichoStepperComponent } from 'taxon-shared';
import { TaxonScopeComponent } from 'taxon-scope';
import { TaxonSelectorComponent } from 'taxon-selector';
import { TaxonNavigatorComponent } from 'taxon-navigator';
import { RegionSelectorComponent } from 'region-selector';
import { MapaMaplibreComponent } from 'mapa-maplibre';
import { MapaMallaComponent } from 'mapa-malla';
import { VariableDistributionComponent } from 'variable-distribution';
import type {
  VariableDistributionPlotType,
  VariableDistributionVariable,
  VariableSummaryResponse,
} from 'variable-distribution';

type PreviewKey = 'histogram' | 'vardist' | 'tabla' | 'stepper' | 'taxon' | 'region' | 'maplibre' | 'leaflet';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    HistogramChartComponent,
    VariableDistributionComponent,
    TablaSpeciesComponent,
    NichoStepperComponent,
    TaxonScopeComponent,
    TaxonSelectorComponent,
    TaxonNavigatorComponent,
    RegionSelectorComponent,
    MapaMaplibreComponent,
    MapaMallaComponent
  ],
  template: `
    <div class="d-flex flex-column flex-md-row min-vh-100 bg-light">
      <aside class="preview-sidebar flex-shrink-0 bg-white p-3 border-bottom">
        <h1 class="fs-4 fw-bold text-dark mb-1">Species Workspace</h1>
        <p class="text-muted small mb-3">Component previews</p>
        <nav class="preview-nav">
          @for (item of items; track item.key) {
            <button
              type="button"
              (click)="selectItem(item.key)"
              class="btn btn-sm text-start text-nowrap w-100"
              [class.btn-primary]="selected() === item.key"
              [class.btn-light]="selected() !== item.key">
              {{ item.label }}
            </button>
          }
        </nav>
      </aside>

      <main class="preview-main flex-grow-1 p-3 p-md-4">
        <header class="mb-3 rounded bg-primary text-white px-4 py-3 shadow-sm">
          <h2 class="fs-5 fw-bold mb-0">{{ currentLabel() }}</h2>
          <p class="small mb-0 opacity-75">Standalone component preview</p>
        </header>

        @switch (selected()) {
          @case ('histogram') {
            @defer {
              <div class="rounded bg-white p-3 shadow-sm border">
                <ui-histogram-chart
                  [useCustomData]="true"
                  [customData]="deciles"
                  title="Deciles promedio score"
                  xLabel="Decil"
                  yLabel="Score promedio"
                  [height]="320">
                </ui-histogram-chart>
              </div>
            } @placeholder {
              <div class="text-muted p-3">Cargando…</div>
            }
          }

          @case ('vardist') {
            @defer {
              <div class="rounded bg-white p-3 shadow-sm border">
                <ui-variable-distribution
                  datasetIdentifier="demo"
                  [variables]="distributionVariables"
                  [mockResponses]="distributionMocks"
                  [height]="360">
                </ui-variable-distribution>
              </div>
            } @placeholder {
              <div class="text-muted p-3">Cargando…</div>
            }
          }

          @case ('tabla') {
            @defer {
              <div class="rounded bg-white p-3 shadow-sm border">
                <tabla-species [rowsFromMap]="mockRows"></tabla-species>
              </div>
            } @placeholder {
              <div class="text-muted p-3">Cargando…</div>
            }
          }

          @case ('stepper') {
            @defer {
              <div class="rounded bg-white p-4 shadow-sm border">
                <nicho-stepper [steps]="steps" (stepClick)="onStep($event)"></nicho-stepper>
              </div>
            } @placeholder {
              <div class="text-muted p-3">Cargando…</div>
            }
          }

          @case ('taxon') {
            @defer {
              <taxon-scope>
                <div class="row g-3">
                  <div class="col-12 col-md-6">
                    <div class="rounded bg-white p-3 shadow-sm border h-100">
                      <h3 class="fs-6 fw-semibold text-secondary mb-3">taxon-selector</h3>
                      <taxon-selector (speciesSelected)="onSpecies($event)"></taxon-selector>
                    </div>
                  </div>
                  <div class="col-12 col-md-6">
                    <div class="rounded bg-white p-3 shadow-sm border h-100">
                      <h3 class="fs-6 fw-semibold text-secondary mb-3">taxon-navigator</h3>
                      <taxon-navigator></taxon-navigator>
                    </div>
                  </div>
                </div>
              </taxon-scope>
            } @placeholder {
              <div class="text-muted p-3">Cargando…</div>
            }
          }

          @case ('region') {
            @defer {
              <div class="rounded bg-white p-4 shadow-sm border">
                <app-region-selector></app-region-selector>
              </div>
            } @placeholder {
              <div class="text-muted p-3">Cargando…</div>
            }
          }

          @case ('maplibre') {
            @defer {
              <div class="preview-map overflow-hidden rounded shadow-sm">
                <app-mapa-maplibre
                  mapId="preview-maplibre"
                  [showLayerControl]="false">
                </app-mapa-maplibre>
              </div>
            } @placeholder {
              <div class="text-muted p-3">Cargando…</div>
            }
          }

          @case ('leaflet') {
            @defer {
              <div class="overflow-hidden rounded bg-white shadow-sm border">
                <mapa-malla></mapa-malla>
              </div>
            } @placeholder {
              <div class="text-muted p-3">Cargando…</div>
            }
          }
        }
      </main>
    </div>
  `
})
export class AppComponent {
  selected = signal<PreviewKey>(this.initialKey());

  readonly items: { key: PreviewKey; label: string }[] = [
    { key: 'histogram', label: 'ui-histogram-chart' },
    { key: 'vardist', label: 'ui-variable-distribution' },
    { key: 'tabla', label: 'tabla-species' },
    { key: 'stepper', label: 'nicho-stepper' },
    { key: 'taxon', label: 'taxon-selector / navigator' },
    { key: 'region', label: 'app-region-selector' },
    { key: 'maplibre', label: 'app-mapa-maplibre' },
    { key: 'leaflet', label: 'mapa-malla (leaflet)' }
  ];

  currentLabel = computed(
    () => this.items.find(i => i.key === this.selected())?.label ?? ''
  );

  deciles = [
    { label: 'D1', value: 0.12 },
    { label: 'D2', value: 0.19 },
    { label: 'D3', value: 0.24 },
    { label: 'D4', value: 0.31 },
    { label: 'D5', value: 0.38 },
    { label: 'D6', value: 0.43 },
    { label: 'D7', value: 0.49 },
    { label: 'D8', value: 0.55 },
    { label: 'D9', value: 0.62 },
    { label: 'D10', value: 0.74 }
  ];

  distributionVariables: VariableDistributionVariable[] = [
    {
      name: 'edad',
      label: 'Edad',
      info: { variable_type: 'continuous', var_alias: 'Edad' },
    },
    {
      name: 'sexo',
      label: 'Sexo',
      info: { variable_type: 'categorical', var_alias: 'Sexo' },
    },
  ];

  distributionMocks: Partial<
    Record<VariableDistributionPlotType, VariableSummaryResponse>
  > = {
    kde: {
      plot_type: 'kde',
      plot_data: {
        x: [15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57, 60, 63, 66, 69, 72],
        y: [0.012, 0.019, 0.028, 0.039, 0.049, 0.057, 0.061, 0.062, 0.059, 0.054, 0.047, 0.039, 0.031, 0.024, 0.017, 0.012, 0.008, 0.005, 0.003, 0.002],
      },
      sample: [22, 25, 27, 29, 31, 33, 34, 36, 38, 40, 42, 44, 47, 50, 53, 57, 61, 65],
    },
    histogram: {
      plot_type: 'histogram',
      plot_data: {
        labels: [15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70],
        values: [2, 6, 11, 18, 26, 31, 28, 21, 14, 9, 4],
      },
      sample: [22, 25, 27, 29, 31, 33, 34, 36, 38, 40, 42, 44, 47, 50, 53, 57, 61, 65],
    },
    bar: {
      plot_type: 'bar',
      plot_data: {
        labels: ['Femenino (2)', 'Masculino (1)'],
        codes: ['2', '1'],
        values: [53, 47],
      },
    },
  };

  mockRows = [
    { id_target: 1, id_covars: 2, metadata_target: { especie: 'Lynx rufus' }, metadata_covars: { especie: 'Pinus ponderosa' }, n: 120, ni: 30, nj: 40, num_nij: 12, epsilon: 0.42, score: 0.78 },
    { id_target: 1, id_covars: 3, metadata_target: { especie: 'Lynx rufus' }, metadata_covars: { especie: 'Quercus rugosa' }, n: 120, ni: 30, nj: 52, num_nij: 9, epsilon: 0.31, score: 0.61 },
    { id_target: 4, id_covars: 2, metadata_target: { especie: 'Canis lupus' }, metadata_covars: { especie: 'Pinus ponderosa' }, n: 96, ni: 18, nj: 40, num_nij: 5, epsilon: 0.22, score: 0.47 }
  ];

  steps: NichoStepDef[] = [
    { label: 'Especie', state: 'done' },
    { label: 'Covariables', state: 'current' },
    { label: 'Análisis', state: 'upcoming' },
    { label: 'Resultados', state: 'upcoming' }
  ];

  selectItem(key: PreviewKey): void {
    this.selected.set(key);
    if (typeof history !== 'undefined') {
      history.replaceState(null, '', `?preview=${key}`);
    }
  }

  private initialKey(): PreviewKey {
    if (typeof location === 'undefined') return 'histogram';
    const key = new URLSearchParams(location.search).get('preview');
    const known: PreviewKey[] = ['histogram', 'vardist', 'tabla', 'stepper', 'taxon', 'region', 'maplibre', 'leaflet'];
    return known.includes(key as PreviewKey) ? (key as PreviewKey) : 'histogram';
  }

  onStep(index: number): void {
    console.log('[preview] stepClick', index);
  }

  onSpecies(species: unknown): void {
    console.log('[preview] speciesSelected', species);
  }
}
