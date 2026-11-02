import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService, TranslatePipe } from 'taxon-shared';

import { CcaLoadingsComponent } from './cca-loadings.component';
import { CCA_INSPECTOR_I18N } from './cca-inspector.i18n';
import {
  CcaDownloadFormat,
  CcaEncodedVariable,
  CcaLink,
  CcaLoadingItem,
  CcaResults,
  CcaSignificance,
  CcaCanonicalPair,
} from './cca-inspector.types';
import {
  buildLoadings,
  correlationColor as pairColor,
  formatVariance,
  getSignificance,
  sanitizeFilePart,
} from './cca-inspector.utils';
import {
  allResultsCsv,
  allResultsExport,
  currentEdgeCsv,
  currentEdgeExport,
  toCcaJson,
} from './cca-export';

/**
 * Standalone port of DyAna's CCA Inspector.
 *
 * It is a pure result view: the host supplies the CCA link/results and the
 * component renders loadings and downloads JSON/CSV. No backend calls.
 */
@Component({
  selector: 'ui-cca-inspector',
  standalone: true,
  imports: [FormsModule, TranslatePipe, CcaLoadingsComponent],
  templateUrl: './cca-inspector.component.html',
  styleUrl: './cca-inspector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CcaInspectorComponent implements OnInit, OnChanges, OnDestroy {
  /** Link selected by the host (e.g. by a future CCA Graph component). */
  @Input() selectedLink: CcaLink | null = null;

  /** Full CCA response, needed for “all results” downloads and the selector. */
  @Input() results: CcaResults | null = null;

  /** Optional encoded-column metadata; falls back to `results.encoded_variable_info`. */
  @Input() encodedInfo: Record<string, CcaEncodedVariable> | null = null;

  /** Show a link selector when the host does not pass `selectedLink`. */
  @Input() showLinkSelector = false;

  /** Prefix for downloaded files. */
  @Input() downloadFileName = 'cca';

  @Output() linkChange = new EventEmitter<CcaLink>();

  private readonly i18n = inject(I18nService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly expandedPairs = signal<number[]>([]);
  readonly downloadStatus = signal<string | null>(null);
  private readonly internalLink = signal<CcaLink | null>(null);

  private statusTimer?: ReturnType<typeof setTimeout>;
  private initialized = false;

  constructor() {
    this.i18n.register(CCA_INSPECTOR_I18N);
  }

  ngOnInit(): void {
    this.initialized = true;
    this.syncInternalLink();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.initialized) return;

    if (
      changes['selectedLink'] ||
      changes['results'] ||
      changes['showLinkSelector']
    ) {
      this.syncInternalLink();
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.statusTimer);
  }

  activeLink(): CcaLink | null {
    return this.selectedLink ?? this.internalLink();
  }

  selectorLinks(): CcaLink[] {
    if (this.results?.links?.length) return this.results.links;
    return this.selectedLink ? [this.selectedLink] : [];
  }

  canShowSelector(): boolean {
    return this.showLinkSelector
      && !this.selectedLink
      && this.selectorLinks().length > 1;
  }

  selectorIndex(): number {
    const active = this.activeLink();
    if (!active) return 0;
    const index = this.selectorLinks().indexOf(active);
    return index >= 0 ? index : 0;
  }

  selectLink(index: string | number): void {
    const link = this.selectorLinks()[Number(index)];
    if (!link) return;
    this.internalLink.set(link);
    this.expandedPairs.set([]);
    this.linkChange.emit(link);
  }

  isExpanded(index: number): boolean {
    return this.expandedPairs().includes(index);
  }

  togglePair(index: number): void {
    const current = this.expandedPairs();
    this.expandedPairs.set(
      current.includes(index)
        ? current.filter((item) => item !== index)
        : [...current, index]
    );
  }

  sourceLoadings(pair: CcaCanonicalPair): CcaLoadingItem[] {
    return buildLoadings(pair.source_loadings, this.encodedVariables());
  }

  targetLoadings(pair: CcaCanonicalPair): CcaLoadingItem[] {
    return buildLoadings(pair.target_loadings, this.encodedVariables());
  }

  significance(pair: CcaCanonicalPair): CcaSignificance | null {
    return getSignificance(pair);
  }

  pairColor(correlation: number): string {
    return pairColor(correlation);
  }

  sourceTitle(link: CcaLink): string {
    return this.i18n.t('cca.sourceLoadings', { group: link.source_group });
  }

  targetTitle(link: CcaLink): string {
    return this.i18n.t('cca.targetLoadings', { group: link.target_group });
  }

  varianceLabel(value: number | null | undefined): string | null {
    const percent = formatVariance(value);
    return percent === null
      ? null
      : this.i18n.t('cca.varianceExplained', { percent });
  }

  hasResults(): boolean {
    return !!this.results?.links?.length;
  }

  downloadCurrent(format: CcaDownloadFormat): void {
    const link = this.activeLink();
    if (!link) {
      this.showDownloadStatus(this.i18n.t('cca.downloadUnavailable'));
      return;
    }

    const info = this.encodedVariables();
    const base = `${this.downloadFileName}_edge_${sanitizeFilePart(link.source_group)}_vs_${sanitizeFilePart(link.target_group)}`;

    if (format === 'json') {
      this.save(
        toCcaJson(currentEdgeExport(link, info)),
        'application/json',
        `${base}.json`
      );
    } else {
      this.save(currentEdgeCsv(link, info), 'text/csv;charset=utf-8;', `${base}.csv`);
    }
  }

  downloadAll(format: CcaDownloadFormat): void {
    if (!this.results?.links?.length) {
      this.showDownloadStatus(this.i18n.t('cca.downloadUnavailable'));
      return;
    }

    const base = `${this.downloadFileName}_all_results`;

    if (format === 'json') {
      this.save(
        toCcaJson(allResultsExport(this.results)),
        'application/json',
        `${base}.json`
      );
    } else {
      this.save(allResultsCsv(this.results), 'text/csv;charset=utf-8;', `${base}.csv`);
    }
  }

  private encodedVariables(): Record<string, CcaEncodedVariable> {
    return this.encodedInfo ?? this.results?.encoded_variable_info ?? {};
  }

  private syncInternalLink(): void {
    this.expandedPairs.set([]);

    if (this.selectedLink) {
      this.internalLink.set(null);
      return;
    }

    if (this.showLinkSelector && this.results?.links?.length) {
      this.internalLink.set(this.results.links[0]);
      return;
    }

    this.internalLink.set(null);
  }

  private save(content: string, mimeType: string, fileName: string): void {
    if (!this.isBrowser) return;

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    this.showDownloadStatus(this.i18n.t('cca.downloaded', { file: fileName }));
  }

  private showDownloadStatus(message: string): void {
    this.downloadStatus.set(message);
    clearTimeout(this.statusTimer);
    this.statusTimer = setTimeout(() => this.downloadStatus.set(null), 3000);
  }
}
