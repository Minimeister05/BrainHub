// scripts/grupo-detalhe.js
lucide.createIcons();

const params     = new URLSearchParams(window.location.search);
const GRUPO_ID   = params.get('id');

let usuarioAtual = null;
let grupoAtual   = null;
let ehMembro     = false;

// ===== TOAST =====
function mostrarAviso(msg, tipo = 'info') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.innerText = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// ===== INIT =====
async function init() {
  if (!window.supabase) { setTimeout(init, 200); return; }
  if (!GRUPO_ID) { window.location.href = 'grupos.html'; return; }

  const { data: { user } } = await window.supabase.auth.getUser();
  usuarioAtual = user;
  if (!user) { window.location.href = 'index.html'; return; }

  await carregarGrupo();
}

async function carregarGrupo() {
  const { data: grupo, error } = await window.supabase
    .from('grupos')
    .select('*')
    .eq('id', GRUPO_ID)
    .single();

  if (error || !grupo) {
    window.location.href = 'grupos.html';
    return;
  }

  grupoAtual = grupo;

  // Verifica se é membro via contagem (mais robusto que maybeSingle)
  const { count: memberCount } = await window.supabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', GRUPO_ID)
    .eq('user_id', usuarioAtual.id);

  ehMembro = (memberCount || 0) > 0;

  // Conta membros
  const { count: totalMembros } = await window.supabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', GRUPO_ID);

  renderBanner(grupo, totalMembros || 0);
  renderSobre(grupo, totalMembros || 0);
  configurarCompositor();
  await carregarPosts();
}

// ===== BANNER =====
const GRADIENTES = [
  'linear-gradient(135deg,#1a1040,#2d1b69)',
  'linear-gradient(135deg,#0a2540,#0d3b2e)',
  'linear-gradient(135deg,#1a0a2e,#2e1065)',
  'linear-gradient(135deg,#0a1520,#0d2235)',
  'linear-gradient(135deg,#0a1a0a,#0d2d1a)',
];

function renderBanner(grupo, totalMembros) {
  const hash = grupo.nome.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const bg   = GRADIENTES[hash % GRADIENTES.length];

  document.title = `BrainHUB | ${grupo.nome}`;

  document.getElementById('gdBanner').innerHTML = `
    <div class="gd-banner-inner" style="background:${bg}">
      <div class="gd-banner-overlay"></div>
      <div class="gd-banner-content">
        <div class="gd-banner-left">
          <div class="gd-emoji">${grupo.emoji || '🧠'}</div>
          <div>
            <div class="gd-nome">${escapeHtml(grupo.nome)}</div>
            <div class="gd-meta">
              <span>${grupo.categoria || 'Geral'}</span>
              <span>·</span>
              <span><strong>${totalMembros}</strong> membro${totalMembros !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
        <div class="gd-banner-right">
          <button class="btn-entrar gd-toggle-btn ${ehMembro ? 'participando' : ''}" onclick="toggleMembro(this)">
            ${ehMembro ? '<i data-lucide="check"></i> Participando' : '<i data-lucide="plus"></i> Participar'}
          </button>
          <button class="gd-back-btn" onclick="window.location.href='grupos.html'">
            <i data-lucide="arrow-left"></i> Grupos
          </button>
        </div>
      </div>
    </div>
  `;
  lucide.createIcons();
}

// ===== ENTRAR / SAIR =====
async function toggleMembro(btn) {
  btn.disabled = true;

  if (ehMembro) {
    const { error } = await window.supabase
      .from('group_members')
      .delete()
      .eq('group_id', GRUPO_ID)
      .eq('user_id', usuarioAtual.id);

    if (!error) {
      ehMembro = false;
      btn.className = 'btn-entrar gd-toggle-btn';
      btn.innerHTML = '<i data-lucide="plus"></i> Participar';
      lucide.createIcons();
      mostrarAviso('Você saiu do grupo.', 'info');
      document.getElementById('gdComposer').classList.add('hidden');
      document.getElementById('gdNaoMembro').classList.remove('hidden');
    }
  } else {
    // upsert evita erro de unique constraint se já for membro
    const { error } = await window.supabase
      .from('group_members')
      .upsert({ group_id: GRUPO_ID, user_id: usuarioAtual.id }, { onConflict: 'group_id,user_id' });

    if (!error) {
      ehMembro = true;
      btn.className = 'btn-entrar gd-toggle-btn participando';
      btn.innerHTML = '<i data-lucide="check"></i> Participando';
      lucide.createIcons();
      mostrarAviso('Você entrou no grupo!', 'success');
      document.getElementById('gdComposer').classList.remove('hidden');
      document.getElementById('gdNaoMembro').classList.add('hidden');
      await carregarPosts();
    }
  }
  btn.disabled = false;
}

