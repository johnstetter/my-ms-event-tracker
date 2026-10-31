<script lang="ts">
	import { onMount } from 'svelte';
	import { eventTypesAdmin } from '$lib/stores/eventTypes.js';
	import { bodyLocationsAdmin } from '$lib/stores/bodyLocations.js';
	import { interventionsAdmin } from '$lib/stores/interventions.js';

	// Dashboard statistics
	let stats = {
		customEventTypes: 0,
		customBodyLocations: 0,
		customInterventions: 0,
		loading: true,
		error: null as string | null
	};

	// Recent activity placeholder
	let recentActivity: any[] = [];

	// Load admin dashboard statistics
	async function loadDashboardStats() {
		stats.loading = true;
		stats.error = null;

		try {
			console.log('Loading admin dashboard stats...');

			// Load stats with proper error handling for each service
			let eventTypesCount = 0;
			let bodyLocationsCount = 0;
			let interventionsCount = 0;

			// Try to load event types
			try {
				if (eventTypesAdmin && eventTypesAdmin.getUserEventTypes) {
					const eventTypesResult = await eventTypesAdmin.getUserEventTypes();
					if (eventTypesResult && eventTypesResult.success) {
						eventTypesCount = eventTypesResult.eventTypes?.length || 0;
					}
				}
			} catch (e) {
				console.warn('Failed to load event types:', e);
			}

			// Try to load body locations
			try {
				if (bodyLocationsAdmin && bodyLocationsAdmin.getUserBodyLocations) {
					const bodyLocationsResult = await bodyLocationsAdmin.getUserBodyLocations();
					if (bodyLocationsResult && bodyLocationsResult.success) {
						bodyLocationsCount = bodyLocationsResult.bodyLocations?.length || 0;
					}
				}
			} catch (e) {
				console.warn('Failed to load body locations:', e);
			}

			// Try to load interventions
			try {
				if (interventionsAdmin && interventionsAdmin.getUserInterventions) {
					const interventionsResult = await interventionsAdmin.getUserInterventions();
					if (interventionsResult && interventionsResult.success) {
						interventionsCount = interventionsResult.interventions?.length || 0;
					}
				}
			} catch (e) {
				console.warn('Failed to load interventions:', e);
			}

			// Update stats
			stats.customEventTypes = eventTypesCount;
			stats.customBodyLocations = bodyLocationsCount;
			stats.customInterventions = interventionsCount;

			console.log('Dashboard stats loaded successfully:', {
				eventTypes: eventTypesCount,
				bodyLocations: bodyLocationsCount,
				interventions: interventionsCount
			});

		} catch (error) {
			console.error('Error loading dashboard stats:', error);
			stats.error = 'Failed to load dashboard statistics: ' + (error instanceof Error ? error.message : 'Unknown error');
		} finally {
			stats.loading = false;
		}
	}

	onMount(() => {
		loadDashboardStats();
	});
</script>

<svelte:head>
	<title>Admin Dashboard - MS Event Tracker</title>
</svelte:head>

