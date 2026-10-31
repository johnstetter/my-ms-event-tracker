<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { quickLogStore, quickLogActions, getElapsedTime, type QuickLogStep } from '$lib/stores/quickLog.js';
	import { createQuickEvent } from '$lib/services/eventService.js';
	import { addEventNote } from '$lib/services/eventNotesService.js';
	import EventTypeSelector from './EventTypeSelector.svelte';
	import BowelMovementForm from './BowelMovementForm.svelte';
	import SymptomForm from './SymptomForm.svelte';
	import NoteInput from './NoteInput.svelte';

	// Local state
	let mounted = false;
	let submissionResult: { success: boolean; error?: string } | null = null;
	let noteWarning: string | null = null;
	let fallbackNote: string = '';

	// Reactive values from store
	$: state = $quickLogStore;
	$: isSubmitting = state.isSubmitting;
	$: currentStep = state.step;

	// Initialize component
	onMount(() => {
		mounted = true;
		// Start the quick log flow
		quickLogActions.start();
	});

	// Auto-submit when step becomes 'submitting'
	$: if (mounted && currentStep === 'submitting' && !isSubmitting) {
		handleSubmission();
	}

	// Handle the submission process
	async function handleSubmission() {
		if (!state.selectedType || isSubmitting) return;

		quickLogActions.setSubmitting(true);
		submissionResult = null;
		noteWarning = null;

		try {
			// Pull the note out of customFields so it doesn't leak into events.attributes
			const { note: rawNote, ...customFieldsWithoutNote } = state.customFields;
			const trimmedNote = (typeof rawNote === 'string' ? rawNote : '').trim();

			// Transform data based on event type
			const eventData: any = {
				eventType: state.selectedType,
				startedAt: new Date().toISOString()
			};

			if (isBowelMovementType(state.selectedType)) {
				// For bowel movements, pass remaining custom fields as attributes
				eventData.customFields = customFieldsWithoutNote;
			} else if (isSymptomType(state.selectedType)) {
				// For events with location/severity, extract from custom fields
				eventData.severity = customFieldsWithoutNote.severity || null;
				eventData.locations = customFieldsWithoutNote.locations || undefined;
			} else {
				// Fallback for other event types
				eventData.customFields = customFieldsWithoutNote;
			}

			const result = await createQuickEvent(eventData);

			submissionResult = result;

			if (result.success) {
				// Attach inline note as the first timeline entry, if provided
				if (trimmedNote && result.event?.id) {
					const noteResult = await addEventNote({
						eventId: result.event.id,
						content: trimmedNote
					});
					if (!noteResult.success) {
						noteWarning = noteResult.error || 'Note could not be saved';
					}
				}

				// Show success feedback briefly, then reset
				setTimeout(() => {
					quickLogActions.reset();
					submissionResult = null;
					noteWarning = null;
					fallbackNote = '';
				}, 2000);
			} else {
				quickLogActions.setError(result.error || 'Unknown error occurred');
			}
		} catch (error) {
			console.error('Submission error:', error);
			const errorMessage = error instanceof Error ? error.message : 'Failed to submit event';
			quickLogActions.setError(errorMessage);
			submissionResult = { success: false, error: errorMessage };
		} finally {
			quickLogActions.setSubmitting(false);
		}
	}

	// Handle retry after error
	function retrySubmission() {
		submissionResult = null;
		quickLogActions.setError(null);
		handleSubmission();
	}

	// Handle cancel/reset
	function cancelQuickLog() {
		quickLogActions.reset();
		submissionResult = null;
	}

	// Get step title for progress indicator
	function getStepTitle(step: QuickLogStep): string {
		switch (step) {
			case 'type-selection': return 'Select Event';
			case 'custom-fields':
				if (isBowelMovementType(state.selectedType)) {
					return 'Bowel Movement Details';
				} else if (isSymptomType(state.selectedType)) {
					return 'Event Details';
				}
				return 'Additional Details';
			case 'submitting': return 'Saving...';
			default: return 'Quick Log';
		}
	}

	// Helper functions to determine form type
	function isBowelMovementType(eventType: any): boolean {
		return eventType?.slug === 'bowel-movement';
	}

	function isSymptomType(eventType: any): boolean {
		return eventType?.has_location || eventType?.has_severity;
	}

	// Get progress percentage for simplified 3-step flow
	function getProgressPercentage(step: QuickLogStep, selectedType: any): number {
		// Simplified flow: type-selection -> custom-fields -> submitting
		const totalSteps = 3;
		let currentStepNumber = 1;

		switch (step) {
			case 'type-selection':
				currentStepNumber = 1;
				break;
			case 'custom-fields':
				currentStepNumber = 2;
				break;
			case 'submitting':
				currentStepNumber = 3;
				break;
		}

		return (currentStepNumber / totalSteps) * 100;
	}

	onDestroy(() => {
		// Clean up if component unmounts during flow
		if (state.step !== 'type-selection') {
			quickLogActions.reset();
		}
	});
