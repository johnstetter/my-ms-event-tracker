<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Intervention } from '$lib/supabase.js';
	import { addEventIntervention } from '$lib/services/interventionService.js';
	import InterventionSelector from './InterventionSelector.svelte';

	// Props
	export let eventId: string;
	// When set, the embedded InterventionSelector filters its choices to
	// interventions that apply to this event type (universal-by-default).
	export let eventTypeId: string | null = null;
	export let onSuccess: () => void = () => {};
	export let onCancel: () => void = () => {};

	// Local state
	let selectedIntervention: Intervention | null = null;
	let notes = '';
	let isSubmitting = false;
	let submissionResult: { success: boolean; error?: string } | null = null;
	let step: 'select' | 'notes' | 'submitting' = 'select';

	const dispatch = createEventDispatcher();

	// Handle intervention selection
	function handleInterventionSelect(intervention: Intervention) {
		selectedIntervention = intervention;
		step = 'notes';
	}

	// Handle back to selection
	function goBackToSelection() {
		step = 'select';
		selectedIntervention = null;
		notes = '';
		submissionResult = null;
	}

	// Handle submission
	async function handleSubmit() {
		if (!selectedIntervention || isSubmitting) return;

		step = 'submitting';
		isSubmitting = true;
		submissionResult = null;

		try {
			const result = await addEventIntervention({
				eventId,
				interventionId: selectedIntervention.id,
				notes: notes.trim() || undefined,
			});

			submissionResult = result;

			if (result.success) {
				// Show success briefly, then call success handler
				setTimeout(() => {
					onSuccess();
					dispatch('success', result.data);
				}, 1500);
			}
		} catch (error) {
			console.error('Intervention submission error:', error);
			const errorMessage = error instanceof Error ? error.message : 'Failed to add intervention';
			submissionResult = { success: false, error: errorMessage };
		} finally {
			isSubmitting = false;
		}
	}

	// Handle retry after error
	function retrySubmission() {
		submissionResult = null;
		handleSubmit();
	}

	// Handle skip notes (submit without notes)
	function skipNotes() {
		notes = '';
		handleSubmit();
	}

	// Get step title
	function getStepTitle(currentStep: string): string {
		switch (currentStep) {
			case 'select': return 'Select Intervention';
			case 'notes': return 'Add Notes (Optional)';
			case 'submitting': return 'Adding Intervention...';
			default: return 'Add Intervention';
		}
	}
</script>

