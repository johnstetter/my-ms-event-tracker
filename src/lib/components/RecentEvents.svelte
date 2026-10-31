<script lang="ts">
	import { onMount } from 'svelte';
	import { user } from '$lib/stores/auth.js';
	import { EventService } from '$lib/services/eventService.js';
	import {
		InterventionService,
		resolveEventWithNote,
		type EventInterventionWithDetails
	} from '$lib/services/interventionService.js';
	import type { EventWithDetails } from '$lib/supabase.js';
	import EventActions from './EventActions.svelte';
	import InterventionLog from './intervention/InterventionLog.svelte';
	import NoteLog from './notes/NoteLog.svelte';
	import ResolveEventModal from './modals/ResolveEventModal.svelte';

	let events: EventWithDetails[] = [];
	let loading = true;
	let error: string | null = null;

	// Intervention state
	let eventInterventions: Record<string, EventInterventionWithDetails[]> = {};
	let loadingInterventions: Record<string, boolean> = {};
	let showInterventionLog = false;
	let selectedEventForIntervention: EventWithDetails | null = null;

	// Note state
	let showNoteLog = false;
	let selectedEventForNote: EventWithDetails | null = null;

	// Resolve modal state
	let showResolveModal = false;
	let selectedEventForResolve: EventWithDetails | null = null;

	// Load recent events
	async function loadRecentEvents() {
		loading = true;
		error = null;

		try {
			const result = await EventService.getRecentEvents(3);

			if (result.success) {
				events = result.events || [];
				// Load interventions for each event
				loadInterventionsForEvents(events);
			} else {
				error = result.error || 'Failed to load recent events';
			}
		} catch (e) {
			console.error('Error loading recent events:', e);
			error = 'Failed to load recent events';
		} finally {
			loading = false;
		}
	}

	// Load interventions for all events
	async function loadInterventionsForEvents(eventsList: EventWithDetails[]) {
		for (const event of eventsList) {
			await loadEventInterventions(event.id);
		}
	}

	// Load interventions for a specific event
	async function loadEventInterventions(eventId: string) {
		if (loadingInterventions[eventId]) return;

		loadingInterventions[eventId] = true;

		try {
			const result = await InterventionService.getEventInterventions(eventId);
			if (result.success) {
				eventInterventions[eventId] = result.data || [];
			} else {
				console.warn(`Failed to load interventions for event ${eventId}:`, result.error);
				eventInterventions[eventId] = [];
			}
		} catch (e) {
			console.warn(`Error loading interventions for event ${eventId}:`, e);
			eventInterventions[eventId] = [];
		} finally {
			loadingInterventions[eventId] = false;
			// Trigger reactivity
			eventInterventions = { ...eventInterventions };
			loadingInterventions = { ...loadingInterventions };
		}
	}

	// Reload when user changes
	$: if ($user) {
		loadRecentEvents();
	}

	// Format date for display
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

		if (diffInHours < 1) {
			const diffInMinutes = Math.round(diffInHours * 60);
			return `${diffInMinutes}m ago`;
		} else if (diffInHours < 24) {
			const hours = Math.round(diffInHours);
			return `${hours}h ago`;
		} else if (diffInHours < 24 * 7) {
			const days = Math.round(diffInHours / 24);
			return `${days}d ago`;
		} else {
			return date.toLocaleDateString();
		}
	}

	// Format location names
	function formatLocations(event: EventWithDetails): string {
		if (!event.event_locations || event.event_locations.length === 0) {
			return '';
		}

		const locationNames = event.event_locations
			.map((el) => el.body_location.name)
			.slice(0, 2); // Show max 2 locations

		if (event.event_locations.length > 2) {
			return locationNames.join(', ') + ` +${event.event_locations.length - 2}`;
		}

		return locationNames.join(', ');
	}

	// Handle add intervention action
	function handleAddIntervention(event: CustomEvent) {
		selectedEventForIntervention = event.detail.event;
		showInterventionLog = true;
	}

	// Handle event resolved action
	function handleEventResolved(event: CustomEvent) {
		const { originalEvent } = event.detail;

		// Update the local events array to reflect the resolved status
		events = events.map(e =>
			e.id === originalEvent.id
				? { ...e, ended_at: event.detail.event.ended_at }
				: e
		);
	}

	// Handle successful intervention addition
	function handleInterventionAdded() {
		const eventId = selectedEventForIntervention?.id;
		showInterventionLog = false;
		selectedEventForIntervention = null;

		// Reload interventions for the updated event
		if (eventId) {
			loadEventInterventions(eventId);
		}
	}

	// Handle intervention log cancellation
	function handleInterventionCancel() {
		showInterventionLog = false;
		selectedEventForIntervention = null;
	}

	// Handle add note action
	function handleAddNote(event: CustomEvent) {
		selectedEventForNote = event.detail.event;
		showNoteLog = true;
	}

	// Handle successful note addition
	function handleNoteAdded() {
		showNoteLog = false;
		selectedEventForNote = null;
		// Note: We don't need to reload anything since notes don't display in the recent events overview
	}

	// Handle note log cancellation
	function handleNoteCancel() {
		showNoteLog = false;
		selectedEventForNote = null;
	}

	// Handle show resolve modal
	function handleShowResolveModal(event: CustomEvent) {
		selectedEventForResolve = event.detail.event;
		showResolveModal = true;
	}

	// Handle resolve modal cancel
	function handleResolveCancel() {
		showResolveModal = false;
		selectedEventForResolve = null;
	}

	// Handle resolve modal resolve
	async function handleResolve(modalEvent: CustomEvent) {
		showResolveModal = false;

		if (!selectedEventForResolve) return;
		const resolveId = selectedEventForResolve.id;

		try {
			const result = await resolveEventWithNote(resolveId, modalEvent.detail.resolutionNote);

			if (result.success && result.data) {
				// Update the events array to show resolved status
				events = events.map(e =>
					e.id === resolveId
						? { ...e, ended_at: result.data!.event.ended_at }
						: e
				);
			} else {
				console.error('Failed to resolve event:', result.error);
			}
		} catch (error) {
			console.error('Error resolving event with note:', error);
		} finally {
			selectedEventForResolve = null;
		}
	}

	// Retry loading
	function retryLoad() {
		loadRecentEvents();
	}

	// Check if event is ongoing (not resolved)
	function isEventOngoing(event: EventWithDetails): boolean {
		return !event.ended_at;
	}

	// Get interventions for an event (local accessor; not the service function)
	function getInterventionsForEvent(eventId: string): EventInterventionWithDetails[] {
		return eventInterventions[eventId] || [];
	}

	// Format intervention time
	function formatInterventionTime(dateString: string | null): string {
		if (!dateString) return '';
		const date = new Date(dateString);
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	onMount(() => {
		if ($user) {
			loadRecentEvents();
		}
	});
</script>

<div class="recent-events">
	<h3>Recent Events</h3>

	{#if loading}
		<div class="loading-state">
			<div class="loading-spinner"></div>
			<p>Loading recent events...</p>
		</div>
	{:else if error}
		<div class="error-state">
			<p class="error-message">Failed to load recent events</p>
			<p class="error-detail">{error}</p>
			<button type="button" class="retry-btn" on:click={retryLoad}>
				Try Again
			</button>
		</div>
	{:else if events.length === 0}
		<div class="empty-state">
			<p>No recent events logged.</p>
			<p class="empty-subtitle">Start logging your MS events to see your history and patterns here.</p>
		</div>
	{:else}
		<div class="events-list">
			{#each events as event (event.id)}
				<div class="event-item" on:click={() => window.location.href = `/events/${event.id}`}>
					<div class="event-item-content">
					<div class="event-header">
						<span class="event-icon">{event.event_type?.icon}</span>
						<div class="event-info">
							<span class="event-name">{event.event_type?.name}</span>
							<span class="event-time">{formatDate(event.started_at)}</span>
						</div>
						{#if event.severity}
							<span class="severity-badge" class:high={event.severity >= 7} class:medium={event.severity >= 4 && event.severity < 7}>
								{event.severity}/10
							</span>
						{/if}
					</div>

					{#if formatLocations(event)}
						<div class="event-locations">
							<span class="location-label">Location:</span>
							<span class="location-text">{formatLocations(event)}</span>
						</div>
					{/if}

					{#if event.notes}
						<div class="event-notes">
							{event.notes}
						</div>
					{/if}

					{#if event.attributes && Object.keys(event.attributes).length > 0}
						<div class="event-attributes">
							{#each Object.entries(event.attributes) as [key, value]}
								<span class="attribute-item">
									<span class="attribute-label">{key.charAt(0).toUpperCase() + key.slice(1)}:</span>
									<span class="attribute-value">{value}</span>
								</span>
							{/each}
						</div>
					{/if}

					<!-- Intervention History -->
					{#if getInterventionsForEvent(event.id).length > 0}
						<div class="intervention-history">
							<h5>Interventions Applied:</h5>
							<div class="interventions-list">
								{#each getInterventionsForEvent(event.id) as intervention (intervention.id)}
									<div class="intervention-item">
										<div class="intervention-header">
											<span class="intervention-name">{intervention.intervention.name}</span>
											<span class="intervention-time">{formatInterventionTime(intervention.applied_at)}</span>
										</div>
										{#if intervention.notes}
											<div class="intervention-notes">
												{intervention.notes}
											</div>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Event Actions for ongoing events -->
					<div on:click|stopPropagation>
						<EventActions
							{event}
							on:add-intervention={handleAddIntervention}
							on:add-note={handleAddNote}
							on:show-resolve-modal={handleShowResolveModal}
							on:event-resolved={handleEventResolved}
						/>
					</div>
					</div>

					<!-- Click indicator -->
					<div class="click-indicator">
						<span class="click-text">View Details →</span>
					</div>
				</div>
			{/each}
		</div>

		<!-- View all events link -->
		<div class="view-all-link-container">
			<a href="/history" class="view-all-link">
				View All Events →
			</a>
		</div>
	{/if}
</div>

<!-- Intervention Log Modal -->
{#if showInterventionLog && selectedEventForIntervention}
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
				eventId={selectedEventForIntervention.id}
				eventTypeId={selectedEventForIntervention.event_type_id}
				onSuccess={handleInterventionAdded}
				onCancel={handleInterventionCancel}
			/>
		</div>
	</div>
{/if}

<!-- Note Log Modal -->
{#if showNoteLog && selectedEventForNote}
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
				eventId={selectedEventForNote.id}
				onSuccess={handleNoteAdded}
				onCancel={handleNoteCancel}
			/>
		</div>
	</div>
{/if}

<!-- Resolve Event Modal -->
{#if showResolveModal && selectedEventForResolve}
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
				event={selectedEventForResolve}
				on:resolve={handleResolve}
				on:cancel={handleResolveCancel}
			/>
		</div>
	</div>
{/if}

<style>
	.recent-events {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	h3 {
		color: #2c3e50;
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
	}

	/* Loading, error, and empty states */
	.loading-state,
	.error-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 2rem;
		text-align: center;
		background: #f8f9fa;
		border-radius: 12px;
		border: 1px solid #e9ecef;
	}

	.loading-spinner {
		width: 2rem;
		height: 2rem;
		border: 3px solid #e9ecef;
		border-top: 3px solid #007bff;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.error-message {
		color: #dc3545;
		font-weight: 600;
		margin: 0;
	}

	.error-detail {
		color: #6c757d;
		font-size: 0.875rem;
		margin: 0;
	}

	.retry-btn {
		background: #dc3545;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.retry-btn:hover {
		background: #c82333;
	}

	.empty-state p {
		margin: 0;
		color: #666;
	}

	.empty-subtitle {
		font-size: 0.875rem;
		margin-top: 0.5rem !important;
	}

	/* Events list */
	.events-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.event-item {
		background: white;
		border: 1px solid #e9ecef;
		border-radius: 8px;
		position: relative;
		transition: all 0.2s;
		cursor: pointer;
	}

	.event-item:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		border-color: #007bff;
		transform: translateY(-1px);
	}

	.event-item:hover .click-indicator {
		opacity: 1;
	}

	.event-item-content {
		padding: 1rem;
	}

	.click-indicator {
		position: absolute;
		top: 1rem;
		right: 1rem;
		opacity: 0;
		transition: opacity 0.2s;
		background: #007bff;
		color: white;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		pointer-events: none;
	}

	.click-text {
		white-space: nowrap;
	}

	.event-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.event-icon {
		font-size: 1.5rem;
		line-height: 1;
	}

	.event-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.event-name {
		font-weight: 600;
		color: #2c3e50;
		font-size: 0.875rem;
	}

	.event-time {
		font-size: 0.75rem;
		color: #6c757d;
	}

	.severity-badge {
		background: #28a745;
		color: white;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.severity-badge.medium {
		background: #ffc107;
		color: #856404;
	}

	.severity-badge.high {
		background: #dc3545;
	}

	.event-locations {
		font-size: 0.75rem;
		color: #495057;
		margin-bottom: 0.5rem;
		padding-left: 2.25rem;
	}

	.location-label {
		font-weight: 500;
		color: #6c757d;
	}

	.location-text {
		margin-left: 0.25rem;
	}

	.event-notes {
		font-size: 0.75rem;
		color: #495057;
		font-style: italic;
		margin-bottom: 0;
		padding-left: 2.25rem;
		line-height: 1.4;
	}

	.event-attributes {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding-left: 2.25rem;
		margin-top: 0.5rem;
		font-size: 0.75rem;
	}

	.attribute-item {
		background: #f8f9fa;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		border: 1px solid #e9ecef;
	}

	.attribute-label {
		font-weight: 600;
		color: #6c757d;
		margin-right: 0.25rem;
	}

	.attribute-value {
		color: #495057;
	}

	/* Intervention History */
	.intervention-history {
		margin-top: 0.75rem;
		padding: 0.75rem;
		background: #f8f9fa;
		border-radius: 6px;
		border: 1px solid #e9ecef;
	}

	.intervention-history h5 {
		margin: 0 0 0.5rem 0;
		font-size: 0.8rem;
		font-weight: 600;
		color: #495057;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.interventions-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.intervention-item {
		background: white;
		border: 1px solid #e9ecef;
		border-radius: 4px;
		padding: 0.5rem;
	}

	.intervention-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
	}

	.intervention-name {
		font-weight: 500;
		color: #2c3e50;
		font-size: 0.8rem;
	}

	.intervention-time {
		color: #6c757d;
		font-size: 0.7rem;
		flex-shrink: 0;
	}

	.intervention-notes {
		margin-top: 0.25rem;
		color: #495057;
		font-size: 0.75rem;
		font-style: italic;
		line-height: 1.3;
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

	/* View all events link */
	.view-all-link-container {
		text-align: center;
		margin-top: 1rem;
	}

	.view-all-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: #007bff;
		text-decoration: none;
		font-weight: 500;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		transition: all 0.2s;
		background: white;
		border: 1px solid #e9ecef;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.view-all-link:hover {
		background: #f8f9fa;
		border-color: #007bff;
		transform: translateY(-1px);
		box-shadow: 0 2px 6px rgba(0, 123, 255, 0.1);
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.event-header {
			gap: 0.5rem;
		}

		.event-icon {
			font-size: 1.25rem;
		}

		.event-item-content {
			padding: 0.75rem;
		}

		.click-indicator {
			top: 0.5rem;
			right: 0.5rem;
			font-size: 0.7rem;
		}

		.event-locations,
		.event-notes,
		.event-attributes {
			padding-left: 1.75rem;
		}

		.intervention-history {
			margin-left: 0;
		}

		.intervention-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.25rem;
		}

		.modal-backdrop {
			padding: 0.5rem;
		}

		.modal-content {
			max-width: 95vw;
		}
	}
</style>