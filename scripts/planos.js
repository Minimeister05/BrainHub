// scripts/planos.js
lucide.createIcons();

const SUPABASE_FN = 'https://ilfhsgecffxusgimopmx.supabase.co/functions/v1';

// ===== TOAST =====
function mostrarToast(msg, tipo = 'success') {
  let c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${tipo}`;
  t.innerText = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

const PRICE_IDS_VALIDOS = [
  'price_1TMHRX2I5hrAqSRjOAxxXuBZ',
  'price_1TMHRX2I5hrAqSRjZqlxp4WI',
];

// ===== ASSINAR (genérico pra qualquer botão) =====
async function iniciarCheckout(btn) {
  if (btn.disabled) return;
  const priceId = btn.dataset.price;
  const modo    = btn.dataset.modo || 'subscription';
  if (!PRICE_IDS_VALIDOS.includes(priceId)) {
    mostrarToast('Plano inválido.', 'error');
    return;
  }
  const labelOriginal = btn.innerHTML;

  btn.disabled = true;
  btn.innerHTML = '<i data-lucide="loader-2"></i> Aguarde...';
  lucide.createIcons();

  try {
    const { data: { session } } = await window.supabase.auth.getSession();
    if (!session) { window.location.href = 'login.html'; return; }

    const res = await fetch(`${SUPABASE_FN}/stripe-criar-checkout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ price_id: priceId, modo }),
    });

    const json = await res.json();
    if (!res.ok || !json.url) throw new Error(json.error || 'Erro ao criar checkout');
    window.location.href = json.url;
  } catch (e) {
    mostrarToast('Erro ao iniciar checkout. Tente novamente.', 'error');
    btn.disabled = false;
    btn.innerHTML = labelOriginal;
    lucide.createIcons();
  }
}

document.getElementById('btnAssinarMensal')?.addEventListener('click', (e) => iniciarCheckout(e.currentTarget));
document.getElementById('btnAssinarAnual')?.addEventListener('click',  (e) => iniciarCheckout(e.currentTarget));

// ===== STATUS PRO =====
async function verificarStatus() {
  const statusEl = document.getElementById('planoStatus');
  const { data: { user } } = await window.supabase.auth.getUser();
  if (!user) return;

  const { data: perfil } = await window.supabase
    .from('profiles').select('is_pro').eq('id', user.id).single();

  if (perfil?.is_pro) {
    if (statusEl) statusEl.innerHTML = `<span class="status-pro"><i data-lucide="crown"></i> Você já é Pro! Obrigado pelo apoio 🎉</span>`;

    ['btnAssinarMensal', 'btnAssinarAnual'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.innerHTML = `<i data-lucide="check"></i> Você já é assinante Pro`;
        btn.style.background = 'linear-gradient(135deg, #20d3ae, #10a47f)';
        btn.disabled = true;
      }
    });

    const btnCancelar = document.getElementById('btnCancelarPlano');
    if (btnCancelar) btnCancelar.style.display = 'flex';

    lucide.createIcons();
  }
}

// ===== CANCELAR =====
document.getElementById('btnCancelarPlano')?.addEventListener('click', async () => {
  const confirmado = await confirmar({
    icone: '⚠️',
    titulo: 'Cancelar assinatura',
    mensagem: 'Tem certeza? Você mantém o acesso Pro até o fim do período pago.',
    btnConfirmar: 'Sim, cancelar',
    btnCancelar: 'Voltar',
    danger: true,
  });
  if (!confirmado) return;

  const btn = document.getElementById('btnCancelarPlano');
  btn.disabled = true;
  btn.innerHTML = '<i data-lucide="loader-2"></i> Cancelando...';
  lucide.createIcons();

  try {
    const { data: { session } } = await window.supabase.auth.getSession();
    const res = await fetch(`${SUPABASE_FN}/stripe-cancelar`, {
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
