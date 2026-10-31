import { supabase, type Intervention } from '../supabase.js';
import { createServiceLogger } from '../logging/index.js';

const log = createServiceLogger('interventionScopeService');

export interface ServiceResult<T = void> {
	success: boolean;
	data?: T;
	error?: string;
}

/**
 * Returns interventions that apply to the given event type, using the
 * universal-by-default rule:
 *
 *   - intervention has zero scope tags → applies to all event types (universal)
 *   - intervention has scope tags     → applies only when one matches eventTypeId
 *
 * PostgREST cannot natively express "rows with no related rows" without a
 * subquery, so this is implemented as two queries merged in JS. The dataset
 * is small (~15 interventions × ~6 event types) so this is cheap.
 */
export async function getInterventionsForEventType(
	eventTypeId: string
): Promise<ServiceResult<Intervention[]>> {
	const operationLog = log.withContext({ operation: 'getInterventionsForEventType' });

	try {
		// Two queries merged in JS: the scope-tags read pulls every visible row
		// (RLS filters to system + own). For the stated dataset (~15 interventions,
		// ~6 event types, ~30 scope tags) the full read is cheap. Revisit if
		// these grow into the hundreds.
		const [interventionsResult, scopeResult] = await Promise.all([
			supabase
				.from('interventions')
				.select('*')
				.eq('active', true)
				.order('sort_order', { ascending: true }),
			supabase.from('intervention_event_types').select('intervention_id, event_type_id')
		]);

		if (interventionsResult.error) {
			operationLog.error('Failed to load interventions', interventionsResult.error as Error);
			return { success: false, error: `Database error: ${interventionsResult.error.message}` };
		}
		if (scopeResult.error) {
			operationLog.error('Failed to load scope tags', scopeResult.error as Error);
			return { success: false, error: `Database error: ${scopeResult.error.message}` };
		}

		// Build interventionId → Set<eventTypeId> map
		const tagsByIntervention = new Map<string, Set<string>>();
		for (const row of scopeResult.data ?? []) {
			let set = tagsByIntervention.get(row.intervention_id);
			if (!set) {
				set = new Set();
				tagsByIntervention.set(row.intervention_id, set);
			}
			set.add(row.event_type_id);
		}

		const filtered = (interventionsResult.data ?? []).filter((intervention) => {
			const tags = tagsByIntervention.get(intervention.id);
			// Universal: no tags → applies everywhere
			if (!tags || tags.size === 0) return true;
			// Scoped: must include the requested event type
			return tags.has(eventTypeId);
		});

		return { success: true, data: filtered };
	} catch (error) {
		operationLog.error('Unexpected error in getInterventionsForEventType', error as Error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error occurred'
		};
	}
}

/** Returns the event_type_ids tagged for the given intervention. */
export async function getScopeTagsForIntervention(
	interventionId: string
): Promise<ServiceResult<string[]>> {
	const { data, error } = await supabase
		.from('intervention_event_types')
		.select('event_type_id')
		.eq('intervention_id', interventionId);

	if (error) {
		return { success: false, error: `Database error: ${error.message}` };
	}
	return { success: true, data: (data ?? []).map((row) => row.event_type_id) };
}

/** Returns the intervention_ids tagged for the given event type. */
export async function getScopeTagsForEventType(
	eventTypeId: string
): Promise<ServiceResult<string[]>> {
	const { data, error } = await supabase
		.from('intervention_event_types')
		.select('intervention_id')
		.eq('event_type_id', eventTypeId);

	if (error) {
		return { success: false, error: `Database error: ${error.message}` };
	}
	return { success: true, data: (data ?? []).map((row) => row.intervention_id) };
}

/**
 * Replaces all scope tags for a given intervention with the new set.
 * Implemented as delete-then-insert. The delete is explicitly scoped by
 * intervention_id — a missing .eq() would nuke the whole table.
 *
 * Concurrency note: for solo single-user there's no real race, but this
 * is two operations without true transaction support. If the insert fails
 * after the delete succeeded, the intervention is left untagged (universal).
 */
export async function setScopeTagsForIntervention(
	interventionId: string,
	eventTypeIds: string[]
): Promise<ServiceResult> {
	// SAFETY: the .eq() must always be present so the delete is scoped.
	const { error: deleteError } = await supabase
		.from('intervention_event_types')
		.delete()
		.eq('intervention_id', interventionId);

	if (deleteError) {
		return { success: false, error: `Failed to clear existing tags: ${deleteError.message}` };
	}

	if (eventTypeIds.length === 0) {
		return { success: true };
	}

	const rows = eventTypeIds.map((eventTypeId) => ({
		intervention_id: interventionId,
		event_type_id: eventTypeId
	}));

	const { error: insertError } = await supabase.from('intervention_event_types').insert(rows);

	if (insertError) {
		return { success: false, error: `Failed to insert scope tags: ${insertError.message}` };
	}

	return { success: true };
}

/**
 * Replaces all scope tags for a given event type with the new set.
 * Same delete-then-insert pattern as setScopeTagsForIntervention.
 *
 * IMPORTANT — partial-effect by design: the Supabase JS .delete() does not
 * raise an error for rows excluded by RLS, so this delete clears only the
 * scope-tag rows pointing at user-owned interventions. Rows tied to system
 * interventions (user_id IS NULL) are left intact; the corresponding insert
 * for them would also be RLS-denied. This is the seed-frozen guarantee for
 * system interventions and matches what the admin event-type editor offers
 * the user (the multi-select only lists user-owned interventions).
 */
export async function setScopeTagsForEventType(
	eventTypeId: string,
	interventionIds: string[]
): Promise<ServiceResult> {
	// SAFETY: the .eq() must always be present so the delete is scoped.
	const { error: deleteError } = await supabase
		.from('intervention_event_types')
		.delete()
		.eq('event_type_id', eventTypeId);

	if (deleteError) {
		return { success: false, error: `Failed to clear existing tags: ${deleteError.message}` };
	}

	if (interventionIds.length === 0) {
		return { success: true };
	}

	const rows = interventionIds.map((interventionId) => ({
		intervention_id: interventionId,
		event_type_id: eventTypeId
	}));

	const { error: insertError } = await supabase.from('intervention_event_types').insert(rows);

	if (insertError) {
		return { success: false, error: `Failed to insert scope tags: ${insertError.message}` };
	}

	return { success: true };
}
