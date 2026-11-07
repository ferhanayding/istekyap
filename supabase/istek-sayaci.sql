-- İstek sayacı + arşiv. Supabase > SQL Editor'de bir kere çalıştır.
-- Tekrar çalıştırmak zarar vermez.

-- 1) Kaç kişi istedi + arşive alındı mı
alter table public.requests add column if not exists request_count int not null default 1;
alter table public.requests add column if not exists archived_at timestamptz;
-- Son kişinin istediği an (listede "x dakika önce" bunu gösterir)
alter table public.requests add column if not exists last_requested_at timestamptz not null default now();

-- 2) Hangi cihaz hangi isteği yaptı (aynı cihaz sayacı iki kere artıramaz)
create table if not exists public.request_devices (
    request_id uuid not null references public.requests(id) on delete cascade,
    device_id text not null,
    created_at timestamptz not null default now(),
    primary key (request_id, device_id)
);
alter table public.request_devices enable row level security;
grant select, insert, delete on public.request_devices to service_role;

-- 3) "Aynı şarkı aynı anda bir kere listede" kuralı artık sadece arşivlenmemişler için
do $$
declare idx text;
begin
    for idx in
        select indexname from pg_indexes
        where schemaname = 'public' and tablename = 'requests'
          and indexdef ilike 'create unique index%' and indexdef ilike '%spotify_id%'
          and indexname <> 'requests_active_spotify_key'
    loop
        execute format('drop index public.%I', idx);
    end loop;
end $$;

create unique index if not exists requests_active_spotify_key
    on public.requests (spotify_id)
    where archived_at is null and status in ('pending', 'approved', 'rejected');

create index if not exists requests_active_created_idx
    on public.requests (created_at desc) where archived_at is null;

-- 4) İstek yap ya da mevcut isteğe katıl, tek seferde ve yarışsız
create or replace function public.make_request(
    p_spotify_id text,
    p_name text,
    p_artists text,
    p_cover text,
    p_device text
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
    r public.requests%rowtype;
begin
    select * into r from public.requests
    where spotify_id = p_spotify_id and archived_at is null
      and status in ('pending', 'approved', 'rejected')
    limit 1 for update;

    if not found then
        begin
            insert into public.requests (spotify_id, name, artists, cover)
            values (p_spotify_id, p_name, p_artists, p_cover)
            returning * into r;
            insert into public.request_devices (request_id, device_id) values (r.id, p_device);
            return json_build_object('result', 'created', 'status', r.status, 'count', r.request_count);
        exception when unique_violation then
            -- Aynı anda biri daha istedi: onun isteğine katıl
            select * into r from public.requests
            where spotify_id = p_spotify_id and archived_at is null
              and status in ('pending', 'approved', 'rejected')
            limit 1 for update;
        end;
    end if;

    insert into public.request_devices (request_id, device_id)
    values (r.id, p_device)
    on conflict do nothing;

    if not found then
        return json_build_object('result', 'already', 'status', r.status, 'count', r.request_count);
    end if;

    update public.requests
    set request_count = request_count + 1, last_requested_at = now()
    where id = r.id returning * into r;
    return json_build_object('result', 'joined', 'status', r.status, 'count', r.request_count);
end $$;

-- Sadece sunucu (secret key) çağırabilsin
revoke all on function public.make_request(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.make_request(text, text, text, text, text) to service_role;

notify pgrst, 'reload schema';
