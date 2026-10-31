import { describe, it, expect } from 'vitest';
import { generateCSV, generateSummaryStats } from './exportUtils.js';
import type { ExportEventData } from '../services/eventService.js';

const baseEventType = {
	id: 't-pain',
	name: 'Pain',
	slug: 'pain',
	icon: '🤕',
	has_severity: true,
	has_location: true,
	has_duration: true,
	sort_order: 1,
	active: true,
	custom_fields: null,
	created_at: null,
	user_id: null
} as ExportEventData['event_type'];

function buildEvent(overrides: Partial<ExportEventData> = {}): ExportEventData {
	return {
		id: 'e-1',
		user_id: 'u-1',
		event_type_id: baseEventType.id,
		severity: 5,
		started_at: '2026-04-01T10:00:00Z',
		ended_at: '2026-04-01T11:00:00Z',
		notes: null,
		attributes: null,
		created_at: null,
		updated_at: null,
		event_type: baseEventType,
		event_locations: [],
		event_interventions: [],
		event_notes: [],
		...overrides
	};
}

describe('generateCSV', () => {
	it('returns "No events to export" for an empty array', () => {
		expect(generateCSV([])).toBe('No events to export');
	});

	it('emits the expected header row in order', () => {
		const csv = generateCSV([buildEvent()], false);
		const headerRow = csv.split('\n')[0];
		expect(headerRow).toBe(
			'Date,Time,Event Type,Severity,Duration (hours),Body Locations,Interventions,Intervention Times,Intervention Notes,Timeline Notes,Custom Fields'
		);
	});

	it('escapes embedded double quotes by doubling them', () => {
		const csv = generateCSV(
			[
				buildEvent({
					event_type: { ...baseEventType, name: 'A "test" type' }
				})
			],
			false
		);
		expect(csv).toContain('"A ""test"" type"');
	});

	it('quotes cells containing commas', () => {
		const csv = generateCSV(
			[
				buildEvent({
					event_type: { ...baseEventType, name: 'Pain, severe' }
				})
			],
			false
		);
		expect(csv).toContain('"Pain, severe"');
	});

	it('joins multiple body locations with comma-space', () => {
		const csv = generateCSV(
			[
				buildEvent({
					event_locations: [
						{ body_location: { name: 'Back' } as any },
						{ body_location: { name: 'Neck' } as any }
					]
				})
			],
			false
		);
		expect(csv).toContain('"Back, Neck"');
	});

	it('joins multiple interventions with comma-space', () => {
		const csv = generateCSV(
			[
				buildEvent({
					event_interventions: [
						{ intervention: { name: 'Stretching' } as any, applied_at: null, notes: null },
						{ intervention: { name: 'Heat pad' } as any, applied_at: null, notes: null }
					]
				})
			],
			false
		);
		expect(csv).toContain('"Stretching, Heat pad"');
	});

	it('sorts timeline notes chronologically with [timestamp] content format', () => {
		const csv = generateCSV(
			[
				buildEvent({
					event_notes: [
						{ id: 'n2', content: 'Second', created_at: '2026-04-01T11:00:00Z' },
						{ id: 'n1', content: 'First', created_at: '2026-04-01T10:30:00Z' }
					]
				})
			],
			false
		);
		const firstIdx = csv.indexOf('First');
		const secondIdx = csv.indexOf('Second');
		expect(firstIdx).toBeGreaterThan(0);
		expect(secondIdx).toBeGreaterThan(firstIdx);
	});

	it('renders custom fields as "key: value | key: value"', () => {
		const csv = generateCSV(
			[buildEvent({ attributes: { trigger: 'work email', mood: 'anxious' } })],
			false
		);
		// Object.entries order isn't strictly guaranteed but is insertion-order
		// in practice; assert both segments are present.
		expect(csv).toContain('trigger: work email');
		expect(csv).toContain('mood: anxious');
		expect(csv).toContain(' | ');
	});

	it('appends summary statistics when includeStats is true', () => {
		const csv = generateCSV([buildEvent()], true);
		expect(csv).toContain('--- SUMMARY STATISTICS ---');
		expect(csv).toContain('Total Events,1');
	});

	it('omits summary statistics when includeStats is false', () => {
		const csv = generateCSV([buildEvent()], false);
		expect(csv).not.toContain('--- SUMMARY STATISTICS ---');
	});

	it('treats null severity as an empty cell', () => {
		const csv = generateCSV([buildEvent({ severity: null })], false);
		// Severity is the 4th column. Headers are at row 0, data at row 1.
		const dataRow = csv.split('\n')[1];
		const cells = dataRow.split('","');
		// 4th cell (index 3) is severity. Empty string in the source becomes
		// just `""` after the quote-wrap.
		expect(cells[3]).toBe('');
	});
});

describe('generateSummaryStats', () => {
	it('returns zero defaults for an empty event list', () => {
		const stats = generateSummaryStats([]);
		expect(stats.totalEvents).toBe(0);
		expect(stats.dateRange.start).toBe('');
		expect(stats.dateRange.end).toBe('');
		expect(stats.eventTypeBreakdown).toEqual([]);
		expect(stats.commonLocations).toEqual([]);
		expect(stats.interventionUsage).toEqual([]);
	});

	it('aggregates event types and severity across multiple events', () => {
		const stats = generateSummaryStats([
			buildEvent({
				severity: 5,
				event_type: { ...baseEventType, name: 'Pain' }
			}),
			buildEvent({
				severity: 8,
				event_type: { ...baseEventType, name: 'Pain' }
			}),
			buildEvent({
				severity: 3,
				event_type: { ...baseEventType, id: 't-spasm', name: 'Spasm' }
			})
		]);

		expect(stats.totalEvents).toBe(3);

		const typeNames = stats.eventTypeBreakdown.map((e) => e.typeName).sort();
		expect(typeNames).toEqual(['Pain', 'Spasm']);

		// Pain should appear first (count 2 vs Spasm's 1)
		expect(stats.eventTypeBreakdown[0].typeName).toBe('Pain');
		expect(stats.eventTypeBreakdown[0].count).toBe(2);

		expect(stats.severityStats?.average).toBeCloseTo((5 + 8 + 3) / 3, 1);
		expect(stats.severityStats?.min).toBe(3);
		expect(stats.severityStats?.max).toBe(8);
	});

	it('counts location occurrences across events', () => {
		const stats = generateSummaryStats([
			buildEvent({
				event_locations: [
					{ body_location: { name: 'Back' } as any },
					{ body_location: { name: 'Neck' } as any }
				]
			}),
			buildEvent({
				event_locations: [{ body_location: { name: 'Back' } as any }]
			})
		]);

		const back = stats.commonLocations.find((l) => l.location === 'Back');
		const neck = stats.commonLocations.find((l) => l.location === 'Neck');
		expect(back?.count).toBe(2);
		expect(neck?.count).toBe(1);
	});
});
