<script lang="ts">
	export let value: string = '';
	export let disabled: boolean = false;
	export let maxLength: number = 500;
	export let label: string = 'Add a note (optional)';
	export let placeholder: string = "Anything you want to remember about this — what triggered it, what you noticed, what you tried";

	$: warning = value.length >= Math.floor(maxLength * 0.9);
</script>

<div class="note-input">
	<label for="quick-log-note">
		{label}
		<span class="hint">Saved as the first entry on this event's timeline</span>
	</label>
	<textarea
		id="quick-log-note"
		bind:value
		{placeholder}
		{disabled}
		maxlength={maxLength}
		rows="3"
	></textarea>
	<div class="input-footer">
		<span class="char-count" class:warning>{value.length}/{maxLength}</span>
	</div>
</div>

<style>
	.note-input {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.note-input label {
		color: #495057;
		font-weight: 600;
		font-size: 0.95rem;
	}

	.hint {
		color: #6c757d;
		font-weight: normal;
		font-size: 0.8rem;
		display: block;
		margin-top: 0.25rem;
	}

	textarea {
		padding: 0.75rem;
		border: 2px solid #e9ecef;
		border-radius: 8px;
		font-family: inherit;
		font-size: 16px;
		line-height: 1.5;
		transition: border-color 0.2s;
		resize: vertical;
		min-height: 80px;
		width: 100%;
		box-sizing: border-box;
	}

	textarea:focus {
		outline: none;
		border-color: #007bff;
		box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
	}

	textarea:disabled {
		opacity: 0.6;
		background: #f8f9fa;
	}

	.input-footer {
		display: flex;
		justify-content: flex-end;
		font-size: 0.75rem;
		color: #6c757d;
	}

	.char-count {
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}

	.char-count.warning {
		color: #dc3545;
	}
</style>
