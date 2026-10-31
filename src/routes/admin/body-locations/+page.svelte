<script lang="ts">
	import { onMount } from 'svelte';
	import { bodyLocationsAdmin } from '$lib/stores/bodyLocations.js';

	// State
	let bodyLocations: any[] = [];
	let loading = true;
	let error: string | null = null;
	let showDeleteConfirm = false;
	let itemToDelete: any = null;

	// Load user's custom body locations
	async function loadBodyLocations() {
		loading = true;
		error = null;

		try {
			const result = await bodyLocationsAdmin.getUserBodyLocations(true); // Include inactive

			if (result.success) {
				bodyLocations = result.bodyLocations || [];
			} else {
				error = result.error || 'Failed to load body locations';
			}
		} catch (e) {
			console.error('Error loading body locations:', e);
			error = 'Failed to load body locations';
		} finally {
			loading = false;
		}
	}

	// Handle delete confirmation
	function confirmDelete(bodyLocation: any) {
		itemToDelete = bodyLocation;
		showDeleteConfirm = true;
	}

	// Handle delete action
	async function handleDelete(hardDelete = false) {
		if (!itemToDelete) return;

		try {
			const result = await bodyLocationsAdmin.delete(itemToDelete.id, hardDelete);

			if (result.success) {
				// Refresh the list
				await loadBodyLocations();
				// Close confirmation dialog
				showDeleteConfirm = false;
				itemToDelete = null;
			} else {
				error = result.error || 'Failed to delete body location';
			}
		} catch (e) {
			console.error('Error deleting body location:', e);
			error = 'Failed to delete body location';
		}
	}

	// Cancel delete
	function cancelDelete() {
		showDeleteConfirm = false;
		itemToDelete = null;
	}

	// Toggle active status
	async function toggleActive(bodyLocation: any) {
		try {
			const result = await bodyLocationsAdmin.update(bodyLocation.id, {
				active: !bodyLocation.active
			});

			if (result.success) {
				// Update the local list
				bodyLocations = bodyLocations.map(bl =>
					bl.id === bodyLocation.id
						? { ...bl, active: !bl.active }
						: bl
				);
			} else {
				error = result.error || 'Failed to update body location';
			}
		} catch (e) {
			console.error('Error updating body location:', e);
			error = 'Failed to update body location';
		}
	}

	onMount(() => {
		loadBodyLocations();
	});
</script>

<svelte:head>
	<title>Body Locations - Admin - MS Event Tracker</title>
</svelte:head>

