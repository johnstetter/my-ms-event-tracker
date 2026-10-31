-- =============================================
-- INTERVENTION_EVENT_TYPES SCOPE-TAG TABLE
-- =============================================
-- Many-to-many join: which interventions apply to which event types.
-- Universal-by-default semantics enforced in the application layer:
--   intervention with zero rows here = applies to all event types
--   intervention with rows here      = applies only to listed event types
--
-- System interventions (interventions.user_id IS NULL) are seed-frozen.
-- The write policy ties scope-tag ownership to the intervention's user_id,
-- so users can only manage tags for interventions they own. This means
-- system intervention scope is configured at install time and not editable
-- from the UI; per-user overrides are out of scope for this migration.

CREATE TABLE intervention_event_types (
  intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  event_type_id UUID NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
  PRIMARY KEY (intervention_id, event_type_id)
);

ALTER TABLE intervention_event_types ENABLE ROW LEVEL SECURITY;

-- Read: visible if both sides are visible to the user
CREATE POLICY "Users can read visible scope tags"
ON intervention_event_types FOR SELECT TO authenticated
USING (
  intervention_id IN (
    SELECT id FROM interventions WHERE user_id IS NULL OR auth.uid() = user_id
  )
  AND event_type_id IN (
    SELECT id FROM event_types WHERE user_id IS NULL OR auth.uid() = user_id
  )
);

-- Write: only for interventions the user owns. WITH CHECK applies to INSERT
-- and UPDATE; USING applies to DELETE (the FOR ALL umbrella covers both).
CREATE POLICY "Users can manage scope tags for own interventions"
ON intervention_event_types FOR ALL TO authenticated
USING (
  intervention_id IN (SELECT id FROM interventions WHERE auth.uid() = user_id)
)
WITH CHECK (
  intervention_id IN (SELECT id FROM interventions WHERE auth.uid() = user_id)
);
