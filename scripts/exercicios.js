lucide.createIcons()

// ===== TÍTULOS =====
const TITULOS = [
  { pontos: 35000, id: 'turing',      label: 'Turing',       cor: '#7c5cff' },
  { pontos: 20000, id: 'einstein',    label: 'Einstein',     cor: '#f5c542' },
  { pontos: 10000, id: 'genio_local', label: 'Gênio Local',  cor: '#ff6ec7' },
  { pontos:  6000, id: 'nerd',        label: 'Nerd',         cor: '#26d0a8' },
  { pontos:  3000, id: 'cientista',   label: 'Cientista',    cor: '#6d8bff' },
  { pontos:  1500, id: 'pesquisador', label: 'Pesquisador',  cor: '#ffb144' },
  { pontos:   700, id: 'monitor',     label: 'Monitor',      cor: '#bcaeff' },
  { pontos:   300, id: 'dedicado',    label: 'Dedicado',     cor: '#d7d7de' },
  { pontos:   100, id: 'curioso',     label: 'Curioso',      cor: '#d7d7de' },
]
const TITULO_PRO = { id: 'pro', label: '👑 Pro', cor: '#f5c542' }

function getTituloAtual(pontos) {
  return TITULOS.find(t => pontos >= t.pontos) || null
}

function getTitulosDesbloqueados(pontos, isPro) {
  const lista = TITULOS.filter(t => pontos >= t.pontos)
  if (isPro) lista.unshift(TITULO_PRO)
  return lista
}

function calcularPontos(tentativas, dificuldade, isPro) {
  const base = isPro ? 10 : (tentativas === 1 ? 10 : tentativas === 2 ? 6 : 3)
  const mult = dificuldade === 'dificil' ? 2 : dificuldade === 'media' ? 1.5 : 1
  return Math.round(base * mult)
}

// ===== ESTADO =====
let usuarioAtual = null
let isPro = false
let pontosAtuais = 0
let materiaSelecionada = ''
let difSelecionada = ''
let termoBusca = ''
let respostasFeitas = {} // exercicio_id -> { correto, tentativas }

// ===== INIT =====
async function init() {
  const { data: { user } } = await window.supabase.auth.getUser()
  if (!user) { window.location.href = 'login.html'; return }
  usuarioAtual = user

  const { data: perfil } = await window.supabase
    .from('profiles').select('nome, cor_avatar, is_pro, pontos, titulo_ativo, curso').eq('id', user.id).single()

  isPro = perfil?.is_pro === true
  pontosAtuais = perfil?.pontos || 0

  // Sidebar usuário
  const iniciais = (perfil?.nome || 'U').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
  const av = document.getElementById('exAvatar')
  av.textContent = iniciais
  if (perfil?.cor_avatar) av.classList.add(perfil.cor_avatar)
  document.getElementById('exNome').textContent = perfil?.nome || '—'

  const tituloAtivo = perfil?.titulo_ativo
  const elTitulo = document.getElementById('exTituloAtivo')
  if (tituloAtivo) {
    const t = tituloAtivo === 'pro' ? TITULO_PRO : TITULOS.find(x => x.id === tituloAtivo)
    if (t) { elTitulo.textContent = t.label; elTitulo.style.color = t.cor }
  }

  atualizarPontosSidebar()

  // Botão criar (só Pro)
  if (isPro) document.getElementById('exCriarBtn').style.display = 'flex'

  // Respostas já feitas
  const { data: resps } = await window.supabase
    .from('respostas_usuario').select('exercicio_id, correto, tentativas').eq('user_id', user.id)
  ;(resps || []).forEach(r => { respostasFeitas[r.exercicio_id] = r })

  await carregarFiltrosMateria(perfil?.curso || null)
  await carregarRanking()
  await carregarExercicios()
}

// ===== SIDEBAR =====
function atualizarPontosSidebar() {
  document.getElementById('exPontos').textContent = pontosAtuais.toLocaleString('pt-BR')

  const atual = getTituloAtual(pontosAtuais)
  const proximo = TITULOS.slice().reverse().find(t => t.pontos > pontosAtuais)

  const fill = document.getElementById('exProgressoFill')
  const texto = document.getElementById('exProgressoTexto')

  if (!proximo) {
    fill.style.width = '100%'
    texto.textContent = 'Título máximo atingido!'
    return
  }

  const anterior = getTituloAtual(pontosAtuais)
  const base = anterior ? anterior.pontos : 0
  const pct = Math.min(100, ((pontosAtuais - base) / (proximo.pontos - base)) * 100)
  fill.style.width = pct + '%'
  texto.textContent = `${proximo.label} em ${(proximo.pontos - pontosAtuais).toLocaleString('pt-BR')} pts`
}

