<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { EventWithDetails } from '$lib/supabase.js';

	// Props
	export let event: EventWithDetails;

	// Local state
	let resolutionNote = '';
	let isResolving = false;
	let error: string | null = null;

	const dispatch = createEventDispatcher();

	// Calculate duration
	function formatDuration(startedAt: string): string {
		const start = new Date(startedAt);
		const now = new Date();
		const durationMs = now.getTime() - start.getTime();

		const hours = Math.floor(durationMs / (1000 * 60 * 60));
		const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

		if (hours > 0) {
			return `${hours}h ${minutes}m`;
		}
		return `${minutes}m`;
	}

	// Handle form submission
	function handleSubmit() {
		if (isResolving) return;

		error = null;

		// Dispatch the resolution request with optional note
		dispatch('resolve', {
			resolutionNote: resolutionNote.trim() || undefined
		});
	}

	// Handle cancel
	function handleCancel() {
		dispatch('cancel');
	}

	// Handle keyboard shortcuts
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			handleCancel();
		} else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			handleSubmit();
		}
	}

	// Focus management
	let noteTextarea: HTMLTextAreaElement;
	function focusTextarea() {
		if (noteTextarea) {
			noteTextarea.focus();
		}
	}

	// Call focus after component mounts
	setTimeout(focusTextarea, 100);
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="resolve-modal">
	<div class="modal-header">
		<h2>Resolve Event</h2>
		<button
			type="button"
			class="close-btn"
			on:click={handleCancel}
			aria-label="Cancel"
		>
			✕
		</button>
	</div>

	<div class="modal-body">
		<!-- Event Context -->
		<div class="event-context">
			<div class="event-info">
				<span class="event-icon">{event.event_type?.icon || '🔵'}</span>
				<div class="event-details">
					<h3>{event.event_type?.name || 'Event'}</h3>
					<p class="event-meta">
						Ongoing for {formatDuration(event.started_at)}
						{#if event.severity}
							<span class="severity">• Severity {event.severity}/10</span>
						{/if}
					</p>
				</div>
			</div>
		</div>

		<!-- Resolution Notes Form -->
		<form on:submit|preventDefault={handleSubmit}>
			<div class="form-group">
				<label for="resolutionNote" class="form-label">
					Add resolution notes (optional)
				</label>
				<textarea
					id="resolutionNote"
					bind:this={noteTextarea}
					bind:value={resolutionNote}
					class="form-textarea"
					placeholder="Notes about how it resolved, what helped, final thoughts..."
					rows="4"
					disabled={isResolving}
				></textarea>
				<p class="form-hint">
					Press Cmd+Enter (Mac) or Ctrl+Enter (PC) to submit quickly
				</p>
			</div>

			{#if error}
				<div class="error-message">
					<span class="error-icon">⚠️</span>
					<span class="error-text">{error}</span>
				</div>
			{/if}

			<div class="modal-actions">
				<button
					type="button"
					class="btn btn-secondary"
					on:click={handleCancel}
					disabled={isResolving}
				>
					Cancel
				</button>
				<button
					type="submit"
					class="btn btn-primary"
					disabled={isResolving}
				>
					{#if isResolving}
						<span class="loading-spinner"></span>
						Resolving...
					{:else}
						Resolve Event
					{/if}
				</button>
			</div>
		</form>
	</div>
</div>

<style>
	.resolve-modal {
		background: white;
		border-radius: 12px;
		padding: 0;
		width: 100%;
		max-width: 500px;
		max-height: 90vh;
		overflow: hidden;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid #e9ecef;
		background: #f8f9fa;
	}

	.modal-header h2 {
		margin: 0;
		color: #2c3e50;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 1.25rem;
		color: #6c757d;
		cursor: pointer;
		padding: 0.25rem;
		line-height: 1;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition: all 0.2s;
	}

	.close-btn:hover {
		background: #e9ecef;
		color: #495057;
	}

	.modal-body {
		padding: 1.5rem;
	}

	.event-context {
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: #f8f9fa;
		border-radius: 8px;
		border: 1px solid #e9ecef;
	}

	.event-info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.event-icon {
		font-size: 2rem;
		line-height: 1;
	}

	.event-details h3 {
		margin: 0;
		color: #2c3e50;
		font-size: 1.1rem;
		font-weight: 600;
	}

	.event-meta {
		margin: 0.25rem 0 0 0;
		color: #6c757d;
		font-size: 0.9rem;
	}

	.severity {
		font-weight: 500;
		color: #dc3545;
	}

	.form-group {
		margin-bottom: 1rem;
	}

	.form-label {
		display: block;
		margin-bottom: 0.5rem;
		color: #495057;
		font-weight: 500;
		font-size: 0.9rem;
	}

	.form-textarea {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #ced4da;
		border-radius: 6px;
		font-size: 0.9rem;
		line-height: 1.5;
		resize: vertical;
		min-height: 100px;
		transition: border-color 0.2s;
	}

	.form-textarea:focus {
		outline: none;
		border-color: #007bff;
		box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.15);
	}

	.form-textarea:disabled {
		background-color: #f8f9fa;
		opacity: 0.6;
	}

	.form-hint {
		margin: 0.5rem 0 0 0;
		color: #6c757d;
		font-size: 0.8rem;
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background: #f8d7da;
		color: #721c24;
		border: 1px solid #f5c6cb;
		border-radius: 6px;
		margin-bottom: 1rem;
		font-size: 0.875rem;
	}

	.error-icon {
		font-size: 1rem;
		flex-shrink: 0;
	}

	.error-text {
		flex: 1;
		line-height: 1.3;
	}

	.modal-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
	}

	.btn {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 6px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		font-size: 0.9rem;
		min-width: 100px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none !important;
	}

	.btn-secondary {
		background: #6c757d;
		color: white;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #545b62;
		transform: translateY(-1px);
	}

	.btn-primary {
		background: #28a745;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: #1e7e34;
		transform: translateY(-1px);
	}

	.loading-spinner {
		width: 1rem;
		height: 1rem;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top: 2px solid white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.resolve-modal {
			margin: 0.5rem;
			max-width: none;
		}

		.modal-header,
		.modal-body {
			padding: 1rem;
		}

		.event-context {
			padding: 0.75rem;
		}

		.event-info {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.75rem;
			text-align: left;
		}

		.modal-actions {
			flex-direction: column-reverse;
		}

		.btn {
			width: 100%;
		}
	}

	/* Touch targets for mobile */
	@media (pointer: coarse) {
		.btn {
			min-height: 44px;
		}

		.close-btn {
			min-width: 44px;
			min-height: 44px;
		}
	}
</style>