<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { interventionsAdmin } from '$lib/stores/interventions.js';
	import { INTERVENTION_CATEGORIES } from '$lib/services/interventionService.js';
	import {
		getScopeTagsForIntervention,
		setScopeTagsForIntervention
	} from '$lib/services/interventionScopeService.js';
	import { eventTypes, loadEventTypes } from '$lib/stores/eventTypes.js';
	import ScopeTagPicker from '$lib/components/admin/ScopeTagPicker.svelte';

	// Get the intervention ID from the route
	const interventionId = $derived($page.params.id);

	// Form state
	let intervention: any = $state(null);
	let loading = $state(true);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let warning = $state<string | null>(null);

	// Form fields
	let name = $state('');
	let category = $state('Other');
	let active = $state(true);
	let sortOrder = $state(0);

	// Scope tags
	let selectedEventTypeIds = $state<string[]>([]);
	const scopeOptions = $derived(
		$eventTypes.map((et) => ({
			id: et.id,
			label: et.name,
			icon: et.icon ?? undefined
		}))
	);

	// Load the intervention data
	async function loadIntervention() {
		if (!interventionId) return;

		loading = true;
		error = null;
		warning = null;

		try {
			if (!$eventTypes.length) {
				await loadEventTypes();
			}
			const [interventionResult, tagsResult] = await Promise.all([
				interventionsAdmin.getUserInterventions(true),
				getScopeTagsForIntervention(interventionId)
			]);

			if (interventionResult.success) {
				intervention = interventionResult.interventions?.find((i) => i.id === interventionId);

				if (intervention) {
					name = intervention.name || '';
					category = intervention.category || 'Other';
					active = intervention.active !== false;
					sortOrder = intervention.sort_order || 0;
				} else {
					error = 'Intervention not found';
				}
			} else {
				error = interventionResult.error || 'Failed to load intervention';
			}

			if (tagsResult.success && tagsResult.data) {
				selectedEventTypeIds = tagsResult.data;
			}
		} catch (e) {
			console.error('Error loading intervention:', e);
			error = 'Failed to load intervention';
		} finally {
			loading = false;
		}
	}

	// Save the intervention, then apply scope tags
	async function save() {
		if (!intervention) return;

		saving = true;
		error = null;
		warning = null;

		try {
			const result = await interventionsAdmin.update(intervention.id, {
				name: name.trim(),
				category,
				active,
				sort_order: sortOrder
			});

			if (!result.success) {
				error = result.error || 'Failed to update intervention';
				return;
			}

			const tagResult = await setScopeTagsForIntervention(intervention.id, selectedEventTypeIds);
			if (!tagResult.success) {
				warning =
					tagResult.error ||
					'Intervention saved, but scope tags could not be updated. Try again from this page.';
				return;
			}

			goto('/admin/interventions');
		} catch (e) {
			console.error('Error saving intervention:', e);
			error = 'Failed to update intervention';
		} finally {
			saving = false;
		}
	}

	// Delete the intervention
	async function deleteIntervention() {
		if (!intervention || !confirm('Are you sure you want to delete this intervention? This action cannot be undone.')) {
			return;
		}

		saving = true;
		error = null;

		try {
			const result = await interventionsAdmin.delete(intervention.id, false); // Soft delete

			if (result.success) {
				goto('/admin/interventions');
			} else {
				error = result.error || 'Failed to delete intervention';
			}
		} catch (e) {
			console.error('Error deleting intervention:', e);
			error = 'Failed to delete intervention';
		} finally {
			saving = false;
		}
	}

	onMount(() => {
		loadIntervention();
	});
</script>

<svelte:head>
	<title>Edit Intervention - Admin - MS Event Tracker</title>
</svelte:head>

