import { TestBed } from '@angular/core/testing';

import { StateInspectorComponent } from './state-inspector.component';
import { StateInspectorEvent } from './state-inspector.types';

describe('StateInspectorComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StateInspectorComponent],
    }).compileComponents();
  });

  it('shows an empty state when no state is provided', () => {
    const fixture = TestBed.createComponent(StateInspectorComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.st-empty')).toBeTruthy();
  });

  it('renders the state tree and expands nested objects', () => {
    const fixture = TestBed.createComponent(StateInspectorComponent);
    fixture.componentRef.setInput('state', { a: { b: 1 }, c: 2 });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.st-node').length).toBe(3);

    fixture.componentInstance.toggle('state.a');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.st-node').length).toBe(4);
    expect(fixture.nativeElement.textContent).toContain('b');
  });

  it('expands and collapses all nodes', () => {
    const fixture = TestBed.createComponent(StateInspectorComponent);
    fixture.componentRef.setInput('state', { a: { b: { c: 1 } }, d: 2 });
    fixture.detectChanges();

    fixture.componentInstance.expandAll();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.st-node').length).toBe(5);

    fixture.componentInstance.collapseAll();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.st-node').length).toBe(1);
  });

  it('renders events and emits when they are cleared', () => {
    const fixture = TestBed.createComponent(StateInspectorComponent);
    const events: StateInspectorEvent[] = [
      {
        name: 'DATASET_LOADED',
        at: '2026-10-25T18:00:00Z',
        payload: { rows: 50000 },
      },
    ];
    fixture.componentRef.setInput('events', events);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.st-event').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.st-event-payload').textContent)
      .toContain('50000');

    spyOn(fixture.componentInstance.eventsCleared, 'emit');
    fixture.componentInstance.clearEvents();
    expect(fixture.componentInstance.eventsCleared.emit).toHaveBeenCalled();
  });

  it('reports omitted children through the note text', () => {
    const fixture = TestBed.createComponent(StateInspectorComponent);
    fixture.componentRef.setInput('state', { a: 1, b: 2, c: 3 });
    fixture.componentRef.setInput('maxChildren', 2);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.st-note').textContent)
      .toContain('1');
  });
});
