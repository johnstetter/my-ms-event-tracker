-- =============================================
-- SEED: MENTAL-HEALTH DOMAIN + RETROACTIVE SCOPE TAGS
-- =============================================
-- Adds three system event types for mental-health logging (panic, anxiety,
-- intrusive thoughts) and five system interventions in a 'Mental Health'
-- category, then wires up scope tags so the picker filters correctly:
--
--   * Mental interventions × mental event types  (5 × 3 = 15 tags)
--   * Physical interventions × physical event types  (6 × 2 = 12 tags)
--   * Universal interventions (Rest, Baclofen, Cannabis variants) untagged
--
-- Universal interventions stay untagged on purpose so they appear in every
-- picker — including bowel-movement (which would otherwise be empty) and
-- the new mental-health types (where rest and PRN-cannabis legitimately
-- help).

-- ---------- New system event types ----------
-- user_id is omitted on purpose; it is nullable and defaults to NULL,
-- which marks these rows as system defaults visible to all authenticated
-- users (per the SELECT RLS in 20260212_add_user_scoped_admin.sql).
INSERT INTO event_types (name, slug, icon, has_duration, has_location, has_severity, sort_order, custom_fields) VALUES
  ('Panic Attack', 'panic-attack', '🌀', true, false, true, 4, '[]'),
  ('Anxiety', 'anxiety', '😰', true, false, true, 5, '[]'),
  ('Intrusive Thought', 'intrusive-thought', '💭', true, false, true, 6, '[]');

-- ---------- New system interventions (Mental Health category) ----------
-- user_id omitted → NULL → system row, same convention as above.
INSERT INTO interventions (name, category, sort_order) VALUES
  ('Grounding Exercise', 'Mental Health', 11),
  ('Deep Breathing', 'Mental Health', 12),
  ('Call Therapist', 'Mental Health', 13),
  ('Journaling', 'Mental Health', 14),
  ('PRN Medication', 'Mental Health', 15);

-- ---------- Scope tags: mental interventions → mental event types ----------
INSERT INTO intervention_event_types (intervention_id, event_type_id)
SELECT i.id, e.id
FROM interventions i, event_types e
WHERE i.name IN ('Grounding Exercise', 'Deep Breathing', 'Call Therapist', 'Journaling', 'PRN Medication')
  AND i.user_id IS NULL
  AND e.slug IN ('panic-attack', 'anxiety', 'intrusive-thought')
  AND e.user_id IS NULL;

-- ---------- Scope tags: physical-only interventions → physical event types ----------
INSERT INTO intervention_event_types (intervention_id, event_type_id)
SELECT i.id, e.id
FROM interventions i, event_types e
WHERE i.name IN ('Stretching', 'Heat Pack', 'Massage', 'Position Change', 'Theracane', 'Tennis Ball')
  AND i.user_id IS NULL
  AND e.slug IN ('muscle-spasm', 'pain-episode')
  AND e.user_id IS NULL;
