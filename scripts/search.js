// scripts/search.js

const grupos = [
  { nome: "Programação & Dev", membros: "2.4k membros" },
  { nome: "Economia & Finanças", membros: "1.8k membros" },
  { nome: "Direito & Legislação", membros: "1.3k membros" },
  { nome: "Medicina & Saúde", membros: "3.1k membros" },
  { nome: "Engenharias", membros: "2.7k membros" },
];

function getPostsSalvos() {
  return JSON.parse(localStorage.getItem('brainhub_posts') || '[]');
}

function getConversas() {
  return JSON.parse(localStorage.getItem('brainhub_chat') || '[]');
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

async function buscarPostsSupabase(termo) {
  if (!window.supabase) return [];
  const { data } = await window.supabase
    .from('posts')
    .select('id, texto, user_id, profiles!posts_user_id_fkey(nome, cor_avatar)')
    .ilike('texto', `%${termo}%`)
    .order('created_at', { ascending: false })
    .limit(6);
  return data || [];
}

async function pesquisar(termo) {
  if (!termo || termo.length < 2) return null;

  const t = termo.toLowerCase();

  const gruposFound = grupos.filter(g => g.nome.toLowerCase().includes(t));
  const conversas = getConversas().filter(c =>
    c.nome?.toLowerCase().includes(t) || c.subtitulo?.toLowerCase().includes(t)
  );
  const [usuarios, posts] = await Promise.all([
    buscarUsuariosSupabase(termo),
    buscarPostsSupabase(termo),
  ]);

  return { grupos: gruposFound, usuarios, conversas, posts };
}

async function renderizarResultados(termo) {
  const container = document.getElementById('searchResults');
  if (!termo || termo.length < 2) {
    container.innerHTML = `<p class="search-hint">Digite algo para pesquisar...</p>`;
    return;
  }

  container.innerHTML = `<p class="search-hint">Pesquisando...</p>`;
  const resultados = await pesquisar(termo);

  if (!resultados) {
    container.innerHTML = `<p class="search-hint">Digite algo para pesquisar...</p>`;
    return;
  }

  const { grupos, usuarios, conversas, posts } = resultados;
  const total = grupos.length + usuarios.length + conversas.length + posts.length;

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
      <div class="search-item">
        <div class="search-item-icon group-icon">G</div>
        <div class="search-item-info">
          <div class="search-item-title">${g.nome}</div>
          <div class="search-item-sub">${g.membros}</div>
        </div>
      </div>`).join('');
  }

  if (conversas.length > 0) {
    html += `<div class="search-section-title">Conversas</div>`;
    html += conversas.map(c => `
      <div class="search-item">
        <div class="search-item-icon chat-icon">${c.iniciais || 'C'}</div>
        <div class="search-item-info">
          <div class="search-item-title">${c.nome}</div>
          <div class="search-item-sub">${c.subtitulo || ''}</div>
        </div>
      </div>`).join('');
  }

  if (posts.length > 0) {
    html += `<div class="search-section-title">Posts</div>`;
    html += posts.map(p => {
      const nome = p.profiles?.nome || 'Usuário';
      const cor  = p.profiles?.cor_avatar || '';
      const iniciais = (nome).split(' ').map(x => x[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
      const preview = (p.texto || '').slice(0, 80) + ((p.texto || '').length > 80 ? '…' : '');
      return `
        <a href="home.html?postId=${p.id}" class="search-item" style="text-decoration:none;color:inherit">
          <div class="search-item-icon user-icon ${cor}">${iniciais}</div>
          <div class="search-item-info">
            <div class="search-item-title">${nome}</div>
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

  // CORRIGIDO: busca pelo botão pai direto em vez do ícone interno
  document.querySelectorAll('.top-actions .icon-btn').forEach(btn => {
    // Verifica se é o botão da lupa (não tem badge de notificação)
    if (!btn.querySelector('.badge')) {
      btn.addEventListener('click', () => {
        overlay.classList.remove('hidden');
        lucide.createIcons();
        setTimeout(() => input.focus(), 100);
      });
    }
  });

  // Fecha ao clicar no X
  closeBtn.addEventListener('click', fecharSearch);

  // Fecha ao clicar fora do modal
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) fecharSearch();
  });

  // Fecha com ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharSearch();
  });

  // Pesquisa ao digitar (async)
  input.addEventListener('input', () => {
    renderizarResultados(input.value.trim());
  });
}

function fecharSearch() {
  const overlay = document.getElementById('searchOverlay');
  const input   = document.getElementById('searchGlobal');
  overlay.classList.add('hidden');
  input.value = '';
  document.getElementById('searchResults').innerHTML = `<p class="search-hint">Digite algo para pesquisar...</p>`;
}

iniciarSearch();