import {
  buildStateInspectorExport,
  buildStateTree,
  collectExpandablePaths,
  formatEventPayload,
  formatEventTime,
  parseStateImport,
  safeStringify,
} from './state-inspector.utils';

describe('state inspector utilities', () => {
  it('builds a type-coloured tree for plain values', () => {
    const tree = buildStateTree({
      name: 'Lynx rufus',
      count: 12,
      active: true,
      missing: null,
      none: undefined,
    });

    expect(tree.kind).toBe('object');
    expect(tree.preview).toBe('{5}');
    expect(tree.children.map((child) => child.kind)).toEqual([
      'string',
      'number',
      'boolean',
      'null',
      'undefined',
    ]);
    expect(tree.children[0].preview).toBe('"Lynx rufus"');
  });

  it('handles empty objects and arrays', () => {
    expect(buildStateTree({}).preview).toBe('{}');
    expect(buildStateTree([]).preview).toBe('[]');
  });

  it('detects circular references without marking shared siblings', () => {
    const shared = { value: 1 };
    const source: Record<string, unknown> = { a: shared, b: shared };
    source['self'] = source;

    const tree = buildStateTree(source);
    const self = tree.children.find((child) => child.key === 'self');
    const a = tree.children.find((child) => child.key === 'a');
    const b = tree.children.find((child) => child.key === 'b');

    expect(self?.kind).toBe('circular');
    expect(a?.kind).toBe('object');
    expect(b?.kind).toBe('object');
  });

  it('stops at maxDepth', () => {
    const tree = buildStateTree({ a: { b: { c: 1 } } }, { maxDepth: 1 });
    const a = tree.children[0];

    expect(a.kind).toBe('max-depth');
    expect(a.children).toEqual([]);
  });

  it('limits children and reports how many were omitted', () => {
    const tree = buildStateTree({ a: 1, b: 2, c: 3 }, { maxChildren: 2 });

    expect(tree.children.length).toBe(2);
    expect(tree.note).toBe('more-children');
    expect(tree.noteCount).toBe(1);
  });

  it('collects every expandable path', () => {
    const tree = buildStateTree({ a: { b: { c: 1 } }, d: 2 });
    expect(collectExpandablePaths(tree)).toEqual(['$', '$.a', '$.a.b']);
  });

  it('serialises circular and special values safely', () => {
    const source: Record<string, unknown> = { big: 10n, fn: function named() {} };
    source['self'] = source;

    const parsed = JSON.parse(safeStringify(source));

    expect(parsed.self).toBe('[Circular]');
    expect(parsed.big).toBe('10n');
    expect(parsed.fn).toBe('[Function named]');
  });

  it('builds and parses an export payload', () => {
    const payload = buildStateInspectorExport({ a: 1 }, [{ name: 'DATASET_LOADED' }]);
    const imported = parseStateImport(JSON.stringify(payload));

    expect(imported.state).toEqual({ a: 1 });
    expect(imported.events?.[0].name).toBe('DATASET_LOADED');
    expect(payload.exportedAt).toBeTruthy();
  });

  it('accepts raw state JSON on import', () => {
    expect(parseStateImport('{"a":1}').state).toEqual({ a: 1 });
  });

  it('formats event payloads and timestamps', () => {
    expect(formatEventPayload(undefined)).toBe('undefined');
    expect(formatEventPayload({ a: 1 })).toBe('{"a":1}');
    expect(formatEventPayload({ text: 'x'.repeat(20) }, 10).endsWith('…')).toBeTrue();
    expect(formatEventTime('not-a-date')).toBe('not-a-date');
    expect(formatEventTime('2026-10-25T18:00:00Z')).toBeTruthy();
  });
});
