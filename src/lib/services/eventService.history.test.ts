import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventService, type EventHistoryParams } from './eventService.js';

// Mock dependencies at the top level
vi.mock('svelte/store', () => ({
	get: vi.fn()
}));

vi.mock('../stores/auth.js', () => ({
	user: { subscribe: vi.fn(), set: vi.fn() }
}));

vi.mock('../supabase.js', () => ({
	supabase: {
		from: vi.fn()
	}
}));

const mockUser = {
	id: 'user123',
	email: 'test@example.com'
};

const mockEvents = [
	{
		id: 'event1',
		user_id: 'user123',
		event_type_id: 'type1',
		severity: 7,
		started_at: '2026-01-15T10:00:00Z',
		notes: 'Severe headache',
		event_type: { name: 'Migraine', icon: '🤕' },
		event_locations: []
	},
	{
		id: 'event2',
		user_id: 'user123',
		event_type_id: 'type2',
		severity: 4,
		started_at: '2026-01-14T15:30:00Z',
		notes: 'Muscle tension',
		event_type: { name: 'Spasm', icon: '💪' },
		event_locations: [
			{ body_location: { name: 'Back' } }
		]
	}
];

describe('EventService.getEventHistory', () => {
	let mockQuery: any;
	let mockGet: any;
	let mockSupabase: any;

	beforeEach(async () => {
		vi.clearAllMocks();

		// Get the mocked modules
		const { get } = await import('svelte/store');
		const { supabase } = await import('../supabase.js');

		mockGet = vi.mocked(get);
		mockSupabase = supabase;

		// Mock the query chain
		mockQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			in: vi.fn().mockReturnThis(),
			gte: vi.fn().mockReturnThis(),
			lte: vi.fn().mockReturnThis(),
			ilike: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
			range: vi.fn().mockImplementation(() => Promise.resolve({
				data: mockEvents,
				error: null,
				count: 2
			}))
		};

		vi.mocked(mockSupabase.from).mockReturnValue(mockQuery);
		mockGet.mockReturnValue(mockUser);
	});

	it('should fetch event history with default parameters', async () => {
		const result = await EventService.getEventHistory();

		expect(result.success).toBe(true);
		expect(result.events).toEqual(mockEvents);
		expect(result.totalCount).toBe(2);

		// Verify query was built correctly
		expect(mockQuery.select).toHaveBeenCalledWith(
			expect.stringContaining('event_type:event_types'),
			{ count: 'exact' }
		);
		expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user123');
		expect(mockQuery.order).toHaveBeenCalledWith('started_at', { ascending: false });
		expect(mockQuery.range).toHaveBeenCalledWith(0, 24); // limit 25, so range 0-24
	});

	it('should apply event type filtering', async () => {
		const params: EventHistoryParams = {
			eventTypeIds: ['type1', 'type2']
		};

		await EventService.getEventHistory(params);

		expect(mockQuery.in).toHaveBeenCalledWith('event_type_id', ['type1', 'type2']);
	});

	it('should apply date range filtering', async () => {
		const params: EventHistoryParams = {
			startDate: '2026-01-01T00:00:00Z',
			endDate: '2026-01-31T23:59:59Z'
		};

		await EventService.getEventHistory(params);

		expect(mockQuery.gte).toHaveBeenCalledWith('started_at', '2026-01-01T00:00:00Z');
		expect(mockQuery.lte).toHaveBeenCalledWith('started_at', '2026-01-31T23:59:59Z');
	});

	it('should apply search term filtering', async () => {
		const params: EventHistoryParams = {
			searchTerm: 'headache'
		};

		await EventService.getEventHistory(params);

		expect(mockQuery.ilike).toHaveBeenCalledWith('notes', '%headache%');
	});

	it('should apply custom sorting', async () => {
		const params: EventHistoryParams = {
			sortBy: 'severity',
			sortOrder: 'asc'
		};

		await EventService.getEventHistory(params);

		expect(mockQuery.order).toHaveBeenCalledWith('severity', { ascending: true });
	});

	it('should apply pagination correctly', async () => {
		const params: EventHistoryParams = {
			limit: 10,
			offset: 20
		};

		await EventService.getEventHistory(params);

		expect(mockQuery.range).toHaveBeenCalledWith(20, 29); // offset 20, limit 10, so range 20-29
	});

	it('should handle unauthenticated user', async () => {
		mockGet.mockReturnValue(null);

		const result = await EventService.getEventHistory();

		expect(result.success).toBe(false);
		expect(result.error).toBe('User not authenticated');
	});

	it('should handle database errors', async () => {
		mockQuery.range.mockImplementation(() => Promise.resolve({
			data: null,
			error: { message: 'Database connection failed' },
			count: null
		}));

		const result = await EventService.getEventHistory();

		expect(result.success).toBe(false);
		expect(result.error).toBe('Database error: Database connection failed');
	});

	it('should handle network errors', async () => {
		mockQuery.range.mockImplementation(() => Promise.reject(new Error('Network error')));

		const result = await EventService.getEventHistory();

		expect(result.success).toBe(false);
		expect(result.error).toBe('Network error');
	});

	it('should not apply empty filters', async () => {
		const params: EventHistoryParams = {
			eventTypeIds: [],
			searchTerm: '',
			startDate: undefined,
			endDate: undefined
		};

		await EventService.getEventHistory(params);

		// Should only have base query calls
		expect(mockQuery.in).not.toHaveBeenCalled();
		expect(mockQuery.ilike).not.toHaveBeenCalled();
		expect(mockQuery.gte).not.toHaveBeenCalled();
		expect(mockQuery.lte).not.toHaveBeenCalled();
	});
});