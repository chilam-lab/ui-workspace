import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import Chart from 'chart.js/auto';
import type { ChartConfiguration } from 'chart.js';

import { DistributionChartModel } from '../variable-distribution.types';

@Component({
  selector: 'ui-variable-distribution-chart',
  standalone: true,
  template: `
    <div class="vd-chart-wrap">
      <canvas #canvas role="img" [attr.aria-label]="ariaLabel"></canvas>
    </div>
  `,
  styleUrl: './variable-distribution-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariableDistributionChartComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @Input() model: DistributionChartModel | null = null;
  @Input() xLabel = '';
  @Input() yLabel = '';
  @Input() ariaLabel = '';

  @ViewChild('canvas', { static: true })
  private canvasRef?: ElementRef<HTMLCanvasElement>;

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly zone = inject(NgZone);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private chart?: Chart;
  private resizeObserver?: ResizeObserver;
  private viewReady = false;
  private destroyed = false;

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    this.viewReady = true;
    this.render();

    const hostElement = this.host.nativeElement;
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.zone.runOutsideAngular(() => this.chart?.resize());
      });
      this.resizeObserver.observe(hostElement);
    }
  }

  ngOnChanges(_changes: SimpleChanges): void {
    if (this.viewReady) this.render();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    this.destroyChart();
  }

  private render(): void {
    if (this.destroyed || !this.model) {
      this.destroyChart();
      return;
    }

    const canvas = this.canvasRef?.nativeElement;
    if (!canvas?.isConnected) {
      this.destroyChart();
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) return;

    this.destroyChart();

    const config = this.model.kind === 'kde'
      ? this.kdeConfig(this.model)
      : this.barConfig(this.model);

    this.zone.runOutsideAngular(() => {
      this.chart = new Chart(context, config as ChartConfiguration);
    });
  }

  private barConfig(model: DistributionChartModel): ChartConfiguration<'bar'> {
    const isHistogram = model.kind === 'histogram';

    return {
      type: 'bar',
      data: {
        labels: model.labels,
        datasets: [
          {
            label: this.xLabel,
            data: model.values,
            backgroundColor: 'rgba(0, 168, 230, 0.75)',
            borderColor: '#00a8e6',
            borderWidth: 1,
            borderRadius: isHistogram ? 0 : 4,
            barPercentage: isHistogram ? 1 : 0.85,
            categoryPercentage: isHistogram ? 1 : 0.9,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: { intersect: false, mode: 'index' },
        },
        scales: {
          x: {
            title: { display: !!this.xLabel, text: this.xLabel },
            grid: { display: false },
            ticks: { autoSkip: true, maxRotation: 45, minRotation: 0 },
          },
          y: {
            beginAtZero: true,
            title: { display: !!this.yLabel, text: this.yLabel },
            grid: { color: '#eef1f5' },
          },
        },
      },
    };
  }

  private kdeConfig(model: DistributionChartModel): ChartConfiguration<'line'> {
    const datasets: ChartConfiguration<'line'>['data']['datasets'] = [
      {
        type: 'line',
        label: this.xLabel,
        data: model.points ?? [],
        parsing: false,
        borderColor: '#00a8e6',
        backgroundColor: 'rgba(0, 168, 230, 0.18)',
        borderWidth: 2,
        fill: true,
        tension: 0.25,
        pointRadius: 0,
        pointHitRadius: 8,
      },
    ];

    if (model.samplePoints?.length) {
      datasets.push({
        type: 'scatter',
        label: '',
        data: model.samplePoints,
        parsing: false,
        pointRadius: 2,
        pointHitRadius: 4,
        pointBackgroundColor: 'rgba(17, 24, 39, 0.35)',
        showLine: false,
      } as never);
    }

    return {
      type: 'line',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: { intersect: false, mode: 'nearest' },
        },
        scales: {
          x: {
            type: 'linear',
            title: { display: !!this.xLabel, text: this.xLabel },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            title: { display: !!this.yLabel, text: this.yLabel },
            grid: { color: '#eef1f5' },
          },
        },
      },
    };
  }

  private destroyChart(): void {
    this.chart?.destroy();
    this.chart = undefined;
  }
}
