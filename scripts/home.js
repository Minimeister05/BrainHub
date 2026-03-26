// home.js — feed principal (Supabase)
lucide.createIcons();
sincronizarStatusPro();
aplicarPerfilNoSidebar();

const publishBtn = document.getElementById('publishBtn');
const postInput  = document.getElementById('postInput');
const feedList   = document.getElementById('feedList');

let usuarioAtual  = null;
let feedTab       = 'fyp';      // 'fyp' | 'following'
let seguindoIds   = new Set();
let latestPostAt  = null;       // timestamp do post mais novo carregado
let novosCount    = 0;
let pollInterval  = null;

// ===== COMPOSITOR: MÍDIA & HUMOR =====
let mediaArquivo  = null; // File selecionado (imagem ou doc)
let mediaTipo     = null; // 'imagem' | 'arquivo'
let humorSelecionado = null;

const btnImagem        = document.getElementById('btnImagem');
const btnArquivo       = document.getElementById('btnArquivo');
const btnHumor         = document.getElementById('btnHumor');
const inputImagem      = document.getElementById('inputImagem');
const inputArquivo     = document.getElementById('inputArquivo');
const composerPreview  = document.getElementById('composerPreview');
const composerImgPrev  = document.getElementById('composerImgPreview');
const composerFilePrev = document.getElementById('composerFilePreview');
const composerRemove   = document.getElementById('composerRemoveMedia');
const humorDropdown    = document.getElementById('humorDropdown');

function mostrarPreview() {
  composerPreview.style.display = 'flex';
}
function limparMedia() {
  mediaArquivo = null; mediaTipo = null;
  inputImagem.value = ''; inputArquivo.value = '';
  composerImgPrev.style.display = 'none';
  composerImgPrev.src = '';
  composerFilePrev.style.display = 'none';
  composerFilePrev.textContent = '';
  if (!humorSelecionado) composerPreview.style.display = 'none';
}

btnImagem?.addEventListener('click', () => inputImagem.click());
btnArquivo?.addEventListener('click', () => inputArquivo.click());

inputImagem?.addEventListener('change', () => {
  const file = inputImagem.files[0];
  if (!file) return;
  mediaArquivo = file; mediaTipo = 'imagem';
  const reader = new FileReader();
  reader.onload = e => {
    composerImgPrev.src = e.target.result;
    composerImgPrev.style.display = '';
    composerFilePrev.style.display = 'none';
    mostrarPreview();
  };
  reader.readAsDataURL(file);
});

inputArquivo?.addEventListener('change', () => {
  const file = inputArquivo.files[0];
  if (!file) return;
  mediaArquivo = file; mediaTipo = 'arquivo';
  composerFilePrev.textContent = `📎 ${file.name}`;
  composerFilePrev.style.display = '';
  composerImgPrev.style.display = 'none';
  mostrarPreview();
});

composerRemove?.addEventListener('click', () => {
  limparMedia();
});

btnHumor?.addEventListener('click', () => {
  const isOpen = humorDropdown.style.display !== 'none';
  humorDropdown.style.display = isOpen ? 'none' : 'flex';
});