<div class="intervention-log">
	<!-- Header -->
	<div class="header">
		<h2>{getStepTitle(step)}</h2>
		{#if step !== 'select'}
			<button type="button" class="back-btn" on:click={goBackToSelection} disabled={isSubmitting}>
				← Back
			</button>
		{/if}
	</div>

	<!-- Main content -->
	<div class="content" class:submitting={isSubmitting}>
		{#if step === 'select'}
			<InterventionSelector
				{eventTypeId}
				disabled={isSubmitting}
				onSelect={handleInterventionSelect}
			/>

		{:else if step === 'notes'}
			<div class="notes-form">
				<div class="selected-intervention">
					<h4>Selected: {selectedIntervention?.name}</h4>
					<p class="intervention-category">{selectedIntervention?.category}</p>
				</div>

				<div class="notes-input">
					<label for="intervention-notes">
						Notes (Optional)
						<span class="notes-hint">e.g., dosage, duration, effectiveness</span>
					</label>
					<textarea
						id="intervention-notes"
						bind:value={notes}
						placeholder="Add any notes about this intervention..."
						disabled={isSubmitting}
						rows="3"
					></textarea>
				</div>

				<div class="form-actions">
					<button
						type="button"
						class="submit-btn primary"
						on:click={handleSubmit}
						disabled={isSubmitting}
					>
						Add Intervention
					</button>

					{#if !notes.trim()}
						<button
							type="button"
							class="skip-btn secondary"
							on:click={skipNotes}
							disabled={isSubmitting}
						>
							Skip Notes
						</button>
					{/if}
				</div>
			</div>

		{:else if step === 'submitting'}
			<div class="submission-state">
				{#if isSubmitting}
					<!-- Loading state -->
					<div class="submitting-content">
						<div class="loading-spinner"></div>
						<h3>Adding intervention...</h3>
						<p>This should only take a moment</p>
					</div>

				{:else if submissionResult}
					{#if submissionResult.success}
						<!-- Success state -->
						<div class="success-content">
							<div class="success-icon">✓</div>
							<h3>Intervention added!</h3>
							<p>{selectedIntervention?.name} has been logged</p>

							<div class="success-summary">
								<div class="summary-item">
									<span class="summary-label">Intervention:</span>
									<span class="summary-text">{selectedIntervention?.name}</span>
								</div>

								{#if notes.trim()}
									<div class="summary-item">
										<span class="summary-label">Notes:</span>
										<span class="summary-text">{notes.trim()}</span>
									</div>
								{/if}

								<div class="summary-item">
									<span class="summary-label">Time:</span>
									<span class="summary-text">Just now</span>
								</div>
							</div>
						</div>

					{:else}
						<!-- Error state -->
						<div class="error-content">
							<div class="error-icon">⚠</div>
							<h3>Failed to add intervention</h3>
							<p class="error-message">{submissionResult.error}</p>

							<div class="error-actions">
								<button type="button" class="retry-btn" on:click={retrySubmission}>
									Try Again
								</button>
								<button type="button" class="cancel-btn" on:click={onCancel}>
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
	{#if step !== 'submitting' || (submissionResult && !submissionResult.success)}
		<div class="footer">
			<button type="button" class="cancel-link" on:click={onCancel} disabled={isSubmitting}>
				Cancel
			</button>
		</div>
	{/if}
</div>

<style>
	.intervention-log {
		background: white;
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
		max-width: 500px;
		margin: 0 auto;
	}

	/* Header */
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid #e9ecef;
	}

	.header h2 {
		color: #2c3e50;
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.back-btn {
		background: none;
		border: none;
		color: #007bff;
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 4px;
		font-size: 0.875rem;
		transition: background-color 0.2s;
	}

	.back-btn:hover:not(:disabled) {
		background: #f8f9fa;
	}

	.back-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Content area */
	.content {
		min-height: 200px;
		transition: opacity 0.2s;
	}

	.content.submitting {
		pointer-events: none;
	}

	/* Notes form */
	.notes-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.selected-intervention {
		background: #f8f9fa;
		padding: 1rem;
		border-radius: 8px;
		border: 1px solid #e9ecef;
	}

	.selected-intervention h4 {
		color: #2c3e50;
		margin: 0 0 0.25rem 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.intervention-category {
		color: #6c757d;
		margin: 0;
		font-size: 0.875rem;
	}

	.notes-input {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.notes-input label {
		color: #495057;
		font-weight: 500;
		font-size: 0.875rem;
	}

	.notes-hint {
		color: #6c757d;
		font-weight: normal;
		font-size: 0.75rem;
		display: block;
		margin-top: 0.25rem;
	}

	.notes-input textarea {
		padding: 0.75rem;
		border: 2px solid #e9ecef;
		border-radius: 8px;
		font-family: inherit;
		font-size: 0.875rem;
		line-height: 1.4;
		transition: border-color 0.2s;
		resize: vertical;
		min-height: 80px;
	}

	.notes-input textarea:focus {
		outline: none;
		border-color: #007bff;
		box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
	}

	.notes-input textarea:disabled {
		opacity: 0.6;
		background: #f8f9fa;
	}

	/* Form actions */
	.form-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.submit-btn,
	.skip-btn {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		flex: 1;
		min-width: 120px;
	}

	.submit-btn.primary {
		background: #28a745;
		color: white;
	}

	.submit-btn.primary:hover:not(:disabled) {
		background: #218838;
		transform: translateY(-1px);
	}

	.skip-btn.secondary {
		background: #6c757d;
		color: white;
	}

	.skip-btn.secondary:hover:not(:disabled) {
		background: #5a6268;
	}

	.submit-btn:disabled,
	.skip-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none !important;
	}

	/* Submission states */
	.submission-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 200px;
		text-align: center;
	}

	.submitting-content,
	.success-content,
	.error-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		max-width: 300px;
	}

	/* Loading state */
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

	/* Success state */
	.success-icon {
		width: 3rem;
		height: 3rem;
		background: #28a745;
		color: white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		font-weight: bold;
	}

	.success-content h3 {
		color: #28a745;
		margin: 0;
		font-size: 1.25rem;
	}

	.success-summary {
		background: #f8f9fa;
		padding: 1rem;
		border-radius: 8px;
		width: 100%;
		margin-top: 0.5rem;
	}

	.summary-item {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		padding: 0.25rem 0;
		font-size: 0.875rem;
	}

	.summary-label {
		color: #6c757d;
		font-weight: 500;
		min-width: 80px;
	}

	.summary-text {
		color: #2c3e50;
		flex: 1;
	}

	/* Error state */
	.error-icon {
		width: 3rem;
		height: 3rem;
		background: #dc3545;
		color: white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		font-weight: bold;
	}

	.error-content h3 {
		color: #dc3545;
		margin: 0;
		font-size: 1.25rem;
	}

	.error-message {
		color: #6c757d;
		margin: 0;
		font-size: 0.875rem;
	}

	.error-actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}

	.retry-btn,
	.cancel-btn {
		padding: 0.75rem 1rem;
		border: none;
		border-radius: 6px;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s;
		font-size: 0.875rem;
	}

	.retry-btn {
		background: #dc3545;
		color: white;
	}

	.retry-btn:hover {
		background: #c82333;
	}

	.cancel-btn {
		background: #6c757d;
		color: white;
	}

	.cancel-btn:hover {
		background: #5a6268;
	}

	/* Footer */
	.footer {
		margin-top: 1.5rem;
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

	.cancel-link:hover:not(:disabled) {
		color: #495057;
	}

	.cancel-link:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.intervention-log {
			padding: 1rem;
			margin: 0 0.5rem;
		}

		.header h2 {
			font-size: 1.1rem;
		}

		.form-actions {
			flex-direction: column;
		}

		.submit-btn,
		.skip-btn {
			min-width: auto;
		}

		.error-actions {
			flex-direction: column;
			width: 100%;
		}

		.content {
			min-height: 150px;
		}

		.submission-state {
			min-height: 150px;
		}
	}
</style>