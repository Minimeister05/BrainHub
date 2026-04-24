// ===================================================
// brainhub-shared.js — funções compartilhadas entre páginas
// Carregar ANTES dos scripts específicos de cada página
// ===================================================

const PRO_ACCOUNTS = ['suckowerick@gmail.com'];
const STORAGE_KEY = 'brainhub_posts';

// ===== STATUS PRO =====
async function sincronizarStatusPro() {
  if (!window.supabase) { setTimeout(sincronizarStatusPro, 300); return; }
  try {
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) return;
    const { data: perfil } = await window.supabase
      .from('profiles').select('is_pro').eq('id', user.id).single();
    if (perfil?.is_pro) {
      localStorage.setItem('brainhub_pro', 'true');
    } else {
      localStorage.removeItem('brainhub_pro');
    }
    if (typeof aplicarPerfilNoSidebar === 'function') aplicarPerfilNoSidebar();
  } catch (e) { /* silently fail — keeps existing localStorage value */ }
}

// ===== PERFIL =====
function getPerfilAtual() {
  const sessao = JSON.parse(localStorage.getItem('brainhub_usuario_logado') || 'null');
  const perfil = JSON.parse(localStorage.getItem(`brainhub_perfil_${sessao?.email}`) || 'null');
  const nome = perfil?.nome || sessao?.nome || 'Usuário';
  const curso = perfil?.curso || 'Sem curso definido';
  const faculdade = perfil?.faculdade || '';
  const periodo = perfil?.periodo || '';
  const corAvatar = perfil?.corAvatar || '';
  const fotoUrl = perfil?.fotoUrl || null;
  const isPro = localStorage.getItem('brainhub_pro') === 'true';
  const iniciais = nome.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  return { nome, curso, faculdade, periodo, corAvatar, fotoUrl, iniciais, isPro, email: sessao?.email || '' };
}

// Aplica dados do perfil nos elementos comuns do sidebar
function aplicarPerfilNoSidebar() {
  const u = getPerfilAtual();
  const avatarEl = document.querySelector('.profile-avatar');
  const nomeEl   = document.querySelector('.profile-card h2');
  const subEl    = document.querySelector('.profile-card > p');
  if (avatarEl) {
    if (u.fotoUrl) {
      avatarEl.innerHTML = `<img src="${u.fotoUrl}" alt="foto" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
      avatarEl.className = `profile-avatar av-foto`;
    } else {
      avatarEl.textContent = u.iniciais;
      avatarEl.className = `profile-avatar ${u.corAvatar}`;
    }
  }
  if (nomeEl) {
    nomeEl.innerHTML = u.nome + (u.isPro
      ? ' <span class="pro-badge-inline"><i data-lucide="crown"></i> PRO</span><span class="verified-inline" title="Verificado"><i data-lucide="badge-check"></i></span>'
      : '');
  }
  if (subEl) subEl.textContent = [u.curso, u.faculdade, u.periodo].filter(Boolean).join(' • ');
  const miniAvatar = document.querySelector('.create-top .mini-avatar');
  if (miniAvatar) {
    if (u.fotoUrl) {
      miniAvatar.innerHTML = `<img src="${u.fotoUrl}" alt="foto" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
      miniAvatar.className = `mini-avatar av-foto`;
    } else {
      miniAvatar.textContent = u.iniciais;
      miniAvatar.className = `mini-avatar ${u.corAvatar}`;
    }
  }
  lucide.createIcons();
}

// ===== LIGHTBOX DE FOTO =====
function abrirLightbox(url, alt) {
  const dialog = document.createElement('dialog');
  dialog.className = 'lightbox-dialog';
  dialog.innerHTML = `
    <div class="lightbox-box">
      <img src="${url}" alt="${alt || 'foto'}" />
      <button class="lightbox-close" aria-label="Fechar"><i data-lucide="x"></i></button>
    </div>`;
  document.body.appendChild(dialog);
  dialog.showModal();
  lucide.createIcons();
  const fechar = () => { dialog.close(); dialog.remove(); };
  dialog.querySelector('.lightbox-close').addEventListener('click', fechar);
  dialog.addEventListener('click', (e) => { if (e.target === dialog) fechar(); });
  dialog.addEventListener('cancel', fechar);
}

