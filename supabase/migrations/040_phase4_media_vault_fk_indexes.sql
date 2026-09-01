-- Phase 4 post-advisor indexes for purge-request actor relationships.
begin;
create index media_purge_requests_requested_by_idx
  on public.media_purge_requests(requested_by);
create index media_purge_requests_reviewed_by_idx
  on public.media_purge_requests(reviewed_by)
  where reviewed_by is not null;
commit;

