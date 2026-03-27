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

document.getElementById('btnFinish').addEventListener('click', async () => {
    const nome      = document.getElementById('onbNome').value.trim();
    const curso     = document.getElementById('onbCurso').value.trim();
    const faculdade = document.getElementById('onbFaculdade').value.trim();
    const periodo   = document.getElementById('onbPeriodo').value;
    const bio       = document.getElementById('onbBio').value.trim();

    // Salva no localStorage como antes
    const sessaoAtual = JSON.parse(localStorage.getItem('brainhub_usuario_logado') || 'null');
    if (sessaoAtual) {
        localStorage.setItem(`brainhub_perfil_${sessaoAtual.email}`, JSON.stringify({
            nome, curso, faculdade, periodo, bio, corAvatar: corSelecionada
        }));
        sessaoAtual.onboardingFeito = true;
        localStorage.setItem('brainhub_usuario_logado', JSON.stringify(sessaoAtual));
    }

    // Salva no Supabase também
    if (window.supabase) {
        const { data: { user } } = await window.supabase.auth.getUser();
        if (user) {
            const { error } = await window.supabase.from('profiles').upsert({
                id: user.id,
                nome,
                curso,
                faculdade,
                periodo,
                bio,
                cor_avatar: corSelecionada
            });
            if (error) {
                console.error('Erro ao salvar perfil no Supabase:', error);
                alert('Erro ao salvar perfil: ' + error.message);
                return;
            }
        }
    }

    // Envia sugestões se houver (não bloqueia o redirect)
    if (window.supabase) {
        const { data: { user: userAtual } } = await window.supabase.auth.getUser();
        enviarSugestoes(userAtual, nome).catch(console.warn);
    }

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

// Mostrar/ocultar campos de sugestão
document.getElementById('chkCursoSugestao').addEventListener('change', function () {
    document.getElementById('onbCursoSugestao').classList.toggle('hidden', !this.checked);
});
document.getElementById('chkFaculdadeSugestao').addEventListener('change', function () {
    document.getElementById('onbFaculdadeSugestao').classList.toggle('hidden', !this.checked);
});

async function enviarSugestoes(user, nome) {
    const sugestoes = [];

    const cursoSugestao = document.getElementById('onbCursoSugestao').value.trim();
    const faculdadeSugestao = document.getElementById('onbFaculdadeSugestao').value.trim();

    if (document.getElementById('chkCursoSugestao').checked && cursoSugestao) {
        sugestoes.push({ tipo: 'curso', sugestao: cursoSugestao });
    }
    if (document.getElementById('chkFaculdadeSugestao').checked && faculdadeSugestao) {
        sugestoes.push({ tipo: 'faculdade', sugestao: faculdadeSugestao });
    }

    if (!sugestoes.length) return;

    // Salva no Supabase
    for (const s of sugestoes) {
        await window.supabase.from('sugestoes').insert({
            tipo: s.tipo,
            sugestao: s.sugestao,
            user_id: user?.id || null,
            user_email: user?.email || '',
            user_nome: nome
        });
    }

    // Monta mensagem do email
    const linhas = sugestoes.map(s =>
        `• ${s.tipo.toUpperCase()}: "${s.sugestao}"`
    ).join('\n');

    const mensagem =
        `Novas sugestões recebidas durante o onboarding:\n\n${linhas}\n\n` +
        `Usuário: ${nome}\n` +
        `Email: ${user?.email || 'não identificado'}\n` +
        `ID: ${user?.id || 'n/a'}`;

    // Envia via EmailJS
    try {
        await emailjs.send('service_9u04ixa', 'template_7ziq0rg', {
            to_email: 'brainhubsuporte@gmail.com',
            subject: `[BrainHUB] Sugestão de ${sugestoes.map(s => s.tipo).join(' e ')}`,
            message: mensagem,
            from_name: 'BrainHUB Sistema'
        });
    } catch (e) {
        console.warn('EmailJS falhou (sugestão salva no banco mesmo assim):', e);
    }
}