// ===== COMPOSITOR =====
function configurarCompositor() {
  const compositor = document.getElementById('gdComposer');
  const naoMembro  = document.getElementById('gdNaoMembro');

  if (ehMembro) {
    compositor.classList.remove('hidden');
    naoMembro.classList.add('hidden');
  } else {
    compositor.classList.add('hidden');
    naoMembro.classList.remove('hidden');
  }

  // Avatar
  const u = getPerfilAtual();
  const avatar = document.getElementById('composerAvatar');
  if (avatar) { avatar.textContent = u.iniciais; avatar.className = `mini-avatar ${u.corAvatar}`; }

  // Auto-resize
  const input = document.getElementById('gdPostInput');
  input?.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = input.scrollHeight + 'px';
  });

  document.getElementById('gdPublishBtn')?.addEventListener('click', publicarPost);
  input?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); publicarPost(); }
  });
}

async function publicarPost() {
  const input = document.getElementById('gdPostInput');
  const texto = input.value.trim();
  if (!texto) return;

  const btn = document.getElementById('gdPublishBtn');
  btn.disabled = true;
  btn.innerHTML = '<i data-lucide="loader"></i> Publicando...';
  lucide.createIcons();

  const { error } = await window.supabase.from('posts').insert({
    user_id: usuarioAtual.id,
    texto,
    group_id: GRUPO_ID,
  });

  btn.disabled = false;
  btn.innerHTML = '<i data-lucide="send"></i> Publicar';
  lucide.createIcons();

  if (error) {
    mostrarAviso('Erro ao publicar: ' + error.message, 'error');
    return;
  }

  input.value = '';
  input.style.height = 'auto';
  await carregarPosts();
}

// ===== POSTS DO GRUPO =====
async function carregarPosts() {
  const feedList = document.getElementById('gdFeedList');
  feedList.innerHTML = '<p style="color:var(--muted);text-align:center;padding:32px">Carregando posts...</p>';

  const { data: posts, error } = await window.supabase
    .from('posts')
    .select(`
      id, user_id, texto, created_at, imagem_url, arquivo_url, arquivo_nome, humor,
      profiles!posts_user_id_fkey(nome, cor_avatar, curso, periodo, is_pro),
      likes(user_id),
      comments(id)
    `)
    .eq('group_id', GRUPO_ID)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    feedList.innerHTML = '<p style="color:var(--muted);text-align:center;padding:32px">Erro ao carregar posts.</p>';
    return;
  }

  if (!posts || posts.length === 0) {
    feedList.innerHTML = `
      <div style="text-align:center;padding:48px;color:var(--muted)">
        <div style="font-size:2.5rem;margin-bottom:12px">📭</div>
        <p>Nenhum post ainda. Seja o primeiro a compartilhar algo!</p>
      </div>`;
    return;
  }

  // Salvo pelo usuário
  let salvoSet = new Set();
  const { data: saves } = await window.supabase
    .from('saved_posts').select('post_id').eq('user_id', usuarioAtual.id);
  salvoSet = new Set((saves || []).map(s => s.post_id));

  feedList.innerHTML = posts.map(p => criarPostHTML(p)).join('');

  feedList.querySelectorAll('.save-post-btn').forEach(btn => {
    const card = btn.closest('.post-card');
    if (salvoSet.has(card.dataset.id)) {
      btn.dataset.saved = 'true';
      btn.classList.add('saved');
    }
  });

  lucide.createIcons();
  ativarEventosPosts(feedList);
}

