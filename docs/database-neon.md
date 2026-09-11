# Banco de dados PostgreSQL no Neon

Este documento descreve como o projeto **GBQ Projetos** utiliza o PostgreSQL gerenciado pelo Neon a partir de dois ambientes: Vercel e VPS.

## Visão geral

O Neon hospeda o banco PostgreSQL fora da VPS e fornece conexões seguras pela internet. Com isso, tanto a aplicação publicada na Vercel quanto a instância executada na VPS acessam a mesma base de dados.

```text
Vercel ── TLS ── Neon PostgreSQL
VPS ──── TLS ── Neon PostgreSQL
```

Essa arquitetura evita depender dos IPs de saída dinâmicos do plano Hobby da Vercel e permite fechar a porta pública `5432` do PostgreSQL antigo da VPS.

## Tipos de conexão

O conector do Neon disponibiliza mais de uma URL de conexão. Cada ambiente deve utilizar a modalidade adequada.

| Ambiente | Variável fornecida pelo Neon | Variável usada pela aplicação | Motivo |
| --- | --- | --- | --- |
| Vercel | `NEON_POSTGRES_URL` | `DATABASE_URL` | Usa pooling, adequado para Functions e execuções serverless |
| VPS | `NEON_POSTGRES_URL_NON_POOLING` | `DATABASE_URL` | Usa conexão direta, adequada para um processo Node.js persistente |

As URLs contêm host, porta, banco, usuário, senha e opções TLS. Elas devem ser tratadas como segredo.

Exemplo apenas estrutural:

```text
postgresql://USUARIO:SENHA@HOST.neon.tech/BANCO?sslmode=require
```

Nunca registre uma URL real no Git, em documentação, logs, capturas de tela ou variáveis com prefixo `NEXT_PUBLIC_`.

## Configuração na Vercel

O conector Neon cria automaticamente variáveis como:

- `NEON_POSTGRES_URL`
- `NEON_POSTGRES_URL_NON_POOLING`
- `NEON_POSTGRES_PRISMA_URL`
- `NEON_PGHOST`
- `NEON_PGUSER`
- `NEON_PGPASSWORD`
- `NEON_PGDATABASE`

A aplicação GBQ consulta a variável `DATABASE_URL`. No painel da Vercel:

1. Abra **Project > Settings > Environment Variables**.
2. Crie ou edite `DATABASE_URL`.
3. Copie para ela o valor completo de `NEON_POSTGRES_URL`.
4. Habilite-a para `Production` e para os demais ambientes realmente necessários.
5. Salve e faça um novo deployment.

Uma alteração em variáveis de ambiente não modifica deployments que já foram concluídos. É necessário realizar um redeploy.

## Configuração na VPS

No arquivo `.env` da aplicação, configure:

```env
DATABASE_URL="VALOR_COMPLETO_DE_NEON_POSTGRES_URL_NON_POOLING"
APP_ENVIRONMENT="vps"
```

Depois reinicie o processo:

```bash
pm2 restart projetos-gbq --update-env
pm2 save
```

Para acompanhar a inicialização sem imprimir as variáveis secretas:

```bash
pm2 logs projetos-gbq --lines 100
```

Não use `pm2 env` em registros compartilhados, pois a saída pode incluir credenciais.

## Página de diagnóstico

A rota `/diagnostico` executa uma consulta curta no PostgreSQL e informa:

- ambiente detectado: Vercel, VPS ou local;
- sucesso ou falha da conexão;
- utilização de TLS;
- latência da conexão e da consulta;
- banco, usuário e versão do servidor;
- mensagem de erro sanitizada.

A página nunca apresenta a senha nem a URL completa. Como ainda exibe informações operacionais, deve ser limitada a administradores quando a autenticação da aplicação estiver implementada.

Endereços de teste:

```text
Vercel: https://projetos-gbq-tau.vercel.app/diagnostico
VPS:    https://DOMINIO_DA_VPS/diagnostico
```

## Deploy

### Vercel

O repositório está conectado à Vercel. Um push para a branch configurada inicia um novo deployment. Quando somente uma variável for alterada pelo painel, use **Deployments > Redeploy**.

### VPS

No diretório do projeto:

```bash
git pull --ff-only origin main
pnpm install --frozen-lockfile
pnpm build
pm2 restart projetos-gbq --update-env
pm2 save
```

Confirme o processo:

```bash
pm2 status projetos-gbq
pm2 logs projetos-gbq --lines 100
```

## Segurança

- Mantenha a URL do Neon somente em gerenciadores de segredo e arquivos `.env` ignorados pelo Git.
- Use a conexão TLS fornecida pelo Neon.
- Não exponha credenciais em componentes React client-side.
- Não use nomes de variáveis iniciados por `NEXT_PUBLIC_` para segredos.
- Crie usuários PostgreSQL com apenas as permissões necessárias.
- Rotacione imediatamente a senha se a URL aparecer em commit, log, mensagem ou captura de tela.
- Mantenha backups e defina uma política de retenção apropriada aos dados do projeto.
- Proteja a rota `/diagnostico` antes de armazenar dados reais ou sensíveis.

## PostgreSQL antigo da VPS

Depois de confirmar que Vercel e VPS estão conectadas ao Neon, o PostgreSQL local não precisa permanecer exposto publicamente.

Antes de remover regras, liste o firewall numerado:

```bash
sudo ufw status numbered
```

Remova apenas as regras da porta `5432` criadas para a Vercel. No `pg_hba.conf`, remova apenas as linhas temporárias com IPs dinâmicos da Vercel. As regras locais de `127.0.0.1/32` e `::1/128` podem ser mantidas caso o PostgreSQL local continue instalado.

## Problemas comuns

### `DATABASE_URL` não configurada

A variável não existe no ambiente que processou a requisição. Cadastre-a e reinicie ou faça redeploy da aplicação.

### O erro ainda cita `app_user` e `app_db`

A aplicação continua usando a URL antiga da VPS. Substitua `DATABASE_URL` pela URL do Neon e reinicie o ambiente.

### Erro de certificado ou SSL

Confirme que foi usada a URL completa fornecida pelo Neon, incluindo os parâmetros de TLS. Evite remover `sslmode` manualmente.

### Muitas conexões

Na Vercel, confirme que `DATABASE_URL` usa `NEON_POSTGRES_URL`, que possui pooling. Não use a URL `NON_POOLING` em Functions serverless.

### VPS funciona, mas Vercel não

Confira se `DATABASE_URL` está habilitada para o ambiente correto (`Production`, `Preview` ou `Development`) e faça redeploy.

## Referência rápida

```text
Vercel
  DATABASE_URL = valor de NEON_POSTGRES_URL

VPS
  DATABASE_URL = valor de NEON_POSTGRES_URL_NON_POOLING
  APP_ENVIRONMENT = vps

Teste
  /diagnostico
```
