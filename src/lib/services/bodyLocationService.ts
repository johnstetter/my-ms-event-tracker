import { supabase, type BodyLocation } from '../supabase.js';
import { get } from 'svelte/store';
import { user } from '../stores/auth.js';
import { clearBodyLocationsCache } from '../stores/bodyLocations.js';

// Interface for creating a custom body location
export interface CreateBodyLocationParams {
	name: string;
	region?: string;
	sort_order?: number;
}

// Interface for updating a custom body location
export interface UpdateBodyLocationParams {
	name?: string;
	region?: string;
	sort_order?: number;
	active?: boolean;
}

// Result interfaces following EventService pattern
export interface BodyLocationResult {
	success: boolean;
	bodyLocation?: BodyLocation;
	error?: string;
}

export interface BodyLocationsResult {
	success: boolean;
	bodyLocations?: BodyLocation[];
	error?: string;
}

export interface DeleteResult {
	success: boolean;
	error?: string;
}

// Standard regions for body locations
export const BODY_REGIONS = [
	'Core',
	'Hip/Pelvis',
	'Lower Body',
	'Neurological',
	'Upper Body',
	'Other'
] as const;

// Service class for body location admin operations
export class BodyLocationService {
	/**
	 * Create a new custom body location for the current user
	 */
	static async createBodyLocation(params: CreateBodyLocationParams): Promise<BodyLocationResult> {
		try {
			const currentUser = get(user);
			if (!currentUser) {
				return { success: false, error: 'User not authenticated' };
			}

			// Validate required fields
			if (!params.name) {
				return { success: false, error: 'Name is required' };
			}

			// Check for duplicate names within user's locations
			const nameCheck = await this.checkNameUnique(params.name, currentUser.id);
			if (!nameCheck.success) {
				return nameCheck;
			}

			// Prepare body location data
			const bodyLocationData = {
				user_id: currentUser.id,
				name: params.name.trim(),
				region: params.region || 'Other',
				sort_order: params.sort_order || 999,
				active: true
			};

			// Insert into database
			const { data, error } = await supabase
				.from('body_locations')
				.insert(bodyLocationData)
				.select()
				.single();

			if (error) {
				return { success: false, error: `Database error: ${error.message}` };
			}

			// Clear cache to trigger refresh
			clearBodyLocationsCache();

			return { success: true, bodyLocation: data };
		} catch (error) {
			console.error('Error creating body location:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	/**
	 * Update an existing custom body location
	 */
	static async updateBodyLocation(id: string, params: UpdateBodyLocationParams): Promise<BodyLocationResult> {
		try {
			const currentUser = get(user);
			if (!currentUser) {
				return { success: false, error: 'User not authenticated' };
			}

			// Check if body location exists and belongs to user
			const { data: existingLocation, error: fetchError } = await supabase
				.from('body_locations')
				.select('*')
				.eq('id', id)
				.eq('user_id', currentUser.id)
				.single();

			if (fetchError) {
				return { success: false, error: 'Body location not found or access denied' };
			}

			// Validate name uniqueness if name is being changed
			if (params.name && params.name !== existingLocation.name) {
				const nameCheck = await this.checkNameUnique(params.name, currentUser.id, id);
				if (!nameCheck.success) {
					return nameCheck;
				}
			}

			// Prepare update data (only include changed fields)
			const updateData: Partial<BodyLocation> = {};
			if (params.name !== undefined) updateData.name = params.name.trim();
			if (params.region !== undefined) updateData.region = params.region;
			if (params.sort_order !== undefined) updateData.sort_order = params.sort_order;
			if (params.active !== undefined) updateData.active = params.active;

			// Update in database
			const { data, error } = await supabase
				.from('body_locations')
				.update(updateData)
				.eq('id', id)
				.eq('user_id', currentUser.id)
				.select()
				.single();

			if (error) {
				return { success: false, error: `Database error: ${error.message}` };
			}

			// Clear cache to trigger refresh
			clearBodyLocationsCache();

			return { success: true, bodyLocation: data };
		} catch (error) {
			console.error('Error updating body location:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	/**
	 * Delete a custom body location (soft delete by setting active = false)
	 */
	static async deleteBodyLocation(id: string, hardDelete = false): Promise<DeleteResult> {
		try {
			const currentUser = get(user);
			if (!currentUser) {
				return { success: false, error: 'User not authenticated' };
			}

			// Check if there are existing events using this location
			const { count, error: countError } = await supabase
				.from('event_locations')
				.select('event_id', { count: 'exact', head: true })
				.eq('body_location_id', id);

			if (countError) {
				return { success: false, error: 'Failed to check location usage' };
			}

			if (count && count > 0 && hardDelete) {
				return {
					success: false,
					error: `Cannot delete body location: ${count} events are using this location. Consider deactivating instead.`
				};
			}

			if (hardDelete) {
				// Hard delete - permanently remove
				const { error } = await supabase
					.from('body_locations')
					.delete()
					.eq('id', id)
					.eq('user_id', currentUser.id);

				if (error) {
					return { success: false, error: `Database error: ${error.message}` };
				}
			} else {
				// Soft delete - set active to false
				const { error } = await supabase
					.from('body_locations')
					.update({ active: false })
					.eq('id', id)
					.eq('user_id', currentUser.id);

				if (error) {
					return { success: false, error: `Database error: ${error.message}` };
				}
			}

			// Clear cache to trigger refresh
			clearBodyLocationsCache();

			return { success: true };
		} catch (error) {
			console.error('Error deleting body location:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	/**
	 * Get all custom body locations for the current user
	 */
	static async getUserBodyLocations(includeInactive = false): Promise<BodyLocationsResult> {
		try {
			const currentUser = get(user);
			if (!currentUser) {
				return { success: false, error: 'User not authenticated' };
			}

			let query = supabase
				.from('body_locations')
				.select('*')
				.eq('user_id', currentUser.id);

			if (!includeInactive) {
				query = query.eq('active', true);
			}

			query = query.order('sort_order', { ascending: true });

			const { data, error } = await query;

			if (error) {
				return { success: false, error: `Database error: ${error.message}` };
			}

			return { success: true, bodyLocations: data || [] };
		} catch (error) {
			console.error('Error fetching user body locations:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	/**
	 * Get custom body locations grouped by region
	 */
	static async getUserBodyLocationsByRegion(includeInactive = false): Promise<{ success: boolean; locationsByRegion?: Map<string, BodyLocation[]>; error?: string }> {
		const result = await this.getUserBodyLocations(includeInactive);

		if (!result.success) {
			return result;
		}

		const grouped = new Map<string, BodyLocation[]>();

		result.bodyLocations?.forEach(location => {
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

		return { success: true, locationsByRegion: sortedRegions };
	}

	/**
	 * Check if name is unique for this user
	 */
	private static async checkNameUnique(name: string, userId: string, excludeId?: string): Promise<{ success: boolean; error?: string }> {
		let query = supabase
			.from('body_locations')
			.select('id')
			.or(`and(name.ilike.${name},user_id.eq.${userId}),and(name.ilike.${name},user_id.is.null)`) // Check against both user locations and system locations
			.limit(1);

		if (excludeId) {
			query = query.neq('id', excludeId);
		}

		const { data, error } = await query;

		if (error) {
			return { success: false, error: 'Failed to check name uniqueness' };
		}

		if (data && data.length > 0) {
			return { success: false, error: 'A body location with this name already exists' };
		}

		return { success: true };
	}

	/**
	 * Reorder body locations for a user within a region
	 */
	static async reorderBodyLocations(bodyLocationIds: string[]): Promise<DeleteResult> {
		try {
			const currentUser = get(user);
			if (!currentUser) {
				return { success: false, error: 'User not authenticated' };
			}

			// Update sort_order for each body location
			const updates = bodyLocationIds.map((id, index) =>
				supabase
					.from('body_locations')
					.update({ sort_order: index + 1 })
					.eq('id', id)
					.eq('user_id', currentUser.id)
			);

			// Execute all updates
			await Promise.all(updates);

			// Clear cache to trigger refresh
			clearBodyLocationsCache();

			return { success: true };
		} catch (error) {
			console.error('Error reordering body locations:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	/**
	 * Bulk update body locations (activate/deactivate multiple)
	 */
	static async bulkUpdateBodyLocations(ids: string[], updates: Partial<BodyLocation>): Promise<DeleteResult> {
		try {
			const currentUser = get(user);
			if (!currentUser) {
				return { success: false, error: 'User not authenticated' };
			}

			const { error } = await supabase
				.from('body_locations')
				.update(updates)
				.in('id', ids)
				.eq('user_id', currentUser.id);

			if (error) {
				return { success: false, error: `Database error: ${error.message}` };
			}

			// Clear cache to trigger refresh
			clearBodyLocationsCache();

			return { success: true };
		} catch (error) {
			console.error('Error bulk updating body locations:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}
}

// Helper functions for components
export async function createBodyLocation(params: CreateBodyLocationParams): Promise<BodyLocationResult> {
	return await BodyLocationService.createBodyLocation(params);
}

export async function updateBodyLocation(id: string, params: UpdateBodyLocationParams): Promise<BodyLocationResult> {
	return await BodyLocationService.updateBodyLocation(id, params);
}

export async function deleteBodyLocation(id: string, hardDelete = false): Promise<DeleteResult> {
	return await BodyLocationService.deleteBodyLocation(id, hardDelete);
}

export async function getUserBodyLocations(includeInactive = false): Promise<BodyLocationsResult> {
	return await BodyLocationService.getUserBodyLocations(includeInactive);
}

export async function getUserBodyLocationsByRegion(includeInactive = false) {
	return await BodyLocationService.getUserBodyLocationsByRegion(includeInactive);
}

export async function reorderBodyLocations(bodyLocationIds: string[]): Promise<DeleteResult> {
	return await BodyLocationService.reorderBodyLocations(bodyLocationIds);
}

export async function bulkUpdateBodyLocations(ids: string[], updates: Partial<BodyLocation>): Promise<DeleteResult> {
	return await BodyLocationService.bulkUpdateBodyLocations(ids, updates);
}