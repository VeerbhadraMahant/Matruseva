-- The clinic operates in India; "today" for due/overdue/risk must be the
-- Asia/Kolkata calendar date, not the database server's `current_date`
-- (Supabase Postgres runs in UTC — using current_date would misclassify
-- events for the ~5.5 hours each day where the UTC and IST dates differ).

create or replace function private.today_ist()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Kolkata')::date;
$$;

grant execute on function private.today_ist() to authenticated, service_role;
revoke execute on function private.today_ist() from anon, public;

alter table public.visits alter column visit_date set default private.today_ist();

create or replace view public.care_event_status
with (security_invoker = true) as
select
  ce.*,
  case
    when ce.completed_at is not null then 'done'
    when ce.skipped_reason is not null then 'skipped'
    when private.today_ist() > ce.due_to then 'overdue'
    when private.today_ist() >= ce.due_from then 'due'
    else 'upcoming'
  end as status
from public.care_events ce;

create or replace view public.patient_followup_risk
with (security_invoker = true) as
select
  p.id as patient_id,
  p.clinic_id,
  p.status as patient_status,
  latest_visit.next_visit_date as next_visit_date,
  coalesce(recent_contacts.no_answer_streak, 0) as no_answer_streak,
  case
    when p.status <> 'active' then 'on_track'
    when latest_visit.next_visit_date is not null
      and latest_visit.next_visit_date < private.today_ist() - (c.risk_lost_days || ' days')::interval
      then 'lost'
    when overdue_critical.has_overdue_critical then 'at_risk'
    when latest_visit.next_visit_date is not null
      and latest_visit.next_visit_date < private.today_ist() - (c.risk_at_risk_days || ' days')::interval
      then 'at_risk'
    when coalesce(recent_contacts.no_answer_streak, 0) >= 2 then 'at_risk'
    else 'on_track'
  end as risk
from public.patients p
join public.clinics c on c.id = p.clinic_id
left join lateral (
  select v.next_visit_date
  from public.visits v
  where v.patient_id = p.id and v.next_visit_date is not null
  order by v.visit_date desc
  limit 1
) latest_visit on true
left join lateral (
  select exists (
    select 1
    from public.care_events ce
    join public.schedule_template_items sti on sti.id = ce.template_item_id
    where ce.patient_id = p.id
      and sti.is_critical
      and ce.completed_at is null
      and ce.skipped_reason is null
      and private.today_ist() > ce.due_to
  ) as has_overdue_critical
) overdue_critical on true
left join lateral (
  select count(*) filter (where cl.outcome in ('no_answer', 'wrong_number')) as no_answer_streak
  from (
    select outcome
    from public.contact_log cl
    where cl.patient_id = p.id
    order by cl.created_at desc
    limit 2
  ) cl
) recent_contacts on true;
