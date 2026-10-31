<script context="module" lang="ts">
	// Exported for consumers that want to type their `options` array.
	export interface ScopeOption {
		id: string;
		label: string;
		sublabel?: string;
		icon?: string;
	}
</script>

<script lang="ts">
	// A multi-select dropdown styled after HistoryFilters.svelte. Used by the
	// admin event-type and intervention pages to edit the scope-tag M2M
	// without leaking concerns into the entity's CRUD interface.

	// Props
	export let label: string;
	export let helpText: string = '';
	export let options: ScopeOption[] = [];
	export let selectedIds: string[] = [];
	export let emptyState: string = 'No options available.';
	export let disabled: boolean = false;
	export let onChange: (ids: string[]) => void = () => {};

	let open = false;

	function toggle(id: string) {
		if (disabled) return;
		const next = selectedIds.includes(id)
			? selectedIds.filter((existing) => existing !== id)
			: [...selectedIds, id];
		selectedIds = next;
		onChange(next);
	}

	$: summary = (() => {
		if (selectedIds.length === 0) return 'Universal (applies to all)';
		if (selectedIds.length === 1) {
			const match = options.find((o) => o.id === selectedIds[0]);
			return match?.label ?? '1 selected';
		}
		return `${selectedIds.length} selected`;
	})();
</script>

<div class="scope-tag-picker">
	<label class="picker-label">{label}</label>
	{#if helpText}
		<p class="picker-help">{helpText}</p>
	{/if}

	{#if options.length === 0}
		<p class="picker-empty">{emptyState}</p>
	{:else}
		<div class="dropdown">
			<button
				type="button"
				class="dropdown-btn"
				class:active={open}
				on:click={() => (open = !open)}
				aria-expanded={open}
				{disabled}
			>
				<span class="dropdown-text">{summary}</span>
				<span class="dropdown-arrow" class:rotated={open}>▼</span>
			</button>

			{#if open}
				<!--
					ARIA note: this is a labeled-checkbox list, not a listbox.
					ARIA listbox requires non-interactive options, but each
					checkbox here is itself interactive — that's incompatible.
					Screen readers handle the standard checkbox-in-label pattern
					correctly without the listbox/option roles.
				-->
				<div class="dropdown-menu">
					{#each options as option (option.id)}
						<label class="dropdown-item">
							<input
								type="checkbox"
								checked={selectedIds.includes(option.id)}
								on:change={() => toggle(option.id)}
								{disabled}
							/>
							{#if option.icon}
								<span class="option-icon">{option.icon}</span>
							{/if}
							<span class="option-label">{option.label}</span>
							{#if option.sublabel}
								<span class="option-sublabel">{option.sublabel}</span>
							{/if}
						</label>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.scope-tag-picker {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.picker-label {
		font-weight: 500;
		color: #495057;
		font-size: 0.875rem;
	}

	.picker-help {
		font-size: 0.75rem;
		color: #6c757d;
		margin: 0;
	}

	.picker-empty {
		font-size: 0.875rem;
		color: #6c757d;
		font-style: italic;
		padding: 0.75rem;
		background: #f8f9fa;
		border-radius: 6px;
		border: 1px dashed #ced4da;
		margin: 0;
	}

	.dropdown {
		position: relative;
	}

	.dropdown-btn {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #ced4da;
		border-radius: 6px;
		background: white;
		font-size: 1rem;
		cursor: pointer;
		transition: border-color 0.2s;
	}

	.dropdown-btn:hover:not(:disabled) {
		border-color: #adb5bd;
	}

	.dropdown-btn.active {
		border-color: #007bff;
		box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
	}

	.dropdown-btn:disabled {
		background: #f8f9fa;
		color: #6c757d;
		cursor: not-allowed;
	}

	.dropdown-text {
		flex: 1;
		text-align: left;
		color: #495057;
	}

	.dropdown-arrow {
		color: #6c757d;
		font-size: 0.75rem;
		transition: transform 0.2s;
	}

	.dropdown-arrow.rotated {
		transform: rotate(180deg);
	}

	.dropdown-menu {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		margin-top: 0.25rem;
		max-height: 240px;
		overflow-y: auto;
		background: white;
		border: 1px solid #ced4da;
		border-radius: 6px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		z-index: 10;
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		cursor: pointer;
		transition: background-color 0.15s;
	}

	.dropdown-item:hover {
		background: #f8f9fa;
	}

	.dropdown-item input[type='checkbox'] {
		cursor: pointer;
	}

	.option-icon {
		font-size: 1rem;
	}

	.option-label {
		color: #2c3e50;
		font-size: 0.875rem;
		flex: 1;
	}

	.option-sublabel {
		color: #6c757d;
		font-size: 0.75rem;
	}
</style>
