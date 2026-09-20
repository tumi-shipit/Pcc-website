-- Fix the installed function in place; preserve every other merge rule.
-- This script does NOT execute a merge or modify player records.
begin;
do $repair$
declare
  definition text;
  before_text text;
  after_text text;
  old_parts text[] := array[
    '  merge_history_id uuid;',
    'returning id into merge_history_id;',
    E'    duplicate_player_id,\n    merge_history_id,\n    auth.uid()',
    'coalesce(aliases.merge_history_id, merge_history_id)'
  ];
  new_parts text[] := array[
    '  v_merge_history_id uuid;',
    'returning id into v_merge_history_id;',
    E'    duplicate_player_id,\n    v_merge_history_id,\n    auth.uid()',
    'coalesce(aliases.merge_history_id, v_merge_history_id)'
  ];
begin
  select replace(pg_get_functiondef('public.merge_players(uuid,uuid,text)'::regprocedure), E'\r\n', E'\n') into definition;
  if position('  v_merge_history_id uuid;' in definition) > 0
     and position('  merge_history_id uuid;' in definition) = 0 then
    raise notice 'Variable repair is already installed.';
    return;
  end if;
  for i in 1..array_length(old_parts, 1) loop
    before_text := old_parts[i];
    after_text := new_parts[i];
    if (length(definition) - length(replace(definition, before_text, ''))) / length(before_text) <> 1 then
      raise exception 'Installed function differs at replacement %. Nothing changed; export its definition for inspection.', i;
    end if;
    definition := replace(definition, before_text, after_text);
  end loop;
  execute definition;
end;
$repair$;
commit;
select 'Merge history variable repair installed' as status;
