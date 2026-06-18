# 06 · Responsive Behavior

Mobile-first, mas adaptável a tablet e web (portais de clínica/admin são web). Native feel preservado por plataforma.

## Breakpoints
| Token | Largura | Alvo |
|---|---|---|
| `compact` | < 600dp | Telefones (default, 1 coluna) |
| `medium` | 600–839dp | Tablets pequenos / telefone landscape |
| `expanded` | 840–1239dp | Tablets grandes / web pequena |
| `large` | ≥ 1240dp | Web desktop (clínica/admin) |

## Princípios de adaptação
- **Compact**: 1 coluna; tab bar inferior; sheets; CTAs full-width bottom-anchored.
- **Medium/Expanded**: 2 colunas (lista + detalhe); tab bar pode tornar-se **navigation rail** (lateral).
- **Large (web)**: sidebar persistente + área de conteúdo multi-coluna; densidade maior.

## Layout adaptativo — exemplo Consultas (Pediatra)

```
COMPACT (telefone)            EXPANDED/LARGE (tablet/web)
┌───────────────┐            ┌──────────┬──────────────────┐
│ Inbox (lista) │            │ Inbox    │ Detalhe consulta │
│ • Febre — Leo │            │ • Febre  │  Histórico+Chat  │
│ • Tosse — Ana │   tap →    │ • Tosse  │  Resumo IA       │
│ ...           │            │ ...      │  [Encerrar]      │
└───────────────┘            └──────────┴──────────────────┘
  push para detalhe            master-detail lado a lado
```

## Regras por componente
| Componente | Compact | Expanded/Large |
|---|---|---|
| Navegação | Bottom tab bar | Navigation rail / Sidebar |
| Listas+detalhe | Push (stack) | Master-detail (2 painéis) |
| Marketplace | 1 coluna de cards | Grelha 2–3 colunas |
| Formulários | 1 coluna, full-width | 2 colunas, largura máx. ~560px |
| Modais | Bottom sheet full | Centered dialog |
| Tabelas (admin) | Cards empilhados | Tabela densa com colunas |
| Growth chart | Largura total | Painel + métricas laterais |

## Orientação
- **Portrait** otimizado (uso a uma mão).
- **Landscape**: suportado; **videochamada** otimizada para landscape; formulários reflowam para 2 colunas.
- Tablet suporta ambas com master-detail.

## Densidade
- **Pais**: densidade confortável (espaçoso, tranquilo).
- **Pediatra/Clínica/Admin**: opção de **densidade compacta** (mais itens visíveis) em web/tablet para produtividade.

## Safe areas & inserts
- Respeitar notch/Dynamic Island, home indicator, barras de gestos Android.
- CTAs acima do home indicator; conteúdo nunca sob barras de sistema.

## Texto & escala
- Layouts toleram **Dynamic Type/Font scale até 200%** (testado): wrap, sem truncar conteúdo crítico, scroll quando necessário.
- Comprimento de linha controlado em `expanded/large` (max-width de leitura).

## Web (clínica/admin) — especificidades
- Sidebar colapsável; topbar com pesquisa global e perfil.
- Atalhos de teclado; foco visível; navegação por tab completa (a11y).
- Densidade de tabela ajustável; export/print de relatórios e faturas.

## Imagens & media
- Assets `@1x/2x/3x`; vetores para ícones/ilustração; lazy-load; placeholders skeleton.
- Object-fit consistente em avatares e thumbnails de ficheiros.

## Performance responsiva
- Listas virtualizadas (consultas, ficheiros, utilizadores admin).
- Otimista onde seguro; skeletons; evitar layout shift.
