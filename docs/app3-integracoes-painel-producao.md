# App3/Sagazap — gestão de API e webhooks pelo painel

## Objetivo

Implementar no Sagazap/App3 uma área administrativa em **Configurações → Integrações** para que administradores criem e gerenciem integrações server-to-server em produção sem executar scripts locais, editar o banco ou carregar segredos de produção no computador.

O primeiro consumidor será o `projetos-gbq`, mas a solução deve ser genérica para outros sistemas.

## Resultado esperado

Um administrador da organização deverá conseguir, pelo painel:

1. Criar um cliente de API.
2. Copiar uma única vez o token `app3_live_...`.
3. Cadastrar um endpoint HTTPS de webhook.
4. Selecionar os eventos enviados ao endpoint.
5. Copiar uma única vez o segredo de assinatura do webhook.
6. Testar a API e o webhook.
7. Consultar tentativas recentes de entrega.
8. Rotacionar credenciais e revogar integrações.

Nenhum segredo deve ser armazenado em texto puro ou reapresentado depois da criação.

## Escopo funcional

### Página

Criar a rota:

```text
/dashboard/settings/integrations
```

Adicionar o item **Integrações** à navegação de Configurações. A página deve ser acessível apenas por `ADMIN` da própria organização e por `SUPERADMIN` no contexto de uma organização selecionada.

Nunca aceitar `organizationId` enviado pelo navegador para autorizar uma operação. A organização deve ser obtida exclusivamente da sessão autenticada.

### Seção “Clientes da API”

Exibir uma tabela com:

- Nome do cliente;
- Status: `ACTIVE` ou `REVOKED`;
- Data de criação;
- Último uso;
- Quantidade de webhooks ativos;
- Ações.

Ações disponíveis:

- **Criar cliente**;
- **Revogar**;
- **Gerar novo token**, implementado como criação de um novo cliente/token e revogação explícita do anterior;
- **Ver webhooks**.

#### Criação do cliente

O formulário solicita somente um nome, por exemplo `projetos-gbq`.

Ao confirmar:

1. Gerar token criptograficamente seguro com prefixo `app3_live_`.
2. Armazenar apenas o SHA-256 do token.
3. Mostrar o token uma única vez em um diálogo.
4. Oferecer botão **Copiar token**.
5. Exigir confirmação “Já guardei o token” antes de fechar.

Se o diálogo for fechado sem copiar, o token não poderá ser recuperado; o usuário deverá criar outro.

### Seção “Webhooks”

Cada webhook deve pertencer a um cliente de API da mesma organização.

Campos:

- Cliente da API;
- Nome descritivo;
- URL HTTPS do endpoint;
- Eventos, por caixas de seleção;
- Status ativo/inativo.

Eventos inicialmente suportados:

```text
whatsapp.message.received
whatsapp.message.status
```

Para o GBQ, usar:

```text
https://projetos.gbassotto.com.br/api/integrations/app3/webhook
```

#### Segredo compartilhado

Todos os eventos selecionados para o mesmo endpoint devem usar **um único segredo de assinatura**. O segredo será gerado uma vez, criptografado com `DATA_ENCRYPTION_KEY` e associado a todas as assinaturas daquele endpoint.

Ao criar o webhook, mostrar uma única vez:

```text
APP3_WEBHOOK_SECRET=<segredo-gerado>
```

Oferecer botão **Copiar configuração**, que produz:

```env
APP3_API_URL=https://app3.gbassotto.com.br
APP3_SERVICE_TOKEN=<token-copiado-na-criacao-do-cliente>
APP3_WEBHOOK_SECRET=<segredo-copiado-na-criacao-do-webhook>
```

O painel não deve tentar recuperar o token do cliente, pois somente seu hash é armazenado. Se o token não estiver mais disponível para o usuário, orientar a criação de um novo cliente/token.

### Teste da integração

Disponibilizar duas ações independentes:

#### Testar autenticação da API

O teste deve validar internamente que:

- o cliente está ativo;
- a organização possui conexão WhatsApp;
- o status da conexão pode ser consultado;
- o pagamento não está pendente.

Não solicitar que o token bruto seja reenviado ao backend para esse teste.

#### Enviar webhook de teste

Enviar um evento sintético, assinado exatamente como um evento real, para a URL cadastrada.

Exemplo:

```json
{
  "id": "evt_test_<uuid>",
  "event": "whatsapp.message.received",
  "createdAt": 1770000000000,
  "data": {
    "contactWaId": "5511999999999",
    "messageId": "wamid.test",
    "type": "text",
    "text": "Teste de integração do Sagazap"
  }
}
```

Enviar os cabeçalhos:

```text
content-type: application/json
x-app3-event-id: <id do evento>
x-app3-timestamp: <epoch em milissegundos>
x-app3-signature: sha256=<HMAC-SHA256(timestamp + "." + corpo bruto)>
```

O painel deve mostrar:

