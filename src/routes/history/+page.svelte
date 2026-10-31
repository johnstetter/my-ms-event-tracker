<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { user } from '$lib/stores/auth.js';
	import { getEventHistory, type EventHistoryParams } from '$lib/services/eventService.js';
	import HistoryFilters from '$lib/components/history/HistoryFilters.svelte';
	import EventsList from '$lib/components/history/EventsList.svelte';
	import Pagination from '$lib/components/history/Pagination.svelte';
	import ExportData from '$lib/components/history/ExportData.svelte';

	// Data state
	let events: any[] = [];
	let totalCount = 0;
	let loading = true;
	let error: string | null = null;

	// Export state
	let showExport = false;
	let exportSuccess: string | null = null;

	// Filter state derived from URL parameters
	$: currentPage = parseInt($page.url.searchParams.get('page') || '1');
	$: limit = parseInt($page.url.searchParams.get('limit') || '25');
	$: eventTypeIds = $page.url.searchParams.getAll('type');
	$: startDate = $page.url.searchParams.get('start');
	$: endDate = $page.url.searchParams.get('end');
	$: searchTerm = $page.url.searchParams.get('q') || '';
	$: sortBy = ($page.url.searchParams.get('sort') || 'started_at:desc').split(':')[0] as 'started_at' | 'severity';
	$: sortOrder = ($page.url.searchParams.get('sort') || 'started_at:desc').split(':')[1] as 'asc' | 'desc';

	// Computed values
	$: offset = (currentPage - 1) * limit;
	$: totalPages = Math.ceil(totalCount / limit);
	$: hasResults = events.length > 0;
	$: showingStart = offset + 1;
	$: showingEnd = Math.min(offset + events.length, totalCount);

	// Load event history
	async function loadEventHistory() {
		if (!$user) return;

		loading = true;
		error = null;

		try {
			const params: EventHistoryParams = {
				limit,
				offset,
				eventTypeIds: eventTypeIds.length > 0 ? eventTypeIds : undefined,
				startDate: startDate || undefined,
				endDate: endDate || undefined,
				searchTerm: searchTerm || undefined,
				sortBy,
				sortOrder
			};

			const result = await getEventHistory(params);

			if (result.success) {
				events = result.events || [];
				totalCount = result.totalCount || 0;
			} else {
				error = result.error || 'Failed to load event history';
				events = [];
				totalCount = 0;
			}
		} catch (e) {
			console.error('Error loading event history:', e);
			error = 'Failed to load event history';
			events = [];
			totalCount = 0;
		} finally {
			loading = false;
		}
	}

	// Update URL parameters when filters change
	function updateUrlParams(newParams: Record<string, string | string[] | null>) {
		if (!browser) return;

		const url = new URL($page.url);

		// Clear existing parameters
		url.searchParams.delete('page');
		url.searchParams.delete('type');
		url.searchParams.delete('start');
		url.searchParams.delete('end');
		url.searchParams.delete('q');
		url.searchParams.delete('sort');
		url.searchParams.delete('limit');

		// Set new parameters
		Object.entries(newParams).forEach(([key, value]) => {
			if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
				return; // Skip empty values
			}

			if (Array.isArray(value)) {
				value.forEach(v => url.searchParams.append(key, v));
			} else {
				url.searchParams.set(key, value);
			}
		});

		// Navigate to new URL
		goto(url.pathname + url.search, { replaceState: true });
	}

	// Handle filter changes
	function handleFiltersChange(event: CustomEvent) {
		const { filters } = event.detail;

		updateUrlParams({
			page: '1', // Reset to first page when filters change
			type: filters.eventTypeIds,
			start: filters.startDate,
			end: filters.endDate,
			q: filters.searchTerm,
			sort: filters.sortBy && filters.sortOrder ? `${filters.sortBy}:${filters.sortOrder}` : null,
			limit: filters.limit?.toString()
		});
	}

	// Handle page changes
	function handlePageChange(event: CustomEvent) {
		const { page: newPage } = event.detail;

		updateUrlParams({
			page: newPage.toString(),
			type: eventTypeIds,
			start: startDate,
			end: endDate,
			q: searchTerm,
			sort: `${sortBy}:${sortOrder}`,
			limit: limit.toString()
		});
	}

	// Handle clear filters
	function handleClearFilters() {
		goto('/history', { replaceState: true });
	}

	// Handle export completion
	function handleExportComplete(event: CustomEvent) {
		const { format, count, filename } = event.detail;
		exportSuccess = `Successfully exported ${count} events as ${format.toUpperCase()}`;

		// Clear success message after 5 seconds
		setTimeout(() => {
			exportSuccess = null;
		}, 5000);
	}

	// Toggle export panel
	function toggleExport() {
		showExport = !showExport;
		exportSuccess = null; // Clear any previous success messages
	}

	// Reload when URL parameters or user changes
	$: if ($user && browser && $page.url.search !== undefined) {
		loadEventHistory();
	}

	onMount(() => {
		if ($user) {
			loadEventHistory();
		}
	});
</script>

<svelte:head>
	<title>Event History - MS Event Tracker</title>
	<meta name="description" content="Browse your complete MS symptom event history with filtering and search capabilities." />
</svelte:head>

