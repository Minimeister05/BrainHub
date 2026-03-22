// scripts/groups.js
lucide.createIcons();

// ===== PARTICIPAR / SAIR DE GRUPO =====
function toggleEntrar(btn) {
  const participando = btn.classList.contains('participando');
  btn.classList.toggle('participando');
  btn.textContent = participando ? 'Participar' : 'Participando ✓';
  mostrarAviso(participando ? 'Você saiu do grupo.' : 'Você entrou no grupo!', participando ? 'info' : 'success');
}

function toggleEntrarCard(btn) {
  const participando = btn.classList.contains('participando');
  btn.classList.toggle('participando');
  btn.textContent = participando ? 'Participar' : 'Participando';
  mostrarAviso(participando ? 'Você saiu do grupo.' : 'Você entrou no grupo!', participando ? 'info' : 'success');
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

// ===== VIEW FILTRO =====
function setViewFiltro(btn) {
  // Apenas feedback visual por enquanto
  document.querySelectorAll('.section-row .btn-ver-todos').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ===== SIDEBAR: ATIVAR ITEM =====
document.querySelectorAll('.grupo-sidebar-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.grupo-sidebar-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
  });
});

// ===== INIT =====
// Nada extra necessário — interações são inline por enquanto