- horário do teste;
- código HTTP;
- duração;
- sucesso ou falha;
- mensagem sanitizada do erro.

Nunca mostrar corpo de resposta que possa conter segredos, cookies ou dados pessoais.

## API administrativa do painel

Criar rotas autenticadas separadas da API pública `/api/integrations/v1`:

```text
GET    /api/settings/integrations/clients
POST   /api/settings/integrations/clients
POST   /api/settings/integrations/clients/[id]/revoke

GET    /api/settings/integrations/webhooks
POST   /api/settings/integrations/webhooks
PATCH  /api/settings/integrations/webhooks/[id]
POST   /api/settings/integrations/webhooks/[id]/rotate-secret
POST   /api/settings/integrations/webhooks/[id]/test
DELETE /api/settings/integrations/webhooks/[id]

GET    /api/settings/integrations/webhooks/[id]/deliveries
```

Todas as rotas devem:

- exigir sessão válida;
- exigir `ADMIN` ou `SUPERADMIN` autorizado;
- derivar `organizationId` da sessão;
- verificar que cliente, webhook e entrega pertencem à organização da sessão;
- validar entrada com Zod;
- usar respostas de erro sem detalhes internos;
- registrar auditoria sem tokens, segredos ou payloads sensíveis.

## Persistência

O projeto já possui:

- `integration_service_clients`;
- `integration_webhook_subscriptions`;
- `integration_webhook_deliveries`.

### Alteração recomendada

Para representar corretamente um endpoint com vários eventos e um segredo compartilhado, criar uma entidade de endpoint:

```text
integration_webhook_endpoints
- id
- service_client_id
- name
- endpoint_url
- signing_secret_encrypted
- status
- created_at
- updated_at
- last_tested_at
```

As assinaturas passam a referenciar `webhook_endpoint_id` e guardam somente o evento:

```text
integration_webhook_subscriptions
- id
- webhook_endpoint_id
- event
- status
- created_at
- updated_at
```

Adicionar restrições:

```text
UNIQUE(webhook_endpoint_id, event)
UNIQUE(service_client_id, endpoint_url)
```

As entregas devem continuar vinculadas à assinatura, permitindo identificar o evento e o endpoint.

### Compatibilidade com dados atuais

A migration deve:

1. Agrupar assinaturas atuais por cliente e URL.
2. Criar um endpoint para cada grupo.
3. Preservar um segredo válido por grupo.
4. Relacionar as assinaturas ao novo endpoint.
5. Manter histórico de entregas.
6. Remover colunas antigas apenas depois de validar a migração.

Se assinaturas antigas para a mesma URL tiverem segredos diferentes, não escolher silenciosamente um deles. Marcar o endpoint como `REQUIRES_ROTATION` e exigir rotação no painel antes de reativá-lo.

## Rotação e revogação

### Rotação do token da API

Como o token bruto não é recuperável, a rotação deve:

1. Criar um novo cliente/token ou uma nova credencial vinculada ao cliente.
2. Mostrar o novo token uma única vez.
3. Permitir um período curto de sobreposição, se implementado com múltiplas credenciais.
4. Revogar o token anterior por confirmação explícita.

Na primeira versão, é aceitável criar um novo cliente e revogar manualmente o anterior.

### Rotação do segredo do webhook

1. Gerar um novo segredo seguro.
2. Atualizar atomicamente o endpoint e todos os eventos associados.
3. Mostrar o segredo uma única vez.
4. Manter o endpoint inativo até o administrador confirmar que atualizou o consumidor, ou oferecer período de sobreposição com segredo anterior por prazo limitado.

Na primeira versão, usar o fluxo seguro: desativar → rotacionar → copiar → atualizar consumidor → testar → reativar.

## Entrega de eventos

Requisitos:

- Corpo JSON serializado uma única vez antes da assinatura;
- HMAC calculado sobre exatamente o corpo enviado;
- timeout máximo configurável, inicialmente 10 segundos;
- sucesso somente para HTTP `2xx`;
- persistência de todas as tentativas;
- repetição com backoff para falhas transitórias;
- idempotência pelo `x-app3-event-id`;
- limite de tamanho do corpo;
- bloqueio de URLs privadas e metadados de nuvem para evitar SSRF;
- somente HTTPS em produção;
- resolução DNS validada antes da entrega;
- não seguir redirecionamentos automaticamente.

Política inicial de repetição:

```text
tentativa 1: imediata
tentativa 2: +1 minuto
tentativa 3: +5 minutos
tentativa 4: +30 minutos
tentativa 5: +2 horas
```

Como a aplicação roda na Vercel e não possui worker permanente, implementar as repetições por mecanismo durável compatível com a infraestrutura escolhida; não usar `setTimeout`, memória do processo ou promessas desacopladas da requisição.

## Segurança