function criarPostHTML(post) {
  const perfil  = post.profiles || {};
  const nome    = perfil.nome || 'Usuário';
  const cor     = perfil.cor_avatar || '';
  const iniciais = gerarIniciais(nome);
  const likesCount    = post.likes?.length || 0;
  const commentsCount = post.comments?.length || 0;
  const curtido = post.likes?.some(l => l.user_id === usuarioAtual?.id) || false;
  const tempo   = tempoRelativo(post.created_at);
  const sub     = [perfil.curso, perfil.periodo].filter(Boolean).join(' • ') || 'BrainHUB';
  const isPro   = perfil.is_pro === true;
  const isOwn   = post.user_id === usuarioAtual?.id;
  const proBadge = isPro ? `<span class="pro-badge-inline" style="font-size:0.7rem;padding:2px 7px"><i data-lucide="crown"></i> PRO</span>` : '';
  const featClass = isPro ? ' post-featured' : '';
  const featLabel = isPro ? `<div class="post-featured-label"><i data-lucide="zap"></i> Post em Destaque</div>` : '';

  return `
    <article class="post-card card${featClass}" data-id="${post.id}">
      ${featLabel}
      <div class="post-header">
        <div class="post-user">
          <a href="usuario.html?id=${post.user_id}" class="avatar-link">
            <div class="mini-avatar ${cor}">${iniciais}</div>
          </a>
          <div>
            <h4><a href="usuario.html?id=${post.user_id}" class="author-link">${escapeHtml(nome)}</a>${proBadge}</h4>
            <p>${escapeHtml(sub)} • ${tempo}</p>
          </div>
        </div>
        <div style="display:flex;gap:4px">
          <button class="icon-btn small save-post-btn" title="Salvar post" data-saved="false"><i data-lucide="bookmark"></i></button>
          ${isOwn ? `<button class="icon-btn small delete-post-btn" title="Excluir post"><i data-lucide="trash-2"></i></button>` : ''}
        </div>
      </div>
      ${post.humor ? `<div class="post-humor">${post.humor}</div>` : ''}
      <p class="post-text">${escapeHtml(post.texto)}</p>
      ${post.imagem_url ? `<img src="${post.imagem_url}" class="post-img" loading="lazy" />` : ''}
      ${post.arquivo_url ? `<a href="${post.arquivo_url}" target="_blank" class="post-file-link" download="${post.arquivo_nome || 'arquivo'}">📎 ${escapeHtml(post.arquivo_nome || 'Baixar arquivo')}</a>` : ''}
      <div class="post-actions">
        <button class="action-btn like-btn ${curtido ? 'liked' : ''}">
          <i data-lucide="thumbs-up"></i><span>${likesCount}</span>
        </button>
        <button class="action-btn comment-toggle-btn">
          <i data-lucide="message-square"></i><span>${commentsCount}</span>
        </button>
      </div>
      <div class="comments-section hidden">
        <div class="comments-list"></div>
        <div class="comment-form" style="display:flex;align-items:center;gap:8px;margin-top:8px">
          <input type="text" class="comment-input" placeholder="Escreva um comentário..."
            style="background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,0.2);color:white;outline:none;flex:1"/>
          <button class="comment-send"
            style="background:#23232b;border:1px solid rgba(255,255,255,0.16);color:white;padding:8px 16px;border-radius:12px;cursor:pointer;font-weight:500;">
            Enviar
          </button>
        </div>
      </div>
    </article>`;
}

function gerarIniciais(nome) {
  return (nome || '?').split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function tempoRelativo(dataStr) {
  const diff = Date.now() - new Date(dataStr).getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 1)  return 'agora';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7)    return `${d}d`;
  return new Date(dataStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function ativarEventosPosts(container) {
  container.querySelectorAll('.post-card').forEach(card => {
    const postId = card.dataset.id;

    // Like
    card.querySelector('.like-btn')?.addEventListener('click', async () => {
      const btn = card.querySelector('.like-btn');
      const span = btn.querySelector('span');
      const curtido = btn.classList.contains('liked');
      if (curtido) {
        await window.supabase.from('likes').delete().eq('user_id', usuarioAtual.id).eq('post_id', postId);
        btn.classList.remove('liked');
        span.textContent = Math.max(0, parseInt(span.textContent) - 1);
      } else {
        await window.supabase.from('likes').insert({ user_id: usuarioAtual.id, post_id: postId });
        btn.classList.add('liked');
        span.textContent = parseInt(span.textContent) + 1;
      }
    });

    // Toggle comentários
    const toggleBtn = card.querySelector('.comment-toggle-btn');
    const section   = card.querySelector('.comments-section');
    const lista     = card.querySelector('.comments-list');
    let carregado   = false;

    toggleBtn?.addEventListener('click', async () => {
      section.classList.toggle('hidden');
      if (!section.classList.contains('hidden') && !carregado) {
        carregado = true;
        await carregarComentarios(postId, lista);
      }
    });

    // Comentário
    const input   = card.querySelector('.comment-input');
    const sendBtn = card.querySelector('.comment-send');
    const enviar  = async () => {
      const texto = input.value.trim();
      if (!texto) return;
      input.value = '';
      await window.supabase.from('comments').insert({ user_id: usuarioAtual.id, post_id: postId, texto });
      const countSpan = card.querySelector('.comment-toggle-btn span');
      countSpan.textContent = parseInt(countSpan.textContent) + 1;
      carregado = false;
      await carregarComentarios(postId, lista);
    };
    sendBtn?.addEventListener('click', enviar);
    input?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); enviar(); } });

    // Salvar
    card.querySelector('.save-post-btn')?.addEventListener('click', async () => {
      const saveBtn = card.querySelector('.save-post-btn');
      const jaSalvo = saveBtn.dataset.saved === 'true';
      if (jaSalvo) {
        await window.supabase.from('saved_posts').delete().eq('user_id', usuarioAtual.id).eq('post_id', postId);
        saveBtn.dataset.saved = 'false';
        saveBtn.classList.remove('saved');
      } else {
        await window.supabase.from('saved_posts').insert({ user_id: usuarioAtual.id, post_id: postId });
        saveBtn.dataset.saved = 'true';
        saveBtn.classList.add('saved');
      }
    });

    // Excluir
    card.querySelector('.delete-post-btn')?.addEventListener('click', async () => {
      if (!confirm('Excluir este post?')) return;
      await window.supabase.from('posts').delete().eq('id', postId);
      card.remove();
    });
  });
}

