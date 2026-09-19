# App3 — provisionamento dos modelos GBQ e entrega garantida da fila

## Objetivo

Implementar no App3/Sagazap o fluxo completo de modelos de mensagem do GBQ para WhatsApp Cloud API. A entrega não termina ao criar um endpoint: o App3 deve cadastrar os modelos na Meta, acompanhar a aprovação, conservar todas as mensagens já enfileiradas e enviá-las assim que o modelo correspondente estiver disponível.

O resultado esperado é:

1. `POST /api/integrations/v1/whatsapp/templates/gbq` cria ou reconcilia os cinco modelos do GBQ na conta WhatsApp da organização autenticada.
2. `POST /api/integrations/v1/whatsapp/messages/template` sempre persiste a solicitação válida antes de tentar enviá-la.
3. Modelo ausente, em análise ou temporariamente indisponível **não descarta a mensagem**. O item permanece bloqueado na fila.
4. Quando o modelo fica `APPROVED`, o App3 libera e processa automaticamente os itens bloqueados daquele modelo.
5. Falhas transitórias usam retentativas duráveis. Reinício, deploy ou queda do processo não perde itens.
6. O painel permite observar modelos, fila, tentativas e motivo de bloqueio sem expor tokens ou conteúdo sensível.

## Contexto do consumidor GBQ

O `projetos-gbq` já chama:

```text
POST /api/integrations/v1/whatsapp/templates/gbq
POST /api/integrations/v1/whatsapp/messages/template
```

As chamadas usam `Authorization: Bearer app3_live_...`. A organização deve ser derivada exclusivamente do cliente autenticado, nunca de `organizationId` recebido no corpo ou na URL.

Contrato atual do envio:

```json
{
  "to": "5511999999999",
  "templateName": "gbq_tarefa_criada_v1",
  "language": "pt_BR",
  "parameters": ["Implantação GBQ", "T3CDEF", "Configurar domínio", "Em andamento"]
}
```

Resposta de aceitação recomendada:

```json
{
  "success": true,
  "message": {
    "id": "msg_<uuid>",
    "providerMessageId": null,
    "status": "QUEUED"
  }
}
```

`success: true` significa que o App3 aceitou e persistiu o item, não que a Meta já o entregou. Preservar `providerMessageId: null` até a Meta aceitar o envio.

## Catálogo canônico de modelos

Todos os modelos abaixo usam:

- idioma: `pt_BR`;
- categoria: `UTILITY`;
- componentes: somente `BODY` nesta primeira versão;
- nomes e versões imutáveis;
- parâmetros posicionais na ordem indicada;
- exemplos obrigatórios para a submissão à Meta.

### `gbq_tarefa_criada_v1`

Corpo:

```text
Uma nova tarefa foi criada no projeto {{1}}.
Código: {{2}}
Tarefa: {{3}}
Status: {{4}}
```

Parâmetros:

1. nome do projeto;
2. código da tarefa;
3. título da tarefa;
4. status atual.

Exemplo: `Implantação GBQ`, `T3CDEF`, `Configurar domínio`, `Em andamento`.

### `gbq_status_tarefa_v1`

Corpo:

```text
O status de uma tarefa foi atualizado no projeto {{1}}.
Código: {{2}}
Tarefa: {{3}}
Status anterior: {{4}}
Novo status: {{5}}
```

Parâmetros:

1. nome do projeto;
2. código da tarefa;
3. título da tarefa;
4. status anterior;
5. novo status.

Exemplo: `Implantação GBQ`, `T3CDEF`, `Configurar domínio`, `Em andamento`, `Concluído`.

### `gbq_tarefa_atualizada_v1`

Corpo:

```text
Uma tarefa foi atualizada no projeto {{1}}.
Código: {{2}}
Tarefa: {{3}}
Alterações: {{4}}
```

Parâmetros:

1. nome do projeto;
2. código da tarefa;
3. título da tarefa;
4. lista curta dos campos alterados.

Exemplo: `Implantação GBQ`, `T3CDEF`, `Configurar domínio`, `responsável, prazo`.

### `gbq_projeto_atualizado_v1`

Corpo:

```text
O projeto {{1}} — {{2}} foi atualizado.
Alterações: {{3}}
```

Parâmetros:

1. código do projeto;
2. nome do projeto;
3. lista curta dos campos alterados.

Exemplo: `P1ABCD`, `Implantação GBQ`, `prioridade, prazo`.

### `gbq_mensagem_tarefa_v1`

Corpo:

