-- All recipient reads go through gift-api. No public table/storage reads.
create extension if not exists pgcrypto with schema extensions;
create table public.gift_admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.gift_admins enable row level security;
create policy "owner can see their membership" on public.gift_admins for select to authenticated using (user_id=auth.uid());
create or replace function public.is_gift_owner() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.gift_admins where user_id=auth.uid()); $$;
revoke all on function public.is_gift_owner() from public, anon;
grant execute on function public.is_gift_owner() to authenticated;
create table public.gift (
 id integer primary key check(id=1), draft jsonb not null, published jsonb not null,
 draft_gate_enabled boolean not null default false, draft_code_hash text,
 gate_enabled boolean not null default false, code_hash text,
 version bigint not null default 0, published_revision bigint not null default 0,
 published_at timestamptz,
 check (not draft_gate_enabled or draft_code_hash is not null),
 check (not gate_enabled or code_hash is not null)
);
alter table public.gift enable row level security;
create policy "owner read only" on public.gift for select to authenticated using (public.is_gift_owner());
-- Direct browser writes have no policy; validated writes only via the Edge function.
create table public.gift_sessions (
 token_hash text primary key, revision bigint not null, expires_at timestamptz not null
);
create table public.gift_attempts (
 key_hash text primary key, window_start timestamptz not null, attempts integer not null
);
create table public.gift_assets (
 path text primary key, kind text not null check(kind in ('image','audio')),
 mime text not null, size_bytes bigint not null check(size_bytes>0 and size_bytes<=20971520),
 uploaded_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
alter table public.gift_sessions enable row level security;
alter table public.gift_attempts enable row level security;
alter table public.gift_assets enable row level security;
create policy "owner read asset catalog" on public.gift_assets for select to authenticated using(public.is_gift_owner());
-- Session, attempt and asset mutations denied to anon/authenticated; service role only.
revoke all on public.gift_sessions,public.gift_attempts from anon,authenticated;
grant select on public.gift,public.gift_assets,public.gift_admins to authenticated;
create or replace function public.consume_gift_attempt(p_key text,p_limit integer) returns boolean
language plpgsql security definer set search_path='' as $$
declare r public.gift_attempts;
begin
 insert into public.gift_attempts values(p_key,now(),0) on conflict do nothing;
 select * into r from public.gift_attempts where key_hash=p_key for update;
 if r.window_start < now()-interval '15 minutes' then
  update public.gift_attempts set window_start=now(),attempts=1 where key_hash=p_key; return true;
 end if;
 if r.attempts>=p_limit then return false; end if;
 update public.gift_attempts set attempts=attempts+1 where key_hash=p_key;
 delete from public.gift_attempts where window_start<now()-interval '1 day';
 delete from public.gift_sessions where expires_at<now();
 return true;
end $$;
create or replace function public.verify_gift_code(p_code text) returns boolean
language sql security definer set search_path='' as $$
 select case when not gate_enabled then true when code_hash is null then false else code_hash=extensions.crypt(p_code,code_hash) end from public.gift where id=1;
$$;
create or replace function public.save_gift_draft(p_content jsonb,p_enabled boolean,p_code text,p_version bigint) returns boolean
language plpgsql security definer set search_path='' as $$
declare r public.gift; h text;
begin
 select * into r from public.gift where id=1 for update;
 if not found or r.version<>p_version then return false; end if;
 h=r.draft_code_hash;
 if p_code is not null then
  if length(p_code)<4 or length(p_code)>128 then raise exception 'invalid code'; end if;
  -- bcrypt truncates at 72 bytes: handler rejects longer UTF-8 codes too.
  if octet_length(p_code)>72 then raise exception 'code exceeds bcrypt limit'; end if;
  h=extensions.crypt(p_code,extensions.gen_salt('bf',12));
 end if;
 if p_enabled and h is null then raise exception 'code required'; end if;
 update public.gift set draft=p_content,draft_gate_enabled=p_enabled,draft_code_hash=h,version=version+1 where id=1;
 return true;
end $$;
create or replace function public.publish_gift(p_version bigint) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.gift where id=1 and version=p_version for update;
 if not found then return false; end if;
 update public.gift set published=draft,gate_enabled=draft_gate_enabled,code_hash=draft_code_hash,published_at=now(),published_revision=published_revision+1,version=version+1 where id=1;
 delete from public.gift_sessions;
 return true;
end $$;
revoke all on function public.consume_gift_attempt(text,integer),public.verify_gift_code(text),public.save_gift_draft(jsonb,boolean,text,bigint),public.publish_gift(bigint) from public,anon,authenticated;
grant execute on function public.consume_gift_attempt(text,integer),public.verify_gift_code(text),public.save_gift_draft(jsonb,boolean,text,bigint),public.publish_gift(bigint) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values ('gift-media','gift-media',false,20971520,array['image/jpeg','image/png','image/webp','audio/mpeg','audio/wav','audio/ogg','audio/mp4']);
create policy "owner may read private media" on storage.objects for select to authenticated using(bucket_id='gift-media' and public.is_gift_owner());
-- No Storage insert/update/delete policy for browsers. Edge validates bytes and uses service role.
-- No file deletion endpoint: removing a draft reference never deletes a published object.

insert into public.gift(id,draft,published) values(1,'{"recipient":"","sender":"","age":19,"birthDate":"2007-10-03","celebrationDate":"2026-10-03","envelope":"ถึงคนโปรดของเค้า","wish":"สุขสันต์วันเกิดนะ ขอให้ปีนี้เต็มไปด้วยรอยยิ้มและสิ่งดี ๆ 💗","candleWish":"ขอให้ทุกคำอธิษฐานของเธอค่อย ๆ เป็นจริง","musicNote":"พื้นที่เล็ก ๆ สำหรับเพลงที่อยากมอบให้เธอ","letter":"ถึงคนโปรดของเค้า\n\n[เขียนคำอวยพรและความรู้สึกที่อยากบอกเธอตรงนี้]\n\n[เพิ่มเรื่องราวของเราที่อยากเก็บไว้ได้อีกหลายย่อหน้า]\n\nสุขสันต์วันเกิดนะ ♡","hero":null,"photos":[{"id":"photo-1","media":null,"caption":"","category":"single"},{"id":"photo-2","media":null,"caption":"","category":"couple"},{"id":"photo-3","media":null,"caption":"","category":"single"},{"id":"photo-4","media":null,"caption":"","category":"couple"},{"id":"photo-5","media":null,"caption":"","category":"single"},{"id":"photo-6","media":null,"caption":"","category":"couple"},{"id":"photo-7","media":null,"caption":"","category":"single"},{"id":"photo-8","media":null,"caption":"","category":"couple"}],"songs":[{"id":"song-1","title":"","artist":"","source":"youtube","url":"","media":null},{"id":"song-2","title":"","artist":"","source":"youtube","url":"","media":null},{"id":"song-3","title":"","artist":"","source":"youtube","url":"","media":null}],"theme":{"cream":"#fbf5eb","pink":"#efd2d3","rose":"#a44c63","sage":"#63765e","background":"paper","effects":false}}'::jsonb,'{"recipient":"","sender":"","age":19,"birthDate":"2007-10-03","celebrationDate":"2026-10-03","envelope":"ถึงคนโปรดของเค้า","wish":"สุขสันต์วันเกิดนะ ขอให้ปีนี้เต็มไปด้วยรอยยิ้มและสิ่งดี ๆ 💗","candleWish":"ขอให้ทุกคำอธิษฐานของเธอค่อย ๆ เป็นจริง","musicNote":"พื้นที่เล็ก ๆ สำหรับเพลงที่อยากมอบให้เธอ","letter":"ถึงคนโปรดของเค้า\n\n[เขียนคำอวยพรและความรู้สึกที่อยากบอกเธอตรงนี้]\n\n[เพิ่มเรื่องราวของเราที่อยากเก็บไว้ได้อีกหลายย่อหน้า]\n\nสุขสันต์วันเกิดนะ ♡","hero":null,"photos":[{"id":"photo-1","media":null,"caption":"","category":"single"},{"id":"photo-2","media":null,"caption":"","category":"couple"},{"id":"photo-3","media":null,"caption":"","category":"single"},{"id":"photo-4","media":null,"caption":"","category":"couple"},{"id":"photo-5","media":null,"caption":"","category":"single"},{"id":"photo-6","media":null,"caption":"","category":"couple"},{"id":"photo-7","media":null,"caption":"","category":"single"},{"id":"photo-8","media":null,"caption":"","category":"couple"}],"songs":[{"id":"song-1","title":"","artist":"","source":"youtube","url":"","media":null},{"id":"song-2","title":"","artist":"","source":"youtube","url":"","media":null},{"id":"song-3","title":"","artist":"","source":"youtube","url":"","media":null}],"theme":{"cream":"#fbf5eb","pink":"#efd2d3","rose":"#a44c63","sage":"#63765e","background":"paper","effects":false}}'::jsonb);