// ===== POSTS =====
const postsPadrao = [
  {
    id: 0,
    autor: "Erick Suckow Meister",
    curso: "Ciência da Computação",
    tempo: "agora mesmo",
    titulo: "Lançamos o BrainHUB! 🚀 Vem fazer parte dessa comunidade",
    texto: "Depois de meses desenvolvendo, finalmente estamos no ar! O BrainHUB é a rede social feita por estudantes, para estudantes. Conecte-se, compartilhe conhecimento e cresça junto com a gente. Mal posso esperar pra ver o que vamos construir juntos! 🧠✨",
    tags: ["BrainHUB", "Lançamento", "Comunidade"],
    likes: 142,
    comentarios: [
      { autor: "Ana Martins", texto: "Parabéns pelo lançamento! Vocês arrasaram 🎉" },
      { autor: "Lucas Mendes", texto: "Já tô dentro! Plataforma incrível." }
    ],
    curtido: false,
    salvo: false,
    corAvatar: "av-pro-gold",
    isOwnPost: true,
    isProPost: true,
    proAuthorEmail: "suckowerick@gmail.com"
  },
  {
    id: 1,
    autor: "Lucas Mendes",
    curso: "Ciência da Computação",
    tempo: "2h atrás",
    titulo: "Alguém pode me ajudar com Estrutura de Dados?",
    texto: "Estou com dificuldade em entender árvores AVL e balanceamento. Alguém tem algum material bom ou pode explicar de forma simples? Agradeço qualquer ajuda! 🌲",
    tags: ["Estrutura de Dados", "Árvore AVL", "Ajuda"],
    likes: 24,
    comentarios: [
      { autor: "João", texto: "Tenho um resumo bom disso, posso te mandar." },
      { autor: "Maria", texto: "Procura por animações visuais de AVL, ajuda bastante." }
    ],
    curtido: false,
    salvo: false,
    corAvatar: "default"
  },
  {
    id: 2,
    autor: "Ana Martins",
    curso: "Engenharia de Software",
    tempo: "5h atrás",
    titulo: "Resumo completo de Banco de Dados Relacional 📚",
    texto: "Galera, fiz um resumo bem detalhado sobre normalização, SQL avançado e modelagem ER. Quem quiser, é só comentar que eu mando o link do PDF.",
    tags: ["Banco de Dados", "Resumo", "SQL"],
    likes: 67,
    comentarios: [
      { autor: "Julia Martins", texto: "Me manda, por favor!" },
      { autor: "Rafael", texto: "Tava precisando muito disso." }
    ],
    curtido: false,
    salvo: false,
    corAvatar: "purple"
  },
  {
    id: 3,
    autor: "Rafael Ferreira",
    curso: "Sistemas de Informação",
    tempo: "7h atrás",
    titulo: "Vale a pena aprender React antes de backend?",
    texto: "Tô montando meu roadmap e queria saber se faz sentido focar em front primeiro ou se já começo com Node junto. Quem já passou por isso?",
    tags: ["Carreira", "React", "Frontend"],
    likes: 18,
    comentarios: [
      { autor: "Carlos", texto: "Eu começaria pelo front." },
      { autor: "Fernanda", texto: "Depende do teu objetivo." }
    ],
    curtido: false,
    salvo: false,
    corAvatar: "green"
  }
];

