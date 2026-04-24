// home.js — feed principal (Supabase)
lucide.createIcons();
sincronizarStatusPro();
aplicarPerfilNoSidebar();

const publishBtn = document.getElementById('publishBtn');
const postInput  = document.getElementById('postInput');
const feedList   = document.getElementById('feedList');

let usuarioAtual  = null;
let isAdmin       = false;
let feedTab       = 'fyp';      // 'fyp' | 'following'
let feedTermoBusca = ''
let seguindoIds   = new Set();
let latestPostAt  = null;       // timestamp do post mais novo carregado
let novosCount    = 0;
let pollInterval  = null;

// ===== SINAIS DO ALGORITMO =====
let meuCurso           = ''        // curso do usuário logado
let minhaFaculdade     = ''        // faculdade do usuário logado
let autoresInteragidos = new Set() // autores cujos posts eu curti
let materiasEstudadas  = new Set() // matérias onde fiz exercícios corretos

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
const composerHumorPrev = document.getElementById('composerHumorPreview');
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
      humorSelecionado = null;
      humorDropdown.querySelectorAll('.humor-opt').forEach(b => b.classList.remove('active'));
      btnHumor.classList.remove('active');
      composerHumorPrev.style.display = 'none';
      composerHumorPrev.textContent = '';
      composerPreview.style.display = mediaArquivo ? 'flex' : 'none';
    } else {
      humorSelecionado = humor;
      humorDropdown.querySelectorAll('.humor-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      btnHumor.classList.add('active');
      composerHumorPrev.textContent = humor;
      composerHumorPrev.style.display = '';
      mostrarPreview();
    }
    humorDropdown.style.display = 'none';
  });
});

// Mini-avatar na caixa de criar post e na barra do topo
;(function () {
  const u = getPerfilAtual();
  const mini = document.querySelector('.create-top .mini-avatar');
  if (mini) {
    if (u.fotoUrl) {
      mini.innerHTML = `<img src="${u.fotoUrl}" alt="foto" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
      mini.className = `mini-avatar av-foto`;
    } else {
      mini.textContent = u.iniciais;
      mini.className = `mini-avatar ${u.corAvatar}`;
    }
  }
  const barAvatar = document.getElementById('composerAvatar');
  if (barAvatar) {
    if (u.fotoUrl) {
      barAvatar.innerHTML = `<img src="${u.fotoUrl}" alt="foto" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
      barAvatar.className = `mini-avatar topbar-composer-avatar av-foto`;
    } else {
      barAvatar.textContent = u.iniciais;
      barAvatar.className = `mini-avatar topbar-composer-avatar ${u.corAvatar}`;
    }
  }
})();

// Auto-resize do textarea
postInput?.addEventListener('input', () => {
  postInput.style.height = 'auto';
  postInput.style.height = postInput.scrollHeight + 'px';
});
if (postInput) ativarMencoes(postInput, document.getElementById('postInputDrop'));

function gerarIniciais(nome) {
  return (nome || '?').split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderMencoes(textoEscapado) {
  return textoEscapado.replace(/@\[([^\]|]+)\|([a-f0-9-]{36})\]/g, (_, nome, id) =>
    `<a href="usuario.html?id=${id}" class="mention">@${nome}</a>`
  );
}

function miniAvHTML(profile, size = 30) {
  const ini  = gerarIniciais(profile?.nome || 'U');
  const cor  = profile?.cor_avatar || '';
  const foto = profile?.foto_url;
  const fs   = size < 28 ? '0.62rem' : '0.7rem';
  const s    = size !== 30 ? `style="width:${size}px;height:${size}px;font-size:${fs}"` : '';
  return foto
    ? `<div class="comment-mini-av" ${s}><img src="${foto}" alt="" /></div>`
    : `<div class="comment-mini-av ${cor}" ${s}>${ini}</div>`;
}

