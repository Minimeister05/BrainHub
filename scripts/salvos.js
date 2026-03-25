lucide.createIcons();
sincronizarStatusPro();
aplicarPerfilNoSidebar();
carregarEstatisticasSidebar();

let usuarioAtual = null;

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
        <button class="icon-btn small save-btn saved" title="Remover dos salvos" data-post-id="${post.id}">
          <i data-lucide="bookmark"></i>
        </button>
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
      </div>
      <div class="comments-section hidden">
        <div class="comments-list"></div>
      </div>
    </article>`;
}

async function renderizar() {
  const container = document.getElementById('feedSalvos');
  if (!window.supabase) { setTimeout(renderizar, 200); return; }

  const { data: { user } } = await window.supabase.auth.getUser();
  if (!user) { window.location.href = 'login.html'; return; }
  usuarioAtual = user;

  const { data: saves } = await window.supabase
    .from('saved_posts')
    .select('post_id')
    .eq('user_id', user.id);

  if (!saves || saves.length === 0) {
    container.innerHTML = `
      <div class="aba-empty">
        <i data-lucide="bookmark"></i>
        <h3>Nenhum post salvo ainda.</h3>
        <p>Toque no ícone de marcador nos posts para salvar.</p>
      </div>`;
    lucide.createIcons();
    return;
  }

  const postIds = saves.map(s => s.post_id);

  const { data: posts } = await window.supabase
    .from('posts')
    .select('id, user_id, texto, created_at, humor, imagem_url, arquivo_url, arquivo_nome, profiles!posts_user_id_fkey(nome, cor_avatar, curso, periodo), likes(user_id), comments(id)')
    .in('id', postIds)
    .order('created_at', { ascending: false });

  if (!posts || posts.length === 0) {
    container.innerHTML = `<div class="aba-empty"><i data-lucide="bookmark"></i><h3>Nenhum post salvo ainda.</h3></div>`;
    lucide.createIcons();
    return;
  }

  container.innerHTML = posts.map(criarPostHTML).join('');
  lucide.createIcons();

  // Remover salvo
  container.querySelectorAll('.save-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const postId = btn.dataset.postId;
      await window.supabase.from('saved_posts').delete()
        .eq('user_id', user.id).eq('post_id', postId);
      btn.closest('.post-card').remove();
      if (!container.querySelector('.post-card')) renderizar();
    });
  });

  // Like
  container.querySelectorAll('.like-btn').forEach(btn => {
    const card = btn.closest('.post-card');
    const postId = card.dataset.id;
    const span = btn.querySelector('span');
    btn.addEventListener('click', async () => {
      const curtido = btn.classList.contains('liked');
      if (curtido) {
        await window.supabase.from('likes').delete().eq('user_id', user.id).eq('post_id', postId);
        btn.classList.remove('liked');
        span.textContent = Math.max(0, parseInt(span.textContent) - 1);
      } else {
        await window.supabase.from('likes').insert({ user_id: user.id, post_id: postId });
        btn.classList.add('liked');
        span.textContent = parseInt(span.textContent) + 1;
      }
    });
  });
}

renderizar();
