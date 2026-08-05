-- Supabase warnings phase 1 repair.
-- Run this in Supabase SQL Editor.
--
-- This intentionally fixes the warnings that are safe to fix in bulk:
-- 1. Mutable function search_path.
-- 2. Public storage bucket listing.
-- 3. Anonymous/public execution of admin/internal SECURITY DEFINER functions.
--
-- It does not remove authenticated execution from admin RPC functions because
-- the website needs signed-in admins to call them. Those functions keep their
-- own permission checks internally.

-- 1. Give every public function an explicit search_path.
do $$
declare
  function_record record;
begin
  for function_record in
    select p.oid::regprocedure as function_signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and not exists (
        select 1
        from unnest(coalesce(p.proconfig, array[]::text[])) config
        where config like 'search_path=%'
      )
  loop
    execute format(
      'alter function %s set search_path = public',
      function_record.function_signature
    );
  end loop;
end $$;

-- 2. Stop public API listing on public image buckets.
-- Public object URLs still work for these public buckets, but clients cannot
-- broadly list all files through storage.objects SELECT policies.
do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd = 'SELECT'
      and (
        qual ilike '%news-images%'
        or qual ilike '%player-photos%'
        or qual ilike '%tournament-gallery%'
      )
  loop
    execute format(
      'drop policy if exists %I on storage.objects',
      policy_record.policyname
    );
  end loop;
end $$;

-- 3. Remove anonymous/public execution from admin and internal RPCs.
-- Keep public registration/search RPCs alone so public tournament registration
-- continues to work.
do $$
declare
  function_record record;
begin
  for function_record in
    select p.oid::regprocedure as function_signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.prosecdef = true
      and p.proname in (
        'admin_batch_update_registration_status',
        'admin_delete_registration',
        'admin_request_restricted_action',
        'admin_review_action_request',
        'admin_review_organiser_registration_request',
        'admin_update_registration_status',
        'admin_upsert_organisation_permission',
        'admin_upsert_staff_permission',
        'can_edit_organisation',
        'can_manage_organisation',
        'current_admin_context',
        'current_admin_role',
        'has_admin_access',
        'import_chessa_rating',
        'import_chessa_ratings_batch',
        'is_admin',
        'is_super_admin',
        'is_super_admin_from_permissions',
        'merge_players',
        'refresh_chessa_identity_links',
        'resolve_member_player_profile'
      )
  loop
    execute format(
      'revoke execute on function %s from public, anon',
      function_record.function_signature
    );

    execute format(
      'grant execute on function %s to authenticated',
      function_record.function_signature
    );
  end loop;
end $$;
