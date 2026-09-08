begin;
create or replace function public.current_admin_role()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  clean_email text;
  resolved_role text;
begin
  if auth.uid() is null then
    return null;
  end if;

  clean_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));


  if exists (
    select 1
    from public.admin_staff_permissions
    where access_status = 'Suspended'
      and (
        admin_user_id = auth.uid()
        or (clean_email <> '' and lower(email) = clean_email)
      )
  ) then
    return null;
  end if;

  if exists (
    select 1
    from public.organisation_admin_permissions
    where access_status = 'Suspended'
      and (
        admin_user_id = auth.uid()
        or (clean_email <> '' and lower(email) = clean_email)
      )
  )
  and not exists (
    select 1
    from public.organisation_admin_permissions
    where access_status = 'Active'
      and (
        admin_user_id = auth.uid()
        or (clean_email <> '' and lower(email) = clean_email)
      )
  ) then
    return null;
  end if;

  select role
  into resolved_role
  from public.admin_staff_permissions
  where access_status = 'Active'
    and (
      admin_user_id = auth.uid()
      or (clean_email <> '' and lower(email) = clean_email)
    )
  order by case when role = 'super_admin' then 0 else 1 end
  limit 1;

  if resolved_role is not null then

    return resolved_role;
  end if;

  select role
  into resolved_role
  from public.organisation_admin_permissions
  where access_status = 'Active'
    and (
      admin_user_id = auth.uid()
      or (clean_email <> '' and lower(email) = clean_email)
    )
  order by case
    when role = 'organisation_admin' then 0
    when role = 'tournament_staff' then 1
    else 2
  end
  limit 1;

  if resolved_role is not null then
    return resolved_role;
  end if;

  if exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  ) then
    if not exists (
      select 1
      from public.admin_staff_permissions
      where role = 'super_admin'
        and access_status = 'Active'
    ) then
      return 'super_admin';
    end if;

    return 'admin';
  end if;

  return null;
end;
$$;

create or replace function public.link_current_admin_account()
returns void language plpgsql security definer set search_path = public as $$
declare clean_email text := lower(trim(coalesce(auth.jwt()->>'email','')));
begin
  if auth.uid() is null or clean_email = '' then return; end if;
  update public.admin_staff_permissions set admin_user_id=auth.uid(), updated_at=now()
    where admin_user_id is null and lower(email)=clean_email;
  update public.organisation_admin_permissions set admin_user_id=auth.uid(), updated_at=now()
    where admin_user_id is null and lower(email)=clean_email;
  if public.current_admin_role() in ('super_admin','admin') and exists (
    select 1 from public.admin_staff_permissions where access_status='Active'
    and (admin_user_id=auth.uid() or lower(email)=clean_email)
  ) then
    insert into public.admin_users(user_id) select auth.uid()
    where not exists(select 1 from public.admin_users where user_id=auth.uid());
  end if;
end;
$$;
revoke all on function public.link_current_admin_account() from public, anon;
grant execute on function public.link_current_admin_account() to authenticated;
notify pgrst, 'reload schema';
commit;
select 'Read-only admin role repair installed' as status;

