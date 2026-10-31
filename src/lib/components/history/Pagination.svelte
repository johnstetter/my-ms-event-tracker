<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let currentPage = 1;
	export let totalPages = 1;
	export let totalCount = 0;
	export let limit = 25;

	const dispatch = createEventDispatcher();

	// Calculate page range to display
	$: pageRange = calculatePageRange(currentPage, totalPages);
	$: showingStart = (currentPage - 1) * limit + 1;
	$: showingEnd = Math.min(currentPage * limit, totalCount);

	function calculatePageRange(current: number, total: number): number[] {
		const delta = 2; // Pages to show on each side of current
		const range = [];

		// Always include first page
		if (total > 0) range.push(1);

		// Calculate start and end of middle range
		const start = Math.max(2, current - delta);
		const end = Math.min(total - 1, current + delta);

		// Add ellipsis if gap between 1 and start
		if (start > 2) range.push(-1); // -1 represents ellipsis

		// Add middle pages
		for (let i = start; i <= end; i++) {
			if (i > 1 && i < total) range.push(i);
		}

		// Add ellipsis if gap between end and last page
		if (end < total - 1) range.push(-2); // -2 represents ellipsis

		// Always include last page (if different from first)
		if (total > 1) range.push(total);

		return range;
	}

	function goToPage(page: number) {
		if (page >= 1 && page <= totalPages && page !== currentPage) {
			dispatch('pageChange', { page });
		}
	}

	function goToPrevious() {
		if (currentPage > 1) {
			goToPage(currentPage - 1);
		}
	}

	function goToNext() {
		if (currentPage < totalPages) {
			goToPage(currentPage + 1);
		}
	}
</script>

<div class="pagination-container">
	<div class="pagination-info">
		<span class="results-text">
			Showing {showingStart}-{showingEnd} of {totalCount} events
		</span>
	</div>

	<nav class="pagination" aria-label="Event history pagination">
		<!-- Previous button -->
		<button
			type="button"
			class="pagination-btn prev"
			class:disabled={currentPage === 1}
			disabled={currentPage === 1}
			on:click={goToPrevious}
			aria-label="Previous page"
		>
			← Previous
		</button>

		<!-- Page numbers -->
		<div class="page-numbers">
			{#each pageRange as page}
				{#if page === -1 || page === -2}
					<span class="ellipsis" aria-hidden="true">…</span>
				{:else}
					<button
						type="button"
						class="page-btn"
						class:current={page === currentPage}
						on:click={() => goToPage(page)}
						aria-label="Go to page {page}"
						aria-current={page === currentPage ? 'page' : undefined}
					>
						{page}
					</button>
				{/if}
			{/each}
		</div>

		<!-- Next button -->
		<button
			type="button"
			class="pagination-btn next"
			class:disabled={currentPage === totalPages}
			disabled={currentPage === totalPages}
			on:click={goToNext}
			aria-label="Next page"
		>
			Next →
		</button>
	</nav>
</div>

<style>
	.pagination-container {
		background: white;
		border: 1px solid #e9ecef;
		border-radius: 8px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		align-items: center;
	}

	.pagination-info {
		color: #6c757d;
		font-size: 0.875rem;
		text-align: center;
	}

	.pagination {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.pagination-btn {
		background: white;
		border: 1px solid #dee2e6;
		color: #007bff;
		padding: 0.5rem 0.75rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		text-decoration: none;
	}

	.pagination-btn:hover:not(.disabled) {
		background: #007bff;
		color: white;
		border-color: #007bff;
	}

	.pagination-btn.disabled {
		background: #f8f9fa;
		color: #6c757d;
		border-color: #dee2e6;
		cursor: not-allowed;
		opacity: 0.5;
	}

	.page-numbers {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.page-btn {
		background: white;
		border: 1px solid #dee2e6;
		color: #007bff;
		padding: 0.5rem 0.75rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		min-width: 2.5rem;
		text-align: center;
	}

	.page-btn:hover {
		background: #f8f9fa;
		border-color: #007bff;
	}

	.page-btn.current {
		background: #007bff;
		color: white;
		border-color: #007bff;
	}

	.page-btn.current:hover {
		background: #0056b3;
		border-color: #0056b3;
	}

	.ellipsis {
		color: #6c757d;
		padding: 0.5rem 0.25rem;
		font-size: 0.875rem;
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.pagination-container {
			padding: 0.75rem;
		}

		.pagination {
			gap: 0.25rem;
		}

		.pagination-btn,
		.page-btn {
			font-size: 0.8rem;
			padding: 0.4rem 0.6rem;
		}

		.page-btn {
			min-width: 2.25rem;
		}

		.pagination-info {
			font-size: 0.8rem;
		}

		/* Stack pagination elements on very small screens */
		@media (max-width: 480px) {
			.pagination {
				flex-direction: column;
				gap: 0.5rem;
			}

			.page-numbers {
				order: -1;
			}

			.pagination-btn.prev,
			.pagination-btn.next {
				min-width: 120px;
			}
		}
	}
</style>