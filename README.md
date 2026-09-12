# projetos-gbq

Sistema de controle de projetos construído com Next.js, com:

- Kanban por projeto com tarefas em A fazer, Em andamento, Aguardando e Concluído
- CRUD de projetos e tarefas persistido no PostgreSQL
- progresso dos projetos calculado pela proporção de tarefas concluídas
- configurações para cadastro de usuários

## Executar localmente

Configure as variáveis de ambiente:

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="uma-chave-longa-e-aleatoria"
```

```bash
pnpm install
pnpm dev
```

## Primeiro acesso

- E-mail: `admin@gmail.com`
- Senha temporária: `12345678`

As tabelas de usuários, projetos e tarefas são criadas de forma idempotente no primeiro uso. O primeiro administrador é criado no primeiro login. O sistema exige a definição de uma nova senha antes de liberar o painel. As senhas são armazenadas com `scrypt`, nunca em texto puro.