<div class="history-page">
	<div class="page-header">
		<div class="header-content">
			<div class="header-top">
				<a href="/" class="back-link">← Back to Dashboard</a>
				<button type="button" class="export-toggle-btn" on:click={toggleExport}>
					{#if showExport}
						Close Export
					{:else}
						📊 Export Data
					{/if}
				</button>
			</div>
			<div class="title-section">
				<h1>Event History</h1>
				{#if hasResults && !loading}
					<p class="results-summary">
						Showing {showingStart}-{showingEnd} of {totalCount} events
					</p>
				{/if}
			</div>
		</div>
	</div>

	<div class="history-content">
		<!-- Filters -->
		<HistoryFilters
			{eventTypeIds}
			startDate={startDate || ''}
			endDate={endDate || ''}
			{searchTerm}
			{sortBy}
			{sortOrder}
			{limit}
			on:filtersChange={handleFiltersChange}
			on:clearFilters={handleClearFilters}
		/>

		<!-- Export Success Message -->
		{#if exportSuccess}
			<div class="export-success">
				<span class="success-icon">✅</span>
				{exportSuccess}
			</div>
		{/if}

		<!-- Export Panel -->
		{#if showExport}
			<ExportData
				{eventTypeIds}
				startDate={startDate || ''}
				endDate={endDate || ''}
				{searchTerm}
				on:exportComplete={handleExportComplete}
			/>
		{/if}

		<!-- Loading State -->
		{#if loading}
			<div class="loading-state">
				<div class="loading-spinner"></div>
				<p>Loading event history...</p>
			</div>

		<!-- Error State -->
		{:else if error}
			<div class="error-state">
				<p class="error-message">Failed to load event history</p>
				<p class="error-detail">{error}</p>
				<button type="button" class="retry-btn" on:click={loadEventHistory}>
					Try Again
				</button>
			</div>

		<!-- Empty State -->
		{:else if !hasResults}
			<div class="empty-state">
				<h2>No events found</h2>
				<p>No events match your current filters.</p>
				<p class="empty-subtitle">Try adjusting your search criteria or clearing filters.</p>
				<button type="button" class="clear-filters-btn" on:click={handleClearFilters}>
					Clear All Filters
				</button>
			</div>

		<!-- Results -->
		{:else}
			<EventsList {events} />

			{#if totalPages > 1}
				<Pagination
					{currentPage}
					{totalPages}
					{totalCount}
					{limit}
					on:pageChange={handlePageChange}
				/>
			{/if}
		{/if}
	</div>
</div>

<style>
	.history-page {
		min-height: 100vh;
		background: #f8f9fa;
		padding: 1rem;
	}

	.page-header {
		max-width: 800px;
		margin: 0 auto 1.5rem auto;
	}

	.header-content {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.header-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: #007bff;
		text-decoration: none;
		font-weight: 500;
		padding: 0.5rem 1rem;
		border-radius: 8px;
		transition: all 0.2s;
		background: white;
		border: 1px solid #e9ecef;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		width: fit-content;
	}

	.back-link:hover {
		background: #f8f9fa;
		border-color: #007bff;
		transform: translateY(-1px);
		box-shadow: 0 2px 6px rgba(0, 123, 255, 0.1);
	}

	.export-toggle-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: white;
		background: #007bff;
		border: 1px solid #007bff;
		text-decoration: none;
		font-weight: 500;
		padding: 0.5rem 1rem;
		border-radius: 8px;
		transition: all 0.2s;
		cursor: pointer;
		font-size: 0.9rem;
		box-shadow: 0 1px 3px rgba(0, 123, 255, 0.2);
	}

	.export-toggle-btn:hover {
		background: #0056b3;
		border-color: #0056b3;
		transform: translateY(-1px);
		box-shadow: 0 2px 6px rgba(0, 123, 255, 0.3);
	}

	.title-section {
		text-align: center;
	}

	.title-section h1 {
		color: #2c3e50;
		margin: 0;
		font-size: 2rem;
		font-weight: 700;
	}

	.results-summary {
		color: #6c757d;
		margin: 0.5rem 0 0 0;
		font-size: 0.95rem;
	}

	.history-content {
		max-width: 800px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.export-success {
		background: #d4edda;
		color: #155724;
		padding: 1rem;
		border-radius: 8px;
		border: 1px solid #c3e6cb;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-weight: 500;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		animation: slideDown 0.3s ease-out;
	}

	.success-icon {
		font-size: 1.2rem;
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Loading, error, and empty states */
	.loading-state,
	.error-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 3rem 2rem;
		text-align: center;
		background: white;
		border-radius: 12px;
		border: 1px solid #e9ecef;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
		font-size: 1.1rem;
	}

	.error-detail {
		color: #6c757d;
		font-size: 0.9rem;
		margin: 0;
	}

	.retry-btn {
		background: #dc3545;
		color: white;
		border: none;
		padding: 0.6rem 1.2rem;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.retry-btn:hover {
		background: #c82333;
	}

	.empty-state h2 {
		color: #2c3e50;
		margin: 0;
		font-size: 1.5rem;
	}

	.empty-state p {
		margin: 0;
		color: #6c757d;
	}

	.empty-subtitle {
		font-size: 0.9rem;
		margin-top: 0.5rem !important;
	}

	.clear-filters-btn {
		background: #007bff;
		color: white;
		border: none;
		padding: 0.6rem 1.2rem;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
		margin-top: 0.5rem;
	}

	.clear-filters-btn:hover {
		background: #0056b3;
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.history-page {
			padding: 0.5rem;
		}

		.page-header {
			margin-bottom: 1rem;
		}

		.header-top {
			flex-direction: column;
			align-items: stretch;
			gap: 0.75rem;
		}

		.export-toggle-btn {
			text-align: center;
			width: 100%;
		}

		.title-section h1 {
			font-size: 1.5rem;
		}

		.results-summary {
			font-size: 0.85rem;
		}

		.loading-state,
		.error-state,
		.empty-state {
			padding: 2rem 1.5rem;
		}

		.empty-state h2 {
			font-size: 1.25rem;
		}
	}
</style>