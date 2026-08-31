create table if not exists public.store_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  category text not null default 'Equipment',
  colour text,
  regular_price numeric(10,2) not null check (regular_price >= 0),
  sale_price numeric(10,2) check (sale_price is null or sale_price >= 0),
  sale_label text,
  sale_starts_at timestamptz,
  sale_ends_at timestamptz,
  stock_status text not null default 'available'
    check (stock_status in ('available', 'out-of-stock', 'coming-soon')),
  stock_quantity integer check (stock_quantity is null or stock_quantity >= 0),
  primary_image_url text,
  secondary_image_url text,
  published boolean not null default false,
  featured boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sale_price is null or sale_price < regular_price),
  check (sale_ends_at is null or sale_starts_at is null or sale_ends_at > sale_starts_at)
);

create index if not exists store_products_public_order_idx
  on public.store_products(published, display_order, created_at);

create or replace function public.set_store_product_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_store_product_updated_at on public.store_products;
create trigger set_store_product_updated_at
before update on public.store_products
for each row execute function public.set_store_product_updated_at();

alter table public.store_products enable row level security;

drop policy if exists "Public can read published store products" on public.store_products;
create policy "Public can read published store products"
on public.store_products
for select
to anon, authenticated
using (published = true);

drop policy if exists "Admins manage store products" on public.store_products;
create policy "Admins manage store products"
on public.store_products
for all
to authenticated
using (public.has_admin_access())
with check (public.has_admin_access());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read product images" on storage.objects;
create policy "Public can read product images"
on storage.objects for select to public
using (bucket_id = 'product-images');

drop policy if exists "Admins can upload product images" on storage.objects;
create policy "Admins can upload product images"
on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and public.has_admin_access());

drop policy if exists "Admins can update product images" on storage.objects;
create policy "Admins can update product images"
on storage.objects for update to authenticated
using (bucket_id = 'product-images' and public.has_admin_access())
with check (bucket_id = 'product-images' and public.has_admin_access());

drop policy if exists "Admins can delete product images" on storage.objects;
create policy "Admins can delete product images"
on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and public.has_admin_access());

insert into public.store_products (
  name, slug, description, category, colour, regular_price, stock_status,
  primary_image_url, secondary_image_url, published, display_order
)
values
  ('PCC Tournament Chess Mat', 'pcc-tournament-chess-mat', 'A faux-leather tournament chess mat for club, school and competition play.', 'Chessboard', 'Faux leather', 160, 'available', null, null, true, 1),
  ('YS-902 Digital Chess Clock', 'ys-902-digital-chess-clock', 'The YS-902 digital chess-clock model for timed games and tournament play.', 'Chess clock', 'YS-902', 400, 'available', null, null, true, 2),
  ('PS-1688 Tournament Chess Clock', 'ps-1688-tournament-chess-clock', 'The PS-1688 digital tournament chess-clock model for timed competition games.', 'Chess clock', 'PS-1688', 750, 'available', '/images/store/ps-1688-chess-clock.jpg', null, true, 3),
  ('HQT101 Digital Chess Clock', 'hqt101-digital-chess-clock', 'The HQT101 digital chess-clock model for club and tournament games.', 'Chess clock', 'HQT101', 600, 'available', '/images/store/hqt101-chess-clock.png', null, true, 4),
  ('PCC Chess Pieces Polo', 'pcc-chess-pieces-polo', 'A white short-sleeve polo featuring PCC branding, South African flag detail and chess-piece artwork.', 'Polo', 'White', 550, 'out-of-stock', '/images/store/pcc-chess-pieces-polo.png', '/images/store/pcc-chess-pieces-polo-back.png', true, 5),
  ('PCC Club Hoodie', 'pcc-club-hoodie', 'A red pullover hoodie featuring PCC branding, chessboard detail and a front pouch pocket.', 'Hoodie', 'Red', 750, 'out-of-stock', '/images/store/pcc-club-hoodie.png', null, true, 6),
  ('PCC Tournament Jacket', 'pcc-tournament-jacket', 'A black zip-up jacket featuring PCC branding, South African flag detail and a chessboard finish.', 'Jacket', 'Black', 1200, 'out-of-stock', '/images/store/pcc-tournament-jacket.png', null, true, 7)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    category = excluded.category,
    colour = excluded.colour,
    regular_price = excluded.regular_price,
    stock_status = excluded.stock_status,
    primary_image_url = coalesce(public.store_products.primary_image_url, excluded.primary_image_url),
    secondary_image_url = coalesce(public.store_products.secondary_image_url, excluded.secondary_image_url),
    display_order = excluded.display_order;

notify pgrst, 'reload schema';

select 'Store products and product image storage installed' as status;
