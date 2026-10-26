/* LOGIN COM SUPABASE
   Mantém cadastro, entrada, confirmação de e-mail e recuperação de senha.
   O Supabase cuida das senhas e da sessão. Os cálculos continuam no spevion.js. */

document.addEventListener('DOMContentLoaded', async function () {
    const formularioEntrar = document.getElementById('formulario-entrar');
    const formularioCadastro = document.getElementById('formulario-cadastro');
    const formularioNovaSenha = document.getElementById('formulario-nova-senha');
    const mensagem = document.getElementById('mensagem-acesso');
    const aviso = document.getElementById('aviso-configuracao');
    const configuracao = window.CONFIGURACAO_SPEVION || {};
    const parametros = new URLSearchParams(location.search);
    const fragmento = new URLSearchParams(location.hash.slice(1));
    const erroRetorno = parametros.get('error_code') || fragmento.get('error_code') || parametros.get('error') || fragmento.get('error');
    const retorno = new URL('login.html', location.href).href;
    const retornoRecuperacao = retorno + '?modo=recuperar';
    let cliente = null;
    let usuarioAtual = null;
    let pronto = false;
    let ocupado = false;
    let googleDisponivel = false;
    let modoRecuperacao = parametros.get('modo') === 'recuperar';
    let planoNaConta = false;
    let sincronizando = false;

    // 1. TEXTOS E TELAS. textContent também evita executar HTML vindo de um nome.
    function exibirMensagem(texto, erro = false) {
        if (!mensagem) return;
        mensagem.textContent = texto;
        mensagem.classList.toggle('mensagem-erro', erro);
        mensagem.hidden = !texto;
    }
    function mostrarAviso(texto) {
        if (!aviso) return;
        aviso.textContent = texto;
        aviso.hidden = !texto;
    }
    function habilitarAcoes() {
        document.querySelectorAll('[data-autenticacao]').forEach(function (botao) {
            botao.disabled = !pronto || ocupado || (botao.dataset.provedor === 'google' && !googleDisponivel);
        });
    }
    function mostrarConta(usuario) {
        usuarioAtual = usuario || null;
        if (!usuario && planoNaConta) {
            planoNaConta = false;
            document.dispatchEvent(new CustomEvent('spevion:conta', { detail: { ligada: false } }));
        }
        // setTimeout evita chamar o Supabase dentro do callback de autenticação.
        if (usuario) setTimeout(function () { sincronizarPlano(usuario); }, 0);
        document.querySelectorAll('[data-link-conta]').forEach(function (link) {
            link.textContent = usuario ? 'Minha conta ↗' : 'Entrar ↗';
            link.title = usuario ? 'Conta conectada: ' + (usuario.email || '') : 'Entrar na minha conta';
        });
        if (!formularioEntrar) return;
        const recuperando = Boolean(usuario && modoRecuperacao);
        document.getElementById('area-formularios').hidden = Boolean(usuario);
        document.getElementById('area-conta').hidden = !usuario || recuperando;
        document.getElementById('area-recuperacao').hidden = !recuperando;
        const dados = usuario && usuario.user_metadata || {};
        document.getElementById('nome-usuario').textContent = usuario ? dados.nome || dados.full_name || dados.name || 'visitante' : '';
        document.getElementById('email-usuario').textContent = usuario ? usuario.email || '' : '';
    }
    function escolherAba(nome, manterMensagem = false) {
        const cadastro = nome === 'cadastro';
        document.querySelectorAll('[role="tab"]').forEach(function (aba) {
            const selecionada = aba.id === 'aba-' + nome;
            aba.setAttribute('aria-selected', String(selecionada));
            aba.tabIndex = selecionada ? 0 : -1;
        });
        document.getElementById('painel-entrar').hidden = cadastro;
        document.getElementById('painel-cadastro').hidden = !cadastro;
        document.getElementById('titulo-acesso').textContent = cadastro ? 'Vamos começar?' : 'Bom ter você aqui.';
        document.getElementById('introducao-acesso').textContent = cadastro ? 'Crie sua conta e dê o primeiro passo.' : 'Entre na sua conta para continuar.';
        if (!manterMensagem) exibirMensagem('');
    }
    function limparSenhas() {
        if (!formularioEntrar) return;
        [formularioEntrar, formularioCadastro, formularioNovaSenha].forEach(function (formulario) { formulario.reset(); });
        document.querySelectorAll('.mostrar-senha').forEach(function (botao) {
            document.getElementById(botao.dataset.senha).type = 'password';
            botao.textContent = 'Mostrar';
            botao.setAttribute('aria-pressed', 'false');
            botao.setAttribute('aria-label', 'Mostrar senha');
        });
        document.getElementById('confirmar-senha').setCustomValidity('');
        document.getElementById('confirmar-nova-senha').setCustomValidity('');
    }
    function limparRetorno(limparModo = false) {
        if (!formularioEntrar) return;
        const endereco = new URL(location.href);
        ['code', 'error', 'error_code', 'error_description'].forEach(function (campo) { endereco.searchParams.delete(campo); });
        if (limparModo) endereco.searchParams.delete('modo');
        if (fragmento.has('access_token') || fragmento.has('error')) endereco.hash = '';
        history.replaceState(null, '', endereco);
    }

    // 2. ERROS. Não trata falha de rede como sucesso e não esconde confirmação pendente.
    function traduzirErro(erro) {
        const textos = {
            invalid_credentials: 'Confira seu e-mail e sua senha e tente novamente.',
            email_not_confirmed: 'Confirme seu e-mail antes de entrar. Confira o spam ou use Reenviar confirmação de e-mail.',
            user_already_exists: 'Este cadastro não pôde ser concluído. Se você já tem uma conta, use Entrar ou Esqueci minha senha.',
            email_exists: 'Este e-mail já tem cadastro. Use Entrar ou Esqueci minha senha.',
            weak_password: 'Escolha uma senha mais forte e tente novamente.',
            same_password: 'Escolha uma senha diferente da anterior.',
            email_address_invalid: 'Confira o endereço de e-mail digitado.',
            email_address_not_authorized: 'O envio de e-mails ainda está restrito neste site. O responsável precisa configurar o serviço de envio.',
            over_email_send_rate_limit: 'O limite de envio de e-mails do site foi atingido por agora. Aguarde cerca de uma hora e tente novamente.',
            over_request_rate_limit: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
            signup_disabled: 'O cadastro de novas contas está temporariamente indisponível.',
            provider_disabled: 'O acesso pelo Google ainda não foi ativado.',
            otp_expired: 'Este link expirou ou já foi usado. Solicite um novo link.',
            flow_state_expired: 'O link expirou. Solicite outro e abra no mesmo navegador em que fez o pedido.',
            flow_state_not_found: 'Abra o link no mesmo navegador em que fez o pedido ou solicite um novo.',
            bad_code_verifier: 'Abra o link no mesmo navegador em que fez o pedido ou solicite um novo.',
            validation_failed: 'Confira os dados preenchidos e tente novamente.',
            captcha_failed: 'A verificação de acesso não foi concluída. Entre em contato com o responsável pelo site.',
            unexpected_failure: 'O serviço de acesso não conseguiu concluir. Tente novamente em instantes.',
            access_denied: 'O acesso foi cancelado. Você pode tentar novamente.'
        };
        if (erro && textos[erro.code]) return textos[erro.code];
        if (erro && /email address not authorized/i.test(erro.message || '')) return textos.email_address_not_authorized;
        if (erro && /invalid api key/i.test(erro.message || '')) return 'A configuração de acesso do site precisa ser conferida.';
        if (erro && /code verifier|pkce/i.test(erro.message || '')) return textos.bad_code_verifier;
        return 'Não foi possível concluir. Confira sua conexão e tente novamente.';
    }
    async function executarAcesso(acao) {
        if (!pronto || ocupado) return;
        ocupado = true;
        habilitarAcoes();
        exibirMensagem('Aguarde um instante…');
        try { await acao(); }
        catch (erro) { exibirMensagem(traduzirErro(erro), true); }
        finally { ocupado = false; habilitarAcoes(); }
    }
    async function sairDaConta() {
        const { error } = await cliente.auth.signOut({ scope: 'local' });
        if (error) throw error;
        modoRecuperacao = false;
        mostrarConta(null);
        limparSenhas();
        limparRetorno(true);
        escolherAba('entrar');
        exibirMensagem('Você saiu da sua conta neste navegador.');
    }

    // 3. FORMULÁRIOS. São preparados antes da conexão para evitar envio comum da página.
    if (formularioEntrar) {
        [formularioEntrar, formularioCadastro, formularioNovaSenha].forEach(function (formulario) {
            formulario.addEventListener('submit', function (evento) { evento.preventDefault(); });
        });
        const abas = Array.from(document.querySelectorAll('[role="tab"]'));
        abas.forEach(function (aba, indice) {
            aba.addEventListener('click', function () { escolherAba(indice === 0 ? 'entrar' : 'cadastro'); });
            aba.addEventListener('keydown', function (evento) {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(evento.key)) return;
                evento.preventDefault();
                const proxima = evento.key === 'Home' ? 0 : evento.key === 'End' ? 1 : 1 - indice;
                escolherAba(proxima === 0 ? 'entrar' : 'cadastro');
                abas[proxima].focus();
            });
        });
        if (parametros.get('modo') === 'cadastro') escolherAba('cadastro');
        document.querySelectorAll('.mostrar-senha').forEach(function (botao) {
            botao.addEventListener('click', function () {
                const campo = document.getElementById(botao.dataset.senha);
                const mostrar = campo.type === 'password';
                campo.type = mostrar ? 'text' : 'password';
                botao.textContent = mostrar ? 'Ocultar' : 'Mostrar';
                botao.setAttribute('aria-pressed', String(mostrar));
                botao.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
            });
        });
        formularioEntrar.addEventListener('submit', function () {
            if (!formularioEntrar.reportValidity()) return;
            const email = document.getElementById('email-entrar').value.trim();
            const senha = document.getElementById('senha-entrar').value;
            executarAcesso(async function () {
                const { data, error } = await cliente.auth.signInWithPassword({ email: email, password: senha });
                if (error) throw error;
                if (!data.session || !data.user) throw new Error('Sessão não recebida.');
                modoRecuperacao = false;
                mostrarConta(data.user);
                limparSenhas();
                limparRetorno(true);
                exibirMensagem('Você entrou! Use Ir para meu planejamento para continuar.');
            });
        });
        const confirmarSenha = document.getElementById('confirmar-senha');
        formularioCadastro.addEventListener('input', function () { confirmarSenha.setCustomValidity(''); });
        formularioCadastro.addEventListener('submit', function () {
            const senha = document.getElementById('senha-cadastro').value;
            confirmarSenha.setCustomValidity(confirmarSenha.value === senha ? '' : 'As senhas precisam ser iguais.');
            if (!formularioCadastro.reportValidity()) return;
            const nome = document.getElementById('nome-cadastro').value.trim();
            if (nome.length < 2) { exibirMensagem('Informe seu nome para continuar.', true); return; }
            const email = document.getElementById('email-cadastro').value.trim();
            executarAcesso(async function () {
                const { data, error } = await cliente.auth.signUp({
                    email: email, password: senha,
                    options: { data: { nome: nome }, emailRedirectTo: retorno }
                });
                if (error) throw error;
                limparSenhas();
                if (data.session && data.user) {
                    modoRecuperacao = false;
                    mostrarConta(data.user);
                    exibirMensagem('Conta criada! Você já está conectado.');
                } else {
                    escolherAba('entrar', true);
                    document.getElementById('email-entrar').value = email;
                    exibirMensagem('Confira seu e-mail e o spam para confirmar o cadastro. Abra o link neste mesmo navegador. Se já tiver uma conta, use Entrar ou Esqueci minha senha.');
                }
            });
        });
        document.getElementById('reenviar-confirmacao').addEventListener('click', function () {
            const campo = document.getElementById('email-entrar');
            if (!campo.reportValidity()) return;
            const email = campo.value.trim();
            executarAcesso(async function () {
                const { error } = await cliente.auth.resend({ type: 'signup', email: email, options: { emailRedirectTo: retorno } });
                if (error) throw error;
                exibirMensagem('Se houver um cadastro aguardando confirmação, você receberá um novo link. Confira também o spam e abra o link neste navegador.');
            });
        });
        document.getElementById('recuperar-senha').addEventListener('click', function () {
            const campo = document.getElementById('email-entrar');
            if (!campo.reportValidity()) return;
            const email = campo.value.trim();
            executarAcesso(async function () {
                const { error } = await cliente.auth.resetPasswordForEmail(email, { redirectTo: retornoRecuperacao });
                if (error) throw error;
                exibirMensagem('Se houver uma conta para esse e-mail, você receberá um link para escolher outra senha. Confira o spam e abra o link neste navegador.');
            });
        });
        const confirmarNovaSenha = document.getElementById('confirmar-nova-senha');
        formularioNovaSenha.addEventListener('input', function () { confirmarNovaSenha.setCustomValidity(''); });
        formularioNovaSenha.addEventListener('submit', function () {
            if (!usuarioAtual || !modoRecuperacao) return;
            const senha = document.getElementById('nova-senha').value;
            confirmarNovaSenha.setCustomValidity(confirmarNovaSenha.value === senha ? '' : 'As senhas precisam ser iguais.');
            if (!formularioNovaSenha.reportValidity()) return;
            executarAcesso(async function () {
                const { data, error } = await cliente.auth.updateUser({ password: senha });
                if (error) throw error;
                modoRecuperacao = false;
                mostrarConta(data.user);
                limparSenhas();
                limparRetorno(true);
                exibirMensagem('Senha atualizada. Nos próximos acessos, use sua nova senha.');
            });
        });
        const botaoGoogle = document.getElementById('entrar-google');
        if (botaoGoogle) botaoGoogle.addEventListener('click', function () {
            if (!googleDisponivel) return;
            executarAcesso(async function () {
                const { error } = await cliente.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: retorno } });
                if (error) throw error;
                exibirMensagem('Abrindo a página de acesso do Google…');
            });
        });
        ['botao-sair', 'cancelar-recuperacao'].forEach(function (id) {
            document.getElementById(id).addEventListener('click', function () { executarAcesso(sairDaConta); });
        });
    }

    // 3b. PLANO NA CONTA (tabela "planos", veja supabase-planos.sql). Se ela não existir, o site segue só com o navegador.
    async function enviarPlano(plano) {
        if (!cliente || !usuarioAtual) return;
        const { error } = await cliente.from('planos').upsert({ user_id: usuarioAtual.id, dados: plano, atualizado_em: new Date().toISOString() });
        if (error) throw error;
    }
    async function sincronizarPlano(usuario) {
        if (!cliente || !document.getElementById('meu-ape') || sincronizando || planoNaConta) return;
        sincronizando = true;
        try {
            const { data, error } = await cliente.from('planos').select('dados').eq('user_id', usuario.id).maybeSingle();
            if (error) throw error;
            let local = null;
            try { local = JSON.parse(localStorage.getItem('spevion-painel-v1') || 'null'); } catch (erro) { local = null; }
            const tempoLocal = local && Number(local.salvoEm) || 0;
            const tempoConta = data && data.dados && Number(data.dados.salvoEm) || 0;
            if (tempoConta > tempoLocal) document.dispatchEvent(new CustomEvent('spevion:plano-nuvem', { detail: data.dados }));
            else if (tempoLocal > tempoConta) await enviarPlano(local);
            planoNaConta = true;
            document.dispatchEvent(new CustomEvent('spevion:conta', { detail: { ligada: true } }));
        } catch (erro) { /* sem tabela ou sem rede: o plano continua salvo no navegador */ }
        finally { sincronizando = false; }
    }
    document.addEventListener('spevion:plano-salvo', function (evento) {
        if (planoNaConta) enviarPlano(evento.detail).catch(function () {});
    });

    // 4. CONEXÃO. A chave pública do site nunca pode ser a chave secreta do servidor.
    function chaveEhPublica(chave) {
        if (typeof chave !== 'string') return false;
        if (chave.startsWith('sb_publishable_')) return true;
        try {
            const parte = chave.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            return JSON.parse(atob(parte)).role === 'anon';
        } catch (erro) { return false; }
    }
    function configuracaoValida() {
        try { return new URL(configuracao.urlSupabase).protocol === 'https:' && chaveEhPublica(configuracao.chavePublica); }
        catch (erro) { return false; }
    }
    function carregarBiblioteca() {
        if (window.supabase && window.supabase.createClient) return Promise.resolve();
        return new Promise(function (resolver, rejeitar) {
            const arquivo = document.createElement('script');
            arquivo.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js';
            arquivo.referrerPolicy = 'no-referrer';
            const tempo = setTimeout(function () { rejeitar(new Error('carregamento')); }, 12000);
            arquivo.onload = function () { clearTimeout(tempo); resolver(); };
            arquivo.onerror = function () { clearTimeout(tempo); rejeitar(new Error('carregamento')); };
            document.head.appendChild(arquivo);
        });
    }
    async function verificarGoogle() {
        if (!formularioEntrar) return;
        const texto = document.getElementById('aviso-google') || {};
        const controle = new AbortController();
        const tempo = setTimeout(function () { controle.abort(); }, 10000);
        try {
            // Consulta somente as opções públicas, sem listar pessoas ou dados do banco.
            const resposta = await fetch(configuracao.urlSupabase.replace(/\/$/, '') + '/auth/v1/settings', {
                headers: { apikey: configuracao.chavePublica }, signal: controle.signal
            });
            if (!resposta.ok) throw new Error('Configuração indisponível.');
            const dados = await resposta.json();
            googleDisponivel = Boolean(dados.external && dados.external.google);
            texto.textContent = googleDisponivel ? '' : 'O acesso pelo Google ainda não foi ativado.';
            texto.hidden = googleDisponivel;
        } catch (erro) {
            googleDisponivel = false;
            texto.textContent = 'O acesso pelo Google está indisponível no momento. Você pode entrar com e-mail e senha.';
        } finally { clearTimeout(tempo); habilitarAcoes(); }
    }
    if (!configuracaoValida()) {
        mostrarAviso('O acesso às contas precisa ser configurado. As ferramentas e a demonstração continuam disponíveis.');
        if (formularioEntrar) (document.getElementById('aviso-google') || {}).textContent = 'O acesso pelo Google ainda não está disponível.';
        return;
    }
    if (!['http:', 'https:'].includes(location.protocol)) {
        mostrarAviso('Para entrar, abra esta pasta pelo Live Server do seu editor ou pelo endereço publicado do site.');
        if (formularioEntrar) (document.getElementById('aviso-google') || {}).hidden = true;
        return;
    }
    try {
        await carregarBiblioteca();
        cliente = window.supabase.createClient(configuracao.urlSupabase, configuracao.chavePublica, {
            auth: { flowType: 'pkce', autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
        });
        // Registra antes de aguardar a sessão para reconhecer o link de recuperação.
        cliente.auth.onAuthStateChange(function (evento, sessao) {
            // Não chama métodos do Supabase aqui: o callback precisa ser síncrono.
            if (evento === 'SIGNED_OUT') {
                modoRecuperacao = false;
                mostrarConta(null);
                limparSenhas();
            }
            if (evento === 'PASSWORD_RECOVERY' && sessao) {
                modoRecuperacao = true;
                mostrarConta(sessao.user);
            }
            if (['SIGNED_IN', 'USER_UPDATED'].includes(evento) && sessao) mostrarConta(sessao.user);
        });
        const inicializacao = await cliente.auth.initialize();
        if (inicializacao.error) exibirMensagem(traduzirErro(inicializacao.error), true);
        const { data, error } = await cliente.auth.getSession();
        if (error) exibirMensagem(traduzirErro(error), true);
        if (data && data.session) {
            // Valida a conta no servidor, inclusive ao voltar para a página inicial.
            const resposta = await cliente.auth.getUser();
            if (resposta.error) {
                mostrarConta(null);
                exibirMensagem('Não foi possível confirmar sua sessão. Entre novamente.', true);
            } else mostrarConta(resposta.data.user);
        } else {
            mostrarConta(null);
            if (modoRecuperacao) exibirMensagem('Solicite um novo link em Esqueci minha senha e abra no mesmo navegador.', true);
        }
        if (erroRetorno) exibirMensagem(traduzirErro({ code: erroRetorno }), true);
        limparRetorno();
        pronto = true;
        mostrarAviso('');
        habilitarAcoes();
        verificarGoogle();
    } catch (erro) {
        pronto = false;
        mostrarConta(null);
        habilitarAcoes();
        mostrarAviso('Não foi possível conectar ao serviço de acesso. Recarregue a página para tentar novamente.');
        if (formularioEntrar) (document.getElementById('aviso-google') || {}).hidden = true;
        exibirMensagem(traduzirErro(erro), true);
    }
});
