-- Life Board: Supabase ユーザープロフィール＆スキン解放データ保存用テーブル定義
-- Supabase ダッシュボードの SQL Editor で実行してください

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'プレイヤー1',
  life_coins integer not null default 300,
  unlocked_characters text[] not null default array['char_1', 'char_2', 'char_3', 'char_4'],
  unlocked_skins text[] not null default array['standard'],
  selected_character text not null default 'char_1',
  selected_color text not null default 'blue',
  selected_skin text not null default 'standard',
  updated_at timestamptz not null default now()
);

-- RLS (Row Level Security) の有効化とポリシー設定
alter table public.user_profiles enable row level security;

create policy "Users can view their own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.user_profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.user_profiles for update
  using (auth.uid() = id);

