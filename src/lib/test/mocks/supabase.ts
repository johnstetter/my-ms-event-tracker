import { vi } from 'vitest';
import { createMockUser, createMockSession } from '../utils.js';

// Create a comprehensive mock for the Supabase client
export const createSupabaseMock = () => {
	let mockUser: any = null;
	let mockSession: any = null;
	let authStateCallbacks: Array<(event: string, session: any) => void> = [];

	const mockAuth = {
		getUser: vi.fn().mockImplementation(() =>
			Promise.resolve({
				data: { user: mockUser },
				error: null
			})
		),

		getSession: vi.fn().mockImplementation(() =>
			Promise.resolve({
				data: { session: mockSession },
				error: null
			})
		),

		signInWithOAuth: vi.fn().mockImplementation(({ provider }) => {
			// Simulate successful OAuth sign in
			const user = createMockUser({
				app_metadata: { provider }
			});
			const session = createMockSession(user);

			mockUser = user;
			mockSession = session;

			// Trigger auth state change callbacks
			authStateCallbacks.forEach(callback =>
				callback('SIGNED_IN', session)
			);

			return Promise.resolve({
				data: { user, session },
				error: null
			});
		}),

		signInWithPassword: vi.fn().mockImplementation(({ email, password }) => {
			if (email === 'valid@example.com' && password === 'validpassword') {
				const user = createMockUser({ email });
				const session = createMockSession(user);

				mockUser = user;
				mockSession = session;

				authStateCallbacks.forEach(callback =>
					callback('SIGNED_IN', session)
				);

				return Promise.resolve({
					data: { user, session },
					error: null
				});
			} else {
				return Promise.resolve({
					data: { user: null, session: null },
					error: { message: 'Invalid credentials' }
				});
			}
		}),

		signUp: vi.fn().mockImplementation(({ email, password }) => {
			const user = createMockUser({ email });
			const session = createMockSession(user);

			mockUser = user;
			mockSession = session;

			return Promise.resolve({
				data: { user, session },
				error: null
			});
		}),

		signOut: vi.fn().mockImplementation(() => {
			const previousSession = mockSession;
			mockUser = null;
			mockSession = null;

			authStateCallbacks.forEach(callback =>
				callback('SIGNED_OUT', null)
			);

			return Promise.resolve({ error: null });
		}),

		onAuthStateChange: vi.fn().mockImplementation((callback) => {
			authStateCallbacks.push(callback);

			// Immediately call with current state
			if (mockSession) {
				callback('SIGNED_IN', mockSession);
			} else {
				callback('SIGNED_OUT', null);
			}

			return {
				data: {
					subscription: {
						unsubscribe: vi.fn().mockImplementation(() => {
							const index = authStateCallbacks.indexOf(callback);
							if (index > -1) {
								authStateCallbacks.splice(index, 1);
							}
						})
					}
				}
			};
		})
	};

	const mockDatabase = {
		from: vi.fn().mockImplementation((table: string) => {
			const query = {
				select: vi.fn().mockReturnThis(),
				insert: vi.fn().mockReturnThis(),
				update: vi.fn().mockReturnThis(),
				delete: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				neq: vi.fn().mockReturnThis(),
				gt: vi.fn().mockReturnThis(),
				gte: vi.fn().mockReturnThis(),
				lt: vi.fn().mockReturnThis(),
				lte: vi.fn().mockReturnThis(),
				like: vi.fn().mockReturnThis(),
				ilike: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis(),
				is: vi.fn().mockReturnThis(),
				filter: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				range: vi.fn().mockReturnThis(),
				single: vi.fn().mockImplementation(() =>
					Promise.resolve({ data: null, error: null })
				),
				maybeSingle: vi.fn().mockImplementation(() =>
					Promise.resolve({ data: null, error: null })
				),
				then: vi.fn().mockImplementation((resolve) => {
					resolve({ data: [], error: null });
					return Promise.resolve({ data: [], error: null });
				})
			};

			return query;
		})
	};

	return {
		auth: mockAuth,
		from: mockDatabase.from,

		// Helper methods for testing
		__test__: {
			setUser: (user: any) => { mockUser = user; },
			setSession: (session: any) => { mockSession = session; },
			getUser: () => mockUser,
			getSession: () => mockSession,
			getAuthCallbacks: () => authStateCallbacks,
			reset: () => {
				mockUser = null;
				mockSession = null;
				authStateCallbacks = [];
				vi.clearAllMocks();
			}
		}
	};
};

// Global mock for the Supabase module
export const mockSupabase = createSupabaseMock();

// Mock the entire Supabase client creation
vi.mock('../supabase.js', () => ({
	supabase: mockSupabase
}));