humorDropdown?.querySelectorAll('.humor-opt').forEach(btn => {
  btn.addEventListener('click', () => {
    const humor = btn.dataset.humor;
    if (humorSelecionado === humor) {
      // deseleciona
      humorSelecionado = null;
      humorDropdown.querySelectorAll('.humor-opt').forEach(b => b.classList.remove('active'));
      btnHumor.classList.remove('active');
      composerPreview.style.display = mediaArquivo ? 'flex' : 'none';
    } else {
      humorSelecionado = humor;
      humorDropdown.querySelectorAll('.humor-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      btnHumor.classList.add('active');
      mostrarPreview();
    }
    humorDropdown.style.display = 'none';
  });
});

// Mini-avatar na caixa de criar post
;(function () {
  const u = getPerfilAtual();
  const mini = document.querySelector('.create-top .mini-avatar');
  if (mini) { mini.textContent = u.iniciais; mini.className = `mini-avatar ${u.corAvatar}`; }
})();

// Auto-resize do textarea
postInput?.addEventListener('input', () => {
  postInput.style.height = 'auto';
  postInput.style.height = postInput.scrollHeight + 'px';
});

function gerarIniciais(nome) {
  return (nome || '?').split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function tempoRelativo(dataStr) {
  const diff = Date.now() - new Date(dataStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(dataStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function criarPostHTML(post) {
  const perfil = post.profiles || {};
  const nome = perfil.nome || 'Usuário';
  const cor = perfil.cor_avatar || '';
  const iniciais = gerarIniciais(nome);
  const likesCount = post.likes?.length || 0;
  const commentsCount = post.comments?.length || 0;
  const curtido = post.likes?.some(l => l.user_id === usuarioAtual?.id) || false;
  const tempo = tempoRelativo(post.created_at);
  const sub   = [perfil.curso, perfil.periodo].filter(Boolean).join(' • ') || 'BrainHUB';
  const isPro     = perfil.is_pro === true;
  const isOwn     = post.user_id === usuarioAtual?.id;
  const proBadge  = isPro ? `<span class="pro-badge-inline" style="font-size:0.7rem;padding:2px 7px"><i data-lucide="crown"></i> PRO</span>` : '';
  const verified  = isPro ? `<span class="verified-post" title="Verificado"><i data-lucide="badge-check"></i></span>` : '';
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
            <h4><a href="usuario.html?id=${post.user_id}" class="author-link">${nome}</a>${verified}${proBadge}</h4>
            <p>${sub} • ${tempo}</p>
          </div>
        </div>
        <div style="display:flex;gap:4px">
          <button class="icon-btn small save-post-btn" title="Salvar post" data-saved="false"><i data-lucide="bookmark"></i></button>
          ${isOwn ? `<button class="icon-btn small delete-post-btn" title="Excluir post"><i data-lucide="trash-2"></i></button>` : ''}
        </div>
      </div>
      ${post.humor ? `<div class="post-humor">${post.humor}</div>` : ''}
      <p class="post-text">${post.texto}</p>
      ${post.imagem_url ? `<img src="${post.imagem_url}" class="post-img" loading="lazy" />` : ''}
      ${post.arquivo_url ? `<a href="${post.arquivo_url}" target="_blank" class="post-file-link" download="${post.arquivo_nome || 'arquivo'}">📎 ${post.arquivo_nome || 'Baixar arquivo'}</a>` : ''}
      <div class="post-actions">
        <button class="action-btn like-btn ${curtido ? 'liked' : ''}">
          <i data-lucide="thumbs-up"></i><span>${likesCount}</span>
        </button>
        <button class="action-btn comment-toggle-btn">
          <i data-lucide="message-square"></i><span>${commentsCount}</span>
        </button>
        <button class="action-btn">
          <i data-lucide="share-2"></i><span>0</span>
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

async function carregarComentarios(postId, lista) {
  lista.innerHTML = '<p style="color:var(--muted);font-size:0.85rem;padding:4px 0">Carregando...</p>';
  const { data } = await window.supabase
    .from('comments')
    .select('id, user_id, texto, created_at, profiles(nome, cor_avatar)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (!data || data.length === 0) {
    lista.innerHTML = '<p style="color:var(--muted);font-size:0.85rem;padding:4px 0">Nenhum comentário ainda.</p>';
    return;
  }

  lista.innerHTML = data.map(c => {
    const nome = c.profiles?.nome || 'Usuário';
    const uid  = c.user_id;
    return `<div class="comment-item">
      <a href="usuario.html?id=${uid}" class="comment-author-link">
        <strong class="comment-author">${nome}</strong>
      </a>
      <p class="comment-text">${c.texto}</p>
    </div>`;
  }).join('');
}

function ativarEventosPosts() {
  feedList.querySelectorAll('.post-card').forEach(card => {
    const postId = card.dataset.id;

    // Like / unlike
    card.querySelector('.like-btn').addEventListener('click', async () => {
      if (!usuarioAtual) return;
      const btn = card.querySelector('.like-btn');
      const span = btn.querySelector('span');
      const curtido = btn.classList.contains('liked');

      if (curtido) {
        await window.supabase.from('likes').delete()
          .eq('user_id', usuarioAtual.id).eq('post_id', postId);
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

    toggleBtn.addEventListener('click', async () => {
      section.classList.toggle('hidden');
      if (!section.classList.contains('hidden') && !carregado) {
        carregado = true;
        await carregarComentarios(postId, lista);
      }
    });

    // Enviar comentário
    const input   = card.querySelector('.comment-input');
    const sendBtn = card.querySelector('.comment-send');

    const enviar = async () => {
      if (!usuarioAtual) return;
      const texto = input.value.trim();
      if (!texto) return;
      input.value = '';

      await window.supabase.from('comments').insert({
        user_id: usuarioAtual.id,
        post_id: postId,
        texto
      });

      const countSpan = card.querySelector('.comment-toggle-btn span');
      countSpan.textContent = parseInt(countSpan.textContent) + 1;
      carregado = false;
      await carregarComentarios(postId, lista);
    };

    sendBtn.addEventListener('click', enviar);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); enviar(); } });

    // Salvar / dessalvar post
    card.querySelector('.save-post-btn')?.addEventListener('click', async () => {
      if (!usuarioAtual) return;
      const saveBtn = card.querySelector('.save-post-btn');
      const jaSalvo = saveBtn.dataset.saved === 'true';
      if (jaSalvo) {
        await window.supabase.from('saved_posts').delete()
          .eq('user_id', usuarioAtual.id).eq('post_id', postId);
        saveBtn.dataset.saved = 'false';
        saveBtn.classList.remove('saved');
      } else {
        await window.supabase.from('saved_posts').insert({ user_id: usuarioAtual.id, post_id: postId });
        saveBtn.dataset.saved = 'true';
        saveBtn.classList.add('saved');
      }
    });

    // Excluir post (só aparece nos posts do próprio usuário)
    card.querySelector('.delete-post-btn')?.addEventListener('click', async () => {
      const confirmado = await confirmarExclusao('Tem certeza que deseja excluir este post? Esta ação não pode ser desfeita.')
      if (!confirmado) return;
      await window.supabase.from('posts').delete().eq('id', postId);
      card.remove();
    });
  });
}

// ===== ABAS FEED =====
function setFeedTab(btn) {
  document.querySelectorAll('.feed-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  feedTab = btn.dataset.tab;
  renderizarPosts();
}

// ===== NOVOS POSTS (polling) =====
function iniciarPolling() {
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(verificarNovos, 30000);
}

async function verificarNovos() {
  if (!latestPostAt || !window.supabase) return;

  let query = window.supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .gt('created_at', latestPostAt)
    .is('group_id', null);

  if (feedTab === 'following' && seguindoIds.size > 0) {
    query = query.in('user_id', [...seguindoIds]);
  }

  const { count } = await query;
  if (!count || count === 0) return;

  novosCount = count;
  const banner = document.getElementById('newPostsBanner');
  document.getElementById('newPostsLabel').textContent =
    `${count} novo${count > 1 ? 's posts' : ' post'} — clique para ver`;
  banner.classList.remove('hidden');
  lucide.createIcons();
}

async function verNovos() {
  document.getElementById('newPostsBanner').classList.add('hidden');
  novosCount = 0;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  await renderizarPosts();
}

async function renderizarPosts() {
  feedList.innerHTML = '<p style="color:var(--muted);text-align:center;padding:32px">Carregando posts...</p>';
  document.getElementById('newPostsBanner')?.classList.add('hidden');

  let query = window.supabase
    .from('posts')
    .select(`
      id, user_id, texto, area, tipo, created_at, imagem_url, arquivo_url, arquivo_nome, humor,
      profiles!posts_user_id_fkey(nome, cor_avatar, curso, faculdade, periodo, is_pro),
      likes(user_id),
      comments(id)
    `)
    .is('group_id', null)
    .order('created_at', { ascending: false })
    .limit(30);

  if (feedTab === 'following') {
    if (seguindoIds.size === 0) {
      feedList.innerHTML = `
        <div class="aba-empty" style="padding:48px;text-align:center">
          <i data-lucide="user-plus" style="width:48px;height:48px;color:var(--muted)"></i>
          <h3 style="margin-top:12px;color:var(--muted)">Siga pessoas para ver os posts delas aqui.</h3>
        </div>`;
      lucide.createIcons();
      return;
    }
    query = query.in('user_id', [...seguindoIds]);
  }

  const { data: posts, error } = await query;

  if (error) console.error('Erro detalhado:', JSON.stringify(error));

  if (error) {
    console.error(error);
    feedList.innerHTML = '<p style="color:var(--muted);text-align:center;padding:32px">Erro ao carregar posts.</p>';
    return;
  }

  if (!posts || posts.length === 0) {
    feedList.innerHTML = `
      <div class="aba-empty" style="padding:48px;text-align:center">
        <i data-lucide="file-x" style="width:48px;height:48px;color:var(--muted)"></i>
        <h3 style="margin-top:12px;color:var(--muted)">Nenhum post ainda. Seja o primeiro!</h3>
      </div>`;
    lucide.createIcons();
    return;
  }

  // Busca posts salvos do usuário para marcar os botões
  let salvoSet = new Set();
  if (usuarioAtual) {
    const { data: saves } = await window.supabase
      .from('saved_posts').select('post_id').eq('user_id', usuarioAtual.id);
    salvoSet = new Set((saves || []).map(s => s.post_id));
  }

  // Salva timestamp do post mais recente pra polling
  if (posts.length > 0) latestPostAt = posts[0].created_at;

  feedList.innerHTML = posts.map(criarPostHTML).join('');

  // Marca botões de salvo
  feedList.querySelectorAll('.save-post-btn').forEach(btn => {
    const card = btn.closest('.post-card');
    if (salvoSet.has(card.dataset.id)) {
      btn.dataset.saved = 'true';
      btn.classList.add('saved');
    }
  });

  lucide.createIcons();
  ativarEventosPosts();
}

async function publicarNovoPost() {
  const texto = postInput.value.trim();
  if (!texto && !mediaArquivo && !humorSelecionado) return;
  if (!usuarioAtual) return;

  publishBtn.disabled = true;
  publishBtn.textContent = 'Publicando...';

  let imagem_url = null, arquivo_url = null, arquivo_nome = null;

  if (mediaArquivo) {
    const isPro = localStorage.getItem('brainhub_pro') === 'true';
    const maxMB = isPro ? 25 : 5;
    const maxBytes = maxMB * 1024 * 1024;
    if (mediaArquivo.size > maxBytes) {
      publishBtn.disabled = false;
      publishBtn.textContent = 'Publicar';
      alert(`Arquivo muito grande! Limite: ${maxMB}MB.${!isPro ? ' Assine o Pro para enviar até 25MB.' : ''}`);
      return;
    }
    const ext  = mediaArquivo.name.split('.').pop();
    const path = `${usuarioAtual.id}/${Date.now()}.${ext}`;
    const pasta = mediaTipo === 'imagem' ? 'images' : 'files';
    const { error: upErr } = await window.supabase.storage
      .from('post-media')
      .upload(`${pasta}/${path}`, mediaArquivo, { upsert: false });
    if (!upErr) {
      const { data: { publicUrl } } = window.supabase.storage
        .from('post-media')
        .getPublicUrl(`${pasta}/${path}`);
      if (mediaTipo === 'imagem') imagem_url = publicUrl;
      else { arquivo_url = publicUrl; arquivo_nome = mediaArquivo.name; }
    }
  }

  const { error } = await window.supabase.from('posts').insert({
    user_id: usuarioAtual.id,
    texto: texto || '',
    imagem_url,
    arquivo_url,
    arquivo_nome,
    humor: humorSelecionado || null,
  });

  publishBtn.disabled = false;
  publishBtn.textContent = 'Publicar';

  if (error) { console.error('Erro ao publicar:', error); return; }

  postInput.value = '';
  limparMedia();
  humorSelecionado = null;
  btnHumor?.classList.remove('active');
  humorDropdown.style.display = 'none';
  await renderizarPosts();
}

publishBtn.addEventListener('click', publicarNovoPost);
postInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); publicarNovoPost(); }
});

async function carregarEstatisticas(userId) {
  const [{ count: posts }, { count: seguidores }, { count: seguindo }] = await Promise.all([
    window.supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    window.supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
    window.supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId)
  ]);
  const elPosts      = document.getElementById('statMeusPosts');
  const elSeguidores = document.getElementById('statMeusSeguidores');
  const elSeguindo   = document.getElementById('statMeusSeguindo');
  if (elPosts)      elPosts.textContent      = posts      || 0;
  if (elSeguidores) elSeguidores.textContent = seguidores || 0;
  if (elSeguindo)   elSeguindo.textContent   = seguindo   || 0;
}

// Scroll para post específico vindo de notificações (?postId=xxx&openComments=1)
function rolarParaPost() {
  const params = new URLSearchParams(window.location.search);
  const postId = params.get('postId');
  if (!postId) return;

  const card = document.querySelector(`.post-card[data-id="${postId}"]`);
  if (!card) return;

  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  card.style.transition = 'box-shadow 0.4s';
  card.style.boxShadow = '0 0 0 2px var(--purple)';
  setTimeout(() => card.style.boxShadow = '', 2500);

  if (params.get('openComments') === '1') {
    const section = card.querySelector('.comments-section');
    if (section?.classList.contains('hidden')) {
      card.querySelector('.comment-toggle-btn')?.click();
    }
  }

  window.history.replaceState({}, '', 'home.html');
}

async function carregarSugestoes(userId) {
  const container = document.getElementById('sugestoesContainer');
  if (!container) return;

  // Busca quem o usuário já segue
  const { data: seguindo } = await window.supabase
    .from('follows').select('following_id').eq('follower_id', userId);
  const seguindoIds = new Set((seguindo || []).map(f => f.following_id));
  seguindoIds.add(userId); // exclui o próprio usuário

  // Busca usuários aleatórios não seguidos
  const { data: usuarios } = await window.supabase
    .from('profiles')
    .select('id, nome, cor_avatar, curso, faculdade')
    .not('id', 'in', `(${[...seguindoIds].join(',')})`)
    .limit(3);

  if (!usuarios || usuarios.length === 0) {
    container.closest('section')?.remove();
    return;
  }

  container.innerHTML = usuarios.map(u => {
    const iniciais = (u.nome || '?').split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
    const sub = [u.curso, u.faculdade].filter(Boolean).join(' · ') || 'BrainHUB';
    return `
      <div class="group-item">
        <a href="usuario.html?id=${u.id}" style="text-decoration:none">
          <div class="mini-avatar ${u.cor_avatar || ''}" style="width:42px;height:42px;font-size:0.85rem;flex-shrink:0">${iniciais}</div>
        </a>
        <div class="group-info"><strong>${u.nome}</strong><small>${sub}</small></div>
        <button class="sugestao-seguir-btn" data-uid="${u.id}">Seguir</button>
      </div>`;
  }).join('');

  container.querySelectorAll('.sugestao-seguir-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const uid = btn.dataset.uid;
      btn.disabled = true;
      await window.supabase.from('follows').insert({ follower_id: userId, following_id: uid });
      btn.textContent = 'Seguindo ✓';
    });
  });
}

