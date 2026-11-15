-- Apply through the normal Supabase migration workflow; no service-role browser key is needed.
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  document jsonb not null,
  revision integer not null default 1 check (revision >= 1),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint projects_document_shape check ((
    jsonb_typeof(document) = 'object'
    and document -> 'schemaVersion' = '1'::jsonb
    and jsonb_typeof(document -> 'name') = 'string'
    and length(btrim(document ->> 'name')) > 0
    and name = document ->> 'name'
    and jsonb_typeof(document -> 'screen') = 'object'
    and jsonb_typeof(document #> '{screen,width}') = 'number'
    and jsonb_typeof(document #> '{screen,height}') = 'number'
    and document #> '{screen,width}' > '0'::jsonb
    and document #> '{screen,height}' > '0'::jsonb
    and jsonb_typeof(document -> 'startSceneId') = 'string'
    and length(document ->> 'startSceneId') > 0
    and case when jsonb_typeof(document -> 'scenes') = 'array'
      then jsonb_array_length(document -> 'scenes') > 0 else false end
  ) is true)
);

-- Detailed scene/element validation and supported resolution are handled by parseProject.
create index projects_owner_updated_idx on public.projects (owner_id, updated_at desc, id desc);

create function public.projects_manage_metadata()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if TG_OP = 'INSERT' then
    new.revision := 1;
    new.created_at := clock_timestamp();
    new.updated_at := new.created_at;
  else
    if new.id is distinct from old.id
      or new.owner_id is distinct from old.owner_id
      or new.created_at is distinct from old.created_at then
      raise exception 'Project id, owner_id, and created_at are immutable' using errcode = '22023';
    end if;
    if new.revision is distinct from old.revision then
      raise exception 'Project revision is managed by the database' using errcode = '22023';
    end if;
    new.revision := old.revision + 1;
    new.updated_at := clock_timestamp();
  end if;
  return new;
end;
$$;

revoke all on function public.projects_manage_metadata() from public, anon, authenticated;

create trigger projects_manage_metadata
before insert or update on public.projects
for each row execute function public.projects_manage_metadata();

alter table public.projects enable row level security;

revoke all on table public.projects from public, anon, authenticated;
grant select, insert, update, delete on table public.projects to authenticated;

create policy projects_select_owner on public.projects
for select to authenticated
using (owner_id = (select auth.uid()));

create policy projects_insert_owner on public.projects
for insert to authenticated
with check (owner_id = (select auth.uid()));

create policy projects_update_owner on public.projects
for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy projects_delete_owner on public.projects
for delete to authenticated
using (owner_id = (select auth.uid()));

comment on table public.projects is
  'Private project documents. Clients must filter UPDATE and DELETE by id and expected revision; zero returned rows is a conflict, never an upsert.';
