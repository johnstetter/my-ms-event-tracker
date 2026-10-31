<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { bodyLocationsAdmin, BODY_REGIONS } from '$lib/stores/bodyLocations.js';

	// Get the body location ID from the route
	let bodyLocationId: string | undefined;

	// Form state
	let bodyLocation: any = $state(null);
	let loading = $state(true);
	let saving = $state(false);
	let error = $state<string | null>(null);

	// Form fields
	let name = $state('');
	let region = $state('Other');
	let active = $state(true);
	let sortOrder = $state(0);

	// Load the body location data
	async function loadBodyLocation() {
		if (!bodyLocationId) return;

		loading = true;
		error = null;

		try {
			// Add timeout to prevent infinite hanging
			const timeoutPromise = new Promise((_, reject) =>
				setTimeout(() => reject(new Error('Request timed out')), 10000)
			);

			const result: any = await Promise.race([
				bodyLocationsAdmin.getUserBodyLocations(true), // Include inactive
				timeoutPromise
			]);

			if (result.success) {
				bodyLocation = result.bodyLocations?.find((bl: any) => bl.id === bodyLocationId);

				if (bodyLocation) {
					// Populate form fields
					name = bodyLocation.name || '';
					region = bodyLocation.region || 'Other';
					active = bodyLocation.active !== false;
					sortOrder = bodyLocation.sort_order || 0;
				} else {
					error = 'Body location not found';
				}
			} else {
				error = result.error || 'Failed to load body location';
			}
		} catch (e) {
			console.error('Error loading body location:', e);
			error = 'Failed to load body location';
		} finally {
			loading = false;
		}
	}

	// Save the body location
	async function save() {
		if (!bodyLocation) return;

		saving = true;
		error = null;

		try {
			const result = await bodyLocationsAdmin.update(bodyLocation.id, {
				name: name.trim(),
				region,
				active,
				sort_order: sortOrder
			});

			if (result.success) {
				goto('/admin/body-locations');
			} else {
				error = result.error || 'Failed to update body location';
			}
		} catch (e) {
			console.error('Error saving body location:', e);
			error = 'Failed to update body location';
		} finally {
			saving = false;
		}
	}

	// Delete the body location
	async function deleteBodyLocation() {
		if (!bodyLocation || !confirm('Are you sure you want to delete this body location? This action cannot be undone.')) {
			return;
		}

		saving = true;
		error = null;

		try {
			const result = await bodyLocationsAdmin.delete(bodyLocation.id, false); // Soft delete

			if (result.success) {
				goto('/admin/body-locations');
			} else {
				error = result.error || 'Failed to delete body location';
			}
		} catch (e) {
			console.error('Error deleting body location:', e);
			error = 'Failed to delete body location';
		} finally {
			saving = false;
		}
	}

	onMount(() => {
		bodyLocationId = $page.params.id;
		if (bodyLocationId) {
			loadBodyLocation();
		} else {
			error = 'No body location ID provided';
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Edit Body Location - Admin - MS Event Tracker</title>
</svelte:head>

<div class="edit-page">
	<div class="page-header">
		<h1>Edit Body Location</h1>
		<div class="header-actions">
			<a href="/admin/body-locations" class="btn btn-outline">
				← Back to Body Locations
			</a>
		</div>
	</div>

	{#if loading}
		<div class="loading-container">
			<div class="loading-spinner"></div>
			<p>Loading body location...</p>
		</div>
	{:else if error && !bodyLocation}
		<div class="error-container">
			<p class="error-message">Error: {error}</p>
			<button type="button" class="retry-btn" on:click={loadBodyLocation}>
				Try Again
			</button>
		</div>
	{:else if bodyLocation}
		<form class="edit-form" on:submit|preventDefault={save}>
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

			<div class="form-section preview">
				<h2>Preview</h2>
				<div class="location-preview">
					<div class="preview-content">
						<div class="preview-name">{name || 'Body Location Name'}</div>
						<div class="preview-region">{region}
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
				<button type="button" class="btn btn-danger" on:click={deleteBodyLocation} disabled={saving}>
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
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.5rem;
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