-- Create event_notes table for timeline-based notes
-- This replaces the single notes field in events table with timestamped notes

CREATE TABLE IF NOT EXISTS public.event_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_notes_event_id ON public.event_notes(event_id);
CREATE INDEX IF NOT EXISTS idx_event_notes_created_at ON public.event_notes(created_at);

-- Enable RLS (Row Level Security) for user isolation
ALTER TABLE public.event_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policy - users can only access notes for their own events
CREATE POLICY "Users can only access their own event notes"
    ON public.event_notes
    FOR ALL
    USING (
        event_id IN (
            SELECT id FROM public.events WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        event_id IN (
            SELECT id FROM public.events WHERE user_id = auth.uid()
        )
    );

-- Grant permissions
GRANT ALL ON public.event_notes TO authenticated;

-- Migration: Convert existing event notes to event_notes entries
-- Only migrate non-empty notes
INSERT INTO public.event_notes (event_id, content, created_at)
SELECT
    id as event_id,
    notes as content,
    created_at
FROM public.events
WHERE notes IS NOT NULL
    AND TRIM(notes) != '';

-- After migration, we could remove the notes column, but for safety we'll keep it
-- Users can manually remove it later if desired
-- ALTER TABLE public.events DROP COLUMN notes;