function gerarIniciais(nome) {
  return nome.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function carregarPosts() {
  const salvo = localStorage.getItem(STORAGE_KEY);
  let posts = salvo ? JSON.parse(salvo) : null;
  if (!posts) {
    salvarPosts(postsPadrao);
    return postsPadrao;
  }
  const temPostPro = posts.some(p => p.id === 0);
  if (!temPostPro) { posts.unshift(postsPadrao[0]); salvarPosts(posts); }
  return posts;
}

function salvarPosts(posts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

function criarComentarioHTML(comentario) {
  if (typeof comentario === 'string') {
    return `<div class="comment-item"><strong class="comment-author">Usuário</strong><p class="comment-text">${_escapeHtml(comentario)}</p></div>`;
  }
  return `<div class="comment-item"><strong class="comment-author">${_escapeHtml(comentario.autor)}</strong><p class="comment-text">${_escapeHtml(comentario.texto)}</p></div>`;
}

function criarPostHTML(post) {
  const iniciais    = gerarIniciais(post.autor);
  const tagsHTML    = post.tags.map(t => `<span>${_escapeHtml(t)}</span>`).join('');
  const comsHTML    = post.comentarios.map(criarComentarioHTML).join('');
  const isProPost   = post.isProPost === true;
  const proBadge    = isProPost ? `<span class="pro-badge-post"><i data-lucide="crown"></i> PRO</span>` : '';
  const verified    = isProPost ? `<span class="verified-post" title="Verificado"><i data-lucide="badge-check"></i></span>` : '';
  const featClass   = isProPost ? ' post-featured' : '';
  const featLabel   = isProPost ? '<div class="post-featured-label"><i data-lucide="zap"></i> Post em Destaque</div>' : '';
  const avatarClass = post.corAvatar === 'default' ? '' : post.corAvatar;

  return `
    <article class="post-card card${featClass}" data-id="${post.id}">
      ${featLabel}
      <div class="post-header">
        <div class="post-user">
          <div class="mini-avatar ${avatarClass}">${iniciais}</div>
          <div>
            <h4>${_escapeHtml(post.autor)}${verified}${proBadge}</h4>
            <p>${_escapeHtml(post.curso)} • ${_escapeHtml(post.tempo)}</p>
          </div>
        </div>
        <button class="icon-btn small"><i data-lucide="more-vertical"></i></button>
      </div>
      <h3>${_escapeHtml(post.titulo)}</h3>
      <p class="post-text">${_escapeHtml(post.texto)}</p>
      <div class="tags">${tagsHTML}</div>
      <div class="post-actions">
        <button class="action-btn like-btn ${post.curtido ? 'liked' : ''}">
          <i data-lucide="thumbs-up"></i><span>${post.likes}</span>
        </button>
        <button class="action-btn comment-toggle-btn">
          <i data-lucide="message-square"></i><span>${post.comentarios.length}</span>
        </button>
        <button class="action-btn">
          <i data-lucide="share-2"></i><span>0</span>
        </button>
        <button class="action-btn save-btn right ${post.salvo ? 'saved' : ''}">
          <i data-lucide="bookmark"></i>
        </button>
      </div>
      <div class="comments-section hidden">
        <div class="comment-form">
          <input type="text" class="comment-input" placeholder="Escreva um comentário..."
            style="background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,0.2);color:white;outline:none;flex:1"/>
          <button class="comment-send"
            style="background:#23232b;border:1px solid rgba(255,255,255,0.16);color:white;padding:8px 16px;border-radius:12px;margin-left:10px;cursor:pointer;font-weight:500;">
            Enviar
          </button>
        </div>
        <div class="comments-list">${comsHTML}</div>
      </div>
    </article>`;
}

// Renderiza lista de posts em um container
function renderizarFeed(container, posts, mostrarBanner = false) {
  const isPro = localStorage.getItem('brainhub_pro') === 'true';
  const banner = (mostrarBanner && !isPro) ? `
    <div class="pro-banner-feed">
      <div class="pro-banner-left">
        <span class="pro-banner-badge"><i data-lucide="crown"></i> Pro</span>
        <div>
          <strong>Destaque seus posts com o BrainHUB Pro</strong>
          <span>Badge exclusivo, checkmark verificado e muito mais por R$ 14,90/mês</span>
        </div>
      </div>
      <a href="planos.html" class="pro-banner-btn">Ver planos</a>
    </div>` : '';

  if (posts.length === 0 && !mostrarBanner) {
    container.innerHTML = `
      <div class="aba-empty">
        <i data-lucide="file-x"></i>
        <h3>Nenhum post aqui ainda.</h3>
      </div>`;
    lucide.createIcons();
    return;
  }

  container.innerHTML = banner + posts.map(criarPostHTML).join('');
  lucide.createIcons();
  ativarEventosDosPosts(container);
}

// ===== INTERAÇÕES =====
function alternarLike(postId) {
  const posts = carregarPosts();
  const post = posts.find(p => p.id === postId);
  if (!post) return;
  post.curtido ? (post.likes--, post.curtido = false) : (post.likes++, post.curtido = true);
  salvarPosts(posts);
  const el = document.querySelector(`.post-card[data-id="${postId}"]`);
  if (el) {
    el.querySelector('.like-btn').classList.toggle('liked', post.curtido);
    el.querySelector('.like-btn span').textContent = post.likes;
  }
}

function alternarSalvar(postId) {
  const posts = carregarPosts();
  const post = posts.find(p => p.id === postId);
  if (!post) return;
  post.salvo = !post.salvo;
  salvarPosts(posts);
  const el = document.querySelector(`.post-card[data-id="${postId}"]`);
  if (el) el.querySelector('.save-btn').classList.toggle('saved', post.salvo);
}

function adicionarComentario(postId, texto) {
  const posts = carregarPosts();
  const post = posts.find(p => p.id === postId);
  if (!post) return;
  post.comentarios.push({ autor: 'Você', texto });
  salvarPosts(posts);
  const el = document.querySelector(`.post-card[data-id="${postId}"]`);
  if (el) {
    const lista = el.querySelector('.comments-list');
    const item = document.createElement('div');
    item.className = 'comment-item';
    item.innerHTML = `<strong class="comment-author">Você</strong><p class="comment-text">${_escapeHtml(texto)}</p>`;
    lista.appendChild(item);
    el.querySelector('.comment-input').value = '';
    el.querySelector('.comment-toggle-btn span').textContent = post.comentarios.length;
  }
}

function ativarEventosDosPosts(container = document) {
  container.querySelectorAll('.post-card').forEach(el => {
    const id = Number(el.dataset.id);
    el.querySelector('.like-btn').addEventListener('click', () => alternarLike(id));
    el.querySelector('.save-btn').addEventListener('click', () => alternarSalvar(id));
    const toggleBtn = el.querySelector('.comment-toggle-btn');
    const section   = el.querySelector('.comments-section');
    const input     = el.querySelector('.comment-input');
    const send      = el.querySelector('.comment-send');
    toggleBtn.addEventListener('click', () => section.classList.toggle('hidden'));
    send.addEventListener('click', () => { const t = input.value.trim(); if (t) adicionarComentario(id, t); });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const t = input.value.trim(); if (t) adicionarComentario(id, t); } });
  });
}

