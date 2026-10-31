<script lang="ts">
	import { onMount } from 'svelte';
	import { interventionsAdmin } from '$lib/stores/interventions.js';

	// State
	let interventions: any[] = [];
	let loading = true;
	let error: string | null = null;
	let showDeleteConfirm = false;
	let itemToDelete: any = null;

	// Load user's custom interventions
	async function loadInterventions() {
		loading = true;
		error = null;

		try {
			const result = await interventionsAdmin.getUserInterventions(true); // Include inactive

			if (result.success) {
				interventions = result.interventions || [];
			} else {
				error = result.error || 'Failed to load interventions';
			}
		} catch (e) {
			console.error('Error loading interventions:', e);
			error = 'Failed to load interventions';
		} finally {
			loading = false;
		}
	}

	// Handle delete confirmation
	function confirmDelete(intervention: any) {
		itemToDelete = intervention;
		showDeleteConfirm = true;
	}

	// Handle delete action
	async function handleDelete(hardDelete = false) {
		if (!itemToDelete) return;

		try {
			const result = await interventionsAdmin.delete(itemToDelete.id, hardDelete);

			if (result.success) {
				// Refresh the list
				await loadInterventions();
				// Close confirmation dialog
				showDeleteConfirm = false;
				itemToDelete = null;
			} else {
				error = result.error || 'Failed to delete intervention';
			}
		} catch (e) {
			console.error('Error deleting intervention:', e);
			error = 'Failed to delete intervention';
		}
	}

	// Cancel delete
	function cancelDelete() {
		showDeleteConfirm = false;
		itemToDelete = null;
	}

	// Toggle active status
	async function toggleActive(intervention: any) {
		try {
			const result = await interventionsAdmin.update(intervention.id, {
				active: !intervention.active
			});

			if (result.success) {
				// Update the local list
				interventions = interventions.map(iv =>
					iv.id === intervention.id
						? { ...iv, active: !iv.active }
						: iv
				);
			} else {
				error = result.error || 'Failed to update intervention';
			}
		} catch (e) {
			console.error('Error updating intervention:', e);
			error = 'Failed to update intervention';
		}
	}

	onMount(() => {
		loadInterventions();
	});
</script>

<svelte:head>
	<title>Interventions - Admin - MS Event Tracker</title>
</svelte:head>

<div class="interventions-page">
	<div class="page-header">
		<div class="header-content">
			<h1>Custom Interventions</h1>
			<p class="page-subtitle">
				Manage your custom interventions for tracking treatments and therapies.
			</p>
		</div>
		<div class="header-actions">
			<a href="/admin/interventions/new" class="btn btn-primary">
				<span class="btn-icon">➕</span>
				Add Intervention
			</a>
		</div>
	</div>

	{#if loading}
		<div class="loading-container">
			<div class="loading-spinner"></div>
			<p>Loading custom interventions...</p>
		</div>
	{:else if error}
		<div class="error-container">
			<p class="error-message">Error: {error}</p>
			<button type="button" class="retry-btn" on:click={loadInterventions}>
				Try Again
			</button>
		</div>
	{:else if interventions.length === 0}
		<div class="empty-state">
			<div class="empty-icon">💊</div>
			<h2>No Custom Interventions Yet</h2>
			<p>Create your first custom intervention to track your treatments and therapies.</p>
			<a href="/admin/interventions/new" class="btn btn-primary">
				<span class="btn-icon">➕</span>
				Create Your First Intervention
			</a>
		</div>
	{:else}
		<div class="interventions-grid">
			{#each interventions as intervention (intervention.id)}
				<div class="intervention-card" class:inactive={!intervention.active}>
					<div class="card-header">
						<div class="intervention-info">
							<span class="intervention-icon">💊</span>
							<div class="intervention-details">
								<h3 class="intervention-name">{intervention.name}</h3>
								{#if intervention.category}
									<span class="intervention-category">{intervention.category}</span>
								{/if}
							</div>
						</div>
						<div class="status-badge" class:active={intervention.active}>
							{intervention.active ? 'Active' : 'Inactive'}
						</div>
					</div>

					<div class="card-actions">
						<a href="/admin/interventions/{intervention.id}" class="btn btn-outline">
							Edit
						</a>
						<button
							type="button"
							class="btn btn-outline"
							on:click={() => toggleActive(intervention)}
						>
							{intervention.active ? 'Deactivate' : 'Activate'}
						</button>
						<button
							type="button"
							class="btn btn-danger"
							on:click={() => confirmDelete(intervention)}
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
				<h3>Delete Intervention</h3>
			</div>
			<div class="modal-body">
				<p>
					Are you sure you want to delete the intervention
					<strong>{itemToDelete.name}</strong>?
				</p>
				<p class="warning-text">
					This action cannot be undone. If you have events using this intervention,
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
	.interventions-page {
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

	/* Interventions Grid */
	.interventions-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: 1.5rem;
	}

	.intervention-card {
		background: white;
		border: 1px solid #e9ecef;
		border-radius: 8px;
		overflow: hidden;
		transition: all 0.2s;
	}

	.intervention-card:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		transform: translateY(-1px);
	}

	.intervention-card.inactive {
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

	.intervention-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
	}

	.intervention-icon {
		font-size: 2rem;
		line-height: 1;
	}

	.intervention-name {
		color: #2c3e50;
		margin: 0 0 0.25rem 0;
		font-size: 1.1rem;
		font-weight: 600;
	}

	.intervention-category {
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

		.interventions-grid {
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