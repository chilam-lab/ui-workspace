export type StateNodeKind =
  | 'object'
  | 'array'
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'undefined'
  | 'function'
  | 'bigint'
  | 'symbol'
  | 'circular'
  | 'max-depth';

/** One node in the inspectable state tree. */
export interface StateTreeNode {
  key: string;
  path: string;
  kind: StateNodeKind;
  preview: string;
  children: StateTreeNode[];
  note?: 'more-children';
  noteCount?: number;
}

export interface StateTreeOptions {
  /** Root label. Defaults to `state`. */
  rootKey?: string;
  /** Root path used for expand/collapse state. Defaults to `$`. */
  rootPath?: string;
  /** Maximum object nesting depth. Defaults to 10. */
  maxDepth?: number;
  /** Maximum children shown per object/array. Defaults to 200. */
  maxChildren?: number;
  /** Maximum string length before truncation. Defaults to 200. */
  maxStringLength?: number;
}

/** A host-provided event-log entry. */
export interface StateInspectorEvent {
  name: string;
  at?: string | number | Date;
  payload?: unknown;
}

/** Payload emitted after importing a JSON file. */
export interface StateInspectorImport {
  state: unknown;
  events?: StateInspectorEvent[];
  window?: unknown;
}

/** Payload written by the “Download JSON” / “Copy JSON” actions. */
export interface StateInspectorExport {
  state: unknown;
  events: StateInspectorEvent[];
  window?: unknown;
  exportedAt: string;
}
