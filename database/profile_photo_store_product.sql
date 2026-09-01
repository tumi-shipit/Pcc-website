insert into public.store_products (
  name,
  slug,
  description,
  category,
  colour,
  regular_price,
  sale_price,
  sale_label,
  sale_starts_at,
  sale_ends_at,
  stock_status,
  stock_quantity,
  primary_image_url,
  secondary_image_url,
  published,
  featured,
  display_order
)
values (
  'PCC Player Profile Photo Upgrade',
  'pcc-player-profile-photo-upgrade',
  'Add a professionally presented portrait to your PCC player profile. After payment, PCC will contact you to collect and approve the correct image for your profile.',
  'PCC Profile Service',
  'Digital service',
  50,
  10,
  'September special',
  '2026-09-01 00:00:00+02',
  '2026-10-01 00:00:00+02',
  'available',
  null,
  '/images/store/pcc-profile-photo-upgrade.png',
  null,
  true,
  true,
  8
)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    category = excluded.category,
    colour = excluded.colour,
    regular_price = excluded.regular_price,
    sale_price = excluded.sale_price,
    sale_label = excluded.sale_label,
    sale_starts_at = excluded.sale_starts_at,
    sale_ends_at = excluded.sale_ends_at,
    stock_status = excluded.stock_status,
    stock_quantity = excluded.stock_quantity,
    primary_image_url = excluded.primary_image_url,
    secondary_image_url = excluded.secondary_image_url,
    published = excluded.published,
    featured = excluded.featured,
    display_order = excluded.display_order;

select
  name,
  regular_price,
  sale_price,
  sale_starts_at,
  sale_ends_at,
  published
from public.store_products
where slug = 'pcc-player-profile-photo-upgrade';
