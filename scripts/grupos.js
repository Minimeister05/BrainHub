// scripts/grupos.js
// Requer tabelas Supabase: grupos, group_members
// Ver supabase-grupos.sql para o schema completo

lucide.createIcons();

let usuarioAtual = null;
let isAdmin = false;
let meuGrupos = new Set();
let todosGrupos = [];
let categoriaAtiva = 'Todos';
let grupoParaExcluirAdm = null;

// ===== TOAST =====
function mostrarAviso(msg, tipo = 'info') {
  let container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.innerText = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// ===== INIT =====
async function init() {
  if (!window.supabase) { setTimeout(init, 200); return; }
  const { data: { user } } = await window.supabase.auth.getUser();
  usuarioAtual = user;
  if (!user) { window.location.href = 'index.html'; return; }

  const { data: perfil } = await window.supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  isAdmin = perfil?.is_admin === true;

  // meuGrupos precisa estar pronto antes de renderGrupos
  await carregarMeusGrupos();
  await carregarGrupos();
}

// ===== CARREGAR GRUPOS =====
async function carregarGrupos() {
  mostrarLoading(true);

  const [{ data: grupos, error }, { data: contagens }] = await Promise.all([
    window.supabase.from('grupos').select('*').order('created_at', { ascending: false }),
    window.supabase.from('group_members').select('group_id')
  ]);

  if (error) {
    console.error('Erro ao carregar grupos:', error);
    mostrarAviso('Erro ao carregar grupos.', 'error');
    mostrarLoading(false);
    return;
  }

  // Conta membros por grupo no front
  const contagemMap = {};
  (contagens || []).forEach(m => {
    contagemMap[m.group_id] = (contagemMap[m.group_id] || 0) + 1;
  });

  todosGrupos = (grupos || []).map(g => ({ ...g, membroCount: contagemMap[g.id] || 0 }));
  renderGrupos(todosGrupos);
  mostrarLoading(false);
}

// ===== MEUS GRUPOS (sidebar) =====
async function carregarMeusGrupos() {
  // Passo 1: pega os IDs dos grupos que participo
  const { data: memberships } = await window.supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', usuarioAtual.id);

  const ids = (memberships || []).map(m => m.group_id);
  meuGrupos = new Set(ids);

  const sidebar = document.getElementById('meuGruposSidebar');
  if (!sidebar) return;

  if (ids.length === 0) {
    sidebar.innerHTML = '<p class="sidebar-empty">Você ainda não participa de nenhum grupo.</p>';
    return;
  }

  // Passo 2: busca detalhes dos grupos
  const { data: grupos } = await window.supabase
    .from('grupos')
    .select('id, nome, emoji, categoria')
    .in('id', ids);

  sidebar.innerHTML = (grupos || []).map(g => `
    <div class="grupo-sidebar-item" onclick="window.location.href='grupo-detalhe.html?id=${g.id}'">
      <div class="grupo-mini-icon">${g.emoji || '🧠'}</div>
      <div class="grupo-mini-info">
        <div class="grupo-mini-nome">${escapeHtml(g.nome)}</div>
        <div class="grupo-mini-count">${g.categoria || 'Geral'}</div>
      </div>
    </div>
  `).join('');
}

// ===== RENDER GRID =====
const GRADIENTES = [
  'linear-gradient(135deg,#1a1040,#2d1b69)',
  'linear-gradient(135deg,#0a2540,#0d3b2e)',
  'linear-gradient(135deg,#1a0a2e,#2e1065)',
  'linear-gradient(135deg,#1a1200,#2d2200)',
  'linear-gradient(135deg,#0a1520,#0d2235)',
  'linear-gradient(135deg,#0a1a0a,#0d2d1a)',
  'linear-gradient(135deg,#150a2e,#2d1040)',
  'linear-gradient(135deg,#1a0a0a,#3b1010)',
];

function renderGrupos(grupos) {
  const grid = document.getElementById('gruposGrid');
  const empty = document.getElementById('gruposEmpty');

  if (grupos.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'flex';
    lucide.createIcons();
    return;
  }

  empty.style.display = 'none';

  grid.innerHTML = grupos.map((g, i) => {
    const participando = meuGrupos.has(g.id);
    const membros = g.membroCount ?? 0;
    const bg = GRADIENTES[i % GRADIENTES.length];
    const eCriador = usuarioAtual && g.criador_id === usuarioAtual.id;

    let overlayAcao = '';
    if (eCriador) {
      overlayAcao = `
        <div class="grupo-card-acoes">
          <button class="btn-card-acao" onclick="event.stopPropagation(); excluirGrupo('${g.id}', '${escapeHtml(g.nome).replace(/'/g, "\\'")}')" title="Excluir grupo">
            <i data-lucide="trash-2"></i>
          </button>
        </div>`;
    } else if (isAdmin) {
      overlayAcao = `
        <div class="grupo-card-acoes">
          <button class="btn-card-acao admin" onclick="event.stopPropagation(); abrirModalExclusaoAdm('${g.id}', '${g.criador_id || ''}', '${escapeHtml(g.nome).replace(/'/g, "\\'")}')" title="Remover grupo">
            <i data-lucide="shield-x"></i>
          </button>
        </div>`;
    }

    return `
      <div class="grupo-card" onclick="abrirGrupo('${g.id}')" style="cursor:pointer">
        <div class="grupo-card-banner" style="background:${bg}">
          <span style="position:relative;z-index:1;font-size:2rem">${g.emoji || '🧠'}</span>
          ${overlayAcao}
        </div>
        <div class="grupo-card-body">
          <div class="grupo-card-nome">${escapeHtml(g.nome)}</div>
          ${g.categoria ? `<div class="grupo-card-tags"><span class="grupo-card-tag">${escapeHtml(g.categoria)}</span></div>` : ''}
          <div class="grupo-card-desc">${escapeHtml(g.descricao || 'Sem descrição.')}</div>
          <div class="grupo-card-footer">
            <div class="grupo-membros">
              <span class="grupo-membros-count">${membros} membro${membros !== 1 ? 's' : ''}</span>
            </div>
            <button
              class="btn-entrar-card ${participando ? 'participando' : ''}"
              data-group-id="${g.id}"
              onclick="event.stopPropagation(); toggleGrupo(this, '${g.id}')"
            >${participando ? 'Participando' : 'Participar'}</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

function abrirGrupo(id) {
  window.location.href = `grupo-detalhe.html?id=${id}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===== ENTRAR / SAIR DO GRUPO =====
async function toggleGrupo(btn, groupId) {
  if (!usuarioAtual) return;
  const participando = meuGrupos.has(groupId);
  btn.disabled = true;

  if (participando) {
    const { error } = await window.supabase
      .from('group_members')
      .delete()
      .eq('user_id', usuarioAtual.id)
      .eq('group_id', groupId);

    if (!error) {
      meuGrupos.delete(groupId);
      btn.textContent = 'Participar';
      btn.classList.remove('participando');
      mostrarAviso('Você saiu do grupo.', 'info');
      carregarMeusGrupos();
      atualizarContador(groupId, -1);
    }
  } else {
    const { error } = await window.supabase
      .from('group_members')
      .insert({ user_id: usuarioAtual.id, group_id: groupId });

    if (!error) {
      meuGrupos.add(groupId);
      btn.textContent = 'Participando';
      btn.classList.add('participando');
      mostrarAviso('Você entrou no grupo!', 'success');
      carregarMeusGrupos();
      atualizarContador(groupId, +1);
    }
  }
  btn.disabled = false;
}

function atualizarContador(groupId, delta) {
  const card = document.querySelector(`[data-group-id="${groupId}"]`)?.closest('.grupo-card');
  if (!card) return;
  const span = card.querySelector('.grupo-membros-count');
  if (!span) return;
  const atual = parseInt(span.textContent) || 0;
  const novo = Math.max(0, atual + delta);
  span.textContent = `${novo} membro${novo !== 1 ? 's' : ''}`;
}

function mostrarLoading(show) {
  document.getElementById('gruposLoading').style.display = show ? 'flex' : 'none';
  if (!show) document.getElementById('gruposGrid').style.display = '';
}

// ===== FILTRO CATEGORIA =====
function setCategoria(btn) {
  document.querySelectorAll('.categoria-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  categoriaAtiva = btn.dataset.categoria;

  if (categoriaAtiva === 'Todos') {
    renderGrupos(todosGrupos);
  } else {
    renderGrupos(todosGrupos.filter(g => g.categoria === categoriaAtiva));
  }
}

// ===== MODAL CRIAR GRUPO =====
const EMOJIS = ['🧠', '💻', '🔬', '🌿', '⚛️', '📖', '🤖', '🧬', '🎨', '📐', '🌍', '⚗️', '🚀', '🎵', '📊', '🔭', '🧪', '🏛️', '📡', '🧲'];

document.getElementById('btnCriarGrupo')?.addEventListener('click', abrirModal);

function abrirModal() {
  const modal = document.getElementById('modalCriarGrupo');
  modal.classList.remove('hidden');
  document.getElementById('emojiSelecionado').textContent = '🧠';
  document.getElementById('inputNome').value = '';
  document.getElementById('inputDesc').value = '';
  document.getElementById('selectCategoria').value = 'Geral';

  const picker = document.getElementById('emojiPicker');
  picker.innerHTML = EMOJIS.map(e =>
    `<button class="emoji-opt ${e === '🧠' ? 'active' : ''}" onclick="selecionarEmoji(this, '${e}')">${e}</button>`
  ).join('');

  lucide.createIcons();
}

function fecharModal() {
  document.getElementById('modalCriarGrupo').classList.add('hidden');
}

function selecionarEmoji(btn, emoji) {
  document.querySelectorAll('.emoji-opt').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('emojiSelecionado').textContent = emoji;
}

async function criarGrupo() {
  const nome = document.getElementById('inputNome').value.trim();
  const descricao = document.getElementById('inputDesc').value.trim();
  const emoji = document.getElementById('emojiSelecionado').textContent;
  const categoria = document.getElementById('selectCategoria').value || 'Geral';

  if (!nome) { mostrarAviso('Dê um nome ao grupo!', 'error'); return; }

  const btn = document.getElementById('btnSalvarGrupo');
  btn.disabled = true;
  btn.innerHTML = '<i data-lucide="loader"></i> Criando...';
  lucide.createIcons();

  const { data, error } = await window.supabase
    .from('grupos')
    .insert({ nome, descricao, emoji, categoria, criador_id: usuarioAtual.id })
    .select()
    .single();

  if (error) {
    mostrarAviso('Erro ao criar grupo: ' + error.message, 'error');
  } else {
    // Entra automaticamente no grupo criado
    await window.supabase
      .from('group_members')
      .insert({ group_id: data.id, user_id: usuarioAtual.id });

    mostrarAviso('Grupo criado com sucesso! 🎉', 'success');
    fecharModal();
    await carregarGrupos();
    await carregarMeusGrupos();
  }

  btn.disabled = false;
  btn.innerHTML = '<i data-lucide="plus"></i> Criar grupo';
  lucide.createIcons();
}

// Fecha modal ao clicar fora
document.getElementById('modalCriarGrupo')?.addEventListener('click', function(e) {
  if (e.target === this) fecharModal();
});

// ===== EXCLUIR GRUPO (CRIADOR) =====
async function excluirGrupo(grupoId, nomeGrupo) {
  if (!confirm(`Tem certeza que deseja excluir o grupo "${nomeGrupo}"?\nEsta ação não pode ser desfeita e todos os membros serão removidos.`)) return;

  const { error } = await window.supabase.from('grupos').delete().eq('id', grupoId);
  if (error) {
    mostrarAviso('Erro ao excluir grupo: ' + error.message, 'error');
  } else {
    mostrarAviso('Grupo excluído.', 'success');
    todosGrupos = todosGrupos.filter(g => g.id !== grupoId);
    renderGrupos(categoriaAtiva === 'Todos' ? todosGrupos : todosGrupos.filter(g => g.categoria === categoriaAtiva));
    await carregarMeusGrupos();
  }
}

// ===== EXCLUIR GRUPO (ADMIN) =====
function abrirModalExclusaoAdm(grupoId, criadorId, nomeGrupo) {
  grupoParaExcluirAdm = { grupoId, criadorId, nomeGrupo };
  document.getElementById('admDeleteNomeGrupo').textContent = nomeGrupo;
  document.getElementById('admDeleteMotivo').value = '';
  document.getElementById('modalExcluirAdm').classList.remove('hidden');
}

function fecharModalExcluirAdm() {
  document.getElementById('modalExcluirAdm').classList.add('hidden');
  grupoParaExcluirAdm = null;
}

async function confirmarExclusaoAdm() {
  const motivo = document.getElementById('admDeleteMotivo').value.trim();
  if (!motivo) { mostrarAviso('Informe o motivo da exclusão.', 'error'); return; }
  if (!grupoParaExcluirAdm) return;

  const { grupoId, criadorId, nomeGrupo } = grupoParaExcluirAdm;
  const btn = document.getElementById('btnConfirmarExcluirAdm');
  btn.disabled = true;
  btn.textContent = 'Excluindo...';

  if (criadorId) {
    const mensagem = `⚠️ Seu grupo "${nomeGrupo}" foi removido pela administração do BrainHUB.\n\nMotivo: ${motivo}\n\nSe tiver dúvidas, entre em contato com a equipe.`;
    await window.supabase.rpc('enviar_mensagem_adm', {
      p_receiver_id: criadorId,
      p_texto: mensagem
    });
  }

  const { error } = await window.supabase.from('grupos').delete().eq('id', grupoId);

  if (error) {
    mostrarAviso('Erro ao excluir grupo: ' + error.message, 'error');
  } else {
    mostrarAviso('Grupo excluído e criador notificado via mensagem.', 'success');
    fecharModalExcluirAdm();
    todosGrupos = todosGrupos.filter(g => g.id !== grupoId);
    renderGrupos(categoriaAtiva === 'Todos' ? todosGrupos : todosGrupos.filter(g => g.categoria === categoriaAtiva));
    await carregarMeusGrupos();
  }

  btn.disabled = false;
  btn.textContent = 'Excluir grupo';
}

document.getElementById('modalExcluirAdm')?.addEventListener('click', function(e) {
  if (e.target === this) fecharModalExcluirAdm();
});

init();
