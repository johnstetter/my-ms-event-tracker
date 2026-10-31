<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import EventDetail from '$lib/components/EventDetail.svelte';

	// Get the event ID from the route parameters
	$: eventId = $page.params.id;

	// Validate event ID format (UUID)
	$: isValidEventId = eventId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(eventId);

	// Redirect to home if invalid event ID
	onMount(() => {
		if (!isValidEventId) {
			goto('/');
		}
	});
</script>

<svelte:head>
	<title>Event Details - MS Event Tracker</title>
	<meta name="description" content="View detailed information about this MS symptom event including timeline and interventions." />
</svelte:head>

<div class="page-container">
	<div class="page-header">
		<a href="/" class="back-link">← Back to Dashboard</a>
	</div>

	{#if isValidEventId && eventId}
		<EventDetail eventId={eventId} />
	{:else}
		<div class="invalid-event">
			<h1>Invalid Event</h1>
			<p>The event ID provided is not valid.</p>
			<a href="/" class="home-link">Return to Dashboard</a>
		</div>
	{/if}
</div>

<style>
	.page-container {
		min-height: 100vh;
		background: #f8f9fa;
		padding: 1rem;
	}

	.page-header {
		max-width: 800px;
		margin: 0 auto 1rem auto;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: #007bff;
		text-decoration: none;
		font-weight: 500;
		padding: 0.5rem 1rem;
		border-radius: 8px;
		transition: all 0.2s;
		background: white;
		border: 1px solid #e9ecef;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.back-link:hover {
		background: #f8f9fa;
		border-color: #007bff;
		transform: translateY(-1px);
		box-shadow: 0 2px 6px rgba(0, 123, 255, 0.1);
	}

	.invalid-event {
		max-width: 600px;
		margin: 4rem auto;
		text-align: center;
		padding: 3rem 2rem;
		background: white;
		border-radius: 12px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		border: 1px solid #e9ecef;
	}

	.invalid-event h1 {
		color: #dc3545;
		margin: 0 0 1rem 0;
		font-size: 2rem;
	}

	.invalid-event p {
		color: #6c757d;
		margin: 0 0 2rem 0;
		font-size: 1.1rem;
	}

	.home-link {
		display: inline-block;
		background: #007bff;
		color: white;
		text-decoration: none;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-weight: 600;
		transition: background-color 0.2s;
	}

	.home-link:hover {
		background: #0056b3;
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.page-container {
			padding: 0.5rem;
		}

		.page-header {
			margin-bottom: 0.5rem;
		}

		.invalid-event {
			margin: 2rem auto;
			padding: 2rem 1.5rem;
		}

		.invalid-event h1 {
			font-size: 1.5rem;
		}
	}
</style>