```text
Nova mensagem de {{1}} na tarefa {{2}} — {{3}}.
Projeto: {{4}}
Acesse o GBQ para visualizar a conversa.
```

Parâmetros:

1. nome do autor;
2. código da tarefa;
3. título da tarefa;
4. nome do projeto.

Exemplo: `Gabriel`, `T3CDEF`, `Configurar domínio`, `Implantação GBQ`.

Não alterar textos, quantidade ou ordem dos parâmetros sem criar uma nova versão do nome, como `_v2`. O GBQ já envia os parâmetros conforme esse catálogo.

## Provisionamento e reconciliação com a Meta

### Endpoint

Implementar:

```text
POST /api/integrations/v1/whatsapp/templates/gbq
```

Requisitos:

1. Autenticar o service client e resolver sua organização.
2. Resolver a conexão/WABA/conta WhatsApp ativa da mesma organização.
3. Consultar na Meta os modelos existentes para `pt_BR`.
4. Para cada item do catálogo canônico:
   - se não existir, criar;
   - se existir com definição equivalente, somente sincronizar ID e status;
   - se existir com o mesmo nome e conteúdo incompatível, não sobrescrever nem apagar: registrar conflito explícito;
   - se estiver `PENDING`, `IN_APPEAL`, `PAUSED` ou equivalente, conservar e atualizar o estado local;
   - se estiver `REJECTED`, conservar a fila bloqueada e registrar o motivo sanitizado.
5. Persistir o ID retornado pela Meta, nome, idioma, categoria, hash da definição, status remoto, motivo sanitizado e horários da última submissão e sincronização.
6. A operação deve ser idempotente: chamadas repetidas não podem criar duplicatas.
7. Após qualquer sincronização que encontre um modelo `APPROVED`, liberar os itens bloqueados correspondentes e agendar o worker imediatamente.

Resposta:

```json
{
  "ready": false,
  "templates": [
    {
      "name": "gbq_tarefa_criada_v1",
      "id": "123456789",
      "status": "PENDING",
      "created": true
    }
  ]
}
```

`ready` só pode ser `true` quando os cinco modelos estiverem `APPROVED` para a conexão da organização. Uma falha parcial deve retornar o estado conhecido de todos os itens e um erro tratável por item; não desfazer criações bem-sucedidas.

### Sincronização automática

Não depender de alguém apertar um botão depois da criação.

Implementar pelo menos um destes mecanismos, preferencialmente ambos:

- webhook de atualização de status de modelo da Meta;
- job durável de reconciliação para modelos não finais.

Política sugerida para polling enquanto houver modelos não finais:

```text
1 min, 5 min, 15 min, 30 min e depois a cada 2 horas por até 7 dias
```

Ao receber ou detectar `APPROVED`, executar atomicamente:

1. atualizar o modelo local;
2. mover itens `BLOCKED_TEMPLATE` desse `templateName + language + organizationId` para `QUEUED`;
3. definir `nextAttemptAt = now()`;
4. disparar o mecanismo durável do worker.

## Fila de mensagens e garantia de entrega

### Regra principal

Uma solicitação válida de envio só pode retornar sucesso depois que a transação que criou o item da fila tiver sido confirmada. Nunca usar apenas memória, `setTimeout`, promessa solta ou execução em background da requisição.

Estados mínimos:

```text
QUEUED
BLOCKED_TEMPLATE
PROCESSING
RETRY_SCHEDULED
SENT
DELIVERED
READ
FAILED_PERMANENT
CANCELLED
```

`BLOCKED_TEMPLATE` não é falha final. Deve ser usado quando o modelo está ausente, pendente, pausado ou ainda não sincronizado.

Campos mínimos do item:

```text
id
organization_id
connection_id
recipient_wa_id
template_name
template_language
parameters_json
status
blocked_reason
attempt_count
next_attempt_at
lease_owner
lease_expires_at
provider_message_id
last_provider_error_code
last_error_sanitized
idempotency_key
created_at
updated_at
sent_at
```

Restrições e índices:

```text
UNIQUE(organization_id, idempotency_key) WHERE idempotency_key IS NOT NULL
INDEX(status, next_attempt_at)
INDEX(organization_id, template_name, template_language, status)
UNIQUE(provider_message_id) WHERE provider_message_id IS NOT NULL
```

Armazenar parâmetros como JSON estruturado. Não registrar o corpo completo nem telefone em logs. Se a política do produto exigir proteção adicional, cifrar destino e parâmetros em repouso.

### Aceitação do envio

