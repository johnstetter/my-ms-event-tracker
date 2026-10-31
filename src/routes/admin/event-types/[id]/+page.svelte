<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { eventTypesAdmin } from '$lib/stores/eventTypes.js';
	import { interventionsAdmin } from '$lib/stores/interventions.js';
	import {
		getScopeTagsForEventType,
		setScopeTagsForEventType
	} from '$lib/services/interventionScopeService.js';
	import ScopeTagPicker from '$lib/components/admin/ScopeTagPicker.svelte';

	// Get the event type ID from the route
	const eventTypeId = $derived($page.params.id);

	// Form state
	let eventType: any = $state(null);
	let loading = $state(true);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let warning = $state<string | null>(null);

	// Form fields
	let name = $state('');
	let slug = $state('');
	let icon = $state('');
	let hasSeverity = $state(false);
	let hasLocation = $state(false);
	let hasDuration = $state(false);
	let autoResolve = $state(false);
	let active = $state(true);
	let sortOrder = $state(0);

	// Scope tags
	let userInterventions = $state<{ id: string; name: string; category: string | null }[]>([]);
	let selectedInterventionIds = $state<string[]>([]);
	const scopeOptions = $derived(
		userInterventions.map((i) => ({
			id: i.id,
			label: i.name,
			sublabel: i.category ?? undefined
		}))
	);

	// Load the event type data
	async function loadEventType() {
		if (!eventTypeId) return;

		loading = true;
		error = null;
		warning = null;

		try {
			const [eventTypesResult, interventionsResult, tagsResult] = await Promise.all([
				eventTypesAdmin.getUserEventTypes(true),
				interventionsAdmin.getUserInterventions(true),
				getScopeTagsForEventType(eventTypeId)
			]);

			if (eventTypesResult.success) {
				eventType = eventTypesResult.eventTypes?.find((et) => et.id === eventTypeId);

				if (eventType) {
					// Populate form fields
					name = eventType.name || '';
					slug = eventType.slug || '';
					icon = eventType.icon || '';
					hasSeverity = eventType.has_severity || false;
					hasLocation = eventType.has_location || false;
					hasDuration = eventType.has_duration || false;
					autoResolve = eventType.auto_resolve || false;
					active = eventType.active !== false;
					sortOrder = eventType.sort_order || 0;
				} else {
					error = 'Event type not found';
				}
			} else {
				error = eventTypesResult.error || 'Failed to load event type';
			}

			if (interventionsResult.success && interventionsResult.interventions) {
				userInterventions = interventionsResult.interventions.map((i) => ({
					id: i.id,
					name: i.name,
					category: i.category
				}));
			}

			if (tagsResult.success && tagsResult.data) {
				// Show only the user-owned subset (system intervention tags exist
				// but aren't editable here — the picker won't have those options
				// anyway). Filtering keeps the saved-set in sync with what's
				// editable on save.
				const editableIds = new Set(userInterventions.map((i) => i.id));
				selectedInterventionIds = tagsResult.data.filter((id) => editableIds.has(id));
			}
		} catch (e) {
			console.error('Error loading event type:', e);
			error = 'Failed to load event type';
		} finally {
			loading = false;
		}
	}

	// Generate slug from name
	function generateSlug() {
		if (name) {
			slug = name
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-+|-+$/g, '');
		}
	}

	// Save the event type, then apply scope tags
	async function save() {
		if (!eventType) return;

		saving = true;
		error = null;
		warning = null;

		try {
			const result = await eventTypesAdmin.update(eventType.id, {
				name: name.trim(),
				slug: slug.trim(),
				icon: icon.trim(),
				has_severity: hasSeverity,
				has_location: hasLocation,
				has_duration: hasDuration,
				auto_resolve: autoResolve,
				active,
				sort_order: sortOrder
			});

			if (!result.success) {
				error = result.error || 'Failed to update event type';
				return;
			}

			// Apply scope tags after the update succeeds. Failure here is
			// non-blocking — surface a warning, don't roll back the update.
			const tagResult = await setScopeTagsForEventType(eventType.id, selectedInterventionIds);
			if (!tagResult.success) {
				warning =
					tagResult.error ||
					'Event type saved, but scope tags could not be updated. Try again from this page.';
				return;
			}

			goto('/admin/event-types');
		} catch (e) {
			console.error('Error saving event type:', e);
			error = 'Failed to update event type';
		} finally {
			saving = false;
		}
	}

	// Delete the event type
	async function deleteEventType() {
		if (!eventType || !confirm('Are you sure you want to delete this event type? This action cannot be undone.')) {
			return;
		}

		saving = true;
		error = null;

		try {
			const result = await eventTypesAdmin.delete(eventType.id, false); // Soft delete

			if (result.success) {
				goto('/admin/event-types');
			} else {
				error = result.error || 'Failed to delete event type';
			}
		} catch (e) {
			console.error('Error deleting event type:', e);
			error = 'Failed to delete event type';
		} finally {
			saving = false;
		}
	}

	onMount(() => {
		loadEventType();
	});
