import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { CcaLoadingItem } from './cca-inspector.types';

@Component({
  selector: 'ui-cca-loadings',
  standalone: true,
  template: `
    <div class="cca-loadings">
      <h4 class="cca-loadings-title">
        {{ title }}
        @if (varianceLabel) {
          <span class="cca-variance">({{ varianceLabel }})</span>
        }
      </h4>

      @if (items.length) {
        @for (item of items; track item.encodedName) {
          <div
            class="cca-loading-item"
            [attr.title]="item.label + ' — ' + item.value.toFixed(3)">
            <div class="cca-loading-label" [attr.title]="item.label">{{ item.label }}</div>
            <div class="cca-loading-track">
              <div
                class="cca-loading-bar"
                [class.is-negative]="item.value < 0"
                [style.width.%]="barWidth(item)">
                @if (barWidth(item) > 15) {
                  <span class="cca-loading-value">{{ item.value.toFixed(2) }}</span>
                }
              </div>
              @if (barWidth(item) <= 15) {
                <span class="cca-loading-value-outside">{{ item.value.toFixed(2) }}</span>
              }
            </div>
          </div>
        }
      } @else {
        <p class="cca-loadings-empty">{{ emptyText }}</p>
      }
    </div>
  `,
  styleUrl: './cca-loadings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CcaLoadingsComponent {
  @Input() title = '';
  @Input() varianceLabel: string | null = null;
  @Input() items: CcaLoadingItem[] = [];
  @Input() emptyText = '';

  barWidth(item: CcaLoadingItem): number {
    const max = Math.max(
      ...this.items.map((entry) => Math.abs(entry.value)),
      1.0
    );
    return Math.min(100, (Math.abs(item.value) / max) * 100);
  }
}
