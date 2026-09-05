-- Wave A / Phase 4 advisor hardening
begin;
create index if not exists governed_legal_holds_placed_by_idx on public.governed_legal_holds(placed_by);
create index if not exists governed_legal_holds_released_by_idx on public.governed_legal_holds(released_by) where released_by is not null;
commit;
