// usuario.js — página de perfil público de outro usuário
lucide.createIcons();

const bannerMap = {
  '': '', 'av-green': 'bn-green', 'av-pink': 'bn-pink',
  'av-orange': 'bn-orange', 'av-blue': 'bn-blue', 'av-red': 'bn-red',
  'av-pro-gold': 'bn-pro', 'av-pro-teal': 'bn-teal', 'av-pro-neon': 'bn-neon',
  'av-pro-ocean': 'bn-ocean', 'av-pro-magenta': 'bn-magenta', 'av-pro-sunset': 'bn-sunset',
};

const params = new URLSearchParams(window.location.search);
const targetUserId = params.get('id');

let usuarioAtual = null;
let seguindo = false;

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

function mostrarToast(msg, tipo = 'success') {
  let c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${tipo}`;
  t.innerText = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 4000);
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

  const pinnedLabel = post.pinned ? '<div class="post-pinned-label"><i data-lucide="pin"></i> Post fixado</div>' : '';

  return `
    <article class="post-card card${post.pinned ? ' post-pinned' : ''}" data-id="${post.id}">
      ${pinnedLabel}
      <div class="post-header">
        <div class="post-user">
          ${avatarHTML}
          <div>
            <h4>${nome}</h4>
            <p>${tempo}</p>
          </div>
        </div>
      </div>
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

function ativarEventosPosts(container) {
  container.querySelectorAll('.post-card').forEach(card => {
    const postId = card.dataset.id;

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

    const toggleBtn = card.querySelector('.comment-toggle-btn');
    const section   = card.querySelector('.comments-section');
    const lista     = card.querySelector('.comments-list');
    let carregado   = false;

    toggleBtn.addEventListener('click', async () => {
      section.classList.toggle('hidden');
      if (!section.classList.contains('hidden') && !carregado) {
        carregado = true;
        lista.innerHTML = '<p style="color:var(--muted);font-size:0.85rem">Carregando...</p>';
        const { data } = await window.supabase
          .from('comments')
          .select('id, texto, created_at, profiles(nome)')
          .eq('post_id', postId)
          .order('created_at', { ascending: true });

        lista.innerHTML = (data && data.length > 0)
          ? data.map(c => `<div class="comment-item"><strong class="comment-author">${c.profiles?.nome || 'Usuário'}</strong><p class="comment-text">${c.texto}</p></div>`).join('')
          : '<p style="color:var(--muted);font-size:0.85rem">Nenhum comentário ainda.</p>';
      }
    });

    const input   = card.querySelector('.comment-input');
    const sendBtn = card.querySelector('.comment-send');
    const enviar  = async () => {
      if (!usuarioAtual) return;
      const texto = input.value.trim();
      if (!texto) return;
      input.value = '';
      await window.supabase.from('comments').insert({ user_id: usuarioAtual.id, post_id: postId, texto });
      const countSpan = card.querySelector('.comment-toggle-btn span');
      countSpan.textContent = parseInt(countSpan.textContent) + 1;
      carregado = false;
      toggleBtn.click(); toggleBtn.click(); // recarrega comentários
    };
    sendBtn.addEventListener('click', enviar);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); enviar(); } });
  });
}

async function atualizarBotaoFollow() {
  const btn = document.getElementById('btnFollow');
  if (seguindo) {
    btn.innerHTML = '<i data-lucide="user-check"></i> Seguindo';
    btn.classList.add('seguindo');
  } else {
    btn.innerHTML = '<i data-lucide="user-plus"></i> Seguir';
    btn.classList.remove('seguindo');
  }
  lucide.createIcons();
}

