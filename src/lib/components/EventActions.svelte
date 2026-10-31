<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { EventWithDetails } from '$lib/supabase.js';
	import { resolveEventWithNote } from '$lib/services/interventionService.js';

	// Props
	export let event: EventWithDetails;

	// Local state
	let isResolvingEvent = false;
	let resolveError: string | null = null;

	const dispatch = createEventDispatcher();

	// Check if event is ongoing (not resolved)
	$: isOngoing = !event.ended_at;

	// Handle add intervention click
	function handleAddIntervention() {
		dispatch('add-intervention', { event });
	}

	// Handle add note click
	function handleAddNote() {
		dispatch('add-note', { event });
	}

	// Handle mark resolved click - dispatch to parent for modal
	function handleMarkResolved(e?: MouseEvent) {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		if (isResolvingEvent) return;

		// Dispatch event to parent to show resolve modal
		dispatch('show-resolve-modal', { event });
	}

	// Handle resolution with optional note (called from parent)
	async function resolveWithNote(resolutionNote?: string) {
		if (isResolvingEvent) return;

		isResolvingEvent = true;
		resolveError = null;

		try {
			const result = await resolveEventWithNote(event.id, resolutionNote);

			if (result.success && result.data) {
				// Dispatch success event with updated event data and optional note
				dispatch('event-resolved', {
					event: result.data.event,
					note: result.data.note,
					originalEvent: event
				});
			} else {
				resolveError = result.error || 'Failed to resolve event';

				// Clear error after a few seconds
				setTimeout(() => {
					resolveError = null;
				}, 5000);
			}
		} catch (error) {
			console.error('Error resolving event with note:', error);
			resolveError = error instanceof Error ? error.message : 'Failed to resolve event';

			// Clear error after a few seconds
			setTimeout(() => {
				resolveError = null;
			}, 5000);
		} finally {
			isResolvingEvent = false;
		}
	}
</script>

{#if isOngoing}
	<div class="event-actions">
		{#if resolveError}
			<div class="error-message">
				<span class="error-icon">⚠</span>
				<span class="error-text">{resolveError}</span>
			</div>
		{/if}

		<div class="action-buttons">
			<button
				type="button"
				class="action-btn intervention-btn"
				on:click={handleAddIntervention}
				disabled={isResolvingEvent}
			>
				<span class="btn-icon">💊</span>
				<span class="btn-text">Add Intervention</span>
			</button>

			<button
				type="button"
				class="action-btn note-btn"
				on:click={handleAddNote}
				disabled={isResolvingEvent}
			>
				<span class="btn-icon">📝</span>
				<span class="btn-text">Add Note</span>
			</button>

			<button
				type="button"
				class="action-btn resolve-btn"
				on:click={handleMarkResolved}
				disabled={isResolvingEvent}
			>
				{#if isResolvingEvent}
					<span class="btn-icon loading">⏳</span>
					<span class="btn-text">Resolving...</span>
				{:else}
					<span class="btn-icon">✅</span>
					<span class="btn-text">Mark Resolved</span>
				{/if}
			</button>
		</div>
	</div>
{:else}
	<!-- Show resolved status -->
	<div class="resolved-status">
		<span class="resolved-icon">✅</span>
		<span class="resolved-text">Event resolved</span>
		{#if event.ended_at}
			<span class="resolved-time">
				{new Date(event.ended_at).toLocaleDateString()} at {new Date(event.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
			</span>
		{/if}
	</div>
{/if}

<style>
	.event-actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-top: 1rem;
		padding: 1rem;
		background: #f8f9fa;
		border-radius: 8px;
		border: 1px solid #e9ecef;
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background: #f8d7da;
		color: #721c24;
		border: 1px solid #f5c6cb;
		border-radius: 6px;
		font-size: 0.875rem;
	}

	.error-icon {
		font-size: 1rem;
		flex-shrink: 0;
	}

	.error-text {
		flex: 1;
		line-height: 1.3;
	}

	.action-buttons {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.action-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border: none;
		border-radius: 6px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		flex: 1;
		min-width: 120px;
		font-size: 0.875rem;
		justify-content: center;
	}

	.action-btn:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.action-btn:active:not(:disabled) {
		transform: translateY(0);
	}

	.action-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none !important;
		box-shadow: none !important;
	}

	.intervention-btn {
		background: #007bff;
		color: white;
	}

	.intervention-btn:hover:not(:disabled) {
		background: #0056b3;
	}

	.note-btn {
		background: #17a2b8;
		color: white;
	}

	.note-btn:hover:not(:disabled) {
		background: #117a8b;
	}

	.resolve-btn {
		background: #28a745;
		color: white;
	}

	.resolve-btn:hover:not(:disabled) {
		background: #1e7e34;
	}

	.btn-icon {
		font-size: 1rem;
		line-height: 1;
	}

	.btn-icon.loading {
		animation: pulse 1.5s infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	.btn-text {
		font-weight: 500;
	}

	/* Resolved status */
	.resolved-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 1rem;
		padding: 0.75rem 1rem;
		background: #d4edda;
		color: #155724;
		border: 1px solid #c3e6cb;
		border-radius: 6px;
		font-size: 0.875rem;
	}

	.resolved-icon {
		font-size: 1rem;
		flex-shrink: 0;
	}

	.resolved-text {
		font-weight: 500;
	}

	.resolved-time {
		color: #6c757d;
		margin-left: auto;
		font-size: 0.8rem;
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.action-buttons {
			flex-direction: column;
		}

		.action-btn {
			min-width: auto;
			flex: none;
		}

		.resolved-status {
			flex-wrap: wrap;
		}

		.resolved-time {
			margin-left: 0;
			width: 100%;
			margin-top: 0.25rem;
		}
	}

	/* Ensure touch targets meet accessibility guidelines */
	@media (pointer: coarse) {
		.action-btn {
			min-height: 44px;
		}
	}

</style>