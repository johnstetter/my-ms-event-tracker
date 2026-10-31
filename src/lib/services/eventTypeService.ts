import { supabase, type EventType } from '../supabase.js';
import { get } from 'svelte/store';
import { user } from '../stores/auth.js';
import { clearEventTypesCache } from '../stores/eventTypes.js';

// Interface for creating a custom event type
export interface CreateEventTypeParams {
	name: string;
	slug: string;
	icon?: string;
	has_duration?: boolean;
	has_location?: boolean;
	has_severity?: boolean;
	auto_resolve?: boolean;
	sort_order?: number;
	custom_fields?: any[];
}

// Interface for updating a custom event type
export interface UpdateEventTypeParams {
	name?: string;
	slug?: string;
	icon?: string;
	has_duration?: boolean;
	has_location?: boolean;
	has_severity?: boolean;
	auto_resolve?: boolean;
	sort_order?: number;
	custom_fields?: any[];
	active?: boolean;
}

// Result interfaces following EventService pattern
export interface EventTypeResult {
	success: boolean;
	eventType?: EventType;
	error?: string;
}

export interface EventTypesResult {
	success: boolean;
	eventTypes?: EventType[];
	error?: string;
}

export interface DeleteResult {
	success: boolean;
	error?: string;
}

// Custom field interface for validation
export interface CustomField {
	name: string;
	label?: string;
	type: 'text' | 'number' | 'select' | 'textarea' | 'checkbox';
	required?: boolean;
	options?: string[];
	placeholder?: string;
	validation?: {
		min?: number;
		max?: number;
		pattern?: string;
	};
}

