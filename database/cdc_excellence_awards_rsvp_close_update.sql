-- Close CDC Excellence Awards RSVPs immediately.
-- Existing RSVP records stay in place and remain available to admins.

revoke insert (nominee_name, nominee_surname, respondent_role, nominee_host_name, nomination_categories, email, phone, attending, guest_count, guest_name, dietary_requirements)
  on public.cdc_excellence_awards_rsvps from anon, authenticated;

drop policy if exists cdc_awards_public_rsvp_insert
  on public.cdc_excellence_awards_rsvps;
