<script lang="ts">
	import { onMount } from 'svelte';
	import { bodyLocations, bodyLocationsLoading, locationsByRegion, commonLocations, loadBodyLocations } from '$lib/stores/bodyLocations.js';
	import { quickLogStore, quickLogActions } from '$lib/stores/quickLog.js';
	import type { BodyLocation } from '$lib/supabase.js';
	import NoteInput from './NoteInput.svelte';

	// Props
	export let disabled = false;

	// Local state
	let showAllLocations = false;
	let localSelectedLocations: BodyLocation[] = [];
	let localSeverity: number | null = null;
	let localNote: string = ($quickLogStore.customFields.note as string) ?? '';

	// Reactive values from store
	$: state = $quickLogStore;
	$: eventType = state.selectedType;

	// Determine what sections to show
	$: showLocationSection = eventType?.has_location ?? false;
	$: showSeveritySection = eventType?.has_severity ?? false;

	// Validation
	$: isLocationValid = !showLocationSection || localSelectedLocations.length > 0;
	$: isSeverityValid = !showSeveritySection || localSeverity !== null;
	$: isValid = isLocationValid && isSeverityValid;

	// Preset severity levels
	const presets = [
		{ label: 'Low', range: [1, 3], value: 2, color: '#28a745' },
		{ label: 'Medium', range: [4, 6], value: 5, color: '#ffc107' },
		{ label: 'High', range: [7, 10], value: 8, color: '#dc3545' }
	];

	// Load body locations on mount
	onMount(() => {
		if (showLocationSection && !$bodyLocations.length && !$bodyLocationsLoading) {
			loadBodyLocations();
		}
	});

	// Location functions
	function toggleLocation(location: BodyLocation) {
		if (disabled) return;
		const isSelected = localSelectedLocations.some(l => l.id === location.id);
		if (isSelected) {
			localSelectedLocations = localSelectedLocations.filter(l => l.id !== location.id);
		} else {
			localSelectedLocations = [...localSelectedLocations, location];
		}
	}

	function isLocationSelected(location: BodyLocation): boolean {
		return localSelectedLocations.some(l => l.id === location.id);
	}

	// Severity functions
	function selectPreset(value: number) {
		if (disabled) return;
		localSeverity = value;
	}

	function handleSliderChange(event: Event) {
		if (disabled) return;
		const target = event.target as HTMLInputElement;
		localSeverity = parseInt(target.value);
	}

	function getSeverityColor(severity: number): string {
		if (severity <= 3) return '#28a745'; // Green
		if (severity <= 6) return '#ffc107'; // Yellow
		return '#dc3545'; // Red
	}

	function getSeverityDescription(severity: number): string {
		if (severity <= 2) return 'Minimal discomfort';
		if (severity <= 3) return 'Mild intensity';
		if (severity <= 4) return 'Noticeable intensity';
		if (severity <= 5) return 'Moderate intensity';
		if (severity <= 6) return 'Significant intensity';
		if (severity <= 7) return 'Severe intensity';
		if (severity <= 8) return 'Very severe intensity';
		if (severity <= 9) return 'Extreme intensity';
		return 'Unbearable intensity';
	}

	// Continue to next step
	function continueFlow() {
		if (disabled || !isValid) return;

		// Save data to store's customFields
		if (showLocationSection && localSelectedLocations.length > 0) {
			quickLogActions.setCustomField('locations', localSelectedLocations);
		}
		if (showSeveritySection && localSeverity !== null) {
			quickLogActions.setCustomField('severity', localSeverity);
		}
		quickLogActions.setCustomField('note', localNote);

		quickLogActions.continueFromCustomFields();
	}

	// Go back to previous step
	function goBack() {
		if (disabled) return;
		quickLogActions.goBack();
	}

	// Handle retry loading locations
	function retryLoad() {
		loadBodyLocations(true);
	}
</script>

