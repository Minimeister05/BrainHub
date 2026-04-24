// scripts/grupo-detalhe.js
lucide.createIcons();

const params     = new URLSearchParams(window.location.search);
const GRUPO_ID   = params.get('id');

let usuarioAtual  = null;
let grupoAtual    = null;
let ehMembro      = false;
let gdIsAdmin     = false;
let gdMediaArquivo = null;
let gdMediaTipo    = null;

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

  // Verifica is_admin
  window.supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    .then(({ data: p }) => { if (p?.is_admin) gdIsAdmin = true; });

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
          ${ehMembro
            ? `<button class="btn-entrar gd-toggle-btn participando" onclick="toggleMembro(this)" style="pointer-events:none;opacity:0.75">
                <i data-lucide="check"></i> Participando
               </button>
               <button class="gd-sair-btn" onclick="sairDoGrupo(this)">
                <i data-lucide="log-out"></i> Sair
               </button>`
            : `<button class="btn-entrar gd-toggle-btn" onclick="toggleMembro(this)">
                <i data-lucide="plus"></i> Participar
               </button>`
          }
          <button class="gd-back-btn" onclick="window.location.href='grupos.html'">
            <i data-lucide="arrow-left"></i> Grupos
          </button>
        </div>
      </div>
    </div>
  `;
  lucide.createIcons();
}

// ===== ENTRAR =====
async function toggleMembro(btn) {
  if (ehMembro) return;
  btn.disabled = true;

  const { error } = await window.supabase
    .from('group_members')
    .upsert({ group_id: GRUPO_ID, user_id: usuarioAtual.id }, { onConflict: 'group_id,user_id' });

  btn.disabled = false;

  if (!error) {
    ehMembro = true;
    mostrarAviso('Você entrou no grupo!', 'success');
    document.getElementById('gdComposer').classList.remove('hidden');
    document.getElementById('gdNaoMembro').classList.add('hidden');

    // Substitui o botão "Participar" pelos botões "Participando" + "Sair"
    btn.outerHTML = `
      <button class="btn-entrar gd-toggle-btn participando" style="pointer-events:none;opacity:0.75">
        <i data-lucide="check"></i> Participando
      </button>
      <button class="gd-sair-btn" onclick="sairDoGrupo(this)">
        <i data-lucide="log-out"></i> Sair
      </button>`;
    lucide.createIcons();
    await carregarPosts();
  }
}

// ===== SAIR =====
async function sairDoGrupo(btn) {
  btn.disabled = true;

  const { error } = await window.supabase
    .from('group_members')
    .delete()
    .eq('group_id', GRUPO_ID)
    .eq('user_id', usuarioAtual.id);

  btn.disabled = false;

  if (!error) {
    ehMembro = false;
    mostrarAviso('Você saiu do grupo.', 'info');
    document.getElementById('gdComposer').classList.add('hidden');
    document.getElementById('gdNaoMembro').classList.remove('hidden');

    // Remove "Participando" + "Sair", coloca botão "Participar"
    const bannerRight = btn.closest('.gd-banner-right');
    bannerRight.querySelector('.gd-toggle-btn').remove();
    btn.outerHTML = `
      <button class="btn-entrar gd-toggle-btn" onclick="toggleMembro(this)">
        <i data-lucide="plus"></i> Participar
      </button>`;
    lucide.createIcons();
  }
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
  if (input) ativarMencoes(input, document.getElementById('gdPostInputDrop'));

  // Botões de mídia
  const preview    = document.getElementById('gdComposerPreview');
  const imgPrev    = document.getElementById('gdImgPreview');
  const filePrev   = document.getElementById('gdFilePreview');
  const removeBtn  = document.getElementById('gdRemoveMedia');
  const inputImg   = document.getElementById('gdInputImagem');
  const inputFile  = document.getElementById('gdInputArquivo');

  function mostrarPreviewCompositor() {
    if (preview) preview.style.display = 'flex';
  }

  function limparMediaGrupo() {
    gdMediaArquivo = null; gdMediaTipo = null;
    if (inputImg)  inputImg.value  = '';
    if (inputFile) inputFile.value = '';
    if (imgPrev)  { imgPrev.style.display  = 'none'; imgPrev.src = ''; }
    if (filePrev) { filePrev.style.display = 'none'; filePrev.textContent = ''; }
    if (preview)    preview.style.display  = 'none';
  }

  document.getElementById('gdBtnImagem')?.addEventListener('click', () => inputImg?.click());
  document.getElementById('gdBtnArquivo')?.addEventListener('click', () => inputFile?.click());
  removeBtn?.addEventListener('click', limparMediaGrupo);

  inputImg?.addEventListener('change', () => {
    const file = inputImg.files[0];
    if (!file) return;
    gdMediaArquivo = file; gdMediaTipo = 'imagem';
    const reader = new FileReader();
    reader.onload = e => {
      imgPrev.src = e.target.result;
      imgPrev.style.display = '';
      filePrev.style.display = 'none';
      mostrarPreviewCompositor();
    };
    reader.readAsDataURL(file);
  });

  inputFile?.addEventListener('change', () => {
    const file = inputFile.files[0];
    if (!file) return;
    gdMediaArquivo = file; gdMediaTipo = 'arquivo';
    filePrev.textContent = `📎 ${file.name}`;
    filePrev.style.display = '';
    imgPrev.style.display = 'none';
    mostrarPreviewCompositor();
  });

  document.getElementById('gdPublishBtn')?.addEventListener('click', publicarPost);
  input?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); publicarPost(); }
  });
}

async function publicarPost() {
  const input = document.getElementById('gdPostInput');
  const texto = input.value.trim();
  if (!texto && !gdMediaArquivo) return;

  const btn = document.getElementById('gdPublishBtn');
  btn.disabled = true;
  btn.innerHTML = '<i data-lucide="loader"></i> Publicando...';
  lucide.createIcons();

  // Upload de mídia (mesmo padrão do home.js)
  let imagem_url = null, arquivo_url = null, arquivo_nome = null;
  if (gdMediaArquivo) {
    try {
      const publicUrl = await uploadParaCloudinary(gdMediaArquivo, 'posts');
      if (gdMediaTipo === 'imagem') imagem_url = publicUrl;
      else { arquivo_url = publicUrl; arquivo_nome = gdMediaArquivo.name; }
    } catch (e) {
      alert('Erro ao enviar mídia. Tente novamente.');
      return;
    }
  }

  const { error } = await window.supabase.from('posts').insert({
    user_id: usuarioAtual.id,
    texto: texto || '',
    group_id: GRUPO_ID,
    imagem_url,
    arquivo_url,
    arquivo_nome,
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

  // Limpa mídia após publicar
  gdMediaArquivo = null; gdMediaTipo = null;
  const inputImg  = document.getElementById('gdInputImagem');
  const inputFile = document.getElementById('gdInputArquivo');
  const preview   = document.getElementById('gdComposerPreview');
  const imgPrev   = document.getElementById('gdImgPreview');
  const filePrev  = document.getElementById('gdFilePreview');
  if (inputImg)  inputImg.value  = '';
  if (inputFile) inputFile.value = '';
  if (imgPrev)  { imgPrev.style.display  = 'none'; imgPrev.src = ''; }
  if (filePrev) { filePrev.style.display = 'none'; filePrev.textContent = ''; }
  if (preview)    preview.style.display  = 'none';

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
          ${(isOwn || gdIsAdmin)
            ? `<button class="icon-btn small delete-post-btn" title="Excluir post"><i data-lucide="trash-2"></i></button>`
            : `<button class="icon-btn small report-post-btn" title="Denunciar post"><i data-lucide="flag"></i></button>`}
        </div>
      </div>
      ${post.humor ? `<div class="post-humor">${post.humor}</div>` : ''}
      <p class="post-text">${renderMencoes(escapeHtml(post.texto))}</p>
      ${post.imagem_url ? `<img src="${post.imagem_url}" class="post-img" loading="lazy" />` : ''}
      ${post.arquivo_url ? `<a href="${corrigirUrlArquivo(post.arquivo_url, post.arquivo_nome)}" target="_blank" class="post-file-link" download="${post.arquivo_nome || 'arquivo'}">📎 ${escapeHtml(post.arquivo_nome || 'Baixar arquivo')}</a>` : ''}
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
        const ini  = gerarIniciais(p.nome || 'U');
        const avEl = p.foto_url
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
    const input    = card.querySelector('.comment-input');
    const dropdown = card.querySelector('.mention-dropdown');
    const sendBtn  = card.querySelector('.comment-send');
    ativarMencoes(input, dropdown);
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
      const confirmado = await confirmarExclusao('Tem certeza que deseja excluir este post? Esta ação não pode ser desfeita.')
      if (!confirmado) return;
      await window.supabase.from('posts').delete().eq('id', postId);
      card.remove();
    });

    // Denunciar
    card.querySelector('.report-post-btn')?.addEventListener('click', () => {
      denunciarConteudo('post', postId);
    });

    // Compartilhar
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
      const parentUid  = btn.dataset.uid;
      const parentNome = btn.dataset.nome;
      lista.querySelectorAll('.reply-form').forEach(f => f.remove());
      const parentEl   = lista.querySelector(`[data-id="${parentId}"]`);
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

  const euSouCriador = grupoAtual?.criador_id === usuarioAtual?.id;

  grid.innerHTML = memberships.map(m => {
    const p = perfilMap[m.user_id] || {};
    const iniciais = gerarIniciais(p.nome || '?');
    const sub = [p.curso, p.faculdade].filter(Boolean).join(' · ') || 'BrainHUB';
    const isCriador = grupoAtual?.criador_id === m.user_id;
    const podeRemover = euSouCriador && !isCriador;
    return `
      <div class="gd-membro-card">
        <a href="usuario.html?id=${m.user_id}" class="gd-membro-inner">
          <div class="mini-avatar ${p.cor_avatar || ''}" style="width:44px;height:44px;font-size:0.9rem;flex-shrink:0">${iniciais}</div>
          <div style="flex:1;min-width:0">
            <div class="gd-membro-nome">${escapeHtml(p.nome || 'Usuário')}</div>
            <div class="gd-membro-sub">${escapeHtml(sub)}</div>
          </div>
          ${isCriador ? '<span class="gd-criador-badge">Criador</span>' : ''}
        </a>
        ${podeRemover ? `<button class="gd-remove-membro" data-uid="${m.user_id}" title="Remover membro"><i data-lucide="user-minus"></i></button>` : ''}
      </div>`;
  }).join('');

  if (euSouCriador) {
    grid.querySelectorAll('.gd-remove-membro').forEach(btn => {
      btn.addEventListener('click', async () => {
        const uid = btn.dataset.uid;
        const confirmado = await confirmarExclusao('Remover este membro do grupo?');
        if (!confirmado) return;
        btn.disabled = true;
        const { error } = await window.supabase
          .from('group_members')
          .delete()
          .eq('group_id', GRUPO_ID)
          .eq('user_id', uid);
        if (error) { btn.disabled = false; return; }
        btn.closest('.gd-membro-card').remove();
      });
    });
  }

  lucide.createIcons();
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
