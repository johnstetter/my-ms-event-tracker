import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventService } from './eventService.js';
import type { EventType, BodyLocation } from '../supabase.js';

vi.mock('svelte/store', () => ({
	get: vi.fn()
}));

vi.mock('../stores/auth.js', () => ({
	user: { subscribe: vi.fn(), set: vi.fn() }
}));

vi.mock('../supabase.js', () => ({
	supabase: { from: vi.fn() }
}));

const mockUser = { id: 'user-123', email: 'test@example.com' };

const physicalEventType: EventType = {
	id: 'type-pain',
	slug: 'pain',
	name: 'Pain',
	icon: '🤕',
	has_severity: true,
	has_location: true,
	has_duration: true,
	auto_resolve: false,
	sort_order: 1,
	active: true,
	custom_fields: null,
	created_at: null,
	user_id: null
};

const mentalEventType: EventType = {
	id: 'type-panic',
	slug: 'panic',
	name: 'Panic',
	icon: '🌀',
	has_severity: true,
	has_location: false,
	has_duration: true,
	auto_resolve: false,
	sort_order: 2,
	active: true,
	custom_fields: null,
	created_at: null,
	user_id: null
};

const autoResolveEventType: EventType = {
	id: 'type-bowel',
	slug: 'bowel-movement',
	name: 'Bowel Movement',
	icon: '💩',
	has_severity: false,
	has_location: false,
	has_duration: true,
	auto_resolve: true,
	sort_order: 10,
	active: true,
	custom_fields: null,
	created_at: null,
	user_id: null
};

const bodyLocation: BodyLocation = {
	id: 'loc-back',
	name: 'Back',
	region: 'torso',
	sort_order: 1,
	active: true,
	user_id: null
};

