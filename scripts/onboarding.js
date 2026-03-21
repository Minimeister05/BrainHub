lucide.createIcons();

let stepAtual = 1;
let corSelecionada = '';

function irParaStep(numero) {
    document.getElementById(`step${stepAtual}`).classList.add('hidden');
    document.getElementById(`step${numero}`).classList.remove('hidden');

    const card = document.getElementById(`step${numero}`);
    card.style.animation = 'none';
    card.offsetHeight;
    card.style.animation = '';

    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.querySelector(`.step[data-step="${numero}"]`).classList.add('active');

    stepAtual = numero;
}

document.getElementById('btnStep1').addEventListener('click', () => {
    const sessao = JSON.parse(localStorage.getItem('brainhub_usuario_logado') || 'null');
    if (sessao?.nome) {
        const input = document.getElementById('onbNome');
        if (!input.value) input.value = sessao.nome;
    }
    irParaStep(2);
});

document.getElementById('btnStep2').addEventListener('click', () => {
    const nome = document.getElementById('onbNome').value.trim();
    if (!nome) {
        document.getElementById('onbNome').focus();
        document.getElementById('onbNome').style.borderColor = '#ff4b4b';
        return;
    }
    document.getElementById('onbNome').style.borderColor = '';

    const iniciais = nome.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
    document.getElementById('avatarPreview').textContent = iniciais;

    irParaStep(3);
});

document.getElementById('btnBack2').addEventListener('click', () => irParaStep(1));
document.getElementById('btnBack3').addEventListener('click', () => irParaStep(2));

document.querySelectorAll('.color-opt').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.color-opt').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        corSelecionada = btn.dataset.cor;
        document.getElementById('avatarPreview').style.background = btn.style.background;
    });
});

document.getElementById('onbBio').addEventListener('input', function () {
    document.getElementById('onbBioCount').textContent = `${this.value.length}/160`;
});

document.getElementById('btnFinish').addEventListener('click', () => {
    const nome    = document.getElementById('onbNome').value.trim();
    const curso   = document.getElementById('onbCurso').value.trim();
    const periodo = document.getElementById('onbPeriodo').value;
    const bio     = document.getElementById('onbBio').value.trim();

    // CORRIGIDO: salva com o email do usuário
    const sessaoAtual = JSON.parse(localStorage.getItem('brainhub_usuario_logado') || 'null');
    localStorage.setItem(`brainhub_perfil_${sessaoAtual.email}`, JSON.stringify({
        nome, curso, periodo, bio, corAvatar: corSelecionada
    }));

    sessaoAtual.onboardingFeito = true;
    localStorage.setItem('brainhub_usuario_logado', JSON.stringify(sessaoAtual));

    const card = document.querySelector('.onboarding-card:not(.hidden)');
    card.style.opacity = '0';
    card.style.transform = 'scale(0.96)';
    card.style.transition = '0.4s';

    setTimeout(() => {
        window.location.href = 'home.html';
    }, 400);
});

const sessao = JSON.parse(localStorage.getItem('brainhub_usuario_logado') || 'null');
if (sessao?.nome) {
    const iniciais = sessao.nome.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
    document.getElementById('welcomeAvatar').textContent = iniciais;
}