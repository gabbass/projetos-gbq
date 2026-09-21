# App3 — modelos GBQ na Meta e envio da fila existente

## Objetivo

Fazer uma alteração pequena no App3/Sagazap, reaproveitando a conexão WhatsApp, autenticação, banco, fila e função de envio que já existem.

A implementação deve somente:

1. cadastrar na Meta os cinco modelos usados pelo GBQ;
2. salvar no mecanismo de modelos existente os IDs e status retornados pela Meta;
3. manter na fila as mensagens cujo modelo ainda não foi aprovado;
4. chamar o processador existente em lotes pequenos durante requisições normais.

Não criar cron, worker externo, painel, nova fila ou arquitetura paralela. O projeto continuará no plano Hobby da Vercel.

## Reutilizar o que já existe

Antes de implementar, localizar no App3 e reutilizar:

- autenticação por `app3_live_...` e resolução da organização;
- conexão WhatsApp/WABA e token da Meta;
- cliente da Graph API;
- persistência de modelos;
- fila de mensagens;
- função que envia mensagens pendentes;
- tratamento atual de tentativas e erros;
- webhook da Meta.

Adaptar os nomes deste documento ao código real. Não duplicar essas estruturas.

## Endpoints usados pelo GBQ

```text
POST /api/integrations/v1/whatsapp/templates/gbq
POST /api/integrations/v1/whatsapp/messages/template
```

As duas rotas usam o service token existente. A organização deve vir do cliente autenticado, nunca do corpo da requisição.

## Catálogo dos modelos

Todos usam idioma `pt_BR`, categoria `UTILITY` e componente `BODY`.

### `gbq_tarefa_criada_v2`

```text
Uma nova tarefa foi criada no projeto {{1}}.
Código: {{2}}
Tarefa: {{3}}
Status: {{4}}
```

Exemplos: `Implantação GBQ`, `T3CDEF`, `Configurar domínio`, `Em andamento`.

### `gbq_status_tarefa_v2`

```text
O status de uma tarefa foi atualizado no projeto {{1}}.
Código: {{2}}
Tarefa: {{3}}
Status anterior: {{4}}
Novo status: {{5}}
```

Exemplos: `Implantação GBQ`, `T3CDEF`, `Configurar domínio`, `Em andamento`, `Concluído`.

### `gbq_tarefa_atualizada_v2`

```text
Uma tarefa foi atualizada no projeto {{1}}.
Código: {{2}}
Tarefa: {{3}}
Alterações: {{4}}
```

Exemplos: `Implantação GBQ`, `T3CDEF`, `Configurar domínio`, `responsável, prazo`.

### `gbq_projeto_atualizado_v2`

```text
O projeto {{1}} — {{2}} foi atualizado.
Alterações: {{3}}
```

Exemplos: `P1ABCD`, `Implantação GBQ`, `prioridade, prazo`.

### `gbq_mensagem_tarefa_v2`

```text
Nova mensagem de {{1}} na tarefa {{2}} — {{3}}.
Projeto: {{4}}
Acesse o GBQ para visualizar a conversa.
```

Exemplos: `Gabriel`, `T3CDEF`, `Configurar domínio`, `Implantação GBQ`.

Não mudar a ordem ou a quantidade das variáveis. O GBQ já envia os parâmetros nessa ordem.

## Implementação mínima

### 1. Catálogo local

Criar um único array ou objeto constante com os cinco modelos. Não criar tabela nova para o catálogo.

Cada item precisa conter somente:

```text
name
language
category
body
examples
```

### 2. Provisionamento na Meta

Implementar `POST /api/integrations/v1/whatsapp/templates/gbq`:

1. autenticar o service client;
2. resolver a organização e sua conexão WhatsApp;
3. listar na Meta os modelos existentes da WABA;
4. criar cada modelo do catálogo que ainda não exista com o mesmo nome e idioma;
5. salvar ou atualizar o ID e o status usando a persistência já existente;
6. chamar a função existente de processamento da fila com um lote pequeno;
7. retornar o estado dos cinco modelos e a quantidade processada da fila.

