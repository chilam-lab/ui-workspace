import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { I18nService, TranslatePipe } from 'taxon-shared';

import { STATE_INSPECTOR_I18N } from './state-inspector.i18n';
import {
  StateInspectorEvent,
  StateInspectorExport,
  StateInspectorImport,
  StateTreeNode,
} from './state-inspector.types';
import {
  buildStateInspectorExport,
  buildStateTree,
  collectExpandablePaths,
  formatEventPayload,
  formatEventTime,
  parseStateImport,
  safeStringify,
} from './state-inspector.utils';

/**
 * Standalone port of DyAna's State Inspector.
 *
 * The host supplies a state snapshot and, optionally, an event log. The
 * component renders an expandable type-coloured tree, supports copy/download,
 * and emits imported JSON so the host decides what to do with it.
 */
@Component({
  selector: 'ui-state-inspector',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './state-inspector.component.html',
  styleUrl: './state-inspector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StateInspectorComponent implements OnInit, OnChanges, OnDestroy {
  /** Any serialisable state snapshot supplied by the host. */
  @Input() state: unknown = null;

  /** Optional host-provided event log. */
  @Input() events: StateInspectorEvent[] = [];

  @Input() title = '';
  @Input() maxDepth = 10;
  @Input() maxChildren = 200;
  @Input() maxStringLength = 200;
  @Input() maxHeight = 480;
  @Input() includeWindow = false;
  @Input() windowMaxDepth = 2;
  @Input() downloadFileName = 'state-inspector';

  /** Emitted after a JSON file is parsed successfully. */
  @Output() stateImport = new EventEmitter<StateInspectorImport>();

  /** Emitted when the host-owned event log should be cleared. */
  @Output() eventsCleared = new EventEmitter<void>();

  @ViewChild('fileInput')
  private fileInputRef?: ElementRef<HTMLInputElement>;

  readonly stateTree = signal<StateTreeNode | null>(null);
  readonly windowTree = signal<StateTreeNode | null>(null);
  readonly expanded = signal<Set<string>>(new Set());
  readonly status = signal<string | null>(null);
  readonly statusIsError = signal(false);

  private readonly i18n = inject(I18nService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private statusTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.i18n.register(STATE_INSPECTOR_I18N);
  }

  ngOnInit(): void {
    this.rebuildAll();
    // Match the legacy tool: top-level keys are visible on first render.
    this.expanded.set(new Set(['state', 'window']));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['state'] ||
      changes['maxDepth'] ||
      changes['maxChildren'] ||
      changes['maxStringLength']
    ) {
      this.rebuildStateTree();
    }

    if (changes['includeWindow'] || changes['windowMaxDepth']) {
      this.rebuildWindowTree();
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.statusTimer);
  }

  /** Rebuild both trees; useful when the host mutates `state` in place. */
  refresh(): void {
    this.rebuildAll();
  }

  titleText(): string {
    return this.title || this.i18n.t('state.title');
  }

  isExpandable(node: StateTreeNode): boolean {
    return node.children.length > 0;
  }

  isExpanded(path: string): boolean {
    return this.expanded().has(path);
  }

  toggle(path: string): void {
    const next = new Set(this.expanded());
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    this.expanded.set(next);
  }

  expandAll(): void {
    const paths = new Set<string>();
    const stateTree = this.stateTree();
    const windowTree = this.windowTree();

    if (stateTree) {
      for (const path of collectExpandablePaths(stateTree)) paths.add(path);
    }
    if (windowTree) {
      for (const path of collectExpandablePaths(windowTree)) paths.add(path);
    }

    this.expanded.set(paths);
  }

  collapseAll(): void {
    this.expanded.set(new Set());
  }

  displayValue(node: StateTreeNode): string {
    if (node.kind === 'circular') return this.i18n.t('state.circular');
    if (node.kind === 'max-depth') return this.i18n.t('state.maxDepth');
    return node.preview;
  }

  noteText(node: StateTreeNode): string | null {
    if (node.note === 'more-children') {
      return this.i18n.t('state.moreChildren', { n: node.noteCount ?? 0 });
    }
    return null;
  }

  eventTime(value: string | number | Date): string {
    return formatEventTime(value);
  }

  eventPayload(payload: unknown): string {
    return formatEventPayload(payload);
  }

  async copyJson(): Promise<void> {
    if (!this.isBrowser) return;

    try {
      await navigator.clipboard.writeText(this.exportJson());
      this.setStatus(this.i18n.t('state.copied'));
    } catch {
      this.setStatus(this.i18n.t('state.copyFailed'), true);
    }
  }

  downloadJson(): void {
    if (!this.isBrowser) return;

    const fileName = `${this.downloadFileName}.json`;
    const blob = new Blob([this.exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    this.setStatus(this.i18n.t('state.downloaded', { file: fileName }));
  }

  triggerImport(): void {
    this.fileInputRef?.nativeElement.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const imported = parseStateImport(await file.text());
      this.stateImport.emit(imported);
      this.setStatus(this.i18n.t('state.imported', { file: file.name }));
    } catch (error) {
      const message = error instanceof Error ? error.message : this.i18n.t('state.unknownError');
      this.setStatus(this.i18n.t('state.importFailed', { error: message }), true);
    } finally {
      input.value = '';
    }
  }

  clearEvents(): void {
    this.eventsCleared.emit();
  }

  private rebuildAll(): void {
    this.rebuildStateTree();
    this.rebuildWindowTree();
  }

  private rebuildStateTree(): void {
    if (this.state === null || this.state === undefined) {
      this.stateTree.set(null);
      return;
    }

    this.stateTree.set(
      buildStateTree(this.state, {
        rootKey: 'state',
        rootPath: 'state',
        maxDepth: this.maxDepth,
        maxChildren: this.maxChildren,
        maxStringLength: this.maxStringLength,
      })
    );
  }

  private rebuildWindowTree(): void {
    if (!this.includeWindow || !this.isBrowser) {
      this.windowTree.set(null);
      return;
    }

    this.windowTree.set(
      buildStateTree(this.windowSnapshot(), {
        rootKey: 'window',
        rootPath: 'window',
        maxDepth: this.windowMaxDepth,
        maxChildren: 100,
        maxStringLength: 120,
      })
    );
  }

  private windowSnapshot(): Record<string, unknown> {
    const win = window as unknown as Record<string, unknown>;
    const snapshot: Record<string, unknown> = {};

    for (const key of Object.keys(win)) {
      if (key === 'window' || key === 'document') continue;

      let value: unknown;
      try {
        value = win[key];
      } catch {
        continue;
      }

      if (typeof value === 'function') continue;
      snapshot[key] = value;
    }

    return snapshot;
  }

  private exportPayload(): StateInspectorExport {
    return buildStateInspectorExport(this.state, this.events);
  }

  private exportJson(): string {
    return safeStringify(this.exportPayload(), 2);
  }

  private setStatus(message: string, isError = false): void {
    this.status.set(message);
    this.statusIsError.set(isError);
    clearTimeout(this.statusTimer);
    this.statusTimer = setTimeout(() => {
      this.status.set(null);
      this.statusIsError.set(false);
    }, 3500);
  }
}
