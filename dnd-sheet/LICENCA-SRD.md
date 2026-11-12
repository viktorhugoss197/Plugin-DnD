# Licença e atribuição do banco de magias

O banco de magias deste plugin usa o texto original (em inglês) do SRD 5.1. Os dados ficam no arquivo `srd-spells.json` (formato descrito em `BANCO-DE-MAGIAS.md`).

This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.

## Origem dos dados e limitações conhecidas

Os dados vêm do arquivo `5e-SRD-Spells.json` (fork do 5e-bits/5e-database). Foram feitas apenas estas correções:

- acentos e aspas corrompidos por erro de codificação foram restaurados;
- 5 truques (Druidcraft, Fire Bolt, Poison Spray, Spare the Dying, Vicious Mockery) estavam com círculo -1 e passaram para 0;
- quando a fonte separava um título (por exemplo "Aquatic Adaptation.") do seu parágrafo, os dois foram juntados.

O texto das descrições **não foi revisado contra o livro**. Ao ler parte do arquivo, notei erros que existem na própria fonte e que foram mantidos:

- Animal Friendship: falta o trecho "At Higher Levels" que existe no SRD.
- Confusion: texto truncado e com sentido invertido ("can react", quando o correto é "can't take reactions"), sem a tabela de comportamentos.
- Conjure Animals: o fim do "At Higher Levels" está cortado (falta o espaço de 9º nível) e há um marcador de lista no lugar errado.
- Pequenos erros de digitação (por exemplo "3nd level", "60-footradius", "5th level of higher").

Só li o texto de 54 das 319 magias, então pode haver outros casos. Confira as magias que você for usar.