function ativarMencoes(input, dropdown) {
  let timer = null;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const val    = input.value;
    const pos    = input.selectionStart ?? val.length;
    const before = val.slice(0, pos);
    const match  = before.match(/@(\w{1,20})$/);
    if (!match) { dropdown.style.display = 'none'; return; }
    const q = match[1];
    timer = setTimeout(async () => {
      const { data } = await window.supabase
        .from('profiles').select('id, nome, cor_avatar, foto_url')
        .ilike('nome', `%${q}%`).limit(5);
      if (!data?.length) { dropdown.style.display = 'none'; return; }
      dropdown.innerHTML = data.map(p => {
        const ini   = gerarIniciais(p.nome || 'U');
        const avEl  = p.foto_url
          ? `<div class="mention-item-av"><img src="${p.foto_url}" /></div>`
          : `<div class="mention-item-av ${p.cor_avatar || ''}">${ini}</div>`;
        return `<div class="mention-item" data-id="${p.id}" data-nome="${escapeHtml(p.nome||'Usuário')}">${avEl}<span class="mention-item-nome">${escapeHtml(p.nome||'Usuário')}</span></div>`;
      }).join('');
      dropdown.style.display = 'block';
      dropdown.querySelectorAll('.mention-item').forEach(item => {
        item.addEventListener('mousedown', e => {
          e.preventDefault();
          const id   = item.dataset.id;
          const nome = item.dataset.nome;
          const cur  = input.selectionStart ?? input.value.length;
          const newVal = input.value.slice(0, cur).replace(/@\w{0,20}$/, `@[${nome}|${id}] `) + input.value.slice(cur);
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
  const fotoUrl = perfil.foto_url || null;
  const iniciais = gerarIniciais(nome);
  const avatarHTML = fotoUrl
    ? `<div class="mini-avatar av-foto"><img src="${fotoUrl}" alt="foto" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" /></div>`
    : `<div class="mini-avatar ${cor}">${iniciais}</div>`;
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

  const TITULOS_CORES = { turing:'#7c5cff', einstein:'#f5c542', genio_local:'#ff6ec7', nerd:'#26d0a8', cientista:'#6d8bff', pesquisador:'#ffb144', monitor:'#bcaeff', dedicado:'#d7d7de', curioso:'#d7d7de', pro:'#f5c542' };
  const TITULOS_LABELS = { turing:'Turing', einstein:'Einstein', genio_local:'Gênio Local', nerd:'Nerd', cientista:'Cientista', pesquisador:'Pesquisador', monitor:'Monitor', dedicado:'Dedicado', curioso:'Curioso', pro:'👑 Pro' };
  const tituloId = perfil.titulo_ativo;
  const tituloBadge = tituloId ? `<span class="titulo-post-badge" style="color:${TITULOS_CORES[tituloId]};background:${TITULOS_CORES[tituloId]}18;border-color:${TITULOS_CORES[tituloId]}30">${TITULOS_LABELS[tituloId]}</span>` : '';

  return `
    <article class="post-card card${featClass}" data-id="${post.id}">
      ${featLabel}
      <div class="post-header">
        <div class="post-user">
          <a href="usuario.html?id=${post.user_id}" class="avatar-link">
            ${avatarHTML}
          </a>
          <div>
            <h4><a href="usuario.html?id=${post.user_id}" class="author-link">${nome}</a>${verified}${proBadge}${tituloBadge}</h4>
            <p>${sub} • ${tempo}</p>
          </div>
        </div>
        <div style="display:flex;gap:4px">
          <button class="icon-btn small save-post-btn" title="Salvar post" data-saved="false"><i data-lucide="bookmark"></i></button>
          ${(isOwn || isAdmin)
            ? `<button class="icon-btn small delete-post-btn" title="Excluir post"><i data-lucide="trash-2"></i></button>`
            : `<button class="icon-btn small report-post-btn" title="Denunciar post"><i data-lucide="flag"></i></button>`}
        </div>
      </div>
      ${post.humor ? `<div class="post-humor">${post.humor}</div>` : ''}
      <p class="post-text">${renderMencoes(escapeHtml(post.texto))}</p>
      ${post.imagem_url ? `<img src="${post.imagem_url}" class="post-img" loading="lazy" />` : ''}
      ${post.arquivo_url ? `<a href="${corrigirUrlArquivo(post.arquivo_url, post.arquivo_nome)}" target="_blank" class="post-file-link" download="${post.arquivo_nome || 'arquivo'}">📎 ${post.arquivo_nome || 'Baixar arquivo'}</a>` : ''}
      <div class="post-actions">
        <button class="action-btn like-btn ${curtido ? 'liked' : ''}">
          <i data-lucide="thumbs-up"></i><span>${likesCount}</span>
        </button>
        <button class="action-btn comment-toggle-btn">
          <i data-lucide="message-square"></i><span>${commentsCount}</span>
        </button>
        <button class="action-btn share-btn">
          <i data-lucide="share-2"></i><span>Compartilhar</span>
        </button>
      </div>
      <div class="comments-section hidden">
        <div class="comments-list"></div>
        <div class="comment-form">
          <div class="comment-input-wrap">
            <input type="text" class="comment-input" placeholder="Comentar… use @ para mencionar" />
            <div class="mention-dropdown"></div>
          </div>
          <button class="comment-send">Enviar</button>
        </div>
      </div>
    </article>`;
}

async function carregarComentarios(postId, lista) {
  lista.innerHTML = '<p style="color:var(--muted);font-size:0.85rem;padding:8px 0">Carregando…</p>';
  const { data } = await window.supabase
    .from('comments')
    .select('id, user_id, texto, created_at, parent_id, profiles(nome, cor_avatar, foto_url)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (!data || data.length === 0) {
    lista.innerHTML = '<p style="color:var(--muted);font-size:0.85rem;padding:8px 0">Nenhum comentário ainda.</p>';
    return;
  }

  const topLevel = data.filter(c => !c.parent_id);
  const replies  = data.filter(c => c.parent_id);

  function renderItem(c, isReply) {
    const nome  = escapeHtml(c.profiles?.nome || 'Usuário');
    const texto = renderMencoes(escapeHtml(c.texto));
    const tempo = tempoRelativo(c.created_at);
    const av    = miniAvHTML(c.profiles, isReply ? 26 : 30);
    const cls   = isReply ? 'comment-reply-item' : 'comment-item';
    const parentId = isReply ? c.parent_id : c.id;
    const childHTML = isReply ? '' :
      replies.filter(r => r.parent_id === c.id).map(r => renderItem(r, true)).join('');
    return `<div class="${cls}" data-id="${c.id}">
      ${av}
      <div class="comment-body">
        <div class="comment-meta">
          <a href="usuario.html?id=${c.user_id}" class="comment-nome">${nome}</a>
          <span class="comment-time">${tempo}</span>
        </div>
        <p class="comment-text">${texto}</p>
        <div class="comment-footer">
          <button class="comment-reply-btn" data-id="${parentId}" data-uid="${c.user_id}" data-nome="${nome}">Responder</button>
        </div>
        ${isReply ? '' : `<div class="comment-replies">${childHTML}</div>`}
      </div>
    </div>`;
  }

  lista.innerHTML = topLevel.map(c => renderItem(c, false)).join('');

  lista.querySelectorAll('.comment-reply-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const parentId   = btn.dataset.id;

      const parentNome = btn.dataset.nome;
      lista.querySelectorAll('.reply-form').forEach(f => f.remove());
      const parentEl  = lista.querySelector(`[data-id="${parentId}"]`);
      const repliesDiv = parentEl?.querySelector('.comment-replies');
      if (!repliesDiv) return;
      const rf = document.createElement('div');
      rf.className = 'reply-form';
      rf.innerHTML = `
        <div class="reply-input-wrap">
          <input class="reply-input" type="text" />
          <div class="mention-dropdown"></div>
        </div>
        <button class="reply-send">Enviar</button>
        <button class="reply-cancel">✕</button>`;
      repliesDiv.appendChild(rf);
      const rInput = rf.querySelector('.reply-input');
      const rDrop  = rf.querySelector('.mention-dropdown');
      rInput.value = `@${parentNome} `;
      rInput.focus();
      rInput.setSelectionRange(rInput.value.length, rInput.value.length);
      ativarMencoes(rInput, rDrop);
      rf.querySelector('.reply-cancel').addEventListener('click', () => rf.remove());
      const enviarReply = async () => {
        if (!usuarioAtual) return;
        const texto = rInput.value.trim();
        if (!texto) return;
        rf.remove();
        await window.supabase.from('comments').insert({
          user_id: usuarioAtual.id, post_id: postId, parent_id: parentId, texto
        });
        await carregarComentarios(postId, lista);
      };
      rf.querySelector('.reply-send').addEventListener('click', enviarReply);
      rInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); enviarReply(); } });
    });
  });
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
    const input    = card.querySelector('.comment-input');
    const dropdown = card.querySelector('.mention-dropdown');
    const sendBtn  = card.querySelector('.comment-send');

    ativarMencoes(input, dropdown);

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

    // Denunciar post
    card.querySelector('.report-post-btn')?.addEventListener('click', () => {
      denunciarConteudo('post', postId);
    });

    // Compartilhar post
    card.querySelector('.share-btn')?.addEventListener('click', () => {
      const autor       = card.querySelector('.author-link')?.textContent?.trim() || 'Usuário';
      const texto       = card.querySelector('.post-text')?.textContent?.trim() || '';
      const imgUrl      = card.querySelector('.post-img')?.src || '';
      const arquivoLink = card.querySelector('.post-file-link');
      const arquivoUrl  = arquivoLink?.href || '';
      const arquivoNome = arquivoLink?.getAttribute('download') || '';
      abrirModalCompartilhar(postId, texto, autor, imgUrl, arquivoUrl, arquivoNome);
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

let feedBuscaTimeout = null;
document.getElementById('feedBusca')?.addEventListener('input', e => {
  clearTimeout(feedBuscaTimeout);
  feedBuscaTimeout = setTimeout(() => {
    feedTermoBusca = e.target.value.trim();
    renderizarPosts();
  }, 350);
});

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

  // FYP busca mais posts pra o algoritmo ranquear; Following fica cronológico
  const limiteFetch = feedTab === 'fyp' ? 120 : 30

  let query = window.supabase
    .from('posts')
    .select(`
      id, user_id, texto, area, tipo, created_at, imagem_url, arquivo_url, arquivo_nome, humor,
      profiles!posts_user_id_fkey(nome, cor_avatar, foto_url, curso, faculdade, periodo, is_pro, titulo_ativo),
      likes(user_id),
      comments(id)
    `)
    .is('group_id', null)
    .order('created_at', { ascending: false })
    .limit(limiteFetch);

  if (feedTermoBusca) query = query.ilike('texto', `%${feedTermoBusca}%`);

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

  let { data: posts, error } = await query;

  if (error) console.error('Erro detalhado:', JSON.stringify(error));

  if (error) {
    console.error(error);
    feedList.innerHTML = '<p style="color:var(--muted);text-align:center;padding:32px">Erro ao carregar posts.</p>';
    return;
  }

  // Aplica algoritmo de recomendação no FYP
  if (feedTab === 'fyp' && posts?.length > 0) {
    // Salva o timestamp mais recente ANTES de reordenar por score
    const maxAt = posts.reduce((max, p) => p.created_at > max ? p.created_at : max, posts[0].created_at);
    latestPostAt = maxAt;
    posts = posts
      .map(p => ({ ...p, _score: scorePost(p) }))
      .sort((a, b) => b._score - a._score)
      .slice(0, 30)
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

  // Salva timestamp do post mais recente pra polling (FYP já definiu acima antes de reordenar)
  if (posts.length > 0 && feedTab !== 'fyp') latestPostAt = posts[0].created_at;

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
    try {
      const publicUrl = await uploadParaCloudinary(mediaArquivo, 'posts');
      if (mediaTipo === 'imagem') imagem_url = publicUrl;
      else { arquivo_url = publicUrl; arquivo_nome = mediaArquivo.name; }
    } catch (e) {
      publishBtn.disabled = false;
      publishBtn.textContent = 'Publicar';
      alert('Erro ao enviar mídia. Tente novamente.');
      return;
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
  if (composerHumorPrev) { composerHumorPrev.textContent = ''; composerHumorPrev.style.display = 'none'; }
  fecharCompositor();
  await renderizarPosts();
}

publishBtn.addEventListener('click', publicarNovoPost);
postInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); publicarNovoPost(); }
});

