# Gerador de Links de Afiliado

Aplicação em Next.js para gerar links de afiliado da Shopee e do Mercado Livre e
manter um histórico local no navegador.

## Requisitos

- Node.js 20 ou mais recente
- npm

## Instalação

Na pasta do projeto, instale as dependências:

```bash
npm install
```

## Configuração

Crie um arquivo chamado `.env.local` na raiz do projeto.

> O nome correto é `.env.local`. Não use `.env.loacl`.

### Configuração mínima

Para gerar links adicionando os parâmetros de afiliado à URL, configure:

```env
SHOPEE_AFFILIATE_ID=seu_id_da_shopee
MELI_AFFILIATE_ID=seu_id_do_mercado_livre
```

Substitua os valores de exemplo pelos identificadores fornecidos pelas
plataformas.

Não é necessário usar o prefixo `NEXT_PUBLIC_`. Os IDs são processados no
servidor e não precisam ser expostos ao navegador.

Em produção, configure também o endereço público da aplicação:

```env
APP_URL=https://seu-dominio.com
```

### Validação de IDs de Afiliado

Após configurar os IDs, valide se estão corretos:

1. **Na interface web**: Acesse `http://localhost:3000/debug` para ver o painel de status
   - Mostra o status de cada ID (configurado ou não)
   - Exibe logs de conversão em tempo real
   - Confirma que seu ID está sendo adicionado aos links

2. **Via API**: Faça uma requisição para verificar o status:
   ```bash
   curl http://localhost:3000/api/status
   ```
   
   Resposta esperada (status OK):
   ```json
   {
     "status": "ok",
     "summary": "✓ IDs de afiliado: ✓ ID Shopee configurado | ✓ ID Mercado Livre configurado",
     "details": {
       "shopee": {
         "configured": true,
         "id": "seu_id_da_shopee"
       },
       "mercadolivre": {
         "configured": true,
         "id": "seu_id_do_mercado_livre"
       }
     }
   }
   ```

3. **Verificar logs**: Acesse `http://localhost:3000/api/debug/logs` para ver logs de conversão
   - Cada conversão é registrada com o ID de afiliado sendo usado
   - Você pode confirmar que o ID correto está sendo aplicado

### APIs opcionais

Caso você possua endpoints próprios ou oficiais para criar links de afiliado,
adicione também:

```env
# Shopee
SHOPEE_API_URL=https://endereco-da-api
SHOPEE_APP_ID=seu_app_id
SHOPEE_SECRET=seu_secret

# Mercado Livre
MELI_API_URL=https://endereco-da-api
MELI_ACCESS_TOKEN=seu_access_token
```

Essas variáveis são opcionais. Quando uma API não estiver configurada ou não
responder corretamente, o sistema usa os IDs da configuração mínima para
adicionar os parâmetros à URL.

O projeto espera que as APIs retornem um destes formatos:

```json
{
  "affiliate_url": "https://link-gerado"
}
```

Para a Shopee, também é aceito o campo `short_link`. Para o Mercado Livre,
também é aceito `tracking_url`.

## Executar localmente

Depois de criar ou alterar o `.env.local`, reinicie o servidor:

```bash
npm run dev
```

Acesse:

```text
http://localhost:3000
```

## Verificações

```bash
npm run typecheck
npm run build
```

## Segurança

- Nunca envie o arquivo `.env.local` para o Git.
- Não use `NEXT_PUBLIC_` em tokens, secrets ou chaves privadas.
- Configure as mesmas variáveis de ambiente na plataforma de hospedagem.
- O histórico dos links fica salvo somente no `localStorage` do navegador.

## Garantindo a Comissão

Para garantir que você receberá comissão em cada venda através de um link gerado:

1. **Confirme a configuração dos IDs**:
   - Acesse a página de debug: `http://localhost:3000/debug`
   - Ambos os IDs devem aparecer com status verde (✓ Configurado)

2. **Valide que o ID está sendo adicionado**:
   - Gere um link de teste
   - Abra a página de debug e verifique os logs
   - Procure por entradas "Link de afiliado gerado" com `hasAffiliateParams: true`
   - O `extractedId` deve corresponder ao seu ID configurado

3. **Teste os links**:
   - Copie um link gerado
   - Abra em uma nova aba privada/incógnito
   - Visite a loja (Shopee ou Mercado Livre)
   - Verifique se seus parâmetros estão na URL (ex: `?af_siteid=seu_id` para Shopee)

4. **Monitorar conversões**:
   - Cada conversão é registrada nos logs
   - Você pode verificar em `http://localhost:3000/api/debug/logs`
   - Os logs mostram se o ID foi detectado corretamente

5. **Em produção**:
   - Configure as mesmas variáveis de ambiente na plataforma de hospedagem
   - Acesse `/debug` periodicamente para verificar se os links estão sendo gerados corretamente
   - Configure alertas para erros de conversão (status da API retorna erro)

## Fluxo da conversão

1. O navegador envia a URL para `/api/affiliate`.
2. O servidor valida se o domínio pertence à Shopee ou ao Mercado Livre.
3. Links curtos são resolvidos com limite de redirecionamentos.
4. A API configurada é utilizada, quando disponível.
5. Se a API não estiver disponível, os parâmetros do ID de afiliado são
   adicionados diretamente à URL.
6. O servidor valida se o link final contem o ID de afiliado configurado.
7. A interface exibe e copia diretamente a URL de afiliado convertida.

## Links gerados

O link principal exibido e copiado pelo gerador usa o formato:

```text
https://www.exemplo.com/produto?parametros_do_afiliado=seu_id
```

O app não salva links em banco, KV, arquivo ou qualquer outro armazenamento no
servidor. Somente o histórico local do navegador é salvo em `localStorage`.

## Prévia do produto

O servidor tenta ler metadados públicos da página, como Open Graph e JSON-LD,
para exibir título, foto, descrição e preço. Algumas páginas bloqueiam robôs ou
carregam essas informações apenas com JavaScript; nesses casos, o link continua
funcionando, mas a prévia pode aparecer sem alguns dados.

Para páginas da Shopee que não expõem Open Graph ou JSON-LD, o projeto usa um
preview renderizado como fallback. A foto real tem prioridade; quando ela não é
disponibilizada, uma captura da página é usada no card.

O fallback pode ser desativado ou substituído:

```env
PREVIEW_FALLBACK=false
PREVIEW_API_URL=https://api.microlink.io/
```