</script>

<svelte:head>
	<title>Edit Event Type - Admin - MS Event Tracker</title>
</svelte:head>

<div class="edit-page">
	<div class="page-header">
		<h1>Edit Event Type</h1>
		<div class="header-actions">
			<a href="/admin/event-types" class="btn btn-outline">
				← Back to Event Types
			</a>
		</div>
	</div>

	{#if loading}
		<div class="loading-container">
			<div class="loading-spinner"></div>
			<p>Loading event type...</p>
		</div>
	{:else if error && !eventType}
		<div class="error-container">
			<p class="error-message">Error: {error}</p>
			<button type="button" class="retry-btn" on:click={loadEventType}>
				Try Again
			</button>
		</div>
	{:else if eventType}
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
				<h2>Basic Information</h2>

				<div class="form-row">
					<div class="form-group">
						<label for="name" class="form-label">Name *</label>
						<input
							id="name"
							type="text"
							class="form-input"
							bind:value={name}
							on:input={generateSlug}
							placeholder="e.g., Cognitive Fog"
							required
							disabled={saving}
						/>
					</div>

					<div class="form-group">
						<label for="icon" class="form-label">Icon</label>
						<input
							id="icon"
							type="text"
							class="form-input"
							bind:value={icon}
							placeholder="🧠"
							disabled={saving}
							maxlength="4"
						/>
					</div>
				</div>

				<div class="form-group">
					<label for="slug" class="form-label">Slug *</label>
					<input
						id="slug"
						type="text"
						class="form-input"
						bind:value={slug}
						placeholder="cognitive-fog"
						required
						disabled={saving}
						pattern="[-a-z0-9]+"
					/>
					<small class="form-help">
						URL-friendly version of the name. Only lowercase letters, numbers, and hyphens.
					</small>
				</div>
			</div>

			<div class="form-section">
				<h2>Properties</h2>

				<div class="form-group">
					<div class="checkbox-group">
						<label class="checkbox-label">
							<input
								type="checkbox"
								class="checkbox-input"
								bind:checked={hasSeverity}
								disabled={saving}
							/>
							<span class="checkbox-text">Enable severity tracking (1-10 scale)</span>
						</label>
					</div>
				</div>

				<div class="form-group">
					<div class="checkbox-group">
						<label class="checkbox-label">
							<input
								type="checkbox"
								class="checkbox-input"
								bind:checked={hasLocation}
								disabled={saving}
							/>
							<span class="checkbox-text">Enable body location tracking</span>
						</label>
					</div>
				</div>

				<div class="form-group">
					<div class="checkbox-group">
						<label class="checkbox-label">
							<input
								type="checkbox"
								class="checkbox-input"
								bind:checked={hasDuration}
								disabled={saving}
							/>
							<span class="checkbox-text">Enable duration tracking</span>
						</label>
					</div>
				</div>

				<div class="form-group">
					<div class="checkbox-group">
						<label class="checkbox-label">
							<input
								type="checkbox"
								class="checkbox-input"
								bind:checked={autoResolve}
								disabled={saving}
							/>
							<span class="checkbox-text">Auto-resolve on create (point-in-time event)</span>
						</label>
					</div>
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
				<h2>Intervention Scope</h2>
				<ScopeTagPicker
					label="Which custom interventions apply?"
					helpText="Pick which of your custom interventions appear in the picker for this event type. Leave empty to keep them universal across all event types. System interventions (Heat Pack, Baclofen, etc.) are scoped at install and aren't editable here."
					options={scopeOptions}
					bind:selectedIds={selectedInterventionIds}
					emptyState="You don't have any custom interventions yet. Create one in Admin → Interventions, then return here to scope it."
					disabled={saving}
				/>
			</div>

			<div class="form-actions">
				<button type="submit" class="btn btn-primary" disabled={saving}>
					{saving ? 'Saving...' : 'Save Changes'}
				</button>
				<button type="button" class="btn btn-danger" on:click={deleteEventType} disabled={saving}>
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
		max-width: 800px;
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

	.form-error {
		background: #f8d7da;
		color: #721c24;
		padding: 0.75rem 1rem;
		border-radius: 6px;
		border: 1px solid #f5c6cb;
		font-weight: 500;
	}

	.form-warning {
		background: #fff3cd;
		color: #856404;
		padding: 0.75rem 1rem;
		border-radius: 6px;
		border: 1px solid #ffeeba;
		font-weight: 500;
	}

	.form-section {
		background: white;
		border: 1px solid #e9ecef;
		border-radius: 8px;
		padding: 1.5rem;
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

	.form-help {
		font-size: 0.75rem;
		color: #6c757d;
		margin: 0;
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