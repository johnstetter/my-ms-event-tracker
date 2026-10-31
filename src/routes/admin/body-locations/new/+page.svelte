<script lang="ts">
	import { goto } from '$app/navigation';
	import { bodyLocationsAdmin, BODY_REGIONS } from '$lib/stores/bodyLocations.js';

	// Form state
	let saving = false;
	let error: string | null = null;

	// Form fields
	let name = '';
	let region = 'Other';
	let sortOrder = 999;

	// Save the body location
	async function save() {
		saving = true;
		error = null;

		try {
			const result = await bodyLocationsAdmin.create({
				name: name.trim(),
				region,
				sort_order: sortOrder
			});

			if (result.success) {
				goto('/admin/body-locations');
			} else {
				error = result.error || 'Failed to create body location';
			}
		} catch (e) {
			console.error('Error creating body location:', e);
			error = 'Failed to create body location';
		} finally {
			saving = false;
		}
	}

	// Reset form
	function resetForm() {
		name = '';
		region = 'Other';
		sortOrder = 999;
		error = null;
	}
</script>

<svelte:head>
	<title>New Body Location - Admin - MS Event Tracker</title>
</svelte:head>

<div class="create-page">
	<div class="page-header">
		<h1>Create New Body Location</h1>
		<div class="header-actions">
			<a href="/admin/body-locations" class="btn btn-outline">
				← Back to Body Locations
			</a>
		</div>
	</div>

	<form class="create-form" on:submit|preventDefault={save}>
		{#if error}
			<div class="form-error">
				{error}
			</div>
		{/if}

		<div class="form-section">
			<h2>Body Location Details</h2>

			<div class="form-group">
				<label for="name" class="form-label">Name *</label>
				<input
					id="name"
					type="text"
					class="form-input"
					bind:value={name}
					placeholder="e.g., Left Optic Nerve"
					required
					disabled={saving}
				/>
			</div>

			<div class="form-row">
				<div class="form-group">
					<label for="region" class="form-label">Region *</label>
					<select
						id="region"
						class="form-input"
						bind:value={region}
						required
						disabled={saving}
					>
						{#each BODY_REGIONS as regionOption}
							<option value={regionOption}>{regionOption}</option>
						{/each}
					</select>
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
					<small class="form-help">
						Lower numbers appear first in lists
					</small>
				</div>
			</div>
		</div>

		<div class="form-section preview">
			<h2>Preview</h2>
			<div class="location-preview">
				<div class="preview-content">
					<div class="preview-name">{name || 'Body Location Name'}</div>
					<div class="preview-region">{region}</div>
				</div>
			</div>
		</div>

		<div class="form-actions">
			<button type="submit" class="btn btn-primary" disabled={saving || !name.trim()}>
				{saving ? 'Creating...' : 'Create Body Location'}
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

	.form-help {
		font-size: 0.75rem;
		color: #6c757d;
		margin: 0;
	}

	.location-preview {
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
		margin-bottom: 0.5rem;
		font-size: 1rem;
	}

	.preview-region {
		color: #6c757d;
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.025em;
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