<script lang="ts">
	import type { EventWithDetails } from '$lib/supabase.js';

	export let events: EventWithDetails[] = [];

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

	// Navigate to event detail
	function navigateToEvent(eventId: string) {
		window.location.href = `/events/${eventId}`;
	}
</script>

<div class="events-list">
	{#each events as event (event.id)}
		<div
			class="event-item"
			on:click={() => navigateToEvent(event.id)}
			role="button"
			tabindex="0"
			on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && navigateToEvent(event.id)}
		>
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

				<!-- Status indicator for resolved events -->
				{#if event.ended_at}
					<div class="event-status resolved">
						<span class="status-label">Resolved</span>
						<span class="status-time">{formatDate(event.ended_at)}</span>
					</div>
				{/if}
			</div>

			<!-- Click indicator -->
			<div class="click-indicator">
				<span class="click-text">View Details →</span>
			</div>
		</div>
	{/each}
</div>

<style>
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

	.event-item:focus {
		outline: 2px solid #007bff;
		outline-offset: 2px;
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

	/* Event status */
	.event-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		margin-top: 0.75rem;
		border-radius: 6px;
		font-size: 0.75rem;
	}

	.event-status.resolved {
		background: #d4edda;
		border: 1px solid #c3e6cb;
		color: #155724;
	}

	.status-label {
		font-weight: 600;
	}

	.status-time {
		color: #6c757d;
		font-size: 0.7rem;
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
	}
</style>