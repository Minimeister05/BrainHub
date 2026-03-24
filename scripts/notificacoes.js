// notificacoes.js — notificações reais via Supabase
lucide.createIcons();

const LAST_READ_KEY = 'brainhub_notif_lastread';
let ultimaLeitura = localStorage.getItem(LAST_READ_KEY) || '1970-01-01T00:00:00Z';
let usuarioAtual = null;
let todasNotifs = [];
let filtroAtivo = 'todas';

function tempoRelativo(dataStr) {
  const diff = Date.now() - new Date(dataStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}m atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d atrás`;
  return new Date(dataStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function gerarIniciais(nome) {
  return (nome || '?').split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function eNova(dataStr) {
  return new Date(dataStr) > new Date(ultimaLeitura);
}

function criarNotifHTML(notif) {
  const nova = eNova(notif.created_at);
  const iniciais = gerarIniciais(notif.nome);
  const emojiMap = { curtida: '👍', comentario: '💬', seguidor: '👥' };
  const tipoClassMap = { curtida: 'tipo-like', comentario: 'tipo-comment', seguidor: 'tipo-follow' };

  let textoHTML = '';
  let previewHTML = '';
  let acoesHTML = '';

  if (notif.tipo === 'curtida') {
    textoHTML = `<strong>${notif.nome}</strong> curtiu seu post`;
    if (notif.postPreview) previewHTML = `<span class="notif-preview-text">"${notif.postPreview}"</span>`;
    acoesHTML = `<a href="home.html?postId=${notif.postId}" class="notif-btn">Ver post</a>`;
  } else if (notif.tipo === 'comentario') {
    textoHTML = `<strong>${notif.nome}</strong> comentou no seu post`;
    if (notif.comentarioTexto) previewHTML = `<span class="notif-preview-text">"${notif.comentarioTexto}"</span>`;
    acoesHTML = `<a href="home.html?postId=${notif.postId}&openComments=1" class="notif-btn primary">Ver comentário</a>`;
  } else if (notif.tipo === 'seguidor') {
    textoHTML = `<strong>${notif.nome}</strong> começou a te seguir`;
    const followBtn = notif.jaSeguindo
      ? `<button class="notif-btn" disabled>Seguindo ✓</button>`
      : `<button class="notif-btn primary btn-follow-back" data-uid="${notif.userId}">Seguir de volta</button>`;
    acoesHTML = `${followBtn} <a href="usuario.html?id=${notif.userId}" class="notif-btn">Ver perfil</a>`;
  }

  return `
    <div class="notif-card ${nova ? 'nao-lida' : ''}" data-tipo="${notif.tipo}" data-id="${notif.id}">
      <div class="notif-avatar-wrap">
        <a href="usuario.html?id=${notif.userId}" style="text-decoration:none">
          <div class="mini-avatar ${notif.cor}" style="width:44px;height:44px;font-size:0.9rem">${iniciais}</div>
        </a>
        <div class="notif-tipo-icon ${tipoClassMap[notif.tipo]}">${emojiMap[notif.tipo]}</div>
      </div>
      <div class="notif-content">
        <div class="notif-text">${textoHTML}</div>
        <div class="notif-meta">
          <span class="notif-tempo">${tempoRelativo(notif.created_at)}</span>
          ${previewHTML}
        </div>
        ${acoesHTML ? `<div class="notif-actions">${acoesHTML}</div>` : ''}
      </div>
      ${nova ? '<div class="notif-dot"></div>' : ''}
    </div>`;
}

function renderizarNotifs(filtro = 'todas') {
  filtroAtivo = filtro;
  const container = document.getElementById('notifList');
  const filtradas = filtro === 'todas' ? todasNotifs : todasNotifs.filter(n => n.tipo === filtro);

  if (filtradas.length === 0) {
    container.innerHTML = `<div class="card" style="text-align:center;padding:48px;color:var(--muted)">
      <p>Nenhuma notificação${filtro !== 'todas' ? ' desse tipo' : ''} ainda.</p>
    </div>`;
    return;
  }

  const agora = new Date();
  const hoje  = new Date(agora); hoje.setHours(0, 0, 0, 0);
  const ontem = new Date(hoje);  ontem.setDate(ontem.getDate() - 1);
  const semana = new Date(hoje); semana.setDate(semana.getDate() - 7);

  const grupos = [
    { label: 'Hoje',        itens: filtradas.filter(n => new Date(n.created_at) >= hoje) },
    { label: 'Ontem',       itens: filtradas.filter(n => { const d = new Date(n.created_at); return d >= ontem && d < hoje; }) },
    { label: 'Esta semana', itens: filtradas.filter(n => { const d = new Date(n.created_at); return d >= semana && d < ontem; }) },
    { label: 'Mais antigas', itens: filtradas.filter(n => new Date(n.created_at) < semana) },
  ].filter(g => g.itens.length > 0);

  container.innerHTML = grupos.map(g => `
    <div class="notif-group">
      <div class="notif-group-label">${g.label}</div>
      ${g.itens.map(criarNotifHTML).join('')}
    </div>`).join('');

  lucide.createIcons();
}

function atualizarContagens() {
  const novas = todasNotifs.filter(n => eNova(n.created_at));
  const total      = novas.length;
  const curtidas   = novas.filter(n => n.tipo === 'curtida').length;
  const comentarios = novas.filter(n => n.tipo === 'comentario').length;
  const seguidores = novas.filter(n => n.tipo === 'seguidor').length;

  const set = (id, val) => {
    const e = document.getElementById(id);
    if (e) { e.textContent = val; e.classList.toggle('zero', val === 0); }
  };

  set('countTodas', total);
  set('countCurtidas', curtidas);
  set('countComents', comentarios);
  set('countSeguidores', seguidores);

  const badge = document.getElementById('notifBadge');
  if (badge) { badge.textContent = total; badge.style.display = total > 0 ? '' : 'none'; }

  const subtitleEl = document.getElementById('notifSubtitle');
  if (subtitleEl) {
    subtitleEl.textContent = total === 0
      ? 'Tudo em dia por enquanto!'
      : `${total} nova${total > 1 ? 's' : ''} desde sua última visita`;
  }

  // Salva contagem no localStorage para o badge nas outras páginas
  localStorage.setItem('brainhub_notif_count', total);
}

async function init() {
  if (!window.supabase) { setTimeout(init, 200); return; }

  const { data: { user } } = await window.supabase.auth.getUser();
  if (!user) { window.location.href = 'login.html'; return; }
  usuarioAtual = user;

  // Busca meus posts
  const { data: myPosts } = await window.supabase
    .from('posts').select('id, texto').eq('user_id', user.id);
  const myPostIds   = (myPosts || []).map(p => p.id);
  const postTextoMap = Object.fromEntries((myPosts || []).map(p => [p.id, p.texto?.slice(0, 80) || '']));

  const notifs = [];

  if (myPostIds.length > 0) {
    const [{ data: likes }, { data: comments }] = await Promise.all([
      window.supabase.from('likes')
        .select('post_id, created_at, user_id, profiles(nome, cor_avatar)')
        .in('post_id', myPostIds)
        .neq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(60),
      window.supabase.from('comments')
        .select('id, post_id, texto, created_at, user_id, profiles(nome, cor_avatar)')
        .in('post_id', myPostIds)
        .neq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(60),
    ]);

    (likes || []).forEach(l => notifs.push({
      id:          `like_${l.post_id}_${l.user_id}`,
      tipo:        'curtida',
      nome:        l.profiles?.nome || 'Usuário',
      cor:         l.profiles?.cor_avatar || '',
      userId:      l.user_id,
      postId:      l.post_id,
      postPreview: postTextoMap[l.post_id] || '',
      created_at:  l.created_at,
    }));

    (comments || []).forEach(c => notifs.push({
      id:              `comment_${c.id}`,
      tipo:            'comentario',
      nome:            c.profiles?.nome || 'Usuário',
      cor:             c.profiles?.cor_avatar || '',
      userId:          c.user_id,
      postId:          c.post_id,
      comentarioTexto: (c.texto || '').slice(0, 80),
      created_at:      c.created_at,
    }));
  }

  // Seguidores (usa FK explícita pois follows tem dois campos → profiles)
  const { data: follows } = await window.supabase
    .from('follows')
    .select('follower_id, created_at, profiles!follows_follower_id_fkey(nome, cor_avatar)')
    .eq('following_id', user.id)
    .order('created_at', { ascending: false })
    .limit(60);

  // Verifica quem o usuário já segue de volta
  const { data: euSigo } = await window.supabase
    .from('follows').select('following_id').eq('follower_id', user.id);
  const euSigoSet = new Set((euSigo || []).map(f => f.following_id));

  (follows || []).forEach(f => notifs.push({
    id:           `follow_${f.follower_id}`,
    tipo:         'seguidor',
    nome:         f.profiles?.nome || 'Usuário',
    cor:          f.profiles?.cor_avatar || '',
    userId:       f.follower_id,
    jaSeguindo:   euSigoSet.has(f.follower_id),
    created_at:   f.created_at,
  }));

  // Ordena por data decrescente
  notifs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  todasNotifs = notifs;

  // Resumo (totais absolutos)
  document.getElementById('sumLikes').textContent    = notifs.filter(n => n.tipo === 'curtida').length;
  document.getElementById('sumComments').textContent = notifs.filter(n => n.tipo === 'comentario').length;
  document.getElementById('sumFollowers').textContent = notifs.filter(n => n.tipo === 'seguidor').length;

  atualizarContagens();
  renderizarNotifs('todas');

  // Tabs
  document.querySelectorAll('.notif-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.notif-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderizarNotifs(tab.dataset.tab);
    });
  });

  // Marcar todas como lidas
  document.getElementById('btnMarcarTodas')?.addEventListener('click', () => {
    ultimaLeitura = new Date().toISOString();
    localStorage.setItem(LAST_READ_KEY, ultimaLeitura);
    localStorage.setItem('brainhub_notif_count', '0');
    atualizarContagens();
    renderizarNotifs(filtroAtivo);
  });

  // Botão "Seguir de volta" inline
  document.getElementById('notifList').addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-follow-back');
    if (!btn || btn.disabled) return;
    const uid = btn.dataset.uid;
    btn.disabled = true;
    btn.textContent = 'Enviando...';
    const { error } = await window.supabase.from('follows').insert({
      follower_id: usuarioAtual.id,
      following_id: uid
    });
    if (!error) {
      btn.textContent = 'Seguindo ✓';
      btn.classList.remove('primary');
      // Atualiza o dado em memória para não reverter ao re-renderizar
      const notif = todasNotifs.find(n => n.userId === uid && n.tipo === 'seguidor');
      if (notif) notif.jaSeguindo = true;
    } else {
      btn.disabled = false;
      btn.textContent = 'Seguir de volta';
    }
  });

  // Limpar lidas (remove visualmente as já lidas)
  document.getElementById('btnLimparLidas')?.addEventListener('click', () => {
    todasNotifs = todasNotifs.filter(n => eNova(n.created_at));
    document.getElementById('sumLikes').textContent     = todasNotifs.filter(n => n.tipo === 'curtida').length;
    document.getElementById('sumComments').textContent  = todasNotifs.filter(n => n.tipo === 'comentario').length;
    document.getElementById('sumFollowers').textContent = todasNotifs.filter(n => n.tipo === 'seguidor').length;
    renderizarNotifs(filtroAtivo);
  });
}

init();