// ===== BADGE DE NOTIFICAÇÕES =====
function aplicarBadgeNotif() {
  const count = parseInt(localStorage.getItem('brainhub_notif_count') || '0');
  document.querySelectorAll('.notification-btn .badge').forEach(b => {
    b.textContent = count;
    b.style.display = count > 0 ? '' : 'none';
  });
  // Ponto no bottom nav mobile
  document.querySelectorAll('.mob-notif-dot').forEach(dot => {
    dot.classList.toggle('visible', count > 0);
  });
}

// Calcula badge de notificações via Supabase (mais preciso que localStorage)
async function atualizarBadgeNotifSupabase() {
  if (!window.supabase) return;
  try {
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) return;

    const lastRead = localStorage.getItem('brainhub_notif_lastread') || '1970-01-01T00:00:00Z';

    // Busca posts do usuário
    const { data: myPosts } = await window.supabase
      .from('posts').select('id').eq('user_id', user.id);
    const myPostIds = (myPosts || []).map(p => p.id);

    let totalNovas = 0;

    if (myPostIds.length > 0) {
      const [{ data: newLikesData }, { data: newCommentsData }] = await Promise.all([
        window.supabase.from('likes')
          .select('post_id')
          .in('post_id', myPostIds)
          .neq('user_id', user.id)
          .gt('created_at', lastRead),
        window.supabase.from('comments')
          .select('id')
          .in('post_id', myPostIds)
          .neq('user_id', user.id)
          .gt('created_at', lastRead),
      ]);
      totalNovas += (newLikesData?.length || 0) + (newCommentsData?.length || 0);
    }

    const { data: newFollowsData } = await window.supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', user.id)
      .gt('created_at', lastRead);
    totalNovas += (newFollowsData?.length || 0);

    localStorage.setItem('brainhub_notif_count', totalNovas);
    aplicarBadgeNotif();
  } catch (e) {
    // Silently fail — keeps existing localStorage value
  }
}

// ===== STATS SIDEBAR (Supabase) =====
async function carregarEstatisticasSidebar() {
  if (!window.supabase) return;
  const { data: { user } } = await window.supabase.auth.getUser();
  if (!user) return;

  const [{ data: postsData }, { data: seguidoresData }, { data: seguindoData }] = await Promise.all([
    window.supabase.from('posts').select('id').eq('user_id', user.id),
    window.supabase.from('follows').select('follower_id').eq('following_id', user.id),
    window.supabase.from('follows').select('following_id').eq('follower_id', user.id)
  ]);

  const el = (id) => document.getElementById(id);
  if (el('statMeusPosts'))      el('statMeusPosts').textContent      = postsData?.length      || 0;
  if (el('statMeusSeguidores')) el('statMeusSeguidores').textContent = seguidoresData?.length || 0;
  if (el('statMeusSeguindo'))   el('statMeusSeguindo').textContent   = seguindoData?.length   || 0;
}

// Sempre consulta Supabase para ter o número real (não usa cache do localStorage)
function _waitAndUpdateBadge() {
  if (window.supabase) { atualizarBadgeNotifSupabase(); }
  else { setTimeout(_waitAndUpdateBadge, 300); }
}
_waitAndUpdateBadge();

// ===== BADGE DE MENSAGENS NO NAV (Chat) =====

function _injetarBadgesChat() {
  document.querySelectorAll('a[href*="chat.html"]').forEach(link => {
    if (link.querySelector('.nav-chat-badge')) return;
    const badge = document.createElement('span');
    badge.className = 'nav-chat-badge';
    link.appendChild(badge);
  });
}

function aplicarBadgeChat(count) {
  document.querySelectorAll('.nav-chat-badge').forEach(b => {
    b.textContent = count > 99 ? '99+' : count;
    b.style.display = count > 0 ? 'flex' : 'none';
  });
}

async function atualizarBadgeChat() {
  if (!window.supabase) return;
  try {
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) return;

    // DMs não lidas
    const { count: dmCount } = await window.supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('lida', false);

    // Mensagens de grupo não lidas desde última visita ao chat
    const lastVisit = localStorage.getItem('brainhub_chat_lastvisit') || '1970-01-01T00:00:00Z';
    const { data: membership } = await window.supabase
      .from('chat_members')
      .select('group_id')
      .eq('user_id', user.id);

    let groupCount = 0;
    if (membership?.length > 0) {
      const groupIds = membership.map(m => m.group_id);
      const { count } = await window.supabase
        .from('group_messages')
        .select('id', { count: 'exact', head: true })
        .in('group_id', groupIds)
        .neq('sender_id', user.id)
        .gt('created_at', lastVisit);
      groupCount = count || 0;
    }

    aplicarBadgeChat((dmCount || 0) + groupCount);
  } catch (e) {}
}