// ===== RANKING =====
async function carregarRanking() {
  const { data } = await window.supabase
    .from('profiles')
    .select('id, nome, pontos, titulo_ativo, cor_avatar')
    .order('pontos', { ascending: false })
    .limit(10)

  const ul = document.getElementById('exRankingList')
  if (!data?.length) { ul.innerHTML = '<li>Sem dados ainda.</li>'; return }

  ul.innerHTML = data.map((u, i) => {
    const medalha = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
    const isEu = u.id === usuarioAtual?.id
    return `<li class="ex-rank-item ${isEu ? 'ex-rank-eu' : ''}">
      <span class="ex-rank-pos">${medalha}</span>
      <span class="ex-rank-nome">${u.nome || 'Usuário'}</span>
      <span class="ex-rank-pts">${(u.pontos || 0).toLocaleString('pt-BR')} pts</span>
    </li>`
  }).join('')
}

// ===== EXERCÍCIOS =====
async function carregarExercicios() {
  const lista = document.getElementById('exLista')
  lista.innerHTML = '<div class="ex-loading">Carregando...</div>'

  let query = window.supabase.from('exercicios')
    .select('*')
    .order('created_at', { ascending: false })

  if (materiaSelecionada) query = query.eq('materia', materiaSelecionada)
  if (difSelecionada) query = query.eq('dificuldade', difSelecionada)
  if (!isPro) query = query.eq('pro_only', false)
  if (termoBusca) query = query.or(`titulo.ilike.%${termoBusca}%,enunciado.ilike.%${termoBusca}%`)

  const { data: exercicios } = await query

  if (!exercicios?.length) {
    lista.innerHTML = '<div class="ex-empty"><i data-lucide="book-open"></i><p>Nenhum exercício encontrado.</p></div>'
    lucide.createIcons()
    return
  }

  lista.innerHTML = exercicios.map(ex => renderExercicio(ex)).join('')
  lucide.createIcons()

  // Eventos de resposta
  lista.querySelectorAll('.ex-alt-btn').forEach(btn => {
    btn.addEventListener('click', () => responder(btn))
  })
}

function renderExercicio(ex) {
  const feito = respostasFeitas[ex.id]
  const difLabel = { facil: 'Fácil', media: 'Média', dificil: 'Difícil' }[ex.dificuldade]
  const difClass = { facil: 'dif-facil', media: 'dif-media', dificil: 'dif-dificil' }[ex.dificuldade]

  const altsBloqueadas = feito?.correto ? 'disabled' : ''
  const alts = ex.alternativas.map(a => {
    let cls = 'ex-alt-btn'
    if (feito?.correto && a.letra === ex.resposta_correta) cls += ' correta'
    return `<button class="${cls}" data-exid="${ex.id}" data-letra="${a.letra}" data-correta="${ex.resposta_correta}" data-dif="${ex.dificuldade}" ${altsBloqueadas}>
      <span class="ex-alt-letra">${a.letra}</span>
      <span>${a.texto}</span>
    </button>`
  }).join('')

  const feedbackHtml = feito?.correto
    ? `<div class="ex-feedback correto"><i data-lucide="check-circle"></i> Correto! +${calcularPontos(feito.tentativas, ex.dificuldade, isPro)} pts (${feito.tentativas}ª tentativa)</div>`
    : feito ? `<div class="ex-feedback tentando"><i data-lucide="refresh-cw"></i> Tentativa ${feito.tentativas} — continue tentando!</div>` : ''

  const proBadge = ex.pro_only ? '<span class="ex-pro-badge"><i data-lucide="crown"></i> Pro</span>' : ''

  return `<div class="ex-card ${feito?.correto ? 'ex-card-resolvido' : ''}" id="excard-${ex.id}">
    <div class="ex-card-header">
      <div class="ex-card-meta">
        <span class="ex-materia-tag">${ex.materia}</span>
        <span class="ex-dif-tag ${difClass}">${difLabel}</span>
        ${proBadge}
      </div>
    </div>
    <h3 class="ex-card-titulo">${ex.titulo}</h3>
    <p class="ex-card-enunciado">${ex.enunciado}</p>
    <div class="ex-alts">${alts}</div>
    ${feedbackHtml}
  </div>`
}

