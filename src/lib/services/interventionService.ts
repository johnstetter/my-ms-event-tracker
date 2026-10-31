import { supabase, type Event, type Intervention, type EventIntervention, type EventNote } from '../supabase.js';
import { get } from 'svelte/store';
import { user } from '../stores/auth.js';
import { clearInterventionsCache } from '../stores/interventions.js';
import { log } from '../logging/index.js';

// Interface for adding intervention to event
export interface AddInterventionParams {
	eventId: string;
	interventionId: string;
	notes?: string;
	appliedAt?: string; // ISO string
}

// Extended event intervention with intervention details
export type EventInterventionWithDetails = EventIntervention & {
	intervention: Intervention;
};

// Service result interface
export interface ServiceResult<T = any> {
	success: boolean;
	data?: T;
	error?: string;
}

// Admin interfaces for managing intervention types
export interface CreateInterventionParams {
	name: string;
	category?: string;
	sort_order?: number;
}

export interface UpdateInterventionParams {
	name?: string;
	category?: string;
	sort_order?: number;
	active?: boolean;
}

export interface InterventionResult {
	success: boolean;
	intervention?: Intervention;
	error?: string;
}

export interface InterventionsResult {
	success: boolean;
	interventions?: Intervention[];
	error?: string;
}

export interface DeleteResult {
	success: boolean;
	error?: string;
}

// Standard categories for interventions
export const INTERVENTION_CATEGORIES = [
	'Medication',
	'Physical',
	'Alternative',
	'Lifestyle',
	'Other'
] as const;