No endpoint `/messages/template`:

1. validar destino, idioma, nome e quantidade de parâmetros contra o catálogo conhecido;
2. abrir transação;
3. resolver o modelo local da organização;
4. inserir o item como `QUEUED` se `APPROVED`, senão `BLOCKED_TEMPLATE`;
5. confirmar a transação;
6. agendar o worker durável;
7. retornar o ID interno e o status atual.

Se o modelo ainda não estiver cadastrado, criar/atualizar também uma solicitação durável de provisionamento. Não responder com sucesso sem persistir a mensagem.

Aceitar opcionalmente `Idempotency-Key`. Se ausente, gerar ID interno normalmente. Em uma etapa posterior, o GBQ poderá enviar uma chave derivada do evento; até lá, o worker ainda deve garantir processamento sem perda e sem envios concorrentes duplicados.

### Worker

O worker deve:

1. buscar itens vencidos em `QUEUED` ou `RETRY_SCHEDULED`;
2. adquirir lease por atualização atômica ou `FOR UPDATE SKIP LOCKED`;
3. confirmar novamente que o modelo está `APPROVED` antes do envio;
4. se não estiver, voltar para `BLOCKED_TEMPLATE` sem consumir tentativa de envio;
5. criar um registro de tentativa antes de chamar a Meta;
6. enviar uma única vez por lease;
7. persistir resposta, código sanitizado e `provider_message_id`;
8. finalizar como `SENT` somente após a Meta aceitar;
9. liberar lease expirado para recuperação por outro worker.

Não pode haver dois workers processando o mesmo item ao mesmo tempo. Um crash depois da chamada e antes da persistência é um caso ambíguo: registrar e reconciliar pelo identificador/idempotência oferecido pelo provedor quando disponível; nunca simplesmente apagar o item.

### Retentativas

Falhas transitórias incluem timeout, rede, `429`, `5xx` e códigos temporários documentados pela Meta.

Política inicial:

```text
tentativa 1: imediata
tentativa 2: +1 minuto
tentativa 3: +5 minutos
tentativa 4: +30 minutos
tentativa 5: +2 horas
tentativa 6: +8 horas
tentativa 7: +24 horas
```

Adicionar jitter para evitar rajadas. Respeitar `Retry-After` quando presente. Depois da última tentativa transitória, mover para `FAILED_PERMANENT`, preservar o registro e permitir reenvio administrativo explícito.

Erros permanentes incluem destino inválido, parâmetros incompatíveis e rejeição definitiva da Meta. Modelo pendente ou ausente nunca deve ser classificado como erro permanente.

## Drenagem do que já está na fila

Esta implementação deve tratar dados existentes, não somente mensagens novas.

Criar uma migration/job de reconciliação que:

1. identifique todos os itens não finais existentes no App3;
2. mapeie estados legados para os estados definidos neste documento;
3. preserve `created_at`, número de tentativas e último erro;
4. mova para `BLOCKED_TEMPLATE` os itens cujo modelo não esteja `APPROVED`;
5. mova para `QUEUED` os itens com modelo aprovado e `next_attempt_at <= now()`;
6. não duplique itens que já possuam `provider_message_id`;
7. não altere `SENT`, `DELIVERED`, `READ` ou falhas permanentes confirmadas;
8. produza contagens auditáveis de migrados, liberados, bloqueados e inconsistentes;
9. execute o worker até não restar item elegível vencido.

Depois do deploy e da aprovação dos modelos, executar uma verificação operacional:

```text
itens elegíveis vencidos = 0
itens PROCESSING com lease expirado = 0
itens BLOCKED_TEMPLATE para modelos APPROVED = 0
```

Não limpar a fila como forma de corrigir o problema.

## Status de entrega

Os webhooks de status da Meta devem localizar a mensagem por `provider_message_id` e aplicar transições monotônicas:

```text
SENT -> DELIVERED -> READ
```

Eventos repetidos devem ser idempotentes. Um evento atrasado não pode regredir `READ` para `DELIVERED` ou `SENT`.

Continuar emitindo para o GBQ o evento existente:

```text
whatsapp.message.status
```

## Painel administrativo

Adicionar à conexão WhatsApp da organização:

- botão **Provisionar modelos GBQ**;
- tabela com nome, idioma, status local/remoto, última sincronização e motivo de conflito/rejeição;
- ação **Sincronizar com a Meta**;
- contadores da fila por estado;
- lista de tentativas com erro sanitizado;
- ação de reprocessar item em falha permanente, com confirmação e auditoria.

