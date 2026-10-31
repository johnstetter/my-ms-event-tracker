-- =============================================
-- USER-SCOPED ADMIN INTERFACE MIGRATION
-- =============================================
-- Add user_id columns to allow custom user-specific types
-- while preserving system defaults for all users

-- Add user_id column to event_types
-- NULL = system default (readable by all)
-- user_id = specific user's custom type
ALTER TABLE event_types
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Add user_id column to body_locations
ALTER TABLE body_locations
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Add user_id column to interventions
ALTER TABLE interventions
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Update RLS policies for event_types
-- Remove existing policy and create new ones
DROP POLICY "Event types are readable by authenticated users" ON event_types;

-- System defaults (user_id = NULL) readable by all authenticated users
-- User's own custom types (user_id = current user) readable by user
CREATE POLICY "Users can read system and own event types"
ON event_types FOR SELECT TO authenticated
USING (user_id IS NULL OR auth.uid() = user_id);

-- Users can insert their own custom event types
CREATE POLICY "Users can create custom event types"
ON event_types FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own custom event types (not system defaults)
CREATE POLICY "Users can update own custom event types"
ON event_types FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own custom event types (not system defaults)
CREATE POLICY "Users can delete own custom event types"
ON event_types FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Update RLS policies for body_locations
-- Remove existing policy and create new ones
DROP POLICY "Body locations are readable by authenticated users" ON body_locations;

-- System defaults (user_id = NULL) readable by all authenticated users
-- User's own custom locations (user_id = current user) readable by user
CREATE POLICY "Users can read system and own body locations"
ON body_locations FOR SELECT TO authenticated
USING (user_id IS NULL OR auth.uid() = user_id);

-- Users can insert their own custom body locations
CREATE POLICY "Users can create custom body locations"
ON body_locations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own custom body locations (not system defaults)
CREATE POLICY "Users can update own custom body locations"
ON body_locations FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own custom body locations (not system defaults)
CREATE POLICY "Users can delete own custom body locations"
ON body_locations FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Update RLS policies for interventions
-- Remove existing policy and create new ones
DROP POLICY "Interventions are readable by authenticated users" ON interventions;

-- System defaults (user_id = NULL) readable by all authenticated users
-- User's own custom interventions (user_id = current user) readable by user
CREATE POLICY "Users can read system and own interventions"
ON interventions FOR SELECT TO authenticated
USING (user_id IS NULL OR auth.uid() = user_id);

-- Users can insert their own custom interventions
CREATE POLICY "Users can create custom interventions"
ON interventions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own custom interventions (not system defaults)
CREATE POLICY "Users can update own custom interventions"
ON interventions FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own custom interventions (not system defaults)
CREATE POLICY "Users can delete own custom interventions"
ON interventions FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Add indexes for performance on user_id columns
CREATE INDEX event_types_user_id_idx ON event_types(user_id);
CREATE INDEX body_locations_user_id_idx ON body_locations(user_id);
CREATE INDEX interventions_user_id_idx ON interventions(user_id);

-- Add indexes for queries filtering by user_id and active status
CREATE INDEX event_types_user_active_idx ON event_types(user_id, active) WHERE active = true;
CREATE INDEX body_locations_user_active_idx ON body_locations(user_id, active) WHERE active = true;
CREATE INDEX interventions_user_active_idx ON interventions(user_id, active) WHERE active = true;

-- Composite index for event types ordering
CREATE INDEX event_types_user_sort_idx ON event_types(user_id, sort_order) WHERE active = true;
CREATE INDEX body_locations_user_sort_idx ON body_locations(user_id, sort_order) WHERE active = true;
CREATE INDEX interventions_user_sort_idx ON interventions(user_id, sort_order) WHERE active = true;