<div class="event-form">
	<div class="header">
		<button type="button" class="back-btn" on:click={goBack} disabled={disabled}>
			← Back
		</button>
		<h3>Event Details</h3>
	</div>

	<div class="form-content">
		<!-- Location Section -->
		{#if showLocationSection}
			<div class="section">
				<h4 class="section-title">Where is the event located? <span class="required">*</span></h4>

				{#if $bodyLocationsLoading}
					<div class="loading-state">
						<div class="loading-spinner"></div>
						<p>Loading body locations...</p>
					</div>
				{:else if $bodyLocations.length === 0}
					<div class="error-state">
						<p class="error-message">Failed to load body locations</p>
						<button type="button" class="retry-btn" on:click={retryLoad}>
							Try Again
						</button>
					</div>
				{:else}
					<div class="location-content">
						<!-- Toggle between common and all locations -->
						<div class="view-toggle">
							<button
								type="button"
								class="toggle-btn"
								class:active={!showAllLocations}
								on:click={() => showAllLocations = false}
								disabled={disabled}
							>
								Common Areas
							</button>
							<button
								type="button"
								class="toggle-btn"
								class:active={showAllLocations}
								on:click={() => showAllLocations = true}
								disabled={disabled}
							>
								All Locations
							</button>
						</div>

						<!-- Location selection grid -->
						{#if !showAllLocations}
							<!-- Common/Quick locations -->
							<div class="locations-section">
								<div class="location-grid">
									{#each $commonLocations as location (location.id)}
										<button
											type="button"
											class="location-btn"
											class:selected={isLocationSelected(location)}
											class:disabled
											disabled={disabled}
											on:click={() => toggleLocation(location)}
										>
											<span class="location-text">{location.name}</span>
											{#if isLocationSelected(location)}
												<span class="check-mark">✓</span>
											{/if}
										</button>
									{/each}
								</div>
							</div>
						{:else}
							<!-- All locations grouped by region -->
							{#each [...$locationsByRegion.entries()] as [region, locations] (region)}
								<div class="locations-section">
									<h5 class="region-title">{region}</h5>
									<div class="location-grid">
										{#each locations as location (location.id)}
											<button
												type="button"
												class="location-btn"
												class:selected={isLocationSelected(location)}
												class:disabled
												disabled={disabled}
												on:click={() => toggleLocation(location)}
											>
												<span class="location-text">{location.name}</span>
												{#if isLocationSelected(location)}
													<span class="check-mark">✓</span>
												{/if}
											</button>
										{/each}
									</div>
								</div>
							{/each}
						{/if}

						<!-- Location selection summary -->
						{#if localSelectedLocations.length > 0}
							<div class="selection-summary">
								<p><strong>{localSelectedLocations.length}</strong> location{localSelectedLocations.length === 1 ? '' : 's'} selected:</p>
								<p class="selected-list">
									{localSelectedLocations.map(l => l.name).join(', ')}
								</p>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Severity Section -->
		{#if showSeveritySection}
			<div class="section">
				<h4 class="section-title">How severe is it? <span class="required">*</span></h4>

				<div class="severity-content">
					<!-- Quick preset buttons -->
					<div class="preset-section">
						<p class="preset-label">Quick selection:</p>
						<div class="preset-buttons">
							{#each presets as preset (preset.label)}
								<button
									type="button"
									class="preset-btn"
									class:selected={localSeverity && localSeverity >= preset.range[0] && localSeverity <= preset.range[1]}
									style="--preset-color: {preset.color}"
									disabled={disabled}
									on:click={() => selectPreset(preset.value)}
								>
									<span class="preset-label-text">{preset.label}</span>
									<span class="preset-range">{preset.range[0]}-{preset.range[1]}</span>
								</button>
							{/each}
						</div>
					</div>

					<!-- Fine-grained slider -->
					<div class="slider-section">
						<p class="slider-label">Or choose exact level (1-10):</p>

						<div class="slider-container">
							<!-- Custom slider track with gradient -->
							<div class="slider-track">
								<input
									type="range"
									min="1"
									max="10"
									value={localSeverity || 5}
									disabled={disabled}
									on:input={handleSliderChange}
									class="slider"
								/>
							</div>

							<!-- Slider labels -->
							<div class="slider-labels">
								<span class="label-start">1<br><small>Minimal</small></span>
								<span class="label-end">10<br><small>Unbearable</small></span>
							</div>
						</div>

						<!-- Current selection display -->
						{#if localSeverity}
							<div class="selection-display" style="--severity-color: {getSeverityColor(localSeverity)}">
								<div class="severity-value">
									{localSeverity}/10
								</div>
								<div class="severity-description">
									{getSeverityDescription(localSeverity)}
								</div>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<!-- Note (optional) -->
		<div class="section">
			<NoteInput bind:value={localNote} {disabled} />
		</div>
	</div>

	<!-- Continue button -->
	<div class="footer">
		<div class="form-summary">
			<p class="form-status">
				{#if isValid}
					<span class="valid-indicator">✓</span>
					Ready to continue
				{:else}
					<span class="invalid-indicator">⚠</span>
					Please complete all required fields
				{/if}
			</p>
		</div>

		<button
			type="button"
			class="continue-btn"
			class:enabled={isValid}
			disabled={disabled || !isValid}
			on:click={continueFlow}
		>
			{isValid ? 'Continue' : 'Complete required fields'}
		</button>
	</div>
</div>

<style>
	.event-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		max-width: 600px;
		margin: 0 auto;
	}

	.header {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.back-btn {
		background: #f8f9fa;
		border: 1px solid #e9ecef;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.875rem;
		color: #495057;
		transition: all 0.2s;
	}

	.back-btn:hover:not(:disabled) {
		background: #e9ecef;
	}

	.back-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	h3 {
		color: #2c3e50;
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		flex: 1;
	}

	/* Form content */
	.form-content {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.section-title {
		color: #2c3e50;
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.required {
		color: #dc3545;
		font-size: 0.875rem;
	}

	/* Loading and error states */
	.loading-state,
	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 2rem;
		text-align: center;
		background: #f8f9fa;
		border-radius: 12px;
		border: 1px solid #e9ecef;
	}

	.loading-spinner {
		width: 2rem;
		height: 2rem;
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
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		cursor: pointer;
	}

	/* Location content */
	.location-content {
		max-height: 400px;
		overflow-y: auto;
	}

	.view-toggle {
		display: flex;
		gap: 0.5rem;
		background: #f8f9fa;
		padding: 0.25rem;
		border-radius: 8px;
		margin-bottom: 1rem;
	}

	.toggle-btn {
		flex: 1;
		background: transparent;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.875rem;
		transition: all 0.2s;
		color: #495057;
	}

	.toggle-btn.active {
		background: white;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		color: #2c3e50;
		font-weight: 600;
	}

	.toggle-btn:hover:not(.active):not(:disabled) {
		background: rgba(255, 255, 255, 0.5);
	}

	.locations-section {
		margin-bottom: 1.5rem;
	}

	.region-title {
		color: #495057;
		font-size: 0.875rem;
		font-weight: 600;
		margin: 0 0 0.75rem 0;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.location-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 0.75rem;
	}

	.location-btn {
		position: relative;
		background: white;
		border: 2px solid #e9ecef;
		padding: 0.75rem 0.5rem;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
		min-height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.location-btn:hover:not(.disabled) {
		border-color: #007bff;
		background: #f8f9ff;
	}

	.location-btn.selected {
		background: #e3f2fd;
		border-color: #007bff;
		color: #1565c0;
	}

	.location-btn.disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.location-text {
		font-size: 0.875rem;
		font-weight: 500;
		text-align: center;
		line-height: 1.2;
	}

	.check-mark {
		position: absolute;
		top: 0.25rem;
		right: 0.25rem;
		color: #28a745;
		font-weight: bold;
		font-size: 0.75rem;
	}

	.selection-summary {
		margin-top: 1rem;
		padding: 0.75rem;
		background: #f8f9fa;
		border-radius: 6px;
	}

	.selection-summary p {
		margin: 0;
		color: #495057;
	}

	.selected-list {
		font-size: 0.875rem;
		margin-top: 0.25rem !important;
		color: #6c757d !important;
	}

	/* Severity content */
	.severity-content {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.preset-section {
		text-align: center;
	}

	.preset-label {
		color: #495057;
		margin: 0 0 1rem 0;
		font-weight: 500;
	}

	.preset-buttons {
		display: flex;
		gap: 1rem;
		justify-content: center;
	}

	.preset-btn {
		background: white;
		border: 2px solid var(--preset-color);
		padding: 1rem;
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.2s;
		min-width: 80px;
		text-align: center;
		flex: 1;
		max-width: 120px;
	}

	.preset-btn:hover:not(:disabled) {
		background: var(--preset-color);
		color: white;
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.preset-btn.selected {
		background: var(--preset-color);
		color: white;
		box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1);
	}

	.preset-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none !important;
		box-shadow: none !important;
	}

	.preset-label-text {
		display: block;
		font-weight: 600;
		font-size: 0.875rem;
	}

	.preset-range {
		display: block;
		font-size: 0.75rem;
		opacity: 0.8;
		margin-top: 0.25rem;
	}

	.slider-section {
		text-align: center;
	}

	.slider-label {
		color: #495057;
		margin: 0 0 1.5rem 0;
		font-weight: 500;
	}

	.slider-container {
		position: relative;
		margin: 0 1rem;
	}

	.slider-track {
		position: relative;
		height: 8px;
		background: linear-gradient(to right, #28a745 0%, #ffc107 50%, #dc3545 100%);
		border-radius: 4px;
		margin: 1rem 0;
	}

	.slider {
		position: absolute;
		top: -8px;
		left: 0;
		width: 100%;
		height: 24px;
		-webkit-appearance: none;
		appearance: none;
		background: transparent;
		cursor: pointer;
	}

	.slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: white;
		border: 3px solid #007bff;
		cursor: pointer;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
		transition: all 0.2s;
	}

	.slider::-webkit-slider-thumb:hover {
		transform: scale(1.1);
		box-shadow: 0 3px 9px rgba(0, 0, 0, 0.3);
	}

	.slider::-moz-range-thumb {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: white;
		border: 3px solid #007bff;
		cursor: pointer;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
		transition: all 0.2s;
	}

	.slider:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.slider:disabled::-webkit-slider-thumb {
		cursor: not-allowed;
		transform: none;
	}

	.slider-labels {
		display: flex;
		justify-content: space-between;
		color: #6c757d;
		font-size: 0.75rem;
		margin-top: 0.5rem;
	}

	.label-start,
	.label-end {
		text-align: center;
		line-height: 1.2;
	}

	.selection-display {
		margin-top: 1.5rem;
		padding: 1rem;
		background: rgba(var(--severity-color-rgb, 0, 123, 255), 0.1);
		border: 2px solid var(--severity-color);
		border-radius: 12px;
		text-align: center;
	}

	.severity-value {
		font-size: 2rem;
		font-weight: 700;
		color: var(--severity-color);
		margin-bottom: 0.25rem;
	}

	.severity-description {
		color: #495057;
		font-weight: 500;
		font-size: 0.875rem;
	}

	/* Footer */
	.footer {
		border-top: 1px solid #e9ecef;
		padding-top: 1rem;
	}

	.form-summary {
		margin-bottom: 1rem;
		padding: 0.75rem;
		background: #f8f9fa;
		border-radius: 6px;
	}

	.form-status {
		margin: 0;
		font-size: 0.875rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.valid-indicator {
		color: #28a745;
		font-weight: bold;
	}

	.invalid-indicator {
		color: #dc3545;
		font-weight: bold;
	}

	.continue-btn {
		width: 100%;
		background: #6c757d;
		color: white;
		border: none;
		padding: 1rem;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.continue-btn.enabled {
		background: #28a745;
	}

	.continue-btn.enabled:hover:not(:disabled) {
		background: #218838;
		transform: translateY(-1px);
	}

	.continue-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.event-form {
			padding: 0 1rem;
		}

		.location-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: 0.5rem;
		}

		.location-btn {
			padding: 0.5rem 0.25rem;
		}

		.location-text {
			font-size: 0.75rem;
		}

		.preset-buttons {
			flex-direction: column;
			gap: 0.75rem;
		}

		.preset-btn {
			max-width: none;
			padding: 0.75rem;
		}

		.slider-container {
			margin: 0 0.5rem;
		}

		.severity-value {
			font-size: 1.5rem;
		}
	}

	/* Touch-friendly targets */
	@media (pointer: coarse) {
		.preset-btn {
			min-height: 44px;
			padding: 0.75rem;
		}

		.slider::-webkit-slider-thumb {
			width: 32px;
			height: 32px;
		}

		.slider::-moz-range-thumb {
			width: 32px;
			height: 32px;
		}
	}
</style>