function _iniciarRealtimeBadgeChat(userId) {
  // Sem filter: o Supabase exige configuração extra no dashboard para row filters.
  // Filtramos client-side no callback.
  window.supabase
    .channel(`nav_badge_chat_${userId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload) => { if (payload.new?.receiver_id === userId) atualizarBadgeChat(); })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' },
      (payload) => { if (payload.new?.receiver_id === userId) atualizarBadgeChat(); })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages' },
      () => atualizarBadgeChat())
    .subscribe();

  // Polling fallback: garante que o badge fica correto mesmo se o realtime falhar
  setInterval(atualizarBadgeChat, 30000);
}

function _initChatBadge() {
  if (!window.supabase) { setTimeout(_initChatBadge, 300); return; }

  if (window.location.pathname.includes('chat.html')) {
    // Usuário está no chat: registra visita para zerar badge de grupos
    localStorage.setItem('brainhub_chat_lastvisit', new Date().toISOString());
    return;
  }

  _injetarBadgesChat();
  window.supabase.auth.getUser().then(({ data: { user } }) => {
    if (!user) return;
    atualizarBadgeChat();
    _iniciarRealtimeBadgeChat(user.id);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initChatBadge);
} else {
  setTimeout(_initChatBadge, 0);
}

// ===== MODAL DE CONFIRMAÇÃO =====
function confirmar({ icone = '⚠️', titulo = 'Confirmar', mensagem = 'Tem certeza?', btnConfirmar = 'Confirmar', btnCancelar = 'Cancelar', danger = false } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.className = 'confirm-overlay'
    overlay.innerHTML = `
      <div class="confirm-box">
        <div class="confirm-icon">${icone}</div>
        <h3>${titulo}</h3>
        <p>${mensagem}</p>
        <div class="confirm-actions">
          <button class="confirm-btn-cancel">${btnCancelar}</button>
          <button class="confirm-btn-delete${danger ? '' : ' confirm-btn-neutral'}">${btnConfirmar}</button>
        </div>
      </div>`

    document.body.appendChild(overlay)
    overlay.querySelector('.confirm-btn-cancel').addEventListener('click', () => { overlay.remove(); resolve(false); })
    overlay.querySelector('.confirm-btn-delete').addEventListener('click', () => { overlay.remove(); resolve(true); })
    overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); resolve(false); } })
  })
}

function confirmarExclusao(mensagem = 'Esta ação não pode ser desfeita.') {
  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.className = 'confirm-overlay'
    overlay.innerHTML = `
      <div class="confirm-box">
        <div class="confirm-icon">🗑️</div>
        <h3>Excluir post</h3>
        <p>${mensagem}</p>
        <div class="confirm-actions">
          <button class="confirm-btn-cancel">Cancelar</button>
          <button class="confirm-btn-delete">Excluir</button>
        </div>
      </div>`

    document.body.appendChild(overlay)

    overlay.querySelector('.confirm-btn-cancel').addEventListener('click', () => {
      overlay.remove()
      resolve(false)
    })

    overlay.querySelector('.confirm-btn-delete').addEventListener('click', () => {
      overlay.remove()
      resolve(true)
    })

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove()
        resolve(false)
      }
    })
  })
}

// ===== @MENÇÕES — utilitários compartilhados =====
function _escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function _gerarIniciais(nome) {
  return (nome || '?').split(' ').map(p => p[0]).filter(Boolean).slice(0,2).join('').toUpperCase();
}
// ===== CLOUDINARY UPLOAD =====
const CLOUDINARY_CLOUD = 'ds2fhtsmv';
const CLOUDINARY_PRESET = 'brainhub_unsigned';

// Corrige URLs de PDFs que foram salvos incorretamente com /image/upload/
function corrigirUrlArquivo(url, nome) {
  if (!url || !nome) return url;
  if (url.includes('/image/upload/') && nome.toLowerCase().endsWith('.pdf')) {
    return url.replace('/image/upload/', '/raw/upload/');
  }
  return url;
}

async function uploadParaCloudinary(file, folder) {
  const isPdf = file.type === 'application/pdf';
  // PDFs precisam de /raw/upload — /auto/upload pode retornar /image/upload/ incorretamente
  const resourceType = isPdf ? 'raw' : 'auto';

  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUDINARY_PRESET);
  fd.append('folder', `brainhub/${folder}`);
  if (file.type.startsWith('image/')) fd.append('moderation', 'aws_rek');
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/${resourceType}/upload`, {
    method: 'POST', body: fd
  });
  if (!res.ok) throw new Error('Erro ao enviar para Cloudinary');
  const json = await res.json();
  if (json.moderation && json.moderation[0]?.status === 'rejected') {
    throw new Error('Conteúdo impróprio detectado. Upload não permitido.');
  }
  return json.secure_url;
}

