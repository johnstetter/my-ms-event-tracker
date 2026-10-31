<script lang="ts">
	import { onMount } from 'svelte';
	import { eventTypesAdmin } from '$lib/stores/eventTypes.js';

	// State
	let eventTypes: any[] = [];
	let loading = true;
	let error: string | null = null;
	let showDeleteConfirm = false;
	let eventTypeToDelete: any = null;

	// Load user's custom event types
	async function loadEventTypes() {
		loading = true;
		error = null;

		try {
			const result = await eventTypesAdmin.getUserEventTypes(true); // Include inactive

			if (result.success) {
				eventTypes = result.eventTypes || [];
			} else {
				error = result.error || 'Failed to load event types';
			}
		} catch (e) {
			console.error('Error loading event types:', e);
			error = 'Failed to load event types';
		} finally {
			loading = false;
		}
	}

	// Handle delete confirmation
	function confirmDelete(eventType: any) {
		eventTypeToDelete = eventType;
		showDeleteConfirm = true;
	}

	// Handle delete action
	async function handleDelete(hardDelete = false) {
		if (!eventTypeToDelete) return;

		try {
			const result = await eventTypesAdmin.delete(eventTypeToDelete.id, hardDelete);

			if (result.success) {
				// Refresh the list
				await loadEventTypes();
				// Close confirmation dialog
				showDeleteConfirm = false;
				eventTypeToDelete = null;
			} else {
				error = result.error || 'Failed to delete event type';
			}
		} catch (e) {
			console.error('Error deleting event type:', e);
			error = 'Failed to delete event type';
		}
	}

	// Cancel delete
	function cancelDelete() {
		showDeleteConfirm = false;
		eventTypeToDelete = null;
	}

	// Toggle active status
	async function toggleActive(eventType: any) {
		try {
			const result = await eventTypesAdmin.update(eventType.id, {
				active: !eventType.active
			});

			if (result.success) {
				// Update the local list
				eventTypes = eventTypes.map(et =>
					et.id === eventType.id
						? { ...et, active: !et.active }
						: et
				);
			} else {
				error = result.error || 'Failed to update event type';
			}
		} catch (e) {
			console.error('Error updating event type:', e);
			error = 'Failed to update event type';
		}
	}

	onMount(() => {
		loadEventTypes();
	});
</script>

<svelte:head>
	<title>Event Types - Admin - MS Event Tracker</title>
</svelte:head>

<div class="event-types-page">
	<div class="page-header">
		<div class="header-content">
			<h1>Custom Event Types</h1>
			<p class="page-subtitle">
				Manage your custom event types for tracking specific MS symptoms and activities.
			</p>
		</div>
		<div class="header-actions">
			<a href="/admin/event-types/new" class="btn btn-primary">
				<span class="btn-icon">➕</span>
				Add Event Type
			</a>
		</div>
	</div>

	{#if loading}
		<div class="loading-container">
			<div class="loading-spinner"></div>
			<p>Loading custom event types...</p>
		</div>
	{:else if error}
		<div class="error-container">
			<p class="error-message">Error: {error}</p>
			<button type="button" class="retry-btn" on:click={loadEventTypes}>
				Try Again
			</button>
		</div>
	{:else if eventTypes.length === 0}
		<div class="empty-state">
			<div class="empty-icon">📝</div>
			<h2>No Custom Event Types Yet</h2>
			<p>Create your first custom event type to start personalizing your tracking experience.</p>
			<a href="/admin/event-types/new" class="btn btn-primary">
				<span class="btn-icon">➕</span>
				Create Your First Event Type
			</a>
		</div>
	{:else}
		<div class="event-types-grid">
			{#each eventTypes as eventType (eventType.id)}
				<div class="event-type-card" class:inactive={!eventType.active}>
					<div class="card-header">
						<div class="event-type-info">
							<span class="event-type-icon">{eventType.icon}</span>
							<div class="event-type-details">
								<h3 class="event-type-name">{eventType.name}</h3>
								<span class="event-type-slug">#{eventType.slug}</span>
							</div>
						</div>
						<div class="status-badge" class:active={eventType.active}>
							{eventType.active ? 'Active' : 'Inactive'}
						</div>
					</div>

					<div class="card-body">
						<!-- Properties -->
						<div class="event-properties">
							{#if eventType.has_severity}
								<span class="property-tag">Severity</span>
							{/if}
							{#if eventType.has_location}
								<span class="property-tag">Location</span>
							{/if}
							{#if eventType.has_duration}
								<span class="property-tag">Duration</span>
							{/if}
							{#if eventType.auto_resolve}
								<span class="property-tag">Auto-resolve</span>
							{/if}
						</div>

						<!-- Custom Fields -->
						{#if eventType.custom_fields && eventType.custom_fields.length > 0}
							<div class="custom-fields">
								<h4>Custom Fields:</h4>
								<ul class="fields-list">
									{#each eventType.custom_fields as field}
										<li class="field-item">
											<span class="field-name">{field.label || field.name}</span>
											<span class="field-type">({field.type})</span>
										</li>
									{/each}
								</ul>
							</div>
						{/if}
					</div>

					<div class="card-actions">
						<a href="/admin/event-types/{eventType.id}" class="btn btn-outline">
							Edit
						</a>
						<button
							type="button"
							class="btn btn-outline"
							on:click={() => toggleActive(eventType)}
						>
							{eventType.active ? 'Deactivate' : 'Activate'}
						</button>
						<button
							type="button"
							class="btn btn-danger"
							on:click={() => confirmDelete(eventType)}
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
{#if showDeleteConfirm && eventTypeToDelete}
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
				<h3>Delete Event Type</h3>
			</div>
			<div class="modal-body">
				<p>
					Are you sure you want to delete the event type
					<strong>{eventTypeToDelete.name}</strong>?
				</p>
				<p class="warning-text">
					This action cannot be undone. If you have events using this type,
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
	.event-types-page {
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

	/* Button Styles */
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

	/* Loading, Error, and Empty States */
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

	/* Event Types Grid */
	.event-types-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: 1.5rem;
	}

	.event-type-card {
		background: white;
		border: 1px solid #e9ecef;
		border-radius: 8px;
		overflow: hidden;
		transition: all 0.2s;
	}

	.event-type-card:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		transform: translateY(-1px);
	}

	.event-type-card.inactive {
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

	.event-type-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
	}

	.event-type-icon {
		font-size: 2rem;
		line-height: 1;
	}

	.event-type-name {
		color: #2c3e50;
		margin: 0 0 0.25rem 0;
		font-size: 1.1rem;
		font-weight: 600;
	}

	.event-type-slug {
		color: #6c757d;
		font-size: 0.8rem;
		font-family: monospace;
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

	.card-body {
		padding: 0 1.5rem 1rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.event-properties {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.property-tag {
		background: #e9ecef;
		color: #495057;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.custom-fields h4 {
		color: #495057;
		margin: 0 0 0.5rem 0;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.fields-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.field-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
	}

	.field-name {
		color: #495057;
		font-weight: 500;
	}

	.field-type {
		color: #6c757d;
		font-style: italic;
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

		.event-types-grid {
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