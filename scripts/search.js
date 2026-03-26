// scripts/search.js — busca global com filtros avançados Pro

async function buscarGruposSupabase(termo) {
  if (!window.supabase) return [];
  const { data } = await window.supabase
    .from('grupos')
    .select('id, nome, emoji, categoria')
    .or(`nome.ilike.%${termo}%,categoria.ilike.%${termo}%,descricao.ilike.%${termo}%`)
    .limit(6);
  return data || [];
}

async function buscarUsuariosSupabase(termo) {
  if (!window.supabase) return [];
  const { data } = await window.supabase
    .from('profiles')
    .select('id, nome, curso, faculdade, cor_avatar')
    .or(`nome.ilike.%${termo}%,curso.ilike.%${termo}%,faculdade.ilike.%${termo}%`)
    .limit(8);
  return data || [];
}

async function buscarPostsSupabase(termo, filtros = {}) {
  if (!window.supabase) return [];
  let query = window.supabase
    .from('posts')
    .select('id, texto, user_id, created_at, imagem_url, arquivo_url, profiles!posts_user_id_fkey(nome, cor_avatar)')
    .ilike('texto', `%${termo}%`)
    .order('created_at', { ascending: false })
    .limit(10);

  // Filtros avançados (Pro)
  if (filtros.periodo) {
    const agora = new Date();
    let desde;
    if (filtros.periodo === '24h') desde = new Date(agora - 24*60*60*1000);
    else if (filtros.periodo === '7d') desde = new Date(agora - 7*24*60*60*1000);
    else if (filtros.periodo === '30d') desde = new Date(agora - 30*24*60*60*1000);
    if (desde) query = query.gte('created_at', desde.toISOString());
  }

  if (filtros.tipo === 'imagem') query = query.not('imagem_url', 'is', null);
  else if (filtros.tipo === 'arquivo') query = query.not('arquivo_url', 'is', null);
  else if (filtros.tipo === 'texto') query = query.is('imagem_url', null).is('arquivo_url', null);

  const { data } = await query;
  return data || [];
}

function getIsPro() {
  return localStorage.getItem('brainhub_pro') === 'true';
}

async function pesquisar(termo, filtros = {}) {
  if (!termo || termo.length < 2) return null;
  const [usuarios, posts, grupos] = await Promise.all([
    buscarUsuariosSupabase(termo),
    buscarPostsSupabase(termo, filtros),
    buscarGruposSupabase(termo),
  ]);
  return { usuarios, posts, grupos };
}

