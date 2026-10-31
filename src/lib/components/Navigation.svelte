<script lang="ts">
	import { user } from '$lib/stores/auth.js';

	// Menu state
	let showMenu = $state(false);

	// Toggle menu
	function toggleMenu() {
		showMenu = !showMenu;
	}

	// Close menu when clicking outside
	function closeMenu() {
		showMenu = false;
	}

	// Handle escape key
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeMenu();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if $user}
	<nav class="navigation">
		<!-- Hamburger Menu Button -->
		<button
			type="button"
			class="menu-toggle"
			class:active={showMenu}
			on:click={toggleMenu}
			aria-expanded={showMenu}
			aria-label="Toggle navigation menu"
		>
			<span class="hamburger-line"></span>
			<span class="hamburger-line"></span>
			<span class="hamburger-line"></span>
		</button>

		<!-- Menu Overlay -->
		{#if showMenu}
			<div
				class="menu-overlay"
				on:click={closeMenu}
				on:keydown={(e) => e.key === 'Escape' && closeMenu()}
				role="button"
				tabindex="-1"
			></div>
		{/if}

		<!-- Navigation Menu -->
		<div class="nav-menu" class:open={showMenu}>
			<div class="nav-header">
				<div class="nav-user">
					<div class="user-avatar">
						{$user.email?.charAt(0).toUpperCase() || 'U'}
					</div>
					<div class="user-info">
						<span class="user-name">
							{$user.user_metadata?.full_name || 'User'}
						</span>
						<span class="user-email">{$user.email}</span>
					</div>
				</div>
			</div>

			<div class="nav-section">
				<h3 class="nav-section-title">Tracking</h3>
				<ul class="nav-list">
					<li>
						<a href="/" class="nav-link" on:click={closeMenu}>
							<span class="nav-icon">🏠</span>
							Quick Log
						</a>
					</li>
					<li>
						<a href="/history" class="nav-link" on:click={closeMenu}>
							<span class="nav-icon">📋</span>
							Event History
						</a>
					</li>
				</ul>
			</div>

			<div class="nav-section">
				<h3 class="nav-section-title">Management</h3>
				<ul class="nav-list">
					<li>
						<a href="/admin" class="nav-link" on:click={closeMenu}>
							<span class="nav-icon">⚙️</span>
							Admin Dashboard
						</a>
					</li>
					<li>
						<a href="/admin/event-types" class="nav-link" on:click={closeMenu}>
							<span class="nav-icon">📝</span>
							Event Types
						</a>
					</li>
					<li>
						<a href="/admin/body-locations" class="nav-link" on:click={closeMenu}>
							<span class="nav-icon">🎯</span>
							Body Locations
						</a>
					</li>
					<li>
						<a href="/admin/interventions" class="nav-link" on:click={closeMenu}>
							<span class="nav-icon">💊</span>
							Interventions
						</a>
					</li>
				</ul>
			</div>

			<div class="nav-section">
				<h3 class="nav-section-title">Analysis</h3>
				<ul class="nav-list">
					<li>
						<a href="/reports" class="nav-link" on:click={closeMenu}>
							<span class="nav-icon">📊</span>
							Reports & Analytics
							<span class="nav-badge">Coming Soon</span>
						</a>
					</li>
					<li>
						<a href="/export" class="nav-link" on:click={closeMenu}>
							<span class="nav-icon">📤</span>
							Export Data
							<span class="nav-badge">Coming Soon</span>
						</a>
					</li>
				</ul>
			</div>
		</div>
	</nav>
{/if}

<style>
	.navigation {
		position: relative;
		z-index: 1000;
	}

	.menu-toggle {
		display: flex;
		flex-direction: column;
		justify-content: space-around;
		width: 2.5rem;
		height: 2.5rem;
		background: white;
		border: 1px solid #e9ecef;
		border-radius: 6px;
		cursor: pointer;
		padding: 0.5rem;
		transition: all 0.3s;
		position: relative;
		z-index: 1001;
	}

	.menu-toggle:hover {
		background: #f8f9fa;
		border-color: #007bff;
	}

	.menu-toggle.active {
		border-color: #007bff;
		background: #007bff;
	}

	.hamburger-line {
		width: 100%;
		height: 2px;
		background: #495057;
		border-radius: 1px;
		transition: all 0.3s;
		transform-origin: center;
	}

	.menu-toggle.active .hamburger-line {
		background: white;
	}

	.menu-toggle.active .hamburger-line:nth-child(1) {
		transform: rotate(45deg) translate(3px, 3px);
	}

	.menu-toggle.active .hamburger-line:nth-child(2) {
		opacity: 0;
	}

	.menu-toggle.active .hamburger-line:nth-child(3) {
		transform: rotate(-45deg) translate(3px, -3px);
	}

	.menu-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 999;
	}

	.nav-menu {
		position: fixed;
		top: 0;
		left: -350px;
		width: 350px;
		height: 100vh;
		background: white;
		box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
		transition: left 0.3s ease;
		z-index: 1000;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
	}

	.nav-menu.open {
		left: 0;
	}

	.nav-header {
		padding: 2rem 1.5rem 1.5rem 1.5rem;
		border-bottom: 1px solid #e9ecef;
		background: #f8f9fa;
	}

	.nav-user {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.user-avatar {
		width: 3rem;
		height: 3rem;
		background: #007bff;
		color: white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 1.2rem;
	}

	.user-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.user-name {
		font-weight: 600;
		color: #2c3e50;
		font-size: 1rem;
	}

	.user-email {
		font-size: 0.875rem;
		color: #6c757d;
	}

	.nav-section {
		padding: 1.5rem 0;
		border-bottom: 1px solid #f1f3f4;
	}

	.nav-section:last-child {
		border-bottom: none;
		margin-bottom: auto;
	}

	.nav-section-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: #6c757d;
		text-transform: uppercase;
		letter-spacing: 0.025em;
		margin: 0 0 1rem 1.5rem;
	}

	.nav-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1.5rem;
		color: #495057;
		text-decoration: none;
		font-weight: 500;
		transition: all 0.2s;
		position: relative;
	}

	.nav-link:hover {
		background: #f8f9fa;
		color: #007bff;
	}

	.nav-icon {
		font-size: 1.1rem;
		width: 1.5rem;
		text-align: center;
	}

	.nav-badge {
		margin-left: auto;
		background: #6c757d;
		color: white;
		padding: 0.25rem 0.5rem;
		border-radius: 12px;
		font-size: 0.7rem;
		font-weight: 500;
	}

	/* Mobile responsive */
	@media (max-width: 768px) {
		.nav-menu {
			width: 100vw;
			left: -100vw;
		}

		.nav-menu.open {
			left: 0;
		}
	}
</style>