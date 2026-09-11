# Implantação na VPS

## Conclusão

A aplicação `projetos-gbq` foi publicada na VPS e está disponível em:

<https://projetos.gbassotto.com.br>

O subdomínio possui resolução DNS e certificado HTTPS emitido pelo Let's Encrypt por meio do Certbot.

## Configuração

| Item | Valor |
| --- | --- |
| Domínio público | `projetos.gbassotto.com.br` |
| IP público | `129.121.54.188` |
| Diretório da aplicação | `/var/www/projetos-gbq` |
| Processo PM2 | `projetos-gbq` |
| Endereço interno | `127.0.0.1:3010` |
| Proxy reverso | Nginx |
| HTTPS | Let's Encrypt/Certbot |

## Fluxo de acesso

```text
projetos.gbassotto.com.br
          ↓ DNS
     129.121.54.188
          ↓ HTTPS :443
         Nginx
          ↓ proxy reverso
   127.0.0.1:3010
          ↓
   Aplicação Next.js
```

O DNS contém um registro `A` com o nome `projetos`, apontando para `129.121.54.188`. A porta interna não faz parte do registro DNS; o encaminhamento para a porta `3010` é feito pelo Nginx.

## Atualização da aplicação

Depois de publicar mudanças no branch `main` do GitHub, executar na VPS:

```bash
cd /var/www/projetos-gbq
git pull --ff-only origin main
pnpm install --frozen-lockfile
pnpm lint
pnpm build
pm2 restart projetos-gbq --update-env
```

## Verificação

```bash
pm2 status
pm2 logs projetos-gbq --lines 100
curl -I http://127.0.0.1:3010
curl -I https://projetos.gbassotto.com.br
sudo nginx -t
```

## Arquivos e serviços relevantes na VPS

```text
/var/www/projetos-gbq
/etc/nginx/sites-available/projetos.gbassotto.com.br
/etc/nginx/sites-enabled/projetos.gbassotto.com.br
```

Após qualquer alteração manual no Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Para conferir os certificados e testar a renovação automática:

```bash
sudo certbot certificates
sudo certbot renew --dry-run
```

## Observação

Esta instalação é independente das aplicações existentes em `/var/www/app1` e `/var/www/app1-teste`. Ela utiliza diretório, processo PM2, porta interna, configuração do Nginx e domínio próprios.
