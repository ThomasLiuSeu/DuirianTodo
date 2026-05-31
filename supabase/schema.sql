create extension if not exists pgcrypto;

create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  family_id text not null,
  name text not null,
  color text not null default '#0a84ff',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  family_id text not null,
  list_id uuid references public.lists(id) on delete set null,
  title text not null,
  notes text,
  due_date date,
  completed boolean not null default false,
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists todos_set_updated_at on public.todos;
create trigger todos_set_updated_at
before update on public.todos
for each row
execute function public.set_updated_at();

create index if not exists lists_family_sort_idx on public.lists (family_id, sort_order, created_at);
create index if not exists todos_family_completed_idx on public.todos (family_id, completed, due_date);
create index if not exists todos_family_list_idx on public.todos (family_id, list_id, sort_order);

alter table public.lists enable row level security;
alter table public.todos enable row level security;

drop policy if exists "anon can read lists" on public.lists;
create policy "anon can read lists"
on public.lists for select
to anon
using (true);

drop policy if exists "anon can write lists" on public.lists;
create policy "anon can write lists"
on public.lists for all
to anon
using (true)
with check (true);

drop policy if exists "anon can read todos" on public.todos;
create policy "anon can read todos"
on public.todos for select
to anon
using (true);

drop policy if exists "anon can write todos" on public.todos;
create policy "anon can write todos"
on public.todos for all
to anon
using (true)
with check (true);
