import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { supabase, type Intervention } from '../supabase.js';
import {
	InterventionService,
	type CreateInterventionParams,
	type UpdateInterventionParams,
	type InterventionResult,
	type InterventionsResult,
	type DeleteResult
} from '../services/interventionService.js';

// Interventions store with caching
export const interventions = writable<Intervention[]>([]);
export const interventionsLoading = writable(true);
export const interventionsError = writable<string | null>(null);

// Cache key for localStorage
const CACHE_KEY = 'ms-tracker-interventions';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Cache structure
interface InterventionsCache {
	data: Intervention[];
	timestamp: number;
}

// Load interventions from cache or fetch from database
export async function loadInterventions(forceRefresh = false): Promise<void> {
	interventionsLoading.set(true);
	interventionsError.set(null);

	try {
		let cachedData: Intervention[] | null = null;

		// Try to load from cache first (unless force refresh)
		if (browser && !forceRefresh) {
			const cached = localStorage.getItem(CACHE_KEY);
			if (cached) {
				try {
					const parsedCache: InterventionsCache = JSON.parse(cached);
					const isExpired = Date.now() - parsedCache.timestamp > CACHE_DURATION;

					if (!isExpired && Array.isArray(parsedCache.data)) {
						cachedData = parsedCache.data;
						interventions.set(cachedData);
						interventionsLoading.set(false);

						// Still fetch in background for fresh data
						fetchInterventionsInBackground();
						return;
					}
				} catch (e) {
					// Invalid cache, will fetch fresh
					console.warn('Invalid interventions cache, fetching fresh data');
				}
			}
		}

		// Fetch from database
		await fetchInterventions();
	} catch (error) {
		console.error('Error loading interventions:', error);
		interventionsError.set(error instanceof Error ? error.message : 'Failed to load interventions');
		interventionsLoading.set(false);
	}
}

// Fetch interventions from database
async function fetchInterventions(): Promise<void> {
	const { data, error } = await supabase
		.from('interventions')
		.select('*')
		.eq('active', true)
		.order('sort_order', { ascending: true });

	if (error) {
		throw new Error(`Database error: ${error.message}`);
	}

	if (data) {
		// Update store
		interventions.set(data);

		// Update cache
		if (browser) {
			const cacheData: InterventionsCache = {
				data,
				timestamp: Date.now()
			};
			localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
		}
	}

	interventionsLoading.set(false);
}

// Fetch in background without loading states
async function fetchInterventionsInBackground(): Promise<void> {
	try {
		await fetchInterventions();
	} catch (error) {
		console.warn('Background interventions refresh failed:', error);
	}
}

// Get interventions grouped by category
export function getInterventionsByCategory(): { [key: string]: Intervention[] } {
	let result: { [key: string]: Intervention[] } = {};
	interventions.subscribe(interventionList => {
		result = interventionList.reduce((groups, intervention) => {
			const category = intervention.category || 'Other';
			if (!groups[category]) {
				groups[category] = [];
			}
			groups[category].push(intervention);
			return groups;
		}, {} as { [key: string]: Intervention[] });
	})();
	return result;
}

// Get medication interventions only
export function getMedicationInterventions(): Intervention[] {
	let result: Intervention[] = [];
	interventions.subscribe(interventionList => {
		result = interventionList.filter(intervention => intervention.category === 'Medication');
	})();
	return result;
}

// Get physical interventions only
export function getPhysicalInterventions(): Intervention[] {
	let result: Intervention[] = [];
	interventions.subscribe(interventionList => {
		result = interventionList.filter(intervention => intervention.category === 'Physical');
	})();
	return result;
}

// Get specific intervention by ID
export function getInterventionById(id: string): Intervention | undefined {
	let result: Intervention | undefined;
	interventions.subscribe(interventionList => {
		result = interventionList.find(intervention => intervention.id === id);
	})();
	return result;
}

// Clear cache (useful for debugging or force refresh)
export function clearInterventionsCache(): void {
	if (browser) {
		localStorage.removeItem(CACHE_KEY);
	}
}

/**
 * ADMIN FUNCTIONS - For managing custom interventions
 */

// Admin object with CRUD operations
export const interventionsAdmin = {
	/**
	 * Create a new custom intervention
	 */
	create: async (params: CreateInterventionParams): Promise<InterventionResult> => {
		const result = await InterventionService.createIntervention(params);
		if (result.success) {
			// Force refresh to show new intervention immediately
			await loadInterventions(true);
		}
		return result;
	},

	/**
	 * Update an existing custom intervention
	 */
	update: async (id: string, params: UpdateInterventionParams): Promise<InterventionResult> => {
		const result = await InterventionService.updateIntervention(id, params);
		if (result.success) {
			// Force refresh to show updated intervention immediately
			await loadInterventions(true);
		}
		return result;
	},

	/**
	 * Delete a custom intervention
	 */
	delete: async (id: string, hardDelete = false): Promise<DeleteResult> => {
		const result = await InterventionService.deleteIntervention(id, hardDelete);
		if (result.success) {
			// Force refresh to remove deleted intervention immediately
			await loadInterventions(true);
		}
		return result;
	},

	/**
	 * Get user's custom interventions
	 */
	getUserInterventions: async (includeInactive = false): Promise<InterventionsResult> => {
		return await InterventionService.getUserInterventions(includeInactive);
	},

	/**
	 * Get user's custom interventions grouped by category
	 */
	getUserInterventionsByCategory: async (includeInactive = false) => {
		return await InterventionService.getUserInterventionsByCategory(includeInactive);
	},

	/**
	 * Reorder interventions
	 */
	reorder: async (interventionIds: string[]): Promise<DeleteResult> => {
		const result = await InterventionService.reorderInterventions(interventionIds);
		if (result.success) {
			// Force refresh to show new order immediately
			await loadInterventions(true);
		}
		return result;
	},

	/**
	 * Bulk update interventions
	 */
	bulkUpdate: async (ids: string[], updates: Partial<Intervention>): Promise<DeleteResult> => {
		const result = await InterventionService.bulkUpdateInterventions(ids, updates);
		if (result.success) {
			// Force refresh to show updates immediately
			await loadInterventions(true);
		}
		return result;
	}
};

// Helper function to refresh interventions after admin changes
export async function refreshInterventions(): Promise<void> {
	await loadInterventions(true);
}

// Initialize on browser startup
if (browser) {
	loadInterventions();
}