describe('EventService.createQuickEvent', () => {
	let mockSupabase: any;
	let mockGet: any;
	let eventInsertChain: any;
	let locationInsertChain: any;
	let eventDeleteChain: any;

	beforeEach(async () => {
		vi.clearAllMocks();

		const { get } = await import('svelte/store');
		const { supabase } = await import('../supabase.js');

		mockGet = vi.mocked(get);
		mockGet.mockReturnValue(mockUser);
		mockSupabase = supabase;

		// First .from('events') call: insert chain
		eventInsertChain = {
			insert: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: { id: 'event-1', user_id: mockUser.id, event_type_id: 'type-1' },
				error: null
			})
		};

		// .from('event_locations') call: insert chain (terminal — awaited directly)
		locationInsertChain = {
			insert: vi.fn().mockResolvedValue({ data: null, error: null })
		};

		// Second .from('events') call (rollback): delete chain
		eventDeleteChain = {
			delete: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({ data: null, error: null })
		};

		let eventsCallCount = 0;
		vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
			if (table === 'events') {
				eventsCallCount += 1;
				return eventsCallCount === 1 ? eventInsertChain : eventDeleteChain;
			}
			if (table === 'event_locations') {
				return locationInsertChain;
			}
			throw new Error(`Unexpected table: ${table}`);
		});
	});

	describe('validation', () => {
		it('rejects when user is not authenticated', async () => {
			mockGet.mockReturnValueOnce(null);

			const result = await EventService.createQuickEvent({
				eventType: mentalEventType,
				severity: 5
			});

			expect(result.success).toBe(false);
			expect(result.error).toBe('User not authenticated');
			expect(mockSupabase.from).not.toHaveBeenCalled();
		});

		it('rejects when event type is missing', async () => {
			const result = await EventService.createQuickEvent({
				eventType: undefined as unknown as EventType,
				severity: 5
			});

			expect(result.success).toBe(false);
			expect(result.error).toBe('Event type is required');
			expect(mockSupabase.from).not.toHaveBeenCalled();
		});

		it('rejects when has_severity but severity is not provided', async () => {
			const result = await EventService.createQuickEvent({
				eventType: mentalEventType
			});

			expect(result.success).toBe(false);
			expect(result.error).toMatch(/severity is required/i);
			expect(mockSupabase.from).not.toHaveBeenCalled();
		});

		it('rejects when severity is out of range', async () => {
			const result = await EventService.createQuickEvent({
				eventType: mentalEventType,
				severity: 11
			});

			expect(result.success).toBe(false);
			expect(result.error).toMatch(/between 1 and 10/);
			expect(mockSupabase.from).not.toHaveBeenCalled();
		});

		it('rejects when has_location but no locations provided', async () => {
			const result = await EventService.createQuickEvent({
				eventType: physicalEventType,
				severity: 5,
				locations: []
			});

			expect(result.success).toBe(false);
			expect(result.error).toMatch(/at least one location/i);
			expect(mockSupabase.from).not.toHaveBeenCalled();
		});
	});

	describe('createEventOnly path (no locations)', () => {
		it('inserts a single event row and returns success', async () => {
			const result = await EventService.createQuickEvent({
				eventType: mentalEventType,
				severity: 7,
				notes: 'Felt a panic moment while doing dishes'
			});

			expect(result.success).toBe(true);
			expect(result.event?.id).toBe('event-1');

			expect(eventInsertChain.insert).toHaveBeenCalledTimes(1);
			expect(locationInsertChain.insert).not.toHaveBeenCalled();

			const inserted = eventInsertChain.insert.mock.calls[0][0];
			expect(inserted.user_id).toBe(mockUser.id);
			expect(inserted.event_type_id).toBe(mentalEventType.id);
			expect(inserted.severity).toBe(7);
			expect(inserted.notes).toBe('Felt a panic moment while doing dishes');
		});

		it('returns DB error when event insert fails', async () => {
			eventInsertChain.single.mockResolvedValueOnce({
				data: null,
				error: { message: 'connection timeout' }
			});

			const result = await EventService.createQuickEvent({
				eventType: mentalEventType,
				severity: 5
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain('connection timeout');
		});
	});

	describe('createEventWithLocations path', () => {
		it('inserts the event then the location associations on happy path', async () => {
			const result = await EventService.createQuickEvent({
				eventType: physicalEventType,
				severity: 8,
				locations: [bodyLocation]
			});

			expect(result.success).toBe(true);
			expect(eventInsertChain.insert).toHaveBeenCalledTimes(1);
			expect(locationInsertChain.insert).toHaveBeenCalledTimes(1);

			const locationInserts = locationInsertChain.insert.mock.calls[0][0];
			expect(locationInserts).toEqual([
				{ event_id: 'event-1', body_location_id: bodyLocation.id }
			]);

			// No rollback should have happened
			expect(eventDeleteChain.delete).not.toHaveBeenCalled();
		});

		it('rolls back the event when location insert fails', async () => {
			// This codifies the audit-flagged rollback path: if location
			// associations fail, the orphan event row must be deleted.
			locationInsertChain.insert.mockResolvedValueOnce({
				data: null,
				error: { message: 'duplicate key violation' }
			});

			const result = await EventService.createQuickEvent({
				eventType: physicalEventType,
				severity: 8,
				locations: [bodyLocation]
			});

			expect(result.success).toBe(false);
			expect(result.error).toMatch(/Failed to associate locations/);
			expect(result.error).toContain('duplicate key violation');

			// Critical: rollback delete must have been called for the orphan event id.
			expect(eventDeleteChain.delete).toHaveBeenCalledTimes(1);
			expect(eventDeleteChain.eq).toHaveBeenCalledWith('id', 'event-1');
		});
	});

	describe('auto-resolve behavior (#53)', () => {
		it('sets ended_at = started_at when event type has auto_resolve=true', async () => {
			const result = await EventService.createQuickEvent({
				eventType: autoResolveEventType,
				startedAt: '2026-04-26T12:00:00.000Z',
				customFields: { consistency: 'Normal' }
			});

			expect(result.success).toBe(true);
			expect(eventInsertChain.insert).toHaveBeenCalledTimes(1);

			const inserted = eventInsertChain.insert.mock.calls[0][0];
			expect(inserted.started_at).toBe('2026-04-26T12:00:00.000Z');
			expect(inserted.ended_at).toBe('2026-04-26T12:00:00.000Z');
			expect(inserted.ended_at).toBe(inserted.started_at);
			// Custom fields are still captured alongside auto-resolve.
			expect(inserted.attributes).toEqual({ consistency: 'Normal' });
		});

		it('does not set ended_at when event type has auto_resolve=false', async () => {
			const result = await EventService.createQuickEvent({
				eventType: mentalEventType,
				severity: 5
			});

			expect(result.success).toBe(true);
			const inserted = eventInsertChain.insert.mock.calls[0][0];
			expect(inserted.ended_at).toBeUndefined();
		});
	});
});
