<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { eventTypes } from '$lib/stores/eventTypes.js';

	export let eventTypeIds: string[] = [];
	export let startDate = '';
	export let endDate = '';
	export let searchTerm = '';
	export let sortBy: 'started_at' | 'severity' = 'started_at';
	export let sortOrder: 'asc' | 'desc' = 'desc';
	export let limit = 25;

	const dispatch = createEventDispatcher();

	// Local filter state
	let localEventTypeIds = [...eventTypeIds];
	let localStartDate = startDate;
	let localEndDate = endDate;
	let localSearchTerm = searchTerm;
	let localSortBy = sortBy;
	let localSortOrder = sortOrder;
	let localLimit = limit;

	// UI state
	let showEventTypeDropdown = false;
	let showMobileFilters = false;
	let searchDebounceTimeout: number | undefined;

	// Date range presets
	const datePresets = [
		{ label: 'Last week', value: 'week', days: 7 },
		{ label: 'Last month', value: 'month', days: 30 },
		{ label: 'Last 3 months', value: '3months', days: 90 },
		{ label: 'Last 6 months', value: '6months', days: 180 },
		{ label: 'Last year', value: 'year', days: 365 }
	];

	// Computed values
	$: hasActiveFilters =
		localEventTypeIds.length > 0 ||
		localStartDate ||
		localEndDate ||
		localSearchTerm ||
		localSortBy !== 'started_at' ||
		localSortOrder !== 'desc' ||
		localLimit !== 25;

	$: selectedEventTypes = $eventTypes.filter(et => localEventTypeIds.includes(et.id));

	// Apply date preset
	function applyDatePreset(preset: { days: number }) {
		const endDate = new Date();
		const startDate = new Date();
		startDate.setDate(endDate.getDate() - preset.days);

		localStartDate = startDate.toISOString().split('T')[0];
		localEndDate = endDate.toISOString().split('T')[0];
		emitFiltersChange();
	}

	// Handle event type selection
	function toggleEventType(eventTypeId: string) {
		if (localEventTypeIds.includes(eventTypeId)) {
			localEventTypeIds = localEventTypeIds.filter(id => id !== eventTypeId);
		} else {
			localEventTypeIds = [...localEventTypeIds, eventTypeId];
		}
		emitFiltersChange();
	}

	// Handle search with debounce
	function handleSearchInput(event: Event) {
		const target = event.target as HTMLInputElement;
		localSearchTerm = target.value;

		if (searchDebounceTimeout) {
			clearTimeout(searchDebounceTimeout);
		}

		searchDebounceTimeout = setTimeout(() => {
			emitFiltersChange();
		}, 300) as any;
	}

	// Emit filter changes
	function emitFiltersChange() {
		dispatch('filtersChange', {
			filters: {
				eventTypeIds: localEventTypeIds,
				startDate: localStartDate || null,
				endDate: localEndDate || null,
				searchTerm: localSearchTerm || null,
				sortBy: localSortBy,
				sortOrder: localSortOrder,
				limit: localLimit
			}
		});
	}

	// Handle sort change
	function handleSortChange() {
		emitFiltersChange();
	}

	// Handle limit change
	function handleLimitChange() {
		emitFiltersChange();
	}

	// Clear all filters
	function clearAllFilters() {
		localEventTypeIds = [];
		localStartDate = '';
		localEndDate = '';
		localSearchTerm = '';
		localSortBy = 'started_at';
		localSortOrder = 'desc';
		localLimit = 25;
		showEventTypeDropdown = false;
		showMobileFilters = false;

		dispatch('clearFilters');
	}

	// Close dropdown when clicking outside
	function handleClickOutside(event: Event) {
		const target = event.target as Element;
		if (!target.closest('.event-type-filter')) {
			showEventTypeDropdown = false;
		}
	}

	// Update local state when props change
	$: {
		localEventTypeIds = [...eventTypeIds];
		localStartDate = startDate;
		localEndDate = endDate;
		localSearchTerm = searchTerm;
		localSortBy = sortBy;
		localSortOrder = sortOrder;
		localLimit = limit;
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		return () => {
			document.removeEventListener('click', handleClickOutside);
			if (searchDebounceTimeout) {
				clearTimeout(searchDebounceTimeout);
			}
		};
	});
</script>