// Service class for event type admin operations
export class EventTypeService {
	/**
	 * Create a new custom event type for the current user
	 */
	static async createEventType(params: CreateEventTypeParams): Promise<EventTypeResult> {
		try {
			const currentUser = get(user);
			if (!currentUser) {
				return { success: false, error: 'User not authenticated' };
			}

			// Validate required fields
			if (!params.name || !params.slug) {
				return { success: false, error: 'Name and slug are required' };
			}

			// Validate slug uniqueness for this user
			const slugCheck = await this.checkSlugUnique(params.slug, currentUser.id);
			if (!slugCheck.success) {
				return slugCheck;
			}

			// Validate custom fields if provided
			if (params.custom_fields) {
				const validation = this.validateCustomFields(params.custom_fields);
				if (!validation.success) {
					return validation;
				}
			}

			// Prepare event type data
			const eventTypeData = {
				user_id: currentUser.id,
				name: params.name.trim(),
				slug: params.slug.trim().toLowerCase(),
				icon: params.icon || '📝',
				has_duration: params.has_duration || false,
				has_location: params.has_location || false,
				has_severity: params.has_severity || false,
				auto_resolve: params.auto_resolve || false,
				sort_order: params.sort_order || 999,
				custom_fields: params.custom_fields || [],
				active: true
			};

			// Insert into database
			const { data, error } = await supabase
				.from('event_types')
				.insert(eventTypeData)
				.select()
				.single();

			if (error) {
				if (error.code === '23505') { // Unique constraint violation
					return { success: false, error: 'An event type with this slug already exists' };
				}
				return { success: false, error: `Database error: ${error.message}` };
			}

			// Clear cache to trigger refresh
			clearEventTypesCache();

			return { success: true, eventType: data };
		} catch (error) {
			console.error('Error creating event type:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	/**
	 * Update an existing custom event type
	 */
	static async updateEventType(id: string, params: UpdateEventTypeParams): Promise<EventTypeResult> {
		try {
			const currentUser = get(user);
			if (!currentUser) {
				return { success: false, error: 'User not authenticated' };
			}

			// Check if event type exists and belongs to user
			const { data: existingType, error: fetchError } = await supabase
				.from('event_types')
				.select('*')
				.eq('id', id)
				.eq('user_id', currentUser.id)
				.single();

			if (fetchError) {
				return { success: false, error: 'Event type not found or access denied' };
			}

			// Validate slug uniqueness if slug is being changed
			if (params.slug && params.slug !== existingType.slug) {
				const slugCheck = await this.checkSlugUnique(params.slug, currentUser.id, id);
				if (!slugCheck.success) {
					return slugCheck;
				}
			}

			// Validate custom fields if provided
			if (params.custom_fields) {
				const validation = this.validateCustomFields(params.custom_fields);
				if (!validation.success) {
					return validation;
				}
			}

			// Prepare update data (only include changed fields)
			const updateData: Partial<EventType> = {};
			if (params.name !== undefined) updateData.name = params.name.trim();
			if (params.slug !== undefined) updateData.slug = params.slug.trim().toLowerCase();
			if (params.icon !== undefined) updateData.icon = params.icon;
			if (params.has_duration !== undefined) updateData.has_duration = params.has_duration;
			if (params.has_location !== undefined) updateData.has_location = params.has_location;
			if (params.has_severity !== undefined) updateData.has_severity = params.has_severity;
			if (params.auto_resolve !== undefined) updateData.auto_resolve = params.auto_resolve;
			if (params.sort_order !== undefined) updateData.sort_order = params.sort_order;
			if (params.custom_fields !== undefined) updateData.custom_fields = params.custom_fields;
			if (params.active !== undefined) updateData.active = params.active;

			// Update in database
			const { data, error } = await supabase
				.from('event_types')
				.update(updateData)
				.eq('id', id)
				.eq('user_id', currentUser.id)
				.select()
				.single();

			if (error) {
				if (error.code === '23505') { // Unique constraint violation
					return { success: false, error: 'An event type with this slug already exists' };
				}
				return { success: false, error: `Database error: ${error.message}` };
			}

			// Clear cache to trigger refresh
			clearEventTypesCache();

			return { success: true, eventType: data };
		} catch (error) {
			console.error('Error updating event type:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	/**
	 * Delete a custom event type (soft delete by setting active = false)
	 */
	static async deleteEventType(id: string, hardDelete = false): Promise<DeleteResult> {
		try {
			const currentUser = get(user);
			if (!currentUser) {
				return { success: false, error: 'User not authenticated' };
			}

			// Check if there are existing events using this type
			const { count, error: countError } = await supabase
				.from('events')
				.select('id', { count: 'exact', head: true })
				.eq('event_type_id', id);

			if (countError) {
				return { success: false, error: 'Failed to check event usage' };
			}

			if (count && count > 0 && hardDelete) {
				return {
					success: false,
					error: `Cannot delete event type: ${count} events are using this type. Consider deactivating instead.`
				};
			}

			if (hardDelete) {
				// Hard delete - permanently remove
				const { error } = await supabase
					.from('event_types')
					.delete()
					.eq('id', id)
					.eq('user_id', currentUser.id);

				if (error) {
					return { success: false, error: `Database error: ${error.message}` };
				}
			} else {
				// Soft delete - set active to false
				const { error } = await supabase
					.from('event_types')
					.update({ active: false })
					.eq('id', id)
					.eq('user_id', currentUser.id);

				if (error) {
					return { success: false, error: `Database error: ${error.message}` };
				}
			}

			// Clear cache to trigger refresh
			clearEventTypesCache();

			return { success: true };
		} catch (error) {
			console.error('Error deleting event type:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	/**
	 * Get all custom event types for the current user
	 */
	static async getUserEventTypes(includeInactive = false): Promise<EventTypesResult> {
		try {
			const currentUser = get(user);
			if (!currentUser) {
				return { success: false, error: 'User not authenticated' };
			}

			let query = supabase
				.from('event_types')
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

			return { success: true, eventTypes: data || [] };
		} catch (error) {
			console.error('Error fetching user event types:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	/**
	 * Check if slug is unique for this user
	 */
	private static async checkSlugUnique(slug: string, userId: string, excludeId?: string): Promise<{ success: boolean; error?: string }> {
		// Slug must be unique against rows we can write — system defaults
		// (user_id IS NULL) plus this user's own customs. The previous
		// `or('slug.eq.X,user_id.is.null')` matched any system default
		// regardless of slug, so it always reported "in use".
		let query = supabase
			.from('event_types')
			.select('id')
			.or(`and(slug.eq.${slug},user_id.eq.${userId}),and(slug.eq.${slug},user_id.is.null)`)
			.limit(1);

		if (excludeId) {
			query = query.neq('id', excludeId);
		}

		const { data, error } = await query;

		if (error) {
			return { success: false, error: 'Failed to check slug uniqueness' };
		}

		if (data && data.length > 0) {
			return { success: false, error: 'This slug is already in use' };
		}

		return { success: true };
	}

	/**
	 * Validate custom fields structure
	 */
	private static validateCustomFields(customFields: any[]): { success: boolean; error?: string } {
		if (!Array.isArray(customFields)) {
			return { success: false, error: 'Custom fields must be an array' };
		}

		for (let i = 0; i < customFields.length; i++) {
			const field = customFields[i];

			if (!field.name || typeof field.name !== 'string') {
				return { success: false, error: `Field ${i + 1}: name is required and must be a string` };
			}

			if (!field.type || !['text', 'number', 'select', 'textarea', 'checkbox'].includes(field.type)) {
				return { success: false, error: `Field ${i + 1}: type must be one of: text, number, select, textarea, checkbox` };
			}

			if (field.type === 'select' && (!field.options || !Array.isArray(field.options) || field.options.length === 0)) {
				return { success: false, error: `Field ${i + 1}: select fields must have options array` };
			}

			// Validate field name uniqueness within this set
			const duplicates = customFields.filter(f => f.name === field.name);
			if (duplicates.length > 1) {
				return { success: false, error: `Field name "${field.name}" is used multiple times` };
			}
		}

		return { success: true };
	}

	/**
	 * Reorder event types for a user
	 */
	static async reorderEventTypes(eventTypeIds: string[]): Promise<DeleteResult> {
		try {
			const currentUser = get(user);
			if (!currentUser) {
				return { success: false, error: 'User not authenticated' };
			}

			// Update sort_order for each event type
			const updates = eventTypeIds.map((id, index) =>
				supabase
					.from('event_types')
					.update({ sort_order: index + 1 })
					.eq('id', id)
					.eq('user_id', currentUser.id)
			);

			// Execute all updates
			await Promise.all(updates);

			// Clear cache to trigger refresh
			clearEventTypesCache();

			return { success: true };
		} catch (error) {
			console.error('Error reordering event types:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}
}

// Helper functions for components
export async function createEventType(params: CreateEventTypeParams): Promise<EventTypeResult> {
	return await EventTypeService.createEventType(params);
}

export async function updateEventType(id: string, params: UpdateEventTypeParams): Promise<EventTypeResult> {
	return await EventTypeService.updateEventType(id, params);
}

export async function deleteEventType(id: string, hardDelete = false): Promise<DeleteResult> {
	return await EventTypeService.deleteEventType(id, hardDelete);
}

export async function getUserEventTypes(includeInactive = false): Promise<EventTypesResult> {
	return await EventTypeService.getUserEventTypes(includeInactive);
}

export async function reorderEventTypes(eventTypeIds: string[]): Promise<DeleteResult> {
	return await EventTypeService.reorderEventTypes(eventTypeIds);
}