async function carregarEmAlta() {
  const ul = document.getElementById('emAltaList');
  if (!ul) return;

  const semanaAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: posts } = await window.supabase
    .from('posts').select('texto').gte('created_at', semanaAtras);

  if (!posts || posts.length === 0) return;

  const temas = [
    { label: 'Inteligência Artificial', termos: ['ia', 'intelig', 'gpt', 'machine learning', 'ai'] },
    { label: 'Cálculo',                termos: ['cálculo', 'calculo', 'integral', 'derivada'] },
    { label: 'Programação',            termos: ['código', 'codigo', 'programação', 'python', 'javascript', 'dev'] },
    { label: 'Estágio',                termos: ['estágio', 'estagio', 'emprego', 'vaga'] },
    { label: 'Física',                 termos: ['física', 'fisica', 'mecânica', 'termodinâmica'] },
  ];

  const contagens = temas.map(t => {
    const count = posts.filter(p =>
      t.termos.some(termo => (p.texto || '').toLowerCase().includes(termo))
    ).length;
    return { label: t.label, count };
  }).filter(t => t.count > 0).sort((a, b) => b.count - a.count).slice(0, 3);

  if (contagens.length === 0) return;

  ul.innerHTML = contagens.map(t =>
    `<li><span>#</span> ${t.label}<small>${t.count} post${t.count > 1 ? 's' : ''}</small></li>`
  ).join('');
}

// Init
async function init() {
  const { data: { user } } = await window.supabase.auth.getUser();
  usuarioAtual = user;
  if (usuarioAtual) {
    carregarEstatisticas(usuarioAtual.id);
    carregarSugestoes(usuarioAtual.id);

    // Carrega quem o usuário segue (pra aba Seguindo)
    const { data: follows } = await window.supabase
      .from('follows').select('following_id').eq('follower_id', usuarioAtual.id);
    seguindoIds = new Set((follows || []).map(f => f.following_id));
  }
  carregarEmAlta();
  await renderizarPosts();
  rolarParaPost();
  iniciarPolling();
}

init();
