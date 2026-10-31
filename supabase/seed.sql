-- =============================================
-- LOCAL DEVELOPMENT SEED DATA
-- =============================================
-- Runs automatically after migrations on every `supabase db reset`.
-- Provides a known dev user and a small set of sample events so the
-- app is usable immediately after a reset, without having to sign up
-- again or stare at empty timelines.
--
-- IMPORTANT:
--   * Local development only. Never executed against the production
--     Supabase project — that's controlled by `[db.seed]` in
--     `supabase/config.toml`, which only the local CLI consults.
--   * Credentials below are intentionally throwaway. Do not reuse this
--     password anywhere real.
--   * Everything below is idempotent — safe to re-run.
--
-- Dev credentials:
--   Email:    dev@local.test
--   Password: devpassword
-- =============================================

do $$
declare
  dev_user_id constant uuid := '00000000-0000-0000-0000-0000000d3000';
  dev_email   constant text := 'dev@local.test';
  dev_password constant text := 'devpassword';

  spasm_type_id uuid;
  pain_type_id  uuid;
  bm_type_id    uuid;

  left_calf_id  uuid;
  lower_back_id uuid;

  baclofen_id   uuid;
  stretching_id uuid;

  spasm_event_id uuid;
  pain_event_id  uuid;
begin
  ----------------------------------------------
  -- 1. Dev user (auth.users + auth.identities)
  ----------------------------------------------
  if not exists (select 1 from auth.users where id = dev_user_id) then
    -- GoTrue reads several token columns as non-nullable strings; if any are
    -- NULL the auth API fails with "Database error querying schema" on sign-in.
    -- Explicitly set the no-default token columns to '' to satisfy the scanner.
    insert into auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) values (
      dev_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      dev_email,
      crypt(dev_password, gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      '{}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    insert into auth.identities (
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      dev_user_id,
      dev_user_id::text,
      jsonb_build_object('sub', dev_user_id::text, 'email', dev_email, 'email_verified', true),
      'email',
      now(),
      now(),
      now()
    );
  end if;

  ----------------------------------------------
  -- 2. Look up reference rows seeded by migrations
  ----------------------------------------------
  select id into spasm_type_id from public.event_types where slug = 'muscle-spasm';
  select id into pain_type_id  from public.event_types where slug = 'pain-episode';
  select id into bm_type_id    from public.event_types where slug = 'bowel-movement';

  select id into left_calf_id  from public.body_locations where name = 'Left Calf';
  select id into lower_back_id from public.body_locations where name = 'Lower Back';

  select id into baclofen_id   from public.interventions where name = 'Oral Baclofen';
  select id into stretching_id from public.interventions where name = 'Stretching';

  ----------------------------------------------
  -- 3. Sample events (only if the dev user has none yet)
  ----------------------------------------------
  if not exists (select 1 from public.events where user_id = dev_user_id) then
    -- Spasm with body location + intervention
    insert into public.events (user_id, event_type_id, started_at, ended_at, severity, notes)
    values (dev_user_id, spasm_type_id, now() - interval '2 days', now() - interval '2 days' + interval '12 minutes', 6, 'Sample spasm event from seed')
    returning id into spasm_event_id;

    insert into public.event_locations (event_id, body_location_id)
    values (spasm_event_id, left_calf_id);

    insert into public.event_interventions (event_id, intervention_id, applied_at, notes)
    values (spasm_event_id, baclofen_id, now() - interval '2 days' + interval '2 minutes', 'Took 10mg');

    -- Pain episode with body location + intervention
    insert into public.events (user_id, event_type_id, started_at, ended_at, severity, notes)
    values (dev_user_id, pain_type_id, now() - interval '1 day', now() - interval '1 day' + interval '45 minutes', 4, 'Sample pain event from seed')
    returning id into pain_event_id;

    insert into public.event_locations (event_id, body_location_id)
    values (pain_event_id, lower_back_id);

    insert into public.event_interventions (event_id, intervention_id, applied_at)
    values (pain_event_id, stretching_id, now() - interval '1 day' + interval '5 minutes');

    -- Bowel movement (no severity, no location)
    insert into public.events (user_id, event_type_id, started_at, ended_at, attributes)
    values (
      dev_user_id,
      bm_type_id,
      now() - interval '6 hours',
      now() - interval '6 hours' + interval '8 minutes',
      jsonb_build_object('duration', 'Normal (5-15 min)', 'consistency', 'Normal', 'amount', 2)
    );
  end if;
end $$;
