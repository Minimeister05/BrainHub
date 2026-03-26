-- ============================================================
-- BrainHUB — Tabelas de Grupos
-- Rodar no Supabase: SQL Editor > New Query > Cole e execute
-- ============================================================

-- Tabela de grupos
create table if not exists grupos (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  descricao   text,
  emoji       text default '🧠',
  categoria   text default 'Geral',
  criador_id  uuid references auth.users(id) on delete set null,
  created_at  timestamp with time zone default now()
);

-- Tabela de membros (quem participa de qual grupo)
create table if not exists group_members (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid references grupos(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(group_id, user_id)
);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

alter table grupos enable row level security;
alter table group_members enable row level security;

-- Grupos: qualquer um pode ver
create policy "grupos_select" on grupos
  for select using (true);

-- Grupos: usuário autenticado pode criar
create policy "grupos_insert" on grupos
  for insert with check (auth.uid() = criador_id);

-- Grupos: só o criador pode deletar
create policy "grupos_delete" on grupos
  for delete using (auth.uid() = criador_id);

-- Membros: qualquer um pode ver
create policy "members_select" on group_members
  for select using (true);

-- Membros: usuário só pode inserir a si mesmo
create policy "members_insert" on group_members
  for insert with check (auth.uid() = user_id);

-- Membros: usuário só pode remover a si mesmo
create policy "members_delete" on group_members
  for delete using (auth.uid() = user_id);

-- ============================================================
-- Adicionar group_id na tabela posts (posts de grupo)
-- Posts sem group_id = feed público
-- Posts com group_id = pertencem a um grupo
-- ============================================================
alter table posts
  add column if not exists group_id uuid references grupos(id) on delete set null;
