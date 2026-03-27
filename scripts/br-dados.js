// ===== CURSOS E FACULDADES DO BRASIL =====

const CURSOS_BR = [
  // Exatas e Tecnologia
  'Ciência da Computação', 'Engenharia de Software', 'Sistemas de Informação',
  'Análise e Desenvolvimento de Sistemas', 'Tecnologia em Redes de Computadores',
  'Engenharia da Computação', 'Engenharia de Telecomunicações', 'Engenharia Elétrica',
  'Engenharia Eletrônica', 'Engenharia Mecânica', 'Engenharia Civil', 'Engenharia Química',
  'Engenharia de Produção', 'Engenharia Aeronáutica', 'Engenharia Ambiental',
  'Engenharia de Alimentos', 'Engenharia Biomédica', 'Engenharia Naval',
  'Engenharia Mecatrônica', 'Engenharia de Petróleo', 'Engenharia Florestal',
  'Matemática', 'Matemática Aplicada', 'Estatística', 'Física', 'Química', 'Geologia',
  'Astronomia', 'Meteorologia', 'Oceanografia', 'Ciências Atuariais',
  // Saúde
  'Medicina', 'Enfermagem', 'Farmácia', 'Odontologia', 'Fisioterapia', 'Fonoaudiologia',
  'Nutrição', 'Psicologia', 'Biomedicina', 'Educação Física', 'Medicina Veterinária',
  'Zootecnia', 'Terapia Ocupacional', 'Serviço Social', 'Radiologia',
  'Tecnologia em Radiologia', 'Tecnologia em Estética', 'Tecnologia em Enfermagem',
  // Humanas e Sociais
  'Direito', 'Administração', 'Ciências Econômicas', 'Contabilidade', 'Ciências Contábeis',
  'Relações Internacionais', 'Ciências Políticas', 'Sociologia', 'Filosofia',
  'Antropologia', 'História', 'Geografia', 'Letras', 'Letras - Português',
  'Letras - Inglês', 'Letras - Espanhol', 'Letras - Francês', 'Letras - Alemão',
  'Pedagogia', 'Ciências da Educação', 'Educação Especial',
  // Comunicação e Artes
  'Jornalismo', 'Publicidade e Propaganda', 'Relações Públicas', 'Rádio e TV',
  'Cinema e Audiovisual', 'Design Gráfico', 'Design de Moda', 'Design de Interiores',
  'Arquitetura e Urbanismo', 'Artes Visuais', 'Artes Cênicas', 'Música',
  'Teatro', 'Dança', 'Fotografia', 'Marketing',
  // Agrárias
  'Agronomia', 'Engenharia Agrícola', 'Gestão Ambiental', 'Biologia', 'Ciências Biológicas',
  // Negócios e Gestão
  'Gestão de Recursos Humanos', 'Gestão Financeira', 'Logística', 'Comércio Exterior',
  'Secretariado Executivo', 'Turismo', 'Hotelaria', 'Gastronomia',
  // Tecnologia
  'Tecnologia em Análise de Dados', 'Inteligência Artificial', 'Jogos Digitais',
  'Desenvolvimento Web', 'Segurança da Informação', 'Banco de Dados',
  'Tecnologia em Internet das Coisas', 'Ciência de Dados',
].sort()

