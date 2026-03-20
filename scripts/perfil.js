// scripts/perfil.js
lucide.createIcons();

const PERFIL_KEY = 'brainhub_perfil';

// ===== UTILITÁRIOS =====
function gerarIniciais(nome) {
    return nome.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
}

function mostrarToast(mensagem, tipo = 'success') {
    let container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.innerText = mensagem;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// ===== CARREGA DADOS =====
function carregarDados() {
    const sessao = JSON.parse(localStorage.getItem('brainhub_usuario_logado') || 'null');
    const perfil = JSON.parse(localStorage.getItem(PERFIL_KEY) || 'null');

    // Preenche info da conta
    if (sessao) {
        document.getElementById('infoEmail').textContent = sessao.email || '—';
    }

    // Valores atuais (perfil salvo ou fallback da sessão)
    const nome     = perfil?.nome     || sessao?.nome || '';
    const curso    = perfil?.curso    || '';
    const periodo  = perfil?.periodo  || '';
    const bio      = perfil?.bio      || '';
    const corAvatar = perfil?.corAvatar || '';

    // Preenche os campos
    document.getElementById('inputNome').value    = nome;
    document.getElementById('inputCurso').value   = curso;
    document.getElementById('inputPeriodo').value = periodo;
    document.getElementById('inputBio').value     = bio;
    document.getElementById('bioCount').textContent = `${bio.length}/160`;

    // Marca a cor selecionada
    document.querySelectorAll('.color-opt').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.cor === corAvatar);
    });

    // Atualiza preview do card
    atualizarPreview({ nome, curso, periodo, bio, corAvatar });
}

// ===== PREVIEW AO VIVO =====
function atualizarPreview({ nome, curso, periodo, bio, corAvatar }) {
    const iniciais = gerarIniciais(nome || '?');

    const avatarEl = document.getElementById('perfilAvatar');
    avatarEl.textContent = iniciais;
    // Limpa classes de cor antigas e aplica a nova
    avatarEl.className = 'perfil-avatar' + (corAvatar ? ` ${corAvatar}` : '');

    document.getElementById('perfilNome').textContent  = nome  || '—';
    document.getElementById('perfilCurso').textContent = [curso, periodo].filter(Boolean).join(' • ') || '—';
    document.getElementById('perfilBio').textContent   = bio   || '';
}

// ===== SALVA PERFIL =====
function salvarPerfil() {
    const nome      = document.getElementById('inputNome').value.trim();
    const curso     = document.getElementById('inputCurso').value.trim();
    const periodo   = document.getElementById('inputPeriodo').value;
    const bio       = document.getElementById('inputBio').value.trim();
    const corAvatar = document.querySelector('.color-opt.selected')?.dataset.cor || '';

    if (!nome) {
        mostrarToast('Por favor, insira seu nome.', 'error');
        document.getElementById('inputNome').focus();
        return;
    }

    localStorage.setItem(PERFIL_KEY, JSON.stringify({ nome, curso, periodo, bio, corAvatar }));

    atualizarPreview({ nome, curso, periodo, bio, corAvatar });
    mostrarToast('Perfil salvo com sucesso! ✨', 'success');

    // Anima o botão salvar
    const btn = document.getElementById('btnSalvar');
    btn.textContent = '✓ Salvo!';
    btn.style.background = 'linear-gradient(135deg, #20d3ae, #10a47f)';
    setTimeout(() => {
        btn.innerHTML = '<i data-lucide="check"></i> Salvar Alterações';
        btn.style.background = '';
        lucide.createIcons();
    }, 2000);
}

// ===== EVENTOS =====

// Preview em tempo real ao digitar
['inputNome', 'inputCurso', 'inputBio'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
        atualizarPreview({
            nome:      document.getElementById('inputNome').value,
            curso:     document.getElementById('inputCurso').value,
            periodo:   document.getElementById('inputPeriodo').value,
            bio:       document.getElementById('inputBio').value,
            corAvatar: document.querySelector('.color-opt.selected')?.dataset.cor || ''
        });
    });
});

document.getElementById('inputPeriodo').addEventListener('change', () => {
    atualizarPreview({
        nome:      document.getElementById('inputNome').value,
        curso:     document.getElementById('inputCurso').value,
        periodo:   document.getElementById('inputPeriodo').value,
        bio:       document.getElementById('inputBio').value,
        corAvatar: document.querySelector('.color-opt.selected')?.dataset.cor || ''
    });
});

// Contador de bio
document.getElementById('inputBio').addEventListener('input', function () {
    document.getElementById('bioCount').textContent = `${this.value.length}/160`;
});

// Seleção de cor
document.querySelectorAll('.color-opt').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.color-opt').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        atualizarPreview({
            nome:      document.getElementById('inputNome').value,
            curso:     document.getElementById('inputCurso').value,
            periodo:   document.getElementById('inputPeriodo').value,
            bio:       document.getElementById('inputBio').value,
            corAvatar: btn.dataset.cor
        });
    });
});

// Salvar
document.getElementById('btnSalvar').addEventListener('click', salvarPerfil);

// Enter no nome ou curso salva
['inputNome', 'inputCurso'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
        if (e.key === 'Enter') salvarPerfil();
    });
});

// Botão editar (scroll para o form)
document.getElementById('btnEditarPerfil').addEventListener('click', () => {
    document.getElementById('inputNome').focus();
    document.querySelector('.perfil-main').scrollTo({ top: 0, behavior: 'smooth' });
});

// Sair
document.getElementById('btnSair').addEventListener('click', () => {
    localStorage.removeItem('brainhub_usuario_logado');
    window.location.href = 'login.html';
});

// ===== INIT =====
carregarDados();