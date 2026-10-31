import { supabase, type Event, type EventNote, type NewEventNote } from '../supabase.js';
import { get } from 'svelte/store';
import { user } from '../stores/auth.js';
import { log } from '../logging/index.js';

// Interface for adding note to event
export interface AddEventNoteParams {
	eventId: string;
	content: string;
	createdAt?: string; // ISO string, defaults to now
}

// Service result interface
export interface ServiceResult<T = any> {
	success: boolean;
	data?: T;
	error?: string;
}

// Service class for event note operations
export class EventNotesService {
	/**
	 * Add a note to an existing event
	 */
	static async addEventNote(params: AddEventNoteParams): Promise<ServiceResult<EventNote>> {
		try {
			const currentUser = get(user);
			if (!currentUser) {
				return { success: false, error: 'User not authenticated' };
			}

			// Validate required fields
			if (!params.eventId) {
				return { success: false, error: 'Event ID is required' };
			}
			if (!params.content || !params.content.trim()) {
				return { success: false, error: 'Note content is required' };
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

			// Prepare note data
			const noteData: NewEventNote = {
				event_id: params.eventId,
				content: params.content.trim(),
				created_at: params.createdAt || new Date().toISOString(),
			};

			// Insert the note
			const { data, error } = await supabase
				.from('event_notes')
				.insert(noteData)
				.select()
				.single();

			if (error) {
				return { success: false, error: `Database error: ${error.message}` };
			}

			return { success: true, data: data as EventNote };
		} catch (error) {
			log.event.error('Failed to add note to event', error as Error, {
				eventId: params.eventId,
				operation: 'addEventNote'
			});
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	/**
	 * Get all notes for a specific event
	 */
	static async getEventNotes(eventId: string): Promise<ServiceResult<EventNote[]>> {
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

			// Get all notes for this event, sorted chronologically
			const { data, error } = await supabase
				.from('event_notes')
				.select('*')
				.eq('event_id', eventId)
				.order('created_at', { ascending: true });

			if (error) {
				return { success: false, error: `Database error: ${error.message}` };
			}

			return { success: true, data: data as EventNote[] || [] };
		} catch (error) {
			console.error('Error fetching event notes:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	/**
	 * Update an existing event note
	 */
	static async updateEventNote(noteId: string, content: string): Promise<ServiceResult<EventNote>> {
		try {
			const currentUser = get(user);
			if (!currentUser) {
				return { success: false, error: 'User not authenticated' };
			}

			// Validate required fields
			if (!noteId) {
				return { success: false, error: 'Note ID is required' };
			}
			if (!content || !content.trim()) {
				return { success: false, error: 'Note content is required' };
			}

			// Verify the note belongs to the current user through the event
			const { data: note, error: noteError } = await supabase
				.from('event_notes')
				.select(`
					*,
					event:events!inner(user_id)
				`)
				.eq('id', noteId)
				.single();

			if (noteError || !note || note.event?.user_id !== currentUser.id) {
				return { success: false, error: 'Note not found or access denied' };
			}

			// Update the note
			const { data, error } = await supabase
				.from('event_notes')
				.update({
					content: content.trim(),
					updated_at: new Date().toISOString()
				})
				.eq('id', noteId)
				.select()
				.single();

			if (error) {
				return { success: false, error: `Database error: ${error.message}` };
			}

			return { success: true, data: data as EventNote };
		} catch (error) {
			console.error('Error updating event note:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	/**
	 * Delete an event note
	 */
	static async deleteEventNote(noteId: string): Promise<ServiceResult<boolean>> {
		try {
			const currentUser = get(user);
			if (!currentUser) {
				return { success: false, error: 'User not authenticated' };
			}

			// Validate required fields
			if (!noteId) {
				return { success: false, error: 'Note ID is required' };
			}

			// Verify the note belongs to the current user through the event
			const { data: note, error: noteError } = await supabase
				.from('event_notes')
				.select(`
					id,
					event:events!inner(user_id)
				`)
				.eq('id', noteId)
				.single();

			if (noteError || !note || note.event?.user_id !== currentUser.id) {
				return { success: false, error: 'Note not found or access denied' };
			}

			// Delete the note
			const { error } = await supabase
				.from('event_notes')
				.delete()
				.eq('id', noteId);

			if (error) {
				return { success: false, error: `Database error: ${error.message}` };
			}

			return { success: true, data: true };
		} catch (error) {
			console.error('Error deleting event note:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	/**
	 * Get notes for multiple events (useful for timeline views)
	 */
	static async getNotesForEvents(eventIds: string[]): Promise<ServiceResult<{ [eventId: string]: EventNote[] }>> {
		try {
			const currentUser = get(user);
			if (!currentUser) {
				return { success: false, error: 'User not authenticated' };
			}

			if (!eventIds || eventIds.length === 0) {
				return { success: true, data: {} };
			}

			// Get all notes for the specified events, ensuring they belong to the current user
			const { data, error } = await supabase
				.from('event_notes')
				.select(`
					*,
					event:events!inner(user_id)
				`)
				.in('event_id', eventIds)
				.eq('event.user_id', currentUser.id)
				.order('created_at', { ascending: true });

			if (error) {
				return { success: false, error: `Database error: ${error.message}` };
			}

			// Group notes by event ID
			const notesByEvent: { [eventId: string]: EventNote[] } = {};

			if (data) {
				for (const note of data) {
					if (!notesByEvent[note.event_id]) {
						notesByEvent[note.event_id] = [];
					}
					// Remove the joined event data before adding to results
					const { event, ...noteData } = note;
					notesByEvent[note.event_id].push(noteData as EventNote);
				}
			}

			return { success: true, data: notesByEvent };
		} catch (error) {
			console.error('Error fetching notes for events:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}
}

// Helper functions for use in components
export async function addEventNote(params: AddEventNoteParams): Promise<ServiceResult<EventNote>> {
	return await EventNotesService.addEventNote(params);
}

export async function getEventNotes(eventId: string): Promise<ServiceResult<EventNote[]>> {
	return await EventNotesService.getEventNotes(eventId);
}

export async function updateEventNote(noteId: string, content: string): Promise<ServiceResult<EventNote>> {
	return await EventNotesService.updateEventNote(noteId, content);
}

export async function deleteEventNote(noteId: string): Promise<ServiceResult<boolean>> {
	return await EventNotesService.deleteEventNote(noteId);
}

export async function getNotesForEvents(eventIds: string[]): Promise<ServiceResult<{ [eventId: string]: EventNote[] }>> {
	return await EventNotesService.getNotesForEvents(eventIds);
}