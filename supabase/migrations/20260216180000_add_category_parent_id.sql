-- Add parent_id for category hierarchy (2 levels)
alter table public.categories
  add column if not exists parent_id uuid null;

alter table public.categories
  add constraint categories_parent_id_fkey
  foreign key (parent_id)
  references public.categories(id)
  on delete set null;

alter table public.categories
  add constraint categories_parent_id_not_self
  check (parent_id is null or parent_id <> id);

create index if not exists categories_parent_id_idx
  on public.categories(parent_id);
