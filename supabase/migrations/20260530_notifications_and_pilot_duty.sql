alter table public.profiles
  add column if not exists can_login boolean not null default true;

update public.profiles
set pilot_type = 'voluntario'
where firefighter_code = 'A02075';

delete from public.notifications
where recipient_id is null;
