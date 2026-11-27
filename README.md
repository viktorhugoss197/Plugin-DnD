# DnD Character Sheet

Plugin para **Obsidian** que transforma fichas de Dungeons & Dragons em documentos editáveis dentro do vault. A proposta do projeto é reunir em um só lugar ferramentas para criar e administrar personagens, criaturas, magias e recursos de jogo, mantendo os dados em arquivos do próprio Obsidian.

O plugin é desenvolvido em português e foi pensado para apoiar tanto a preparação do mestre quanto o acompanhamento das sessões pelos jogadores.

## Funcionalidades

### Fichas de personagem
- Criação e edição de fichas de personagem.
- Cálculo automático de modificadores de atributos e bônus de proficiência.
- Rolagens de dados e testes a partir da ficha.
- Acompanhamento de pontos de vida, pontos de vida temporários e espaços de magia.
- Livro de magias integrado ao banco interno de magias.
- Controle de recursos de classe, com recursos personalizáveis e recuperação por descanso curto, descanso longo ou início de turno.

### Criaturas e conteúdo de jogo
- Criação e edição de fichas de criaturas em arquivos próprios.
- Importação e exportação de blocos de estatísticas no formato Homebrewery.
- Abertura de fichas em janelas flutuantes.
- Integração com o Atlas VTT para abrir fichas associadas a notas e tokens.

### Modelos e organização
- Criação de modelos reutilizáveis de recursos.
- Criação de fichas a partir desses modelos.
- Atualização de modelos mantendo valores atuais, alterações pessoais e recursos removidos pelo jogador.
- Migração de fichas antigas para o formato atual, preservando os dados existentes.

## Como usar

1. Instale e ative o plugin seguindo as etapas acima.
2. Abra a paleta de comandos do Obsidian e procure pelos comandos disponibilizados pelo **DnD Character Sheet**.
3. Use os comandos de criação para iniciar uma ficha de personagem ou uma ficha de criatura.
4. Edite os campos diretamente na ficha. Os cálculos e as rolagens compatíveis são atualizados pelo plugin.
5. Para acompanhar magias e recursos, utilize as áreas correspondentes da ficha. Os arquivos gerados permanecem no vault e podem ser organizados normalmente pelo Obsidian.

> Os nomes exatos dos comandos podem variar entre versões. Consulte a paleta de comandos para ver as ações disponíveis na versão instalada.

## Arquivos utilizados

O plugin cria e utiliza arquivos próprios no vault:

| Extensão | Finalidade |
|---|---|
| `.dndsheet` | Ficha de personagem |
| `.dndcreature` | Ficha de criatura |
| `.dndresources` | Modelo de recursos |

Os arquivos ficam no vault do usuário e podem ser organizados em pastas como qualquer outro conteúdo do Obsidian.

## Instalação

### Instalação manual
1. Baixe os arquivos de distribuição do plugin: `manifest.json`, `main.js` e `styles.css`.
2. Crie a pasta `.obsidian/plugins/dnd-sheet/` dentro do seu vault, caso ela ainda não exista.
3. Coloque os três arquivos nessa pasta.
4. Abra **Configurações → Plugins da comunidade**.
5. Na lista de plugins instalados, localize **DnD Character Sheet** e ative a opção.

> Quando o plugin estiver disponível no catálogo da Comunidade do Obsidian, também será possível instalá-lo diretamente por **Configurações → Plugins da comunidade → Procurar**.

## Banco de magias e atribuição

A versão atual do código incorpora um banco interno de **319 magias**. O próprio código identifica esse conjunto como baseado no **System Reference Document 5.1 (SRD 5.1)**. Os textos em português são identificados no código como tradução feita por terceiros.

O SRD 5.1 é disponibilizado sob a licença Creative Commons Attribution 4.0 International (CC BY 4.0). A atribuição exigida pela Wizards of the Coast para o material do SRD 5.1 é:

> This work includes material taken from the System Reference Document 5.1 (“SRD 5.1”) by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.

A licença CC BY 4.0 permite compartilhar e adaptar o material licenciado, inclusive comercialmente, desde que sejam cumpridas suas condições de atribuição. Consulte o [texto da licença CC BY 4.0](https://creativecommons.org/licenses/by/4.0/legalcode) e o [SRD 5.1 oficial](https://dnd.wizards.com/resources/systems-reference-document).

**Nota sobre a tradução e a organização do banco:** a atribuição acima cobre o material do SRD 5.1. Ela não substitui os créditos ou a licença de uma tradução, de uma compilação ou da estrutura de dados criada por terceiros. O repositório ainda precisa identificar e confirmar a origem e os termos de uso específicos desses elementos antes de afirmar que todo o banco de magias está integralmente liberado para redistribuição.

## Compatibilidade e independência

Este é um projeto comunitário independente. Não é afiliado, patrocinado ou endossado pela Wizards of the Coast. A atribuição ao SRD reconhece somente o material disponibilizado sob a licença indicada; não representa parceria ou aprovação da empresa.

## Desenvolvimento

- **Repositório:** [Plugin-DnD](https://github.com/viktorhugoss197/Plugin-DnD)
- **Pasta do plugin:** `dnd-sheet/`
- **Identificador no Obsidian:** `dnd-sheet`

Sugestões, relatos de erros e contribuições são bem-vindos por meio das [Issues do GitHub](https://github.com/viktorhugoss197/Plugin-DnD/issues).
