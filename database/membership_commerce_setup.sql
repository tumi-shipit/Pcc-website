create table if not exists public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('monthly','three-months','six-months','yearly')),
  name text not null,
  duration_months integer not null check (duration_months in (1,3,6,12)),
  price numeric(10,2) not null default 0 check (price >= 0),
  description text,
  card_image_url text,
  published boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.membership_plans (code,name,duration_months,display_order)
values ('monthly','Monthly membership',1,1),('three-months','3-month membership',3,2),('six-months','6-month membership',6,3),('yearly','Yearly membership',12,4)
on conflict (code) do nothing;

create table if not exists public.membership_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  plan_id uuid not null references public.membership_plans(id),
  plan_name text not null,
  duration_months integer not null,
  amount numeric(10,2) not null,
  member_name text not null,
  member_email text not null,
  member_phone text not null,
  chess_sa_id text,
  status text not null default 'created' check (status in ('created','payment_pending','paid','failed')),
  yoco_checkout_id text,
  yoco_payment_id text,
  yoco_mode text,
  membership_id uuid references public.member_memberships(id),
  verification_token uuid not null default gen_random_uuid() unique,
  starts_on date,
  expires_on date,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists membership_orders_email_idx on public.membership_orders(lower(member_email),created_at desc);
alter table public.membership_plans enable row level security;
alter table public.membership_orders enable row level security;
grant select on public.membership_plans to anon,authenticated;
grant select,insert,update,delete on public.membership_plans to authenticated;
grant select on public.membership_orders to authenticated;

drop policy if exists "Public reads published membership plans" on public.membership_plans;
create policy "Public reads published membership plans" on public.membership_plans for select to anon,authenticated using (published or exists(select 1 from public.admin_users where user_id=auth.uid()));
drop policy if exists "Admins manage membership plans" on public.membership_plans;
create policy "Admins manage membership plans" on public.membership_plans for all to authenticated using (exists(select 1 from public.admin_users where user_id=auth.uid())) with check (exists(select 1 from public.admin_users where user_id=auth.uid()));
drop policy if exists "Members read own membership orders" on public.membership_orders;
create policy "Members read own membership orders" on public.membership_orders for select to authenticated using (lower(member_email)=lower(coalesce(auth.jwt()->>'email','')) or exists(select 1 from public.admin_users where user_id=auth.uid()));

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('membership-card-images','membership-card-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Public reads membership card images" on storage.objects;
create policy "Public reads membership card images" on storage.objects for select to public using (bucket_id='membership-card-images');
drop policy if exists "Admins manage membership card images" on storage.objects;
create policy "Admins manage membership card images" on storage.objects for all to authenticated using (bucket_id='membership-card-images' and exists(select 1 from public.admin_users where user_id=auth.uid())) with check (bucket_id='membership-card-images' and exists(select 1 from public.admin_users where user_id=auth.uid()));

create or replace function public.complete_membership_order(p_order_id uuid,p_payment_id text,p_mode text,p_amount_cents integer,p_currency text)
returns boolean language plpgsql security definer set search_path=public as $$
declare o public.membership_orders%rowtype; m public.member_memberships%rowtype; start_on date; end_on date;
begin
  select * into o from public.membership_orders where id=p_order_id for update;
  if not found then return false; end if;
  if o.status='paid' then return true; end if;
  if upper(p_currency)<>'ZAR' or round(o.amount*100)::integer<>p_amount_cents then return false; end if;
  select * into m from public.member_memberships where lower(member_email)=lower(o.member_email) limit 1 for update;
  start_on:=case when m.id is not null and m.end_date>=current_date then m.end_date+1 else current_date end;
  end_on:=(start_on+(o.duration_months||' months')::interval-'1 day'::interval)::date;
  if m.id is null then
    insert into public.member_memberships(member_email,chess_sa_id,membership_type,membership_status,start_date,end_date,amount_paid,payment_reference,payment_date,notes)
    values(lower(o.member_email),nullif(o.chess_sa_id,''),o.plan_name,'Active',start_on,end_on,o.amount,o.order_number,current_date,'Purchased through PCC membership checkout') returning * into m;
  else
    update public.member_memberships set membership_type=o.plan_name,membership_status='Active',start_date=start_on,end_date=end_on,amount_paid=o.amount,payment_reference=o.order_number,payment_date=current_date,updated_at=now() where id=m.id returning * into m;
  end if;
  update public.membership_orders set status='paid',yoco_payment_id=p_payment_id,yoco_mode=p_mode,membership_id=m.id,starts_on=start_on,expires_on=end_on,paid_at=now(),updated_at=now() where id=o.id;
  return true;
end; $$;
revoke all on function public.complete_membership_order(uuid,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.complete_membership_order(uuid,text,text,integer,text) to service_role;
notify pgrst,'reload schema';
select 'Membership commerce installed' as status;
