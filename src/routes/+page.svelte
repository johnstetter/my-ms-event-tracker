<script lang="ts">
	import AuthButton from '$lib/components/AuthButton.svelte';
	import Navigation from '$lib/components/Navigation.svelte';
	import QuickLog from '$lib/components/quick-log/QuickLog.svelte';
	import RecentEvents from '$lib/components/RecentEvents.svelte';
	import { user, loading } from '$lib/stores/auth.js';
</script>

<svelte:head>
	<title>MS Event Tracker</title>
	<meta name="description" content="Track your Multiple Sclerosis events and identify patterns to share with your healthcare team. Privacy-focused MS event logging." />
</svelte:head>

<main class="container">
	<header class="app-header">
		<div class="header-content">
			<div class="header-title">
				<h1>MS Event Tracker</h1>
				<p class="subtitle">Log events and identify patterns</p>
			</div>
			<div class="header-nav">
				<Navigation />
			</div>
		</div>
	</header>

	<div class="auth-section">
		<AuthButton />
	</div>

	{#if !$loading && $user}
		<!-- Main app content for authenticated users -->
		<div class="app-content">
			<div class="quick-actions">
				<h3>Quick Event Logging</h3>
				<QuickLog />
			</div>

			<div class="recent-section">
				<RecentEvents />
			</div>
		</div>
	{:else if !$loading && !$user}
		<!-- Content for non-authenticated users -->
		<div class="marketing-content">
			<section class="features">
				<h2>Track Your MS Events</h2>
				<div class="feature-grid">
					<div class="feature">
						<div class="feature-icon">⚡</div>
						<h3>MS Event Tracking</h3>
						<p>Log spasms, pain, fatigue, cognitive events, and other activities specific to Multiple Sclerosis.</p>
					</div>
					<div class="feature">
						<div class="feature-icon">📊</div>
						<h3>Pattern Recognition</h3>
						<p>Identify triggers and patterns in your events to discuss with your healthcare team.</p>
					</div>
					<div class="feature">
						<div class="feature-icon">📋</div>
						<h3>Event History</h3>
						<p>Build a comprehensive timeline of your MS events to track changes over time.</p>
					</div>
					<div class="feature">
						<div class="feature-icon">🔒</div>
						<h3>Privacy First</h3>
						<p>Your health data stays private and is only accessible by you.</p>
					</div>
				</div>
			</section>
		</div>
	{/if}
</main>

<style>
	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 1rem;
		min-height: 100vh;
	}

	.app-header {
		margin-bottom: 2rem;
		padding-bottom: 2rem;
		border-bottom: 1px solid #e9ecef;
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 2rem;
	}

	.header-title {
		text-align: center;
		flex: 1;
		margin-left: auto;
		margin-right: auto;
	}

	.header-nav {
		/* Navigation on the left */
		order: -1;
	}

	.app-header h1 {
		color: #2c3e50;
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
		font-weight: 700;
	}

	.subtitle {
		color: #666;
		font-size: 1.125rem;
		margin: 0;
	}

	.auth-section {
		margin-bottom: 3rem;
		display: flex;
		justify-content: center;
	}

	.app-content {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.quick-actions h3 {
		color: #2c3e50;
		margin-bottom: 1rem;
		font-size: 1.25rem;
	}

	/* QuickLog component has its own styling */

	/* Empty state CSS moved to RecentEvents component */

	.marketing-content {
		margin-top: 2rem;
	}

	.features h2 {
		text-align: center;
		color: #2c3e50;
		margin-bottom: 2rem;
		font-size: 2rem;
	}

	.feature-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 2rem;
		margin-bottom: 3rem;
	}

	.feature {
		text-align: center;
		padding: 1.5rem;
		background: white;
		border-radius: 12px;
		border: 1px solid #e9ecef;
	}

	.feature-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.feature h3 {
		color: #2c3e50;
		margin-bottom: 0.5rem;
		font-size: 1.25rem;
	}

	.feature p {
		color: #666;
		margin: 0;
		line-height: 1.6;
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.container {
			padding: 0.5rem;
		}

		.header-content {
			flex-direction: column;
			gap: 1rem;
		}

		.app-header h1 {
			font-size: 2rem;
		}

		/* Quick log mobile styles are handled in QuickLog component */

		.feature-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.feature {
			padding: 1rem;
		}
	}
</style>
