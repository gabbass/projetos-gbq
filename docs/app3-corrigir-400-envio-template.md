# App3 — corrigir `400` no envio de modelos do WhatsApp

## Contexto do erro

O GBQ está chamando:

```text
POST /api/integrations/v1/whatsapp/messages/template
```

Em produção, a chamada retornou `400` antes de qualquer acesso à Meta:

```text
Request ID: f56pf-1789841282890-69dfcf789162
Deployment: dpl_42d7N6aZTJXipXryFAT7ECQXvxhy
Host: app3.gbassotto.com.br
External APIs: No outgoing requests
```

Isso indica que o App3 está rejeitando a requisição localmente, provavelmente durante a leitura ou validação do corpo.

## Contrato enviado pelo GBQ

O App3 deve aceitar JSON no seguinte formato:

```json
{
  "to": "5511999999999",
  "templateName": "gbq_tarefa_criada_v2",
  "language": "pt_BR",
  "parameters": [
    "Implantação GBQ",
    "T3CDEF",
    "Configurar domínio",
    "Em andamento"
  ]
}
```

Campos:

- `to`: telefone somente com dígitos, em formato internacional, entre 12 e 15 dígitos;
- `templateName`: nome do modelo aprovado ou aguardando aprovação;
- `language`: opcional, com padrão `pt_BR`;
- `parameters`: opcional para modelos sem variáveis; quando presente, deve ser um array de strings na ordem das variáveis `{{1}}`, `{{2}}` e seguintes.

Não exigir `organizationId`, identificador da conexão, token da Meta ou WABA no corpo. A organização deve continuar sendo resolvida pelo service token autenticado.

## Alteração necessária

Localizar o handler real de:

```text
/api/integrations/v1/whatsapp/messages/template
```

Corrigir o schema e o parser para aceitarem `parameters`. Exemplo conceitual com Zod, adaptando aos utilitários já usados pelo App3:

```ts
const sendTemplateSchema = z.object({
  to: z.string().regex(/^\d{12,15}$/),
  templateName: z.string().trim().min(1).max(512),
  language: z.string().trim().min(2).max(16).default("pt_BR"),
  parameters: z.array(z.string().max(1024)).max(20).default([]),
})
```

Não substituir os nomes públicos por `template_name`, `variables`, `params` ou pela estrutura nativa da Graph API. Essa conversão deve acontecer internamente, no sender já existente.

Depois da validação:

1. resolver o cliente e a organização pelo bearer token;
2. resolver a conexão WhatsApp da organização;
3. localizar o modelo por `templateName` e `language`;
4. validar a quantidade de `parameters` contra as variáveis do modelo, se essa informação já estiver disponível;
5. persistir a mensagem na fila existente;
6. chamar o processador existente com um lote pequeno;
7. retornar o identificador interno mesmo quando o modelo estiver ausente ou ainda não estiver aprovado.

## Comportamento da fila

O endpoint não deve devolver `400` apenas porque o modelo está `PENDING`, ainda não foi sincronizado ou não está aprovado. Nesses casos, a mensagem deve permanecer pendente na fila.

Regras:

- modelo `APPROVED`: tentar enviar pelo sender existente;
- modelo ausente, `PENDING`, `PAUSED` ou ainda não aprovado: manter pendente;
- falha temporária da Meta: manter na fila usando o controle de tentativas existente;
- sucesso: marcar como enviada somente depois de receber o identificador da Meta;
- item já confirmado pela Meta: não enviar novamente;
- falha em um item: continuar o restante do lote.

Não criar outra tabela, fila, cron, worker ou endpoint paralelo.

## Resposta esperada

Ao aceitar e enfileirar a mensagem:

```json
{
  "success": true,
  "message": {
    "id": "id-interno-da-mensagem",
    "providerMessageId": null
  }
}
```

`providerMessageId` pode ser `null` enquanto o modelo aguarda aprovação ou enquanto a mensagem permanece na fila.

Se o processador enviar a mensagem durante a mesma requisição, devolver o identificador retornado pela Meta em `providerMessageId`.

## Erros de validação

Usar `400` somente quando o JSON ou seus campos forem realmente inválidos. A resposta deve conter um código estável e campos seguros para diagnóstico, sem telefone completo, token ou conteúdo dos parâmetros:

```json
{
  "error": {
    "code": "INVALID_TEMPLATE_REQUEST",
    "fields": ["parameters"]
  }
}
```

Registrar no log apenas informações seguras:

```ts
console.warn("[whatsapp/template] Requisição inválida", {
  code: "INVALID_TEMPLATE_REQUEST",
  fields: invalidFieldNames,
  organizationId,
})
```

Não registrar:

- bearer token;
- token da Meta;
- telefone completo;
- valores de `parameters`;
- corpo integral da requisição.

## Conversão para a Graph API

No sender existente, converter `parameters` para os parâmetros do componente `BODY`:

```ts
const components = parameters.length
  ? [{
      type: "body",
      parameters: parameters.map((value) => ({
        type: "text",
        text: value,
      })),
    }]
  : undefined
```

Reutilizar o cliente da Graph API, a conexão, o token, a persistência e o tratamento de erros que já existem no App3.

## Testes obrigatórios

Adicionar testes para os seguintes casos:

1. aceita `templateName`, `language` e `parameters` enviados pelo GBQ;
2. usa `pt_BR` quando `language` não é informado;
3. mantém a ordem dos parâmetros ao montar o componente `BODY`;
4. aceita `parameters: []` para um modelo sem variáveis;
5. retorna `400` para `parameters` que não seja array de strings;
6. retorna `400` para telefone inválido, sem registrar o telefone completo;
7. enfileira a mensagem quando o modelo está `PENDING`;
8. retorna o ID interno com `providerMessageId: null` quando a mensagem permanece pendente;
9. envia pelo sender existente quando o modelo está `APPROVED`;
10. não faz envio duplicado quando a mensagem já possui confirmação da Meta;
11. falha em uma mensagem não interrompe o restante do lote;
12. logs e respostas não expõem tokens, telefone completo ou conteúdo dos parâmetros.

Exemplo mínimo do teste de contrato:

```ts
const response = await POST(requestWithServiceToken({
  to: "5511999999999",
  templateName: "gbq_tarefa_criada_v2",
  language: "pt_BR",
  parameters: [
    "Implantação GBQ",
    "T3CDEF",
    "Configurar domínio",
    "Em andamento",
  ],
}))

expect(response.status).toBe(200)
expect(await response.json()).toMatchObject({
  success: true,
  message: {
    id: expect.any(String),
    providerMessageId: null,
  },
})
```

## Critérios de aceite

1. O payload real do GBQ deixa de retornar `400`.
2. A mensagem é persistida antes da tentativa de processamento.
3. Modelos não aprovados mantêm a mensagem pendente.
4. Modelos aprovados recebem os parâmetros na ordem correta.
5. O endpoint retorna o ID interno mesmo sem envio imediato à Meta.
6. Nenhum dado sensível aparece em respostas ou logs.
7. A implementação reutiliza a fila e o sender existentes.
8. Todos os testes relevantes do App3 passam.

## Verificação em produção

Depois do deploy:

1. repetir uma ação no GBQ que gere notificação;
2. confirmar que o endpoint retorna `200`;
3. confirmar que existe uma mensagem na fila;
4. se o modelo estiver pendente, confirmar que não houve chamada à Meta e que a mensagem continua pendente;
5. se o modelo estiver aprovado, confirmar a chamada à Meta e o preenchimento de `providerMessageId`;
6. confirmar que uma nova chamada não envia novamente uma mensagem já confirmada.
