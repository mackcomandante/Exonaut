-- Allow an Exonaut to submit their own turnover plan after Sir Mack requests it.
-- This is intentionally narrow:
--   old row must be source='exonaut' and status='endorsed'
--   new row must stay source='exonaut' and move to status='approved'
-- Commander/Admin still handle the final signal and execution.

drop policy if exists "removal_requests_update_own_turnover" on public.removal_requests;

create policy "removal_requests_update_own_turnover"
on public.removal_requests
for update
using (
  source = 'exonaut'
  and status = 'endorsed'
  and user_id = auth.uid()::text
)
with check (
  source = 'exonaut'
  and status = 'approved'
  and user_id = auth.uid()::text
);