// Service class for intervention operations
export class InterventionService {
	/**
	 * Add an intervention to an existing event
	 */
	static async addEventIntervention(params: AddInterventionParams): Promise<ServiceResult<EventInterventionWithDetails>> {
		try {
			const currentUser = get(user);
			if (!currentUser) {
				return { success: false, error: 'User not authenticated' };
			}

			// Validate required fields
			if (!params.eventId) {
				return { success: false, error: 'Event ID is required' };
			}
			if (!params.interventionId) {
				return { success: false, error: 'Intervention ID is required' };
			}

			// Verify the event belongs to the current user
			const { data: event, error: eventError } = await supabase
				.from('events')
				.select('id, user_id')
				.eq('id', params.eventId)
				.eq('user_id', currentUser.id)
				.single();

			if (eventError || !event) {
				return { success: false, error: 'Event not found or access denied' };
			}

			// Prepare intervention data
			const interventionData = {
				event_id: params.eventId,
				intervention_id: params.interventionId,
				applied_at: params.appliedAt || new Date().toISOString(),
				notes: params.notes || null
			};

			// Insert the intervention
			const { data, error } = await supabase
				.from('event_interventions')
				.insert(interventionData)
				.select(`
					*,
					intervention:interventions(*)
				`)
				.single();

			if (error) {
				return { success: false, error: `Database error: ${error.message}` };
			}

			return { success: true, data: data as EventInterventionWithDetails };
		} catch (error) {
			log.event.error('Failed to add intervention to event', error as Error, {
				eventId: params.eventId,
				interventionId: params.interventionId,
				operation: 'addEventIntervention'
			});
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	/**
	 * Mark an event as resolved by setting the ended_at timestamp
	 */
	static async resolveEvent(eventId: string): Promise<ServiceResult<Event>> {
		try {
			const currentUser = get(user);
			if (!currentUser) {
				return { success: false, error: 'User not authenticated' };
			}

			// Validate required fields
			if (!eventId) {
				return { success: false, error: 'Event ID is required' };
			}

			// Update the event with ended_at timestamp
			const { data, error } = await supabase
				.from('events')
				.update({ ended_at: new Date().toISOString() })
				.eq('id', eventId)
				.eq('user_id', currentUser.id)
				.select()
				.single();

			if (error) {
				return { success: false, error: `Database error: ${error.message}` };
			}

			if (!data) {
				return { success: false, error: 'Event not found or access denied' };
			}

			return { success: true, data: data as Event };
		} catch (error) {
			log.event.error('Failed to resolve event', error as Error, {
				eventId,
				operation: 'resolveEvent'
			});
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	/**
	 * Resolve event with optional resolution note
	 * This method handles both event resolution and optional note creation in a single transaction
	 */
	static async resolveEventWithNote(
		eventId: string,
		resolutionNote?: string
	): Promise<ServiceResult<{event: Event, note?: EventNote}>> {
		try {
			const currentUser = get(user);
			if (!currentUser) {
				return { success: false, error: 'User not authenticated' };
			}

			// Validate required fields
			if (!eventId) {
				return { success: false, error: 'Event ID is required' };
			}

			// Use consistent timestamp for both operations
			const resolvedAt = new Date().toISOString();

			// Start by resolving the event
			const { data: event, error: eventError } = await supabase
				.from('events')
				.update({ ended_at: resolvedAt })
				.eq('id', eventId)
				.eq('user_id', currentUser.id)
				.select()
				.single();

			if (eventError) {
				return { success: false, error: `Database error: ${eventError.message}` };
			}

			if (!event) {
				return { success: false, error: 'Event not found or access denied' };
			}

			// If no resolution note provided, return just the resolved event
			if (!resolutionNote || !resolutionNote.trim()) {
				return { success: true, data: { event: event as Event } };
			}

			// Create resolution note with the same timestamp
			const { data: note, error: noteError } = await supabase
				.from('event_notes')
				.insert({
					event_id: eventId,
					content: resolutionNote.trim(),
					created_at: resolvedAt
				})
				.select()
				.single();

			if (noteError) {
				// If note creation fails, we should revert the event resolution
				// This maintains data consistency
				await supabase
					.from('events')
					.update({ ended_at: null })
					.eq('id', eventId)
					.eq('user_id', currentUser.id);

				return { success: false, error: `Failed to create resolution note: ${noteError.message}` };
			}

			return {
				success: true,
				data: {
					event: event as Event,
					note: note as EventNote
				}
			};

		} catch (error) {
			log.event.error('Failed to resolve event with note', error as Error, {
				eventId,
				hasNote: !!resolutionNote,
				operation: 'resolveEventWithNote'
			});
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	/**
	 * Get all interventions applied to a specific event
	 */
	static async getEventInterventions(eventId: string): Promise<ServiceResult<EventInterventionWithDetails[]>> {
		try {
			const currentUser = get(user);
			if (!currentUser) {
				return { success: false, error: 'User not authenticated' };
			}

			// Validate required fields
			if (!eventId) {
				return { success: false, error: 'Event ID is required' };
			}

			// First verify the event belongs to the current user
			const { data: event, error: eventError } = await supabase
				.from('events')
				.select('id')
				.eq('id', eventId)
				.eq('user_id', currentUser.id)
				.single();

			if (eventError || !event) {
				return { success: false, error: 'Event not found or access denied' };
			}

			// Get all interventions for this event
			const { data, error } = await supabase
				.from('event_interventions')
				.select(`
					*,
					intervention:interventions(*)
				`)
				.eq('event_id', eventId)
				.order('applied_at', { ascending: true });

			if (error) {
				return { success: false, error: `Database error: ${error.message}` };
			}

			return { success: true, data: data as EventInterventionWithDetails[] };
		} catch (error) {
			console.error('Error fetching event interventions:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	/**
	 * Get all available interventions for the UI
	 */
	static async getAvailableInterventions(): Promise<ServiceResult<Intervention[]>> {
		try {
			const currentUser = get(user);
			if (!currentUser) {
				return { success: false, error: 'User not authenticated' };
			}

			const { data, error } = await supabase
				.from('interventions')
				.select('*')
				.eq('active', true)
				.order('sort_order', { ascending: true });

			if (error) {
				return { success: false, error: `Database error: ${error.message}` };
			}

			return { success: true, data: data as Intervention[] };
		} catch (error) {
			console.error('Error fetching available interventions:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	/**
	 * Get ongoing events (not resolved) for the current user
	 */
	static async getOngoingEvents(limit = 10): Promise<ServiceResult<Event[]>> {
		try {
			const currentUser = get(user);
			if (!currentUser) {
				return { success: false, error: 'User not authenticated' };
			}

			const { data, error } = await supabase
				.from('events')
				.select(`
					*,
					event_type:event_types(*),
					event_locations(
						body_location:body_locations(*)
					)
				`)
				.eq('user_id', currentUser.id)
				.is('ended_at', null)
				.order('started_at', { ascending: false })
				.limit(limit);

			if (error) {
				return { success: false, error: `Database error: ${error.message}` };
			}

			return { success: true, data: data as any[] };
		} catch (error) {
			console.error('Error fetching ongoing events:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	/**
	 * ADMIN METHODS - Create, update, delete intervention types
	 */

	/**
	 * Create a new custom intervention for the current user
	 */
	static async createIntervention(params: CreateInterventionParams): Promise<InterventionResult> {
		try {
			const currentUser = get(user);
			if (!currentUser) {
				return { success: false, error: 'User not authenticated' };
			}

			// Validate required fields
			if (!params.name) {
				return { success: false, error: 'Name is required' };
			}

			// Check for duplicate names within user's interventions
			const nameCheck = await this.checkInterventionNameUnique(params.name, currentUser.id);
			if (!nameCheck.success) {
				return nameCheck;
			}

			// Prepare intervention data
			const interventionData = {
				user_id: currentUser.id,
				name: params.name.trim(),
				category: params.category || 'Other',
				sort_order: params.sort_order || 999,
				active: true
			};

			// Insert into database
			const { data, error } = await supabase
				.from('interventions')
				.insert(interventionData)
				.select()
				.single();

			if (error) {
				return { success: false, error: `Database error: ${error.message}` };
			}

			// Clear cache to trigger refresh
			clearInterventionsCache();

			return { success: true, intervention: data };
		} catch (error) {
			console.error('Error creating intervention:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	/**
	 * Update an existing custom intervention
	 */
	static async updateIntervention(id: string, params: UpdateInterventionParams): Promise<InterventionResult> {
		try {
			const currentUser = get(user);
			if (!currentUser) {
				return { success: false, error: 'User not authenticated' };
			}

			// Check if intervention exists and belongs to user
			const { data: existingIntervention, error: fetchError } = await supabase
				.from('interventions')
				.select('*')
				.eq('id', id)
				.eq('user_id', currentUser.id)
				.single();

			if (fetchError) {
				return { success: false, error: 'Intervention not found or access denied' };
			}

			// Validate name uniqueness if name is being changed
			if (params.name && params.name !== existingIntervention.name) {
				const nameCheck = await this.checkInterventionNameUnique(params.name, currentUser.id, id);
				if (!nameCheck.success) {
					return nameCheck;
				}
			}

			// Prepare update data (only include changed fields)
			const updateData: Partial<Intervention> = {};
			if (params.name !== undefined) updateData.name = params.name.trim();
			if (params.category !== undefined) updateData.category = params.category;
			if (params.sort_order !== undefined) updateData.sort_order = params.sort_order;
			if (params.active !== undefined) updateData.active = params.active;

			// Update in database
			const { data, error } = await supabase
				.from('interventions')
				.update(updateData)
				.eq('id', id)
				.eq('user_id', currentUser.id)
				.select()
				.single();

			if (error) {
				return { success: false, error: `Database error: ${error.message}` };
			}

			// Clear cache to trigger refresh
			clearInterventionsCache();

			return { success: true, intervention: data };
		} catch (error) {
			console.error('Error updating intervention:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	/**
	 * Delete a custom intervention (soft delete by setting active = false)
	 */
	static async deleteIntervention(id: string, hardDelete = false): Promise<DeleteResult> {
		try {
			const currentUser = get(user);
			if (!currentUser) {
				return { success: false, error: 'User not authenticated' };
			}

			// Check if there are existing events using this intervention
			const { count, error: countError } = await supabase
				.from('event_interventions')
				.select('event_id', { count: 'exact', head: true })
				.eq('intervention_id', id);

			if (countError) {
				return { success: false, error: 'Failed to check intervention usage' };
			}

			if (count && count > 0 && hardDelete) {
				return {
					success: false,
					error: `Cannot delete intervention: ${count} events are using this intervention. Consider deactivating instead.`
				};
			}

			if (hardDelete) {
				// Hard delete - permanently remove
				const { error } = await supabase
					.from('interventions')
					.delete()
					.eq('id', id)
					.eq('user_id', currentUser.id);

				if (error) {
					return { success: false, error: `Database error: ${error.message}` };
				}
			} else {
				// Soft delete - set active to false
				const { error } = await supabase
					.from('interventions')
					.update({ active: false })
					.eq('id', id)
					.eq('user_id', currentUser.id);

				if (error) {
					return { success: false, error: `Database error: ${error.message}` };
				}
			}

			// Clear cache to trigger refresh
			clearInterventionsCache();

			return { success: true };
		} catch (error) {
			console.error('Error deleting intervention:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	/**
	 * Get all custom interventions for the current user
	 */
	static async getUserInterventions(includeInactive = false): Promise<InterventionsResult> {
		try {
			const currentUser = get(user);
			if (!currentUser) {
				return { success: false, error: 'User not authenticated' };
			}

			let query = supabase
				.from('interventions')
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

			return { success: true, interventions: data || [] };
		} catch (error) {
			console.error('Error fetching user interventions:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	/**
	 * Get custom interventions grouped by category
	 */
	static async getUserInterventionsByCategory(includeInactive = false): Promise<{ success: boolean; interventionsByCategory?: { [key: string]: Intervention[] }; error?: string }> {
		const result = await this.getUserInterventions(includeInactive);

		if (!result.success) {
			return result;
		}

		const grouped = result.interventions?.reduce((groups, intervention) => {
			const category = intervention.category || 'Other';
			if (!groups[category]) {
				groups[category] = [];
			}
			groups[category].push(intervention);
			return groups;
		}, {} as { [key: string]: Intervention[] }) || {};

		// Sort interventions within each category by sort_order
		Object.values(grouped).forEach(interventions => {
			interventions.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
		});

		return { success: true, interventionsByCategory: grouped };
	}

	/**
	 * Check if intervention name is unique for this user
	 */
	private static async checkInterventionNameUnique(name: string, userId: string, excludeId?: string): Promise<{ success: boolean; error?: string }> {
		let query = supabase
			.from('interventions')
			.select('id')
			.or(`and(name.ilike.${name},user_id.eq.${userId}),and(name.ilike.${name},user_id.is.null)`) // Check against both user interventions and system interventions
			.limit(1);

		if (excludeId) {
			query = query.neq('id', excludeId);
		}

		const { data, error } = await query;

		if (error) {
			return { success: false, error: 'Failed to check name uniqueness' };
		}

		if (data && data.length > 0) {
			return { success: false, error: 'An intervention with this name already exists' };
		}

		return { success: true };
	}

	/**
	 * Reorder interventions for a user within a category
	 */
	static async reorderInterventions(interventionIds: string[]): Promise<DeleteResult> {
		try {
			const currentUser = get(user);
			if (!currentUser) {
				return { success: false, error: 'User not authenticated' };
			}

			// Update sort_order for each intervention
			const updates = interventionIds.map((id, index) =>
				supabase
					.from('interventions')
					.update({ sort_order: index + 1 })
					.eq('id', id)
					.eq('user_id', currentUser.id)
			);

			// Execute all updates
			await Promise.all(updates);

			// Clear cache to trigger refresh
			clearInterventionsCache();

			return { success: true };
		} catch (error) {
			console.error('Error reordering interventions:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	/**
	 * Bulk update interventions (activate/deactivate multiple)
	 */
	static async bulkUpdateInterventions(ids: string[], updates: Partial<Intervention>): Promise<DeleteResult> {
		try {
			const currentUser = get(user);
			if (!currentUser) {
				return { success: false, error: 'User not authenticated' };
			}

			const { error } = await supabase
				.from('interventions')
				.update(updates)
				.in('id', ids)
				.eq('user_id', currentUser.id);

			if (error) {
				return { success: false, error: `Database error: ${error.message}` };
			}

			// Clear cache to trigger refresh
			clearInterventionsCache();

			return { success: true };
		} catch (error) {
			console.error('Error bulk updating interventions:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}
}

// Helper functions for use in components
export async function addEventIntervention(params: AddInterventionParams): Promise<ServiceResult<EventInterventionWithDetails>> {
	return await InterventionService.addEventIntervention(params);
}

export async function resolveEvent(eventId: string): Promise<ServiceResult<Event>> {
	return await InterventionService.resolveEvent(eventId);
}

export async function resolveEventWithNote(eventId: string, resolutionNote?: string): Promise<ServiceResult<{event: Event, note?: EventNote}>> {
	return await InterventionService.resolveEventWithNote(eventId, resolutionNote);
}

export async function getEventInterventions(eventId: string): Promise<ServiceResult<EventInterventionWithDetails[]>> {
	return await InterventionService.getEventInterventions(eventId);
}

export async function getAvailableInterventions(): Promise<ServiceResult<Intervention[]>> {
	return await InterventionService.getAvailableInterventions();
}

// Admin helper functions for components
export async function createIntervention(params: CreateInterventionParams): Promise<InterventionResult> {
	return await InterventionService.createIntervention(params);
}

export async function updateIntervention(id: string, params: UpdateInterventionParams): Promise<InterventionResult> {
	return await InterventionService.updateIntervention(id, params);
}

export async function deleteIntervention(id: string, hardDelete = false): Promise<DeleteResult> {
	return await InterventionService.deleteIntervention(id, hardDelete);
}

export async function getUserInterventions(includeInactive = false): Promise<InterventionsResult> {
	return await InterventionService.getUserInterventions(includeInactive);
}

export async function getUserInterventionsByCategory(includeInactive = false) {
	return await InterventionService.getUserInterventionsByCategory(includeInactive);
}

export async function reorderInterventions(interventionIds: string[]): Promise<DeleteResult> {
	return await InterventionService.reorderInterventions(interventionIds);
}

export async function bulkUpdateInterventions(ids: string[], updates: Partial<Intervention>): Promise<DeleteResult> {
	return await InterventionService.bulkUpdateInterventions(ids, updates);
}