async function init() {
  if (!targetUserId) {
    window.location.href = 'home.html';
    return;
  }

  const { data: { user } } = await window.supabase.auth.getUser();
  usuarioAtual = user;

  // Se é o próprio perfil, redireciona para perfil.html
  if (usuarioAtual?.id === targetUserId) {
    window.location.href = 'perfil.html';
    return;
  }

  // Busca perfil do usuário
  const { data: perfil } = await window.supabase
    .from('profiles')
    .select('*, is_pro')
    .eq('id', targetUserId)
    .single();

  if (!perfil) {
    document.getElementById('usuarioNome').textContent = 'Usuário não encontrado';
    return;
  }

  // Perfil privado
  if (perfil.perfil_publico === false) {
    document.getElementById('usuarioNome').textContent = perfil.nome || 'Usuário';
    document.getElementById('usuarioCurso').textContent = '';
    document.getElementById('usuarioBio').textContent = '';
    document.getElementById('usuarioPosts').innerHTML = `
      <div class="card" style="text-align:center;padding:48px 32px;color:var(--muted)">
        <i data-lucide="lock" style="width:40px;height:40px;opacity:0.4"></i>
        <p style="margin-top:16px;font-size:1rem;font-weight:600;color:var(--text);opacity:0.7">Este perfil é privado</p>
        <p style="margin-top:6px;font-size:0.85rem">O usuário optou por manter o perfil privado.</p>
      </div>`;
    document.getElementById('btnFollow').style.display = 'none';
    document.getElementById('btnMsg').style.display = 'none';
    lucide.createIcons();
    return;
  }

  // Preenche header
  const nome = perfil.nome || 'Usuário';
  const cor = perfil.cor_avatar || '';
  const fotoUrl = perfil.foto_url || null;
  const bannerUrl = perfil.banner_url || null;
  const bannerPos = perfil.banner_position || '50%';
  const iniciais = gerarIniciais(nome);
  const sub = [perfil.curso, perfil.faculdade, perfil.periodo].filter(Boolean).join(' • ');

  const isPro = perfil.is_pro === true;

  const avatarEl = document.getElementById('usuarioAvatar');
  if (fotoUrl) {
    avatarEl.innerHTML = `<img src="${fotoUrl}" alt="foto" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" />`;
    avatarEl.className = 'perfil-avatar av-foto av-foto-clicavel';
    avatarEl.title = 'Ver foto';
    avatarEl.addEventListener('click', () => abrirLightbox(fotoUrl, nome));
  } else {
    avatarEl.textContent = iniciais;
    avatarEl.className = `perfil-avatar ${cor}`;
  }

  // Banner
  const banner = document.querySelector('.usuario-profile-card .profile-banner');
  if (banner) {
    if (isPro && bannerUrl) {
      banner.style.backgroundImage = `url(${bannerUrl})`;
      banner.style.backgroundSize = 'cover';
      banner.style.backgroundPosition = `center ${bannerPos}`;
      banner.style.backgroundRepeat = 'no-repeat';
      banner.className = 'profile-banner bn-custom banner-clicavel';
      banner.title = 'Ver banner';
      banner.addEventListener('click', () => abrirLightbox(bannerUrl, `Banner de ${nome}`));
    } else {
      const bnClass = isPro ? 'bn-pro' : (bannerMap[cor] || '');
      banner.className = 'profile-banner' + (bnClass ? ` ${bnClass}` : '');
    }
  }
  if (isPro) document.querySelector('.usuario-profile-card').classList.add('pro-card');

  // Card "Sobre"
  const sobreCard = document.getElementById('usuarioSobre');
  const sobreInfo = document.getElementById('usuarioSobreInfo');
  const sobreMeta = document.getElementById('usuarioSobreMeta');

  const chips = [];
  if (perfil.curso)     chips.push(`<span class="usuario-sobre-chip"><i data-lucide="graduation-cap"></i>${perfil.curso}</span>`);
  if (perfil.faculdade) chips.push(`<span class="usuario-sobre-chip"><i data-lucide="building-2"></i>${perfil.faculdade}</span>`);
  if (perfil.periodo)   chips.push(`<span class="usuario-sobre-chip"><i data-lucide="calendar"></i>${perfil.periodo}</span>`);

  const bioHTML = perfil.bio ? `<p class="usuario-sobre-bio">${perfil.bio}</p>` : '';

  sobreInfo.innerHTML = (chips.length ? `<div class="usuario-sobre-chips">${chips.join('')}</div>` : '') + bioHTML;

  const membroDesde = perfil.created_at
    ? new Date(perfil.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : null;
  sobreMeta.innerHTML = membroDesde
    ? `<span class="usuario-sobre-meta-item"><i data-lucide="calendar-check"></i> Membro desde ${membroDesde}</span>`
    : '';

  sobreCard.style.display = (chips.length || perfil.bio || membroDesde) ? '' : 'none';

  const nomeEl = document.getElementById('usuarioNome');
  nomeEl.innerHTML = nome
    + (isPro ? ` <span class="verified-perfil" style="display:inline-flex" title="Verificado"><i data-lucide="badge-check"></i></span>` : '');

  if (isPro) {
    const proBadgeEl = document.createElement('div');
    proBadgeEl.className = 'pro-badge-perfil';
    proBadgeEl.style.display = 'flex';
    proBadgeEl.innerHTML = '<i data-lucide="crown"></i> BrainHUB PRO';
    nomeEl.insertAdjacentElement('afterend', proBadgeEl);
  }

  document.getElementById('usuarioCurso').textContent = sub;
  document.getElementById('usuarioBio').textContent = perfil.bio || '';
  lucide.createIcons();

  document.title = `BrainHUB | ${nome}`;
  // Botão de mensagem: verifica se aceita msgs de desconhecidos
  const btnMsg = document.getElementById('btnMsg');
  btnMsg.href = `chat.html?userId=${targetUserId}`;
  if (perfil.msg_desconhecidos === false && usuarioAtual) {
    // Checa se são amigos mútuos
    const [{ data: euSigoEle }, { data: eleSegueMim }] = await Promise.all([
      window.supabase.from('follows').select('follower_id').eq('follower_id', usuarioAtual.id).eq('following_id', targetUserId).single(),
      window.supabase.from('follows').select('follower_id').eq('follower_id', targetUserId).eq('following_id', usuarioAtual.id).single()
    ]);
    if (!euSigoEle || !eleSegueMim) {
      btnMsg.removeAttribute('href');
      btnMsg.style.opacity = '0.4';
      btnMsg.style.cursor = 'not-allowed';
      btnMsg.title = 'Este usuário não aceita mensagens de desconhecidos';
    }
  }

  // Conta de seguidores/seguindo
  const [{ count: seguidores }, { count: seguindoCount }, { count: postsCount }] = await Promise.all([
    window.supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', targetUserId),
    window.supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', targetUserId),
    window.supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', targetUserId)
  ]);

  document.getElementById('statPosts').textContent = postsCount || 0;
  document.getElementById('statSeguidores').textContent = seguidores || 0;
  document.getElementById('statSeguindo').textContent = seguindoCount || 0;

  // Verifica se já segue
  if (usuarioAtual) {
    const { data: followData } = await window.supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', usuarioAtual.id)
      .eq('following_id', targetUserId)
      .single();
    seguindo = !!followData;
    await atualizarBotaoFollow();
  }

  // Botão de denunciar perfil
  document.getElementById('btnReportUser')?.addEventListener('click', () => {
    denunciarConteudo('user', targetUserId);
  });

  // Botão de seguir
  document.getElementById('btnFollow').addEventListener('click', async () => {
    if (!usuarioAtual) { window.location.href = 'login.html'; return; }

    if (seguindo) {
      await window.supabase.from('follows').delete()
        .eq('follower_id', usuarioAtual.id).eq('following_id', targetUserId);
      seguindo = false;
      document.getElementById('statSeguidores').textContent = Math.max(0, parseInt(document.getElementById('statSeguidores').textContent) - 1);
      mostrarToast('Você deixou de seguir ' + nome);
    } else {
      await window.supabase.from('follows').insert({
        follower_id: usuarioAtual.id,
        following_id: targetUserId
      });
      seguindo = true;
      document.getElementById('statSeguidores').textContent = parseInt(document.getElementById('statSeguidores').textContent) + 1;
      mostrarToast('Você agora segue ' + nome + '!');
    }
    await atualizarBotaoFollow();
  });

  // Busca posts do usuário
  const { data: posts } = await window.supabase
    .from('posts')
    .select('id, user_id, texto, created_at, pinned, imagem_url, arquivo_url, arquivo_nome, profiles!posts_user_id_fkey(nome, cor_avatar, foto_url, curso, periodo, is_pro), likes(user_id), comments(id)')
    .eq('user_id', targetUserId)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });

  const container = document.getElementById('usuarioPosts');

  if (!posts || posts.length === 0) {
    container.innerHTML = `
      <div class="card" style="text-align:center;padding:48px 32px;color:var(--muted)">
        <i data-lucide="feather" style="width:44px;height:44px;opacity:0.4"></i>
        <p style="margin-top:16px;font-size:1rem;font-weight:600;color:var(--text);opacity:0.7">${nome} ainda não publicou nada</p>
        <p style="margin-top:6px;font-size:0.85rem">Quando publicar, os posts vão aparecer aqui.</p>
      </div>`;
    lucide.createIcons();
    return;
  }

  container.innerHTML = posts.map(criarPostHTML).join('');
  lucide.createIcons();
  ativarEventosPosts(container);
}

init();
