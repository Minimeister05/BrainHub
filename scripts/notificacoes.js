// scripts/notificacoes.js
lucide.createIcons();

// ===== TABS =====
document.querySelectorAll('.notif-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.notif-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    const tabAtual = tab.dataset.tab;
    const labels = { todas: 'todas', interacoes: 'interações', academicas: 'acadêmicas', sistema: 'sistema' };
    const filtroEl = document.getElementById('filtroAtivo');
    if (filtroEl) filtroEl.textContent = labels[tabAtual] || 'todas';

    document.querySelectorAll('.notif-card').forEach(card => {
      card.style.display = (tabAtual === 'todas' || card.dataset.tipo === tabAtual) ? '' : 'none';
    });

    document.querySelectorAll('.notif-group').forEach(grupo => {
      const visiveis = [...grupo.querySelectorAll('.notif-card')].filter(c => c.style.display !== 'none');
      grupo.style.display = visiveis.length > 0 ? '' : 'none';
    });
  });
});

// ===== MARCAR TODAS COMO LIDAS =====
document.getElementById('btnMarcarTodas')?.addEventListener('click', () => {
  document.querySelectorAll('.notif-card.nao-lida').forEach(card => {
    card.classList.remove('nao-lida');
    const dot = card.querySelector('.notif-dot');
    if (dot) dot.style.opacity = '0';
  });

  ['countTodas', 'countInter', 'countAcad'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = '0'; el.classList.add('zero'); }
  });

  const badge = document.getElementById('notifBadge');
  if (badge) badge.textContent = '0';

  document.getElementById('notifSubtitle').textContent = 'Tudo em dia por enquanto!';
});

// ===== LIMPAR LIDAS =====
document.getElementById('btnLimparLidas')?.addEventListener('click', () => {
  document.querySelectorAll('.notif-card:not(.nao-lida)').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateX(10px)';
    card.style.transition = 'all 0.3s ease';
    setTimeout(() => {
      card.remove();
      // Remove grupos vazios
      document.querySelectorAll('.notif-group').forEach(grupo => {
        if (grupo.querySelectorAll('.notif-card').length === 0) grupo.remove();
      });
    }, 300);
  });
});

// ===== MARCA CARD COMO LIDO AO CLICAR NOS BOTÕES =====
document.getElementById('notifList')?.addEventListener('click', e => {
  const btn = e.target.closest('.notif-btn');
  if (!btn) return;
  const card = btn.closest('.notif-card');
  if (card && card.classList.contains('nao-lida')) {
    card.classList.remove('nao-lida');
    const dot = card.querySelector('.notif-dot');
    if (dot) dot.style.opacity = '0';
    atualizarContagens();
  }
});

// ===== ATUALIZAR CONTAGENS =====
function atualizarContagens() {
  const naoLidas   = document.querySelectorAll('.notif-card.nao-lida');
  const interacoes = [...naoLidas].filter(c => c.dataset.tipo === 'interacoes').length;
  const academicas = [...naoLidas].filter(c => c.dataset.tipo === 'academicas').length;
  const total      = naoLidas.length;

  const countTodas = document.getElementById('countTodas');
  const countInter = document.getElementById('countInter');
  const countAcad  = document.getElementById('countAcad');
  const badge      = document.getElementById('notifBadge');

  if (countTodas) { countTodas.textContent = total;      countTodas.classList.toggle('zero', total === 0); }
  if (countInter) { countInter.textContent = interacoes; countInter.classList.toggle('zero', interacoes === 0); }
  if (countAcad)  { countAcad.textContent  = academicas; countAcad.classList.toggle('zero', academicas === 0); }
  if (badge)      badge.textContent = total;

  const subtitleEl = document.getElementById('notifSubtitle');
  if (subtitleEl) {
    subtitleEl.textContent = total === 0
      ? 'Tudo em dia por enquanto!'
      : `${total} nova${total > 1 ? 's' : ''} desde sua última visita`;
  }
}