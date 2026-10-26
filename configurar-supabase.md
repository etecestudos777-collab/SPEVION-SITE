# Fazer o login funcionar com seu Supabase

A URL e a chave pública que você enviou já estão em `configuracao.js`.

Na verificação de 29/09/2026, seu projeto respondeu normalmente, o cadastro por e-mail estava permitido e a confirmação de e-mail estava obrigatória (depois desativada por você no painel). O provedor Google ainda estava desligado. As configurações do painel não foram modificadas por esta atualização.

## 1. Abrir o site pelo endereço certo

1. Extraia o ZIP.
2. Abra a pasta `SPEVION/spevionsite` no seu editor.
3. Use o **Live Server** para abrir `login.html`.
4. Confira o endereço na barra do navegador. Um exemplo é `http://127.0.0.1:5500/login.html`.

Abrir o HTML com duplo clique gera um endereço `file://`, que não funciona para este login. Ao publicar, use o endereço HTTPS do site.

## 2. Configurar o retorno dos e-mails

No [painel do Supabase](https://supabase.com/dashboard), abra seu projeto e vá a **Authentication > URL Configuration**.

- Em **Site URL**, coloque o endereço da página inicial do seu site. Durante o teste local, um exemplo é `http://127.0.0.1:5500/index.html`.
- Em **Redirect URLs**, adicione o endereço completo de `login.html` e o mesmo endereço com `?modo=recuperar` no final.

Se sua pasta `spevion` for a raiz do Live Server, na porta 5500, os exemplos são:

```text
http://127.0.0.1:5500/login.html
http://127.0.0.1:5500/login.html?modo=recuperar
```

Use a porta e o caminho que aparecem no seu navegador. Se o endereço contiver `/spevion/` ou outras pastas, mantenha esse trecho. `localhost` e `127.0.0.1` são endereços diferentes: escolha um e use sempre o mesmo no teste e nas configurações.

Quando publicar, configure o **Site URL** com seu endereço publicado e adicione também os dois retornos HTTPS correspondentes. Se o site estiver no GitHub Pages dentro de um repositório, mantenha o nome do repositório no caminho.

Os modelos padrão de e-mail do Supabase já possuem os links de confirmação. Se você os personalizou, confira se o botão ainda usa `{{ .ConfirmationURL }}`. Este site não usa uma rota de servidor chamada `/auth/confirm`.

## 3. Criar uma conta e entrar

1. Abra a aba **Criar conta**, preencha seus dados e envie.
2. Confira o e-mail e a pasta de spam.
3. Abra o link no mesmo navegador e computador em que fez o cadastro.
4. O link deve voltar a `login.html`. Quando a sessão for confirmada, aparece **Conta conectada**.
5. Use **Ir para meu planejamento**. No topo da página, o botão passa a mostrar **Minha conta**.
6. Para conferir o usuário criado, abra **Authentication > Users** no Supabase.

Se o site disser que o e-mail ainda não foi confirmado, preencha o e-mail na aba Entrar e clique em **Reenviar confirmação de e-mail**. Cada novo pedido pode invalidar links anteriores; use o mais recente.

O código usa o fluxo PKCE do Supabase. Por isso, não troque de navegador ou limpe os dados do site entre pedir um link e abri-lo. Se isso acontecer, solicite um novo link no navegador que será usado.

## 4. Se o e-mail não chegar

O serviço padrão de envio do Supabase é restrito aos endereços dos membros da organização do projeto e tem limite de envio. A configuração pública do projeto não informa se você já utiliza um SMTP próprio.

Se aparecer **Email address not authorized** ou a mensagem de envio restrito, configure um serviço de e-mail em **Authentication > Emails > SMTP Settings**. Os dados SMTP ficam no painel do Supabase, nunca no HTML ou JavaScript.

Para aceitar cadastros de outras pessoas com confirmação por e-mail, é necessário configurar esse envio. Confira também **Authentication > Logs** para distinguir erro de envio, limite de solicitações e link expirado.

## 5. Recuperar a senha

1. Na aba Entrar, preencha somente o e-mail e clique em **Esqueci minha senha**.
2. Abra o link recebido no mesmo navegador.
3. Preencha **Nova senha** e a confirmação; clique em **Salvar nova senha**.
4. A mensagem de sucesso só aparece depois que o Supabase confirma a alteração.

O retorno termina em `login.html?modo=recuperar`, por isso esse endereço também precisa estar na lista **Redirect URLs**. A recuperação depende do mesmo serviço de envio de e-mails.

## 6. Ativar Google, se quiser usar essa opção

O botão já está no código. Ele é liberado automaticamente ao recarregar a página depois que o provedor estiver ativo.

1. Em **Authentication > Sign In / Providers > Google**, localize a URL de callback do projeto.
2. No Google Cloud, configure uma credencial OAuth de aplicação Web e a tela de consentimento.
3. Nas origens JavaScript autorizadas, informe a origem do site, como `http://127.0.0.1:5500` ou seu domínio HTTPS. Não inclua `/login.html` nesse campo.
4. Na URI de redirecionamento autorizada do Google, use a URL de callback fornecida pelo Supabase. Para seu projeto, ela é:

```text
https://cqhydkmuidwlgmdsedyc.supabase.co/auth/v1/callback
```

5. Copie o **Client ID** e o **Client Secret** para os campos do provedor Google no painel do Supabase, ative e salve. O segredo fica somente no painel.
6. Se a tela de consentimento do Google estiver em modo de teste, adicione a conta que vai testar à lista de usuários de teste.
7. Confira os endereços de retorno da etapa 2 e recarregue o login.

## O que é salvo nesta versão

O Supabase armazena e autentica as contas. O planejamento financeiro continua sendo o rascunho local do navegador, como no ZIP enviado. Ele não é sincronizado por conta nem enviado ao banco nesta versão. O modo demonstração continua separado desse rascunho.

## Documentação oficial

- [Cadastro e login com senha](https://supabase.com/docs/guides/auth/passwords)
- [URLs de retorno](https://supabase.com/docs/guides/auth/redirect-urls)
- [Configuração do envio de e-mails](https://supabase.com/docs/guides/auth/auth-smtp)
- [Fluxo PKCE e uso do mesmo navegador](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [Login com Google](https://supabase.com/docs/guides/auth/social-login/auth-google)

## 7. Guardar o plano na conta

1. No Supabase, abra **SQL Editor > New query**.
2. Cole o conteúdo de `supabase-planos.sql` e clique em **Run**.
3. Entre no site, salve um diagnóstico e confira a linha em **Table Editor > planos**.

A tabela usa RLS: cada pessoa só lê e grava o próprio plano.
