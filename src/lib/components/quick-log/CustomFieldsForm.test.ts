import { describe, it, expect, vi, beforeEach } from 'vitest';
import { quickLogStore, quickLogActions, type QuickLogState } from '$lib/stores/quickLog.js';
import { get } from 'svelte/store';

describe('CustomFieldsForm Store Integration', () => {
	beforeEach(() => {
		// Reset store to initial state
		quickLogActions.reset();
	});

	it('should handle custom field updates in store', () => {
		// Set up an event type with custom fields
		const mockEventType = {
			id: 'bowel-movement',
			name: 'Bowel Movement',
			slug: 'bowel-movement',
			icon: '💩',
			has_duration: true,
			has_location: false,
			has_severity: false,
			custom_fields: [
				{
					name: 'duration',
					type: 'select' as const,
					options: ['Quick (<5 min)', 'Normal (5-15 min)', 'Extended (15+ min)']
				},
				{
					name: 'consistency',
					type: 'select' as const,
					options: ['Hard', 'Normal', 'Loose']
				},
				{
					name: 'amount',
					type: 'number' as const,
					label: 'Flush count'
				}
			],
			sort_order: 10,
			active: true,
			auto_resolve: false,
			created_at: new Date().toISOString(),
			user_id: null
		};

		// Start the flow and select event type
		quickLogActions.start();
		quickLogActions.selectEventType(mockEventType);

		const state = get(quickLogStore);
		expect(state.step).toBe('custom-fields');
		expect(state.selectedType).toEqual(mockEventType);
	});

	it('should update custom field values correctly', () => {
		const mockEventType = {
			id: 'bowel-movement',
			name: 'Bowel Movement',
			slug: 'bowel-movement',
			icon: '💩',
			has_duration: true,
			has_location: false,
			has_severity: false,
			custom_fields: [
				{
					name: 'duration',
					type: 'select' as const,
					options: ['Quick (<5 min)', 'Normal (5-15 min)', 'Extended (15+ min)']
				}
			],
			sort_order: 10,
			active: true,
			auto_resolve: false,
			created_at: new Date().toISOString(),
			user_id: null
		};

		quickLogActions.start();
		quickLogActions.selectEventType(mockEventType);

		// Set custom field value
		quickLogActions.setCustomField('duration', 'Quick (<5 min)');

		const state = get(quickLogStore);
		expect(state.customFields.duration).toBe('Quick (<5 min)');
	});

	it('should continue to submitting step from custom fields', () => {
		const mockEventType = {
			id: 'bowel-movement',
			name: 'Bowel Movement',
			slug: 'bowel-movement',
			icon: '💩',
			has_duration: true,
			has_location: false,
			has_severity: false,
			custom_fields: [
				{
					name: 'duration',
					type: 'select' as const,
					options: ['Quick (<5 min)', 'Normal (5-15 min)', 'Extended (15+ min)']
				}
			],
			sort_order: 10,
			active: true,
			auto_resolve: false,
			created_at: new Date().toISOString(),
			user_id: null
		};

		quickLogActions.start();
		quickLogActions.selectEventType(mockEventType);

		expect(get(quickLogStore).step).toBe('custom-fields');

		quickLogActions.continueFromCustomFields();

		expect(get(quickLogStore).step).toBe('submitting');
	});

	it('should navigate back correctly from custom fields step', () => {
		const mockEventType = {
			id: 'bowel-movement',
			name: 'Bowel Movement',
			slug: 'bowel-movement',
			icon: '💩',
			has_duration: true,
			has_location: false,
			has_severity: false,
			custom_fields: [
				{
					name: 'duration',
					type: 'select' as const,
					options: ['Quick (<5 min)', 'Normal (5-15 min)', 'Extended (15+ min)']
				}
			],
			sort_order: 10,
			active: true,
			auto_resolve: false,
			created_at: new Date().toISOString(),
			user_id: null
		};

		quickLogActions.start();
		quickLogActions.selectEventType(mockEventType);

		expect(get(quickLogStore).step).toBe('custom-fields');

		quickLogActions.goBack();

		expect(get(quickLogStore).step).toBe('type-selection');
	});

	it('should handle multiple custom field updates', () => {
		const mockEventType = {
			id: 'bowel-movement',
			name: 'Bowel Movement',
			slug: 'bowel-movement',
			icon: '💩',
			has_duration: true,
			has_location: false,
			has_severity: false,
			custom_fields: [
				{
					name: 'duration',
					type: 'select' as const,
					options: ['Quick (<5 min)', 'Normal (5-15 min)', 'Extended (15+ min)']
				},
				{
					name: 'consistency',
					type: 'select' as const,
					options: ['Hard', 'Normal', 'Loose']
				},
				{
					name: 'amount',
					type: 'number' as const,
					label: 'Flush count'
				}
			],
			sort_order: 10,
			active: true,
			auto_resolve: false,
			created_at: new Date().toISOString(),
			user_id: null
		};

		quickLogActions.start();
		quickLogActions.selectEventType(mockEventType);

		// Set multiple custom fields
		quickLogActions.setCustomField('duration', 'Normal (5-15 min)');
		quickLogActions.setCustomField('consistency', 'Loose');
		quickLogActions.setCustomField('amount', 2);

		const state = get(quickLogStore);
		expect(state.customFields).toEqual({
			duration: 'Normal (5-15 min)',
			consistency: 'Loose',
			amount: 2
		});
	});

	it('should go to custom fields step for events with location/severity', () => {
		const mockEventTypeWithLocationSeverity = {
			id: 'muscle-spasm',
			name: 'Muscle Spasm',
			slug: 'muscle-spasm',
			icon: '⚡',
			has_duration: true,
			has_location: true,
			has_severity: true,
			custom_fields: [],
			sort_order: 1,
			active: true,
			auto_resolve: false,
			created_at: new Date().toISOString(),
			user_id: null
		};

		quickLogActions.start();
		quickLogActions.selectEventType(mockEventTypeWithLocationSeverity);

		const state = get(quickLogStore);
		// In the new unified architecture, all event types go to custom-fields step
		// where SymptomForm handles location/severity for muscle spasms
		expect(state.step).toBe('custom-fields');
	});
});