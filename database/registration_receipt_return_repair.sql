-- Preserve the installed registration rules and expose a receipt-returning RPC.
-- The original function is retained so existing deployed pages keep working.
begin;
do $repair$
declare
  target regprocedure;
  definition text;
  result_type text;
begin
  target := 'public.submit_tournament_registration(text,text,text,date,text,integer,text,text,text,text,uuid,uuid,text,text)'::regprocedure;
  select pg_get_functiondef(target), pg_get_function_result(target)
    into definition, result_type;
  definition := replace(definition,
    'FUNCTION public.submit_tournament_registration(',
    'FUNCTION public.submit_tournament_registration_with_receipt(');
  if result_type = 'void' then
    definition := replace(definition, 'RETURNS void', 'RETURNS uuid');
    if definition !~* 'declare' or definition !~* 'insert into public.registrations' then
      raise exception 'Unexpected registration function. No changes applied.';
    end if;
    definition := regexp_replace(definition, '\mdeclare\M', 'declare receipt_registration_id uuid;', 'i');
    -- Only the final INSERT is changed; eligibility, identity and duplicate rules remain intact.
    if definition !~ '\);\s*end;\s*\$function\$' then
      raise exception 'Unexpected registration function ending. No changes applied.';
    end if;
    definition := regexp_replace(definition, '\);\s*end;\s*\$function\$',
      ') returning id into receipt_registration_id; return receipt_registration_id; end; $function$');
  elsif result_type <> 'uuid' then
    raise exception 'Unsupported registration return type: %', result_type;
  end if;
  execute definition;
end;
$repair$;
revoke all on function public.submit_tournament_registration_with_receipt(text,text,text,date,text,integer,text,text,text,text,uuid,uuid,text,text) from public;
grant execute on function public.submit_tournament_registration_with_receipt(text,text,text,date,text,integer,text,text,text,text,uuid,uuid,text,text) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
select 'Registration receipt function installed' as status;
