import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { supabase, type BodyLocation } from '../supabase.js';
import {
	BodyLocationService,
	type CreateBodyLocationParams,
	type UpdateBodyLocationParams,
	type BodyLocationResult,
	type BodyLocationsResult,
	type DeleteResult,
	BODY_REGIONS
} from '../services/bodyLocationService.js';

// Re-export for easier access
export { BODY_REGIONS };

// Body locations store with caching
export const bodyLocations = writable<BodyLocation[]>([]);
export const bodyLocationsLoading = writable(true);
export const bodyLocationsError = writable<string | null>(null);

// Cache key for localStorage
const CACHE_KEY = 'ms-tracker-body-locations';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Cache structure
interface BodyLocationsCache {
	data: BodyLocation[];
	timestamp: number;
}

// Derived store: group locations by region
export const locationsByRegion = derived(bodyLocations, (locations) => {
	const grouped = new Map<string, BodyLocation[]>();

	locations.forEach(location => {
		const region = location.region || 'Other';
		if (!grouped.has(region)) {
			grouped.set(region, []);
		}
		grouped.get(region)!.push(location);
	});

	// Sort regions and locations within regions
	const sortedRegions = new Map([...grouped.entries()].sort());
	sortedRegions.forEach(locations => {
		locations.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
	});

	return sortedRegions;
});

// Derived store: common/frequently used locations (placeholder for future user preference tracking)
export const commonLocations = derived(bodyLocations, (locations) => {
	// For now, return first few locations from each region as "common"
	// In the future, this could be based on user's actual usage patterns
	const common: BodyLocation[] = [];
	const regions = ['Lower Body', 'Core', 'Upper Body'];

	regions.forEach(region => {
		const regionLocations = locations.filter(l => l.region === region);
		common.push(...regionLocations.slice(0, 2)); // First 2 from each region
	});

	return common.slice(0, 6); // Max 6 common locations for quick selection
});

// Load body locations from cache or fetch from database
export async function loadBodyLocations(forceRefresh = false): Promise<void> {
	bodyLocationsLoading.set(true);
	bodyLocationsError.set(null);

	try {
		let cachedData: BodyLocation[] | null = null;

		// Try to load from cache first (unless force refresh)
		if (browser && !forceRefresh) {
			const cached = localStorage.getItem(CACHE_KEY);
			if (cached) {
				try {
					const parsedCache: BodyLocationsCache = JSON.parse(cached);
					const isExpired = Date.now() - parsedCache.timestamp > CACHE_DURATION;

					if (!isExpired && Array.isArray(parsedCache.data)) {
						cachedData = parsedCache.data;
						bodyLocations.set(cachedData);
						bodyLocationsLoading.set(false);

						// Still fetch in background for fresh data
						fetchBodyLocationsInBackground();
						return;
					}
				} catch (e) {
					// Invalid cache, will fetch fresh
					console.warn('Invalid body locations cache, fetching fresh data');
				}
			}
		}

		// Fetch from database
		await fetchBodyLocations();
	} catch (error) {
		console.error('Error loading body locations:', error);
		bodyLocationsError.set(error instanceof Error ? error.message : 'Failed to load body locations');
		bodyLocationsLoading.set(false);
	}
}

// Fetch body locations from database
async function fetchBodyLocations(): Promise<void> {
	const { data, error } = await supabase
		.from('body_locations')
		.select('*')
		.eq('active', true)
		.order('sort_order', { ascending: true });

	if (error) {
		throw new Error(`Database error: ${error.message}`);
	}

	if (data) {
		// Update store
		bodyLocations.set(data);

		// Update cache
		if (browser) {
			const cacheData: BodyLocationsCache = {
				data,
				timestamp: Date.now()
			};
			localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
		}
	}

	bodyLocationsLoading.set(false);
}

// Fetch in background without loading states
async function fetchBodyLocationsInBackground(): Promise<void> {
	try {
		await fetchBodyLocations();
	} catch (error) {
		console.warn('Background body locations refresh failed:', error);
	}
}

// Get locations by region
export function getLocationsByRegion(region: string): BodyLocation[] {
	let result: BodyLocation[] = [];
	bodyLocations.subscribe(locations => {
		result = locations.filter(location => location.region === region);
	})();
	return result;
}

// Get location by ID
export function getLocationById(id: string): BodyLocation | undefined {
	let result: BodyLocation | undefined;
	bodyLocations.subscribe(locations => {
		result = locations.find(location => location.id === id);
	})();
	return result;
}

// Clear cache (useful for debugging or force refresh)
export function clearBodyLocationsCache(): void {
	if (browser) {
		localStorage.removeItem(CACHE_KEY);
	}
}

/**
 * ADMIN FUNCTIONS - For managing custom body locations
 */

// Admin object with CRUD operations
export const bodyLocationsAdmin = {
	/**
	 * Create a new custom body location
	 */
	create: async (params: CreateBodyLocationParams): Promise<BodyLocationResult> => {
		const result = await BodyLocationService.createBodyLocation(params);
		if (result.success) {
			// Force refresh to show new body location immediately
			await loadBodyLocations(true);
		}
		return result;
	},

	/**
	 * Update an existing custom body location
	 */
	update: async (id: string, params: UpdateBodyLocationParams): Promise<BodyLocationResult> => {
		const result = await BodyLocationService.updateBodyLocation(id, params);
		if (result.success) {
			// Force refresh to show updated body location immediately
			await loadBodyLocations(true);
		}
		return result;
	},

	/**
	 * Delete a custom body location
	 */
	delete: async (id: string, hardDelete = false): Promise<DeleteResult> => {
		const result = await BodyLocationService.deleteBodyLocation(id, hardDelete);
		if (result.success) {
			// Force refresh to remove deleted body location immediately
			await loadBodyLocations(true);
		}
		return result;
	},

	/**
	 * Get user's custom body locations
	 */
	getUserBodyLocations: async (includeInactive = false): Promise<BodyLocationsResult> => {
		return await BodyLocationService.getUserBodyLocations(includeInactive);
	},

	/**
	 * Get user's custom body locations grouped by region
	 */
	getUserBodyLocationsByRegion: async (includeInactive = false) => {
		return await BodyLocationService.getUserBodyLocationsByRegion(includeInactive);
	},

	/**
	 * Reorder body locations
	 */
	reorder: async (bodyLocationIds: string[]): Promise<DeleteResult> => {
		const result = await BodyLocationService.reorderBodyLocations(bodyLocationIds);
		if (result.success) {
			// Force refresh to show new order immediately
			await loadBodyLocations(true);
		}
		return result;
	},

	/**
	 * Bulk update body locations
	 */
	bulkUpdate: async (ids: string[], updates: Partial<BodyLocation>): Promise<DeleteResult> => {
		const result = await BodyLocationService.bulkUpdateBodyLocations(ids, updates);
		if (result.success) {
			// Force refresh to show updates immediately
			await loadBodyLocations(true);
		}
		return result;
	}
};

// Helper function to refresh body locations after admin changes
export async function refreshBodyLocations(): Promise<void> {
	await loadBodyLocations(true);
}

// Initialize on browser startup
if (browser) {
	loadBodyLocations();
}