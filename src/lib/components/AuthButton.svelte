<script lang="ts">
	import { authHelpers, user, loading } from '$lib/stores/auth.js';

	type Mode = 'sign-in' | 'sign-up' | 'reset';

	let mode = $state<Mode>('sign-in');
	let email = $state('');
	let password = $state('');
	let submitting = $state(false);
	let errorMessage = $state('');
	let infoMessage = $state('');

	function resetMessages() {
		errorMessage = '';
		infoMessage = '';
	}

	function switchMode(next: Mode) {
		mode = next;
		password = '';
		resetMessages();
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		resetMessages();

		if (!email) {
			errorMessage = 'Email is required.';
			return;
		}
		if (mode !== 'reset' && !password) {
			errorMessage = 'Password is required.';
			return;
		}

		submitting = true;
		try {
			if (mode === 'sign-in') {
				const { error } = await authHelpers.signInWithPassword(email, password);
				if (error) errorMessage = error.message;
			} else if (mode === 'sign-up') {
				const { data, error } = await authHelpers.signUp(email, password);
				if (error) {
					errorMessage = error.message;
				} else if (data?.user && !data.session) {
					infoMessage = 'Check your email to confirm your account before signing in.';
				}
			} else if (mode === 'reset') {
				const { error } = await authHelpers.resetPassword(email);
				if (error) {
					errorMessage = error.message;
				} else {
					infoMessage = 'If an account exists for that email, a reset link has been sent.';
				}
			}
		} catch (err) {
			console.error('Auth error:', err);
			errorMessage = 'Something went wrong. Please try again.';
		} finally {
			submitting = false;
		}
	}

	async function handleSignOut() {
		const { error } = await authHelpers.signOut();
		if (error) {
			console.error('Sign-out error:', error);
			errorMessage = 'Failed to sign out. Please try again.';
		}
	}
</script>

{#if $loading}
	<div class="auth-loading">
		<div class="spinner"></div>
		<span>Loading...</span>
	</div>
{:else if $user}
	<div class="user-info">
		<div class="user-details">
			{#if $user.user_metadata?.avatar_url}
				<img src={$user.user_metadata.avatar_url} alt="Profile" class="avatar" />
			{/if}
			<div class="user-text">
				<p class="user-name">{$user.user_metadata?.full_name || $user.email}</p>
				<p class="user-email">{$user.email}</p>
			</div>
		</div>
		<button class="btn btn-secondary" onclick={handleSignOut}>Sign Out</button>
	</div>
{:else}
	<div class="sign-in">
		<h2>
			{#if mode === 'sign-in'}Sign in to track your events{/if}
			{#if mode === 'sign-up'}Create your account{/if}
			{#if mode === 'reset'}Reset your password{/if}
		</h2>
		<p class="sign-in-sub">
			{#if mode === 'sign-in'}Securely access your personal health tracking data.{/if}
			{#if mode === 'sign-up'}Securely log MS events and identify patterns over time.{/if}
			{#if mode === 'reset'}Enter your email and we'll send a reset link.{/if}
		</p>

		<form onsubmit={handleSubmit} class="auth-form" novalidate>
			<label class="field">
				<span class="field-label">Email</span>
				<input
					type="email"
					autocomplete="email"
					required
					bind:value={email}
					disabled={submitting}
				/>
			</label>

			{#if mode !== 'reset'}
				<label class="field">
					<span class="field-label">Password</span>
					<input
						type="password"
						autocomplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
						required
						minlength={mode === 'sign-up' ? 8 : undefined}
						bind:value={password}
						disabled={submitting}
					/>
				</label>
			{/if}

			{#if errorMessage}
				<p class="message error" role="alert">{errorMessage}</p>
			{/if}
			{#if infoMessage}
				<p class="message info">{infoMessage}</p>
			{/if}

			<button type="submit" class="btn btn-primary" disabled={submitting}>
				{#if submitting}
					Working&hellip;
				{:else if mode === 'sign-in'}
					Sign in
				{:else if mode === 'sign-up'}
					Create account
				{:else}
					Send reset link
				{/if}
			</button>
		</form>

		<div class="auth-switch">
			{#if mode === 'sign-in'}
				<button type="button" class="link" onclick={() => switchMode('sign-up')}>
					Need an account? Sign up
				</button>
				<button type="button" class="link" onclick={() => switchMode('reset')}>
					Forgot password?
				</button>
			{:else if mode === 'sign-up'}
				<button type="button" class="link" onclick={() => switchMode('sign-in')}>
					Already have an account? Sign in
				</button>
			{:else}
				<button type="button" class="link" onclick={() => switchMode('sign-in')}>
					Back to sign in
				</button>
			{/if}
		</div>

		<p class="privacy-note">Your data is encrypted and only accessible by you.</p>
	</div>
{/if}

<style>
	.auth-loading {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		color: #666;
	}

	.spinner {
		width: 20px;
		height: 20px;
		border: 2px solid #f3f3f3;
		border-top: 2px solid #3498db;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.user-info {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem;
		background: #f8f9fa;
		border-radius: 8px;
		border: 1px solid #e9ecef;
	}

	.user-details {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		object-fit: cover;
	}

	.user-text {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.user-name {
		font-weight: 600;
		color: #333;
		margin: 0;
	}

	.user-email {
		font-size: 0.875rem;
		color: #666;
		margin: 0;
	}

	.sign-in {
		text-align: center;
		padding: 2rem;
		background: #f8f9fa;
		border-radius: 12px;
		border: 1px solid #e9ecef;
		max-width: 420px;
		margin: 0 auto;
	}

	.sign-in h2 {
		color: #333;
		margin-bottom: 0.5rem;
		font-size: 1.5rem;
	}

	.sign-in-sub {
		color: #666;
		margin-bottom: 1.5rem;
	}

	.auth-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		text-align: left;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.field-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #333;
	}

	.field input {
		padding: 0.65rem 0.75rem;
		font-size: 1rem;
		border: 1px solid #ced4da;
		border-radius: 6px;
		background: white;
		min-height: 44px;
	}

	.field input:focus {
		outline: 2px solid #3498db;
		outline-offset: 1px;
		border-color: #3498db;
	}

	.message {
		margin: 0;
		font-size: 0.875rem;
		padding: 0.5rem 0.75rem;
		border-radius: 6px;
	}

	.message.error {
		color: #842029;
		background: #f8d7da;
		border: 1px solid #f5c2c7;
	}

	.message.info {
		color: #084298;
		background: #cfe2ff;
		border: 1px solid #b6d4fe;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 6px;
		font-weight: 500;
		text-decoration: none;
		cursor: pointer;
		transition: all 0.2s;
		font-size: 1rem;
		min-height: 44px;
	}

	.btn-primary {
		background: #2563eb;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: #1d4ed8;
	}

	.btn-primary:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.btn-secondary {
		background: #6c757d;
		color: white;
	}

	.btn-secondary:hover {
		background: #5a6268;
	}

	.auth-switch {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	.link {
		background: none;
		border: none;
		color: #2563eb;
		cursor: pointer;
		font-size: 0.9rem;
		padding: 0.25rem;
	}

	.link:hover {
		text-decoration: underline;
	}

	.privacy-note {
		margin-top: 1.5rem;
		font-size: 0.875rem;
		color: #666;
		margin-bottom: 0;
	}

	@media (max-width: 768px) {
		.user-info {
			flex-direction: column;
			align-items: stretch;
			text-align: center;
		}

		.user-details {
			justify-content: center;
		}

		.sign-in {
			padding: 1.5rem;
		}
	}
</style>