O botão facilita a operação, mas não substitui reconciliação e worker automáticos.

## Observabilidade

Métricas mínimas por organização e conexão:

- itens criados;
- itens por estado;
- idade do item elegível mais antigo;
- bloqueados por modelo;
- tentativas e sucesso por código da Meta;
- leases expirados;
- modelos por status remoto.

Alertar quando:

- um item elegível permanecer sem tentativa por mais de 10 minutos;
- houver `BLOCKED_TEMPLATE` para modelo `APPROVED`;
- um modelo for rejeitado ou pausado;
- crescer continuamente a quantidade de falhas permanentes;
- houver lease expirado repetidamente.

Logs devem usar IDs internos e códigos sanitizados. Nunca registrar token, cabeçalho `Authorization`, parâmetros completos, telefone completo ou resposta bruta da Meta.

## Segurança e isolamento

- Derivar `organizationId` do service client ou da sessão.
- Verificar organização em toda consulta e atualização de modelo, fila e tentativa.
- Nunca reutilizar modelo ou conexão de outra organização.
- Validar nomes apenas contra catálogo permitido para o endpoint GBQ.
- Aplicar rate limit ao provisionamento sem impedir idempotência.
- Guardar tokens da Meta conforme o mecanismo seguro já adotado pelo App3.
- Sanitizar erros antes de persistir ou responder.
- Registrar auditoria de provisionamento, reprocessamento e cancelamento.

## Testes obrigatórios

### Provisionamento

- cria os cinco modelos quando não existem;
- segunda chamada não cria duplicatas;
- modelo equivalente existente é apenas sincronizado;
- mesmo nome com conteúdo diferente gera conflito explícito;
- resposta parcial conserva os sucessos;
- `ready` só é verdadeiro com os cinco `APPROVED`;
- aprovação via webhook/polling libera a fila bloqueada.

### Fila

- aceita e persiste antes de responder;
- modelo ausente ou `PENDING` gera `BLOCKED_TEMPLATE`;
- item bloqueado volta para `QUEUED` após aprovação;
- reinício do processo não perde itens;
- lease impede processamento concorrente;
- lease expirado é recuperado;
- `429`, timeout e `5xx` agendam retentativa;
- erro permanente preserva o item e a tentativa;
- `Idempotency-Key` repetida não duplica mensagem;
- atualização de status é idempotente e monotônica.

### Multi-organização e segurança

- cliente de uma organização não provisiona, lê ou envia pela conexão de outra;
- `organizationId` forjado no corpo é ignorado/rejeitado;
- logs e respostas não contêm tokens, telefones completos ou payloads sensíveis.

### Drenagem

- migration preserva todos os itens legados;
- item já enviado não é reenviado;
- item elegível é processado;
- item de modelo pendente permanece bloqueado;
- ao final não existe item vencido elegível sem processamento.

## Critérios de aceite em produção

1. Os cinco modelos aparecem no Gerenciador do WhatsApp da organização correta.
2. O App3 mostra o ID e o status da Meta para cada modelo.
3. Uma segunda execução do provisionamento não cria modelos adicionais.
4. Mensagem criada antes da aprovação permanece visível em `BLOCKED_TEMPLATE`.
5. Ao aprovar o modelo, essa mensagem é enviada sem intervenção manual.
6. Todas as mensagens antigas elegíveis da fila são drenadas.
7. Após reiniciar ou implantar o App3, itens pendentes continuam processáveis.
8. Teste concorrente com dois workers não produz dois envios do mesmo item.
9. Falhas transitórias seguem o backoff e ficam observáveis.
10. Nenhuma mensagem é removida silenciosamente da fila.
11. O GBQ recebe os eventos de status das mensagens aceitas pela Meta.
12. Há evidência operacional das contagens antes e depois da drenagem.

## Ordem recomendada de implementação

1. Criar catálogo canônico e persistência de modelos.
2. Implementar provisionamento/reconciliação idempotente com a Meta.
3. Tornar a aceitação de mensagens transacional e durável.
4. Implementar leases, worker e retentativas.
5. Implementar liberação automática após aprovação.
6. Migrar e reconciliar a fila existente.
7. Adicionar painel e observabilidade.
8. Executar testes e provisionar em produção.
9. Aguardar aprovação da Meta e comprovar a drenagem completa.

Não considerar a tarefa concluída apenas porque os modelos foram submetidos. A conclusão exige modelos visíveis na Meta, estados sincronizados no App3 e fila elegível drenada sem perda ou duplicação conhecida.
