<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { eventTypesAdmin } from '$lib/stores/eventTypes.js';
	import { setScopeTagsForEventType } from '$lib/services/interventionScopeService.js';
	import { interventionsAdmin } from '$lib/stores/interventions.js';
	import ScopeTagPicker from '$lib/components/admin/ScopeTagPicker.svelte';

	// Form state
	let saving = false;
	let error: string | null = null;
	let warning: string | null = null;

	// Form fields
	let name = '';
	let slug = '';
	let icon = '';
	let hasSeverity = false;
	let hasLocation = false;
	let hasDuration = false;
	let autoResolve = false;
	let sortOrder = 999;

	// Scope tags — multi-select of user-owned interventions
	let userInterventions: { id: string; name: string; category: string | null }[] = [];
	let selectedInterventionIds: string[] = [];

	$: scopeOptions = userInterventions.map((i) => ({
		id: i.id,
		label: i.name,
		sublabel: i.category ?? undefined
	}));

	onMount(async () => {
		const result = await interventionsAdmin.getUserInterventions(true);
		if (result.success && result.interventions) {
			userInterventions = result.interventions.map((i) => ({
				id: i.id,
				name: i.name,
				category: i.category
			}));
		}
	});

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
		saving = true;
		error = null;
		warning = null;

		try {
			const result = await eventTypesAdmin.create({
				name: name.trim(),
				slug: slug.trim(),
				icon: icon.trim() || '📝',
				has_severity: hasSeverity,
				has_location: hasLocation,
				has_duration: hasDuration,
				auto_resolve: autoResolve,
				sort_order: sortOrder
			});

			if (!result.success || !result.eventType) {
				error = result.error || 'Failed to create event type';
				return;
			}

			// Apply scope tags after the create succeeds. Failure here is
			// non-blocking: the event type exists, just untagged (universal).
			if (selectedInterventionIds.length > 0) {
				const tagResult = await setScopeTagsForEventType(
					result.eventType.id,
					selectedInterventionIds
				);
				if (!tagResult.success) {
					warning =
						(tagResult.error ?? 'Scope tags could not be applied.') +
						` The event type was created — open it from Admin → Event Types to retry the tag save.`;
					return;
				}
			}

			goto('/admin/event-types');
		} catch (e) {
			console.error('Error creating event type:', e);
			error = 'Failed to create event type';
		} finally {
			saving = false;
		}
	}

	// Reset form
	function resetForm() {
		name = '';
		slug = '';
		icon = '';
		hasSeverity = false;
		hasLocation = false;
		hasDuration = false;
		autoResolve = false;
		sortOrder = 999;
		selectedInterventionIds = [];
		error = null;
		warning = null;
	}
</script>

<svelte:head>
	<title>New Event Type - Admin - MS Event Tracker</title>
</svelte:head>

<div class="create-page">
	<div class="page-header">
		<h1>Create New Event Type</h1>
		<div class="header-actions">
			<a href="/admin/event-types" class="btn btn-outline">
				← Back to Event Types
			</a>
		</div>
	</div>

	<form class="create-form" on:submit|preventDefault={save}>
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
			<h2>Tracking Properties</h2>
			<p class="section-description">
				Configure what information to track for this event type
			</p>

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
					<p class="checkbox-help">
						Allows users to rate the severity of this event on a scale of 1-10
					</p>
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
					<p class="checkbox-help">
						Allows users to specify which body locations are affected
					</p>
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
					<p class="checkbox-help">
						Allows users to track start and end times for this event
					</p>
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
						<span class="checkbox-text">Auto-resolve on create</span>
					</label>
					<p class="checkbox-help">
						For point-in-time events that don't need follow-up tracking. The event is marked resolved immediately and won't appear in the ongoing-events list.
					</p>
				</div>
			</div>
		</div>

		<div class="form-section">
			<h2>Settings</h2>

			<div class="form-group">
				<label for="sortOrder" class="form-label">Sort Order</label>
				<input
					id="sortOrder"
					type="number"
					class="form-input"
					bind:value={sortOrder}
					min="0"
					disabled={saving}
					style="max-width: 150px;"
				/>
				<small class="form-help">
					Lower numbers appear first in lists. Use 999 for default ordering.
				</small>
			</div>
		</div>

		<div class="form-section">
			<h2>Intervention Scope</h2>
			<p class="section-description">
				Pick which of your custom interventions should appear in the picker for this event type.
				Leave empty to mark interventions as universal (they'll appear for every event type).
				System interventions (Heat Pack, Baclofen, etc.) are scoped at install and aren't editable here.
			</p>
			<ScopeTagPicker
				label="Which custom interventions apply?"
				options={scopeOptions}
				bind:selectedIds={selectedInterventionIds}
				emptyState="You don't have any custom interventions yet. Create one in Admin → Interventions, then come back to scope it."
				disabled={saving}
			/>
		</div>

		<div class="form-section preview">
			<h2>Preview</h2>
			<p class="section-description">How this event type will appear:</p>

			<div class="event-preview">
				<div class="preview-icon">{icon || '📝'}</div>
				<div class="preview-content">
					<div class="preview-name">{name || 'Event Type Name'}</div>
					<div class="preview-properties">
						{#if hasSeverity}
							<span class="preview-tag">Severity</span>
						{/if}
						{#if hasLocation}
							<span class="preview-tag">Location</span>
						{/if}
						{#if hasDuration}
							<span class="preview-tag">Duration</span>
						{/if}
						{#if autoResolve}
							<span class="preview-tag">Auto-resolve</span>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<div class="form-actions">
			<button type="submit" class="btn btn-primary" disabled={saving || !name.trim() || !slug.trim()}>
				{saving ? 'Creating...' : 'Create Event Type'}
			</button>
			<button type="button" class="btn btn-outline" on:click={resetForm} disabled={saving}>
				Reset Form
			</button>
		</div>
	</form>
</div>

<style>
	.create-page {
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

	.btn-outline:hover:not(:disabled) {
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

	.create-form {
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

	.form-section.preview {
		background: #f8f9fa;
		border-color: #007bff;
	}

	.form-section h2 {
		color: #2c3e50;
		margin: 0 0 1rem 0;
		font-size: 1.25rem;
		font-weight: 600;
		border-bottom: 1px solid #e9ecef;
		padding-bottom: 0.5rem;
	}

	.section-description {
		color: #6c757d;
		font-size: 0.875rem;
		margin: 0 0 1.5rem 0;
		line-height: 1.5;
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
		flex-direction: column;
		gap: 0.25rem;
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

	.checkbox-help {
		font-size: 0.75rem;
		color: #6c757d;
		margin: 0;
		line-height: 1.4;
	}

	.event-preview {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: white;
		border: 1px solid #e9ecef;
		border-radius: 6px;
	}

	.preview-icon {
		font-size: 2rem;
		line-height: 1;
	}

	.preview-content {
		flex: 1;
	}

	.preview-name {
		font-weight: 600;
		color: #2c3e50;
		margin-bottom: 0.5rem;
		font-size: 1rem;
	}

	.preview-properties {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.preview-tag {
		background: #e9ecef;
		color: #495057;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
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

		.event-preview {
			flex-direction: column;
			text-align: center;
		}
	}
</style>