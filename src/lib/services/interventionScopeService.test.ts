import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	getInterventionsForEventType,
	getScopeTagsForIntervention,
	getScopeTagsForEventType,
	setScopeTagsForIntervention,
	setScopeTagsForEventType
} from './interventionScopeService.js';

vi.mock('../supabase.js', () => ({
	supabase: { from: vi.fn() }
}));

const universalIntervention = {
	id: 'int-rest',
	name: 'Rest',
	category: 'Physical',
	sort_order: 5,
	active: true,
	user_id: null
};
const physicalIntervention = {
	id: 'int-stretch',
	name: 'Stretching',
	category: 'Physical',
	sort_order: 6,
	active: true,
	user_id: null
};
const mentalIntervention = {
	id: 'int-grounding',
	name: 'Grounding Exercise',
	category: 'Mental Health',
	sort_order: 11,
	active: true,
	user_id: null
};

const PAIN_ID = 'evt-pain';
const PANIC_ID = 'evt-panic';

describe('getInterventionsForEventType', () => {
	let mockSupabase: any;

	beforeEach(async () => {
		vi.clearAllMocks();
		const { supabase } = await import('../supabase.js');
		mockSupabase = supabase;
	});

	function setupTwoQueryMock(interventions: any[], scopeRows: any[]) {
		// First .from() call: interventions select chain — terminal at order()
		const interventionsChain = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockResolvedValue({ data: interventions, error: null })
		};
		// Second .from() call: scope tags select chain — terminal at select()
		const scopeChain = {
			select: vi.fn().mockResolvedValue({ data: scopeRows, error: null })
		};
		let callCount = 0;
		vi.mocked(mockSupabase.from).mockImplementation(() => {
			callCount += 1;
			return callCount === 1 ? interventionsChain : scopeChain;
		});
	}

	it('returns interventions with no scope tags as universal', async () => {
		setupTwoQueryMock(
			[universalIntervention],
			[] // no scope tags at all
		);

		const result = await getInterventionsForEventType(PANIC_ID);

		expect(result.success).toBe(true);
		expect(result.data).toEqual([universalIntervention]);
	});

	it('returns interventions tagged to the requested event type', async () => {
		setupTwoQueryMock(
			[mentalIntervention],
			[{ intervention_id: mentalIntervention.id, event_type_id: PANIC_ID }]
		);

		const result = await getInterventionsForEventType(PANIC_ID);

		expect(result.success).toBe(true);
		expect(result.data).toEqual([mentalIntervention]);
	});

	it('excludes interventions tagged only to other event types (regression for filter rule)', async () => {
		setupTwoQueryMock(
			[universalIntervention, physicalIntervention, mentalIntervention],
			[
				{ intervention_id: physicalIntervention.id, event_type_id: PAIN_ID },
				{ intervention_id: mentalIntervention.id, event_type_id: PANIC_ID }
			]
		);

		// Asking for PAIN should yield: universal + physical (tagged to pain).
		// Mental should be excluded because it's only tagged to panic.
		const result = await getInterventionsForEventType(PAIN_ID);

		expect(result.success).toBe(true);
		expect(result.data?.map((i) => i.id).sort()).toEqual(
			[universalIntervention.id, physicalIntervention.id].sort()
		);
	});
});

describe('getScopeTagsForIntervention', () => {
	let mockSupabase: any;

	beforeEach(async () => {
		vi.clearAllMocks();
		const { supabase } = await import('../supabase.js');
		mockSupabase = supabase;
	});

	it('returns the event_type_ids for the intervention', async () => {
		const chain = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: [{ event_type_id: PAIN_ID }, { event_type_id: PANIC_ID }],
				error: null
			})
		};
		vi.mocked(mockSupabase.from).mockReturnValue(chain);

		const result = await getScopeTagsForIntervention(mentalIntervention.id);

		expect(result.success).toBe(true);
		expect(result.data).toEqual([PAIN_ID, PANIC_ID]);
		expect(chain.eq).toHaveBeenCalledWith('intervention_id', mentalIntervention.id);
	});
});

