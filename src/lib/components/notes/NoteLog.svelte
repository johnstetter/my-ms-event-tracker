<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { addEventNote } from '$lib/services/eventNotesService.js';

	// Props
	export let eventId: string;
	export let onSuccess: () => void = () => {};
	export let onCancel: () => void = () => {};

	// Local state
	let content = '';
	let isSubmitting = false;
	let submissionResult: { success: boolean; error?: string } | null = null;

	const dispatch = createEventDispatcher();

	// Handle submission
	async function handleSubmit() {
		if (!content.trim() || isSubmitting) return;

		isSubmitting = true;
		submissionResult = null;

		try {
			const result = await addEventNote({
				eventId,
				content: content.trim(),
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
			console.error('Note submission error:', error);
			const errorMessage = error instanceof Error ? error.message : 'Failed to add note';
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

	// Handle form submission (Enter key)
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			handleSubmit();
		}
	}

	// Get current step title
	function getStepTitle(): string {
		if (submissionResult) {
			if (submissionResult.success) {
				return 'Note Added!';
			} else {
				return 'Failed to Add Note';
			}
		}
		return isSubmitting ? 'Adding Note...' : 'Add Note';
	}
</script>

<div class="note-log">
	<!-- Header -->
	<div class="header">
		<h2>{getStepTitle()}</h2>
	</div>

	<!-- Main content -->
	<div class="content" class:submitting={isSubmitting}>
		{#if !submissionResult}
			<!-- Note input form -->
			<div class="note-form">
				<div class="note-input">
					<label for="note-content">
						What's happening?
						<span class="note-hint">Add a timestamped observation or thought about this event</span>
					</label>
					<textarea
						id="note-content"
						bind:value={content}
						placeholder="Example: Pain intensity increased after walking. Tried stretching but no improvement yet."
						disabled={isSubmitting}
						rows="4"
						on:keydown={handleKeydown}
					></textarea>
					<div class="input-footer">
						<span class="keyboard-hint">⌘+Enter to save</span>
						<span class="char-count" class:warning={content.length > 500}>
							{content.length}/500
						</span>
					</div>
				</div>

				<div class="form-actions">
					<button
						type="button"
						class="submit-btn primary"
						on:click={handleSubmit}
						disabled={!content.trim() || isSubmitting || content.length > 500}
					>
						{#if isSubmitting}
							Adding...
						{:else}
							Add Note
						{/if}
					</button>

					<button
						type="button"
						class="cancel-btn secondary"
						on:click={onCancel}
						disabled={isSubmitting}
					>
						Cancel
					</button>
				</div>
			</div>

		{:else}
			<!-- Submission result -->
			<div class="submission-state">
				{#if isSubmitting}
					<!-- Loading state -->
					<div class="submitting-content">
						<div class="loading-spinner"></div>
						<h3>Adding note...</h3>
						<p>This should only take a moment</p>
					</div>

				{:else if submissionResult.success}
					<!-- Success state -->
					<div class="success-content">
						<div class="success-icon">📝</div>
						<h3>Note added!</h3>
						<p>Your observation has been logged to the timeline</p>

						<div class="success-summary">
							<div class="summary-item">
								<span class="summary-label">Note:</span>
								<span class="summary-text">{content}</span>
							</div>

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
						<h3>Failed to add note</h3>
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
			</div>
		{/if}
	</div>
</div>

<style>
	.note-log {
		background: white;
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
		max-width: 500px;
		margin: 0 auto;
	}

	/* Header */
	.header {
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

	/* Content area */
	.content {
		min-height: 200px;
		transition: opacity 0.2s;
	}

	.content.submitting {
		pointer-events: none;
	}

	/* Note form */
	.note-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.note-input {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.note-input label {
		color: #495057;
		font-weight: 600;
		font-size: 1rem;
	}

	.note-hint {
		color: #6c757d;
		font-weight: normal;
		font-size: 0.875rem;
		display: block;
		margin-top: 0.25rem;
	}

	.note-input textarea {
		padding: 0.75rem;
		border: 2px solid #e9ecef;
		border-radius: 8px;
		font-family: inherit;
		font-size: 0.875rem;
		line-height: 1.5;
		transition: border-color 0.2s;
		resize: vertical;
		min-height: 100px;
	}

	.note-input textarea:focus {
		outline: none;
		border-color: #007bff;
		box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
	}

	.note-input textarea:disabled {
		opacity: 0.6;
		background: #f8f9fa;
	}

	.input-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.75rem;
		color: #6c757d;
	}

	.keyboard-hint {
		font-style: italic;
	}

	.char-count {
		font-weight: 500;
	}

	.char-count.warning {
		color: #dc3545;
	}

	/* Form actions */
	.form-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.submit-btn,
	.cancel-btn {
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

	.cancel-btn.secondary {
		background: #6c757d;
		color: white;
	}

	.cancel-btn.secondary:hover:not(:disabled) {
		background: #5a6268;
	}

	.submit-btn:disabled,
	.cancel-btn:disabled {
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
		font-size: 3rem;
		line-height: 1;
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
		min-width: 60px;
	}

	.summary-text {
		color: #2c3e50;
		flex: 1;
		word-break: break-word;
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

	.retry-btn {
		padding: 0.75rem 1rem;
		border: none;
		border-radius: 6px;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s;
		font-size: 0.875rem;
		background: #dc3545;
		color: white;
	}

	.retry-btn:hover {
		background: #c82333;
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.note-log {
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
		.cancel-btn {
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