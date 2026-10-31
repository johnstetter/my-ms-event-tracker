<script lang="ts">
	import { page } from '$app/stores';

	let { children } = $props();

	// Current route info
	const currentPath = $derived($page.url.pathname);
	const isEventTypesRoute = $derived(currentPath.startsWith('/admin/event-types'));
	const isBodyLocationsRoute = $derived(currentPath.startsWith('/admin/body-locations'));
	const isInterventionsRoute = $derived(currentPath.startsWith('/admin/interventions'));
	const isDashboard = $derived(currentPath === '/admin');
</script>

<svelte:head>
	<title>Admin - MS Event Tracker</title>
</svelte:head>

<div class="admin-layout">
	<header class="admin-header">
		<div class="header-content">
			<h1><a href="/admin">Admin Dashboard</a></h1>
			<nav class="main-nav">
				<a href="/" class="back-to-app">← Back to App</a>
			</nav>
		</div>
	</header>

	<div class="admin-content">
		<nav class="admin-sidebar">
			<ul class="nav-list">
				<li>
					<a
						href="/admin"
						class="nav-link"
						class:active={isDashboard}
					>
						<span class="nav-icon">🏠</span>
						Dashboard
					</a>
				</li>
				<li>
					<a
						href="/admin/event-types"
						class="nav-link"
						class:active={isEventTypesRoute}
					>
						<span class="nav-icon">📝</span>
						Event Types
					</a>
				</li>
				<li>
					<a
						href="/admin/body-locations"
						class="nav-link"
						class:active={isBodyLocationsRoute}
					>
						<span class="nav-icon">🎯</span>
						Body Locations
					</a>
				</li>
				<li>
					<a
						href="/admin/interventions"
						class="nav-link"
						class:active={isInterventionsRoute}
					>
						<span class="nav-icon">💊</span>
						Interventions
					</a>
				</li>
			</ul>
		</nav>

		<main class="admin-main">
			{@render children()}
		</main>
	</div>
</div>

<style>
	.admin-layout {
		min-height: 100vh;
		background: #f8f9fa;
	}

	.admin-header {
		background: white;
		border-bottom: 1px solid #e9ecef;
		position: sticky;
		top: 0;
		z-index: 100;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.header-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1rem 2rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header-content h1 {
		margin: 0;
		font-size: 1.5rem;
		color: #2c3e50;
	}

	.header-content h1 a {
		text-decoration: none;
		color: inherit;
	}

	.header-content h1 a:hover {
		color: #007bff;
	}

	.main-nav {
		display: flex;
		gap: 1rem;
	}

	.back-to-app {
		color: #007bff;
		text-decoration: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		background: #f8f9fa;
		border: 1px solid #e9ecef;
		transition: all 0.2s;
		font-weight: 500;
	}

	.back-to-app:hover {
		background: #e9ecef;
		border-color: #007bff;
	}

	.admin-content {
		max-width: 1200px;
		margin: 0 auto;
		display: grid;
		grid-template-columns: 250px 1fr;
		gap: 2rem;
		padding: 2rem;
		min-height: calc(100vh - 80px);
	}

	.admin-sidebar {
		background: white;
		border-radius: 8px;
		padding: 1.5rem;
		height: fit-content;
		border: 1px solid #e9ecef;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.nav-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		color: #495057;
		text-decoration: none;
		border-radius: 6px;
		transition: all 0.2s;
		font-weight: 500;
	}

	.nav-link:hover {
		background: #f8f9fa;
		color: #007bff;
	}

	.nav-link.active {
		background: #007bff;
		color: white;
	}

	.nav-link.active .nav-icon {
		filter: brightness(0) invert(1);
	}

	.nav-icon {
		font-size: 1.1rem;
		width: 1.5rem;
		text-align: center;
	}

	.admin-main {
		background: white;
		border-radius: 8px;
		padding: 2rem;
		border: 1px solid #e9ecef;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		min-height: 600px;
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.admin-content {
			grid-template-columns: 1fr;
			padding: 1rem;
			gap: 1rem;
		}

		.admin-sidebar {
			padding: 1rem;
		}

		.nav-list {
			flex-direction: row;
			gap: 0.25rem;
			overflow-x: auto;
		}

		.nav-link {
			padding: 0.5rem 0.75rem;
			white-space: nowrap;
			font-size: 0.875rem;
		}

		.admin-main {
			padding: 1.5rem;
		}

		.header-content {
			padding: 1rem;
		}

		.header-content h1 {
			font-size: 1.25rem;
		}
	}
</style>