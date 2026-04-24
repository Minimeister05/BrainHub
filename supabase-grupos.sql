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

-- Grupos: criador pode deletar o próprio grupo; admins podem deletar qualquer grupo
-- ATENÇÃO: se já existe essa policy, rode antes: drop policy "grupos_delete" on grupos;
create policy "grupos_delete" on grupos
  for delete using (
    auth.uid() = criador_id
    OR exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

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

-- ============================================================
-- TABELAS DE CHAT EM GRUPO (separadas dos grupos de comunidade)
-- ============================================================

-- Grupos de conversa no chat
create table if not exists group_chats (
  id         uuid default gen_random_uuid() primary key,
  nome       text not null,
  criado_por uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- Membros de grupos de chat
create table if not exists chat_members (
  id        uuid default gen_random_uuid() primary key,
  group_id  uuid references group_chats(id) on delete cascade not null,
  user_id   uuid references profiles(id)    on delete cascade not null,
  joined_at timestamptz default now(),
  unique(group_id, user_id)
);

-- Mensagens de grupos de chat
create table if not exists group_messages (
  id         uuid default gen_random_uuid() primary key,
  group_id   uuid references group_chats(id) on delete cascade not null,
  sender_id  uuid references profiles(id)    on delete set null,
  texto      text not null,
  created_at timestamptz default now()
);

-- RLS para as novas tabelas
alter table group_chats    enable row level security;
alter table chat_members   enable row level security;
alter table group_messages enable row level security;

-- group_chats policies
create policy "gc_select" on group_chats for select using (
  exists (select 1 from chat_members where group_id = group_chats.id and user_id = auth.uid())
);
create policy "gc_insert" on group_chats for insert with check (auth.uid() = criado_por);
create policy "gc_update" on group_chats for update using (auth.uid() = criado_por);
create policy "gc_delete" on group_chats for delete using (auth.uid() = criado_por);

-- chat_members policies
create policy "cm_select" on chat_members for select using (
  exists (select 1 from chat_members cm where cm.group_id = chat_members.group_id and cm.user_id = auth.uid())
);
create policy "cm_insert" on chat_members for insert with check (
  auth.uid() = user_id or
  exists (select 1 from group_chats where id = group_id and criado_por = auth.uid())
);
create policy "cm_delete" on chat_members for delete using (
  auth.uid() = user_id or
  exists (select 1 from group_chats where id = group_id and criado_por = auth.uid())
);

-- group_messages policies
create policy "gm_select" on group_messages for select using (
  exists (select 1 from chat_members where group_id = group_messages.group_id and user_id = auth.uid())
);
create policy "gm_insert" on group_messages for insert with check (
  auth.uid() = sender_id and
  exists (select 1 from chat_members where group_id = group_messages.group_id and user_id = auth.uid())
);
