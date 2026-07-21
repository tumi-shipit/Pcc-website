-- Deprecated.
--
-- Do not run this file for admin access.
-- Use database/admin_access_rebuild.sql instead.
--
-- The old version of this script treated every legacy admin whitelist row as a
-- super admin. That is too broad now that PCC needs separate Super Admin and
-- Admin access for future organisations.

select 'Use database/admin_access_rebuild.sql for the current admin access system.' as note;
