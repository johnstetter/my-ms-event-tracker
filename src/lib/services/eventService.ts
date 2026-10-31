import { supabase, type NewEvent, type Event, type EventType, type BodyLocation, type Intervention, type EventWithDetails } from '../supabase.js';
import { get } from 'svelte/store';
import { user } from '../stores/auth.js';
import { createServiceLogger, createTimer } from '../logging/index.js';

// Service logger for structured logging
const log = createServiceLogger('eventService');

// Interface for creating a quick log event
export interface CreateQuickEventParams {
	eventType: EventType;
	severity?: number | null;
	locations?: BodyLocation[];
	startedAt?: string; // ISO string
	notes?: string;
	customFields?: Record<string, any>;
}

// Result interface
export interface CreateEventResult {
	success: boolean;
	event?: Event;
	error?: string;
}

// Event history query parameters
export interface EventHistoryParams {
	limit?: number;              // Events per page (default: 25)
	offset?: number;             // Pagination offset
	eventTypeIds?: string[];     // Filter by event types
	startDate?: string;          // ISO string for date range
	endDate?: string;            // ISO string for date range
	searchTerm?: string;         // Search in notes
	sortBy?: 'started_at' | 'severity';
	sortOrder?: 'asc' | 'desc';
}

// Event history result with pagination
export interface EventHistoryResult {
	success: boolean;
	events?: EventWithDetails[];
	totalCount?: number;
	error?: string;
}

// Recent events result (matches EventHistoryResult shape minus pagination)
export interface RecentEventsResult {
	success: boolean;
	events?: EventWithDetails[];
	error?: string;
}

