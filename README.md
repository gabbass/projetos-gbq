# projetos-gbq

Sistema de controle de projetos construído com Next.js, com:

- kanban como primeira página
- cadastro de projetos
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

A tabela de usuários e o primeiro administrador são criados de forma idempotente no primeiro login. O sistema exige a definição de uma nova senha antes de liberar o painel. As senhas são armazenadas com `scrypt`, nunca em texto puro.