</script>

<div class="quick-log">
	<!-- Progress header -->
	<div class="progress-header">
		<div class="progress-info">
			<h2>{getStepTitle(currentStep)}</h2>
			{#if state.startTime}
				<span class="timer">{Math.round(getElapsedTime(state) / 1000)}s</span>
			{/if}
		</div>

		<div class="progress-bar">
			<div
				class="progress-fill"
				style="width: {getProgressPercentage(currentStep, state.selectedType)}%"
			></div>
		</div>
	</div>

	<!-- Main content area -->
	<div class="content" class:submitting={isSubmitting}>
		{#if currentStep === 'type-selection'}
			<EventTypeSelector disabled={isSubmitting} />

		{:else if currentStep === 'custom-fields'}
			{#if isBowelMovementType(state.selectedType)}
				<BowelMovementForm disabled={isSubmitting} />
			{:else if isSymptomType(state.selectedType)}
				<SymptomForm disabled={isSubmitting} />
			{:else}
				<!-- Fallback for event types with no required custom fields -->
				<div class="unsupported-type">
					<p>This event type doesn't require additional details.</p>
					<div class="fallback-note">
						<NoteInput bind:value={fallbackNote} disabled={isSubmitting} />
					</div>
					<button
						type="button"
						class="continue-btn"
						on:click={() => {
							quickLogActions.setCustomField('note', fallbackNote);
							quickLogActions.continueFromCustomFields();
						}}
					>
						Continue
					</button>
				</div>
			{/if}

		{:else if currentStep === 'submitting'}
			<div class="submission-state">
				{#if isSubmitting}
					<!-- Loading state -->
					<div class="submitting-content">
						<div class="loading-spinner"></div>
						<h3>Saving your event...</h3>
						<p>This should only take a moment</p>
					</div>

				{:else if submissionResult}
					{#if submissionResult.success}
						<!-- Success state -->
						<div class="success-content">
							<div class="success-icon">✓</div>
							<h3>Event saved successfully!</h3>
							<p>Your {state.selectedType?.name} has been logged</p>

							<!-- Summary -->
							<div class="submission-summary">
								<div class="summary-item">
									<span class="summary-icon">{state.selectedType?.icon}</span>
									<span class="summary-text">{state.selectedType?.name}</span>
								</div>

								<!-- Show custom fields for bowel movements -->
								{#if isBowelMovementType(state.selectedType)}
									{#if state.customFields.duration}
										<div class="summary-item">
											<span class="summary-label">Duration:</span>
											<span class="summary-text">{state.customFields.duration}</span>
										</div>
									{/if}
									{#if state.customFields.consistency}
										<div class="summary-item">
											<span class="summary-label">Consistency:</span>
											<span class="summary-text">{state.customFields.consistency}</span>
										</div>
									{/if}
									{#if state.customFields.amount}
										<div class="summary-item">
											<span class="summary-label">Amount:</span>
											<span class="summary-text">{state.customFields.amount} flushes</span>
										</div>
									{/if}
								{/if}

								<!-- Show locations and severity for events -->
								{#if isSymptomType(state.selectedType)}
									{#if state.selectedType?.has_location && state.customFields.locations && state.customFields.locations.length > 0}
										<div class="summary-item">
											<span class="summary-label">Location:</span>
											<span class="summary-text">
												{state.customFields.locations.map((l: any) => l.name).join(', ')}
											</span>
										</div>
									{/if}

									{#if state.selectedType?.has_severity && state.customFields.severity}
										<div class="summary-item">
											<span class="summary-label">Severity:</span>
											<span class="summary-text">{state.customFields.severity}/10</span>
										</div>
									{/if}
								{/if}

								<div class="summary-item">
									<span class="summary-label">Time:</span>
									<span class="summary-text">{Math.round(getElapsedTime(state) / 1000)} seconds</span>
								</div>

								{#if noteWarning}
									<div class="summary-item note-warning">
										<span class="summary-label">⚠ Note:</span>
										<span class="summary-text">Event saved, but the note didn't attach: {noteWarning}</span>
									</div>
								{:else if state.customFields.note && (state.customFields.note as string).trim()}
									<div class="summary-item">
										<span class="summary-label">📝 Note:</span>
										<span class="summary-text">Added to timeline</span>
									</div>
								{/if}
							</div>
						</div>

					{:else}
						<!-- Error state -->
						<div class="error-content">
							<div class="error-icon">⚠</div>
							<h3>Failed to save event</h3>
							<p class="error-message">{submissionResult.error}</p>

							<div class="error-actions">
								<button type="button" class="retry-btn" on:click={retrySubmission}>
									Try Again
								</button>
								<button type="button" class="cancel-btn" on:click={cancelQuickLog}>
									Cancel
								</button>
							</div>
						</div>
					{/if}
				{/if}
			</div>
		{/if}
	</div>

	<!-- Footer with cancel option -->
	{#if currentStep !== 'type-selection' && !isSubmitting && !submissionResult?.success}
		<div class="footer">
			<button type="button" class="cancel-link" on:click={cancelQuickLog}>
				Cancel quick log
			</button>
		</div>
	{/if}
</div>

<style>
	.quick-log {
		background: white;
		border-radius: 16px;
		padding: 1.5rem;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
		max-width: 600px;
		margin: 0 auto;
	}

	/* Progress header */
	.progress-header {
		margin-bottom: 2rem;
	}

	.progress-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.progress-info h2 {
		color: #2c3e50;
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
	}

	.timer {
		background: #f8f9fa;
		color: #495057;
		padding: 0.25rem 0.75rem;
		border-radius: 20px;
		font-size: 0.875rem;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}

	.progress-bar {
		width: 100%;
		height: 6px;
		background: #e9ecef;
		border-radius: 3px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #007bff 0%, #28a745 100%);
		border-radius: 3px;
		transition: width 0.3s ease;
	}

	/* Content area */
	.content {
		min-height: 300px;
		transition: opacity 0.2s;
	}

	.content.submitting {
		pointer-events: none;
	}

	/* Unsupported type fallback */
	.unsupported-type {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 2rem;
		text-align: center;
		background: #f8f9fa;
		border-radius: 12px;
		border: 1px solid #e9ecef;
	}

	.unsupported-type p {
		margin: 0;
		color: #495057;
	}

	.fallback-note {
		width: 100%;
		max-width: 480px;
	}

	.note-warning .summary-label {
		color: #b58105;
	}

	.unsupported-type .continue-btn {
		background: #28a745;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.unsupported-type .continue-btn:hover {
		background: #218838;
	}

	/* Submission states */
	.submission-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 300px;
		text-align: center;
	}

	.submitting-content,
	.success-content,
	.error-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		max-width: 400px;
	}

	/* Loading state */
	.loading-spinner {
		width: 3rem;
		height: 3rem;
		border: 4px solid #e9ecef;
		border-top: 4px solid #007bff;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	/* Success state */
	.success-icon {
		width: 4rem;
		height: 4rem;
		background: #28a745;
		color: white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 2rem;
		font-weight: bold;
	}

	.success-content h3 {
		color: #28a745;
		margin: 0;
	}

	.submission-summary {
		background: #f8f9fa;
		padding: 1rem;
		border-radius: 8px;
		width: 100%;
		margin-top: 1rem;
	}

	.summary-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0;
		font-size: 0.875rem;
	}

	.summary-icon {
		font-size: 1.25rem;
	}

	.summary-label {
		color: #6c757d;
		font-weight: 500;
	}

	.summary-text {
		color: #2c3e50;
	}

	/* Error state */
	.error-icon {
		width: 4rem;
		height: 4rem;
		background: #dc3545;
		color: white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 2rem;
		font-weight: bold;
	}

	.error-content h3 {
		color: #dc3545;
		margin: 0;
	}

	.error-message {
		color: #6c757d;
		margin: 0;
	}

	.error-actions {
		display: flex;
		gap: 1rem;
		margin-top: 1rem;
	}

	.retry-btn {
		background: #dc3545;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.retry-btn:hover {
		background: #c82333;
	}

	.cancel-btn {
		background: #6c757d;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.cancel-btn:hover {
		background: #5a6268;
	}

	/* Footer */
	.footer {
		margin-top: 2rem;
		text-align: center;
		padding-top: 1rem;
		border-top: 1px solid #e9ecef;
	}

	.cancel-link {
		background: none;
		border: none;
		color: #6c757d;
		text-decoration: underline;
		cursor: pointer;
		font-size: 0.875rem;
		padding: 0.5rem 1rem;
		transition: color 0.2s;
	}

	.cancel-link:hover {
		color: #495057;
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.quick-log {
			padding: 1rem;
			margin: 0 0.5rem;
		}

		.progress-info h2 {
			font-size: 1.25rem;
		}

		.timer {
			font-size: 0.75rem;
			padding: 0.25rem 0.5rem;
		}

		.content {
			min-height: 250px;
		}

		.submission-state {
			min-height: 250px;
		}

		.error-actions {
			flex-direction: column;
			width: 100%;
		}
	}
</style>