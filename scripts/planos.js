// scripts/planos.js
lucide.createIcons();

const SUPABASE_FN_URL = 'https://ilfhsgecffxusgimopmx.supabase.co/functions/v1/mp-criar-checkout';

// ===== TOAST =====
function mostrarToast(msg, tipo = 'success') {
    let c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${tipo}`;
    t.innerText = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

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
        if (!session) {
            window.location.href = 'login.html';
            return;
        }

        const res = await fetch(SUPABASE_FN_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
            },
        });

        const json = await res.json();
        if (!res.ok || !json.url) throw new Error(json.error?.message || 'Erro ao criar checkout');

        window.location.href = json.url;
    } catch (e) {
        mostrarToast('Erro ao iniciar checkout. Tente novamente.', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="zap"></i> Assinar Pro — R$ 14,90/mês';
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
