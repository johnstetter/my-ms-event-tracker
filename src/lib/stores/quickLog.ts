import { writable } from 'svelte/store';
import type { EventType, BodyLocation } from '../supabase.js';

// Define the steps in the quick log flow (simplified)
export type QuickLogStep = 'type-selection' | 'custom-fields' | 'submitting';

// Quick log state interface (simplified)
export interface QuickLogState {
	step: QuickLogStep;
	selectedType: EventType | null;
	customFields: Record<string, any>; // All form data stored here
	isSubmitting: boolean;
	error: string | null;
	startTime: number | null;
}

// Initial state
const initialState: QuickLogState = {
	step: 'type-selection',
	selectedType: null,
	customFields: {},
	isSubmitting: false,
	error: null,
	startTime: null
};

// Create the store
export const quickLogStore = writable<QuickLogState>(initialState);

// Action creators for the store
export const quickLogActions = {
	// Start the quick log flow
	start() {
		quickLogStore.update(state => ({
			...initialState,
			startTime: Date.now()
		}));
	},

	// Select an event type and go to unified custom-fields step
	selectEventType(eventType: EventType) {
		quickLogStore.update(state => ({
			...state,
			selectedType: eventType,
			step: 'custom-fields', // Always go to unified form step
			error: null
		}));
	},


	// Set custom field value
	setCustomField(fieldName: string, value: any) {
		quickLogStore.update(state => ({
			...state,
			customFields: {
				...state.customFields,
				[fieldName]: value
			},
			error: null
		}));
	},

	// Continue from custom fields to submission
	continueFromCustomFields() {
		quickLogStore.update(state => ({
			...state,
			step: 'submitting'
		}));
	},

	// Set submitting state
	setSubmitting(isSubmitting: boolean) {
		quickLogStore.update(state => ({
			...state,
			isSubmitting
		}));
	},

	// Set error state
	setError(error: string | null) {
		quickLogStore.update(state => ({
			...state,
			error,
			isSubmitting: false
		}));
	},

	// Reset to initial state (success or cancel)
	reset() {
		quickLogStore.set(initialState);
	},

	// Go back to previous step (simplified for 3-step flow)
	goBack() {
		quickLogStore.update(state => {
			let previousStep: QuickLogStep = 'type-selection';

			switch (state.step) {
				case 'custom-fields':
					previousStep = 'type-selection';
					break;
				case 'submitting':
					previousStep = 'custom-fields';
					break;
			}

			return {
				...state,
				step: previousStep,
				error: null
			};
		});
	}
};

// Derived stores for convenience
export const isQuickLogging = writable(false);

// Update isQuickLogging when step changes
quickLogStore.subscribe(state => {
	isQuickLogging.set(state.step !== 'type-selection' || state.startTime !== null);
});

// Helper function to calculate elapsed time
export function getElapsedTime(state: QuickLogState): number {
	return state.startTime ? Date.now() - state.startTime : 0;
}