const FACULDADES_BR = [
  // Federais
  'USP - Universidade de São Paulo',
  'UNICAMP - Universidade Estadual de Campinas',
  'UNESP - Universidade Estadual Paulista',
  'UFMG - Universidade Federal de Minas Gerais',
  'UFRJ - Universidade Federal do Rio de Janeiro',
  'UFPR - Universidade Federal do Paraná',
  'UFSC - Universidade Federal de Santa Catarina',
  'UFRGS - Universidade Federal do Rio Grande do Sul',
  'UnB - Universidade de Brasília',
  'UFBA - Universidade Federal da Bahia',
  'UFC - Universidade Federal do Ceará',
  'UFPE - Universidade Federal de Pernambuco',
  'UFAM - Universidade Federal do Amazonas',
  'UFPA - Universidade Federal do Pará',
  'UFSM - Universidade Federal de Santa Maria',
  'UFSCar - Universidade Federal de São Carlos',
  'UFES - Universidade Federal do Espírito Santo',
  'UFG - Universidade Federal de Goiás',
  'UFMT - Universidade Federal de Mato Grosso',
  'UFMS - Universidade Federal de Mato Grosso do Sul',
  'UFRN - Universidade Federal do Rio Grande do Norte',
  'UFPB - Universidade Federal da Paraíba',
  'UFAL - Universidade Federal de Alagoas',
  'UFS - Universidade Federal de Sergipe',
  'UFPI - Universidade Federal do Piauí',
  'UFMA - Universidade Federal do Maranhão',
  'UFRO - Universidade Federal de Rondônia',
  'UFRR - Universidade Federal de Roraima',
  'UFAC - Universidade Federal do Acre',
  'UFAP - Universidade Federal do Amapá',
  'UFTM - Universidade Federal do Triângulo Mineiro',
  'UFU - Universidade Federal de Uberlândia',
  'UFJF - Universidade Federal de Juiz de Fora',
  'UFV - Universidade Federal de Viçosa',
  'UFOP - Universidade Federal de Ouro Preto',
  'UNIRIO - Universidade Federal do Estado do Rio de Janeiro',
  'UNIFESP - Universidade Federal de São Paulo',
  'UFF - Universidade Federal Fluminense',
  'UTFPR - Universidade Tecnológica Federal do Paraná',
  'ITA - Instituto Tecnológico de Aeronáutica',
  'IME - Instituto Militar de Engenharia',
  // Privadas
  'PUC-SP - Pontifícia Universidade Católica de São Paulo',
  'PUC-Rio - Pontifícia Universidade Católica do Rio de Janeiro',
  'PUC-MG - Pontifícia Universidade Católica de Minas Gerais',
  'PUC-RS - Pontifícia Universidade Católica do Rio Grande do Sul',
  'PUCPR - Pontifícia Universidade Católica do Paraná',
  'MACKENZIE - Universidade Presbiteriana Mackenzie',
  'FGV - Fundação Getulio Vargas',
  'INSPER - Insper Instituto de Ensino e Pesquisa',
  'ESPM - Escola Superior de Propaganda e Marketing',
  'FEI - Fundação Educacional Inaciana',
  'FAAP - Fundação Armando Alvares Penteado',
  'Anhembi Morumbi',
  'Universidade Anhanguera',
  'Universidade Estácio de Sá',
  'Universidade Cruzeiro do Sul',
  'Universidade São Francisco',
  'Centro Universitário FMU',
  'UniCEUB - Centro Universitário de Brasília',
  'Centro Universitário Ritter dos Reis - UniRitter',
  'Universidade do Vale do Rio dos Sinos - UNISINOS',
  'Universidade Feevale',
  'UNIVALI - Universidade do Vale do Itajaí',
  'FURB - Universidade Regional de Blumenau',
  'UDESC - Universidade do Estado de Santa Catarina',
  'UEL - Universidade Estadual de Londrina',
  'UEM - Universidade Estadual de Maringá',
  'UEPG - Universidade Estadual de Ponta Grossa',
  'UNICENTRO - Universidade Estadual do Centro-Oeste',
  'UNIOESTE - Universidade Estadual do Oeste do Paraná',
  'UP - Universidade Positivo',
  'FAE - FAE Business School',
  'UNIFIL - Centro Universitário Filadélfia',
  'UNOPAR - Universidade Norte do Paraná',
  'Universidade Tuiuti do Paraná',
  'IESB - Instituto de Educação Superior de Brasília',
  'Universidade Paulista - UNIP',
  'Universidade Metodista de São Paulo',
  'São Camilo - Centro Universitário',
  'UNISA - Universidade de Santo Amaro',
  'UNINOVE - Universidade Nove de Julho',
  'UNIP - Universidade Paulista',
  'Universidade São Judas Tadeu',
  'Centro Universitário Senac',
  'Universidade de Fortaleza - UNIFOR',
  'Universidade de Pernambuco - UPE',
  'Universidade do Estado do Rio de Janeiro - UERJ',
  'Universidade do Estado do Amazonas - UEA',
  'Universidade do Estado da Bahia - UNEB',
  'UVA - Universidade Veiga de Almeida',
  'UNIGRANRIO',
  'Universidade Gama Filho',
  'Centro Universitário Carioca',
  'Universidade Salgado de Oliveira - UNIVERSO',
].sort()

// ===== FUNÇÃO DE AUTOCOMPLETE =====

function initAutocomplete(inputId, lista) {
  const input = document.getElementById(inputId)
  if (!input) return

  // Wrapper para posicionamento relativo
  const wrapper = input.parentElement
  wrapper.style.position = 'relative'

  const dropdown = document.createElement('ul')
  dropdown.className = 'autocomplete-list'
  wrapper.appendChild(dropdown)

  function mostrar(itens) {
    if (!itens.length) { dropdown.classList.remove('visible'); return }
    dropdown.innerHTML = itens.slice(0, 8).map(item =>
      `<li class="autocomplete-item">${item}</li>`
    ).join('')
    dropdown.classList.add('visible')
    dropdown.querySelectorAll('.autocomplete-item').forEach(li => {
      li.addEventListener('mousedown', e => {
        e.preventDefault()
        input.value = li.textContent
        dropdown.classList.remove('visible')
        input.dispatchEvent(new Event('change'))
      })
    })
  }

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase()
    if (q.length < 2) { dropdown.classList.remove('visible'); return }
    const matches = lista.filter(item => item.toLowerCase().includes(q))
    mostrar(matches)
  })

  input.addEventListener('focus', () => {
    const q = input.value.trim().toLowerCase()
    if (q.length >= 2) {
      const matches = lista.filter(item => item.toLowerCase().includes(q))
      mostrar(matches)
    }
  })

  document.addEventListener('click', e => {
    if (!wrapper.contains(e.target)) dropdown.classList.remove('visible')
  })
}
