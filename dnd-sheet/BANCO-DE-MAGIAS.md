# Banco de magias (srd-spells.json)

A janela **Adicionar magia → Magias existentes** lê as magias do arquivo `srd-spells.json`, que fica **na mesma pasta do plugin** (`.obsidian/plugins/dnd-sheet/`). O arquivo é lido toda vez que a janela abre, então editar o arquivo vale na hora, sem reiniciar o plugin.

Se o arquivo faltar ou estiver quebrado, a janela mostra o motivo, a aba **Criar magia** continua funcionando e as configurações do plugin mostram um aviso.

## Estrutura

```json
{
  "format": 1,
  "source": "SRD 5.1 (CC BY 4.0, Wizards of the Coast)",
  "language": "en",
  "count": 319,
  "spells": [ { ...uma magia... }, { ... } ]
}
```

`format` precisa ser `1`; o plugin recusa qualquer outro número. `count` é só informativo.

## Campos de cada magia

| Campo | O que é | Observação |
|---|---|---|
| `n` | nome | usado na busca |
| `l` | círculo | número de 0 (truque) a 9 |
| `s` | escola | use uma destas, escritas assim: Abjuração, Adivinhação, Conjuração, Encantamento, Evocação, Ilusão, Necromancia, Transmutação (é o que o filtro usa) |
| `c` | classes | lista de textos, ex.: `["Mago", "Feiticeiro"]` |
| `t` | tempo de conjuração | texto livre |
| `r` | alcance | texto livre |
| `d` | duração | texto livre |
| `k` | componentes | texto livre, ex.: `V, S, M (bat guano)` |
| `cc` | concentração | `true` ou `false` |
| `rt` | ritual | `true` ou `false` |
| `x` | descrição | parágrafos separados por `\n`; linhas de lista começam com `- ` |
| `h` | em níveis superiores | texto, ou `""` se não houver |

## Como acrescentar uma magia

1. Abra `srd-spells.json` num editor de texto.
2. Copie uma magia inteira (de `{` até `}`) e cole logo depois, com uma vírgula entre elas.
3. Altere os campos. Mantenha as aspas e as vírgulas: um erro de vírgula quebra o arquivo inteiro.
4. Salve e abra a janela "Adicionar magia" de novo.

Se o arquivo ficar inválido, a janela diz "não é um JSON válido" e mostra onde o leitor parou.