<div class="dashboard">
	<div class="dashboard-header">
		<h1>Admin Dashboard</h1>
		<p class="dashboard-subtitle">
			Manage your custom event types, body locations, and interventions to personalize
			your MS tracking experience.
		</p>
	</div>

	<!-- Quick Stats -->
	<div class="stats-section">
		<h2>Your Customizations</h2>

		{#if stats.loading}
			<div class="loading-container">
				<div class="loading-spinner"></div>
				<p>Loading dashboard statistics...</p>
			</div>
		{:else if stats.error}
			<div class="error-container">
				<p class="error-message">{stats.error}</p>
				<button type="button" class="retry-btn" on:click={loadDashboardStats}>
					Try Again
				</button>
			</div>
		{:else}
			<div class="stats-grid">
				<div class="stat-card">
					<div class="stat-icon">📝</div>
					<div class="stat-content">
						<div class="stat-number">{stats.customEventTypes}</div>
						<div class="stat-label">Custom Event Types</div>
						<a href="/admin/event-types" class="stat-link">Manage →</a>
					</div>
				</div>

				<div class="stat-card">
					<div class="stat-icon">🎯</div>
					<div class="stat-content">
						<div class="stat-number">{stats.customBodyLocations}</div>
						<div class="stat-label">Custom Body Locations</div>
						<a href="/admin/body-locations" class="stat-link">Manage →</a>
					</div>
				</div>

				<div class="stat-card">
					<div class="stat-icon">💊</div>
					<div class="stat-content">
						<div class="stat-number">{stats.customInterventions}</div>
						<div class="stat-label">Custom Interventions</div>
						<a href="/admin/interventions" class="stat-link">Manage →</a>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Quick Actions -->
	<div class="actions-section">
		<h2>Quick Actions</h2>
		<div class="actions-grid">
			<a href="/admin/event-types/new" class="action-card">
				<div class="action-icon">➕</div>
				<div class="action-content">
					<h3>Add Event Type</h3>
					<p>Create a new custom event type for tracking specific symptoms</p>
				</div>
			</a>

			<a href="/admin/body-locations/new" class="action-card">
				<div class="action-icon">🎯</div>
				<div class="action-content">
					<h3>Add Body Location</h3>
					<p>Add a new body location for precise symptom tracking</p>
				</div>
			</a>

			<a href="/admin/interventions/new" class="action-card">
				<div class="action-icon">💊</div>
				<div class="action-content">
					<h3>Add Intervention</h3>
					<p>Create a new intervention for tracking treatments</p>
				</div>
			</a>
		</div>
	</div>

	<!-- Getting Started Guide -->
	<div class="guide-section">
		<h2>Getting Started</h2>
		<div class="guide-content">
			<div class="guide-step">
				<div class="step-number">1</div>
				<div class="step-content">
					<h3>Create Custom Event Types</h3>
					<p>
						Add event types specific to your MS symptoms like "Cognitive Fog",
						"Balance Issues", or "Temperature Sensitivity". Configure severity
						tracking, body locations, and custom fields for each type.
					</p>
				</div>
			</div>

			<div class="guide-step">
				<div class="step-number">2</div>
				<div class="step-content">
					<h3>Define Body Locations</h3>
					<p>
						Create precise body locations that match your specific needs.
						Add locations like "Optic Nerve", "Inner Ear", or specific
						muscle groups organized by region.
					</p>
				</div>
			</div>

			<div class="guide-step">
				<div class="step-number">3</div>
				<div class="step-content">
					<h3>Add Interventions</h3>
					<p>
						Track your treatments and interventions including specific
						medications, dosages, physical therapies, and lifestyle changes.
						Organize them by category for easy access.
					</p>
				</div>
			</div>

			<div class="guide-step">
				<div class="step-number">4</div>
				<div class="step-content">
					<h3>Start Tracking</h3>
					<p>
						Once configured, your custom types will appear in the Quick Log
						on the main app. Use them to build a comprehensive timeline of
						your MS journey.
					</p>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.dashboard {
		display: flex;
		flex-direction: column;
		gap: 2.5rem;
	}

	.dashboard-header h1 {
		color: #2c3e50;
		margin: 0 0 0.5rem 0;
		font-size: 2rem;
		font-weight: 700;
	}

	.dashboard-subtitle {
		color: #6c757d;
		margin: 0;
		font-size: 1.1rem;
		line-height: 1.6;
		max-width: 600px;
	}

	.stats-section h2,
	.actions-section h2,
	.guide-section h2 {
		color: #2c3e50;
		margin: 0 0 1.5rem 0;
		font-size: 1.5rem;
		font-weight: 600;
	}

	/* Loading and Error States */
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

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
	}

	.stat-card {
		background: #f8f9fa;
		border: 1px solid #e9ecef;
		border-radius: 8px;
		padding: 1.5rem;
		display: flex;
		align-items: center;
		gap: 1rem;
		transition: all 0.2s;
	}

	.stat-card:hover {
		background: white;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		transform: translateY(-1px);
	}

	.stat-icon {
		font-size: 2.5rem;
		line-height: 1;
	}

	.stat-content {
		flex: 1;
	}

	.stat-number {
		font-size: 2rem;
		font-weight: 700;
		color: #2c3e50;
		line-height: 1;
		margin-bottom: 0.25rem;
	}

	.stat-label {
		color: #6c757d;
		font-weight: 500;
		margin-bottom: 0.5rem;
		font-size: 0.95rem;
	}

	.stat-link {
		color: #007bff;
		text-decoration: none;
		font-weight: 500;
		font-size: 0.875rem;
	}

	.stat-link:hover {
		text-decoration: underline;
	}

	/* Actions Grid */
	.actions-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.action-card {
		background: white;
		border: 2px solid #e9ecef;
		border-radius: 8px;
		padding: 1.5rem;
		display: flex;
		align-items: center;
		gap: 1rem;
		text-decoration: none;
		color: inherit;
		transition: all 0.2s;
	}

	.action-card:hover {
		border-color: #007bff;
		box-shadow: 0 4px 12px rgba(0, 123, 255, 0.15);
		transform: translateY(-2px);
	}

	.action-icon {
		font-size: 2rem;
		color: #007bff;
		width: 3rem;
		text-align: center;
	}

	.action-content h3 {
		color: #2c3e50;
		margin: 0 0 0.5rem 0;
		font-size: 1.1rem;
		font-weight: 600;
	}

	.action-content p {
		color: #6c757d;
		margin: 0;
		font-size: 0.9rem;
		line-height: 1.4;
	}

	/* Getting Started Guide */
	.guide-content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.guide-step {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
	}

	.step-number {
		background: #007bff;
		color: white;
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 0.875rem;
		flex-shrink: 0;
		margin-top: 0.25rem;
	}

	.step-content h3 {
		color: #2c3e50;
		margin: 0 0 0.5rem 0;
		font-size: 1.1rem;
		font-weight: 600;
	}

	.step-content p {
		color: #495057;
		margin: 0;
		line-height: 1.6;
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.dashboard {
			gap: 2rem;
		}

		.dashboard-header h1 {
			font-size: 1.75rem;
		}

		.stats-grid,
		.actions-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.stat-card,
		.action-card {
			padding: 1rem;
		}

		.guide-step {
			flex-direction: column;
			gap: 0.75rem;
		}

		.step-number {
			align-self: flex-start;
		}
	}
</style>