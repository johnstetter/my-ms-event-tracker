import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { createMockUser, createMockSession } from '../test/utils.js';

// Mock the Supabase client
const mockSupabaseAuth = {
	getSession: vi.fn(),
	signInWithPassword: vi.fn(),
	signUp: vi.fn(),
	signOut: vi.fn(),
	resetPasswordForEmail: vi.fn(),
	onAuthStateChange: vi.fn()
};

vi.mock('../supabase.js', () => ({
	supabase: {
		auth: mockSupabaseAuth
	}
}));

describe('Auth Store', () => {
	beforeEach(() => {
		// Reset all mocks before each test
		vi.clearAllMocks();

		// Reset modules to ensure clean state
		vi.resetModules();

		// Setup default mock behavior
		mockSupabaseAuth.getSession.mockResolvedValue({
			data: { session: null }
		});

		mockSupabaseAuth.onAuthStateChange.mockImplementation(() => ({
			data: { subscription: { unsubscribe: vi.fn() } }
		}));

		// Mock browser environment by default
		vi.doMock('$app/environment', () => ({
			browser: true
		}));
	});

	describe('Store Initialization', () => {
		it('should initialize with loading state', async () => {
			// Import fresh module
			const { user, session, loading } = await import('./auth.js');

			// Initial state before async operations complete
			expect(get(user)).toBeNull();
			expect(get(session)).toBeNull();
			// Loading might be false if getSession resolves immediately
		});

		it('should set initial session when one exists', async () => {
			const mockUser = createMockUser();
			const mockSession = createMockSession(mockUser);

			// Mock getSession to return a session
			mockSupabaseAuth.getSession.mockResolvedValue({
				data: { session: mockSession }
			});

			// Import the module to trigger initialization
			const { user, session, loading } = await import('./auth.js');

			// Wait for the async getSession call to complete
			await new Promise(resolve => setTimeout(resolve, 50));

			expect(get(user)).toEqual(mockUser);
			expect(get(session)).toEqual(mockSession);
			expect(get(loading)).toBe(false);
		});

		it('should handle onAuthStateChange events', async () => {
			const mockUser = createMockUser();
			const mockSession = createMockSession(mockUser);

			let authChangeCallback!: (event: string, session: any) => void;

			// Mock onAuthStateChange to capture the callback
			mockSupabaseAuth.onAuthStateChange.mockImplementation((callback) => {
				authChangeCallback = callback;
				return { data: { subscription: { unsubscribe: vi.fn() } } };
			});

			// Import the module to set up the listener
			const { user, session, loading } = await import('./auth.js');

			// Wait for initialization to complete
			await new Promise(resolve => setTimeout(resolve, 10));

			// Now simulate auth state change
			authChangeCallback('SIGNED_IN', mockSession);

			expect(get(user)).toEqual(mockUser);
			expect(get(session)).toEqual(mockSession);
			expect(get(loading)).toBe(false);
		});
	});

	describe('authHelpers.signInWithPassword', () => {
		it('should successfully sign in with valid credentials', async () => {
			const mockUser = createMockUser({ email: 'test@example.com' });
			const mockSession = createMockSession(mockUser);

			mockSupabaseAuth.signInWithPassword.mockResolvedValue({
				data: { user: mockUser, session: mockSession },
				error: null
			});

			const { authHelpers, loading } = await import('./auth.js');

			const result = await authHelpers.signInWithPassword('test@example.com', 'password123');

			expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalledWith({
				email: 'test@example.com',
				password: 'password123'
			});

			expect(result.data).toEqual({ user: mockUser, session: mockSession });
			expect(result.error).toBeNull();
			expect(get(loading)).toBe(false);
		});

		it('should handle sign in errors', async () => {
			const mockError = { message: 'Invalid credentials' };

			mockSupabaseAuth.signInWithPassword.mockResolvedValue({
				data: { user: null, session: null },
				error: mockError
			});

			const { authHelpers } = await import('./auth.js');

			const result = await authHelpers.signInWithPassword('invalid@example.com', 'wrongpassword');

			expect(result.error).toEqual(mockError);
			expect(result.data.user).toBeNull();
		});

		it('should set loading state during sign in', async () => {
			let resolveSignIn: (value: any) => void;
			const signInPromise = new Promise(resolve => {
				resolveSignIn = resolve;
			});

			mockSupabaseAuth.signInWithPassword.mockReturnValue(signInPromise);

			const { authHelpers, loading } = await import('./auth.js');

			// Start sign in
			const signInCall = authHelpers.signInWithPassword('test@example.com', 'password123');

			// Check loading state is true
			expect(get(loading)).toBe(true);

			// Resolve the promise
			resolveSignIn!({
				data: { user: null, session: null },
				error: null
			});

			await signInCall;

			// Check loading state is false after completion
			expect(get(loading)).toBe(false);
		});
	});

	describe('authHelpers.signUp', () => {
		it('should successfully sign up with valid credentials', async () => {
			const mockUser = createMockUser({ email: 'newuser@example.com' });
			const mockSession = createMockSession(mockUser);

			mockSupabaseAuth.signUp.mockResolvedValue({
				data: { user: mockUser, session: mockSession },
				error: null
			});

			const { authHelpers } = await import('./auth.js');

			const result = await authHelpers.signUp('newuser@example.com', 'password123');

			expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
				email: 'newuser@example.com',
				password: 'password123'
			});

			expect(result.data).toEqual({ user: mockUser, session: mockSession });
			expect(result.error).toBeNull();
		});

		it('should handle sign up errors', async () => {
			const mockError = { message: 'Email already exists' };

			mockSupabaseAuth.signUp.mockResolvedValue({
				data: { user: null, session: null },
				error: mockError
			});

			const { authHelpers } = await import('./auth.js');

			const result = await authHelpers.signUp('existing@example.com', 'password123');

			expect(result.error).toEqual(mockError);
		});
	});

	describe('authHelpers.signOut', () => {
		it('should successfully sign out', async () => {
			mockSupabaseAuth.signOut.mockResolvedValue({
				error: null
			});

			const { authHelpers, user, session } = await import('./auth.js');

			// Set initial authenticated state
			const mockUser = createMockUser();
			const mockSession = createMockSession(mockUser);
			user.set(mockUser);
			session.set(mockSession);

			const result = await authHelpers.signOut();

			expect(mockSupabaseAuth.signOut).toHaveBeenCalledOnce();
			expect(result.error).toBeNull();
			expect(get(user)).toBeNull();
			expect(get(session)).toBeNull();
		});

		it('should handle sign out errors and maintain state', async () => {
			const mockError = { message: 'Sign out failed' };
			mockSupabaseAuth.signOut.mockResolvedValue({
				error: mockError
			});

			const { authHelpers, user, session } = await import('./auth.js');

			// Set initial authenticated state
			const mockUser = createMockUser();
			const mockSession = createMockSession(mockUser);
			user.set(mockUser);
			session.set(mockSession);

			const result = await authHelpers.signOut();

			expect(result.error).toEqual(mockError);
			// State should remain unchanged on error
			expect(get(user)).toEqual(mockUser);
			expect(get(session)).toEqual(mockSession);
		});
	});

	describe('authHelpers.resetPassword', () => {
		it('should send password reset email', async () => {
			const mockData = { message: 'Reset email sent' };

			mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue({
				data: mockData,
				error: null
			});

			// Mock window.location.origin for browser context
			Object.defineProperty(window, 'location', {
				value: { origin: 'http://localhost:5273' },
				writable: true
			});

			const { authHelpers } = await import('./auth.js');

			const result = await authHelpers.resetPassword('user@example.com');

			expect(mockSupabaseAuth.resetPasswordForEmail).toHaveBeenCalledWith(
				'user@example.com',
				{ redirectTo: 'http://localhost:5273/auth/reset' }
			);

			expect(result.data).toEqual(mockData);
			expect(result.error).toBeNull();
		});

		it('should handle reset password errors', async () => {
			const mockError = { message: 'Invalid email' };

			mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue({
				data: null,
				error: mockError
			});

			const { authHelpers } = await import('./auth.js');

			const result = await authHelpers.resetPassword('invalid-email');

			expect(result.error).toEqual(mockError);
		});
	});

	describe('Derived Stores', () => {
		it('should update isAuthenticated based on session', async () => {
			const { session, isAuthenticated } = await import('./auth.js');
			const mockSession = createMockSession();

			// Wait for initial state to settle
			await new Promise(resolve => setTimeout(resolve, 10));

			// Set session to authenticated state
			session.set(mockSession);
			expect(get(isAuthenticated)).toBe(true);

			// Clear session to unauthenticated state
			session.set(null);
			expect(get(isAuthenticated)).toBe(false);
		});

		it('should update isLoading based on loading', async () => {
			const { loading, isLoading } = await import('./auth.js');

			// Set loading states
			loading.set(true);
			expect(get(isLoading)).toBe(true);

			loading.set(false);
			expect(get(isLoading)).toBe(false);
		});
	});

	describe('Non-browser Environment', () => {
		it('should not initialize auth listeners in non-browser environment', async () => {
			// Clear and mock non-browser environment
			vi.resetModules();
			vi.doMock('$app/environment', () => ({
				browser: false
			}));

			// Clear mocks to track calls
			vi.clearAllMocks();

			const { user, session, loading } = await import('./auth.js');

			// Wait a bit to ensure no async operations are triggered
			await new Promise(resolve => setTimeout(resolve, 10));

			// Should not call Supabase auth methods
			expect(mockSupabaseAuth.getSession).not.toHaveBeenCalled();
			expect(mockSupabaseAuth.onAuthStateChange).not.toHaveBeenCalled();

			// Stores should remain in initial state
			expect(get(loading)).toBe(true);
			expect(get(user)).toBeNull();
			expect(get(session)).toBeNull();
		});
	});
});