<div class="history-filters">
	<!-- Desktop Filters -->
	<div class="desktop-filters">
		<!-- Search Input -->
		<div class="filter-group search-filter">
			<label for="search-input" class="filter-label">Search events</label>
			<input
				id="search-input"
				type="text"
				value={localSearchTerm}
				on:input={handleSearchInput}
				placeholder="Search in notes..."
				class="search-input"
			/>
		</div>

		<!-- Event Type Filter -->
		<div class="filter-group event-type-filter">
			<label class="filter-label">Event types</label>
			<div class="dropdown">
				<button
					type="button"
					class="dropdown-btn"
					class:active={showEventTypeDropdown}
					on:click={() => showEventTypeDropdown = !showEventTypeDropdown}
					aria-expanded={showEventTypeDropdown}
					aria-haspopup="listbox"
				>
					<span class="dropdown-text">
						{#if selectedEventTypes.length === 0}
							All types
						{:else if selectedEventTypes.length === 1}
							{selectedEventTypes[0].name}
						{:else}
							{selectedEventTypes.length} types
						{/if}
					</span>
					<span class="dropdown-arrow" class:rotated={showEventTypeDropdown}>▼</span>
				</button>

				{#if showEventTypeDropdown}
					<div class="dropdown-menu" role="listbox">
						{#each $eventTypes as eventType (eventType.id)}
							<label class="dropdown-item" role="option">
								<input
									type="checkbox"
									checked={localEventTypeIds.includes(eventType.id)}
									on:change={() => toggleEventType(eventType.id)}
								/>
								<span class="event-type-icon">{eventType.icon}</span>
								<span class="event-type-name">{eventType.name}</span>
							</label>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Date Range -->
		<div class="filter-group date-filter">
			<label class="filter-label">Date range</label>
			<div class="date-controls">
				<div class="date-presets">
					{#each datePresets as preset}
						<button
							type="button"
							class="preset-btn"
							on:click={() => applyDatePreset(preset)}
						>
							{preset.label}
						</button>
					{/each}
				</div>
				<div class="date-inputs">
					<input
						type="date"
						bind:value={localStartDate}
						on:change={emitFiltersChange}
						placeholder="Start date"
						class="date-input"
					/>
					<span class="date-separator">to</span>
					<input
						type="date"
						bind:value={localEndDate}
						on:change={emitFiltersChange}
						placeholder="End date"
						class="date-input"
					/>
				</div>
			</div>
		</div>

		<!-- Sort Controls -->
		<div class="filter-group sort-filter">
			<label class="filter-label">Sort by</label>
			<div class="sort-controls">
				<select bind:value={localSortBy} on:change={handleSortChange} class="sort-select">
					<option value="started_at">Date</option>
					<option value="severity">Severity</option>
				</select>
				<select bind:value={localSortOrder} on:change={handleSortChange} class="sort-select">
					<option value="desc">Newest first</option>
					<option value="asc">Oldest first</option>
				</select>
			</div>
		</div>

		<!-- Per Page -->
		<div class="filter-group limit-filter">
			<label class="filter-label">Per page</label>
			<select bind:value={localLimit} on:change={handleLimitChange} class="limit-select">
				<option value={10}>10</option>
				<option value={25}>25</option>
				<option value={50}>50</option>
				<option value={100}>100</option>
			</select>
		</div>

		<!-- Clear Filters -->
		{#if hasActiveFilters}
			<button type="button" class="clear-filters-btn" on:click={clearAllFilters}>
				Clear All
			</button>
		{/if}
	</div>

	<!-- Mobile Filters Toggle -->
	<div class="mobile-filters-toggle">
		<button
			type="button"
			class="mobile-toggle-btn"
			class:active={showMobileFilters}
			on:click={() => showMobileFilters = !showMobileFilters}
		>
			<span>Filters</span>
			{#if hasActiveFilters}
				<span class="filter-count">({localEventTypeIds.length + (localSearchTerm ? 1 : 0) + (localStartDate || localEndDate ? 1 : 0)})</span>
			{/if}
			<span class="toggle-arrow" class:rotated={showMobileFilters}>▼</span>
		</button>
	</div>

	<!-- Mobile Filters Panel -->
	{#if showMobileFilters}
		<div class="mobile-filters">
			<!-- Search -->
			<div class="mobile-filter-group">
				<label for="mobile-search" class="mobile-filter-label">Search</label>
				<input
					id="mobile-search"
					type="text"
					value={localSearchTerm}
					on:input={handleSearchInput}
					placeholder="Search in notes..."
					class="mobile-search-input"
				/>
			</div>

			<!-- Event Types -->
			<div class="mobile-filter-group">
				<label class="mobile-filter-label">Event Types</label>
				<div class="mobile-event-types">
					{#each $eventTypes as eventType (eventType.id)}
						<label class="mobile-event-type">
							<input
								type="checkbox"
								checked={localEventTypeIds.includes(eventType.id)}
								on:change={() => toggleEventType(eventType.id)}
							/>
							<span class="mobile-event-type-content">
								<span class="event-type-icon">{eventType.icon}</span>
								<span class="event-type-name">{eventType.name}</span>
							</span>
						</label>
					{/each}
				</div>
			</div>

			<!-- Date Presets -->
			<div class="mobile-filter-group">
				<label class="mobile-filter-label">Date Range</label>
				<div class="mobile-date-presets">
					{#each datePresets as preset}
						<button
							type="button"
							class="mobile-preset-btn"
							on:click={() => applyDatePreset(preset)}
						>
							{preset.label}
						</button>
					{/each}
				</div>
			</div>

			<!-- Sort & Limit -->
			<div class="mobile-filter-group">
				<label class="mobile-filter-label">Sort & Display</label>
				<div class="mobile-sort-controls">
					<select bind:value={localSortBy} on:change={handleSortChange} class="mobile-select">
						<option value="started_at">Sort by Date</option>
						<option value="severity">Sort by Severity</option>
					</select>
					<select bind:value={localSortOrder} on:change={handleSortChange} class="mobile-select">
						<option value="desc">Newest First</option>
						<option value="asc">Oldest First</option>
					</select>
					<select bind:value={localLimit} on:change={handleLimitChange} class="mobile-select">
						<option value={10}>10 per page</option>
						<option value={25}>25 per page</option>
						<option value={50}>50 per page</option>
						<option value={100}>100 per page</option>
					</select>
				</div>
			</div>

			<!-- Clear Button -->
			{#if hasActiveFilters}
				<button type="button" class="mobile-clear-btn" on:click={clearAllFilters}>
					Clear All Filters
				</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.history-filters {
		background: white;
		border: 1px solid #e9ecef;
		border-radius: 8px;
		padding: 1rem;
	}

	/* Desktop Filters */
	.desktop-filters {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		align-items: end;
	}

	.filter-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.filter-label {
		font-size: 0.8rem;
		font-weight: 600;
		color: #495057;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	/* Search Filter */
	.search-filter {
		flex: 1;
		min-width: 200px;
		max-width: 300px;
	}

	.search-input {
		padding: 0.5rem 0.75rem;
		border: 1px solid #ced4da;
		border-radius: 6px;
		font-size: 0.875rem;
		width: 100%;
		transition: border-color 0.2s;
	}

	.search-input:focus {
		outline: none;
		border-color: #007bff;
		box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
	}

	/* Event Type Dropdown */
	.event-type-filter {
		min-width: 150px;
	}

	.dropdown {
		position: relative;
		width: 100%;
	}

	.dropdown-btn {
		background: white;
		border: 1px solid #ced4da;
		border-radius: 6px;
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		transition: border-color 0.2s;
	}

	.dropdown-btn:hover,
	.dropdown-btn.active {
		border-color: #007bff;
	}

	.dropdown-text {
		flex: 1;
		text-align: left;
	}

	.dropdown-arrow {
		transition: transform 0.2s;
		font-size: 0.75rem;
	}

	.dropdown-arrow.rotated {
		transform: rotate(180deg);
	}

	.dropdown-menu {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: white;
		border: 1px solid #dee2e6;
		border-radius: 6px;
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
		z-index: 1000;
		max-height: 200px;
		overflow-y: auto;
		margin-top: 2px;
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.dropdown-item:hover {
		background: #f8f9fa;
	}

	.event-type-icon {
		font-size: 1rem;
	}

	.event-type-name {
		font-size: 0.875rem;
	}

	/* Date Filter */
	.date-filter {
		min-width: 200px;
	}

	.date-controls {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
	}

	.date-presets {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(70px, 1fr));
		gap: 0.25rem;
	}

	.preset-btn {
		background: #f8f9fa;
		border: 1px solid #dee2e6;
		border-radius: 4px;
		padding: 0.25rem 0.5rem;
		font-size: 0.7rem;
		cursor: pointer;
		transition: all 0.2s;
		text-align: center;
		white-space: nowrap;
	}

	.preset-btn:hover {
		background: #e9ecef;
		border-color: #007bff;
	}

	.date-inputs {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.date-input {
		padding: 0.4rem 0.6rem;
		border: 1px solid #ced4da;
		border-radius: 4px;
		font-size: 0.8rem;
		flex: 1;
		min-width: 120px;
	}

	.date-separator {
		color: #6c757d;
		font-size: 0.8rem;
	}

	/* Sort Controls */
	.sort-controls {
		display: flex;
		gap: 0.5rem;
	}

	.sort-select,
	.limit-select {
		padding: 0.5rem;
		border: 1px solid #ced4da;
		border-radius: 6px;
		font-size: 0.875rem;
		background: white;
	}

	/* Clear Button */
	.clear-filters-btn {
		background: #dc3545;
		color: white;
		border: none;
		border-radius: 6px;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.clear-filters-btn:hover {
		background: #c82333;
	}

	/* Mobile Filters */
	.mobile-filters-toggle {
		display: none;
	}

	.mobile-filters {
		display: none;
	}

	/* Mobile Responsive */
	@media (max-width: 768px) {
		.desktop-filters {
			display: none;
		}

		.mobile-filters-toggle {
			display: block;
		}

		.mobile-toggle-btn {
			background: #f8f9fa;
			border: 1px solid #dee2e6;
			border-radius: 6px;
			padding: 0.75rem 1rem;
			font-size: 0.9rem;
			font-weight: 500;
			cursor: pointer;
			display: flex;
			align-items: center;
			gap: 0.5rem;
			width: 100%;
			justify-content: space-between;
		}

		.mobile-toggle-btn.active {
			background: #e9ecef;
			border-color: #007bff;
		}

		.filter-count {
			background: #007bff;
			color: white;
			padding: 0.125rem 0.375rem;
			border-radius: 10px;
			font-size: 0.75rem;
		}

		.toggle-arrow {
			transition: transform 0.2s;
		}

		.toggle-arrow.rotated {
			transform: rotate(180deg);
		}

		.mobile-filters {
			display: block;
			margin-top: 1rem;
			padding-top: 1rem;
			border-top: 1px solid #dee2e6;
		}

		.mobile-filter-group {
			margin-bottom: 1rem;
		}

		.mobile-filter-label {
			font-size: 0.8rem;
			font-weight: 600;
			color: #495057;
			margin-bottom: 0.5rem;
			display: block;
		}

		.mobile-search-input {
			width: 100%;
			padding: 0.75rem;
			border: 1px solid #ced4da;
			border-radius: 6px;
			font-size: 0.9rem;
		}

		.mobile-event-types {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
			gap: 0.5rem;
		}

		.mobile-event-type {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			cursor: pointer;
		}

		.mobile-event-type-content {
			display: flex;
			align-items: center;
			gap: 0.375rem;
			font-size: 0.85rem;
		}

		.mobile-date-presets {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
			gap: 0.5rem;
		}

		.mobile-preset-btn {
			background: #f8f9fa;
			border: 1px solid #dee2e6;
			border-radius: 6px;
			padding: 0.5rem 0.75rem;
			font-size: 0.8rem;
			cursor: pointer;
			transition: all 0.2s;
		}

		.mobile-preset-btn:hover {
			background: #e9ecef;
			border-color: #007bff;
		}

		.mobile-sort-controls {
			display: flex;
			flex-direction: column;
			gap: 0.5rem;
		}

		.mobile-select {
			width: 100%;
			padding: 0.75rem;
			border: 1px solid #ced4da;
			border-radius: 6px;
			font-size: 0.9rem;
			background: white;
		}

		.mobile-clear-btn {
			background: #dc3545;
			color: white;
			border: none;
			border-radius: 6px;
			padding: 0.75rem 1rem;
			font-size: 0.9rem;
			font-weight: 500;
			cursor: pointer;
			width: 100%;
			transition: background-color 0.2s;
		}

		.mobile-clear-btn:hover {
			background: #c82333;
		}
	}
</style>