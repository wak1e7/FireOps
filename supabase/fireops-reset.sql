drop table if exists public.fcm_tokens cascade;
drop table if exists public.notifications cascade;
drop table if exists public.emergency_alert_responses cascade;
drop table if exists public.emergency_alert_recipients cascade;
drop table if exists public.emergency_alerts cascade;
drop table if exists public.operational_events cascade;
drop table if exists public.vehicle_status_events cascade;
drop table if exists public.vehicles cascade;
drop table if exists public.service_sessions cascade;
drop table if exists public.user_roles cascade;
drop table if exists public.roles cascade;
drop table if exists public.profiles cascade;
drop table if exists public.special_positions cascade;
drop table if exists public.ranks cascade;
drop table if exists public.companies cascade;

drop type if exists public.vehicle_status cascade;
drop type if exists public.service_status cascade;
drop type if exists public.pilot_type cascade;
drop type if exists public.role_name cascade;
drop type if exists public.event_severity cascade;
drop type if exists public.emergency_response_status cascade;
drop type if exists public.emergency_alert_status cascade;
drop type if exists public.emergency_type cascade;

create type public.vehicle_status as enum (
  'operativo',
  'fuera_de_servicio',
  'mantenimiento',
  'emergencia_activa'
);

create type public.service_status as enum ('en_servicio', 'en_alerta', 'fuera_de_servicio');
create type public.pilot_type as enum ('voluntario', 'rentado');
create type public.role_name as enum ('admin', 'bombero', 'piloto', 'primer_jefe', 'segundo_jefe');
create type public.event_severity as enum ('info', 'success', 'warning', 'danger');
create type public.emergency_type as enum (
  'incendio',
  'accidente_vehicular',
  'rescate',
  'emergencia_medica',
  'materiales_peligrosos',
  'apoyo_operativo'
);
create type public.emergency_alert_status as enum ('active', 'cancelled', 'expired');
create type public.emergency_response_status as enum ('confirmed', 'on_way', 'unavailable');

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  district text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ranks (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null
);

create table public.special_positions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  firefighter_code text not null unique,
  auth_email text not null unique,
  email text unique,
  full_name text not null,
  phone text,
  rank_id uuid references public.ranks(id),
  special_position_id uuid references public.special_positions(id),
  service_status public.service_status not null default 'fuera_de_servicio',
  pilot_type public.pilot_type,
  is_active boolean not null default true,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint peru_phone_format check (phone is null or phone ~ '^\+51\s?9[0-9]{8}$')
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name public.role_name not null unique,
  description text
);

create table public.user_roles (
  user_id uuid references public.profiles(id) on delete cascade,
  role_id uuid references public.roles(id) on delete cascade,
  primary key (user_id, role_id)
);

create table public.service_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pilot_type public.pilot_type,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  total_minutes integer generated always as (
    case
      when ended_at is null then null
      else greatest(0, floor(extract(epoch from (ended_at - started_at)) / 60)::integer)
    end
  ) stored,
  created_by uuid references public.profiles(id)
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  code text not null unique,
  name text not null,
  type text not null,
  plate text not null,
  status public.vehicle_status not null default 'operativo',
  is_active boolean not null default true,
  observations text not null default '',
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicle_status_events (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  previous_status public.vehicle_status,
  new_status public.vehicle_status not null,
  observations text,
  changed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.operational_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  title text not null,
  detail text not null,
  severity public.event_severity not null default 'info',
  actor_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.emergency_alerts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  type public.emergency_type not null,
  description text,
  location text,
  issued_by uuid not null references public.profiles(id),
  status public.emergency_alert_status not null default 'active',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id)
);

create table public.emergency_alert_recipients (
  alert_id uuid not null references public.emergency_alerts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  service_status public.service_status not null,
  notified_at timestamptz not null default now(),
  primary key (alert_id, profile_id),
  constraint emergency_recipients_active_status check (service_status in ('en_servicio', 'en_alerta'))
);

