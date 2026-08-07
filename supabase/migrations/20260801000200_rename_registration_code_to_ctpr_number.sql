begin;

do $$
declare
  legacy_column_exists boolean;
  canonical_column_exists boolean;
  demo_ctpr_number text;
  legacy_constraint_name text;
  legacy_index_name text;
  canonical_index_name text;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'registered_programs'
      and column_name = 'registration_code'
  ) into legacy_column_exists;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'registered_programs'
      and column_name = 'ctpr_number'
  ) into canonical_column_exists;

  if not legacy_column_exists and not canonical_column_exists then
    raise exception
      'Cannot rename registered_programs registration identifier: neither registration_code nor ctpr_number exists.';
  end if;

  if legacy_column_exists and canonical_column_exists then
    raise exception
      'Cannot rename registered_programs registration identifier: both registration_code and ctpr_number exist.';
  end if;

  if legacy_column_exists then
    alter table public.registered_programs
      rename column registration_code to ctpr_number;
  end if;

  select ctpr_number
  into demo_ctpr_number
  from public.registered_programs
  where id = 'PROG-DEMO-001';

  if found and demo_ctpr_number = 'REG-DEMO-2026-001' then
    update public.registered_programs
    set ctpr_number = 'CTPR-DEMO-2026-001'
    where id = 'PROG-DEMO-001'
      and ctpr_number = 'REG-DEMO-2026-001';
  elsif found and demo_ctpr_number <> 'CTPR-DEMO-2026-001' then
    raise exception
      'Refusing to replace the unexpected CTPR value for fictional program PROG-DEMO-001.';
  end if;

  -- PostgreSQL retains an inline unique constraint's original name after a column rename.
  select constraint_record.conname
  into legacy_constraint_name
  from pg_constraint constraint_record
  join pg_attribute attribute_record
    on attribute_record.attrelid = constraint_record.conrelid
   and attribute_record.attnum = any (constraint_record.conkey)
  where constraint_record.conrelid = 'public.registered_programs'::regclass
    and constraint_record.contype = 'u'
    and cardinality(constraint_record.conkey) = 1
    and attribute_record.attname = 'ctpr_number'
    and constraint_record.conname like '%registration_code%'
  limit 1;

  if legacy_constraint_name is not null then
    if exists (
      select 1
      from pg_constraint
      where conrelid = 'public.registered_programs'::regclass
        and conname = 'registered_programs_ctpr_number_key'
    ) then
      raise exception
        'Cannot rename legacy unique constraint % because registered_programs_ctpr_number_key already exists.',
        legacy_constraint_name;
    end if;

    execute format(
      'alter table public.registered_programs rename constraint %I to registered_programs_ctpr_number_key',
      legacy_constraint_name
    );
  end if;

  -- Rename only a remaining legacy index on the canonical column, if one exists.
  for legacy_index_name in
    select index_record.relname
    from pg_index index_definition
    join pg_class index_record
      on index_record.oid = index_definition.indexrelid
    join pg_attribute attribute_record
      on attribute_record.attrelid = index_definition.indrelid
     and attribute_record.attnum = any (index_definition.indkey)
    where index_definition.indrelid = 'public.registered_programs'::regclass
      and index_definition.indnkeyatts = 1
      and attribute_record.attname = 'ctpr_number'
      and index_record.relname like '%registration_code%'
  loop
    canonical_index_name := replace(
      legacy_index_name,
      'registration_code',
      'ctpr_number'
    );

    if exists (
      select 1
      from pg_class index_record
      join pg_namespace index_namespace
        on index_namespace.oid = index_record.relnamespace
      where index_namespace.nspname = 'public'
        and index_record.relname = canonical_index_name
    ) then
      raise exception
        'Cannot rename legacy index % because % already exists.',
        legacy_index_name,
        canonical_index_name;
    end if;

    execute format(
      'alter index public.%I rename to %I',
      legacy_index_name,
      canonical_index_name
    );
  end loop;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'registered_programs'
      and column_name = 'ctpr_number'
      and is_nullable = 'NO'
  ) then
    raise exception
      'registered_programs.ctpr_number must exist and remain NOT NULL after the rename.';
  end if;

  if not exists (
    select 1
    from pg_constraint constraint_record
    join pg_attribute attribute_record
      on attribute_record.attrelid = constraint_record.conrelid
     and attribute_record.attnum = any (constraint_record.conkey)
    where constraint_record.conrelid = 'public.registered_programs'::regclass
      and constraint_record.contype = 'u'
      and cardinality(constraint_record.conkey) = 1
      and attribute_record.attname = 'ctpr_number'
  ) then
    raise exception
      'registered_programs.ctpr_number must retain a single-column unique constraint after the rename.';
  end if;
end
$$;

comment on column public.registered_programs.ctpr_number is
  'Certificate of TVET Program Registration Number (CTPR No.).';

commit;
