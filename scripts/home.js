// home.js — feed principal (Supabase)
lucide.createIcons();
sincronizarStatusPro();
aplicarPerfilNoSidebar();

const publishBtn = document.getElementById('publishBtn');
const postInput  = document.getElementById('postInput');
const feedList   = document.getElementById('feedList');

let usuarioAtual = null;

// Mini-avatar na caixa de criar post
;(function () {
  const u = getPerfilAtual();
  const mini = document.querySelector('.create-top .mini-avatar');
  if (mini) { mini.textContent = u.iniciais; mini.className = `mini-avatar ${u.corAvatar}`; }
})();

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
  const sub = [perfil.curso, perfil.periodo].filter(Boolean).join(' • ') || 'BrainHUB';
  const isOwn = post.user_id === usuarioAtual?.id;

  return `
    <article class="post-card card" data-id="${post.id}">
      <div class="post-header">
        <div class="post-user">
          <a href="usuario.html?id=${post.user_id}" class="avatar-link">
            <div class="mini-avatar ${cor}">${iniciais}</div>
          </a>
          <div>
            <h4><a href="usuario.html?id=${post.user_id}" class="author-link">${nome}</a></h4>
            <p>${sub} • ${tempo}</p>
          </div>
        </div>
        ${isOwn ? `<button class="icon-btn small delete-post-btn" title="Excluir post"><i data-lucide="trash-2"></i></button>` : `<button class="icon-btn small"><i data-lucide="more-vertical"></i></button>`}
      </div>
      <p class="post-text">${post.texto}</p>
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

    // Excluir post (só aparece nos posts do próprio usuário)
    card.querySelector('.delete-post-btn')?.addEventListener('click', async () => {
      if (!confirm('Excluir este post?')) return;
      await window.supabase.from('posts').delete().eq('id', postId);
      card.remove();
    });
  });
}

async function renderizarPosts() {
  feedList.innerHTML = '<p style="color:var(--muted);text-align:center;padding:32px">Carregando posts...</p>';

  const { data: posts, error } = await window.supabase
    .from('posts')
    .select(`
      id, user_id, texto, area, tipo, created_at,
      profiles!posts_user_id_fkey(nome, cor_avatar, curso, faculdade, periodo),
      likes(user_id),
      comments(id)
    `)
    .order('created_at', { ascending: false })
    .limit(30);

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

  feedList.innerHTML = posts.map(criarPostHTML).join('');
  lucide.createIcons();
  ativarEventosPosts();
}

async function publicarNovoPost() {
  const texto = postInput.value.trim();
  if (!texto || !usuarioAtual) return;

  publishBtn.disabled = true;
  publishBtn.textContent = 'Publicando...';

  const { error } = await window.supabase.from('posts').insert({
    user_id: usuarioAtual.id,
    texto
  });

  publishBtn.disabled = false;
  publishBtn.textContent = 'Publicar';

  if (error) { console.error('Erro ao publicar:', error); return; }

  postInput.value = '';
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

// Init
async function init() {
  const { data: { user } } = await window.supabase.auth.getUser();
  usuarioAtual = user;
  if (usuarioAtual) carregarEstatisticas(usuarioAtual.id);
  await renderizarPosts();
}

init();