function tempoRelativoSearch(dataStr) {
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

// ===== FILTROS STATE =====
let filtroAtivo = {};

function renderFiltrosAvancados() {
  const isPro = getIsPro();
  const container = document.getElementById('searchFilters');
  if (!container) return;

  if (!isPro) {
    container.innerHTML = `
      <div class="search-filters-locked">
        <i data-lucide="lock"></i>
        <span>Filtros avançados disponíveis no <a href="planos.html" style="color:#a78bfa">BrainHUB Pro</a></span>
      </div>`;
    lucide.createIcons();
    return;
  }

  container.innerHTML = `
    <div class="search-filters-row">
      <div class="search-filter-group">
        <label>Período</label>
        <select id="filtroPeriodo" class="search-filter-select">
          <option value="">Qualquer</option>
          <option value="24h">Últimas 24h</option>
          <option value="7d">Última semana</option>
          <option value="30d">Último mês</option>
        </select>
      </div>
      <div class="search-filter-group">
        <label>Tipo</label>
        <select id="filtroTipo" class="search-filter-select">
          <option value="">Todos</option>
          <option value="texto">Só texto</option>
          <option value="imagem">Com imagem</option>
          <option value="arquivo">Com arquivo</option>
        </select>
      </div>
    </div>`;

  document.getElementById('filtroPeriodo')?.addEventListener('change', () => aplicarFiltros());
  document.getElementById('filtroTipo')?.addEventListener('change', () => aplicarFiltros());
}

function aplicarFiltros() {
  filtroAtivo = {
    periodo: document.getElementById('filtroPeriodo')?.value || '',
    tipo: document.getElementById('filtroTipo')?.value || '',
  };
  const input = document.getElementById('searchGlobal');
  if (input?.value.trim()) renderizarResultados(input.value.trim());
}

async function renderizarResultados(termo) {
  const container = document.getElementById('searchResults');
  if (!termo || termo.length < 2) {
    container.innerHTML = `<p class="search-hint">Digite algo para pesquisar...</p>`;
    return;
  }

  container.innerHTML = `<p class="search-hint">Pesquisando...</p>`;
  const resultados = await pesquisar(termo, filtroAtivo);

  if (!resultados) {
    container.innerHTML = `<p class="search-hint">Digite algo para pesquisar...</p>`;
    return;
  }

  const { usuarios, posts, grupos } = resultados;
  const total = usuarios.length + posts.length + grupos.length;

  if (total === 0) {
    container.innerHTML = `<div class="search-empty">Nenhum resultado para "<strong>${termo}</strong>"</div>`;
    return;
  }

  let html = '';

  if (usuarios.length > 0) {
    html += `<div class="search-section-title">Usuários</div>`;
    html += usuarios.map(u => {
      const iniciais = (u.nome || '?').split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
      const sub = [u.curso, u.faculdade].filter(Boolean).join(' • ') || 'Sem curso definido';
      return `
        <a href="usuario.html?id=${u.id}" class="search-item" style="text-decoration:none;color:inherit">
          <div class="search-item-icon user-icon ${u.cor_avatar || ''}">${iniciais}</div>
          <div class="search-item-info">
            <div class="search-item-title">${u.nome}</div>
            <div class="search-item-sub">${sub}</div>
          </div>
        </a>`;
    }).join('');
  }

  if (grupos.length > 0) {
    html += `<div class="search-section-title">Grupos</div>`;
    html += grupos.map(g => `
      <a href="grupo-detalhe.html?id=${g.id}" class="search-item" style="text-decoration:none;color:inherit">
        <div class="search-item-icon group-icon" style="font-size:1.2rem">${g.emoji || '🧠'}</div>
        <div class="search-item-info">
          <div class="search-item-title">${g.nome}</div>
          <div class="search-item-sub">${g.categoria || 'Grupo'}</div>
        </div>
      </a>`).join('');
  }

  if (posts.length > 0) {
    html += `<div class="search-section-title">Posts</div>`;
    html += posts.map(p => {
      const nome = p.profiles?.nome || 'Usuário';
      const cor  = p.profiles?.cor_avatar || '';
      const iniciais = (nome).split(' ').map(x => x[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
      const preview = (p.texto || '').slice(0, 80) + ((p.texto || '').length > 80 ? '…' : '');
      const tempo = tempoRelativoSearch(p.created_at);
      const badges = [];
      if (p.imagem_url) badges.push('📷');
      if (p.arquivo_url) badges.push('📎');
      return `
        <a href="home.html?postId=${p.id}" class="search-item" style="text-decoration:none;color:inherit">
          <div class="search-item-icon user-icon ${cor}">${iniciais}</div>
          <div class="search-item-info">
            <div class="search-item-title">${nome} <span style="color:var(--muted);font-weight:400;font-size:0.78rem">• ${tempo}</span> ${badges.join(' ')}</div>
            <div class="search-item-sub">${preview}</div>
          </div>
        </a>`;
    }).join('');
  }

  container.innerHTML = html;
}

function iniciarSearch() {
  const overlay  = document.getElementById('searchOverlay');
  const input    = document.getElementById('searchGlobal');
  const closeBtn = document.getElementById('searchClose');

  document.querySelectorAll('.top-actions .icon-btn').forEach(btn => {
    if (!btn.querySelector('.badge')) {
      btn.addEventListener('click', () => {
        overlay.classList.remove('hidden');
        renderFiltrosAvancados();
        lucide.createIcons();
        setTimeout(() => input.focus(), 100);
      });
    }
  });

  closeBtn.addEventListener('click', fecharSearch);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) fecharSearch(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharSearch(); });

  input.addEventListener('input', () => {
    renderizarResultados(input.value.trim());
  });
}

function fecharSearch() {
  const overlay = document.getElementById('searchOverlay');
  const input   = document.getElementById('searchGlobal');
  overlay.classList.add('hidden');
  input.value = '';
  filtroAtivo = {};
  document.getElementById('searchResults').innerHTML = `<p class="search-hint">Digite algo para pesquisar...</p>`;
}

iniciarSearch();