<div class="body-locations-page">
	<div class="page-header">
		<div class="header-content">
			<h1>Custom Body Locations</h1>
			<p class="page-subtitle">
				Manage your custom body locations for precise symptom tracking.
			</p>
		</div>
		<div class="header-actions">
			<a href="/admin/body-locations/new" class="btn btn-primary">
				<span class="btn-icon">➕</span>
				Add Body Location
			</a>
		</div>
	</div>

	{#if loading}
		<div class="loading-container">
			<div class="loading-spinner"></div>
			<p>Loading custom body locations...</p>
		</div>
	{:else if error}
		<div class="error-container">
			<p class="error-message">Error: {error}</p>
			<button type="button" class="retry-btn" on:click={loadBodyLocations}>
				Try Again
			</button>
		</div>
	{:else if bodyLocations.length === 0}
		<div class="empty-state">
			<div class="empty-icon">🎯</div>
			<h2>No Custom Body Locations Yet</h2>
			<p>Create your first custom body location for more precise symptom tracking.</p>
			<a href="/admin/body-locations/new" class="btn btn-primary">
				<span class="btn-icon">➕</span>
				Create Your First Body Location
			</a>
		</div>
	{:else}
		<div class="body-locations-grid">
			{#each bodyLocations as bodyLocation (bodyLocation.id)}
				<div class="body-location-card" class:inactive={!bodyLocation.active}>
					<div class="card-header">
						<div class="body-location-info">
							<span class="body-location-icon">🎯</span>
							<div class="body-location-details">
								<h3 class="body-location-name">{bodyLocation.name}</h3>
								{#if bodyLocation.region}
									<span class="body-location-region">{bodyLocation.region}</span>
								{/if}
							</div>
						</div>
						<div class="status-badge" class:active={bodyLocation.active}>
							{bodyLocation.active ? 'Active' : 'Inactive'}
						</div>
					</div>

					<div class="card-actions">
						<a href="/admin/body-locations/{bodyLocation.id}" class="btn btn-outline">
							Edit
						</a>
						<button
							type="button"
							class="btn btn-outline"
							on:click={() => toggleActive(bodyLocation)}
						>
							{bodyLocation.active ? 'Deactivate' : 'Activate'}
						</button>
						<button
							type="button"
							class="btn btn-danger"
							on:click={() => confirmDelete(bodyLocation)}
						>
							Delete
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm && itemToDelete}
	<div
		class="modal-backdrop"
		on:click={cancelDelete}
		on:keydown={(e) => e.key === 'Escape' && cancelDelete()}
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
			<div class="modal-header">
				<h3>Delete Body Location</h3>
			</div>
			<div class="modal-body">
				<p>
					Are you sure you want to delete the body location
					<strong>{itemToDelete.name}</strong>?
				</p>
				<p class="warning-text">
					This action cannot be undone. If you have events using this location,
					consider deactivating it instead.
				</p>
			</div>
			<div class="modal-actions">
				<button type="button" class="btn btn-outline" on:click={cancelDelete}>
					Cancel
				</button>
				<button type="button" class="btn btn-danger" on:click={() => handleDelete(false)}>
					Deactivate Instead
				</button>
				<button type="button" class="btn btn-danger" on:click={() => handleDelete(true)}>
					Permanently Delete
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.body-locations-page {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 2rem;
	}

	.header-content h1 {
		color: #2c3e50;
		margin: 0 0 0.5rem 0;
		font-size: 1.75rem;
		font-weight: 700;
	}

	.page-subtitle {
		color: #6c757d;
		margin: 0;
		line-height: 1.6;
		max-width: 500px;
	}

	.header-actions {
		flex-shrink: 0;
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

	.btn-primary {
		background: #007bff;
		color: white;
	}

	.btn-primary:hover {
		background: #0056b3;
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

	.btn-danger {
		background: #dc3545;
		color: white;
	}

	.btn-danger:hover {
		background: #c82333;
	}

	.btn-icon {
		font-size: 0.875rem;
	}

	.loading-container,
	.error-container,
	.empty-state {
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

	.empty-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
	}

	.empty-state h2 {
		color: #2c3e50;
		margin: 0;
		font-size: 1.5rem;
	}

	.empty-state p {
		color: #6c757d;
		margin: 0;
		max-width: 400px;
	}

	/* Body Locations Grid */
	.body-locations-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: 1.5rem;
	}

	.body-location-card {
		background: white;
		border: 1px solid #e9ecef;
		border-radius: 8px;
		overflow: hidden;
		transition: all 0.2s;
	}

	.body-location-card:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		transform: translateY(-1px);
	}

	.body-location-card.inactive {
		opacity: 0.6;
		background: #f8f9fa;
	}

	.card-header {
		padding: 1.5rem 1.5rem 1rem 1.5rem;
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
	}

	.body-location-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
	}

	.body-location-icon {
		font-size: 2rem;
		line-height: 1;
	}

	.body-location-name {
		color: #2c3e50;
		margin: 0 0 0.25rem 0;
		font-size: 1.1rem;
		font-weight: 600;
	}

	.body-location-region {
		color: #6c757d;
		font-size: 0.8rem;
		background: #e9ecef;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
	}

	.status-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.025em;
		background: #6c757d;
		color: white;
	}

	.status-badge.active {
		background: #28a745;
	}

	.card-actions {
		padding: 1rem 1.5rem;
		border-top: 1px solid #e9ecef;
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	/* Modal Styles */
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
		border-radius: 8px;
		max-width: 500px;
		width: 100%;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
	}

	.modal-header {
		padding: 1.5rem 1.5rem 0.5rem 1.5rem;
	}

	.modal-header h3 {
		color: #2c3e50;
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.modal-body {
		padding: 1rem 1.5rem;
	}

	.modal-body p {
		color: #495057;
		margin: 0 0 0.75rem 0;
		line-height: 1.5;
	}

	.warning-text {
		color: #dc3545;
		font-size: 0.875rem;
	}

	.modal-actions {
		padding: 1rem 1.5rem;
		border-top: 1px solid #e9ecef;
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.page-header {
			flex-direction: column;
			gap: 1rem;
		}

		.body-locations-grid {
			grid-template-columns: 1fr;
		}

		.card-actions {
			flex-direction: column;
		}

		.modal-content {
			margin: 0.5rem;
		}
	}
</style>