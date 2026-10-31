<script lang="ts">
	import { onMount } from 'svelte';
	import { eventTypes, eventTypesLoading, eventTypesError, loadEventTypes } from '$lib/stores/eventTypes.js';
	import { quickLogActions } from '$lib/stores/quickLog.js';
	import type { EventType } from '$lib/supabase.js';

	// Props
	export let disabled = false;

	// Local state
	let selectedTypeId: string | null = null;

	// Load event types on mount
	onMount(() => {
		// Event types should already be loading from store initialization,
		// but ensure they're loaded in case of race conditions
		if (!$eventTypes.length && !$eventTypesLoading) {
			loadEventTypes();
		}
	});

	// Handle event type selection
	function selectEventType(eventType: EventType) {
		if (disabled) return;

		selectedTypeId = eventType.id;

		// Add visual feedback delay for better UX
		setTimeout(() => {
			quickLogActions.selectEventType(eventType);
		}, 150);
	}

	// Handle retry loading
	function retryLoad() {
		loadEventTypes(true); // Force refresh
	}
</script>

<div class="event-type-selector">
	<h3>What event are you experiencing?</h3>

	{#if $eventTypesLoading}
		<div class="loading-state">
			<div class="loading-spinner"></div>
			<p>Loading event types...</p>
		</div>
	{:else if $eventTypesError}
		<div class="error-state">
			<p class="error-message">Failed to load event types</p>
			<p class="error-detail">{$eventTypesError}</p>
			<button type="button" class="retry-btn" on:click={retryLoad}>
				Try Again
			</button>
		</div>
	{:else if $eventTypes.length === 0}
		<div class="empty-state">
			<p>No event types available</p>
			<p class="empty-subtitle">Contact support if this issue persists</p>
		</div>
	{:else}
		<div class="type-grid">
			{#each $eventTypes as eventType (eventType.id)}
				<button
					type="button"
					class="type-btn"
					class:selected={selectedTypeId === eventType.id}
					class:disabled
					disabled={disabled}
					on:click={() => selectEventType(eventType)}
					aria-label="Log {eventType.name}"
				>
					<span class="type-icon" aria-hidden="true">{eventType.icon}</span>
					<span class="type-text">{eventType.name}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.event-type-selector {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	h3 {
		color: #2c3e50;
		margin: 0;
		font-size: 1.25rem;
		text-align: center;
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

	.error-detail,
	.empty-subtitle {
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
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.retry-btn:hover {
		background: #c82333;
	}

	/* Event type grid */
	.type-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
	}

	.type-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1.5rem 1rem;
		background: white;
		border: 2px solid #e9ecef;
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.2s;
		position: relative;
		min-height: 120px;
		justify-content: center;
		text-decoration: none;
	}

	.type-btn:hover:not(.disabled) {
		border-color: #007bff;
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 123, 255, 0.15);
	}

	.type-btn:active:not(.disabled) {
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(0, 123, 255, 0.2);
	}

	.type-btn.selected {
		background: #e3f2fd;
		border-color: #007bff;
		box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
	}

	.type-btn.disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none !important;
		box-shadow: none !important;
	}

	.type-icon {
		font-size: 2rem;
		line-height: 1;
	}

	.type-text {
		font-weight: 600;
		color: #2c3e50;
		text-align: center;
		line-height: 1.2;
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.type-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.type-btn {
			min-height: 100px;
			padding: 1rem 0.5rem;
		}

		.type-icon {
			font-size: 1.5rem;
		}

		.type-text {
			font-size: 0.875rem;
		}
	}

	/* Ensure touch targets meet accessibility guidelines */
	@media (pointer: coarse) {
		.type-btn {
			min-height: 44px;
		}
	}
</style>