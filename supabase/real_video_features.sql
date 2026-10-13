-- Stream Toker real video feed foundation.
-- Additive migration: does not delete or replace existing tables or user data.
create table if not exists public.stream_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  caption text not null default '',
  storage_path text not null,
  created_at timestamptz not null default now()
);
create index if not exists stream_videos_created_at_idx on public.stream_videos (created_at desc);
create index if not exists stream_videos_user_id_idx on public.stream_videos (user_id);

create table if not exists public.stream_video_likes (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.stream_videos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(video_id, user_id)
);
create table if not exists public.stream_video_comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.stream_videos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  comment_text text not null check (char_length(comment_text) between 1 and 1000),
  created_at timestamptz not null default now()
);
create table if not exists public.stream_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(follower_id, following_id),
  check (follower_id <> following_id)
);

alter table public.stream_videos enable row level security;
alter table public.stream_video_likes enable row level security;
alter table public.stream_video_comments enable row level security;
alter table public.stream_follows enable row level security;

drop policy if exists "Published videos are visible to everyone" on public.stream_videos;
create policy "Published videos are visible to everyone" on public.stream_videos for select using (true);
drop policy if exists "Signed-in creators publish their own videos" on public.stream_videos;
create policy "Signed-in creators publish their own videos" on public.stream_videos for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Creators delete their own videos" on public.stream_videos;
create policy "Creators delete their own videos" on public.stream_videos for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Video likes are visible to everyone" on public.stream_video_likes;
create policy "Video likes are visible to everyone" on public.stream_video_likes for select using (true);
drop policy if exists "Users like videos as themselves" on public.stream_video_likes;
create policy "Users like videos as themselves" on public.stream_video_likes for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users remove their own likes" on public.stream_video_likes;
create policy "Users remove their own likes" on public.stream_video_likes for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Video comments are visible to everyone" on public.stream_video_comments;
create policy "Video comments are visible to everyone" on public.stream_video_comments for select using (true);
drop policy if exists "Signed-in users comment as themselves" on public.stream_video_comments;
create policy "Signed-in users comment as themselves" on public.stream_video_comments for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users delete their own comments" on public.stream_video_comments;
create policy "Users delete their own comments" on public.stream_video_comments for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Follow relationships are visible to everyone" on public.stream_follows;
create policy "Follow relationships are visible to everyone" on public.stream_follows for select using (true);
drop policy if exists "Users follow as themselves" on public.stream_follows;
create policy "Users follow as themselves" on public.stream_follows for insert to authenticated with check (auth.uid() = follower_id);
drop policy if exists "Users unfollow as themselves" on public.stream_follows;
create policy "Users unfollow as themselves" on public.stream_follows for delete to authenticated using (auth.uid() = follower_id);

-- Storage uploads must use object paths beginning with the authenticated user's UUID.
drop policy if exists "Public can watch Stream Toker videos" on storage.objects;
create policy "Public can watch Stream Toker videos" on storage.objects for select using (bucket_id = 'stream-toker-videos');
drop policy if exists "Creators upload to their own Stream Toker folder" on storage.objects;
create policy "Creators upload to their own Stream Toker folder" on storage.objects for insert to authenticated with check (bucket_id = 'stream-toker-videos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Creators delete from their own Stream Toker folder" on storage.objects;
create policy "Creators delete from their own Stream Toker folder" on storage.objects for delete to authenticated using (bucket_id = 'stream-toker-videos' and (storage.foldername(name))[1] = auth.uid()::text);