// ===== RESPONDER =====
async function responder(btn) {
  const exId = btn.dataset.exid
  const letraSelecionada = btn.dataset.letra
  const letraCorreta = btn.dataset.correta
  const dificuldade = btn.dataset.dif
  const correto = letraSelecionada === letraCorreta

  const card = document.getElementById(`excard-${exId}`)
  const todos = card.querySelectorAll('.ex-alt-btn')

  // Marca visual da alternativa clicada
  btn.classList.add(correto ? 'correta' : 'errada')

  if (correto) {
    // Marca correta e bloqueia tudo
    todos.forEach(b => {
      b.disabled = true
      if (b.dataset.letra === letraCorreta) b.classList.add('correta')
    })

    const jaFeito = respostasFeitas[exId]
    const tentativas = jaFeito ? jaFeito.tentativas : 1
    const pontos = calcularPontos(tentativas, dificuldade, isPro)

    // Salva resposta
    if (jaFeito) {
      await window.supabase.from('respostas_usuario')
        .update({ correto: true, tentativas, pontos_ganhos: pontos })
        .eq('user_id', usuarioAtual.id).eq('exercicio_id', exId)
    } else {
      await window.supabase.from('respostas_usuario')
        .insert({ user_id: usuarioAtual.id, exercicio_id: exId, correto: true, tentativas, pontos_ganhos: pontos })
    }
    respostasFeitas[exId] = { correto: true, tentativas }

    // Atualiza pontos no banco
    pontosAtuais += pontos
    await window.supabase.from('profiles')
      .update({ pontos: pontosAtuais })
      .eq('id', usuarioAtual.id)

    // Verifica novo título
    await verificarTitulo()

    atualizarPontosSidebar()
    mostrarFeedback(card, true, pontos, tentativas)
    card.classList.add('ex-card-resolvido')
    await carregarRanking()

  } else {
    // Errou — registra tentativa
    setTimeout(() => btn.classList.remove('errada'), 800)

    const jaFeito = respostasFeitas[exId]
    const tentativas = (jaFeito?.tentativas || 0) + 1

    if (jaFeito) {
      await window.supabase.from('respostas_usuario')
        .update({ tentativas })
        .eq('user_id', usuarioAtual.id).eq('exercicio_id', exId)
    } else {
      await window.supabase.from('respostas_usuario')
        .insert({ user_id: usuarioAtual.id, exercicio_id: exId, correto: false, tentativas, pontos_ganhos: 0 })
    }
    respostasFeitas[exId] = { correto: false, tentativas }
    mostrarFeedback(card, false, 0, tentativas)
  }
}

function mostrarFeedback(card, correto, pontos, tentativas) {
  let fb = card.querySelector('.ex-feedback')
  if (!fb) { fb = document.createElement('div'); card.appendChild(fb) }
  if (correto) {
    fb.className = 'ex-feedback correto'
    fb.innerHTML = `<i data-lucide="check-circle"></i> Correto! +${pontos} pts`
  } else {
    fb.className = 'ex-feedback errado'
    fb.innerHTML = `<i data-lucide="x-circle"></i> Errado! Tente novamente. (tentativa ${tentativas})`
  }
  lucide.createIcons()
}

// ===== VERIFICAR TÍTULO DESBLOQUEADO =====
async function verificarTitulo() {
  const titulo = getTituloAtual(pontosAtuais)
  if (!titulo) return

  const { data: perfil } = await window.supabase
    .from('profiles').select('titulos_desbloqueados, titulo_ativo').eq('id', usuarioAtual.id).single()

  const desbloqueados = perfil?.titulos_desbloqueados || []
  const novos = TITULOS.filter(t => pontosAtuais >= t.pontos && !desbloqueados.includes(t.id)).map(t => t.id)

  if (novos.length) {
    const atualizados = [...new Set([...desbloqueados, ...novos])]
    const updates = { titulos_desbloqueados: atualizados }
    // Se ainda não tem título ativo, define o mais alto desbloqueado
    if (!perfil?.titulo_ativo) updates.titulo_ativo = titulo.id
    await window.supabase.from('profiles').update(updates).eq('id', usuarioAtual.id)

    // Avisa o usuário
    novos.forEach(id => {
      const t = TITULOS.find(x => x.id === id)
      if (t) mostrarToastTitulo(t)
    })
  }
}

