<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import {
		getEventsForExport,
		type EventExportParams,
		type ExportEventData
	} from '$lib/services/eventService.js';
	import {
		downloadCSV,
		downloadPDF,
		generateSummaryStats,
		type ExportFormat,
		type ExportSummaryStats
	} from '$lib/utils/exportUtils.js';

	const dispatch = createEventDispatcher();

	// Export configuration props (matches history page filters)
	export let eventTypeIds: string[] = [];
	export let startDate: string = '';
	export let endDate: string = '';
	export let searchTerm: string = '';

	// Component state
	let isExporting = false;
	let exportFormat: ExportFormat = 'csv';
	let includeStats = true;
	let showPreview = false;
	let exportError: string | null = null;

	// Preview state
	let previewEvents: ExportEventData[] = [];
	let previewStats: ExportSummaryStats | null = null;

	/**
	 * Generate export preview
	 */
	async function generatePreview() {
		if (isExporting) return;

		isExporting = true;
		exportError = null;

		try {
			const params: EventExportParams = {
				eventTypeIds: eventTypeIds.length > 0 ? eventTypeIds : undefined,
				startDate: startDate || undefined,
				endDate: endDate || undefined,
				searchTerm: searchTerm || undefined,
				includeInterventions: true
			};

			const result = await getEventsForExport(params);

			if (result.success && result.events) {
				previewEvents = result.events;
				previewStats = generateSummaryStats(result.events);
				showPreview = true;
			} else {
				exportError = result.error || 'Failed to generate preview';
				showPreview = false;
			}
		} catch (error) {
			console.error('Error generating preview:', error);
			exportError = error instanceof Error ? error.message : 'Unknown error occurred';
			showPreview = false;
		} finally {
			isExporting = false;
		}
	}

	/**
	 * Execute the export
	 */
	async function executeExport() {
		if (isExporting) return;

		isExporting = true;
		exportError = null;

		try {
			const params: EventExportParams = {
				eventTypeIds: eventTypeIds.length > 0 ? eventTypeIds : undefined,
				startDate: startDate || undefined,
				endDate: endDate || undefined,
				searchTerm: searchTerm || undefined,
				includeInterventions: true
			};

			const result = await getEventsForExport(params);

			if (result.success && result.events) {
				// Generate filename based on current filters
				let filename = 'ms-events-export';

				if (startDate && endDate) {
					filename += `-${startDate}-to-${endDate}`;
				} else if (startDate) {
					filename += `-from-${startDate}`;
				} else if (endDate) {
					filename += `-until-${endDate}`;
				}

				filename += `-${new Date().toISOString().split('T')[0]}`;

				// Execute the appropriate export
				if (exportFormat === 'csv') {
					downloadCSV(result.events, `${filename}.csv`, includeStats);
				} else if (exportFormat === 'pdf') {
					await downloadPDF(result.events, `${filename}.pdf`, includeStats);
				}

				// Dispatch success event
				dispatch('exportComplete', {
					format: exportFormat,
					count: result.events.length,
					filename
				});

			} else {
				exportError = result.error || 'Failed to export data';
			}
		} catch (error) {
			console.error('Error exporting data:', error);
			exportError = error instanceof Error ? error.message : 'Unknown error occurred';
		} finally {
			isExporting = false;
		}
	}

	/**
	 * Close preview
	 */
	function closePreview() {
		showPreview = false;
		previewEvents = [];
		previewStats = null;
	}

	/**
	 * Get severity display class
	 */
	function getSeverityClass(severity: number | null): string {
		if (!severity) return '';
		if (severity >= 7) return 'severity-high';
		if (severity >= 4) return 'severity-medium';
		return 'severity-low';
	}

	/**
	 * Format duration
	 */
	function formatDuration(startedAt: string, endedAt: string | null): string {
		if (!endedAt) return 'Ongoing';
		const start = new Date(startedAt);
		const end = new Date(endedAt);
		const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
		return Math.round(hours * 10) / 10 + 'h';
	}
</script>

