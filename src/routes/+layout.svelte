<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import '../app.css';

	// Import auth stores to ensure they're initialized
	import '$lib/stores/auth.js';

	// Initialize logging system
	import { initializeLogging, log } from '$lib/logging/index.js';

	let { children } = $props();

	// Initialize app when mounted
	onMount(() => {
		if (browser) {
			// Initialize structured logging
			const loggingResult = initializeLogging();
			if (loggingResult.success) {
				log.info('MS Event Tracker initialized', {
					environment: import.meta.env.MODE,
					userAgent: navigator.userAgent,
					timestamp: new Date().toISOString()
				});
			} else {
				console.error('Failed to initialize logging:', loggingResult.errors);
				console.log('MS Event Tracker initialized (logging disabled)');
			}

			// Auth state is automatically managed by the stores
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
