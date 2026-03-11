---
name: "Sprint Dia 3 - Inline e Filtros"
about: "Execucao do Dia 3: consistencia de edicao inline, filtros e ordenacao"
title: "[Sprint D3] Ajustar inline, filtros e ordenacao"
labels: ["sprint", "frontend", "p1"]
assignees: []
---

## Objetivo
Aumentar confiabilidade da edicao inline e combinacao de filtros/ordenacao.

## Escopo
- [x] Revisar teclas Enter/Tab/Escape na edicao inline
- [x] Validar foco e blur em cenarios de edicao
- [x] Validar combinacoes de filtros e ordenacao
- [x] Testar fluxo simultaneo: editar + filtrar + ordenar

## Status
- Estado atual: `done`
- Progresso (%): `100`
- Ultima atualizacao: `2026-03-11`

## Blockers
- [ ] Sem blockers
- Detalhes:

## Evidencias
- Casos testados:
	- Edicao inline de titulo com Enter: salva uma unica vez
	- Edicao inline com Escape: cancela sem persistir alteracoes
	- Edicao inline com Tab: salva e avanca para a proxima coluna editavel
	- No-op update: valor inalterado nao dispara update
	- Filtro por query combinado com ordenacao asc/desc por titulo
- Videos/screen recordings:
	- N/A (validacao automatizada por testes de componente)
- Commits/PRs:
	- cee887f fix(table): harden inline edit key handling and skip no-op updates
	- 2e05cad test(table): add inline edit and filter/sort regression coverage

## Criterios de Aceite
- [x] Comportamento consistente de teclas
- [x] Sem perda de estado inesperada
- [x] Filtros e ordenacao sem regressao

## Definicao de Pronto
- [x] Casos criticos cobertos
- [x] Ajustes validados por QA
- [x] Documentacao de comportamento atualizada
