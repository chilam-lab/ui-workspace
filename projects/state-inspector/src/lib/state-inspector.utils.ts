import {
  StateInspectorEvent,
  StateInspectorExport,
  StateInspectorImport,
  StateNodeKind,
  StateTreeNode,
  StateTreeOptions,
} from './state-inspector.types';

const DEFAULT_OPTIONS: Required<StateTreeOptions> = {
  rootKey: 'state',
  rootPath: '$',
  maxDepth: 10,
  maxChildren: 200,
  maxStringLength: 200,
};

/** Build a serialisable tree model from an arbitrary state value. */
export function buildStateTree(
  value: unknown,
  options: StateTreeOptions = {}
): StateTreeNode {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  return buildNode(opts.rootKey, opts.rootPath, value, 0, new Set<object>(), opts);
}

function buildNode(
  key: string,
  path: string,
  value: unknown,
  depth: number,
  ancestors: Set<object>,
  opts: Required<StateTreeOptions>
): StateTreeNode {
  if (value === null) {
    return leaf(key, path, 'null', 'null');
  }
  if (value === undefined) {
    return leaf(key, path, 'undefined', 'undefined');
  }

  const type = typeof value;

  if (type === 'string') {
    return leaf(key, path, 'string', `"${truncate(value as string, opts.maxStringLength)}"`);
  }
  if (type === 'number') {
    return leaf(key, path, 'number', String(value));
  }
  if (type === 'boolean') {
    return leaf(key, path, 'boolean', String(value));
  }
  if (type === 'bigint') {
    return leaf(key, path, 'bigint', `${String(value)}n`);
  }
  if (type === 'symbol') {
    return leaf(key, path, 'symbol', String(value));
  }
  if (type === 'function') {
    const fn = value as (...args: unknown[]) => unknown;
    return leaf(key, path, 'function', `[Function ${fn.name || 'anonymous'}]`);
  }

  const objectValue = value as Record<string, unknown>;

  if (ancestors.has(objectValue)) {
    return leaf(key, path, 'circular', '');
  }

  if (value instanceof Date) {
    return leaf(key, path, 'object', `Date(${value.toISOString()})`);
  }

  const isArray = Array.isArray(value);
  const kind: StateNodeKind = isArray ? 'array' : 'object';
  const keys = Object.keys(objectValue);

  const containerPreview = isArray
    ? (keys.length ? `[${keys.length}]` : '[]')
    : (keys.length ? `{${keys.length}}` : '{}');

  if (depth >= opts.maxDepth) {
    return {
      key,
      path,
      kind: 'max-depth',
      preview: containerPreview,
      children: [],
    };
  }

  const nextAncestors = new Set(ancestors);
  nextAncestors.add(objectValue);

  const limit = Math.min(keys.length, opts.maxChildren);
  const children: StateTreeNode[] = [];

  for (let i = 0; i < limit; i++) {
    const childKey = keys[i];
    children.push(
      buildNode(
        childKey,
        `${path}.${childKey}`,
        objectValue[childKey],
        depth + 1,
        nextAncestors,
        opts
      )
    );
  }

  const node: StateTreeNode = {
    key,
    path,
    kind,
    preview: containerPreview,
    children,
  };

  if (keys.length > limit) {
    node.note = 'more-children';
    node.noteCount = keys.length - limit;
  }

  return node;
}

function leaf(
  key: string,
  path: string,
  kind: StateNodeKind,
  preview: string
): StateTreeNode {
  return { key, path, kind, preview, children: [] };
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength
    ? `${value.slice(0, maxLength)}…`
    : value;
}

/** Paths of every node that has children, used by “Expand all”. */
export function collectExpandablePaths(node: StateTreeNode): string[] {
  const paths: string[] = [];
  if (node.children.length) {
    paths.push(node.path);
    for (const child of node.children) {
      paths.push(...collectExpandablePaths(child));
    }
  }
  return paths;
}

/** Safe JSON stringification for circular, bigint, function and symbol values. */
export function safeStringify(value: unknown, space = 2): string {
  return JSON.stringify(toSerializable(value, new Set<object>()), null, space) ?? '';
}

function toSerializable(value: unknown, ancestors: Set<object>): unknown {
  if (value === null || value === undefined) return value;

  const type = typeof value;
  if (type === 'bigint') return `${String(value)}n`;
  if (type === 'symbol') return String(value);
  if (type === 'function') {
    return `[Function ${(value as { name?: string }).name || 'anonymous'}]`;
  }
  if (type !== 'object') return value;

  const objectValue = value as Record<string, unknown>;
  if (ancestors.has(objectValue)) return '[Circular]';
  if (value instanceof Date) return value.toISOString();

  const next = new Set(ancestors);
  next.add(objectValue);

  if (Array.isArray(value)) {
    return value.map((item) => toSerializable(item, next));
  }

  if (value instanceof Map) {
    const out: Record<string, unknown> = {};
    for (const [key, item] of value.entries()) {
      out[String(key)] = toSerializable(item, next);
    }
    return out;
  }

  if (value instanceof Set) {
    return Array.from(value, (item) => toSerializable(item, next));
  }

  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(objectValue)) {
    out[key] = toSerializable(item, next);
  }
  return out;
}

/** Export payload shared by copy/download and accepted by import. */
export function buildStateInspectorExport(
  state: unknown,
  events: StateInspectorEvent[],
  windowState?: unknown
): StateInspectorExport {
  return {
    state,
    events,
    ...(windowState === undefined ? {} : { window: windowState }),
    exportedAt: new Date().toISOString(),
  };
}

/** Parse an imported JSON document, accepting both raw state and export payloads. */
export function parseStateImport(text: string): StateInspectorImport {
  const parsed: unknown = JSON.parse(text);

  if (parsed && typeof parsed === 'object' && 'state' in parsed) {
    const payload = parsed as StateInspectorImport;
    return {
      state: payload.state,
      events: Array.isArray(payload.events) ? payload.events : undefined,
      window: payload.window,
    };
  }

  return { state: parsed };
}

/** Compact text shown under one event-log entry. */
export function formatEventPayload(payload: unknown, maxLength = 400): string {
  if (payload === undefined) return 'undefined';

  let text: string;
  try {
    text = safeStringify(payload, 0);
  } catch {
    text = String(payload);
  }

  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

/** Display a timestamp as local time, or fall back to its raw value. */
export function formatEventTime(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