<div class="edit-page">
	<div class="page-header">
		<h1>Edit Intervention</h1>
		<div class="header-actions">
			<a href="/admin/interventions" class="btn btn-outline">
				← Back to Interventions
			</a>
		</div>
	</div>

	{#if loading}
		<div class="loading-container">
			<div class="loading-spinner"></div>
			<p>Loading intervention...</p>
		</div>
	{:else if error && !intervention}
		<div class="error-container">
			<p class="error-message">Error: {error}</p>
			<button type="button" class="retry-btn" on:click={loadIntervention}>
				Try Again
			</button>
		</div>
	{:else if intervention}
		<form class="edit-form" on:submit|preventDefault={save}>
			{#if error}
				<div class="form-error">
					{error}
				</div>
			{/if}
			{#if warning}
				<div class="form-warning">
					{warning}
				</div>
			{/if}

			<div class="form-section">
				<h2>Intervention Details</h2>

				<div class="form-group">
					<label for="name" class="form-label">Name *</label>
					<input
						id="name"
						type="text"
						class="form-input"
						bind:value={name}
						placeholder="e.g., Baclofen, Physical Therapy"
						required
						disabled={saving}
					/>
				</div>

				<div class="form-group">
					<label for="category" class="form-label">Category *</label>
					<select
						id="category"
						class="form-input"
						bind:value={category}
						required
						disabled={saving}
					>
						{#each INTERVENTION_CATEGORIES as categoryOption}
							<option value={categoryOption}>{categoryOption}</option>
						{/each}
					</select>
				</div>
			</div>

			<div class="form-section">
				<h2>Settings</h2>

				<div class="form-row">
					<div class="form-group">
						<div class="checkbox-group">
							<label class="checkbox-label">
								<input
									type="checkbox"
									class="checkbox-input"
									bind:checked={active}
									disabled={saving}
								/>
								<span class="checkbox-text">Active</span>
							</label>
						</div>
					</div>

					<div class="form-group">
						<label for="sortOrder" class="form-label">Sort Order</label>
						<input
							id="sortOrder"
							type="number"
							class="form-input"
							bind:value={sortOrder}
							min="0"
							disabled={saving}
						/>
					</div>
				</div>
			</div>

			<div class="form-section">
				<h2>Event-Type Scope</h2>
				<ScopeTagPicker
					label="Which event types does this intervention apply to?"
					helpText="Pick the event types this intervention should appear in. Leave empty to make it universal — it will appear in every event type's picker."
					options={scopeOptions}
					bind:selectedIds={selectedEventTypeIds}
					emptyState="No event types available."
					disabled={saving}
				/>
			</div>

			<div class="form-section preview">
				<h2>Preview</h2>
				<div class="intervention-preview">
					<div class="preview-content">
						<div class="preview-name">{name || 'Intervention Name'}</div>
						<div class="preview-category">
							<span class="category-badge category-{category.toLowerCase()}">{category}</span>
							{#if !active}
								<span class="status-badge inactive">Inactive</span>
							{/if}
						</div>
					</div>
				</div>
			</div>

			<div class="form-actions">
				<button type="submit" class="btn btn-primary" disabled={saving}>
					{saving ? 'Saving...' : 'Save Changes'}
				</button>
				<button type="button" class="btn btn-danger" on:click={deleteIntervention} disabled={saving}>
					Delete
				</button>
			</div>
		</form>
	{/if}
</div>

<style>
	.edit-page {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		max-width: 600px;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 2rem;
	}

	.page-header h1 {
		color: #2c3e50;
		margin: 0;
		font-size: 1.75rem;
		font-weight: 700;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		text-decoration: none;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		border: 1px solid transparent;
		font-size: 0.875rem;
	}

	.btn-outline {
		background: white;
		color: #495057;
		border-color: #ced4da;
	}

	.btn-outline:hover {
		background: #f8f9fa;
		border-color: #adb5bd;
	}

	.btn-primary {
		background: #007bff;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: #0056b3;
	}

	.btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-danger {
		background: #dc3545;
		color: white;
	}

	.btn-danger:hover:not(:disabled) {
		background: #c82333;
	}

	.btn-danger:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.loading-container,
	.error-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 3rem;
		text-align: center;
		background: #f8f9fa;
		border-radius: 8px;
		border: 1px solid #e9ecef;
	}

	.loading-spinner {
		width: 2.5rem;
		height: 2.5rem;
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

	.retry-btn {
		background: #dc3545;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.retry-btn:hover {
		background: #c82333;
	}

	.edit-form {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.form-warning {
		background: #fff3cd;
		color: #856404;
		padding: 0.75rem 1rem;
		border-radius: 6px;
		border: 1px solid #ffeeba;
		font-weight: 500;
	}

	.form-error {
		background: #f8d7da;
		color: #721c24;
		padding: 0.75rem 1rem;
		border-radius: 6px;
		border: 1px solid #f5c6cb;
		font-weight: 500;
	}

	.form-section {
		background: white;
		border: 1px solid #e9ecef;
		border-radius: 8px;
		padding: 1.5rem;
	}

	.form-section.preview {
		background: #f8f9fa;
		border-color: #007bff;
	}

	.form-section h2 {
		color: #2c3e50;
		margin: 0 0 1.5rem 0;
		font-size: 1.25rem;
		font-weight: 600;
		border-bottom: 1px solid #e9ecef;
		padding-bottom: 0.5rem;
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-label {
		font-weight: 500;
		color: #495057;
		font-size: 0.875rem;
	}

	.form-input {
		padding: 0.75rem;
		border: 1px solid #ced4da;
		border-radius: 6px;
		font-size: 1rem;
		transition: border-color 0.2s;
	}

	.form-input:focus {
		outline: none;
		border-color: #007bff;
		box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
	}

	.form-input:disabled {
		background: #f8f9fa;
		color: #6c757d;
	}

	.checkbox-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		font-weight: 500;
		color: #495057;
	}

	.checkbox-input {
		width: 1.25rem;
		height: 1.25rem;
		cursor: pointer;
	}

	.checkbox-text {
		font-size: 0.875rem;
	}

	.intervention-preview {
		padding: 1rem;
		background: white;
		border: 1px solid #e9ecef;
		border-radius: 6px;
	}

	.preview-content {
		text-align: center;
	}

	.preview-name {
		font-weight: 600;
		color: #2c3e50;
		margin-bottom: 0.75rem;
		font-size: 1rem;
	}

	.preview-category {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
		align-items: center;
	}

	.category-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.category-medication {
		background: #e3f2fd;
		color: #1976d2;
	}

	.category-physical {
		background: #f3e5f5;
		color: #7b1fa2;
	}

	.category-alternative {
		background: #e8f5e8;
		color: #388e3c;
	}

	.category-lifestyle {
		background: #fff3e0;
		color: #f57c00;
	}

	.category-other {
		background: #f5f5f5;
		color: #616161;
	}

	.status-badge {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.7rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.status-badge.inactive {
		background: #f8d7da;
		color: #721c24;
	}

	.form-actions {
		display: flex;
		gap: 1rem;
		padding-top: 1rem;
		border-top: 1px solid #e9ecef;
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.page-header {
			flex-direction: column;
			gap: 1rem;
			align-items: flex-start;
		}

		.form-row {
			grid-template-columns: 1fr;
		}

		.form-actions {
			flex-direction: column;
		}
	}
</style>