describe('getScopeTagsForEventType', () => {
	let mockSupabase: any;

	beforeEach(async () => {
		vi.clearAllMocks();
		const { supabase } = await import('../supabase.js');
		mockSupabase = supabase;
	});

	it('returns the intervention_ids for the event type', async () => {
		const chain = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: [{ intervention_id: physicalIntervention.id }],
				error: null
			})
		};
		vi.mocked(mockSupabase.from).mockReturnValue(chain);

		const result = await getScopeTagsForEventType(PAIN_ID);

		expect(result.success).toBe(true);
		expect(result.data).toEqual([physicalIntervention.id]);
		expect(chain.eq).toHaveBeenCalledWith('event_type_id', PAIN_ID);
	});
});

describe('setScopeTagsForIntervention', () => {
	let mockSupabase: any;
	let deleteChain: any;
	let insertChain: any;

	beforeEach(async () => {
		vi.clearAllMocks();
		const { supabase } = await import('../supabase.js');
		mockSupabase = supabase;

		deleteChain = {
			delete: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({ data: null, error: null })
		};
		insertChain = {
			insert: vi.fn().mockResolvedValue({ data: null, error: null })
		};

		let callCount = 0;
		vi.mocked(mockSupabase.from).mockImplementation(() => {
			callCount += 1;
			return callCount === 1 ? deleteChain : insertChain;
		});
	});

	it('issues delete scoped by intervention_id then insert with the new pairs', async () => {
		const result = await setScopeTagsForIntervention(mentalIntervention.id, [PAIN_ID, PANIC_ID]);

		expect(result.success).toBe(true);
		expect(deleteChain.delete).toHaveBeenCalledTimes(1);
		// CRITICAL: the .eq() scopes the delete by intervention_id. Without it,
		// the whole table would be wiped.
		expect(deleteChain.eq).toHaveBeenCalledWith('intervention_id', mentalIntervention.id);
		expect(insertChain.insert).toHaveBeenCalledWith([
			{ intervention_id: mentalIntervention.id, event_type_id: PAIN_ID },
			{ intervention_id: mentalIntervention.id, event_type_id: PANIC_ID }
		]);
	});

	it('skips the insert when the new tag list is empty (intervention becomes universal)', async () => {
		const result = await setScopeTagsForIntervention(mentalIntervention.id, []);

		expect(result.success).toBe(true);
		expect(deleteChain.delete).toHaveBeenCalledTimes(1);
		expect(insertChain.insert).not.toHaveBeenCalled();
	});
});

describe('setScopeTagsForEventType', () => {
	let mockSupabase: any;
	let deleteChain: any;
	let insertChain: any;

	beforeEach(async () => {
		vi.clearAllMocks();
		const { supabase } = await import('../supabase.js');
		mockSupabase = supabase;

		deleteChain = {
			delete: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({ data: null, error: null })
		};
		insertChain = {
			insert: vi.fn().mockResolvedValue({ data: null, error: null })
		};

		let callCount = 0;
		vi.mocked(mockSupabase.from).mockImplementation(() => {
			callCount += 1;
			return callCount === 1 ? deleteChain : insertChain;
		});
	});

	it('issues delete scoped by event_type_id then insert with the new pairs', async () => {
		const result = await setScopeTagsForEventType(PANIC_ID, [
			mentalIntervention.id,
			universalIntervention.id
		]);

		expect(result.success).toBe(true);
		// CRITICAL: scope the delete by event_type_id.
		expect(deleteChain.eq).toHaveBeenCalledWith('event_type_id', PANIC_ID);
		expect(insertChain.insert).toHaveBeenCalledWith([
			{ intervention_id: mentalIntervention.id, event_type_id: PANIC_ID },
			{ intervention_id: universalIntervention.id, event_type_id: PANIC_ID }
		]);
	});
});
