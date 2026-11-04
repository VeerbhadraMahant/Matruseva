-- Additive migration: idempotency keys for the offline write queue.
-- The browser queues visits / contact-log entries while offline and replays
-- them later. If a request reached the server but the response was lost, the
-- replay would duplicate the row; a client-generated UUID with a unique index
-- lets the server recognise (and ignore) the replay.

alter table public.visits
  add column if not exists client_request_id uuid;

alter table public.contact_log
  add column if not exists client_request_id uuid;

-- Partial: rows written online without a key (or before this migration) are unaffected.
create unique index if not exists visits_client_request_id_uidx
  on public.visits (client_request_id)
  where client_request_id is not null;

create unique index if not exists contact_log_client_request_id_uidx
  on public.contact_log (client_request_id)
  where client_request_id is not null;