<!-- Export Configuration Panel -->
<div class="export-panel">
	<div class="export-header">
		<h3>Export Event Data</h3>
		<p class="export-subtitle">Generate CSV or PDF reports for healthcare providers</p>
	</div>

	<div class="export-config">
		<!-- Format Selection -->
		<div class="config-group">
			<label class="config-label">Export Format</label>
			<div class="format-options">
				<label class="format-option">
					<input type="radio" bind:group={exportFormat} value="csv" />
					<span class="format-icon">📊</span>
					<div class="format-details">
						<strong>CSV</strong>
						<small>Excel-compatible spreadsheet</small>
					</div>
				</label>
				<label class="format-option">
					<input type="radio" bind:group={exportFormat} value="pdf" />
					<span class="format-icon">📄</span>
					<div class="format-details">
						<strong>PDF</strong>
						<small>Formatted report for medical professionals</small>
					</div>
				</label>
			</div>
		</div>

		<!-- Options -->
		<div class="config-group">
			<label class="checkbox-option">
				<input type="checkbox" bind:checked={includeStats} />
				<span class="checkmark"></span>
				Include summary statistics
			</label>
		</div>

		<!-- Current Filters Info -->
		<div class="filter-info">
			<h4>Current Filters</h4>
			<div class="filter-tags">
				{#if eventTypeIds.length > 0}
					<span class="filter-tag">
						Event Types: {eventTypeIds.length} selected
					</span>
				{/if}
				{#if startDate}
					<span class="filter-tag">
						From: {new Date(startDate).toLocaleDateString()}
					</span>
				{/if}
				{#if endDate}
					<span class="filter-tag">
						Until: {new Date(endDate).toLocaleDateString()}
					</span>
				{/if}
				{#if searchTerm}
					<span class="filter-tag">
						Search: "{searchTerm}"
					</span>
				{/if}
				{#if eventTypeIds.length === 0 && !startDate && !endDate && !searchTerm}
					<span class="filter-tag-all">All events</span>
				{/if}
			</div>
		</div>
	</div>

	<!-- Action Buttons -->
	<div class="export-actions">
		<button
			type="button"
			class="btn btn-secondary"
			on:click={generatePreview}
			disabled={isExporting}
		>
			{#if isExporting}
				<span class="loading-spinner"></span>
			{/if}
			Preview Data
		</button>

		<button
			type="button"
			class="btn btn-primary"
			on:click={executeExport}
			disabled={isExporting}
		>
			{#if isExporting}
				<span class="loading-spinner"></span>
				Exporting...
			{:else}
				Export {exportFormat.toUpperCase()}
			{/if}
		</button>
	</div>

	<!-- Error Display -->
	{#if exportError}
		<div class="export-error">
			<strong>Export Error:</strong> {exportError}
		</div>
	{/if}
</div>

<!-- Preview Modal -->
{#if showPreview}
	<div class="preview-modal">
		<div class="modal-backdrop" on:click={closePreview}></div>
		<div class="modal-content">
			<div class="modal-header">
				<h3>Export Preview</h3>
				<button type="button" class="close-btn" on:click={closePreview}>×</button>
			</div>

			<div class="modal-body">
				{#if previewStats}
					<div class="preview-stats">
						<div class="stats-overview">
							<div class="stat-card">
								<span class="stat-number">{previewStats.totalEvents}</span>
								<span class="stat-label">Total Events</span>
							</div>
							<div class="stat-card">
								<span class="stat-number">
									{previewStats.dateRange.start}
								</span>
								<span class="stat-label">From</span>
							</div>
							<div class="stat-card">
								<span class="stat-number">
									{previewStats.dateRange.end}
								</span>
								<span class="stat-label">To</span>
							</div>
							{#if previewStats.severityStats}
								<div class="stat-card">
									<span class="stat-number">{previewStats.severityStats.average}/10</span>
									<span class="stat-label">Avg Severity</span>
								</div>
							{/if}
						</div>

						{#if previewStats.eventTypeBreakdown.length > 0}
							<div class="breakdown-section">
								<h4>Event Types</h4>
								<div class="breakdown-list">
									{#each previewStats.eventTypeBreakdown.slice(0, 5) as item}
										<div class="breakdown-item">
											<span class="item-name">{item.typeName}</span>
											<span class="item-count">{item.count} ({item.percentage}%)</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				{/if}

				<div class="preview-events">
					<h4>Recent Events ({previewEvents.length} total)</h4>
					<div class="events-list">
						{#each previewEvents.slice(0, 5) as event}
							<div class="event-preview-item">
								<div class="event-date">
									{new Date(event.started_at).toLocaleDateString()}
								</div>
								<div class="event-details">
									<strong>{event.event_type?.name || 'Unknown'}</strong>
									{#if event.severity}
										<span class="severity {getSeverityClass(event.severity)}">
											Severity {event.severity}
										</span>
									{/if}
									{#if event.event_locations && event.event_locations.length > 0}
										<div class="locations">
											{event.event_locations?.map((loc) => loc.body_location?.name).filter(Boolean).join(', ') || 'None'}
										</div>
									{/if}
								</div>
							</div>
						{/each}
						{#if previewEvents.length > 5}
							<div class="more-events">
								...and {previewEvents.length - 5} more events
							</div>
						{/if}
					</div>
				</div>
			</div>

			<div class="modal-footer">
				<button type="button" class="btn btn-secondary" on:click={closePreview}>
					Close Preview
				</button>
				<button type="button" class="btn btn-primary" on:click={executeExport} disabled={isExporting}>
					Export This Data
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.export-panel {
		background: white;
		border-radius: 12px;
		padding: 1.5rem;
		border: 1px solid #e9ecef;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		margin: 1rem 0;
	}

	.export-header {
		margin-bottom: 1.5rem;
		text-align: center;
	}

	.export-header h3 {
		margin: 0 0 0.5rem 0;
		color: #2c3e50;
		font-size: 1.25rem;
	}

	.export-subtitle {
		color: #6c757d;
		margin: 0;
		font-size: 0.9rem;
	}

	.export-config {
		margin-bottom: 1.5rem;
	}

	.config-group {
		margin-bottom: 1.5rem;
	}

	.config-label {
		display: block;
		font-weight: 600;
		margin-bottom: 0.75rem;
		color: #2c3e50;
	}

	.format-options {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.format-option {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		border: 2px solid #e9ecef;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
		background: white;
	}

	.format-option:hover {
		border-color: #007bff;
		background: #f8f9ff;
	}

	.format-option input[type="radio"] {
		margin: 0;
		margin-right: 0.5rem;
	}

	.format-option input[type="radio"]:checked + .format-icon {
		transform: scale(1.1);
	}

	.format-option:has(input[type="radio"]:checked) {
		border-color: #007bff;
		background: #f8f9ff;
	}

	.format-icon {
		font-size: 1.5rem;
		transition: transform 0.2s;
	}

	.format-details strong {
		display: block;
		color: #2c3e50;
		margin-bottom: 0.25rem;
	}

	.format-details small {
		color: #6c757d;
		font-size: 0.8rem;
	}

	.checkbox-option {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		cursor: pointer;
		font-size: 0.95rem;
	}

	.checkbox-option input[type="checkbox"] {
		margin: 0;
	}

	.filter-info {
		background: #f8f9fa;
		padding: 1rem;
		border-radius: 8px;
		border-left: 4px solid #007bff;
	}

	.filter-info h4 {
		margin: 0 0 0.75rem 0;
		color: #2c3e50;
		font-size: 1rem;
	}

	.filter-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.filter-tag, .filter-tag-all {
		background: #007bff;
		color: white;
		padding: 0.25rem 0.75rem;
		border-radius: 20px;
		font-size: 0.8rem;
		font-weight: 500;
	}

	.filter-tag-all {
		background: #6c757d;
	}

	.export-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
	}

	.btn {
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-weight: 600;
		font-size: 0.9rem;
		border: none;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 120px;
		justify-content: center;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-primary {
		background: #007bff;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: #0056b3;
		transform: translateY(-1px);
		box-shadow: 0 2px 4px rgba(0, 123, 255, 0.3);
	}

	.btn-secondary {
		background: #6c757d;
		color: white;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #545b62;
		transform: translateY(-1px);
		box-shadow: 0 2px 4px rgba(108, 117, 125, 0.3);
	}

	.loading-spinner {
		width: 1rem;
		height: 1rem;
		border: 2px solid currentColor;
		border-top: 2px solid transparent;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-right: 0.5rem;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.export-error {
		background: #f8d7da;
		color: #721c24;
		padding: 1rem;
		border-radius: 8px;
		border: 1px solid #f5c6cb;
		margin-top: 1rem;
	}

	/* Preview Modal Styles */
	.preview-modal {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.modal-backdrop {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(2px);
	}

	.modal-content {
		position: relative;
		background: white;
		border-radius: 12px;
		max-width: 800px;
		width: 100%;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.5rem;
		border-bottom: 1px solid #e9ecef;
	}

	.modal-header h3 {
		margin: 0;
		color: #2c3e50;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		color: #6c757d;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		transition: all 0.2s;
	}

	.close-btn:hover {
		background: #f8f9fa;
		color: #2c3e50;
	}

	.modal-body {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem;
	}

	.modal-footer {
		display: flex;
		gap: 1rem;
		padding: 1.5rem;
		border-top: 1px solid #e9ecef;
		justify-content: flex-end;
	}

	.preview-stats {
		margin-bottom: 2rem;
	}

	.stats-overview {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.stat-card {
		text-align: center;
		padding: 1rem;
		background: #f8f9fa;
		border-radius: 8px;
		border: 1px solid #e9ecef;
	}

	.stat-number {
		display: block;
		font-size: 1.25rem;
		font-weight: bold;
		color: #007bff;
		margin-bottom: 0.25rem;
	}

	.stat-label {
		font-size: 0.8rem;
		color: #6c757d;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.breakdown-section h4 {
		margin: 0 0 0.75rem 0;
		color: #2c3e50;
	}

	.breakdown-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.breakdown-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0.75rem;
		background: white;
		border: 1px solid #e9ecef;
		border-radius: 6px;
	}

	.item-name {
		font-weight: 500;
		color: #2c3e50;
	}

	.item-count {
		color: #6c757d;
		font-size: 0.9rem;
	}

	.preview-events h4 {
		margin: 0 0 1rem 0;
		color: #2c3e50;
	}

	.events-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.event-preview-item {
		display: flex;
		gap: 1rem;
		padding: 0.75rem;
		background: #f8f9fa;
		border-radius: 8px;
		border: 1px solid #e9ecef;
	}

	.event-date {
		font-size: 0.85rem;
		color: #6c757d;
		font-weight: 500;
		min-width: 80px;
	}

	.event-details {
		flex: 1;
	}

	.event-details strong {
		display: block;
		color: #2c3e50;
		margin-bottom: 0.25rem;
	}

	.severity {
		font-size: 0.8rem;
		font-weight: 600;
		padding: 0.2rem 0.5rem;
		border-radius: 4px;
		display: inline-block;
		margin-bottom: 0.25rem;
	}

	.severity-high {
		background: #f8d7da;
		color: #721c24;
	}

	.severity-medium {
		background: #fff3cd;
		color: #856404;
	}

	.severity-low {
		background: #d1edff;
		color: #004085;
	}

	.locations {
		font-size: 0.85rem;
		color: #6c757d;
		font-style: italic;
	}

	.more-events {
		text-align: center;
		color: #6c757d;
		font-style: italic;
		padding: 0.75rem;
		background: #f8f9fa;
		border-radius: 8px;
		border: 1px dashed #dee2e6;
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.format-options {
			grid-template-columns: 1fr;
		}

		.export-actions {
			flex-direction: column;
		}

		.btn {
			width: 100%;
		}

		.stats-overview {
			grid-template-columns: repeat(2, 1fr);
		}

		.modal-content {
			margin: 0.5rem;
			max-height: 95vh;
		}

		.modal-header,
		.modal-body,
		.modal-footer {
			padding: 1rem;
		}

		.event-preview-item {
			flex-direction: column;
			gap: 0.5rem;
		}

		.event-date {
			min-width: auto;
		}
	}
</style>