function mostrarToastTitulo(titulo) {
  const toast = document.createElement('div')
  toast.className = 'ex-toast'
  toast.innerHTML = `<i data-lucide="award"></i> Novo título desbloqueado: <strong style="color:${titulo.cor}">${titulo.label}</strong>!`
  document.body.appendChild(toast)
  lucide.createIcons()
  setTimeout(() => toast.classList.add('visible'), 100)
  setTimeout(() => { toast.classList.remove('visible'); setTimeout(() => toast.remove(), 400) }, 4000)
}

// ===== FILTROS MATÉRIA =====
async function carregarFiltrosMateria(cursoUsuario) {
  const { data } = await window.supabase
    .from('exercicios')
    .select('materia')

  const materias = [...new Set((data || []).map(e => e.materia))].sort()

  // Adiciona o curso do usuário mesmo que não tenha exercícios ainda
  if (cursoUsuario && !materias.includes(cursoUsuario)) {
    materias.push(cursoUsuario)
    materias.sort()
  }

  const container = document.getElementById('exFiltros')
  container.innerHTML = materias.map(m =>
    `<button class="ex-filtro${m === cursoUsuario ? ' active' : ''}" data-materia="${m}">${m}</button>`
  ).join('')

  // Define matéria inicial como o curso do usuário (se tiver)
  if (cursoUsuario && materias.includes(cursoUsuario)) {
    materiaSelecionada = cursoUsuario
  }

  container.addEventListener('click', e => {
    const btn = e.target.closest('.ex-filtro')
    if (!btn) return
    container.querySelectorAll('.ex-filtro').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    materiaSelecionada = btn.dataset.materia
    carregarExercicios()
  })
}

let buscaTimeout = null
document.getElementById('exBusca')?.addEventListener('input', e => {
  clearTimeout(buscaTimeout)
  buscaTimeout = setTimeout(() => {
    termoBusca = e.target.value.trim()
    carregarExercicios()
  }, 350)
})

document.querySelectorAll('.ex-dif').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.ex-dif').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    difSelecionada = btn.dataset.dif
    carregarExercicios()
  })
})

// ===== MODAL CRIAR (Pro) =====
document.getElementById('exCriarBtn').addEventListener('click', () => {
  document.getElementById('exModalOverlay').classList.remove('hidden')
})
document.getElementById('exModalFechar').addEventListener('click', () => {
  document.getElementById('exModalOverlay').classList.add('hidden')
})
document.getElementById('exModalOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('exModalOverlay'))
    document.getElementById('exModalOverlay').classList.add('hidden')
})

document.getElementById('exSubmitBtn').addEventListener('click', async () => {
  const titulo    = document.getElementById('exTitulo').value.trim()
  const enunciado = document.getElementById('exEnunciado').value.trim()
  const materia   = document.getElementById('exMateria').value
  const dif       = document.getElementById('exDificuldade').value
  const proOnly   = document.getElementById('exProOnly').checked
  const correta   = document.querySelector('input[name="gabarito"]:checked')?.value

  const alts = ['A','B','C','D'].map(l => ({
    letra: l,
    texto: document.getElementById(`alt${l}`).value.trim()
  })).filter(a => a.texto)

  if (!titulo || !enunciado || alts.length < 2 || !correta) {
    alert('Preencha título, enunciado, ao menos 2 alternativas e marque a correta.')
    return
  }

  const btn = document.getElementById('exSubmitBtn')
  btn.disabled = true; btn.textContent = 'Publicando...'

  const { error } = await window.supabase.from('exercicios').insert({
    titulo, enunciado,
    alternativas: alts,
    resposta_correta: correta,
    materia, dificuldade: dif,
    pro_only: proOnly,
    criado_por: usuarioAtual.id
  })

  btn.disabled = false; btn.textContent = 'Publicar exercício'

  if (error) { alert('Erro ao publicar: ' + error.message); return }

  document.getElementById('exModalOverlay').classList.add('hidden')
  await carregarExercicios()
})

init()
