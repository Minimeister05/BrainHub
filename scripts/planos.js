// scripts/planos.js
lucide.createIcons();

const SUPABASE_FN = 'https://ilfhsgecffxusgimopmx.supabase.co/functions/v1';

const PLANOS = {
  mensal:  { price: 'price_1TMHRX2I5hrAqSRjOAxxXuBZ', modo: 'subscription', label: 'Assinar Pro — R$ 14,90/mês',    valor: 'R$ 14,90', periodo: '/ mês',   desc: null,                                cancelText: 'Cancele a qualquer momento • Sem fidelidade' },
  anual:   { price: 'price_1TMHRX2I5hrAqSRjZqlxp4WI', modo: 'subscription', label: 'Assinar Pro — R$ 149,00/ano',   valor: 'R$ 149,00', periodo: '/ ano',  desc: 'Equivale a <strong>R$ 12,42/mês</strong> — economize 2 meses', cancelText: 'Cancele a qualquer momento • Sem fidelidade' },
  avulso:  { price: 'price_1TMHRX2I5hrAqSRjaBMGf8v5', modo: 'payment',      label: 'Comprar Pro — R$ 14,90 único',  valor: 'R$ 14,90', periodo: 'único',   desc: null,                                cancelText: 'Pagamento único • Acesso permanente ao Pro' },
};

let planoSelecionado = 'mensal';

// ===== TOAST =====
function mostrarToast(msg, tipo = 'success') {
  let c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${tipo}`;
  t.innerText = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

// ===== TOGGLE PLANOS =====
document.querySelectorAll('.toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    planoSelecionado = btn.dataset.plano;
    const p = PLANOS[planoSelecionado];
    document.getElementById('precoValor').textContent = p.valor;
    document.getElementById('precoPeriodo').textContent = p.periodo;
    const descEl = document.getElementById('precoAnualDesc');
    if (p.desc) { descEl.innerHTML = p.desc; descEl.style.display = ''; }
    else descEl.style.display = 'none';
    const btnAssinar = document.getElementById('btnAssinar');
    if (btnAssinar && !btnAssinar.disabled) {
      btnAssinar.innerHTML = `<i data-lucide="zap"></i> ${p.label}`;
    }
    document.getElementById('cancelText').textContent = p.cancelText;
    lucide.createIcons();
  });
});

// ===== STATUS PRO =====
async function verificarStatus() {
  const btnAssinar = document.getElementById('btnAssinar');
  const btnFree = document.querySelector('.btn-free');
  const statusEl = document.getElementById('planoStatus');

  const { data: { user } } = await window.supabase.auth.getUser();
  if (!user) return;

  const { data: perfil } = await window.supabase
    .from('profiles').select('is_pro').eq('id', user.id).single();

  if (perfil?.is_pro) {
    if (statusEl) statusEl.innerHTML = `<span class="status-pro"><i data-lucide="crown"></i> Você já é Pro! Obrigado pelo apoio 🎉</span>`;
    if (btnAssinar) {
      btnAssinar.innerHTML = `<i data-lucide="check"></i> Você já é assinante Pro`;
      btnAssinar.style.background = 'linear-gradient(135deg, #20d3ae, #10a47f)';
      btnAssinar.disabled = true;
    }
    if (btnFree) btnFree.textContent = 'Plano anterior';
    // Mostra botão de cancelar
    const btnCancelar = document.getElementById('btnCancelarPlano');
    if (btnCancelar) btnCancelar.style.display = 'flex';
    lucide.createIcons();
  }
}

// ===== ASSINAR =====
document.getElementById('btnAssinar')?.addEventListener('click', async () => {
  const btn = document.getElementById('btnAssinar');
  if (btn.disabled) return;

  btn.disabled = true;
  btn.innerHTML = '<i data-lucide="loader-2"></i> Aguarde...';
  lucide.createIcons();

  try {
    const { data: { session } } = await window.supabase.auth.getSession();
    if (!session) { window.location.href = 'login.html'; return; }

    const p = PLANOS[planoSelecionado];
    const res = await fetch(`${SUPABASE_FN}/stripe-criar-checkout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ price_id: p.price, modo: p.modo }),
    });

    const json = await res.json();
    if (!res.ok || !json.url) throw new Error(json.error || 'Erro ao criar checkout');
    window.location.href = json.url;
  } catch (e) {
    mostrarToast('Erro ao iniciar checkout. Tente novamente.', 'error');
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="zap"></i> ${PLANOS[planoSelecionado].label}`;
    lucide.createIcons();
  }
});

// ===== CANCELAR =====
document.getElementById('btnCancelarPlano')?.addEventListener('click', async () => {
  const confirmado = await confirmarExclusao('Tem certeza que deseja cancelar sua assinatura Pro? Você mantém o acesso até o fim do período pago.');
  if (!confirmado) return;

  const btn = document.getElementById('btnCancelarPlano');
  btn.disabled = true;
  btn.innerHTML = '<i data-lucide="loader-2"></i> Cancelando...';
  lucide.createIcons();

  try {
    const { data: { session } } = await window.supabase.auth.getSession();
    const res = await fetch('https://ilfhsgecffxusgimopmx.supabase.co/functions/v1/stripe-cancelar', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erro ao cancelar');
    mostrarToast('Assinatura cancelada. Você mantém o Pro até o fim do período pago.', 'success');
    btn.innerHTML = '<i data-lucide="check"></i> Assinatura cancelada';
  } catch (e) {
    mostrarToast('Erro ao cancelar. Tente novamente.', 'error');
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="x-circle"></i> Cancelar minha assinatura';
    lucide.createIcons();
  }
});

// ===== FAQ ACCORDION =====
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.parentElement;
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});

// ===== INIT =====
verificarStatus();
