# SPEVION — planejamento e login com Supabase

O projeto continua em HTML, CSS e JavaScript puro. Não precisa instalar pacotes, compilar o código ou aprender um framework para usar as novas funções.

## Como abrir

1. Extraia o ZIP inteiro.
2. Entre em `SPEVION/spevionsite`.
3. Abra `index.html` no navegador. As ferramentas e a demonstração funcionam sem internet.
4. Para editar, abra essa pasta no seu editor e mantenha os arquivos juntos.

Para acessar contas, abra a pasta pelo **Live Server** do seu editor ou pelo endereço publicado. O login usa internet e precisa de HTTP/HTTPS. A demonstração não precisa de login.

A URL e a chave pública do Supabase enviadas no seu ZIP foram mantidas. Veja **CONFIGURAR-SUPABASE.md** para ajustar os links de confirmação e recuperação no painel do seu projeto.

## O que cada arquivo faz

| Arquivo | Função |
| --- | --- |
| `index.html` | Textos, seções, formulários e botões da página principal. |
| `comum.css` | Cores, fontes, tema, cabeçalho, botões e campos compartilhados. |
| `index.css` | Visual das áreas da página inicial. As novas regras estão no final, a partir do comentário 10. |
| `spevion.js` | Tema, menu, cálculos, salvamento local, gráfico, perfil, missões e demonstração. Está dividido por comentários numerados. |
| `login.html` e `login.css` | Estrutura e aparência do acesso à conta. |
| `autenticacao.js` | Cadastro, entrada, confirmação de e-mail, recuperação de senha, Google e sessão na página inicial. |
| `configuracao.js` | Configuração pública do Supabase já fornecida no projeto. |
| `CONFIGURAR-SUPABASE.md` | Orientações para ativar e testar o acesso pelo seu projeto. |
| `imagens` | Pasta da logo e das imagens. |

## Como usar as nove funções

1. **Diagnóstico financeiro:** preencha a renda e os gastos das seis categorias. Clique em **Salvar diagnóstico** para atualizar saldo, gráfico e dica. Campo com zero significa que não há gasto naquela categoria.
2. **Simulador “E se…?”:** clique em **Usar meu plano**, escolha quanto guardar por mês e um extra mensal. Clique em **Comparar cenários**. Você também pode preencher outros números para testar uma hipótese; isso não altera a meta salva.
3. **Meu primeiro apê:** informe a meta da entrada e o total que já guardou. **Salvar minha meta** atualiza a barra de progresso. Ao guardar mais, informe o novo total acumulado, não apenas o depósito do dia.
4. **Missões, XP e níveis:** concluir atividades libera pontos automaticamente. Repetir o mesmo cálculo não dá pontos duplicados. Os níveis vão de 1 a 5, com um nível a cada 100 XP.
5. **Trilha do primeiro imóvel:** abra **Entender esta etapa**, leia a explicação e marque o que concluiu. Cada etapa marcada vale 50 XP. Desmarcar remove seus 50 XP; remarcar devolve os mesmos pontos.
6. **Gráfico de gastos:** aparece ao salvar o diagnóstico. Cada barra representa uma categoria e mostra o valor e sua porcentagem do total. Se não houver gastos, aparece uma mensagem em vez de um gráfico sem dados.
7. **Perfil personalizável:** em **Missões**, abra **Personalizar perfil**, escolha apelido e avatar e salve. O cartão exibe XP, nível e medalhas.
8. **Dica do momento:** muda automaticamente conforme o último plano salvo. Pode orientar a preencher o orçamento, rever gastos, definir uma meta, testar um cenário ou continuar a trilha.
9. **Modo demonstração:** clique em **Explorar demonstração**. O site carrega o exemplo do Alex e você pode alterar os números e completar atividades. **Sair da demonstração** traz de volta seu plano pessoal salvo.

O simulador de parcelas pela Tabela Price também continua disponível, na seção **Tire seu plano do papel**.

## Roteiro rápido para a banca

1. Clique em **Explorar demonstração** na abertura do site.
2. Mostre o painel: meta de R$ 60.000, R$ 15.000 guardados e progresso de 25%.
3. Mostre o diagnóstico: renda de R$ 4.000, gastos de R$ 2.800 e saldo de R$ 1.200.
4. No “E se…?”, mostre que guardar R$ 1.200 por mês leva 38 meses. Com R$ 500 extras por mês, são 27 meses: 11 meses a menos. O site avisa que o valor extra exige renda adicional ou redução de gastos, pois ultrapassa o saldo do diagnóstico.
5. Clique em **Comparar cenários** para concluir a missão e liberar a medalha **Plano traçado**. O cálculo automático da abertura não dá XP.
6. Personalize o perfil, abra uma explicação da trilha e marque uma etapa. Mostre a mudança no XP.
7. Alterne entre os temas claro e escuro.
8. Clique em **Sair da demonstração** para mostrar que o plano pessoal foi preservado.

