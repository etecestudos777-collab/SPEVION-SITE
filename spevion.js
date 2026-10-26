/* INTERAÇÕES DO SITE
   Este arquivo cuida do tema, menu, carrossel, cálculos, painel, missões e demonstração.
   Os dados de planejamento ficam neste navegador. O login continua no autenticacao.js. */

// O tema é aplicado antes de a página aparecer, evitando um clarão ao recarregar.
(function prepararTema() {
    let tema = 'claro';
    try {
        const salvo = localStorage.getItem('spevion-tema');
        if (salvo === 'claro' || salvo === 'escuro') tema = salvo;
        else if (window.matchMedia('(prefers-color-scheme: dark)').matches) tema = 'escuro';
    } catch (erro) {
        // A página continua funcionando se o navegador bloquear o armazenamento.
    }
    document.documentElement.dataset.tema = tema;
})();

function formatarReais(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Tabela Price: prestação = valor financiado × taxa / [1 - (1 + taxa)^(-meses)].
// A taxa recebida nesta função já deve estar em decimal: 0,8% = 0,008.
function calcularPrestacao(valorFinanciado, taxaMensal, meses) {
    if (valorFinanciado === 0) return 0;
    if (taxaMensal === 0) return valorFinanciado / meses;
    // log1p e expm1 mantêm o cálculo estável mesmo com juros muito próximos de zero.
    return valorFinanciado * taxaMensal / -Math.expm1(-meses * Math.log1p(taxaMensal));
}

document.addEventListener('DOMContentLoaded', function () {
    // 1. Alternância entre tema claro e escuro, compartilhada pelas duas páginas.
    const botoesTema = document.querySelectorAll('.botao-tema');
    function atualizarBotaoTema() {
        const escuro = document.documentElement.dataset.tema === 'escuro';
        const texto = escuro ? 'Ativar tema claro' : 'Ativar tema escuro';
        botoesTema.forEach(function (botao) {
            botao.setAttribute('aria-label', texto);
            botao.title = texto;
        });
        const corNavegador = document.querySelector('meta[name="theme-color"]');
        if (corNavegador) corNavegador.content = escuro ? '#0F1F1A' : '#F5F5EF';
    }
    atualizarBotaoTema();
    botoesTema.forEach(function (botao) {
        botao.addEventListener('click', function () {
            const tema = document.documentElement.dataset.tema === 'escuro' ? 'claro' : 'escuro';
            document.documentElement.dataset.tema = tema;
            try { localStorage.setItem('spevion-tema', tema); } catch (erro) { /* O tema ainda muda nesta página. */ }
            atualizarBotaoTema();
        });
    });
    window.addEventListener('storage', function (evento) {
        if (evento.key === 'spevion-tema' && ['claro', 'escuro'].includes(evento.newValue)) {
            document.documentElement.dataset.tema = evento.newValue;
            atualizarBotaoTema();
        }
    });

    // 2. Menu dos celulares: botão, clique fora e tecla Escape.
    const botaoMenu = document.querySelector('.botao-menu');
    const menu = document.getElementById('menu-principal');
    if (botaoMenu && menu) {
        function fecharMenu() {
            menu.classList.remove('aberto');
            botaoMenu.setAttribute('aria-expanded', 'false');
        }
        botaoMenu.addEventListener('click', function () {
            const aberto = menu.classList.toggle('aberto');
            botaoMenu.setAttribute('aria-expanded', String(aberto));
        });
        menu.querySelectorAll('a').forEach(function (link) { link.addEventListener('click', fecharMenu); });
        document.addEventListener('click', function (evento) {
            if (!menu.contains(evento.target) && !botaoMenu.contains(evento.target)) fecharMenu();
        });
        document.addEventListener('keydown', function (evento) {
            if (evento.key === 'Escape' && menu.classList.contains('aberto')) {
                fecharMenu();
                botaoMenu.focus();
            }
        });
    }

    // Carrossel da página inicial: troca a imagem e o contador a cada 4 segundos.
    const carrossel = document.getElementById('carrossel-principal');
    if (carrossel) {
        const imagens = carrossel.querySelectorAll('.imagem-principal');
        const contador = document.getElementById('contador-carrossel');
        const botaoPausa = document.getElementById('pausar-carrossel');
        let imagemAtual = 0;

        function trocarImagem() {
            const saindo = imagens[imagemAtual];
            saindo.classList.remove('ativa');
            saindo.classList.add('saindo');
            saindo.setAttribute('aria-hidden', 'true');
            imagemAtual = (imagemAtual + 1) % imagens.length;
            imagens[imagemAtual].classList.add('ativa');
            imagens[imagemAtual].removeAttribute('aria-hidden');
            // A imagem anterior só some depois que a nova terminou de aparecer (0,9 s).
            window.setTimeout(function () { saindo.classList.remove('saindo'); }, 1000);
            contador.textContent = String(imagemAtual + 1).padStart(2, '0') + ' / ' + String(imagens.length).padStart(2, '0');
        }
        imagens.forEach(function (imagem, indice) { if (indice > 0) imagem.setAttribute('aria-hidden', 'true'); });

        // Quem pediu menos movimento no sistema começa com o carrossel parado.
        const menosMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let intervaloCarrossel = menosMovimento ? null : window.setInterval(trocarImagem, 4000);
        if (menosMovimento) {
            botaoPausa.textContent = 'Continuar';
            botaoPausa.setAttribute('aria-label', 'Continuar troca de imagens');
        }
        botaoPausa.hidden = false;
        botaoPausa.addEventListener('click', function () {
            if (intervaloCarrossel !== null) {
                window.clearInterval(intervaloCarrossel);
                intervaloCarrossel = null;
                botaoPausa.textContent = 'Continuar';
                botaoPausa.setAttribute('aria-label', 'Continuar troca de imagens');
            } else {
                intervaloCarrossel = window.setInterval(trocarImagem, 4000);
                botaoPausa.textContent = 'Pausar';
                botaoPausa.setAttribute('aria-label', 'Pausar troca de imagens');
            }
        });
    }

    // Ganchos: o simulador (abaixo) e o painel (mais adiante) conversam por aqui.
    let rendaDoPlano = function () { return null; };
    let ultimaParcela = 0;
    let atualizarOrcamentoParcela = function () {};

    // 3. Simulação: valida os campos e troca os textos do painel de resultado.
    const formularioSimulador = document.getElementById('formulario-simulador');
    if (formularioSimulador) {
        formularioSimulador.querySelector('button[type="submit"]').disabled = false;
        const campoEntrada = document.getElementById('valor-entrada');
        const campoImovel = document.getElementById('valor-imovel');
        const mensagemErro = document.getElementById('erro-simulador');
        function limparErro() {
            campoEntrada.setCustomValidity('');
            mensagemErro.hidden = true;
        }
        formularioSimulador.addEventListener('input', function () {
            limparErro();
            // Não exibe o cenário anterior como se fosse o resultado dos novos dados.
            document.getElementById('periodo-parcela').textContent = 'Valores alterados. Calcule novamente para atualizar.';
            ultimaParcela = 0;
            atualizarOrcamentoParcela();
            ['parcela-estimada', 'total-financiado', 'total-juros', 'total-pago'].forEach(function (id) {
                document.getElementById(id).textContent = '—';
            });
        });
        // Taxa anual -> mensal equivalente: (1 + anual)^(1/12) - 1.
        const campoAnual = document.getElementById('taxa-anual');
        const campoMensal = document.getElementById('taxa-juros');
        campoAnual.addEventListener('input', function () {
            const anual = campoAnual.valueAsNumber;
            if (Number.isFinite(anual) && anual >= 0) campoMensal.value = (((1 + anual / 100) ** (1 / 12) - 1) * 100).toFixed(3);
        });
        campoMensal.addEventListener('input', function () { campoAnual.value = ''; });
        // Compara a parcela com a renda e o saldo do diagnóstico, quando existirem.
        atualizarOrcamentoParcela = function () {
            const alvo = document.getElementById('parcela-orcamento');
            if (!alvo) return;
            const plano = rendaDoPlano();
            if (!(ultimaParcela > 0)) { alvo.textContent = ''; return; }
            if (!plano || plano.renda <= 0) { alvo.textContent = 'Salve seu diagnóstico para ver se essa parcela cabe no seu orçamento.'; return; }
            const fmt = function (n) { return n.toLocaleString('pt-BR', { maximumFractionDigits: 1 }); };
            let texto = 'Essa parcela equivale a ' + fmt(ultimaParcela / plano.renda * 100) + '% da sua renda';
            texto += plano.saldo > 0 ? ' e a ' + fmt(ultimaParcela / plano.saldo * 100) + '% do seu saldo mensal.' : '. Seu saldo mensal hoje não tem sobra.';
            if (ultimaParcela / plano.renda > 0.3) texto += ' Muitas instituições limitam a parcela a cerca de 30% da renda; confirme as regras com a instituição.';
            alvo.textContent = texto;
        };
        function atualizarSimulacao() {
            limparErro();
            if (!formularioSimulador.reportValidity()) return;
            const imovel = campoImovel.valueAsNumber;
            const entrada = campoEntrada.valueAsNumber;
            const meses = Number(document.getElementById('prazo').value);
            const taxa = document.getElementById('taxa-juros').valueAsNumber / 100;
            if (![imovel, entrada, meses, taxa].every(Number.isFinite)) return;
            if (entrada > imovel) {
                const texto = 'A entrada não pode ser maior que o valor do imóvel.';
                campoEntrada.setCustomValidity(texto);
                mensagemErro.textContent = texto;
                mensagemErro.hidden = false;
                campoEntrada.reportValidity();
                return;
            }
            const financiado = imovel - entrada;
            const sac = document.getElementById('sistema').value === 'sac';
            // Price: parcela fixa. SAC: amortização fixa + juros sobre o saldo, por isso a parcela diminui.
            const prestacao = sac ? financiado / meses + financiado * taxa : calcularPrestacao(financiado, taxa, meses);
            const ultima = sac ? financiado / meses * (1 + taxa) : prestacao;
            const juros = sac ? financiado * taxa * (meses + 1) / 2 : Math.max(0, prestacao * meses - financiado);
            document.getElementById('selo-sistema').textContent = sac ? 'SAC' : 'Tabela Price';
            document.getElementById('rotulo-parcela-simulador').textContent = sac ? 'Primeira parcela estimada' : 'Parcela mensal estimada';
            document.getElementById('parcela-estimada').textContent = formatarReais(prestacao);
            document.getElementById('total-financiado').textContent = formatarReais(financiado);
            document.getElementById('total-juros').textContent = formatarReais(juros);
            document.getElementById('total-pago').textContent = formatarReais(financiado + juros + entrada);
            document.getElementById('periodo-parcela').textContent = financiado === 0
                ? 'A entrada cobre todo o valor informado.'
                : sac ? `${meses} parcelas · de ${formatarReais(prestacao)} até ${formatarReais(ultima)}`
                : `${meses} parcelas · ${formatarReais(prestacao)} por mês`;
            ultimaParcela = financiado === 0 ? 0 : prestacao;
            atualizarOrcamentoParcela();
            return true;
        }
        formularioSimulador.addEventListener('submit', function (evento) {
            evento.preventDefault();
            if (atualizarSimulacao()) concluirMissao('financiamento');
        });
        // A primeira conta usa apenas os exemplos visíveis no formulário.
        atualizarSimulacao();
    }

    // 4. PAINEL. Na página de login, as funções abaixo não são necessárias.
    if (!document.getElementById('meu-ape')) return;

    // Um objeto reúne os dados. É como uma ficha com campos nomeados.
    const categorias = ['moradia', 'alimentacao', 'transporte', 'contas', 'lazer', 'outros'];
    const nomesCategorias = ['Moradia', 'Alimentação', 'Transporte', 'Contas e serviços', 'Lazer', 'Outros gastos'];
    const nomesEtapas = ['orcamento', 'entrada', 'simulacao', 'documentos'];
    const nomesMissoes = ['diagnostico', 'meta', 'cenario', 'financiamento', 'perfil'];
    const pontosMissoes = [80, 60, 60, 40, 30];
    const avatares = { casa: '🏡', planta: '🌱', estrela: '⭐', sol: '☀️', bussola: '🧭' };
    const nomesAvatares = { casa: 'Casa', planta: 'Planta', estrela: 'Estrela', sol: 'Sol', bussola: 'Bússola' };
    let avisoArmazenamento = '';
    let contaLigada = false; // true quando o plano também é guardado na conta

    function criarPlanoVazio() {
        return {
            renda: 0,
            gastos: { moradia: 0, alimentacao: 0, transporte: 0, contas: 0, lazer: 0, outros: 0 },
            meta: 0,
            guardado: 0,
            apelido: 'Visitante',
            avatar: 'casa',
            atividades: { diagnostico: false, meta: false, cenario: false, financiamento: false, perfil: false },
            etapas: [],
            salvoEm: 0
        };
    }

    // Arredondar para centavos evita erros como 0,1 + 0,2 virar 0,30000000004.
    function centavos(valor) { return Math.round(valor * 100); }
    function numeroSalvo(valor) {
        return Number.isFinite(valor) && valor >= 0 && valor <= 100000000 ? centavos(valor) / 100 : 0;
    }

    function carregarPlano() {
        const plano = criarPlanoVazio();
        try {
            const texto = localStorage.getItem('spevion-painel-v1');
            if (texto) {
                const salvo = JSON.parse(texto);
                if (!salvo || typeof salvo !== 'object') throw new Error('Dados inválidos');
                plano.renda = numeroSalvo(salvo.renda);
                plano.meta = numeroSalvo(salvo.meta);
                plano.guardado = numeroSalvo(salvo.guardado);
                categorias.forEach(function (categoria) {
                    plano.gastos[categoria] = numeroSalvo(salvo.gastos && salvo.gastos[categoria]);
                });
                if (typeof salvo.apelido === 'string' && salvo.apelido.trim().length >= 2) plano.apelido = salvo.apelido.trim().slice(0, 24);
                if (Object.keys(avatares).includes(salvo.avatar)) plano.avatar = salvo.avatar;
                nomesMissoes.forEach(function (nome) {
                    plano.atividades[nome] = Boolean(salvo.atividades && salvo.atividades[nome] === true);
                });
                if (Array.isArray(salvo.etapas)) plano.etapas = nomesEtapas.filter(function (nome) { return salvo.etapas.includes(nome); });
                plano.salvoEm = Number.isFinite(salvo.salvoEm) ? salvo.salvoEm : 0;
            } else {
                // Aproveita as etapas que já estavam marcadas na versão anterior do site.
                const antigas = JSON.parse(localStorage.getItem('spevion-jornada') || '[]');
                if (Array.isArray(antigas)) plano.etapas = nomesEtapas.filter(function (nome) { return antigas.includes(nome); });
            }
        } catch (erro) {
            avisoArmazenamento = 'Não foi possível recuperar o planejamento salvo. Você pode preencher um novo plano nesta página.';
        }
        return plano;
    }

    // O exemplo tem sua própria ficha. Não substitui o planejamento pessoal.
    function criarDemonstracao() {
        const exemplo = criarPlanoVazio();
        exemplo.renda = 4000;
        exemplo.gastos = { moradia: 1000, alimentacao: 600, transporte: 300, contas: 400, lazer: 200, outros: 300 };
        exemplo.meta = 60000;
        exemplo.guardado = 15000;
        exemplo.apelido = 'Alex';
        exemplo.avatar = 'planta';
        exemplo.atividades.diagnostico = true;
        exemplo.atividades.meta = true;
        exemplo.atividades.perfil = true;
        exemplo.etapas = ['orcamento'];
        return exemplo;
    }

    const planoPessoal = carregarPlano();
    let dados = planoPessoal;
    let modoDemonstracao = false;

    function escrever(id, texto) { document.getElementById(id).textContent = texto; }
    function totalGastos() {
        let total = 0;
        categorias.forEach(function (categoria) { total += centavos(dados.gastos[categoria]); });
        return total / 100;
    }
    function saldoMensal() { return (centavos(dados.renda) - centavos(totalGastos())) / 100; }
    rendaDoPlano = function () { return dados.atividades.diagnostico ? { renda: dados.renda, saldo: saldoMensal() } : null; };

    function atualizarAviso() {
        let texto = contaLigada ? 'Seu planejamento e perfil ficam salvos neste navegador e também na sua conta SPEVION.' : 'Seu planejamento e perfil ficam salvos neste navegador. Entre na sua conta para guardá-los também online.';
        if (avisoArmazenamento) texto = avisoArmazenamento;
        if (modoDemonstracao) texto = 'Demonstração: dados fictícios. As mudanças ficam só nesta visita e seu planejamento pessoal continua preservado.';
        escrever('aviso-salvamento', texto);
    }
    function salvarDados() {
        if (!modoDemonstracao) {
            dados.salvoEm = Date.now();
            try {
                localStorage.setItem('spevion-painel-v1', JSON.stringify(dados));
                avisoArmazenamento = '';
            } catch (erro) {
                avisoArmazenamento = 'O navegador bloqueou o salvamento. Suas alterações ficam apenas nesta página e podem se perder ao fechar ou recarregar.';
            }
            // Avisa o autenticacao.js, que envia o plano para a conta quando houver sessão.
            document.dispatchEvent(new CustomEvent('spevion:plano-salvo', { detail: JSON.parse(JSON.stringify(dados)) }));
        }
        atualizarTela();
    }
    function avisar(texto) {
        if (modoDemonstracao) texto += ' Você está no modo demonstração.';
        else if (avisoArmazenamento) texto += ' Atenção: o navegador não conseguiu salvar.';
        escrever('mensagem-painel', texto);
        document.getElementById('mensagem-painel').hidden = false;
    }

    // Uma missão é um verdadeiro/falso. Repetir a atividade não acumula mais pontos.
    function concluirMissao(nome) {
        dados.atividades[nome] = true;
        salvarDados();
    }

    // 5. ATUALIZAÇÃO DO PAINEL, DIAGNÓSTICO E GRÁFICO.
    function atualizarPainel() {
        const saldo = saldoMensal();
        const falta = Math.max(0, centavos(dados.meta) - centavos(dados.guardado)) / 100;
        const percentual = dados.meta > 0 ? Math.min(100, dados.guardado / dados.meta * 100) : 0;
        escrever('painel-guardado', formatarReais(dados.guardado));
        escrever('painel-meta', dados.meta > 0 ? formatarReais(dados.meta) : '—');
        escrever('painel-falta', dados.meta > 0 ? formatarReais(falta) : '—');
        escrever('painel-saldo', dados.atividades.diagnostico ? formatarReais(saldo) : '—');
        // Não arredonda 99,99% para 100% antes de alcançar a meta.
        escrever('percentual-meta', Math.floor(percentual) + '%');
        document.getElementById('progresso-meta').value = percentual;
        escrever('texto-meta', dados.meta > 0 ? 'Da sua meta de entrada' : 'Defina sua meta para começar.');
        let resumo = 'Seu primeiro passo pode ser pequeno. Comece definindo uma meta.';
        if (dados.meta > 0 && falta === 0) resumo = 'Meta de entrada alcançada! Confira os outros custos da compra e sua reserva antes do próximo passo.';
        else if (dados.meta > 0) resumo = 'Cada valor guardado aproxima você da sua entrada. Atualize o total sempre que reservar mais.';
        escrever('resumo-meta', resumo);

        escrever('gastos', dados.atividades.diagnostico ? formatarReais(totalGastos()) : '—');
        escrever('saldo-mensal', dados.atividades.diagnostico ? formatarReais(saldo) : '—');
        document.getElementById('saldo-mensal').classList.toggle('negativo', dados.atividades.diagnostico && saldo < 0);
        let diagnostico = 'Salve seu diagnóstico para ver o saldo.';
        if (dados.atividades.diagnostico) {
            if (saldo < 0) diagnostico = 'Seus gastos superam sua renda em ' + formatarReais(-saldo) + '. Revise as despesas para equilibrar o mês.';
            else if (saldo === 0) diagnostico = 'Sua renda e seus gastos estão equilibrados, mas ainda não há sobra para guardar.';
            else diagnostico = 'Essa é a diferença entre sua renda e seus gastos. Escolha no “E se…?” quanto desse saldo quer reservar.';
        }
        escrever('prazo-meta', diagnostico);
    }

    function atualizarGrafico() {
        const grafico = document.getElementById('grafico-gastos');
        grafico.replaceChildren();
        const total = totalGastos();
        if (!dados.atividades.diagnostico || total === 0) {
            const aviso = document.createElement('p');
            aviso.className = 'ajuda-campo';
            aviso.textContent = dados.atividades.diagnostico ? 'Nenhuma despesa informada. O total de gastos é R$ 0,00.' : 'As barras aparecem depois do seu primeiro diagnóstico.';
            grafico.appendChild(aviso);
            return;
        }
        categorias.forEach(function (categoria, indice) {
            const valor = dados.gastos[categoria];
            const percentual = valor / total * 100;
            const linha = document.createElement('div');
            linha.className = 'linha-gasto';
            const legenda = document.createElement('div');
            legenda.className = 'legenda-gasto';
            const nome = document.createElement('span');
            nome.textContent = nomesCategorias[indice];
            const numero = document.createElement('strong');
            numero.textContent = formatarReais(valor) + ' · ' + percentual.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%' +
                (dados.renda > 0 ? ' · ' + (valor / dados.renda * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '% da renda' : '');
            legenda.append(nome, numero);
            const trilho = document.createElement('div');
            trilho.className = 'trilho-gasto';
            trilho.setAttribute('aria-hidden', 'true');
            const barra = document.createElement('span');
            barra.className = 'barra-gasto';
            barra.style.width = percentual + '%';
            trilho.appendChild(barra);
            linha.append(legenda, trilho);
            grafico.appendChild(linha);
        });
    }

    // 6. DICA DO MOMENTO: if/else escolhe o próximo passo conforme a ficha.
    function atualizarDica() {
        let titulo = 'Conheça seu ponto de partida.';
        let texto = 'Preencha sua renda e seus gastos para entender o que sobra no mês.';
        let destino = '#planejamento';
        let acao = 'Fazer diagnóstico ↗';
        if (dados.atividades.diagnostico) {
            if (saldoMensal() <= 0) {
                titulo = 'Comece pelo equilíbrio do mês.';
                texto = 'Seu diagnóstico ainda não tem saldo positivo. Veja as categorias de gastos e identifique o que pode ajustar.';
                acao = 'Rever orçamento ↗';
            } else if (dados.meta <= 0) {
                titulo = 'Dê um número ao seu objetivo.';
                texto = 'Você já conhece seu saldo. Agora defina a entrada que quer juntar e informe quanto já guardou.';
                destino = '#meu-ape'; acao = 'Definir minha meta ↗';
            } else if (dados.guardado >= dados.meta) {
                titulo = 'Sua meta de entrada foi alcançada!';
                texto = 'Continue pela trilha: conheça os custos da compra, organize os documentos e compare as condições.';
                destino = '#jornada'; acao = 'Ver próximos passos ↗';
            } else if (!dados.atividades.cenario) {
                titulo = 'E se você reservar um pouco a cada mês?';
                texto = 'Seu saldo é ' + formatarReais(saldoMensal()) + '. Teste uma parte dele no simulador e compare o prazo com um extra.';
                destino = '#e-se'; acao = 'Testar um cenário ↗';
            } else if (dados.etapas.length < 4) {
                titulo = 'Transforme seu plano em conhecimento.';
                texto = 'Explore as explicações da trilha e marque as etapas que concluir. Cada etapa vale 50 XP.';
                destino = '#jornada'; acao = 'Continuar minha trilha ↗';
            } else {
                titulo = 'Mantenha seu planejamento em dia.';
                texto = 'Sua trilha está completa. Revise os gastos e atualize o valor guardado conforme seu plano avança.';
                destino = '#meu-ape'; acao = 'Atualizar minha meta ↗';
            }
        }
        escrever('titulo-dica', titulo);
        escrever('texto-dica', texto);
        escrever('acao-dica', acao);
        document.getElementById('acao-dica').href = destino;
    }

    // 7. XP, NÍVEIS E MEDALHAS: calculados a partir das atividades concluídas.
    function atualizarEvolucao() {
        let xp = dados.etapas.length * 50;
        nomesMissoes.forEach(function (nome, indice) {
            const concluida = dados.atividades[nome];
            if (concluida) xp += pontosMissoes[indice];
            const missao = document.getElementById('missao-' + nome);
            missao.classList.toggle('concluida', concluida);
            missao.querySelector('.estado-missao').textContent = concluida ? '✓' : '0' + (indice + 1);
            missao.querySelector('.recompensa').textContent = concluida ? 'Concluída · ' + pontosMissoes[indice] + ' XP' : pontosMissoes[indice] + ' XP';
        });
        const nivel = Math.min(5, Math.floor(xp / 100) + 1);
        const titulos = ['Explorador', 'Planejador', 'Organizador', 'Estrategista', 'Conquistador'];
        escrever('apelido-perfil', dados.apelido);
        escrever('avatar-perfil', avatares[dados.avatar]);
        document.getElementById('avatar-perfil').setAttribute('aria-label', 'Avatar: ' + nomesAvatares[dados.avatar]);
        escrever('nivel-perfil', 'Nível ' + nivel + ' · ' + titulos[nivel - 1]);
        escrever('xp-perfil', xp + ' XP');
        escrever('proximo-nivel', nivel === 5 ? 'Nível máximo alcançado' : (nivel * 100 - xp) + ' XP para o nível ' + (nivel + 1));
        document.getElementById('progresso-xp').value = nivel === 5 ? 100 : xp % 100;

        const medalhas = ['primeiro', 'plano', 'evolucao', 'trilha'];
        const liberadas = [dados.atividades.diagnostico, dados.atividades.meta && dados.atividades.cenario, xp >= 200, dados.etapas.length === 4];
        medalhas.forEach(function (nome, indice) {
            const medalha = document.getElementById('medalha-' + nome);
            medalha.classList.toggle('desbloqueada', liberadas[indice]);
            medalha.querySelector('em').textContent = liberadas[indice] ? 'Desbloqueada ✓' : 'Bloqueada';
        });
        document.querySelectorAll('[data-etapa]').forEach(function (etapa) {
            etapa.checked = dados.etapas.includes(etapa.dataset.etapa);
            etapa.closest('.etapa').classList.toggle('concluida', etapa.checked);
        });
        escrever('texto-progresso', dados.etapas.length + ' de 4 etapas concluídas');
        document.getElementById('progresso-jornada').value = dados.etapas.length;
    }

    function atualizarTela() {
        atualizarPainel();
        atualizarGrafico();
        atualizarDica();
        atualizarEvolucao();
        atualizarAviso();
        atualizarOrcamentoParcela();
    }

    // 8. FORMULÁRIOS: lê os campos, atualiza a ficha e salva no navegador.
    const formularioMeta = document.getElementById('formulario-meta');
    formularioMeta.addEventListener('submit', function (evento) {
        evento.preventDefault();
        if (!formularioMeta.reportValidity()) return;
        dados.meta = document.getElementById('meta-entrada').valueAsNumber;
        dados.guardado = document.getElementById('valor-guardado').valueAsNumber;
        concluirMissao('meta');
        avisar('Meta atualizada no painel.');
    });

    const formularioPlanejamento = document.getElementById('formulario-planejamento');
    formularioPlanejamento.addEventListener('input', function () {
        escrever('aviso-diagnostico', 'Valores alterados. Clique em Salvar diagnóstico para atualizar o gráfico e o painel.');
    });
    formularioPlanejamento.addEventListener('submit', function (evento) {
        evento.preventDefault();
        if (!formularioPlanejamento.reportValidity()) return;
        dados.renda = document.getElementById('renda').valueAsNumber;
        categorias.forEach(function (categoria) {
            dados.gastos[categoria] = document.getElementById('gasto-' + categoria).valueAsNumber;
        });
        concluirMissao('diagnostico');
        escrever('aviso-diagnostico', modoDemonstracao ? 'Diagnóstico de demonstração atualizado.' : avisoArmazenamento || 'Diagnóstico salvo. Gráfico, saldo e dica atualizados.');
        avisar('Diagnóstico atualizado no painel.');
    });

    const formularioPerfil = document.getElementById('formulario-perfil');
    const campoApelido = document.getElementById('apelido');
    campoApelido.addEventListener('input', function () { campoApelido.setCustomValidity(''); });
    formularioPerfil.addEventListener('submit', function (evento) {
        evento.preventDefault();
        const apelido = campoApelido.value.trim();
        campoApelido.setCustomValidity(apelido.length < 2 ? 'Digite um apelido com pelo menos 2 caracteres.' : '');
        if (!formularioPerfil.reportValidity()) return;
        dados.apelido = apelido;
        dados.avatar = document.getElementById('avatar').value;
        concluirMissao('perfil');
        escrever('mensagem-perfil', modoDemonstracao ? 'Perfil fictício atualizado.' : avisoArmazenamento || 'Perfil salvo neste navegador.');
    });

    document.querySelectorAll('[data-etapa]').forEach(function (etapa) {
        etapa.addEventListener('change', function () {
            dados.etapas = [];
            document.querySelectorAll('[data-etapa]:checked').forEach(function (marcada) { dados.etapas.push(marcada.dataset.etapa); });
            salvarDados();
        });
    });

    // 9. E SE...? prazo = (meta - guardado) / valor mensal, arredondado para cima.
    const formularioCenario = document.getElementById('formulario-cenario');
    function calcularPrazo(meta, guardado, mensal) {
        const falta = Math.max(0, centavos(meta) - centavos(guardado));
        if (falta === 0) return 0;
        if (mensal <= 0) return null;
        return Math.ceil(falta / centavos(mensal));
    }
    function textoPrazo(meses) {
        if (meses === null) return 'Sem previsão';
        if (meses === 0) return 'Meta alcançada';
        return meses + (meses === 1 ? ' mês' : ' meses');
    }
    function limparCenario(texto) {
        ['cenario-prazo', 'cenario-base', 'cenario-total', 'cenario-falta'].forEach(function (id) { escrever(id, '—'); });
        escrever('cenario-comparacao', texto);
    }
    function usarPlanejamento() {
        document.getElementById('cenario-meta').value = dados.meta || '';
        document.getElementById('cenario-guardado').value = dados.guardado;
        document.getElementById('cenario-mensal').value = dados.atividades.diagnostico ? Math.max(0, saldoMensal()) : 0;
        document.getElementById('cenario-extra').value = 0;
        limparCenario('Valores do plano preenchidos. Ajuste quanto deseja reservar e compare.');
    }
    document.getElementById('usar-planejamento').addEventListener('click', usarPlanejamento);
    formularioCenario.addEventListener('input', function () { limparCenario('Valores alterados. Compare novamente para atualizar.'); });

    function simularCenario(ganharPontos) {
        if (!formularioCenario.reportValidity()) return;
        const meta = document.getElementById('cenario-meta').valueAsNumber;
        const guardado = document.getElementById('cenario-guardado').valueAsNumber;
        const mensal = document.getElementById('cenario-mensal').valueAsNumber;
        const extra = document.getElementById('cenario-extra').valueAsNumber;
        const total = (centavos(mensal) + centavos(extra)) / 100;
        const base = calcularPrazo(meta, guardado, mensal);
        const novo = calcularPrazo(meta, guardado, total);
        const falta = Math.max(0, centavos(meta) - centavos(guardado)) / 100;
        escrever('cenario-prazo', textoPrazo(novo));
        escrever('cenario-base', textoPrazo(base));
        escrever('cenario-total', formatarReais(total));
        escrever('cenario-falta', formatarReais(falta));
        let comparacao = '';
        if (novo === 0) comparacao = 'O valor guardado já cobre a meta informada.';
        else if (novo === null) comparacao = 'Informe um valor mensal maior que zero para estimar um prazo.';
        else if (base === null) comparacao = 'Com o extra mensal, este cenário passa a ter uma previsão para alcançar a entrada.';
        else if (base === novo) comparacao = 'Os dois cenários chegam à meta no mesmo número de meses completos.';
        else comparacao = 'Você chegaria ' + (base - novo) + (base - novo === 1 ? ' mês antes.' : ' meses antes.');
        if (novo !== 0 && dados.atividades.diagnostico && total > Math.max(0, saldoMensal())) {
            comparacao += ' Este valor mensal supera o saldo do diagnóstico; o cenário depende de aumentar a renda ou reduzir os gastos.';
        }
        escrever('cenario-comparacao', comparacao);
        if (ganharPontos) concluirMissao('cenario');
    }
    formularioCenario.addEventListener('submit', function (evento) { evento.preventDefault(); simularCenario(true); });

    // 10. DEMONSTRAÇÃO: alterna a ficha em uso, nunca grava o exemplo no plano pessoal.
    function preencherFormularios() {
        formularioMeta.reset();
        formularioPlanejamento.reset();
        formularioPerfil.reset();
        campoApelido.setCustomValidity('');
        document.getElementById('renda').value = dados.atividades.diagnostico ? dados.renda : '';
        categorias.forEach(function (categoria) { document.getElementById('gasto-' + categoria).value = dados.gastos[categoria]; });
        document.getElementById('meta-entrada').value = dados.meta || '';
        document.getElementById('valor-guardado').value = dados.guardado;
        campoApelido.value = dados.atividades.perfil ? dados.apelido : '';
        document.getElementById('avatar').value = dados.avatar;
        escrever('mensagem-perfil', '');
        escrever('aviso-diagnostico', 'O gráfico e o painel usam o último diagnóstico salvo.');
        document.getElementById('mensagem-painel').hidden = true;
        usarPlanejamento();
    }
    function alternarDemonstracao(ativar) {
        modoDemonstracao = ativar;
        dados = ativar ? criarDemonstracao() : planoPessoal;
        document.body.classList.toggle('modo-demonstracao', ativar);
        document.getElementById('aviso-demonstracao').hidden = !ativar;
        document.querySelectorAll('[data-demonstracao]').forEach(function (botao) {
            botao.textContent = ativar ? 'Ver demonstração em andamento ↗' : 'Explorar demonstração ↗';
        });
        preencherFormularios();
        atualizarTela();
        if (ativar) {
            document.getElementById('cenario-extra').value = 500;
            simularCenario(false);
        }
        // A URL mantém o modo ao recarregar, inclusive em um link para a banca.
        try {
            const endereco = new URL(location.href);
            if (ativar) endereco.searchParams.set('modo', 'demo');
            else endereco.searchParams.delete('modo');
            history.replaceState(null, '', endereco);
        } catch (erro) { /* Arquivos abertos por duplo clique também funcionam. */ }
    }
    document.querySelectorAll('[data-demonstracao]').forEach(function (botao) {
        botao.addEventListener('click', function () {
            if (!modoDemonstracao) alternarDemonstracao(true);
            document.getElementById('meu-ape').scrollIntoView();
            document.getElementById('sair-demonstracao').focus({ preventScroll: true });
        });
    });
    document.getElementById('sair-demonstracao').addEventListener('click', function () {
        alternarDemonstracao(false);
        document.querySelector('#meu-ape [data-demonstracao]').focus({ preventScroll: true });
    });

    // 11. IMPRESSÃO E CONTA. O envio para a conta fica no autenticacao.js.
    const botaoImprimir = document.getElementById('imprimir-plano');
    if (botaoImprimir) botaoImprimir.addEventListener('click', function () { window.print(); });
    document.addEventListener('spevion:conta', function (evento) {
        contaLigada = Boolean(evento.detail && evento.detail.ligada);
        atualizarAviso();
    });
    // Um plano mais recente guardado na conta substitui o deste navegador.
    document.addEventListener('spevion:plano-nuvem', function (evento) {
        try { localStorage.setItem('spevion-painel-v1', JSON.stringify(evento.detail)); } catch (erro) { return; }
        avisoArmazenamento = '';
        Object.assign(planoPessoal, carregarPlano());
        if (!modoDemonstracao) preencherFormularios();
        atualizarTela();
    });

    // Prepara a primeira tela, sem dar pontos por cálculos automáticos.
    alternarDemonstracao(new URLSearchParams(location.search).get('modo') === 'demo');

});
