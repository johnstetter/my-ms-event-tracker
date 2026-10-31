<script lang="ts">
	import { onMount } from 'svelte';
	import {
		interventions,
		interventionsLoading,
		interventionsError,
		loadInterventions,
		getInterventionsByCategory
	} from '$lib/stores/interventions.js';
	import { getInterventionsForEventType } from '$lib/services/interventionScopeService.js';
	import type { Intervention } from '$lib/supabase.js';

	// Props
	export let disabled = false;
	export let onSelect: (intervention: Intervention) => void = () => {};
	// When set, the picker bypasses the global interventions store and
	// fetches a list filtered to interventions that apply to this event type
	// (universal-by-default semantics). When unset, falls back to the store
	// — used by admin paths that want every active intervention.
	export let eventTypeId: string | null = null;

	// Local state
	let selectedInterventionId: string | null = null;
	let filteredInterventions: Intervention[] = [];
	let filteredLoading = false;
	let filteredError: string | null = null;

	$: filtering = eventTypeId !== null;

	async function loadFiltered(id: string) {
		filteredLoading = true;
		filteredError = null;
		const result = await getInterventionsForEventType(id);
		if (result.success) {
			filteredInterventions = result.data ?? [];
		} else {
			filteredError = result.error ?? 'Failed to load interventions';
			filteredInterventions = [];
		}
		filteredLoading = false;
	}

	// Reload whenever the eventTypeId prop changes. Note: there is no
	// cancellation of an in-flight request — if the prop changes while a
	// previous loadFiltered is pending, the later resolution wins. Acceptable
	// for the current single-event-at-a-time UX (the picker is opened from
	// a modal tied to one event); revisit if the prop becomes more dynamic.
	$: if (eventTypeId) {
		loadFiltered(eventTypeId);
	}

	// Load interventions on mount
	onMount(() => {
		if (filtering) return; // Filtered path is driven by the reactive block above
		// Interventions should already be loading from store initialization,
		// but ensure they're loaded in case of race conditions
		if (!$interventions.length && !$interventionsLoading) {
			loadInterventions();
		}
	});

	// Handle intervention selection
	function selectIntervention(intervention: Intervention) {
		if (disabled) return;

		selectedInterventionId = intervention.id;

		// Add visual feedback delay for better UX
		setTimeout(() => {
			onSelect(intervention);
		}, 150);
	}

	// Handle retry loading
	function retryLoad() {
		if (filtering && eventTypeId) {
			loadFiltered(eventTypeId);
		} else {
			loadInterventions(true); // Force refresh
		}
	}

	// Group an arbitrary list of interventions by category. Mirrors the store
	// helper getInterventionsByCategory() but operates on a passed-in list so
	// the filtered path doesn't need a writable store.
	function groupByCategory(list: Intervention[]): Record<string, Intervention[]> {
		return list.reduce<Record<string, Intervention[]>>((groups, intervention) => {
			const category = intervention.category || 'Other';
			if (!groups[category]) groups[category] = [];
			groups[category].push(intervention);
			return groups;
		}, {});
	}

	// Resolve the rendered set + state based on which mode we're in.
	$: rendered = filtering
		? {
				items: filteredInterventions,
				loading: filteredLoading,
				error: filteredError,
				byCategory: groupByCategory(filteredInterventions)
			}
		: {
				items: $interventions,
				loading: $interventionsLoading,
				error: $interventionsError,
				byCategory: getInterventionsByCategory()
			};
</script>

<div class="intervention-selector">
	<h3>Select an intervention</h3>

	{#if rendered.loading}
		<div class="loading-state">
			<div class="loading-spinner"></div>
			<p>Loading interventions...</p>
		</div>
	{:else if rendered.error}
		<div class="error-state">
			<p class="error-message">Failed to load interventions</p>
			<p class="error-detail">{rendered.error}</p>
			<button type="button" class="retry-btn" on:click={retryLoad}>
				Try Again
			</button>
		</div>
	{:else if rendered.items.length === 0}
		<div class="empty-state">
			<p>No interventions available</p>
			<p class="empty-subtitle">Contact support if this issue persists</p>
		</div>
	{:else}
		<!-- Group interventions by category -->
		{#each Object.entries(rendered.byCategory) as [category, categoryInterventions] (category)}
			<div class="category-section">
				<h4 class="category-header">{category}</h4>
				<div class="intervention-grid">
					{#each categoryInterventions as intervention (intervention.id)}
						<button
							type="button"
							class="intervention-btn"
							class:selected={selectedInterventionId === intervention.id}
							class:disabled
							disabled={disabled}
							on:click={() => selectIntervention(intervention)}
							aria-label="Select {intervention.name}"
						>
							<span class="intervention-text">{intervention.name}</span>
						</button>
					{/each}
				</div>
			</div>
		{/each}
	{/if}
</div>

<style>
	.intervention-selector {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
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

	/* Category sections */
	.category-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.category-header {
		color: #495057;
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		padding-bottom: 0.25rem;
		border-bottom: 1px solid #e9ecef;
	}

	/* Intervention grid */
	.intervention-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 0.75rem;
	}

	.intervention-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: white;
		border: 2px solid #e9ecef;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
		position: relative;
		min-height: 60px;
		text-decoration: none;
	}

	.intervention-btn:hover:not(.disabled) {
		border-color: #007bff;
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(0, 123, 255, 0.15);
	}

	.intervention-btn:active:not(.disabled) {
		transform: translateY(0);
		box-shadow: 0 1px 4px rgba(0, 123, 255, 0.2);
	}

	.intervention-btn.selected {
		background: #e3f2fd;
		border-color: #007bff;
		box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
	}

	.intervention-btn.disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none !important;
		box-shadow: none !important;
	}

	.intervention-text {
		font-weight: 500;
		color: #2c3e50;
		text-align: center;
		line-height: 1.3;
		font-size: 0.875rem;
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.intervention-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.intervention-btn {
			min-height: 50px;
			padding: 0.75rem 0.5rem;
		}

		.intervention-text {
			font-size: 0.8rem;
		}
	}

	/* Ensure touch targets meet accessibility guidelines */
	@media (pointer: coarse) {
		.intervention-btn {
			min-height: 44px;
		}
	}
</style>