// ===== DENÚNCIA =====
const MOTIVOS_DENUNCIA = [
  'Conteúdo sexual ou pornográfico',
  'Discurso de ódio / nazismo / extremismo',
  'Violência ou ameaças',
  'Spam ou conteúdo enganoso',
  'Outro',
];

function denunciarConteudo(contentType, contentId) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-box" style="max-width:380px">
        <div class="confirm-icon">🚩</div>
        <h3>Denunciar conteúdo</h3>
        <p style="margin-bottom:12px">Selecione o motivo da denúncia:</p>
        <div class="report-motivos">
          ${MOTIVOS_DENUNCIA.map((m, i) => `
            <label class="report-motivo-item">
              <input type="radio" name="motivo" value="${m}" ${i === 0 ? 'checked' : ''} />
              <span>${m}</span>
            </label>`).join('')}
        </div>
        <div class="confirm-actions" style="margin-top:16px">
          <button class="confirm-btn-cancel">Cancelar</button>
          <button class="confirm-btn-delete">Enviar denúncia</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.confirm-btn-cancel').addEventListener('click', () => { overlay.remove(); resolve(false); });
    overlay.querySelector('.confirm-btn-delete').addEventListener('click', async () => {
      const motivo = overlay.querySelector('input[name="motivo"]:checked')?.value;
      if (!motivo) return;
      overlay.remove();
      try {
        const { data: { user } } = await window.supabase.auth.getUser();
        if (!user) return;
        await window.supabase.from('reports').insert({
          reporter_id: user.id,
          content_type: contentType,
          content_id: String(contentId),
          reason: motivo,
        });
        if (typeof mostrarToast === 'function') mostrarToast('Denúncia enviada. Obrigado!', 'success');
      } catch (e) {
        if (typeof mostrarToast === 'function') mostrarToast('Erro ao enviar denúncia.', 'error');
      }
      resolve(true);
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); resolve(false); } });
  });
}

// Regex para nomes com acentos, espaços não inclusos
const MENTION_AT_RE = /@([\wÀ-ÿ]{1,30})$/;

function ativarMencoes(input, dropdown) {
  if (!input || !dropdown) return;
  let timer = null;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const val    = input.value;
    const pos    = input.selectionStart ?? val.length;
    const before = val.slice(0, pos);
    const match  = before.match(MENTION_AT_RE);
    if (!match) { dropdown.style.display = 'none'; return; }
    const q = match[1];
    timer = setTimeout(async () => {
      if (!window.supabase) return;
      const { data } = await window.supabase
        .from('profiles').select('id, nome, cor_avatar, foto_url')
        .ilike('nome', `%${q}%`).limit(5);
      if (!data?.length) { dropdown.style.display = 'none'; return; }
      dropdown.innerHTML = data.map(p => {
        const ini  = _gerarIniciais(p.nome || 'U');
        const avEl = p.foto_url
          ? `<div class="mention-item-av"><img src="${p.foto_url}" /></div>`
          : `<div class="mention-item-av ${p.cor_avatar || ''}">${ini}</div>`;
        return `<div class="mention-item" data-id="${p.id}" data-nome="${_escapeHtml(p.nome||'Usuário')}">${avEl}<span class="mention-item-nome">${_escapeHtml(p.nome||'Usuário')}</span></div>`;
      }).join('');
      dropdown.style.display = 'block';
      dropdown.querySelectorAll('.mention-item').forEach(item => {
        item.addEventListener('mousedown', e => {
          e.preventDefault();
          const id   = item.dataset.id;
          const nome = item.dataset.nome;
          const cur  = input.selectionStart ?? input.value.length;
          const newVal = input.value.slice(0, cur).replace(MENTION_AT_RE, `@[${nome}|${id}] `) + input.value.slice(cur);
          input.value = newVal;
          const np = newVal.indexOf(`@[${nome}|${id}] `) + `@[${nome}|${id}] `.length;
          input.setSelectionRange(np, np);
          input.focus();
          dropdown.style.display = 'none';
        });
      });
    }, 200);
  });
  input.addEventListener('blur',    () => setTimeout(() => { dropdown.style.display = 'none'; }, 150));
  input.addEventListener('keydown', e => { if (e.key === 'Escape') dropdown.style.display = 'none'; });
}

