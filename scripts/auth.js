function mostrarAviso(mensagem, tipo = 'info') {
    let container = document.getElementById('toast-container');
    
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.innerText = mensagem;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 4000);
}

document.querySelectorAll('.register-text a').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const destino = this.getAttribute('href');
        const card = document.querySelector('.login-card');
        
        if(card) {
            card.style.opacity = '0';
            card.style.transform = 'translateY(-20px)';
            card.style.transition = '0.4s';
        }

        setTimeout(() => {
            window.location.href = destino;
        }, 400);
    });
});

const usuariosFixos = [
    {nome: "RafaDEV", email: "rafa@gmail.com", senha: "1234"},
    {nome: "ErickDEV", email: "erick@gmail.com", senha: "5678"},
    {nome: "Erick Suckow", email: "suckowerick@gmail.com", senha: "pro123", pro: true}
];

// Seed de dados para contas fixas (roda uma vez)
(function seedDadosFixos() {
    const perfilKey = 'brainhub_perfil_suckowerick@gmail.com';
    if (!localStorage.getItem(perfilKey)) {
        localStorage.setItem(perfilKey, JSON.stringify({
            nome: "Erick Suckow",
            curso: "Ciência da Computação",
            faculdade: "PUCPR",
            periodo: "5º período",
            bio: "Desenvolvedor apaixonado por IA e sistemas distribuídos. Co-fundador do BrainHUB. 🚀",
            corAvatar: "av-pro-gold"
        }));
    }
})();

function getTodosUsuarios(){
    const cadastrados = JSON.parse(localStorage.getItem('usuarios_brainhub')) || [];
    return [...usuariosFixos, ...cadastrados];
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;
        const lista = getTodosUsuarios();

        const user = lista.find(u => u.email === email && u.senha === senha);

        if(user) {
            localStorage.setItem('brainhub_usuario_logado', JSON.stringify({ nome: user.nome, email: user.email }));
            // Define status Pro com base no usuário
            if (user.pro) {
                localStorage.setItem('brainhub_pro', 'true');
                localStorage.setItem(`brainhub_pro_${user.email}`, 'true');
            } else {
                localStorage.removeItem('brainhub_pro');
            }
            mostrarAviso(`Bem vindo, ${user.nome}!`, "success");
            setTimeout(() => {
                const chave = `brainhub_perfil_${user.email}`;
                const perfilExiste = localStorage.getItem(chave);
                if (!perfilExiste) {
                    window.location.href = "onboarding.html";
                } else {
                    window.location.href = "home.html";
                }
            }, 1200);
        } else {
            mostrarAviso("Email ou senha incorretos. Tente novamente!", "error");
        }
    });
}

const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const nome = document.getElementById('reg-nome').value;
        const email = document.getElementById('reg-email').value;
        const senha = document.getElementById('reg-senha').value;
        const lista = getTodosUsuarios();

        if (lista.some(u => u.email === email)) {
            mostrarAviso("Esse email já foi utilizado, tente outro!", "error");
            return;
        }

        const novosCadastros = JSON.parse(localStorage.getItem('usuarios_brainhub')) || [];
        novosCadastros.push({nome, email, senha});
        localStorage.setItem('usuarios_brainhub', JSON.stringify(novosCadastros));
        
        mostrarAviso("Cadastrado! Redirecionando para login...", "success");
        
        setTimeout(() => {
            window.location.href = "login.html";
        }, 1500);
    });
}

const suporteForm = document.getElementById('suporteForm');
if (suporteForm) {
    suporteForm.addEventListener('submit', (e) => {
        e.preventDefault();
        mostrarAviso("Mensagem enviada com sucesso! Logo entraremos em contato.", "success");
        suporteForm.reset();
    });
}

function getUsuarioLogado() {
    const sessao = JSON.parse(localStorage.getItem('brainhub_usuario_logado') || 'null');
    if (!sessao) return null;
    const perfil = JSON.parse(localStorage.getItem(`brainhub_perfil_${sessao.email}`) || 'null');
    return {
        nome: perfil?.nome || sessao.nome,
        email: sessao.email,
        curso: perfil?.curso || '',
        periodo: perfil?.periodo || '',
        bio: perfil?.bio || '',
        corAvatar: perfil?.corAvatar || '',
    };
}