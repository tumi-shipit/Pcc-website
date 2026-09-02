-- Connect store products to the existing PCC organisation directory.
-- Partner organisation admins may manage only products owned by their organisation.

alter table public.store_products
  add column if not exists organisation_id uuid references public.organisations(id) on delete restrict;

create index if not exists store_products_organisation_idx
  on public.store_products (organisation_id, published, display_order);

-- Use existing organisation records wherever they already exist.
insert into public.organisations (name, description)
select seed.name, seed.description
from (values
  ('Polokwane Chess Club', 'Home of chess in the heart of Polokwane.'),
  ('Limpopo Chess Academy', 'Chess development and equipment partner.')
) as seed(name, description)
where not exists (
  select 1 from public.organisations organisation
  where lower(trim(organisation.name)) = lower(trim(seed.name))
);

update public.store_products product
set organisation_id = organisation.id
from public.organisations organisation
where lower(trim(organisation.name)) = 'limpopo chess academy'
  and (
    product.slug in (
      'pcc-tournament-chess-mat',
      'ys-902-digital-chess-clock',
      'ps-1688-tournament-chess-clock',
      'hqt101-digital-chess-clock'
    )
    or lower(product.category) = 'chess clock'
  );

update public.store_products product
set organisation_id = organisation.id
from public.organisations organisation
where lower(trim(organisation.name)) = 'polokwane chess club'
  and product.organisation_id is null;

grant select (organisation_id) on public.store_products to anon, authenticated;

drop policy if exists "Admins manage store products" on public.store_products;
drop policy if exists "Store managers manage their organisation products" on public.store_products;
create policy "Store managers manage their organisation products"
on public.store_products
for all
to authenticated
using (
  public.current_admin_role() in ('super_admin', 'admin')
  or (public.current_admin_role() = 'organisation_admin' and organisation_id is not null and public.can_edit_organisation(organisation_id))
)
with check (
  public.current_admin_role() in ('super_admin', 'admin')
  or (public.current_admin_role() = 'organisation_admin' and organisation_id is not null and public.can_edit_organisation(organisation_id))
);

-- Product images use a product-id folder. The product policy above is the
-- authority for catalogue changes; authenticated store managers may upload media.
drop policy if exists "Admins can upload product images" on storage.objects;
create policy "Admins can upload product images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-images' and (
    public.current_admin_role() in ('super_admin', 'admin')
    or (
      public.current_admin_role() = 'organisation_admin'
      and public.can_edit_organisation(((storage.foldername(name))[1])::uuid)
    )
  )
);

drop policy if exists "Admins can update product images" on storage.objects;
create policy "Admins can update product images"
on storage.objects for update to authenticated
using (bucket_id = 'product-images' and (
  public.current_admin_role() in ('super_admin', 'admin')
  or (public.current_admin_role() = 'organisation_admin' and public.can_edit_organisation(((storage.foldername(name))[1])::uuid))
))
with check (bucket_id = 'product-images' and (
  public.current_admin_role() in ('super_admin', 'admin')
  or (public.current_admin_role() = 'organisation_admin' and public.can_edit_organisation(((storage.foldername(name))[1])::uuid))
));

drop policy if exists "Admins can delete product images" on storage.objects;
create policy "Admins can delete product images"
on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and (
  public.current_admin_role() in ('super_admin', 'admin')
  or (public.current_admin_role() = 'organisation_admin' and public.can_edit_organisation(((storage.foldername(name))[1])::uuid))
));

notify pgrst, 'reload schema';

select 'Store organisation sellers installed' as status;
