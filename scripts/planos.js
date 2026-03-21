// scripts/planos.js
lucide.createIcons();

const PRO_KEY = 'brainhub_pro';

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
function verificarStatus() {
    const pro = localStorage.getItem(PRO_KEY) === 'true';
    const statusEl = document.getElementById('planoStatus');
    const btnAssinar = document.getElementById('btnAssinar');
    const btnFree = document.querySelector('.btn-free');

    if (pro) {
        statusEl.innerHTML = `<span class="status-pro"><i data-lucide="crown"></i> Você já é Pro! Obrigado pelo apoio 🎉</span>`;
        btnAssinar.innerHTML = `<i data-lucide="check"></i> Você já é assinante Pro`;
        btnAssinar.style.background = 'linear-gradient(135deg, #20d3ae, #10a47f)';
        btnAssinar.disabled = true;
        btnFree.textContent = 'Plano anterior';
        lucide.createIcons();
    }
}

// ===== MODAL =====
const overlay = document.getElementById('modalOverlay');
const btnAssinar = document.getElementById('btnAssinar');
const btnClose = document.getElementById('modalClose');

btnAssinar?.addEventListener('click', () => {
    if (localStorage.getItem(PRO_KEY) === 'true') return;
    overlay.classList.remove('hidden');
    lucide.createIcons();
});

btnClose?.addEventListener('click', () => overlay.classList.add('hidden'));

overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.add('hidden');
});

// Máscara do cartão
document.getElementById('modalCartao')?.addEventListener('input', function () {
    let v = this.value.replace(/\D/g, '').substring(0, 16);
    this.value = v.replace(/(.{4})/g, '$1 ').trim();
});

// Máscara validade
document.getElementById('modalValidade')?.addEventListener('input', function () {
    let v = this.value.replace(/\D/g, '').substring(0, 4);
    if (v.length > 2) v = v.substring(0, 2) + '/' + v.substring(2);
    this.value = v;
});

// Confirmar assinatura
document.getElementById('btnConfirmar')?.addEventListener('click', () => {
    const nome     = document.getElementById('modalNome').value.trim();
    const cartao   = document.getElementById('modalCartao').value.trim();
    const validade = document.getElementById('modalValidade').value.trim();
    const cvv      = document.getElementById('modalCvv').value.trim();

    if (!nome || cartao.length < 19 || validade.length < 5 || cvv.length < 3) {
        mostrarToast('Preencha todos os dados do cartão.', 'error');
        return;
    }

    // Simula processamento
    const btn = document.getElementById('btnConfirmar');
    btn.innerHTML = '<i data-lucide="loader-2"></i> Processando...';
    btn.disabled = true;
    lucide.createIcons();

    setTimeout(() => {
        localStorage.setItem(PRO_KEY, 'true');
        overlay.classList.add('hidden');
        mostrarToast('🎉 Bem-vindo ao BrainHUB Pro! Seu plano está ativo.', 'success');
        verificarStatus();
        btn.innerHTML = '<i data-lucide="lock"></i> Confirmar assinatura — R$ 14,90/mês';
        btn.disabled = false;
        lucide.createIcons();
    }, 1800);
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