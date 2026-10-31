import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { supabase, type EventType } from '../supabase.js';
import {
	EventTypeService,
	type CreateEventTypeParams,
	type UpdateEventTypeParams,
	type EventTypeResult,
	type EventTypesResult,
	type DeleteResult
} from '../services/eventTypeService.js';

// Event types store with caching
export const eventTypes = writable<EventType[]>([]);
export const eventTypesLoading = writable(true);
export const eventTypesError = writable<string | null>(null);

// Cache key for localStorage. Bump the suffix whenever an event_types
// schema change adds/removes columns, so existing clients invalidate
// stale rows on next load instead of using cached objects that are
// missing the new fields. v2 added auto_resolve (#53).
const CACHE_KEY = 'ms-tracker-event-types-v2';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Cache structure
interface EventTypesCache {
	data: EventType[];
	timestamp: number;
}

// Load event types from cache or fetch from database
export async function loadEventTypes(forceRefresh = false): Promise<void> {
	eventTypesLoading.set(true);
	eventTypesError.set(null);

	try {
		let cachedData: EventType[] | null = null;

		// Try to load from cache first (unless force refresh)
		if (browser && !forceRefresh) {
			const cached = localStorage.getItem(CACHE_KEY);
			if (cached) {
				try {
					const parsedCache: EventTypesCache = JSON.parse(cached);
					const isExpired = Date.now() - parsedCache.timestamp > CACHE_DURATION;

					if (!isExpired && Array.isArray(parsedCache.data)) {
						cachedData = parsedCache.data;
						eventTypes.set(cachedData);
						eventTypesLoading.set(false);

						// Still fetch in background for fresh data
						fetchEventTypesInBackground();
						return;
					}
				} catch (e) {
					// Invalid cache, will fetch fresh
					console.warn('Invalid event types cache, fetching fresh data');
				}
			}
		}

		// Fetch from database
		await fetchEventTypes();
	} catch (error) {
		console.error('Error loading event types:', error);
		eventTypesError.set(error instanceof Error ? error.message : 'Failed to load event types');
		eventTypesLoading.set(false);
	}
}

// Fetch event types from database
async function fetchEventTypes(): Promise<void> {
	const { data, error } = await supabase
		.from('event_types')
		.select('*')
		.eq('active', true)
		.order('sort_order', { ascending: true });

	if (error) {
		throw new Error(`Database error: ${error.message}`);
	}

	if (data) {
		// Update store
		eventTypes.set(data);

		// Update cache
		if (browser) {
			const cacheData: EventTypesCache = {
				data,
				timestamp: Date.now()
			};
			localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
		}
	}

	eventTypesLoading.set(false);
}

// Fetch in background without loading states
async function fetchEventTypesInBackground(): Promise<void> {
	try {
		await fetchEventTypes();
	} catch (error) {
		console.warn('Background event types refresh failed:', error);
	}
}

// Get specific event type by slug
export function getEventTypeBySlug(slug: string): EventType | undefined {
	let result: EventType | undefined;
	eventTypes.subscribe(types => {
		result = types.find(type => type.slug === slug);
	})();
	return result;
}

// Get event types for quick actions (commonly used types)
export function getQuickActionTypes(): EventType[] {
	let result: EventType[] = [];
	eventTypes.subscribe(types => {
		// Return types in sort order, typically the first 4-6 for quick actions
		result = types.slice(0, 6);
	})();
	return result;
}

// Clear cache (useful for debugging or force refresh)
export function clearEventTypesCache(): void {
	if (browser) {
		localStorage.removeItem(CACHE_KEY);
	}
}

/**
 * ADMIN FUNCTIONS - For managing custom event types
 */

// Admin object with CRUD operations
export const eventTypesAdmin = {
	/**
	 * Create a new custom event type
	 */
	create: async (params: CreateEventTypeParams): Promise<EventTypeResult> => {
		const result = await EventTypeService.createEventType(params);
		if (result.success) {
			// Force refresh to show new event type immediately
			await loadEventTypes(true);
		}
		return result;
	},

	/**
	 * Update an existing custom event type
	 */
	update: async (id: string, params: UpdateEventTypeParams): Promise<EventTypeResult> => {
		const result = await EventTypeService.updateEventType(id, params);
		if (result.success) {
			// Force refresh to show updated event type immediately
			await loadEventTypes(true);
		}
		return result;
	},

	/**
	 * Delete a custom event type
	 */
	delete: async (id: string, hardDelete = false): Promise<DeleteResult> => {
		const result = await EventTypeService.deleteEventType(id, hardDelete);
		if (result.success) {
			// Force refresh to remove deleted event type immediately
			await loadEventTypes(true);
		}
		return result;
	},

	/**
	 * Get user's custom event types
	 */
	getUserEventTypes: async (includeInactive = false): Promise<EventTypesResult> => {
		return await EventTypeService.getUserEventTypes(includeInactive);
	},

	/**
	 * Reorder event types
	 */
	reorder: async (eventTypeIds: string[]): Promise<DeleteResult> => {
		const result = await EventTypeService.reorderEventTypes(eventTypeIds);
		if (result.success) {
			// Force refresh to show new order immediately
			await loadEventTypes(true);
		}
		return result;
	}
};

// Helper function to refresh event types after admin changes
export async function refreshEventTypes(): Promise<void> {
	await loadEventTypes(true);
}

// Initialize on browser startup
if (browser) {
	loadEventTypes();
}