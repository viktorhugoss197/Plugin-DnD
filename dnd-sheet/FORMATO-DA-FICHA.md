# Formato da ficha (schemaVersion)

O arquivo da ficha (`.dndsheet`, `.dndcreature`) guarda dois números:

- `schemaVersion`: o **formato** dos dados. Só muda quando a estrutura muda. É ele que decide se uma ficha precisa de migração.
- `pluginVersion`: informativo, a última versão do plugin que gravou o arquivo. Não dispara migração.

Formato atual: **jogador = 4**, **criatura = 1**.

## Histórico do formato da ficha de jogador

| Formato | Plugin | O que mudou |
|---|---|---|
| 1 | até 1.5 | Modelo original. |
| 2 | 1.6 | + `skillBonus` e `saveBonus` (um número por perícia/resistência), + `pinned` (`abilities`, `saves`, `skills`), + `attacks[].pin`. |
| 3 | 1.7 | `skillBonus`/`saveBonus`: de número para lista (`2` vira `[2]`), + `skillCols` e `saveCols` (nomes das colunas de bônus). |
| 4 | 1.9 | + `spellbook` (blocos de magia). O texto livre `spells` continua como está. |

Os plugins 1.8, 1.10, 1.11 e 1.12.x, 1.13.x e 1.14.x **não alteraram o formato**. A 1.10 só acrescentou o carimbo informativo `pluginVersion`; a 1.11 (calculadora de PV) não grava nada novo no arquivo.

Ficha de criatura: sem mudança de formato desde a 1.4.

## Como a migração funciona

1. Ao abrir uma ficha, o plugin descobre o formato: pelo `schemaVersion` gravado ou, nas fichas antigas, pela estrutura (presença de `spellbook`, `skillCols`, `skillBonus`/`pinned`).
2. Se o formato for mais antigo que o atual, roda só os passos que faltam (1→2, 2→3, 3→4), em ordem. Cada passo é aditivo e idempotente: completa e converte, nunca apaga dado do usuário.
3. A ficha migrada é regravada uma única vez, já com `schemaVersion` atual, e o plugin avisa. Ao abrir de novo, nada é migrado.
4. Uma ficha de formato **mais novo** que o do plugin não é rebaixada nem reescrita.
5. Campos desconhecidos (que você acrescentou à mão) são preservados.

O comando **"Migrar todas as fichas do vault para o formato atual"** faz o mesmo em lote e mostra um relatório. Rodar de novo não altera nenhum arquivo.

## Banco de magias

O arquivo `srd-spells.json` tem o próprio número de formato (`format`, hoje 1), separado do formato da ficha. Ele não é gravado dentro das fichas: ao adicionar uma magia do banco, os campos dela são copiados para um bloco de magia da ficha, que continua no formato 4.