- Token da API: gerar com CSPRNG e armazenar somente o hash SHA-256.
- Segredo do webhook: gerar com CSPRNG de pelo menos 32 bytes e armazenar cifrado com AES-256-GCM usando `DATA_ENCRYPTION_KEY`.
- Nunca registrar tokens, segredos, cabeçalhos de autorização ou corpos completos de webhook.
- Não expor credenciais em query string.
- Aplicar proteção contra CSRF às mutações autenticadas por cookie, conforme o padrão adotado pela aplicação.
- Aplicar rate limit às rotas administrativas e à ação de teste.
- Exigir confirmação explícita para revogar, excluir ou rotacionar.
- Registrar auditoria com usuário, organização, ação, alvo, horário, IP e resultado.
- Mascarar URLs e identificadores sensíveis quando apropriado.
- Não permitir que um administrador acesse clientes ou webhooks de outra organização alterando IDs na URL.

## Interface

Estados mínimos:

- carregando;
- vazio;
- erro recuperável;
- cliente ativo/revogado;
- webhook ativo/inativo/com falha/requer rotação;
- teste em andamento;
- teste concluído;
- segredo exibido uma única vez.

O painel deve alertar claramente:

> Copie esta credencial agora. Por segurança, ela não poderá ser exibida novamente.

Não colocar token ou segredo em toast temporário. Usar diálogo persistente com campo mascarável, botão de copiar e confirmação.

## Configuração específica do GBQ

No Sagazap:

```text
Cliente: projetos-gbq
Endpoint: https://projetos.gbassotto.com.br/api/integrations/app3/webhook
Eventos:
- whatsapp.message.received
- whatsapp.message.status
```

Na VPS do GBQ, as credenciais copiadas do painel continuam sendo configuradas em:

```text
/var/www/projetos-gbq/.env.local
```

```env
APP3_API_URL=https://app3.gbassotto.com.br
APP3_SERVICE_TOKEN=app3_live_...
APP3_WEBHOOK_SECRET=...
```

Depois:

```bash
pm2 restart projetos-gbq --update-env
```

O Sagazap não deve tentar acessar a VPS ou alterar remotamente o arquivo `.env.local`. O painel apenas gera e apresenta as credenciais de forma segura.

## Critérios de aceite

1. Um `ADMIN` cria um cliente sem informar `organizationId`.
2. O token aparece uma vez e somente seu hash fica no banco.
3. Um administrador cadastra uma URL HTTPS e os dois eventos do WhatsApp.
4. Os dois eventos usam o mesmo segredo.
5. O segredo aparece uma vez e permanece cifrado no banco.
6. O webhook de teste chega ao GBQ com assinatura válida.
7. O teste registra código HTTP, duração e resultado.
8. Mensagem real recebida no WhatsApp gera entrega ao GBQ.
9. Status real de mensagem gera entrega ao GBQ.
10. Reenvio do mesmo evento não duplica a notificação no GBQ.
11. Um administrador de outra organização recebe `404` ou `403` sem vazamento de existência.
12. Token revogado retorna `401` ou `403` na API externa.
13. Webhook desativado deixa de receber eventos.
14. Rotação invalida o segredo anterior após a ativação do novo.
15. Logs e respostas não contêm credenciais.
16. Testes automatizados cobrem autorização, isolamento multi-organização, assinatura, rotação, SSRF e falhas de entrega.

## Testes obrigatórios

### Unitários

- geração e hash de token;
- geração, criptografia e descriptografia do segredo;
- assinatura e validação HMAC;
- serialização estável do corpo enviado;
- validação de URL e bloqueio SSRF;
- transições de status;
- sanitização de erros.

### Integração

- CRUD administrativo com sessão;
- isolamento entre organizações;
- criação atômica do endpoint e eventos;
- rotação atômica;
- entrega `2xx`, `4xx`, `5xx`, timeout e DNS inválido;
- persistência das tentativas;
- autenticação da API externa com token ativo e revogado.

### Ponta a ponta

- criar cliente pelo painel;
- copiar token;
- criar webhook com dois eventos;
- copiar segredo;
- configurar ambiente de teste do consumidor;
- enviar webhook de teste;
- confirmar entrega e exibição no histórico.

## Implantação em produção

1. Criar migration e testes de migração.
2. Implementar repositórios e serviços sem UI.
3. Implementar rotas administrativas e testes de autorização.
4. Implementar a página de Configurações.
5. Implantar inicialmente com feature flag apenas para `SUPERADMIN`.
6. Migrar ou recriar a integração `projetos-gbq` pelo painel.
7. Configurar as credenciais na VPS do GBQ.
8. Executar teste de webhook.
9. Validar mensagem recebida e status de entrega reais.
10. Ativar a funcionalidade para administradores das organizações.
11. Remover o uso operacional dos scripts manuais somente após a validação.

## Fora do escopo inicial

- Alterar automaticamente variáveis de ambiente de sistemas consumidores;
- revelar novamente tokens ou segredos existentes;
- permitir URLs HTTP em produção;
- permitir eventos arbitrários digitados pelo usuário;
- integração OAuth entre App3 e sistemas consumidores;
- editor de payload no teste de webhook.

