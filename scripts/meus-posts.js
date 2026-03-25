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
  const tempo = tempoRelativo(post.created_at);
  const sub = [perfil.curso, perfil.periodo].filter(Boolean).join(' • ') || 'BrainHUB';

  return `
    <article class="post-card card" data-id="${post.id}">
      <div class="post-header">
        <div class="post-user">
          <div class="mini-avatar ${cor}">${iniciais}</div>
          <div><h4>${nome}</h4><p>${sub} • ${tempo}</p></div>
        </div>
        <button class="icon-btn small delete-post-btn" title="Excluir post">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
      ${post.humor ? `<div class="post-humor">${post.humor}</div>` : ''}
      <p class="post-text">${post.texto}</p>
      ${post.imagem_url ? `<img src="${post.imagem_url}" class="post-img" loading="lazy" />` : ''}
      ${post.arquivo_url ? `<a href="${post.arquivo_url}" target="_blank" class="post-file-link" download="${post.arquivo_nome || 'arquivo'}">📎 ${post.arquivo_nome || 'Baixar arquivo'}</a>` : ''}
      <div class="post-actions">
        <button class="action-btn"><i data-lucide="thumbs-up"></i><span>${likesCount}</span></button>
        <button class="action-btn"><i data-lucide="message-square"></i><span>${commentsCount}</span></button>
      </div>
    </article>`;
}

async function renderizar() {
  const container = document.getElementById('feedMeusPosts');
  if (!window.supabase) { setTimeout(renderizar, 200); return; }

  const { data: { user } } = await window.supabase.auth.getUser();
  if (!user) { window.location.href = 'login.html'; return; }
  usuarioAtual = user;

  container.innerHTML = '<p style="color:var(--muted);text-align:center;padding:32px">Carregando...</p>';

  const { data: posts } = await window.supabase
    .from('posts')
    .select('id, user_id, texto, created_at, humor, imagem_url, arquivo_url, arquivo_nome, profiles!posts_user_id_fkey(nome, cor_avatar, curso, periodo), likes(user_id), comments(id)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (!posts || posts.length === 0) {
    container.innerHTML = `
      <div class="aba-empty">
        <i data-lucide="edit-3"></i>
        <h3>Você ainda não publicou nenhum post.</h3>
        <p>Que tal compartilhar algo com a comunidade?</p>
      </div>`;
    lucide.createIcons();
    return;
  }

  container.innerHTML = posts.map(criarPostHTML).join('');
  lucide.createIcons();

  container.querySelectorAll('.delete-post-btn').forEach(btn => {
    const card = btn.closest('.post-card');
    const postId = card.dataset.id;
    btn.addEventListener('click', async () => {
      if (!confirm('Excluir este post?')) return;
      await window.supabase.from('posts').delete().eq('id', postId);
      card.remove();
    });
  });
}

renderizar();