// Service class for event operations
export class EventService {
	/**
	 * Create a new event with optimized database operations
	 */
	static async createQuickEvent(params: CreateQuickEventParams): Promise<CreateEventResult> {
		const requestId = crypto.randomUUID();
		const operationLog = log.withRequestId(requestId).withContext({ operation: 'createQuickEvent' });
		const timer = createTimer(operationLog, 'createQuickEvent');

		operationLog.info('Creating quick event', {
			eventTypeId: params.eventType?.id,
			eventTypeName: params.eventType?.name,
			hasSeverity: params.eventType?.has_severity,
			hasLocation: params.eventType?.has_location,
			locationsCount: params.locations?.length || 0,
			severity: params.severity
		});

		try {
			const currentUser = get(user);
			if (!currentUser) {
				operationLog.warn('Event creation attempted without authentication');
				timer.error('Authentication required');
				return { success: false, error: 'User not authenticated' };
			}

			const userLog = operationLog.withUserId(currentUser.id);

			// Validate required fields
			if (!params.eventType) {
				userLog.error('Event creation failed: missing event type');
				timer.error('Validation failed: missing event type');
				return { success: false, error: 'Event type is required' };
			}

			// Validate severity if required
			if (params.eventType.has_severity) {
				if (params.severity === null || params.severity === undefined) {
					userLog.error('Event creation failed: severity required but not provided', undefined, {
						eventType: params.eventType.slug
					});
					timer.error('Validation failed: missing severity');
					return { success: false, error: 'Severity is required for this event type' };
				}
				if (params.severity < 1 || params.severity > 10) {
					userLog.error('Event creation failed: invalid severity value', undefined, {
						severity: params.severity,
						eventType: params.eventType.slug
					});
					timer.error('Validation failed: invalid severity');
					return { success: false, error: 'Severity must be between 1 and 10' };
				}
			}

			// Validate locations if required
			if (params.eventType.has_location) {
				if (!params.locations || params.locations.length === 0) {
					userLog.error('Event creation failed: locations required but not provided', undefined, {
						eventType: params.eventType.slug
					});
					timer.error('Validation failed: missing locations');
					return { success: false, error: 'At least one location is required for this event type' };
				}
			}

			// Prepare event data
			const newEvent: NewEvent = {
				user_id: currentUser.id,
				event_type_id: params.eventType.id,
				severity: params.eventType.has_severity ? params.severity : null,
				started_at: params.startedAt || new Date().toISOString(),
				notes: params.notes || null,
				attributes: params.customFields && Object.keys(params.customFields).length > 0
					? params.customFields
					: null
			};

			// Point-in-time event types are auto-resolved at creation so they
			// don't clutter the ongoing-events UI. Per-type behavior — see #53.
			if (params.eventType.auto_resolve) {
				newEvent.ended_at = newEvent.started_at;
			}

			// Use a transaction if we need to insert both event and locations
			let result: CreateEventResult;
			if (params.eventType.has_location && params.locations && params.locations.length > 0) {
				userLog.debug('Creating event with locations', { locationsCount: params.locations.length });
				result = await this.createEventWithLocations(newEvent, params.locations);
			} else {
				userLog.debug('Creating event without locations');
				result = await this.createEventOnly(newEvent);
			}

			if (result.success) {
				userLog.info('Quick event created successfully', {
					eventId: result.event?.id,
					eventType: params.eventType.slug
				});
				timer.end('Event creation completed');
			} else {
				userLog.error('Event creation failed', undefined, { error: result.error });
				timer.error('Event creation failed', undefined, { error: result.error });
			}

			return result;
		} catch (error) {
			operationLog.error('Error creating quick event', error as Error, {
				eventType: params.eventType?.slug,
				hasSeverity: params.eventType?.has_severity,
				hasLocation: params.eventType?.has_location
			});
			timer.error('Event creation failed with exception', error as Error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	/**
	 * Create event without locations (single operation)
	 */
	private static async createEventOnly(eventData: NewEvent): Promise<CreateEventResult> {
		const { data, error } = await supabase
			.from('events')
			.insert(eventData)
			.select()
			.single();

		if (error) {
			return { success: false, error: `Database error: ${error.message}` };
		}

		return { success: true, event: data };
	}

	/**
	 * Create event with locations (transaction-like operation)
	 */
	private static async createEventWithLocations(
		eventData: NewEvent,
		locations: BodyLocation[]
	): Promise<CreateEventResult> {
		// First, create the event
		const { data: event, error: eventError } = await supabase
			.from('events')
			.insert(eventData)
			.select()
			.single();

		if (eventError) {
			return { success: false, error: `Failed to create event: ${eventError.message}` };
		}

		// Then, create the location associations
		const locationInserts = locations.map(location => ({
			event_id: event.id,
			body_location_id: location.id
		}));

		const { error: locationsError } = await supabase
			.from('event_locations')
			.insert(locationInserts);

		if (locationsError) {
			// If location insertion fails, we should delete the event to maintain consistency
			await supabase.from('events').delete().eq('id', event.id);
			return { success: false, error: `Failed to associate locations: ${locationsError.message}` };
		}

		return { success: true, event };
	}

	/**
	 * Get recent events for the current user
	 */
	static async getRecentEvents(limit = 10): Promise<RecentEventsResult> {
		const operationLog = log.withContext({ operation: 'getRecentEvents' });
		const timer = createTimer(operationLog, 'getRecentEvents', { limit });

		const currentUser = get(user);
		if (!currentUser) {
			operationLog.warn('Recent events request without authentication');
			timer.error('Authentication required');
			return { success: false, error: 'User not authenticated' };
		}

		const userLog = operationLog.withUserId(currentUser.id);
		userLog.debug('Fetching recent events', { limit });

		try {
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
				.order('started_at', { ascending: false })
				.limit(limit);

			if (error) {
				userLog.error('Database error fetching recent events', error as Error);
				timer.error('Database query failed', error as Error);
				return { success: false, error: `Database error: ${error.message}` };
			}

			const events = (data ?? []) as EventWithDetails[];

			userLog.info('Recent events fetched successfully', {
				eventsCount: events.length,
				requestedLimit: limit
			});
			timer.end('Events fetched successfully');

			return { success: true, events };
		} catch (error) {
			userLog.error('Error fetching recent events', error as Error, { limit });
			timer.error('Recent events fetch failed', error as Error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	/**
	 * Get events count by type for dashboard stats
	 */
	static async getEventTypeStats(days = 30) {
		const operationLog = log.withContext({ operation: 'getEventTypeStats' });
		const timer = createTimer(operationLog, 'getEventTypeStats', { days });

		const currentUser = get(user);
		if (!currentUser) {
			operationLog.warn('Event stats request without authentication');
			timer.error('Authentication required');
			return { success: false, error: 'User not authenticated' };
		}

		const userLog = operationLog.withUserId(currentUser.id);
		userLog.debug('Fetching event type statistics', { days });

		try {
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - days);

			const { data, error } = await supabase
				.from('events')
				.select(`
					event_type_id,
					event_type:event_types(name, icon)
				`)
				.eq('user_id', currentUser.id)
				.gte('started_at', cutoffDate.toISOString());

			if (error) {
				userLog.error('Database error fetching event stats', error as Error, { days });
				timer.error('Database query failed', error as Error);
				return { success: false, error: `Database error: ${error.message}` };
			}

			// Count occurrences by type
			const stats = new Map();
			data.forEach(event => {
				const typeId = event.event_type_id;
				if (!stats.has(typeId)) {
					stats.set(typeId, {
						type: event.event_type,
						count: 0
					});
				}
				stats.get(typeId).count++;
			});

			const statsArray = Array.from(stats.values());
			userLog.info('Event type statistics calculated', {
				days,
				uniqueEventTypes: statsArray.length,
				totalEvents: data.length
			});
			timer.end('Statistics calculated successfully');

			return { success: true, stats: statsArray };
		} catch (error) {
			userLog.error('Error fetching event stats', error as Error, { days });
			timer.error('Event stats fetch failed', error as Error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	/**
	 * Get event history with filtering, pagination, and search
	 */
	static async getEventHistory(params: EventHistoryParams = {}): Promise<EventHistoryResult> {
		const operationLog = log.withContext({ operation: 'getEventHistory' });
		const timer = createTimer(operationLog, 'getEventHistory', {
			limit: params.limit,
			hasFilters: !!(params.eventTypeIds || params.startDate || params.endDate || params.searchTerm)
		});

		const currentUser = get(user);
		if (!currentUser) {
			operationLog.warn('Event history request without authentication');
			timer.error('Authentication required');
			return { success: false, error: 'User not authenticated' };
		}

		const userLog = operationLog.withUserId(currentUser.id);
		userLog.debug('Fetching event history', {
			limit: params.limit,
			offset: params.offset,
			hasEventTypeFilter: !!params.eventTypeIds,
			hasDateFilter: !!(params.startDate || params.endDate),
			hasSearchTerm: !!params.searchTerm
		});

		try {
			const {
				limit = 25,
				offset = 0,
				eventTypeIds,
				startDate,
				endDate,
				searchTerm,
				sortBy = 'started_at',
				sortOrder = 'desc'
			} = params;

			// Build the base query
			let query = supabase
				.from('events')
				.select(`
					*,
					event_type:event_types(*),
					event_locations(
						body_location:body_locations(*)
					)
				`, { count: 'exact' })
				.eq('user_id', currentUser.id);

			// Apply filters
			if (eventTypeIds && eventTypeIds.length > 0) {
				query = query.in('event_type_id', eventTypeIds);
			}

			if (startDate) {
				query = query.gte('started_at', startDate);
			}

			if (endDate) {
				query = query.lte('started_at', endDate);
			}

			if (searchTerm) {
				query = query.ilike('notes', `%${searchTerm}%`);
			}

			// Apply sorting
			query = query.order(sortBy, { ascending: sortOrder === 'asc' });

			// Apply pagination
			query = query.range(offset, offset + limit - 1);

			const { data, error, count } = await query;

			if (error) {
				userLog.error('Database error fetching event history', error as Error, params);
				timer.error('Database query failed', error as Error);
				return { success: false, error: `Database error: ${error.message}` };
			}

			userLog.info('Event history fetched successfully', {
				eventsReturned: data?.length || 0,
				totalCount: count || 0,
				offset: params.offset || 0,
				limit: params.limit || 25
			});
			timer.end('Event history fetched');

			return {
				success: true,
				events: (data ?? []) as EventWithDetails[],
				totalCount: count || 0
			};
		} catch (error) {
			userLog.error('Error fetching event history', error as Error, params);
			timer.error('Event history fetch failed', error as Error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}
}

// Helper function for quick event creation (for use in components)
export async function createQuickEvent(params: CreateQuickEventParams): Promise<CreateEventResult> {
	return await EventService.createQuickEvent(params);
}

// Enhanced export data interface
export interface ExportEventData extends Event {
	event_type: EventType;
	event_locations: Array<{
		body_location: BodyLocation;
	}>;
	event_interventions: Array<{
		intervention: Intervention;
		applied_at: string | null;
		notes: string | null;
	}>;
	event_notes: Array<{
		id: string;
		content: string;
		created_at: string;
	}>;
}

// Export parameters (extends history params but removes pagination for exports)
export interface EventExportParams extends Omit<EventHistoryParams, 'limit' | 'offset'> {
	includeInterventions?: boolean;
}

// Export result interface
export interface EventExportResult {
	success: boolean;
	events?: ExportEventData[];
	totalCount?: number;
	error?: string;
}

/**
 * Get comprehensive event data for export purposes
 * Includes all related data: event types, locations, and interventions
 */
export async function getEventExportData(params: EventExportParams = {}): Promise<EventExportResult> {
	const operationLog = log.withContext({ operation: 'getEventExportData' });
	const timer = createTimer(operationLog, 'getEventExportData', {
		includeInterventions: params.includeInterventions,
		hasFilters: !!(params.eventTypeIds || params.startDate || params.endDate)
	});

	const currentUser = get(user);
	if (!currentUser) {
		operationLog.warn('Event export request without authentication');
		timer.error('Authentication required');
		return { success: false, error: 'User not authenticated' };
	}

	const userLog = operationLog.withUserId(currentUser.id);
	userLog.info('Starting event export data fetch', {
		includeInterventions: params.includeInterventions,
		hasFilters: !!(params.eventTypeIds || params.startDate || params.endDate)
	});

	try {
		const {
			eventTypeIds,
			startDate,
			endDate,
			searchTerm,
			sortBy = 'started_at',
			sortOrder = 'desc',
			includeInterventions = true
		} = params;

		// Build the enhanced query with all related data
		let query = supabase
			.from('events')
			.select(`
				*,
				event_type:event_types(*),
				event_locations(
					body_location:body_locations(*)
				),
				event_interventions(
					intervention:interventions(*),
					applied_at,
					notes
				),
				event_notes(
					id,
					content,
					created_at
				)
			`, { count: 'exact' })
			.eq('user_id', currentUser.id);

		// Apply the same filters as history page
		if (eventTypeIds && eventTypeIds.length > 0) {
			query = query.in('event_type_id', eventTypeIds);
		}

		if (startDate) {
			query = query.gte('started_at', startDate);
		}

		if (endDate) {
			query = query.lte('started_at', endDate);
		}

		if (searchTerm) {
			query = query.ilike('notes', `%${searchTerm}%`);
		}

		// Apply sorting
		query = query.order(sortBy, { ascending: sortOrder === 'asc' });

		const { data, error, count } = await query;

		if (error) {
			userLog.error('Database error fetching export data', error as Error, params);
			timer.error('Database query failed', error as Error);
			return { success: false, error: `Database error: ${error.message}` };
		}

		const exportData = data as ExportEventData[] || [];
		userLog.info('Event export data fetched successfully', {
			eventsCount: exportData.length,
			totalCount: count || 0,
			includeInterventions: params.includeInterventions
		});
		timer.end('Export data fetch completed');

		return {
			success: true,
			events: exportData,
			totalCount: count || 0
		};
	} catch (error) {
		userLog.error('Error fetching event export data', error as Error, params);
		timer.error('Event export fetch failed', error as Error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error occurred'
		};
	}
}

// Helper function for getting event history (for use in components)
export async function getEventHistory(params: EventHistoryParams = {}): Promise<EventHistoryResult> {
	return await EventService.getEventHistory(params);
}

// Helper function for getting export data (for use in components)
export async function getEventsForExport(params: EventExportParams = {}): Promise<EventExportResult> {
	return await getEventExportData(params);
}