<script lang="ts">
	import { quickLogStore, quickLogActions } from '$lib/stores/quickLog.js';
	import NoteInput from './NoteInput.svelte';

	// Props
	export let disabled = false;

	let localNote: string = ($quickLogStore.customFields.note as string) ?? '';
	$: quickLogActions.setCustomField('note', localNote);

	// Define bowel movement field interface
	interface BowelMovementFields {
		duration: 'Quick (<5 min)' | 'Normal (5-15 min)' | 'Extended (15+ min)' | null;
		consistency: 'Hard' | 'Normal' | 'Loose' | null;
		amount: number;
	}

	// Reactive values from store
	$: state = $quickLogStore;

	// Get current form values
	$: formData = {
		duration: (state.customFields.duration as BowelMovementFields['duration']) || null,
		consistency: (state.customFields.consistency as BowelMovementFields['consistency']) || null,
		amount: (state.customFields.amount as number) || 1
	} satisfies BowelMovementFields;

	// Check if form is valid (duration and consistency required)
	$: isValid = formData.duration !== null && formData.consistency !== null;

	// Duration options
	const durationOptions: Array<{label: string, value: BowelMovementFields['duration']}> = [
		{ label: 'Quick (<5 min)', value: 'Quick (<5 min)' },
		{ label: 'Normal (5-15 min)', value: 'Normal (5-15 min)' },
		{ label: 'Extended (15+ min)', value: 'Extended (15+ min)' }
	];

	// Consistency options
	const consistencyOptions: Array<{label: string, value: BowelMovementFields['consistency']}> = [
		{ label: 'Hard', value: 'Hard' },
		{ label: 'Normal', value: 'Normal' },
		{ label: 'Loose', value: 'Loose' }
	];

	// Handle duration selection
	function selectDuration(value: BowelMovementFields['duration']) {
		if (disabled || !value) return;
		quickLogActions.setCustomField('duration', value);
	}

	// Handle consistency selection
	function selectConsistency(value: BowelMovementFields['consistency']) {
		if (disabled || !value) return;
		quickLogActions.setCustomField('consistency', value);
	}

	// Handle amount change
	function changeAmount(delta: number) {
		if (disabled) return;
		const newAmount = Math.max(0, Math.min(20, formData.amount + delta));
		quickLogActions.setCustomField('amount', newAmount);
	}

	// Handle amount input
	function handleAmountInput(event: Event) {
		if (disabled) return;
		const target = event.target as HTMLInputElement;
		const value = Math.max(0, Math.min(20, parseInt(target.value) || 0));
		quickLogActions.setCustomField('amount', value);
	}

	// Continue to next step
	function continueFlow() {
		if (disabled || !isValid) return;
		quickLogActions.continueFromCustomFields();
	}

	// Go back to previous step
	function goBack() {
		if (disabled) return;
		quickLogActions.goBack();
	}
</script>

<div class="bowel-movement-form">
	<div class="header">
		<button type="button" class="back-btn" on:click={goBack} disabled={disabled}>
			← Back
		</button>
		<h3>Bowel Movement Details</h3>
	</div>

	<div class="form-content">
		<!-- Duration Selection -->
		<div class="field-group">
			<h4 class="field-title">Duration <span class="required">*</span></h4>
			<p class="field-description">How long did it take?</p>

			<div class="button-grid">
				{#each durationOptions as option (option.value)}
					<button
						type="button"
						class="option-btn"
						class:selected={formData.duration === option.value}
						disabled={disabled}
						on:click={() => selectDuration(option.value)}
					>
						{option.label}
					</button>
				{/each}
			</div>
		</div>

		<!-- Consistency Selection -->
		<div class="field-group">
			<h4 class="field-title">Consistency <span class="required">*</span></h4>
			<p class="field-description">What was the consistency?</p>

			<div class="button-grid">
				{#each consistencyOptions as option (option.value)}
					<button
						type="button"
						class="option-btn"
						class:selected={formData.consistency === option.value}
						disabled={disabled}
						on:click={() => selectConsistency(option.value)}
					>
						{option.label}
					</button>
				{/each}
			</div>
		</div>

		<!-- Amount Selection -->
		<div class="field-group">
			<h4 class="field-title">Amount</h4>
			<p class="field-description">Number of flushes (0-20)</p>

			<div class="number-input-group">
				<button
					type="button"
					class="number-btn"
					class:disabled
					disabled={disabled || formData.amount <= 0}
					on:click={() => changeAmount(-1)}
				>
					−
				</button>
				<input
					type="number"
					class="field-number"
					class:disabled
					disabled={disabled}
					min="0"
					max="20"
					value={formData.amount}
					on:input={handleAmountInput}
				/>
				<button
					type="button"
					class="number-btn"
					class:disabled
					disabled={disabled || formData.amount >= 20}
					on:click={() => changeAmount(1)}
				>
					+
				</button>
			</div>
		</div>

		<!-- Note (optional) -->
		<div class="field-group">
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
					Please select duration and consistency
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
			{isValid ? 'Continue' : 'Select required fields'}
		</button>
	</div>
</div>

<style>
	.bowel-movement-form {
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

	.field-group {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.field-title {
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

	.field-description {
		color: #6c757d;
		margin: 0;
		font-size: 0.875rem;
	}

	/* Button grid for duration/consistency */
	.button-grid {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 0.75rem;
	}

	.option-btn {
		background: white;
		border: 2px solid #e9ecef;
		padding: 1rem;
		border-radius: 8px;
		cursor: pointer;
		font-size: 0.875rem;
		font-weight: 500;
		color: #495057;
		transition: all 0.2s;
		text-align: center;
	}

	.option-btn:hover:not(:disabled) {
		border-color: #007bff;
		color: #007bff;
	}

	.option-btn.selected {
		background: #007bff;
		border-color: #007bff;
		color: white;
		box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
	}

	.option-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Number input group for amount */
	.number-input-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		max-width: 200px;
	}

	.number-btn {
		background: #007bff;
		color: white;
		border: none;
		width: 3rem;
		height: 3rem;
		border-radius: 8px;
		font-size: 1.25rem;
		font-weight: bold;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.number-btn:hover:not(:disabled) {
		background: #0056b3;
		transform: scale(1.05);
	}

	.number-btn:disabled {
		background: #6c757d;
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
	}

	.field-number {
		flex: 1;
		padding: 0.75rem;
		border: 2px solid #e9ecef;
		border-radius: 8px;
		font-size: 1.25rem;
		font-weight: 600;
		text-align: center;
		min-width: 80px;
	}

	.field-number:focus {
		outline: none;
		border-color: #007bff;
		box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
	}

	.field-number.disabled {
		background: #f8f9fa;
		opacity: 0.6;
		cursor: not-allowed;
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
		.bowel-movement-form {
			padding: 0 1rem;
		}

		.button-grid {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}

		.option-btn {
			padding: 0.875rem;
			font-size: 1rem;
		}

		.number-input-group {
			max-width: none;
		}

		.number-btn {
			width: 2.5rem;
			height: 2.5rem;
			font-size: 1rem;
		}
	}
</style>