create table public.emergency_alert_responses (
  alert_id uuid not null references public.emergency_alerts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status public.emergency_response_status not null,
  responded_at timestamptz not null default now(),
  primary key (alert_id, profile_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  recipient_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.fcm_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  device_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_company_idx on public.profiles(company_id);
create index profiles_firefighter_code_idx on public.profiles(firefighter_code);
create index vehicles_company_status_idx on public.vehicles(company_id, status);
create index service_sessions_user_started_idx on public.service_sessions(user_id, started_at desc);
create index emergency_alerts_company_status_idx on public.emergency_alerts(company_id, status, created_at desc);
create index emergency_alert_recipients_profile_idx on public.emergency_alert_recipients(profile_id);
create index notifications_recipient_read_idx on public.notifications(recipient_id, read_at);

alter table public.companies enable row level security;
alter table public.ranks enable row level security;
alter table public.special_positions enable row level security;
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;
alter table public.service_sessions enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_status_events enable row level security;
alter table public.operational_events enable row level security;
alter table public.emergency_alerts enable row level security;
alter table public.emergency_alert_recipients enable row level security;
alter table public.emergency_alert_responses enable row level security;
alter table public.notifications enable row level security;
alter table public.fcm_tokens enable row level security;

create or replace function public.current_role_names()
returns setof public.role_name
language sql
security definer
set search_path = public
as $$
  select r.name
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where ur.user_id = auth.uid()
$$;

create or replace function public.has_role(required_role public.role_name)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(select 1 from public.current_role_names() role_name where role_name = required_role)
$$;

create policy "authenticated read companies" on public.companies for select to authenticated using (true);
create policy "authenticated read ranks" on public.ranks for select to authenticated using (true);
create policy "authenticated read positions" on public.special_positions for select to authenticated using (true);
create policy "authenticated read roles" on public.roles for select to authenticated using (true);
create policy "authenticated read profiles" on public.profiles for select to authenticated using (true);
create policy "self update profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "admins manage profiles" on public.profiles for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));

create policy "authenticated read user roles" on public.user_roles for select to authenticated using (true);
create policy "admins manage user roles" on public.user_roles for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));

create policy "authenticated read sessions" on public.service_sessions for select to authenticated using (true);
create policy "self insert sessions" on public.service_sessions for insert to authenticated with check (user_id = auth.uid());
create policy "self update sessions" on public.service_sessions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "authenticated read vehicles" on public.vehicles for select to authenticated using (true);
create policy "chiefs update vehicles" on public.vehicles for update to authenticated
  using (public.has_role('admin') or public.has_role('primer_jefe') or public.has_role('segundo_jefe'))
  with check (public.has_role('admin') or public.has_role('primer_jefe') or public.has_role('segundo_jefe'));

create policy "authenticated read vehicle events" on public.vehicle_status_events for select to authenticated using (true);
create policy "chiefs insert vehicle events" on public.vehicle_status_events for insert to authenticated
  with check (public.has_role('admin') or public.has_role('primer_jefe') or public.has_role('segundo_jefe'));

create policy "authenticated read operational events" on public.operational_events for select to authenticated using (true);
create policy "chiefs insert operational events" on public.operational_events for insert to authenticated
  with check (public.has_role('admin') or public.has_role('primer_jefe') or public.has_role('segundo_jefe'));

create policy "authenticated read emergency alerts" on public.emergency_alerts for select to authenticated using (true);
create policy "chiefs insert emergency alerts" on public.emergency_alerts for insert to authenticated
  with check (public.has_role('admin') or public.has_role('primer_jefe') or public.has_role('segundo_jefe'));
create policy "chiefs update emergency alerts" on public.emergency_alerts for update to authenticated
  using (public.has_role('admin') or public.has_role('primer_jefe') or public.has_role('segundo_jefe'))
  with check (public.has_role('admin') or public.has_role('primer_jefe') or public.has_role('segundo_jefe'));

create policy "authenticated read emergency recipients" on public.emergency_alert_recipients for select to authenticated using (true);
create policy "chiefs insert emergency recipients" on public.emergency_alert_recipients for insert to authenticated
  with check (public.has_role('admin') or public.has_role('primer_jefe') or public.has_role('segundo_jefe'));

create policy "authenticated read emergency responses" on public.emergency_alert_responses for select to authenticated using (true);
create policy "recipients upsert emergency responses" on public.emergency_alert_responses for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "own notifications" on public.notifications for select to authenticated using (recipient_id is null or recipient_id = auth.uid());
create policy "update own notifications" on public.notifications for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy "chiefs insert notifications" on public.notifications for insert to authenticated
  with check (public.has_role('admin') or public.has_role('primer_jefe') or public.has_role('segundo_jefe'));

create policy "own fcm tokens" on public.fcm_tokens for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into public.ranks (name, sort_order) values
  ('Seccionario', 1),
  ('Subteniente', 2),
  ('Teniente', 3),
  ('Capitán', 4),
  ('Teniente Brigadier', 5),
  ('Brigadier', 6),
  ('Brigadier Mayor', 7),
  ('Brigadier General', 8),
  ('Comandante General', 9);

insert into public.special_positions (name) values
  ('Primer Jefe'),
  ('Segundo Jefe'),
  ('Encargado de área');

insert into public.roles (name, description) values
  ('admin', 'Administración global de FireOps'),
  ('bombero', 'Personal operativo regular'),
  ('piloto', 'Personal operativo conductor'),
  ('primer_jefe', 'Jefatura operativa principal'),
  ('segundo_jefe', 'Jefatura operativa secundaria');

insert into public.companies (id, name, code, district)
values ('00000000-0000-0000-0000-000000000101', 'Salvadora Lambayeque 88', 'B-88', 'Lambayeque');
