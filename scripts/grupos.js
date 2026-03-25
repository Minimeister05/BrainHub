// scripts/grupos.js
lucide.createIcons();

let usuarioAtual = null;

async function init() {
  if (!window.supabase) { setTimeout(init, 200); return; }
  const { data: { user } } = await window.supabase.auth.getUser();
  usuarioAtual = user;
  if (!user) return;

  // Carrega grupos que o usuário já participa
  const { data: memberships } = await window.supabase
    .from('group_members').select('group_id').eq('user_id', user.id);
  const meuGrupos = new Set((memberships || []).map(m => m.group_id));

  // Atualiza todos os botões de grupo com estado correto
  document.querySelectorAll('[data-group-id]').forEach(btn => {
    const gid = btn.dataset.groupId;
    if (meuGrupos.has(gid)) {
      btn.textContent = 'Participando';
      btn.classList.add('participando');
    }
    btn.addEventListener('click', () => toggleGrupo(btn, gid, meuGrupos));
  });
}

async function toggleGrupo(btn, groupId, meuGrupos) {
  if (!usuarioAtual) return;
  const participando = meuGrupos.has(groupId);
  btn.disabled = true;

  if (participando) {
    await window.supabase.from('group_members').delete()
      .eq('user_id', usuarioAtual.id).eq('group_id', groupId);
    meuGrupos.delete(groupId);
    btn.textContent = 'Participar';
    btn.classList.remove('participando');
    mostrarAviso('Você saiu do grupo.', 'info');
  } else {
    await window.supabase.from('group_members').insert({
      user_id: usuarioAtual.id, group_id: groupId
    });
    meuGrupos.add(groupId);
    btn.textContent = 'Participando';
    btn.classList.add('participando');
    mostrarAviso('Você entrou no grupo!', 'success');
  }
  btn.disabled = false;
}

// ===== CRIAR GRUPO =====
document.getElementById('btnCriarGrupo')?.addEventListener('click', () => {
  mostrarAviso('Criação de grupos estará disponível em breve!', 'info');
});

// ===== CATEGORIAS =====
function setCategoria(btn) {
  document.querySelectorAll('.categoria-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
}

init();
