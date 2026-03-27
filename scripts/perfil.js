lucide.createIcons()

let _isPro = false

function confirmarExclusao(mensagem = 'Esta ação não pode ser desfeita.') {
  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.className = 'confirm-overlay'
    overlay.innerHTML = `
      <div class="confirm-box">
        <div class="confirm-icon">🗑️</div>
        <h3>Excluir post</h3>
        <p>${mensagem}</p>
        <div class="confirm-actions">
          <button class="confirm-btn-cancel">Cancelar</button>
          <button class="confirm-btn-delete">Excluir</button>
        </div>
      </div>`
    document.body.appendChild(overlay)
    overlay.querySelector('.confirm-btn-cancel').addEventListener('click', () => { overlay.remove(); resolve(false) })
    overlay.querySelector('.confirm-btn-delete').addEventListener('click', () => { overlay.remove(); resolve(true) })
    overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); resolve(false) } })
  })
}

function gerarIniciais(nome) {
  return nome.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?'
}

function tempoRelativo(dataStr) {
  const diff = Date.now() - new Date(dataStr).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min}m atrás`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h atrás`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d atrás`
  return new Date(dataStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function mostrarToast(mensagem, tipo = 'success') {
  let container = document.getElementById('toast-container')
  const toast = document.createElement('div')
  toast.className = `toast ${tipo}`
  toast.innerText = mensagem
  container.appendChild(toast)
  setTimeout(() => toast.remove(), 4000)
}

const bannerMap = {
  '':                '',
  'av-green':        'bn-green',
  'av-pink':         'bn-pink',
  'av-orange':       'bn-orange',
  'av-blue':         'bn-blue',
  'av-red':          'bn-red',
  'av-pro-gold':     'bn-pro',
  'av-pro-teal':     'bn-teal',
  'av-pro-neon':     'bn-neon',
  'av-pro-ocean':    'bn-ocean',
  'av-pro-magenta':  'bn-magenta',
  'av-pro-sunset':   'bn-sunset',
  'av-pro-ruby':     'bn-pro',
  'av-pro-ice':      'bn-teal',
  'av-pro-lime':     'bn-neon',
  'av-pro-violet':   'bn-magenta',
  'av-pro-coral':    'bn-pro',
  'av-pro-mint':     'bn-teal',
}

function atualizarPreview({ nome, curso, faculdade, periodo, bio, corAvatar }) {
  const iniciais = gerarIniciais(nome || '?')
  const avatarEl = document.getElementById('perfilAvatar')
  avatarEl.textContent = iniciais
  avatarEl.className = 'perfil-avatar' + (corAvatar ? ` ${corAvatar}` : '')
  document.getElementById('perfilNome').textContent  = nome || '—'
  document.getElementById('perfilCurso').textContent = [curso, faculdade, periodo].filter(Boolean).join(' • ') || '—'
  document.getElementById('perfilBio').textContent   = bio  || ''

  // Banner: Pro sempre gold, outros seguem avatar
  const banner = document.getElementById('perfilBanner')
  const bnClass = _isPro ? 'bn-pro' : (bannerMap[corAvatar] || '')
  banner.className = 'perfil-banner' + (bnClass ? ` ${bnClass}` : '')
}

async function carregarDados() {
  const { data: { user } } = await window.supabase.auth.getUser()
  if (!user) { window.location.href = 'login.html'; return }

  const { data: perfil } = await window.supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const isPro = perfil?.is_pro === true
  _isPro = isPro
  if (isPro) localStorage.setItem('brainhub_pro', 'true')
  else localStorage.removeItem('brainhub_pro')

  const nome      = perfil?.nome      || user.user_metadata?.nome || ''
  const curso     = perfil?.curso     || ''
  const faculdade = perfil?.faculdade || ''
  const periodo   = perfil?.periodo   || ''
  const bio       = perfil?.bio       || ''
  const corAvatar = perfil?.cor_avatar || ''

  // Sincroniza localStorage com os dados do Supabase
  localStorage.setItem(`brainhub_perfil_${user.email}`, JSON.stringify({
    nome, curso, faculdade, periodo, bio, corAvatar
  }))

  document.getElementById('infoEmail').textContent    = user.email || '—'
  document.getElementById('inputNome').value          = nome
  document.getElementById('inputCurso').value         = curso
  document.getElementById('inputFaculdade').value     = faculdade
  document.getElementById('inputPeriodo').value       = periodo
  document.getElementById('inputBio').value           = bio
  document.getElementById('bioCount').textContent     = `${bio.length}/160`

  document.querySelectorAll('.color-opt').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.cor === corAvatar)
  })

  document.getElementById('proBadgePerfil').style.display   = isPro ? 'flex'        : 'none'
  document.getElementById('verifiedBadge').style.display    = isPro ? 'inline-flex' : 'none'
  document.getElementById('proPlanCard').style.display      = isPro ? 'flex'        : 'none'
  document.getElementById('proCTACard').style.display       = isPro ? 'none'        : 'flex'
  document.getElementById('proColorsSection').style.display = isPro ? 'block'       : 'none'
  document.getElementById('proColorsLocked').style.display  = isPro ? 'none'        : 'flex'
  document.getElementById('infoPlanoBadge').innerHTML       = isPro
    ? '<span class="info-pro-badge"><i data-lucide="crown"></i> Pro</span>'
    : 'Gratuito'

  // Stats reais
  const [{ data: postsData }, { data: seguidoresData }, { data: seguindoData }] = await Promise.all([
    window.supabase.from('posts').select('id').eq('user_id', user.id),
    window.supabase.from('follows').select('follower_id').eq('following_id', user.id),
    window.supabase.from('follows').select('following_id').eq('follower_id', user.id)
  ])
  const el = id => document.getElementById(id)
  if (el('perfilStatPosts'))      el('perfilStatPosts').textContent      = postsData?.length      ?? 0
  if (el('perfilStatSeguidores')) el('perfilStatSeguidores').textContent = seguidoresData?.length ?? 0
  if (el('perfilStatSeguindo'))   el('perfilStatSeguindo').textContent   = seguindoData?.length   ?? 0

  atualizarPreview({ nome, curso, faculdade, periodo, bio, corAvatar })
  lucide.createIcons()
}

async function salvarPerfil() {
  const nome      = document.getElementById('inputNome').value.trim()
  const curso     = document.getElementById('inputCurso').value.trim()
  const faculdade = document.getElementById('inputFaculdade').value.trim()
  const periodo   = document.getElementById('inputPeriodo').value
  const bio       = document.getElementById('inputBio').value.trim()
  const corAvatar = document.querySelector('.color-opt.selected')?.dataset.cor || ''

  if (!nome) {
    mostrarToast('Por favor, insira seu nome.', 'error')
    document.getElementById('inputNome').focus()
    return
  }

  const { data: { user } } = await window.supabase.auth.getUser()
  if (!user) return

  const { error } = await window.supabase
    .from('profiles')
    .upsert({ id: user.id, nome, curso, faculdade, periodo, bio, cor_avatar: corAvatar })

  if (error) {
    mostrarToast('Erro ao salvar perfil.', 'error')
    console.error(error)
    return
  }

  // Mantém localStorage como cache
  localStorage.setItem(`brainhub_perfil_${user.email}`, JSON.stringify({
    nome, curso, faculdade, periodo, bio, corAvatar
  }))

  atualizarPreview({ nome, curso, faculdade, periodo, bio, corAvatar })
  mostrarToast('Perfil salvo com sucesso! ✨', 'success')

  const btn = document.getElementById('btnSalvar')
  btn.textContent = '✓ Salvo!'
  btn.style.background = 'linear-gradient(135deg, #20d3ae, #10a47f)'
  setTimeout(() => {
    btn.innerHTML = '<i data-lucide="check"></i> Salvar Alterações'
    btn.style.background = ''
    lucide.createIcons()
  }, 2000)
}

['inputNome', 'inputCurso', 'inputFaculdade', 'inputBio'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    atualizarPreview({
      nome:       document.getElementById('inputNome').value,
      curso:      document.getElementById('inputCurso').value,
      faculdade:  document.getElementById('inputFaculdade').value,
      periodo:    document.getElementById('inputPeriodo').value,
      bio:        document.getElementById('inputBio').value,
      corAvatar:  document.querySelector('.color-opt.selected')?.dataset.cor || ''
    })
  })
})

document.getElementById('inputPeriodo').addEventListener('change', () => {
  atualizarPreview({
    nome:       document.getElementById('inputNome').value,
    curso:      document.getElementById('inputCurso').value,
    faculdade:  document.getElementById('inputFaculdade').value,
    periodo:    document.getElementById('inputPeriodo').value,
    bio:        document.getElementById('inputBio').value,
    corAvatar:  document.querySelector('.color-opt.selected')?.dataset.cor || ''
  })
})

document.getElementById('inputBio').addEventListener('input', function () {
  document.getElementById('bioCount').textContent = `${this.value.length}/160`
})

document.querySelectorAll('.color-opt').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.color-opt').forEach(b => b.classList.remove('selected'))
    btn.classList.add('selected')
    atualizarPreview({
      nome:       document.getElementById('inputNome').value,
      curso:      document.getElementById('inputCurso').value,
      faculdade:  document.getElementById('inputFaculdade').value,
      periodo:    document.getElementById('inputPeriodo').value,
      bio:        document.getElementById('inputBio').value,
      corAvatar:  btn.dataset.cor
    })
  })
})

document.getElementById('colorPickerPro')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.color-opt')
  if (!btn) return
  document.querySelectorAll('.color-opt').forEach(b => b.classList.remove('selected'))
  btn.classList.add('selected')
  atualizarPreview({
    nome:       document.getElementById('inputNome').value,
    curso:      document.getElementById('inputCurso').value,
    faculdade:  document.getElementById('inputFaculdade').value,
    periodo:    document.getElementById('inputPeriodo').value,
    bio:        document.getElementById('inputBio').value,
    corAvatar:  btn.dataset.cor
  })
})

document.getElementById('btnSalvar').addEventListener('click', salvarPerfil)

document.getElementById('btnEditarPerfil').addEventListener('click', () => {
  document.getElementById('inputNome').focus()
  document.querySelector('.perfil-main').scrollTo({ top: 0, behavior: 'smooth' })
})

async function fazerLogout() {
  await window.supabase.auth.signOut()
  localStorage.removeItem('brainhub_usuario_logado')
  localStorage.removeItem('brainhub_remember')
  sessionStorage.removeItem('brainhub_remember')
  window.location.href = 'login.html'
}

document.getElementById('btnSair').addEventListener('click', fazerLogout)
document.getElementById('btnSairMob')?.addEventListener('click', fazerLogout)

// ===== MEUS POSTS =====
async function carregarMeusPosts() {
  const container = document.getElementById('perfilPostsList')
  const { data: { user } } = await window.supabase.auth.getUser()
  if (!user) return

  const { data: posts, error } = await window.supabase
    .from('posts')
    .select('id, texto, created_at, pinned, imagem_url, likes(user_id), comments(id)')
    .eq('user_id', user.id)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    container.innerHTML = '<p style="text-align:center;padding:32px;color:var(--muted)">Erro ao carregar posts.</p>'
    console.error('Erro ao carregar posts do perfil:', error)
    return
  }

  if (!posts?.length) {
    container.innerHTML = `
      <div class="perfil-posts-empty">
        <div class="empty-icon">📝</div>
        <p>Você ainda não publicou nada.</p>
        <a href="home.html" style="color:#7c5cff;font-size:0.85rem;text-decoration:none;margin-top:8px;display:inline-block;">Ir para o feed →</a>
      </div>`
    return
  }

  container.innerHTML = posts.map(p => `
    <div class="perfil-post-card ${p.pinned ? 'pinned' : ''}" data-id="${p.id}">
      ${p.pinned ? '<div class="perfil-post-pinned"><i data-lucide="pin"></i> Post fixado</div>' : ''}
      <div class="perfil-post-texto">${p.texto}</div>
      ${p.imagem_url ? `<img src="${p.imagem_url}" class="perfil-post-img" loading="lazy" />` : ''}
      <div class="perfil-post-meta">
        <span><i data-lucide="heart"></i> ${p.likes?.length || 0} curtidas</span>
        <span><i data-lucide="message-circle"></i> ${p.comments?.length || 0} comentários</span>
        <span class="perfil-post-data">${tempoRelativo(p.created_at)}</span>
      </div>
      <div class="perfil-post-footer">
        ${_isPro ? `<button class="perfil-post-pin" data-id="${p.id}" data-pinned="${!!p.pinned}">
          <i data-lucide="${p.pinned ? 'pin-off' : 'pin'}"></i> ${p.pinned ? 'Desafixar' : 'Fixar'}
        </button>` : ''}
        <button class="perfil-post-delete" data-id="${p.id}">
          <i data-lucide="trash-2"></i> Excluir
        </button>
      </div>
    </div>`).join('')

  // Fixar / Desafixar
  container.querySelectorAll('.perfil-post-pin').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id
      const isPinned = btn.dataset.pinned === 'true'
      const { error } = await window.supabase.from('posts').update({ pinned: !isPinned }).eq('id', id)
      if (error) { console.error('Erro ao fixar:', error); mostrarToast('Erro ao fixar post.', 'error'); return }
      postsCarregados = false
      carregarMeusPosts()
    })
  })

  container.querySelectorAll('.perfil-post-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const confirmado = await confirmarExclusao('Tem certeza que deseja excluir este post? Esta ação não pode ser desfeita.')
      if (!confirmado) return
      await window.supabase.from('posts').delete().eq('id', btn.dataset.id)
      btn.closest('.perfil-post-card').remove()
      const stat = document.getElementById('perfilStatPosts')
      if (stat) stat.textContent = Math.max(0, parseInt(stat.textContent) - 1)
    })
  })

  lucide.createIcons()
}

// ===== ESTATÍSTICAS (Pro) =====
let statsCarregado = false

async function carregarEstatisticas() {
  const container = document.getElementById('statsContainer')
  if (!_isPro) {
    container.innerHTML = `
      <div class="stats-locked">
        <div class="stats-locked-icon"><i data-lucide="lock"></i></div>
        <h3>Estatísticas Pro</h3>
        <p>Veja dados detalhados sobre o desempenho dos seus posts, curtidas recebidas e alcance do seu perfil.</p>
        <a href="planos.html" class="btn-upgrade-stats"><i data-lucide="crown"></i> Assinar Pro</a>
      </div>`
    lucide.createIcons()
    return
  }

  const { data: { user } } = await window.supabase.auth.getUser()
  if (!user) return

  // Busca posts com likes e comentários
  const { data: posts, error: postsErr } = await window.supabase
    .from('posts')
    .select('id, texto, created_at, pinned')
    .eq('user_id', user.id)
    .is('group_id', null)
    .order('created_at', { ascending: false })

  if (postsErr) console.error('Stats posts error:', postsErr)

  const postIds = (posts || []).map(p => p.id)

  const [{ data: likesData }, { data: commentsData }] = await Promise.all([
    postIds.length
      ? window.supabase.from('likes').select('post_id').in('post_id', postIds)
      : Promise.resolve({ data: [] }),
    postIds.length
      ? window.supabase.from('comments').select('post_id').in('post_id', postIds)
      : Promise.resolve({ data: [] })
  ])

  const postsComStats = (posts || []).map(p => ({
    ...p,
    likes: (likesData || []).filter(l => l.post_id === p.id),
    comments: (commentsData || []).filter(c => c.post_id === p.id)
  }))

  if (!postsComStats.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:48px;color:var(--muted)">
        <i data-lucide="bar-chart-3" style="width:48px;height:48px"></i>
        <p style="margin-top:12px">Publique posts para ver suas estatísticas aqui.</p>
      </div>`
    lucide.createIcons()
    return
  }

  const totalPosts = postsComStats.length
  const totalLikes = postsComStats.reduce((sum, p) => sum + (p.likes?.length || 0), 0)
  const totalComments = postsComStats.reduce((sum, p) => sum + (p.comments?.length || 0), 0)
  const avgLikes = totalPosts > 0 ? (totalLikes / totalPosts).toFixed(1) : 0
  const avgComments = totalPosts > 0 ? (totalComments / totalPosts).toFixed(1) : 0
  const totalEngagement = totalLikes + totalComments

  // Post mais popular
  const topPost = postsComStats.reduce((best, p) => {
    const score = (p.likes?.length || 0) + (p.comments?.length || 0)
    return score > (best.score || 0) ? { ...p, score } : best
  }, { score: 0 })

  // Atividade por semana (últimos 30 dias)
  const agora = Date.now()
  const semanas = [0, 0, 0, 0]
  postsComStats.forEach(p => {
    const dias = Math.floor((agora - new Date(p.created_at).getTime()) / (24*60*60*1000))
    if (dias < 7) semanas[0]++
    else if (dias < 14) semanas[1]++
    else if (dias < 21) semanas[2]++
    else if (dias < 28) semanas[3]++
  })
  const maxSemana = Math.max(...semanas, 1)

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card stat-purple">
        <div class="stat-icon"><i data-lucide="file-text"></i></div>
        <div class="stat-value">${totalPosts}</div>
        <div class="stat-label">Posts publicados</div>
      </div>
      <div class="stat-card stat-pink">
        <div class="stat-icon"><i data-lucide="heart"></i></div>
        <div class="stat-value">${totalLikes}</div>
        <div class="stat-label">Curtidas recebidas</div>
      </div>
      <div class="stat-card stat-blue">
        <div class="stat-icon"><i data-lucide="message-circle"></i></div>
        <div class="stat-value">${totalComments}</div>
        <div class="stat-label">Comentários recebidos</div>
      </div>
      <div class="stat-card stat-green">
        <div class="stat-icon"><i data-lucide="trending-up"></i></div>
        <div class="stat-value">${totalEngagement}</div>
        <div class="stat-label">Engajamento total</div>
      </div>
    </div>

    <div class="stats-detail-card">
      <h4><i data-lucide="bar-chart-3"></i> Médias por post</h4>
      <div class="stats-averages">
        <div class="avg-item">
          <span class="avg-value">${avgLikes}</span>
          <span class="avg-label">curtidas/post</span>
        </div>
        <div class="avg-item">
          <span class="avg-value">${avgComments}</span>
          <span class="avg-label">comentários/post</span>
        </div>
      </div>
    </div>

    <div class="stats-detail-card">
      <h4><i data-lucide="activity"></i> Atividade (últimas 4 semanas)</h4>
      <div class="stats-chart">
        ${semanas.map((v, i) => `
          <div class="chart-bar-wrap">
            <div class="chart-bar" style="height:${Math.max((v / maxSemana) * 100, 8)}%"></div>
            <span class="chart-label">${['Esta', '2ª', '3ª', '4ª'][i]} sem</span>
            <span class="chart-count">${v}</span>
          </div>
        `).reverse().join('')}
      </div>
    </div>

    ${topPost.id ? `
    <div class="stats-detail-card">
      <h4><i data-lucide="trophy"></i> Post mais popular</h4>
      <div class="top-post-preview">
        <p class="top-post-text">${(topPost.texto || '').slice(0, 120)}${(topPost.texto || '').length > 120 ? '…' : ''}</p>
        <div class="top-post-stats">
          <span><i data-lucide="heart"></i> ${topPost.likes?.length || 0}</span>
          <span><i data-lucide="message-circle"></i> ${topPost.comments?.length || 0}</span>
        </div>
      </div>
    </div>` : ''}`

  lucide.createIcons()
}

// ===== ABAS =====
let postsCarregados = false
document.querySelectorAll('.perfil-right-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.perfil-right-tab').forEach(t => t.classList.remove('active'))
    tab.classList.add('active')
    const nome = tab.dataset.tab
    document.getElementById('tabEditar').style.display  = nome === 'editar'  ? '' : 'none'
    document.getElementById('tabPosts').style.display   = nome === 'posts'   ? '' : 'none'
    document.getElementById('tabStats').style.display   = nome === 'stats'   ? '' : 'none'
    document.getElementById('tabTitulos').style.display = nome === 'titulos' ? '' : 'none'
    if (nome === 'posts' && !postsCarregados) {
      postsCarregados = true
      carregarMeusPosts()
    }
    if (nome === 'stats' && !statsCarregado) {
      statsCarregado = true
      carregarEstatisticas()
    }
    if (nome === 'titulos') carregarTitulos()
  })
})

// ===== TÍTULOS =====
const TITULOS_DEF = [
  { id: 'turing',      label: 'Turing',      pontos: 35000, cor: '#7c5cff' },
  { id: 'einstein',    label: 'Einstein',    pontos: 20000, cor: '#f5c542' },
  { id: 'genio_local', label: 'Gênio Local', pontos: 10000, cor: '#ff6ec7' },
  { id: 'nerd',        label: 'Nerd',        pontos:  6000, cor: '#26d0a8' },
  { id: 'cientista',   label: 'Cientista',   pontos:  3000, cor: '#6d8bff' },
  { id: 'pesquisador', label: 'Pesquisador', pontos:  1500, cor: '#ffb144' },
  { id: 'monitor',     label: 'Monitor',     pontos:   700, cor: '#bcaeff' },
  { id: 'dedicado',    label: 'Dedicado',    pontos:   300, cor: '#d7d7de' },
  { id: 'curioso',     label: 'Curioso',     pontos:   100, cor: '#d7d7de' },
]
const TITULO_PRO_DEF = { id: 'pro', label: '👑 Pro', pontos: 0, cor: '#f5c542' }

async function carregarTitulos() {
  const { data: { user } } = await window.supabase.auth.getUser()
  if (!user) return

  const { data: perfil } = await window.supabase
    .from('profiles')
    .select('pontos, titulo_ativo, titulos_desbloqueados, is_pro')
    .eq('id', user.id).single()

  const pontos = perfil?.pontos || 0
  const tituloAtivo = perfil?.titulo_ativo || null
  const desbloqueados = perfil?.titulos_desbloqueados || []
  const isPro = perfil?.is_pro === true

  document.getElementById('titulosPontos').textContent = pontos.toLocaleString('pt-BR')

  const todos = [...TITULOS_DEF]
  if (isPro) todos.unshift(TITULO_PRO_DEF)

  const grid = document.getElementById('titulosGrid')
  grid.innerHTML = todos.map(t => {
    const desbloqueado = t.id === 'pro' ? isPro : desbloqueados.includes(t.id)
    const ativo = tituloAtivo === t.id
    return `<div class="titulo-card ${desbloqueado ? '' : 'titulo-locked'} ${ativo ? 'titulo-ativo' : ''}"
                 data-id="${t.id}" data-desbloqueado="${desbloqueado}" style="--titulo-cor:${t.cor}">
      <div class="titulo-badge" style="color:${t.cor};border-color:${t.cor}20;background:${t.cor}12">
        ${desbloqueado ? t.label : '<i data-lucide="lock"></i>'}
      </div>
      ${t.id !== 'pro' ? `<span class="titulo-req">${t.pontos.toLocaleString('pt-BR')} pts</span>` : '<span class="titulo-req">Exclusivo Pro</span>'}
      ${ativo ? '<span class="titulo-em-uso">Em uso</span>' : ''}
      ${desbloqueado && !ativo ? `<button class="titulo-usar-btn" data-id="${t.id}">Usar</button>` : ''}
    </div>`
  }).join('')

  lucide.createIcons()

  grid.querySelectorAll('.titulo-usar-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id
      await window.supabase.from('profiles').update({ titulo_ativo: id }).eq('id', user.id)
      carregarTitulos()
    })
  })
}

carregarDados()