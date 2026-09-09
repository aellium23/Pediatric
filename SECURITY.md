# Política de segurança — HOC / Pédia

> Divulgação coordenada de vulnerabilidades, no espírito da ISO/IEC 29147.
> Empresa: DES. Este é um produto de **telepediatria**: uma falha aqui pode
> expor dados de saúde de crianças. Levamos qualquer relato a sério.

## Como reportar

Envia o relato para **`seguranca@` do domínio da HOC** (endereço a fixar antes
do piloto — ver `LAUNCH_READY.md`, bloco E). Inclui, se possível:

- o que encontraste e o impacto que lhe atribuis;
- passos para reproduzir (URL, pedido, papel de utilizador);
- se conseguiste aceder a dados que não eram teus — **descreve, não recolhas**.

**Não abras um issue público** para uma falha explorável. Um issue público é o
sítio certo para tudo o resto.

## O que esperamos de ti

- Testa apenas contra o **ambiente de demonstração**, com as contas de
  demonstração. Não testes contra dados de famílias reais.
- Sem negação de serviço, sem spam, sem engenharia social a utilizadores ou a
  pediatras.
- Acede ao mínimo necessário para provar a falha, e apaga o que tiveres
  copiado.

## O que podes esperar de nós

- **Acusamos a receção em 3 dias úteis.**
- Damos uma primeira avaliação (severidade + se vamos corrigir) em 10 dias úteis.
- Mantemos-te informado até ao fecho e damos-te crédito, se quiseres.
- Não tomamos ações legais contra quem cumpra esta política de boa-fé.

## Âmbito

| No âmbito | Fora do âmbito |
|---|---|
| API (`apps/backend`) e app web (`apps/web`) | Serviços de terceiros (Render, Vercel, Stripe, LiveKit, Anthropic) |
| Autenticação, RBAC, acesso a dados clínicos | Configurações que já documentamos como demo (ver abaixo) |
| Cifra de campos, exportação/apagamento RGPD | Ataques que exijam acesso físico ao dispositivo do utilizador |

## Já conhecido — não precisa de relato

O ambiente de demonstração corre **de propósito** com definições que não usaria
em produção, e estão documentadas em `LAUNCH_READY.md`:

- `ENABLE_DEV_LOGIN=true` — qualquer pessoa pode obter um token de uma persona
  de demonstração. É **o portão nº 1** a fechar antes de existirem famílias
  reais. Já mitigado: 10 pedidos/min e, em produção, sem criação de contas novas.
- Pagamentos em **modo demo** (sem cobranças reais) e sem faturação certificada.
- OpenAPI (`/docs`) publicado no ambiente de demonstração; fechado numa
  produção real.
- Dados presentes são **sintéticos** (seed), não clínicos.

## Práticas em vigor

- Cifra de campos clínicos em repouso (AES-256-GCM), chave fora da base de dados.
- RBAC aplicado no servidor (guards globais), não apenas na UI.
- Limites de pedidos: 100/min genérico, 20/min nos endpoints de autenticação e
  de IA, 10/min no dev-login.
- Cabeçalhos de segurança via `helmet` (HSTS, CSP, `nosniff`, `X-Frame-Options`).
- Respostas de erro uniformes que não devolvem mensagens internas nem eco do
  corpo do pedido.
- CodeQL a correr no CI.
- **Cofre de documentos**: só PDF e imagens, e o tipo é decidido pela assinatura
  dos bytes e não pelo rótulo enviado pelo cliente — um payload disfarçado de
  PDF é recusado. Quota por família para o cofre não poder esgotar a base de
  dados.

## Limitação conhecida — sem análise de malware

Os documentos do cofre **não são analisados** contra malware. Um PDF carregado
por uma família é aberto no browser de um pediatra. Está mitigado, não
eliminado: o tipo é validado pela assinatura do ficheiro (não passa HTML nem
executáveis), e a abertura é feita por blob URL no visualizador nativo do
browser, que corre em sandbox. Um PDF malicioso continua a ser um vetor
possível.

Isto é aceitável num piloto fechado com famílias conhecidas. **Antes de
inscrições abertas**, é preciso análise de conteúdo — o modelo `FileAsset` já
tem o campo `scanStatus` e o prefixo de quarentena previstos para isso.

## Leitura de documentos por IA — o que sai da plataforma

Quando o pai carrega no botão de ler um documento do cofre, **o documento é
enviado ao fornecedor do modelo** (Anthropic) para ser transcrito. Três coisas
tornam isto defensável, e nenhuma é opcional:

1. **É sempre um ato deliberado do pai**, documento a documento. Não há leitura
   em massa, nem no upload, nem em segundo plano.
2. **Só o pai pode pedi-la** (`PARENT`, 10 pedidos/minuto). O pediatra lê os
   documentos com os olhos; não manda a plataforma lê-los.
3. **Nada volta cifrado para o registo por si só**: a resposta é uma proposta
   que morre no ecrã se o pai não marcar nada.

O documento continua cifrado em repouso na nossa base de dados; a exposição é
o trânsito e o processamento no fornecedor, que é subcontratante ao abrigo do
RGPD e tem de constar da lista de subcontratantes e da informação de
privacidade dada às famílias antes do piloto.

*Última atualização: 2026-09-09.*
