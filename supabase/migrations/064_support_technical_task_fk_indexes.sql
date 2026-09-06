begin;
create index if not exists technical_tasks_assigned_to_idx on public.technical_tasks(assigned_to) where assigned_to is not null;
create index if not exists technical_tasks_created_by_idx on public.technical_tasks(created_by);
commit;