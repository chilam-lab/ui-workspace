import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService, TranslatePipe } from 'taxon-shared';
import { Subscription } from 'rxjs';

import { VariableDistributionChartComponent } from './chart/variable-distribution-chart.component';
import { VARIABLE_DISTRIBUTION_I18N } from './variable-distribution.i18n';
import { toDistributionChartModel } from './variable-distribution.mapper';
import { VariableDistributionService } from './variable-distribution.service';
import {
  DistributionChartModel,
  VariableContext,
  VariableDistributionPlotType,
  VariableDistributionVariable,
  VariableInfo,
  VariableSummaryResponse,
} from './variable-distribution.types';

@Component({
  selector: 'ui-variable-distribution',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    VariableDistributionChartComponent,
  ],
  templateUrl: './variable-distribution.component.html',
  styleUrl: './variable-distribution.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariableDistributionComponent implements OnInit, OnChanges, OnDestroy {
  @Input() datasetIdentifier = '';

  @Input() variableName: string | null = null;

  @Input() variableInfo: VariableInfo | null = null;

  @Input() variableContext: VariableContext | null = null;

  @Input() variables: VariableDistributionVariable[] = [];

  @Input() plotType: VariableDistributionPlotType | null = null;

  @Input() histBins = 30;
  @Input() showPoints = true;
  @Input() height = 320;
  @Input() showControls = true;

  @Input() mockResponses: Partial<Record<VariableDistributionPlotType, VariableSummaryResponse>> | null = null;

  @Output() error = new EventEmitter<string>();
  @Output() variableChange = new EventEmitter<string>();
  @Output() plotReady = new EventEmitter<VariableDistributionPlotType>();

  private readonly api = inject(VariableDistributionService);
  private readonly i18n = inject(I18nService);

  readonly selectedVariable = signal<string | null>(null);
  readonly selectedPlotType = signal<VariableDistributionPlotType>('kde');
  readonly bins = signal(30);
  readonly pointsVisible = signal(true);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly chartModel = signal<DistributionChartModel | null>(null);

  private readonly response = signal<VariableSummaryResponse | null>(null);
  private request?: Subscription;
  private binsTimer?: ReturnType<typeof setTimeout>;
  private initialized = false;

  constructor() {
    this.i18n.register(VARIABLE_DISTRIBUTION_I18N);
  }

  ngOnInit(): void {
    this.initialized = true;
    this.bins.set(this.clampBins(this.histBins));
    this.pointsVisible.set(this.showPoints);
    this.syncSelection();
    this.load();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.initialized) return;

    let needsLoad = false;
    let needsRebuild = false;

    if (changes['variableName'] || changes['variables']) {
      this.syncSelection();
      needsLoad = true;
    }

    if (changes['plotType']) {
      this.selectedPlotType.set(this.resolvePlotType(this.currentInfo(), this.plotType));
      needsLoad = true;
    }

    if (changes['histBins']) {
      this.bins.set(this.clampBins(this.histBins));
      needsLoad = true;
    }

    if (changes['showPoints']) {
      this.pointsVisible.set(this.showPoints);
      needsRebuild = true;
    }

    if (
      changes['datasetIdentifier'] ||
      changes['variableInfo'] ||
      changes['mockResponses']
    ) {
      needsLoad = true;
    }

    if (needsLoad) {
      this.load();
    } else if (needsRebuild) {
      this.rebuildChart();
    }
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
    clearTimeout(this.binsTimer);
  }

  load(): void {
    this.request?.unsubscribe();

    const variable = this.selectedVariable();
    if (!this.datasetIdentifier || !variable) {
      this.response.set(null);
      this.chartModel.set(null);
      this.loading.set(false);
      this.errorMessage.set(null);
      return;
    }

    const plotType = this.selectedPlotType();
    const info = this.currentInfo();
    const mock = this.mockResponses?.[plotType];

    if (mock) {
      this.applyResponse(mock);
      return;
    }

    if (!info) {
      const message = this.i18n.t('vardist.error');
      this.loading.set(false);
      this.errorMessage.set(message);
      this.error.emit(message);
      this.response.set(null);
      this.chartModel.set(null);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.request = this.api
      .getSummary({
        dataset_identifier: this.datasetIdentifier,
        variable_name: variable,
        variable_info: info,
        plot_options: {
          plot_type: plotType,
          hist_bins: this.bins(),
        },
      })
      .subscribe({
        next: (response) => this.applyResponse(response),
        error: (err) => {
          const message =
            err?.error?.detail ??
            err?.message ??
            this.i18n.t('vardist.error');
          this.loading.set(false);
          this.errorMessage.set(message);
          this.response.set(null);
          this.chartModel.set(null);
          this.error.emit(message);
        },
      });
  }

  onVariableSelect(name: string): void {
    if (!name || name === this.selectedVariable()) return;
    this.selectedVariable.set(name);
    this.selectedPlotType.set(this.resolvePlotType(this.currentInfo(), null));
    this.variableChange.emit(name);
    this.load();
  }

  onPlotTypeSelect(type: string): void {
    const next = this.asPlotType(type);
    if (!next || next === this.selectedPlotType()) return;
    this.selectedPlotType.set(next);
    this.load();
  }

  onBinsChange(value: string | number): void {
    const next = this.clampBins(Number(value));
    if (next === this.bins()) return;
    this.bins.set(next);
    clearTimeout(this.binsTimer);
    this.binsTimer = setTimeout(() => this.load(), 250);
  }

  onPointsToggle(checked: boolean): void {
    this.pointsVisible.set(!!checked);
    this.rebuildChart();
  }

  activeVariables(): VariableDistributionVariable[] {
    if (this.variables.length) return this.variables;

    const name = this.variableName ?? this.selectedVariable();
    if (name && this.variableInfo) {
      return [{
        name,
        label: this.variableInfo.var_alias ?? name,
        info: this.variableInfo,
      }];
    }
    return [];
  }

  currentInfo(): VariableInfo | null {
    const name = this.selectedVariable();
    if (!name) return null;

    const found = this.variables.find((item) => item.name === name);
    return found?.info ?? this.variableInfo;
  }

  currentLabel(): string {
    const name = this.selectedVariable();
    if (!name) return '';

    const found = this.variables.find((item) => item.name === name);
    if (found?.label) return found.label;
    if (this.variableInfo?.var_alias) return this.variableInfo.var_alias;

    if (this.variableContext) {
      for (const entry of Object.values(this.variableContext)) {
        if (
          entry?.original_variable === name &&
          !entry.original_category &&
          !entry.bin_range &&
          entry.label
        ) {
          return entry.label;
        }
      }
    }

    return name;
  }

  canChoosePlotType(): boolean {
    const type = this.currentInfo()?.variable_type ?? '';
    return type.includes('continuous');
  }

  showBins(): boolean {
    return this.canChoosePlotType() && this.selectedPlotType() === 'histogram';
  }

  showPointsOption(): boolean {
    return this.canChoosePlotType() && this.selectedPlotType() === 'kde';
  }

  yAxisLabel(): string {
    return this.selectedPlotType() === 'kde'
      ? this.i18n.t('vardist.density')
      : this.i18n.t('vardist.count');
  }

  private applyResponse(response: VariableSummaryResponse): void {
    this.response.set(response);
    this.loading.set(false);
    this.errorMessage.set(null);
    this.rebuildChart();
    this.plotReady.emit(response.plot_type);
  }

  private rebuildChart(): void {
    this.chartModel.set(
      toDistributionChartModel(this.response(), {
        showPoints: this.pointsVisible(),
      })
    );
  }

  private syncSelection(): void {
    const list = this.activeVariables();

    if (list.length) {
      const wanted = this.variableName;
      const current = this.selectedVariable();
      const next =
        (wanted && list.some((item) => item.name === wanted) && wanted) ||
        (current && list.some((item) => item.name === current) && current) ||
        list[0].name;
      this.selectedVariable.set(next);
    } else {
      this.selectedVariable.set(this.variableName ?? null);
    }

    this.selectedPlotType.set(this.resolvePlotType(this.currentInfo(), this.plotType));
  }

  private resolvePlotType(
    info: VariableInfo | null,
    requested: VariableDistributionPlotType | null
  ): VariableDistributionPlotType {
    const type = info?.variable_type ?? '';

    if (type.includes('categorical') || type.includes('ordinal')) {
      return 'bar';
    }

    if (requested === 'bar' || requested === 'histogram' || requested === 'kde') {
      return requested;
    }

    return type.includes('continuous') ? 'kde' : 'bar';
  }

  private asPlotType(value: string): VariableDistributionPlotType | null {
    return value === 'bar' || value === 'histogram' || value === 'kde'
      ? value
      : null;
  }

  private clampBins(value: number): number {
    if (!Number.isFinite(value)) return 30;
    return Math.min(100, Math.max(5, Math.round(value)));
  }
}