// ===== COMPARTILHAR POST =====
(function() {
  function injetarModalCompartilhar() {
    if (document.getElementById('compartilharOverlay')) return;
    const el = document.createElement('div');
    el.id = 'compartilharOverlay';
    el.className = 'compartilhar-overlay hidden';
    el.innerHTML = `
      <div class="compartilhar-modal">
        <div class="compartilhar-header">
          <h3>Compartilhar post</h3>
          <button class="icon-btn small" id="compartilharFechar"><i data-lucide="x"></i></button>
        </div>
        <div class="compartilhar-busca-wrap">
          <i data-lucide="search"></i>
          <input type="text" id="compartilharBusca" placeholder="Buscar conversa..." autocomplete="off" />
        </div>
        <div id="compartilharLista" class="compartilhar-lista">
          <p class="compartilhar-vazio">Carregando...</p>
        </div>
        <div class="compartilhar-footer">
          <input type="text" id="compartilharMsg" placeholder="Adicionar mensagem (opcional)" autocomplete="off" />
          <div id="compartilharStatus" style="display:none;font-size:0.82rem;font-weight:600;padding:6px 2px 0;text-align:center"></div>
        </div>
      </div>`;
    document.body.appendChild(el);
    el.addEventListener('click', e => { if (e.target === el) fecharModalCompartilhar(); });
    document.getElementById('compartilharFechar').addEventListener('click', fecharModalCompartilhar);
    document.getElementById('compartilharBusca').addEventListener('input', () => {
      renderizarListaCompartilhar(document.getElementById('compartilharBusca').value.trim().toLowerCase());
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharModalCompartilhar(); });
    if (window.lucide) lucide.createIcons({ nodes: [el] });
  }

  let _conversasCache = [];
  let _postCompartilhar = null;

  async function carregarConversasCompartilhar() {
    if (!window.supabase) return [];
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) return [];

    const [dmResult, chatGrpResult, comunGrpResult] = await Promise.all([
      window.supabase.from('follows').select('following_id').eq('follower_id', user.id),
      window.supabase.from('chat_group_members').select('group_id').eq('user_id', user.id),
      window.supabase.from('group_members').select('group_id').eq('user_id', user.id)
    ]);

    const seguindoIds   = (dmResult.data || []).map(f => f.following_id);
    const chatGroupIds  = (chatGrpResult.data || []).map(m => m.group_id);
    const comunGroupIds = (comunGrpResult.data || []).map(m => m.group_id);

    const [perfisResult, chatGruposResult, comunGruposResult] = await Promise.all([
      seguindoIds.length
        ? window.supabase.from('profiles').select('id, nome, cor_avatar').in('id', seguindoIds)
        : Promise.resolve({ data: [] }),
      chatGroupIds.length
        ? window.supabase.from('chat_groups').select('id, name, emoji').in('id', chatGroupIds)
        : Promise.resolve({ data: [] }),
      comunGroupIds.length
        ? window.supabase.from('grupos').select('id, nome, emoji').in('id', comunGroupIds)
        : Promise.resolve({ data: [] })
    ]);

    const dms = (perfisResult.data || []).map(p => ({
      tipo:      'dm',
      id:        p.id,
      nome:      p.nome || 'Usuário',
      iniciais:  _gerarIniciais(p.nome || 'Usuário'),
      cor:       p.cor_avatar || '',
      subtitulo: 'Mensagem direta'
    }));

    const chatGrupos = (chatGruposResult.data || []).map(g => ({
      tipo:      'group',
      id:        g.id,
      nome:      g.name || 'Grupo',
      iniciais:  g.emoji || '💬',
      cor:       'group',
      subtitulo: 'Grupo de chat'
    }));

    const comunGrupos = (comunGruposResult.data || []).map(g => ({
      tipo:      'comunidade',
      id:        g.id,
      nome:      g.nome || 'Grupo',
      iniciais:  g.emoji || '👥',
      cor:       'comunidade',
      subtitulo: 'Grupo da comunidade'
    }));

    return [...dms, ...chatGrupos, ...comunGrupos];
  }

  function renderizarListaCompartilhar(filtro = '') {
    const lista = document.getElementById('compartilharLista');
    if (!lista) return;
    const itens = filtro
      ? _conversasCache.filter(c => c.nome.toLowerCase().includes(filtro))
      : _conversasCache;

    if (!itens.length) {
      lista.innerHTML = `<p class="compartilhar-vazio">${filtro ? 'Nenhum resultado.' : 'Nenhuma conversa encontrada.'}</p>`;
      return;
    }

    lista.innerHTML = itens.map(c => {
      const av = (c.tipo === 'group' || c.tipo === 'comunidade')
        ? `<div class="compartilhar-av ${c.cor}">${c.iniciais}</div>`
        : `<div class="compartilhar-av ${c.cor}">${c.iniciais}</div>`;
      return `<div class="compartilhar-item" data-tipo="${c.tipo}" data-id="${c.id}">
        ${av}
        <div class="compartilhar-item-info">
          <span class="compartilhar-item-nome">${_escapeHtml(c.nome)}</span>
          <span class="compartilhar-item-sub">${c.subtitulo}</span>
        </div>
        <button class="compartilhar-enviar-btn"><i data-lucide="send"></i> Enviar</button>
      </div>`;
    }).join('');

    lista.querySelectorAll('.compartilhar-enviar-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const item = btn.closest('.compartilhar-item');
        const tipo = item.dataset.tipo;
        const id   = item.dataset.id;
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" style="width:13px;height:13px;animation:spin 1s linear infinite"></i> Enviando...';
        if (window.lucide) lucide.createIcons({ nodes: [btn] });
        _mostrarStatusCompartilhar('');
        try {
          await enviarPostParaConversa(tipo, id);
          const label = tipo === 'comunidade' ? 'Post publicado no grupo! ✓' : 'Mensagem enviada! ✓';
          _mostrarStatusCompartilhar(label, false);
          setTimeout(fecharModalCompartilhar, 2000);
        } catch(e) {
          btn.disabled = false;
          btn.innerHTML = '<i data-lucide="send"></i> Enviar';
          if (window.lucide) lucide.createIcons({ nodes: [btn] });
          const motivo = e?.message || 'Erro desconhecido';
          _mostrarStatusCompartilhar(`Erro ao enviar: ${motivo}`, true);
        }
      });
    });
  }

  async function enviarPostParaConversa(tipo, targetId) {
    if (!_postCompartilhar || !window.supabase) return;
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado.');

    const { postId, autor, texto, imgUrl, arquivoUrl, arquivoNome } = _postCompartilhar;
    const msgExtra   = (document.getElementById('compartilharMsg')?.value || '').trim();
    const textoTrunc = texto.length > 120 ? texto.slice(0, 120) + '…' : texto;

    if (tipo === 'comunidade') {
      const textoPost = msgExtra
        ? `${msgExtra}\n\n📤 Compartilhado de ${autor}:\n${textoTrunc}`
        : `📤 Compartilhado de ${autor}:\n${textoTrunc}`;
      const { error } = await window.supabase.from('posts').insert({
        user_id:      user.id,
        group_id:     targetId,
        texto:        textoPost,
        imagem_url:   imgUrl   || null,
        arquivo_url:  arquivoUrl  || null,
        arquivo_nome: arquivoNome || null
      });
      if (error) throw new Error(error.message);
      return;
    }

    // DM ou grupo de chat — envia como mensagem
    const payload = `__post__:${postId}||${autor}||${textoTrunc}||${imgUrl}`;

    if (msgExtra) {
      const extra = tipo === 'dm'
        ? window.supabase.from('messages').insert({ sender_id: user.id, receiver_id: targetId, texto: msgExtra })
        : window.supabase.from('group_messages').insert({ group_id: targetId, sender_id: user.id, texto: msgExtra });
      const { error: e1 } = await extra;
      if (e1) throw new Error(e1.message);
    }

    const main = tipo === 'dm'
      ? window.supabase.from('messages').insert({ sender_id: user.id, receiver_id: targetId, texto: payload })
      : window.supabase.from('group_messages').insert({ group_id: targetId, sender_id: user.id, texto: payload });
    const { error: e2 } = await main;
    if (e2) throw new Error(e2.message);
  }

  function _mostrarStatusCompartilhar(msg, isErro = false) {
    let el = document.getElementById('compartilharStatus');
    if (!el) return;
    if (!msg) { el.style.display = 'none'; return; }
    el.textContent = msg;
    el.style.display = 'block';
    el.style.color   = isErro ? '#ff4b6e' : '#26d0a8';
  }

  function fecharModalCompartilhar() {
    const el = document.getElementById('compartilharOverlay');
    if (!el || el.classList.contains('hidden') || el.classList.contains('hiding')) return;
    el.classList.add('hiding');
    setTimeout(() => {
      el.classList.remove('hiding');
      el.classList.add('hidden');
      _postCompartilhar = null;
    }, 280);
  }

  window.abrirModalCompartilhar = async function(postId, texto, autor, imgUrl, arquivoUrl, arquivoNome) {
    injetarModalCompartilhar();
    _postCompartilhar = { postId, texto, autor, imgUrl, arquivoUrl: arquivoUrl || '', arquivoNome: arquivoNome || '' };
    const overlay = document.getElementById('compartilharOverlay');
    overlay.classList.remove('hidden');
    document.getElementById('compartilharBusca').value = '';
    document.getElementById('compartilharMsg').value   = '';
    document.getElementById('compartilharLista').innerHTML = '<p class="compartilhar-vazio">Carregando...</p>';
    _mostrarStatusCompartilhar('');
    if (window.lucide) lucide.createIcons({ nodes: [overlay] });
    _conversasCache = await carregarConversasCompartilhar();
    renderizarListaCompartilhar('');
  };
})();
