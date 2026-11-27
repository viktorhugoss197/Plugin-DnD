const {
  Plugin, TextFileView, Notice, FuzzySuggestModal, MarkdownRenderChild, TFile,
  PluginSettingTab, Setting, Modal, Menu,
} = require("obsidian");

const VIEW_TYPE = "dnd-sheet-view";
const EXT = "dndsheet";
const BUILD_VERSION = "1.15.2";            // versão do código (main.js); o manifest.json deve ter o mesmo número
let PLUGIN_VERSION = BUILD_VERSION;
const SCHEMA_VERSION = 5;                  // formato da ficha de jogador (.dndsheet)
const CREATURE_SCHEMA_VERSION = 1;         // formato da ficha de criatura (.dndcreature)
const CEXT = "dndcreature";
const CREATURE_VIEW = "dnd-creature-view";

const ABILITIES = [
  ["str", "Força"], ["dex", "Destreza"], ["con", "Constituição"],
  ["int", "Inteligência"], ["wis", "Sabedoria"], ["cha", "Carisma"],
];

const SKILLS = [
  ["acrobatics", "Acrobacia", "dex"], ["animal", "Lidar com Animais", "wis"],
  ["arcana", "Arcanismo", "int"], ["athletics", "Atletismo", "str"],
  ["deception", "Enganação", "cha"], ["history", "História", "int"],
  ["insight", "Intuição", "wis"], ["intimidation", "Intimidação", "cha"],
  ["investigation", "Investigação", "int"], ["medicine", "Medicina", "wis"],
  ["nature", "Natureza", "int"], ["perception", "Percepção", "wis"],
  ["performance", "Atuação", "cha"], ["persuasion", "Persuasão", "cha"],
  ["religion", "Religião", "int"], ["sleight", "Prestidigitação", "dex"],
  ["stealth", "Furtividade", "dex"], ["survival", "Sobrevivência", "wis"],
];

// ---------------------------------------------------------------------
// Dados
// ---------------------------------------------------------------------

// Banco SRD 5.1 incorporado ao main.js para distribuição em arquivo único.
const SRD_SPELLS = {"format":1,"source":"SRD 5.1 (CC BY 4.0, Wizards of the Coast), tradução para o português feita por terceiros","language":"pt","count":319,"spells":[{"n":"Agarrão Chocante","l":0,"s":"Evocação","c":["Feiticeiro","Mago"],"t":"1 ação","r":"Toque","d":"Instantânea","k":"V, S","cc":false,"rt":false,"x":"Um relâmpago salta da tua mão para atingir uma criatura que tentas tocar. Realiza um ataque mágico corpo a corpo contra o alvo. Tens vantagem na jogada de ataque se o alvo estiver a usar uma armadura feita de metal. Se acertares, o alvo sofre 1d8 de dano elétrico e não pode realizar reações até ao início do seu próximo turno.\nO dano da magia aumenta em 1d8 quando atingires o 5.º nível (2d8), o 11.º nível (3d8) e o 17.º nível (4d8).","h":""},{"n":"Arte Druídica","l":0,"s":"Transmutação","c":["Druida"],"t":"1 ação","r":"30 pés (9 metros)","d":"Instantânea","k":"V, S","cc":false,"rt":false,"x":"Sussurrando aos espíritos da natureza, cria um dos seguintes efeitos dentro do alcance:\n- Cria um efeito sensorial minúsculo e inofensivo que prevê como estará o tempo na sua localização durante as próximas 24 horas. O efeito pode manifestar-se como um orbe dourado para céu limpo, uma nuvem para chuva, flocos de neve a cair para neve, e assim por diante. Este efeito persiste por 1 ronda.\n- Faz com que uma flor desabroche instantaneamente, uma vagem de sementes se abra ou um rebento de folha floresça.\n- Cria um efeito sensorial instantâneo e inofensivo, como folhas a cair, uma rajada de vento, o som de um pequeno animal ou o odor ténue de uma jararaca. O efeito deve caber num cubo de 5 pés (1,5 metros).\n- Acende ou apaga instantaneamente uma vela, uma tocha ou uma pequena fogueira.","h":""},{"n":"Ataque Certeiro","l":0,"s":"Adivinhação","c":["Bardo","Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"30 pés (9 metros)","d":"Até 1 rodada","k":"S","cc":true,"rt":false,"x":"Estendes a mão e apontas um dedo para um alvo dentro do alcance. A tua magia concede-te uma breve percepção das defesas do alvo. No teu próximo turno, ganhas vantagem na primeira jogada de ataque que fizeres contra o alvo, desde que esta magia ainda não tenha terminado.","h":""},{"n":"Bordão de Carvalho","l":0,"s":"Transmutação","c":["Druida"],"t":"1 ação bônus","r":"Toque","d":"1 minuto","k":"V, S, M (Visco, uma folha de trevo e uma clava ou bordão)","cc":false,"rt":false,"x":"A madeira de uma clava ou de um bordão que estejas a segurar fica imbuída do poder da natureza. Durante a duração, podes usar o teu atributo de conjuração em vez da Força para as jogadas de ataque e de dano dos ataques corpo a corpo realizados com essa arma, e o dado de dano da arma passa a ser um d8. A arma também se torna mágica, caso ainda não o seja. A magia termina se a conjurares novamente ou se largares a arma.","h":""},{"n":"Borrifo Ácido","l":0,"s":"Conjuração","c":["Feiticeiro","Mago"],"t":"1 ação","r":"60 pés (18 metros)","d":"Instantânea","k":"V, S","cc":false,"rt":false,"x":"Arremessa uma bolha de ácido. Escolha uma criatura dentro do alcance, ou escolha duas criaturas dentro do alcance que estejam a até 5 pés (1,5 metros) uma da outra. Um alvo deve ser bem-sucedido num teste de resistência de Destreza ou sofrerá 1d6 de dano de ácido.\nO dano desta magia aumenta em 1d6 quando atinge o 5º nível (2d6), 11º nível (3d6) e 17º nível (4d6).","h":""},{"n":"Chama Sagrada","l":0,"s":"Evocação","c":["Clérigo"],"t":"1 ação","r":"60 pés (18 metros)","d":"Instantânea","k":"V, S","cc":false,"rt":false,"x":"Uma radiância semelhante a uma chama desce sobre uma criatura que consigas ver dentro do alcance. O alvo tem de ser bem-sucedido numa salvaguarda de Destreza ou sofre 1d8 de dano radiante. O alvo não recebe qualquer benefício de cobertura para esta salvaguarda.\nO dano da magia aumenta em 1d8 quando atingires o 5.º nível (2d8), o 11.º nível (3d8) e o 17.º nível (4d8).","h":""},{"n":"Explosão Mística","l":0,"s":"Evocação","c":["Bruxo"],"t":"1 ação","r":"120 pés (36 metros)","d":"Instantânea","k":"V, S","cc":false,"rt":false,"x":"Um feixe de energia crepitante dispara em direção a uma criatura dentro do alcance. Faça um ataque de magia à distância contra o alvo. Num acerto, o alvo sofre 1d10 de dano de força.","h":"A magia cria mais do que um feixe quando atinge níveis superiores: dois feixes no 5º nível, três feixes no 11º nível e quatro feixes no 17º nível. Pode direcionar os feixes para o mesmo alvo ou para alvos diferentes. Faça uma rolagem de ataque separada para cada feixe."},{"n":"Ilusão Menor","l":0,"s":"Ilusão","c":["Bardo","Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"30 pés (9,1 metros)","d":"1 minuto","k":"S, M (Um pouco de lã)","cc":false,"rt":false,"x":"Cria um som ou a imagem de um objeto dentro do alcance que dura enquanto durar a magia. A ilusão também termina se a dissipar usando uma ação ou se conjurar esta magia novamente.\nSe criar um som, o seu volume pode variar entre um sussurro e um grito. Pode ser a sua voz, a voz de outra pessoa, o rugido de um leão, o som de tambores ou qualquer outro som à sua escolha. O som continua sem interrupção durante toda a duração ou pode produzir sons distintos em momentos diferentes antes de a magia terminar.\nSe criar a imagem de um objeto — como uma cadeira, pegadas enlameadas ou um pequeno baú —, esta não pode ser maior do que um cubo de 5 pés (1,5 metros). A imagem não pode produzir som, luz, cheiro nem qualquer outro efeito sensorial. A interação física com a imagem revela que se trata de uma ilusão, pois os objetos podem atravessá-la.\nSe uma criatura usar a sua ação para examinar o som ou a imagem, pode determinar que se trata de uma ilusão com um teste bem-sucedido de Inteligência (Investigação) contra a sua CD para resistir às suas magias. Se uma criatura reconhecer a ilusão como tal, esta torna-se ténue para ela.","h":""},{"n":"Luz","l":0,"s":"Evocação","c":["Bardo","Clérigo","Feiticeiro","Mago"],"t":"1 ação","r":"Toque","d":"1 hora","k":"V, M (Um pirilampo ou musgo fosforescente)","cc":false,"rt":false,"x":"Toca num objeto que não seja maior do que 10 pés (3 metros) em qualquer dimensão. Até a magia terminar, o objeto emite luz brilhante num raio de 20 pés (6 metros) e luz fraca por mais 20 pés (6 metros). A luz pode ter a cor que desejar. Cobrir completamente o objeto com algo opaco bloqueia a luz. A magia termina se a conjurar novamente ou se a dissipar usando uma ação.\nSe escolher como alvo um objeto que esteja a ser segurado ou vestido por uma criatura hostil, essa criatura deve ser bem-sucedida num teste de resistência de Destreza para evitar a magia.","h":""},{"n":"Luzes Dançantes","l":0,"s":"Evocação","c":["Bardo","Feiticeiro","Mago"],"t":"1 ação","r":"120 pés (36 metros)","d":"Até 1 minuto","k":"V, S, M (Um pouco de fósforo ou madeira de ulmeiro, ou um pirilampo)","cc":true,"rt":false,"x":"Cria até quatro luzes do tamanho de tochas dentro do alcance, fazendo com que pareçam tochas, lanternas ou orbes brilhantes que pairam no ar pela duração. Também pode combinar as quatro luzes numa forma vagamente humanoide brilhante de tamanho Médio. Seja qual for a forma que escolher, cada luz emite luz fraca num raio de 10 pés (3 metros).\nComo uma ação bónus no seu turno, pode mover as luzes até 60 pés (18 metros) para um novo local dentro do alcance. Uma luz deve estar a até 20 pés (6 metros) de outra luz criada por esta magia, e uma luz apaga-se se exceder o alcance da magia.","h":""},{"n":"Mão Mágica","l":0,"s":"Conjuração","c":["Bardo","Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"30 pés (9,1 metros)","d":"1 minuto","k":"V, S","cc":false,"rt":false,"x":"Uma mão espectral e flutuante aparece num ponto à sua escolha dentro do alcance. A mão dura até a magia terminar ou até a dissipar usando uma ação. A mão desaparece se alguma vez ficar a mais de 30 pés (9 metros) de si ou se conjurar esta magia novamente.\nPode usar a sua ação para controlar a mão. Pode usá-la para manipular um objeto, abrir uma porta ou recipiente destrancado, guardar ou retirar um objeto de um recipiente aberto ou despejar o conteúdo de um frasco. Pode mover a mão até 30 pés (9 metros) de cada vez que a utiliza.\nA mão não pode atacar, ativar objetos mágicos nem transportar mais de 10 libras (4,5 quilogramas).","h":""},{"n":"Mensagem","l":0,"s":"Transmutação","c":["Bardo","Feiticeiro","Mago"],"t":"1 ação","r":"120 pés (36,6 metros)","d":"1 rodada","k":"V, S, M (Um pequeno pedaço de fio de cobre)","cc":false,"rt":false,"x":"Aponta o dedo para uma criatura dentro do alcance e sussurra uma mensagem. O alvo (e apenas o alvo) ouve a mensagem e pode responder num sussurro que apenas você consegue ouvir.\nPode conjurar esta magia através de objetos sólidos se conhecer o alvo e souber que está do outro lado da barreira. Silêncio mágico, 1 pé (30 centímetros) de pedra, 1 polegada (2,5 centímetros) de metal comum, uma fina folha de chumbo ou 3 pés (90 centímetros) de madeira bloqueiam a magia. A magia não precisa de seguir uma linha reta e pode contornar esquinas ou atravessar aberturas livremente.","h":""},{"n":"Orientação","l":0,"s":"Adivinhação","c":["Clérigo","Druida"],"t":"1 ação","r":"Toque","d":"1 minuto","k":"V, S","cc":true,"rt":false,"x":"Você toca um voluntário. Uma vez antes da magia acabar, o alvo pode rolar um d4 e adicionar o número rolado a um teste de habilidade à sua escolha. Ele pode rolar o dado antes ou depois de fazer o teste de habilidade. Após isso, a magia acaba.","h":""},{"n":"Poupar os Moribundos","l":0,"s":"Necromancia","c":["Clérigo"],"t":"1 ação","r":"Toque","d":"Instantânea","k":"V, S","cc":false,"rt":false,"x":"Tocas numa criatura viva que tenha 0 pontos de vida. A criatura fica estabilizada. Esta magia não tem efeito sobre mortos-vivos ou constructos.","h":""},{"n":"Prestidigitação","l":0,"s":"Transmutação","c":["Bardo","Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"10 pés (3 metros)","d":"1 hora","k":"V, S","cc":false,"rt":false,"x":"Esta magia é um pequeno truque mágico que os conjuradores novatos usam para praticar. Cria um dos seguintes efeitos mágicos dentro do alcance:\nCria um efeito sensorial instantâneo e inofensivo, como uma chuva de faíscas, uma lufada de vento, notas musicais suaves ou um odor peculiar.\nAcende ou apaga instantaneamente uma vela, uma tocha ou uma pequena fogueira.\nLimpa ou suja instantaneamente um objeto que não seja maior do que 1 pé cúbico (0,03 metros cúbicos).\nArrefece, aquece ou altera o sabor de até 1 pé cúbico (0,03 metros cúbicos) de material não vivo durante 1 hora.\nFaz surgir uma cor, uma pequena marca ou um símbolo num objeto ou superfície durante 1 hora.\nCria uma bugiganga não mágica ou uma imagem ilusória que caiba na sua mão e que dure até ao final do seu próximo turno.\nSe conjurar esta magia várias vezes, pode manter até três dos seus efeitos não instantâneos ativos ao mesmo tempo, podendo dispensar qualquer um deles usando uma ação.","h":""},{"n":"Produzir Chama","l":0,"s":"Conjuração","c":["Druida"],"t":"1 ação","r":"Pessoal","d":"10 minutos","k":"V, S","cc":false,"rt":false,"x":"Uma chama bruxuleante surge na sua mão. A chama permanece aí durante a duração e não o prejudica nem ao seu equipamento. A chama emite luz intensa num raio de 10 pés (3 metros) e luz ténue por mais 10 pés (3 metros). A magia termina se a dissipar usando uma ação ou se a conjurar novamente.\nTambém pode atacar com a chama, embora isso termine a magia. Quando conjura esta magia, ou usando uma ação num turno posterior, pode lançar a chama contra uma criatura a até 30 pés (9 metros) de si. Realize um ataque mágico à distância. Se acertar, o alvo sofre 1d8 de dano de fogo.\nO dano desta magia aumenta em 1d8 quando atinge o 5.º nível (2d8), o 11.º nível (3d8) e o 17.º nível (4d8).","h":""},{"n":"Pulverização Venenosa","l":0,"s":"Conjuração","c":["Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"10 pés (3 metros)","d":"Instantânea","k":"V, S","cc":false,"rt":false,"x":"Estende a mão na direção de uma criatura que consiga ver dentro do alcance e projeta da palma um sopro de gás nocivo. A criatura tem de ser bem-sucedida num teste de resistência de Constituição ou sofre 1d12 de dano venenoso.\nO dano desta magia aumenta em 1d12 quando atinge o 5.º nível (2d12), o 11.º nível (3d12) e o 17.º nível (4d12).","h":""},{"n":"Raio de Gelo","l":0,"s":"Evocação","c":["Feiticeiro","Mago"],"t":"1 ação","r":"60 pés (18 metros)","d":"Instantânea","k":"V, S","cc":false,"rt":false,"x":"Um raio gélido de luz azul-esbranquiçada dispara em direção a uma criatura dentro do alcance. Realize um ataque mágico à distância contra o alvo. Se acertar, este sofre 1d8 de dano de frio e o seu deslocamento é reduzido em 10 pés (3 metros) até ao início do seu próximo turno.\nO dano desta magia aumenta em 1d8 quando atinge o 5.º nível (2d8), o 11.º nível (3d8) e o 17.º nível (4d8).","h":""},{"n":"Reparação","l":0,"s":"Transmutação","c":["Clérigo","Bardo","Druida","Feiticeiro","Mago"],"t":"1 minuto","r":"Toque","d":"Instantânea","k":"V, S, M (Duas pedras-íman)","cc":false,"rt":false,"x":"Esta magia repara uma única quebra ou rasgão num objeto que toque, como uma chave partida, uma capa rasgada ou um odre com fugas. Desde que a quebra ou o rasgão não tenha mais de 1 pé (30 centímetros) em qualquer dimensão, repara-o sem deixar qualquer vestígio do dano anterior.\nEsta magia pode reparar fisicamente um objeto mágico ou constructo, mas não restaura a magia desse objeto.","h":""},{"n":"Resistência","l":0,"s":"Abjuração","c":["Clérigo","Druida"],"t":"1 ação","r":"Toque","d":"Até 1 minuto","k":"V, S, M (Uma pequena capa)","cc":true,"rt":false,"x":"Tocas numa criatura voluntária. Uma vez antes de a magia terminar, o alvo pode lançar um d4 e adicionar o resultado a uma salvaguarda à sua escolha. Pode lançar o dado antes ou depois de realizar a salvaguarda. Em seguida, a magia termina.","h":""},{"n":"Seta de Fogo","l":0,"s":"Evocação","c":["Feiticeiro","Mago"],"t":"1 ação","r":"120 pés (36 metros)","d":"Instantânea","k":"V, S","cc":false,"rt":false,"x":"Arremessa uma partícula de fogo a uma criatura ou objeto dentro do alcance. Faça um ataque de magia à distância contra o alvo. Num acerto, o alvo sofre 1d10 de dano de fogo. Um objeto inflamável atingido por esta magia incendeia-se se não estiver a ser vestido ou carregado.\nO dano desta magia aumenta em 1d10 quando atinge o 5º nível (2d10), 11º nível (3d10) e 17º nível (4d10).","h":""},{"n":"Taumaturgia","l":0,"s":"Transmutação","c":["Clérigo"],"t":"1 ação","r":"30 pés (9 metros)","d":"1 minuto","k":"V","cc":false,"rt":false,"x":"Manifestas uma pequena maravilha, um sinal de poder sobrenatural, dentro do alcance. Crias um dos seguintes efeitos mágicos dentro do alcance.\nA tua voz ressoa até três vezes mais alto do que o normal durante 1 minuto.\nFazes com que as chamas tremulem, brilhem mais, diminuam de intensidade ou mudem de cor durante 1 minuto.\nProvocas tremores inofensivos no chão durante 1 minuto.\nCrias um som instantâneo com origem num ponto à tua escolha dentro do alcance, como o ribombar de um trovão, o grasnar de um corvo ou sussurros sinistros.\nFazes instantaneamente com que uma porta ou janela destrancada se abra de rompante ou se feche com estrondo.\nAlteras a aparência dos teus olhos durante 1 minuto.\nSe conjurares esta magia várias vezes, podes manter até três dos seus efeitos de 1 minuto ativos em simultâneo e podes terminar qualquer um deles usando uma ação.","h":""},{"n":"Toque Gélido","l":0,"s":"Necromancia","c":["Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"120 pés (36 metros)","d":"1 rodada","k":"V, S","cc":false,"rt":false,"x":"Cria uma mão esquelética fantasmagórica no espaço de uma criatura dentro do alcance. Faça um ataque de magia à distância contra a criatura para atacá-la com o frio do túmulo. Num acerto, o alvo sofre 1d8 de dano necrótico, e não pode recuperar pontos de vida até ao início do seu próximo turno. Até lá, a mão agarra-se ao alvo.\nSe acertar num alvo morto-vivo, este também tem desvantagem nas rolagens de ataque contra si até ao fim do seu próximo turno.\nO dano desta magia aumenta em 1d8 quando atinge o 5º nível (2d8), 11º nível (3d8) e 17º nível (4d8).","h":""},{"n":"Zombaria Viciosa","l":0,"s":"Encantamento","c":["Bardo"],"t":"1 ação","r":"60 pés (18 metros)","d":"Instantânea","k":"V","cc":false,"rt":false,"x":"Lanças uma série de insultos, imbuídos de encantamentos subtis, contra uma criatura que consigas ver dentro do alcance. Se o alvo te conseguir ouvir (embora não precise de te compreender), tem de ser bem-sucedido num teste de resistência de Sabedoria ou sofre 1d4 de dano psíquico e tem desvantagem na próxima jogada de ataque que fizer antes do fim do seu próximo turno.\nO dano desta magia aumenta em 1d4 quando atinges o 5.º nível (2d4), o 11.º nível (3d4) e o 17.º nível (4d4).","h":""},{"n":"Abençoar","l":1,"s":"Encantamento","c":["Clérigo","Paladino"],"t":"1 ação","r":"30 pés (9 metros)","d":"Até 1 minuto","k":"V, S, M (Um borrifo de água benta)","cc":true,"rt":false,"x":"Abençoa até três criaturas à sua escolha dentro do alcance. Sempre que um alvo fizer uma rolagem de ataque ou um teste de resistência antes da magia terminar, o alvo pode rolar um d4 e adicionar o número rolado à rolagem de ataque ou teste de resistência.","h":"Quando conjura esta magia usando um espaço de magia de 2º nível ou superior, pode ter como alvo uma criatura adicional para cada nível do espaço acima do 1º."},{"n":"Alarme","l":1,"s":"Abjuração","c":["Patrulheiro","Mago"],"t":"1 minuto","r":"30 pés (9 metros)","d":"8 horas","k":"V, S, M (Um sino minúsculo e um pedaço de fio de prata fino)","cc":false,"rt":true,"x":"Cria um alarme contra intrusões indesejadas. Escolha uma porta, uma janela ou uma área dentro do alcance que não seja maior que um cubo de 20 pés (6 metros). Até a magia terminar, um alarme alerta-o sempre que uma criatura Minúscula ou maior tocar ou entrar na área protegida. Quando conjura a magia, pode designar criaturas que não acionarão o alarme. Também escolhe se o alarme é mental ou audível.\nUm alarme mental alerta-o com um 'ping' na sua mente se estiver a até 1 milha (1,6 km) da área protegida. Este 'ping' acorda-o se estiver a dormir.\nUm alarme audível produz o som de um sino de mão durante 10 segundos até 60 pés (18 metros).","h":""},{"n":"Amizade Animal","l":1,"s":"Encantamento","c":["Bardo","Clérigo","Druida","Patrulheiro"],"t":"1 ação","r":"30 pés (9 metros)","d":"24 horas","k":"V, S, M (Um bocado de comida)","cc":false,"rt":false,"x":"Esta magia permite-lhe convencer uma besta de que não lhe quer fazer mal. Escolha uma besta que consiga ver dentro do alcance. Ela deve vê-lo e ouvi-lo. Se a Inteligência da besta for 4 ou superior, a magia falha. Caso contrário, a besta deve ser bem-sucedida num teste de resistência de Sabedoria ou ficará encantada por si durante a duração da magia. Se você ou um dos seus companheiros causar dano ao alvo, a magia termina.","h":""},{"n":"Armadura Arcana","l":1,"s":"Abjuração","c":["Feiticeiro","Mago"],"t":"1 ação","r":"Toque","d":"8 horas","k":"V, S, M (Um pedaço de couro curtido)","cc":false,"rt":false,"x":"Toca numa criatura voluntária que não esteja a usar armadura, e uma força mágica protetora envolve-a até a magia terminar. A CA base do alvo passa a ser 13 + o seu modificador de Destreza. A magia termina se o alvo vestir uma armadura ou se a dissipar usando uma ação.","h":""},{"n":"Bom Fruto","l":1,"s":"Transmutação","c":["Druida","Patrulheiro"],"t":"1 ação","r":"Toque","d":"Instantânea","k":"V, S, M (Um ramo de visco)","cc":false,"rt":false,"x":"Até dez frutos aparecem na sua mão e são imbuídos com magia pela duração. Uma criatura pode usar sua ação para comer um fruto. Comer um fruto restaura 1 ponto de vida, e o fruto fornece nutrição suficiente para sustentar uma criatura por um dia.\nOs frutos perdem a sua potência se não forem consumidos dentro de 24 horas após a conjuração desta magia.","h":""},{"n":"Comando","l":1,"s":"Encantamento","c":["Clérigo","Paladino"],"t":"1 ação","r":"60 pés (18 metros)","d":"1 rodada","k":"V","cc":false,"rt":false,"x":"Diz um comando de uma única palavra a uma criatura que consiga ver dentro do alcance. O alvo deve ser bem-sucedido num teste de resistência de Sabedoria ou seguir o comando no seu próximo turno. A magia não tem efeito se o alvo for morto-vivo, se não compreender o seu idioma, ou se o seu comando for diretamente prejudicial para ele.\nSeguem-se alguns comandos típicos e os seus efeitos. Pode emitir um comando diferente dos aqui descritos. Se o fizer, o DM determina como o alvo se comporta. Se o alvo não conseguir seguir o seu comando, a magia termina.\nAproxima-te. O alvo move-se na sua direção pela rota mais curta e direta, terminando o seu turno se chegar a até 5 pés (1,5 metros) de si.\nLarga. O alvo larga o que quer que esteja a segurar e depois termina o seu turno.\nFoge. O alvo passa o seu turno a afastar-se de si pelos meios mais rápidos disponíveis.\nRasteja. O alvo cai prostrado e depois termina o seu turno.\nPára. O alvo não se move e não toma ações. Uma criatura voadora mantém-se no ar, desde que seja capaz de o fazer. Se tiver de se mover para se manter no ar, voa a distância mínima necessária para permanecer no ar.","h":"Quando conjura esta magia usando um espaço de magia de 2º nível ou superior, pode afetar uma criatura adicional para cada nível do espaço acima do 1º. As criaturas devem estar a até 30 pés (9 metros) umas das outras quando as alveja."},{"n":"Compreender Idiomas","l":1,"s":"Adivinhação","c":["Bardo","Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"Pessoal","d":"1 hora","k":"V, S, M (Uma pitada de fuligem e sal)","cc":false,"rt":true,"x":"Pela duração, compreende o significado literal de qualquer idioma falado que ouça. Também compreende qualquer idioma escrito que veja, mas deve estar a tocar na superfície na qual as palavras estão escritas. Demora cerca de 1 minuto a ler uma página de texto.\nEsta magia não descodifica mensagens secretas num texto ou um glifo, como um selo arcano, que não faça parte de um idioma escrito.","h":""},{"n":"Constrição","l":1,"s":"Conjuração","c":["Druida","Patrulheiro"],"t":"1 ação","r":"90 pés (27 metros)","d":"Até 1 minuto","k":"V, S","cc":true,"rt":false,"x":"Ervas daninhas e trepadeiras agarradoras brotam do chão num quadrado de 20 pés (6 metros) a partir de um ponto dentro do alcance. Pela duração, estas plantas transformam o chão na área em terreno difícil.\nUma criatura na área quando conjura a magia deve ser bem-sucedida num teste de resistência de Força ou ficará impedida pelas plantas constritoras até a magia terminar. Uma criatura impedida pelas plantas pode usar a sua ação para fazer um teste de Força contra a sua CD de salvamento de magia. Num sucesso, ela liberta-se.\nQuando a magia termina, as plantas invocadas murcham.","h":""},{"n":"Criar ou Destruir Água","l":1,"s":"Transmutação","c":["Clérigo","Druida"],"t":"1 ação","r":"30 pés (9 metros)","d":"Instantânea","k":"V, S, M (Uma gota de água se criar água, ou alguns grãos de areia se a destruir)","cc":false,"rt":false,"x":"Pode criar ou destruir água.\nCriar Água. Cria até 10 galões (38 litros) de água limpa dentro do alcance num recipiente aberto. Alternativamente, a água cai como chuva num cubo de 30 pés (9 metros) dentro do alcance.\nDestruir Água. Destrói até 10 galões (38 litros) de água num recipiente aberto dentro do alcance. Alternativamente, destrói o nevoeiro num cubo de 30 pés (9 metros) dentro do alcance.","h":"Quando conjura esta magia usando um espaço de magia de 2º nível ou superior, cria ou destrói 10 galões de água adicionais, ou o tamanho do cubo aumenta em 5 pés (1,5 metros), para cada nível do espaço acima do 1º."},{"n":"Curar Ferimentos","l":1,"s":"Evocação","c":["Bardo","Clérigo","Druida","Paladino","Patrulheiro"],"t":"1 ação","r":"Toque","d":"Instantânea","k":"V, S","cc":false,"rt":false,"x":"Uma criatura na qual toque recupera um número de pontos de vida igual a 1d8 + o seu modificador de habilidade de conjuração. Esta magia não tem efeito em mortos-vivos ou constructos.","h":"Quando conjura esta magia usando um espaço de magia de 2º nível ou superior, a cura aumenta em 1d8 para cada nível do espaço acima do 1º."},{"n":"Detetar Bem e Mal","l":1,"s":"Adivinhação","c":["Clérigo","Paladino"],"t":"1 ação","r":"Pessoal","d":"Até 10 minutos","k":"V, S","cc":true,"rt":false,"x":"Pela duração, sabe se existe uma aberração, celestial, elemental, ser feérico, corruptor ou morto-vivo a até 30 pés (9 metros) de si, bem como onde a criatura se encontra localizada. Da mesma forma, sabe se existe um lugar ou objeto a até 30 pés de si que tenha sido magicamente consagrado ou profanado.\nA magia consegue penetrar na maioria das barreiras, mas é bloqueada por 1 pé (30 cm) de pedra, 1 polegada (2,5 cm) de metal comum, uma folha fina de chumbo, ou 3 pés (90 cm) de madeira ou terra.","h":""},{"n":"Detetar Magia","l":1,"s":"Adivinhação","c":["Bardo","Clérigo","Druida","Paladino","Patrulheiro","Feiticeiro","Mago"],"t":"1 ação","r":"Pessoal","d":"Até 10 minutos","k":"V, S","cc":true,"rt":true,"x":"Pela duração, sente a presença de magia a até 30 pés (9 metros) de si. Se sentir magia desta forma, pode usar a sua ação para ver uma aura fraca em redor de qualquer criatura visível ou objeto na área que possua magia, e aprende a sua escola de magia, se tiver alguma.\nA magia consegue penetrar na maioria das barreiras, mas é bloqueada por 1 pé (30 cm) de pedra, 1 polegada (2,5 cm) de metal comum, uma folha fina de chumbo, ou 3 pés (90 cm) de madeira ou terra.","h":""},{"n":"Detetar Veneno e Doença","l":1,"s":"Adivinhação","c":["Clérigo","Druida","Paladino","Patrulheiro"],"t":"1 ação","r":"Pessoal","d":"Até 10 minutos","k":"V, S, M (Uma folha de teixo)","cc":true,"rt":true,"x":"Pela duração, consegue sentir a presença e localização de venenos, criaturas venenosas e doenças a até 30 pés (9 metros) de si. Também identifica o tipo de veneno, criatura venenosa ou doença em cada caso.\nA magia consegue penetrar na maioria das barreiras, mas é bloqueada por 1 pé (30 cm) de pedra, 1 polegada (2,5 cm) de metal comum, uma folha fina de chumbo, ou 3 pés (90 cm) de madeira ou terra.","h":""},{"n":"Disco Flutuante","l":1,"s":"Conjuração","c":["Mago"],"t":"1 ação","r":"9 metros","d":"1 hora","k":"V, S, M (Uma gota de mercúrio)","cc":false,"rt":true,"x":"Esta magia cria um plano circular e horizontal de energia, com 90 centímetros de diâmetro e 2,5 centímetros de espessura, que flutua a 90 centímetros acima do chão em um espaço desocupado à sua escolha que você possa ver dentro do alcance. O disco permanece pela duração e pode suportar até 225 kg. Se mais peso for colocado sobre ele, a magia termina e tudo sobre o disco cai no chão.\nO disco é imóvel enquanto você estiver a até 6 metros dele. Se você se afastar mais de 6 metros dele, o disco o segue para que permaneça a 6 metros de você. Ele pode se mover através de terreno irregular, subir ou descer escadas, encostas e similares, mas não pode cruzar uma mudança de elevação de 3 metros ou mais. Por exemplo, o disco não pode se mover sobre um buraco de 3 metros de profundidade, nem poderia sair de um se fosse criado no fundo.\nSe você se afastar mais de 30 metros do disco (geralmente porque ele não pode contornar um obstáculo para segui-lo), a magia termina.","h":""},{"n":"Disfarçar-se","l":1,"s":"Ilusão","c":["Bardo","Feiticeiro","Mago"],"t":"1 ação","r":"Pessoal","d":"1 hora","k":"V, S","cc":false,"rt":false,"x":"Faz com que pareça diferente — incluindo as suas roupas, armadura, armas e outros pertences no seu corpo — até a magia terminar ou até usar a sua ação para a dissipar. Pode parecer 1 pé (30 cm) mais baixo ou mais alto e parecer magro, gordo ou intermédio. Não pode mudar o seu tipo de corpo, por isso deve adotar uma forma que tenha a mesma disposição básica de membros. De resto, a extensão da ilusão depende de si.\nAs alterações efetuadas por esta magia não resistem a uma inspeção física. Por exemplo, se usar esta magia para adicionar um chapéu ao seu traje, objetos passam através do chapéu, e qualquer pessoa que lhe toque não sentiria nada ou sentiria a sua cabeça e cabelo. Se usar esta magia para parecer mais magro do que é, a mão de alguém que se estique para lhe tocar esbarraria em si enquanto aparenta estar no ar.\nPara perceber que está disfarçado, uma criatura pode usar a sua ação para inspecionar a sua aparência e deve ser bem-sucedida num teste de Inteligência (Investigação) contra a sua CD de salvamento de magia.","h":""},{"n":"Encantar Pessoa","l":1,"s":"Encantamento","c":["Bardo","Druida","Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"30 pés (9 metros)","d":"1 hora","k":"V, S","cc":false,"rt":false,"x":"Tenta encantar um humanoide que possa ver dentro do alcance. Ele deve fazer um teste de resistência de Sabedoria, e fá-lo com desvantagem se você ou os seus companheiros estiverem a lutar contra ele. Se falhar no teste de resistência, fica encantado por si até a magia terminar ou até que você ou os seus companheiros lhe façam algo prejudicial. A criatura encantada considera-o um conhecido amigável. Quando a magia termina, a criatura sabe que foi encantada por si.","h":"Quando conjura esta magia usando um espaço de magia de 2º nível ou superior, pode ter como alvo uma criatura adicional para cada nível do espaço acima do 1º. As criaturas devem estar a até 30 pés (9 metros) umas das outras quando as alveja."},{"n":"Encontrar Familiar","l":1,"s":"Conjuração","c":["Mago"],"t":"1 hora","r":"10 pés (3 metros)","d":"Instantânea","k":"V, S, M (10 po em carvão, incenso e ervas que devem ser consumidos pelo fogo num braseiro de latão)","cc":false,"rt":true,"x":"Ganha o serviço de um familiar, um espírito que assume uma forma animal que escolha: morcego, gato, caranguejo, sapo (rã), falcão, lagarto, polvo, coruja, serpente venenosa, peixe, rato, corvo, cavalo-marinho, aranha ou doninha. Aparecendo num espaço desocupado dentro do alcance, o familiar tem as estatísticas da forma escolhida, embora seja um celestial, ser feérico ou corruptor (à sua escolha) em vez de uma besta.\nO seu familiar atua independentemente de si, mas obedece sempre aos seus comandos. Em combate, rola a sua própria iniciativa e age no seu próprio turno. Um familiar não pode atacar, mas pode tomar outras ações normalmente.\nQuando o familiar cai para 0 pontos de vida, desaparece, não deixando nenhuma forma física. Reaparece após conjurar esta magia novamente.\nEnquanto o seu familiar estiver a até 100 pés (30 metros) de si, pode comunicar com ele telepaticamente. Adicionalmente, como uma ação, pode ver através dos olhos do seu familiar e ouvir o que ele ouve até ao início do seu próximo turno, ganhando os benefícios de quaisquer sentidos especiais que o familiar tenha. Durante este tempo, fica cego e surdo no que diz respeito aos seus próprios sentidos.\nComo uma ação, pode dispensar temporariamente o seu familiar. Ele desaparece para uma dimensão de bolso onde aguarda a sua invocação. Em alternativa, pode dispensá-lo para sempre. Como uma ação enquanto estiver temporariamente dispensado, pode fazê-lo reaparecer em qualquer espaço desocupado a até 30 pés (9 metros) de si.\nNão pode ter mais do que um familiar de cada vez. Se conjurar esta magia enquanto já tiver um familiar, faz com que ele adote uma nova forma. Escolha uma das formas da lista acima. O seu familiar transforma-se na criatura escolhida.\nPor fim, quando conjura uma magia com um alcance de toque, o seu familiar pode entregar a magia como se a tivesse conjurado. O seu familiar deve estar a até 100 pés de si, e deve usar a sua reação para entregar a magia quando a conjura. Se a magia requerer uma rolagem de ataque, usa o seu modificador de ação para a rolagem.","h":""},{"n":"Escrita Ilusória","l":1,"s":"Ilusão","c":["Bardo","Bruxo","Mago"],"t":"1 minuto","r":"Toque","d":"10 dias","k":"S, M (Uma tinta à base de chumbo com valor mínimo de 10 po, que a magia consome)","cc":false,"rt":true,"x":"Escreve em pergaminho, papel ou outro material de escrita adequado e imbui-o com uma ilusão poderosa que dura pela duração.\nPara si e para quaisquer criaturas que designar quando conjura a magia, a escrita parece normal, escrita com a sua caligrafia, e transmite o significado que pretendeu ao escrever o texto. Para todas as outras pessoas, a escrita parece ter sido redigida num alfabeto desconhecido ou mágico e é ininteligível. Em alternativa, pode fazer com que a escrita pareça transmitir uma mensagem completamente diferente, escrita com outra caligrafia e noutra língua, embora essa língua tenha de ser uma que conheça.\nSe a magia for dissipada, tanto a escrita original como a ilusão desaparecem.\nUma criatura com visão verdadeira consegue ler a mensagem oculta.","h":""},{"n":"Escudo","l":1,"s":"Abjuração","c":["Feiticeiro","Mago"],"t":"1 reação","r":"Pessoal","d":"1 rodada","k":"V, S","cc":false,"rt":false,"x":"Uma barreira invisível de força mágica aparece e protege-te. Até ao início do teu próximo turno, recebes um bónus de +5 à CA, inclusive contra o ataque que desencadeou a magia, e não sofres dano da magia Mísseis Mágicos.","h":""},{"n":"Escudo da Fé","l":1,"s":"Abjuração","c":["Clérigo","Paladino"],"t":"1 ação bônus","r":"60 pés (18 metros)","d":"Até 10 minutos","k":"V, S, M (Um pequeno pergaminho com um fragmento de texto sagrado escrito)","cc":true,"rt":false,"x":"Um campo cintilante aparece e envolve uma criatura à tua escolha dentro do alcance, concedendo-lhe um bónus de +2 à CA durante a duração.","h":""},{"n":"Falar com os Animais","l":1,"s":"Adivinhação","c":["Bardo","Druida","Patrulheiro"],"t":"1 ação","r":"Pessoal","d":"10 minutos","k":"V, S","cc":false,"rt":true,"x":"Durante a duração, ganhas a capacidade de compreender e comunicar verbalmente com bestas. O conhecimento e a consciência de muitas bestas são limitados pela sua inteligência, mas, no mínimo, as bestas podem dar-te informações sobre locais e monstros próximos, incluindo tudo o que consigam perceber ou tenham percebido durante o último dia. Podes tentar persuadir uma besta a realizar um pequeno favor por ti, à discrição do Mestre.","h":""},{"n":"Falsa Vida","l":1,"s":"Necromancia","c":["Feiticeiro","Mago"],"t":"1 ação","r":"Pessoal","d":"1 hora","k":"V, S, M (Uma pequena quantidade de álcool ou bebidas espirituosas destiladas)","cc":false,"rt":false,"x":"Fortalecendo-se com um fac-símile necromântico de vida, ganha 1d4 + 4 pontos de vida temporários pela duração.","h":"Quando conjura esta magia usando um espaço de magia de 2º nível ou superior, ganha 5 pontos de vida temporários adicionais para cada nível do espaço acima do 1º."},{"n":"Favor Divino","l":1,"s":"Evocação","c":["Paladino"],"t":"1 ação bônus","r":"Pessoal","d":"Até 1 minuto","k":"V, S","cc":true,"rt":false,"x":"A sua oração capacita-o com radiância divina. Até a magia terminar, os seus ataques de arma causam 1d4 de dano radiante extra num acerto.","h":""},{"n":"Fogo Feérico","l":1,"s":"Evocação","c":["Bardo","Druida"],"t":"1 ação","r":"60 pés (18 metros)","d":"Até 1 minuto","k":"V","cc":true,"rt":false,"x":"Cada objeto num cubo de 20 pés (6 metros) dentro do alcance fica contornado por luz azul, verde ou violeta (à sua escolha). Qualquer criatura na área quando a magia é conjurada também fica contornada por luz se falhar um teste de resistência de Destreza. Pela duração, objetos e criaturas afetadas emitem luz fraca num raio de 10 pés (3 metros).\nQualquer rolagem de ataque contra uma criatura ou objeto afetado tem vantagem se o atacante conseguir vê-lo, e a criatura ou objeto afetado não pode beneficiar de estar invisível.","h":""},{"n":"Graxa","l":1,"s":"Conjuração","c":["Mago"],"t":"1 ação","r":"18 metros","d":"1 minuto","k":"V, S, M (Um pedaço de pele de porco ou manteiga)","cc":false,"rt":false,"x":"Uma graxa escorregadia cobre o chão em um quadrado de 3 metros centrado em um ponto dentro do alcance e o transforma em terreno difícil pela duração.\nQuando a graxa aparece, cada criatura de pé na área deve ser bem-sucedida num teste de resistência de Destreza ou cairá caída. Uma criatura que entrar na área ou terminar seu turno nela também deve ser bem-sucedida num teste de resistência de Destreza ou cairá caída.","h":""},{"n":"Heroísmo","l":1,"s":"Encantamento","c":["Bardo","Paladino"],"t":"1 ação","r":"Toque","d":"1 minuto","k":"V, S","cc":true,"rt":false,"x":"Uma criatura voluntária em que você tocar é imbuída com bravura. Até a magia acabar, a criatura é imune a ser amedrontada e ganha pontos de vida temporários iguais ao seu modificador de habilidade de conjuração no início de cada um dos turnos dela. Quando a magia acabar, o alvo perde quaisquer pontos de vida temporários restantes desta magia.","h":"Quando você conjurar esta magia usando um espaço de magia de 2º nível ou superior, você pode escolher uma criatura adicional para cada nível do espaço acima do 1º."},{"n":"Identificar","l":1,"s":"Adivinhação","c":["Bardo","Mago"],"t":"1 minuto","r":"Toque","d":"Instantânea","k":"V, S, M (Uma pérola com valor mínimo de 100 po e uma pena de coruja)","cc":false,"rt":true,"x":"Escolhe um objeto que deve tocar durante toda a conjuração da magia. Se for um item mágico ou outro objeto imbuído de magia, aprende as suas propriedades e como as utilizar, se exige sintonização para ser usado e quantas cargas tem, caso tenha alguma. Aprende se alguma magia está a afetar o item e quais são. Se o item tiver sido criado por uma magia, aprende qual foi essa magia.\nSe, em vez disso, tocar numa criatura durante toda a conjuração, aprende quais as magias que a estão a afetar naquele momento, caso existam.","h":""},{"n":"Imagem Silenciosa","l":1,"s":"Ilusão","c":["Bardo","Feiticeiro","Mago"],"t":"1 ação","r":"60 pés (18 metros)","d":"Até 10 minutos","k":"V, S, M (Um pouco de lã)","cc":true,"rt":false,"x":"Criar a imagem de um objeto, criatura ou outro fenómeno visível que não seja maior do que um cubo de 15 pés (4,5 metros). A imagem aparece num local dentro do alcance e dura durante a duração da magia. A imagem é puramente visual; não é acompanhada por som, cheiro ou outros efeitos sensoriais.\nPodes usar a tua ação para fazer a imagem deslocar-se para qualquer local dentro do alcance. À medida que a imagem muda de localização, podes alterar a sua aparência para que os seus movimentos pareçam naturais. Por exemplo, se criares a imagem de uma criatura e a moveres, podes alterar a imagem para que pareça estar a caminhar.\nA interação física com a imagem revela que se trata de uma ilusão, pois os objetos podem atravessá-la. Uma criatura que use a sua ação para examinar a imagem pode determinar que se trata de uma ilusão através de um teste bem-sucedido de Inteligência (Investigação) contra a CD das tuas magias. Se uma criatura perceber a verdadeira natureza da ilusão, consegue ver através da imagem.","h":""},{"n":"Infligir Ferimentos","l":1,"s":"Necromancia","c":["Clérigo"],"t":"1 ação","r":"Toque","d":"Instantânea","k":"V, S","cc":false,"rt":false,"x":"Faça um ataque mágico corpo a corpo contra uma criatura ao seu alcance. Se acertar, o alvo sofre 3d10 de dano necrótico.","h":"Quando conjura esta magia usando um espaço de magia de 2º nível ou superior, o dano aumenta em 1d10 por cada nível do espaço acima do 1º."},{"n":"Leque Cromático","l":1,"s":"Ilusão","c":["Feiticeiro","Mago"],"t":"1 ação","r":"Pessoal","d":"1 rodada","k":"V, S, M (Uma pitada de pó ou areia de cor vermelha, amarela e azul)","cc":false,"rt":false,"x":"Uma matriz deslumbrante de luz colorida e cintilante salta da sua mão. Role 6d10; o total é a quantidade de pontos de vida de criaturas que esta magia pode afetar. Criaturas num cone de 15 pés (4,5 metros) originando em si são afetadas por ordem crescente dos seus pontos de vida atuais (ignorando criaturas inconscientes e criaturas que não conseguem ver).\nComeçando com a criatura que tem menos pontos de vida atuais, cada criatura afetada por esta magia fica cega até a magia terminar. Subtraia os pontos de vida de cada criatura ao total antes de passar para a criatura com o próximo valor mais baixo de pontos de vida. Os pontos de vida de uma criatura devem ser iguais ou inferiores ao total restante para que essa criatura seja afetada.","h":"Quando conjura esta magia usando um espaço de magia de 2º nível ou superior, role 2d10 adicionais para cada nível do espaço acima do 1º."},{"n":"Mãos Flamejantes","l":1,"s":"Evocação","c":["Feiticeiro","Mago"],"t":"1 ação","r":"Pessoal","d":"Instantânea","k":"V, S","cc":false,"rt":false,"x":"Ao segurar as mãos com os polegares a tocar e os dedos abertos, um lençol fino de chamas dispara das pontas dos seus dedos estendidos. Cada criatura num cone de 15 pés (4,5 metros) deve fazer um teste de resistência de Destreza. Uma criatura sofre 3d6 de dano de fogo num teste falhado, ou metade do dano num teste bem-sucedido.\nO fogo incendeia quaisquer objetos inflamáveis na área que não estejam a ser vestidos ou carregados.","h":"Quando conjura esta magia usando um espaço de magia de 2º nível ou superior, o dano aumenta em 1d6 para cada nível do espaço acima do 1º."},{"n":"Marca do Caçador","l":1,"s":"Adivinhação","c":["Paladino","Patrulheiro"],"t":"1 ação bônus","r":"90 pés (27,4 metros)","d":"Até 1 hora","k":"V","cc":true,"rt":false,"x":"Escolhe uma criatura que consiga ver dentro do alcance e marca-a misticamente como a sua presa. Até a magia terminar, causa 1d6 de dano adicional ao alvo sempre que o atingir com um ataque com arma, e tem vantagem em qualquer teste de Sabedoria (Perceção) ou Sabedoria (Sobrevivência) que faça para o encontrar. Se o alvo for reduzido a 0 pontos de vida antes de esta magia terminar, pode usar uma ação bónus num dos seus turnos subsequentes para marcar uma nova criatura.","h":""},{"n":"Mísseis Mágicos","l":1,"s":"Evocação","c":["Feiticeiro","Mago"],"t":"1 ação","r":"120 pés (36,6 metros)","d":"Instantânea","k":"V, S","cc":false,"rt":false,"x":"Cria três dardos brilhantes de força mágica. Cada dardo atinge uma criatura à sua escolha que consiga ver dentro do alcance. Um dardo causa 1d4 + 1 de dano de força ao alvo. Todos os dardos atingem simultaneamente e pode direcioná-los para atingir uma única criatura ou várias.","h":"Quando conjura esta magia usando um espaço de magia de 2.º nível ou superior, a magia cria mais um dardo por cada nível do espaço acima do 1.º."},{"n":"Nuvem de Névoa","l":1,"s":"Conjuração","c":["Druida","Patrulheiro","Feiticeiro","Mago"],"t":"1 ação","r":"36 metros","d":"Até 1 hora","k":"V, S","cc":true,"rt":false,"x":"Você cria uma esfera de névoa com 6 metros de raio centrada em um ponto dentro do alcance. A esfera se espalha ao virar esquinas, e sua área é fortemente obscurecida. Ela dura pela duração ou até que um vento de velocidade moderada ou superior (pelo menos 16 quilômetros por hora) a dissipe.","h":"Quando você conjura esta magia usando um espaço de magia de 2º nível ou superior, o raio da névoa aumenta em 6 metros para cada nível do espaço acima do 1º."},{"n":"Onda Trovejante","l":1,"s":"Evocação","c":["Bardo","Druida","Feiticeiro","Mago"],"t":"1 ação","r":"Pessoal","d":"Instantânea","k":"V, S","cc":false,"rt":false,"x":"Uma onda de força trovejante irrompe de ti. Cada criatura num cubo de 15 pés (4,5 metros) com origem em ti tem de realizar uma salvaguarda de Constituição. Se falhar, sofre 2d8 de dano trovejante e é empurrada 10 pés (3 metros) para longe de ti. Se for bem-sucedida, sofre metade do dano e não é empurrada.\nAlém disso, objetos soltos que estejam completamente dentro da área de efeito são automaticamente empurrados 10 pés (3 metros) para longe de ti pelo efeito da magia, que emite um estrondo trovejante audível a até 300 pés (90 metros).","h":"Quando conjuras esta magia usando um espaço de magia de 2.º nível ou superior, o dano aumenta em 1d8 por cada nível do espaço acima do 1.º."},{"n":"Palavra Curativa","l":1,"s":"Evocação","c":["Bardo","Clérigo","Druida"],"t":"1 ação bônus","r":"18 metros","d":"Instantânea","k":"V","cc":false,"rt":false,"x":"Uma criatura de sua escolha que você possa ver dentro do alcance recupera pontos de vida igual a 1d4 + seu modificador de habilidade de conjuração. Esta magia não tem efeito em mortos-vivos ou constructos.","h":"Quando você conjura esta magia usando um espaço de magia de 2º nível ou superior, a cura aumenta em 1d4 para cada nível do espaço acima do 1º."},{"n":"Passo Longo","l":1,"s":"Transmutação","c":["Bardo","Druida","Patrulheiro","Mago"],"t":"1 ação","r":"Toque","d":"1 hora","k":"V, S, M (Uma pitada de terra)","cc":false,"rt":false,"x":"Toca numa criatura. A velocidade do alvo aumenta em 10 pés (3 metros) até a magia terminar.","h":"Quando conjura esta magia usando um espaço de magia de 2.º nível ou superior, pode escolher uma criatura adicional por cada nível do espaço acima do 1.º."},{"n":"Perdição","l":1,"s":"Encantamento","c":["Bardo","Clérigo"],"t":"1 ação","r":"30 pés (9 metros)","d":"Até 1 minuto","k":"V, S, M (Uma gota de sangue)","cc":true,"rt":false,"x":"Até três criaturas à sua escolha que possa ver dentro do alcance devem fazer testes de resistência de Carisma. Sempre que um alvo que falhe este teste de resistência fizer uma rolagem de ataque ou um teste de resistência antes da magia terminar, o alvo deve rolar um d4 e subtrair o número rolado à rolagem de ataque ou teste de resistência.","h":"Quando conjura esta magia usando um espaço de magia de 2º nível ou superior, pode ter como alvo uma criatura adicional para cada nível do espaço acima do 1º."},{"n":"Proteção contra o Bem e o Mal","l":1,"s":"Abjuração","c":["Clérigo","Paladino","Bruxo","Mago"],"t":"1 ação","r":"Toque","d":"Até 10 minutos","k":"V, S, M (Água benta ou prata e ferro em pó, que a magia consome)","cc":true,"rt":false,"x":"Até a magia terminar, uma criatura voluntária que toque fica protegida contra determinados tipos de criaturas: aberrações, celestiais, elementais, fadas, corruptores e mortos-vivos.\nA proteção concede vários benefícios. As criaturas desses tipos têm desvantagem nas jogadas de ataque contra o alvo. O alvo também não pode ser enfeitiçado, amedrontado ou possuído por elas. Se o alvo já estiver enfeitiçado, amedrontado ou possuído por uma dessas criaturas, tem vantagem em qualquer novo teste de resistência contra o efeito relevante.","h":""},{"n":"Purificar Comida e Bebida","l":1,"s":"Transmutação","c":["Clérigo","Druida","Paladino"],"t":"1 ação","r":"10 pés (3 metros)","d":"Instantânea","k":"V, S","cc":false,"rt":true,"x":"Toda a comida e bebida não mágicas numa esfera com 5 pés (1,5 metros) de raio, centrada num ponto à sua escolha dentro do alcance, é purificada e fica livre de veneno e doenças.","h":""},{"n":"Queda Suave","l":1,"s":"Transmutação","c":["Bardo","Feiticeiro","Mago"],"t":"1 reação","r":"60 pés (18 metros)","d":"1 minuto","k":"V, M (Uma pequena pena ou um pedaço de plumagem)","cc":false,"rt":false,"x":"Escolha até cinco criaturas a cair dentro do alcance. A taxa de descida de uma criatura a cair abranda para 60 pés (18 metros) por ronda até a magia terminar. Se a criatura aterrar antes da magia terminar, não sofre dano de queda e pode aterrar de pé, e a magia termina para essa criatura.","h":""},{"n":"Raio Guiador","l":1,"s":"Evocação","c":["Clérigo"],"t":"1 ação","r":"36 metros","d":"1 rodada","k":"V, S","cc":false,"rt":false,"x":"Um flash de luz rasga em direção a uma criatura à sua escolha dentro do alcance. Faça um ataque à distância com magia contra o alvo. Num acerto, o alvo sofre 4d6 de dano radiante e o próximo ataque feito contra esse alvo antes do final do seu próximo turno tem vantagem, graças a luz mística brilhando no alvo até lá.","h":"Quando você conjurar esta magia usando um espaço de magia de 2º nível ou superior, o dano aumenta em 1d6 para cada nível do espaço acima do 1º."},{"n":"Recuo Apressado","l":1,"s":"Transmutação","c":["Feiticeiro","Bruxo","Mago"],"t":"1 ação bônus","r":"Pessoal","d":"Até 10 minutos","k":"V, S","cc":true,"rt":false,"x":"Esta magia permite-lhe mover-se a um ritmo incrível. Quando conjura esta magia, e depois como uma ação bónus em cada um dos seus turnos até a magia terminar, pode tomar a ação de Disparada.","h":""},{"n":"Repreensão Infernal","l":1,"s":"Evocação","c":["Bruxo"],"t":"1 reação","r":"18 metros","d":"Instantânea","k":"V, S","cc":false,"rt":false,"x":"Você aponta o dedo, e a criatura que acabou de te causar dano é momentaneamente envolta em chamas infernais. A criatura deve realizar um teste de resistência de Destreza. Ela sofre 2d10 de dano de fogo se falhar na resistência ou metade disso se for bem-sucedida.","h":"Quando você conjurar esta magia usando um espaço de magia de 2º nível ou superior, o dano aumenta em 1d10 para cada nível do espaço acima do 1º."},{"n":"Riso Histérico","l":1,"s":"Encantamento","c":["Bardo","Mago"],"t":"1 ação","r":"9 metros","d":"1 minuto","k":"V, S, M (Aquelas tortinhas e uma pena)","cc":true,"rt":false,"x":"Uma criatura de sua escolha no alcance visual e que você puder ver, começa a achar tudo engraçadíssimo e começa a ter crises de riso se esta magia a afetar. O alvo deve ser bem-sucedido em um teste de resistência de Sabedoria ou fica caído de tanto rir, caindo prostrado na duração da magia. Uma criatura com uma pontuação de Inteligência 4 ou menor não é afetada.\nEm cada turno do alvo, o alvo pode fazer um novo teste de resistência se no final do turno dele. Vantagem neste teste de resistência é concedida se for desencadeada por dano. Se ele for bem sucedido na resistência a magia acaba.","h":""},{"n":"Salto","l":1,"s":"Transmutação","c":["Druida","Patrulheiro","Feiticeiro","Mago"],"t":"1 ação","r":"Toque","d":"1 minuto","k":"V, S, M (Uma perna traseira de gafanhoto)","cc":false,"rt":false,"x":"Toca numa criatura. A distância de salto da criatura é triplicada até a magia terminar.","h":""},{"n":"Santuário","l":1,"s":"Abjuração","c":["Clérigo"],"t":"1 ação bônus","r":"30 pés (9 metros)","d":"1 minuto","k":"V, S, M (Um pequeno espelho de prata)","cc":false,"rt":false,"x":"Proteges uma criatura dentro do alcance contra ataques. Até a magia terminar, qualquer criatura que escolha a criatura protegida como alvo de um ataque ou de uma magia nociva tem primeiro de realizar uma salvaguarda de Sabedoria. Se falhar, a criatura tem de escolher um novo alvo ou perder o ataque ou a magia. Esta magia não protege a criatura contra efeitos de área, como a explosão de uma bola de fogo.\nSe a criatura protegida realizar um ataque ou conjurar uma magia que afete uma criatura inimiga, esta magia termina.","h":""},{"n":"Servo Invisível","l":1,"s":"Conjuração","c":["Bardo","Bruxo","Mago"],"t":"1 ação","r":"60 pés (18 metros)","d":"1 hora","k":"V, S, M (Um pedaço de cordel e um pequeno pedaço de madeira)","cc":false,"rt":true,"x":"Esta magia cria uma força invisível, sem mente e sem forma, que executa tarefas simples sob o teu comando até a magia terminar. O servo surge num espaço desocupado no chão dentro do alcance. Tem CA 10, 1 ponto de vida e Força 2, e não pode atacar. Se os seus pontos de vida forem reduzidos a 0, a magia termina.\nUma vez em cada um dos teus turnos, como ação bónus, podes comandar mentalmente o servo para se deslocar até 15 pés (4,5 metros) e interagir com um objeto. O servo pode executar tarefas simples que um criado humano conseguiria realizar, como ir buscar objetos, limpar, remendar, dobrar roupas, acender fogueiras, servir comida e verter líquidos. Depois de receber uma ordem, o servo executa a tarefa da melhor forma possível até a concluir e, em seguida, espera pela tua próxima ordem.\nSe ordenares ao servo que execute uma tarefa que o afaste mais de 60 pés (18 metros) de ti, a magia termina.","h":""},{"n":"Sono","l":1,"s":"Encantamento","c":["Bardo","Feiticeiro","Mago"],"t":"1 ação","r":"90 pés (27 metros)","d":"1 minuto","k":"V, S, M (Uma pitada de areia fina, pétalas de rosa ou um grilo)","cc":false,"rt":false,"x":"Esta magia envia criaturas para um sono mágico. Lança 5d8; o total corresponde à quantidade de pontos de vida de criaturas que a magia pode afetar. As criaturas a até 20 pés (6 metros) de um ponto à tua escolha dentro do alcance são afetadas por ordem crescente dos seus pontos de vida atuais (ignorando criaturas inconscientes).\nComeçando pela criatura com menos pontos de vida atuais, cada criatura afetada por esta magia fica inconsciente até a magia terminar, até a criatura adormecida sofrer dano ou até alguém usar uma ação para a sacudir ou esbofetear e a acordar. Subtrai os pontos de vida de cada criatura do total antes de passar à criatura seguinte com menos pontos de vida. Os pontos de vida de uma criatura têm de ser iguais ou inferiores ao total restante para que ela seja afetada.\nMortos-vivos e criaturas imunes à condição enfeitiçado não são afetados por esta magia.","h":"Quando conjuras esta magia usando um espaço de magia de 2.º nível ou superior, lanças mais 2d8 por cada nível do espaço acima do 1.º."},{"n":"Acalmar Emoções","l":2,"s":"Encantamento","c":["Bardo","Clérigo"],"t":"1 ação","r":"60 pés (18 metros)","d":"Até 1 minuto","k":"V, S","cc":true,"rt":false,"x":"Tenta suprimir emoções fortes num grupo de pessoas. Cada humanoide numa esfera com 20 pés (6 metros) de raio centrada num ponto à sua escolha dentro do alcance deve fazer um teste de resistência de Carisma; uma criatura pode escolher falhar este teste de resistência se assim o desejar. Se uma criatura falhar o seu teste de resistência, escolha um dos seguintes dois efeitos. Pode suprimir qualquer efeito que cause que um alvo fique encantado ou assustado. Quando esta magia termina, qualquer efeito suprimido é retomado, desde que a sua duração não tenha expirado entretanto.\nEm alternativa, pode tornar um alvo indiferente sobre criaturas à sua escolha em relação às quais é hostil. Esta indiferença termina se o alvo for atacado ou magoado por uma magia ou se testemunhar qualquer dos seus amigos a ser magoado. Quando a magia termina, a criatura torna-se hostil novamente, a menos que o DM decida o contrário.","h":""},{"n":"Ajuda","l":2,"s":"Abjuração","c":["Clérigo","Paladino"],"t":"1 ação","r":"30 pés (9 metros)","d":"8 horas","k":"V, S, M (Uma pequena tira de pano branco)","cc":false,"rt":false,"x":"A sua magia fortalece os seus aliados com resistência e determinação. Escolha até três criaturas dentro do alcance. O máximo de pontos de vida e os pontos de vida atuais de cada alvo aumentam em 5 durante a duração.","h":"Quando conjura esta magia usando um espaço de magia de 3º nível ou superior, os pontos de vida de um alvo aumentam em 5 adicionais para cada nível do espaço acima do 2º."},{"n":"Alterar-se","l":2,"s":"Transmutação","c":["Feiticeiro","Mago"],"t":"1 ação","r":"Pessoal","d":"Até 1 hora","k":"V, S","cc":true,"rt":false,"x":"Assume uma forma diferente. Quando conjura a magia, escolha uma das seguintes opções, cujos efeitos duram pela duração da magia. Enquanto a magia durar, pode terminar uma opção como uma ação para ganhar os benefícios de uma diferente.\nAdaptação Aquática. Adapta o seu corpo a um ambiente aquático, brotando guelras e membranas entre os dedos. Pode respirar debaixo d'água e ganha um deslocamento de natação igual ao seu deslocamento de caminhada.\nMudar Aparência. Transforma a sua aparência. Decide como será, incluindo altura, peso, traços faciais, som da voz, comprimento do cabelo, coloração e características distintas, se houver. Pode parecer membro de outra raça, embora nenhuma das suas estatísticas mude. Não pode parecer uma criatura de tamanho diferente do seu, e a sua forma básica permanece a mesma. A qualquer momento, durante a magia, pode usar uma ação para mudar a aparência desta forma novamente.\nArmas Naturais. Cultiva garras, presas, espinhos, chifres ou outra arma natural à sua escolha. Os seus ataques desarmados causam 1d6 de dano de concussão, perfurante ou cortante, conforme apropriado, e é proficiente com os seus ataques desarmados. Finalmente, a arma natural é mágica e tem um bónus de +1 nas rolagens de ataque e dano.","h":""},{"n":"Aprimorar Habilidade","l":2,"s":"Transmutação","c":["Bardo","Clérigo","Druida","Feiticeiro"],"t":"1 ação","r":"Toque","d":"Até 1 hora","k":"V, S, M (Pelo ou uma pena de uma besta)","cc":true,"rt":false,"x":"Toca numa criatura e concede-lhe um aprimoramento mágico. Escolha um dos seguintes efeitos; o alvo ganha esse efeito até a magia terminar.\nResistência do Urso. O alvo tem vantagem em testes de Constituição. Ganha também 2d6 pontos de vida temporários, que são perdidos quando a magia termina.\nForça do Touro. O alvo tem vantagem em testes de Força, e a sua capacidade de carga duplica.\nGraça do Gato. O alvo tem vantagem em testes de Destreza. Também não sofre dano de queda de 20 pés (6 metros) ou menos se não estiver incapacitado.\nEsplendor da Águia. O alvo tem vantagem em testes de Carisma.\nAstúcia da Raposa. O alvo tem vantagem em testes de Inteligência.\nSabedoria da Coruja. O alvo tem vantagem em testes de Sabedoria.","h":"Quando conjura esta magia usando um espaço de magia de 3º nível ou superior, pode ter como alvo uma criatura adicional para cada nível do espaço acima do 2º."},{"n":"Arma Espiritual","l":2,"s":"Evocação","c":["Clérigo"],"t":"1 ação bônus","r":"60 pés (18 metros)","d":"1 minuto","k":"V, S","cc":false,"rt":false,"x":"Crias uma arma espectral flutuante dentro do alcance, que permanece durante a duração ou até conjurares esta magia novamente. Quando conjuras a magia, podes realizar um ataque mágico corpo a corpo contra uma criatura a até 5 pés (1,5 metros) da arma. Se acertares, o alvo sofre dano de energia igual a 1d8 + o teu modificador do atributo usado para conjurar magias.\nComo ação bónus no teu turno, podes deslocar a arma até 20 pés (6 metros) e repetir o ataque contra uma criatura a até 5 pés (1,5 metros) dela.\nA arma pode assumir a forma que escolheres. Os clérigos de divindades associadas a uma arma específica (como São Cuthbert, conhecido pela sua maça, e Thor, pelo seu martelo) fazem com que o efeito desta magia se assemelhe a essa arma.","h":"Quando conjuras esta magia usando um espaço de magia de 3.º nível ou superior, o dano aumenta em 1d8 por cada dois níveis do espaço acima do 2.º."},{"n":"Arma Mágica","l":2,"s":"Transmutação","c":["Paladino","Mago"],"t":"1 ação bônus","r":"Toque","d":"Até 1 hora","k":"V, S","cc":true,"rt":false,"x":"Toca numa arma não mágica. Até a magia terminar, essa arma torna-se uma arma mágica com um bónus de +1 nas jogadas de ataque e de dano.","h":"Quando conjura esta magia usando um espaço de magia de 4.º nível ou superior, o bónus aumenta para +2. Quando usa um espaço de magia de 6.º nível ou superior, o bónus aumenta para +3."},{"n":"Arrombar","l":2,"s":"Transmutação","c":["Bardo","Feiticeiro","Mago"],"t":"1 ação","r":"60 pés (18,3 metros)","d":"Instantânea","k":"V","cc":false,"rt":false,"x":"Escolha um objeto que consiga ver dentro do alcance. O objeto pode ser uma porta, uma caixa, um baú, um conjunto de algemas, um cadeado ou outro objeto que contenha um meio mundano ou mágico de impedir o acesso.\nUm alvo fechado por uma fechadura mundana, preso ou barrado fica destrancado, solto ou desimpedido. Se o objeto tiver várias fechaduras, apenas uma delas é destrancada.\nSe escolher um alvo fechado por uma fechadura arcana, essa magia é suprimida durante 10 minutos, período durante o qual o alvo pode ser aberto e fechado normalmente.\nQuando conjura a magia, um estrondo alto, audível a uma distância de até 300 pés (90 metros), emana do objeto-alvo.","h":""},{"n":"Augúrio","l":2,"s":"Adivinhação","c":["Clérigo"],"t":"1 minuto","r":"Pessoal","d":"Instantânea","k":"V, S, M (Bastões marcados de forma especial, ossos ou fichas semelhantes no valor de pelo menos 25 po)","cc":false,"rt":true,"x":"Ao atirar bastões incrustados de pedras preciosas, rolar ossos de dragão, dispor cartas ornamentadas ou empregar alguma outra ferramenta de adivinhação, recebe um presságio de uma entidade de outro mundo sobre os resultados de um curso de ação específico que planeia tomar nos próximos 30 minutos. O DM escolhe de entre os seguintes presságios possíveis:\n- Bem, para bons resultados\n- Mal, para maus resultados\n- Bem e mal, para resultados simultaneamente bons e maus\n- Nada, para resultados que não são particularmente bons nem maus\nA magia não tem em conta quaisquer circunstâncias possíveis que possam alterar o resultado, como a conjuração de magias adicionais ou a perda ou ganho de um companheiro.\nSe conjurar a magia duas ou mais vezes antes de completar o seu próximo descanso longo, há uma probabilidade cumulativa de 25 por cento por cada conjuração após a primeira de obter uma leitura aleatória. O DM faz esta rolagem em segredo.","h":""},{"n":"Aumentar/Reduzir","l":2,"s":"Transmutação","c":["Feiticeiro","Mago"],"t":"1 ação","r":"30 pés (9 metros)","d":"Até 1 minuto","k":"V, S, M (Uma pitada de ferro em pó)","cc":true,"rt":false,"x":"Aumenta ou reduz o tamanho de uma criatura ou objeto que possa ver e que esteja dentro do alcance pela duração da magia. Escolha uma criatura ou objeto que não esteja vestido ou carregado. Se o alvo não for consentidor, pode fazer um teste de resistência de Constituição. Se for bem-sucedido, a magia não tem efeito.\nSe o alvo for uma criatura, tudo o que ela veste e carrega muda de tamanho com ela. Qualquer item largado pela criatura afetada regressa ao seu tamanho normal.\nAumentar. O alvo duplica em todas as dimensões e o seu peso é multiplicado por oito. Isto aumenta o tamanho de uma classe de M para G, por exemplo. Se não houver espaço suficiente na sala para duplicar o tamanho do alvo, a criatura ou objeto atinge o tamanho máximo possível no espaço disponível. Até ao fim da magia, o alvo tem também vantagem em testes de Força e testes de resistência de Força. As armas do alvo também crescem. Enquanto estas armas estiverem aumentadas, os ataques do alvo causam 1d4 de dano adicional.\nReduzir. O tamanho do alvo é reduzido para metade em todas as dimensões, e o seu peso é dividido por oito. Esta redução diminui o tamanho de uma classe de M para P, por exemplo. Até ao fim da magia, o alvo tem desvantagem em testes de Força e testes de resistência de Força. As armas do alvo diminuem também. Enquanto estas armas estiverem reduzidas, os ataques do alvo causam menos 1d4 de dano (mínimo de 1 ponto de dano).","h":""},{"n":"Aura Mágica do Arcanista","l":2,"s":"Ilusão","c":["Mago"],"t":"1 ação","r":"Toque","d":"24 horas","k":"V, S, M (Um pequeno quadrado de seda)","cc":false,"rt":false,"x":"Coloca uma ilusão numa criatura ou objeto que toque para que magias de adivinhação revelem informações falsas sobre ele. O alvo pode ser uma criatura voluntária ou um objeto que não esteja a ser carregado ou vestido por outra criatura.\nQuando conjura a magia, escolha um ou ambos dos seguintes efeitos. O efeito dura pela duração da magia. Se conjurar esta magia na mesma criatura ou objeto todos os dias durante 30 dias, colocando o mesmo efeito nela de cada vez, a ilusão dura até ser dissipada.\nFalsa Aura. Muda a forma como o alvo aparece perante magias e efeitos mágicos, como detetar magia, que detetam auras mágicas. Pode fazer um objeto não mágico parecer mágico, um objeto mágico parecer não mágico, ou mudar a aura mágica do objeto para que pareça pertencer a uma escola de magia específica à sua escolha. Quando usa este efeito num objeto, pode tornar a falsa magia aparente para qualquer criatura que manuseie o item.\nMáscara. Muda a forma como o alvo aparece perante magias e efeitos mágicos que detetam tipos de criaturas, como o Sentido Divino de um paladino ou o gatilho de uma magia símbolo. Escolhe um tipo de criatura e outras magias e efeitos mágicos tratam o alvo como se fosse uma criatura desse tipo ou desse alinhamento.","h":""},{"n":"Boca Mágica","l":2,"s":"Ilusão","c":["Bardo","Mago"],"t":"1 minuto","r":"30 pés (9,1 metros)","d":"Até ser dissipada","k":"V, S, M (Um favo de mel e pó de jade no valor de pelo menos 10 po, que a magia consome)","cc":false,"rt":true,"x":"Implanta uma mensagem num objeto dentro do alcance da magia. A mensagem é verbalizada quando as condições desencadeadoras são satisfeitas. Escolha um objeto que consiga ver e que não esteja a ser vestido ou transportado por outra criatura. Em seguida, diga a mensagem, que não deve exceder 25 palavras, embora a sua enunciação possa demorar até 10 minutos. Por fim, estabeleça as circunstâncias que desencadearão a magia para transmitir a sua mensagem.\nQuando estas condições forem satisfeitas, uma boca mágica aparece no objeto e articula a mensagem, imitando a sua voz e o mesmo tom utilizado quando implantou a mensagem. Se o objeto escolhido tiver uma boca, ou algo semelhante, como a boca de uma estátua, a boca mágica ganha vida nesse momento, criando a ilusão de que as palavras vêm da boca do objeto.\nQuando conjura esta magia, pode decidir que a magia termina depois de a mensagem ser transmitida ou que persiste e repete a mensagem sempre que as circunstâncias ocorrerem.\nA circunstância desencadeadora pode ser tão geral ou detalhada quanto desejar, embora tenha de se basear em condições visuais ou audíveis que ocorram a até 30 pés (9 metros) do objeto. Por exemplo, pode instruir a boca a falar quando qualquer criatura se aproximar a até 30 pés (9 metros) do objeto ou quando um sino de prata tocar a até 30 pés (9 metros) dele.","h":""},{"n":"Cegueira/Surdez","l":2,"s":"Necromancia","c":["Bardo","Clérigo","Feiticeiro","Mago"],"t":"1 ação","r":"30 pés (9 metros)","d":"1 minuto","k":"V","cc":false,"rt":false,"x":"Pode cegar ou ensurdecer um inimigo. Escolha uma criatura que possa ver dentro do alcance para fazer um teste de resistência de Constituição. Se falhar, o alvo fica cego ou surdo (à sua escolha) pela duração. No final de cada um dos seus turnos, o alvo pode fazer um teste de resistência de Constituição. Num sucesso, a magia termina.","h":"Quando conjura esta magia usando um espaço de magia de 3º nível ou superior, pode ter como alvo uma criatura adicional para cada nível do espaço acima do 2º."},{"n":"Chama Contínua","l":2,"s":"Evocação","c":["Clérigo","Mago"],"t":"1 ação","r":"Toque","d":"Até ser dissipada","k":"V, S, M (Pó de rubi no valor de 50 po, que a magia consome)","cc":false,"rt":false,"x":"Uma chama, equivalente em brilho a uma tocha, brota de um objeto que toque. O efeito parece-se com uma chama regular, mas não cria calor e não consome oxigénio. Uma chama contínua pode ser coberta ou escondida, mas não abafada ou apagada.","h":""},{"n":"Crescimento de Espinhos","l":2,"s":"Transmutação","c":["Druida","Patrulheiro"],"t":"1 ação","r":"150 pés (45 metros)","d":"Até 10 minutos","k":"V, S, M (Sete espinhos afiados ou sete pequenos ramos cortados em ponta)","cc":true,"rt":false,"x":"O solo num raio de 20 pés (6 metros), centrado num ponto dentro do alcance, contorce-se e faz brotar espinhos e silvas rígidos. A área torna-se terreno difícil durante a duração. Quando uma criatura se desloca para dentro ou através da área, sofre 2d4 de dano perfurante por cada 5 pés (1,5 metros) que percorre.\nA transformação do terreno é camuflada para parecer natural. Qualquer criatura que não veja a área quando a magia é conjurada tem de ser bem-sucedida num teste de Sabedoria (Perceção) contra a CD da tua salvaguarda de magia para reconhecer a natureza perigosa do terreno antes de entrar nele.","h":""},{"n":"Desfocar","l":2,"s":"Ilusão","c":["Feiticeiro","Mago"],"t":"1 ação","r":"Pessoal","d":"Até 1 minuto","k":"V","cc":true,"rt":false,"x":"O seu corpo fica desfocado, mudando e oscilando para todos os que o conseguem ver. Pela duração, qualquer criatura tem desvantagem nas rolagens de ataque contra si. Um atacante é imune a este efeito se não depender da visão, como com visão às cegas, ou se conseguir ver através de ilusões, como com visão verdadeira.","h":""},{"n":"Detetar Pensamentos","l":2,"s":"Adivinhação","c":["Bardo","Feiticeiro","Mago"],"t":"1 ação","r":"Pessoal","d":"Até 1 minuto","k":"V, S, M (Uma moeda de cobre)","cc":true,"rt":false,"x":"Pela duração da magia, pode ler os pensamentos de algumas criaturas. Ao conjurar a magia e como a sua ação em cada turno até a magia terminar, pode focar a sua mente numa criatura que possa ver a até 30 pés (9 metros) de si. Se a criatura escolhida tiver uma Inteligência de 3 ou inferior, ou se não falar nenhum idioma, a criatura não é afetada.\nPrimeiro lê os pensamentos de superfície da criatura, aquilo que ocupa a sua mente nesse momento. Como uma ação, pode direcionar a sua atenção para os pensamentos de outra criatura ou tentar aprofundar a sua leitura dos pensamentos da mesma criatura. Se aprofundar a sua leitura, o alvo deve fazer um teste de resistência de Sabedoria. Num fracasso, ganha acesso aos seus raciocínios, ao seu estado emocional e aos pensamentos que preocupam a sua mente num espectro mais amplo (como uma preocupação, amor ou ódio). Num sucesso, a magia termina. Em todos os casos, o alvo fica ciente de que a sua mente está sob o seu escrutínio. A menos que esteja a direcionar a sua atenção para os pensamentos de outra criatura, o alvo pode usar a sua ação no seu turno para fazer um teste de Inteligência oposto ao seu teste de Inteligência. Se vencer, a magia termina.\nPerguntas direcionadas verbalmente ao alvo guiam a sequência de pensamentos. Esta magia é especialmente eficaz durante um interrogatório.\nTambém pode usar esta magia para detetar a presença de criaturas pensantes que estejam invisíveis para si. Quando conjura esta magia, ou como uma ação pela duração, pode procurar pensamentos a até 30 pés (9 metros) de si. A magia pode ultrapassar a maioria dos obstáculos, mas é bloqueada por 2 pés (60 cm) de pedra, 2 polegadas (5 cm) de metal precioso, ou uma folha fina de chumbo. Não pode detetar uma criatura com uma Inteligência de 3 ou inferior ou que não fale nenhum idioma.\nApós detetar a presença de uma criatura desta forma, pode ler os seus pensamentos pelo resto da duração da magia conforme descrito acima, mesmo que não a consiga ver, mas apenas se ela permanecer no alcance da magia.","h":""},{"n":"Encontrar Armadilhas","l":2,"s":"Adivinhação","c":["Clérigo","Druida","Patrulheiro"],"t":"1 ação","r":"120 pés (36 metros)","d":"Instantânea","k":"V, S","cc":false,"rt":false,"x":"Sente a presença de qualquer armadilha dentro do alcance que esteja dentro da linha de visão. Uma armadilha, para o propósito desta magia, inclui qualquer coisa que infligiria um efeito súbito ou inesperado que considere prejudicial ou indesejável, que tenha sido especificamente pretendido como tal pelo seu criador. Assim, a magia sentiria uma área afetada pela magia alarme, um glifo de proteção ou uma armadilha mecânica de poço, mas não revelaria uma fraqueza natural no chão, um teto instável ou um sumidouro escondido.\nEsta magia meramente revela que uma armadilha está presente. Não aprende a localização de cada armadilha, mas aprende a natureza geral do perigo colocado por uma armadilha que sinta.","h":""},{"n":"Encontrar Montada","l":2,"s":"Conjuração","c":["Paladino"],"t":"10 minutos","r":"30 pés (9 metros)","d":"Instantânea","k":"V, S","cc":false,"rt":false,"x":"Invoca um espírito que assume a forma de uma montada invulgarmente inteligente, forte e leal, criando um vínculo duradouro com ela. Aparecendo num espaço desocupado dentro do alcance, a montada assume uma forma que escolha, como um cavalo de guerra, um pónei, um camelo, um alce ou um mastim. (O seu DM pode permitir que outros animais sejam invocados como montadas.) A montada tem as estatísticas da forma escolhida, embora seja um celestial, ser feérico ou corruptor (à sua escolha) em vez do seu tipo normal. Adicionalmente, se a sua montada tiver uma Inteligência de 5 ou menos, a sua Inteligência torna-se 6, e ela ganha a capacidade de compreender um idioma à sua escolha que você fale.\nA sua montada serve-o como montada, tanto em combate como fora dele, e tem um vínculo instintivo com ela que lhe permite lutar como uma unidade perfeita. Enquanto montado na sua montada, pode fazer com que qualquer magia que conjure que tenha apenas você como alvo também tenha como alvo a sua montada.\nQuando a montada cai para 0 pontos de vida, desaparece, não deixando nenhuma forma física. Pode também dispensar a sua montada a qualquer momento como uma ação, fazendo com que ela desapareça. Em qualquer dos casos, conjurar esta magia novamente invoca a mesma montada, restaurada ao seu máximo de pontos de vida.\nEnquanto a sua montada estiver a até 1 milha (1,6 km) de si, pode comunicar com ela telepaticamente.\nNão pode ter mais do que uma montada vinculada por esta magia de cada vez. Como uma ação, pode libertar a montada do seu vínculo a qualquer momento, fazendo com que ela desapareça.","h":""},{"n":"Escalar como Aranha","l":2,"s":"Transmutação","c":["Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"Toque","d":"Até 1 hora","k":"V, S, M (Uma gota de betume e uma aranha)","cc":true,"rt":false,"x":"Até a magia terminar, uma criatura voluntária em quem toques ganha a capacidade de se deslocar para cima, para baixo e ao longo de superfícies verticais, bem como de se mover de cabeça para baixo pelos tetos, mantendo as mãos livres. O alvo também ganha um deslocamento de escalada igual ao seu deslocamento de caminhada.","h":""},{"n":"Escuridão","l":2,"s":"Evocação","c":["Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"60 pés (18 metros)","d":"Até 10 minutos","k":"V, M (Pelo de morcego e uma gota de pez ou um pedaço de carvão)","cc":true,"rt":false,"x":"Escuridão mágica espalha-se de um ponto à sua escolha dentro do alcance para preencher uma esfera de 15 pés (4,5 metros) de raio pela duração. A escuridão espalha-se ao virar das esquinas. Uma criatura com visão no escuro não consegue ver através desta escuridão, e luz não mágica não consegue iluminá-la.\nSe o ponto que escolher for num objeto que esteja a segurar ou num que não esteja a ser vestido ou carregado, a escuridão emana do objeto e move-se com ele. Cobrir completamente a fonte da escuridão com um objeto opaco, como uma tigela ou um elmo, bloqueia a escuridão.\nSe qualquer da área desta magia se sobrepuser com uma área de luz criada por uma magia de 2º nível ou inferior, a magia que criou a luz é dissipada.","h":""},{"n":"Esfera Flamejante","l":2,"s":"Conjuração","c":["Druida","Mago"],"t":"1 ação","r":"18 metros","d":"Até 1 minuto","k":"V, S, M (Um pouco de sebo, uma pitada de enxofre e um pouco de pó de ferro)","cc":true,"rt":false,"x":"Uma esfera de fogo de 1,5 metro de diâmetro aparece em um espaço desocupado à sua escolha dentro do alcance e dura pela duração. Qualquer criatura que terminar seu turno a até 1,5 metro da esfera deve fazer um teste de resistência de Destreza. A criatura sofre 2d6 de dano de fogo em uma falha, ou metade desse dano em um sucesso.\nComo uma ação bônus, você pode mover a esfera até 9 metros. Se você chocar a esfera contra uma criatura, ela deve fazer o teste de resistência contra o dano da esfera, e a esfera para de se mover neste turno.\nQuando você move a esfera, você pode direcioná-la sobre barreiras de até 1,5 metro de altura e fazê-la saltar sobre buracos de até 3 metros de largura. A esfera incendeia objetos inflamáveis que não estejam sendo vestidos ou carregados, e emite luz plena em um raio de 6 metros e luz penumbrosa por mais 6 metros.","h":"Quando você conjura esta magia usando um espaço de magia de 3º nível ou superior, o dano aumenta em 1d6 para cada nível do espaço acima do 2º."},{"n":"Esquentar Metal","l":2,"s":"Transmutação","c":["Bardo","Druida"],"t":"1 ação","r":"18 metros","d":"1 minuto","k":"V, S, M (Um pedaço de ferro e uma chama)","cc":true,"rt":false,"x":"Escolha um objeto manufaturado de metal, como uma arma de metal ou uma armadura de metal média ou pesada, que você possa ver dentro do alcance. Você faz com que o objeto fique incandescente. Qualquer criatura em contato físico com o objeto sofre 2d8 de dano de fogo quando você conjurar a magia. Até a magia acabar, você pode usar uma ação bônus em cada um de seus turnos para causar o dano novamente.\nSe a criatura estiver segurando ou vestindo o objeto e sofrer o dano desta magia, ela deve ter sucesso num teste de resistência de Constituição ou deixará o objeto cair se puder. Se ela não largar o objeto, ela tem desvantagem em jogadas de ataque e testes de habilidade até o início do seu próximo turno.","h":"Quando você conjurar esta magia usando um espaço de magia de 3º nível ou superior, o dano aumenta em 1d8 para cada nível do espaço acima do 2º."},{"n":"Estilhaçar","l":2,"s":"Evocação","c":["Bardo","Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"60 pés (18 metros)","d":"Instantânea","k":"V, S, M (A burst of mica)","cc":false,"rt":false,"x":"Um som intenso e ressonante, dolorosamente alto, irrompe de um ponto à tua escolha dentro do alcance. Cada criatura numa esfera com 10 pés (3 metros) de raio centrada nesse ponto tem de realizar uma salvaguarda de Constituição ou sofre 3d8 de dano trovejante. Se for bem-sucedida, sofre apenas metade do dano. Uma criatura feita de materiais inorgânicos, como pedra, cristal ou metal, realiza esta salvaguarda com desvantagem.\nUm objeto não mágico que não esteja a ser usado nem transportado também sofre dano se estiver na área da magia.","h":"Quando conjuras esta magia usando um espaço de magia de 3.º nível ou superior, o dano da magia aumenta em 1d8 por cada nível do espaço acima do 2.º."},{"n":"Fascinar","l":2,"s":"Encantamento","c":["Bardo","Bruxo"],"t":"1 ação","r":"60 pés (18 metros)","d":"Até 1 minuto","k":"V, S","cc":false,"rt":false,"x":"Tece uma sequência de palavras distrativa, fazendo com que criaturas à sua escolha que possa ver dentro do alcance e que o consigam ouvir façam um teste de resistência de Sabedoria. Qualquer criatura que não possa ser encantada é bem-sucedida neste teste de resistência automaticamente, e se você ou os seus companheiros estiverem a lutar contra uma criatura, ela tem vantagem no salvamento. Num teste falhado, o alvo tem desvantagem em testes de Sabedoria (Perceção) feitos para perceber qualquer criatura diferente de si até a magia terminar ou até o alvo deixar de o conseguir ouvir. A magia termina se ficar incapacitado ou deixar de conseguir falar.","h":""},{"n":"Golpe Marcante","l":2,"s":"Evocação","c":["Paladino"],"t":"1 ação bônus","r":"Pessoal","d":"Até 1 minuto","k":"V","cc":true,"rt":false,"x":"Da próxima vez que acertar uma criatura com um ataque de arma antes que esta magia termine, a arma brilha com radiância astral ao atacar. O ataque causa 2d6 de dano radiante extra ao alvo, que se torna visível se estiver invisível, e o alvo emite luz fraca num raio de 5 pés (1,5 metros) e não pode ficar invisível até a magia terminar.","h":""},{"n":"Imagem Espelhada","l":2,"s":"Ilusão","c":["Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"Pessoal","d":"1 minuto","k":"V, S","cc":false,"rt":false,"x":"Três duplicados ilusórios de si aparecem no seu espaço. Até a magia terminar, os duplicados movem-se consigo e imitam as suas ações, mudando de posição para tornar impossível determinar qual das imagens é real. Pode usar a sua ação para dissipar os duplicados ilusórios.\nSempre que uma criatura o escolher como alvo de um ataque durante a duração da magia, role 1d20 para determinar se o ataque não o atinge, mas sim um dos seus duplicados.\nSe tiver três duplicados, precisa de obter 6 ou mais no lançamento para fazer com que o ataque tenha como alvo um duplicado. Com dois duplicados, precisa de 8 ou mais. Com um duplicado, precisa de 11 ou mais.\nA CA de um duplicado é 10 + o seu modificador de Destreza. Se um ataque atingir um duplicado, este é destruído. Um duplicado só pode ser destruído por um ataque que o atinja. Ignora todos os outros danos e efeitos. A magia termina quando os três duplicados forem destruídos.\nUma criatura não é afetada por esta magia se não conseguir ver, se depender de sentidos diferentes da visão, como visão às cegas, ou se conseguir perceber as ilusões como falsas, como acontece com visão verdadeira.","h":""},{"n":"Imobilizar Pessoa","l":2,"s":"Encantamento","c":["Bardo","Clérigo","Druida","Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"60 pés (18,3 metros)","d":"Até 1 minuto","k":"V, S, M (Um pequeno pedaço de ferro reto)","cc":true,"rt":false,"x":"Escolha um humanoide que consiga ver dentro do alcance. O alvo deve ser bem-sucedido num teste de resistência de Sabedoria ou ficará paralisado pela duração. No final de cada um dos seus turnos, o alvo pode fazer outro teste de resistência de Sabedoria. Se for bem-sucedido, a magia termina no alvo.","h":""},{"n":"Invisibilidade","l":2,"s":"Ilusão","c":["Bardo","Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"Toque","d":"Até 1 hora","k":"V, S, M (Uma pestana envolta em goma-arábica)","cc":true,"rt":false,"x":"Uma criatura que toque fica invisível até a magia terminar. Tudo o que o alvo estiver a vestir ou a transportar também fica invisível enquanto estiver consigo. A magia termina para um alvo que ataque ou conjure uma magia.","h":"Quando conjura esta magia usando um espaço de magia de 3º nível ou superior, pode escolher uma criatura adicional por cada nível do espaço acima do 2º."},{"n":"Lâmina Flamejante","l":2,"s":"Evocação","c":["Druida"],"t":"1 ação bônus","r":"Pessoal","d":"Até 10 minutos","k":"V, S, M (Uma folha de sumaúma)","cc":true,"rt":false,"x":"Evoca uma lâmina ardente na sua mão livre. A lâmina é semelhante em tamanho e forma a uma cimitarra, e dura pela duração. Se soltar a lâmina, ela desaparece, mas pode voltar a evocá-la como uma ação bónus.\nPode usar a sua ação para fazer um ataque de magia corpo-a-corpo com a lâmina ardente. Num acerto, o alvo sofre 3d6 de dano de fogo.\nA lâmina flamejante emite luz brilhante num raio de 10 pés (3 metros) e luz fraca por mais 10 pés.","h":"Quando conjura esta magia usando um espaço de magia de 4º nível ou superior, o dano aumenta em 1d6 para cada dois níveis do espaço acima do 2º."},{"n":"Levitação","l":2,"s":"Transmutação","c":["Feiticeiro","Mago"],"t":"1 ação","r":"60 pés (18,3 metros)","d":"Até 10 minutos","k":"V, S, M (Uma pequena argola de couro ou um pedaço de fio de ouro dobrado em forma de taça, com uma haste comprida numa das extremidades)","cc":true,"rt":false,"x":"Uma criatura ou objeto à sua escolha que consiga ver dentro do alcance ergue-se verticalmente até 20 pés (6 metros) e permanece suspenso durante toda a duração. A magia pode fazer levitar um alvo que pese até 500 libras (227 quilogramas). Uma criatura involuntária que seja bem-sucedida num teste de resistência de Constituição não é afetada.\nO alvo só pode mover-se empurrando ou puxando um objeto ou superfície fixa ao seu alcance (como uma parede ou um teto), o que lhe permite mover-se como se estivesse a trepar. Pode alterar a altitude do alvo até 20 pés (6 metros) em qualquer direção no seu turno. Se for o alvo, pode mover-se para cima ou para baixo como parte do seu deslocamento. Caso contrário, pode usar a sua ação para mover o alvo, que deve permanecer dentro do alcance da magia.\nQuando a magia termina, o alvo flutua suavemente até ao chão, caso ainda esteja no ar.","h":""},{"n":"Localizar Animais ou Plantas","l":2,"s":"Adivinhação","c":["Bardo","Druida","Patrulheiro"],"t":"1 ação","r":"Pessoal","d":"Instantânea","k":"V, S, M (Um pouco de pelo de um cão de caça)","cc":false,"rt":true,"x":"Descreva ou nomeie um tipo específico de besta ou planta. Concentrando-se na voz da natureza que o rodeia, aprende a direção e a distância até à criatura ou planta mais próxima desse tipo num raio de 5 milhas (8 quilómetros), caso exista alguma.","h":""},{"n":"Localizar Objeto","l":2,"s":"Adivinhação","c":["Bardo","Clérigo","Druida","Paladino","Patrulheiro","Mago"],"t":"1 ação","r":"Pessoal","d":"Até 10 minutos","k":"V, S, M (Um ramo bifurcado)","cc":true,"rt":false,"x":"Descreva ou nomeie um objeto que lhe seja familiar. Sente a direção da localização do objeto, desde que este esteja a até 1000 pés (300 metros) de si. Se o objeto estiver em movimento, conhece a direção do seu movimento.\nA magia pode localizar um objeto específico que conheça, desde que o tenha visto de perto — a até 30 pés (9 metros) — pelo menos uma vez. Em alternativa, a magia pode localizar o objeto mais próximo de um tipo específico, como uma determinada peça de vestuário, joia, peça de mobiliário, ferramenta ou arma.\nEsta magia não consegue localizar um objeto se qualquer espessura de chumbo, mesmo uma folha fina, bloquear um caminho direto entre si e o objeto.","h":""},{"n":"Mensageiro Animal","l":2,"s":"Encantamento","c":["Bardo","Druida","Patrulheiro"],"t":"1 ação","r":"30 pés (9 metros)","d":"24 horas","k":"V, S, M (Um bocado de comida)","cc":false,"rt":true,"x":"Por meio desta magia, usa um animal para entregar uma mensagem. Escolha uma besta Minúscula que possa ver dentro do alcance, como um esquilo, um gaio-azul ou um morcego. Especifica um local, que deve ter visitado, e um destinatário que corresponda a uma descrição geral, como \"um homem ou mulher vestido com o uniforme da guarda da cidade\" ou \"um anão ruivo usando um chapéu pontiagudo\". Também fala uma mensagem de até vinte e cinco palavras. A besta alvo viaja durante a duração da magia em direção ao local especificado, cobrindo cerca de 50 milhas (80 km) por 24 horas para um mensageiro voador, ou 25 milhas (40 km) para outros animais.\nQuando o mensageiro chega, entrega a sua mensagem à criatura que descreveu, replicando o som da sua voz. O mensageiro fala apenas com uma criatura que corresponda à descrição que deu. Se o mensageiro não chegar ao seu destino antes do fim da magia, a mensagem perde-se e a besta faz o seu caminho de volta para onde conjurou esta magia.","h":"Se conjurar esta magia usando um espaço de magia de 3º nível ou superior, a duração da magia aumenta em 48 horas para cada nível do espaço acima do 2º."},{"n":"Oração de Cura","l":2,"s":"Evocação","c":["Clérigo"],"t":"10 minutos","r":"30 pés (9 metros)","d":"Instantânea","k":"V","cc":false,"rt":false,"x":"Até seis criaturas à sua escolha que consiga ver dentro do alcance recuperam, cada uma, pontos de vida iguais a 2d8 + o seu modificador de atributo de conjuração. Esta magia não produz qualquer efeito em mortos-vivos ou constructos.","h":"Quando conjura esta magia usando um espaço de magia de 3.º nível ou superior, a cura aumenta em 1d8 por cada nível do espaço acima do 2.º."},{"n":"Passar sem Deixar Rasto","l":2,"s":"Abjuração","c":["Druida","Patrulheiro"],"t":"1 ação","r":"Pessoal","d":"Até 1 hora","k":"V, S, M (Cinzas de uma folha de visco queimada e um ramo de abeto)","cc":true,"rt":false,"x":"Um véu de sombras e silêncio irradia de si, ocultando-o a si e aos seus companheiros da deteção. Durante a duração, cada criatura à sua escolha num raio de 30 pés (9 metros) de si (incluindo-o) recebe um bónus de +10 nos testes de Destreza (Furtividade) e não pode ser rastreada, exceto por meios mágicos. Uma criatura que receba este bónus não deixa pegadas nem quaisquer outros vestígios da sua passagem.","h":""},{"n":"Passo Nebuloso","l":2,"s":"Conjuração","c":["Feiticeiro","Bruxo","Mago"],"t":"1 ação bônus","r":"Pessoal","d":"Instantânea","k":"V","cc":false,"rt":false,"x":"Brevemente envolto em névoa prateada, teletransporta-se até 30 pés (9 metros) para um espaço desocupado que consiga ver.","h":""},{"n":"Pele de Casca","l":2,"s":"Transmutação","c":["Druida","Patrulheiro"],"t":"1 ação","r":"Toque","d":"Até 1 hora","k":"V, S, M (Um punhado de casca de carvalho)","cc":true,"rt":false,"x":"Toca numa criatura voluntária. Até a magia terminar, a pele do alvo tem uma aparência áspera e semelhante a casca de árvore, e a CA do alvo não pode ser inferior a 16, independentemente do tipo de armadura que estiver a usar.","h":""},{"n":"Proteção contra Veneno","l":2,"s":"Abjuração","c":["Clérigo","Druida","Paladino","Patrulheiro"],"t":"1 ação","r":"Toque","d":"1 hora","k":"V, S","cc":false,"rt":false,"x":"Toca numa criatura. Se estiver envenenada, neutraliza o veneno. Se mais do que um veneno afetar o alvo, neutraliza um veneno cuja presença conheça ou neutraliza um deles aleatoriamente.\nDurante a duração, o alvo tem vantagem nos testes de resistência para evitar ficar envenenado e recebe resistência a dano venenoso.","h":""},{"n":"Raio Abrasador","l":2,"s":"Evocação","c":["Feiticeiro","Mago"],"t":"1 ação","r":"120 pés (36 metros)","d":"Instantânea","k":"V, S","cc":false,"rt":false,"x":"Criar três raios de fogo e lançá-los contra alvos dentro do alcance da magia. Podes direcioná-los para um ou vários alvos.\nRealiza um ataque mágico à distância para cada raio. Se acertar, o alvo sofre 2d6 de dano de fogo.","h":"Quando conjuras esta magia usando um espaço de magia de 3.º nível ou superior, crias um raio adicional por cada nível do espaço acima do 2.º."},{"n":"Raio de Enfraquecimento","l":2,"s":"Necromancia","c":["Bruxo","Mago"],"t":"1 ação","r":"60 pés (18 metros)","d":"Até 1 minuto","k":"V, S","cc":true,"rt":false,"x":"Um raio negro de energia debilitante dispara do seu dedo em direção a uma criatura dentro do alcance. Realize um ataque mágico à distância contra o alvo. Se acertar, o alvo causa apenas metade do dano com ataques de arma que usem Força até a magia terminar.\nNo final de cada um dos turnos do alvo, este pode realizar um teste de resistência de Constituição contra a magia. Se for bem-sucedido, a magia termina.","h":""},{"n":"Raio Lunar","l":2,"s":"Evocação","c":["Druida"],"t":"1 ação","r":"120 pés (36 metros)","d":"Até 1 minuto","k":"V, S, M (Várias sementes de qualquer planta lunar e um pedaço de feldspato opalescente)","cc":true,"rt":false,"x":"Um raio prateado de luz pálida incide num cilindro com um raio de 5 pés (1,5 metros) e 40 pés (12 metros) de altura, centrado num ponto dentro do alcance. Até a magia terminar, uma luz ténue preenche o cilindro.\nQuando uma criatura entra pela primeira vez numa área da magia durante um turno, ou começa o seu turno nela, é envolvida por chamas fantasmagóricas que provocam uma dor lancinante e tem de realizar um teste de resistência de Constituição. Sofre 2d10 de dano radiante se falhar, ou metade desse dano se for bem-sucedida.\nUm metamorfo realiza o teste de resistência com desvantagem. Se falhar, também regressa imediatamente à sua forma original e não pode assumir outra forma até sair da luz da magia.\nEm cada um dos seus turnos após conjurar esta magia, pode usar uma ação para mover o raio até 60 pés (18 metros) em qualquer direção.","h":"Quando conjura esta magia usando um espaço de magia de 3.º nível ou superior, o dano aumenta em 1d10 por cada nível do espaço acima do 2.º."},{"n":"Rajada de Vento","l":2,"s":"Evocação","c":["Druida","Feiticeiro","Mago"],"t":"1 ação","r":"Pessoal","d":"1 minuto","k":"V, S, M (A semente de uma planta leguminosa)","cc":true,"rt":false,"x":"Uma linha de vento forte, medindo 18 metros de comprimento e 3 metros de largura propaga-se de você em uma direção de sua escolha, enquanto a magia durar. Cada criatura que começar o turno nela, deve ser bem-sucedida num teste de resistência de Força, ou será empurrada 4,5 metros na direção do vento para longe de você. Qualquer criatura na linha que gaste seu deslocamento para se aproximar de você, deve gastar 3 metros de deslocamento para cada 1,5 metro que se mover.\nA rajada de vento dispersa gases ou vapores e apaga velas, tochas e outras chamas desprotegidas e parecidas na área. O vento apaga ou balança descontroladamente chamas protegidas, como as de lanternas, com 50 por cento de chance de apagá-las.\nComo uma ação bônus em cada um dos seus turnos antes da magia acabar, você pode mudar a direção em que o vento sopra.","h":""},{"n":"Repouso Tranquilo","l":2,"s":"Necromancia","c":["Clérigo","Mago"],"t":"1 ação","r":"Toque","d":"10 dias","k":"V, S, M (Uma pitada de sal e uma peça de cobre colocada sobre cada um dos olhos do cadáver, que devem permanecer lá pela duração)","cc":false,"rt":true,"x":"Você toca um cadáver ou outros restos mortais. Pela duração, o alvo fica protegido contra decomposição e não pode se tornar um morto-vivo.\nA magia também estende efetivamente o limite de tempo para reviver o alvo dos mortos, já que os dias passados ​​sob a influência desta magia não contam contra o limite de tempo de magias como reviver os mortos.","h":""},{"n":"Restauração Menor","l":2,"s":"Abjuração","c":["Bardo","Clérigo","Druida","Paladino","Patrulheiro"],"t":"1 ação","r":"Toque","d":"Instantânea","k":"V, S","cc":false,"rt":false,"x":"Toca numa criatura e pode terminar uma doença ou uma condição que a esteja a afetar. A condição pode ser cegueira, surdez, paralisia ou envenenamento.","h":""},{"n":"Seta Ácida","l":2,"s":"Evocação","c":["Mago"],"t":"1 ação","r":"90 pés (27 metros)","d":"Instantânea","k":"V, S, M (Folha de ruibarbo em pó e o estômago de uma víbora)","cc":false,"rt":false,"x":"Uma seta verde cintilante voa em direção a um alvo dentro do alcance e explode num borrifo de ácido. Faça um ataque de magia à distância contra o alvo. Num acerto, o alvo sofre 4d4 de dano de ácido imediatamente e 2d4 de dano de ácido no final do seu próximo turno. Num erro, a seta espirra ácido no alvo causando metade do dano inicial e nenhum dano no final do seu próximo turno.","h":"Quando conjura esta magia usando um espaço de magia de 3º nível ou superior, o dano (tanto inicial quanto posterior) aumenta em 1d4 para cada nível do espaço acima do 2º."},{"n":"Silêncio","l":2,"s":"Ilusão","c":["Bardo","Clérigo","Patrulheiro"],"t":"1 ação","r":"120 pés (36 metros)","d":"Até 10 minutos","k":"V, S","cc":true,"rt":true,"x":"Durante a duração, nenhum som pode ser criado dentro de uma esfera com 20 pés (6 metros) de raio, centrada num ponto à tua escolha dentro do alcance, nem atravessá-la. Qualquer criatura ou objeto totalmente dentro da esfera é imune a dano trovejante, e as criaturas ficam ensurdecidas enquanto permanecerem totalmente no seu interior.\nÉ impossível conjurar uma magia que inclua uma componente verbal dentro da área.","h":""},{"n":"Sugestão","l":2,"s":"Encantamento","c":["Bardo","Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"30 pés (9 metros)","d":"Até 8 horas","k":"V, M (Uma língua de serpente e um pouco de favo de mel ou uma gota de óleo doce)","cc":true,"rt":false,"x":"Sugeres um curso de ação (limitado a uma ou duas frases) e influencias magicamente uma criatura que consigas ver dentro do alcance e que te consiga ouvir e compreender. Criaturas que não possam ser enfeitiçadas são imunes a este efeito. A sugestão tem de ser formulada de modo a que o curso de ação pareça razoável. Pedir à criatura que se apunhale, se atire contra uma lança, se incendeie ou pratique qualquer outro ato obviamente prejudicial faz com que a magia termine.\nO alvo tem de realizar uma salvaguarda de Sabedoria. Se falhar, segue o curso de ação que descreveste da melhor forma possível. O curso de ação sugerido pode prolongar-se durante toda a duração. Se a atividade sugerida puder ser concluída em menos tempo, a magia termina quando o alvo acaba aquilo que lhe foi pedido.\nTambém podes especificar condições que desencadeiem uma atividade especial durante a duração. Por exemplo, podes sugerir que um cavaleiro ofereça o seu cavalo de guerra ao primeiro mendigo que encontrar. Se a condição não se verificar antes de a magia expirar, a atividade não é realizada.\nSe tu ou qualquer um dos teus companheiros causar dano ao alvo, a magia termina.","h":""},{"n":"Teia","l":2,"s":"Conjuração","c":["Feiticeiro","Mago"],"t":"1 ação","r":"60 pés (18 metros)","d":"Até 1 hora","k":"V, S, M (Um pedaço de teia de aranha)","cc":true,"rt":false,"x":"Conjuras uma massa de teias espessas e pegajosas num ponto à tua escolha dentro do alcance. As teias preenchem um cubo de 20 pés (6 metros) a partir desse ponto durante a duração da magia. As teias constituem terreno difícil e obscurecem ligeiramente a área.\nSe as teias não estiverem ancoradas entre duas massas sólidas (como paredes ou árvores), nem dispostas sobre um chão, parede ou teto, a teia conjurada desaba sobre si própria e a magia termina no início do teu próximo turno. As teias dispostas sobre uma superfície plana têm uma profundidade de 5 pés (1,5 metros).\nCada criatura que comece o seu turno nas teias ou entre nelas durante o seu turno tem de realizar um teste de resistência de Destreza. Se falhar, fica impedida enquanto permanecer nas teias ou até se libertar.\nUma criatura impedida pelas teias pode usar a sua ação para realizar um teste de Força contra a CD das tuas magias. Se for bem-sucedida, deixa de estar impedida.\nAs teias são inflamáveis. Qualquer cubo de 5 pés (1,5 metros) de teias exposto ao fogo arde durante 1 ronda, causando 2d4 de dano de fogo a qualquer criatura que comece o seu turno no fogo.","h":""},{"n":"Tranca Arcana","l":2,"s":"Abjuração","c":["Mago"],"t":"1 ação","r":"Toque","d":"Até ser dissipada","k":"V, S, M (Pó de ouro no valor de pelo menos 25 po, que a magia consome)","cc":false,"rt":false,"x":"Toca numa porta, janela, portão, baú ou outra entrada fechada, e esta fica trancada pela duração. Você e as criaturas que designar quando conjurar esta magia podem abrir o objeto normalmente. Também pode definir uma palavra-passe que, quando falada a até 5 pés (1,5 metros) do objeto, suprime esta magia por 1 minuto. Caso contrário, é intransponível até ser quebrado ou a magia ser dissipada ou suprimida. Conjurar arrombar no objeto suprime tranca arcana por 10 minutos.\nEnquanto estiver afetado por esta magia, o objeto é mais difícil de quebrar ou forçar; a CD para quebrá-lo ou abrir qualquer fechadura nele aumenta em 10.","h":""},{"n":"Truque da Corda","l":2,"s":"Transmutação","c":["Mago"],"t":"1 ação","r":"Toque","d":"1 hora","k":"V, S, M (Extrato de milho em pó e um laço de pergaminho torcido)","cc":false,"rt":false,"x":"Tocas num pedaço de corda com até 60 pés (18 metros) de comprimento. Uma das extremidades da corda eleva-se no ar até que toda a corda fique suspensa perpendicularmente ao solo. Na extremidade superior, abre-se uma entrada invisível para um espaço extradimensional que dura até a magia terminar.\nO espaço extradimensional pode ser alcançado subindo até ao topo da corda. Pode conter até oito criaturas de tamanho Médio ou inferior. A corda pode ser puxada para dentro do espaço, fazendo com que desapareça da vista no exterior.\nAtaques e magias não podem atravessar a entrada para dentro ou para fora do espaço extradimensional, mas quem estiver no seu interior pode ver o exterior como se estivesse a olhar através de uma janela de 3 por 5 pés (cerca de 0,9 por 1,5 metros), centrada na corda.\nTudo o que estiver dentro do espaço extradimensional cai para fora quando a magia termina.","h":""},{"n":"Ver Invisibilidade","l":2,"s":"Adivinhação","c":["Bardo","Feiticeiro","Mago"],"t":"1 ação","r":"Pessoal","d":"1 hora","k":"V, S, M (Uma pitada de talco e uma pequena quantidade de pó de prata)","cc":false,"rt":false,"x":"Durante a duração da magia, vês criaturas e objetos invisíveis como se fossem visíveis e consegues ver através do Plano Etéreo. Os objetos e criaturas etéreos aparecem como formas fantasmagóricas e translúcidas.","h":""},{"n":"Vínculo Protector","l":2,"s":"Abjuração","c":["Clérigo"],"t":"1 ação","r":"Toque","d":"1 hora","k":"V, S, M (Um par de anéis de platina que valham pelo menos 50 po cada, que tu e o alvo têm de usar durante a duração da magia)","cc":false,"rt":false,"x":"Esta magia protege uma criatura voluntária em que toques e cria uma ligação mística entre ti e o alvo até a magia terminar. Enquanto o alvo estiver a até 60 pés (18 metros) de ti, recebe um bónus de +1 à CA e aos testes de resistência, e tem resistência a todo o dano. Além disso, sempre que sofrer dano, tu sofres a mesma quantidade de dano.\nA magia termina se os teus pontos de vida forem reduzidos a 0 ou se tu e o alvo ficarem separados por mais de 60 pés (18 metros).\nA magia também termina se for conjurada novamente sobre qualquer uma das criaturas ligadas. Também podes terminar a magia voluntariamente usando uma ação.","h":""},{"n":"Visão no Escuro","l":2,"s":"Transmutação","c":["Druida","Patrulheiro","Feiticeiro","Mago"],"t":"1 ação","r":"Toque","d":"8 horas","k":"V, S, M (Uma pitada de cenoura seca ou uma ágata)","cc":false,"rt":false,"x":"Toca numa criatura voluntária para lhe conceder a capacidade de ver no escuro. Pela duração, essa criatura tem visão no escuro até um alcance de 60 pés (18 metros).","h":""},{"n":"Zona da Verdade","l":2,"s":"Encantamento","c":["Bardo","Clérigo","Paladino"],"t":"1 ação","r":"60 pés (18 metros)","d":"10 minutos","k":"V, S","cc":false,"rt":false,"x":"Cria uma zona mágica que impede a mentira numa esfera com 15 pés (4,5 metros) de raio, centrada num ponto à tua escolha dentro do alcance. Até a magia terminar, uma criatura que entre pela primeira vez na área da magia durante um turno ou que comece o seu turno nela tem de realizar um teste de resistência de Carisma. Se falhar, a criatura não pode proferir uma mentira deliberada enquanto estiver dentro do raio. Sabes se cada criatura é bem-sucedida ou falha no seu teste de resistência.\nUma criatura afectada tem consciência deste efeito e pode evitar responder a perguntas às quais normalmente responderia com uma mentira. Essa criatura pode continuar a dar respostas evasivas, desde que estas se mantenham dentro dos limites da verdade.","h":""},{"n":"Animar Mortos","l":3,"s":"Necromancia","c":["Clérigo","Mago"],"t":"1 minuto","r":"10 pés (3 metros)","d":"Instantânea","k":"V, S, M (Uma gota de sangue, um pedaço de carne e uma pitada de pó de osso)","cc":false,"rt":false,"x":"Esta magia cria um servo morto-vivo. Escolha uma pilha de ossos ou um cadáver de um humanoide Médio ou Pequeno dentro do alcance. A sua magia imbuye o alvo com uma mímica de vida, erguendo-o como uma criatura morta-viva. O alvo torna-se um esqueleto se escolheu ossos, ou um zombie se escolheu um cadáver (o DM tem as estatísticas de jogo da criatura).\nEm cada um dos seus turnos, pode usar uma ação bónus para comandar mentalmente qualquer criatura que tenha criado com esta magia, se a criatura estiver a até 60 pés (18 metros) de si (se controlar várias criaturas, pode comandar qualquer uma ou todas elas ao mesmo tempo, emitindo o mesmo comando para cada uma). Decide que ação a criatura tomará e para onde se moverá durante o seu próximo turno, ou pode emitir um comando geral, como guardar uma câmara ou corredor em particular. Se não emitir nenhum comando, a criatura apenas se defende contra criaturas hostis. Depois de receber uma ordem, a criatura continua a segui-la até que a sua tarefa seja concluída.\nA criatura está sob o seu controlo durante 24 horas, após o que deixa de obedecer a qualquer comando que lhe tenha dado. Para manter o controlo da criatura por mais 24 horas, deve conjurar esta magia na criatura novamente antes que o período atual de 24 horas termine. O uso da magia desta forma reafirma o seu controlo sobre até quatro criaturas que tenha animado com esta magia, em vez de animar uma nova.","h":"Quando conjura esta magia usando um espaço de magia de 4º nível ou superior, anima ou reafirma o controlo sobre duas criaturas mortas-vivas adicionais para cada nível do espaço acima do 3º. Cada uma das criaturas deve vir de um cadáver ou pilha de ossos diferente."},{"n":"Bola de Fogo","l":3,"s":"Evocação","c":["Feiticeiro","Mago"],"t":"1 ação","r":"150 pés (45 metros)","d":"Instantânea","k":"V, S, M (Uma minúscula bola de guano de morcego e enxofre)","cc":false,"rt":false,"x":"Um rastro brilhante pisca do seu dedo indicador apontado para um ponto à sua escolha dentro do alcance e depois floresce com um rugido baixo numa explosão de chamas. Cada criatura numa esfera de 20 pés (6 metros) de raio centrada nesse ponto deve fazer um teste de resistência de Destreza. Um alvo sofre 8d6 de dano de fogo num teste falhado, ou metade do dano num teste bem-sucedido.\nO fogo espalha-se ao virar das esquinas. Incendeia objetos inflamáveis na área que não estejam a ser vestidos ou carregados.","h":"Quando conjura esta magia usando um espaço de magia de 4º nível ou superior, o dano aumenta em 1d6 para cada nível do espaço acima do 3º."},{"n":"Caminhar sobre as Águas","l":3,"s":"Transmutação","c":["Clérigo","Druida","Patrulheiro","Feiticeiro"],"t":"1 ação","r":"30 pés (9 metros)","d":"1 hora","k":"V, S, M","cc":false,"rt":true,"x":"Esta magia concede a capacidade de se deslocar sobre qualquer superfície líquida — como água, ácido, lama, neve, areia movediça ou lava — como se fosse solo sólido e inofensivo (as criaturas que atravessem lava derretida ainda podem sofrer dano devido ao calor). Até dez criaturas voluntárias que consigas ver dentro do alcance recebem esta capacidade durante a duração da magia.\nSe tiveres como alvo uma criatura submersa num líquido, a magia transporta-a até à superfície desse líquido a uma velocidade de 60 pés (18 metros) por ronda.","h":""},{"n":"Círculo Mágico","l":3,"s":"Abjuração","c":["Clérigo","Paladino","Bruxo","Mago"],"t":"1 minuto","r":"10 pés (3,0 metros)","d":"1 hora","k":"V, S, M (Água benta ou prata e ferro em pó no valor de pelo menos 100 po, que a magia consome)","cc":false,"rt":false,"x":"Escolha um ou mais dos seguintes tipos de criaturas: celestiais, elementais, feéricos, ínferos ou mortos-vivos. O círculo afeta uma criatura do tipo escolhido das seguintes formas:\n- A criatura não pode entrar voluntariamente no cilindro por meios não mágicos. Se tentar usar teletransporte ou viajar entre planos para o fazer, deve primeiro ser bem-sucedida num teste de resistência de Carisma.\n- A criatura tem desvantagem nas jogadas de ataque contra alvos dentro do cilindro.\n- Os alvos dentro do cilindro não podem ser enfeitiçados, amedrontados ou possuídos pela criatura.\nQuando conjura esta magia, pode optar por fazer com que a sua magia funcione na direção inversa, impedindo uma criatura do tipo especificado de sair do cilindro e protegendo os alvos no exterior.","h":"Quando conjura esta magia usando um espaço de magia de 4.º nível ou superior, a duração aumenta em 1 hora por cada nível do espaço acima do 3.º."},{"n":"Clarividência","l":3,"s":"Adivinhação","c":["Bardo","Clérigo","Feiticeiro","Mago"],"t":"10 minutos","r":"1 milha (1,6 km)","d":"Até 10 minutos","k":"V, S, M (Um foco no valor de pelo menos 100 po, podendo ser um chifre incrustado de joias para audição ou um olho de vidro para visão)","cc":true,"rt":false,"x":"Cria um sensor invisível dentro do alcance num local familiar para si (um local que já tenha visitado ou visto antes) ou num local óbvio que não lhe é familiar (como atrás de uma porta, ao virar da esquina, ou num bosque de árvores). O sensor permanece no local pela duração e não pode ser atacado ou interagir de outra forma.\nQuando conjura a magia, escolhe visão ou audição. Pode usar o sentido escolhido através do sensor como se estivesse no seu espaço. Como sua ação, pode alternar entre visão e audição.\nUma criatura que consiga ver o sensor (como uma criatura a beneficiar de ver a invisibilidade ou visão verdadeira) vê um orbe luminoso e intangível aproximadamente do tamanho do seu punho.","h":""},{"n":"Conjurar Animais","l":3,"s":"Conjuração","c":["Druida","Patrulheiro"],"t":"1 ação","r":"60 pés (18 metros)","d":"Até 1 hora","k":"V, S","cc":true,"rt":false,"x":"Invoca espíritos feéricos que assumem a forma de bestas e aparecem em espaços desocupados que consiga ver dentro do alcance. Escolha uma das seguintes opções para o que aparece:\n- Uma besta de nível de desafio 2 ou inferior\n- Duas bestas de nível de desafio 1 ou inferior\n- Quatro bestas de nível de desafio 1/2 ou inferior\n- Oito bestas de nível de desafio 1/4 ou inferior\n- Cada besta também é considerada feérica, e desaparece quando cai para 0 pontos de vida ou quando a magia termina.\nAs criaturas invocadas são amigáveis consigo e com os seus companheiros. Role iniciativa para as criaturas invocadas como um grupo, que tem os seus próprios turnos. Elas obedecem a quaisquer comandos verbais que lhes dê (nenhuma ação requerida da sua parte). Se não lhes der nenhuns comandos, elas defendem-se de criaturas hostis, mas de resto não tomam ações.\nO DM tem as estatísticas das criaturas.","h":"Quando conjura esta magia usando espaços de magia de nível superior específicos, escolhe uma das opções de invocação acima, e mais criaturas aparecem: o dobro com um espaço de 5º nível, o triplo com um de 7º nível."},{"n":"Contra-mágica","l":3,"s":"Abjuração","c":["Feiticeiro","Bruxo","Mago"],"t":"1 reação","r":"60 pés (18 metros)","d":"Instantânea","k":"S","cc":false,"rt":false,"x":"Tenta interromper uma criatura no processo de conjurar uma magia. Se a criatura estiver a conjurar uma magia de 3º nível ou inferior, a sua magia falha e não tem efeito. Se estiver a conjurar uma magia de 4º nível ou superior, faça um teste de habilidade usando a sua habilidade de conjuração. A CD é igual a 10 + o nível da magia. Num sucesso, a magia da criatura falha e não tem efeito.","h":""},{"n":"Crescimento de Plantas","l":3,"s":"Transmutação","c":["Bardo","Druida","Patrulheiro"],"t":"1 ação","r":"150 pés (45 metros)","d":"Instantânea","k":"V, S","cc":false,"rt":false,"x":"Esta magia canaliza vitalidade para as plantas numa área específica. Existem duas utilizações possíveis para a magia, que concedem benefícios imediatos ou a longo prazo.\nSe conjurar esta magia usando 1 ação, escolha um ponto dentro do alcance. Todas as plantas normais num raio de 100 pés (30 metros), centrado nesse ponto, tornam-se densas e exuberantes. Uma criatura que se mova pela área tem de gastar 4 pés (1,2 metros) de deslocamento por cada 1 pé (30 centímetros) que percorrer.\nPode excluir uma ou mais áreas de qualquer dimensão dentro da área da magia para que não sejam afetadas.\nSe conjurar esta magia ao longo de 8 horas, enriquece a terra. Todas as plantas num raio de meia milha (800 metros), centrado num ponto dentro do alcance, ficam enriquecidas durante 1 ano. As plantas produzem o dobro da quantidade normal de alimento quando são colhidas.","h":""},{"n":"Criar Comida e Água","l":3,"s":"Conjuração","c":["Clérigo","Druida","Paladino"],"t":"1 ação","r":"30 pés (9 metros)","d":"Instantânea","k":"V, S","cc":false,"rt":false,"x":"Cria 45 libras (20 kg) de comida e 30 galões (113 litros) de água no chão ou em recipientes dentro do alcance, o suficiente para sustentar até quinze humanoides ou cinco montadas durante 24 horas. A comida é insípida mas nutritiva, e estraga-se se não for comida após 24 horas. A água é limpa e não se estraga.","h":""},{"n":"Dissipar Magia","l":3,"s":"Abjuração","c":["Bardo","Clérigo","Druida","Paladino","Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"120 pés (36 metros)","d":"Instantânea","k":"V, S","cc":false,"rt":false,"x":"Escolha uma criatura, objeto ou efeito mágico dentro do alcance. Qualquer magia de 3º nível ou inferior no alvo termina. Para cada magia de 4º nível ou superior no alvo, faça um teste de habilidade usando a sua habilidade de conjuração. A CD é igual a 10 + o nível da magia. Num teste bem-sucedido, a magia termina.","h":"Quando conjura esta magia usando um espaço de magia de 4º nível ou superior, termina automaticamente os efeitos de uma magia no alvo se o nível da magia for igual ou inferior ao nível do espaço de magia que usou."},{"n":"Enviar Mensagem","l":3,"s":"Evocação","c":["Bardo","Clérigo","Mago"],"t":"1 ação","r":"Unlimited","d":"1 rodada","k":"V, S, M (Um pequeno pedaço de fio de cobre fino)","cc":false,"rt":false,"x":"Envias uma mensagem curta, com 25 palavras ou menos, a uma criatura que conheças. A criatura ouve a mensagem na sua mente, reconhece-te como remetente se te conhecer e pode responder imediatamente da mesma forma. A magia permite que criaturas com um valor de Inteligência igual ou superior a 1 compreendam o significado da tua mensagem.\nPodes enviar a mensagem a qualquer distância e até para outros planos de existência, mas, se o alvo estiver num plano diferente do teu, existe uma probabilidade de 5 por cento de a mensagem não chegar.","h":""},{"n":"Falar com as Plantas","l":3,"s":"Transmutação","c":["Bardo","Druida","Patrulheiro"],"t":"1 ação","r":"Pessoal","d":"10 minutos","k":"V, S","cc":false,"rt":false,"x":"Imbuyes as plantas a até 30 pés (9 metros) de ti com uma senciência e animação limitadas, dando-lhes a capacidade de comunicar contigo e seguir as tuas ordens simples. Podes interrogar as plantas sobre acontecimentos ocorridos na área da magia durante o último dia, obtendo informações sobre criaturas que passaram por ali, o clima e outras circunstâncias.\nTambém podes transformar terreno difícil causado pelo crescimento de plantas (como matagais e vegetação rasteira) em terreno normal, efeito que dura até a magia terminar. Em alternativa, podes transformar terreno normal onde existam plantas em terreno difícil durante a duração, fazendo, por exemplo, com que trepadeiras e ramos dificultem a perseguição.\nAs plantas podem realizar outras tarefas em teu benefício, à discrição do Mestre. A magia não permite que as plantas se desenraízem e se desloquem, mas podem mover livremente os seus ramos, gavinhas e caules.\nSe houver uma criatura-planta na área, podes comunicar com ela como se partilhásseis um idioma comum, mas não ganhas qualquer capacidade mágica para a influenciar.\nEsta magia pode fazer com que as plantas criadas pela magia emaranhar libertem uma criatura restringida.","h":""},{"n":"Falar com os Mortos","l":3,"s":"Necromancia","c":["Bardo","Clérigo"],"t":"1 ação","r":"10 pés (3 metros)","d":"10 minutos","k":"V, S, M (Incenso a arder)","cc":false,"rt":false,"x":"Concedes uma aparência de vida e inteligência a um cadáver à tua escolha dentro do alcance, permitindo-lhe responder às perguntas que lhe fizeres. O cadáver ainda tem de possuir uma boca e não pode ser um morto-vivo. A magia falha se o cadáver tiver sido alvo desta magia nos últimos 10 dias.\nAté a magia terminar, podes fazer até cinco perguntas ao cadáver. O cadáver só sabe aquilo que sabia em vida, incluindo os idiomas que conhecia. As respostas são geralmente breves, enigmáticas ou repetitivas, e o cadáver não é obrigado a dizer a verdade se fores hostil para com ele ou se te reconhecer como inimigo. Esta magia não devolve a alma da criatura ao corpo, apenas o espírito que o anima. Assim, o cadáver não pode aprender novas informações, não compreende nada do que aconteceu desde a sua morte e não pode especular sobre acontecimentos futuros.","h":""},{"n":"Farol de Esperança","l":3,"s":"Abjuração","c":["Clérigo"],"t":"1 ação","r":"30 pés (9 metros)","d":"Até 1 minuto","k":"V, S","cc":true,"rt":false,"x":"Esta magia concede esperança e vitalidade. Escolha qualquer número de criaturas dentro do alcance. Pela duração, cada alvo tem vantagem em testes de resistência de Sabedoria e testes de resistência à morte, e recupera o número máximo de pontos de vida possível de qualquer cura.","h":""},{"n":"Forma Gasosa","l":3,"s":"Transmutação","c":["Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"Toque","d":"Até 1 hora","k":"V, S, M (Um pedaço de gaze e um fio de fumaça)","cc":true,"rt":false,"x":"Você transforma uma criatura disposta que você tocar, juntamente com tudo o que ela está vestindo e carregando, em uma nuvem de névoa pela duração. A magia termina se a criatura cair para 0 pontos de vida. Uma criatura incorpórea não é afetada.\nEnquanto estiver nesta forma, o único método de movimento do alvo é um deslocamento de voo de 3 metros. O alvo pode entrar e ocupar o espaço de outra criatura. O alvo tem resistência a dano não mágico e tem vantagem em testes de resistência de Força, Destreza e Constituição. O alvo pode passar através de buracos pequenos, aberturas estreitas e até mesmo meras rachaduras, embora ele trate os líquidos como se fossem superfícies sólidas. O alvo não pode cair e permanece pairando no ar mesmo quando atordoado ou de outra forma incapacitado.\nEnquanto estiver na forma de uma nuvem de névoa, o alvo não pode falar nem manipular objetos, e quaisquer objetos que estivesse carregando ou segurando não podem ser soltos, usados ou de outra forma interagidos. O alvo não pode atacar nem conjurar magias.","h":""},{"n":"Fundir-se na Pedra","l":3,"s":"Transmutação","c":["Clérigo"],"t":"1 ação","r":"Toque","d":"8 horas","k":"V, S","cc":false,"rt":true,"x":"Entra num objeto ou superfície de pedra suficientemente grande para conter completamente o seu corpo, fundindo-se a si e a todo o equipamento que transporta com a pedra durante a duração. Usando o seu movimento, entra na pedra num ponto que consiga tocar. Nada da sua presença permanece visível ou detetável por sentidos não mágicos.\nEnquanto estiver fundido com a pedra, não consegue ver o que acontece no exterior e quaisquer testes de Sabedoria (Perceção) que realize para ouvir sons do exterior são feitos com desvantagem. Continua consciente da passagem do tempo e pode conjurar magias sobre si próprio enquanto estiver fundido na pedra. Pode usar o seu movimento para sair da pedra pelo mesmo local por onde entrou, terminando a magia. Caso contrário, não pode mover-se.\nDanos físicos menores na pedra não o prejudicam, mas a sua destruição parcial ou uma alteração da sua forma (ao ponto de já não caber nela) expulsa-o e causa-lhe 6d6 de dano contundente. A destruição completa da pedra (ou a sua transmutação noutra substância) expulsa-o e causa-lhe 50 de dano contundente. Se for expulso, cai no chão, ficando caído, num espaço desocupado o mais próximo possível do local onde entrou inicialmente.","h":""},{"n":"Glifo de Vigilância","l":3,"s":"Abjuração","c":["Bardo","Clérigo","Mago"],"t":"1 hora","r":"Toque","d":"Até ser dissipada","k":"V, S, M (Incenso e diamante em pó no valor mínimo de 200 po, que a magia consome)","cc":false,"rt":false,"x":"Quando você conjura esta magia, você desenha um glifo que fere outras criaturas, seja em uma superfície (como uma mesa ou uma seção do chão ou parede) ou dentro de um objeto que possa ser fechado (como um livro, um pergaminho ou um baú) para esconder o glifo. Se você optar por uma superfície, o glifo pode cobrir uma área de não mais que 3 metros de diâmetro. Se você selecionar um objeto, ele deve permanecer no lugar. Se o objeto for movido mais de 3 metros de onde você conjurou a magia, o glifo se quebra e a magia termina sem ser acionada.\nO glifo é quase invisível e requer um teste de Inteligência (Investigação) contra a CD de suas magias para ser encontrado.\nVocê determina o que aciona o glifo ao conjurar a magia. Para glifos inscritos em uma superfície, os gatilhos mais comuns incluem tocar ou ficar sobre o glifo, remover outro objeto que esteja sobre ele, se aproximar a certa distância, ou manipular o objeto em que o glifo está inscrito. Para glifos inscritos dentro de um objeto, os gatilhos mais comuns incluem abrir aquele objeto, se aproximar a uma certa distância dele ou ver ou ler o glifo. Uma vez que um glifo seja acionado, a magia termina.\nVocê pode refinar as condições do gatilho para que a magia seja acionada apenas sob certas circunstâncias ou de acordo com atributos físicos (como altura ou peso), ou tipo de criatura (por exemplo, a proteção pode ser definida para afetar apenas aberrações ou drow) ou tendência. Você também pode definir condições para criaturas não ativarem o glifo, como a pronúncia de uma senha.\nQuando você desenhar o glifo, faça a escolha entre runas explosivas ou um glifo de magia.\nRunas Explosivas. Quando o glifo é acionado, a energia mágica irrompe do glifo em uma esfera de 6 metros de raio, centrada no glifo. A esfera contorna quinas. Cada criatura na área deve fazer um teste de resistência de Destreza. Uma criatura sofre 5d8 de dano de ácido, frio, fogo, elétrico ou trovejante num fracasso, dependendo do que você escolheu no momento que conjurou a magia, ou metade desse dano em um sucesso.\nGlifo de Magia. Você pode armazenar uma magia preparada de até 3º nível ou inferior no glifo, ao conjurá-la como parte da criação do glifo. A magia deve ter como alvo uma criatura simples ou uma área. A magia armazenada não surte efeito no momento em que é conjurada. Em vez disso, ela surte efeito quando o glifo é acionado, sendo conjurada. Se a magia tiver um alvo, o alvo será a criatura que ativou o glifo. Se a magia cobrir uma área, o centro da área será aquela criatura. Se a magia invocar criaturas hostis ou criar efeitos nocivos ou armadilhas, elas aparecem o mais próximo possível do intruso e o atacam. Se a magia exigir concentração, ela dura até o fim da duração da magia.","h":"Quando você conjura esta magia usando um espaço de magia de 4º nível ou superior, o dano da runa explosiva aumenta em 1d8 para cada nível do espaço acima do 3º. Se você for criar um glifo de magia, você pode armazenar qualquer magia desde que o nível dela seja igual ou menor que o do espaço de magia que você utilizou para formar o glifo de vigilância."},{"n":"Guardiões Espirituais","l":3,"s":"Conjuração","c":["Clérigo"],"t":"1 ação","r":"Pessoal","d":"Até 10 minutos","k":"V, S, M (Um símbolo sagrado)","cc":true,"rt":false,"x":"Invocas espíritos para te proteger. Eles esvoaçam à tua volta, a uma distância de até 15 pés (4,5 metros), durante a duração. Se fores bom ou neutro, a sua forma espectral parece angelical ou feérica (à tua escolha). Se fores mau, parecem demoníacos.\nQuando conjuras esta magia, podes designar qualquer número de criaturas que consigas ver para que não sejam afetadas por ela. O deslocamento de uma criatura afetada é reduzido para metade na área e, quando entra na área pela primeira vez num turno ou começa o seu turno nela, tem de realizar uma salvaguarda de Sabedoria. Se falhar, sofre 3d8 de dano radiante (se fores bom ou neutro) ou 3d8 de dano necrótico (se fores mau). Se for bem-sucedida, sofre metade do dano.","h":"Quando conjuras esta magia usando um espaço de magia de 4.º nível ou superior, o dano aumenta em 1d8 por cada nível do espaço acima do 3.º."},{"n":"Idiomas","l":3,"s":"Adivinhação","c":["Bardo","Clérigo","Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"Toque","d":"1 hora","k":"V, M (Um pequeno modelo de argila de um zigurate)","cc":false,"rt":false,"x":"Esta magia concede à criatura em quem tocas a capacidade de compreender qualquer idioma falado que ouça. Além disso, quando o alvo fala, qualquer criatura que conheça pelo menos um idioma e consiga ouvi-lo compreende o que ele diz.","h":""},{"n":"Imagem Maior","l":3,"s":"Ilusão","c":["Bardo","Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"120 pés (36,6 metros)","d":"Até 10 minutos","k":"V, S, M (Um pouco de lã)","cc":true,"rt":false,"x":"Cria a imagem de um objeto, criatura ou outro fenómeno visível que não seja maior do que um cubo de 20 pés (6 metros). A imagem aparece num local que consiga ver dentro do alcance e dura enquanto durar a magia. Parece completamente real, incluindo sons, cheiros e temperatura apropriados ao que representa. Não pode criar calor ou frio suficientes para causar dano, um som suficientemente alto para causar dano trovejante ou ensurdecer uma criatura, nem um cheiro que possa adoecer uma criatura (como o fedor de um troglodita).\nEnquanto estiver dentro do alcance da ilusão, pode usar a sua ação para fazer a imagem mover-se para qualquer outro local dentro do alcance. À medida que a imagem muda de localização, pode alterar a sua aparência para que os seus movimentos pareçam naturais. Por exemplo, se criar a imagem de uma criatura e a mover, pode alterar a imagem para que pareça estar a caminhar. Do mesmo modo, pode fazer com que a ilusão produza sons diferentes em momentos diferentes, podendo até manter uma conversa.\nA interação física com a imagem revela que se trata de uma ilusão, pois os objetos podem atravessá-la. Uma criatura que use a sua ação para examinar a imagem pode determinar que se trata de uma ilusão com um teste bem-sucedido de Inteligência (Investigação) contra a sua CD para resistir às suas magias. Se uma criatura reconhecer a ilusão como tal, consegue ver através da imagem e as suas outras qualidades sensoriais tornam-se ténues para essa criatura.","h":"Quando conjura esta magia usando um espaço de magia de 6.º nível ou superior, a magia dura até ser dissipada, sem exigir a sua concentração."},{"n":"Invocação de Relâmpagos","l":3,"s":"Conjuração","c":["Druida"],"t":"1 ação","r":"120 pés (36 metros)","d":"Até 10 minutos","k":"V, S","cc":true,"rt":false,"x":"Uma nuvem de tempestade aparece sob a forma de um cilindro com 10 pés (3 metros) de altura e um raio de 60 pés (18 metros), centrado num ponto que possa ver a 100 pés (30 metros) diretamente acima de si. A magia falha se não conseguir ver um ponto no ar onde a nuvem de tempestade pudesse aparecer (por exemplo, se estiver numa sala que não acomode a nuvem).\nQuando conjura a magia, escolha um ponto que possa ver dentro do alcance. Um raio desce da nuvem até a esse ponto. Cada criatura a até 5 pés (1,5 metros) desse ponto deve fazer um teste de resistência de Destreza. Uma criatura sofre 3d10 de dano de relâmpago num teste falhado, ou metade do dano num teste bem-sucedido. Em cada um dos seus turnos até a magia terminar, pode usar a sua ação para invocar relâmpagos desta forma novamente, tendo como alvo o mesmo ponto ou outro diferente.\nSe estiver ao ar livre em condições tempestuosas quando conjura esta magia, a magia dá-lhe controlo sobre a tempestade existente em vez de criar uma nova. Nessas condições, o dano da magia aumenta em 1d10.","h":"Quando conjura esta magia usando um espaço de magia de 4º nível ou superior, o dano aumenta em 1d10 para cada nível do espaço acima do 3º."},{"n":"Lentidão","l":3,"s":"Transmutação","c":["Feiticeiro","Mago"],"t":"1 ação","r":"120 pés (36 metros)","d":"Até 1 minuto","k":"V, S, M (Uma gota de melaço)","cc":true,"rt":false,"x":"Alteras o tempo em torno de até seis criaturas à tua escolha num cubo de 40 pés (12 metros) dentro do alcance. Cada alvo tem de ser bem-sucedido numa salvaguarda de Sabedoria ou será afetado por esta magia durante a duração.\nA velocidade de um alvo afetado é reduzida para metade, sofre uma penalização de -2 à CA e às salvaguardas de Destreza e não pode usar reações. No seu turno, pode realizar uma ação ou uma ação bónus, mas não ambas. Independentemente das capacidades ou dos itens mágicos da criatura, não pode realizar mais do que um ataque corpo a corpo ou à distância durante o seu turno.\nSe a criatura tentar conjurar uma magia com um tempo de conjuração de 1 ação, lança um d20. Com um resultado de 11 ou superior, a magia não produz efeito até ao próximo turno da criatura, e esta tem de usar a sua ação nesse turno para completar a magia. Se não conseguir fazê-lo, a magia é desperdiçada.\nUma criatura afetada por esta magia realiza outra salvaguarda de Sabedoria no final do seu turno. Se for bem-sucedida, o efeito termina para ela.","h":""},{"n":"Luz do Dia","l":3,"s":"Evocação","c":["Clérigo","Druida","Paladino","Patrulheiro","Feiticeiro"],"t":"1 ação","r":"60 pés (18 metros)","d":"1 hora","k":"V, S","cc":false,"rt":false,"x":"Uma esfera de luz de 60 pés (18 metros) de raio espalha-se a partir de um ponto à sua escolha dentro do alcance. A esfera é de luz brilhante e emite luz fraca por mais 60 pés.\nSe escolheu um ponto num objeto que esteja a segurar ou num que não esteja a ser vestido ou carregado, a luz brilha do objeto e move-se com ele. Cobrir completamente o objeto afetado com um objeto opaco, como uma tigela ou um elmo, bloqueia a luz.\nSe qualquer da área desta magia se sobrepuser com uma área de escuridão criada por uma magia de 3º nível ou inferior, a magia que criou a escuridão é dissipada.","h":""},{"n":"Medo","l":3,"s":"Ilusão","c":["Bardo","Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"Pessoal","d":"Até 1 minuto","k":"V, S, M (Uma pena branca ou o coração de uma galinha)","cc":true,"rt":false,"x":"Projeta uma imagem fantasiosa dos piores medos de uma criatura. Cada criatura num cone de 30 pés (9 metros) deve ser bem-sucedida num teste de resistência de Sabedoria ou largará o que quer que esteja a segurar e ficará assustada pela duração.\nEnquanto estiver assustada por esta magia, a criatura deve tomar a ação de Disparada e afastar-se de si pela rota mais segura disponível em cada um dos seus turnos, a menos que não haja para onde se mover. Se a criatura terminar o seu turno num local onde não tenha linha de visão para si, a criatura pode fazer um teste de resistência de Sabedoria. Num teste bem-sucedido, a magia termina para essa criatura.","h":""},{"n":"Montada Fantasmagórica","l":3,"s":"Ilusão","c":["Mago"],"t":"1 minuto","r":"30 pés (9 metros)","d":"1 hora","k":"V, S","cc":false,"rt":true,"x":"Uma criatura quase real, semelhante a um cavalo e de tamanho Grande, surge no chão num espaço desocupado à sua escolha dentro do alcance. Decide a aparência da criatura, mas esta está equipada com sela, freio e rédeas. Qualquer equipamento criado pela magia desaparece numa nuvem de fumo se for transportado para mais de 10 pés (3 metros) de distância da montada.\nDurante a duração, você ou uma criatura à sua escolha pode montar a criatura. Esta usa as estatísticas de um cavalo de montada, mas tem deslocamento de 100 pés (30 metros) e pode percorrer 10 milhas (16 quilómetros) numa hora, ou 13 milhas (21 quilómetros) a um ritmo acelerado. Quando a magia termina, a montada desaparece gradualmente, dando ao cavaleiro 1 minuto para desmontar. A magia termina se usar uma ação para dispensar a montada ou se esta sofrer qualquer dano.","h":""},{"n":"Muralha de Vento","l":3,"s":"Evocação","c":["Druida","Patrulheiro"],"t":"1 ação","r":"120 pés (36 metros)","d":"Até 1 minuto","k":"V, S, M (Um pequeno leque e uma pena de origem exótica)","cc":true,"rt":false,"x":"Uma muralha de vento forte ergue-se do chão num ponto à tua escolha dentro do alcance. Podes criar uma muralha com até 50 pés (15 metros) de comprimento, 15 pés (4,5 metros) de altura e 1 pé (30 centímetros) de espessura. Podes dar à muralha a forma que quiseres, desde que constitua um percurso contínuo ao longo do chão. A muralha permanece durante a duração da magia.\nQuando a muralha surge, cada criatura na sua área tem de realizar um teste de resistência de Força. Uma criatura sofre 3d8 de dano contundente se falhar, ou metade desse dano se for bem-sucedida.\nO vento forte mantém afastados o nevoeiro, o fumo e outros gases. Criaturas voadoras Pequenas ou menores, bem como objectos desse tamanho, não conseguem atravessar a muralha. Materiais soltos e leves que entrem na muralha são projectados para cima. Flechas, virotes e outros projécteis comuns disparados contra alvos atrás da muralha são desviados para cima e falham automaticamente. (Pedregulhos arremessados por gigantes ou máquinas de cerco, bem como projécteis semelhantes, não são afectados.) Criaturas em forma gasosa não conseguem atravessá-la.","h":""},{"n":"Não Deteção","l":3,"s":"Abjuração","c":["Bardo","Patrulheiro","Mago"],"t":"1 ação","r":"Toque","d":"8 horas","k":"V, S, M (Uma pitada de pó de diamante no valor de 25 po, polvilhada sobre o alvo, que a magia consome)","cc":false,"rt":false,"x":"Durante a duração, esconde um alvo que toque de magias de adivinhação. O alvo pode ser uma criatura voluntária, um local ou um objeto que não seja maior do que 10 pés (3 metros) em qualquer dimensão. O alvo não pode ser escolhido como alvo de qualquer magia de adivinhação nem ser percebido através de sensores mágicos de observação.","h":""},{"n":"Nuvem Fétida","l":3,"s":"Conjuração","c":["Bardo","Feiticeiro","Mago"],"t":"1 ação","r":"90 pés (27 metros)","d":"Até 1 minuto","k":"V, S, M (Um ovo podre ou várias folhas de couve-fétida)","cc":true,"rt":false,"x":"Crias uma esfera de gás amarelo nauseabundo com 20 pés (6 metros) de raio, centrada num ponto dentro do alcance. A nuvem espalha-se pelos cantos e a sua área fica fortemente obscurecida. A nuvem permanece suspensa no ar durante a duração.\nCada criatura que esteja completamente dentro da nuvem no início do seu turno tem de realizar uma salvaguarda de Constituição contra veneno. Se falhar, passa esse turno a vomitar e a cambalear, sem poder realizar ações. Criaturas que não precisem de respirar ou sejam imunes a veneno são automaticamente bem-sucedidas nesta salvaguarda.\nUm vento moderado (pelo menos 10 milhas por hora) dispersa a nuvem após 4 rondas. Um vento forte (pelo menos 20 milhas por hora) dispersa-a após 1 ronda.","h":""},{"n":"Padrão Hipnótico","l":3,"s":"Ilusão","c":["Bardo","Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"120 pés (36,6 metros)","d":"Até 1 minuto","k":"S, M (Um pau de incenso brilhante ou um frasco de cristal cheio de material fosforescente)","cc":true,"rt":false,"x":"Cria um padrão retorcido de cores que serpenteia pelo ar dentro de um cubo de 30 pés (9 metros) dentro do alcance. O padrão aparece por um instante e desaparece. Cada criatura na área que veja o padrão deve fazer um teste de resistência de Sabedoria. Se falhar, a criatura fica enfeitiçada pela duração. Enquanto estiver enfeitiçada por esta magia, a criatura fica incapacitada e tem deslocamento 0.\nA magia termina para uma criatura afetada se esta sofrer qualquer dano ou se outra pessoa usar uma ação para a sacudir e a retirar do seu torpor.","h":""},{"n":"Palavra Curativa em Massa","l":3,"s":"Evocação","c":["Clérigo"],"t":"1 ação bônus","r":"60 pés (18,3 metros)","d":"Instantânea","k":"V","cc":false,"rt":false,"x":"Ao pronunciar palavras de restauração, até seis criaturas à sua escolha que consiga ver dentro do alcance recuperam pontos de vida iguais a 1d4 + o seu modificador de atributo de conjuração. Esta magia não tem efeito sobre mortos-vivos ou constructos.","h":"Quando conjura esta magia usando um espaço de magia de 4.º nível ou superior, a cura aumenta em 1d4 por cada nível do espaço acima do 3.º."},{"n":"Pequena Cabana","l":3,"s":"Evocação","c":["Bardo","Mago"],"t":"1 minuto","r":"Pessoal","d":"8 horas","k":"V, S, M (Uma pequena conta de cristal)","cc":false,"rt":true,"x":"Uma cúpula imóvel de energia, com 10 pés (3 metros) de raio, surge à tua volta e acima de ti e permanece estacionária durante a duração. A magia termina se saíres da sua área.\nNove criaturas de tamanho Médio ou inferior podem caber dentro da cúpula contigo. A magia falha se a sua área incluir uma criatura maior ou mais de nove criaturas. Criaturas e objetos que estejam dentro da cúpula quando conjuras esta magia podem atravessá-la livremente. Todas as outras criaturas e objetos estão impedidos de passar através dela. Magias e outros efeitos mágicos não podem estender-se através da cúpula nem ser conjurados através dela. A atmosfera dentro do espaço é confortável e seca, independentemente do clima no exterior.\nAté a magia terminar, podes ordenar que o interior fique tenuemente iluminado ou escuro. A cúpula é opaca vista do exterior, com qualquer cor que escolhas, mas é transparente vista do interior.","h":""},{"n":"Piscar","l":3,"s":"Transmutação","c":["Feiticeiro","Mago"],"t":"1 ação","r":"Pessoal","d":"1 minuto","k":"V, S","cc":false,"rt":false,"x":"Role um d20 no final de cada um dos seus turnos pela duração da magia. Numa rolagem de 11 ou superior, desaparece do seu plano de existência atual e aparece no Plano Etéreo (a magia falha e a conjuração é gasta se já estivesse nesse plano). No início do seu próximo turno, e quando a magia terminar se estiver no Plano Etéreo, regressa a um espaço desocupado à sua escolha que possa ver a até 10 pés (3 metros) do espaço de onde desapareceu. Se nenhum espaço desocupado estiver disponível nesse alcance, aparece no espaço desocupado mais próximo (escolhido aleatoriamente se mais do que um espaço estiver igualmente próximo). Pode dissipar esta magia como uma ação.\nEnquanto estiver no Plano Etéreo, consegue ver e ouvir o plano de onde originou, que é apresentado em tons de cinzento, e não consegue ver nada lá a mais de 60 pés (18 metros) de distância. Apenas pode afetar e ser afetado por outras criaturas no Plano Etéreo. Criaturas que não estejam lá não o podem perceber ou interagir consigo, a menos que tenham a capacidade de o fazer.","h":""},{"n":"Proteção contra Energia","l":3,"s":"Abjuração","c":["Clérigo","Druida","Patrulheiro","Feiticeiro","Mago"],"t":"1 ação","r":"Toque","d":"Até 1 hora","k":"V, S","cc":true,"rt":false,"x":"Durante a duração, a criatura voluntária que tocar recebe resistência a um tipo de dano à sua escolha: ácido, frio, fogo, elétrico ou trovejante.","h":""},{"n":"Relâmpago","l":3,"s":"Evocação","c":["Feiticeiro","Mago"],"t":"1 ação","r":"Pessoal","d":"Instantânea","k":"V, S, M (Um pouco de pelo e uma haste de âmbar, cristal ou vidro)","cc":false,"rt":false,"x":"Um raio que forma uma linha com 100 pés (30 metros) de comprimento e 5 pés (1,5 metros) de largura irrompe de si numa direção à sua escolha. Cada criatura na linha deve realizar um teste de resistência de Destreza. Uma criatura sofre 8d6 de dano elétrico se falhar, ou metade desse dano se for bem-sucedida.\nO relâmpago incendeia os objetos inflamáveis na área que não estejam a ser vestidos ou transportados.","h":"Quando conjura esta magia usando um espaço de magia de 4.º nível ou superior, o dano aumenta em 1d6 por cada nível do espaço acima do 3.º."},{"n":"Remover Maldição","l":3,"s":"Abjuração","c":["Clérigo","Paladino","Bruxo","Mago"],"t":"1 ação","r":"Toque","d":"Instantânea","k":"V, S","cc":false,"rt":false,"x":"Ao teu toque, todas as maldições que afetam uma criatura ou objeto terminam. Se o objeto for um item mágico amaldiçoado, a sua maldição permanece, mas a magia quebra a sintonização do seu proprietário com o objeto, permitindo que este seja removido ou descartado.","h":""},{"n":"Respiração Aquática","l":3,"s":"Transmutação","c":["Druida","Patrulheiro","Feiticeiro","Mago"],"t":"1 ação","r":"30 pés (9 metros)","d":"24 horas","k":"V, S, M (Um pequeno pedaço de cana ou palha)","cc":false,"rt":true,"x":"Esta magia concede a até dez criaturas voluntárias dentro do alcance e que consigas ver a capacidade de respirar debaixo de água até ao fim da sua duração. As criaturas afectadas também mantêm a sua capacidade normal de respirar.","h":""},{"n":"Revivificar","l":3,"s":"Conjuração","c":["Clérigo","Paladino"],"t":"1 ação","r":"Toque","d":"Instantânea","k":"V, S, M (Diamantes no valor de 300 po, consumidos pela magia)","cc":false,"rt":false,"x":"Tocas numa criatura que tenha morrido no último minuto. Essa criatura regressa à vida com 1 ponto de vida. Esta magia não pode devolver à vida uma criatura que tenha morrido de velhice, nem restaurar partes do corpo em falta.","h":""},{"n":"Rogar Praga","l":3,"s":"Necromancia","c":["Bardo","Clérigo","Mago"],"t":"1 ação","r":"Toque","d":"Até 1 minuto","k":"V, S","cc":true,"rt":false,"x":"Toca numa criatura, e essa criatura deve ser bem-sucedida num teste de resistência de Sabedoria ou ficará amaldiçoada pela duração da magia. Quando conjura esta magia, escolha a natureza da maldição entre as seguintes opções:\n- Escolha um valor de habilidade. Enquanto estiver amaldiçoado, o alvo tem desvantagem em testes de habilidade e testes de resistência feitos com esse valor de habilidade.\n- Enquanto estiver amaldiçoado, o alvo tem desvantagem nas rolagens de ataque contra si.\n- Enquanto estiver amaldiçoado, o alvo deve fazer um teste de resistência de Sabedoria no início de cada um dos seus turnos. Se falhar, desperdiça a sua ação nesse turno sem fazer nada.\n- Enquanto o alvo estiver amaldiçoado, os seus ataques e magias causam 1d8 de dano necrótico extra ao alvo.\nUma magia remover maldição termina este efeito. Por opção do DM, pode escolher um efeito de maldição alternativo, mas não deve ser mais poderoso do que os descritos acima. O DM tem a palavra final sobre o efeito de tal maldição.","h":"Se conjurar esta magia usando um espaço de magia de 4º nível ou superior, a duração é de concentração, até 10 minutos. Se usar um espaço de magia de 5º nível ou superior, a duração é de 8 horas. Se usar um espaço de magia de 7º nível ou superior, a duração é de 24 horas. Se usar um espaço de magia de 9º nível, a magia dura até ser dissipada. O uso de um espaço de magia de 5º nível ou superior concede uma duração que não requer concentração."},{"n":"Tempestade de Granizo (Sleet Storm)","l":3,"s":"Conjuração","c":["Druida","Feiticeiro","Mago"],"t":"1 ação","r":"150 pés (45 metros)","d":"Até 1 minuto","k":"V, S, M (Uma pitada de pó e algumas gotas de água)","cc":true,"rt":false,"x":"Até a magia terminar, chuva gelada e granizo caem num cilindro com 20 pés (6 metros) de altura e 40 pés (12 metros) de raio, centrado num ponto à tua escolha dentro do alcance. A área fica fortemente obscurecida e as chamas expostas na área são apagadas.\nO solo na área fica coberto por gelo escorregadio, tornando-se terreno difícil. Quando uma criatura entra pela primeira vez na área da magia durante um turno ou começa o seu turno nela, tem de realizar uma salvaguarda de Destreza. Se falhar, cai no chão.\nSe uma criatura estiver a concentrar-se dentro da área da magia, tem de ser bem-sucedida numa salvaguarda de Constituição contra a CD das tuas magias ou perde a concentração.","h":""},{"n":"Toque Vampírico","l":3,"s":"Necromancia","c":["Bruxo","Mago"],"t":"1 ação","r":"Pessoal","d":"Até 1 minuto","k":"V, S","cc":true,"rt":false,"x":"O toque da tua mão envolta em sombras pode sugar a força vital de outras criaturas para curar as tuas feridas. Faz um ataque mágico corpo a corpo contra uma criatura ao teu alcance. Se acertares, o alvo sofre 3d6 de dano necrótico e recuperas pontos de vida iguais a metade do dano necrótico causado. Até a magia terminar, podes voltar a fazer este ataque em cada um dos teus turnos, usando uma ação.","h":"Quando conjuras esta magia usando um espaço de magia de 4.º nível ou superior, o dano aumenta em 1d6 por cada nível do espaço acima do 3.º."},{"n":"Velocidade","l":3,"s":"Transmutação","c":["Feiticeiro","Mago"],"t":"1 ação","r":"9 metros","d":"1 minuto","k":"V, S, M (Um fragmento de raiz de alcaçuz)","cc":true,"rt":false,"x":"Escolha uma criatura voluntária que você possa ver no alcance. Até a magia acabar, o deslocamento do alvo é dobrado, ele ganha +2 de bônus na CA, ele tem vantagem em testes de resistência de Destreza e ele ganha uma ação adicional em cada um de seus turnos. A ação pode ser usada para realizar as ações de Atacar (um ataque apenas), Correr, Desengajar, Esconder ou Usar um Objeto.\nQuando a magia acabar, o alvo não pode mover-se ou agir até depois de seu próximo turno, pois uma letargia toma conta de si.","h":""},{"n":"Voo","l":3,"s":"Transmutação","c":["Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"Toque","d":"Até 10 minutos","k":"V, S, M (Uma pena de asa de qualquer pássaro)","cc":true,"rt":false,"x":"Você toca uma criatura disposta. O alvo ganha um deslocamento de voo de 18 metros pela duração. Quando a magia termina, o alvo cai se ainda estiver no ar, a menos que possa impedir a queda.","h":"Quando você conjura esta magia usando um espaço de magia de 4º nível ou superior, você pode mirar em uma criatura adicional para cada nível do espaço acima do 3º."},{"n":"Adivinhação","l":4,"s":"Adivinhação","c":["Clérigo"],"t":"1 ação","r":"Pessoal","d":"Instantânea","k":"V, S, M (Incenso e uma oferenda sacrificial apropriada à sua religião, valendo juntos pelo menos 25 po, que a magia consome)","cc":false,"rt":true,"x":"A sua magia e uma oferenda colocam-no em contacto com um deus ou os servos de um deus. Faz uma única pergunta relativamente a um objetivo, evento ou atividade específica a ocorrer dentro de 7 dias. O DM oferece uma resposta verdadeira. A resposta pode ser uma frase curta, uma rima enigmática ou um presságio.\nA magia não tem em conta quaisquer circunstâncias possíveis que possam alterar o resultado, como a conjuração de magias adicionais ou a perda ou ganho de um companheiro.\nSe conjurar a magia duas ou mais vezes antes de terminar o seu próximo descanso longo, há uma probabilidade cumulativa de 25 por cento por cada conjuração após a primeira de obter uma leitura aleatória. O DM faz esta rolagem em segredo.","h":""},{"n":"Assassino Fantasmagórico","l":4,"s":"Ilusão","c":["Mago"],"t":"1 ação","r":"120 pés (36 metros)","d":"Até 1 minuto","k":"V, S","cc":true,"rt":false,"x":"Acede aos pesadelos de uma criatura que consiga ver dentro do alcance e cria uma manifestação ilusória dos seus medos mais profundos, visível apenas para essa criatura. O alvo tem de realizar um teste de resistência de Sabedoria. Se falhar, fica amedrontado durante a duração. No início de cada um dos turnos do alvo antes de a magia terminar, este tem de ser bem-sucedido num teste de resistência de Sabedoria ou sofre 4d10 de dano psíquico. Se for bem-sucedido, a magia termina.","h":"Quando conjura esta magia usando um espaço de magia de 5.º nível ou superior, o dano aumenta em 1d10 por cada nível do espaço acima do 4.º."},{"n":"Banimento","l":4,"s":"Abjuração","c":["Clérigo","Paladino","Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"60 pés (18 metros)","d":"Até 1 minuto","k":"V, S, M (Um item desagradável para o alvo)","cc":true,"rt":false,"x":"Tenta enviar uma criatura que possa ver dentro do alcance para outro plano de existência. O alvo deve ser bem-sucedido num teste de resistência de Carisma ou será banido.\nSe o alvo for nativo do plano de existência em que se encontra, bane o alvo para um semiplano inofensivo. Enquanto lá estiver, o alvo fica incapacitado. O alvo permanece lá até a magia terminar, altura em que reaparece no espaço que deixou ou no espaço desocupado mais próximo, se esse espaço estiver ocupado.\nSe o alvo for nativo de um plano de existência diferente daquele em que se encontra, o alvo é banido com um leve estalo, regressando ao seu plano natal. Se a magia terminar antes de passar 1 minuto, o alvo reaparece no espaço que deixou ou no espaço desocupado mais próximo, se esse espaço estiver ocupado. Caso contrário, o alvo não regressa.","h":"Quando conjura esta magia usando um espaço de magia de 5º nível ou superior, pode ter como alvo uma criatura adicional para cada nível do espaço acima do 4º."},{"n":"Baú Secreto","l":4,"s":"Conjuração","c":["Mago"],"t":"1 ação","r":"Toque","d":"Instantânea","k":"V, S, M (Um baú requintado, com 3 por 2 por 2 pés, construído com materiais raros no valor mínimo de 5 000 po, e uma réplica Minúscula feita dos mesmos materiais, no valor mínimo de 50 po)","cc":false,"rt":false,"x":"Escondes um baú, juntamente com todo o seu conteúdo, no Plano Etéreo. Tens de tocar no baú e na sua réplica em miniatura, que serve como componente material da magia. O baú pode conter até 12 pés cúbicos (cerca de 0,34 metros cúbicos) de material não vivo (3 por 2 por 2 pés).\nEnquanto o baú permanecer no Plano Etéreo, podes usar uma ação e tocar na réplica para o recuperar. O baú aparece num espaço desocupado no solo, a até 5 pés (1,5 metros) de ti. Podes enviar novamente o baú para o Plano Etéreo usando uma ação e tocando tanto no baú como na réplica.\nApós 60 dias, existe uma probabilidade cumulativa de 5 por cento por dia de o efeito da magia terminar. O efeito também termina se conjurares esta magia novamente, se a réplica menor do baú for destruída ou se decidires terminar a magia usando uma ação. Se a magia terminar enquanto o baú maior estiver no Plano Etéreo, este perde-se irremediavelmente.","h":""},{"n":"Cão Fiel","l":4,"s":"Conjuração","c":["Mago"],"t":"1 ação","r":"30 pés (9 metros)","d":"8 horas","k":"V, S, M (Um apito minúsculo de prata, um pedaço de osso e um fio)","cc":false,"rt":false,"x":"Invoca um cão de guarda fantasma num espaço desocupado que possa ver dentro do alcance, onde permanece pela duração, até que o dissipe como uma ação, ou até que se mova para mais de 100 pés (30 metros) dele.\nO cão é invisível para todas as criaturas exceto si e não pode ser ferido. Quando uma criatura Pequena ou maior se aproxima a até 30 pés (9 metros) dele sem primeiro pronunciar a palavra-passe que especificou quando conjurou esta magia, o cão começa a ladrar ruidosamente. O cão vê criaturas invisíveis e consegue ver no Plano Etéreo. Ignora ilusões.\nNo início de cada um dos seus turnos, o cão tenta morder uma criatura a até 5 pés (1,5 metros) dele que lhe seja hostil. O bónus de ataque do cão é igual ao seu modificador de habilidade de conjuração + o seu bónus de proficiência. Num acerto, causa 4d8 de dano perfurante.","h":""},{"n":"Compulsão","l":4,"s":"Encantamento","c":["Bardo"],"t":"1 ação","r":"30 pés (9 metros)","d":"Até 1 minuto","k":"V, S","cc":true,"rt":false,"x":"Criaturas à sua escolha que possa ver dentro do alcance e que consigam ouvi-lo devem fazer um teste de resistência de Sabedoria. Um alvo é automaticamente bem-sucedido neste teste de resistência se não puder ser encantado. Num teste falhado, um alvo é afetado por esta magia. Até a magia terminar, pode usar uma ação bónus em cada um dos seus turnos para designar uma direção que seja horizontal em relação a si. Cada alvo afetado deve usar tanto do seu movimento quanto possível para se mover nessa direção no seu próximo turno. Pode tomar qualquer ação antes de se mover. Depois de se mover desta forma, pode fazer outro teste de resistência de Sabedoria para tentar terminar o efeito.\nUm alvo não é compelido a mover-se para um perigo obviamente mortal, como um fogo ou um poço, mas provocará ataques de oportunidade para se mover na direção designada.","h":""},{"n":"Confusão","l":4,"s":"Encantamento","c":["Bardo","Druida","Feiticeiro","Mago"],"t":"1 ação","r":"90 pés (27 metros)","d":"Até 1 minuto","k":"V, S, M (Três cascas de noz)","cc":true,"rt":false,"x":"Esta magia assalta e distorce as mentes das criaturas, gerando ilusões e causando ações descontroladas. Cada criatura numa esfera de 10 pés (3 metros) de raio centrada num ponto escolhido dentro do alcance da magia deve fazer um teste de resistência de Sabedoria, caso contrário será afetada pela magia.\nUm alvo afetado não consegue reagir e deve rolar 1d10 no início de cada um dos seus turnos em combate para determinar o seu comportamento para esse turno.\nNo final de cada turno, uma criatura afetada pode fazer um teste de resistência de Sabedoria. Se for bem-sucedida, o efeito da magia termina para esse alvo.","h":"Quando conjura esta magia usando um espaço de magia de 5º nível ou superior, o raio da esfera aumenta em 5 pés para cada nível do espaço acima do 4º."},{"n":"Conjurar Elementais Menores","l":4,"s":"Conjuração","c":["Druida","Mago"],"t":"1 minuto","r":"90 pés (27 metros)","d":"Até 1 hora","k":"V, S","cc":true,"rt":false,"x":"Invoca elementais que aparecem em espaços desocupados que consiga ver dentro do alcance. Escolhe uma das seguintes opções para o que aparece:\n- Um elemental de nível de desafio 2 ou inferior\n- Dois elementais de nível de desafio 1 ou inferior\n- Quatro elementais de nível de desafio 1/2 ou inferior\n- Oito elementais de nível de desafio 1/4 ou inferior.\nUm elemental invocado por esta magia desaparece quando cai para 0 pontos de vida ou quando a magia termina.\nAs criaturas invocadas são amigáveis consigo e com os seus companheiros. Role iniciativa para as criaturas invocadas como um grupo, que tem os seus próprios turnos. Elas obedecem a quaisquer comandos verbais que lhes dê (nenhuma ação requerida da sua parte). Se não lhes der nenhuns comandos, elas defendem-se de criaturas hostis, mas de resto não tomam ações.\nO DM tem as estatísticas das criaturas.","h":"Quando conjura esta magia usando espaços de magia de nível superior específicos, escolhe uma das opções de invocação acima, e mais criaturas aparecem: o dobro com um espaço de 6º nível e o triplo com um espaço de 8º nível."},{"n":"Conjurar Seres da Floresta","l":4,"s":"Conjuração","c":["Druida","Patrulheiro"],"t":"1 ação","r":"60 pés (18 metros)","d":"Até 1 hora","k":"V, S, M (Uma baga de azevinho por criatura invocada)","cc":true,"rt":false,"x":"Invoca criaturas feéricas que aparecem em espaços desocupados que consiga ver dentro do alcance. Escolha uma das seguintes opções para o que aparece:\n- Uma criatura feérica de nível de desafio 2 ou inferior\n- Duas criaturas feéricas de nível de desafio 1 ou inferior\n- Quatro criaturas feéricas de nível de desafio 1/2 ou inferior\n- Oito criaturas feéricas de nível de desafio 1/4 ou inferior\nUma criatura invocada desaparece quando cai para 0 pontos de vida ou quando a magia termina.\nAs criaturas invocadas são amigáveis consigo e com os seus companheiros. Role iniciativa para as criaturas invocadas como um grupo, que têm os seus próprios turnos. Elas obedecem a quaisquer comandos verbais que lhes dê (nenhuma ação requerida da sua parte). Se não lhes emitir nenhuns comandos, elas defendem-se de criaturas hostis, mas de resto não tomam ações.\nO DM tem as estatísticas das criaturas.","h":"Quando conjura esta magia usando espaços de magia de nível superior específicos, escolhe uma das opções de invocação acima, e mais criaturas aparecem: o dobro com um espaço de 6º nível e o triplo com um espaço de 8º nível."},{"n":"Controlar a Água","l":4,"s":"Transmutação","c":["Clérigo","Druida","Mago"],"t":"1 ação","r":"300 pés (90 metros)","d":"Até 10 minutos","k":"V, S, M (Uma gota de água e uma pitada de poeira)","cc":true,"rt":false,"x":"Até a magia terminar, controla qualquer água estagnada ou corrente dentro de uma área que escolha, que é um cubo de até 100 pés (30 metros) de lado. Pode escolher de entre qualquer um dos seguintes efeitos quando conjura esta magia. Como uma ação no seu turno, pode repetir o mesmo efeito ou escolher um diferente.\nInundação. Faz com que o nível da água de toda a água estagnada na área suba até 20 pés (6 metros). Se a área incluir uma margem, a água da inundação derrama-se sobre a terra seca.\nEm vez disso, cria uma onda de 20 pés de altura que viaja de um lado da área para o outro e depois despenha-se. Quaisquer veículos Enormes ou menores no caminho da onda são levados com ela para o outro lado. Quaisquer veículos Enormes ou menores atingidos pela onda têm 25 por cento de probabilidade de virar.\nO nível da água permanece elevado até a magia terminar ou até escolher um efeito diferente. Se este efeito produziu uma onda, a onda repete-se no início do seu próximo turno enquanto o efeito da inundação durar.\nSeparar a Água. Faz com que a água na área se separe e crie uma vala. A vala estende-se ao longo da área da magia, e a água separada forma uma parede de cada lado. A vala permanece até a magia terminar ou até escolher um efeito diferente. A água então preenche lentamente a vala ao longo da próxima ronda até que o nível normal da água seja restaurado.\nRedirecionar o Fluxo. Faz com que a água corrente na área se mova numa direção que escolha, mesmo que a água tenha de fluir sobre obstáculos, subir paredes ou em outras direções improváveis. A água na área move-se como lhe indicar, mas assim que se move além da área da magia, retoma o seu fluxo com base nas condições do terreno. A água continua a mover-se na direção que escolheu até a magia terminar ou até escolher um efeito diferente.\nRedemoinho. Este efeito requer uma massa de água de pelo menos 50 pés quadrados (15 metros quadrados) e 25 pés (7,5 metros) de profundidade. Faz com que um redemoinho se forme no centro da área. O redemoinho forma um vórtice que tem 5 pés (1,5 metros) de largura na base, até 50 pés de largura no topo e 25 pés de altura. Qualquer criatura ou objeto na água e a até 25 pés do vórtice é puxado 10 pés (3 metros) na sua direção. Uma criatura pode nadar para longe do vórtice fazendo um teste de Força (Atletismo) contra a sua CD de salvamento de magia.\nQuando uma criatura entra no vórtice pela primeira vez num turno ou começa o seu turno lá, deve fazer um teste de resistência de Força. Num teste falhado, a criatura sofre 2d8 de dano de concussão e fica apanhada no vórtice até a magia terminar. Num teste bem-sucedido, a criatura sofre metade do dano, e não fica apanhada no vórtice. Uma criatura apanhada no vórtice pode usar a sua ação para tentar nadar para longe do vórtice conforme descrito acima, mas tem desvantagem no teste de Força (Atletismo) para o fazer.\nA primeira vez em cada turno que um objeto entra no vórtice, o objeto sofre 2d8 de dano de concussão; este dano ocorre a cada ronda que permanece no vórtice.","h":""},{"n":"Dominar Besta","l":4,"s":"Encantamento","c":["Druida","Feiticeiro"],"t":"1 ação","r":"60 pés (18 metros)","d":"Até 1 minuto","k":"V, S","cc":true,"rt":false,"x":"Tenta seduzir uma criatura que possa ver dentro do alcance. Ela deve ser bem-sucedida num teste de resistência de Sabedoria ou ficará encantada por si pela duração. Se você ou criaturas que lhe sejam amigáveis estiverem a lutar contra ela, ela tem vantagem no teste de resistência.\nEnquanto a criatura estiver encantada, tem uma ligação telepática com ela desde que ambos estejam no mesmo plano de existência. Pode usar esta ligação telepática para emitir comandos à criatura enquanto estiver consciente (nenhuma ação requerida), que ela faz o seu melhor para obedecer. Pode especificar um curso de ação simples e geral, como \"Ataca aquela criatura\", \"Corre para ali\" ou \"Traz aquele objeto\". Se a criatura completar a ordem e não receber mais instruções suas, defende-se e preserva-se da melhor forma possível.\nPode usar a sua ação para assumir o controlo total e preciso do alvo. Até ao fim do seu próximo turno, a criatura toma apenas as ações que escolher e não faz nada que não permita. Durante este tempo, pode também fazer com que a criatura use uma reação, mas isso requer que use também a sua própria reação. De cada vez que o alvo sofre dano, faz um novo teste de resistência de Sabedoria contra a magia. Se o teste for bem-sucedido, a magia termina.","h":"Quando conjura esta magia com um espaço de magia de 9º nível, a duração é de concentração, até 8 horas."},{"n":"Escudo de Fogo","l":4,"s":"Evocação","c":["Mago"],"t":"1 ação","r":"Pessoal","d":"10 minutos","k":"V, S, M (Um pouco de fósforo ou um pirilampo)","cc":false,"rt":false,"x":"Chamas finas e vaporosas envolvem o seu corpo pela duração da magia, irradiando luz brilhante num raio de 10 pés (3 metros) e luz fraca por mais 10 pés. Pode terminar a magia usando uma ação para a fazer desaparecer.\nAs chamas em seu redor podem ser um escudo de calor ou de frio, à sua escolha. O escudo de calor concede-lhe resistência a dano de frio e o escudo de frio concede-lhe resistência a dano de fogo.\nAlém disso, sempre que uma criatura a até 5 pés (1,5 metros) de si o atingir com um ataque corpo-a-corpo, chamas brotam do escudo. O atacante sofre 2d8 pontos de dano de fogo ou de frio, dependendo do tipo de escudo escolhido.","h":""},{"n":"Esfera Resiliente","l":4,"s":"Evocação","c":["Mago"],"t":"1 ação","r":"30 pés (9 metros)","d":"Até 1 minuto","k":"V, S, M (Uma peça hemisférica de cristal transparente e outra peça hemisférica correspondente de goma-arábica)","cc":true,"rt":false,"x":"Uma esfera de força cintilante envolve uma criatura ou objeto de tamanho Grande ou inferior dentro do alcance. Uma criatura que não queira ser afetada tem de realizar uma salvaguarda de Destreza. Se falhar, fica encerrada na esfera durante a duração.\nNada — nem objetos físicos, energia ou efeitos de outras magias — pode atravessar a barreira, para dentro ou para fora, embora uma criatura dentro da esfera possa respirar. A esfera é imune a todo o dano, e uma criatura ou objeto no seu interior não pode ser danificado por ataques ou efeitos provenientes do exterior; da mesma forma, uma criatura no interior não pode danificar nada no exterior.\nA esfera não tem peso e é apenas suficientemente grande para conter a criatura ou objeto no seu interior. Uma criatura encerrada pode usar a sua ação para empurrar as paredes da esfera e fazê-la rolar até metade do seu deslocamento. Do mesmo modo, outras criaturas podem pegar no globo e movê-lo.\nUma magia Desintegrar que tenha o globo como alvo destrói-o sem causar dano a nada que esteja no seu interior.","h":""},{"n":"Fabricar","l":4,"s":"Transmutação","c":["Mago"],"t":"10 minutos","r":"120 pés (36 metros)","d":"Instantânea","k":"V, S","cc":false,"rt":false,"x":"Converte matérias-primas em produtos do mesmo material. Por exemplo, pode fabricar uma ponte de madeira a partir de um conjunto de árvores, uma corda de um canteiro de cânhamo e roupas de linho ou lã.\nEscolha matérias-primas que possa ver dentro do alcance. Pode fabricar um objeto Grande ou menor (contido num cubo de 10 pés, ou oito cubos de 5 pés ligados), dada uma quantidade suficiente de matéria-prima. Se estiver a trabalhar com metal, pedra ou outra substância mineral, contudo, o objeto fabricado não pode ser maior do que Médio (contido num único cubo de 5 pés). A qualidade dos objetos feitos pela magia é proporcional à qualidade das matérias-primas.\nCriaturas ou itens mágicos não podem ser criados nem transmutados por esta magia. Também não pode usá-la para criar itens que ordinariamente requerem um alto grau de perícia de fabrico, como joias, armas, vidro ou armaduras, a menos que tenha proficiência com o tipo de ferramentas de artesão usadas para fabricar tais objetos.","h":""},{"n":"Guardião da Fé","l":4,"s":"Conjuração","c":["Clérigo"],"t":"1 ação","r":"9 metros","d":"8 horas","k":"V","cc":false,"rt":false,"x":"Um guardião Fantasma Grande aparece e flutua por toda a duração em um espaço desocupado de sua escolha que você possa ver dentro do alcance. O guardião ocupa o espaço dele e é turvo, exceto por uma espada cintilante e escudo com o símbolo de sua divindade.\nQualquer criatura hostil a você que se mover para um espaço a até 3 metros do guardião pela primeira vez em um turno, deve ser bem-sucedida num teste de resistência de Destreza. A criatura sofre 20 de dano radiante se falhar na resistência ou metade se for bem-sucedida. O guardião desaparece quando tiver causado um total de 60 de dano.","h":""},{"n":"Inseto Gigante","l":4,"s":"Transmutação","c":["Druida"],"t":"1 ação","r":"9 metros","d":"Até 10 minutos","k":"V, S","cc":true,"rt":false,"x":"Você transforma até dez centopeias, três aranhas, cinco vespas ou um escorpião dentro do alcance em versões gigantes de suas formas naturais pela duração. Uma centopeia se torna uma centopeia gigante, uma aranha se torna uma aranha gigante, uma vespa se torna uma vespa gigante e um escorpião se torna um escorpião gigante.\nCada criatura obedece aos seus comandos verbais e, em combate, elas agem no seu turno a cada rodada. O Mestre tem as estatísticas dessas criaturas e resolve suas ações e movimento.\nUma criatura permanece em seu tamanho gigante pela duração, até cair para 0 pontos de vida, ou até que você use uma ação para dissipar o efeito sobre ela.\nO Mestre pode permitir que você escolha alvos diferentes. Por exemplo, se você transformar uma abelha, sua versão gigante pode ter as mesmas estatísticas de uma vespa gigante.","h":""},{"n":"Invisibilidade Maior","l":4,"s":"Ilusão","c":["Bardo","Feiticeiro","Mago"],"t":"1 ação","r":"Toque","d":"1 minuto","k":"V, S","cc":true,"rt":false,"x":"Você ou uma criatura que você tocar se torna invisível até a magia acabar. Qualquer coisa que o alvo esteja vestindo ou carregando fica invisível enquanto estiver no alvo.","h":""},{"n":"Localizar Criatura","l":4,"s":"Adivinhação","c":["Bardo","Clérigo","Druida","Paladino","Patrulheiro","Mago"],"t":"1 ação","r":"Pessoal","d":"Até 1 hora","k":"V, S, M (Um pouco de pelo de um cão de caça)","cc":true,"rt":false,"x":"Descreva ou nomeie uma criatura que lhe seja familiar. Sente a direção da localização da criatura, desde que esta esteja a até 1000 pés (300 metros) de si. Se a criatura estiver em movimento, conhece a direção do seu movimento.\nA magia pode localizar uma criatura específica que conheça ou a criatura mais próxima de um tipo específico (como um humano ou um unicórnio), desde que tenha visto uma criatura desse tipo de perto — a até 30 pés (9 metros) — pelo menos uma vez. Se a criatura que descreveu ou nomeou estiver sob uma forma diferente, como quando está sob os efeitos de uma magia de metamorfose, esta magia não a localiza.\nEsta magia não consegue localizar uma criatura se água corrente com pelo menos 10 pés (3 metros) de largura bloquear um caminho direto entre si e a criatura.","h":""},{"n":"Metamorfose","l":4,"s":"Transmutação","c":["Bardo","Druida","Feiticeiro","Mago"],"t":"1 ação","r":"60 pés (18 metros)","d":"Até 1 hora","k":"V, S, M (Um casulo de lagarta)","cc":true,"rt":false,"x":"Esta magia transforma uma criatura que consiga ver dentro do alcance numa nova forma. Uma criatura involuntária tem de realizar um teste de resistência de Sabedoria para evitar o efeito. Um metamorfo é automaticamente bem-sucedido neste teste de resistência.\nA transformação dura enquanto durar a magia, ou até o alvo ficar com 0 pontos de vida ou morrer. A nova forma pode ser qualquer besta cujo nível de desafio seja igual ou inferior ao do alvo (ou ao nível do alvo, caso não tenha nível de desafio). As estatísticas de jogo do alvo, incluindo os valores de atributos mentais, são substituídas pelas da besta escolhida. O alvo mantém o seu alinhamento e personalidade.\nO alvo assume os pontos de vida da sua nova forma. Quando regressa à sua forma normal, a criatura recupera o número de pontos de vida que tinha antes da transformação. Se regressar à forma normal por ter ficado com 0 pontos de vida, qualquer dano excedente é transferido para a sua forma normal. Desde que o dano excedente não reduza os pontos de vida da forma normal da criatura a 0, esta não fica inconsciente.\nA criatura fica limitada nas ações que pode realizar pela natureza da sua nova forma e não pode falar, conjurar magias nem realizar qualquer outra ação que exija mãos ou fala.\nO equipamento do alvo funde-se com a nova forma. A criatura não pode ativar, usar, empunhar nem beneficiar de qualquer outra forma do seu equipamento.","h":""},{"n":"Moldar Pedra","l":4,"s":"Transmutação","c":["Clérigo","Druida","Mago"],"t":"1 ação","r":"Toque","d":"Instantânea","k":"V, S, M (Argila macia, para ser moldada grosseiramente na forma desejada para o objeto de pedra)","cc":false,"rt":false,"x":"Tocas num objeto de pedra de tamanho Médio ou inferior, ou numa secção de pedra que não tenha mais de 5 pés (1,5 metros) em qualquer dimensão, e moldas essa pedra numa forma adequada ao teu propósito. Por exemplo, podes transformar uma rocha grande numa arma, ídolo ou cofre, ou abrir uma pequena passagem numa parede, desde que esta tenha menos de 5 pés (1,5 metros) de espessura. Também podes moldar uma porta de pedra ou a sua moldura para a fechar. O objeto que crias pode ter até duas dobradiças e um trinco, mas não é possível criar detalhes mecânicos mais complexos.","h":""},{"n":"Movimentação Livre","l":4,"s":"Abjuração","c":["Bardo","Clérigo","Druida","Patrulheiro"],"t":"1 ação","r":"Toque","d":"1 hora","k":"V, S, M (Uma tira de couro, amarrada ao redor do braço ou apêndice semelhante)","cc":false,"rt":false,"x":"Você toca uma criatura disposta. Pela duração, o movimento do alvo não é afetado por terreno difícil, e magias e outros efeitos mágicos não podem reduzir o deslocamento do alvo nem deixá-lo paralisado ou impedido.\nO alvo também pode gastar 1,5 metro de seu deslocamento para escapar automaticamente de restrições não mágicas, como algemas ou uma criatura que o esteja agarrando. Por fim, estar debaixo d'água não impõe penalidades ao movimento ou aos ataques do alvo.","h":""},{"n":"Muralha de Fogo","l":4,"s":"Evocação","c":["Druida","Feiticeiro","Mago"],"t":"1 ação","r":"120 pés (36 metros)","d":"Até 1 minuto","k":"V, S, M (Um pequeno pedaço de fósforo)","cc":true,"rt":false,"x":"Cria uma muralha de fogo numa superfície sólida dentro do alcance. Podes fazer a muralha ter até 60 pés (18 metros) de comprimento, 20 pés (6 metros) de altura e 1 pé (30 centímetros) de espessura, ou formar uma muralha circular com até 20 pés (6 metros) de diâmetro, 20 pés (6 metros) de altura e 1 pé (30 centímetros) de espessura. A muralha é opaca e permanece durante a duração da magia.\nQuando a muralha surge, cada criatura na sua área tem de realizar um teste de resistência de Destreza. Se falhar, sofre 5d8 de dano de fogo, ou metade desse dano se for bem-sucedida.\nUm dos lados da muralha, escolhido por ti quando conjuras esta magia, causa 5d8 de dano de fogo a cada criatura que termine o seu turno a até 10 pés (3 metros) desse lado ou no interior da muralha. Uma criatura sofre o mesmo dano quando entra na muralha pela primeira vez num turno ou termina o seu turno nela. O outro lado da muralha não causa dano.\nO outro lado da muralha não causa dano.","h":"Quando conjuras esta magia usando um espaço de magia de 5.º nível ou superior, o dano da magia aumenta em 1d8 por cada nível do espaço acima do 4.º."},{"n":"Olho Arcano","l":4,"s":"Adivinhação","c":["Clérigo","Mago"],"t":"1 ação","r":"30 pés (9 metros)","d":"Até 1 hora","k":"V, S, M (Um pedaço de pelo de morcego)","cc":true,"rt":false,"x":"Cria um olho mágico invisível dentro do alcance que paira no ar pela duração da magia.\nRecebe mentalmente informação visual do olho, que tem visão normal e visão no escuro até 30 pés (9 metros). O olho pode olhar em todas as direções.\nComo uma ação, pode mover o olho até 30 pés (9 metros) em qualquer direção. Não há limite de quão longe de si o olho se pode mover, mas não pode entrar noutro plano de existência. Uma barreira sólida bloqueia o movimento do olho, mas o olho pode passar por uma abertura tão pequena quanto 1 polegada (2,5 cm) de diâmetro.","h":""},{"n":"Pele de Pedra","l":4,"s":"Abjuração","c":["Druida","Patrulheiro","Feiticeiro","Mago"],"t":"1 ação","r":"Toque","d":"Até 1 hora","k":"V, S, M (Pó de diamante no valor de 100 po, que a magia consome)","cc":true,"rt":false,"x":"Esta magia torna a carne de uma criatura voluntária em quem toques tão dura como pedra. Até a magia terminar, o alvo tem resistência a dano contundente, perfurante e cortante não mágico.","h":""},{"n":"Porta de Dimensão","l":4,"s":"Conjuração","c":["Bardo","Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"500 pés (150 metros)","d":"Instantânea","k":"V","cc":false,"rt":false,"x":"Teletransporta-se do seu local atual para qualquer outro ponto dentro do alcance. Chega exatamente ao ponto desejado. Pode ser um local que consiga ver, um que consiga visualizar ou um que possa descrever declarando a distância e direção, como \"60 metros diretamente para baixo\" ou \"para cima a noroeste num ângulo de 45 graus, 90 metros\".\nPode levar consigo objetos desde que o seu peso não exceda a sua capacidade de carga. Pode também levar uma criatura voluntária do seu tamanho ou menor que esteja a carregar equipamento até à sua capacidade de carga. A criatura deve estar a até 5 pés (1,5 metros) de si quando conjura esta magia.\nSe chegasse a um local já ocupado por um objeto ou criatura, você e qualquer criatura a viajar consigo sofrem 4d6 de dano de força cada um, e a magia falha em teletransportá-lo.","h":""},{"n":"Praga","l":4,"s":"Necromancia","c":["Druida","Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"30 pés (9 metros)","d":"Instantânea","k":"V, S","cc":false,"rt":false,"x":"Energia necrótica banha uma criatura à sua escolha que possa ver dentro do alcance, drenando-lhe humidade e vitalidade. O alvo deve fazer um teste de resistência de Constituição. O alvo sofre 8d8 de dano necrótico num teste falhado, ou metade do dano num teste bem-sucedido. A magia não tem efeito em mortos-vivos ou constructos.\nSe tiver como alvo uma criatura planta ou uma planta mágica, ela faz o teste de resistência com desvantagem, e a magia causa-lhe dano máximo.\nSe tiver como alvo uma planta não mágica que não seja uma criatura, como uma árvore ou arbusto, ela não faz teste de resistência; simplesmente murcha e morre.","h":"Quando conjura esta magia usando um espaço de magia de 5º nível ou superior, o dano aumenta em 1d8 para cada nível do espaço acima do 4º."},{"n":"Proteção contra a Morte","l":4,"s":"Abjuração","c":["Clérigo","Paladino"],"t":"1 ação","r":"Toque","d":"8 horas","k":"V, S","cc":false,"rt":false,"x":"Toca numa criatura e concede-lhe uma medida de proteção contra a morte.\nDa primeira vez que o alvo fosse cair para 0 pontos de vida como resultado de sofrer dano, o alvo, em vez disso, cai para 1 ponto de vida e a magia termina.\nSe a magia ainda estiver em efeito quando o alvo for sujeito a um efeito que o mataria instantaneamente sem causar dano, esse efeito é em vez disso negado contra o alvo, e a magia termina.","h":""},{"n":"Santuário Privado","l":4,"s":"Abjuração","c":["Mago"],"t":"10 minutos","r":"120 pés (36 metros)","d":"24 horas","k":"V, S, M (Uma fina folha de chumbo, um pedaço de vidro opaco, um punhado de algodão ou tecido e pó de crisólita)","cc":false,"rt":false,"x":"Torna uma área dentro do alcance magicamente segura. A área é um cubo que pode ter entre 5 pés (1,5 metros) e 100 pés (30 metros) de lado. A magia dura enquanto durar a sua duração ou até usar uma ação para a dissipar.\nQuando conjura a magia, decide que tipo de segurança ela proporciona, escolhendo uma ou várias das seguintes propriedades:\n• O som não consegue atravessar a barreira nos limites da área protegida.\n• A barreira da área protegida parece escura e enevoada, impedindo a visão (incluindo visão no escuro) através dela.\n• Sensores criados por magias de adivinhação não podem surgir dentro da área protegida nem atravessar a barreira no seu perímetro.\n• As criaturas na área não podem ser escolhidas como alvo de magias de adivinhação.\n• Nada pode teletransportar-se para dentro ou para fora da área protegida.\n• As viagens planares são bloqueadas dentro da área protegida.\nConjurar esta magia no mesmo local todos os dias durante um ano torna este efeito permanente.","h":"Quando conjura esta magia usando um espaço de magia de 5.º nível ou superior, pode aumentar o tamanho do cubo em 100 pés (30 metros) por cada nível do espaço acima do 4.º. Assim, pode proteger um cubo com até 200 pés (60 metros) de lado usando um espaço de magia de 5.º nível."},{"n":"Tempestade de Granizo (Ice Storm)","l":4,"s":"Evocação","c":["Druida","Feiticeiro","Mago"],"t":"1 ação","r":"300 pés (91,4 metros)","d":"Instantânea","k":"V, S, M (Uma pitada de pó e algumas gotas de água)","cc":false,"rt":false,"x":"Uma chuva de gelo duro como pedra atinge o solo num cilindro com 20 pés (6 metros) de raio e 40 pés (12 metros) de altura, centrado num ponto dentro do alcance. Cada criatura no cilindro deve fazer um teste de resistência de Destreza. Uma criatura sofre 2d8 de dano contundente e 4d6 de dano de frio se falhar, ou metade desse dano se for bem-sucedida.\nAs pedras de granizo transformam a área da tempestade em terreno difícil até ao final do seu próximo turno.","h":"Quando conjura esta magia usando um espaço de magia de 5º nível ou superior, o dano contundente aumenta em 1d8 por cada nível do espaço acima do 4º."},{"n":"Tentáculos Negros","l":4,"s":"Conjuração","c":["Mago"],"t":"1 ação","r":"90 pés (27 metros)","d":"Até 1 minuto","k":"V, S, M (Um pedaço de tentáculo de um polvo gigante ou de uma lula gigante)","cc":true,"rt":false,"x":"Tentáculos de ébano contorcidos preenchem um quadrado de 20 pés (6 metros) no chão que possa ver dentro do alcance. Pela duração, estes tentáculos transformam o chão da área em terreno difícil.\nQuando uma criatura entra na área afetada pela primeira vez num turno ou começa o seu turno lá, a criatura deve ser bem-sucedida num teste de resistência de Destreza ou sofre 3d6 de dano de concussão e fica impedida pelos tentáculos até a magia terminar. Uma criatura que comece o seu turno na área e já esteja impedida pelos tentáculos sofre 3d6 de dano de concussão.\nUma criatura impedida pelos tentáculos pode usar a sua ação para fazer um teste de Força ou Destreza (à sua escolha) contra a sua CD de salvamento de magia. Num sucesso, ela liberta-se.","h":""},{"n":"Terreno Alucinatório","l":4,"s":"Ilusão","c":["Bardo","Druida","Mago"],"t":"10 minutos","r":"90 metros","d":"24 horas","k":"V, S, M (Uma pedra, um raminho e um pedaço de folha verde)","cc":false,"rt":false,"x":"Você faz um terreno natural em um cubo de 45 metros no alcance, parecer, soar e cheirar como algum outro tipo de terreno natural. Assim, campos abertos ou uma estrada podem ser feitos para se assemelhar a um pântano, colina, fenda, ou algum outro terreno difícil ou intransitável. Uma lagoa pode ser feita para parecer um campo gramado, um precipício como uma encosta suave, ou um barranco coberto de rochas como uma estrada larga. Estruturas fabricadas, equipamentos, e criaturas dentro da área não são disfarçados de aparência. As características táteis do terreno permanecem inalteradas, então as criaturas que entrarem na área provavelmente verão através da ilusão. Se a diferença não for aparente pelo toque, uma criatura inspecionando cuidadosamente a ilusão pode tentar um teste de Inteligência (Investigação) contra a CD das suas magias, para não ser enganada. Se uma criatura discernir a ilusão por ela mesma, a ilusão torna-se translúcida para a criatura, para ela as propriedades da ilusão são dissipadas.","h":""},{"n":"Animar Objetos","l":5,"s":"Transmutação","c":["Bardo","Feiticeiro","Mago"],"t":"1 ação","r":"120 pés (36 metros)","d":"Até 1 minuto","k":"V, S","cc":true,"rt":false,"x":"Os objetos ganham vida ao seu comando. Escolha até dez objetos não mágicos dentro do alcance que não estejam a ser vestidos ou carregados. Alvos Médios contam como dois objetos, Grandes contam como quatro objetos, Enormes contam como oito objetos. Não pode animar nenhum objeto maior do que Enorme. Cada alvo anima-se e torna-se uma criatura sob o seu controlo até que a magia termine ou até ser reduzido a 0 pontos de vida.\nComo uma ação bónus, pode comandar mentalmente qualquer criatura que tenha criado com esta magia se a criatura estiver a até 500 pés (150 metros) de si (se controlar várias criaturas, pode comandar qualquer uma ou todas elas ao mesmo tempo, emitindo o mesmo comando para cada uma). Decide que ação a criatura tomará e para onde se moverá durante o seu próximo turno, ou pode emitir um comando geral, como guardar uma câmara ou corredor em particular. Se não emitir comandos, a criatura apenas se defende contra criaturas hostis. Depois de receber uma ordem, a criatura continua a segui-la até que a sua tarefa seja concluída.\nUm objeto animado é um constructo com CA, pontos de vida, ataques, Força e Destreza determinados pelo seu tamanho. A sua Constituição é 10, a sua Inteligência e Sabedoria são 3 e o seu Carisma é 1. O seu deslocamento é de 30 pés (9 metros); se o objeto não tiver pernas ou outros apêndices que possa usar para locomoção, tem em vez disso um deslocamento de voo de 30 pés e pode pairar. Se o objeto estiver fixo a uma superfície ou a um objeto maior, como uma corrente presa a uma parede, o seu deslocamento é 0. Tem visão às cegas com um raio de 30 pés (9 metros) e é cego para além dessa distância. Quando o objeto animado cai para 0 pontos de vida, reverte para a sua forma de objeto original e qualquer dano restante transita para a sua forma de objeto original.\nSe comandar um objeto para atacar, ele pode fazer um único ataque corpo-a-corpo contra uma criatura a até 5 pés (1,5 metros) de si. Ele faz um ataque de pancada com um bónus de ataque e dano de concussão determinados pelo seu tamanho. O DM pode decidir que um objeto específico causa dano cortante ou perfurante com base na sua forma.","h":"Se conjurar esta magia usando um espaço de magia de 6º nível ou superior, pode animar dois objetos adicionais para cada nível do espaço acima do 5º."},{"n":"Aparência","l":5,"s":"Ilusão","c":["Bardo","Feiticeiro","Mago"],"t":"1 ação","r":"30 pés (9 metros)","d":"8 horas","k":"V, S","cc":false,"rt":false,"x":"Esta magia permite-te alterar a aparência de qualquer número de criaturas que consigas ver dentro do alcance. Concedes a cada alvo escolhido uma nova aparência ilusória. Um alvo que não queira ser afetado pode realizar uma salvaguarda de Carisma; se for bem-sucedido, não é afetado pela magia.\nA magia disfarça a aparência física, bem como as roupas, armaduras, armas e equipamento. Podes fazer cada criatura parecer até 1 pé (30 centímetros) mais baixa ou mais alta e fazê-la parecer magra, gorda ou algo intermédio. Não podes alterar o tipo de corpo de um alvo, pelo que tens de escolher uma forma com a mesma disposição básica de membros. Nos restantes aspetos, a extensão da ilusão fica ao teu critério. A magia dura durante o período indicado, a menos que uses a tua ação para a terminar mais cedo.\nAs alterações criadas por esta magia não resistem a uma inspeção física. Por exemplo, se usares a magia para acrescentar um chapéu à roupa de uma criatura, os objetos atravessam o chapéu e qualquer pessoa que lhe toque não sente nada ou sente a cabeça e o cabelo da criatura. Se usares a magia para pareceres mais magro, a mão de alguém que tente tocar-te embaterá no teu corpo, embora aparentemente ainda estivesse no ar.\nUma criatura pode usar a sua ação para inspecionar um alvo e realizar um teste de Inteligência (Investigação) contra a CD das tuas magias. Se for bem-sucedida, percebe que o alvo está disfarçado.","h":""},{"n":"Aprisionamento Planar","l":5,"s":"Abjuração","c":["Bardo","Clérigo","Druida","Mago"],"t":"1 hora","r":"60 pés (18 metros)","d":"24 horas","k":"V, S, M (Uma joia no valor mínimo de 1.000 po, que a magia consome)","cc":false,"rt":false,"x":"Com esta magia, tenta vincular um celestial, elemental, fada ou corruptor ao seu serviço. A criatura tem de estar dentro do alcance durante toda a conjuração da magia. (Normalmente, a criatura é primeiro invocada para o centro de um círculo mágico invertido, de modo a mantê-la presa enquanto esta magia é conjurada.) No final da conjuração, o alvo tem de realizar um teste de resistência de Carisma. Se falhar, fica vinculado a servi-lo durante a duração. Se a criatura tiver sido invocada ou criada por outra magia, a duração dessa magia é prolongada para corresponder à duração desta magia.\nUma criatura vinculada tem de seguir as suas instruções da melhor forma que conseguir. Pode ordenar-lhe que o acompanhe numa aventura, guarde um local ou entregue uma mensagem. A criatura obedece ao sentido literal das suas instruções, mas, se lhe for hostil, tentará distorcer as suas palavras para alcançar os seus próprios objetivos. Se a criatura cumprir completamente as suas instruções antes de a magia terminar, desloca-se até si para informar desse facto, caso estejam no mesmo plano de existência. Se estiverem em planos diferentes, regressa ao local onde a vinculou e permanece aí até a magia terminar.","h":"Quando conjura esta magia usando um espaço de magia de nível superior, a duração aumenta para 10 dias com um espaço de 6.º nível, 30 dias com um espaço de 7.º nível, 180 dias com um espaço de 8.º nível e um ano e um dia com um espaço de 9.º nível."},{"n":"Casulo Antivida","l":5,"s":"Abjuração","c":["Druida"],"t":"1 ação","r":"Pessoal","d":"Até 1 hora","k":"V, S","cc":true,"rt":false,"x":"Uma barreira cintilante estende-se a partir de si num raio de 10 pés (3 metros) e move-se consigo, permanecendo centrada em si e barrando a passagem a criaturas que não sejam mortos-vivos e constructos. A barreira dura pela duração da magia.\nA barreira impede que uma criatura afetada passe ou alcance através dela. Uma criatura afetada pode conjurar magias ou fazer ataques com armas à distância ou de alcance através da barreira.\nSe se mover de forma a forçar uma criatura afetada a passar pela barreira, a magia termina.","h":""},{"n":"Círculo de Teletransporte","l":5,"s":"Conjuração","c":["Bardo","Feiticeiro","Mago"],"t":"1 minuto","r":"10 pés (3 metros)","d":"1 rodada","k":"V, M (Gizes raros e tintas impregnados com gemas preciosas no valor de 50 po, que a magia consome)","cc":false,"rt":false,"x":"Ao conjurares a magia, desenhas no chão um círculo com 10 pés (3 metros) de diâmetro, inscrito com sigilos que ligam a tua localização a um círculo de teletransporte permanente à tua escolha, cuja sequência de sigilos conheças e que esteja no mesmo plano de existência que tu. Um portal cintilante abre-se dentro do círculo que desenhaste e permanece aberto até ao final do teu próximo turno. Qualquer criatura que entre no portal surge instantaneamente a até 5 pés (1,5 metros) do círculo de destino ou no espaço desocupado mais próximo, caso esse espaço esteja ocupado.\nMuitos templos importantes, guildas e outros locais relevantes têm círculos de teletransporte permanentes inscritos algures nas suas instalações. Cada um desses círculos inclui uma sequência de sigilos única — um conjunto de runas mágicas dispostas num padrão específico. Quando ganhas pela primeira vez a capacidade de conjurar esta magia, aprendes as sequências de sigilos de dois destinos no Plano Material, determinados pelo Mestre. Podes aprender sequências de sigilos adicionais durante as tuas aventuras. Podes memorizar uma nova sequência de sigilos depois de a estudares durante 1 minuto.\nPodes criar um círculo de teletransporte permanente conjurando esta magia no mesmo local todos os dias durante um ano. Não precisas de usar o círculo para te teletransportares quando conjuras a magia desta forma.","h":""},{"n":"Coluna de Chamas","l":5,"s":"Evocação","c":["Clérigo"],"t":"1 ação","r":"18 metros","d":"Instantânea","k":"V, S, M (Uma pitada de enxofre)","cc":false,"rt":false,"x":"Uma coluna vertical de fogo divino ruge dos céus em um local que você especificar. Cada criatura em um cilindro de 3 metros de raio e 12 metros de altura centrado em um ponto dentro do alcance deve fazer um teste de resistência de Destreza. Uma criatura sofre 4d6 de dano de fogo e 4d6 de dano radiante em uma falha, ou metade desse dano em um sucesso.","h":"Quando você conjura esta magia usando um espaço de magia de 6º nível ou superior, o dano de fogo ou o dano radiante (à sua escolha) aumenta em 1d6 para cada nível do espaço acima do 5º."},{"n":"Comunhão","l":5,"s":"Adivinhação","c":["Clérigo"],"t":"1 minuto","r":"Pessoal","d":"1 minuto","k":"V, S, M (Incenso e um frasco de água benta ou profana)","cc":false,"rt":true,"x":"Contacta a sua divindade ou um procurador divino e faz até três perguntas que podem ser respondidas com um sim ou não. Deve fazer as suas perguntas antes da magia terminar. Recebe uma resposta correta para cada pergunta.\nSeres divinos não são necessariamente omniscientes, por isso pode receber um \"pouco claro\" como resposta se uma pergunta se referir a informações que estão além do conhecimento da divindade. Num caso em que uma resposta de uma palavra possa ser enganadora ou contrária aos interesses da divindade, o DM pode oferecer uma frase curta como resposta em vez disso.\nSe conjurar a magia duas ou mais vezes antes de terminar o seu próximo descanso longo, há uma probabilidade cumulativa de 25 por cento por cada conjuração após a primeira de não obter nenhuma resposta. O DM faz esta rolagem em segredo.","h":""},{"n":"Comunhão com a Natureza","l":5,"s":"Adivinhação","c":["Druida","Patrulheiro"],"t":"1 minuto","r":"Pessoal","d":"Instantânea","k":"V, S","cc":false,"rt":true,"x":"Torna-se brevemente um com a natureza e ganha conhecimento do território circundante. Ao ar livre, a magia dá-lhe conhecimento do terreno num raio de 3 milhas (4,8 km) de si. Em cavernas e noutros ambientes subterrâneos naturais, o raio é limitado a 300 pés (90 metros). A magia não funciona onde a natureza foi substituída por construção, como em masmorras e vilas.\nGanha instantaneamente conhecimento de até três factos à sua escolha sobre qualquer um dos seguintes assuntos, à medida que se relacionam com a área:\n- terreno e massas de água\n- plantas, minerais, animais ou povos prevalentes\n- celestiais, seres feéricos, corruptores, elementais ou mortos-vivos poderosos\n- influência de outros planos de existência\n- edifícios\nPor exemplo, poderia determinar a localização de mortos-vivos poderosos na área, a localização das principais fontes de água potável segura e a localização de quaisquer vilas próximas.","h":""},{"n":"Cone de Frio","l":5,"s":"Evocação","c":["Feiticeiro","Mago"],"t":"1 ação","r":"Pessoal","d":"Instantânea","k":"V, S, M (Um pequeno cone de cristal ou vidro)","cc":false,"rt":false,"x":"Uma explosão de ar frio irrompe das suas mãos. Cada criatura num cone de 60 pés (18 metros) deve fazer um teste de resistência de Constituição. Uma criatura sofre 8d8 de dano de frio num teste falhado, ou metade do dano num teste bem-sucedido.\nUma criatura morta por esta magia torna-se uma estátua congelada até descongelar.","h":"Quando conjura esta magia usando um espaço de magia de 6º nível ou superior, o dano aumenta em 1d8 para cada nível do espaço acima do 5º."},{"n":"Conhecimento das Lendas","l":5,"s":"Adivinhação","c":["Bardo","Clérigo","Mago"],"t":"10 minutos","r":"Pessoal","d":"Instantânea","k":"V, S, M (Incenso com valor de 250 po, que a magia consome, e quatro barras de marfim com valor de 50 po cada)","cc":false,"rt":false,"x":"Nomeie ou descreva uma pessoa, lugar ou objeto. A magia traz à sua mente informações breves e resumidas sobre aquilo que nomeou. As informações podem ser apresentadas como relatos de história esquecida ou até como segredos nunca revelados. Se aquilo que nomeou não tiver importância lendária, não obtém qualquer informação. Quanto mais informações já possuir sobre aquilo que nomeou, mais precisas e detalhadas serão as informações que receber.\nO que aprende é exato, mas pode estar oculto em linguagem figurada. Por exemplo, se tiver na mão um machado mágico misterioso, a magia pode revelar a seguinte informação: «Ai dos perversos que empunham este machado, pois o cabo escolhe os seus portadores. Apenas um verdadeiro filho da pedra magnética, amado por Moradin, poderá despertar o verdadeiro poder deste machado, e apenas com a palavra sagrada Rudnogg nos lábios.»","h":""},{"n":"Conjurar Elemental","l":5,"s":"Conjuração","c":["Druida","Mago"],"t":"1 minuto","r":"90 pés (27 metros)","d":"Até 1 hora","k":"V, S, M (Incenso a arder para o ar, argila mole para a terra, enxofre e fósforo para o fogo, ou água e areia para a água)","cc":true,"rt":false,"x":"Chama um servo elemental. Escolha uma área de ar, terra, fogo ou água que preencha um cubo de 10 pés (3 metros) dentro do alcance. Um elemental de nível de desafio 5 ou inferior apropriado para a área que escolheu aparece num espaço desocupado a até 10 pés dela. Por exemplo, um elemental do fogo emerge de uma fogueira, e um elemental da terra ergue-se do chão. O elemental desaparece quando cai para 0 pontos de vida ou quando a magia termina.\nO elemental é amigável consigo e com os seus companheiros pela duração. Role iniciativa para o elemental, que tem os seus próprios turnos. Ele obedece a quaisquer comandos verbais que lhe dê (nenhuma ação requerida da sua parte). Se não der nenhuns comandos ao elemental, ele defende-se de criaturas hostis, mas de resto não toma ações.\nSe a sua concentração for quebrada, o elemental não desaparece. Em vez disso, perde o controlo do elemental, ele torna-se hostil em relação a si e aos seus companheiros, e pode atacar. Um elemental descontrolado não pode ser dissipado por si, e desaparece 1 hora depois de o ter invocado.\nO DM tem as estatísticas do elemental.","h":"Quando conjura esta magia usando um espaço de magia de 6º nível ou superior, o nível de desafio aumenta em 1 para cada nível do espaço acima do 5º."},{"n":"Consagrar","l":5,"s":"Evocação","c":["Clérigo"],"t":"24 horas","r":"Toque","d":"Até ser dissipada","k":"V, S, M (Ervas, óleos e incensos que valham, no mínimo, 1.000 po, que são consumidos)","cc":false,"rt":false,"x":"Você toca um ponto e preenche uma área com energia divina até um raio de 18 metros a partir do ponto. A área é consagrada ou profanada (à sua escolha) enquanto a magia durar. Nenhum celestial, corruptor ou morto-vivo pode entrar na área e eles não podem enfeitiçar, assustar, nem possuir criaturas dentro dela. Além disso, qualquer criatura enfeitiçada, assustada ou possuída por essas criaturas não é mais afetada enquanto estiver na área. Você pode amarrar um efeito extra na área. Escolha o efeito da lista a seguir, ou o Mestre pode oferecer outros. Alguns destes efeitos aplicam-se a criaturas, que podem fazer um teste de resistência de Carisma para resistir. Você decide se afeta todas as criaturas, criaturas que seguem uma divindade ou líder específico, ou criaturas de um tipo específico (como orcs ou trolls).\nCoragem: As criaturas afetadas não podem ficar assustadas.\nEscuridão: A escuridão preenche a área. Iluminação normal ou luz mágica criada por magias de nível inferior ao desta não pode iluminar a área.\nLuz Diurna: Luz brilhante preenche a área. Escuridão mágica criada por magias de nível inferior ao desta não pode escurecer a área.\nEnergia Protegida: As criaturas afetadas ganham resistência a um tipo de dano de sua escolha.\nDescanso Eterno: Cadáveres enterrados na área não podem ser transformados em mortos-vivos.\nVulnerabilidade Extradimensional: As criaturas afetadas ganham desvantagem em testes de resistência contra magias que tentem bani-las.\nProteção de Magia: As criaturas afetadas não são mais imunes ou resistentes à magia (se houver alguma).\nProteção Contra a Morte: As criaturas afetadas que caírem a 0 pontos de vida na área ficam com 1 ponto de vida em vez disso. O efeito só funciona uma vez.","h":""},{"n":"Contactar Outro Plano","l":5,"s":"Adivinhação","c":["Bruxo","Mago"],"t":"1 minuto","r":"Pessoal","d":"1 minuto","k":"V","cc":false,"rt":true,"x":"Contacta mentalmente um semideus, o espírito de um sábio há muito morto, ou alguma outra entidade misteriosa de outro plano. Contactar esta inteligência extraplanar pode sobrecarregar ou mesmo quebrar a sua mente. Quando conjura esta magia, faça um teste de resistência de Inteligência CD 15. Num fracasso, sofre 6d6 de dano psíquico e fica insano até terminar um descanso longo. Enquanto estiver insano, não pode tomar ações, não consegue compreender o que as outras criaturas dizem, não consegue ler e fala apenas jargão. Uma magia restauração maior conjurada sobre si termina este efeito.\nNum salvamento bem-sucedido, pode fazer à entidade até cinco perguntas. Deve fazer as suas perguntas antes da magia terminar. O DM responde a cada pergunta com uma palavra, como \"sim\", \"não\", \"talvez\", \"nunca\", \"irrelevante\" ou \"pouco claro\" (se a entidade não souber a resposta à pergunta). Se uma resposta de uma palavra puder ser enganadora, o DM pode, em alternativa, oferecer uma frase curta como resposta.","h":""},{"n":"Contágio","l":5,"s":"Necromancia","c":["Clérigo","Druida"],"t":"1 ação","r":"Toque","d":"7 dias","k":"V, S","cc":false,"rt":false,"x":"O seu toque inflige doença. Faça um ataque de magia corpo-a-corpo contra uma criatura ao seu alcance. Num acerto, aflige a criatura com uma doença à sua escolha de entre as descritas abaixo.\nNo final de cada um dos turnos do alvo, ele deve fazer um teste de resistência de Constituição. Depois de falhar três destes testes de resistência, os efeitos da doença duram pela duração, e a criatura deixa de fazer estes testes. Depois de ser bem-sucedida em três destes testes de resistência, a criatura recupera da doença, e a magia termina.\nVisto que esta magia induz uma doença natural no seu alvo, qualquer efeito que remova uma doença ou melhore de outra forma os efeitos de uma doença aplica-se a ela.\nDoença Cegante. A dor apodera-se da mente da criatura, e os seus olhos tornam-se brancos e leitosos. A criatura tem desvantagem em testes de Sabedoria e testes de resistência de Sabedoria e fica cega.\nFebre Imunda. Uma febre furiosa varre o corpo da criatura. A criatura tem desvantagem em testes de Força, testes de resistência de Força e rolagens de ataque que usam Força.\nPodridão da Carne. A carne da criatura decompõe-se. A criatura tem desvantagem em testes de Carisma e vulnerabilidade a todo o dano.\nFogo Mental. A mente da criatura fica febril. A criatura tem desvantagem em testes de Inteligência e testes de resistência de Inteligência, e a criatura comporta-se como se estivesse sob os efeitos da magia confusão durante o combate.\nConvulsão. A criatura é dominada por tremores. A criatura tem desvantagem em testes de Destreza, testes de resistência de Destreza e rolagens de ataque que usam Destreza.\nPerdição Pegajosa. A criatura começa a sangrar incontrolavelmente. A criatura tem desvantagem em testes de Constituição e testes de resistência de Constituição. Além disso, sempre que a criatura sofre dano, fica atordoada até ao fim do seu próximo turno.","h":""},{"n":"Criação","l":5,"s":"Ilusão","c":["Feiticeiro","Mago"],"t":"1 minuto","r":"30 pés (9 metros)","d":"Especial","k":"V, S, M (Um pequeno pedaço de matéria do mesmo tipo do item que planeia criar)","cc":false,"rt":false,"x":"Puxa fios de material sombrio do Pendor das Sombras para criar um objeto não vivo de matéria vegetal dentro do alcance: bens moles, corda, madeira ou algo semelhante. Pode também usar esta magia para criar objetos minerais como pedra, cristal ou metal. O objeto criado não deve ser maior do que um cubo de 5 pés (1,5 metros), e o objeto deve ter uma forma e material que já tenha visto antes.\nA duração depende do material do objeto. Se o objeto for composto por múltiplos materiais, use a duração mais curta.\nMatéria vegetal. 1 dia\nPedra ou cristal. 12 horas\nMetais preciosos. 1 hora\nGemas. 10 minutos\nAdamante ou mithral. 1 minuto\nO uso de qualquer material criado por esta magia como componente material de outra magia faz com que essa magia falhe.","h":"Quando conjura esta magia usando um espaço de magia de 6º nível ou superior, o cubo aumenta em 5 pés (1,5 metros) para cada nível do espaço acima do 5º."},{"n":"Curar Ferimentos em Massa","l":5,"s":"Conjuração","c":["Bardo","Clérigo","Druida"],"t":"1 ação","r":"60 pés (18,3 metros)","d":"Instantânea","k":"V, S","cc":false,"rt":false,"x":"Uma onda de energia curativa irradia de um ponto à sua escolha dentro do alcance. Escolha até seis criaturas numa esfera com 30 pés (9 metros) de raio centrada nesse ponto. Cada alvo recupera pontos de vida iguais a 3d8 + o seu modificador de atributo de conjuração. Esta magia não tem efeito sobre mortos-vivos ou constructos.","h":"Quando conjura esta magia usando um espaço de magia de 6.º nível ou superior, a cura aumenta em 1d8 por cada nível do espaço acima do 5.º."},{"n":"Desorientar","l":5,"s":"Ilusão","c":["Bardo","Mago"],"t":"1 ação","r":"Pessoal","d":"Até 1 hora","k":"S","cc":true,"rt":false,"x":"Fica invisível ao mesmo tempo que uma duplicata ilusória sua aparece no local onde se encontra. A duplicata dura enquanto durar a magia, mas a invisibilidade termina se atacar ou conjurar uma magia.\nPode usar a sua ação para mover a duplicata ilusória até ao dobro da sua velocidade e fazê-la gesticular, falar e comportar-se da forma que desejar.\nPode ver através dos olhos da duplicata e ouvir através dos seus ouvidos como se estivesse no local onde ela se encontra. Em cada um dos seus turnos, pode usar uma ação bónus para alternar entre utilizar os sentidos da duplicata e os seus próprios sentidos. Enquanto utilizar os sentidos da duplicata, fica cego e surdo em relação ao que o rodeia.","h":""},{"n":"Despertar","l":5,"s":"Transmutação","c":["Bardo","Druida"],"t":"8 horas","r":"Toque","d":"Instantânea","k":"V, S, M (Uma ágata no valor de pelo menos 1.000 po, que a magia consome)","cc":false,"rt":false,"x":"Depois de passar o tempo de conjuração a traçar caminhos mágicos dentro de uma pedra preciosa, toca numa besta ou planta Enorme ou menor. O alvo não deve ter um valor de Inteligência ou ter uma Inteligência de 3 ou menos. O alvo ganha uma Inteligência de 10. O alvo também ganha a capacidade de falar uma língua que você conheça. Se o alvo for uma planta, ganha a capacidade de mover os seus membros, raízes, vinhas, trepadeiras e afins, e ganha sentidos semelhantes aos de um humano. O seu DM escolhe as estatísticas apropriadas para a planta despertada, como as estatísticas de um arbusto despertado ou de uma árvore despertada.\nA besta ou planta despertada fica encantada por si durante 30 dias ou até que você ou os seus companheiros lhe façam algo prejudicial. Quando a condição de encantado termina, a criatura despertada escolhe se permanece amigável consigo, com base na forma como a tratou enquanto esteve encantada.","h":""},{"n":"Dissipar o Bem e o Mal","l":5,"s":"Abjuração","c":["Clérigo","Paladino"],"t":"1 ação","r":"Pessoal","d":"Até 1 minuto","k":"V, S, M (Água benta ou prata e ferro em pó)","cc":true,"rt":false,"x":"Energia cintilante envolve-o e protege-o de seres feéricos, mortos-vivos e criaturas originárias de fora do Plano Material. Pela duração, celestiais, elementais, seres feéricos, corruptores e mortos-vivos têm desvantagem nas rolagens de ataque contra si.\nPode terminar a magia antecipadamente usando qualquer uma das seguintes funções especiais.\nQuebrar Encantamento. Como a sua ação, toca numa criatura ao seu alcance que esteja encantada, assustada ou possuída por um celestial, elemental, ser feérico, corruptor ou morto-vivo. A criatura em que toca deixa de estar encantada, assustada ou possuída por tais criaturas.\nExpulsão. Como a sua ação, faça um ataque de magia corpo-a-corpo contra um celestial, elemental, ser feérico, corruptor ou morto-vivo ao seu alcance. Num acerto, tenta enviar a criatura de volta para o seu plano natal. A criatura deve ser bem-sucedida num teste de resistência de Carisma ou é enviada de volta para o seu plano natal (se não estiver lá já). Se não estiverem no seu plano natal, mortos-vivos são enviados para o Pendor das Sombras, e seres feéricos são enviados para a Agrestia Feérica.","h":""},{"n":"Dominar Pessoa","l":5,"s":"Encantamento","c":["Bardo","Feiticeiro","Mago"],"t":"1 ação","r":"60 pés (18 metros)","d":"Até 1 minuto","k":"V, S","cc":true,"rt":false,"x":"Tenta seduzir um humanoide que possa ver dentro do alcance. Ele deve ser bem-sucedido num teste de resistência de Sabedoria ou ficará encantado por si pela duração. Se você ou criaturas amigáveis estiverem a lutar contra ele, ele tem vantagem no teste de resistência.\nEnquanto o alvo estiver encantado, tem uma ligação telepática com ele desde que ambos estejam no mesmo plano de existência. Pode usar esta ligação telepática para emitir comandos à criatura enquanto estiver consciente (nenhuma ação requerida), que ela faz o seu melhor para obedecer. Pode especificar um curso de ação simples e geral, como \"Ataca aquela criatura\", \"Corre para ali\" ou \"Traz aquele objeto\". Se a criatura completar a ordem e não receber mais instruções suas, defende-se e preserva-se da melhor forma possível.\nPode usar a sua ação para assumir o controlo total e preciso do alvo. Até ao fim do seu próximo turno, a criatura toma apenas as ações que escolher e não faz nada que não permita. Durante este tempo pode também fazer com que a criatura use uma reação, mas isso requer que use também a sua própria reação.\nDe cada vez que o alvo sofre dano, faz um novo teste de resistência de Sabedoria contra a magia. Se o teste for bem-sucedido, a magia termina.","h":"Quando conjura esta magia usando um espaço de magia de 6º nível, a duração é de concentração, até 10 minutos. Quando usa um espaço de magia de 7º nível, a duração é de concentração, até 1 hora. Quando usa um espaço de magia de 8º nível ou superior, a duração é de concentração, até 8 horas."},{"n":"Imobilizar Monstro","l":5,"s":"Encantamento","c":["Bardo","Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"27 metros","d":"1 minuto","k":"V, S, M (Um pequeno pedaço reto de ferro)","cc":true,"rt":false,"x":"Escolha uma criatura que você possa ver no alcance. O alvo deve ser bem-sucedido num teste de resistência de Sabedoria ou ficará paralisado por toda a duração. A magia não tem efeito em mortos-vivos. No final de cada um dos turnos do alvo, ele pode fazer outro teste de resistência de Sabedoria. Se falhar, a magia continua nele, e se tiver sucesso, a magia se encerra no alvo.","h":"Quando você conjurar esta magia usando um espaço de magia de 6º nível ou superior, você pode focar numa criatura adicional para cada nível de espaço acima do 5º. As criaturas devem estar até 9 metros umas das outras quando você for afetá-las."},{"n":"Mão Arcana","l":5,"s":"Evocação","c":["Mago"],"t":"1 ação","r":"120 pés (36 metros)","d":"Até 1 minuto","k":"V, S, M (Uma casca de ovo e uma luva de pele de cobra)","cc":true,"rt":false,"x":"Cria uma mão Grande de força cintilante e translúcida num espaço desocupado que possa ver dentro do alcance. A mão dura pela duração da magia, e move-se ao seu comando, imitando os movimentos da sua própria mão.\nA mão é um objeto que tem CA 20 e pontos de vida iguais ao seu máximo de pontos de vida. Se cair para 0 pontos de vida, a magia termina. Tem uma Força de 26 (+8) e uma Destreza de 10 (+0). A mão não preenche o seu espaço.\nQuando conjura a magia e como uma ação bónus nos seus turnos subsequentes, pode mover a mão até 60 pés (18 metros) e depois causar um dos seguintes efeitos com ela.\nPunho Cerrado. A mão ataca uma criatura ou objeto a até 5 pés (1,5 metros) dela. Faça um ataque de magia corpo-a-corpo com a mão usando as suas estatísticas de jogo. Num acerto, o alvo sofre 4d8 de dano de força.\nMão Empurradora. A mão tenta empurrar uma criatura a até 5 pés dela numa direção à sua escolha. Faça um teste com a Força da mão disputado pelo teste de Força (Atletismo) do alvo. Se o alvo for Médio ou menor, tem vantagem no teste. Se for bem-sucedido, a mão empurra o alvo até 5 pés mais um número de pés igual a cinco vezes o seu modificador de habilidade de conjuração. A mão move-se com o alvo para permanecer a até 5 pés dele.\nMão Agarradora. A mão tenta agarrar uma criatura Enorme ou menor a até 5 pés dela. Usa o valor de Força da mão para resolver o agarrão. Se o alvo for Médio ou menor, tem vantagem no teste. Enquanto a mão estiver a agarrar o alvo, pode usar uma ação bónus para fazer com que a mão o esmague. Ao fazê-lo, o alvo sofre dano de concussão igual a 2d6 + o seu modificador de habilidade de conjuração.\nMão Interposta. A mão interpõe-se entre si e uma criatura à sua escolha até dar um comando diferente à mão. A mão move-se para se manter entre si e o alvo, fornecendo-lhe meia cobertura contra o alvo. O alvo não se pode mover através do espaço da mão se o seu valor de Força for inferior ou igual ao valor de Força da mão. Se o seu valor de Força for superior ao valor de Força da mão, o alvo pode mover-se na sua direção através do espaço da mão, mas esse espaço é terreno difícil para o alvo.","h":"Quando conjura esta magia usando um espaço de magia de 6º nível ou superior, o dano da opção punho cerrado aumenta em 2d8 e o dano da mão agarradora aumenta em 2d6 para cada nível do espaço acima do 5º."},{"n":"Missão","l":5,"s":"Encantamento","c":["Bardo","Clérigo","Druida","Paladino","Mago"],"t":"1 minuto","r":"18 metros","d":"30 dias","k":"V","cc":false,"rt":false,"x":"Você impõe um comando mágico a uma criatura que você possa ver dentro do alcance, forçando-a a realizar algum serviço ou a se abster de alguma ação ou curso de atividade conforme você decidir. Se a criatura puder entendê-lo, ela deve ser bem-sucedida em um teste de resistência de Sabedoria ou ficará enfeitiçada por você pela duração. Enquanto a criatura estiver enfeitiçada por você, ela sofre 5d10 de dano psíquico cada vez que agir de maneira diretamente contrária às suas instruções, mas não mais do que uma vez por dia. Uma criatura que não possa entendê-lo não é afetada pela magia.\nVocê pode emitir qualquer comando que escolher, exceto uma atividade que resultaria em morte certa. Se você emitir um comando suicida, a magia termina.\nVocê pode terminar a magia mais cedo usando uma ação para dissipá-la. Uma magia remover maldição, restauração maior ou desejo também a termina.","h":"Quando você conjura esta magia usando um espaço de magia de 7º ou 8º nível, a duração é de 1 ano. Quando você conjura esta magia usando um espaço de magia de 9º nível, a magia dura até ser terminada por uma das magias mencionadas acima."},{"n":"Modificar Memória","l":5,"s":"Encantamento","c":["Bardo","Mago"],"t":"1 ação","r":"30 pés (9,1 metros)","d":"Até 1 minuto","k":"V, S","cc":true,"rt":false,"x":"Tenta remodelar as memórias de outra criatura. Uma criatura que consiga ver deve realizar um teste de resistência de Sabedoria. Se estiver a lutar contra a criatura, esta tem vantagem no teste de resistência. Se falhar, o alvo fica enfeitiçado por si durante a duração. O alvo enfeitiçado fica incapacitado e não tem consciência do que o rodeia, embora ainda consiga ouvi-lo. Se sofrer qualquer dano ou for alvo de outra magia, esta magia termina e nenhuma das memórias do alvo é modificada.\nEnquanto este encantamento durar, pode afetar a memória do alvo relativamente a um acontecimento que tenha vivido nas últimas 24 horas e que não tenha durado mais de 10 minutos. Pode apagar permanentemente toda a memória do acontecimento, permitir que o alvo se recorde dele com perfeita clareza e detalhe rigoroso, alterar a sua memória dos pormenores do acontecimento ou criar uma memória de outro acontecimento.\nTem de falar com o alvo para descrever como as suas memórias serão afetadas, e este tem de conseguir compreender a sua língua para que as memórias modificadas se fixem. A mente do alvo preenche quaisquer lacunas nos pormenores da sua descrição. Se a magia terminar antes de concluir a descrição das memórias modificadas, a memória da criatura não é alterada. Caso contrário, as memórias modificadas fixam-se quando a magia termina.\nUma memória modificada não afeta necessariamente o comportamento de uma criatura, sobretudo se a memória contradisser as inclinações naturais, o alinhamento ou as crenças da criatura. Uma memória modificada ilógica, como implantar a memória de quanto a criatura gostou de se encharcar em ácido, é descartada, talvez como um pesadelo. O Mestre pode considerar que uma memória modificada é demasiado absurda para afetar significativamente uma criatura.\nUma magia de remover maldição ou restauração maior conjurada sobre o alvo restaura as memórias verdadeiras da criatura.","h":"Se conjurar esta magia usando um espaço de magia de 6.º nível ou superior, pode alterar as memórias do alvo relativamente a um acontecimento ocorrido até 7 dias atrás (6.º nível), 30 dias atrás (7.º nível), 1 ano atrás (8.º nível) ou em qualquer momento do passado da criatura (9.º nível)."},{"n":"Muralha de Força","l":5,"s":"Evocação","c":["Mago"],"t":"1 ação","r":"120 pés (36 metros)","d":"Até 10 minutos","k":"V, S, M (Uma pitada de pó obtido ao esmagar uma pedra preciosa transparente)","cc":true,"rt":false,"x":"Uma muralha invisível de força surge num ponto à tua escolha dentro do alcance. A muralha aparece na orientação que escolheres, como uma barreira horizontal ou vertical, ou inclinada. Pode ficar suspensa no ar ou assentar numa superfície sólida. Podes dar-lhe a forma de uma cúpula hemisférica ou de uma esfera com um raio de até 10 pés (3 metros), ou moldá-la como uma superfície plana composta por dez painéis de 10 por 10 pés (3 por 3 metros). Cada painel tem de estar ligado a outro painel. Em qualquer forma, a muralha tem 1/4 de polegada (cerca de 6 milímetros) de espessura. Permanece durante a duração da magia. Se a muralha atravessar o espaço ocupado por uma criatura quando surgir, essa criatura é empurrada para um dos lados da muralha (à tua escolha).\nNada pode atravessar fisicamente a muralha. É imune a todo o dano e não pode ser dissipada por dissipar magia. No entanto, uma magia desintegrar destrói a muralha instantaneamente. A muralha também se estende ao Plano Etéreo, impedindo a passagem etérea através dela.","h":""},{"n":"Muralha de Pedra","l":5,"s":"Evocação","c":["Druida","Feiticeiro","Mago"],"t":"1 ação","r":"120 pés (36 metros)","d":"Até 10 minutos","k":"V, S, M (Um pequeno bloco de granito)","cc":true,"rt":false,"x":"Uma muralha não mágica de pedra sólida surge num ponto à tua escolha dentro do alcance. A muralha tem 6 polegadas (15 centímetros) de espessura e é composta por dez painéis de 10 por 10 pés (3 por 3 metros). Cada painel tem de estar ligado a pelo menos outro painel. Em alternativa, podes criar painéis de 10 por 20 pés (3 por 6 metros) com apenas 3 polegadas (7,5 centímetros) de espessura.\nSe a muralha atravessar o espaço ocupado por uma criatura quando surgir, a criatura é empurrada para um dos lados da muralha (à tua escolha). Se uma criatura ficar rodeada por todos os lados pela muralha (ou pela muralha e outra superfície sólida), pode realizar um teste de resistência de Destreza. Se for bem-sucedida, pode usar a sua reação para se deslocar até ao seu deslocamento, de modo a deixar de estar cercada pela muralha.\nA muralha pode ter qualquer forma que desejes, embora não possa ocupar o mesmo espaço que uma criatura ou objeto. Não precisa de ser vertical nem de assentar numa fundação firme. No entanto, tem de se unir a pedra existente e ser solidamente sustentada por ela. Assim, podes usar esta magia para criar uma ponte sobre um abismo ou construir uma rampa.\nSe criares um vão com mais de 20 pés (6 metros) de comprimento, tens de reduzir para metade o tamanho de cada painel para criar suportes. Podes moldar grosseiramente a muralha para criar ameias, parapeitos e estruturas semelhantes.\nA muralha é um objeto de pedra que pode ser danificado e, por isso, rompido. Cada painel tem CA 15 e 30 pontos de vida por polegada de espessura. Reduzir um painel a 0 pontos de vida destrói-o e pode fazer com que os painéis ligados a ele desabem, à discrição do Mestre.\nSe mantiveres a concentração nesta magia durante toda a sua duração, a muralha torna-se permanente e não pode ser dissipada. Caso contrário, desaparece quando a magia termina.","h":""},{"n":"Névoa Assassina","l":5,"s":"Conjuração","c":["Feiticeiro","Mago"],"t":"1 ação","r":"120 pés (36 metros)","d":"Até 10 minutos","k":"V, S","cc":true,"rt":false,"x":"Cria uma esfera de 20 pés (6 metros) de raio de névoa venenosa e amarelo-esverdeada centrada num ponto à sua escolha dentro do alcance. A névoa espalha-se ao virar das esquinas. Dura pela duração da magia ou até que vento forte dissipe a névoa, terminando a magia. A sua área é fortemente obscurecida.\nQuando uma criatura entra na área da magia pela primeira vez num turno ou começa o seu turno lá, essa criatura deve fazer um teste de resistência de Constituição. A criatura sofre 5d8 de dano de veneno num teste falhado, ou metade do dano num teste bem-sucedido. As criaturas são afetadas mesmo que prendam a respiração ou não precisem de respirar.\nA névoa afasta-se 10 pés (3 metros) de si no início de cada um dos seus turnos, rolando ao longo da superfície do chão. Os vapores, sendo mais pesados que o ar, afundam-se para o nível mais baixo do terreno, até mesmo derramando-se por aberturas.","h":"Quando conjura esta magia usando um espaço de magia de 6º nível ou superior, o dano aumenta em 1d8 para cada nível do espaço acima do 5º."},{"n":"Passagem de Parede","l":5,"s":"Transmutação","c":["Mago"],"t":"1 ação","r":"30 pés (9 metros)","d":"1 hora","k":"V, S, M (Uma pitada de sementes de sésamo)","cc":false,"rt":false,"x":"Surge uma passagem num ponto à sua escolha que consiga ver, numa superfície de madeira, gesso ou pedra (como uma parede, teto ou chão) dentro do alcance, que permanece durante a duração. Escolhe as dimensões da abertura: até 5 pés (1,5 metros) de largura, 8 pés (2,4 metros) de altura e 20 pés (6 metros) de profundidade. A passagem não provoca qualquer instabilidade na estrutura que a rodeia.\nQuando a abertura desaparece, quaisquer criaturas ou objetos que ainda estejam na passagem criada pela magia são expulsos em segurança para um espaço desocupado o mais próximo possível da superfície onde conjurou a magia.","h":""},{"n":"Passo pelas Árvores","l":5,"s":"Conjuração","c":["Druida","Patrulheiro"],"t":"1 ação","r":"Pessoal","d":"Até 1 minuto","k":"V, S","cc":true,"rt":false,"x":"Ganhas a capacidade de entrar numa árvore e deslocar-te do seu interior para o interior de outra árvore da mesma espécie a até 500 pés (150 metros). Ambas as árvores têm de estar vivas e ter, pelo menos, o mesmo tamanho que tu. Tens de usar 5 pés (1,5 metros) do teu deslocamento para entrar numa árvore. Ficas instantaneamente a conhecer a localização de todas as outras árvores da mesma espécie a até 500 pés (150 metros) e, como parte do movimento usado para entrar na árvore, podes passar para uma dessas árvores ou sair da árvore em que te encontras. Apareces num local à tua escolha a até 5 pés (1,5 metros) da árvore de destino, usando mais 5 pés (1,5 metros) de deslocamento. Se já não tiveres deslocamento disponível, apareces a até 5 pés (1,5 metros) da árvore em que entraste.\nPodes usar esta capacidade de transporte uma vez por ronda durante a duração. Tens de terminar cada turno fora de uma árvore.","h":""},{"n":"Praga de Insetos","l":5,"s":"Conjuração","c":["Clérigo","Druida","Feiticeiro"],"t":"1 ação","r":"300 pés (91,4 metros)","d":"Até 10 minutos","k":"V, S, M (Alguns grãos de açúcar, algumas espigas de cereal e uma mancha de gordura)","cc":true,"rt":false,"x":"Gafanhotos vorazes e mordedores enchem uma esfera com 20 pés (6 metros) de raio, centrada num ponto à sua escolha dentro do alcance. A esfera espalha-se à volta dos cantos. A esfera permanece pela duração e a sua área fica ligeiramente obscurecida. A área da esfera é terreno difícil.\nQuando a área aparece, cada criatura dentro dela deve fazer um teste de resistência de Constituição. Uma criatura sofre 4d10 de dano perfurante se falhar, ou metade desse dano se for bem-sucedida. Uma criatura também deve fazer este teste de resistência quando entra na área da magia pela primeira vez num turno ou termina o seu turno nela.","h":"Quando conjura esta magia usando um espaço de magia de 6º nível ou superior, o dano aumenta em 1d10 por cada nível do espaço acima do 5º."},{"n":"Reencarnar","l":5,"s":"Transmutação","c":["Druida"],"t":"1 hora","r":"Toque","d":"Instantânea","k":"V, S, M (Óleos e unguentos raros no valor mínimo de 1 000 po, consumidos pela magia)","cc":false,"rt":false,"x":"Tocas num humanoide morto ou num fragmento de um humanoide morto. Desde que a criatura não esteja morta há mais de 10 dias, a magia cria para ela um novo corpo adulto e chama a sua alma para que entre nesse corpo. Se a alma do alvo não estiver livre ou não desejar fazê-lo, a magia falha.\nA magia cria um novo corpo para a criatura habitar, o que provavelmente fará com que a raça da criatura mude. O Mestre lança um d100 e consulta a tabela seguinte para determinar a forma que a criatura assume ao regressar à vida, ou escolhe uma forma.\n01–04\nDraconato\n05–13\nAnão da colina\n14–21\nAnão da montanha\n22–25\nElfo negro\n26–34\nAlto-elfo\n35–42\nElfo da floresta\n43–46\nGnomo da floresta\n47–52\nGnomo das rochas\n53–56\nMeio-elfo\n57–60\nMeio-orc\n61–68\nHalfling pés-leves\n69–76\nHalfling robusto\n77–96\nHumano\n97–00\nTiefling\nA criatura reencarnada recorda a sua vida e experiências anteriores. Mantém as capacidades que possuía na sua forma original, mas troca a sua raça original pela nova e altera os seus traços raciais em conformidade.","h":""},{"n":"Ressurreição (Raise Dead)","l":5,"s":"Necromancia","c":["Bardo","Clérigo","Paladino"],"t":"1 hora","r":"Toque","d":"Instantânea","k":"V, S, M (Um diamante no valor mínimo de 500 po, que a magia consome)","cc":false,"rt":false,"x":"Devolve à vida uma criatura morta que toque, desde que não esteja morta há mais de 10 dias. Se a alma da criatura estiver simultaneamente disposta e livre para regressar ao corpo, a criatura regressa à vida com 1 ponto de vida.\nEsta magia também neutraliza quaisquer venenos e cura doenças não mágicas que afetavam a criatura no momento da sua morte. No entanto, não remove doenças mágicas, maldições ou efeitos semelhantes; se estes não forem removidos antes de conjurar a magia, produzem efeito quando a criatura regressa à vida. A magia não pode devolver a vida a uma criatura morta-viva.\nEsta magia fecha todas as feridas mortais, mas não restaura partes do corpo em falta. Se a criatura não tiver partes do corpo ou órgãos essenciais à sua sobrevivência — como a cabeça, por exemplo —, a magia falha automaticamente.\nRegressar dos mortos é uma provação. O alvo sofre uma penalização de -4 em todas as jogadas de ataque, testes de resistência e testes de atributo. Sempre que o alvo termina um descanso longo, a penalização diminui em 1 até desaparecer.","h":""},{"n":"Restauração Maior","l":5,"s":"Abjuração","c":["Bardo","Clérigo","Druida"],"t":"1 ação","r":"Toque","d":"Instantânea","k":"V, S, M (Pó de diamante no valor de pelo menos 100 po, que a magia consome)","cc":false,"rt":false,"x":"Você imbui uma criatura que você tocar com energia positiva para desfazer um efeito debilitante. Você pode reduzir o nível de exaustão do alvo em um ou terminar um dos seguintes efeitos no alvo:\n- Um efeito que enfeitiçou ou petrificou o alvo\n- Uma maldição, incluindo a sintonização com um item mágico amaldiçoado\n- Qualquer redução em um dos valores de habilidade do alvo\n- Um efeito que reduza os pontos de vida máximos do alvo","h":""},{"n":"Sonho","l":5,"s":"Ilusão","c":["Bardo","Bruxo","Mago"],"t":"1 minuto","r":"Especial","d":"8 horas","k":"V, S, M (Um punhado de areia, uma gota de tinta e uma pena de escrever retirada de uma ave a dormir)","cc":false,"rt":false,"x":"Esta magia molda os sonhos de uma criatura. Escolha uma criatura conhecida por si como alvo desta magia. O alvo deve estar no mesmo plano de existência que você. Criaturas que não dormem, como elfos, não podem ser contactadas por esta magia. Você, ou uma criatura voluntária que toque, entra num estado de transe, atuando como mensageiro.\nEnquanto estiver no transe, o mensageiro está ciente dos seus arredores, mas não pode tomar ações nem mover-se.\nSe o alvo estiver a dormir, o mensageiro aparece nos seus sonhos e pode conversar com o alvo enquanto ele permanecer a dormir, ao longo da duração da magia. O mensageiro pode também moldar o ambiente do sonho, criando paisagens, objetos e outras imagens. O mensageiro pode emergir do transe a qualquer momento, terminando o efeito da magia antecipadamente. O alvo recorda-se do sonho perfeitamente ao acordar. Se o alvo estiver acordado quando conjurar a magia, o mensageiro fica a sabê-lo e pode terminar o transe (e a magia) ou esperar que o alvo adormeça, altura em que o mensageiro aparece nos seus sonhos.\nPode fazer o mensageiro parecer monstruoso e aterrorizador para o alvo. Se o fizer, o mensageiro pode entregar uma mensagem de no máximo dez palavras e depois o alvo deve fazer um teste de resistência de Sabedoria. Num teste falhado, ecos da monstruosidade fantasiosa geram um pesadelo que dura pela duração do sono do alvo e impede o alvo de obter qualquer benefício desse descanso. Além disso, quando o alvo acorda, sofre 3d6 de dano psíquico.\nSe tiver uma parte do corpo, uma mecha de cabelo, uma unha cortada ou uma porção semelhante do corpo do alvo, o alvo faz o seu teste de resistência com desvantagem.","h":""},{"n":"Telecinese","l":5,"s":"Transmutação","c":["Feiticeiro","Mago"],"t":"1 ação","r":"60 pés (18 metros)","d":"Até 10 minutos","k":"V, S","cc":true,"rt":false,"x":"Ganhas a capacidade de mover ou manipular criaturas ou objetos através do pensamento. Quando conjuras a magia e, depois, como ação em cada ronda durante a sua duração, podes exercer a tua vontade sobre uma criatura ou objeto que consigas ver dentro do alcance, provocando o efeito apropriado abaixo. Podes afetar o mesmo alvo ronda após ronda ou escolher um novo alvo a qualquer momento. Se mudares de alvo, o alvo anterior deixa de ser afetado pela magia.\nCriatura.\nPodes tentar mover uma criatura Enorme ou inferior. Realiza um teste de atributo usando o teu atributo de conjuração, resistido por um teste de Força da criatura. Se venceres a disputa, moves a criatura até 30 pés (9 metros) em qualquer direção, inclusive para cima, mas sem ultrapassar o alcance desta magia. Até ao final do teu próximo turno, a criatura fica restringida pelo teu controlo telecinético. Uma criatura levantada no ar fica suspensa.\nNas rondas seguintes, podes usar a tua ação para tentar manter o controlo telecinético sobre a criatura, repetindo a disputa.\nObjeto.\nPodes tentar mover um objeto que pese até 1.000 libras (cerca de 450 kg). Se o objeto não estiver a ser vestido ou transportado por uma criatura, move-o automaticamente até 30 pés (9 metros) em qualquer direção, mas sem ultrapassar o alcance desta magia.\nSe o objeto estiver a ser vestido ou transportado por uma criatura, tens de realizar um teste de atributo usando o teu atributo de conjuração, resistido por um teste de Força dessa criatura. Se fores bem-sucedido, arrancas o objeto à criatura e podes movê-lo até 30 pés (9 metros) em qualquer direção, mas sem ultrapassar o alcance desta magia.\nPodes exercer um controlo preciso sobre objetos com o teu domínio telecinético, como manipular uma ferramenta simples, abrir uma porta ou recipiente, guardar ou retirar um objeto de um recipiente aberto ou despejar o conteúdo de um frasco.","h":""},{"n":"Vidência","l":5,"s":"Adivinhação","c":["Bardo","Clérigo","Druida","Bruxo","Mago"],"t":"10 minutos","r":"Pessoal","d":"Até 10 minutos","k":"V, S, M (Um foco no valor mínimo de 1 000 po, como uma bola de cristal, um espelho de prata ou uma pia cheia de água benta)","cc":true,"rt":false,"x":"Podes ver e ouvir uma criatura específica à tua escolha que esteja no mesmo plano de existência que tu. O alvo tem de realizar uma salvaguarda de Sabedoria, modificada pelo teu grau de conhecimento sobre o alvo e pelo tipo de ligação física que tens com ele. Se o alvo souber que estás a conjurar esta magia, pode falhar voluntariamente a salvaguarda caso queira ser observado.\nConhecimento — Modificador da salvaguarda\nConhecimento indireto (ouviste falar do alvo): +5\nConhecimento direto (já encontraste o alvo): +0\nFamiliaridade (conheces bem o alvo): -5\nLigação — Modificador da salvaguarda\nSemelhança ou retrato: -2\nObjeto possuído ou peça de vestuário: -4\nParte do corpo, madeixa de cabelo, fragmento de unha ou semelhante: -10\nSe for bem-sucedido na salvaguarda, o alvo não é afetado e não podes voltar a usar esta magia contra ele durante 24 horas.\nSe falhar a salvaguarda, a magia cria um sensor invisível a até 10 pés (3 metros) do alvo. Podes ver e ouvir através do sensor como se estivesses no local. O sensor acompanha o alvo, mantendo-se a até 10 pés (3 metros) dele durante a duração. Uma criatura que consiga ver objetos invisíveis vê o sensor como um orbe luminoso do tamanho aproximado de um punho.\nEm vez de escolher uma criatura como alvo, podes escolher um local que tenhas visto anteriormente. Nesse caso, o sensor aparece nesse local e não se move.","h":""},{"n":"Vínculo Telepático","l":5,"s":"Adivinhação","c":["Mago"],"t":"1 ação","r":"30 pés (9 metros)","d":"1 hora","k":"V, S, M (Pedaços de casca de ovo de duas espécies diferentes de criaturas)","cc":false,"rt":true,"x":"Estabeleces um vínculo telepático entre até oito criaturas voluntárias à tua escolha dentro do alcance, ligando psiquicamente cada criatura a todas as outras durante a duração. Criaturas com um valor de Inteligência igual ou inferior a 2 não são afetadas por esta magia.\nAté a magia terminar, os alvos podem comunicar telepaticamente através do vínculo, tenham ou não um idioma em comum. A comunicação é possível a qualquer distância, mas não pode estender-se a outros planos de existência.","h":""},{"n":"Aliado Planar","l":6,"s":"Conjuração","c":["Clérigo"],"t":"10 minutos","r":"60 pés (18 metros)","d":"Instantânea","k":"V, S","cc":false,"rt":false,"x":"Implora a uma entidade sobrenatural por auxílio. O ser tem de ser conhecido por si: um deus, um primordial, um príncipe demoníaco ou outra entidade de poder cósmico. Essa entidade envia um celestial, um elemental ou um corruptor que lhe seja leal para o ajudar, fazendo a criatura surgir num espaço desocupado dentro do alcance. Se conhecer o nome de uma criatura específica, pode dizê-lo ao conjurar esta magia para pedir essa criatura, embora possa receber outra criatura mesmo assim (à escolha do Mestre).\nQuando a criatura aparece, não está obrigada a comportar-se de nenhuma forma específica. Pode pedir-lhe que realize um serviço em troca de pagamento, mas ela não é obrigada a aceitar. A tarefa solicitada pode variar entre algo simples (transportar-nos a voar através do desfiladeiro ou ajudar-nos a combater numa batalha) e algo complexo (espiar os nossos inimigos ou proteger-nos durante a nossa incursão na masmorra). Tem de conseguir comunicar com a criatura para negociar os seus serviços.\nO pagamento pode assumir várias formas. Um celestial pode exigir uma doação avultada de ouro ou objetos mágicos a um templo aliado, enquanto um corruptor pode exigir um sacrifício vivo ou uma oferta de tesouros. Algumas criaturas podem trocar os seus serviços por uma missão realizada por si.\nComo regra geral, uma tarefa que possa ser medida em minutos exige um pagamento no valor de 100 po por minuto. Uma tarefa medida em horas exige 1.000 po por hora. Uma tarefa medida em dias (até 10 dias) exige 10.000 po por dia. O Mestre pode ajustar estes pagamentos de acordo com as circunstâncias em que conjura a magia. Se a tarefa estiver de acordo com a ética da criatura, o pagamento pode ser reduzido para metade ou até dispensado. Tarefas não perigosas normalmente exigem apenas metade do pagamento sugerido, enquanto tarefas especialmente perigosas podem exigir uma oferta maior. Raramente as criaturas aceitam tarefas que pareçam suicidas.\nDepois de concluir a tarefa, ou quando terminar a duração de serviço acordada, a criatura regressa ao seu plano natal após lhe prestar contas, se tal for apropriado à tarefa e possível. Se não conseguir chegar a acordo sobre o preço dos serviços da criatura, esta regressa imediatamente ao seu plano natal.\nUma criatura recrutada para se juntar ao seu grupo conta como membro dele, recebendo uma quota completa dos pontos de experiência atribuídos.","h":""},{"n":"Banquete de Heróis","l":6,"s":"Conjuração","c":["Clérigo","Druida"],"t":"10 minutos","r":"9 metros","d":"24 horas","k":"V, S, M (Uma tigela feita de marfim valendo no mínimo 1.000 po)","cc":false,"rt":false,"x":"Você traz à tona um banquete majestoso, que leva 10 minutos para ser consumido, incluindo comida e bebida. O banquete se materializa num espaço que você puder ver até 9 metros de você, servindo até doze outras criaturas. O banquete leva 1 hora para ser consumido e os benefícios do banquete não valerão se não houver no mínimo doze porções para doze criaturas participarem.\nAs criaturas que participarem do banquete ganham vários benefícios. Qualquer um participando fica curado de todas as doenças, venenos, e imune a todos os venenos ou estarem amedrontados pela duração. Elas têm vantagem nos testes de resistência de Sabedoria pela duração. Elas também têm seu limite de pontos de vida aumentados por 2d10 e recuperam o mesmo valor em pontos de vida.","h":""},{"n":"Barreira de Lâminas","l":6,"s":"Evocação","c":["Clérigo"],"t":"1 ação","r":"90 pés (27 metros)","d":"Até 10 minutos","k":"V, S","cc":true,"rt":false,"x":"Cria uma muralha vertical de lâminas giratórias e afiadas como navalhas feitas de energia mágica. A muralha aparece dentro do alcance e dura pela duração. Pode fazer uma muralha reta de até 100 pés (30 metros) de comprimento, 20 pés (6 metros) de altura e 5 pés (1,5 metros) de espessura, ou uma muralha em anel de até 60 pés (18 metros) de diâmetro, 20 pés de altura e 5 pés de espessura. A muralha fornece três quartos de cobertura às criaturas atrás dela, e o seu espaço é terreno difícil.\nQuando uma criatura entra na área da muralha pela primeira vez num turno ou começa o seu turno lá, a criatura deve fazer um teste de resistência de Destreza. Num teste falhado, a criatura sofre 6d10 de dano cortante. Num teste bem-sucedido, a criatura sofre metade do dano.","h":""},{"n":"Caminhar com o Vento","l":6,"s":"Transmutação","c":["Druida"],"t":"1 minuto","r":"30 pés (9 metros)","d":"8 horas","k":"V, S, M (Fogo e água benta)","cc":false,"rt":false,"x":"Tu e até dez criaturas voluntárias que consigas ver dentro do alcance assumem uma forma gasosa durante a duração da magia, aparecendo como pequenos filamentos de nuvem. Enquanto estiver nessa forma de nuvem, uma criatura tem uma velocidade de voo de 300 pés (90 metros) e resistência a dano causado por armas não mágicas. As únicas ações que uma criatura pode realizar nesta forma são Correr ou regressar à sua forma normal. Regressar à forma normal demora 1 minuto, durante o qual a criatura fica incapacitada e não pode deslocar-se. Até a magia terminar, uma criatura pode regressar à forma de nuvem, o que também exige uma transformação de 1 minuto.\nSe uma criatura estiver na forma de nuvem e a voar quando o efeito terminar, desce 60 pés (18 metros) por ronda durante 1 minuto, até aterrar em segurança. Se não conseguir aterrar após 1 minuto, cai a distância restante.","h":""},{"n":"Carne para Pedra","l":6,"s":"Transmutação","c":["Bruxo","Mago"],"t":"1 ação","r":"18 metros","d":"Até 1 minuto","k":"V, S, M (Uma pitada de cal, água e terra)","cc":true,"rt":false,"x":"Você tenta transformar em pedra uma criatura que possa ver dentro do alcance. Se o corpo do alvo for feito de carne, a criatura deve fazer um teste de resistência de Constituição. Em uma falha, ela fica impedida enquanto sua carne começa a endurecer. Em um sucesso, a criatura não é afetada.\nUma criatura impedida por esta magia deve fazer outro teste de resistência de Constituição no final de cada um de seus turnos. Se ela passar no teste contra essa magia três vezes, a magia termina. Se falhar três vezes, ela é transformada em pedra e sofre a condição petrificada pela duração. Os sucessos e falhas não precisam ser consecutivos; acompanhe ambos até o alvo acumular três de um tipo.\nSe a criatura for fisicamente quebrada enquanto estiver petrificada, ela sofrerá deformidades semelhantes se reverter ao seu estado original.\nSe você mantiver a concentração nesta magia por toda a duração possível, a criatura é transformada em pedra até que o efeito seja removido.","h":""},{"n":"Círculo da Morte","l":6,"s":"Necromancia","c":["Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"150 pés (45 metros)","d":"Instantânea","k":"V, S, M (O pó de uma pérola negra esmagada no valor de pelo menos 500 po)","cc":false,"rt":false,"x":"Uma esfera de energia negativa propaga-se numa esfera de 60 pés (18 metros) de raio a partir de um ponto dentro do alcance. Cada criatura nessa área deve fazer um teste de resistência de Constituição. Um alvo sofre 8d6 de dano necrótico num teste falhado, ou metade do dano num teste bem-sucedido.","h":"Quando conjura esta magia usando um espaço de magia de 7º nível ou superior, o dano aumenta em 2d6 para cada nível do espaço acima do 6º."},{"n":"Conjurar Feérico","l":6,"s":"Conjuração","c":["Druida","Bruxo"],"t":"1 minuto","r":"90 pés (27 metros)","d":"Até 1 hora","k":"V, S","cc":true,"rt":false,"x":"Invoca uma criatura feérica de nível de desafio 6 ou inferior, ou um espírito feérico que assume a forma de uma besta de nível de desafio 6 ou inferior. Aparece num espaço desocupado que possa ver dentro do alcance. A criatura feérica desaparece quando cai para 0 pontos de vida ou quando a magia termina.\nA criatura feérica é amigável consigo e com os seus companheiros pela duração. Role iniciativa para a criatura, que tem os seus próprios turnos. Ela obedece a quaisquer comandos verbais que lhe dê (nenhuma ação requerida da sua parte), desde que não violem o seu alinhamento. Se não der nenhuns comandos à criatura feérica, ela defende-se de criaturas hostis, mas de resto não toma ações.\nSe a sua concentração for quebrada, a criatura feérica não desaparece. Em vez disso, perde o controlo da criatura feérica, ela torna-se hostil em relação a si e aos seus companheiros, e pode atacar. Uma criatura feérica descontrolada não pode ser dissipada por si, e desaparece 1 hora depois de a ter invocado.\nO DM tem as estatísticas da criatura feérica.","h":"Quando conjura esta magia usando um espaço de magia de 7º nível ou superior, o nível de desafio aumenta em 1 para cada nível do espaço acima do 6º."},{"n":"Contingência","l":6,"s":"Evocação","c":["Mago"],"t":"10 minutos","r":"Pessoal","d":"10 dias","k":"V, S, M (Uma estatueta sua esculpida em marfim e decorada com gemas no valor de pelo menos 1.500 po)","cc":false,"rt":false,"x":"Escolha uma magia de 5º nível ou inferior que consiga conjurar, que tenha um tempo de conjuração de 1 ação, e que o possa ter como alvo. Conjura essa magia — chamada a magia contingente — como parte da conjuração da contingência, gastando espaços de magia para ambas, mas a magia contingente não entra em efeito. Em vez disso, tem efeito quando ocorre uma determinada circunstância. Descreve essa circunstância quando conjura as duas magias. Por exemplo, uma contingência conjurada com respirar debaixo de água pode estipular que respirar debaixo de água entra em efeito quando é engolido por água ou um líquido semelhante.\nA magia contingente entra em efeito imediatamente depois de a circunstância ser correspondida pela primeira vez, quer o deseje quer não, e depois a contingência termina.\nA magia contingente entra em efeito apenas em si, mesmo que normalmente possa ter como alvo outros. Apenas pode usar uma magia de contingência de cada vez. Se conjurar esta magia novamente, o efeito de outra magia de contingência em si termina. Além disso, a contingência termina em si se o seu componente material alguma vez não estiver na sua posse.","h":""},{"n":"Criar Mortos-vivos","l":6,"s":"Necromancia","c":["Clérigo","Bruxo","Mago"],"t":"1 minuto","r":"10 pés (3 metros)","d":"Instantânea","k":"V, S, M (Um pote de barro cheio de terra de sepultura, um pote de barro cheio de água salobra, e uma pedra de ónix negro de 150 po por cada cadáver)","cc":false,"rt":false,"x":"Apenas pode conjurar esta magia à noite. Escolha até três cadáveres de humanoides Médios ou Pequenos dentro do alcance. Cada cadáver torna-se um carniçal sob o seu controlo. (O DM tem estatísticas de jogo para estas criaturas.)\nComo uma ação bónus em cada um dos seus turnos, pode comandar mentalmente qualquer criatura que animou com esta magia se a criatura estiver a até 120 pés (36 metros) de si (se controlar várias criaturas, pode comandar qualquer uma ou todas elas ao mesmo tempo, emitindo o mesmo comando para cada uma). Decide que ação a criatura tomará e para onde se moverá durante o seu próximo turno, ou pode emitir um comando geral, como para guardar uma câmara ou corredor específico. Se não emitir nenhuns comandos, a criatura apenas se defende contra criaturas hostis. Uma vez dada uma ordem, a criatura continua a segui-la até que a sua tarefa seja concluída.\nA criatura está sob o seu controlo durante 24 horas, após o qual deixa de obedecer a qualquer comando que lhe tenha dado. Para manter o controlo da criatura por mais 24 horas, deve conjurar esta magia sobre a criatura antes que o atual período de 24 horas termine. O uso da magia desta forma reafirma o seu controlo sobre até três criaturas que animou com esta magia, em vez de animar outras novas.","h":"Quando conjura esta magia usando um espaço de magia de 7º nível, pode animar ou reafirmar o controlo sobre quatro carniçais. Quando conjura esta magia usando um espaço de magia de 8º nível, pode animar ou reafirmar o controlo sobre cinco carniçais ou dois lívidos ou inumanos. Quando conjura esta magia usando um espaço de magia de 9º nível, pode animar ou reafirmar o controlo sobre seis carniçais, três lívidos ou inumanos, ou duas múmias."},{"n":"Cura","l":6,"s":"Evocação","c":["Clérigo","Druida"],"t":"1 ação","r":"18 metros","d":"Instantânea","k":"V, S","cc":false,"rt":false,"x":"Escolha uma criatura que você possa ver, no alcance da magia. Uma onda de energia positiva perpassa por ela, e ela recupera 70 pontos de vida. Esta magia também encerra a cegueira, surdez e qualquer doença que a afetava. Ela não afeta constructos nem mortos-vivos.","h":"Quando você conjurar esta magia usando um espaço de magia de 7º nível ou superior, a quantidade de pontos de vida curados aumenta em 10 para cada nível do espaço acima do 6º."},{"n":"Dança Irresistível","l":6,"s":"Encantamento","c":["Bardo","Mago"],"t":"1 ação","r":"30 pés (9,1 metros)","d":"Até 1 minuto","k":"V","cc":true,"rt":false,"x":"Escolha uma criatura que consiga ver dentro do alcance. O alvo começa uma dança cómica no mesmo lugar: arrasta os pés, bate com eles no chão e salta durante toda a duração. As criaturas que não podem ser enfeitiçadas são imunes a esta magia.\nUma criatura a dançar tem de usar todo o seu deslocamento para dançar sem sair do seu espaço e tem desvantagem nos testes de resistência de Destreza e nas jogadas de ataque. Enquanto o alvo estiver afetado por esta magia, outras criaturas têm vantagem nas jogadas de ataque contra ele. Como ação, uma criatura a dançar pode fazer um teste de resistência de Sabedoria para recuperar o controlo de si própria. Se for bem-sucedida, a magia termina.","h":""},{"n":"Desintegrar","l":6,"s":"Transmutação","c":["Feiticeiro","Mago"],"t":"1 ação","r":"60 pés (18 metros)","d":"Instantânea","k":"V, S, M (Uma pedra-ímã e uma pitada de poeira)","cc":false,"rt":false,"x":"Um feixe verde e fino dispara do seu dedo indicador apontado para um alvo que possa ver dentro do alcance. O alvo pode ser uma criatura, um objeto ou uma criação de força mágica, como a parede criada por muralha de força.\nUma criatura visada por esta magia deve fazer um teste de resistência de Destreza. Num teste falhado, o alvo sofre 10d6 + 40 de dano de força. Se este dano reduzir o alvo a 0 pontos de vida, ele é desintegrado.\nUma criatura desintegrada e tudo o que ela estiver a vestir e a carregar, exceto itens mágicos, são reduzidos a uma pilha de pó cinzento fino. A criatura apenas pode ser restaurada à vida por meio de uma magia ressurreição verdadeira ou desejo.\nEsta magia desintegra automaticamente um objeto não mágico Grande ou menor ou uma criação de força mágica. Se o alvo for um objeto Enorme ou maior ou criação de força, esta magia desintegra uma porção de um cubo de 10 pés (3 metros) dele. Um item mágico não é afetado por esta magia.","h":"Quando conjura esta magia usando um espaço de magia de 7º nível ou superior, o dano aumenta em 3d6 para cada nível do espaço acima do 6º."},{"n":"Encontrar o Caminho","l":6,"s":"Adivinhação","c":["Bardo","Clérigo","Druida"],"t":"1 minuto","r":"Pessoal","d":"Até 1 dia","k":"V, S, M (Um conjunto de ferramentas de adivinhação — como ossos, varetas de marfim, cartas, dentes ou runas esculpidas — no valor de 100 po e um objeto do local que deseja encontrar)","cc":true,"rt":false,"x":"Esta magia permite-lhe encontrar a rota física mais curta e direta para um local fixo específico com o qual esteja familiarizado no mesmo plano de existência. Se nomear um destino noutro plano de existência, um destino que se mova (como uma fortaleza móvel), ou um destino que não seja específico (como \"o guarida de um dragão verde\"), a magia falha.\nPela duração, desde que esteja no mesmo plano de existência que o destino, sabe quão longe ele está e em que direção se encontra. Enquanto viaja para lá, sempre que lhe for apresentada uma escolha de caminhos ao longo do trajeto, determina automaticamente qual o caminho mais curto e direto (mas não necessariamente o caminho mais seguro) para o destino.","h":""},{"n":"Esfera Congelante","l":6,"s":"Evocação","c":["Mago"],"t":"1 ação","r":"90 metros","d":"Instantânea","k":"V, S, M (Uma pequena esfera de cristal)","cc":false,"rt":false,"x":"Um globo frígido de energia fria viaja da ponta de seus dedos para um ponto de sua escolha dentro do alcance, onde explode em uma esfera de 18 metros de raio. Cada criatura dentro da área deve fazer um teste de resistência de Constituição. Em uma falha, a criatura sofre 10d6 de dano de frio. Em um sucesso, sofre metade do dano.\nSe o globo atingir um corpo de água ou um líquido que seja principalmente água (não incluindo criaturas à base de água), ele congela o líquido até uma profundidade de 15 centímetros em uma área de 9 metros quadrados. Este gelo dura por 1 minuto. Criaturas que estavam nadando na superfície da água congelada ficam presas no gelo. Uma criatura presa pode usar uma ação para fazer um teste de Força contra a CD para evitar suas magias e se libertar.\nVocê pode se abster de disparar o globo após completar a magia, se desejar. Um pequeno globo, mais ou menos do tamanho de uma pedra de funda, frio ao toque, aparece em sua mão. A qualquer momento, você ou uma criatura para a qual você entregou o globo pode jogá-lo (até um alcance de 12 metros) ou arremessá-lo com uma funda (até o alcance normal da funda). Ele se estilhaça no impacto, com o mesmo efeito que a conjuração normal da magia. Você também pode colocar o globo no chão sem estilhaçá-lo. Após 1 minuto, se o globo ainda não tiver se estilhaçado, ele explode.","h":"Quando você conjura esta magia usando um espaço de magia de 7º nível ou superior, o dano aumenta em 1d6 para cada nível do espaço acima do 6º."},{"n":"Ferir","l":6,"s":"Necromancia","c":["Clérigo"],"t":"1 ação","r":"18 metros","d":"Instantânea","k":"V, S","cc":false,"rt":false,"x":"Você canaliza o poder necrótico da doença. Escolha uma criatura que você possa ver, no alcance da magia. O alvo deve realizar um teste de resistência de Constituição. Se falhar na resistência, o alvo sofre 14d6 de dano necrótico e seu ponto de vida máximo é reduzido numa quantidade igual ao dano sofrido por 1 hora. Se obtiver sucesso na resistência, ele sofre metade do dano e seu ponto de vida máximo não é reduzido. Esta magia não pode reduzir os pontos de vida do alvo a menos de 1. Além disso, a magia não afeta mortos-vivos ou constructos.","h":""},{"n":"Globo de Invulnerabilidade","l":6,"s":"Abjuração","c":["Feiticeiro","Mago"],"t":"1 ação","r":"Pessoal","d":"Até 1 minuto","k":"V, S, M (Uma conta de vidro ou cristal que se estilhaça quando a magia termina)","cc":true,"rt":false,"x":"Uma barreira imóvel e levemente cintilante surge em um raio de 3 metros ao seu redor e permanece pela duração.\nQualquer magia de 5º nível ou inferior conjurada de fora da barreira não pode afetar criaturas ou objetos dentro dela, mesmo se a magia for conjurada usando um espaço de magia de nível superior. Tal magia pode ter como alvo criaturas e objetos dentro da barreira, mas a magia não tem efeito sobre eles. Da mesma forma, a área dentro da barreira é excluída das áreas afetadas por tais magias.","h":"Quando você conjura esta magia usando um espaço de magia de 7º nível ou superior, a barreira bloqueia magias de um nível superior para cada nível do espaço acima do 6º."},{"n":"Guardas e Sentinelas","l":6,"s":"Abjuração","c":["Bardo","Mago"],"t":"10 minutos","r":"Toque","d":"24 horas","k":"V, S, M (Incenso aceso, uma pequena porção de enxofre e azeite, uma corda atada, uma pequena quantidade de sangue de umbral e um pequeno bastão de prata no valor de pelo menos 10 po)","cc":false,"rt":false,"x":"Você cria uma proteção cobrindo até 230 metros quadrados de espaço de chão (uma área de 15 metros quadrados, ou cem quadrados de 1,5 metro ou vinte e cinco quadrados de 3 metros). A área protegida pode ter até 6 metros de altura e o formato que você desejar. Você pode proteger vários andares de uma fortaleza dividindo a área entre eles, contanto que você possa andar por cada área adjacente na hora em que conjurar a magia.\nQuando você conjura esta magia, você pode especificar indivíduos que não serão afetados por nenhum ou por alguns dos efeitos dela. Você também pode especificar uma senha que, quando dita em voz alta, torna quem a disser imune a esses efeitos.\nGuardas e Sentinelas cria os seguintes efeitos dentro da área protegida.\nCorredores: Uma névoa densa preenche todos os corredores, tornando-os de escuridão densa. Além disso, em cada interseção ou ramificação de corredores oferecendo uma escolha de direção, há 50% de chance de uma criatura que não os conheça acreditar que está seguindo na direção oposta da qual realmente está seguindo.\nPortas: Todas as portas na área são magicamente trancadas, como se pela magia 'tranca arcana'. Além disso, você pode cobrir até dez portas com uma ilusão (equivalente a uma magia 'ilusão menor') de que são paredes nuas.\nEscadas: Teias preenchem todas as escadas da área de alto a baixo, como na magia 'teia'. Estes fios recrescem em 10 minutos se queimados ou rasgados.\nOutros Efeitos de Magia: Você pode escolher colocar um dos seguintes efeitos mágicos dentro da área protegida:\n- Colocar 'luzes dançantes' em até quatro corredores. Você pode especificar um programa simples para as luzes repetirem enquanto Guardas e Sentinelas durar.\n- Colocar 'boca mágica' em dois lugares.\n- Colocar 'névoa fedorenta' em dois lugares. Os vapores retornam em 10 minutos após serem dissipados pelo vento, enquanto Guardas e Sentinelas durar.\n- Colocar 'rajada de vento' em um corredor ou aposento.\n- Colocar 'sugestão' em um lugar. Você escolhe uma área de um quadrado de 1,5 metro e qualquer criatura que entrar ou passar por ela recebe a sugestão mentalmente.\nToda a área protegida irradia magia. Dissipar magia lançada num efeito em específico remove apenas aquele efeito.","h":""},{"n":"Ilusão Programada","l":6,"s":"Ilusão","c":["Bardo","Mago"],"t":"1 ação","r":"120 pés (36 metros)","d":"Até ser dissipada","k":"V, S, M (Um pouco de lã e pó de jade no valor mínimo de 25 po)","cc":false,"rt":false,"x":"Cria uma ilusão de um objeto, criatura ou outro fenómeno visível dentro do alcance, que é ativada quando ocorre uma condição específica. A ilusão é impercetível até esse momento. Não pode ser maior do que um cubo de 30 pés (9 metros), e decide, ao conjurar a magia, como a ilusão se comporta e que sons produz. Esta representação programada pode durar até 5 minutos.\nQuando ocorre a condição especificada, a ilusão manifesta-se e comporta-se da forma que descreveu. Assim que termina a representação, desaparece e permanece inativa durante 10 minutos. Após esse período, a ilusão pode ser ativada novamente.\nA condição de ativação pode ser tão geral ou detalhada quanto desejar, embora tenha de se basear em condições visuais ou audíveis que ocorram a até 30 pés (9 metros) da área. Por exemplo, pode criar uma ilusão sua que aparece e avisa outras pessoas que tentem abrir uma porta armadilhada, ou configurar a ilusão para ser ativada apenas quando uma criatura disser a palavra ou frase correta.\nA interação física com a imagem revela que se trata de uma ilusão, pois os objetos podem atravessá-la. Uma criatura que use a sua ação para examinar a imagem pode determinar que se trata de uma ilusão com um teste bem-sucedido de Inteligência (Investigação) contra a CD das suas magias. Se uma criatura perceber a verdadeira natureza da ilusão, consegue ver através da imagem, e qualquer ruído que esta produza soa-lhe a oco.","h":""},{"n":"Invocação Instantânea","l":6,"s":"Conjuração","c":["Mago"],"t":"1 minuto","r":"Toque","d":"Até ser dissipada","k":"V, S, M (Uma safira com valor de 1.000 po)","cc":false,"rt":true,"x":"Toca num objeto que pese 10 libras (4,5 quilogramas) ou menos e cuja dimensão mais longa seja de 6 pés (1,8 metros) ou menos. A magia deixa uma marca invisível na sua superfície e grava invisivelmente o nome do item na safira que utiliza como componente material. Cada vez que conjura esta magia, deve usar uma safira diferente.\nA partir desse momento, pode usar uma ação para dizer o nome do item e esmagar a safira. O item aparece instantaneamente na sua mão, independentemente das distâncias físicas ou planares, e a magia termina.\nSe outra criatura estiver a segurar ou a transportar o item, esmagar a safira não o transporta até si; em vez disso, fica a saber quem é a criatura que possui o objeto e, aproximadamente, onde se encontra nesse momento.\nDispersar Magia ou um efeito semelhante aplicado com sucesso à safira termina o efeito desta magia.","h":""},{"n":"Mordedura do Olhar","l":6,"s":"Necromancia","c":["Bardo","Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"Pessoal","d":"Até 1 minuto","k":"V, S","cc":true,"rt":false,"x":"Pela duração da magia, os seus olhos tornam-se um vazio escuro impregnado de poder pavoroso. Uma criatura à sua escolha a até 60 pés (18 metros) de si que possa ver deve ser bem-sucedida num teste de resistência de Sabedoria ou será afetada por um dos seguintes efeitos à sua escolha pela duração. Em cada um dos seus turnos até a magia terminar, pode usar a sua ação para ter como alvo outra criatura, mas não pode voltar a ter como alvo uma criatura se ela tiver sido bem-sucedida num teste de resistência contra esta conjuração.\nAdormecida. O alvo cai inconsciente. Acorda se sofrer algum dano ou se outra criatura usar a sua ação para o sacudir para acordar.\nEm Pânico. O alvo fica assustado por si. Em cada um dos seus turnos, a criatura assustada deve tomar a ação de Disparada e afastar-se de si pela rota mais segura e curta disponível, a menos que não haja para onde se mover. Se o alvo se mover para um local a pelo menos 60 pés de si onde já não o consiga ver, este efeito termina.\nEnjoada. O alvo tem desvantagem em rolagens de ataque e testes de habilidade. No final de cada um dos seus turnos, pode fazer outro teste de resistência de Sabedoria. Se for bem-sucedido, o efeito termina.","h":""},{"n":"Mover Terra","l":6,"s":"Transmutação","c":["Druida","Feiticeiro","Mago"],"t":"1 ação","r":"120 pés (36 metros)","d":"Até 2 horas","k":"V, S, M (Uma lâmina de ferro e um pequeno saco contendo uma mistura de solos: argila, terra vegetal e areia)","cc":true,"rt":false,"x":"Escolha uma área de terreno dentro do alcance, com dimensões máximas de 40 pés (12 metros) de cada lado. Durante a duração, pode remodelar a terra, a areia ou a argila da área da forma que desejar. Pode elevar ou baixar o terreno, criar ou preencher uma vala, erguer ou nivelar uma parede ou formar uma coluna. A extensão de qualquer destas alterações não pode exceder metade da maior dimensão da área. Assim, se afetar um quadrado de 40 pés (12 metros), pode criar uma coluna até 20 pés (6 metros) de altura, elevar ou baixar o terreno até 20 pés (6 metros), escavar uma vala até 20 pés (6 metros) de profundidade, e assim por diante. Estas alterações demoram 10 minutos a concluir.\nAo fim de cada período de 10 minutos durante o qual se concentre na magia, pode escolher uma nova área de terreno para afetar.\nComo a transformação do terreno ocorre lentamente, normalmente as criaturas na área não podem ficar presas nem sofrer ferimentos devido ao movimento do solo.\nEsta magia não pode manipular pedra natural nem construções de pedra. As rochas e estruturas deslocam-se para acomodar o novo terreno. Se a forma como moldar o terreno tornar uma estrutura instável, esta poderá desabar.\nDo mesmo modo, esta magia não afeta diretamente o crescimento das plantas. A terra deslocada transporta consigo quaisquer plantas que nela se encontrem.","h":""},{"n":"Muralha de Espinhos","l":6,"s":"Conjuração","c":["Druida"],"t":"1 ação","r":"120 pés (36 metros)","d":"Até 10 minutos","k":"V, S, M (Um punhado de espinhos)","cc":true,"rt":false,"x":"Cria uma muralha de vegetação rasteira, resistente, flexível e emaranhada, eriçada de espinhos afiados como agulhas. A muralha surge dentro do alcance, sobre uma superfície sólida, e permanece durante a duração da magia. Escolhes se a muralha terá até 60 pés (18 metros) de comprimento, 10 pés (3 metros) de altura e 5 pés (1,5 metros) de espessura, ou se será um círculo com 20 pés (6 metros) de diâmetro, até 20 pés (6 metros) de altura e 5 pés (1,5 metros) de espessura. A muralha bloqueia a linha de visão.\nQuando a muralha surge, cada criatura na sua área tem de realizar um teste de resistência de Destreza. Se falhar, sofre 7d8 de dano perfurante, ou metade desse dano se for bem-sucedida.\nUma criatura pode atravessar a muralha, embora o faça lenta e dolorosamente. Por cada pé (30 centímetros) que se deslocar através da muralha, tem de gastar 4 pés (1,2 metros) de deslocamento. Além disso, na primeira vez que uma criatura entra na muralha num turno ou termina o seu turno nela, tem de realizar um teste de resistência de Destreza. Se falhar, sofre 7d8 de dano cortante, ou metade desse dano se for bem-sucedida.","h":"Quando conjuras esta magia usando um espaço de magia de 7.º nível ou superior, ambos os tipos de dano aumentam em 1d8 por cada nível do espaço acima do 6.º."},{"n":"Muralha de Gelo","l":6,"s":"Evocação","c":["Mago"],"t":"1 ação","r":"120 pés (36 metros)","d":"Até 10 minutos","k":"V, S, M (Um pequeno pedaço de quartzo)","cc":true,"rt":false,"x":"Cria uma muralha de gelo numa superfície sólida dentro do alcance. Podes dar-lhe a forma de uma cúpula hemisférica ou de uma esfera com um raio de até 10 pés (3 metros), ou moldá-la como uma superfície plana composta por dez painéis quadrados de 10 pés (3 metros) de lado. Cada painel tem de estar ligado a outro painel. Em qualquer forma, a muralha tem 1 pé (30 centímetros) de espessura e permanece durante a duração da magia.\nSe a muralha atravessar o espaço ocupado por uma criatura quando surgir, a criatura dentro da sua área é empurrada para um dos lados da muralha e tem de realizar um teste de resistência de Destreza. Se falhar, sofre 10d6 de dano de frio, ou metade desse dano se for bem-sucedida.\nA muralha é um objeto que pode ser danificado e, por isso, rompido. Tem CA 12 e 30 pontos de vida por cada secção de 10 pés (3 metros), e é vulnerável a dano de fogo. Reduzir uma secção de 10 pés (3 metros) da muralha a 0 pontos de vida destrói-a e deixa para trás uma camada de ar gélido no espaço que a muralha ocupava. Uma criatura que atravesse essa camada de ar gélido pela primeira vez num turno tem de realizar um teste de resistência de Constituição. Se falhar, sofre 5d6 de dano de frio, ou metade desse dano se for bem-sucedida.","h":"Quando conjuras esta magia usando um espaço de magia de 7.º nível ou superior, o dano causado pela muralha quando surge aumenta em 2d6 e o dano causado ao atravessar a camada de ar gélido aumenta em 1d6 por cada nível do espaço acima do 6.º."},{"n":"Palavra de Regresso","l":6,"s":"Conjuração","c":["Clérigo"],"t":"1 ação","r":"5 pés (1,5 metros)","d":"Instantânea","k":"V","cc":false,"rt":false,"x":"Tu e até cinco criaturas voluntárias a até 5 pés (1,5 metros) de ti teleportam-se instantaneamente para um santuário previamente designado. Tu e quaisquer criaturas que se teleportem contigo surgem no espaço desocupado mais próximo do local que designaste quando preparaste o teu santuário (ver abaixo). Se conjurares esta magia sem teres preparado previamente um santuário, a magia não produz qualquer efeito.\nTens de designar um santuário conjurando esta magia num local, como um templo, dedicado à tua divindade ou fortemente associado a ela. Se tentares conjurar a magia desta forma numa área que não seja dedicada à tua divindade, a magia não produz qualquer efeito.","h":""},{"n":"Proibição","l":6,"s":"Abjuração","c":["Clérigo"],"t":"10 minutos","r":"Toque","d":"24 horas","k":"V, S, M (Um borrifo de água benta, incenso raro e pó de rubi valendo pelo menos 1.000 po)","cc":false,"rt":true,"x":"Você cria uma proteção contra viagens mágicas que protege até 3.700 metros quadrados (40.000 pés quadrados) de espaço no chão até uma altura de 9 metros (30 pés) acima do chão. Pela duração, criaturas não podem se teletransportar para a área ou usar portais, como os criados pela magia portal, para entrar na área. A magia protege a área contra viagens planares, e portanto impede criaturas de acessar a área através do Plano Astral, Plano Etéreo, Agrestia Feérica, Pendor das Sombras ou a magia viagem planar.\nAlém disso, a magia fere tipos de criaturas que você escolher quando a conjura. Escolha um ou mais dos seguintes: celestiais, elementais, feéricos, corruptores e mortos-vivos. Quando uma criatura escolhida entra na área da magia pela primeira vez num turno ou começa seu turno nela, a criatura sofre 5d10 de dano radiante ou necrótico (à sua escolha quando conjura esta magia).\nQuando você conjura esta magia, você pode designar uma senha. Uma criatura que fale a senha ao entrar na área não sofre dano da magia.\nA área da magia não pode se sobrepor à área de outra magia proibição. Se você conjurar proibição todos os dias por 30 dias no mesmo local, a magia dura até ser dissipada, e os componentes materiais são consumidos na última conjuração.","h":""},{"n":"Raio Solar","l":6,"s":"Evocação","c":["Druida","Feiticeiro","Mago"],"t":"1 ação","r":"Pessoal","d":"Até 1 minuto","k":"V, S, M (Uma lupa)","cc":true,"rt":false,"x":"Um feixe de luz brilhante irrompe da tua mão, formando uma linha com 5 pés (1,5 metros) de largura e 60 pés (18 metros) de comprimento. Cada criatura na linha tem de realizar uma salvaguarda de Constituição. Se falhar, sofre 6d8 de dano radiante e fica cega até ao teu próximo turno. Se for bem-sucedida, sofre metade do dano e não fica cega por esta magia. Mortos-vivos e limos têm desvantagem nesta salvaguarda.\nPodes criar uma nova linha de luz radiante usando a tua ação em qualquer turno até a magia terminar.\nDurante a duração, uma pequena esfera de luz radiante brilha na tua mão. Emite luz plena num raio de 30 pés (9 metros) e penumbra por mais 30 pés (9 metros). Esta luz é luz solar.","h":""},{"n":"Recipiente Mágico","l":6,"s":"Necromancia","c":["Mago"],"t":"1 minuto","r":"Pessoal","d":"Até ser dissipada","k":"V, S, M (Uma gema, cristal, relicário ou outro recipiente ornamental no valor de pelo menos 500 po)","cc":false,"rt":false,"x":"O seu corpo entra num estado catatónico enquanto a sua alma o abandona e entra no recipiente utilizado como componente material da magia. Enquanto a sua alma habitar o recipiente, está consciente do que o rodeia como se estivesse no espaço do recipiente. Não pode mover-se nem usar reações. A única ação que pode realizar é projetar a sua alma até 100 pés (30 metros) para fora do recipiente, regressando ao seu corpo vivo (terminando a magia) ou tentando possuir o corpo de um humanoide.\nPode tentar possuir qualquer humanoide a até 100 pés (30 metros) de si que consiga ver (criaturas protegidas por uma magia de proteção contra o bem e o mal ou círculo mágico não podem ser possuídas). O alvo deve realizar um teste de resistência de Carisma. Se falhar, a sua alma entra no corpo do alvo e a alma do alvo fica presa no recipiente. Se for bem-sucedido, o alvo resiste à sua tentativa de o possuir e não pode voltar a tentar possuí-lo durante 24 horas.\nAssim que possuir o corpo de uma criatura, passa a controlá-lo. As suas estatísticas de jogo são substituídas pelas estatísticas da criatura, embora mantenha o seu alinhamento e os seus valores de Inteligência, Sabedoria e Carisma. Mantém os benefícios das suas próprias características de classe. Se o alvo tiver níveis de classe, não pode usar nenhuma das suas características de classe.\nEntretanto, a alma da criatura possuída pode perceber o que a rodeia a partir do recipiente usando os seus próprios sentidos, mas não pode mover-se nem realizar ações.\nEnquanto possuir um corpo, pode usar a sua ação para regressar do corpo hospedeiro ao recipiente, caso este esteja a até 100 pés (30 metros) de si, devolvendo a alma da criatura hospedeira ao seu corpo. Se o corpo hospedeiro morrer enquanto estiver nele, a criatura morre e deve realizar um teste de resistência de Carisma contra a sua própria CD para resistir às suas magias. Se for bem-sucedido, regressa ao recipiente, caso este esteja a até 100 pés (30 metros) de si. Caso contrário, morre.\nSe o recipiente for destruído ou a magia terminar, a sua alma regressa imediatamente ao seu corpo. Se o seu corpo estiver a mais de 100 pés (30 metros) de si ou estiver morto quando tentar regressar a ele, morre. Se a alma de outra criatura estiver no recipiente quando este for destruído, a alma da criatura regressa ao seu corpo se este estiver vivo e a até 100 pés (30 metros). Caso contrário, essa criatura morre.\nQuando a magia termina, o recipiente é destruído.","h":""},{"n":"Relâmpago em Cadeia","l":6,"s":"Evocação","c":["Feiticeiro","Mago"],"t":"1 ação","r":"150 pés (45 metros)","d":"Instantânea","k":"V, S, M (Um bocado de pelo; um pedaço de âmbar, vidro, ou uma vareta de cristal; e três alfinetes de prata)","cc":false,"rt":false,"x":"Cria um relâmpago que forma um arco em direção a um alvo à sua escolha que possa ver dentro do alcance. Três relâmpagos saltam então desse alvo para até outros três alvos, cada um dos quais deve estar a até 30 pés (9 metros) do primeiro alvo. Um alvo pode ser uma criatura ou um objeto e pode ser alvo de apenas um dos relâmpagos.\nUm alvo deve fazer um teste de resistência de Destreza. O alvo sofre 10d8 de dano de relâmpago num teste falhado, ou metade do dano num teste bem-sucedido.","h":"Quando conjura esta magia usando um espaço de magia de 7º nível ou superior, um relâmpago adicional salta do primeiro alvo para outro alvo para cada nível do espaço acima do 6º."},{"n":"Sugestão em Massa","l":6,"s":"Encantamento","c":["Bardo","Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"60 pés (18,3 metros)","d":"24 horas","k":"V, M (Uma língua de serpente e um pouco de favo de mel ou uma gota de óleo doce)","cc":false,"rt":false,"x":"Sugere um curso de ação (limitado a uma ou duas frases) e influencia magicamente até doze criaturas à sua escolha que consiga ver dentro do alcance e que consigam ouvi-lo e compreendê-lo. As criaturas que não podem ser enfeitiçadas são imunes a este efeito. A sugestão deve ser formulada de modo a fazer o curso de ação parecer razoável. Pedir a uma criatura que se apunhale, se atire contra uma lança, se imole ou pratique qualquer outro ato obviamente prejudicial anula automaticamente o efeito da magia.\nCada alvo deve realizar um teste de resistência de Sabedoria. Se falhar, segue o curso de ação descrito da melhor forma que conseguir. O curso de ação sugerido pode continuar durante toda a duração. Se a atividade sugerida puder ser concluída em menos tempo, a magia termina quando o alvo acaba aquilo que lhe foi pedido.\nTambém pode especificar condições que desencadeiem uma atividade especial durante a duração. Por exemplo, pode sugerir que um grupo de soldados dê todo o seu dinheiro ao primeiro mendigo que encontrar. Se a condição não for cumprida antes de a magia terminar, a atividade não é realizada.\nSe você ou qualquer um dos seus companheiros causar dano a uma criatura afetada por esta magia, a magia termina para essa criatura.","h":"Se conjurar esta magia usando um espaço de magia de 7.º nível, a duração é de 10 dias. Se usar um espaço de magia de 8.º nível, a duração é de 30 dias. Se usar um espaço de magia de 9.º nível, a duração é de um ano e um dia."},{"n":"Transporte pelas Plantas","l":6,"s":"Conjuração","c":["Druida"],"t":"1 ação","r":"10 pés (3 metros)","d":"1 rodada","k":"V, S","cc":false,"rt":false,"x":"Esta magia cria uma ligação mágica entre uma planta inanimada de tamanho Grande ou superior dentro do alcance e outra planta, a qualquer distância, no mesmo plano de existência. Tens de ter visto ou tocado a planta de destino pelo menos uma vez. Durante a duração, qualquer criatura pode entrar na planta-alvo e sair pela planta de destino, usando 5 pés (1,5 metros) do seu deslocamento.","h":""},{"n":"Visão Verdadeira","l":6,"s":"Adivinhação","c":["Bardo","Clérigo","Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"Toque","d":"1 hora","k":"V, S, M (Uma pomada para os olhos que custa 25 po, feita de pó de cogumelos, açafrão e gordura, e que é consumida pela magia)","cc":false,"rt":false,"x":"Esta magia concede à criatura voluntária em quem tocas a capacidade de ver as coisas tal como realmente são. Durante a duração, a criatura tem visão verdadeira, deteta portas secretas ocultas por magia e consegue ver o Plano Etéreo, tudo até um alcance de 120 pés (36 metros).","h":""},{"n":"Bola de Fogo de Explosão Atrasada","l":7,"s":"Evocação","c":["Feiticeiro","Mago"],"t":"1 ação","r":"150 pés (45 metros)","d":"Até 1 minuto","k":"V, S, M (Uma minúscula bola de guano de morcego e enxofre)","cc":true,"rt":false,"x":"Um feixe de luz amarela pisca do seu dedo indicador, depois condensa-se para pairar num ponto escolhido dentro do alcance como uma conta brilhante pela duração. Quando a magia termina, seja porque a sua concentração foi quebrada ou porque decidiu terminá-la, a conta floresce com um rugido baixo numa explosão de chamas que se espalha ao virar das esquinas. Cada criatura numa esfera de 20 pés (6 metros) de raio centrada nesse ponto deve fazer um teste de resistência de Destreza. Uma criatura sofre dano de fogo igual ao dano total acumulado num teste falhado, ou metade do dano num teste bem-sucedido.\nO dano base da magia é 12d6. Se no final do seu turno a conta ainda não tiver detonado, o dano aumenta em 1d6.\nSe a conta brilhante for tocada antes do intervalo ter expirado, a criatura que a toca deve fazer um teste de resistência de Destreza. Num teste falhado, a magia termina imediatamente, fazendo com que a conta entre em erupção em chamas. Num teste bem-sucedido, a criatura pode arremessar a conta até 40 pés (12 metros). Quando atinge uma criatura ou um objeto sólido, a magia termina e a conta explode.\nO fogo danifica objetos na área e incendeia objetos inflamáveis que não estejam a ser vestidos ou carregados.","h":"Quando conjura esta magia usando um espaço de magia de 8º nível ou superior, o dano base aumenta em 1d6 para cada nível do espaço acima do 7º."},{"n":"Conjurar Celestial","l":7,"s":"Conjuração","c":["Clérigo"],"t":"1 minuto","r":"90 pés (27 metros)","d":"Até 1 hora","k":"V, S","cc":true,"rt":false,"x":"Invoca um celestial de nível de desafio 4 ou inferior, que aparece num espaço desocupado que possa ver dentro do alcance. O celestial desaparece quando cai para 0 pontos de vida ou quando a magia termina.\nO celestial é amigável consigo e com os seus companheiros pela duração. Role iniciativa para o celestial, que tem os seus próprios turnos. Ele obedece a quaisquer comandos verbais que lhe dê (nenhuma ação requerida da sua parte), desde que não violem o seu alinhamento. Se não der nenhuns comandos ao celestial, ele defende-se de criaturas hostis, mas de resto não toma ações.\nO DM tem as estatísticas do celestial.","h":"Quando conjura esta magia usando um espaço de magia de 9º nível, invoca um celestial de nível de desafio 5 ou inferior."},{"n":"Dedo da Morte","l":7,"s":"Necromancia","c":["Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"60 pés (18 metros)","d":"Instantânea","k":"V, S","cc":false,"rt":false,"x":"Envia energia negativa a percorrer uma criatura que possa ver dentro do alcance, causando-lhe dor lancinante. O alvo deve fazer um teste de resistência de Constituição. Sofre 7d8 + 30 de dano necrótico num teste falhado, ou metade do dano num teste bem-sucedido.\nUm humanoide morto por esta magia ergue-se no início do seu próximo turno como um zombie que está permanentemente sob o seu comando, seguindo as suas ordens verbais da melhor forma possível.","h":""},{"n":"Espada Arcana","l":7,"s":"Evocação","c":["Bardo","Mago"],"t":"1 ação","r":"60 pés (18 metros)","d":"Até 1 minuto","k":"V, S, M (Uma espada em miniatura de platina com punho e pomo de cobre e zinco, no valor de 250 po)","cc":true,"rt":false,"x":"Cria um plano de força em forma de espada que paira dentro do alcance. Dura pela duração da magia.\nQuando a espada aparece, faz um ataque de magia corpo-a-corpo contra um alvo à sua escolha a até 5 pés (1,5 metros) da espada. Num acerto, o alvo sofre 3d10 de dano de força. Até a magia terminar, pode usar uma ação bónus em cada um dos seus turnos para mover a espada até 20 pés (6 metros) para um local que possa ver e repetir este ataque contra o mesmo alvo ou outro diferente.","h":""},{"n":"Forma Etérea","l":7,"s":"Transmutação","c":["Clérigo","Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"Pessoal","d":"Até 8 horas","k":"V, S","cc":false,"rt":false,"x":"Passa para as regiões fronteiriças do Plano Etéreo, na área onde este se sobrepõe ao seu plano atual. Permanece no Etéreo Fronteiriço pela duração ou até usar a sua ação para dissipar a magia. Durante este tempo, pode mover-se em qualquer direção. Se se mover para cima ou para baixo, cada pé de movimento custa um pé extra. Consegue ver e ouvir o plano de onde originou, mas tudo lá aparenta ser cinzento, e não consegue ver nada a mais de 60 pés (18 metros) de distância.\nEnquanto estiver no Plano Etéreo, apenas pode afetar e ser afetado por outras criaturas nesse plano. Criaturas que não estejam no Plano Etéreo não o conseguem perceber nem interagir consigo, a menos que uma habilidade especial ou magia lhes tenha concedido a capacidade de o fazer.\nIgnora todos os objetos e efeitos que não estejam no Plano Etéreo, permitindo-lhe mover-se através de objetos que perceciona no plano de onde originou.\nQuando a magia termina, regressa imediatamente ao plano de onde originou no local que ocupa atualmente. Se ocupar o mesmo local que um objeto sólido ou criatura quando isso acontecer, é imediatamente expelido para o espaço desocupado mais próximo que possa ocupar e sofre dano de força igual ao dobro do número de pés que foi movido.\nEsta magia não tem efeito se a conjurar enquanto estiver no Plano Etéreo ou num plano que não seja fronteiriço a este, como um dos Planos Exteriores.","h":"Quando conjura esta magia usando um espaço de magia de 8º nível ou superior, pode ter como alvo até três criaturas voluntárias (incluindo si) para cada nível do espaço acima do 7º. As criaturas devem estar a até 10 pés (3 metros) de si quando conjura a magia."},{"n":"Inverter a Gravidade","l":7,"s":"Transmutação","c":["Druida","Feiticeiro","Mago"],"t":"1 ação","r":"100 pés (30 metros)","d":"Até 1 minuto","k":"V, S, M (Uma pedra-íman e limalhas de ferro)","cc":true,"rt":false,"x":"Esta magia inverte a gravidade num cilindro com um raio de 50 pés (15 metros) e uma altura de 100 pés (30 metros), centrado num ponto dentro do alcance. Todas as criaturas e objetos na área que não estejam de alguma forma presos ao solo caem para cima e chegam ao topo da área quando conjuras esta magia. Uma criatura pode realizar uma salvaguarda de Destreza para se agarrar a um objeto fixo ao seu alcance, evitando assim a queda.\nSe algum objeto sólido (como um teto) for encontrado durante esta queda, as criaturas e objetos em queda chocam contra ele como aconteceria durante uma queda normal para baixo. Se uma criatura ou objeto alcançar o topo da área sem embater em nada, permanece ali, oscilando ligeiramente, durante a duração.\nNo fim da duração, os objetos e criaturas afetados caem novamente para baixo.","h":""},{"n":"Mansão Magnífica","l":7,"s":"Conjuração","c":["Bardo","Mago"],"t":"1 minuto","r":"300 pés (91,4 metros)","d":"24 horas","k":"V, S, M (Um portal em miniatura esculpido em marfim, um pequeno pedaço de mármore polido e uma colher minúscula de prata, cada objeto no valor de pelo menos 5 po)","cc":false,"rt":false,"x":"Conjura uma habitação extradimensional dentro do alcance que dura enquanto durar a magia. Escolhe onde fica localizada a sua única entrada. A entrada cintila ligeiramente e tem 5 pés (1,5 metros) de largura e 10 pés (3 metros) de altura. Você e qualquer criatura que designe quando conjura a magia podem entrar na habitação extradimensional enquanto o portal permanecer aberto. Pode abrir ou fechar o portal se estiver a até 30 pés (9 metros) dele. Enquanto estiver fechado, o portal é invisível.\nDo outro lado do portal encontra-se um magnífico vestíbulo, para além do qual existem numerosas câmaras. A atmosfera é limpa, fresca e quente.\nPode criar a planta que desejar, mas o espaço não pode exceder 50 cubos, cada um com 10 pés (3 metros) de lado. O local é mobilado e decorado como desejar. Contém comida suficiente para servir um banquete de nove pratos para até 100 pessoas. Um grupo de 100 criados quase transparentes atende todos os que entram. Decide a aparência visual e o vestuário desses criados. São completamente obedientes às suas ordens. Cada criado pode realizar qualquer tarefa que um criado humano normal conseguiria realizar, mas não pode atacar nem realizar qualquer ação que prejudique diretamente outra criatura. Assim, os criados podem ir buscar objetos, limpar, remendar, dobrar roupa, acender fogueiras, servir comida, servir vinho e assim por diante. Os criados podem ir a qualquer lugar da mansão, mas não podem sair dela. O mobiliário e outros objetos criados por esta magia dissipam-se em fumo se forem retirados da mansão. Quando a magia termina, quaisquer criaturas que estejam dentro do espaço extradimensional são expulsas para os espaços abertos mais próximos da entrada.","h":""},{"n":"Miragem Arcana","l":7,"s":"Ilusão","c":["Bardo","Druida","Mago"],"t":"10 minutos","r":"Visão","d":"10 dias","k":"V, S","cc":false,"rt":false,"x":"Faz com que o terreno numa área de até 1 milha quadrada (2,6 quilómetros quadrados) pareça, soe, cheire e até tenha o tato de outro tipo de terreno. No entanto, a forma geral do terreno permanece a mesma. Campos abertos ou uma estrada podem parecer um pântano, colina, ravina ou outro terreno difícil ou intransitável. Um lago pode parecer um prado relvado, um precipício pode parecer uma encosta suave ou uma ravina rochosa pode parecer uma estrada larga e lisa.\nDo mesmo modo, pode alterar a aparência de estruturas ou acrescentá-las onde não existam. A magia não disfarça, oculta nem acrescenta criaturas.\nA ilusão inclui elementos auditivos, visuais, táteis e olfativos, podendo transformar terreno normal em terreno difícil (ou vice-versa) ou, de outro modo, dificultar o movimento pela área. Qualquer parte do terreno ilusório (como uma pedra ou um pau) que seja retirada da área da magia desaparece imediatamente.\nCriaturas com visão verdadeira conseguem ver através da ilusão e perceber a forma verdadeira do terreno; contudo, todos os outros elementos da ilusão permanecem, pelo que, embora a criatura tenha consciência da presença da ilusão, ainda pode interagir fisicamente com ela.","h":""},{"n":"Mudança de Plano","l":7,"s":"Conjuração","c":["Clérigo","Druida","Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"Toque","d":"Instantânea","k":"V, S, M (Uma haste metálica bifurcada no valor mínimo de 250 po, sintonizada com um plano de existência específico)","cc":false,"rt":false,"x":"Você e até oito criaturas voluntárias que deem as mãos em círculo são transportados para um plano de existência diferente. Pode especificar um destino em termos gerais, como a Cidade de Bronze no Plano Elemental do Fogo ou o palácio de Dispater no segundo nível dos Nove Infernos, e surgirá nesse destino ou perto dele. Se tentar chegar à Cidade de Bronze, por exemplo, poderá surgir na Rua de Aço, diante do Portão das Cinzas ou a observar a cidade do outro lado do Mar de Fogo, à discrição do Mestre.\nEm alternativa, se conhecer a sequência de símbolos de um círculo de teletransporte noutro plano de existência, esta magia pode transportá-lo até esse círculo. Se o círculo de teletransporte for demasiado pequeno para acomodar todas as criaturas transportadas, estas surgem nos espaços desocupados mais próximos do círculo.\nPode usar esta magia para banir uma criatura involuntária para outro plano. Escolha uma criatura ao seu alcance e realize um ataque mágico corpo a corpo contra ela. Se acertar, a criatura tem de realizar um teste de resistência de Carisma. Se falhar, é transportada para um local aleatório no plano de existência que especificar. Uma criatura transportada desta forma tem de encontrar o seu próprio caminho de regresso ao plano de existência onde se encontra atualmente.","h":""},{"n":"Palavra Divina","l":7,"s":"Evocação","c":["Clérigo"],"t":"1 ação bônus","r":"30 pés (9 metros)","d":"Instantânea","k":"V","cc":false,"rt":false,"x":"Profere uma palavra divina, cheia do poder que moldou o mundo no alvorecer da criação. Escolha quantas criaturas quiser de entre as que consiga ver dentro do alcance da magia. Cada criatura que o ouça deve fazer um teste de resistência de Carisma ou sofrerá um efeito com base nos seus pontos de vida atuais:\n- 50 pv ou menos: emudecida por 1 minuto\n- 40 pv ou menos: ensurdecida e cega por 10 minutos\n- 30 pv ou menos: cega, ensurdecida e atordoada por 1 hora\n- 20 pv ou menos: morta instantaneamente\nIndependentemente dos seus pontos de vida atuais, um celestial, elemental, ser feérico ou corruptor que falhe o seu teste de resistência é enviado de volta ao seu plano de origem (se não estiver lá já) e não pode regressar ao seu plano durante 24 horas, por qualquer meio, com a exceção da magia desejo.","h":""},{"n":"Prisão de Força","l":7,"s":"Evocação","c":["Bardo","Bruxo","Mago"],"t":"1 ação","r":"30 metros","d":"1 hora","k":"V, S, M (Pó de rubi valendo 1.500 po)","cc":false,"rt":false,"x":"Uma prisão imóvel, invisível, em forma de cubo, composta de força mágica surge em torno de uma área à sua escolha dentro do alcance. A prisão pode ser uma jaula ou uma caixa sólida, à sua escolha.\nUma prisão na forma de jaula pode ter até 6 metros de lado e é feita de barras de 1,2 cm de diâmetro espaçadas de 1,2 cm umas das outras.\nUma prisão na forma de uma caixa pode ter até 3 metros de lado, criando uma barreira sólida que impede que qualquer matéria passe através dela e bloqueando quaisquer magias conjuradas para dentro ou para fora da área.\nQuando você conjura a magia, qualquer criatura que esteja completamente dentro da área da jaula fica presa. Criaturas que estejam apenas parcialmente dentro da área, ou aquelas grandes demais para caber na área, são empurradas para longe do centro da área até que estejam completamente fora dela.\nUma criatura dentro da jaula não pode sair dela por meios não mágicos. Se a criatura tentar usar teletransporte ou viagem interplanar para deixar a jaula, ela deve primeiro fazer um teste de resistência de Carisma. Em um sucesso, a criatura pode usar essa magia para sair da jaula. Em uma falha, a criatura não pode sair da jaula e gasta o uso da magia ou efeito. A jaula também se estende ao Plano Etéreo, bloqueando viagem etérea.\nEsta magia não pode ser dissipada por dissipar magia.","h":""},{"n":"Projetar Imagem","l":7,"s":"Ilusão","c":["Bardo","Mago"],"t":"1 ação","r":"500 milhas (800 km)","d":"Até 24 horas","k":"V, S, M (Uma pequena réplica sua, feita de materiais no valor mínimo de 5 po)","cc":true,"rt":false,"x":"Cria uma cópia ilusória de si que dura durante a duração da magia. A cópia pode surgir em qualquer local dentro do alcance que já tenha visto, independentemente dos obstáculos existentes entre si e esse local. A ilusão tem a sua aparência e voz, mas é intangível. Se a ilusão sofrer qualquer dano, desaparece e a magia termina.\nPode usar a sua ação para mover esta ilusão até ao dobro do seu deslocamento e fazê-la gesticular, falar e comportar-se da forma que desejar. A ilusão imita perfeitamente os seus maneirismos.\nPode ver através dos olhos da ilusão e ouvir através dos seus ouvidos como se estivesse no espaço que ela ocupa. No seu turno, pode usar uma ação bónus para alternar entre utilizar os sentidos da ilusão e os seus próprios sentidos. Enquanto utilizar os sentidos da ilusão, fica cego e surdo em relação ao que o rodeia.\nA interação física com a imagem revela que se trata de uma ilusão, pois os objetos podem atravessá-la. Uma criatura que use a sua ação para examinar a imagem pode determinar que se trata de uma ilusão com um teste bem-sucedido de Inteligência (Investigação) contra a CD das suas magias. Se uma criatura perceber a verdadeira natureza da ilusão, consegue ver através da imagem, e qualquer ruído que esta produza soa-lhe a oco.","h":""},{"n":"Rajada Prismática","l":7,"s":"Evocação","c":["Feiticeiro","Mago"],"t":"1 ação","r":"Pessoal","d":"Instantânea","k":"V, S","cc":false,"rt":false,"x":"Oito raios de luz multicoloridos irrompem da sua mão. Cada raio tem uma cor diferente e um poder e propósito distintos. Cada criatura num cone de 60 pés (18 metros) tem de realizar um teste de resistência de Destreza. Para cada alvo, lance 1d8 para determinar qual raio colorido o afeta.\n1. Vermelho. O alvo sofre 10d6 de dano de fogo se falhar o teste de resistência, ou metade desse dano se for bem-sucedido.\n2. Laranja. O alvo sofre 10d6 de dano de ácido se falhar o teste de resistência, ou metade desse dano se for bem-sucedido.\n3. Amarelo. O alvo sofre 10d6 de dano elétrico se falhar o teste de resistência, ou metade desse dano se for bem-sucedido.\n4. Verde. O alvo sofre 10d6 de dano venenoso se falhar o teste de resistência, ou metade desse dano se for bem-sucedido.\n5. Azul. O alvo sofre 10d6 de dano de frio se falhar o teste de resistência, ou metade desse dano se for bem-sucedido.\n6. Índigo. Se falhar o teste de resistência, o alvo fica impedido. Tem então de realizar um teste de resistência de Constituição no final de cada um dos seus turnos. Se for bem-sucedido em três testes, a magia termina. Se falhar três testes, transforma-se permanentemente em pedra e fica sujeito à condição petrificado. Os sucessos e as falhas não precisam de ser consecutivos; registe ambos até o alvo obter três resultados iguais.\n7. Violeta. Se falhar o teste de resistência, o alvo fica cego. Tem então de realizar um teste de resistência de Sabedoria no início do seu próximo turno. Um sucesso termina a cegueira. Se falhar esse teste, a criatura é transportada para outro plano de existência à escolha do Mestre e deixa de estar cega. (Normalmente, uma criatura que se encontre num plano que não seja o seu plano natal é banida de volta para casa, enquanto as restantes criaturas são geralmente lançadas para os planos Astral ou Etéreo.)\n8. Especial. O alvo é atingido por dois raios. Lance mais duas vezes, repetindo qualquer resultado 8.","h":""},{"n":"Reclusão","l":7,"s":"Transmutação","c":["Mago"],"t":"1 ação","r":"Toque","d":"Até ser dissipada","k":"V, S, M (Um pó composto por pó de diamante, esmeralda, rubi e safira, no valor mínimo de 5 000 po, consumido pela magia)","cc":false,"rt":false,"x":"Por meio desta magia, uma criatura voluntária ou um objeto pode ser escondido, ficando protegido contra deteção durante a duração. Quando conjuras a magia e tocas no alvo, este torna-se invisível e não pode ser escolhido como alvo de magias de adivinhação nem ser percebido através de sensores de vidência criados por magias de adivinhação.\nSe o alvo for uma criatura, entra num estado de animação suspensa. O tempo deixa de passar para ela e não envelhece.\nPodes definir uma condição para que a magia termine antecipadamente. A condição pode ser qualquer uma à tua escolha, mas tem de ocorrer ou ser visível a até 1 milha (1,6 quilómetros) do alvo. Exemplos incluem «daqui a 1 000 anos» ou «quando o tarrasque despertar». A magia também termina se o alvo sofrer qualquer dano.","h":""},{"n":"Regenerar","l":7,"s":"Transmutação","c":["Bardo","Clérigo","Druida"],"t":"1 minuto","r":"Toque","d":"1 hora","k":"V, S, M (Uma roda de oração e água benta)","cc":false,"rt":false,"x":"Tocas numa criatura e estimulas a sua capacidade natural de cura. O alvo recupera 4d8 + 15 pontos de vida. Durante a duração da magia, o alvo recupera 1 ponto de vida no início de cada um dos seus turnos (10 pontos de vida por minuto).\nOs membros do corpo do alvo que tenham sido amputados (dedos, pernas, caudas e semelhantes) são restaurados após 2 minutos. Se tiveres a parte amputada e a encostares ao respetivo coto, a magia faz com que o membro se una instantaneamente ao corpo.","h":""},{"n":"Ressurreição (Resurrection)","l":7,"s":"Necromancia","c":["Bardo","Clérigo"],"t":"1 hora","r":"Toque","d":"Instantânea","k":"V, S, M (Um diamante no valor mínimo de 1 000 po, consumido pela magia)","cc":false,"rt":false,"x":"Tocas numa criatura morta há não mais de um século, que não tenha morrido de velhice e que não seja um morto-vivo. Se a sua alma estiver livre e disposta, o alvo regressa à vida com todos os seus pontos de vida.\nEsta magia neutraliza quaisquer venenos e cura doenças normais que afetassem a criatura quando morreu. No entanto, não remove doenças mágicas, maldições ou efeitos semelhantes; se esses efeitos não forem removidos antes de a magia ser conjurada, continuarão a afetar o alvo quando este regressar à vida.\nA magia fecha todas as feridas mortais e restaura quaisquer partes do corpo em falta.\nRegressar dos mortos é uma provação. O alvo sofre uma penalização de -4 em todas as jogadas de ataque, salvaguardas e testes de atributo. Sempre que o alvo termina um descanso longo, a penalização diminui em 1, até desaparecer.\nConjurar esta magia para devolver a vida a uma criatura que esteja morta há um ano ou mais exige um enorme esforço de ti. Até terminares um descanso longo, não podes voltar a conjurar magias e tens desvantagem em todas as jogadas de ataque, testes de atributo e salvaguardas.","h":""},{"n":"Símbolo","l":7,"s":"Abjuração","c":["Bardo","Clérigo","Mago"],"t":"1 minuto","r":"Toque","d":"Até ser dissipada","k":"V, S, M (Mercúrio, fósforo e pó de diamante e opala, com um valor total de pelo menos 1.000 po, que a magia consome)","cc":false,"rt":false,"x":"Quando conjuras esta magia, inscreves um glifo nocivo numa superfície (como uma parte do chão, uma parede ou uma mesa) ou no interior de um objeto que possa ser fechado para ocultar o glifo (como um livro, pergaminho ou baú de tesouro). Se escolheres uma superfície, o glifo pode cobrir uma área com, no máximo, 10 pés (3 metros) de diâmetro. Se escolheres um objeto, este tem de permanecer no mesmo lugar; se for deslocado mais de 10 pés (3 metros) do local onde conjuraste a magia, o glifo é quebrado e a magia termina sem ser ativada.\nO glifo é quase invisível, sendo necessário realizar um teste de Inteligência (Investigação) contra a CD da tua salvaguarda de magia para o encontrar.\nDecides o que ativa o glifo quando conjuras a magia. Para glifos inscritos numa superfície, os gatilhos mais comuns incluem tocar ou pisar o glifo, remover outro objeto que o cubra, aproximar-se a uma determinada distância ou manipular o objeto que o contém. Para glifos inscritos num objeto, os gatilhos mais comuns são abrir o objeto, aproximar-se a uma determinada distância ou ver ou ler o glifo.\nPodes refinar ainda mais o gatilho, fazendo com que a magia só seja ativada em determinadas circunstâncias ou de acordo com características físicas de uma criatura (como altura ou peso), ou com o seu tipo físico (por exemplo, a proteção pode ser configurada para afetar bruxas ou metamorfos). Também podes especificar criaturas que não ativam o glifo, como aquelas que digam uma determinada palavra-passe.\nAo inscreveres o glifo, escolhe uma das opções abaixo para o seu efeito. Depois de ativado, o glifo brilha, preenchendo uma esfera de 60 pés (18 metros) de raio com penumbra durante 10 minutos, após os quais a magia termina. Cada criatura que esteja na esfera quando o glifo é ativado é afetada pelo seu efeito, assim como qualquer criatura que entre na esfera pela primeira vez num turno ou termine o seu turno nela.\nMorte.\nCada alvo tem de realizar uma salvaguarda de Constituição. Se falhar, sofre 10d10 de dano necrótico; se for bem-sucedido, sofre metade desse dano.\nDiscórdia.\nCada alvo tem de realizar uma salvaguarda de Constituição. Se falhar, discute e troca insultos com outras criaturas durante 1 minuto. Durante esse período, é incapaz de comunicar de forma significativa e tem desvantagem nas jogadas de ataque e nos testes de atributo.\nMedo.\nCada alvo tem de realizar uma salvaguarda de Sabedoria e, se falhar, fica amedrontado durante 1 minuto. Enquanto estiver amedrontado, larga tudo o que estiver a segurar e tem de se afastar pelo menos 30 pés (9 metros) do glifo em cada um dos seus turnos, se for capaz.\nDesespero.\nCada alvo tem de realizar uma salvaguarda de Carisma. Se falhar, fica dominado pelo desespero durante 1 minuto. Durante esse período, não pode atacar nem escolher qualquer criatura como alvo de capacidades nocivas, magias ou outros efeitos mágicos.\nLoucura.\nCada alvo tem de realizar uma salvaguarda de Inteligência. Se falhar, enlouquece durante 1 minuto. Uma criatura enlouquecida não pode realizar ações, não consegue compreender o que as outras criaturas dizem, não consegue ler e só fala em disparates. O Mestre controla o seu movimento, que é errático.\nDor.\nCada alvo tem de realizar uma salvaguarda de Constituição e, se falhar, fica incapacitado por uma dor excruciante durante 1 minuto.\nSono.\nCada alvo tem de realizar uma salvaguarda de Sabedoria e, se falhar, fica inconsciente durante 10 minutos. Uma criatura desperta se sofrer dano ou se alguém usar uma ação para a sacudir ou esbofetear.\nAtordoamento.\nCada alvo tem de realizar uma salvaguarda de Sabedoria e, se falhar, fica atordoado durante 1 minuto.","h":""},{"n":"Simulacro","l":7,"s":"Ilusão","c":["Mago"],"t":"12 horas","r":"Toque","d":"Até ser dissipada","k":"V, S, M (Neve ou gelo em quantidade suficiente para criar uma cópia em tamanho real da criatura duplicada; alguns cabelos, aparas de unhas ou outro fragmento do corpo dessa criatura, colocado dentro da neve ou do gelo; e rubi em pó no valor de 1 500 po, espalhado sobre o duplicado e consumido pela magia)","cc":false,"rt":false,"x":"Moldas um duplicado ilusório de uma besta ou humanoide que esteja dentro do alcance durante todo o tempo de conjuração da magia. O duplicado é uma criatura parcialmente real, formada de gelo ou neve, e pode realizar ações e ser afetado como uma criatura normal. Tem a mesma aparência que o original, mas possui metade do máximo de pontos de vida da criatura e é criado sem qualquer equipamento. Nos restantes aspetos, a ilusão usa todas as estatísticas da criatura que duplica.\nO simulacro é amigável para contigo e para com as criaturas que designares. Obedece às tuas ordens verbais, movendo-se e agindo de acordo com os teus desejos e atuando no teu turno em combate. O simulacro não tem capacidade para aprender ou tornar-se mais poderoso, pelo que nunca aumenta de nível nem melhora outras capacidades, e também não pode recuperar espaços de magia gastos.\nSe o simulacro sofrer dano, podes repará-lo num laboratório alquímico, usando ervas e minerais raros no valor de 100 po por cada ponto de vida que recuperar. O simulacro dura até chegar a 0 pontos de vida, momento em que regressa à forma de neve e derrete instantaneamente.\nSe conjurares esta magia novamente, quaisquer duplicados que tenhas criado com esta magia e que ainda estejam ativos são destruídos instantaneamente.","h":""},{"n":"Teletransporte","l":7,"s":"Conjuração","c":["Bardo","Feiticeiro","Mago"],"t":"1 ação","r":"10 pés (3 metros)","d":"Instantânea","k":"V","cc":false,"rt":false,"x":"Esta magia transporta instantaneamente a ti e até oito criaturas voluntárias à tua escolha que consigas ver dentro do alcance, ou um único objeto que consigas ver dentro do alcance, para um destino que escolhas. Se escolheres um objeto como alvo, este tem de caber inteiramente dentro de um cubo de 10 pés (3 metros) e não pode estar a ser segurado ou transportado por uma criatura que não queira largá-lo.\nO destino escolhido tem de ser conhecido por ti e encontrar-se no mesmo plano de existência que tu. A tua familiaridade com o destino determina se chegas lá com sucesso. O Mestre lança 1d100 e consulta a tabela.","h":""},{"n":"Tempestade de Fogo","l":7,"s":"Evocação","c":["Clérigo","Druida","Feiticeiro"],"t":"1 ação","r":"150 pés (45 metros)","d":"Instantânea","k":"V, S","cc":false,"rt":false,"x":"Uma tempestade feita de lençóis de chamas rugentes aparece num local à sua escolha dentro do alcance. A área da tempestade consiste em até dez cubos de 10 pés (3 metros), que pode dispor como desejar. Cada cubo deve ter pelo menos uma face adjacente à face de outro cubo. Cada criatura na área deve fazer um teste de resistência de Destreza. Sofre 7d10 de dano de fogo num teste falhado, ou metade do dano num teste bem-sucedido.\nO fogo danifica objetos na área e incendeia objetos inflamáveis que não estejam a ser vestidos ou carregados. Se assim escolher, a vida vegetal na área não é afetada por esta magia.","h":""},{"n":"Antipatia/Simpatia","l":8,"s":"Encantamento","c":["Druida","Mago"],"t":"1 hora","r":"60 pés (18 metros)","d":"10 dias","k":"V, S, M (Um pedaço de pedra-ume embebida em vinagre para o efeito de antipatia ou uma gota de mel para o efeito de simpatia)","cc":false,"rt":false,"x":"Esta magia atrai ou repele criaturas à sua escolha. Tem como alvo algo dentro do alcance, quer seja um objeto ou criatura Enorme ou menor, ou uma área que não seja maior que um cubo de 200 pés (60 metros). De seguida, especifica um tipo de criatura inteligente, como dragões vermelhos, goblins ou vampiros. Imbuye o alvo com uma aura que atrai ou repele as criaturas especificadas pela duração. Escolha antipatia ou simpatia como o efeito da aura.\nAntipatia. O encantamento faz com que criaturas do tipo que designou sintam uma vontade intensa de sair da área e evitar o alvo. Quando tal criatura consegue ver o alvo ou chega a 60 pés (18 metros) dele, a criatura deve ser bem-sucedida num teste de resistência de Sabedoria ou fica assustada. A criatura permanece assustada enquanto conseguir ver o alvo ou estiver a 60 pés dele. Enquanto estiver assustada pelo alvo, a criatura deve usar o seu movimento para se deslocar para o local seguro mais próximo de onde não consiga ver o alvo. Se a criatura se mover para mais de 60 pés do alvo e não o conseguir ver, deixa de estar assustada, mas volta a ficar assustada se recuperar a visão do alvo ou se mover para menos de 60 pés dele.\nSimpatia. O encantamento faz com que as criaturas especificadas sintam uma vontade intensa de se aproximar do alvo enquanto estiverem a 60 pés (18 metros) dele ou conseguirem vê-lo. Quando tal criatura consegue ver o alvo ou chega a 60 pés dele, deve ser bem-sucedida num teste de resistência de Sabedoria ou usar o seu movimento em cada um dos seus turnos para entrar na área ou mover-se para o alcance do alvo. Quando a criatura tiver feito isso, não se pode afastar voluntariamente do alvo. Se o alvo causar dano ou prejudicar de outra forma uma criatura afetada, esta pode fazer um teste de resistência de Sabedoria para terminar o efeito, como descrito abaixo.\nTerminar o Efeito. Se uma criatura afetada terminar o seu turno não estando a 60 pés do alvo nem o conseguindo ver, faz um teste de resistência de Sabedoria. Num teste bem-sucedido, a criatura deixa de estar afetada pelo alvo e reconhece o sentimento de repugnância ou atração como mágico. Além disso, uma criatura afetada pela magia tem direito a outro teste de resistência de Sabedoria a cada 24 horas enquanto a magia persistir.\nUma criatura que seja bem-sucedida no teste de resistência contra este efeito fica imune a ele durante 1 minuto, após o qual pode voltar a ser afetada.","h":""},{"n":"Aura Sagrada","l":8,"s":"Abjuração","c":["Clérigo"],"t":"1 ação","r":"Pessoal","d":"Até 1 minuto","k":"V, S, M (Um pequeno relicário com valor mínimo de 1.000 po, contendo uma relíquia sagrada, como um pedaço de tecido do manto de um santo ou um fragmento de pergaminho de um texto religioso)","cc":true,"rt":false,"x":"Uma luz divina irradia de si e concentra-se num brilho suave num raio de 30 pés (9 metros) à sua volta. As criaturas à sua escolha dentro desse raio quando conjura esta magia emitem luz fraca num raio de 5 pés (1,5 metros) e têm vantagem em todos os testes de resistência; além disso, outras criaturas têm desvantagem nas jogadas de ataque contra elas até a magia terminar. Adicionalmente, quando um corruptor ou morto-vivo atinge uma criatura afetada com um ataque corpo a corpo, a aura cintila com uma luz brilhante. O atacante deve ser bem-sucedido num teste de resistência de Constituição ou ficará cego até a magia terminar.","h":""},{"n":"Campo Antimagia","l":8,"s":"Abjuração","c":["Clérigo","Mago"],"t":"1 ação","r":"Pessoal","d":"Até 1 hora","k":"V, S, M (Uma pitada de ferro em pó ou limalhas de ferro)","cc":true,"rt":false,"x":"Uma esfera invisível de antimagia com 10 pés (3 metros) de raio rodeia-o. Esta área está divorciada da energia mágica que preenche o multiverso. Dentro da esfera, magias não podem ser conjuradas, criaturas invocadas desaparecem e até itens mágicos se tornam mundanos. Até a magia terminar, a esfera move-se consigo, centrada em si.\nMagias e outros efeitos mágicos, exceto os criados por um artefacto ou uma divindade, são suprimidos na esfera e não podem estender-se para dentro dela. Um espaço de magia gasto para conjurar uma magia suprimida é consumido. Enquanto um efeito estiver suprimido, não funciona, mas o tempo que passa suprimido conta para a sua duração.\nEfeitos Direcionados. Magias e outros efeitos mágicos, como míssil mágico e encantar pessoa, que tenham como alvo uma criatura ou um objeto na esfera não têm efeito sobre esse alvo.\nÁreas de Magia. A área de outra magia ou efeito mágico, como bola de fogo, não se pode estender para dentro da esfera. Se a esfera se sobrepuser a uma área de magia, a parte da área que está coberta pela esfera é suprimida. Por exemplo, as chamas criadas por uma muralha de fogo são suprimidas dentro da esfera, criando uma brecha na muralha se a sobreposição for grande o suficiente.\nMagias. Qualquer magia ativa ou outro efeito mágico numa criatura ou num objeto dentro da esfera é suprimido enquanto a criatura ou objeto lá estiver.\nItens Mágicos. As propriedades e os poderes de itens mágicos são suprimidos na esfera. Por exemplo, uma espada longa +1 na esfera funciona como uma espada longa não mágica.\nAs propriedades e poderes de uma arma mágica são suprimidos se ela for usada contra um alvo na esfera ou empunhada por um atacante na esfera. Se uma arma mágica ou uma peça de munição mágica sair totalmente da esfera (por exemplo, se disparar uma flecha mágica ou atirar uma lança mágica a um alvo fora da esfera), a magia do item deixa de estar suprimida assim que sai.\nViagem Mágica. Teletransporte e viagem planar falham em funcionar dentro da esfera, independentemente de a esfera ser o destino ou o ponto de partida para essa viagem mágica. Um portal para outro local, mundo ou plano de existência, assim como uma abertura para um espaço extradimensional, como o criado pela magia truque de corda, fecha temporariamente enquanto estiver na esfera.\nCriaturas e Objetos. Uma criatura ou objeto invocado ou criado por magia desaparece temporariamente da existência na esfera. Tal criatura reaparece instantaneamente assim que o espaço que ocupava deixa de estar dentro da esfera.\nDissipar Magia. Magias e efeitos mágicos como dissipar magia não têm efeito na esfera. Da mesma forma, as esferas criadas por diferentes magias de campo antimagia não se anulam umas às outras.","h":""},{"n":"Clone","l":8,"s":"Necromancia","c":["Mago"],"t":"1 hora","r":"Toque","d":"Instantânea","k":"V, S, M (Um diamante no valor de pelo menos 1.000 po e pelo menos 1 polegada cúbica de carne da criatura que vai ser clonada, que a magia consome, e um recipiente no valor de pelo menos 2.000 po que tenha uma tampa selável e seja grande o suficiente para conter uma criatura Média, como uma urna enorme, caixão, cisto cheio de lama no chão, ou recipiente de cristal cheio de água salgada)","cc":false,"rt":false,"x":"Esta magia cultiva um duplicado inerte de uma criatura viva como salvaguarda contra a morte. Este clone forma-se dentro de um recipiente selado e cresce até ao tamanho normal e maturidade após 120 dias; também pode escolher que o clone seja uma versão mais jovem da mesma criatura. Permanece inerte e perdura indefinidamente, desde que o seu recipiente não seja perturbado.\nA qualquer momento após o clone amadurecer, se a criatura original morrer, a sua alma transfere-se para o clone, desde que a alma esteja livre e voluntária para regressar. O clone é fisicamente idêntico ao original e tem a mesma personalidade, memórias e habilidades, mas nenhum do equipamento original. Os restos físicos da criatura original, se ainda existirem, tornam-se inertes e não podem ser restaurados à vida depois disso, uma vez que a alma da criatura está noutro lugar.","h":""},{"n":"Controlar o Clima","l":8,"s":"Transmutação","c":["Clérigo","Druida","Mago"],"t":"10 minutos","r":"Pessoal","d":"Até 8 horas","k":"V, S, M (Incenso a arder e pedaços de terra e madeira misturados em água)","cc":true,"rt":false,"x":"Assume o controlo do clima num raio de 5 milhas (8 km) de si pela duração. Deve estar ao ar livre para conjurar esta magia. Mover-se para um local onde não tenha um caminho claro para o céu termina a magia prematuramente.\nQuando conjura a magia, muda as condições climáticas atuais, que são determinadas pelo DM com base no clima e na estação. Pode mudar a precipitação, temperatura e vento. Demora 1d4 x 10 minutos para as novas condições entrarem em efeito. Assim que o fizerem, pode mudar as condições novamente. Quando a magia termina, o clima regressa gradualmente ao normal.\nQuando muda as condições climáticas, encontre uma condição atual nas tabelas seguintes e mude o seu estágio em um, para cima ou para baixo. Quando muda o vento, pode mudar a sua direção.","h":""},{"n":"Dominar Monstro","l":8,"s":"Encantamento","c":["Bardo","Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"60 pés (18 metros)","d":"Até 1 hora","k":"V, S","cc":true,"rt":false,"x":"Tenta seduzir uma criatura que possa ver dentro do alcance. Ela deve ser bem-sucedida num teste de resistência de Sabedoria ou ficará encantada por si pela duração. Se você ou criaturas amigáveis estiverem a lutar contra ela, ela tem vantagem no teste de resistência.\nEnquanto a criatura estiver encantada, tem uma ligação telepática com ela desde que ambos estejam no mesmo plano de existência. Pode usar esta ligação telepática para emitir comandos à criatura enquanto estiver consciente (nenhuma ação requerida), que ela faz o seu melhor para obedecer. Pode especificar um curso de ação simples e geral, como \"Ataca aquela criatura\", \"Corre para ali\" ou \"Traz aquele objeto\". Se a criatura completar a ordem e não receber mais instruções suas, defende-se e preserva-se da melhor forma possível.\nPode usar a sua ação para assumir o controlo total e preciso do alvo. Até ao fim do seu próximo turno, a criatura toma apenas as ações que escolher e não faz nada que não permita. Durante este tempo, pode também fazer com que a criatura use uma reação, mas isso requer que use também a sua própria reação.\nDe cada vez que o alvo sofre dano, faz um novo teste de resistência de Sabedoria contra a magia. Se o teste for bem-sucedido, a magia termina.","h":"Quando conjura esta magia com um espaço de magia de 9º nível, a duração é de concentração, até 8 horas."},{"n":"Enfraquecer Mente","l":8,"s":"Encantamento","c":["Bardo","Druida","Bruxo","Mago"],"t":"1 ação","r":"150 pés (45 metros)","d":"Instantânea","k":"V, S, M (Um punhado de esferas de argila, cristal, vidro ou minerais)","cc":false,"rt":false,"x":"Ataca a mente de uma criatura que possa ver dentro do alcance, tentando despedaçar o seu intelecto e personalidade. O alvo sofre 4d6 de dano psíquico e deve fazer um teste de resistência de Inteligência.\nNum teste falhado, os valores de Inteligência e Carisma da criatura tornam-se 1. A criatura não consegue conjurar magias, ativar itens mágicos, compreender idiomas ou comunicar de qualquer forma inteligível. A criatura pode, contudo, identificar os seus amigos, segui-los e até protege-los.\nNo final de cada 30 dias, a criatura pode repetir o seu teste de resistência contra esta magia. Se for bem-sucedida no teste de resistência, a magia termina.\nA magia pode também ser terminada por restauração maior, curar ou desejo.","h":""},{"n":"Explosão Solar","l":8,"s":"Evocação","c":["Druida","Feiticeiro","Mago"],"t":"1 ação","r":"150 pés (45 metros)","d":"Instantânea","k":"V, S, M (Fogo e um pedaço de pedra-do-sol)","cc":false,"rt":false,"x":"Uma luz solar brilhante irrompe num raio de 60 pés (18 metros), centrada num ponto à tua escolha dentro do alcance. Cada criatura nessa luz tem de realizar uma salvaguarda de Constituição. Se falhar, sofre 12d6 de dano radiante e fica cega durante 1 minuto. Se for bem-sucedida, sofre metade do dano e não fica cega por esta magia. Mortos-vivos e limos têm desvantagem nesta salvaguarda.\nUma criatura cegada por esta magia realiza outra salvaguarda de Constituição no final de cada um dos seus turnos. Se for bem-sucedida, deixa de estar cega.\nEsta magia dissipa qualquer escuridão na sua área que tenha sido criada por uma magia.","h":""},{"n":"Formas Animais","l":8,"s":"Transmutação","c":["Druida"],"t":"1 ação","r":"30 pés (9 metros)","d":"Até 24 horas","k":"V, S","cc":true,"rt":false,"x":"A sua magia transforma outros em bestas. Escolha qualquer número de criaturas voluntárias que possa ver dentro do alcance. Transforma cada alvo na forma de uma besta Grande ou menor com um nível de desafio de 4 ou inferior. Nos turnos subsequentes, pode usar a sua ação para transformar as criaturas afetadas em novas formas.\nA transformação dura pela duração para cada alvo, ou até que o alvo caia para 0 pontos de vida ou morra. Pode escolher uma forma diferente para cada alvo. As estatísticas de jogo de um alvo são substituídas pelas estatísticas da besta escolhida, embora o alvo retenha o seu alinhamento e os valores de Inteligência, Sabedoria e Carisma. O alvo assume os pontos de vida da sua nova forma e, quando reverte para a sua forma normal, regressa ao número de pontos de vida que tinha antes de se transformar. Se reverter como resultado de cair para 0 pontos de vida, qualquer dano em excesso transita para a sua forma normal. Desde que o dano em excesso não reduza a forma normal da criatura para 0 pontos de vida, ela não fica inconsciente. A criatura é limitada nas ações que pode realizar pela natureza da sua nova forma e não pode falar nem conjurar magias.\nO equipamento do alvo funde-se com a nova forma. O alvo não pode ativar, empunhar ou de outra forma beneficiar de qualquer um dos seus equipamentos.","h":""},{"n":"Labirinto","l":8,"s":"Conjuração","c":["Mago"],"t":"1 ação","r":"60 pés (18,3 metros)","d":"Até 10 minutos","k":"V, S","cc":true,"rt":false,"x":"Bane uma criatura que consiga ver dentro do alcance para um semiplano labiríntico. O alvo permanece lá durante a duração ou até escapar do labirinto.\nO alvo pode usar a sua ação para tentar escapar. Quando o faz, realiza um teste de Inteligência com CD 20. Se for bem-sucedido, escapa e a magia termina (um minotauro ou demónio goristro é automaticamente bem-sucedido).\nQuando a magia termina, o alvo reaparece no espaço que deixou ou, se esse espaço estiver ocupado, no espaço desocupado mais próximo.","h":""},{"n":"Loquacidade","l":8,"s":"Transmutação","c":["Bardo","Bruxo"],"t":"1 ação","r":"Pessoal","d":"1 hora","k":"V","cc":false,"rt":false,"x":"Até a magia terminar, quando você fizer um teste de Carisma, você pode substituir o número rolado por um 15. Além disso, não importa o que você diga, magia que determinaria se você está dizendo a verdade indica que você está sendo verdadeiro.","h":""},{"n":"Mente em Branco","l":8,"s":"Abjuração","c":["Bardo","Mago"],"t":"1 ação","r":"Toque","d":"24 horas","k":"V, S","cc":false,"rt":false,"x":"Até a magia terminar, uma criatura voluntária que toque fica imune a dano psíquico, a qualquer efeito que detete as suas emoções ou leia os seus pensamentos, a magias de adivinhação e à condição enfeitiçado. A magia também impede magias de desejo e magias ou efeitos de poder semelhante que sejam usados para afetar a mente do alvo ou obter informações sobre ele.","h":""},{"n":"Nuvem Incendiária","l":8,"s":"Conjuração","c":["Feiticeiro","Mago"],"t":"1 ação","r":"150 pés (45,7 metros)","d":"Até 1 minuto","k":"V, S","cc":true,"rt":false,"x":"Uma nuvem rodopiante de fumo, atravessada por brasas incandescentes, surge numa esfera com 20 pés (6 metros) de raio, centrada num ponto dentro do alcance. A nuvem espalha-se à volta dos cantos e obscurece fortemente a área. Dura pela duração ou até que um vento de velocidade moderada ou superior (pelo menos 10 milhas por hora) a disperse.\nQuando a nuvem aparece, cada criatura dentro dela deve fazer um teste de resistência de Destreza. Uma criatura sofre 10d8 de dano de fogo se falhar, ou metade desse dano se for bem-sucedida. Uma criatura também deve fazer este teste de resistência quando entra na área da magia pela primeira vez num turno ou termina o seu turno nela.\nA nuvem move-se 10 pés (3 metros) diretamente para longe de si, numa direção à sua escolha, no início de cada um dos seus turnos.","h":""},{"n":"Palavra de Poder: Atordoar","l":8,"s":"Encantamento","c":["Bardo","Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"60 pés (18 metros)","d":"Instantânea","k":"V","cc":false,"rt":false,"x":"Pronuncia uma palavra de poder capaz de subjugar a mente de uma criatura que consiga ver dentro do alcance, deixando-a atordoada. Se o alvo tiver 150 pontos de vida ou menos, fica atordoado. Caso contrário, a magia não produz qualquer efeito.\nO alvo atordoado tem de realizar um teste de resistência de Constituição no final de cada um dos seus turnos. Se for bem-sucedido, o efeito de atordoamento termina.","h":""},{"n":"Semiplano","l":8,"s":"Conjuração","c":["Bruxo","Mago"],"t":"1 ação","r":"60 pés (18 metros)","d":"1 hora","k":"S","cc":false,"rt":false,"x":"Cria uma porta sombria numa superfície sólida e plana que consiga ver dentro do alcance. A porta é grande o suficiente para permitir que criaturas Médias passem desimpedidas. Quando aberta, a porta conduz a um semiplano que aparenta ser uma sala vazia de 30 pés (9 metros) em cada dimensão, feita de madeira ou pedra. Quando a magia termina, a porta desaparece, e quaisquer criaturas ou objetos dentro do semiplano permanecem aí presos, uma vez que a porta também desaparece do outro lado.\nDe cada vez que conjura esta magia, pode criar um novo semiplano, ou fazer com que a porta sombria ligue a um semiplano que criou com uma conjuração anterior desta magia. Adicionalmente, se souber a natureza e o conteúdo de um semiplano criado por uma conjuração desta magia por outra criatura, pode fazer com que a porta sombria se ligue ao semiplano dela em vez disso.","h":""},{"n":"Terremoto","l":8,"s":"Evocação","c":["Clérigo","Druida","Feiticeiro"],"t":"1 ação","r":"500 pés (150 metros)","d":"Até 1 minuto","k":"V, S, M (Uma pitada de terra, um pedaço de rocha e um pedaço de argila)","cc":true,"rt":false,"x":"Cria uma perturbação sísmica num ponto do chão que possa ver dentro do alcance. Pela duração, um tremor intenso rasga o chão num círculo de 100 pés (30 metros) de raio centrado nesse ponto e sacode criaturas e estruturas em contacto com o chão nessa área.\nO chão na área torna-se terreno difícil. Cada criatura no chão que esteja a concentrar-se deve fazer um teste de resistência de Constituição. Num teste falhado, a concentração da criatura é quebrada.\nQuando conjura esta magia e no final de cada turno que passe a concentrar-se nela, cada criatura no chão na área deve fazer um teste de resistência de Destreza. Num teste falhado, a criatura é derrubada prostrada.\nEsta magia pode ter efeitos adicionais dependendo do terreno na área, conforme determinado pelo DM.\nFendas. Fendas abrem-se ao longo da área da magia no início do seu próximo turno após conjurar a magia. Um total de 1d6 de tais fendas abrem em locais escolhidos pelo DM. Cada uma tem 1d10 x 10 pés (3 a 30 metros) de profundidade, 10 pés (3 metros) de largura, e estende-se de uma extremidade da área da magia até ao lado oposto. Uma criatura de pé num local onde uma fenda se abre deve ser bem-sucedida num teste de resistência de Destreza ou cairá lá dentro. Uma criatura que seja bem-sucedida no salvamento move-se com a borda da fenda à medida que ela se abre.\nUma fenda que se abra por baixo de uma estrutura faz com que ela colapse automaticamente (ver abaixo).\nEstruturas. O tremor causa 50 de dano de concussão a qualquer estrutura em contacto com o chão na área quando conjura a magia e no início de cada um dos seus turnos até a magia terminar. Se uma estrutura cair para 0 pontos de vida, ela colapsa e potencialmente danifica criaturas próximas. Uma criatura a uma distância inferior a metade da altura da estrutura deve fazer um teste de resistência de Destreza. Num teste falhado, a criatura sofre 5d6 de dano de concussão, é derrubada prostrada e é soterrada nos escombros, requerendo um teste de Força (Atletismo) CD 20 como uma ação para escapar. O DM pode ajustar a CD para cima ou para baixo, dependendo da natureza dos escombros. Num teste bem-sucedido, a criatura sofre metade do dano e não cai prostrada nem fica soterrada.","h":""},{"n":"Alterar Forma","l":9,"s":"Transmutação","c":["Druida","Mago"],"t":"1 ação","r":"Pessoal","d":"Até 1 hora","k":"V, S, M (Um diadema de jade no valor mínimo de 1 500 po, que tens de colocar na cabeça antes de conjurares a magia)","cc":true,"rt":false,"x":"Assumes a forma de uma criatura diferente durante a duração da magia. A nova forma pode ser a de qualquer criatura cujo nível de desafio seja igual ou inferior ao teu nível. A criatura não pode ser um constructo nem um morto-vivo, e tens de ter visto pelo menos uma vez uma criatura desse tipo. Transformas-te num exemplar comum dessa criatura, sem níveis de classe nem o traço Conjuração.\nAs tuas estatísticas de jogo são substituídas pelas estatísticas da criatura escolhida, mas manténs o teu alinhamento e os teus valores de Inteligência, Sabedoria e Carisma. Também manténs todas as tuas proficiências em perícias e salvaguardas, além de receberes as da criatura. Se a criatura tiver a mesma proficiência que tu e o bónus indicado nas suas estatísticas for superior ao teu, usas o bónus da criatura em vez do teu. Não podes usar ações lendárias nem ações de covil da nova forma.\nAssumes os pontos de vida e os Dados de Vida da nova forma. Quando regressas à tua forma normal, recuperas o número de pontos de vida que tinhas antes da transformação. Se regressares à tua forma normal por teres chegado a 0 pontos de vida, qualquer dano excedente é transferido para a tua forma normal. Desde que esse dano excedente não reduza os pontos de vida da tua forma normal a 0, não ficas inconsciente.\nManténs os benefícios de quaisquer características da tua classe, raça ou outra origem e podes usá-las, desde que a tua nova forma seja fisicamente capaz de o fazer. Não podes usar sentidos especiais que possuas (por exemplo, visão no escuro), a menos que a nova forma também possua esse sentido. Só podes falar se a criatura conseguir falar normalmente.\nQuando te transformas, escolhes se o teu equipamento cai no chão, se se funde com a nova forma ou se é usado por ela. O equipamento vestido funciona normalmente. O Mestre determina se é prático para a nova forma usar uma peça de equipamento, tendo em conta a sua forma e tamanho. O teu equipamento não muda de forma nem de tamanho para corresponder à nova forma, e qualquer equipamento que ela não consiga usar tem de cair no chão ou fundir-se com a nova forma. O equipamento que se funde não tem qualquer efeito nesse estado.\nDurante a duração desta magia, podes usar a tua ação para assumir uma forma diferente, respeitando as mesmas restrições e regras da forma original, com uma exceção: se a nova forma tiver mais pontos de vida do que a atual, os teus pontos de vida mantêm-se no valor atual.","h":""},{"n":"Aprisionamento","l":9,"s":"Abjuração","c":["Bruxo","Mago"],"t":"1 minuto","r":"30 pés (9,1 metros)","d":"Até ser dissipada","k":"V, S, M (Uma representação em pergaminho ou uma estatueta esculpida à semelhança do alvo, e um componente especial que varia consoante a versão da magia escolhida, com valor mínimo de 500 po por Dado de Vida do alvo)","cc":false,"rt":false,"x":"Cria uma contenção mágica para manter presa uma criatura que consiga ver dentro do alcance. O alvo deve ser bem-sucedido num teste de resistência de Sabedoria ou ficará vinculado pela magia; se for bem-sucedido, fica imune a esta magia caso volte a conjurá-la. Enquanto estiver afetada por esta magia, a criatura não precisa de respirar, comer ou beber e não envelhece. Magias de adivinhação não conseguem localizar nem percecionar o alvo.\nQuando conjura a magia, escolhe uma das seguintes formas de aprisionamento.\nEnterro. O alvo é sepultado profundamente sob a terra, numa esfera de força mágica suficientemente grande apenas para o conter. Nada consegue atravessar a esfera, e nenhuma criatura consegue teleportar-se ou viajar entre planos para entrar ou sair dela.\nO componente especial desta versão da magia é um pequeno orbe de mithral.\nAcorrentamento. Correntes pesadas, firmemente presas ao solo, mantêm o alvo no lugar. O alvo fica impedido até a magia terminar e não pode mover-se nem ser movido por qualquer meio até lá.\nO componente especial desta versão da magia é uma corrente fina de metal precioso.\nPrisão Cercada. A magia transporta o alvo para um semiplano minúsculo protegido contra teleportação e viagens planares. O semiplano pode ser um labirinto, uma jaula, uma torre ou qualquer estrutura ou área confinada semelhante à sua escolha.\nO componente especial desta versão da magia é uma representação em miniatura da prisão feita em jade.\nContenção Reduzida. O alvo encolhe até uma altura de 1 polegada (2,5 centímetros) e fica aprisionado dentro de uma pedra preciosa ou objeto semelhante. A luz pode atravessar a pedra preciosa normalmente, permitindo que o alvo veja o exterior e que outras criaturas vejam o interior, mas nada mais consegue atravessar, mesmo por meios de teletransporte ou viagens planares. A pedra preciosa não pode ser cortada nem partida enquanto a magia permanecer em vigor.\nO componente especial desta versão da magia é uma grande pedra preciosa transparente, como um coríndon, um diamante ou uma esmeralda.\nDurante a conjuração da magia, independentemente da versão escolhida, pode especificar uma condição que fará com que a magia termine e liberte o alvo. A condição pode ser tão específica ou elaborada quanto desejar, mas o Mestre deve concordar que é razoável e que existe uma probabilidade de ela vir a ocorrer. As condições podem basear-se no nome, identidade ou divindade de uma criatura, mas, caso contrário, devem basear-se em ações ou qualidades observáveis e não em valores intangíveis, como nível, classe ou pontos de vida.\nA magia Dissipar Magia só pode terminar esta magia se for conjurada como magia de 9º nível, tendo como alvo a prisão ou o componente especial utilizado para a criar.","h":""},{"n":"Chuva de Meteoros","l":9,"s":"Evocação","c":["Feiticeiro","Mago"],"t":"1 ação","r":"1 milha (1,6 km)","d":"Instantânea","k":"V, S","cc":false,"rt":false,"x":"Orbes flamejantes precipitam-se sobre o solo em quatro pontos diferentes que consiga ver dentro do alcance. Cada criatura numa esfera com 40 pés (12 metros) de raio centrada em cada ponto à sua escolha deve realizar um teste de resistência de Destreza. A esfera contorna esquinas. Uma criatura sofre 20d6 de dano de fogo e 20d6 de dano contundente se falhar, ou metade desse dano se for bem-sucedida. Uma criatura na área de mais do que uma explosão flamejante é afetada apenas uma vez.\nA magia danifica os objetos na área e incendeia os objetos inflamáveis que não estejam a ser vestidos ou transportados.","h":""},{"n":"Cura em Massa","l":9,"s":"Conjuração","c":["Clérigo"],"t":"1 ação","r":"60 pés (18,3 metros)","d":"Instantânea","k":"V, S","cc":false,"rt":false,"x":"Uma inundação de energia curativa flui de si para as criaturas feridas à sua volta. Restaura até 700 pontos de vida, distribuídos como desejar entre qualquer número de criaturas que consiga ver dentro do alcance. As criaturas curadas por esta magia também ficam curadas de todas as doenças e de quaisquer efeitos que as deixem cegas ou surdas. Esta magia não tem efeito sobre mortos-vivos ou constructos.","h":""},{"n":"Desejo","l":9,"s":"Conjuração","c":["Feiticeiro","Mago"],"t":"1 ação","r":"Pessoal","d":"Instantânea","k":"V","cc":false,"rt":false,"x":"Desejo é a magia mais poderosa que uma criatura mortal pode conjurar. Com uma simples declaração em voz alta, podes alterar os próprios fundamentos da realidade de acordo com os teus desejos.\nA utilização básica desta magia é duplicar qualquer outra magia de 8.º nível ou inferior. Não precisas de cumprir quaisquer requisitos dessa magia, incluindo componentes dispendiosos. A magia simplesmente produz o seu efeito.\nEm alternativa, podes criar um dos seguintes efeitos à tua escolha:\n- Criar um objecto com um valor máximo de 25 000 po que não seja um objecto mágico. O objecto não pode ter mais de 300 pés (90 metros) em qualquer dimensão e aparece num espaço desocupado no chão que consigas ver.\n- Permitir que até vinte criaturas que consigas ver recuperem todos os seus pontos de vida e terminar todos os efeitos sobre elas descritos na magia restauração superior.\n- Conceder a até dez criaturas que consigas ver resistência a um tipo de dano à tua escolha.\n- Conceder a até dez criaturas que consigas ver imunidade a uma única magia ou outro efeito mágico durante 8 horas. Por exemplo, poderias tornar-te a ti e a todos os teus companheiros imunes ao ataque de drenagem de vida de um lich.\n- Anular um único acontecimento recente, obrigando a repetir qualquer jogada realizada durante a última ronda (incluindo o teu último turno). A realidade remodela-se para acomodar o novo resultado. Por exemplo, uma magia desejo poderia anular um teste de resistência bem-sucedido de um adversário, um acerto crítico de um inimigo ou um teste de resistência falhado de um aliado. Podes obrigar a que a nova jogada seja feita com vantagem ou desvantagem e podes escolher se será utilizado o novo resultado ou o original.\nPoderás conseguir alcançar algo para além do âmbito dos exemplos acima. Expõe o teu desejo ao Mestre com a maior precisão possível. O Mestre tem grande liberdade para decidir o que acontece nesse caso; quanto maior for o desejo, maior será a probabilidade de algo correr mal. Esta magia pode simplesmente falhar, o efeito que desejas pode ser apenas parcialmente alcançado ou podes sofrer uma consequência imprevista devido à forma como formulaste o desejo. Por exemplo, desejar que um vilão esteja morto pode projectar-te para o futuro, para uma época em que esse vilão já não está vivo, retirando-te efectivamente do jogo. Do mesmo modo, desejar um objecto mágico ou artefacto lendário pode transportar-te instantaneamente para a presença do seu actual proprietário.\nO esforço de conjurar esta magia para produzir qualquer efeito que não seja duplicar outra magia enfraquece-te. Depois de suportares esse esforço, sempre que conjurares uma magia até terminares um descanso longo, sofres 1d10 de dano necrótico por cada nível dessa magia. Este dano não pode ser reduzido nem prevenido de forma alguma. Além disso, a tua Força desce para 3, caso já não seja 3 ou inferior, durante 2d4 dias. Por cada um desses dias que passes a descansar e a realizar apenas actividades ligeiras, o tempo de recuperação restante diminui em 2 dias. Por fim, existe uma probabilidade de 33 por cento de nunca mais conseguires conjurar desejo se sofreres este esforço.","h":""},{"n":"Estranheza","l":9,"s":"Ilusão","c":["Mago"],"t":"1 ação","r":"120 pés (36 metros)","d":"Até 1 minuto","k":"V, S","cc":true,"rt":false,"x":"Recorrendo aos medos mais profundos de um grupo de criaturas, crias criaturas ilusórias nas suas mentes, visíveis apenas para elas. Cada criatura numa esfera com 30 pés (9 metros) de raio, centrada num ponto à tua escolha dentro do alcance, tem de realizar um teste de resistência de Sabedoria. Se falhar, fica amedrontada durante a duração da magia. A ilusão invoca os medos mais profundos da criatura, manifestando os seus piores pesadelos como uma ameaça implacável. No início de cada turno de uma criatura amedrontada, esta tem de ser bem-sucedida num teste de resistência de Sabedoria ou sofre 4d10 de dano psíquico. Se for bem-sucedida, a magia termina para essa criatura.","h":""},{"n":"Palavra de Poder: Matar","l":9,"s":"Encantamento","c":["Bardo","Feiticeiro","Bruxo","Mago"],"t":"1 ação","r":"60 pés (18 metros)","d":"Instantânea","k":"V","cc":false,"rt":false,"x":"Pronuncia uma palavra de poder capaz de obrigar uma criatura que consiga ver dentro do alcance a morrer instantaneamente. Se a criatura escolhida tiver 100 pontos de vida ou menos, morre. Caso contrário, a magia não produz qualquer efeito.","h":""},{"n":"Parar o Tempo","l":9,"s":"Transmutação","c":["Feiticeiro","Mago"],"t":"1 ação","r":"Pessoal","d":"Instantânea","k":"V","cc":false,"rt":false,"x":"Interrompes brevemente o fluxo do tempo para todos, exceto para ti. Não passa tempo para as outras criaturas, enquanto tu realizas 1d4 + 1 turnos consecutivos, durante os quais podes realizar ações e mover-te normalmente.\nEsta magia termina se uma das ações que realizares durante este período, ou quaisquer efeitos que cries durante esse período, afetar uma criatura que não sejas tu ou um objeto que não esteja a ser vestido ou transportado por ti. Além disso, a magia termina se te deslocares para um local a mais de 1.000 pés (300 metros) do local onde a conjuraste.","h":""},{"n":"Parede Prismática","l":9,"s":"Abjuração","c":["Mago"],"t":"1 ação","r":"60 pés (18 metros)","d":"10 minutos","k":"V, S","cc":false,"rt":false,"x":"Um plano cintilante de luz multicolorida forma uma parede vertical e opaca, com até 90 pés (27 metros) de comprimento, 30 pés (9 metros) de altura e 1 polegada (2,5 centímetros) de espessura, centrada num ponto que consiga ver dentro do alcance. Em alternativa, pode moldar a parede como uma esfera com até 30 pés (9 metros) de diâmetro, centrada num ponto à sua escolha dentro do alcance. A parede permanece no local durante a duração. Se posicionar a parede de modo a atravessar um espaço ocupado por uma criatura, a magia falha e a sua ação e o espaço de magia são desperdiçados.\nA parede emite luz intensa num raio de 100 pés (30 metros) e luz ténue por mais 100 pés (30 metros). Você e as criaturas que designar no momento em que conjura a magia podem atravessar a parede e permanecer perto dela sem sofrer danos. Se outra criatura que consiga ver a parede se aproximar a até 20 pés (6 metros) dela ou começar o seu turno nessa distância, tem de ser bem-sucedida num teste de resistência de Constituição ou fica cega durante 1 minuto.\nA parede é composta por sete camadas, cada uma com uma cor diferente. Quando uma criatura tenta alcançar ou atravessar a parede, fá-lo camada a camada, passando por todas elas. Ao atravessar ou alcançar cada camada, a criatura tem de realizar um teste de resistência de Destreza ou é afetada pelas propriedades dessa camada, conforme descrito abaixo.\nA parede também pode ser destruída, uma camada de cada vez, pela ordem do vermelho ao violeta, através dos meios específicos de cada camada. Depois de destruída, uma camada permanece assim durante o resto da duração da magia. Uma vara de anulação destrói uma parede prismática, mas um campo antimagia não produz qualquer efeito sobre ela.\n1. Vermelho. A criatura sofre 10d6 de dano de fogo se falhar o teste de resistência, ou metade desse dano se for bem-sucedida. Enquanto esta camada existir, ataques à distância não mágicos não podem atravessar a parede. A camada pode ser destruída causando-lhe pelo menos 25 pontos de dano de frio.\n2. Laranja. A criatura sofre 10d6 de dano de ácido se falhar o teste de resistência, ou metade desse dano se for bem-sucedida. Enquanto esta camada existir, ataques à distância mágicos não podem atravessar a parede. A camada é destruída por um vento forte.\n3. Amarelo. A criatura sofre 10d6 de dano elétrico se falhar o teste de resistência, ou metade desse dano se for bem-sucedida. Esta camada pode ser destruída causando-lhe pelo menos 60 pontos de dano de força.\n4. Verde. A criatura sofre 10d6 de dano venenoso se falhar o teste de resistência, ou metade desse dano se for bem-sucedida. Uma magia de passagem de parede, ou outra magia de nível igual ou superior capaz de abrir um portal numa superfície sólida, destrói esta camada.\n5. Azul. A criatura sofre 10d6 de dano de frio se falhar o teste de resistência, ou metade desse dano se for bem-sucedida. Esta camada pode ser destruída causando-lhe pelo menos 25 pontos de dano de fogo.\n6. Índigo. Se falhar o teste de resistência, a criatura fica impedida. Tem então de realizar um teste de resistência de Constituição no final de cada um dos seus turnos. Se for bem-sucedida em três testes, a magia termina. Se falhar três testes, transforma-se permanentemente em pedra e fica sujeita à condição petrificado. Os sucessos e as falhas não precisam de ser consecutivos; registe ambos até a criatura obter três resultados iguais. Enquanto esta camada existir, não é possível conjurar magias através da parede. A camada é destruída pela luz intensa emitida por uma magia de luz do dia ou por uma magia semelhante de nível igual ou superior.\n7. Violeta. Se falhar o teste de resistência, a criatura fica cega. Tem então de realizar um teste de resistência de Sabedoria no início do seu próximo turno. Um sucesso termina a cegueira. Se falhar esse teste, a criatura é transportada para outro plano à escolha do Mestre e deixa de estar cega. (Normalmente, uma criatura que se encontre num plano que não seja o seu plano natal é banida de volta para casa, enquanto as restantes criaturas são geralmente lançadas para os planos Astral ou Etéreo.) Esta camada é destruída por uma magia de dissipar magia ou por uma magia semelhante de nível igual ou superior capaz de terminar magias e efeitos mágicos.","h":""},{"n":"Polimorfia Verdadeira","l":9,"s":"Transmutação","c":["Bardo","Bruxo","Mago"],"t":"1 ação","r":"30 pés (9 metros)","d":"Até 1 hora","k":"V, S, M (Uma gota de mercúrio, um pouco de goma-arábica e um fio de fumo)","cc":true,"rt":false,"x":"Escolhe uma criatura ou objeto não mágico que consigas ver dentro do alcance. Transformas a criatura noutra criatura, a criatura num objeto ou o objeto numa criatura (o objeto não pode estar a ser vestido ou transportado por outra criatura). A transformação dura durante a duração ou até o alvo chegar a 0 pontos de vida ou morrer. Se mantiveres a concentração nesta magia durante toda a duração, a transformação torna-se permanente.\nMetamorfos não são afetados por esta magia. Uma criatura involuntária pode realizar uma salvaguarda de Sabedoria e, se for bem-sucedida, não é afetada pela magia.\nCriatura em Criatura.\nSe transformares uma criatura noutro tipo de criatura, a nova forma pode ser qualquer tipo à tua escolha cujo nível de desafio seja igual ou inferior ao do alvo (ou ao seu nível, se o alvo não tiver nível de desafio). As estatísticas de jogo do alvo, incluindo os valores de atributos mentais, são substituídas pelas estatísticas da nova forma. A criatura mantém o seu alinhamento e personalidade.\nO alvo assume os pontos de vida da sua nova forma e, quando regressa à forma normal, a criatura recupera o número de pontos de vida que tinha antes da transformação. Se regressar à forma normal por ter chegado a 0 pontos de vida, qualquer dano excedente é transferido para a sua forma normal. Desde que o dano excedente não reduza a forma normal da criatura a 0 pontos de vida, ela não fica inconsciente.\nA criatura fica limitada nas ações que pode realizar pela natureza da sua nova forma e não pode falar, conjurar magias ou realizar qualquer outra ação que exija mãos ou fala, a menos que a nova forma seja capaz de o fazer.\nO equipamento do alvo funde-se com a nova forma. A criatura não pode ativar, usar, empunhar ou beneficiar de qualquer outra forma do seu equipamento.\nObjeto em Criatura.\nPodes transformar um objeto em qualquer tipo de criatura, desde que o tamanho da criatura não seja superior ao do objeto e o nível de desafio da criatura seja 9 ou inferior. A criatura é amigável para contigo e para com os teus companheiros. Atua em cada um dos teus turnos. Decides que ação realiza e como se move. O Mestre possui as estatísticas da criatura e resolve todas as suas ações e movimentos.\nSe a magia se tornar permanente, deixas de controlar a criatura. Ela poderá continuar a ser tua amiga, dependendo da forma como a tratares.\nCriatura em Objeto.\nSe transformares uma criatura num objeto, ela transforma-se juntamente com tudo o que estiver a vestir e a transportar. As estatísticas da criatura tornam-se as do objeto, e a criatura não tem memória do tempo passado nesta forma quando a magia terminar e regressar à sua forma normal.","h":""},{"n":"Portal","l":9,"s":"Conjuração","c":["Clérigo","Feiticeiro","Mago"],"t":"1 ação","r":"18 metros","d":"Até 1 minuto","k":"V, S, M (Um diamante valendo pelo menos 5.000 po)","cc":true,"rt":false,"x":"Você conjura um portal conectando um espaço desocupado que você possa ver dentro do alcance a um local preciso em um plano de existência diferente. O portal é uma abertura circular, que você pode fazer ter de 1,5 a 6 metros de diâmetro. Você pode orientar o portal em qualquer direção que escolher. O portal dura pela duração.\nO portal tem uma frente e uma parte de trás em cada plano onde ele aparece. A viagem através do portal é possível apenas movendo-se através de sua frente. Qualquer coisa que o faça é instantaneamente transportada para o outro plano, aparecendo no espaço desocupado mais próximo do portal.\nDivindades e outros governantes planares podem impedir que portais criados por esta magia se abram em sua presença ou em qualquer lugar dentro de seus domínios.\nQuando você conjura esta magia, você pode falar o nome de uma criatura específica (um pseudônimo, título ou apelido não funciona). Se essa criatura estiver em um plano diferente daquele em que você está, o portal se abre nas imediações da criatura nomeada e puxa a criatura através dele para o espaço desocupado mais próximo do seu lado do portal. Você não ganha nenhum poder especial sobre a criatura, e ela é livre para agir como o Mestre julgar apropriado. Ela pode ir embora, atacar você ou ajudá-lo.","h":""},{"n":"Projeção Astral","l":9,"s":"Necromancia","c":["Clérigo","Bruxo","Mago"],"t":"1 hora","r":"10 pés (3 metros)","d":"Especial","k":"V, S, M (Para cada criatura que afetar com esta magia, deve fornecer um jacinto no valor de pelo menos 1.000 po e uma barra de prata esculpida ornamentada no valor de pelo menos 100 po, todos os quais a magia consome)","cc":false,"rt":false,"x":"Você e até oito criaturas voluntárias dentro do alcance projetam os vossos corpos astrais para o Plano Astral (a magia falha e a conjuração é gasta se já estiver nesse plano). O corpo material que deixam para trás fica inconsciente e num estado de animação suspensa; não precisa de comida nem ar e não envelhece.\nO seu corpo astral assemelha-se à sua forma mortal em quase tudo, replicando as suas estatísticas de jogo e posses. A diferença principal é a adição de um cordão prateado que se estende de entre as suas omoplatas e fica atrás de si, desvanecendo-se para invisibilidade ao fim de 1 pé (30 cm). Este cordão é a sua ligação ao seu corpo material. Enquanto o cordão permanecer intacto, pode encontrar o caminho de casa. Se o cordão for cortado — algo que só pode acontecer quando um efeito afirma especificamente que o faz — a sua alma e o seu corpo são separados, matando-o instantaneamente.\nA sua forma astral pode viajar livremente pelo Plano Astral e pode passar por portais lá existentes que conduzam a qualquer outro plano. Se entrar num novo plano ou regressar ao plano onde estava quando conjurou esta magia, o seu corpo e posses são transportados ao longo do cordão prateado, permitindo-lhe reentrar no seu corpo quando entra no novo plano. A sua forma astral é uma encarnação separada. Qualquer dano ou outros efeitos que se apliquem a ela não têm efeito no seu corpo físico, nem persistem quando regressa a ele.\nA magia termina para si e para os seus companheiros quando usa a sua ação para a dissipar. Quando a magia termina, a criatura afetada regressa ao seu corpo físico e acorda.\nA magia também pode terminar mais cedo para si ou para um dos seus companheiros. Uma magia dissipar magia bem-sucedida usada contra um corpo físico ou astral termina a magia para essa criatura. Se o corpo original ou a forma astral de uma criatura cair para 0 pontos de vida, a magia termina para essa criatura. Se a magia terminar e o cordão prateado estiver intacto, o cordão puxa a forma astral da criatura de volta para o seu corpo, terminando o seu estado de animação suspensa.\nSe for devolvido ao seu corpo prematuramente, os seus companheiros permanecem nas suas formas astrais e devem encontrar o seu próprio caminho de volta para os seus corpos, normalmente caindo para 0 pontos de vida.","h":""},{"n":"Ressurreição Verdadeira","l":9,"s":"Necromancia","c":["Clérigo","Druida"],"t":"1 hora","r":"Toque","d":"Instantânea","k":"V, S, M (Uma pitada de água benta e diamantes no valor de, pelo menos, 25.000 po, que a magia consome)","cc":false,"rt":false,"x":"Tocas numa criatura que tenha morrido há não mais de 200 anos e cuja morte não tenha sido causada por velhice. Se a alma da criatura estiver livre e disposta a regressar, a criatura é restaurada à vida com todos os seus pontos de vida.\nEsta magia fecha todas as feridas, neutraliza qualquer veneno, cura todas as doenças e remove quaisquer maldições que afetassem a criatura quando morreu. A magia substitui órgãos e membros danificados ou em falta.\nA magia pode até fornecer um novo corpo se o original já não existir, caso em que tens de pronunciar o nome da criatura. A criatura aparece então num espaço desocupado à tua escolha a até 10 pés (3 metros) de ti.","h":""},{"n":"Sexto Sentido","l":9,"s":"Adivinhação","c":["Bardo","Druida","Bruxo","Mago"],"t":"1 minuto","r":"Toque","d":"8 horas","k":"V, S, M (Uma pena de beija-flor)","cc":false,"rt":false,"x":"Você toca uma criatura disposta e concede a ela uma habilidade limitada de ver o futuro imediato. Pela duração, o alvo não pode ser surpreso e tem vantagem em jogadas de ataque, testes de habilidade e testes de resistência. Além disso, outras criaturas têm desvantagem em jogadas de ataque contra o alvo pela duração.\nEsta magia termina imediatamente se você a conjurar novamente antes que sua duração termine.","h":""},{"n":"Tempestade da Vingança","l":9,"s":"Conjuração","c":["Druida"],"t":"1 ação","r":"Visão","d":"Até 1 minuto","k":"V, S","cc":true,"rt":false,"x":"Forma-se uma nuvem de tempestade turbulenta, centrada num ponto que consigas ver e estendendo-se por um raio de 360 pés (108 metros). Relâmpagos iluminam a área, o trovão ribomba e ventos fortes rugem. Cada criatura sob a nuvem (a não mais de 5.000 pés (1.500 metros) abaixo dela) quando esta surge tem de realizar uma salvaguarda de Constituição. Se falhar, sofre 2d6 de dano trovejante e fica ensurdecida durante 5 minutos.\nEm cada ronda em que mantiveres a concentração nesta magia, a tempestade produz efeitos adicionais no teu turno.\nRonda 2.\nChove ácido da nuvem. Cada criatura e objeto sob a nuvem sofre 1d6 de dano ácido.\nRonda 3.\nInvocas seis relâmpagos da nuvem para atingirem seis criaturas ou objetos à tua escolha sob a nuvem. Uma mesma criatura ou objeto não pode ser atingido por mais de um relâmpago. Uma criatura atingida tem de realizar uma salvaguarda de Destreza. Se falhar, sofre 10d6 de dano elétrico; se for bem-sucedida, sofre metade desse dano.\nRonda 4.\nCaem pedras de granizo da nuvem. Cada criatura sob a nuvem sofre 2d6 de dano contundente.\nRondas 5–10.\nRajadas de vento e chuva gelada assolam a área sob a nuvem. A área torna-se terreno difícil e fica fortemente obscurecida. Cada criatura nela sofre 1d6 de dano de frio. Não é possível realizar ataques com armas à distância na área. O vento e a chuva constituem uma distração severa para efeitos de manter a concentração em magias. Por fim, rajadas de vento forte (entre 20 e 50 milhas por hora) dispersam automaticamente nevoeiro, brumas e fenómenos semelhantes na área, sejam mundanos ou mágicos.","h":""}]};


const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// Bloco de magia (campos do padrão D&D 5e)
function newSpell() {
  return {
    id: uid(), name: "", level: 1, school: "", castTime: "", range: "", components: "", duration: "",
    concentration: false, ritual: false, prepared: false, pin: false, text: "", higher: "",
  };
}

function defaultData() {
  const d = {
    pluginVersion: PLUGIN_VERSION,
    schemaVersion: SCHEMA_VERSION,
    name: "", class: "", subclass: "", race: "", background: "", alignment: "",
    level: 1, xp: 0, player: "", inspiration: false,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    saves: {}, skills: {},
    ac: 10, initiativeBonus: 0, speed: "9 m",
    hpMax: 10, hpCurrent: 10, hpTemp: 0, hitDice: "1d8",
    deathSuccess: [false, false, false], deathFail: [false, false, false],
    attacks: [],
    spellbook: [],
    resources: [], resourceState: {}, resourceDismissed: [],
    skillBonus: {}, saveBonus: {},
    skillCols: ["Extra"], saveCols: ["Extra"],
    pinned: { abilities: {}, saves: {}, skills: {} },
    passiveBonus: 0,
    spellAbility: "int", spellSlots: {},
    spells: "",
    coins: { pc: 0, pp: 0, pe: 0, po: 0, pl: 0 },
    equipment: "", features: "", proficiencies: "",
    personality: "", ideals: "", bonds: "", flaws: "",
    backstory: "", notes: "",
  };
  for (let i = 1; i <= 9; i++) d.spellSlots[i] = { max: 0, used: 0 };
  return d;
}

// ---------------------------------------------------------------------
// MIGRAÇÃO DO FORMATO DA FICHA
// O "formato" (schemaVersion) é um número próprio, gravado no arquivo, que só muda quando a
// ESTRUTURA dos dados muda. Não é a versão do plugin. Histórico real, levantado comparando
// o código das versões 1.3 a 1.11:
//   1 = original (plugins até 1.5)
//   2 = plugin 1.6  + skillBonus / saveBonus (um número por item), pinned{abilities,saves,skills},
//                     attacks[].pin
//   3 = plugin 1.7  skillBonus / saveBonus: número -> lista [n, ...]; + skillCols / saveCols
//   4 = plugin 1.9  + spellbook (blocos de magia); o texto livre `spells` é mantido como está
//   5 = plugin 1.15 + resources, resourceState, resourceDismissed (recursos de classe e modelos de recursos)
//   Os plugins 1.8, 1.10 e 1.11 NÃO alteraram o formato (a 1.10 só acrescentou o carimbo
//   informativo pluginVersion).
// Cada passo é aditivo e idempotente: completa e converte, nunca apaga dado do usuário.
// Uma ficha que já está no formato atual não passa por nenhum passo (não repete a migração).
// ---------------------------------------------------------------------
const isObj = (x) => !!x && typeof x === "object" && !Array.isArray(x);

// Descobre o formato de uma ficha: pelo número gravado ou, nas fichas antigas, pela estrutura.
function detectSheetSchema(raw) {
  const n = Number(raw.schemaVersion);
  if (isFinite(n) && n >= 1) return Math.floor(n);
  if (Array.isArray(raw.resources)) return 5;
  if (Array.isArray(raw.spellbook)) return 4;
  if (Array.isArray(raw.skillCols) || Array.isArray(raw.saveCols)) return 3;
  if (raw.skillBonus || raw.saveBonus || raw.pinned) return 2;
  return 1;
}

const SHEET_MIGRATIONS = [
  {
    to: 2, // plugin 1.6: bônus extra e itens fixados
    up(d, log) {
      ["skillBonus", "saveBonus"].forEach((k) => { if (!isObj(d[k])) { d[k] = {}; log.push(`+ ${k}`); } });
      if (!isObj(d.pinned)) { d.pinned = {}; log.push("+ pinned"); }
      ["abilities", "saves", "skills"].forEach((k) => { if (!isObj(d.pinned[k])) { d.pinned[k] = {}; log.push(`+ pinned.${k}`); } });
    },
  },
  {
    to: 3, // plugin 1.7: bônus em colunas
    up(d, log) {
      [["skillBonus", "skillCols"], ["saveBonus", "saveCols"]].forEach(([bonusKey, colsKey]) => {
        if (!isObj(d[bonusKey])) d[bonusKey] = {};
        let converted = 0, longest = 0;
        Object.keys(d[bonusKey]).forEach((key) => {
          const v = d[bonusKey][key];
          if (Array.isArray(v)) d[bonusKey][key] = v.map((x) => Number(x) || 0);
          else { d[bonusKey][key] = [Number(v) || 0]; converted++; }
          longest = Math.max(longest, d[bonusKey][key].length);
        });
        if (converted) log.push(`${bonusKey}: ${converted} valor(es) convertido(s) de número para lista`);
        if (!Array.isArray(d[colsKey]) || !d[colsKey].length) { d[colsKey] = ["Extra"]; log.push(`+ ${colsKey}`); }
        d[colsKey] = d[colsKey].map(String);
        while (d[colsKey].length < longest) d[colsKey].push("Extra " + (d[colsKey].length + 1)); // nenhum valor fica sem coluna
      });
    },
  },
  {
    to: 4, // plugin 1.9: blocos de magia
    up(d, log) {
      if (!Array.isArray(d.spellbook)) { d.spellbook = []; log.push("+ spellbook"); }
      // `spells` (texto livre antigo) permanece intacto; não é convertido em blocos.
    },
  },
  {
    to: 5, // plugin 1.15: recursos de classe (definições e estado separados) e lista dos recursos de modelo excluídos
    up(d, log) {
      if (!Array.isArray(d.resources)) { d.resources = []; log.push("+ resources"); }
      if (!isObj(d.resourceState)) { d.resourceState = {}; log.push("+ resourceState"); }
      if (!Array.isArray(d.resourceDismissed)) { d.resourceDismissed = []; log.push("+ resourceDismissed"); }
    },
  },
];

// Devolve uma CÓPIA migrada (o objeto de entrada nunca é alterado).
function migrateSheet(raw) {
  const data = JSON.parse(JSON.stringify(raw || {}));
  const from = Object.keys(data).length ? detectSheetSchema(data) : SCHEMA_VERSION;   // arquivo vazio = ficha nova
  const log = [];
  if (from < SCHEMA_VERSION) SHEET_MIGRATIONS.filter((m) => m.to > from).forEach((m) => m.up(data, log));
  if (from <= SCHEMA_VERSION) data.schemaVersion = SCHEMA_VERSION;   // ficha de formato mais novo nunca é rebaixada
  return { data, from, log };
}

const CREATURE_MIGRATIONS = [];   // sem mudança de formato desde a 1.4 (a 1.10 só acrescentou o carimbo pluginVersion)

function migrateCreature(raw) {
  const data = JSON.parse(JSON.stringify(raw || {}));
  const n = Number(data.schemaVersion);
  const from = Object.keys(data).length && isFinite(n) && n >= 1 ? Math.floor(n) : CREATURE_SCHEMA_VERSION;
  const log = [];
  if (from < CREATURE_SCHEMA_VERSION) CREATURE_MIGRATIONS.filter((m) => m.to > from).forEach((m) => m.up(data, log));
  if (from <= CREATURE_SCHEMA_VERSION) data.schemaVersion = CREATURE_SCHEMA_VERSION;
  return { data, from, log };
}

// Marca (sem entrar no JSON) que esta ficha foi migrada ao ser lida e ainda não foi regravada.
function flagMigration(d, mig, current) {
  if (mig.from < current) {
    Object.defineProperty(d, "__migration", {
      value: { from: mig.from, to: current, log: mig.log }, enumerable: false, writable: true, configurable: true,
    });
  }
  return d;
}

// Carimba formato e versão do plugin ao gravar (nunca rebaixa o formato de uma ficha mais nova).
function stampSheet(d, creature) {
  const cur = creature ? CREATURE_SCHEMA_VERSION : SCHEMA_VERSION;
  if (!(Number(d.schemaVersion) > cur)) d.schemaVersion = cur;
  d.pluginVersion = PLUGIN_VERSION;
}

// Avisa uma única vez e devolve true se a ficha precisa ser regravada no formato novo.
function reportMigration(data, name) {
  const m = data && data.__migration;
  if (!m) return false;
  new Notice(`Ficha${name ? ` "${name}"` : ""} migrada do formato ${m.from} para o ${m.to} (dados preservados).`, 8000);
  console.info("[dnd-sheet] migração" + (name ? " de " + name : "") + ":", m.from, "->", m.to, m.log);
  data.__migration = null;
  return true;
}

function normalize(parsed) {
  const mig = migrateSheet(parsed);    // 1) conversão versionada (só se o formato for antigo)
  const p = mig.data;
  // 2) abaixo: completa campos ausentes e garante tipos (rede de segurança; não apaga nada)
  const base = defaultData();
  const d = Object.assign(defaultData(), p);
  d.pluginVersion = p.pluginVersion || "";   // informativo: última versão do plugin que gravou a ficha
  d.abilities = Object.assign(base.abilities, p.abilities || {});
  d.coins = Object.assign(base.coins, p.coins || {});
  d.spellSlots = Object.assign(base.spellSlots, p.spellSlots || {});
  for (let i = 1; i <= 9; i++) d.spellSlots[i] = Object.assign({ max: 0, used: 0 }, d.spellSlots[i]);
  if (!d.saves || typeof d.saves !== "object") d.saves = {};
  if (!d.skills || typeof d.skills !== "object") d.skills = {};
  // itens de lista corrompidos não derrubam a ficha: texto vira {name}, null é descartado; os válidos ficam como estão
  d.attacks = (Array.isArray(d.attacks) ? d.attacks : [])
    .map((x) => (isObj(x) ? x : x == null ? null : { name: String(x) }))
    .filter(Boolean)
    .map((a) => Object.assign({ name: "", bonus: "", damage: "" }, a));
  d.spellbook = (Array.isArray(d.spellbook) ? d.spellbook : [])
    .filter((x) => x && typeof x === "object")
    .map((x) => {
      const sp = Object.assign(newSpell(), x);
      sp.level = Math.min(9, Math.max(0, Math.floor(Number(sp.level)) || 0));
      return sp;
    });
  ["skillBonus", "saveBonus"].forEach((k) => { if (!d[k] || typeof d[k] !== "object") d[k] = {}; });
  ["skillCols", "saveCols"].forEach((k) => { if (!Array.isArray(d[k]) || !d[k].length) d[k] = ["Extra"]; });
  // formato antigo guardava um número por perícia; agora é uma lista (um valor por coluna)
  ["skillBonus", "saveBonus"].forEach((k) => {
    Object.keys(d[k]).forEach((key) => {
      const v = d[k][key];
      d[k][key] = Array.isArray(v) ? v.map((x) => Number(x) || 0) : [Number(v) || 0];
    });
  });
  if (!d.pinned || typeof d.pinned !== "object") d.pinned = {};
  ["abilities", "saves", "skills"].forEach((k) => { if (!d.pinned[k] || typeof d.pinned[k] !== "object") d.pinned[k] = {}; });
  if (!Array.isArray(d.deathSuccess) || d.deathSuccess.length !== 3) d.deathSuccess = [false, false, false];
  if (!Array.isArray(d.deathFail) || d.deathFail.length !== 3) d.deathFail = [false, false, false];
  // recursos de classe: definições válidas, ids únicos e um estado para cada definição (o que já existe é mantido)
  const seenRes = new Set();
  d.resources = (Array.isArray(d.resources) ? d.resources : []).filter(isObj).map((x) => {
    const r = cleanResource(x);
    if (seenRes.has(r.id)) r.id = uid();
    seenRes.add(r.id);
    return r;
  });
  if (!isObj(d.resourceState)) d.resourceState = {};
  d.resources.forEach((r) => { d.resourceState[r.id] = cleanResState(d.resourceState[r.id], r); });
  d.resourceDismissed = (Array.isArray(d.resourceDismissed) ? d.resourceDismissed : []).filter((k) => typeof k === "string");
  return flagMigration(d, mig, SCHEMA_VERSION);
}

// retorna null se o texto não for JSON válido
function parseSheet(text) {
  try { return normalize(text && text.trim() ? JSON.parse(text) : {}); } catch (e) { return null; }
}

const mod = (score) => Math.floor((Number(score) - 10) / 2);
const fmt = (n) => (n >= 0 ? "+" + n : "" + n);
const profBonus = (lvl) => 2 + Math.floor((Math.max(1, Number(lvl) || 1) - 1) / 4);


// ---------------------------------------------------------------------
// Criaturas (modelo estilo Homebrewery)
// ---------------------------------------------------------------------
const CR_XP = {
  "0": 10, "1/8": 25, "1/4": 50, "1/2": 100, "1": 200, "2": 450, "3": 700, "4": 1100,
  "5": 1800, "6": 2300, "7": 2900, "8": 3900, "9": 5000, "10": 5900, "11": 7200,
  "12": 8400, "13": 10000, "14": 11500, "15": 13000, "16": 15000, "17": 18000,
  "18": 20000, "19": 22000, "20": 25000, "21": 33000, "22": 41000, "23": 50000,
  "24": 62000, "25": 75000, "26": 90000, "27": 105000, "28": 120000, "29": 135000,
  "30": 155000,
};

function crToNum(cr) {
  const s = String(cr).trim();
  if (s.includes("/")) { const [a, b] = s.split("/"); return Number(a) / Number(b); }
  return Number(s) || 0;
}
const crProf = (cr) => {
  const n = crToNum(cr);
  return n < 5 ? 2 : n < 9 ? 3 : n < 13 ? 4 : n < 17 ? 5 : n < 21 ? 6 : n < 25 ? 7 : n < 29 ? 8 : 9;
};
const crXp = (cr) => (CR_XP[String(cr).trim()] !== undefined ? CR_XP[String(cr).trim()] : null);
const creatureProf = (d) =>
  String(d.profOverride).trim() !== "" && !isNaN(Number(d.profOverride)) ? Number(d.profOverride) : crProf(d.cr);

function defaultCreature() {
  return {
    pluginVersion: PLUGIN_VERSION,
    schemaVersion: CREATURE_SCHEMA_VERSION,
    kind: "creature",
    name: "", subtitle: "", image: "",
    ac: 10, acNote: "", hpAvg: 10, hpFormula: "", hpCurrent: 10, speed: "9 m",
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    saves: "", skills: "", vulnerabilities: "", resistances: "", immunities: "",
    conditionImmunities: "", senses: "", languages: "",
    cr: "0", profOverride: "",
    traits: [], actions: [], bonusActions: [], reactions: [],
    legendaryIntro: "", legendary: [],
    notes: "",
  };
}

function normalizeCreature(p) {
  const mig = migrateCreature(p);
  const src = mig.data;
  const d = Object.assign(defaultCreature(), src);
  d.pluginVersion = src.pluginVersion || "";
  d.abilities = Object.assign(defaultCreature().abilities, src.abilities || {});
  ["traits", "actions", "bonusActions", "reactions", "legendary"].forEach((k) => {
    d[k] = (Array.isArray(d[k]) ? d[k] : [])
      .map((x) => (isObj(x) ? x : x == null ? null : { name: String(x), text: "" }))
      .filter(Boolean)
      .map((x) => Object.assign({}, x, { name: x.name == null ? "" : String(x.name), text: x.text == null ? "" : String(x.text) }));
  });
  return flagMigration(d, mig, CREATURE_SCHEMA_VERSION);
}

function parseCreature(text) {
  try { return normalizeCreature(text && text.trim() ? JSON.parse(text) : {}); } catch (e) { return null; }
}

function parseByExt(ext, text) {
  return ext === CEXT ? parseCreature(text) : parseSheet(text);
}

// Rolagem de expressões como "1d6 + 4", "2d8+2", "3d6 + 3"
function rollExpr(expr) {
  const s = String(expr).replace(/\s+/g, "");
  const re = /([+-]?)(?:(\d*)d(\d+)|(\d+))/gi;
  let m, total = 0, any = false;
  const parts = [];
  while ((m = re.exec(s))) {
    any = true;
    const sign = m[1] === "-" ? -1 : 1;
    if (m[3]) {
      const n = Number(m[2] || 1), f = Number(m[3]);
      const rolls = [];
      for (let i = 0; i < n; i++) rolls.push(1 + Math.floor(Math.random() * f));
      total += sign * rolls.reduce((a, b) => a + b, 0);
      parts.push(`${sign < 0 ? "-" : ""}${n}d${f}[${rolls.join(",")}]`);
    } else {
      total += sign * Number(m[4]);
      parts.push(`${sign < 0 ? "-" : "+"}${m[4]}`);
    }
  }
  return any ? { total, parts } : null;
}

function rollDiceNotice(label, expr) {
  const r = rollExpr(expr);
  if (!r) { new Notice("Não entendi a rolagem: " + expr); return; }
  new Notice(`${label} (${expr}): ${r.parts.join(" ")} = ${r.total}`, 6000);
}

// ---------------------------------------------------------------------
// Calculadora (usada nos pontos de vida): + - × ÷ ( ) e dados como 2d6.
// Sem eval. A divisão arredonda para baixo, como nas regras de resistência do D&D.
// ---------------------------------------------------------------------
const hasDice = (src) => /\d*d\d+/i.test(String(src));

function calcExpr(src) {
  if (/\d\s+\d/.test(String(src))) throw new Error("Falta um operador entre os números");
  const text = String(src).replace(/[×xX]/g, "*").replace(/÷/g, "/").replace(/,/g, ".").replace(/\s+/g, "");
  if (!text) throw new Error("Expressão vazia");
  const tokens = [];
  const re = /(\d*)d(\d+)|(\d+(?:\.\d+)?)|([-+*/()])/y;
  let pos = 0;
  while (pos < text.length) {
    re.lastIndex = pos;
    const m = re.exec(text);
    if (!m) throw new Error(`Caractere inválido: "${text[pos]}"`);
    if (m[2] !== undefined) tokens.push({ k: "dice", n: Number(m[1] || 1), f: Number(m[2]) });
    else if (m[3] !== undefined) tokens.push({ k: "num", v: Number(m[3]) });
    else tokens.push({ k: "op", v: m[4] });
    pos = re.lastIndex;
  }

  let i = 0;
  const rolls = [];
  const isOp = (t, chars) => t && t.k === "op" && chars.includes(t.v);

  const factor = () => {
    const t = tokens[i++];
    if (!t) throw new Error("Expressão incompleta");
    if (t.k === "num") return t.v;
    if (t.k === "dice") {
      if (t.n < 1 || t.n > 100 || t.f < 1 || t.f > 1000) throw new Error(`Dados fora do limite: ${t.n}d${t.f}`);
      const r = [];
      for (let j = 0; j < t.n; j++) r.push(1 + Math.floor(Math.random() * t.f));
      rolls.push(`${t.n}d${t.f}[${r.join(",")}]`);
      return r.reduce((a, b) => a + b, 0);
    }
    if (t.v === "-") return -factor();
    if (t.v === "+") return factor();
    if (t.v === "(") {
      const v = expr();
      if (!isOp(tokens[i], ")")) throw new Error("Falta fechar o parêntese");
      i++;
      return v;
    }
    throw new Error(`Símbolo inesperado: "${t.v}"`);
  };
  const term = () => {
    let v = factor();
    while (isOp(tokens[i], "*/")) {
      const op = tokens[i++].v;
      const r = factor();
      if (op === "*") v *= r;
      else {
        if (r === 0) throw new Error("Divisão por zero");
        v = Math.floor(v / r);
      }
    }
    return v;
  };
  const expr = () => {
    let v = term();
    while (isOp(tokens[i], "+-")) {
      const op = tokens[i++].v;
      const r = term();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  };

  const value = expr();
  if (i < tokens.length) throw new Error(`Símbolo inesperado: "${tokens[i].v}"`);
  return { value: Math.floor(value), rolls };
}

// Texto com *itálico*, **negrito**, ***negrito itálico***, "+4 para atingir" e "1d6 + 4" clicáveis
function renderRich(parent, text, onRoll) {
  const re = /(\*\*\*[^*\n]+?\*\*\*|\*\*[^*\n]+?\*\*|\*[^*\n]+?\*)|([+-]\d+)(?=\s*(?:para atingir|to hit))|(\d+d\d+(?:\s*[+-]\s*\d+)?)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
    const emph = m[1], atk = m[2], dice = m[3];
    if (emph) {
      if (emph.startsWith("***")) renderRich(parent.createEl("strong").createEl("em"), emph.slice(3, -3), onRoll);
      else if (emph.startsWith("**")) renderRich(parent.createEl("strong"), emph.slice(2, -2), onRoll);
      else renderRich(parent.createEl("em"), emph.slice(1, -1), onRoll);
    } else if (atk) {
      const b = parent.createEl("button", { cls: "dnd-rollable", text: atk });
      b.addEventListener("click", () => onRoll("attack", atk));
    } else if (dice) {
      const b = parent.createEl("button", { cls: "dnd-rollable", text: dice });
      b.addEventListener("click", () => onRoll("dice", dice));
    }
    last = re.lastIndex;
  }
  if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
}

// ---------- Importar / exportar texto no formato Homebrewery ----------
const stripAccents = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const HB_LABELS = {
  "classe de armadura": "ac", "armor class": "ac",
  "pontos de vida": "hp", "hit points": "hp",
  "deslocamento": "speed", "speed": "speed",
  "testes de resistencia": "saves", "saving throws": "saves",
  "pericias": "skills", "skills": "skills",
  "vulnerabilidades a dano": "vulnerabilities", "damage vulnerabilities": "vulnerabilities",
  "resistencias a dano": "resistances", "damage resistances": "resistances",
  "imunidades a dano": "immunities", "damage immunities": "immunities",
  "imunidades a condicao": "conditionImmunities", "condition immunities": "conditionImmunities",
  "sentidos": "senses", "senses": "senses",
  "idiomas": "languages", "languages": "languages",
  "nivel de desafio": "cr", "challenge": "cr",
};

function hbSection(heading) {
  const n = stripAccents(heading).toLowerCase();
  if (n.includes("legend") || n.includes("lend")) return "legendary";
  if (n.includes("bonus")) return "bonusActions";
  if (n.includes("reac")) return "reactions";
  if (n.includes("aco") || n.includes("action")) return "actions";
  return "traits";
}

function hbApplyStat(c, key, val) {
  if (key === "ac" || key === "hp") {
    const m = val.match(/^(\d+)\s*(?:\((.*)\))?/);
    if (!m) { if (key === "ac") c.acNote = val; return; }
    if (key === "ac") { c.ac = Number(m[1]); c.acNote = m[2] || ""; }
    else { c.hpAvg = Number(m[1]); c.hpCurrent = c.hpAvg; c.hpFormula = m[2] || ""; }
  } else if (key === "cr") {
    const m = val.match(/^(\d+(?:\/\d+)?)/);
    if (m) c.cr = m[1];
  } else {
    c[key] = val;
  }
}

function parseHomebrewery(text) {
  const c = defaultCreature();
  const src = String(text).replace(/\r/g, "");
  const img = src.match(/<img[^>]*src=['"]([^'"]+)['"]/i);
  if (img) c.image = img[1];
  const lists = { traits: c.traits, actions: c.actions, bonusActions: c.bonusActions, reactions: c.reactions, legendary: c.legendary };
  let section = "traits";
  let para = [];

  const flush = () => {
    if (!para.length) return;
    const t = para.join(" ").trim();
    para = [];
    if (!t) return;
    const list = lists[section];
    const m = t.match(/^\*{2,3}([^*]+?)\*{2,3}\s*([\s\S]*)$/);
    if (m) list.push({ name: m[1].replace(/[.\s]+$/, ""), text: m[2].trim() });
    else if (section === "legendary" && !list.length) c.legendaryIntro = (c.legendaryIntro ? c.legendaryIntro + " " : "") + t;
    else if (list.length) list[list.length - 1].text += " " + t;
  };

  for (const raw of src.split("\n")) {
    const line = raw.trim();
    if (!line || line === ":") { flush(); continue; }
    if (/^\{\{monster/i.test(line) || line === "}}" || /^<img/i.test(line)) { flush(); continue; }
    if (/^(_{3,}|-{3,})$/.test(line)) { flush(); continue; }
    let m;
    if ((m = line.match(/^###\s+(.+)$/))) { flush(); section = hbSection(m[1]); continue; }
    if ((m = line.match(/^#{1,2}\s+(.+)$/))) { flush(); if (!c.name) c.name = m[1].trim(); continue; }
    if (c.name && !c.subtitle && (m = line.match(/^\*(?!\*)(.+?)\*$/))) { c.subtitle = m[1].trim(); continue; }
    if (line.startsWith("|")) {
      const nums = [...line.matchAll(/(\d+)\s*\(/g)].map((x) => Number(x[1]));
      if (nums.length >= 6) ["str", "dex", "con", "int", "wis", "cha"].forEach((k, i) => { c.abilities[k] = nums[i]; });
      continue;
    }
    if (!line.startsWith("***") && (m = line.match(/^\*\*(.+?)\*\*\s*(?:::|:)?\s*(.*)$/))) {
      const key = HB_LABELS[stripAccents(m[1]).toLowerCase().trim()];
      if (key) { flush(); hbApplyStat(c, key, m[2].replace(/\{\{[\s\S]*?\}\}/g, "").trim()); continue; }
    }
    para.push(line);
  }
  flush();
  return c;
}

function toHomebrewery(d) {
  const out = [];
  out.push("{{monster,frame");
  out.push("## " + (d.name || "Criatura"));
  if (d.subtitle) out.push("*" + d.subtitle + "*");
  out.push("", "___");
  out.push(`**Classe de Armadura** :: ${d.ac}${d.acNote ? ` (${d.acNote})` : ""}`);
  out.push(`**Pontos de Vida** :: ${d.hpAvg}${d.hpFormula ? ` (${d.hpFormula})` : ""}`);
  out.push(`**Deslocamento** :: ${d.speed}`);
  out.push("___");
  out.push("|  FOR  |  DES  |  CON  |  INT  |  SAB  |  CAR  |");
  out.push("|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|");
  out.push("|" + ["str", "dex", "con", "int", "wis", "cha"]
    .map((k) => `${d.abilities[k]} (${fmt(mod(d.abilities[k]))})`).join("|") + "|");
  out.push("___");
  [["Testes de Resistência", "saves"], ["Perícias", "skills"], ["Vulnerabilidades a Dano", "vulnerabilities"],
    ["Resistências a Dano", "resistances"], ["Imunidades a Dano", "immunities"],
    ["Imunidades a Condição", "conditionImmunities"], ["Sentidos", "senses"], ["Idiomas", "languages"]]
    .forEach(([label, key]) => { if (d[key]) out.push(`**${label}** :: ${d[key]}`); });
  const xp = crXp(d.cr);
  out.push(`**Nível de Desafio** :: ${d.cr}${xp !== null ? ` (${xp} XP)` : ""} {{bonus **Bônus de Proficiência** ${fmt(creatureProf(d))}}}`);
  out.push("___");
  const items = (arr) => arr.forEach((it) => {
    out.push(`***${(it.name || "").replace(/[.\s]+$/, "")}.*** ${it.text || ""}`.trimEnd());
    out.push(":");
  });
  items(d.traits);
  [["Ações", "actions"], ["Ações Bônus", "bonusActions"], ["Reações", "reactions"]].forEach(([h, k]) => {
    if (d[k].length) { out.push("### " + h); items(d[k]); }
  });
  if (d.legendary.length || d.legendaryIntro) {
    out.push("### Ações Lendárias");
    if (d.legendaryIntro) { out.push(d.legendaryIntro); out.push(":"); }
    items(d.legendary);
  }
  out.push("}}");
  if (d.image && /^https?:/i.test(d.image)) {
    out.push("", `<img src='${d.image}' style='position:absolute;bottom:800px;right:150px;width:222px; transform:scaleX(1.0);z-index:100'/>`);
  }
  return out.join("\n");
}


// ---------------------------------------------------------------------
// Interface da ficha (reutilizável: aba, janela flutuante, bloco de código)
// ---------------------------------------------------------------------
class SheetUI {
  constructor(root, data, onChange, opts = {}) {
    this.root = root;
    this.d = data;
    this.onChange = onChange;
    this.compact = !!opts.compact;
    this.app = opts.app;
    this.tab = opts.tab || 0;
    this.mode = opts.mode || (this.compact ? "summary" : "full");
    this.openSpells = opts.openSpells || new Set();   // blocos de magia abertos na ficha completa
    this.openSummary = new Set();                     // blocos de magia abertos no resumo
    this.onlyPrepared = false;
    this.resOpen = new Set();   // cartões de recurso com a descrição aberta
    this.resAmt = {};           // quantidade por clique de cada recurso
    this.hpHistory = opts.hpHistory || [];   // desfazer da calculadora de PV
    this.calcLog = opts.calcLog || "";
    this.calcFocus = false;
    this.updaters = [];
  }

  skillTotal(k, attr) {
    return this.abilityMod(attr) + (this.d.skills[k] || 0) * this.prof() + this.extraSum(this.d.skillBonus, k);
  }

  saveTotal(k) {
    return this.abilityMod(k) + (this.d.saves[k] ? this.prof() : 0) + this.extraSum(this.d.saveBonus, k);
  }

  // Estrela: fixa o item na ficha resumida (bucket[key] verdadeiro = fixado)
  star(parent, bucket, key) {
    const b = parent.createEl("button", { cls: "dnd-star", attr: { "aria-label": "Fixar na ficha resumida", title: "Fixar na ficha resumida" } });
    const paint = () => { b.setText(bucket[key] ? "★" : "☆"); b.toggleClass("on", !!bucket[key]); };
    paint();
    b.addEventListener("click", () => {
      if (bucket[key]) delete bucket[key]; else bucket[key] = true;
      paint();
      this.changed();
    });
    return b;
  }

  extraSum(bucket, key) {
    return (bucket[key] || []).reduce((a, b) => a + (Number(b) || 0), 0);
  }

  // Redesenha a ficha mantendo a posição da rolagem (usado ao mudar a estrutura)
  rerender() {
    const st = this.root.scrollTop;
    this.changed();
    this.render();
    this.root.scrollTop = st;
  }

  // Caixa de bônus extra da coluna idx (buffs temporários, itens...). Vazio/0 = sem bônus.
  bonusBox(parent, bucket, key, idx) {
    const el = parent.createEl("input", { type: "number", cls: "dnd-extra", attr: { title: "Bônus extra (buff temporário ou item)" } });
    el.placeholder = "+0";
    const cur = (bucket[key] || [])[idx];
    el.value = cur ? String(cur) : "";
    el.addEventListener("input", () => {
      const v = el.value === "" ? 0 : Number(el.value) || 0;
      const arr = bucket[key] || (bucket[key] = []);
      while (arr.length <= idx) arr.push(0);
      arr[idx] = v;
      if (arr.every((x) => !x)) delete bucket[key];
      this.changed();
    });
    return el;
  }

  // Cabeçalho das colunas de bônus: nome editável de cada coluna, ✕ para remover e + para adicionar
  colsHeader(parent, cols, bucket, lead) {
    const dropCol = (i) => {
      cols.splice(i, 1);
      Object.keys(bucket).forEach((k) => {
        bucket[k].splice(i, 1);
        if (bucket[k].every((v) => !v)) delete bucket[k];
      });
    };

    // Caixa para digitar quantas colunas de bônus existem (1 a 6). Funciona mesmo sem o botão +.
    const ctl = parent.createDiv({ cls: "dnd-row dnd-cols-ctl" });
    ctl.createSpan({ text: "Colunas de bônus" });
    const num = ctl.createEl("input", { type: "number", attr: { min: "1", max: "6", title: "Quantas colunas de bônus extra (1 a 6). Reduzir apaga os valores das últimas colunas." } });
    num.value = String(cols.length);
    num.addEventListener("change", () => {
      const want = Math.max(1, Math.min(6, Math.floor(Number(num.value)) || 1));
      while (cols.length < want) cols.push("Extra " + (cols.length + 1));
      while (cols.length > want) dropCol(cols.length - 1);
      this.rerender();
    });

    const row = parent.createDiv({ cls: "dnd-row dnd-cols-head" });
    row.createDiv({ cls: "dnd-hd-spacer" }).style.width = lead + "px";
    cols.forEach((name, i) => {
      const w = row.createDiv({ cls: "dnd-col-label" });
      const inp = w.createEl("input", { type: "text", attr: { title: "Nome da coluna (ex.: Item, Buff)" } });
      inp.value = name;
      inp.addEventListener("input", () => { cols[i] = inp.value; this.changed(); });
      if (cols.length > 1) {
        const x = w.createEl("button", { cls: "dnd-col-del", text: "✕", attr: { title: "Remover coluna (apaga os valores dela)" } });
        x.addEventListener("click", () => { dropCol(i); this.rerender(); });
      }
    });
    if (cols.length < 6) {
      const add = row.createEl("button", { cls: "dnd-col-add", text: "+ coluna", attr: { title: "Adicionar coluna de bônus" } });
      add.addEventListener("click", () => { cols.push("Extra " + (cols.length + 1)); this.rerender(); });
    }
  }

  changed() {
    this.onChange();
    this.updaters.forEach((fn) => fn());
  }

  input(parent, obj, key, opts = {}) {
    const type = opts.type || "text";
    const el = parent.createEl("input", { type });
    if (opts.cls) el.addClass(opts.cls);
    if (opts.placeholder) el.placeholder = opts.placeholder;
    if (type === "checkbox") {
      el.checked = !!obj[key];
      el.addEventListener("change", () => { obj[key] = el.checked; this.changed(); });
    } else {
      el.value = obj[key] ?? "";
      el.addEventListener("input", () => {
        obj[key] = type === "number" ? (el.value === "" ? 0 : Number(el.value)) : el.value;
        this.changed();
      });
    }
    return el;
  }

  field(parent, label, obj, key, opts = {}) {
    const wrap = parent.createDiv({ cls: "dnd-field" });
    wrap.createEl("label", { text: label });
    this.input(wrap, obj, key, opts);
    return wrap;
  }

  area(parent, label, obj, key, rows = 6) {
    const wrap = parent.createDiv({ cls: "dnd-field dnd-area" });
    wrap.createEl("label", { text: label });
    const ta = wrap.createEl("textarea");
    ta.rows = rows;
    ta.value = obj[key] ?? "";
    ta.addEventListener("input", () => { obj[key] = ta.value; this.changed(); });
    return wrap;
  }

  section(parent, title) {
    const s = parent.createDiv({ cls: "dnd-section" });
    s.createEl("h4", { text: title });
    return s;
  }

  live(el, fn, tag) {
    const run = () => el.setText(fn());
    if (tag) run.tag = tag;
    run();
    this.updaters.push(run);
  }

  // Descarta atualizadores de elementos que saíram da tela (ex.: blocos de magia redesenhados)
  dropUpdaters(tag) { this.updaters = this.updaters.filter((f) => f.tag !== tag); }

  roll(label, bonus) {
    const r = Math.floor(Math.random() * 20) + 1;
    const total = r + bonus;
    new Notice(
      `${label}: d20 (${r}) ${fmt(bonus)} = ${total}${r === 20 ? " 🎉 CRÍTICO!" : r === 1 ? " 💀 Falha crítica" : ""}`,
      6000
    );
  }

  abilityMod(key) { return mod(this.d.abilities[key]); }
  prof() { return profBonus(this.d.level); }

  // Ficha comprimida: faixa de combate, PV, espaços de magia e só o que foi fixado com ★
  renderSummary() {
    const d = this.d;
    const wrap = this.root.createDiv({ cls: "dnd-summary" });
    const live = (el, fn) => { const run = () => el.setText(fn()); run(); this.updaters.push(run); };
    const btn = (parent, fn, onClick, cls = "dnd-sum-btn") => {
      const b = parent.createEl("button", { cls });
      live(b, fn);
      b.addEventListener("click", onClick);
      return b;
    };

    wrap.createDiv({ cls: "dnd-sum-name", text: d.name || "Sem nome" });
    const sub = [d.race, [d.class, d.subclass].filter(Boolean).join(" / "), d.level ? `Nível ${d.level}` : ""]
      .filter(Boolean).join(" · ");
    if (sub) wrap.createDiv({ cls: "dnd-sum-sub", text: sub });

    // faixa: CA, iniciativa, deslocamento, proficiência
    const strip = wrap.createDiv({ cls: "dnd-sum-strip" });
    const chip = (label) => {
      const c = strip.createDiv({ cls: "dnd-sum-chip" });
      c.createDiv({ cls: "dnd-sum-label", text: label });
      return c.createDiv({ cls: "dnd-sum-val" });
    };
    chip("CA").setText(String(d.ac));
    const iniCalc = () => this.abilityMod("dex") + Number(d.initiativeBonus || 0);
    btn(chip("Iniciativa"), () => fmt(iniCalc()), () => this.roll("Iniciativa", iniCalc()), "dnd-sum-btn big");
    chip("Deslocamento").setText(String(d.speed));
    live(chip("Prof."), () => fmt(this.prof()));

    // PV
    const hp = this.section(wrap, "Pontos de vida");
    const hr = hp.createDiv({ cls: "dnd-row" });
    hr.createSpan({ text: "PV" });
    this.input(hr, d, "hpCurrent", { type: "number", cls: "dnd-sum-num" });
    hr.createSpan({ text: `/ ${d.hpMax}` });
    hr.createSpan({ text: "Temp." });
    this.input(hr, d, "hpTemp", { type: "number", cls: "dnd-sum-num" });
    const ir = hp.createDiv({ cls: "dnd-row" });
    this.input(ir, d, "inspiration", { type: "checkbox" });
    ir.createSpan({ text: "Inspiração" });
    this.hpCalculator(hp);

    this.renderResources(wrap, true);

    // espaços de magia (aparecem sozinhos quando o máximo > 0)
    const levels = [];
    for (let i = 1; i <= 9; i++) if (Number(d.spellSlots[i].max) > 0) levels.push(i);
    if (levels.length) {
      const sp = this.section(wrap, "Espaços de magia");
      const info = sp.createDiv({ cls: "dnd-hint" });
      live(info, () => `CD ${8 + this.prof() + this.abilityMod(d.spellAbility)} · Ataque ${fmt(this.prof() + this.abilityMod(d.spellAbility))} · ● disponível, ○ usado`);
      levels.forEach((i) => {
        const s = d.spellSlots[i];
        const row = sp.createDiv({ cls: "dnd-row" });
        row.createSpan({ text: `${i}º`, cls: "dnd-sum-lvl" });
        const pips = row.createDiv({ cls: "dnd-pips" });
        const draw = () => {
          pips.empty();
          for (let j = 0; j < Math.min(Number(s.max), 12); j++) {
            const used = j < Number(s.used);
            const pip = pips.createEl("button", { cls: "dnd-pip" + (used ? " used" : ""), text: used ? "○" : "●" });
            pip.addEventListener("click", () => { s.used = used ? j : j + 1; this.changed(); draw(); });
          }
        };
        draw();
      });
    }

    // magias fixadas com ★ (toque no nome para abrir a descrição; Conjurar gasta o espaço)
    const psp = d.spellbook.filter((sp) => sp.pin)
      .sort((a, b) => a.level - b.level || String(a.name).localeCompare(String(b.name), "pt"));
    if (psp.length) {
      const sec = this.section(wrap, "Magias");
      psp.forEach((sp) => {
        const open = this.openSummary.has(sp.id);
        const card = sec.createDiv({ cls: "dnd-spell" + (open ? " open" : "") });
        const head = card.createDiv({ cls: "dnd-spell-head" });
        head.createEl("button", { cls: "dnd-spell-title", text: `${open ? "▾" : "▸"} ${sp.name || "Magia"}` })
          .addEventListener("click", () => {
            if (open) this.openSummary.delete(sp.id); else this.openSummary.add(sp.id);
            this.refresh();
          });
        head.createSpan({ cls: "dnd-spell-meta", text: sp.level === 0 ? "Truque" : `${sp.level}º` });
        if (sp.level > 0) {
          head.createEl("button", { cls: "dnd-spell-cast", text: "Conjurar" })
            .addEventListener("click", (e) => this.castSpell(sp, e));
        }
        if (open) this.spellDetails(card.createDiv({ cls: "dnd-spell-body" }), sp);
      });
    }

    // itens fixados com ★
    const pins = d.pinned;
    const pa = ABILITIES.filter(([k]) => pins.abilities[k]);
    const ps = ABILITIES.filter(([k]) => pins.saves[k]);
    const pk = SKILLS.filter(([k]) => pins.skills[k]);
    const pt = d.attacks.filter((a) => a.pin);

    if (pa.length) {
      const sec = this.section(wrap, "Atributos");
      const g = sec.createDiv({ cls: "dnd-sum-chips" });
      pa.forEach(([k, label]) => btn(g, () => `${label} ${d.abilities[k]} (${fmt(this.abilityMod(k))})`, () => this.roll(label, this.abilityMod(k))));
    }
    if (ps.length) {
      const sec = this.section(wrap, "Testes de resistência");
      const g = sec.createDiv({ cls: "dnd-sum-chips" });
      ps.forEach(([k, label]) => btn(g, () => `${label} ${fmt(this.saveTotal(k))}`, () => this.roll("Resistência de " + label, this.saveTotal(k))));
    }
    if (pk.length) {
      const sec = this.section(wrap, "Perícias");
      const g = sec.createDiv({ cls: "dnd-sum-chips" });
      pk.forEach(([k, label, attr]) => btn(g, () => `${label} ${fmt(this.skillTotal(k, attr))}`, () => this.roll(label, this.skillTotal(k, attr))));
    }
    if (pt.length) {
      const sec = this.section(wrap, "Ataques");
      pt.forEach((a) => {
        const row = sec.createDiv({ cls: "dnd-sum-attack" });
        row.createSpan({ text: a.name || "Ataque", cls: "dnd-sum-aname" });
        const bonus = parseInt(String(a.bonus || "").replace(/\s/g, ""), 10) || 0;
        const bb = row.createEl("button", { cls: "dnd-sum-btn", text: a.bonus || "+0" });
        bb.addEventListener("click", () => this.roll(a.name || "Ataque", bonus));
        const dm = String(a.damage || "").match(/\d*d\d+(?:\s*[+-]\s*\d+)?/i);
        if (dm) {
          const db = row.createEl("button", { cls: "dnd-sum-btn", text: a.damage });
          db.addEventListener("click", () => rollDiceNotice((a.name || "Ataque") + " (dano)", dm[0]));
        } else if (a.damage) {
          row.createSpan({ text: a.damage });
        }
      });
    }
    if (!pa.length && !ps.length && !pk.length && !pt.length && !psp.length && !d.resources.length) {
      wrap.createDiv({ cls: "dnd-hint", text: "Nada fixado ainda. Na ficha completa, clique em ☆ ao lado de atributos, resistências, perícias, ataques ou magias para trazê-los para cá." });
    }
  }

  // =====================================================================
  // GRIMÓRIO: um bloco (cartão) por magia, agrupados por círculo
  // =====================================================================
  onRoll(kind, val) {
    if (kind === "attack") this.roll("Ataque", Number(val));
    else rollDiceNotice("Rolagem", val);
  }

  // Redesenha mantendo a rolagem, sem marcar a ficha como alterada
  refresh() {
    const st = this.root.scrollTop;
    this.render();
    this.root.scrollTop = st;
  }

  // Texto da magia: círculo/escola, tempo, alcance, componentes, duração, descrição (com dados clicáveis)
  spellDetails(container, s) {
    container.empty();
    const onRoll = (k, v) => this.onRoll(k, v);
    const sub = [s.level === 0 ? "Truque" : `${s.level}º círculo`, s.school, s.concentration ? "concentração" : "", s.ritual ? "ritual" : ""]
      .filter(Boolean).join(" · ");
    container.createDiv({ cls: "dnd-spell-sub", text: sub });
    [["Tempo de conjuração", s.castTime], ["Alcance", s.range], ["Componentes", s.components], ["Duração", s.duration]]
      .filter(([, v]) => v)
      .forEach(([l, v]) => {
        const p = container.createDiv({ cls: "dnd-spell-fact" });
        p.createEl("strong", { text: l + ": " });
        p.appendChild(document.createTextNode(String(v)));
      });
    if (s.text) {
      String(s.text).split(/\n+/).forEach((par) => renderRich(container.createDiv({ cls: "dnd-spell-text" }), par, onRoll));
    }
    if (s.higher) {
      const p = container.createDiv({ cls: "dnd-spell-text" });
      p.createEl("strong").createEl("em", { text: "Em níveis superiores. " });
      renderRich(p, s.higher, onRoll);
    }
  }

  // Gasta um espaço de magia do círculo da magia ou de um círculo superior
  castSpell(s, evt) {
    const d = this.d;
    const opts = [];
    for (let lv = s.level; lv <= 9; lv++) {
      const sl = d.spellSlots[lv];
      const left = Number(sl.max) - Number(sl.used);
      if (Number(sl.max) > 0 && left > 0) opts.push([lv, left]);
    }
    if (!opts.length) {
      new Notice(`Sem espaços de magia disponíveis para ${s.name || "esta magia"} (${s.level}º círculo ou superior).`);
      return;
    }
    const doCast = (lv) => {
      const sl = d.spellSlots[lv];
      sl.used = Number(sl.used) + 1;
      const left = Number(sl.max) - Number(sl.used);
      let msg = `${s.name || "Magia"} conjurada no ${lv}º círculo. Restam ${left} espaço(s) de ${lv}º círculo.`;
      if (lv > s.level && s.higher) msg += ` Em níveis superiores: ${s.higher}`;
      new Notice(msg, 8000);
      this.rerender();
    };
    if (opts.length === 1) { doCast(opts[0][0]); return; }
    const menu = new Menu();
    opts.forEach(([lv, left]) => menu.addItem((it) => it
      .setTitle(`${lv}º círculo (${left} restante${left > 1 ? "s" : ""})${lv === s.level ? "" : " — círculo superior"}`)
      .onClick(() => doCast(lv))));
    menu.showAtMouseEvent(evt);
  }

  renderSpellbook(parent) {
    const d = this.d;
    const sec = parent.createDiv({ cls: "dnd-sb" });
    sec.createEl("h4", { text: "Grimório (blocos de magia)" });
    const bar = sec.createDiv({ cls: "dnd-sb-bar" });
    const list = sec.createDiv({ cls: "dnd-sb-list" });

    const draw = () => {
      this.dropUpdaters("spell");
      list.empty();
      const shown = d.spellbook.filter((s) => !this.onlyPrepared || s.level === 0 || s.prepared);
      if (!d.spellbook.length) {
        list.createDiv({ cls: "dnd-hint", text: "Nenhuma magia ainda. Clique em + Nova magia para criar o primeiro bloco." });
      }
      for (let lv = 0; lv <= 9; lv++) {
        const items = shown.filter((s) => s.level === lv)
          .sort((a, b) => String(a.name).localeCompare(String(b.name), "pt"));
        if (!items.length) continue;
        list.createEl("h5", { cls: "dnd-sb-group", text: `${lv === 0 ? "Truques" : lv + "º círculo"} (${items.length})` });
        items.forEach((s) => this.spellCard(list, s, draw));
      }
    };

    bar.createEl("button", { text: "+ Adicionar magia", cls: "mod-cta" }).addEventListener("click", () => {
      const blank = () => {
        const sp = newSpell();
        d.spellbook.push(sp);
        this.openSpells.add(sp.id);
        this.changed();
        draw();
      };
      if (!this.app) { blank(); return; }
      const have = new Set(d.spellbook.map((x) => String(x.name).toLowerCase()));
      new AddSpellModal(this.app, have, (entry) => { d.spellbook.push(spellFromSrd(entry)); this.changed(); draw(); }, blank).open();
    });
    const prep = bar.createEl("button", { text: this.onlyPrepared ? "Mostrar todas" : "Só preparadas" });
    prep.addEventListener("click", () => {
      this.onlyPrepared = !this.onlyPrepared;
      prep.setText(this.onlyPrepared ? "Mostrar todas" : "Só preparadas");
      draw();
    });
    bar.createEl("button", { text: "Abrir todas" }).addEventListener("click", () => {
      d.spellbook.forEach((s) => this.openSpells.add(s.id));
      draw();
    });
    bar.createEl("button", { text: "Recolher todas" }).addEventListener("click", () => {
      this.openSpells.clear();
      draw();
    });
    draw();
  }

  spellCard(parent, s, redraw) {
    const d = this.d;
    const open = this.openSpells.has(s.id);
    const card = parent.createDiv({ cls: "dnd-spell" + (open ? " open" : "") });
    const head = card.createDiv({ cls: "dnd-spell-head" });

    this.star(head, s, "pin");
    if (s.level > 0) {
      const pw = head.createEl("label", { cls: "dnd-spell-prep", attr: { title: "Magia preparada" } });
      this.input(pw, s, "prepared", { type: "checkbox" });
      pw.createSpan({ text: "Prep." });
    }
    const title = head.createEl("button", { cls: "dnd-spell-title", text: `${open ? "▾" : "▸"} ${s.name || "Nova magia"}` });
    title.addEventListener("click", () => {
      if (open) this.openSpells.delete(s.id); else this.openSpells.add(s.id);
      redraw();
    });
    const tags = [s.school, s.concentration ? "C" : "", s.ritual ? "R" : ""].filter(Boolean).join(" · ");
    if (tags) head.createSpan({ cls: "dnd-spell-meta", text: tags });
    if (s.level > 0) {
      head.createEl("button", { cls: "dnd-spell-cast", text: "Conjurar" })
        .addEventListener("click", (e) => this.castSpell(s, e));
    }
    if (!open) return;

    // ----- corpo do bloco (campos editáveis + visualização com dados clicáveis) -----
    const body = card.createDiv({ cls: "dnd-spell-body" });
    let preview = null;
    const paint = () => { if (preview) this.spellDetails(preview, s); };

    const g = body.createDiv({ cls: "dnd-grid dnd-grid-2" });
    const fld = (label, key, ph) => {
      const w = g.createDiv({ cls: "dnd-field" });
      w.createEl("label", { text: label });
      const i = this.input(w, s, key, { placeholder: ph });
      i.addEventListener("input", paint);
      return i;
    };
    const nameInput = fld("Nome", "name", "Bola de Fogo");
    nameInput.addEventListener("input", () => title.setText(`▾ ${s.name || "Nova magia"}`));

    const lw = g.createDiv({ cls: "dnd-field" });
    lw.createEl("label", { text: "Círculo" });
    const sel = lw.createEl("select");
    for (let i = 0; i <= 9; i++) sel.createEl("option", { value: String(i), text: i === 0 ? "Truque" : `${i}º círculo` });
    sel.value = String(s.level);
    sel.addEventListener("change", () => { s.level = Number(sel.value); this.changed(); redraw(); });

    fld("Escola", "school", "Evocação");
    fld("Tempo de conjuração", "castTime", "1 ação");
    fld("Alcance", "range", "45 m");
    fld("Componentes", "components", "V, S, M (guano de morcego)");
    fld("Duração", "duration", "Instantânea");

    const flags = body.createDiv({ cls: "dnd-row" });
    [["concentration", "Concentração"], ["ritual", "Ritual"]].forEach(([key, label]) => {
      const w = flags.createEl("label", { cls: "dnd-spell-prep" });
      this.input(w, s, key, { type: "checkbox" }).addEventListener("change", paint);
      w.createSpan({ text: label });
    });

    const mkText = (label, key, rows) => {
      const w = body.createDiv({ cls: "dnd-field dnd-area" });
      w.createEl("label", { text: label });
      const ta = w.createEl("textarea");
      ta.rows = rows;
      ta.value = s[key] || "";
      ta.addEventListener("input", () => { s[key] = ta.value; this.changed(); paint(); });
    };
    mkText("Descrição (dados como 8d6 viram botões de rolagem abaixo)", "text", 6);
    mkText("Em níveis superiores", "higher", 3);

    const ar = body.createDiv({ cls: "dnd-row dnd-spell-atk" });
    const atk = () => this.prof() + this.abilityMod(d.spellAbility);
    const atkBtn = ar.createEl("button", { cls: "dnd-sum-btn" });
    atkBtn.setText(`Ataque de magia ${fmt(atk())}`);
    const updAtk = () => atkBtn.setText(`Ataque de magia ${fmt(atk())}`);
    updAtk.tag = "spell";
    this.updaters.push(updAtk);
    atkBtn.addEventListener("click", () => this.roll(s.name ? `${s.name} (ataque)` : "Ataque de magia", atk()));
    this.live(ar.createSpan(), () => `CD ${8 + this.prof() + this.abilityMod(d.spellAbility)}`, "spell");

    preview = body.createDiv({ cls: "dnd-spell-preview" });
    paint();

    body.createEl("button", { text: "Excluir magia", cls: "dnd-spell-del" }).addEventListener("click", () => {
      d.spellbook.splice(d.spellbook.indexOf(s), 1);
      this.openSpells.delete(s.id);
      this.changed();
      redraw();
    });
  }

  // =====================================================================
  // CALCULADORA DE PV: digite uma conta (12+5+8, 2d6+3, 8/2+5) e aplique como dano ou cura
  // =====================================================================
  hpCalculator(parent) {
    const d = this.d;
    const box = parent.createDiv({ cls: "dnd-calc" });
    const row = box.createDiv({ cls: "dnd-calc-row" });
    const input = row.createEl("input", {
      type: "text", cls: "dnd-calc-input",
      attr: {
        placeholder: "12+5+8 · 2d6+3 · 8/2+5",
        title: "Enter = Dano · Shift+Enter = Cura. Aceita + − × ÷ ( ) e dados (2d6). A divisão arredonda para baixo.",
      },
    });
    const out = row.createSpan({ cls: "dnd-calc-out" });

    const showPreview = () => {
      const t = input.value.trim();
      if (!t) { out.setText(""); return; }
      if (hasDice(t)) { out.setText("🎲 rola ao aplicar"); return; }
      try { out.setText("= " + calcExpr(t).value); } catch (e) { out.setText("= ?"); }
    };
    input.addEventListener("input", showPreview);

    const evalNow = () => {
      const t = input.value.trim();
      if (!t) { new Notice("Digite um valor ou uma conta (ex.: 12+5+8)."); return null; }
      try {
        const r = calcExpr(t);
        if (r.value < 0) { new Notice("O resultado é negativo. Para recuperar PV, use Cura."); return null; }
        return Object.assign(r, { text: t });
      } catch (e) {
        new Notice("Conta inválida: " + e.message);
        return null;
      }
    };
    const snap = (label) => {
      this.hpHistory.push({ cur: Number(d.hpCurrent), temp: Number(d.hpTemp), label });
      if (this.hpHistory.length > 20) this.hpHistory.shift();
    };
    const state = () => `PV ${d.hpCurrent}/${d.hpMax}${Number(d.hpTemp) ? ` + ${d.hpTemp} temp.` : ""}`;
    const finish = (msg) => {
      this.calcLog = msg;
      this.calcFocus = true;
      new Notice(msg, 6000);
      this.rerender();
    };
    const via = (r) => `${r.text}${r.rolls.length ? " " + r.rolls.join(" ") : ""}`;

    const damage = () => {
      const r = evalNow();
      if (!r) return;
      snap(`dano ${r.value}`);
      let v = r.value;
      const fromTemp = Math.min(Number(d.hpTemp), v);
      d.hpTemp = Number(d.hpTemp) - fromTemp;
      v -= fromTemp;
      d.hpCurrent = Math.max(0, Number(d.hpCurrent) - v);
      finish(`Dano ${r.value} (${via(r)}) → ${state()}${d.hpCurrent === 0 ? " — a 0 PV!" : ""}`);
    };
    const heal = () => {
      const r = evalNow();
      if (!r) return;
      snap(`cura ${r.value}`);
      d.hpCurrent = Math.min(Number(d.hpMax), Number(d.hpCurrent) + r.value);
      finish(`Cura ${r.value} (${via(r)}) → ${state()}`);
    };
    const temp = () => {
      const r = evalNow();
      if (!r) return;
      snap(`PV temporários ${r.value}`);
      d.hpTemp = Math.max(Number(d.hpTemp), r.value);   // PV temporários não se acumulam
      finish(`PV temporários: ${d.hpTemp} (não se acumulam; vale o maior) → ${state()}`);
    };
    const undo = () => {
      const h = this.hpHistory.pop();
      if (!h) { new Notice("Nada para desfazer."); return; }
      d.hpCurrent = h.cur;
      d.hpTemp = h.temp;
      finish(`Desfeito (${h.label}) → ${state()}`);
    };
    const wrap = (suffix) => {
      const t = input.value.trim();
      if (!t) return;
      input.value = `(${t})${suffix}`;
      showPreview();
      input.focus();
    };
    const longRest = () => {
      const rec = this.longRestAll();
      this.hpHistory.length = 0;
      finish(`Descanso longo: PV e espaços de magia${rec.length ? " e recursos (" + rec.join(", ") + ")" : ""} restaurados → ${state()}`);
    };
    const shortRest = () => {
      const rec = resRest(d, "short");
      finish(rec.length ? `Descanso curto: ${rec.join(", ")} recuperado(s) → ${state()}` : `Descanso curto: nenhum recurso para recuperar → ${state()}`);
    };

    input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (e.shiftKey) heal(); else damage();
    });

    const bar = box.createDiv({ cls: "dnd-calc-btns" });
    const b = (text, title, fn) => {
      const el = bar.createEl("button", { text, attr: { title } });
      el.addEventListener("click", fn);
      return el;
    };
    b("Dano", "Aplica como dano (gasta PV temporários primeiro). Atalho: Enter", damage);
    b("Cura", "Aplica como cura, até o máximo. Atalho: Shift+Enter", heal);
    b("PV temp.", "Define PV temporários (não se acumulam: fica o maior valor)", temp);
    b("½", "Resistência: divide a conta atual por 2 (arredonda para baixo)", () => wrap("/2"));
    b("×2", "Vulnerabilidade: dobra a conta atual", () => wrap("*2"));
    b("Desfazer", "Desfaz a última alteração de PV feita aqui", undo);
    b("Descanso curto", "Recupera os recursos de descanso curto", shortRest);
    b("Descanso longo", "Restaura PV, espaços de magia e os recursos de descanso curto e longo", longRest);

    if (this.calcLog) box.createDiv({ cls: "dnd-calc-log", text: this.calcLog });
    if (this.calcFocus) {
      this.calcFocus = false;
      const mobile = typeof document !== "undefined" && document.body && document.body.classList && document.body.classList.contains("is-mobile");
      if (!mobile) input.focus();
    }
  }

  // =====================================================================
  // RECURSOS DE CLASSE: um cartão por recurso, controles por categoria, descansos e modelos
  // =====================================================================
  // Descanso longo completo (PV, espaços de magia, salvaguardas contra a morte e recursos).
  // Usado pela calculadora de PV e pela seção de recursos.
  longRestAll() {
    const d = this.d;
    d.hpCurrent = d.hpMax;
    d.hpTemp = 0;
    for (let i = 1; i <= 9; i++) d.spellSlots[i].used = 0;
    d.deathSuccess = [false, false, false];
    d.deathFail = [false, false, false];
    return resRest(d, "long");
  }

  openResourceEditor(def, redraw) {
    const d = this.d;
    if (!this.app) { new Notice("O editor de recursos não está disponível neste contexto."); return; }
    new ResourceEditorModal(this.app, def, {
      onSave: (nd) => {
        if (def) resEdit(d, def.id, nd); else resAdd(d, nd);
        this.changed();
        redraw();
      },
      onDelete: def ? () => { resDelete(d, def.id); this.changed(); redraw(); } : null,
      onReset: def && def.tpl ? async () => { def.ov = []; await this.syncTemplates(); } : null,
    }).open();
  }

  async readTemplate(path) {
    const vault = this.app && this.app.vault;
    if (!vault) return null;
    let f = vault.getAbstractFileByPath(path);
    if (!(f instanceof TFile)) {
      const base = String(path).split("/").pop();
      f = vault.getFiles().find((x) => x.extension === RES_EXT && x.name === base) || null;   // arquivo movido
    }
    if (!f) return null;
    return { file: f, data: parseTemplate(await vault.read(f)) };
  }

  async applyTemplateFile(file) {
    const data = parseTemplate(await this.app.vault.read(file));
    if (!data) { new Notice("Modelo de recursos inválido."); return; }
    const rep = resApplyTemplate(this.d, data, file.path);
    this.rerender();
    new Notice(`Modelo "${data.name || file.basename}": ${rep.added} recurso(s) adicionado(s)${rep.skipped ? `, ${rep.skipped} já estava(m) na ficha` : ""}.`, 6000);
  }

  // Atualiza os recursos vindos de modelos. Valores atuais, edições pessoais e exclusões do jogador são preservados.
  async syncTemplates() {
    const d = this.d;
    const paths = [...new Set(d.resources.filter((r) => r.tpl).map((r) => r.tpl.file))];
    if (!paths.length) { new Notice("Nenhum recurso desta ficha veio de um modelo."); return; }
    const lines = [];
    for (const path of paths) {
      const t = await this.readTemplate(path);
      if (!t || !t.data) { lines.push(`${path.split("/").pop()}: modelo não encontrado ou inválido (nada foi alterado)`); continue; }
      d.resources.forEach((r) => { if (r.tpl && r.tpl.file === path) r.tpl.file = t.file.path; });   // acompanha arquivo movido ou renomeado
      d.resourceDismissed = d.resourceDismissed.map((k) => (k.startsWith(path + "::") ? t.file.path + k.slice(path.length) : k));
      const rep = resSyncTemplate(d, t.data, t.file.path);
      lines.push(`${t.data.name || t.file.basename}: ${rep.added} novo(s), ${rep.updated} atualizado(s), ${rep.orphans} fora do modelo, ${rep.kept} edição(ões) pessoal(is) mantida(s)`);
    }
    this.rerender();
    new Notice(lines.join("\n") + "\nOs valores atuais dos recursos não foram alterados.", 10000);
  }

  // Seção "Recursos de Classe". compact = resumo (só os recursos fixados com ★).
  renderResources(parent, compact) {
    const d = this.d;
    if (compact && !d.resources.length) return;
    const sec = this.section(parent, "Recursos de Classe");
    const bar = sec.createDiv({ cls: "dnd-res-toolbar" });
    const list = sec.createDiv({ cls: "dnd-res-list" });

    const draw = () => {
      list.empty();
      const shown = d.resources.filter((r) => !compact || r.pinned);
      if (!d.resources.length) list.createDiv({ cls: "dnd-hint", text: "Nenhum recurso ainda. Use + Novo recurso ou Aplicar modelo." });
      else if (!shown.length) list.createDiv({ cls: "dnd-hint", text: "Nenhum recurso fixado. Na ficha completa, clique em ☆ no recurso." });
      shown.forEach((def) => this.resourceCard(list, def, draw, compact));
    };
    const btn = (text, title, fn, cls) => {
      const b = bar.createEl("button", { text, cls: cls || "", attr: { title, "data-act": text } });
      b.addEventListener("click", fn);
      return b;
    };

    if (!compact) {
      btn("+ Novo recurso", "Criar um recurso", () => this.openResourceEditor(null, draw), "mod-cta");
      btn("Aplicar modelo", "Acrescenta os recursos de um modelo (.dndresources)", () => {
        if (this.app) new TemplatePicker(this.app, (f) => this.applyTemplateFile(f)).open();
      });
      btn("Atualizar dos modelos", "Sincroniza com os modelos, preservando valores e edições pessoais", () => this.syncTemplates());
    }
    btn(compact ? "Desc. curto" : "Descanso curto", "Recupera os recursos de descanso curto", () => {
      const n = resRest(d, "short");
      this.changed(); draw();
      new Notice(n.length ? `Descanso curto: ${n.join(", ")} recuperado(s).` : "Descanso curto: nenhum recurso para recuperar.");
    });
    btn(compact ? "Desc. longo" : "Descanso longo", "Restaura PV, espaços de magia e os recursos de descanso curto e longo", () => {
      const n = this.longRestAll();
      this.hpHistory.length = 0;
      this.rerender();
      new Notice(`Descanso longo: PV e espaços de magia restaurados${n.length ? "; recursos: " + n.join(", ") : ""}.`);
    });
    btn(compact ? "Próx. turno" : "Próximo turno", "Avança uma rodada: conta a duração dos efeitos e recupera os recursos de início de turno", () => {
      const rep = resAdvanceTurn(d);
      this.changed(); draw();
      const parts = [];
      if (rep.ticked.length) parts.push(`Rodada avançou: ${rep.ticked.join(", ")}.`);
      rep.ended.forEach((def) => parts.push(`${def.name || "Recurso"} terminou${def.endNote ? " (" + def.endNote + ")" : ""}.`));
      if (rep.recovered.length) parts.push(`Recuperado: ${rep.recovered.join(", ")}.`);
      new Notice(parts.length ? parts.join("\n") : "Próximo turno: nada a atualizar.");
    });
    draw();
  }

  resourceCard(parent, def, redraw, compact) {
    const d = this.d;
    const st = d.resourceState[def.id] || (d.resourceState[def.id] = resInitState(def));
    const cur = resCur(d, def);
    const max = def.max;
    const card = parent.createDiv({ cls: `dnd-res dnd-res-${def.kind}${st.active ? " on" : ""}` });
    const head = card.createDiv({ cls: "dnd-res-head" });
    this.star(head, def, "pinned");
    head.createSpan({ cls: "dnd-res-icon", text: def.icon || "✨" });
    head.createSpan({ cls: "dnd-res-name", text: def.name || "Sem nome" });
    const srcTxt = def.source.label || (def.source.type !== "custom" ? resLabel(RES_SOURCES, def.source.type) : "");
    if (srcTxt) head.createSpan({ cls: "dnd-res-src", text: srcTxt });
    if (def.tpl && def.tpl.orphan) head.createSpan({ cls: "dnd-res-src", text: "fora do modelo" });
    const open = this.resOpen.has(def.id);
    head.createEl("button", { cls: "dnd-res-btn", text: open ? "▾" : "ⓘ", attr: { title: "Descrição e recuperação", "data-act": "info" } })
      .addEventListener("click", () => { if (open) this.resOpen.delete(def.id); else this.resOpen.add(def.id); redraw(); });
    head.createEl("button", { cls: "dnd-res-btn", text: "✎", attr: { title: "Editar recurso", "data-act": "edit" } })
      .addEventListener("click", () => this.openResourceEditor(def, redraw));

    const act = (fn) => { fn(); this.changed(); redraw(); };
    const amountOf = () => Math.max(1, Math.floor(Number(this.resAmt[def.id])) || 1);
    const body = card.createDiv({ cls: "dnd-res-body" });
    const rb = (text, action, title, fn) => body.createEl("button", { cls: "dnd-res-btn", text, attr: { "data-act": action, title: title || "" } }).addEventListener("click", fn);

    if (def.kind === "points" || def.kind === "markers") {
      rb("−", "spend", "Gastar", () => act(() => resSpend(d, def, amountOf())));
      body.createSpan({ cls: "dnd-res-val", text: max === null ? String(cur) : `${cur} / ${max}` });
      rb("+", "recover", "Recuperar ou adicionar", () => act(() => resRecover(d, def, amountOf())));
      const amt = body.createEl("input", { type: "number", cls: "dnd-res-amt", attr: { min: "1", title: "Quantidade por clique", "data-act": "amount" } });
      amt.value = String(this.resAmt[def.id] || 1);
      amt.addEventListener("input", () => { this.resAmt[def.id] = amt.value; });
      if (def.kind === "markers") rb("Zerar", "zero", "Zera os marcadores", () => act(() => { st.cur = 0; }));
      if (max !== null && max > 0) {
        card.createDiv({ cls: "dnd-res-bar" }).createDiv({ cls: "dnd-res-fill" }).style.width = Math.round((cur / max) * 100) + "%";
      }
    }

    if (def.kind === "uses" || def.kind === "dice") {
      if (def.kind === "dice") body.createSpan({ cls: "dnd-res-die", text: def.die });
      body.createSpan({ cls: "dnd-res-val", text: `${cur} / ${max}` });
      if (max <= 20) {
        const pips = body.createDiv({ cls: "dnd-pips" });
        for (let j = 0; j < max; j++) {
          const avail = j < cur;
          pips.createEl("button", { cls: "dnd-pip" + (avail ? "" : " used"), text: avail ? "●" : "○", attr: { "data-pip": String(j) } })
            .addEventListener("click", () => act(() => { st.cur = avail ? j : j + 1; }));
        }
      }
      rb("− Gastar", "spend", "Gasta 1", () => act(() => resSpend(d, def, 1)));
      rb("+ Recuperar", "recover", "Recupera 1", () => act(() => resRecover(d, def, 1)));
      if (def.kind === "dice") {
        rb(`🎲 Gastar e rolar ${def.die}`, "roll", "Gasta um dado e rola", () => {
          if (cur < 1) { new Notice(`${def.name || "Dados"}: nenhum dado disponível.`); return; }
          act(() => resSpend(d, def, 1));
          rollDiceNotice(def.name || "Dado", "1" + def.die);
        });
      }
    }

    if (def.kind === "toggle") {
      body.createEl("button", { cls: "dnd-res-toggle" + (st.active ? " on" : ""), text: st.active ? "● ATIVO" : "○ Inativo", attr: { "data-act": "toggle" } })
        .addEventListener("click", () => act(() => resSetActive(d, def, !st.active)));
      if (def.durationRounds > 0 && st.active) body.createSpan({ cls: "dnd-res-val", text: `${st.left} rodada(s)${st.running ? "" : " (pausado)"}` });
    }

    if (def.kind === "duration") {
      body.createSpan({ cls: "dnd-res-val", text: st.left > 0 ? `${st.left} rodada(s)${st.running ? "" : " (pausado)"}` : "inativo" });
      rb(st.left > 0 ? "Reiniciar" : "Iniciar", "start", "Inicia com a duração configurada", () => act(() => resDuration(d, def, "start")));
      if (st.left > 0) rb(st.running ? "Pausar" : "Retomar", st.running ? "pause" : "resume", "", () => act(() => resDuration(d, def, st.running ? "pause" : "resume")));
      rb("−1", "minus", "Tira uma rodada", () => act(() => resDuration(d, def, "minus")));
      rb("+1", "plus", "Acrescenta uma rodada", () => act(() => resDuration(d, def, "plus")));
      rb("Encerrar", "end", "Encerra o efeito", () => act(() => resDuration(d, def, "end")));
    }

    if (open) {
      const det = card.createDiv({ cls: "dnd-res-detail" });
      if (def.desc) def.desc.split(/\n+/).forEach((p) => det.createDiv({ text: p }));
      const rec = def.recover;
      const amountTxt = resCounted(def) && ["short", "long", "turn"].includes(rec.on) ? (rec.amount === "all" ? " (recupera tudo)" : ` (recupera ${rec.amount})`) : "";
      det.createDiv({ cls: "dnd-srd-meta", text: `Recuperação: ${rec.on === "custom" ? "outra condição" + (rec.note ? ": " + rec.note : "") : resLabel(RES_RECOVER, rec.on) + amountTxt}` });
      if (def.endNote) det.createDiv({ cls: "dnd-srd-meta", text: `Encerra: ${def.endNote}` });
      if (def.notes) det.createDiv({ cls: "dnd-srd-meta", text: `Observações: ${def.notes}` });
      if (def.tpl) det.createDiv({ cls: "dnd-srd-meta", text: `Modelo: ${def.tpl.file.split("/").pop()}${def.ov.length ? " · editado por você: " + def.ov.join(", ") : ""}` });
    }
  }

  // Se algo inesperado quebrar o desenho, mostra um aviso em vez de deixar a tela em branco.
  render() {
    try {
      this.build();
    } catch (e) {
      console.error("[dnd-sheet] erro ao desenhar a ficha:", e);
      this.root.empty();
      this.root.createDiv({ cls: "dnd-error", text: `Não consegui desenhar esta ficha (${e && e.message ? e.message : e}). Os dados continuam no arquivo; abra-o como texto para conferir.` });
    }
  }

  build() {
    const root = this.root;
    root.empty();
    root.addClass("dnd-sheet");
    this.updaters = [];
    const d = this.d;

    const modeBar = root.createDiv({ cls: "dnd-mon-toolbar" });
    const modeBtn = modeBar.createEl("button", { text: this.mode === "summary" ? "📄 Ficha completa" : "📋 Resumo" });
    modeBtn.addEventListener("click", () => { this.mode = this.mode === "summary" ? "full" : "summary"; this.render(); });
    modeBar.createSpan({ cls: "dnd-version", text: `v${PLUGIN_VERSION} · formato ${this.d.schemaVersion}` });
    if (this.mode === "summary") { this.renderSummary(); return; }

    // Cabeçalho
    const head = root.createDiv({ cls: "dnd-header" });
    this.field(head, "Nome do personagem", d, "name", { cls: "dnd-big" });
    const meta = head.createDiv({ cls: "dnd-grid dnd-grid-4" });
    this.field(meta, "Classe", d, "class");
    this.field(meta, "Subclasse", d, "subclass");
    this.field(meta, "Raça", d, "race");
    this.field(meta, "Antecedente", d, "background");
    this.field(meta, "Tendência", d, "alignment");
    this.field(meta, "Nível", d, "level", { type: "number" });
    this.field(meta, "XP", d, "xp", { type: "number" });
    this.field(meta, "Jogador", d, "player");

    const cols = root.createDiv({ cls: "dnd-cols" });

    // ===== Coluna 1: atributos e perícias =====
    const c1 = cols.createDiv({ cls: "dnd-col" });

    const top = this.section(c1, "Gerais");
    const topGrid = top.createDiv({ cls: "dnd-grid dnd-grid-2" });
    const pb = topGrid.createDiv({ cls: "dnd-stat" });
    pb.createEl("label", { text: "Bônus de proficiência" });
    this.live(pb.createDiv({ cls: "dnd-val" }), () => fmt(this.prof()));
    const insp = topGrid.createDiv({ cls: "dnd-field dnd-check" });
    insp.createEl("label", { text: "Inspiração" });
    this.input(insp, d, "inspiration", { type: "checkbox" });

    const ab = this.section(c1, "Atributos (clique no modificador para rolar)");
    ABILITIES.forEach(([k, label]) => {
      const row = ab.createDiv({ cls: "dnd-ability" });
      this.star(row, d.pinned.abilities, k);
      row.createEl("span", { text: label, cls: "dnd-ability-name" });
      this.input(row, d.abilities, k, { type: "number", cls: "dnd-score" });
      const m = row.createEl("button", { cls: "dnd-mod" });
      m.setText(fmt(this.abilityMod(k)));
      this.updaters.push(() => m.setText(fmt(this.abilityMod(k))));
      m.addEventListener("click", () => this.roll(label, this.abilityMod(k)));
    });

    const sv = this.section(c1, "Testes de resistência");
    this.colsHeader(sv, d.saveCols, d.saveBonus, 104);
    ABILITIES.forEach(([k, label]) => {
      const row = sv.createDiv({ cls: "dnd-row" });
      this.star(row, d.pinned.saves, k);
      this.input(row, d.saves, k, { type: "checkbox" });
      const b = row.createEl("button", { cls: "dnd-mod-sm" });
      const calc = () => this.saveTotal(k);
      b.setText(fmt(calc()));
      this.updaters.push(() => b.setText(fmt(calc())));
      b.addEventListener("click", () => this.roll("Resistência de " + label, calc()));
      d.saveCols.forEach((_, i) => this.bonusBox(row, d.saveBonus, k, i));
      row.createSpan({ text: label });
    });

    const sk = this.section(c1, "Perícias");
    this.colsHeader(sk, d.skillCols, d.skillBonus, 120);
    SKILLS.forEach(([k, label, attr]) => {
      const row = sk.createDiv({ cls: "dnd-row" });
      this.star(row, d.pinned.skills, k);
      const lvlBtn = row.createEl("button", { cls: "dnd-prof" });
      const paint = () => lvlBtn.setText(["○", "●", "◉"][d.skills[k] || 0]);
      paint();
      lvlBtn.addEventListener("click", () => {
        d.skills[k] = ((d.skills[k] || 0) + 1) % 3;
        paint();
        this.changed();
      });
      const calc = () => this.skillTotal(k, attr);
      const b = row.createEl("button", { cls: "dnd-mod-sm" });
      b.setText(fmt(calc()));
      this.updaters.push(() => b.setText(fmt(calc())));
      b.addEventListener("click", () => this.roll(label, calc()));
      d.skillCols.forEach((_, i) => this.bonusBox(row, d.skillBonus, k, i));
      row.createSpan({ text: `${label} (${attr.toUpperCase()})` });
    });
    sk.createDiv({ cls: "dnd-hint", text: "Clique no círculo: ○ nenhuma · ● proficiente · ◉ especialista. As caixas à direita do valor são bônus extras (buffs, itens): use o + no topo para adicionar outra coluna e dê um nome a cada uma. ☆ fixa o item na ficha resumida." });

    const pp = this.section(c1, "Percepção passiva");
    this.live(pp.createDiv({ cls: "dnd-val" }), () =>
      String(10 + this.skillTotal("perception", "wis") + Number(d.passiveBonus || 0)));
    this.field(pp, "Bônus extra", d, "passiveBonus", { type: "number" });

    // ===== Coluna 2: combate =====
    const c2 = cols.createDiv({ cls: "dnd-col" });

    const cb = this.section(c2, "Combate");
    const cg = cb.createDiv({ cls: "dnd-grid dnd-grid-3" });
    this.field(cg, "CA", d, "ac", { type: "number" });
    const ini = cg.createDiv({ cls: "dnd-stat" });
    ini.createEl("label", { text: "Iniciativa" });
    const inib = ini.createEl("button", { cls: "dnd-mod-sm" });
    const iniCalc = () => this.abilityMod("dex") + Number(d.initiativeBonus || 0);
    inib.setText(fmt(iniCalc()));
    this.updaters.push(() => inib.setText(fmt(iniCalc())));
    inib.addEventListener("click", () => this.roll("Iniciativa", iniCalc()));
    this.field(cg, "Bônus extra de iniciativa", d, "initiativeBonus", { type: "number" });
    this.field(cg, "Deslocamento", d, "speed");
    this.field(cg, "Dados de vida", d, "hitDice");

    const hp = this.section(c2, "Pontos de vida");
    const hg = hp.createDiv({ cls: "dnd-grid dnd-grid-3" });
    this.field(hg, "Máximo", d, "hpMax", { type: "number" });
    this.field(hg, "Atual", d, "hpCurrent", { type: "number" });
    this.field(hg, "Temporário", d, "hpTemp", { type: "number" });
    this.hpCalculator(hp);

    const ds = this.section(c2, "Salvaguardas contra a morte");
    const dsr = ds.createDiv({ cls: "dnd-row" });
    dsr.createSpan({ text: "Sucessos" });
    d.deathSuccess.forEach((_, i) => this.input(dsr, d.deathSuccess, i, { type: "checkbox" }));
    const dfr = ds.createDiv({ cls: "dnd-row" });
    dfr.createSpan({ text: "Falhas" });
    d.deathFail.forEach((_, i) => this.input(dfr, d.deathFail, i, { type: "checkbox" }));

    this.renderResources(c2, false);

    const at = this.section(c2, "Ataques e conjuração");
    const atList = at.createDiv({ cls: "dnd-attacks" });
    const drawAttacks = () => {
      atList.empty();
      if (d.attacks.length) {
        const h = atList.createDiv({ cls: "dnd-attack dnd-attack-head" });
        ["", "Nome", "Bônus", "Dano / tipo", ""].forEach((t) => h.createSpan({ text: t }));
      }
      d.attacks.forEach((a, i) => {
        const row = atList.createDiv({ cls: "dnd-attack" });
        this.star(row, a, "pin");
        this.input(row, a, "name", { placeholder: "Espada longa" });
        this.input(row, a, "bonus", { placeholder: "+5" });
        this.input(row, a, "damage", { placeholder: "1d8+3 cortante" });
        const del = row.createEl("button", { text: "✕", cls: "dnd-del" });
        del.addEventListener("click", () => { d.attacks.splice(i, 1); this.changed(); drawAttacks(); });
      });
    };
    drawAttacks();
    const addAtk = at.createEl("button", { text: "+ Adicionar ataque" });
    addAtk.addEventListener("click", () => {
      d.attacks.push({ name: "", bonus: "", damage: "" });
      this.changed(); drawAttacks();
    });

    this.area(c2, "Características e habilidades", d, "features", 10);
    this.area(c2, "Proficiências e idiomas", d, "proficiencies", 5);

    // ===== Coluna 3: magia, equipamento, personalidade =====
    const c3 = cols.createDiv({ cls: "dnd-col" });

    const sp = this.section(c3, "Magia");
    const spHead = sp.createDiv({ cls: "dnd-grid dnd-grid-3" });
    const sa = spHead.createDiv({ cls: "dnd-field" });
    sa.createEl("label", { text: "Atributo de conjuração" });
    const sel = sa.createEl("select");
    ABILITIES.forEach(([k, label]) => sel.createEl("option", { value: k, text: label }));
    sel.value = d.spellAbility;
    sel.addEventListener("change", () => { d.spellAbility = sel.value; this.changed(); });
    const dc = spHead.createDiv({ cls: "dnd-stat" });
    dc.createEl("label", { text: "CD de magia" });
    this.live(dc.createDiv({ cls: "dnd-val" }), () => String(8 + this.prof() + this.abilityMod(d.spellAbility)));
    const sb = spHead.createDiv({ cls: "dnd-stat" });
    sb.createEl("label", { text: "Ataque de magia" });
    this.live(sb.createDiv({ cls: "dnd-val" }), () => fmt(this.prof() + this.abilityMod(d.spellAbility)));

    const slots = sp.createDiv({ cls: "dnd-slots" });
    const sh = slots.createDiv({ cls: "dnd-slot dnd-slot-head" });
    ["Círculo", "Máx.", "Usados"].forEach((t) => sh.createSpan({ text: t }));
    for (let i = 1; i <= 9; i++) {
      const row = slots.createDiv({ cls: "dnd-slot" });
      row.createSpan({ text: i + "º" });
      this.input(row, d.spellSlots[i], "max", { type: "number" });
      this.input(row, d.spellSlots[i], "used", { type: "number" });
    }
    this.renderSpellbook(sp);
    this.area(sp, "Notas de magias (texto livre)", d, "spells", 4);

    const eq = this.section(c3, "Equipamento");
    const coins = eq.createDiv({ cls: "dnd-grid dnd-grid-5" });
    [["pc", "PC"], ["pp", "PP"], ["pe", "PE"], ["po", "PO"], ["pl", "PL"]].forEach(([k, l]) =>
      this.field(coins, l, d.coins, k, { type: "number" }));
    this.area(eq, "Itens", d, "equipment", 10);

    const pers = this.section(c3, "Personalidade");
    this.area(pers, "Traços de personalidade", d, "personality", 3);
    this.area(pers, "Ideais", d, "ideals", 3);
    this.area(pers, "Vínculos", d, "bonds", 3);
    this.area(pers, "Defeitos", d, "flaws", 3);

    const extra = this.section(c3, "História e notas");
    this.area(extra, "História do personagem", d, "backstory", 8);
    this.area(extra, "Notas", d, "notes", 8);

    // Modo compacto (janela pequena / nota): uma coluna por aba
    if (this.compact) {
      root.addClass("dnd-compact");
      const cs = [c1, c2, c3];
      const bar = root.createDiv({ cls: "dnd-tabs" });
      root.insertBefore(bar, cols);
      const btns = [];
      const show = (i) => {
        this.tab = i;
        cs.forEach((c, j) => c.toggleClass("active", j === i));
        btns.forEach((b, j) => b.toggleClass("active", j === i));
      };
      ["Atributos", "Combate", "Magia e itens"].forEach((n, i) => {
        const b = bar.createEl("button", { text: n });
        b.addEventListener("click", () => show(i));
        btns.push(b);
      });
      show(this.tab || 0);
    }
  }
}

// ---------------------------------------------------------------------
// Ficha de criatura (modo "Ver" estilo Homebrewery + modo "Editar")
// ---------------------------------------------------------------------
class ImportModal extends Modal {
  constructor(app, onSubmit) { super(app); this.onSubmit = onSubmit; }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "Importar texto Homebrewery" });
    contentEl.createEl("p", { text: "Cole o bloco {{monster,frame ... }} inteiro. Os campos atuais da criatura serão substituídos." });
    const ta = contentEl.createEl("textarea");
    ta.rows = 18;
    ta.style.width = "100%";
    const btn = contentEl.createEl("button", { text: "Importar", cls: "mod-cta" });
    btn.addEventListener("click", () => { this.onSubmit(ta.value); this.close(); });
  }
  onClose() { this.contentEl.empty(); }
}

const ABIL_PT = ["FOR", "DES", "CON", "INT", "SAB", "CAR"];
const textNode = (s) => document.createTextNode(String(s));

class CreatureUI extends SheetUI {
  constructor(root, data, onChange, opts = {}) {
    super(root, data, onChange, opts);
    this.app = opts.app;
    this.mode = opts.mode || "view";
  }

  prof() { return creatureProf(this.d); }

  imageSrc(path) {
    if (/^(https?:|data:)/i.test(path)) return path;
    const f = this.app && this.app.vault && this.app.vault.getAbstractFileByPath(path);
    return f instanceof TFile ? this.app.vault.getResourcePath(f) : path;
  }

  onRoll(kind, val) {
    if (kind === "attack") this.roll("Ataque", Number(val));
    else rollDiceNotice("Rolagem", val);
  }

  importText(txt) {
    const parsed = parseHomebrewery(txt);
    if (!parsed.name) { new Notice("Não reconheci uma criatura nesse texto (falta a linha ## Nome)."); return; }
    if (!parsed.image) parsed.image = this.d.image;
    const fresh = normalizeCreature(parsed);
    Object.keys(this.d).forEach((k) => delete this.d[k]);
    Object.assign(this.d, fresh);
    this.changed();
    this.render();
    new Notice("Criatura importada: " + fresh.name);
  }

  build() {
    const root = this.root;
    root.empty();
    root.addClass("dnd-sheet");
    root.addClass("dnd-creature");
    this.updaters = [];

    const bar = root.createDiv({ cls: "dnd-mon-toolbar" });
    const toggle = bar.createEl("button", { text: this.mode === "view" ? "✎ Editar" : "👁 Ver ficha" });
    toggle.addEventListener("click", () => { this.mode = this.mode === "view" ? "edit" : "view"; this.render(); });
    const imp = bar.createEl("button", { text: "Importar Homebrewery" });
    imp.addEventListener("click", () => new ImportModal(this.app, (t) => this.importText(t)).open());
    bar.createSpan({ cls: "dnd-version", text: `v${PLUGIN_VERSION} · formato ${this.d.schemaVersion}` });
    const exp = bar.createEl("button", { text: "Copiar Homebrewery" });
    exp.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(toHomebrewery(this.d)); new Notice("Texto Homebrewery copiado."); }
      catch (e) { new Notice("Não consegui copiar para a área de transferência."); }
    });

    if (this.mode === "view") this.renderView(root); else this.renderEdit(root);
  }

  // ---------- Ver ----------
  renderView(root) {
    const d = this.d;
    const onRoll = (k, v) => this.onRoll(k, v);
    const frame = root.createDiv({ cls: "dnd-mon-frame" });
    if (d.image) frame.createEl("img", { cls: "dnd-mon-img" }).src = this.imageSrc(d.image);
    frame.createEl("h2", { text: d.name || "Criatura sem nome", cls: "dnd-mon-name" });
    if (d.subtitle) frame.createDiv({ cls: "dnd-mon-sub", text: d.subtitle });
    const rule = () => frame.createDiv({ cls: "dnd-mon-rule" });
    const line = (label, value) => {
      if (value === "" || value === null || value === undefined) return;
      const p = frame.createDiv({ cls: "dnd-mon-line" });
      p.createEl("strong", { text: label + " " });
      p.appendChild(textNode(value));
    };

    rule();
    line("Classe de Armadura", `${d.ac}${d.acNote ? ` (${d.acNote})` : ""}`);

    const hp = frame.createDiv({ cls: "dnd-mon-line dnd-mon-hp" });
    hp.createEl("strong", { text: "Pontos de Vida " });
    this.input(hp, d, "hpCurrent", { type: "number", cls: "dnd-mon-hpinput" });
    hp.appendChild(textNode(` / ${d.hpAvg} `));
    if (d.hpFormula) {
      hp.appendChild(textNode("("));
      const hb = hp.createEl("button", { cls: "dnd-rollable", text: d.hpFormula });
      hb.addEventListener("click", () => rollDiceNotice("PV", d.hpFormula));
      hp.appendChild(textNode(")"));
    }
    const quick = frame.createDiv({ cls: "dnd-mon-quick" });
    const qi = quick.createEl("input", { type: "number", placeholder: "valor" });
    const redraw = () => { this.changed(); this.render(); };
    quick.createEl("button", { text: "Dano" }).addEventListener("click", () => {
      d.hpCurrent = Math.max(0, Number(d.hpCurrent) - (Number(qi.value) || 0));
      redraw();
    });
    quick.createEl("button", { text: "Cura" }).addEventListener("click", () => {
      d.hpCurrent = Math.min(Number(d.hpAvg), Number(d.hpCurrent) + (Number(qi.value) || 0));
      redraw();
    });
    quick.createEl("button", { text: "PV cheios" }).addEventListener("click", () => {
      d.hpCurrent = Number(d.hpAvg);
      redraw();
    });

    line("Deslocamento", d.speed);
    rule();

    const tbl = frame.createEl("table", { cls: "dnd-mon-abil" });
    const hr = tbl.createEl("thead").createEl("tr");
    ABIL_PT.forEach((l) => hr.createEl("th", { text: l }));
    const br = tbl.createEl("tbody").createEl("tr");
    ABILITIES.forEach(([k, label]) => {
      const b = br.createEl("td").createEl("button", { text: `${d.abilities[k]} (${fmt(this.abilityMod(k))})` });
      b.addEventListener("click", () => this.roll(label, this.abilityMod(k)));
    });
    rule();

    [["Testes de Resistência", "saves"], ["Perícias", "skills"], ["Vulnerabilidades a Dano", "vulnerabilities"],
      ["Resistências a Dano", "resistances"], ["Imunidades a Dano", "immunities"],
      ["Imunidades a Condição", "conditionImmunities"], ["Sentidos", "senses"], ["Idiomas", "languages"]]
      .forEach(([label, key]) => line(label, d[key]));

    const xp = crXp(d.cr);
    const ch = frame.createDiv({ cls: "dnd-mon-line dnd-mon-cr" });
    const left = ch.createSpan();
    left.createEl("strong", { text: "Nível de Desafio " });
    left.appendChild(textNode(`${d.cr}${xp !== null ? ` (${xp} XP)` : ""}`));
    const right = ch.createSpan();
    right.createEl("strong", { text: "Bônus de Proficiência " });
    right.appendChild(textNode(fmt(this.prof())));
    rule();

    const block = (title, arr, intro) => {
      if (!arr.length && !intro) return;
      if (title) frame.createEl("h3", { text: title, cls: "dnd-mon-h3" });
      if (intro) renderRich(frame.createDiv({ cls: "dnd-mon-item" }), intro, onRoll);
      arr.forEach((it) => {
        const p = frame.createDiv({ cls: "dnd-mon-item" });
        p.createEl("strong").createEl("em", { text: (it.name || "").replace(/[.\s]+$/, "") + "." });
        p.appendChild(textNode(" "));
        renderRich(p, it.text || "", onRoll);
      });
    };
    block("", d.traits);
    block("Ações", d.actions);
    block("Ações Bônus", d.bonusActions);
    block("Reações", d.reactions);
    block("Ações Lendárias", d.legendary, d.legendaryIntro);

    if (d.notes) {
      const n = root.createDiv({ cls: "dnd-section dnd-mon-notes" });
      n.createEl("h4", { text: "Notas" });
      n.createDiv({ text: d.notes });
    }
  }

  // ---------- Editar ----------
  listEditor(parent, title, key) {
    const d = this.d;
    const sec = this.section(parent, title);
    const box = sec.createDiv();
    const draw = () => {
      box.empty();
      d[key].forEach((it, i) => {
        const row = box.createDiv({ cls: "dnd-mon-edit-item" });
        const head = row.createDiv({ cls: "dnd-mon-edit-head" });
        this.input(head, it, "name", { placeholder: "Nome" });
        const swap = (j) => {
          if (j < 0 || j >= d[key].length) return;
          [d[key][i], d[key][j]] = [d[key][j], d[key][i]];
          this.changed();
          draw();
        };
        head.createEl("button", { text: "↑" }).addEventListener("click", () => swap(i - 1));
        head.createEl("button", { text: "↓" }).addEventListener("click", () => swap(i + 1));
        head.createEl("button", { text: "✕", cls: "dnd-del" }).addEventListener("click", () => {
          d[key].splice(i, 1);
          this.changed();
          draw();
        });
        const ta = row.createEl("textarea");
        ta.rows = 3;
        ta.value = it.text || "";
        ta.addEventListener("input", () => { it.text = ta.value; this.changed(); });
      });
    };
    draw();
    sec.createEl("button", { text: "+ Adicionar" }).addEventListener("click", () => {
      d[key].push({ name: "", text: "" });
      this.changed();
      draw();
    });
  }

  renderEdit(root) {
    const d = this.d;
    const head = root.createDiv({ cls: "dnd-header" });
    this.field(head, "Nome", d, "name", { cls: "dnd-big" });
    this.field(head, "Tipo e tendência (ex.: Criatura Pequena, aberração, neutra má)", d, "subtitle");
    this.field(head, "Imagem (URL ou caminho no vault)", d, "image");

    const g = this.section(root, "Defesa e movimento");
    const grid = g.createDiv({ cls: "dnd-grid dnd-grid-3" });
    this.field(grid, "CA", d, "ac", { type: "number" });
    this.field(grid, "Nota da CA", d, "acNote", { placeholder: "corpo flexível" });
    this.field(grid, "Deslocamento", d, "speed");
    this.field(grid, "PV (média)", d, "hpAvg", { type: "number" });
    this.field(grid, "Fórmula dos PV", d, "hpFormula", { placeholder: "3d6 + 3" });
    this.field(grid, "PV atuais", d, "hpCurrent", { type: "number" });

    const ab = this.section(root, "Atributos");
    const ag = ab.createDiv({ cls: "dnd-grid dnd-grid-3" });
    ABILITIES.forEach(([k, label]) => {
      const w = ag.createDiv({ cls: "dnd-field" });
      w.createEl("label", { text: label });
      const row = w.createDiv({ cls: "dnd-row" });
      this.input(row, d.abilities, k, { type: "number" });
      this.live(row.createSpan(), () => fmt(this.abilityMod(k)));
    });

    const t = this.section(root, "Características");
    [["Testes de resistência", "saves"], ["Perícias", "skills"], ["Vulnerabilidades a dano", "vulnerabilities"],
      ["Resistências a dano", "resistances"], ["Imunidades a dano", "immunities"],
      ["Imunidades a condição", "conditionImmunities"], ["Sentidos", "senses"], ["Idiomas", "languages"]]
      .forEach(([label, key]) => this.field(t, label, d, key));

    const cr = this.section(root, "Nível de desafio");
    const cg = cr.createDiv({ cls: "dnd-grid dnd-grid-3" });
    this.field(cg, "ND (ex.: 1/4, 3, 10)", d, "cr");
    this.field(cg, "Bônus de proficiência (vazio = automático)", d, "profOverride");
    const info = cg.createDiv({ cls: "dnd-stat" });
    info.createEl("label", { text: "XP e proficiência" });
    this.live(info.createDiv({ cls: "dnd-val" }), () => `${crXp(d.cr) !== null ? crXp(d.cr) : "—"} XP · ${fmt(this.prof())}`);

    this.listEditor(root, "Características (traços)", "traits");
    this.listEditor(root, "Ações", "actions");
    this.listEditor(root, "Ações bônus", "bonusActions");
    this.listEditor(root, "Reações", "reactions");
    const leg = this.section(root, "Introdução das ações lendárias");
    this.area(leg, "Texto (opcional)", d, "legendaryIntro", 3);
    this.listEditor(root, "Ações lendárias", "legendary");
    this.area(root, "Notas (não aparecem no Homebrewery)", d, "notes", 6);
  }
}

// ---------------------------------------------------------------------
// Aba/arquivo .dndsheet
// ---------------------------------------------------------------------
class DndSheetView extends TextFileView {
  constructor(leaf) {
    super(leaf);
    this.data_ = defaultData();
    this.ui = null;
  }

  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return this.file ? this.file.basename : "Ficha de D&D"; }
  getIcon() { return "scroll"; }

  getViewData() {
    stampSheet(this.data_, false);
    return JSON.stringify(this.data_, null, 2);
  }

  setViewData(data) {
    const parsed = parseSheet(data);
    if (!parsed) new Notice("Ficha de D&D: arquivo inválido, usando ficha vazia.");
    this.data_ = parsed || defaultData();
    if (parsed && reportMigration(parsed, this.file && this.file.basename)) this.requestSave();   // grava a ficha já migrada, uma única vez
    this.ui = new SheetUI(this.contentEl, this.data_, () => this.requestSave(), {
      app: this.app,
      tab: this.ui ? this.ui.tab : 0,
      mode: this.ui ? this.ui.mode : undefined,
      openSpells: this.ui ? this.ui.openSpells : undefined,
      hpHistory: this.ui ? this.ui.hpHistory : undefined,
      calcLog: this.ui ? this.ui.calcLog : undefined,
    });
    this.ui.render();
  }

  clear() { this.data_ = defaultData(); }
}

class CreatureView extends TextFileView {
  constructor(leaf) {
    super(leaf);
    this.data_ = defaultCreature();
    this.ui = null;
  }

  getViewType() { return CREATURE_VIEW; }
  getDisplayText() { return this.file ? this.file.basename : "Criatura"; }
  getIcon() { return "skull"; }

  getViewData() {
    stampSheet(this.data_, true);
    return JSON.stringify(this.data_, null, 2);
  }

  setViewData(data) {
    const parsed = parseCreature(data);
    if (!parsed) new Notice("Criatura: arquivo inválido, usando ficha vazia.");
    this.data_ = parsed || defaultCreature();
    if (parsed && reportMigration(parsed, this.file && this.file.basename)) this.requestSave();
    this.ui = new CreatureUI(this.contentEl, this.data_, () => this.requestSave(), {
      app: this.app,
      mode: this.ui ? this.ui.mode : "view",
    });
    this.ui.render();
  }

  clear() { this.data_ = defaultCreature(); }
}

// ---------------------------------------------------------------------
// Liga um arquivo .dndsheet a uma ficha desenhada em qualquer elemento
// (usado pela janela flutuante e pelo bloco de código)
// ---------------------------------------------------------------------
class SheetBinding {
  constructor(plugin, file, host) {
    this.plugin = plugin;
    this.app = plugin.app;
    this.file = file;
    this.host = host;
    this.data = null;
    this.last = "";
    this.timer = null;
    this.ui = null;
    this.ref = null;
  }

  async load() {
    const text = await this.app.vault.read(this.file);
    const data = parseByExt(this.file.extension, text);
    if (!data) { this.host.setText("Arquivo de ficha inválido."); return false; }
    this.data = data;
    this.last = text;
    if (reportMigration(data, this.file.basename)) this.queueSave();
    this.draw();
    this.ref = this.app.vault.on("modify", async (f) => {
      if (f.path !== this.file.path) return;
      const t = await this.app.vault.read(f);
      if (t === this.last) return;
      const nd = parseByExt(this.file.extension, t);
      if (!nd) return;
      this.data = nd; this.last = t;
      if (reportMigration(nd, this.file.basename)) this.queueSave();
      this.draw();
    });
    return true;
  }

  draw() {
    const prev = this.ui;
    const UI = this.file.extension === CEXT ? CreatureUI : SheetUI;
    this.ui = new UI(this.host, this.data, () => this.queueSave(), {
      compact: true,
      tab: prev ? prev.tab : 0,
      mode: prev ? prev.mode : undefined,
      openSpells: prev ? prev.openSpells : undefined,
      hpHistory: prev ? prev.hpHistory : undefined,
      calcLog: prev ? prev.calcLog : undefined,
      app: this.app,
    });
    this.ui.render();
  }

  queueSave() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 400);
  }

  async flush() {
    this.timer = null;
    stampSheet(this.data, this.file.extension === CEXT);
    const str = JSON.stringify(this.data, null, 2);
    if (str === this.last) return;
    this.last = str;
    await this.app.vault.modify(this.file, str);
  }

  destroy() {
    if (this.timer) { clearTimeout(this.timer); this.flush(); }
    if (this.ref) this.app.vault.offref(this.ref);
    this.ref = null;
  }
}

// ---------------------------------------------------------------------
// Janela flutuante (arrastar, redimensionar, minimizar), estilo Foundry
// ---------------------------------------------------------------------
class FloatingSheet {
  constructor(plugin, file) {
    this.plugin = plugin;
    this.file = file;
    this.binding = null;
    this.el = null;
  }

  async open() {
    const p = this.plugin;
    const n = p.floating.size;
    const geo = p.geo[this.file.path] || { x: 90 + n * 32, y: 70 + n * 32, w: 460, h: 640 };
    const el = (this.el = document.body.createDiv({ cls: "dnd-float" }));
    Object.assign(el.style, {
      left: geo.x + "px", top: geo.y + "px", width: geo.w + "px", height: geo.h + "px",
      zIndex: String(++p.z),
    });
    el.addEventListener("pointerdown", () => { el.style.zIndex = String(++p.z); }, true);

    const bar = el.createDiv({ cls: "dnd-float-bar" });
    this.titleEl = bar.createSpan({ cls: "dnd-float-title", text: this.file.basename });
    const minBtn = bar.createEl("button", { text: "—", attr: { "aria-label": "Minimizar" } });
    const closeBtn = bar.createEl("button", { text: "✕", attr: { "aria-label": "Fechar" } });
    const body = el.createDiv({ cls: "dnd-float-body" });

    minBtn.addEventListener("click", () => el.toggleClass("min", !el.hasClass("min")));
    closeBtn.addEventListener("click", () => this.close());

    // arrastar pela barra de título
    let drag = null;
    bar.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button")) return;
      drag = { dx: e.clientX - el.offsetLeft, dy: e.clientY - el.offsetTop };
      bar.setPointerCapture(e.pointerId);
    });
    bar.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const x = Math.min(Math.max(0, e.clientX - drag.dx), window.innerWidth - 80);
      const y = Math.min(Math.max(0, e.clientY - drag.dy), window.innerHeight - 40);
      el.style.left = x + "px";
      el.style.top = y + "px";
    });
    bar.addEventListener("pointerup", (e) => {
      if (!drag) return;
      drag = null;
      bar.releasePointerCapture(e.pointerId);
      this.saveGeo();
    });

    // redimensionar (CSS resize) -> guarda o tamanho
    let t;
    this.ro = new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => this.saveGeo(), 400); });
    this.ro.observe(el);

    this.binding = new SheetBinding(p, this.file, body);
    const ok = await this.binding.load();
    if (!ok) { this.close(); return; }
    this.titleEl.setText(this.binding.data.name || this.file.basename);

    // exclui/renomeia: fecha a janela se o arquivo sumir
    this.delRef = p.app.vault.on("delete", (f) => { if (f.path === this.file.path) this.close(); });
  }

  saveGeo() {
    if (!this.el || this.el.hasClass("min")) return;
    this.plugin.geo[this.file.path] = {
      x: this.el.offsetLeft, y: this.el.offsetTop,
      w: this.el.offsetWidth, h: this.el.offsetHeight,
    };
    this.plugin.saveData(this.plugin.data);
  }

  bringToFront() {
    this.el.removeClass("min");
    this.el.style.zIndex = String(++this.plugin.z);
  }

  close() {
    if (this.binding) this.binding.destroy();
    if (this.ro) this.ro.disconnect();
    if (this.delRef) this.plugin.app.vault.offref(this.delRef);
    if (this.el) this.el.remove();
    this.plugin.floating.delete(this.file.path);
  }
}

class DndSettingTab extends PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    const mv = this.plugin.manifest && this.plugin.manifest.version;
    containerEl.createEl("p", {
      text: `Código (main.js): v${BUILD_VERSION} · manifest.json: v${mv || "?"} · formato da ficha de jogador: ${SCHEMA_VERSION} · de criatura: ${CREATURE_SCHEMA_VERSION}`,
      cls: "setting-item-description",
    });
    if (mv && mv !== BUILD_VERSION) {
      containerEl.createEl("p", { text: "⚠ O manifest.json e o main.js são de versões diferentes. Reinstale os arquivos do plugin e reinicie o Obsidian.", cls: "mod-warning" });
    }
    const bankInfo = containerEl.createEl("p", { text: "Banco de magias: verificando...", cls: "setting-item-description" });
    getSrdSpells(this.app)
      .then((list) => bankInfo.setText(`Banco de magias: ${list.length} magias carregadas do banco interno.`))
      .catch((e) => { bankInfo.setText(`⚠ Banco de magias indisponível: ${e.message}`); bankInfo.addClass("mod-warning"); });
    new Setting(containerEl)
      .setName("Atualizar fichas")
      .setDesc("Atualizar todas completa as fichas antigas com os campos novos (os dados são preservados). Recarregar abertas reabre as abas de ficha com o código atual do plugin.")
      .addButton((b) => b.setButtonText("Atualizar todas as fichas").onClick(() => this.plugin.updateAllSheets()))
      .addButton((b) => b.setButtonText("Recarregar abertas").onClick(async () => {
        const n = await this.plugin.refreshOpenSheets(true);
        new Notice(`${n} aba(s) de ficha recarregada(s).`);
      }));
    new Setting(containerEl)
      .setName("Abrir a ficha em janela ao abrir uma nota-ficha")
      .setDesc("Quando o Atlas VTT (ou um link) abrir uma nota com `dnd-sheet` no frontmatter, mostra a janela flutuante da ficha em vez da nota. Desligue para voltar a abrir a nota normalmente (o explorador de arquivos sempre abre a nota).")
      .addToggle((t) => t.setValue(this.plugin.data.intercept).onChange(async (v) => {
        this.plugin.data.intercept = v;
        await this.plugin.persist();
      }));
  }
}

class InsertSheetModal extends Modal {
  constructor(app, onDone) { super(app); this.onDone = onDone; }

  onOpen() { this.stepType(); }

  stepType() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "Inserir ficha de D&D" });
    contentEl.createEl("p", { text: "Que tipo de ficha?" });
    const row = contentEl.createDiv({ cls: "dnd-pick" });
    row.createEl("button", { text: "🧙 Jogador", cls: "mod-cta" })
      .addEventListener("click", () => this.stepName("player"));
    row.createEl("button", { text: "👹 Monstro", cls: "mod-cta" })
      .addEventListener("click", () => this.stepName("monster"));
  }

  stepName(kind) {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: kind === "player" ? "Ficha de jogador" : "Ficha de monstro" });
    contentEl.createEl("p", { text: "Nome (vira o nome do arquivo e da ficha):" });
    const input = contentEl.createEl("input", { type: "text" });
    input.style.width = "100%";
    input.placeholder = kind === "player" ? "Nome do personagem" : "Nome da criatura";
    const go = () => {
      const v = input.value.trim();
      if (!v) { new Notice("Digite um nome."); return; }
      this.close();
      this.onDone(kind, v);
    };
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    const row = contentEl.createDiv({ cls: "dnd-pick" });
    row.createEl("button", { text: "Voltar" }).addEventListener("click", () => this.stepType());
    row.createEl("button", { text: "Criar e inserir", cls: "mod-cta" }).addEventListener("click", go);
    input.focus();
  }

  onClose() { this.contentEl.empty(); }
}

class ConfirmModal extends Modal {
  constructor(app, text, onYes) { super(app); this.text = text; this.onYes = onYes; }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("p", { text: this.text });
    const row = contentEl.createDiv({ cls: "dnd-pick" });
    row.createEl("button", { text: "Cancelar" }).addEventListener("click", () => this.close());
    row.createEl("button", { text: "Atualizar", cls: "mod-cta" }).addEventListener("click", () => { this.close(); this.onYes(); });
  }
  onClose() { this.contentEl.empty(); }
}

// ---------------------------------------------------------------------
// Banco de magias do SRD 5.1 e a janela "Adicionar magia".
// Os 319 registros estão incorporados ao main.js para permitir instalação
// oficial do plugin com apenas manifest.json, main.js e styles.css.
// Fonte: SRD 5.1 (CC BY 4.0, Wizards of the Coast); tradução em português.
// ---------------------------------------------------------------------
async function getSrdSpells() {
  if (!SRD_SPELLS || SRD_SPELLS.format !== 1 || !Array.isArray(SRD_SPELLS.spells)) {
    throw new Error("o banco interno de magias está em um formato desconhecido");
  }
  return SRD_SPELLS.spells;
}
const srdLevelLabel = (n) => (n === 0 ? "Truque" : `${n}º círculo`);
const srdPlain = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const SRD_SCHOOLS = ["Abjuração", "Adivinhação", "Conjuração", "Encantamento", "Evocação", "Ilusão", "Necromancia", "Transmutação"];

function spellFromSrd(e) {
  const sp = newSpell();
  Object.assign(sp, {
    name: e.n, level: e.l, school: e.s, castTime: e.t, range: e.r, components: e.k, duration: e.d,
    concentration: !!e.cc, ritual: !!e.rt, text: e.x, higher: e.h || "",
  });
  return sp;
}

class AddSpellModal extends Modal {
  constructor(app, have, onAdd, onBlank) {
    super(app);
    this.have = have; this.onAdd = onAdd; this.onBlank = onBlank;
    this.tab = "bank"; this.q = ""; this.lv = "all"; this.sc = "all"; this.limit = 60; this.expandedRows = new Set();
  }

  onOpen() {
    this.modalEl.addClass("dnd-addspell");
    this.spells = null;
    this.error = "";
    this.draw();
    getSrdSpells(this.app)
      .then((list) => { this.spells = list; if (this.tab === "bank") this.draw(); })
      .catch((e) => {
        console.error("[dnd-sheet] banco de magias:", e);
        this.error = e.message;
        if (this.tab === "bank") this.draw();
      });
  }
  onClose() { this.contentEl.empty(); }

  draw() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "Adicionar magia" });
    const tabs = contentEl.createDiv({ cls: "dnd-tabs" });
    [["bank", "Magias existentes"], ["new", "Criar magia"]].forEach(([k, label]) => {
      const b = tabs.createEl("button", { text: label });
      b.toggleClass("active", this.tab === k);
      b.addEventListener("click", () => { this.tab = k; this.draw(); });
    });
    if (this.tab === "new") this.drawNew(contentEl); else this.drawBank(contentEl);
  }

  drawNew(el) {
    el.createEl("p", { text: "Cria um bloco de magia em branco na ficha, para você preencher todos os campos." });
    el.createEl("button", { text: "Criar bloco em branco", cls: "mod-cta" })
      .addEventListener("click", () => { this.close(); this.onBlank(); });
  }

  drawBank(el) {
    if (this.error) {
      el.createDiv({ cls: "dnd-error", text: `Não consegui carregar o banco interno de magias (${this.error}). A aba "Criar magia" continua funcionando.` });
      return;
    }
    if (!this.spells) { el.createDiv({ cls: "dnd-hint", text: "Carregando magias..." }); return; }
    const spells = this.spells;
    const bar = el.createDiv({ cls: "dnd-srd-filters" });
    const q = bar.createEl("input", { type: "text", attr: { placeholder: "Buscar pelo nome..." } });
    q.value = this.q;
    const lv = bar.createEl("select");
    lv.createEl("option", { value: "all", text: "Todos os círculos" });
    for (let i = 0; i <= 9; i++) lv.createEl("option", { value: String(i), text: srdLevelLabel(i) });
    lv.value = this.lv;
    const sc = bar.createEl("select");
    sc.createEl("option", { value: "all", text: "Todas as escolas" });
    SRD_SCHOOLS.forEach((x) => sc.createEl("option", { value: x, text: x }));
    sc.value = this.sc;
    const list = el.createDiv({ cls: "dnd-srd-list" });
    const info = el.createDiv({ cls: "dnd-hint" });
    const foot = el.createDiv({ cls: "dnd-hint" });
    foot.setText("Magias do SRD 5.1 (Wizards of the Coast), licença CC BY 4.0. Tradução para o português feita por terceiros.");

    const render = () => {
      list.empty();
      const term = srdPlain(this.q.trim());
      const res = spells.filter((s) =>
        (this.lv === "all" || s.l === Number(this.lv)) &&
        (this.sc === "all" || s.s === this.sc) &&
        (!term || srdPlain(s.n).includes(term)));
      res.slice(0, this.limit).forEach((s) => this.row(list, s, render));
      if (res.length > this.limit) {
        list.createEl("button", { text: `Mostrar mais (${res.length - this.limit} restantes)` })
          .addEventListener("click", () => { this.limit += 60; render(); });
      }
      if (!res.length) list.createDiv({ cls: "dnd-hint", text: "Nenhuma magia encontrada com esses filtros." });
      info.setText(`${res.length} de ${spells.length} magias.`);
    };
    q.addEventListener("input", () => { this.q = q.value; this.limit = 60; render(); });
    lv.addEventListener("change", () => { this.lv = lv.value; this.limit = 60; render(); });
    sc.addEventListener("change", () => { this.sc = sc.value; this.limit = 60; render(); });
    render();
  }

  row(list, s, render) {
    const row = list.createDiv({ cls: "dnd-srd-row" });
    const head = row.createDiv({ cls: "dnd-srd-head" });
    const open = this.expandedRows.has(s.n);
    head.createEl("button", { cls: "dnd-srd-title", text: `${open ? "▾" : "▸"} ${s.n}` })
      .addEventListener("click", () => { if (open) this.expandedRows.delete(s.n); else this.expandedRows.add(s.n); render(); });
    head.createSpan({ cls: "dnd-srd-meta", text: `${srdLevelLabel(s.l)} · ${s.s}${s.cc ? " · C" : ""}${s.rt ? " · R" : ""}` });
    const have = this.have.has(s.n.toLowerCase());
    const add = head.createEl("button", { text: have ? "✓ Na ficha" : "Adicionar", cls: have ? "" : "mod-cta" });
    add.disabled = have;
    add.addEventListener("click", () => {
      this.onAdd(s);
      this.have.add(s.n.toLowerCase());
      add.setText("✓ Na ficha");
      add.removeClass("mod-cta");
      add.disabled = true;
      new Notice(`Adicionada: ${s.n}`);
    });
    if (!open) return;
    const body = row.createDiv({ cls: "dnd-srd-body" });
    body.createDiv({ cls: "dnd-srd-meta", text: `Classes: ${s.c.join(", ") || "—"}` });
    [["Tempo de conjuração", s.t], ["Alcance", s.r], ["Componentes", s.k], ["Duração", s.d]].forEach(([l, v]) => {
      if (!v) return;
      const p = body.createDiv();
      p.createEl("strong", { text: l + ": " });
      p.appendChild(document.createTextNode(String(v)));
    });
    String(s.x).split("\n").forEach((par) => body.createDiv({ cls: "dnd-srd-text", text: par }));
    if (s.h) {
      const p = body.createDiv({ cls: "dnd-srd-text" });
      p.createEl("strong").createEl("em", { text: "Em níveis superiores. " });
      p.appendChild(document.createTextNode(s.h));
    }
  }
}

// =====================================================================
// RECURSOS DE CLASSE (formato 5) e MODELOS DE RECURSOS (arquivos .dndresources)
// Definição (ficha.resources) e estado atual (ficha.resourceState) ficam separados: editar a definição
// ou sincronizar com um modelo nunca mexe nos valores atuais.
//   definição: id, name, desc, kind, icon, max, initial, die, recover{on,amount,note}, durationRounds,
//              endNote, source{type,label}, notes, pinned, tpl{file,key,orphan}, ov[] (campos editados pelo jogador)
//   estado:    cur (quantidade), active, left (rodadas restantes), running
// =====================================================================
const RES_EXT = "dndresources";
const RES_VIEW = "dnd-resources-view";
const RES_KINDS = [["points", "Pontos"], ["uses", "Usos"], ["dice", "Dados"], ["toggle", "Ativação"], ["duration", "Duração"], ["markers", "Marcadores"]];
const RES_DICE = ["d4", "d6", "d8", "d10", "d12", "d20"];
const RES_RECOVER = [["short", "Descanso curto"], ["long", "Descanso longo"], ["turn", "Início do turno"], ["manual", "Recuperação manual"], ["custom", "Outra condição"]];
const RES_SOURCES = [["class", "Classe"], ["subclass", "Subclasse"], ["ability", "Habilidade"], ["custom", "Personalizado"]];
const RES_ICONS = ["✨", "🔥", "🛡️", "⚔️", "🌀", "💧", "🌿", "🐺", "🎲", "⚡", "🕯️", "📿", "🗡️", "🏹", "🔮", "❤️"];
const RES_SYNC_FIELDS = ["name", "desc", "kind", "icon", "max", "initial", "die", "recover", "durationRounds", "endNote", "source", "notes"];
const resLabel = (list, key) => (list.find(([k]) => k === key) || [key, key])[1];
const resInt = (v, def, min = 0) => { const n = Number(v); return Math.max(min, Math.floor(isFinite(n) ? n : def)); };
const resCounted = (def) => def.kind === "points" || def.kind === "uses" || def.kind === "dice";

const RES_DEFAULTS = () => ({
  id: "", name: "", desc: "", kind: "points", icon: "✨", max: 1, initial: 1, die: "d6",
  recover: { on: "long", amount: "all", note: "" }, durationRounds: 0, endNote: "",
  source: { type: "custom", label: "" }, notes: "", tpl: null, ov: [],
});

function newResource(kind = "points") {
  const r = RES_DEFAULTS();
  r.id = uid(); r.kind = kind; r.pinned = true;
  if (kind === "markers") { r.max = null; r.initial = 0; r.recover.on = "manual"; }
  if (kind === "toggle" || kind === "duration") { r.max = 0; r.initial = 0; r.recover.on = "manual"; }
  if (kind === "duration") r.durationRounds = 10;
  return r;
}

// Garante que qualquer objeto vire uma definição válida, preservando campos desconhecidos e o ★ (pinned).
function cleanResource(x) {
  const src = isObj(x) ? x : {};
  const r = Object.assign(RES_DEFAULTS(), src);
  r.id = String(src.id || uid());
  r.name = String(r.name == null ? "" : r.name);
  r.desc = String(r.desc == null ? "" : r.desc);
  r.icon = String(r.icon || "✨");
  r.endNote = String(r.endNote == null ? "" : r.endNote);
  r.notes = String(r.notes == null ? "" : r.notes);
  if (!RES_KINDS.some(([k]) => k === r.kind)) r.kind = "points";
  const noMax = r.max === null || r.max === undefined || r.max === "";
  r.max = r.kind === "markers" && noMax ? null : resInt(r.max, 1);
  r.initial = Math.min(r.max === null ? Infinity : r.max, resInt(r.initial, r.max === null ? 0 : r.max));
  if (!RES_DICE.includes(r.die)) r.die = "d6";
  const rc = isObj(r.recover) ? r.recover : {};
  r.recover = {
    on: RES_RECOVER.some(([k]) => k === rc.on) ? rc.on : "long",
    amount: rc.amount === undefined || rc.amount === "all" || rc.amount === null ? "all" : resInt(rc.amount, 1, 1),
    note: String(rc.note == null ? "" : rc.note),
  };
  r.durationRounds = resInt(r.durationRounds, 0);
  const sc = isObj(r.source) ? r.source : {};
  r.source = { type: RES_SOURCES.some(([k]) => k === sc.type) ? sc.type : "custom", label: String(sc.label == null ? "" : sc.label) };
  r.tpl = isObj(r.tpl) && r.tpl.file && r.tpl.key
    ? Object.assign({ file: String(r.tpl.file), key: String(r.tpl.key) }, r.tpl.orphan ? { orphan: true } : {})
    : null;
  r.ov = Array.isArray(r.ov) ? r.ov.filter((f) => RES_SYNC_FIELDS.includes(f)) : [];
  return r;
}

function resInitState(def) {
  return { cur: def.kind === "markers" || resCounted(def) ? def.initial : 0, active: false, left: 0, running: false };
}
function cleanResState(st, def) {
  const base = resInitState(def);
  const s = Object.assign(base, isObj(st) ? st : {});
  s.cur = resInt(s.cur, base.cur);
  s.active = !!s.active;
  s.left = resInt(s.left, 0);
  s.running = !!s.running;
  return s;
}
const resCap = (def) => (def.max === null ? Infinity : def.max);
function resCur(d, def) { const st = d.resourceState[def.id]; return Math.min(st ? st.cur : 0, resCap(def)); }

function resSpend(d, def, n = 1) {
  const st = d.resourceState[def.id]; const cur = resCur(d, def); const used = Math.min(cur, n);
  st.cur = cur - used; return used;
}
function resRecover(d, def, n = 1) {
  const st = d.resourceState[def.id]; const cur = resCur(d, def); const nv = Math.min(resCap(def), cur + n);
  st.cur = nv; return nv - cur;
}
function resSetActive(d, def, on) {
  const st = d.resourceState[def.id];
  if (!on) { st.active = false; st.left = 0; st.running = false; return; }
  st.active = true;
  if (def.durationRounds > 0) { st.left = def.durationRounds; st.running = true; } else { st.left = 0; st.running = false; }
}
function resDuration(d, def, action) {
  const st = d.resourceState[def.id];
  if (action === "start") { st.left = Math.max(1, def.durationRounds); st.running = true; st.active = true; }
  else if (action === "pause") st.running = false;
  else if (action === "resume") { if (st.left > 0) st.running = true; }
  else if (action === "plus") { st.left += 1; st.active = true; }
  else if (action === "minus") { st.left = Math.max(0, st.left - 1); if (st.left === 0) { st.running = false; st.active = false; } }
  else if (action === "end") { st.left = 0; st.running = false; st.active = false; }
}

// Aplica a regra de recuperação do recurso. Devolve true se algo mudou.
function resRecoverRule(d, def) {
  const st = d.resourceState[def.id]; const before = JSON.stringify(st);
  if (resCounted(def)) st.cur = def.recover.amount === "all" ? def.max : Math.min(def.max, resCur(d, def) + def.recover.amount);
  else if (def.kind === "markers") st.cur = def.initial;
  else { st.active = false; st.left = 0; st.running = false; }
  return JSON.stringify(st) !== before;
}
// Descanso curto recupera os recursos de descanso curto; o longo recupera os de descanso curto e de descanso longo.
function resRest(d, kind) {
  const names = [];
  d.resources.forEach((def) => {
    if (!(def.recover.on === "short" || (kind === "long" && def.recover.on === "long"))) return;
    if (resRecoverRule(d, def)) names.push(def.name || "Recurso");
  });
  return names;
}
function resAdvanceTurn(d) {
  const rep = { ticked: [], ended: [], recovered: [] };
  d.resources.forEach((def) => {
    const st = d.resourceState[def.id]; if (!st) return;
    if ((def.kind === "toggle" || def.kind === "duration") && st.running && st.left > 0) {
      st.left -= 1; rep.ticked.push(def.name || "Recurso");
      if (st.left <= 0) { st.left = 0; st.running = false; st.active = false; rep.ended.push(def); }
    }
    if (def.recover.on === "turn" && resRecoverRule(d, def)) rep.recovered.push(def.name || "Recurso");
  });
  return rep;
}

function resAdd(d, def) {
  d.resources.push(def);
  d.resourceState[def.id] = resInitState(def);
  if (def.tpl) { const k = `${def.tpl.file}::${def.tpl.key}`; d.resourceDismissed = d.resourceDismissed.filter((x) => x !== k); }
}
function resDelete(d, id) {
  const i = d.resources.findIndex((r) => r.id === id);
  if (i < 0) return;
  const def = d.resources[i];
  d.resources.splice(i, 1);
  delete d.resourceState[id];
  if (def.tpl) { const k = `${def.tpl.file}::${def.tpl.key}`; if (!d.resourceDismissed.includes(k)) d.resourceDismissed.push(k); }
}
// nd = definição já limpa. Em recurso vindo de modelo, os campos editados viram "edição pessoal" (ov).
function resEdit(d, id, nd) {
  const r = d.resources.find((x) => x.id === id);
  if (!r) return;
  const changed = RES_SYNC_FIELDS.filter((f) => JSON.stringify(r[f]) !== JSON.stringify(nd[f]));
  RES_SYNC_FIELDS.forEach((f) => { r[f] = JSON.parse(JSON.stringify(nd[f])); });
  if (r.tpl) changed.forEach((f) => { if (!r.ov.includes(f)) r.ov.push(f); });
  d.resourceState[id] = cleanResState(d.resourceState[id], r);   // o estado atual é mantido
}

// ---------- modelos ----------
function defaultTemplate(name = "") { return { format: 1, kind: "dnd-resource-template", name, resources: [] }; }
function parseTemplate(text) {
  try {
    const o = text && text.trim() ? JSON.parse(text) : {};
    if (!isObj(o) || (o.format !== undefined && o.format !== 1)) return null;
    const t = defaultTemplate(String(o.name == null ? "" : o.name));
    const seen = new Set();
    t.resources = (Array.isArray(o.resources) ? o.resources : []).filter(isObj).map((x) => {
      const r = cleanResource(x);
      if (seen.has(r.id)) r.id = uid();
      seen.add(r.id);
      r.tpl = null; r.ov = []; delete r.pinned;
      return r;
    });
    return t;
  } catch (e) { return null; }
}
function resAddFromTemplate(d, t, file) {
  const def = cleanResource(Object.assign(JSON.parse(JSON.stringify(t)), { id: uid(), tpl: { file, key: t.id }, ov: [], pinned: true }));
  resAdd(d, def);
  return def;
}
// Aplicar: acrescenta os recursos do modelo que a ficha ainda não tem (inclusive os que o jogador tinha excluído).
function resApplyTemplate(d, tpl, file) {
  const rep = { added: 0, skipped: 0 };
  tpl.resources.forEach((t) => {
    if (d.resources.some((r) => r.tpl && r.tpl.file === file && r.tpl.key === t.id)) { rep.skipped++; return; }
    resAddFromTemplate(d, t, file); rep.added++;
  });
  return rep;
}
// Sincronizar: atualiza as definições vindas do modelo, preservando (1) os valores atuais, (2) os campos que o
// jogador editou e (3) os recursos que ele excluiu. Recursos que saíram do modelo ficam na ficha, marcados.
function resSyncTemplate(d, tpl, file) {
  const rep = { added: 0, updated: 0, orphans: 0, kept: 0 };
  const keys = new Set(tpl.resources.map((t) => t.id));
  tpl.resources.forEach((t) => {
    const r = d.resources.find((x) => x.tpl && x.tpl.file === file && x.tpl.key === t.id);
    if (!r) {
      if (d.resourceDismissed.includes(`${file}::${t.id}`)) return;
      resAddFromTemplate(d, t, file); rep.added++; return;
    }
    delete r.tpl.orphan;
    let changed = false;
    RES_SYNC_FIELDS.forEach((f) => {
      const differs = JSON.stringify(r[f]) !== JSON.stringify(t[f]);
      if (r.ov.includes(f)) { if (differs) rep.kept++; return; }
      if (differs) { r[f] = JSON.parse(JSON.stringify(t[f])); changed = true; }
    });
    if (changed) rep.updated++;
    d.resourceState[r.id] = cleanResState(d.resourceState[r.id], r);
  });
  d.resources.forEach((r) => {
    if (r.tpl && r.tpl.file === file && !keys.has(r.tpl.key)) { r.tpl.orphan = true; rep.orphans++; }
  });
  return rep;
}

// ---------- janela de edição de um recurso (ficha ou modelo) ----------
class ResourceEditorModal extends Modal {
  constructor(app, def, opts) {
    super(app);
    this.orig = def;
    this.opts = opts || {};
    this.w = JSON.parse(JSON.stringify(def || newResource("points")));
    this.touchedInitial = !!def;
    this.confirmDelete = false;
  }

  onOpen() { this.modalEl.addClass("dnd-res-editor"); this.draw(); }
  onClose() { this.contentEl.empty(); }

  draw() {
    const { contentEl } = this;
    const w = this.w;
    contentEl.empty();
    contentEl.createEl("h3", { text: this.orig ? "Editar recurso" : "Novo recurso" });
    if (this.opts.isTemplate) contentEl.createDiv({ cls: "dnd-hint", text: "Recurso do modelo: as fichas que usam este modelo recebem as mudanças quando você sincronizar." });
    if (this.orig && this.orig.tpl) {
      const box = contentEl.createDiv({ cls: "dnd-hint" });
      box.setText(`Vindo do modelo "${this.orig.tpl.file.split("/").pop()}". Campos que você alterar aqui viram edição pessoal e não são sobrescritos ao sincronizar.`);
      if (this.opts.onReset) {
        contentEl.createEl("button", { text: "Voltar ao modelo" }).addEventListener("click", () => { this.close(); this.opts.onReset(); });
      }
    }
    const field = (label, build) => { const wrap = contentEl.createDiv({ cls: "dnd-field" }); wrap.createEl("label", { text: label }); return build(wrap); };
    const text = (label, key, ph) => field(label, (wrap) => {
      const i = wrap.createEl("input", { type: "text", attr: { "data-f": key, placeholder: ph || "" } });
      i.value = w[key] == null ? "" : String(w[key]);
      i.addEventListener("input", () => { w[key] = i.value; });
      return i;
    });
    const area = (label, key) => field(label, (wrap) => {
      const t = wrap.createEl("textarea", { attr: { "data-f": key } });
      t.rows = 3; t.value = w[key] || "";
      t.addEventListener("input", () => { w[key] = t.value; });
      return t;
    });
    const select = (label, fkey, options, value, onChange) => field(label, (wrap) => {
      const s = wrap.createEl("select", { attr: { "data-f": fkey } });
      options.forEach(([k, l]) => s.createEl("option", { value: k, text: l }));
      s.value = value;
      s.addEventListener("change", () => onChange(s.value));
      return s;
    });
    const num = (label, key, o = {}) => field(label, (wrap) => {
      const i = wrap.createEl("input", { type: "number", attr: { "data-f": key, min: String(o.min == null ? 0 : o.min) } });
      i.value = w[key] === null || w[key] === undefined ? "" : String(w[key]);
      i.addEventListener("input", () => {
        w[key] = i.value === "" && o.nullable ? null : (Number(i.value) || 0);
        if (key === "initial") this.touchedInitial = true;
        if (key === "max" && !this.touchedInitial && this.initialInput) {
          w.initial = w.max === null ? 0 : w.max;
          this.initialInput.value = String(w.initial);
        }
      });
      if (key === "initial") this.initialInput = i;
      return i;
    });

    text("Nome", "name", "Pontos de Ki");
    field("Ícone", (wrap) => {
      const i = wrap.createEl("input", { type: "text", attr: { "data-f": "icon" } });
      i.value = w.icon || "";
      i.addEventListener("input", () => { w.icon = i.value; });
      const pal = wrap.createDiv({ cls: "dnd-res-palette" });
      RES_ICONS.forEach((ic) => pal.createEl("button", { text: ic, attr: { "data-icon": ic } }).addEventListener("click", () => { w.icon = ic; i.value = ic; }));
    });
    select("Categoria", "kind", RES_KINDS, w.kind, (v) => {
      w.kind = v;
      if (v === "duration" && !(w.durationRounds >= 1)) w.durationRounds = 10;
      if (v === "markers" && w.max === 1 && !this.orig) { w.max = null; w.initial = 0; }
      this.draw();
    });
    select("Origem", "srcType", RES_SOURCES, w.source.type, (v) => { w.source.type = v; });
    field("Nome da classe, subclasse ou habilidade", (wrap) => {
      const i = wrap.createEl("input", { type: "text", attr: { "data-f": "srcLabel", placeholder: "Monge, Mestre de Batalha, classe homebrew..." } });
      i.value = w.source.label || "";
      i.addEventListener("input", () => { w.source.label = i.value; });
    });
    area("Descrição", "desc");

    this.initialInput = null;
    if (w.kind === "points") { num("Quantidade máxima", "max"); num("Quantidade inicial", "initial"); }
    if (w.kind === "uses") { num("Máximo de usos", "max"); num("Usos disponíveis no início", "initial"); }
    if (w.kind === "dice") {
      num("Quantidade máxima de dados", "max"); num("Dados disponíveis no início", "initial");
      select("Tipo de dado", "die", RES_DICE.map((x) => [x, x]), w.die, (v) => { w.die = v; });
    }
    if (w.kind === "toggle") { num("Duração em rodadas (0 = sem duração)", "durationRounds"); text("Condição de encerramento", "endNote", "Termina se você ficar inconsciente"); }
    if (w.kind === "duration") { num("Duração em rodadas", "durationRounds", { min: 1 }); text("Condição de encerramento", "endNote"); }
    if (w.kind === "markers") { num("Máximo (vazio = sem limite)", "max", { nullable: true }); num("Quantidade inicial", "initial"); }

    select("Recuperação", "recOn", RES_RECOVER, w.recover.on, (v) => { w.recover.on = v; this.draw(); });
    if (resCounted(w) && ["short", "long", "turn"].includes(w.recover.on)) {
      field("Quantidade recuperada por vez (vazio = tudo)", (wrap) => {
        const i = wrap.createEl("input", { type: "number", attr: { "data-f": "recAmt", min: "1" } });
        i.value = w.recover.amount === "all" ? "" : String(w.recover.amount);
        i.addEventListener("input", () => { w.recover.amount = i.value === "" ? "all" : Math.max(1, Math.floor(Number(i.value)) || 1); });
      });
    }
    if (w.recover.on === "custom") {
      field("Condição de recuperação", (wrap) => {
        const t = wrap.createEl("textarea", { attr: { "data-f": "recNote" } });
        t.rows = 2; t.value = w.recover.note || "";
        t.addEventListener("input", () => { w.recover.note = t.value; });
      });
    }
    area("Observações", "notes");

    const row = contentEl.createDiv({ cls: "dnd-pick" });
    if (this.orig && this.opts.onDelete) {
      const del = row.createEl("button", { text: "Excluir", cls: "dnd-spell-del", attr: { "data-act": "delete" } });
      del.addEventListener("click", () => {
        if (!this.confirmDelete) { this.confirmDelete = true; del.setText("Confirmar exclusão"); return; }
        this.close(); this.opts.onDelete();
      });
    }
    row.createEl("button", { text: "Cancelar", attr: { "data-act": "cancel" } }).addEventListener("click", () => this.close());
    row.createEl("button", { text: "Salvar", cls: "mod-cta", attr: { "data-act": "save" } }).addEventListener("click", () => {
      if (!String(w.name).trim()) { new Notice("Dê um nome ao recurso."); return; }
      if (w.kind === "duration" && !(Number(w.durationRounds) >= 1)) { new Notice("Informe a duração em rodadas (mínimo 1)."); return; }
      const clean = cleanResource(w);
      this.close();
      this.opts.onSave(clean);
    });
  }
}

class TemplatePicker extends FuzzySuggestModal {
  constructor(app, onChoose) { super(app); this.onChoose = onChoose; this.setPlaceholder("Escolha um modelo de recursos"); }
  getItems() { return this.app.vault.getFiles().filter((f) => f.extension === RES_EXT); }
  getItemText(f) { return f.path; }
  onChooseItem(f) { this.onChoose(f); }
}

// Editor do arquivo de modelo (.dndresources)
class ResourceTemplateView extends TextFileView {
  constructor(leaf) { super(leaf); this.data_ = defaultTemplate(""); }
  getViewType() { return RES_VIEW; }
  getDisplayText() { return this.file ? this.file.basename : "Modelo de recursos"; }
  getIcon() { return "layers"; }
  getViewData() { return JSON.stringify(this.data_, null, 2); }
  clear() { this.data_ = defaultTemplate(""); }

  setViewData(text) {
    const p = parseTemplate(text);
    if (!p) new Notice("Modelo de recursos: arquivo inválido, usando modelo vazio.");
    this.data_ = p || defaultTemplate("");
    this.render();
  }

  render() {
    const root = this.contentEl; const t = this.data_;
    root.empty();
    root.addClass("dnd-sheet");
    root.createEl("h3", { text: "Modelo de recursos" });
    const nm = root.createDiv({ cls: "dnd-field" });
    nm.createEl("label", { text: "Nome do modelo" });
    const ni = nm.createEl("input", { type: "text", attr: { "data-f": "tplname" } });
    ni.value = t.name;
    ni.addEventListener("input", () => { t.name = ni.value; this.requestSave(); });
    root.createDiv({ cls: "dnd-hint", text: 'Aplique este modelo a uma ficha pelo botão "Aplicar modelo" (seção Recursos de Classe). Depois de editar o modelo, use "Atualizar dos modelos" na ficha: os valores atuais e as edições pessoais são preservados.' });
    const list = root.createDiv({ cls: "dnd-tpl-list" });
    if (!t.resources.length) list.createDiv({ cls: "dnd-hint", text: "Nenhum recurso ainda. Clique em + Novo recurso." });
    t.resources.forEach((def, i) => {
      const row = list.createDiv({ cls: "dnd-tpl-row" });
      row.createSpan({ text: `${def.icon} ${def.name || "Sem nome"}`, cls: "dnd-tpl-name" });
      const info = [resLabel(RES_KINDS, def.kind), def.kind === "dice" ? def.die : "", def.max === null ? "sem limite" : (resCounted(def) ? `máx. ${def.max}` : ""), resLabel(RES_RECOVER, def.recover.on)].filter(Boolean).join(" · ");
      row.createSpan({ text: info, cls: "dnd-srd-meta" });
      const swap = (j) => { if (j < 0 || j >= t.resources.length) return; [t.resources[i], t.resources[j]] = [t.resources[j], t.resources[i]]; this.requestSave(); this.render(); };
      row.createEl("button", { text: "↑" }).addEventListener("click", () => swap(i - 1));
      row.createEl("button", { text: "↓" }).addEventListener("click", () => swap(i + 1));
      row.createEl("button", { text: "✎", attr: { title: "Editar" } }).addEventListener("click", () => {
        new ResourceEditorModal(this.app, def, {
          isTemplate: true,
          onSave: (nd) => { nd.tpl = null; nd.ov = []; delete nd.pinned; t.resources[i] = nd; this.requestSave(); this.render(); },
          onDelete: () => { t.resources.splice(i, 1); this.requestSave(); this.render(); },
        }).open();
      });
    });
    root.createEl("button", { text: "+ Novo recurso", cls: "mod-cta" }).addEventListener("click", () => {
      new ResourceEditorModal(this.app, null, {
        isTemplate: true,
        onSave: (nd) => { nd.tpl = null; nd.ov = []; delete nd.pinned; t.resources.push(nd); this.requestSave(); this.render(); },
      }).open();
    });
  }
}

class SheetPicker extends FuzzySuggestModal {
  constructor(app, onChoose) {
    super(app);
    this.onChoose = onChoose;
    this.setPlaceholder("Escolha uma ficha de D&D");
  }
  getItems() { return this.app.vault.getFiles().filter((f) => f.extension === EXT || f.extension === CEXT); }
  getItemText(f) { return f.path; }
  onChooseItem(f) { this.onChoose(f); }
}

// ---------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------
module.exports = class DndSheetPlugin extends Plugin {
  async onload() {
    PLUGIN_VERSION = BUILD_VERSION;
    const mv = this.manifest && this.manifest.version;
    if (mv && mv !== BUILD_VERSION) {
      console.warn(`[dnd-sheet] manifest.json (v${mv}) e main.js (v${BUILD_VERSION}) são de versões diferentes.`);
      new Notice(`Ficha de D&D: o manifest.json é da v${mv}, mas o main.js é da v${BUILD_VERSION}. Reinstale os arquivos do plugin e reinicie o Obsidian.`, 20000);
    }
    const saved = (await this.loadData()) || {};
    // versões 1.1/1.2 guardavam só a geometria na raiz; migra para { geo, intercept }
    const legacy = !("geo" in saved) && !("intercept" in saved);
    this.data = {
      intercept: true,
      geo: legacy ? saved : (saved.geo || {}),
      ...(legacy ? {} : { intercept: saved.intercept !== false }),
    };
    this.geo = this.data.geo;
    this.floating = new Map();
    this.z = 1000;

    this.addSettingTab(new DndSettingTab(this.app, this));
    this.patchOpenLinkText();

    // Item no menu do botão direito do editor de notas
    this.registerEvent(this.app.workspace.on("editor-menu", (menu, editor, view) => {
      menu.addItem((item) => item
        .setTitle("Inserir ficha de D&D")
        .setIcon("scroll")
        .onClick(() => this.insertSheetFromEditor(editor, view)));
    }));

    this.registerView(VIEW_TYPE, (leaf) => new DndSheetView(leaf));
    this.registerExtensions([EXT], VIEW_TYPE);
    this.registerView(CREATURE_VIEW, (leaf) => new CreatureView(leaf));
    this.registerExtensions([CEXT], CREATURE_VIEW);
    this.registerView(RES_VIEW, (leaf) => new ResourceTemplateView(leaf));
    this.registerExtensions([RES_EXT], RES_VIEW);

    this.addRibbonIcon("scroll", "Nova ficha de D&D", () => this.createSheet());

    this.addCommand({ id: "create-dnd-sheet", name: "Criar nova ficha de D&D", callback: () => this.createSheet() });
    this.addCommand({
      id: "update-all-sheets",
      name: "Migrar todas as fichas do vault para o formato atual",
      callback: () => this.updateAllSheets(),
    });
    this.addCommand({
      id: "reload-open-sheets",
      name: "Recarregar fichas abertas (aplicar o código novo)",
      callback: async () => {
        const n = await this.refreshOpenSheets(true);
        new Notice(`${n} aba(s) de ficha recarregada(s).`);
      },
    });
    // abas que ficaram abertas com o código de uma versão anterior são reabertas sozinhas
    const hot = !!this.app.workspace.layoutReady;   // plugin ativado com o Obsidian já aberto
    this.app.workspace.onLayoutReady(() => this.refreshOpenSheets(false, hot));

    this.addCommand({ id: "create-resource-template", name: "Criar modelo de recursos", callback: () => this.createResourceTemplate() });
    this.addCommand({ id: "create-sheet-from-template", name: "Criar ficha a partir de um modelo de recursos", callback: () => this.createSheetFromTemplate() });
    this.addCommand({
      id: "create-dnd-creature",
      name: "Criar nova ficha de criatura",
      callback: () => this.createSheet(CEXT, "Nova criatura", defaultCreature),
    });
    this.addCommand({
      id: "open-floating",
      name: "Abrir ficha em janela flutuante",
      callback: () => new SheetPicker(this.app, (f) => this.openFloating(f)).open(),
    });
    this.addCommand({
      id: "open-current-floating",
      name: "Abrir ficha atual em janela flutuante",
      checkCallback: (checking) => {
        const f = this.app.workspace.getActiveFile();
        if (!f || (f.extension !== EXT && f.extension !== CEXT)) return false;
        if (!checking) this.openFloating(f);
        return true;
      },
    });
    this.addCommand({
      id: "close-all-floating",
      name: "Fechar todas as janelas de ficha",
      callback: () => [...this.floating.values()].forEach((w) => w.close()),
    });

    // Integração com o Atlas VTT: ao clicar num pin de nota cuja nota tenha
    // `dnd-sheet: "[[Aragorn.dndsheet]]"` no frontmatter, abre a janela da ficha
    // em vez da nota. O Atlas dispara "atlas-pin-action" no window (detail: {action, pin}).
    // Usamos a fase de captura + stopImmediatePropagation para o Atlas não abrir
    // também a nota numa aba.
    this.registerDomEvent(window, "atlas-pin-action", (e) => {
      const { action, pin } = e.detail || {};
      if (action !== "open" || !pin || !pin.notePath) return;
      const sheet = this.sheetForNote(pin.notePath);
      if (!sheet) return;
      e.stopImmediatePropagation();
      this.openFloating(sheet);
    }, { capture: true });

    this.addCommand({
      id: "create-atlas-note",
      name: "Criar nota-ficha para o Atlas (aparece em Link Statblock)",
      callback: () => new SheetPicker(this.app, (f) => this.createAtlasNote(f)).open(),
    });

    // Link: obsidian://dnd-sheet?file=Fichas%2FAragorn.dndsheet
    this.registerObsidianProtocolHandler("dnd-sheet", (params) => {
      if (params.file) this.openFloating(params.file);
    });

    // Bloco de código para embutir a ficha em qualquer nota:
    // ```dnd-sheet
    // Fichas/Aragorn.dndsheet
    // ```
    this.registerMarkdownCodeBlockProcessor("dnd-sheet", async (source, el, ctx) => {
      const ref = source.trim().replace(/^file:\s*/i, "").replace(/^\[\[|\]\]$/g, "");
      const file = this.app.metadataCache.getFirstLinkpathDest(ref, ctx.sourcePath)
        || this.app.vault.getAbstractFileByPath(ref);
      if (!(file instanceof TFile)) {
        el.createDiv({ text: `Ficha não encontrada: ${ref}` });
        return;
      }
      const child = new MarkdownRenderChild(el);
      ctx.addChild(child);
      const binding = new SheetBinding(this, file, el.createDiv({ cls: "dnd-embed" }));
      child.onunload = () => binding.destroy();
      await binding.load();
    });
  }

  // Também pode ser chamado por outros plugins/scripts:
  // app.plugins.plugins["dnd-sheet"].openFloating("Fichas/Aragorn.dndsheet")
  async openFloating(fileOrPath) {
    const file = typeof fileOrPath === "string"
      ? this.app.vault.getAbstractFileByPath(fileOrPath)
      : fileOrPath;
    if (!(file instanceof TFile)) { new Notice("Ficha não encontrada: " + fileOrPath); return; }
    const existing = this.floating.get(file.path);
    if (existing) { existing.bringToFront(); return; }
    const w = new FloatingSheet(this, file);
    this.floating.set(file.path, w);
    await w.open();
  }

  persist() { return this.saveData(this.data); }

  // Reabre as abas de ficha com o código atual. Sem `force`, só as que estão rodando código antigo.
  async refreshOpenSheets(force = false, rerenderNotes = force) {
    const ws = this.app.workspace;
    let n = 0;
    for (const [type, cls] of [[VIEW_TYPE, DndSheetView], [CREATURE_VIEW, CreatureView]]) {
      for (const leaf of ws.getLeavesOfType(type)) {
        if (leaf.isDeferred) continue;
        if (!force && leaf.view instanceof cls) continue;
        try {
          const state = leaf.getViewState();
          await leaf.setViewState({ type: "empty" });
          await leaf.setViewState(state);
          n++;
        } catch (e) { console.error("[dnd-sheet] recarregar aba:", e); }
      }
    }
    // notas com blocos dnd-sheet em modo leitura: só redesenha quando há motivo (recarga forçada,
    // plugin ativado com o Obsidian já aberto ou abas antigas reabertas), não a cada inicialização
    if (force || rerenderNotes || n > 0) {
      ws.getLeavesOfType("markdown").forEach((leaf) => {
        try { if (leaf.view && leaf.view.previewMode && leaf.view.previewMode.rerender) leaf.view.previewMode.rerender(true); } catch (e) { /* ignora */ }
      });
    }
    return n;
  }

  // Completa e carimba todas as fichas .dndsheet/.dndcreature do vault
  updateAllSheets() {
    const files = this.app.vault.getFiles().filter((f) => f.extension === EXT || f.extension === CEXT);
    if (!files.length) { new Notice("Nenhuma ficha encontrada no vault."); return; }
    new ConfirmModal(this.app,
      `Migrar ${files.length} ficha(s) para o formato atual (jogador: ${SCHEMA_VERSION}, criatura: ${CREATURE_SCHEMA_VERSION})? Os dados são preservados; só completa e converte campos. Fichas que já estão atualizadas não são alteradas.`,
      async () => {
        let migrated = 0, adjusted = 0, same = 0, bad = 0, newer = 0;
        for (const f of files) {
          try {
            const creature = f.extension === CEXT;
            const text = await this.app.vault.read(f);
            if (!text.trim()) { same++; continue; }   // arquivo vazio: não mexe
            const data = parseByExt(f.extension, text);
            if (!data) { bad++; continue; }
            // formato mais novo que este plugin: não reescreve (evita estragar a estrutura)
            if (Number(data.schemaVersion) > (creature ? CREATURE_SCHEMA_VERSION : SCHEMA_VERSION)) { newer++; continue; }
            const mig = data.__migration;
            if (mig) stampSheet(data, creature);   // só carimba quando houve migração de formato
            const out = JSON.stringify(data, null, 2);
            if (out === text) same++;
            else { await this.app.vault.modify(f, out); if (mig) migrated++; else adjusted++; }
          } catch (e) { bad++; console.error("[dnd-sheet] migrar", f.path, e); }
        }
        await this.refreshOpenSheets();
        new Notice(`Migradas para o formato atual: ${migrated}. Só ajuste de campos: ${adjusted}. Já em dia (não alteradas): ${same}.${newer ? ` Mais novas que este plugin (formato preservado): ${newer}.` : ""}${bad ? ` Ignoradas (arquivo inválido): ${bad}.` : ""}`, 12000);
      }).open();
  }

  // O Atlas abre statblocks/notas linkadas com workspace.openLinkText.
  // Interceptamos só as notas com `dnd-sheet` no frontmatter e abrimos a janela da ficha.
  patchOpenLinkText() {
    const ws = this.app.workspace;
    const orig = ws.openLinkText;
    const plugin = this;
    let active = true;
    const wrapper = function (linktext, sourcePath) {
      try {
        if (active && plugin.data.intercept) {
          const target = linktext ? linktext : plugin.app.vault.getAbstractFileByPath(sourcePath || "");
          const sheet = target ? plugin.sheetForNote(target, sourcePath || "") : null;
          if (sheet) { plugin.openFloating(sheet); return Promise.resolve(); }
        }
      } catch (e) { console.error("[dnd-sheet] openLinkText:", e); }
      return orig.apply(this, arguments);
    };
    ws.openLinkText = wrapper;
    this.register(() => {
      active = false;
      if (ws.openLinkText === wrapper) ws.openLinkText = orig;
    });
  }

  // Dada a nota de um pin, devolve o arquivo .dndsheet indicado no frontmatter (ou null)
  sheetForNote(note, source = "") {
    if (typeof note === "string") {
      const clean = note.split("#")[0];
      note = this.app.vault.getAbstractFileByPath(clean)
        || this.app.metadataCache.getFirstLinkpathDest(clean, source);
    }
    if (!(note instanceof TFile) || note.extension !== "md") return null;
    const fm = this.app.metadataCache.getFileCache(note)?.frontmatter;
    const val = fm && fm["dnd-sheet"];
    if (!val || typeof val !== "string") return null;
    const link = val.replace(/^\[\[|\]\]$/g, "").split("|")[0];
    const file = this.app.metadataCache.getFirstLinkpathDest(link, note.path)
      || this.app.vault.getAbstractFileByPath(link);
    return file instanceof TFile && (file.extension === EXT || file.extension === CEXT) ? file : null;
  }

  // Cria "<ficha> (nota).md" ao lado da ficha, pronta para ser fixada num pin do Atlas
  async createAtlasNote(sheet) {
    const dir = sheet.parent && sheet.parent.path !== "/" ? sheet.parent.path + "/" : "";
    let path = `${dir}${sheet.basename} (nota).md`;
    let n = 1;
    while (this.app.vault.getAbstractFileByPath(path)) path = `${dir}${sheet.basename} (nota ${n++}).md`;
    // `statblock: true` faz o Atlas listar a nota em "Link Statblock" do token.
    const body = `---\nstatblock: true\nname: "${sheet.basename}"\ndnd-sheet: "[[${sheet.name}]]"\n---\n\`\`\`dnd-sheet\n${sheet.name}\n\`\`\`\n`;
    const file = await this.app.vault.create(path, body);
    new Notice(`Nota criada: ${file.path}. No Atlas: botão direito no token → Link Statblock.`, 9000);
  }

  insertSheetFromEditor(editor, view) {
    const note = view && view.file;
    new InsertSheetModal(this.app, async (kind, name) => {
      try {
        const monster = kind === "monster";
        const ext = monster ? CEXT : EXT;
        const dir = note && note.parent && note.parent.path !== "/" ? note.parent.path + "/" : "";
        const safe = name.replace(/[\\/:*?"<>|#^\[\]]/g, "").trim() || (monster ? "Nova criatura" : "Nova ficha");
        let path = `${dir}${safe}.${ext}`;
        let n = 1;
        while (this.app.vault.getAbstractFileByPath(path)) path = `${dir}${safe} ${n++}.${ext}`;
        const data = monster ? defaultCreature() : defaultData();
        data.name = name;
        const file = await this.app.vault.create(path, JSON.stringify(data, null, 2));
        const prefix = editor.getCursor().ch > 0 ? "\n" : "";
        editor.replaceSelection(`${prefix}\`\`\`dnd-sheet\n${file.path}\n\`\`\`\n`);
        new Notice(`Ficha criada: ${file.path}`);
      } catch (e) {
        console.error("[dnd-sheet] inserir ficha:", e);
        new Notice("Não consegui criar a ficha: " + e.message);
      }
    }).open();
  }

  async createResourceTemplate() {
    const folder = this.app.workspace.getActiveFile()?.parent?.path;
    const base = folder && folder !== "/" ? folder + "/" : "";
    let name = `${base}Novo modelo de recursos.${RES_EXT}`;
    let n = 1;
    while (this.app.vault.getAbstractFileByPath(name)) name = `${base}Novo modelo de recursos ${n++}.${RES_EXT}`;
    const file = await this.app.vault.create(name, JSON.stringify(defaultTemplate("Novo modelo"), null, 2));
    await this.app.workspace.getLeaf(true).openFile(file);
  }

  createSheetFromTemplate() {
    new TemplatePicker(this.app, async (tf) => {
      const tpl = parseTemplate(await this.app.vault.read(tf));
      if (!tpl) { new Notice("Modelo de recursos inválido."); return; }
      const data = defaultData();
      resApplyTemplate(data, tpl, tf.path);
      const folder = this.app.workspace.getActiveFile()?.parent?.path;
      const base = folder && folder !== "/" ? folder + "/" : "";
      const label = (tpl.name || tf.basename).replace(/[\\/:*?"<>|#^\[\]]/g, "").trim() || "modelo";
      let name = `${base}Nova ficha (${label}).${EXT}`;
      let n = 1;
      while (this.app.vault.getAbstractFileByPath(name)) name = `${base}Nova ficha (${label}) ${n++}.${EXT}`;
      const file = await this.app.vault.create(name, JSON.stringify(data, null, 2));
      await this.app.workspace.getLeaf(true).openFile(file);
    }).open();
  }

  async createSheet(ext = EXT, label = "Nova ficha", factory = defaultData) {
    const folder = this.app.workspace.getActiveFile()?.parent?.path;
    const base = folder && folder !== "/" ? folder + "/" : "";
    let name = `${base}${label}.${ext}`;
    let n = 1;
    while (this.app.vault.getAbstractFileByPath(name)) name = `${base}${label} ${n++}.${ext}`;
    const file = await this.app.vault.create(name, JSON.stringify(factory(), null, 2));
    await this.app.workspace.getLeaf(true).openFile(file);
  }

  onunload() {
    [...this.floating.values()].forEach((w) => w.close());
  }
};
