const {
  Plugin, TextFileView, Notice, FuzzySuggestModal, MarkdownRenderChild, TFile,
  PluginSettingTab, Setting, Modal, Menu,
} = require("obsidian");

const VIEW_TYPE = "dnd-sheet-view";
const EXT = "dndsheet";
const BUILD_VERSION = "1.14.5";            // versão do código (main.js); o manifest.json deve ter o mesmo número
let PLUGIN_VERSION = BUILD_VERSION;
let PLUGIN_DIR = "";                       // pasta do plugin no vault (para ler srd-spells.json)
const SRD_FILE = "srd-spells.json";        // arquivo do banco de magias, na pasta do plugin
const SCHEMA_VERSION = 4;                  // formato da ficha de jogador (.dndsheet)
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
    if (!pa.length && !ps.length && !pk.length && !pt.length && !psp.length) {
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
      d.hpCurrent = d.hpMax;
      d.hpTemp = 0;
      for (let i = 1; i <= 9; i++) d.spellSlots[i].used = 0;
      d.deathSuccess = [false, false, false];
      d.deathFail = [false, false, false];
      this.hpHistory.length = 0;
      finish(`Descanso longo: PV e espaços de magia restaurados → ${state()}`);
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
    b("Descanso longo", "Restaura PV e espaços de magia", longRest);

    if (this.calcLog) box.createDiv({ cls: "dnd-calc-log", text: this.calcLog });
    if (this.calcFocus) {
      this.calcFocus = false;
      const mobile = typeof document !== "undefined" && document.body && document.body.classList && document.body.classList.contains("is-mobile");
      if (!mobile) input.focus();
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
      containerEl.createEl("p", { text: "⚠ O manifest.json e o main.js são de versões diferentes. Copie os 3 arquivos do zip e reinicie o plugin.", cls: "mod-warning" });
    }
    const bankInfo = containerEl.createEl("p", { text: "Banco de magias: verificando...", cls: "setting-item-description" });
    getSrdSpells(this.app)
      .then((list) => bankInfo.setText(`Banco de magias: ${list.length} magias carregadas de ${SRD_FILE}.`))
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
// Banco de magias do SRD 5.1 (texto ORIGINAL em inglês, sem tradução) e a janela "Adicionar magia".
// Os dados ficam no arquivo srd-spells.json, na pasta do plugin (ver BANCO-DE-MAGIAS.md). Fonte: 5e-SRD-Spells.json.
// Formato de cada magia: n nome, l círculo, s escola, c classes, t tempo, r alcance, d duração,
// k componentes, cc concentração, rt ritual, x texto, h "em níveis superiores".
// ---------------------------------------------------------------------
// Lê o banco do arquivo a cada abertura da janela (assim, editar o arquivo vale na hora, sem reiniciar).
async function getSrdSpells(app) {
  const path = `${PLUGIN_DIR}/${SRD_FILE}`;
  let text;
  try { text = await app.vault.adapter.read(path); }
  catch (e) { throw new Error(`arquivo não encontrado: ${path}`); }
  let data;
  try { data = JSON.parse(text); }
  catch (e) { throw new Error(`${SRD_FILE} não é um JSON válido (${e.message})`); }
  if (!data || data.format !== 1 || !Array.isArray(data.spells)) throw new Error(`${SRD_FILE} está num formato desconhecido`);
  return data.spells;
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
      el.createDiv({ cls: "dnd-error", text: `Não consegui carregar o banco de magias (${this.error}). Copie o arquivo ${SRD_FILE} do zip para a pasta do plugin e reinicie o plugin. A aba "Criar magia" continua funcionando.` });
      return;
    }
    if (!this.spells) { el.createDiv({ cls: "dnd-hint", text: "Carregando magias..." }); return; }
    const spells = this.spells;
    const bar = el.createDiv({ cls: "dnd-srd-filters" });
    const q = bar.createEl("input", { type: "text", attr: { placeholder: "Buscar pelo nome (em inglês)..." } });
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
    foot.setText("Magias do SRD 5.1 (Wizards of the Coast), licença CC BY 4.0. Texto original em inglês.");

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
    PLUGIN_DIR = (this.manifest && this.manifest.dir) || `${this.app.vault.configDir}/plugins/${(this.manifest && this.manifest.id) || "dnd-sheet"}`;
    this.app.vault.adapter.exists(`${PLUGIN_DIR}/${SRD_FILE}`).then((ok) => {
      if (!ok) new Notice(`Ficha de D&D: o arquivo ${SRD_FILE} não está na pasta do plugin, então a janela "Adicionar magia" ficará sem o banco. Copie todos os arquivos do zip e reinicie o plugin.`, 20000);
    }).catch(() => {});
    const mv = this.manifest && this.manifest.version;
    if (mv && mv !== BUILD_VERSION) {
      console.warn(`[dnd-sheet] manifest.json (v${mv}) e main.js (v${BUILD_VERSION}) são de versões diferentes.`);
      new Notice(`Ficha de D&D: o manifest.json é da v${mv}, mas o main.js é da v${BUILD_VERSION}. Copie os 3 arquivos do zip (main.js, manifest.json e styles.css) e reinicie o plugin.`, 20000);
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