async function carregarComentarios(postId, lista) {
  lista.innerHTML = '<p style="color:var(--muted);font-size:0.85rem;padding:4px 0">Carregando...</p>';
  const { data } = await window.supabase
    .from('comments')
    .select('id, user_id, texto, created_at, profiles(nome)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (!data || data.length === 0) {
    lista.innerHTML = '<p style="color:var(--muted);font-size:0.85rem;padding:4px 0">Nenhum comentário ainda.</p>';
    return;
  }
  lista.innerHTML = data.map(c => `
    <div class="comment-item">
      <a href="usuario.html?id=${c.user_id}" class="comment-author-link">
        <strong class="comment-author">${escapeHtml(c.profiles?.nome || 'Usuário')}</strong>
      </a>
      <p class="comment-text">${escapeHtml(c.texto)}</p>
    </div>`).join('');
}

// ===== MEMBROS =====
async function carregarMembros() {
  const grid = document.getElementById('gdMembrosGrid');

  // Passo 1: pega os user_ids dos membros
  const { data: memberships } = await window.supabase
    .from('group_members')
    .select('user_id, created_at')
    .eq('group_id', GRUPO_ID)
    .order('created_at', { ascending: true });

  if (!memberships || memberships.length === 0) {
    grid.innerHTML = '<p style="color:var(--muted);padding:20px">Nenhum membro ainda.</p>';
    return;
  }

  const userIds = memberships.map(m => m.user_id);

  // Passo 2: busca perfis separadamente
  const { data: perfis } = await window.supabase
    .from('profiles')
    .select('id, nome, cor_avatar, curso, faculdade')
    .in('id', userIds);

  const perfilMap = {};
  (perfis || []).forEach(p => { perfilMap[p.id] = p; });

  grid.innerHTML = memberships.map(m => {
    const p = perfilMap[m.user_id] || {};
    const iniciais = gerarIniciais(p.nome || '?');
    const sub = [p.curso, p.faculdade].filter(Boolean).join(' · ') || 'BrainHUB';
    const isCriador = grupoAtual?.criador_id === m.user_id;
    return `
      <a href="usuario.html?id=${m.user_id}" class="gd-membro-card">
        <div class="mini-avatar ${p.cor_avatar || ''}" style="width:44px;height:44px;font-size:0.9rem;flex-shrink:0">${iniciais}</div>
        <div style="flex:1;min-width:0">
          <div class="gd-membro-nome">${escapeHtml(p.nome || 'Usuário')}</div>
          <div class="gd-membro-sub">${escapeHtml(sub)}</div>
        </div>
        ${isCriador ? '<span class="gd-criador-badge">Criador</span>' : ''}
      </a>`;
  }).join('');
}

// ===== SOBRE =====
function renderSobre(grupo, totalMembros) {
  document.getElementById('gdSobreCard').innerHTML = `
    <div class="gd-sobre-emoji">${grupo.emoji || '🧠'}</div>
    <h2 class="gd-sobre-nome">${escapeHtml(grupo.nome)}</h2>
    <div class="gd-sobre-categoria">${grupo.categoria || 'Geral'}</div>
    ${grupo.descricao ? `<p class="gd-sobre-desc">${escapeHtml(grupo.descricao)}</p>` : ''}
    <div class="gd-sobre-stats">
      <div class="gd-sobre-stat">
        <strong>${totalMembros}</strong>
        <span>Membros</span>
      </div>
      <div class="gd-sobre-stat">
        <strong>${new Date(grupo.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</strong>
        <span>Criado em</span>
      </div>
    </div>
  `;
}

// ===== ABAS =====
let membrosCargado = false;

function setTab(btn, tab) {
  document.querySelectorAll('.gd-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.gd-tab-panel').forEach(p => p.classList.add('hidden'));
  document.getElementById(`tab-${tab}`).classList.remove('hidden');

  if (tab === 'membros' && !membrosCargado) {
    membrosCargado = true;
    carregarMembros();
  }
  lucide.createIcons();
}

init();
