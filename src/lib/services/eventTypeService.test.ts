import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventTypeService } from './eventTypeService.js';

vi.mock('svelte/store', () => ({
	get: vi.fn()
}));

vi.mock('../stores/auth.js', () => ({
	user: { subscribe: vi.fn(), set: vi.fn() }
}));

vi.mock('../stores/eventTypes.js', () => ({
	clearEventTypesCache: vi.fn()
}));

vi.mock('../supabase.js', () => ({
	supabase: {
		from: vi.fn()
	}
}));

const mockUser = {
	id: 'user-123',
	email: 'test@example.com'
};

describe('EventTypeService.createEventType', () => {
	let mockSupabase: any;
	let mockGet: any;
	let checkQuery: any;
	let insertQuery: any;
	let fromCallCount: number;

	beforeEach(async () => {
		vi.clearAllMocks();

		const { get } = await import('svelte/store');
		const { supabase } = await import('../supabase.js');

		mockGet = vi.mocked(get);
		mockGet.mockReturnValue(mockUser);
		mockSupabase = supabase;

		// First .from() call: the checkSlugUnique chain
		// .select().or().limit() — terminal await on the limit promise
		checkQuery = {
			select: vi.fn().mockReturnThis(),
			or: vi.fn().mockReturnThis(),
			neq: vi.fn().mockReturnThis(),
			limit: vi.fn().mockResolvedValue({ data: [], error: null })
		};

		// Second .from() call: the insert chain
		// .insert().select().single() — single() is terminal
		insertQuery = {
			insert: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: {
					id: 'new-type-id',
					name: 'Test',
					slug: 'novel-slug',
					user_id: mockUser.id
				},
				error: null
			})
		};

		fromCallCount = 0;
		vi.mocked(mockSupabase.from).mockImplementation(() => {
			fromCallCount += 1;
			return fromCallCount === 1 ? checkQuery : insertQuery;
		});
	});

	it('uses a slug-scoped uniqueness check (regression for #122)', async () => {
		// The original bug: .or('slug.eq.X,user_id.is.null') matched any
		// system default regardless of slug, always reporting "in use".
		// The fix nests AND so each branch ties slug to a scope.
		await EventTypeService.createEventType({
			name: 'Test',
			slug: 'novel-slug'
		});

		expect(checkQuery.or).toHaveBeenCalledTimes(1);
		const orFilter = checkQuery.or.mock.calls[0][0] as string;

		// Each branch of the OR must AND the slug with a user-scope condition.
		expect(orFilter).toContain(`and(slug.eq.novel-slug,user_id.eq.${mockUser.id})`);
		expect(orFilter).toContain('and(slug.eq.novel-slug,user_id.is.null)');

		// Guard against regressions to the broken pattern.
		expect(orFilter).not.toMatch(/^slug\.eq\.[^,]+,user_id\.is\.null$/);
	});

	it('creates the event type when slug is unique despite system defaults existing', async () => {
		const result = await EventTypeService.createEventType({
			name: 'Test',
			slug: 'novel-slug'
		});

		expect(result.success).toBe(true);
		expect(insertQuery.insert).toHaveBeenCalledTimes(1);
		const inserted = insertQuery.insert.mock.calls[0][0];
		expect(inserted.user_id).toBe(mockUser.id);
		expect(inserted.slug).toBe('novel-slug');
	});

	it('rejects creation when slug already exists in scope and skips insert', async () => {
		checkQuery.limit.mockResolvedValueOnce({
			data: [{ id: 'existing-id' }],
			error: null
		});

		const result = await EventTypeService.createEventType({
			name: 'Test',
			slug: 'duplicate-slug'
		});

		expect(result.success).toBe(false);
		expect(result.error).toMatch(/already in use/);
		expect(insertQuery.insert).not.toHaveBeenCalled();
	});
});