Para abrir diretamente a demonstração, acrescente `?modo=demo#meu-ape` ao endereço de `index.html`. Recarregar a demonstração reinicia o exemplo.

## Entendendo o JavaScript sem complicar

- `document.getElementById('renda')` encontra o campo com `id="renda"` no HTML.
- `.valueAsNumber` lê o número digitado nesse campo.
- `addEventListener('submit', ...)` executa uma função quando o formulário é enviado.
- `evento.preventDefault()` evita recarregar a página ao clicar em Salvar ou Calcular.
- `dados` é uma ficha com renda, gastos, meta, perfil e atividades concluídas.
- `if` e `else` escolhem qual resultado ou dica aparece.
- `forEach` repete uma ação para cada categoria, missão ou etapa.
- `textContent` troca um texto da página. O apelido é mostrado como texto, sem executar HTML.
- `localStorage` é o armazenamento do próprio navegador.
- `JSON.stringify` transforma a ficha em texto para salvar; `JSON.parse` recupera essa ficha.
- `atualizarTela()` chama as funções que atualizam o painel, o gráfico, a dica e os pontos.
- O gráfico é feito com barras de CSS. O JavaScript muda a largura de cada barra; não existe biblioteca de gráficos.

### As contas principais

**Saldo mensal = renda − soma dos gastos.**

**Falta para a meta = meta − valor guardado**, sem ficar abaixo de zero.

**Progresso = valor guardado ÷ meta × 100**, limitado a 100% na barra.

**Prazo = valor que falta ÷ valor guardado por mês**, arredondando para cima. Sem contribuição mensal, não existe prazo calculável. Se o valor guardado já cobre a meta, o resultado é “Meta alcançada”.

O cálculo usa centavos inteiros para evitar pequenos erros de arredondamento. O “E se…?” não considera rendimentos, inflação ou mudanças futuras nos gastos. O simulador de financiamento mantém as limitações educativas que já estavam na página.

## Onde os dados ficam

Diagnóstico, meta, perfil, missões e trilha ficam em `localStorage`, neste navegador e neste endereço. Eles continuam disponíveis ao recarregar a página, desde que o navegador permita salvar. Em navegação privada ou depois de limpar os dados do navegador, podem desaparecer. Não há sincronização entre aparelhos ou contas.

O plano fica no `localStorage`. Quando a pessoa entra na conta **e** a tabela `planos` existe no Supabase (rode `supabase-planos.sql` no SQL Editor), o plano também é guardado na conta, protegido por RLS, e acompanha a pessoa em outros aparelhos. O plano mais recente (campo `salvoEm`) vence. Sem a tabela, o site continua funcionando só com o navegador.

O modo demonstração mantém os dados fictícios apenas na memória da página. Ele não sobrescreve o plano pessoal salvo. Alterações digitadas sem clicar em Salvar não são mantidas ao trocar de modo. O tema é uma preferência compartilhada pelos dois modos.

As missões concluídas não se repetem. As medalhas refletem as missões e as etapas atuais: desmarcar etapas pode reduzir o nível e bloquear novamente uma medalha ligada ao total de XP ou à trilha completa.

## Login e cadastro

- **Criar conta:** informa nome, e-mail e senha. O Supabase cria e gerencia o usuário. Com a confirmação de e-mail ativada, é necessário abrir o link recebido antes de entrar.
- **Entrar:** usa o e-mail e a senha da conta cadastrada no SPEVION. A página inicial passa a mostrar **Minha conta** quando a sessão é validada.
- **Reenviar confirmação de e-mail:** usa o endereço preenchido na aba Entrar para pedir outro link.
- **Esqueci minha senha:** usa o e-mail preenchido e envia o link de recuperação. Ao abrir esse link, a tela oferece o formulário para escolher outra senha.
- **Continuar com Google:** o site consulta a configuração pública do projeto e libera o botão quando o provedor Google estiver ativado no Supabase.
- **Sair da conta:** encerra a sessão neste navegador. O Supabase mantém a sessão entre visitas enquanto ela for válida.

Os links de confirmação e recuperação devem ser abertos no mesmo navegador em que foram solicitados. Não é necessário criar uma tabela de usuários no SQL Editor: as contas aparecem em **Authentication > Users**. As senhas não são gravadas pelo código do site nem no armazenamento do planejamento.

Foram verificadas a conexão e as opções públicas do seu projeto, sem criar usuários reais ou enviar e-mails. As telas também foram testadas com respostas simuladas do serviço. O cadastro completo e a entrega do e-mail precisam ser conferidos no seu navegador, com uma conta sua.
