<script lang="ts">
	import { onMount } from 'svelte';
	import type { EventWithDetails, EventNote } from '$lib/supabase.js';
	import { EventService } from '$lib/services/eventService.js';
	import {
		InterventionService,
		resolveEventWithNote,
		type EventInterventionWithDetails
	} from '$lib/services/interventionService.js';
	import { getEventNotes } from '$lib/services/eventNotesService.js';
	import EventActions from './EventActions.svelte';
	import InterventionLog from './intervention/InterventionLog.svelte';
	import NoteLog from './notes/NoteLog.svelte';
	import ResolveEventModal from './modals/ResolveEventModal.svelte';

	// Props
	export let eventId: string;

	// Local state
	let event: EventWithDetails | null = null;
	let interventions: EventInterventionWithDetails[] = [];
	let notes: EventNote[] = [];
	let loading = true;
	let error: string | null = null;
	let showInterventionLog = false;
	let showNoteLog = false;
	let showResolveModal = false;

	// Load event details and interventions
	async function loadEventDetails() {
		loading = true;
		error = null;

		try {
			// Load event details
			const eventsResult = await EventService.getRecentEvents(100); // Get more events to find this one

			if (eventsResult.success) {
				const foundEvent = eventsResult.events?.find((e) => e.id === eventId);
				if (!foundEvent) {
					error = 'Event not found';
					return;
				}
				event = foundEvent;

				// Load interventions for this event
				const interventionsResult = await InterventionService.getEventInterventions(eventId);
				if (interventionsResult.success) {
					interventions = interventionsResult.data || [];
				} else {
					console.warn('Failed to load interventions:', interventionsResult.error);
					interventions = [];
				}

				// Load notes for this event
				const notesResult = await getEventNotes(eventId);
				if (notesResult.success) {
					notes = notesResult.data || [];
				} else {
					console.warn('Failed to load notes:', notesResult.error);
					notes = [];
				}
			} else {
				error = eventsResult.error || 'Failed to load event';
			}
		} catch (e) {
			console.error('Error loading event details:', e);
			error = 'Failed to load event details';
		} finally {
			loading = false;
		}
	}

	// Handle add intervention
	function handleAddIntervention() {
		showInterventionLog = true;
	}

	// Handle intervention added
	function handleInterventionAdded() {
		showInterventionLog = false;
		// Reload interventions
		loadInterventions();
	}

	// Handle intervention log canceled
	function handleInterventionCancel() {
		showInterventionLog = false;
	}

	// Handle add note
	function handleAddNote() {
		showNoteLog = true;
	}

	// Handle note added
	function handleNoteAdded() {
		showNoteLog = false;
		// Reload notes
		loadNotes();
	}

	// Handle note log canceled
	function handleNoteCancel() {
		showNoteLog = false;
	}

	// Handle show resolve modal
	function handleShowResolveModal() {
		showResolveModal = true;
	}

	// Handle resolve modal cancel
	function handleResolveCancel() {
		showResolveModal = false;
	}

	// Handle resolve modal resolve
	async function handleResolve(modalEvent: CustomEvent) {
		showResolveModal = false;

		if (!event) return;

		try {
			const result = await resolveEventWithNote(event.id, modalEvent.detail.resolutionNote);

			if (result.success && result.data) {
				// Update the event with the resolved data
				event = { ...event, ended_at: result.data.event.ended_at };

				// If there's a note, reload notes to show the resolution note
				if (result.data.note) {
					loadNotes();
				}
			} else {
				console.error('Failed to resolve event:', result.error);
				// You could add error handling UI here if needed
			}
		} catch (error) {
			console.error('Error resolving event with note:', error);
		}
	}

	// Handle event resolved
	function handleEventResolved(eventData: CustomEvent) {
		if (event) {
			event = { ...event, ended_at: eventData.detail.event.ended_at };
		}

		// If there's a note, reload notes to show the resolution note
		if (eventData.detail.note) {
			loadNotes();
		}
	}

	// Reload just interventions
	async function loadInterventions() {
		try {
			const result = await InterventionService.getEventInterventions(eventId);
			if (result.success) {
				interventions = result.data || [];
			}
		} catch (e) {
			console.warn('Error reloading interventions:', e);
		}
	}

	// Reload just notes
	async function loadNotes() {
		try {
			const result = await getEventNotes(eventId);
			if (result.success) {
				notes = result.data || [];
			}
		} catch (e) {
			console.warn('Error reloading notes:', e);
		}
	}

	// Format date and time
	function formatDateTime(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleString();
	}

	// Format time only
	function formatTime(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	// Format duration
	function formatDuration(startedAt: string, endedAt?: string): string {
		const start = new Date(startedAt);
		const end = endedAt ? new Date(endedAt) : new Date();
		const durationMs = end.getTime() - start.getTime();

		const hours = Math.floor(durationMs / (1000 * 60 * 60));
		const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

		if (hours > 0) {
			return `${hours}h ${minutes}m`;
		}
		return `${minutes}m`;
	}

	// Format locations
	function formatLocations(event: EventWithDetails | null): string {
		if (!event?.event_locations || event.event_locations.length === 0) {
			return '';
		}
		return event.event_locations
			.map((el) => el.body_location.name)
			.join(', ');
	}

	// Check if event is ongoing
	$: isOngoing = event && !event.ended_at;

	// Discriminated union so consumers can narrow data via `item.type`
	type TimelineItem =
		| { type: 'intervention'; timestamp: string; data: EventInterventionWithDetails }
		| { type: 'note'; timestamp: string; data: EventNote };

	// Create combined timeline items (interventions + notes) sorted chronologically
	$: timelineItems = (() => {
		const items: TimelineItem[] = [];

		// Add interventions (skip any without an applied_at timestamp)
		interventions.forEach(intervention => {
			if (!intervention.applied_at) return;
			items.push({
				type: 'intervention',
				timestamp: intervention.applied_at,
				data: intervention
			});
		});

		// Add notes
		notes.forEach(note => {
			items.push({
				type: 'note',
				timestamp: note.created_at,
				data: note
			});
		});

		// Sort by timestamp
		return items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
	})();

	onMount(() => {
		loadEventDetails();
	});
</script>

<div class="event-detail">
	{#if loading}
		<div class="loading-state">
			<div class="loading-spinner"></div>
			<p>Loading event details...</p>
		</div>

	{:else if error}
		<div class="error-state">
			<h2>Error</h2>
			<p class="error-message">{error}</p>
			<button type="button" class="retry-btn" on:click={loadEventDetails}>
				Try Again
			</button>
		</div>

	{:else if event}
		<!-- Event Header -->
		<div class="event-header">
			<div class="event-title">
				<span class="event-icon">{event.event_type?.icon}</span>
				<div class="title-info">
					<h1>{event.event_type?.name}</h1>
					<p class="event-date">{formatDateTime(event.started_at)}</p>
				</div>
			</div>

			<div class="event-status">
				{#if isOngoing}
					<span class="status-badge ongoing">Ongoing</span>
					<span class="duration-badge">
						{formatDuration(event.started_at)}
					</span>
				{:else}
					<span class="status-badge resolved">Resolved</span>
					<span class="duration-badge">
						Duration: {formatDuration(event.started_at, event.ended_at || undefined)}
					</span>
				{/if}
			</div>
		</div>

		<!-- Event Details -->
		<div class="event-details">
			<div class="detail-section">
				<h3>Event Information</h3>

				<div class="detail-grid">
					<div class="detail-item">
						<span class="detail-label">Started:</span>
						<span class="detail-value">{formatDateTime(event.started_at)}</span>
					</div>

					{#if event.ended_at}
						<div class="detail-item">
							<span class="detail-label">Resolved:</span>
							<span class="detail-value">{formatDateTime(event.ended_at)}</span>
						</div>
					{/if}

					{#if event.severity}
						<div class="detail-item">
							<span class="detail-label">Severity:</span>
							<span class="detail-value severity-{Math.ceil(event.severity / 3.33)}">
								{event.severity}/10
							</span>
						</div>
					{/if}

					{#if formatLocations(event)}
						<div class="detail-item">
							<span class="detail-label">Locations:</span>
							<span class="detail-value">{formatLocations(event)}</span>
						</div>
					{/if}

					{#if event.notes}
						<div class="detail-item full-width">
							<span class="detail-label">Notes:</span>
							<span class="detail-value">{event.notes}</span>
						</div>
					{/if}

					{#if event.attributes && Object.keys(event.attributes).length > 0}
						{#each Object.entries(event.attributes) as [key, value]}
							<div class="detail-item">
								<span class="detail-label">{key.charAt(0).toUpperCase() + key.slice(1)}:</span>
								<span class="detail-value">{value}</span>
							</div>
						{/each}
					{/if}
				</div>
			</div>

			<!-- Timeline Section -->
			<div class="timeline-section">
				<h3>Event Timeline</h3>

				<div class="timeline">
					<!-- Event Start -->
					<div class="timeline-item">
						<div class="timeline-marker start">
							<span class="marker-icon">{event.event_type?.icon}</span>
						</div>
						<div class="timeline-content">
							<div class="timeline-header">
								<h4>Event Started</h4>
								<span class="timeline-time">{formatTime(event.started_at)}</span>
							</div>
							<p>
								{event.event_type?.name}
								{#if event.severity} - Severity {event.severity}/10{/if}
								{#if formatLocations(event)} in {formatLocations(event)}{/if}
							</p>
						</div>
					</div>

					<!-- Timeline Items (Notes + Interventions) -->
					{#each timelineItems as item (item.type + '-' + item.data.id)}
						<div class="timeline-item">
							{#if item.type === 'intervention'}
								<div class="timeline-marker intervention">
									<span class="marker-icon">💊</span>
								</div>
								<div class="timeline-content">
									<div class="timeline-header">
										<h4>Applied {item.data.intervention.name}</h4>
										<span class="timeline-time">{formatTime(item.timestamp)}</span>
									</div>
									{#if item.data.notes}
										<p class="intervention-notes">{item.data.notes}</p>
									{/if}
									<span class="intervention-category">{item.data.intervention.category}</span>
								</div>
							{:else if item.type === 'note'}
								<div class="timeline-marker note">
									<span class="marker-icon">📝</span>
								</div>
								<div class="timeline-content">
									<div class="timeline-header">
										<h4>Note</h4>
										<span class="timeline-time">{formatTime(item.data.created_at)}</span>
									</div>
									<p class="note-content">{item.data.content}</p>
								</div>
							{/if}
						</div>
					{/each}

					<!-- Event End -->
					{#if event.ended_at}
						<div class="timeline-item">
							<div class="timeline-marker end">
								<span class="marker-icon">✅</span>
							</div>
							<div class="timeline-content">
								<div class="timeline-header">
									<h4>Event Resolved</h4>
									<span class="timeline-time">{formatTime(event.ended_at)}</span>
								</div>
								<p>
									Total duration: {formatDuration(event.started_at, event.ended_at || undefined)}
								</p>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- Event Actions -->
			<EventActions
				{event}
				on:add-intervention={handleAddIntervention}
				on:add-note={handleAddNote}
				on:show-resolve-modal={handleShowResolveModal}
				on:event-resolved={handleEventResolved}
			/>
		</div>

	{:else}
		<div class="error-state">
			<h2>Event not found</h2>
			<p>The requested event could not be found.</p>
		</div>
	{/if}
</div>

<!-- Intervention Log Modal -->
{#if showInterventionLog && event}
	<div
		class="modal-backdrop"
		on:click={handleInterventionCancel}
		on:keydown={(e) => e.key === 'Escape' && handleInterventionCancel()}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div
			class="modal-content"
			on:click|stopPropagation
			on:keydown|stopPropagation
			role="document"
		>
			<InterventionLog
				eventId={event.id}
				eventTypeId={event.event_type_id}
				onSuccess={handleInterventionAdded}
				onCancel={handleInterventionCancel}
			/>
		</div>
	</div>
{/if}

<!-- Note Log Modal -->
{#if showNoteLog && event}
	<div
		class="modal-backdrop"
		on:click={handleNoteCancel}
		on:keydown={(e) => e.key === 'Escape' && handleNoteCancel()}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div
			class="modal-content"
			on:click|stopPropagation
			on:keydown|stopPropagation
			role="document"
		>
			<NoteLog
				eventId={event.id}
				onSuccess={handleNoteAdded}
				onCancel={handleNoteCancel}
			/>
		</div>
	</div>
{/if}

<!-- Resolve Event Modal -->
{#if showResolveModal && event}
	<div
		class="modal-backdrop"
		on:click={handleResolveCancel}
		on:keydown={(e) => e.key === 'Escape' && handleResolveCancel()}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div
			class="modal-content"
			on:click|stopPropagation
			on:keydown|stopPropagation
			role="document"
		>
			<ResolveEventModal
				{event}
				on:resolve={handleResolve}
				on:cancel={handleResolveCancel}
			/>
		</div>
	</div>
{/if}

<style>
	.event-detail {
		max-width: 800px;
		margin: 0 auto;
		padding: 1rem;
	}

	/* Loading and error states */
	.loading-state,
	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 4rem 2rem;
		text-align: center;
	}

	.loading-spinner {
		width: 3rem;
		height: 3rem;
		border: 4px solid #e9ecef;
		border-top: 4px solid #007bff;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.error-message {
		color: #dc3545;
		font-size: 1.1rem;
	}

	.retry-btn {
		background: #dc3545;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.retry-btn:hover {
		background: #c82333;
	}

	/* Event header */
	.event-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 2rem;
		margin-bottom: 2rem;
		padding: 2rem;
		background: white;
		border-radius: 12px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		border: 1px solid #e9ecef;
	}

	.event-title {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.event-icon {
		font-size: 3rem;
		line-height: 1;
	}

	.title-info h1 {
		margin: 0;
		color: #2c3e50;
		font-size: 2rem;
		font-weight: 700;
	}

	.event-date {
		margin: 0.25rem 0 0 0;
		color: #6c757d;
		font-size: 1rem;
	}

	.event-status {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.5rem;
	}

	.status-badge {
		padding: 0.5rem 1rem;
		border-radius: 20px;
		font-weight: 600;
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.status-badge.ongoing {
		background: #fff3cd;
		color: #856404;
		border: 1px solid #ffeeba;
	}

	.status-badge.resolved {
		background: #d4edda;
		color: #155724;
		border: 1px solid #c3e6cb;
	}

	.duration-badge {
		background: #f8f9fa;
		color: #495057;
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.8rem;
		font-weight: 500;
	}

	/* Event details */
	.event-details {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.detail-section,
	.timeline-section {
		background: white;
		border-radius: 12px;
		padding: 2rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		border: 1px solid #e9ecef;
	}

	.detail-section h3,
	.timeline-section h3 {
		margin: 0 0 1.5rem 0;
		color: #2c3e50;
		font-size: 1.25rem;
		font-weight: 600;
		border-bottom: 2px solid #e9ecef;
		padding-bottom: 0.5rem;
	}

	.detail-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1rem;
	}

	.detail-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.detail-item.full-width {
		grid-column: 1 / -1;
	}

	.detail-label {
		font-weight: 600;
		color: #495057;
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.detail-value {
		color: #2c3e50;
		font-size: 1rem;
		line-height: 1.4;
	}

	.detail-value.severity-1 {
		color: #28a745;
		font-weight: 600;
	}

	.detail-value.severity-2 {
		color: #ffc107;
		font-weight: 600;
	}

	.detail-value.severity-3 {
		color: #dc3545;
		font-weight: 600;
	}

	/* Timeline */
	.timeline {
		position: relative;
		padding-left: 2rem;
	}

	.timeline::before {
		content: '';
		position: absolute;
		left: 1rem;
		top: 0;
		bottom: 0;
		width: 2px;
		background: #e9ecef;
	}

	.timeline-item {
		position: relative;
		display: flex;
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.timeline-item:last-child {
		margin-bottom: 0;
	}

	.timeline-marker {
		position: absolute;
		left: -2rem;
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.875rem;
		font-weight: bold;
		border: 2px solid white;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		z-index: 1;
	}

	.timeline-marker.start {
		background: #007bff;
		color: white;
	}

	.timeline-marker.intervention {
		background: #28a745;
		color: white;
	}

	.timeline-marker.note {
		background: #17a2b8;
		color: white;
	}

	.timeline-marker.end {
		background: #6c757d;
		color: white;
	}

	.timeline-content {
		flex: 1;
		background: #f8f9fa;
		padding: 1rem;
		border-radius: 8px;
		border: 1px solid #e9ecef;
	}

	.timeline-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.timeline-header h4 {
		margin: 0;
		color: #2c3e50;
		font-size: 1rem;
		font-weight: 600;
	}

	.timeline-time {
		color: #6c757d;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.timeline-content p {
		margin: 0;
		color: #495057;
		line-height: 1.4;
	}

	.intervention-notes {
		font-style: italic;
		margin-bottom: 0.5rem !important;
	}

	.note-content {
		line-height: 1.5;
		margin: 0;
		color: #495057;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.intervention-category {
		display: inline-block;
		background: #007bff;
		color: white;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	/* Modal styles */
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal-content {
		background: white;
		border-radius: 12px;
		max-width: 90vw;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.event-detail {
			padding: 0.5rem;
		}

		.event-header {
			flex-direction: column;
			gap: 1rem;
			padding: 1.5rem;
		}

		.event-title {
			width: 100%;
		}

		.event-status {
			align-items: flex-start;
		}

		.title-info h1 {
			font-size: 1.5rem;
		}

		.event-icon {
			font-size: 2rem;
		}

		.detail-section,
		.timeline-section {
			padding: 1.5rem;
		}

		.detail-grid {
			grid-template-columns: 1fr;
		}

		.timeline-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.25rem;
		}
	}

	@media (max-width: 480px) {
		.timeline {
			padding-left: 1.5rem;
		}

		.timeline::before {
			left: 0.75rem;
		}

		.timeline-marker {
			left: -1.5rem;
			width: 1.5rem;
			height: 1.5rem;
			font-size: 0.75rem;
		}
	}
</style>