// ===== COMPOSITOR MODAL =====
function abrirCompositor() {
  document.getElementById('composerOverlay').classList.remove('hidden');
  // Sincroniza avatar do modal com o da barra
  const barAvatar = document.getElementById('composerAvatar');
  const modalAvatar = document.getElementById('composerAvatarModal');
  if (barAvatar && modalAvatar) {
    modalAvatar.className  = barAvatar.className;
    modalAvatar.textContent = barAvatar.textContent;
  }
  setTimeout(() => postInput?.focus(), 80);
  lucide.createIcons();
}

function fecharCompositor() {
  document.getElementById('composerOverlay').classList.add('hidden');
}

document.getElementById('composerFechar').addEventListener('click', fecharCompositor);
document.getElementById('composerOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('composerOverlay')) fecharCompositor();
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




// ===== ALGORITMO DE RECOMENDAÇÃO =====
const BRAINHUB_OFICIAL_ID = 'e4e44716-1fa4-4fc3-8d33-c746841c7345'

function scorePost(post) {
  let score = 0

  // Conta oficial sempre aparece no topo
  if (post.user_id === BRAINHUB_OFICIAL_ID) score += 9999

  // Recência: decaimento exponencial, meia-vida ~18h (max 50 pts)
  const horasAtras = (Date.now() - new Date(post.created_at).getTime()) / 3600000
  score += 50 * Math.exp(-horasAtras / 18)

  // Segue o autor → boost forte
  if (seguindoIds.has(post.user_id)) score += 40

  // Mesmo curso que eu → conteúdo de pares
  if (meuCurso && post.profiles?.curso === meuCurso) score += 30

  // Área do post coincide com matéria que estudei nos exercícios
  if (post.area && materiasEstudadas.has(post.area)) score += 25

  // Já interagi com esse autor antes (curti posts dele)
  if (autoresInteragidos.has(post.user_id)) score += 20

  // Engajamento (capped pra não dominar tudo)
  const likes    = post.likes?.length || 0
  const comments = post.comments?.length || 0
  score += Math.min(likes * 3, 30)
  score += Math.min(comments * 5, 25)

  // Post com mídia tende a gerar mais engajamento
  if (post.imagem_url || post.arquivo_url) score += 8

  return score
}

async function carregarSinaisAlgoritmo(userId) {
  const [perfil, meusLikes, exercFeitos] = await Promise.all([
    window.supabase.from('profiles').select('curso, faculdade').eq('id', userId).single(),
    window.supabase.from('likes').select('posts(user_id)').eq('user_id', userId).limit(200),
    window.supabase.from('respostas_usuario').select('exercicios(materia)').eq('user_id', userId).eq('correto', true).limit(200),
  ])

  meuCurso = perfil.data?.curso || ''
  minhaFaculdade = perfil.data?.faculdade || ''

  ;(meusLikes.data || []).forEach(l => {
    if (l.posts?.user_id) autoresInteragidos.add(l.posts.user_id)
  })

  ;(exercFeitos.data || []).forEach(e => {
    if (e.exercicios?.materia) materiasEstudadas.add(e.exercicios.materia)
  })
}

// Init
async function init() {
  const { data: { user } } = await window.supabase.auth.getUser();
  usuarioAtual = user;
  if (usuarioAtual) {
    // Aplica banner do perfil no sidebar + verifica is_admin
    window.supabase.from('profiles')
      .select('banner_url, banner_position, is_pro, is_admin')
      .eq('id', usuarioAtual.id).single()
      .then(({ data: p }) => {
        if (p?.is_pro && p?.banner_url) {
          const bannerEl = document.querySelector('.profile-banner');
          if (bannerEl) {
            bannerEl.style.backgroundImage = `url(${p.banner_url})`;
            bannerEl.style.backgroundSize = 'cover';
            bannerEl.style.backgroundPositionX = 'center';
            bannerEl.style.backgroundPositionY = p.banner_position || '50%';
          }
        }
        // Mostra banner de upgrade só para não-Pro
        if (!p?.is_pro) {
          const card = document.getElementById('proBannerCard');
          if (card) card.style.display = 'flex';
        }
        // Habilita modo admin
        if (p?.is_admin) isAdmin = true;
      });

    carregarEstatisticas(usuarioAtual.id);
    carregarSugestoes(usuarioAtual.id);

    // Carrega sinais do algoritmo e follows em paralelo
    const [follows] = await Promise.all([
      window.supabase.from('follows').select('following_id').eq('follower_id', usuarioAtual.id),
      carregarSinaisAlgoritmo(usuarioAtual.id),
    ])
    seguindoIds = new Set((follows.data || []).map(f => f.following_id));

  }
  await renderizarPosts();
  rolarParaPost();
  iniciarPolling();
}

init();