Não apagar nem recriar `hello_world`. Repetir a chamada não pode criar duplicatas.

Resposta compatível com o GBQ:

```json
{
  "ready": false,
  "templates": [
    {
      "name": "gbq_tarefa_criada_v2",
      "id": "123456789",
      "status": "PENDING",
      "created": true
    }
  ],
  "queue": {
    "processed": 0,
    "remaining": 12
  }
}
```

`ready` será `true` somente quando os cinco modelos estiverem aprovados. Para modelo já existente, `created` será `false`.

### 3. Reaproveitar a fila

Não criar outra fila.

Na função de envio já existente:

- modelo `APPROVED`: enviar normalmente;
- modelo ausente ou ainda não aprovado: manter a mensagem pendente na fila;
- falha temporária da Meta: manter na fila usando a tentativa existente;
- sucesso: marcar como enviada somente depois que a Meta retornar o identificador;
- falha em um item: continuar com os demais itens do lote;
- item que já possui confirmação da Meta: não enviar novamente.

Se o estado atual da fila remove mensagens quando o modelo não existe, corrigir somente esse comportamento. Usar o campo/status já existente sempre que possível.

### 4. Processamento sem cron

Extrair ou reutilizar uma única função, por exemplo:

```ts
processPendingWhatsappMessages({ organizationId, limit: 10 })
```

Chamadas dessa função:

1. depois de inserir uma mensagem em `/messages/template`;
2. depois de provisionar ou sincronizar modelos em `/templates/gbq`;
3. ao receber no webhook da Meta uma atualização relevante do WhatsApp;
4. em outras rotas do WhatsApp que já façam processamento da fila, sem criar novas rotas apenas para isso.

Cada execução processa um lote pequeno, por exemplo 10 mensagens, e encerra. O restante continua persistido para a próxima requisição.

Quando `/messages/template` receber uma mensagem:

1. persistir na fila como já ocorre;
2. tentar processar o lote;
3. retornar o ID interno mesmo se o modelo ainda estiver aguardando aprovação.

Quando o webhook indicar mudança de modelo para `APPROVED`, atualizar o status e processar imediatamente um lote das mensagens pendentes daquele modelo. Se o webhook atual não receber status de modelo, a chamada manual ao endpoint de provisionamento também deve sincronizar os status e processar a fila.

Não usar `setTimeout`, loop infinito, processo residente ou promessa solta após a resposta HTTP.

## Testes mínimos

1. cria os cinco modelos quando não existem;
2. repetir o provisionamento não cria duplicatas;
3. salva ID e status da Meta usando o repositório existente;
4. modelo não aprovado mantém a mensagem na fila;
5. modelo aprovado usa o sender existente;
6. uma falha não impede o restante do lote;
7. item já enviado não é enviado novamente;
8. enfileirar uma mensagem chama o processador em lote;
9. provisionar modelos chama o processador em lote;
10. respostas e logs não expõem tokens ou telefones completos.

## Critérios de aceite

1. Chamar `/templates/gbq` envia os cinco modelos para a WABA correta.
2. Os modelos aparecem no Gerenciador do WhatsApp sem duplicatas.
3. Chamadas posteriores apenas sincronizam os status.
4. Mensagens existentes permanecem na fila enquanto o modelo aguarda aprovação.
5. Depois da aprovação, uma nova mensagem, webhook ou nova chamada de provisionamento processa os itens pendentes em lotes.
6. A implementação funciona no Hobby da Vercel sem cron.
7. Nenhuma fila, painel ou tabela paralela é criada.
8. Nenhuma mensagem é apagada por falta de modelo aprovado.

## Fora do escopo

- cron;
- Vercel Pro;
- painel administrativo novo;
- nova arquitetura de filas;
- novas tabelas, salvo impossibilidade comprovada de usar as atuais;
- worker externo;
- métricas e alertas novos;
- botões ou URLs nos modelos;
- alteração no GBQ além do contrato já implementado.

A tarefa estará concluída quando os cinco modelos tiverem sido submetidos à Meta e a fila existente continuar sendo processada pelo mecanismo atual conforme novas requisições e webhooks ocorrerem.
