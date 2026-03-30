// ===================================================
// brainhub-shared.js — funções compartilhadas entre páginas
// Carregar ANTES dos scripts específicos de cada página
// ===================================================

const PRO_ACCOUNTS = ['suckowerick@gmail.com'];
const STORAGE_KEY = 'brainhub_posts';

// ===== STATUS PRO =====
function sincronizarStatusPro() {
  const sessao = JSON.parse(localStorage.getItem('brainhub_usuario_logado') || 'null');
  if (!sessao) return;
  if (PRO_ACCOUNTS.includes(sessao.email)) {
    localStorage.setItem('brainhub_pro', 'true');
    localStorage.setItem(`brainhub_pro_${sessao.email}`, 'true');
  } else {
    localStorage.removeItem('brainhub_pro');
  }
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
  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.innerHTML = `
    <div class="lightbox-box">
      <img src="${url}" alt="${alt || 'foto'}" />
      <button class="lightbox-close" aria-label="Fechar"><i data-lucide="x"></i></button>
    </div>`;
  document.body.appendChild(overlay);
  lucide.createIcons();
  const fechar = () => overlay.remove();
  overlay.querySelector('.lightbox-close').addEventListener('click', fechar);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) fechar(); });
  document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { fechar(); document.removeEventListener('keydown', esc); } });
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
    return `<div class="comment-item"><strong class="comment-author">Usuário</strong><p class="comment-text">${comentario}</p></div>`;
  }
  return `<div class="comment-item"><strong class="comment-author">${comentario.autor}</strong><p class="comment-text">${comentario.texto}</p></div>`;
}

function criarPostHTML(post) {
  const iniciais    = gerarIniciais(post.autor);
  const tagsHTML    = post.tags.map(t => `<span>${t}</span>`).join('');
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
            <h4>${post.autor}${verified}${proBadge}</h4>
            <p>${post.curso} • ${post.tempo}</p>
          </div>
        </div>
        <button class="icon-btn small"><i data-lucide="more-vertical"></i></button>
      </div>
      <h3>${post.titulo}</h3>
      <p class="post-text">${post.texto}</p>
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
    item.innerHTML = `<strong class="comment-author">Você</strong><p class="comment-text">${texto}</p>`;
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
