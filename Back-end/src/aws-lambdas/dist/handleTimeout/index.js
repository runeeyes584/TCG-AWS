"use strict";
var mr = Object.create;
var te = Object.defineProperty;
var gr = Object.getOwnPropertyDescriptor;
var Ir = Object.getOwnPropertyNames;
var hr = Object.getPrototypeOf,
  fr = Object.prototype.hasOwnProperty;
var Er = (e, t) => () => {
    try {
      return (t || e((t = { exports: {} }).exports, t), t.exports);
    } catch (r) {
      throw ((t = 0), r);
    }
  },
  _r = (e, t) => {
    for (var r in t) te(e, r, { get: t[r], enumerable: !0 });
  },
  tt = (e, t, r, a) => {
    if ((t && typeof t == "object") || typeof t == "function")
      for (let n of Ir(t))
        !fr.call(e, n) &&
          n !== r &&
          te(e, n, {
            get: () => t[n],
            enumerable: !(a = gr(t, n)) || a.enumerable,
          });
    return e;
  };
var Se = (e, t, r) => (
    (r = e != null ? mr(hr(e)) : {}),
    tt(
      t || !e || !e.__esModule
        ? te(r, "default", { value: e, enumerable: !0 })
        : r,
      e,
    )
  ),
  Ar = (e) => tt(te({}, "__esModule", { value: !0 }), e);
var ct = Er((fn, b) => {
  var Ne = require("fs"),
    re = require("path"),
    Tr = require("os"),
    Sr = require("crypto"),
    rt = [
      "\u25C8 encrypted .env [www.dotenvx.com]",
      "\u25C8 secrets for agents [www.dotenvx.com]",
      "\u2301 auth for agents [www.vestauth.com]",
      "\u2318 custom filepath { path: '/custom/path/.env' }",
      "\u2318 enable debugging { debug: true }",
      "\u2318 override existing { override: true }",
      "\u2318 suppress logs { quiet: true }",
      "\u2318 multiple files { path: ['.env.local', '.env'] }",
    ];
  function Nr() {
    return rt[Math.floor(Math.random() * rt.length)];
  }
  function F(e) {
    return typeof e == "string"
      ? !["false", "0", "no", "off", ""].includes(e.toLowerCase())
      : !!e;
  }
  function Dr() {
    return process.stdout.isTTY;
  }
  function Cr(e) {
    return Dr() ? `\x1B[2m${e}\x1B[0m` : e;
  }
  var br =
    /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/gm;
  function Rr(e) {
    let t = {},
      r = e.toString();
    r = r.replace(
      /\r\n?/gm,
      `
`,
    );
    let a;
    for (; (a = br.exec(r)) != null; ) {
      let n = a[1],
        o = a[2] || "";
      o = o.trim();
      let i = o[0];
      ((o = o.replace(/^(['"`])([\s\S]*)\1$/gm, "$2")),
        i === '"' &&
          ((o = o.replace(
            /\\n/g,
            `
`,
          )),
          (o = o.replace(/\\r/g, "\r"))),
        (t[n] = o));
    }
    return t;
  }
  function vr(e) {
    e = e || {};
    let t = ot(e);
    e.path = t;
    let r = f.configDotenv(e);
    if (!r.parsed) {
      let i = new Error(
        `MISSING_DATA: Cannot parse ${t} for an unknown reason`,
      );
      throw ((i.code = "MISSING_DATA"), i);
    }
    let a = it(e).split(","),
      n = a.length,
      o;
    for (let i = 0; i < n; i++)
      try {
        let c = a[i].trim(),
          d = kr(r, c);
        o = f.decrypt(d.ciphertext, d.key);
        break;
      } catch (c) {
        if (i + 1 >= n) throw c;
      }
    return f.parse(o);
  }
  function Ur(e) {
    console.error(`\u26A0 ${e}`);
  }
  function X(e) {
    console.log(`\u2506 ${e}`);
  }
  function nt(e) {
    console.log(`\u25C7 ${e}`);
  }
  function it(e) {
    return e && e.DOTENV_KEY && e.DOTENV_KEY.length > 0
      ? e.DOTENV_KEY
      : process.env.DOTENV_KEY && process.env.DOTENV_KEY.length > 0
        ? process.env.DOTENV_KEY
        : "";
  }
  function kr(e, t) {
    let r;
    try {
      r = new URL(t);
    } catch (c) {
      if (c.code === "ERR_INVALID_URL") {
        let d = new Error(
          "INVALID_DOTENV_KEY: Wrong format. Must be in valid uri format like dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=development",
        );
        throw ((d.code = "INVALID_DOTENV_KEY"), d);
      }
      throw c;
    }
    let a = r.password;
    if (!a) {
      let c = new Error("INVALID_DOTENV_KEY: Missing key part");
      throw ((c.code = "INVALID_DOTENV_KEY"), c);
    }
    let n = r.searchParams.get("environment");
    if (!n) {
      let c = new Error("INVALID_DOTENV_KEY: Missing environment part");
      throw ((c.code = "INVALID_DOTENV_KEY"), c);
    }
    let o = `DOTENV_VAULT_${n.toUpperCase()}`,
      i = e.parsed[o];
    if (!i) {
      let c = new Error(
        `NOT_FOUND_DOTENV_ENVIRONMENT: Cannot locate environment ${o} in your .env.vault file.`,
      );
      throw ((c.code = "NOT_FOUND_DOTENV_ENVIRONMENT"), c);
    }
    return { ciphertext: i, key: a };
  }
  function ot(e) {
    let t = null;
    if (e && e.path && e.path.length > 0)
      if (Array.isArray(e.path))
        for (let r of e.path)
          Ne.existsSync(r) && (t = r.endsWith(".vault") ? r : `${r}.vault`);
      else t = e.path.endsWith(".vault") ? e.path : `${e.path}.vault`;
    else t = re.resolve(process.cwd(), ".env.vault");
    return Ne.existsSync(t) ? t : null;
  }
  function at(e) {
    return e[0] === "~" ? re.join(Tr.homedir(), e.slice(1)) : e;
  }
  function Lr(e) {
    let t = F(process.env.DOTENV_CONFIG_DEBUG || (e && e.debug)),
      r = F(process.env.DOTENV_CONFIG_QUIET || (e && e.quiet));
    (t || !r) && nt("loading env from encrypted .env.vault");
    let a = f._parseVault(e),
      n = process.env;
    return (
      e && e.processEnv != null && (n = e.processEnv),
      f.populate(n, a, e),
      { parsed: a }
    );
  }
  function wr(e) {
    let t = re.resolve(process.cwd(), ".env"),
      r = "utf8",
      a = process.env;
    e && e.processEnv != null && (a = e.processEnv);
    let n = F(a.DOTENV_CONFIG_DEBUG || (e && e.debug)),
      o = F(a.DOTENV_CONFIG_QUIET || (e && e.quiet));
    e && e.encoding
      ? (r = e.encoding)
      : n && X("no encoding is specified (UTF-8 is used by default)");
    let i = [t];
    if (e && e.path)
      if (!Array.isArray(e.path)) i = [at(e.path)];
      else {
        i = [];
        for (let p of e.path) i.push(at(p));
      }
    let c,
      d = {};
    for (let p of i)
      try {
        let h = f.parse(Ne.readFileSync(p, { encoding: r }));
        f.populate(d, h, e);
      } catch (h) {
        (n && X(`failed to load ${p} ${h.message}`), (c = h));
      }
    let l = f.populate(a, d, e);
    if (
      ((n = F(a.DOTENV_CONFIG_DEBUG || n)),
      (o = F(a.DOTENV_CONFIG_QUIET || o)),
      n || !o)
    ) {
      let p = Object.keys(l).length,
        h = [];
      for (let A of i)
        try {
          let I = re.relative(process.cwd(), A);
          h.push(I);
        } catch (I) {
          (n && X(`failed to load ${A} ${I.message}`), (c = I));
        }
      nt(`injected env (${p}) from ${h.join(",")} ${Cr(`// tip: ${Nr()}`)}`);
    }
    return c ? { parsed: d, error: c } : { parsed: d };
  }
  function Pr(e) {
    if (it(e).length === 0) return f.configDotenv(e);
    let t = ot(e);
    return t
      ? f._configVault(e)
      : (Ur(`you set DOTENV_KEY but you are missing a .env.vault file at ${t}`),
        f.configDotenv(e));
  }
  function Mr(e, t) {
    let r = Buffer.from(t.slice(-64), "hex"),
      a = Buffer.from(e, "base64"),
      n = a.subarray(0, 12),
      o = a.subarray(-16);
    a = a.subarray(12, -16);
    try {
      let i = Sr.createDecipheriv("aes-256-gcm", r, n);
      return (i.setAuthTag(o), `${i.update(a)}${i.final()}`);
    } catch (i) {
      let c = i instanceof RangeError,
        d = i.message === "Invalid key length",
        l = i.message === "Unsupported state or unable to authenticate data";
      if (c || d) {
        let p = new Error(
          "INVALID_DOTENV_KEY: It must be 64 characters long (or more)",
        );
        throw ((p.code = "INVALID_DOTENV_KEY"), p);
      } else if (l) {
        let p = new Error("DECRYPTION_FAILED: Please check your DOTENV_KEY");
        throw ((p.code = "DECRYPTION_FAILED"), p);
      } else throw i;
    }
  }
  function Or(e, t, r = {}) {
    let a = !!(r && r.debug),
      n = !!(r && r.override),
      o = {};
    if (typeof t != "object") {
      let i = new Error(
        "OBJECT_REQUIRED: Please check the processEnv argument being passed to populate",
      );
      throw ((i.code = "OBJECT_REQUIRED"), i);
    }
    for (let i of Object.keys(t))
      Object.prototype.hasOwnProperty.call(e, i)
        ? (n === !0 && ((e[i] = t[i]), (o[i] = t[i])),
          a &&
            X(
              n === !0
                ? `"${i}" is already defined and WAS overwritten`
                : `"${i}" is already defined and was NOT overwritten`,
            ))
        : ((e[i] = t[i]), (o[i] = t[i]));
    return o;
  }
  var f = {
    configDotenv: wr,
    _configVault: Lr,
    _parseVault: vr,
    config: Pr,
    decrypt: Mr,
    parse: Rr,
    populate: Or,
  };
  b.exports.configDotenv = f.configDotenv;
  b.exports._configVault = f._configVault;
  b.exports._parseVault = f._parseVault;
  b.exports.config = f.config;
  b.exports.decrypt = f.decrypt;
  b.exports.parse = f.parse;
  b.exports.populate = f.populate;
  b.exports = f;
});
var In = {};
_r(In, {
  duePlayer: () => pr,
  handler: () => gn,
  normalizeTurnTimeoutMessage: () => lr,
  processTimeout: () => yr,
  timeoutMessageMatches: () => ur,
});
module.exports = Ar(In);
var Ae = require("@aws-sdk/client-apigatewaymanagementapi"),
  W = require("@aws-sdk/lib-dynamodb");
var st = require("@aws-sdk/client-dynamodb"),
  dt = require("@aws-sdk/lib-dynamodb"),
  lt = Se(ct(), 1),
  Ce = Se(require("path"), 1),
  pt = require("url"),
  ut = require("@aws-sdk/credential-providers"),
  De = {},
  yt = process.cwd();
try {
  typeof De < "u" &&
    De.url &&
    (yt = Ce.default.dirname((0, pt.fileURLToPath)(De.url)));
} catch {}
process.env.AWS_LAMBDA_FUNCTION_NAME ||
  lt.default.config({ path: Ce.default.resolve(yt, "../../.env") });
var k = null,
  mt = !!process.env.AWS_LAMBDA_FUNCTION_NAME,
  gt = !!(
    process.env.DB_SECRET_NAME ||
    process.env.DB_SECRET_KEY ||
    process.env.CROSS_ACCOUNT_ROLE_ARN ||
    process.env.DB_ACCESS_KEY_ID
  ),
  It = process.env.DYNAMODB_CREDENTIAL_MODE === "custom" || (!mt && gt);
mt &&
  gt &&
  !It &&
  console.info(
    "DynamoDB is using the Lambda execution role. Set DYNAMODB_CREDENTIAL_MODE=custom only for an intentional cross-account credential source.",
  );
var Gr = async () => {
    if (k) return k;
    let e = process.env.DB_SECRET_NAME || process.env.DB_SECRET_KEY;
    if (e)
      try {
        let { SecretsManagerClient: r, GetSecretValueCommand: a } =
            await import("@aws-sdk/client-secrets-manager"),
          n =
            process.env.DB_REGION || process.env.AWS_REGION || "ap-southeast-1",
          o = new r({ region: n });
        console.log(
          `[SecretsManager] \u0110ang t\u1EA3i credentials t\u1EEB Secret: ${e}...`,
        );
        let i = await o.send(new a({ SecretId: e }));
        if (i.SecretString) {
          let c = JSON.parse(i.SecretString),
            d = c.accessKeyId || c.AWS_ACCESS_KEY_ID,
            l = c.secretAccessKey || c.AWS_SECRET_ACCESS_KEY;
          if (!d || !l)
            throw new Error(
              "The configured DynamoDB credential secret does not contain AWS accessKeyId and secretAccessKey.",
            );
          return (
            (k = {
              accessKeyId: d,
              secretAccessKey: l,
              ...(c.sessionToken && { sessionToken: c.sessionToken }),
            }),
            console.log(
              "[SecretsManager] T\u1EA3i credentials th\xE0nh c\xF4ng!",
            ),
            k
          );
        }
      } catch (r) {
        console.error(
          "[SecretsManager] L\u1ED7i khi l\u1EA5y Secret, \u0111ang th\u1EED d\xF9ng c\xE1c ph\u01B0\u01A1ng \xE1n d\u1EF1 ph\xF2ng:",
          r,
        );
      }
    let t = process.env.CROSS_ACCOUNT_ROLE_ARN;
    if (t)
      try {
        return (
          console.log(
            `[AssumeRole] \u0110ang c\u1EA5u h\xECnh Credentials Provider cho Role: ${t}`,
          ),
          (k = (0, ut.fromTemporaryCredentials)({
            params: { RoleArn: t, RoleSessionName: "ChronoGameBackendSession" },
            clientConfig: { region: process.env.DB_REGION || "ap-southeast-1" },
          })),
          k
        );
      } catch (r) {
        console.error(
          "[AssumeRole] L\u1ED7i khi t\u1EA1o AssumeRole credentials provider:",
          r,
        );
      }
    if (process.env.DB_ACCESS_KEY_ID)
      return (
        (k = {
          accessKeyId: process.env.DB_ACCESS_KEY_ID,
          secretAccessKey: process.env.DB_SECRET_ACCESS_KEY || "",
          ...(process.env.DB_SESSION_TOKEN && {
            sessionToken: process.env.DB_SESSION_TOKEN,
          }),
        }),
        k
      );
    throw new Error(
      "Custom DynamoDB credentials were requested but could not be resolved.",
    );
  },
  Fr = new st.DynamoDBClient({
    region: process.env.DB_REGION || process.env.AWS_REGION || "ap-southeast-1",
    ...(It ? { credentials: Gr } : {}),
  }),
  ae = dt.DynamoDBDocumentClient.from(Fr, {
    marshallOptions: { removeUndefinedValues: !0, convertEmptyValues: !0 },
  });
var s = class extends Error {
  constructor(t) {
    (super(t), (this.name = "GameValidationError"));
  }
};
var ht = [
  {
    id: "null-circuit-unit-01",
    name: "Packet Sprite",
    cost: 1,
    type: "unit",
    attack: 1,
    health: 2,
    archetype: "Null Circuit",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/36326160.jpg",
    description: "When I'm summoned, draw a Null Circuit card.",
    abilities: [
      {
        id: "null-circuit-unit-01-draw",
        onPlay: !0,
        effects: [
          {
            type: "DRAW_CARD_BY_FILTER",
            count: 1,
            archetype: "Null Circuit",
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "null-circuit-unit-02",
    name: "Backdoor Courier",
    cost: 1,
    type: "unit",
    attack: 2,
    health: 1,
    archetype: "Null Circuit",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/54257392.jpg",
    description: "When I'm summoned, restore 1 spell mana.",
    abilities: [
      {
        id: "null-circuit-unit-02-mana",
        onPlay: !0,
        effects: [{ type: "RESTORE_SPELL_MANA", amount: 1, target: "SELF" }],
      },
    ],
  },
  {
    id: "null-circuit-unit-03",
    name: "Proxy Familiar",
    cost: 2,
    type: "unit",
    attack: 2,
    health: 2,
    archetype: "Null Circuit",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/73810864.jpg",
    description: "When you banish a card, grant me +1|+1.",
    abilities: [
      {
        id: "null-circuit-unit-03-banish",
        when: { event: "CARD_BANISHED" },
        conditions: [{ type: "EVENT_PLAYER_IS", player: "SELF" }],
        effects: [
          {
            type: "BUFF_UNIT",
            attack: 1,
            health: 1,
            duration: "PERMANENT",
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "null-circuit-unit-04",
    name: "Cache Diver",
    cost: 2,
    type: "unit",
    attack: 1,
    health: 3,
    archetype: "Null Circuit",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/82699999.jpg",
    description:
      "Play: return an allied unit or champion from your graveyard to hand.",
    abilities: [
      {
        id: "null-circuit-unit-04-rebirth",
        onPlay: !0,
        targets: [{ id: "target", kind: "ALLY_GRAVEYARD" }],
        effects: [
          {
            type: "REBIRTH_CARD",
            target: "target",
            allowedTypes: ["UNIT", "CHAMPION"],
          },
        ],
      },
    ],
  },
  {
    id: "null-circuit-unit-05",
    name: "Cipher Moth",
    cost: 2,
    type: "unit",
    attack: 3,
    health: 1,
    archetype: "Null Circuit",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/81078880.jpg",
    description: "Play: banish a unit or champion from the enemy graveyard.",
    abilities: [
      {
        id: "null-circuit-unit-05-banish-enemy",
        onPlay: !0,
        targets: [{ id: "target", kind: "ENEMY_GRAVEYARD" }],
        effects: [{ type: "BANISH_GRAVEYARD", target: "target" }],
      },
    ],
  },
  {
    id: "null-circuit-unit-06",
    name: "Ghost Node",
    cost: 3,
    type: "unit",
    attack: 2,
    health: 3,
    archetype: "Null Circuit",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/9205573.jpg",
    description: "When you cast a spell, I gain +1|+0 this round.",
    abilities: [
      {
        id: "null-circuit-unit-06-spell",
        when: { event: "SPELL_CAST" },
        conditions: [{ type: "EVENT_PLAYER_IS", player: "SELF" }],
        effects: [
          {
            type: "BUFF_UNIT",
            attack: 1,
            health: 0,
            duration: "THIS_ROUND",
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "null-circuit-unit-07",
    name: "Blacksite Runner",
    cost: 3,
    type: "unit",
    attack: 3,
    health: 2,
    archetype: "Null Circuit",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/6636319.jpg",
    description: "Play: create a random Null Circuit spell in hand.",
    abilities: [
      {
        id: "null-circuit-unit-07-create",
        onPlay: !0,
        effects: [
          {
            type: "CREATE_RANDOM_CARD",
            archetype: "Null Circuit",
            cardType: "spell",
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "null-circuit-unit-08",
    name: "Loop Warden",
    cost: 3,
    type: "unit",
    attack: 1,
    health: 4,
    archetype: "Null Circuit",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/36609518.jpg",
    description: "Round start: restore 1 spell mana.",
    abilities: [
      {
        id: "null-circuit-unit-08-round-mana",
        when: { event: "ROUND_STARTED" },
        effects: [{ type: "RESTORE_SPELL_MANA", amount: 1, target: "SELF" }],
      },
    ],
  },
  {
    id: "null-circuit-unit-09",
    name: "Null Archivist",
    cost: 4,
    type: "unit",
    attack: 3,
    health: 4,
    archetype: "Null Circuit",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/93672138.jpg",
    description: "Play: recall an enemy unit.",
    abilities: [
      {
        id: "null-circuit-unit-09-recall",
        onPlay: !0,
        targets: [{ id: "target", kind: "ENEMY_UNIT" }],
        effects: [{ type: "RECALL_UNIT", target: "target" }],
      },
    ],
  },
  {
    id: "null-circuit-unit-10",
    name: "Forked Daemon",
    cost: 4,
    type: "unit",
    attack: 4,
    health: 3,
    archetype: "Null Circuit",
    rarity: "rare",
    collectible: !0,
    imageUrl:
      " https://images.ygoprodeck.com/images/cards_cropped/62098216.jpg",
    description: "When an enemy unit dies, deal 1 to the enemy Nexus.",
    abilities: [
      {
        id: "null-circuit-unit-10-death-ping",
        when: { event: "UNIT_DIED" },
        conditions: [{ type: "EVENT_PLAYER_IS", player: "ENEMY" }],
        effects: [{ type: "DEAL_DAMAGE", amount: 1, target: "ENEMY_NEXUS" }],
      },
    ],
  },
  {
    id: "null-circuit-unit-11",
    name: "Redline Hacker",
    cost: 4,
    type: "unit",
    attack: 2,
    health: 5,
    archetype: "Null Circuit",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/34365442.jpg",
    description:
      "When you cast your second spell each round, grant me Barrier.",
    abilities: [
      {
        id: "null-circuit-unit-11-barrier",
        when: { event: "SPELL_CAST" },
        conditions: [
          { type: "EVENT_PLAYER_IS", player: "SELF" },
          { type: "SPELLS_CAST_THIS_ROUND_AT_LEAST", count: 2 },
        ],
        effects: [
          { type: "GRANT_KEYWORD", keyword: "BARRIER", target: "SELF" },
        ],
      },
    ],
  },
  {
    id: "null-circuit-unit-12",
    name: "Banishment Broker",
    cost: 5,
    type: "unit",
    attack: 4,
    health: 5,
    archetype: "Null Circuit",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/60759087.jpg",
    description: "Play: draw a spell.",
    abilities: [
      {
        id: "null-circuit-unit-12-draw-spell",
        onPlay: !0,
        effects: [
          {
            type: "DRAW_CARD_BY_FILTER",
            count: 1,
            cardType: "spell",
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "null-circuit-unit-13",
    name: "Recursive Chimera",
    cost: 5,
    type: "unit",
    attack: 5,
    health: 4,
    archetype: "Null Circuit",
    rarity: "epic",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/98360333.jpg",
    description: "Attack: I gain +2|+0 this round.",
    abilities: [
      {
        id: "null-circuit-unit-13-attack",
        when: { event: "ATTACK_COMMITTED" },
        conditions: [
          { type: "EVENT_PLAYER_IS", player: "SELF" },
          { type: "SOURCE_IS_ATTACKING" },
        ],
        effects: [
          {
            type: "BUFF_UNIT",
            attack: 2,
            health: 0,
            duration: "THIS_ROUND",
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "null-circuit-unit-14",
    name: "Kernel Reaper",
    cost: 5,
    type: "unit",
    attack: 3,
    health: 6,
    archetype: "Null Circuit",
    rarity: "epic",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/8083925.jpg",
    description:
      "Play: summon a Null Circuit unit costing 3 or less from your deck.",
    abilities: [
      {
        id: "null-circuit-unit-14-summon",
        onPlay: !0,
        effects: [
          {
            type: "SUMMON_FROM_DECK",
            archetype: "Null Circuit",
            cardTypes: ["unit"],
            maxCost: 3,
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "null-circuit-unit-15",
    name: "Paradox Hydra",
    cost: 6,
    type: "unit",
    attack: 5,
    health: 6,
    archetype: "Null Circuit",
    rarity: "epic",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/54611591.jpg",
    description: "Round end: deal 1 to all active enemies.",
    abilities: [
      {
        id: "null-circuit-unit-15-burn",
        when: { event: "ROUND_ENDED" },
        effects: [
          { type: "BURN_ACTIVE_ENEMIES", amount: 1, target: "ENEMY_UNIT" },
        ],
      },
    ],
  },
  {
    id: "null-circuit-unit-16",
    name: "Rootkit Sovereign",
    cost: 6,
    type: "unit",
    attack: 6,
    health: 5,
    archetype: "Null Circuit",
    rarity: "epic",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/81005500.jpg",
    description: "When you banish a card, draw 1.",
    abilities: [
      {
        id: "null-circuit-unit-16-banish-draw",
        when: { event: "CARD_BANISHED" },
        conditions: [{ type: "EVENT_PLAYER_IS", player: "SELF" }],
        effects: [{ type: "DRAW_CARD", count: 1, target: "SELF" }],
      },
    ],
  },
  {
    id: "null-circuit-unit-17",
    name: "Event Horizon Engine",
    cost: 7,
    type: "unit",
    attack: 7,
    health: 7,
    archetype: "Null Circuit",
    rarity: "legendary",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/4341721.jpg",
    description: "Round start: create a random Null Circuit card in hand.",
    abilities: [
      {
        id: "null-circuit-unit-17-random",
        when: { event: "ROUND_STARTED" },
        effects: [
          {
            type: "CREATE_RANDOM_CARD",
            archetype: "Null Circuit",
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "null-circuit-unit-18",
    name: "Queen Zero",
    cost: 8,
    type: "unit",
    attack: 8,
    health: 8,
    archetype: "Null Circuit",
    rarity: "legendary",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/78598237.jpg",
    description: "Play: recall an enemy unit and grant me Barrier.",
    abilities: [
      {
        id: "null-circuit-unit-18-boss",
        onPlay: !0,
        targets: [{ id: "target", kind: "ENEMY_UNIT" }],
        effects: [
          { type: "RECALL_UNIT", target: "target" },
          { type: "GRANT_KEYWORD", keyword: "BARRIER", target: "SELF" },
        ],
      },
    ],
  },
  {
    id: "null-circuit-champion-1",
    name: "Nyx Byteweaver",
    cost: 4,
    type: "champion",
    attack: 3,
    health: 4,
    archetype: "Null Circuit",
    rarity: "champion",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/68059897.jpg",
    description: "Level up after 4 spells cast.",
    level: 1,
    championId: "null-circuit-champion-1",
    levelUpCondition: { type: "SPELLS_CAST", threshold: 4 },
    level2CardCode: "null-circuit-champion-1-lv2",
    abilities: [
      {
        id: "null-circuit-champion-1-lv1-spell",
        when: { event: "SPELL_CAST" },
        conditions: [{ type: "EVENT_PLAYER_IS", player: "SELF" }],
        effects: [
          {
            type: "BUFF_UNIT",
            attack: 1,
            health: 0,
            duration: "THIS_ROUND",
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "null-circuit-champion-1-lv2",
    name: "Nyx Byteweaver, Ascended",
    cost: 4,
    type: "champion",
    attack: 5,
    health: 6,
    archetype: "Null Circuit",
    rarity: "champion",
    collectible: !1,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/21848500.jpg",
    description: "Leveled form of Nyx Byteweaver.",
    level: 2,
    championId: "null-circuit-champion-1",
    abilities: [
      {
        id: "null-circuit-champion-1-lv2-spell",
        when: { event: "SPELL_CAST" },
        conditions: [{ type: "EVENT_PLAYER_IS", player: "SELF" }],
        effects: [
          {
            type: "BUFF_UNIT",
            attack: 1,
            health: 1,
            duration: "PERMANENT",
            target: "SELF",
          },
          {
            type: "CREATE_RANDOM_CARD",
            archetype: "Null Circuit",
            cardType: "spell",
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "null-circuit-champion-2",
    name: "Axiom, the Null Crown",
    cost: 5,
    type: "champion",
    attack: 4,
    health: 5,
    archetype: "Null Circuit",
    rarity: "champion",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/95454996.jpg",
    description: "Level up after 3 allies died.",
    level: 1,
    championId: "null-circuit-champion-2",
    levelUpCondition: { type: "ALLIES_DIED", threshold: 3 },
    level2CardCode: "null-circuit-champion-2-lv2",
    abilities: [
      {
        id: "null-circuit-champion-2-lv1-spell",
        when: { event: "SPELL_CAST" },
        conditions: [{ type: "EVENT_PLAYER_IS", player: "SELF" }],
        effects: [
          {
            type: "BUFF_UNIT",
            attack: 1,
            health: 0,
            duration: "THIS_ROUND",
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "null-circuit-champion-2-lv2",
    name: "Axiom, the Null Crown, Ascended",
    cost: 5,
    type: "champion",
    attack: 6,
    health: 7,
    archetype: "Null Circuit",
    rarity: "champion",
    collectible: !1,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/21848500.jpg",
    description: "Leveled form of Axiom, the Null Crown.",
    level: 2,
    championId: "null-circuit-champion-2",
    abilities: [
      {
        id: "null-circuit-champion-2-lv2-spell",
        when: { event: "SPELL_CAST" },
        conditions: [{ type: "EVENT_PLAYER_IS", player: "SELF" }],
        effects: [
          {
            type: "BUFF_UNIT",
            attack: 1,
            health: 1,
            duration: "PERMANENT",
            target: "SELF",
          },
          {
            type: "CREATE_RANDOM_CARD",
            archetype: "Null Circuit",
            cardType: "spell",
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "null-circuit-spell-01",
    name: "Delete Trace",
    cost: 1,
    type: "spell",
    spellSpeed: "burst",
    archetype: "Null Circuit",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/57111661.jpg",
    description: "Draw a Null Circuit card.",
    effects: [
      {
        type: "DRAW_CARD_BY_FILTER",
        count: 1,
        archetype: "Null Circuit",
        target: "SELF",
      },
    ],
  },
  {
    id: "null-circuit-spell-02",
    name: "Emergency Fork",
    cost: 2,
    type: "spell",
    spellSpeed: "fast",
    archetype: "Null Circuit",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/68337209.jpg",
    description: "Deal 2 to an enemy unit.",
    effects: [{ type: "DEAL_DAMAGE", amount: 2, target: "ENEMY_UNIT" }],
  },
  {
    id: "null-circuit-spell-03",
    name: "Cold Reboot",
    cost: 2,
    type: "spell",
    spellSpeed: "fast",
    archetype: "Null Circuit",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/93453053.jpg",
    description: "Recall an allied unit, then draw 1.",
    effects: [
      { type: "RECALL_UNIT", target: "ALLY_UNIT" },
      { type: "DRAW_CARD", count: 1, target: "SELF" },
    ],
  },
  {
    id: "null-circuit-spell-04",
    name: "Quarantine Zone",
    cost: 3,
    type: "spell",
    spellSpeed: "slow",
    archetype: "Null Circuit",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/80181649.jpg",
    description: "Banish a card from a graveyard.",
    effects: [{ type: "BANISH_GRAVEYARD", target: "ENEMY_GRAVEYARD" }],
  },
  {
    id: "null-circuit-spell-05",
    name: "Recursive Call",
    cost: 4,
    type: "spell",
    spellSpeed: "fast",
    archetype: "Null Circuit",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/35487920.jpg",
    description:
      "Return an allied unit or champion from your graveyard to hand.",
    effects: [
      {
        type: "REBIRTH_CARD",
        target: "ALLY_GRAVEYARD",
        allowedTypes: ["UNIT", "CHAMPION"],
      },
    ],
  },
  {
    id: "null-circuit-spell-06",
    name: "Blackout Protocol",
    cost: 5,
    type: "spell",
    spellSpeed: "slow",
    archetype: "Null Circuit",
    rarity: "epic",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/20726052.jpg",
    description: "Recall an enemy unit and restore 2 spell mana.",
    effects: [
      { type: "RECALL_UNIT", target: "ENEMY_UNIT" },
      { type: "RESTORE_SPELL_MANA", amount: 2, target: "SELF" },
    ],
  },
  {
    id: "null-circuit-spell-07",
    name: "Zero-Day Bloom",
    cost: 6,
    type: "spell",
    spellSpeed: "slow",
    archetype: "Null Circuit",
    rarity: "epic",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/61976639.jpg",
    description: "Deal 2 to all active enemies.",
    effects: [{ type: "BURN_ACTIVE_ENEMIES", amount: 2, target: "ENEMY_UNIT" }],
  },
  {
    id: "null-circuit-spell-08",
    name: "Return from Null",
    cost: 7,
    type: "spell",
    spellSpeed: "slow",
    archetype: "Null Circuit",
    rarity: "legendary",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/94722358.jpg",
    description: "Revive an allied champion from your graveyard.",
    effects: [
      {
        type: "REVIVE_CARD",
        target: "ALLY_GRAVEYARD",
        allowedTypes: ["CHAMPION"],
      },
    ],
  },
  {
    id: "silverkeep-unit-01",
    name: "Silverkeep Elis",
    cost: 1,
    type: "unit",
    attack: 1,
    health: 2,
    archetype: "Silverkeep",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/16474916.jpg",
    description: "Play: grant an ally +0|+1.",
    abilities: [
      {
        id: "silverkeep-unit-01-guard",
        onPlay: !0,
        targets: [{ id: "target", kind: "ALLY_UNIT" }],
        effects: [
          {
            type: "BUFF_UNIT",
            attack: 0,
            health: 1,
            duration: "PERMANENT",
            target: "target",
          },
        ],
      },
    ],
  },
  {
    id: "silverkeep-unit-02",
    name: "Silverkeep Irene",
    cost: 1,
    type: "unit",
    attack: 2,
    health: 1,
    archetype: "Silverkeep",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/79858629.jpg",
    description: "Play: draw a Silverkeep spell.",
    abilities: [
      {
        id: "silverkeep-unit-02-draw",
        onPlay: !0,
        effects: [
          {
            type: "DRAW_CARD_BY_FILTER",
            count: 1,
            archetype: "Silverkeep",
            cardType: "spell",
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "silverkeep-unit-03",
    name: "Silverkeep Martha",
    cost: 2,
    type: "unit",
    attack: 2,
    health: 2,
    archetype: "Silverkeep",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/37343995.jpg",
    description: "When you cast a spell, I gain +0|+1 this round.",
    abilities: [
      {
        id: "silverkeep-unit-03-spell",
        when: { event: "SPELL_CAST" },
        conditions: [{ type: "EVENT_PLAYER_IS", player: "SELF" }],
        effects: [
          {
            type: "BUFF_UNIT",
            attack: 0,
            health: 1,
            duration: "THIS_ROUND",
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "silverkeep-unit-04",
    name: "Silverkeep Sophia",
    cost: 2,
    type: "unit",
    attack: 1,
    health: 3,
    archetype: "Silverkeep",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/5352328.jpg",
    description: "Play: give an enemy -1|-0 this round.",
    abilities: [
      {
        id: "silverkeep-unit-04-debuff",
        onPlay: !0,
        targets: [{ id: "target", kind: "ENEMY_UNIT" }],
        effects: [
          {
            type: "DEBUFF_UNIT",
            attackDelta: -1,
            healthDelta: 0,
            duration: "THIS_ROUND",
            target: "target",
          },
        ],
      },
    ],
  },
  {
    id: "silverkeep-unit-05",
    name: "Silverkeep Stella",
    cost: 2,
    type: "unit",
    attack: 3,
    health: 1,
    archetype: "Silverkeep",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/43863925.jpg",
    description: "When an ally blocks, grant it +0|+1 this round.",
    abilities: [
      {
        id: "silverkeep-unit-05-block",
        when: { event: "BLOCK_DECLARED" },
        conditions: [{ type: "EVENT_PLAYER_IS", player: "SELF" }],
        effects: [
          {
            type: "BUFF_UNIT",
            attack: 0,
            health: 1,
            duration: "THIS_ROUND",
            target: "EVENT_UNIT",
          },
        ],
      },
    ],
  },
  {
    id: "silverkeep-unit-06",
    name: "Silverkeep Asohilla",
    cost: 3,
    type: "unit",
    attack: 2,
    health: 3,
    archetype: "Silverkeep",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/41524885.jpg",
    description: "Play: deal 1 to an enemy unit.",
    abilities: [
      {
        id: "silverkeep-unit-06-ping",
        onPlay: !0,
        targets: [{ id: "target", kind: "ENEMY_UNIT" }],
        effects: [{ type: "DEAL_DAMAGE", amount: 1, target: "target" }],
      },
    ],
  },
  {
    id: "silverkeep-unit-07",
    name: "Silverkeep Gabryht",
    cost: 3,
    type: "unit",
    attack: 3,
    health: 2,
    archetype: "Silverkeep",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/5530780.jpg",
    description: "Round start: restore 1 spell mana.",
    abilities: [
      {
        id: "silverkeep-unit-07-mana",
        when: { event: "ROUND_STARTED" },
        effects: [{ type: "RESTORE_SPELL_MANA", amount: 1, target: "SELF" }],
      },
    ],
  },
  {
    id: "silverkeep-unit-08",
    name: "Silverkeep Casspitel",
    cost: 3,
    type: "unit",
    attack: 1,
    health: 4,
    archetype: "Silverkeep",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/78135071.jpg",
    description:
      "Play: summon a Silverkeep unit costing 2 or less from your deck.",
    abilities: [
      {
        id: "silverkeep-unit-08-summon",
        onPlay: !0,
        effects: [
          {
            type: "SUMMON_FROM_DECK",
            archetype: "Silverkeep",
            cardTypes: ["unit"],
            maxCost: 2,
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "silverkeep-unit-09",
    name: "Silverkeep Mikaliss",
    cost: 4,
    type: "unit",
    attack: 3,
    health: 4,
    archetype: "Silverkeep",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/42741437.jpg",
    description: "Play: recall an enemy unit.",
    abilities: [
      {
        id: "silverkeep-unit-09-recall",
        onPlay: !0,
        targets: [{ id: "target", kind: "ENEMY_UNIT" }],
        effects: [{ type: "RECALL_UNIT", target: "target" }],
      },
    ],
  },
  {
    id: "silverkeep-unit-10",
    name: "Silverkeep Karmaelle",
    cost: 4,
    type: "unit",
    attack: 4,
    health: 3,
    archetype: "Silverkeep",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/77675029.jpg",
    description: "When an enemy unit is damaged, I gain +1|+0 this round.",
    abilities: [
      {
        id: "silverkeep-unit-10-damage",
        when: { event: "UNIT_DAMAGED" },
        conditions: [{ type: "EVENT_PLAYER_IS", player: "ENEMY" }],
        effects: [
          {
            type: "BUFF_UNIT",
            attack: 1,
            health: 0,
            duration: "THIS_ROUND",
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "silverkeep-unit-11",
    name: "Silverkeep Marnifica",
    cost: 4,
    type: "unit",
    attack: 2,
    health: 5,
    archetype: "Silverkeep",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/59242457.jpg",
    description: "Play: give an enemy -2|-1 this round.",
    abilities: [
      {
        id: "silverkeep-unit-11-snare",
        onPlay: !0,
        targets: [{ id: "target", kind: "ENEMY_UNIT" }],
        effects: [
          {
            type: "DEBUFF_UNIT",
            attackDelta: -2,
            healthDelta: -1,
            duration: "THIS_ROUND",
            target: "target",
          },
        ],
      },
    ],
  },
  {
    id: "silverkeep-unit-12",
    name: "Silverkeep Ace Raye",
    cost: 5,
    type: "unit",
    attack: 4,
    health: 5,
    archetype: "Silverkeep",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/26077387.jpg",
    description: "When an enemy dies, draw 1.",
    abilities: [
      {
        id: "silverkeep-unit-12-death-draw",
        when: { event: "UNIT_DIED" },
        conditions: [{ type: "EVENT_PLAYER_IS", player: "ENEMY" }],
        effects: [{ type: "DRAW_CARD", count: 1, target: "SELF" }],
      },
    ],
  },
  {
    id: "silverkeep-unit-13",
    name: "Silverkeep Ace Roze",
    cost: 5,
    type: "unit",
    attack: 5,
    health: 4,
    archetype: "Silverkeep",
    rarity: "epic",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/37351133.jpg",
    description: "Play: revive an allied unit from your graveyard.",
    abilities: [
      {
        id: "silverkeep-unit-13-revive",
        onPlay: !0,
        targets: [{ id: "target", kind: "ALLY_GRAVEYARD" }],
        effects: [
          { type: "REVIVE_CARD", target: "target", allowedTypes: ["UNIT"] },
        ],
      },
    ],
  },
  {
    id: "silverkeep-unit-14",
    name: "Silverkeep Rayze Kagari",
    cost: 5,
    type: "unit",
    attack: 3,
    health: 6,
    archetype: "Silverkeep",
    rarity: "epic",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/63288573.jpg",
    description:
      "When you cast your second spell each round, deal 1 to a random enemy.",
    abilities: [
      {
        id: "silverkeep-unit-14-trap",
        when: { event: "SPELL_CAST" },
        conditions: [
          { type: "EVENT_PLAYER_IS", player: "SELF" },
          { type: "SPELLS_CAST_THIS_ROUND_AT_LEAST", count: 2 },
        ],
        effects: [
          { type: "DEAL_DAMAGE", amount: 1, target: "RANDOM_ENEMY_UNIT" },
        ],
      },
    ],
  },
  {
    id: "silverkeep-unit-15",
    name: "Silverkeep Rayze Hayate",
    cost: 6,
    type: "unit",
    attack: 5,
    health: 6,
    archetype: "Silverkeep",
    rarity: "epic",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/8491308.jpg",
    description: "Round end: grant all active allies +0|+1 this round.",
    abilities: [
      {
        id: "silverkeep-unit-15-fortify",
        when: { event: "ROUND_ENDED" },
        effects: [
          {
            type: "BUFF_ACTIVE_ALLIES",
            attack: 0,
            health: 1,
            duration: "THIS_ROUND",
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "silverkeep-unit-16",
    name: "Silverkeep Rayze Shizuku",
    cost: 6,
    type: "unit",
    attack: 6,
    health: 5,
    archetype: "Silverkeep",
    rarity: "epic",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/90673288.jpg",
    description: "Play: deal 2 to an enemy unit.",
    abilities: [
      {
        id: "silverkeep-unit-16-execute",
        onPlay: !0,
        targets: [{ id: "target", kind: "ENEMY_UNIT" }],
        effects: [{ type: "DEAL_DAMAGE", amount: 2, target: "target" }],
      },
    ],
  },
  {
    id: "silverkeep-unit-17",
    name: "Silverkeep Rayze Kaiia",
    cost: 7,
    type: "unit",
    attack: 7,
    health: 7,
    archetype: "Silverkeep",
    rarity: "legendary",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/12421694.jpg",
    description: "Round start: create a random Silverkeep spell in hand.",
    abilities: [
      {
        id: "silverkeep-unit-17-prepare",
        when: { event: "ROUND_STARTED" },
        effects: [
          {
            type: "CREATE_RANDOM_CARD",
            archetype: "Silverkeep",
            cardType: "spell",
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "silverkeep-unit-18",
    name: "Silverkeep Rayze Zeke",
    cost: 8,
    type: "unit",
    attack: 8,
    health: 8,
    archetype: "Silverkeep",
    rarity: "legendary",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/75147529.jpg",
    description: "Play: deal 1 to all active enemies and gain Tough.",
    abilities: [
      {
        id: "silverkeep-unit-18-boss",
        onPlay: !0,
        effects: [
          { type: "BURN_ACTIVE_ENEMIES", amount: 1, target: "ENEMY_UNIT" },
          { type: "GRANT_KEYWORD", keyword: "TOUGH", target: "SELF" },
        ],
      },
    ],
  },
  {
    id: "silverkeep-champion-1",
    name: "Silverkeep Rayze Zero",
    cost: 4,
    type: "champion",
    attack: 3,
    health: 4,
    archetype: "Silverkeep",
    rarity: "champion",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/76072561.jpg",
    description: "Level up after 3 enemies died.",
    level: 1,
    championId: "silverkeep-champion-1",
    levelUpCondition: { type: "ENEMIES_DIED", threshold: 3 },
    level2CardCode: "silverkeep-champion-1-lv2",
    abilities: [
      {
        id: "silverkeep-champion-1-lv1-spell",
        when: { event: "SPELL_CAST" },
        conditions: [{ type: "EVENT_PLAYER_IS", player: "SELF" }],
        effects: [
          { type: "DEAL_DAMAGE", amount: 1, target: "RANDOM_ENEMY_UNIT" },
        ],
      },
    ],
  },
  {
    id: "silverkeep-champion-1-lv2",
    name: "Silverkeep Rayze Zero Awakening",
    cost: 4,
    type: "champion",
    attack: 5,
    health: 6,
    archetype: "Silverkeep",
    rarity: "champion",
    collectible: !1,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/17217034.jpg",
    description: "Leveled form of Silverkeep Rayze Zero.",
    level: 2,
    championId: "silverkeep-champion-1",
    abilities: [
      {
        id: "silverkeep-champion-1-lv2-spell",
        when: { event: "SPELL_CAST" },
        conditions: [{ type: "EVENT_PLAYER_IS", player: "SELF" }],
        effects: [
          {
            type: "DEBUFF_UNIT",
            attackDelta: -1,
            healthDelta: -1,
            duration: "THIS_ROUND",
            target: "RANDOM_ENEMY_UNIT",
          },
          { type: "DRAW_CARD", count: 1, target: "SELF" },
        ],
      },
    ],
  },
  {
    id: "silverkeep-champion-2",
    name: "Silverkeep Rayze Algea",
    cost: 5,
    type: "champion",
    attack: 4,
    health: 5,
    archetype: "Silverkeep",
    rarity: "champion",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/98462037.jpg",
    description: "Level up after 4 spells cast.",
    level: 1,
    championId: "silverkeep-champion-2",
    levelUpCondition: { type: "SPELLS_CAST", threshold: 4 },
    level2CardCode: "silverkeep-champion-2-lv2",
    abilities: [
      {
        id: "silverkeep-champion-2-lv1-spell",
        when: { event: "SPELL_CAST" },
        conditions: [{ type: "EVENT_PLAYER_IS", player: "SELF" }],
        effects: [
          { type: "DEAL_DAMAGE", amount: 1, target: "RANDOM_ENEMY_UNIT" },
        ],
      },
    ],
  },
  {
    id: "silverkeep-champion-2-lv2",
    name: "Silverkeep Rayze Algea Awakening",
    cost: 5,
    type: "champion",
    attack: 6,
    health: 7,
    archetype: "Silverkeep",
    rarity: "champion",
    collectible: !1,
    imageUrl: "https://ygoprodeck.com/card/14269",
    description: "Leveled form of Silverkeep Rayze Algea.",
    level: 2,
    championId: "silverkeep-champion-2",
    abilities: [
      {
        id: "silverkeep-champion-2-lv2-spell",
        when: { event: "SPELL_CAST" },
        conditions: [{ type: "EVENT_PLAYER_IS", player: "SELF" }],
        effects: [
          {
            type: "DEBUFF_UNIT",
            attackDelta: -1,
            healthDelta: -1,
            duration: "THIS_ROUND",
            target: "RANDOM_ENEMY_UNIT",
          },
          { type: "DRAW_CARD", count: 1, target: "SELF" },
        ],
      },
    ],
  },
  {
    id: "silverkeep-spell-01",
    name: "Silverkeep Burn!",
    cost: 1,
    type: "spell",
    spellSpeed: "burst",
    archetype: "Silverkeep",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/99550630.jpg",
    description: "Grant an ally Barrier.",
    effects: [
      { type: "GRANT_KEYWORD", keyword: "BARRIER", target: "ALLY_UNIT" },
    ],
  },
  {
    id: "silverkeep-spell-02",
    name: "Silverkeep Jamming",
    cost: 2,
    type: "spell",
    spellSpeed: "fast",
    archetype: "Silverkeep",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/25955749.jpg",
    description: "Give an enemy -2|-0 this round.",
    effects: [
      {
        type: "DEBUFF_UNIT",
        attackDelta: -2,
        healthDelta: 0,
        duration: "THIS_ROUND",
        target: "ENEMY_UNIT",
      },
    ],
  },
  {
    id: "silverkeep-spell-03",
    name: "Silverkeep Fight",
    cost: 2,
    type: "spell",
    spellSpeed: "fast",
    archetype: "Silverkeep",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/46271408.jpg",
    description: "Deal 2 to an enemy unit.",
    effects: [{ type: "DEAL_DAMAGE", amount: 2, target: "ENEMY_UNIT" }],
  },
  {
    id: "silverkeep-spell-04",
    name: "Silverkeep Vector",
    cost: 3,
    type: "spell",
    spellSpeed: "slow",
    archetype: "Silverkeep",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/21623008.jpg",
    description: "Recall an enemy unit.",
    effects: [{ type: "RECALL_UNIT", target: "ENEMY_UNIT" }],
  },
  {
    id: "silverkeep-spell-05",
    name: "Silverkeep Landing",
    cost: 4,
    type: "spell",
    spellSpeed: "fast",
    archetype: "Silverkeep",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/25733157.jpg",
    description: "Summon a Silverkeep unit costing 3 or less from your deck.",
    effects: [
      {
        type: "SUMMON_FROM_DECK",
        archetype: "Silverkeep",
        cardTypes: ["unit"],
        maxCost: 3,
        target: "SELF",
      },
    ],
  },
  {
    id: "silverkeep-spell-06",
    name: "Silverkeep Aura!",
    cost: 5,
    type: "spell",
    spellSpeed: "slow",
    archetype: "Silverkeep",
    rarity: "epic",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/52340444.jpg",
    description: "Revive an allied unit.",
    effects: [
      { type: "REVIVE_CARD", target: "ALLY_GRAVEYARD", allowedTypes: ["UNIT"] },
    ],
  },
  {
    id: "silverkeep-spell-07",
    name: "Silverkeep Shark-hunt",
    cost: 6,
    type: "spell",
    spellSpeed: "slow",
    archetype: "Silverkeep",
    rarity: "epic",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/51227866.jpg",
    description: "Give an enemy -3|-3 this round.",
    effects: [
      {
        type: "DEBUFF_UNIT",
        attackDelta: -3,
        healthDelta: -3,
        duration: "THIS_ROUND",
        target: "ENEMY_UNIT",
      },
    ],
  },
  {
    id: "silverkeep-spell-08",
    name: "Silverkeep Engage",
    cost: 7,
    type: "spell",
    spellSpeed: "slow",
    archetype: "Silverkeep",
    rarity: "legendary",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/9726840.jpg",
    description: "Deal 3 to all active enemies.",
    effects: [{ type: "BURN_ACTIVE_ENEMIES", amount: 3, target: "ENEMY_UNIT" }],
  },
  {
    id: "emberwing-retinue-unit-01",
    name: "Emberwing Retinue Chamber",
    cost: 1,
    type: "unit",
    attack: 1,
    health: 2,
    archetype: "Emberwing Retinue",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/32600024.jpg",
    description: "Play: draw an Emberwing Retinue unit.",
    abilities: [
      {
        id: "emberwing-retinue-unit-01-draw",
        onPlay: !0,
        effects: [
          {
            type: "DRAW_CARD_BY_FILTER",
            count: 1,
            archetype: "Emberwing Retinue",
            cardType: "unit",
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "emberwing-retinue-unit-02",
    name: "Emberwing Retinue Kitchen",
    cost: 1,
    type: "unit",
    attack: 2,
    health: 1,
    archetype: "Emberwing Retinue",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/16960120.jpg",
    description: "Play: grant an ally +1|+0.",
    abilities: [
      {
        id: "emberwing-retinue-unit-02-buff",
        onPlay: !0,
        targets: [{ id: "target", kind: "ALLY_UNIT" }],
        effects: [
          {
            type: "BUFF_UNIT",
            attack: 1,
            health: 0,
            duration: "PERMANENT",
            target: "target",
          },
        ],
      },
    ],
  },
  {
    id: "emberwing-retinue-unit-03",
    name: "Emberwing Retinue Nurse",
    cost: 2,
    type: "unit",
    attack: 2,
    health: 2,
    archetype: "Emberwing Retinue",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/40398073.jpg",
    description: "When you play a card, I gain +1|+0 this round.",
    abilities: [
      {
        id: "emberwing-retinue-unit-03-recall-watch",
        when: { event: "CARD_PLAYED" },
        conditions: [{ type: "EVENT_PLAYER_IS", player: "SELF" }],
        effects: [
          {
            type: "BUFF_UNIT",
            attack: 1,
            health: 0,
            duration: "THIS_ROUND",
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "emberwing-retinue-unit-04",
    name: "Emberwing Retinue Parlor",
    cost: 2,
    type: "unit",
    attack: 1,
    health: 3,
    archetype: "Emberwing Retinue",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/88453933.jpg",
    description: "Play: restore 1 spell mana.",
    abilities: [
      {
        id: "emberwing-retinue-unit-04-mana",
        onPlay: !0,
        effects: [{ type: "RESTORE_SPELL_MANA", amount: 1, target: "SELF" }],
      },
    ],
  },
  {
    id: "emberwing-retinue-unit-05",
    name: "Emberwing Retinue Laudry",
    cost: 2,
    type: "unit",
    attack: 3,
    health: 1,
    archetype: "Emberwing Retinue",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/13171876.jpg",
    description: "Attack: grant me Quick Attack.",
    abilities: [
      {
        id: "emberwing-retinue-unit-05-quick",
        when: { event: "ATTACK_COMMITTED" },
        conditions: [
          { type: "EVENT_PLAYER_IS", player: "SELF" },
          { type: "SOURCE_IS_ATTACKING" },
        ],
        effects: [
          { type: "GRANT_KEYWORD", keyword: "QUICK_ATTACK", target: "SELF" },
        ],
      },
    ],
  },
  {
    id: "emberwing-retinue-unit-06",
    name: "Emberwing Retinue Cehrmba",
    cost: 3,
    type: "unit",
    attack: 2,
    health: 3,
    archetype: "Emberwing Retinue",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/12163590.jpg",
    description:
      "Play: summon an Emberwing Retinue unit costing 2 or less from your deck.",
    abilities: [
      {
        id: "emberwing-retinue-unit-06-summon",
        onPlay: !0,
        effects: [
          {
            type: "SUMMON_FROM_DECK",
            archetype: "Emberwing Retinue",
            cardTypes: ["unit"],
            maxCost: 2,
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "emberwing-retinue-unit-07",
    name: "Emberwing Retinue Ernus",
    cost: 3,
    type: "unit",
    attack: 3,
    health: 2,
    archetype: "Emberwing Retinue",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/76782778.jpg",
    description:
      "When you attack, grant a random combat ally +1|+0 this round.",
    abilities: [
      {
        id: "emberwing-retinue-unit-07-attack",
        when: { event: "ATTACK_COMMITTED" },
        conditions: [{ type: "EVENT_PLAYER_IS", player: "SELF" }],
        effects: [
          {
            type: "BUFF_UNIT",
            attack: 1,
            health: 0,
            duration: "THIS_ROUND",
            target: "RANDOM_ATTACKING_ALLY",
          },
        ],
      },
    ],
  },
  {
    id: "emberwing-retinue-unit-08",
    name: "Emberwing Retinue Lorpar",
    cost: 3,
    type: "unit",
    attack: 1,
    health: 4,
    archetype: "Emberwing Retinue",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/15848542.jpg",
    description: "Play: recall an ally to grant me +2|+2 this round.",
    abilities: [
      {
        id: "emberwing-retinue-unit-08-exchange",
        onPlay: !0,
        targets: [{ id: "target", kind: "ALLY_UNIT" }],
        effects: [
          { type: "RECALL_UNIT", target: "target" },
          {
            type: "BUFF_UNIT",
            attack: 2,
            health: 2,
            duration: "THIS_ROUND",
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "emberwing-retinue-unit-09",
    name: "Emberwing Retinue Nudyarl",
    cost: 4,
    type: "unit",
    attack: 3,
    health: 4,
    archetype: "Emberwing Retinue",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/49575521.jpg",
    description: "Round start: create a random Emberwing Retinue unit in hand.",
    abilities: [
      {
        id: "emberwing-retinue-unit-09-create",
        when: { event: "ROUND_STARTED" },
        effects: [
          {
            type: "CREATE_RANDOM_CARD",
            archetype: "Emberwing Retinue",
            cardType: "unit",
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "emberwing-retinue-unit-10",
    name: "Emberwing Retinue Tinkhec",
    cost: 4,
    type: "unit",
    attack: 4,
    health: 3,
    archetype: "Emberwing Retinue",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/42055234.jpg",
    description: "Attack: I gain +2|+0 this round.",
    abilities: [
      {
        id: "emberwing-retinue-unit-10-power",
        when: { event: "ATTACK_COMMITTED" },
        conditions: [
          { type: "EVENT_PLAYER_IS", player: "SELF" },
          { type: "SOURCE_IS_ATTACKING" },
        ],
        effects: [
          {
            type: "BUFF_UNIT",
            attack: 2,
            health: 0,
            duration: "THIS_ROUND",
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "emberwing-retinue-unit-11",
    name: "Emberwing Retinue ETC",
    cost: 4,
    type: "unit",
    attack: 2,
    health: 5,
    archetype: "Emberwing Retinue",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/7594154.jpg",
    description: "Play: grant an ally Barrier.",
    abilities: [
      {
        id: "emberwing-retinue-unit-11-barrier",
        onPlay: !0,
        targets: [{ id: "target", kind: "ALLY_UNIT" }],
        effects: [
          { type: "GRANT_KEYWORD", keyword: "BARRIER", target: "target" },
        ],
      },
    ],
  },
  {
    id: "emberwing-retinue-unit-12",
    name: "Emberwing Retinue Lady",
    cost: 5,
    type: "unit",
    attack: 4,
    health: 5,
    archetype: "Emberwing Retinue",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/48658295.jpg",
    description: "Round end: recall me and draw 1.",
    abilities: [
      {
        id: "emberwing-retinue-unit-12-return",
        when: { event: "ROUND_ENDED" },
        effects: [
          { type: "RECALL_UNIT", target: "SELF" },
          { type: "DRAW_CARD", count: 1, target: "SELF" },
        ],
      },
    ],
  },
  {
    id: "emberwing-retinue-unit-13",
    name: "Emberwing Retinue Atpool",
    cost: 5,
    type: "unit",
    attack: 5,
    health: 4,
    archetype: "Emberwing Retinue",
    rarity: "epic",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/96127902.jpg",
    description:
      "Play: summon an Emberwing Retinue unit costing 3 or less from hand or deck.",
    abilities: [
      {
        id: "emberwing-retinue-unit-13-deploy",
        onPlay: !0,
        effects: [
          {
            type: "SUMMON_FROM_HAND_OR_DECK",
            archetype: "Emberwing Retinue",
            cardTypes: ["unit"],
            maxCost: 3,
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "emberwing-retinue-unit-14",
    name: "Emberwing Retinue Renny",
    cost: 5,
    type: "unit",
    attack: 3,
    health: 6,
    archetype: "Emberwing Retinue",
    rarity: "epic",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/7656689.jpg",
    description: "Attack: deal 1 to the enemy Nexus.",
    abilities: [
      {
        id: "emberwing-retinue-unit-14-nexus",
        when: { event: "ATTACK_COMMITTED" },
        conditions: [
          { type: "EVENT_PLAYER_IS", player: "SELF" },
          { type: "SOURCE_IS_ATTACKING" },
        ],
        effects: [{ type: "DEAL_DAMAGE", amount: 1, target: "ENEMY_NEXUS" }],
      },
    ],
  },
  {
    id: "emberwing-retinue-unit-15",
    name: "Emberwing Retinue Verre",
    cost: 6,
    type: "unit",
    attack: 5,
    health: 6,
    archetype: "Emberwing Retinue",
    rarity: "epic",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/22623509.jpg",
    description: "Play: grant all active allies +1|+0 this round.",
    abilities: [
      {
        id: "emberwing-retinue-unit-15-formation",
        onPlay: !0,
        effects: [
          {
            type: "BUFF_ACTIVE_ALLIES",
            attack: 1,
            health: 0,
            duration: "THIS_ROUND",
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "emberwing-retinue-unit-16",
    name: "Emberwing Retinue Master Verre",
    cost: 6,
    type: "unit",
    attack: 6,
    health: 5,
    archetype: "Emberwing Retinue",
    rarity: "epic",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/21522601.jpg",
    description: "Play: deal 2 to an enemy and grant me Overwhelm.",
    abilities: [
      {
        id: "emberwing-retinue-unit-16-strike",
        onPlay: !0,
        targets: [{ id: "target", kind: "ENEMY_UNIT" }],
        effects: [
          { type: "DEAL_DAMAGE", amount: 2, target: "target" },
          { type: "GRANT_KEYWORD", keyword: "OVERWHELM", target: "SELF" },
        ],
      },
    ],
  },
  {
    id: "emberwing-retinue-unit-17",
    name: "Emberwing Retinue Extreme Verre",
    cost: 7,
    type: "unit",
    attack: 7,
    health: 7,
    archetype: "Emberwing Retinue",
    rarity: "legendary",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/33475154.jpg",
    description: "Round start: grant all active allies +1|+1 this round.",
    abilities: [
      {
        id: "emberwing-retinue-unit-17-matron",
        when: { event: "ROUND_STARTED" },
        effects: [
          {
            type: "BUFF_ACTIVE_ALLIES",
            attack: 1,
            health: 1,
            duration: "THIS_ROUND",
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "emberwing-retinue-unit-18",
    name: "Emberwing Retinue Miss Genni",
    cost: 8,
    type: "unit",
    attack: 8,
    health: 8,
    archetype: "Emberwing Retinue",
    rarity: "legendary",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/64756282.jpg",
    description:
      "Play: summon a Retinue unit costing 5 or less, then grant all allies +1|+0 this round.",
    abilities: [
      {
        id: "emberwing-retinue-unit-18-boss",
        onPlay: !0,
        effects: [
          {
            type: "SUMMON_FROM_HAND_OR_DECK",
            archetype: "Emberwing Retinue",
            cardTypes: ["unit"],
            maxCost: 5,
            target: "SELF",
          },
          {
            type: "BUFF_ACTIVE_ALLIES",
            attack: 1,
            health: 0,
            duration: "THIS_ROUND",
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "emberwing-retinue-champion-1",
    name: "Emberwing Retinue Master Relliona",
    cost: 4,
    type: "champion",
    attack: 3,
    health: 4,
    archetype: "Emberwing Retinue",
    rarity: "champion",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/72498838.jpg",
    description: "Level up after 2 this champion struck.",
    level: 1,
    championId: "emberwing-retinue-champion-1",
    levelUpCondition: { type: "THIS_CHAMPION_STRUCK", threshold: 2 },
    level2CardCode: "emberwing-retinue-champion-1-lv2",
    abilities: [
      {
        id: "emberwing-retinue-champion-1-lv1-attack",
        when: { event: "ATTACK_COMMITTED" },
        conditions: [
          { type: "EVENT_PLAYER_IS", player: "SELF" },
          { type: "SOURCE_IS_ATTACKING" },
        ],
        effects: [
          {
            type: "BUFF_ACTIVE_ALLIES",
            attack: 1,
            health: 0,
            duration: "THIS_ROUND",
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "emberwing-retinue-champion-1-lv2",
    name: "Emberwing Retinue Master Relliona, Ascended",
    cost: 4,
    type: "champion",
    attack: 5,
    health: 6,
    archetype: "Emberwing Retinue",
    rarity: "champion",
    collectible: !1,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/74689476.jpg",
    description: "Leveled form of Rhea, Hearthwing Headmaid.",
    level: 2,
    championId: "emberwing-retinue-champion-1",
    abilities: [
      {
        id: "emberwing-retinue-champion-1-lv2-attack",
        when: { event: "ATTACK_COMMITTED" },
        conditions: [
          { type: "EVENT_PLAYER_IS", player: "SELF" },
          { type: "SOURCE_IS_ATTACKING" },
        ],
        effects: [
          {
            type: "BUFF_ACTIVE_ALLIES",
            attack: 2,
            health: 1,
            duration: "THIS_ROUND",
            target: "SELF",
          },
          { type: "DEAL_DAMAGE", amount: 1, target: "ENEMY_NEXUS" },
        ],
      },
    ],
  },
  {
    id: "emberwing-retinue-champion-2",
    name: "Emberwing Retinue Housekeeper",
    cost: 5,
    type: "champion",
    attack: 4,
    health: 5,
    archetype: "Emberwing Retinue",
    rarity: "champion",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/41232647.jpg",
    description: "Level up after 8 nexus damage dealt.",
    level: 1,
    championId: "emberwing-retinue-champion-2",
    levelUpCondition: { type: "NEXUS_DAMAGE_DEALT", threshold: 8 },
    level2CardCode: "emberwing-retinue-champion-2-lv2",
    abilities: [
      {
        id: "emberwing-retinue-champion-2-lv1-attack",
        when: { event: "ATTACK_COMMITTED" },
        conditions: [
          { type: "EVENT_PLAYER_IS", player: "SELF" },
          { type: "SOURCE_IS_ATTACKING" },
        ],
        effects: [
          {
            type: "BUFF_ACTIVE_ALLIES",
            attack: 1,
            health: 0,
            duration: "THIS_ROUND",
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "emberwing-retinue-champion-2-lv2",
    name: "Emberwing Retinue Housekeeper Dragon Form",
    cost: 5,
    type: "champion",
    attack: 6,
    health: 7,
    archetype: "Emberwing Retinue",
    rarity: "champion",
    collectible: !1,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/24799107.jpg",
    description: "Leveled form of Emberwing Retinue Housekeeper.",
    level: 2,
    championId: "emberwing-retinue-champion-2",
    abilities: [
      {
        id: "emberwing-retinue-champion-2-lv2-attack",
        when: { event: "ATTACK_COMMITTED" },
        conditions: [
          { type: "EVENT_PLAYER_IS", player: "SELF" },
          { type: "SOURCE_IS_ATTACKING" },
        ],
        effects: [
          {
            type: "BUFF_ACTIVE_ALLIES",
            attack: 2,
            health: 1,
            duration: "THIS_ROUND",
            target: "SELF",
          },
          { type: "DEAL_DAMAGE", amount: 1, target: "ENEMY_NEXUS" },
        ],
      },
    ],
  },
  {
    id: "emberwing-retinue-spell-01",
    name: "Emberwing Retinue Send-off",
    cost: 1,
    type: "spell",
    spellSpeed: "burst",
    archetype: "Emberwing Retinue",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/15754711.jpg",
    description: "Grant an ally +1|+1 this round.",
    effects: [
      {
        type: "BUFF_UNIT",
        attack: 1,
        health: 1,
        duration: "THIS_ROUND",
        target: "ALLY_UNIT",
      },
    ],
  },
  {
    id: "emberwing-retinue-spell-02",
    name: "Emberwing Retinue Change-off",
    cost: 2,
    type: "spell",
    spellSpeed: "fast",
    archetype: "Emberwing Retinue",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/40110009.jpg",
    description: "Recall an ally and draw 1.",
    effects: [
      { type: "RECALL_UNIT", target: "ALLY_UNIT" },
      { type: "DRAW_CARD", count: 1, target: "SELF" },
    ],
  },
  {
    id: "emberwing-retinue-spell-03",
    name: "Emberwing Retinue Call-party",
    cost: 2,
    type: "spell",
    spellSpeed: "fast",
    archetype: "Emberwing Retinue",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/78231355.jpg",
    description: "Draw an Emberwing Retinue unit.",
    effects: [
      {
        type: "DRAW_CARD_BY_FILTER",
        count: 1,
        archetype: "Emberwing Retinue",
        cardType: "unit",
        target: "SELF",
      },
    ],
  },
  {
    id: "emberwing-retinue-spell-04",
    name: "Emberwing Retinue Downtime",
    cost: 3,
    type: "spell",
    spellSpeed: "slow",
    archetype: "Emberwing Retinue",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/77515704.jpg",
    description: "Grant an ally Quick Attack.",
    effects: [
      { type: "GRANT_KEYWORD", keyword: "QUICK_ATTACK", target: "ALLY_UNIT" },
    ],
  },
  {
    id: "emberwing-retinue-spell-05",
    name: "Emberwing Retinue Prepare",
    cost: 4,
    type: "spell",
    spellSpeed: "fast",
    archetype: "Emberwing Retinue",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/57416183.jpg",
    description:
      "Summon an Emberwing Retinue unit costing 3 or less from hand or deck.",
    effects: [
      {
        type: "SUMMON_FROM_HAND_OR_DECK",
        archetype: "Emberwing Retinue",
        cardTypes: ["unit"],
        maxCost: 3,
        target: "SELF",
      },
    ],
  },
  {
    id: "emberwing-retinue-spell-06",
    name: "Emberwing Retinue Welcome",
    cost: 5,
    type: "spell",
    spellSpeed: "slow",
    archetype: "Emberwing Retinue",
    rarity: "epic",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/14625090.jpg",
    description: "Grant all active allies +2|+0 this round.",
    effects: [
      {
        type: "BUFF_ACTIVE_ALLIES",
        attack: 2,
        health: 0,
        duration: "THIS_ROUND",
        target: "SELF",
      },
    ],
  },
  {
    id: "emberwing-retinue-spell-07",
    name: "The Manor Takes Flight",
    cost: 6,
    type: "spell",
    spellSpeed: "slow",
    archetype: "Emberwing Retinue",
    rarity: "epic",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/35098357.jpg",
    description: "Deal 3 to an enemy unit.",
    effects: [{ type: "DEAL_DAMAGE", amount: 3, target: "ENEMY_UNIT" }],
  },
  {
    id: "emberwing-retinue-spell-08",
    name: "Emberwing Retinue FInally",
    cost: 7,
    type: "spell",
    spellSpeed: "slow",
    archetype: "Emberwing Retinue",
    rarity: "legendary",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/83301414.jpg",
    description:
      "Summon a Retinue unit costing 5 or less and grant all allies +1|+1 this round.",
    effects: [
      {
        type: "SUMMON_FROM_HAND_OR_DECK",
        archetype: "Emberwing Retinue",
        cardTypes: ["unit"],
        maxCost: 5,
        target: "SELF",
      },
      {
        type: "BUFF_ACTIVE_ALLIES",
        attack: 1,
        health: 1,
        duration: "THIS_ROUND",
        target: "SELF",
      },
    ],
  },
  {
    id: "verdant-covenant-unit-01",
    name: "Albaz exapatisIA",
    cost: 1,
    type: "unit",
    attack: 1,
    health: 2,
    archetype: "Albaz",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/44716748.jpg",
    description: "Play: heal your Nexus 1.",
    abilities: [
      {
        id: "verdant-covenant-unit-01-heal",
        onPlay: !0,
        effects: [{ type: "HEAL", amount: 1, target: "ALLY_NEXUS" }],
      },
    ],
  },
  {
    id: "verdant-covenant-unit-02",
    name: "Albaz tromarIA",
    cost: 1,
    type: "unit",
    attack: 2,
    health: 1,
    archetype: "Albaz",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/29570824.jpg",
    description: "Play: heal an ally 2.",
    abilities: [
      {
        id: "verdant-covenant-unit-02-heal-unit",
        onPlay: !0,
        targets: [{ id: "target", kind: "ALLY_UNIT" }],
        effects: [{ type: "HEAL", amount: 2, target: "target" }],
      },
    ],
  },
  {
    id: "verdant-covenant-unit-03",
    name: "Albaz alazoneIA",
    cost: 2,
    type: "unit",
    attack: 2,
    health: 2,
    archetype: "Albaz",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/92171126.jpg",
    description: "When an allied unit is healed, I gain +1|+0 this round.",
    abilities: [
      {
        id: "verdant-covenant-unit-03-heal-watch",
        when: { event: "UNIT_HEALED" },
        conditions: [{ type: "EVENT_PLAYER_IS", player: "SELF" }],
        effects: [
          {
            type: "BUFF_UNIT",
            attack: 1,
            health: 0,
            duration: "THIS_ROUND",
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "verdant-covenant-unit-04",
    name: "Albaz oknirIA",
    cost: 2,
    type: "unit",
    attack: 1,
    health: 3,
    archetype: "Albaz",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/55965529.jpg",
    description: "Round start: heal your Nexus 1.",
    abilities: [
      {
        id: "verdant-covenant-unit-04-round-heal",
        when: { event: "ROUND_STARTED" },
        effects: [{ type: "HEAL", amount: 1, target: "ALLY_NEXUS" }],
      },
    ],
  },
  {
    id: "verdant-covenant-unit-05",
    name: "Albaz Uiazzzz",
    cost: 2,
    type: "unit",
    attack: 3,
    health: 1,
    archetype: "Albaz",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/56187077.jpg",
    description: "Play: grant a damaged ally +1|+1.",
    abilities: [
      {
        id: "verdant-covenant-unit-05-growth",
        onPlay: !0,
        targets: [{ id: "target", kind: "ALLY_UNIT" }],
        effects: [
          {
            type: "BUFF_UNIT",
            attack: 1,
            health: 1,
            duration: "PERMANENT",
            target: "target",
          },
        ],
      },
    ],
  },
  {
    id: "verdant-covenant-unit-06",
    name: "Albaz Unit MAR",
    cost: 3,
    type: "unit",
    attack: 2,
    health: 3,
    archetype: "Albaz",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/54842941.jpg",
    description: "When you cast a spell, heal me 1.",
    abilities: [
      {
        id: "verdant-covenant-unit-06-spell-heal",
        when: { event: "SPELL_CAST" },
        conditions: [{ type: "EVENT_PLAYER_IS", player: "SELF" }],
        effects: [{ type: "HEAL", amount: 1, target: "SELF" }],
      },
    ],
  },
  {
    id: "verdant-covenant-unit-07",
    name: "Albaz Unit COMBINE",
    cost: 3,
    type: "unit",
    attack: 3,
    health: 2,
    archetype: "Albaz",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/54842941.jpg",
    description: "Play: draw a Albaz spell.",
    abilities: [
      {
        id: "verdant-covenant-unit-07-draw",
        onPlay: !0,
        effects: [
          {
            type: "DRAW_CARD_BY_FILTER",
            count: 1,
            archetype: "Albaz",
            cardType: "spell",
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "verdant-covenant-unit-08",
    name: "Albaz Unit XOR",
    cost: 3,
    type: "unit",
    attack: 1,
    health: 4,
    archetype: "Albaz",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/82359538.jpg",
    description: "When an ally is healed, grant it +0|+1.",
    abilities: [
      {
        id: "verdant-covenant-unit-08-bless",
        when: { event: "UNIT_HEALED" },
        conditions: [{ type: "EVENT_PLAYER_IS", player: "SELF" }],
        effects: [
          {
            type: "BUFF_UNIT",
            attack: 0,
            health: 1,
            duration: "PERMANENT",
            target: "EVENT_UNIT",
          },
        ],
      },
    ],
  },
  {
    id: "verdant-covenant-unit-09",
    name: "Albaz Unit NOR",
    cost: 4,
    type: "unit",
    attack: 3,
    health: 4,
    archetype: "Albaz",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/71801447.jpg",
    description: "Round start: if your Nexus is below 15 health, draw 1.",
    abilities: [
      {
        id: "verdant-covenant-unit-09-low-health",
        when: { event: "ROUND_STARTED" },
        conditions: [
          { type: "NEXUS_HEALTH_BELOW", player: "SELF", amount: 15 },
        ],
        effects: [{ type: "DRAW_CARD", count: 1, target: "SELF" }],
      },
    ],
  },
  {
    id: "verdant-covenant-unit-10",
    name: "Albaz Unit AND",
    cost: 4,
    type: "unit",
    attack: 4,
    health: 3,
    archetype: "Albaz",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/81237046.jpg",
    description: "Play: heal your Nexus 2 and grant me Barrier.",
    abilities: [
      {
        id: "verdant-covenant-unit-10-barrier",
        onPlay: !0,
        effects: [
          { type: "HEAL", amount: 2, target: "ALLY_NEXUS" },
          { type: "GRANT_KEYWORD", keyword: "BARRIER", target: "SELF" },
        ],
      },
    ],
  },
  {
    id: "verdant-covenant-unit-11",
    name: "Albaz Unit STEAL",
    cost: 4,
    type: "unit",
    attack: 2,
    health: 5,
    archetype: "Albaz",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/13073850.jpg",
    description: "When an ally is healed, grant me +1|+1 this round.",
    abilities: [
      {
        id: "verdant-covenant-unit-11-rose",
        when: { event: "UNIT_HEALED" },
        conditions: [{ type: "EVENT_PLAYER_IS", player: "SELF" }],
        effects: [
          {
            type: "BUFF_UNIT",
            attack: 1,
            health: 1,
            duration: "THIS_ROUND",
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "verdant-covenant-unit-12",
    name: "Albaz HELIX",
    cost: 5,
    type: "unit",
    attack: 4,
    health: 5,
    archetype: "Albaz",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/37991342.jpg",
    description: "Play: revive an allied unit from your graveyard.",
    abilities: [
      {
        id: "verdant-covenant-unit-12-revive",
        onPlay: !0,
        targets: [{ id: "target", kind: "ALLY_GRAVEYARD" }],
        effects: [
          { type: "REVIVE_CARD", target: "target", allowedTypes: ["UNIT"] },
        ],
      },
    ],
  },
  {
    id: "verdant-covenant-unit-13",
    name: "Albaz Unit MONOLITH",
    cost: 5,
    type: "unit",
    attack: 5,
    health: 4,
    archetype: "Albaz",
    rarity: "epic",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/51194046.jpg",
    description: "Round start: heal all active allies 1.",
    abilities: [
      {
        id: "verdant-covenant-unit-13-heal-all",
        when: { event: "ROUND_STARTED" },
        effects: [
          {
            type: "BUFF_ACTIVE_ALLIES",
            attack: 0,
            health: 1,
            duration: "THIS_ROUND",
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "verdant-covenant-unit-14",
    name: "Albaz Unit DISK",
    cost: 5,
    type: "unit",
    attack: 3,
    health: 6,
    archetype: "Albaz",
    rarity: "epic",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/64496451.jpg",
    description: "Play: heal an ally 3 and grant it Tough.",
    abilities: [
      {
        id: "verdant-covenant-unit-14-tough",
        onPlay: !0,
        targets: [{ id: "target", kind: "ALLY_UNIT" }],
        effects: [
          { type: "HEAL", amount: 3, target: "target" },
          { type: "GRANT_KEYWORD", keyword: "TOUGH", target: "target" },
        ],
      },
    ],
  },
  {
    id: "verdant-covenant-unit-15",
    name: "Albaz Unit SCOUT",
    cost: 6,
    type: "unit",
    attack: 5,
    health: 6,
    archetype: "Albaz",
    rarity: "epic",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/65518099.jpg",
    description: "Round end: heal your Nexus 2.",
    abilities: [
      {
        id: "verdant-covenant-unit-15-sanctuary",
        when: { event: "ROUND_ENDED" },
        effects: [{ type: "HEAL", amount: 2, target: "ALLY_NEXUS" }],
      },
    ],
  },
  {
    id: "verdant-covenant-unit-16",
    name: "Albaz Unit SHELL",
    cost: 6,
    type: "unit",
    attack: 6,
    health: 5,
    archetype: "Albaz",
    rarity: "epic",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/90885155.jpg",
    description:
      "When you cast your second spell each round, grant all allies +1|+1 this round.",
    abilities: [
      {
        id: "verdant-covenant-unit-16-bloom",
        when: { event: "SPELL_CAST" },
        conditions: [
          { type: "EVENT_PLAYER_IS", player: "SELF" },
          { type: "SPELLS_CAST_THIS_ROUND_AT_LEAST", count: 2 },
        ],
        effects: [
          {
            type: "BUFF_ACTIVE_ALLIES",
            attack: 1,
            health: 1,
            duration: "THIS_ROUND",
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "verdant-covenant-unit-17",
    name: "Albaz Unit CARIER",
    cost: 7,
    type: "unit",
    attack: 7,
    health: 7,
    archetype: "Albaz",
    rarity: "legendary",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/91907707.jpg",
    description: "Round start: heal your Nexus 3 and create a Albaz spell.",
    abilities: [
      {
        id: "verdant-covenant-unit-17-worldroot",
        when: { event: "ROUND_STARTED" },
        effects: [
          { type: "HEAL", amount: 3, target: "ALLY_NEXUS" },
          {
            type: "CREATE_RANDOM_CARD",
            archetype: "Albaz",
            cardType: "spell",
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "verdant-covenant-unit-18",
    name: "Albaz Unit HUNTER",
    cost: 8,
    type: "unit",
    attack: 8,
    health: 8,
    archetype: "Albaz",
    rarity: "legendary",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/87588741.jpg",
    description:
      "Play: heal your Nexus 4 and grant all active allies +1|+2 this round.",
    abilities: [
      {
        id: "verdant-covenant-unit-18-boss",
        onPlay: !0,
        effects: [
          { type: "HEAL", amount: 4, target: "ALLY_NEXUS" },
          {
            type: "BUFF_ACTIVE_ALLIES",
            attack: 1,
            health: 2,
            duration: "THIS_ROUND",
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "verdant-covenant-champion-1",
    name: "Albaz TOWER",
    cost: 4,
    type: "champion",
    attack: 3,
    health: 4,
    archetype: "Albaz",
    rarity: "champion",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/27279764.jpg",
    description: "Level up after 4 spells cast.",
    level: 1,
    championId: "verdant-covenant-champion-1",
    levelUpCondition: { type: "SPELLS_CAST", threshold: 4 },
    level2CardCode: "verdant-covenant-champion-1-lv2",
    abilities: [
      {
        id: "verdant-covenant-champion-1-lv1-spell",
        when: { event: "SPELL_CAST" },
        conditions: [{ type: "EVENT_PLAYER_IS", player: "SELF" }],
        effects: [{ type: "HEAL", amount: 1, target: "ALLY_NEXUS" }],
      },
    ],
  },
  {
    id: "verdant-covenant-champion-1-lv2",
    name: "Albaz TOWER, Ascended",
    cost: 4,
    type: "champion",
    attack: 5,
    health: 6,
    archetype: "Albaz",
    rarity: "champion",
    collectible: !1,
    imageUrl:
      "https://images.ygoprodeck.com/images/cards_cropped/27279764.jpg0",
    description: "Leveled form of Albaz TOWER.",
    level: 2,
    championId: "verdant-covenant-champion-1",
    abilities: [
      {
        id: "verdant-covenant-champion-1-lv2-spell",
        when: { event: "SPELL_CAST" },
        conditions: [{ type: "EVENT_PLAYER_IS", player: "SELF" }],
        effects: [
          { type: "HEAL", amount: 2, target: "ALLY_NEXUS" },
          {
            type: "BUFF_ACTIVE_ALLIES",
            attack: 1,
            health: 1,
            duration: "THIS_ROUND",
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "verdant-covenant-champion-2",
    name: "Albaz BASE",
    cost: 5,
    type: "champion",
    attack: 4,
    health: 5,
    archetype: "Albaz",
    rarity: "champion",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/40061558.jpg",
    description: "Level up after 2 this champion struck.",
    level: 1,
    championId: "verdant-covenant-champion-2",
    levelUpCondition: { type: "THIS_CHAMPION_STRUCK", threshold: 2 },
    level2CardCode: "verdant-covenant-champion-2-lv2",
    abilities: [
      {
        id: "verdant-covenant-champion-2-lv1-spell",
        when: { event: "SPELL_CAST" },
        conditions: [{ type: "EVENT_PLAYER_IS", player: "SELF" }],
        effects: [{ type: "HEAL", amount: 1, target: "ALLY_NEXUS" }],
      },
    ],
  },
  {
    id: "verdant-covenant-champion-2-lv2",
    name: "Albaz BASE, Ascended",
    cost: 5,
    type: "champion",
    attack: 6,
    health: 7,
    archetype: "Albaz",
    rarity: "champion",
    collectible: !1,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/40061558.jpg",
    description: "Leveled form of Albaz BASE.",
    level: 2,
    championId: "verdant-covenant-champion-2",
    abilities: [
      {
        id: "verdant-covenant-champion-2-lv2-spell",
        when: { event: "SPELL_CAST" },
        conditions: [{ type: "EVENT_PLAYER_IS", player: "SELF" }],
        effects: [
          { type: "HEAL", amount: 2, target: "ALLY_NEXUS" },
          {
            type: "BUFF_ACTIVE_ALLIES",
            attack: 1,
            health: 1,
            duration: "THIS_ROUND",
            target: "SELF",
          },
        ],
      },
    ],
  },
  {
    id: "verdant-covenant-spell-01",
    name: "Albaz Spell GATE",
    cost: 1,
    type: "spell",
    spellSpeed: "burst",
    archetype: "Albaz",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/20426907.jpg",
    description: "Heal your Nexus 2.",
    effects: [{ type: "HEAL", amount: 2, target: "ALLY_NEXUS" }],
  },
  {
    id: "verdant-covenant-spell-02",
    name: "Albaz Spell SOUL",
    cost: 2,
    type: "spell",
    spellSpeed: "fast",
    archetype: "Albaz",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/17639150.jpg",
    description: "Heal an ally 3.",
    effects: [{ type: "HEAL", amount: 3, target: "ALLY_UNIT" }],
  },
  {
    id: "verdant-covenant-spell-03",
    name: "Albaz Spell END",
    cost: 2,
    type: "spell",
    spellSpeed: "fast",
    archetype: "Albaz",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/20447641.jpg",
    description: "Grant an ally +1|+2 this round.",
    effects: [
      {
        type: "BUFF_UNIT",
        attack: 1,
        health: 2,
        duration: "THIS_ROUND",
        target: "ALLY_UNIT",
      },
    ],
  },
  {
    id: "verdant-covenant-spell-04",
    name: "Albaz Spell SEED",
    cost: 3,
    type: "spell",
    spellSpeed: "slow",
    archetype: "Albaz",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/30845999.jpg",
    description: "Heal your Nexus 3 and draw 1.",
    effects: [
      { type: "HEAL", amount: 3, target: "ALLY_NEXUS" },
      { type: "DRAW_CARD", count: 1, target: "SELF" },
    ],
  },
  {
    id: "verdant-covenant-spell-05",
    name: "Albaz Spell DESTRUCTION",
    cost: 4,
    type: "spell",
    spellSpeed: "fast",
    archetype: "Albaz",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/43034264.jpg",
    description: "Grant an ally +2|+2 and Tough this round.",
    effects: [
      {
        type: "BUFF_UNIT",
        attack: 2,
        health: 2,
        duration: "THIS_ROUND",
        target: "ALLY_UNIT",
      },
      { type: "GRANT_KEYWORD", keyword: "TOUGH", target: "ALLY_UNIT" },
    ],
  },
  {
    id: "verdant-covenant-spell-06",
    name: "Albaz Spell DARKNESS",
    cost: 5,
    type: "spell",
    spellSpeed: "slow",
    archetype: "Albaz",
    rarity: "epic",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/22423493.jpg",
    description: "Heal all active allies through +0|+2 this round.",
    effects: [
      {
        type: "BUFF_ACTIVE_ALLIES",
        attack: 0,
        health: 2,
        duration: "THIS_ROUND",
        target: "SELF",
      },
    ],
  },
  {
    id: "verdant-covenant-spell-07",
    name: "Albaz Spell RISE",
    cost: 6,
    type: "spell",
    spellSpeed: "slow",
    archetype: "Albaz",
    rarity: "epic",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/4450854.jpg",
    description: "Revive an allied unit and heal your Nexus 2.",
    effects: [
      { type: "REVIVE_CARD", target: "ALLY_GRAVEYARD", allowedTypes: ["UNIT"] },
      { type: "HEAL", amount: 2, target: "ALLY_NEXUS" },
    ],
  },
  {
    id: "verdant-covenant-spell-08",
    name: "Albaz Spell COUNTER",
    cost: 7,
    type: "spell",
    spellSpeed: "slow",
    archetype: "Albaz",
    rarity: "legendary",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/80015408.jpg",
    description:
      "Heal your Nexus 5 and grant all active allies +2|+2 this round.",
    effects: [
      { type: "HEAL", amount: 5, target: "ALLY_NEXUS" },
      {
        type: "BUFF_ACTIVE_ALLIES",
        attack: 2,
        health: 2,
        duration: "THIS_ROUND",
        target: "SELF",
      },
    ],
  },
  {
    id: "neutral-unit-01",
    name: "Wandering Squire",
    cost: 1,
    type: "unit",
    attack: 1,
    health: 2,
    archetype: "none",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/15582767.jpg",
    description: "Play: restore 1 spell mana.",
    abilities: [
      {
        id: "neutral-unit-01-mana",
        onPlay: !0,
        effects: [{ type: "RESTORE_SPELL_MANA", amount: 1, target: "SELF" }],
      },
    ],
  },
  {
    id: "neutral-unit-02",
    name: "Gift CARD",
    cost: 2,
    type: "unit",
    attack: 2,
    health: 2,
    archetype: "none",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/39526584.jpg",
    description: "Play: heal your Nexus 1.",
    abilities: [
      {
        id: "neutral-unit-02-heal",
        onPlay: !0,
        effects: [{ type: "HEAL", amount: 1, target: "ALLY_NEXUS" }],
      },
    ],
  },
  {
    id: "neutral-unit-03",
    name: "Roadside Scholar",
    cost: 3,
    type: "unit",
    attack: 2,
    health: 3,
    archetype: "none",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/71818935.jpg",
    description: "Play: draw 1.",
    abilities: [
      {
        id: "neutral-unit-03-draw",
        onPlay: !0,
        effects: [{ type: "DRAW_CARD", count: 1, target: "SELF" }],
      },
    ],
  },
  {
    id: "neutral-unit-04",
    name: "Ironclad Mercenary",
    cost: 4,
    type: "unit",
    attack: 4,
    health: 4,
    archetype: "none",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/98127546.jpg",
    description: "Tough.",
  },
  {
    id: "neutral-unit-05",
    name: "Veteran Vanguard",
    cost: 5,
    type: "unit",
    attack: 5,
    health: 5,
    archetype: "none",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/12171659.jpg",
    description: "Play: give an ally +1|+1 this round.",
    abilities: [
      {
        id: "neutral-unit-05-buff",
        onPlay: !0,
        targets: [{ id: "target", kind: "ALLY_UNIT" }],
        effects: [
          {
            type: "BUFF_UNIT",
            attack: 1,
            health: 1,
            duration: "THIS_ROUND",
            target: "target",
          },
        ],
      },
    ],
  },
  {
    id: "neutral-spell-01",
    name: "Quick Mend",
    cost: 1,
    type: "spell",
    spellSpeed: "burst",
    archetype: "none",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/34541863.jpg",
    description: "Heal an ally 2.",
    effects: [{ type: "HEAL", amount: 2, target: "ALLY_UNIT" }],
  },
  {
    id: "neutral-spell-02",
    name: "Battle Trick",
    cost: 2,
    type: "spell",
    spellSpeed: "burst",
    archetype: "none",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/64163367.jpg",
    description: "Give an ally +2|+0 this round.",
    effects: [
      {
        type: "BUFF_UNIT",
        attack: 2,
        health: 0,
        duration: "THIS_ROUND",
        target: "ALLY_UNIT",
      },
    ],
  },
  {
    id: "neutral-spell-03",
    name: "Arcane Insight",
    cost: 3,
    type: "spell",
    spellSpeed: "slow",
    archetype: "none",
    rarity: "common",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/33503878.jpg",
    description: "Draw 2.",
    effects: [{ type: "DRAW_CARD", count: 2, target: "SELF" }],
  },
  {
    id: "neutral-spell-04",
    name: "Repulse",
    cost: 4,
    type: "spell",
    spellSpeed: "fast",
    archetype: "none",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/23784496.jpg",
    description: "Recall an enemy unit.",
    effects: [{ type: "RECALL_UNIT", target: "ENEMY_UNIT" }],
  },
  {
    id: "neutral-spell-05",
    name: "Final Spark",
    cost: 5,
    type: "spell",
    spellSpeed: "slow",
    archetype: "none",
    rarity: "rare",
    collectible: !0,
    imageUrl: "https://images.ygoprodeck.com/images/cards_cropped/34838437.jpg",
    description: "Deal 4 to an enemy unit.",
    effects: [{ type: "DEAL_DAMAGE", amount: 4, target: "ENEMY_UNIT" }],
  },
];
var ne = new Map();
for (let e of [...ht]) ie(e);
function Et(e) {
  if (e !== "unit" && e !== "spell" && e !== "champion")
    throw new s(`Invalid card type: ${e}`);
}
function _t(e) {
  if (e !== void 0 && e !== "burst" && e !== "fast" && e !== "slow")
    throw new s(`Invalid spell speed: ${e}`);
}
function ie(e) {
  (Et(e.type), _t(e.spellSpeed));
  let t = xr(e);
  return (ne.set(t.id, t), t);
}
function N(e) {
  let t = ne.get(e);
  if (!t) throw new s(`Card definition not found: ${e}`);
  return t;
}
function Y(e) {
  return ne.has(e);
}
function be() {
  return [...ne.values()];
}
function xr(e) {
  (Et(e.type), _t(e.spellSpeed));
  let t = e.abilities ?? [],
    r = Hr(e.triggers ?? [], t);
  return {
    ...e,
    spellSpeed: e.type === "spell" ? (e.spellSpeed ?? "slow") : e.spellSpeed,
    abilities: [...t, ...r],
    triggers: void 0,
  };
}
function Hr(e, t) {
  let r = new Set(t.map((a) => a.id));
  return e
    .filter((a) => {
      let n = ft(a.id);
      return !r.has(a.id) && !r.has(n);
    })
    .map((a) => ({
      id: ft(a.id),
      when: { event: a.event },
      runtimeCondition: a.condition,
      effects: a.effects,
    }));
}
function ft(e) {
  return `legacy-trigger:${e}`;
}
function x(e) {
  return e ? e.type === "champion" : !1;
}
function $(e) {
  return e.type === "unit" || e.type === "champion";
}
function oe(e, t, r) {
  let a = typeof e == "string" ? e : ie(e).id;
  return { instanceId: r, cardId: a, ownerId: t };
}
function L(e) {
  let t = g(e);
  if (!$(t)) throw new s("Only unit or champion cards can become units.");
  let r = At(t.attack, "attack"),
    a = At(t.health, "health");
  return {
    instanceId: e.instanceId,
    cardId: t.id,
    ownerId: e.ownerId,
    attack: r,
    maxHealth: a,
    damage: 0,
    keywords: [...(t.keywords ?? [])],
    temporaryKeywords: [],
    modifiers: [],
    exhausted: !1,
    boardRow: "WAITING",
    attacking: !1,
  };
}
function g(e) {
  return N(e.cardId);
}
function R(e) {
  return N(e.cardId);
}
function P(e) {
  return Math.max(
    0,
    e.attack + e.modifiers.reduce((t, r) => t + r.attackDelta, 0),
  );
}
function Br(e) {
  return Math.max(
    0,
    e.maxHealth + e.modifiers.reduce((t, r) => t + r.healthDelta, 0),
  );
}
function T(e) {
  return Br(e) - e.damage;
}
function At(e, t) {
  if (e === void 0) throw new s(`Unit requires ${t}.`);
  return e;
}
var S = ["P1", "P2"],
  Re = 20,
  bt = 10,
  Rt = 3,
  vt = 4,
  M = 6,
  Q = 6;
function Ut(e, t) {
  if (e.winnerId) throw new s("Cannot apply actions after the game is won.");
  if (t.type !== "START_GAME" && !e.started)
    throw new s("Game has not started.");
  if (
    e.phase === "DISCARD" &&
    t.type !== "DISCARD_CARD" &&
    t.type !== "TIME_OUT" &&
    t.type !== "SURRENDER"
  )
    throw new s("Discard cards until your hand has 6 cards.");
  if (
    e.pendingChoice &&
    t.type !== "SUBMIT_ABILITY_TARGETS" &&
    t.type !== "CANCEL_PENDING_CHOICE" &&
    t.type !== "TIME_OUT" &&
    t.type !== "SURRENDER"
  )
    throw new s("Resolve the pending ability choice first.");
  switch (t.type) {
    case "START_GAME":
      if (e.started) throw new s("Game has already started.");
      if (t.firstPlayerId && !kt(t.firstPlayerId))
        throw new s("Invalid first player.");
      return;
    case "DRAW_CARD":
      if ((H(t.playerId), (t.count ?? 1) < 1))
        throw new s("Draw count must be positive.");
      return;
    case "DISCARD_CARD":
      Kr(e, t.playerId, t.cardInstanceId);
      return;
    case "START_ROUND":
      D(e, "ACTION");
      return;
    case "PLAY_UNIT":
      (D(e, "ACTION"),
        C(e, t.playerId),
        jr(e.players[t.playerId], t.replaceUnitId),
        Wr(e, t.playerId, t.cardInstanceId),
        Tt(
          e,
          t.playerId,
          g(q(e, t.playerId, t.cardInstanceId)),
          t.costTargets,
        ));
      return;
    case "PLAY_SPELL":
      (D(e, "ACTION"),
        C(e, t.playerId),
        zr(e, t.playerId, t.cardInstanceId, t.target),
        Tt(
          e,
          t.playerId,
          g(q(e, t.playerId, t.cardInstanceId)),
          t.costTargets,
        ));
      return;
    case "SUBMIT_ABILITY_TARGETS":
      St(e, t.playerId);
      return;
    case "CANCEL_PENDING_CHOICE":
      St(e, t.playerId);
      return;
    case "DECLARE_ATTACKER":
      if (
        (D(e, "ACTION"), C(e, t.playerId), e.attackTokenPlayerId !== t.playerId)
      )
        throw new s("Player does not have the attack token.");
      if (!e.attackTokenAvailable)
        throw new s("Attack token has already been used.");
      $r(e, t.playerId, t.unitInstanceId);
      return;
    case "REMOVE_ATTACKER":
      if (
        (D(e, "ACTION"), C(e, t.playerId), e.attackTokenPlayerId !== t.playerId)
      )
        throw new s("Player does not have the attack token.");
      Zr(e, t.unitInstanceId);
      return;
    case "COMMIT_ATTACK":
      if (
        (D(e, "ACTION"), C(e, t.playerId), e.attackTokenPlayerId !== t.playerId)
      )
        throw new s("Only the attacker can commit attacks.");
      if (!e.attackTokenAvailable)
        throw new s("Attack token has already been used.");
      if (!Nt(e)) throw new s("No attackers declared.");
      return;
    case "DECLARE_BLOCKER":
      if (
        (D(e, "BLOCK"),
        C(e, t.playerId),
        u(e.attackTokenPlayerId) !== t.playerId)
      )
        throw new s("Only the defending player can block.");
      (qr(e, t.playerId, t.blockerId), Qr(e, t.attackerId));
      return;
    case "REMOVE_BLOCKER":
      if (
        (D(e, "BLOCK"),
        C(e, t.playerId),
        u(e.attackTokenPlayerId) !== t.playerId)
      )
        throw new s("Only the defending player can remove blockers.");
      Jr(e, t.blockerId);
      return;
    case "COMMIT_BLOCKS":
      if (
        (D(e, "BLOCK"),
        C(e, t.playerId),
        u(e.attackTokenPlayerId) !== t.playerId)
      )
        throw new s("Only the defending player can commit blocks.");
      return;
    case "RESOLVE_COMBAT":
      if ((D(e, "COMBAT"), !Nt(e))) throw new s("No attackers declared.");
      return;
    case "END_TURN":
      (D(e, "ACTION"), C(e, t.playerId));
      return;
    case "TIME_OUT":
      C(e, t.playerId);
      return;
    case "SURRENDER":
      H(t.playerId);
      return;
  }
}
function Tt(e, t, r, a) {
  let n = r.additionalCost;
  if (!n) {
    if (a?.length)
      throw new s("Card does not require additional cost targets.");
    return;
  }
  if (n.type === "SACRIFICE_UNITS") {
    Vr(e, t, n, a);
    return;
  }
}
function Vr(e, t, r, a) {
  if (!a || a.length !== r.count)
    throw new s(`Additional cost requires ${r.count} allied unit(s).`);
  let n = new Set();
  for (let o of a) {
    if (o.type !== "UNIT" || o.playerId !== t)
      throw new s("Additional cost requires allied unit targets.");
    if (n.has(o.unitId)) throw new s("Additional cost targets must be unique.");
    (n.add(o.unitId), y(e, t, o.unitId));
  }
}
function ce(e) {
  if (e.winnerId) return e;
  let t = e.players.P1.nexusHp <= 0,
    r = e.players.P2.nexusHp <= 0;
  return (
    t && r
      ? w(e, e.priorityPlayerId, "DOUBLE_NEXUS_DESTROYED")
      : t
        ? w(e, "P2", "NEXUS_DESTROYED")
        : r && w(e, "P1", "NEXUS_DESTROYED"),
    e
  );
}
function w(e, t, r) {
  e.winnerId || ((e.winnerId = t), (e.endReason = r));
}
function y(e, t, r) {
  let a = e.players[t].board.find((n) => n.instanceId === r);
  if (!a) throw new s("Unit is not on board.");
  return a;
}
function se(e, t, r) {
  let a = e.players[t].hand.find((n) => n.instanceId === r);
  if (!a) throw new s("Card is not in hand.");
  return a;
}
function u(e) {
  return e === "P1" ? "P2" : "P1";
}
function E(e) {
  return {
    ...e,
    effectQueue: e.effectQueue.map((t) => ({
      ...t,
      target: t.target ? { ...t.target } : void 0,
    })),
    visualEvents: e.visualEvents.map((t) => ({ ...t })),
    pendingDiscard: e.pendingDiscard
      ? {
          ...e.pendingDiscard,
          remainingPlayerIds: e.pendingDiscard.remainingPlayerIds
            ? [...e.pendingDiscard.remainingPlayerIds]
            : void 0,
        }
      : void 0,
    pendingChoice: e.pendingChoice
      ? {
          ...e.pendingChoice,
          requiredTargets: e.pendingChoice.requiredTargets.map((t) => ({
            ...t,
          })),
          chosenTargets: ea(e.pendingChoice.chosenTargets),
          costTargets: e.pendingChoice.costTargets?.map((t) => ({ ...t })),
          playUnit: e.pendingChoice.playUnit
            ? {
                ...e.pendingChoice.playUnit,
                costTargets: e.pendingChoice.playUnit.costTargets?.map((t) => ({
                  ...t,
                })),
              }
            : void 0,
        }
      : void 0,
    combat: { attackers: e.combat.attackers.map((t) => ({ ...t })) },
    players: { P1: Dt(e.players.P1), P2: Dt(e.players.P2) },
  };
}
function H(e) {
  if (!kt(e)) throw new s("Invalid player.");
}
function C(e, t) {
  if ((H(t), e.priorityPlayerId !== t))
    throw new s("Player does not have priority.");
}
function D(e, t) {
  if (e.phase !== t) throw new s(`Action is not allowed during ${e.phase}.`);
}
function St(e, t) {
  if ((H(t), !e.pendingChoice)) throw new s("No ability choice is pending.");
  if (e.pendingChoice.playerId !== t)
    throw new s("Only the pending player can submit ability targets.");
}
function Kr(e, t, r) {
  if ((H(t), e.phase !== "DISCARD" || !e.pendingDiscard))
    throw new s("No discard is pending.");
  if (e.pendingDiscard.playerId !== t)
    throw new s("Only the pending player can discard.");
  if (e.players[t].hand.length <= e.pendingDiscard.downTo)
    throw new s("Hand is already within the limit.");
  q(e, t, r);
}
function jr(e, t) {
  if (e.board.length >= Q) {
    if (!t) throw new s("Board is full. You must replace a unit.");
    if (!e.board.find((a) => a.instanceId === t))
      throw new s("Unit to replace not found on board.");
  } else if (t)
    throw new s("Cannot replace a unit when the board is not full.");
}
function q(e, t, r) {
  let a = e.players[t].hand.find((n) => n.instanceId === r);
  if (!a) throw new s("Card is not in hand.");
  return a;
}
function Wr(e, t, r) {
  let a = e.players[t],
    n = q(e, t, r),
    o = g(n);
  if (!$(o)) throw new s("Card is not a unit or champion.");
  if (o.attack === void 0 || o.health === void 0)
    throw new s("Unit card requires attack and health.");
  if (a.mana < o.cost) throw new s("Not enough mana.");
}
function zr(e, t, r, a) {
  let n = e.players[t],
    o = q(e, t, r),
    i = g(o);
  if (i.type !== "spell") throw new s("Card is not a spell.");
  if (!i.effects?.length && !i.abilities?.length)
    throw new s("Spell card requires at least one effect.");
  if (n.mana + n.spellMana < i.cost) throw new s("Not enough mana.");
  for (let c of i.effects ?? []) Xr(e, t, c, a);
}
function Xr(e, t, r, a) {
  switch (r.target) {
    case "SOURCE":
    case "EVENT_UNIT":
    case "ALLY_NEXUS":
    case "ENEMY_NEXUS":
    case "RANDOM_ENEMY_UNIT":
    case "RANDOM_ATTACKING_ALLY":
    case void 0:
      return;
    case "RECALL_UNIT":
      if (a.type !== "UNIT" || a.playerId !== t)
        throw new s("Spell requires an ally unit target.");
      y(e, a.playerId, a.unitId);
      return;
    case "ENEMY_UNIT": {
      if (a.type !== "UNIT" || a.playerId !== u(t))
        throw new s("Spell requires an enemy unit target.");
      let n = y(e, a.playerId, a.unitId);
      if (g(n).type !== "unit")
        throw new s("Spell requires an enemy unit target.");
      return;
    }
    case "ALLY_UNIT": {
      if (a.type !== "UNIT" || a.playerId !== t)
        throw new s("Spell requires an ally unit target.");
      let n = y(e, a.playerId, a.unitId);
      if (g(n).type !== "unit")
        throw new s("Spell requires an ally unit target.");
      return;
    }
    case "NEXUS":
      if (a.type !== "NEXUS") throw new s("Spell requires a nexus target.");
      H(a.playerId);
      return;
    case "SELF":
      return;
    case "ALLY_GRAVEYARD":
      if (a.type !== "GRAVEYARD" || a.playerId !== t)
        throw new s("Spell requires an ally graveyard target.");
      if (
        a.cardInstanceId &&
        !e.players[t].graveyard.find((o) => o.instanceId === a.cardInstanceId)
      )
        throw new s("Target card not found in ally graveyard.");
      return;
    case "ENEMY_GRAVEYARD":
      if (a.type !== "GRAVEYARD" || a.playerId !== u(t))
        throw new s("Spell requires an enemy graveyard target.");
      if (
        a.cardInstanceId &&
        !e.players[u(t)].graveyard.find(
          (o) => o.instanceId === a.cardInstanceId,
        )
      )
        throw new s("Target card not found in enemy graveyard.");
      return;
  }
}
function $r(e, t, r) {
  let a = y(e, t, r);
  if (T(a) <= 0) throw new s("Attacker must be alive.");
  if (a.exhausted) throw new s("Unit is exhausted.");
  if (e.combat.attackers.some((n) => n.attackerId === r))
    throw new s("Unit is already attacking.");
}
function qr(e, t, r) {
  let a = y(e, t, r);
  if (T(a) <= 0) throw new s("Blocker must be alive.");
  if (e.combat.attackers.some((n) => n.blockerId === r))
    throw new s("Unit is already blocking.");
}
function Qr(e, t) {
  let r = e.combat.attackers.find((a) => a.attackerId === t);
  if (!r) throw new s("Attacker is not in the attack lineup.");
  if ((y(e, e.attackTokenPlayerId, t), r.blockerId))
    throw new s("Attacker is already blocked.");
}
function Zr(e, t) {
  if (!e.combat.attackers.some((r) => r.attackerId === t))
    throw new s("Attacker is not in the attack lineup.");
  y(e, e.attackTokenPlayerId, t);
}
function Jr(e, t) {
  if (!e.combat.attackers.some((r) => r.blockerId === t))
    throw new s("Unit is not assigned as a blocker.");
}
function Nt(e) {
  return e.combat.attackers.length > 0;
}
function kt(e) {
  return e === "P1" || e === "P2";
}
function Dt(e) {
  return {
    ...e,
    deck: e.deck.map(Ct),
    hand: e.hand.map(Ct),
    board: e.board.map((t) => ({
      ...t,
      keywords: [...t.keywords],
      temporaryKeywords: [...(t.temporaryKeywords ?? [])],
      modifiers: t.modifiers.map((r) => ({ ...r })),
    })),
    graveyard: e.graveyard.map((t) => ({ ...t })),
    championProgress: { ...(e.championProgress ?? {}) },
    leveledChampionIds: { ...(e.leveledChampionIds ?? {}) },
    abilityProgress: { ...(e.abilityProgress ?? {}) },
  };
}
function Ct(e) {
  return { ...e, cardId: e.cardId };
}
function ea(e) {
  return Object.fromEntries(Object.entries(e).map(([t, r]) => [t, { ...r }]));
}
function Z(e, t, r) {
  let a = e.players[t],
    n = 0;
  for (let o = 0; o < r; o += 1) {
    let i = a.deck.shift();
    if (!i) {
      ((a.nexusHp = 0), w(e, u(a.id), "DECK_EXHAUSTED"));
      return;
    }
    (a.hand.push(i),
      (n += 1),
      m(e, { type: "CARD_DRAWN", playerId: t, cardInstanceId: i.instanceId }));
  }
  n > 0 && e.visualEvents.push({ type: "DRAW", playerId: t, count: n });
}
function de(e, t, r, a) {
  let n = e.players[t.ownerId];
  if (n.graveyard.some((i) => i.instanceId === t.instanceId)) return;
  let o = {
    id: `${t.instanceId}-gy`,
    instanceId: t.instanceId,
    cardId: t.cardId,
    ownerId: t.ownerId,
    type: x(R(t)) ? "CHAMPION" : "UNIT",
    round: e.round,
    cause: r,
    sourceInstanceId: a,
  };
  (n.graveyard.push(o),
    m(e, {
      type: "UNIT_DIED",
      playerId: t.ownerId,
      unitInstanceId: t.instanceId,
      targetPlayerId: t.ownerId,
      targetUnitId: t.instanceId,
      targetInstanceId: t.instanceId,
      targetCardId: t.cardId,
      sourceInstanceId: a,
      cause: r,
    }));
}
function le(e, t, r) {
  let a = e.players[r];
  if (a.graveyard.some((o) => o.instanceId === t.instanceId)) return;
  let n = {
    id: `${t.instanceId}-gy`,
    instanceId: t.instanceId,
    cardId: t.cardId,
    ownerId: r,
    type: "SPELL",
    round: e.round,
    cause: "SPELL",
  };
  a.graveyard.push(n);
}
function ve(e, t, r, a) {
  let n = e.players[r];
  if (n.graveyard.some((i) => i.instanceId === t.instanceId)) return;
  let o = x(g(t)) ? "CHAMPION" : g(t).type === "spell" ? "SPELL" : "UNIT";
  n.graveyard.push({
    id: `${t.instanceId}-gy`,
    instanceId: t.instanceId,
    cardId: t.cardId,
    ownerId: r,
    type: o,
    round: e.round,
    cause: a,
  });
}
function Ue(e, t, r = "EFFECT", a) {
  let n = [];
  for (let o of t.board) T(o) <= 0 ? de(e, o, r, a) : n.push(o);
  t.board = n;
}
function O(e, t, r) {
  let a = e.players[t];
  for (let n of r) {
    let o = a.hand.findIndex((c) => c.instanceId === n);
    if (o === -1) continue;
    let [i] = a.hand.splice(o, 1);
    (ve(e, i, t, "DISCARD"),
      m(e, { type: "CARD_DISCARDED", playerId: t, cardInstanceId: n }));
  }
}
function B(e, t, r, a) {
  if (!(a <= 0)) {
    if (r.type === "UNIT") {
      let n = y(e, r.playerId, r.unitId);
      pe(e, n, a, t);
      return;
    }
    if (r.type === "NEXUS" || r.type === "SELF") {
      let n = r.playerId;
      ((e.players[n].nexusHp -= a),
        e.visualEvents.push({
          type: "DAMAGE",
          targetId: `nexus-${n}`,
          amount: a,
          isNexus: !0,
        }),
        m(e, {
          type: "NEXUS_DAMAGED",
          playerId: n,
          targetPlayerId: n,
          sourcePlayerId: t?.playerId,
          sourceInstanceId: t?.sourceInstanceId ?? t?.sourceId,
          sourceCardId: t?.sourceCardId,
          amount: a,
          damageType: t?.damageType,
        }));
    }
  }
}
function pe(e, t, r, a) {
  if (r <= 0) return { damageDealt: 0, excessDamage: 0 };
  if (ta(t, "BARRIER")) return { damageDealt: 0, excessDamage: 0 };
  let n = t.keywords.includes("TOUGH") ? Math.max(0, r - 1) : r,
    o = T(t),
    i = Math.min(o, n);
  return (
    (t.damage += n),
    e.visualEvents.push({
      type: "DAMAGE",
      targetId: t.instanceId,
      amount: n,
      isNexus: !1,
    }),
    m(e, {
      type: "UNIT_DAMAGED",
      playerId: t.ownerId,
      unitInstanceId: t.instanceId,
      targetPlayerId: t.ownerId,
      targetUnitId: t.instanceId,
      targetInstanceId: t.instanceId,
      targetCardId: t.cardId,
      sourcePlayerId: a?.playerId,
      sourceInstanceId: a?.sourceInstanceId ?? a?.sourceId,
      sourceCardId: a?.sourceCardId,
      damageType: a?.damageType,
      amount: i,
    }),
    { damageDealt: i, excessDamage: Math.max(0, n - o) }
  );
}
function ta(e, t) {
  let r = e.keywords.indexOf(t);
  return r === -1 ? !1 : (e.keywords.splice(r, 1), !0);
}
function ue(e, t, r) {
  if (!(r <= 0)) {
    if (t.type === "UNIT") {
      let a = y(e, t.playerId, t.unitId),
        n = Math.min(a.damage, r);
      ((a.damage = Math.max(0, a.damage - r)),
        n > 0 &&
          (e.visualEvents.push({
            type: "HEAL",
            targetId: a.instanceId,
            amount: n,
            isNexus: !1,
          }),
          m(e, {
            type: "UNIT_HEALED",
            playerId: a.ownerId,
            unitInstanceId: a.instanceId,
            amount: n,
          })));
      return;
    }
    if (t.type === "NEXUS" || t.type === "SELF") {
      let a = e.players[t.playerId],
        n = Math.min(Re - a.nexusHp, r);
      n > 0 &&
        ((a.nexusHp += n),
        e.visualEvents.push({
          type: "HEAL",
          targetId: `nexus-${t.playerId}`,
          amount: n,
          isNexus: !0,
        }));
    }
  }
}
function ke(e, t, r, a) {
  let n = e.players[t];
  if (n.board.length >= Q) return;
  let o = a ?? `${r}-generated-${e.rngSeed}`;
  a || (e.rngSeed += 1);
  let i = N(r),
    c = L(oe(i, t, o));
  (n.board.push(c),
    m(e, {
      type: "UNIT_SUMMONED",
      playerId: t,
      cardInstanceId: o,
      unitInstanceId: c.instanceId,
    }));
}
function ye(e, t, r) {
  let a = Lt(e, t),
    n = {
      ...r,
      id:
        r.id ??
        `${t}-${r.sourceCardId}-${e.round}-${e.turn}-${a.modifiers.length}`,
      createdRound: r.createdRound ?? e.round,
      createdTurn: r.createdTurn ?? e.turn,
    };
  (a.modifiers.push(n),
    e.visualEvents.push({
      type: "BUFF",
      targetId: a.instanceId,
      attackDelta: n.attackDelta,
      healthDelta: n.healthDelta,
    }));
}
function Le(e, t, r, a = "PERMANENT") {
  let n = Lt(e, t);
  n.keywords.includes(r) || n.keywords.push(r);
}
function Lt(e, t) {
  for (let r of S)
    if (e.players[r].board.find((n) => n.instanceId === t)) return y(e, r, t);
  throw new Error(`Unit not found: ${t}`);
}
function we(e, t, r) {
  let a = ra(e, t),
    n = {
      ...r,
      attackDelta: -Math.abs(r.attackDelta),
      healthDelta: -Math.abs(r.healthDelta),
      id:
        r.id ??
        `${t}-${r.sourceCardId}-${e.round}-${e.turn}-${a.modifiers.length}`,
      createdRound: r.createdRound ?? e.round,
      createdTurn: r.createdTurn ?? e.turn,
    };
  (a.modifiers.push(n),
    e.visualEvents.push({
      type: "DEBUFF",
      targetId: a.instanceId,
      attackDelta: n.attackDelta,
      healthDelta: n.healthDelta,
    }));
}
function ra(e, t) {
  for (let r of S)
    if (e.players[r].board.find((n) => n.instanceId === t)) return y(e, r, t);
  throw new Error(`Unit not found: ${t}`);
}
function Pe(e, t, r, a) {
  let n = e.players[t],
    o = n.graveyard.findIndex((c) => c.instanceId === r);
  if (o === -1) return;
  let [i] = n.graveyard.splice(o, 1);
  (e.visualEvents.push({
    type: "BANISH",
    playerId: t,
    cardInstanceId: i.instanceId,
  }),
    m(e, {
      type: "CARD_BANISHED",
      playerId: t,
      cardInstanceId: i.instanceId,
      targetPlayerId: t,
      targetInstanceId: i.instanceId,
      targetCardId: i.cardId,
      sourceInstanceId: a,
    }));
}
function Me(e, t, r, a = ["UNIT", "CHAMPION", "SPELL"]) {
  let n = e.players[t],
    o = n.graveyard.findIndex((l) => l.instanceId === r);
  if (o === -1) return;
  let i = n.graveyard[o].type;
  if (!a.includes(i)) return;
  let [c] = n.graveyard.splice(o, 1),
    d = { instanceId: c.instanceId, cardId: c.cardId, ownerId: c.ownerId };
  return (n.hand.push(d), d);
}
function V(e, t, r, a = "EFFECT") {
  let n = e.players[t],
    o = n.board.findIndex((c) => c.instanceId === r);
  if (o === -1) throw new s("Sacrifice unit is not on board.");
  let [i] = n.board.splice(o, 1);
  return (de(e, i, a), i);
}
function Oe(e, t, r, a = ["UNIT", "CHAMPION"]) {
  let n = e.players[t];
  if (n.board.length >= 6) return;
  let o = n.graveyard.findIndex((p) => p.instanceId === r);
  if (o === -1) return;
  let i = n.graveyard[o].type;
  if (i === "SPELL" || !a.includes(i)) return;
  let [c] = n.graveyard.splice(o, 1),
    d = { instanceId: c.instanceId, cardId: c.cardId, ownerId: c.ownerId },
    l = { ...L(d), boardRow: "ACTIVE" };
  return (n.board.push(l), l);
}
function Ye(e, t = {}) {
  return (e.targets ?? []).filter((r) => r.required !== !1 && !t[r.id]);
}
function K(e, t, r) {
  if (
    !na(t, r.event) ||
    (t.runtimeCondition && r.event && !t.runtimeCondition(e, r.event))
  )
    return !1;
  ia(e, t.conditions ?? [], r);
  let a = oa(e, t.targets ?? [], r);
  (sa(e, t.costs ?? [], r, a), da(e, t.costs ?? [], r, a));
  for (let n of t.effects)
    ge(e, {
      sourceId: r.sourceId,
      sourceName: r.sourceName ?? t.id,
      sourceCardId: r.sourceCard?.cardId ?? r.sourceUnit?.cardId,
      sourcePlayerId: r.sourcePlayerId,
      effect: n,
      target: la(e, n, r, a),
    });
  return !0;
}
function Mt(e, t, r) {
  let a = g(t),
    n = a.abilities ?? [],
    o = { target: r, self: { type: "SELF", playerId: t.ownerId } };
  for (let i of n.filter((c) => !c.when))
    K(e, i, {
      sourceId: t.instanceId,
      sourceName: a.name,
      sourcePlayerId: t.ownerId,
      sourceCard: t,
      selectedTargets: o,
    });
}
function Ot(e, t) {
  for (let r of ["P1", "P2"])
    for (let a of e.players[r].board) {
      let n = R(a);
      for (let o of n.abilities ?? [])
        if (!(!o.when || o.when.event !== t.type))
          try {
            K(e, o, {
              sourceId: a.instanceId,
              sourceName: aa(o.id),
              sourcePlayerId: r,
              sourceUnit: a,
              event: t,
            }) &&
              e.visualEvents.push({
                type: "TRIGGER_ACTIVATED",
                sourceId: a.instanceId,
                effectName: o.id,
              });
          } catch {}
    }
}
function aa(e) {
  return e.startsWith("legacy-trigger:") ? e.slice(15) : e;
}
function na(e, t) {
  return e.when ? e.when.event === t?.type : !0;
}
function ia(e, t, r) {
  for (let a of t)
    switch (a.type) {
      case "HAS_MANA":
        if (e.players[r.sourcePlayerId].mana < a.amount)
          throw new s("Ability condition failed: not enough mana.");
        break;
      case "HAS_CARD_IN_HAND":
        if (e.players[r.sourcePlayerId].hand.length < (a.count ?? 1))
          throw new s("Ability condition failed: not enough cards in hand.");
        break;
      case "ALLY_UNIT_EXISTS":
        if (e.players[r.sourcePlayerId].board.length === 0)
          throw new s("Ability condition failed: no allied unit exists.");
        break;
      case "SPELLS_CAST_THIS_ROUND_AT_LEAST":
        if (
          (e.players[r.sourcePlayerId].abilityProgress.SPELLS_CAST_THIS_ROUND ||
            0) < a.count
        )
          throw new s(
            "Ability condition failed: not enough spells this round.",
          );
        break;
      case "UNIT_DIED_THIS_GAME_AT_LEAST":
        if (
          (e.players[r.sourcePlayerId].abilityProgress.UNIT_DIED_THIS_GAME ||
            0) < a.count
        )
          throw new s("Ability condition failed: not enough units died.");
        break;
      case "NEXUS_HEALTH_BELOW": {
        let n = a.player === "SELF" ? r.sourcePlayerId : u(r.sourcePlayerId);
        if (e.players[n].nexusHp >= a.amount)
          throw new s("Ability condition failed: nexus health is too high.");
        break;
      }
      case "UNIT_HAS_KEYWORD": {
        let n = r.selectedTargets?.[a.target];
        if (n?.type !== "UNIT")
          throw new s("Ability condition failed: missing unit target.");
        if (!y(e, n.playerId, n.unitId).keywords.includes(a.keyword))
          throw new s("Ability condition failed: unit lacks keyword.");
        break;
      }
      case "EVENT_PLAYER_IS": {
        if (!r.event?.playerId)
          throw new s("Ability condition failed: missing event player.");
        let n = a.player === "SELF" ? r.sourcePlayerId : u(r.sourcePlayerId);
        if (r.event.playerId !== n)
          throw new s("Ability condition failed: wrong event player.");
        break;
      }
      case "SOURCE_IS_ATTACKING": {
        if (
          !r.sourceUnit ||
          !e.combat.attackers.some(
            (n) => n.attackerId === r.sourceUnit?.instanceId,
          )
        )
          throw new s("Ability condition failed: source is not attacking.");
        break;
      }
    }
}
function oa(e, t, r) {
  let a = { ...(r.selectedTargets ?? {}) };
  for (let n of t) {
    let o = a[n.id];
    if (!o) {
      if (n.kind === "SELF") {
        a[n.id] = r.sourceUnit
          ? {
              type: "UNIT",
              playerId: r.sourcePlayerId,
              unitId: r.sourceUnit.instanceId,
            }
          : { type: "SELF", playerId: r.sourcePlayerId };
        continue;
      }
      if (n.kind === "ALLY_NEXUS") {
        a[n.id] = { type: "NEXUS", playerId: r.sourcePlayerId };
        continue;
      }
      if (n.kind === "ENEMY_NEXUS") {
        a[n.id] = { type: "NEXUS", playerId: u(r.sourcePlayerId) };
        continue;
      }
      if (n.required !== !1) throw new s("Ability requires a target.");
      continue;
    }
    ca(e, r.sourcePlayerId, n, o);
  }
  return a;
}
function ca(e, t, r, a) {
  switch (r.kind) {
    case "SELF":
      if (a.type !== "SELF" && !(a.type === "UNIT" && a.playerId === t))
        throw new s("Ability target must be self.");
      break;
    case "ALLY_UNIT":
      if (a.type !== "UNIT" || a.playerId !== t)
        throw new s("Ability target must be an allied unit.");
      y(e, a.playerId, a.unitId);
      break;
    case "ENEMY_UNIT":
      if (a.type !== "UNIT" || a.playerId !== u(t))
        throw new s("Ability target must be an enemy unit.");
      y(e, a.playerId, a.unitId);
      break;
    case "ANY_UNIT":
      if (a.type !== "UNIT") throw new s("Ability target must be a unit.");
      y(e, a.playerId, a.unitId);
      break;
    case "ALLY_NEXUS":
      if (a.type !== "NEXUS" || a.playerId !== t)
        throw new s("Ability target must be allied nexus.");
      break;
    case "ENEMY_NEXUS":
      if (a.type !== "NEXUS" || a.playerId !== u(t))
        throw new s("Ability target must be enemy nexus.");
      break;
    case "ANY_TARGET":
      a.type === "UNIT"
        ? y(e, a.playerId, a.unitId)
        : a.type === "HAND_CARD"
          ? se(e, a.playerId, a.cardInstanceId)
          : a.type === "DECK_CARD" && Ft(e, a.playerId, a.cardInstanceId);
      break;
    case "ALLY_DECK_CARD":
      if (a.type !== "DECK_CARD" || a.playerId !== t)
        throw new s("Ability target must be an allied deck card.");
      Pt(e, a.playerId, a.cardInstanceId, r);
      break;
    case "ANY_DECK_CARD":
      if (a.type !== "DECK_CARD")
        throw new s("Ability target must be a deck card.");
      Pt(e, a.playerId, a.cardInstanceId, r);
      break;
    case "ALLY_HAND_CARD":
      if (a.type !== "HAND_CARD" || a.playerId !== t)
        throw new s("Ability target must be an allied hand card.");
      Fe(e, a.playerId, a.cardInstanceId, r);
      break;
    case "ENEMY_HAND_CARD":
      if (a.type !== "HAND_CARD" || a.playerId !== u(t))
        throw new s("Ability target must be an enemy hand card.");
      Fe(e, a.playerId, a.cardInstanceId, r);
      break;
    case "ANY_HAND_CARD":
      if (a.type !== "HAND_CARD")
        throw new s("Ability target must be a hand card.");
      Fe(e, a.playerId, a.cardInstanceId, r);
      break;
    case "ALLY_GRAVEYARD":
      Ge(e, a, t, "allied");
      break;
    case "ENEMY_GRAVEYARD":
      Ge(e, a, u(t), "enemy");
      break;
    case "ANY_GRAVEYARD":
      Ge(e, a);
      break;
  }
}
function Ge(e, t, r, a = "valid") {
  if (t.type !== "GRAVEYARD" || (r && t.playerId !== r))
    throw new s(`Ability target must be a ${a} graveyard card.`);
  let n = e.players[t.playerId].graveyard.find(
    (o) => o.instanceId === t.cardInstanceId,
  );
  if (!n || n.type === "SPELL")
    throw new s("Ability target must be a unit or champion in a graveyard.");
}
function sa(e, t, r, a) {
  for (let n of t)
    switch (n.type) {
      case "PAY_MANA":
        if (e.players[r.sourcePlayerId].mana < n.amount)
          throw new s("Cannot pay ability mana cost.");
        break;
      case "PAY_HEALTH":
        if (e.players[r.sourcePlayerId].nexusHp <= n.amount)
          throw new s("Cannot pay ability health cost.");
        break;
      case "DISCARD":
        Gt(e, r.sourcePlayerId, a[n.target]);
        break;
      case "SACRIFICE_UNIT":
      case "DESTROY_ALLY":
        me(e, r.sourcePlayerId, a[n.target]);
        break;
      case "EXHAUST_UNIT": {
        let o = me(e, r.sourcePlayerId, a[n.target]);
        if (o.exhausted || T(o) <= 0)
          throw new s("Cannot exhaust unit for ability cost.");
        break;
      }
    }
}
function da(e, t, r, a) {
  for (let n of t)
    switch (n.type) {
      case "PAY_MANA":
        e.players[r.sourcePlayerId].mana -= n.amount;
        break;
      case "PAY_HEALTH":
        e.players[r.sourcePlayerId].nexusHp -= n.amount;
        break;
      case "DISCARD": {
        let o = a[n.target];
        (Gt(e, r.sourcePlayerId, o),
          O(e, r.sourcePlayerId, [o.cardInstanceId]));
        break;
      }
      case "SACRIFICE_UNIT":
      case "DESTROY_ALLY": {
        let o = me(e, r.sourcePlayerId, a[n.target]);
        V(e, r.sourcePlayerId, o.instanceId, "EFFECT");
        break;
      }
      case "EXHAUST_UNIT": {
        let o = me(e, r.sourcePlayerId, a[n.target]);
        o.exhausted = !0;
        break;
      }
    }
}
function la(e, t, r, a) {
  let n = t.target;
  if (n) {
    if (a[n]) return a[n];
    switch (n) {
      case "SELF":
        return t.type === "DRAW_CARD"
          ? { type: "SELF", playerId: r.sourcePlayerId }
          : wt(r);
      case "SOURCE":
        return wt(r);
      case "ALLY_NEXUS":
        return { type: "NEXUS", playerId: r.sourcePlayerId };
      case "ENEMY_NEXUS":
        return { type: "NEXUS", playerId: u(r.sourcePlayerId) };
      case "NEXUS":
        return {
          type: "NEXUS",
          playerId: t.type === "HEAL" ? r.sourcePlayerId : u(r.sourcePlayerId),
        };
      case "EVENT_UNIT":
        return pa(r.event);
      case "RANDOM_ENEMY_UNIT":
        return ua(e, r.sourcePlayerId);
      case "RANDOM_ATTACKING_ALLY":
        return ya(e, r.sourcePlayerId);
      case "ALLY_UNIT":
      case "ENEMY_UNIT":
        return r.sourceUnit
          ? {
              type: "UNIT",
              playerId: r.sourcePlayerId,
              unitId: r.sourceUnit.instanceId,
            }
          : a.target;
      default:
        return a.target;
    }
  }
}
function wt(e) {
  return e.sourceUnit
    ? {
        type: "UNIT",
        playerId: e.sourcePlayerId,
        unitId: e.sourceUnit.instanceId,
      }
    : { type: "SELF", playerId: e.sourcePlayerId };
}
function pa(e) {
  let t = e?.unitInstanceId ?? e?.attackerId ?? e?.blockerId;
  if (!(!e?.playerId || !t))
    return { type: "UNIT", playerId: e.playerId, unitId: t };
}
function ua(e, t) {
  let r = u(t),
    a = e.players[r].board;
  if (a.length === 0) return;
  let n = e.rngSeed % a.length;
  return (
    (e.rngSeed += 1),
    { type: "UNIT", playerId: r, unitId: a[n].instanceId }
  );
}
function ya(e, t) {
  if (e.attackTokenPlayerId !== t) return;
  let r = e.combat.attackers.map((n) => n.attackerId);
  if (r.length === 0) return;
  let a = e.rngSeed % r.length;
  return ((e.rngSeed += 1), { type: "UNIT", playerId: t, unitId: r[a] });
}
function Gt(e, t, r) {
  if (!r || r.type !== "HAND_CARD" || r.playerId !== t)
    throw new s("Discard cost requires an allied hand card target.");
  se(e, t, r.cardInstanceId);
}
function me(e, t, r) {
  if (!r || r.type !== "UNIT" || r.playerId !== t)
    throw new s("Cost requires an allied unit target.");
  return y(e, t, r.unitId);
}
function Ft(e, t, r) {
  let a = e.players[t].deck.find((n) => n.instanceId === r);
  if (!a) throw new s("Card is not in deck.");
  return a;
}
function Pt(e, t, r, a) {
  let n = Ft(e, t, r),
    o = g(n),
    i = a.filter;
  if (o.level === 2)
    throw new s("Deck card target must be a collectible card.");
  if (i) {
    if (i.archetype && o.archetype !== i.archetype)
      throw new s("Deck card target has the wrong archetype.");
    if (i.cardType && o.type !== i.cardType)
      throw new s("Deck card target has the wrong card type.");
    if (i.cardTypes && !i.cardTypes.includes(o.type))
      throw new s("Deck card target has the wrong card type.");
    if (i.spellSpeed && o.spellSpeed !== i.spellSpeed)
      throw new s("Deck card target has the wrong spell speed.");
    if (i.maxCost !== void 0 && o.cost > i.maxCost)
      throw new s("Deck card target costs too much.");
  }
}
function Fe(e, t, r, a) {
  let n = se(e, t, r),
    o = g(n),
    i = a.filter;
  if (i) {
    if (i.archetype && o.archetype !== i.archetype)
      throw new s("Hand card target has the wrong archetype.");
    if (i.cardType && o.type !== i.cardType)
      throw new s("Hand card target has the wrong card type.");
    if (i.cardTypes && !i.cardTypes.includes(o.type))
      throw new s("Hand card target has the wrong card type.");
    if (i.spellSpeed && o.spellSpeed !== i.spellSpeed)
      throw new s("Hand card target has the wrong spell speed.");
    if (i.maxCost !== void 0 && o.cost > i.maxCost)
      throw new s("Hand card target costs too much.");
  }
}
function m(e, t) {
  (Yt(e, t), ma(e, t), Ot(e, t));
}
function ma(e, t) {
  if (t.type === "SPELL_CAST" && t.playerId) {
    let r = e.players[t.playerId].abilityProgress;
    r.SPELLS_CAST_THIS_ROUND = (r.SPELLS_CAST_THIS_ROUND || 0) + 1;
  }
  if (t.type === "UNIT_DIED" && t.playerId) {
    let r = e.players[t.playerId].abilityProgress;
    r.UNIT_DIED_THIS_GAME = (r.UNIT_DIED_THIS_GAME || 0) + 1;
  }
}
function ge(e, t) {
  e.effectQueue.push(t);
}
function Bt(e) {
  let t = 0,
    r = 100;
  for (; e.effectQueue.length > 0; ) {
    if (e.winnerId) return;
    if (t >= r)
      throw new s(
        "Maximum effect resolution limit exceeded. Infinite loop detected.",
      );
    t++;
    let a = e.effectQueue.shift();
    a && (ga(e, a), j(e), ce(e));
  }
}
function Vt(e, t, r) {
  switch (e.target) {
    case "SELF":
      return (e.type === "BUFF_UNIT" || e.type === "GRANT_KEYWORD") &&
        r.type === "UNIT"
        ? r
        : { type: "SELF", playerId: t };
    case "ALLY_NEXUS":
      return { type: "NEXUS", playerId: t };
    case "ENEMY_NEXUS":
      return { type: "NEXUS", playerId: u(t) };
    case "ENEMY_UNIT":
    case "ALLY_UNIT":
    case "NEXUS":
    case "ALLY_GRAVEYARD":
    case "ENEMY_GRAVEYARD":
      return r;
    case "RECALL_UNIT":
      return r;
    case "RESTORE_SPELL_MANA":
    case "DRAW_CARD_BY_FILTER":
    case "CREATE_RANDOM_CARD":
    case "SUMMON_FROM_DECK":
    case "SUMMON_FROM_HAND_OR_DECK":
      return;
    case "SOURCE":
    case "EVENT_UNIT":
    case "RANDOM_ENEMY_UNIT":
    case "RANDOM_ATTACKING_ALLY":
      return r;
  }
}
function ga(e, t) {
  let {
      sourcePlayerId: r,
      sourceId: a,
      sourceName: n,
      sourceCardId: o,
      effect: i,
      target: c,
    } = t,
    d = r;
  switch (i.type) {
    case "DEAL_DAMAGE":
      c &&
        B(
          e,
          {
            playerId: d,
            sourceId: a,
            sourceInstanceId: a,
            sourceCardId: o,
            damageType: "SPELL",
          },
          c,
          i.amount,
        );
      return;
    case "HEAL":
      c && ue(e, c, i.amount);
      return;
    case "DRAW_CARD":
      Z(e, d, i.count);
      return;
    case "DISCARD_CARD": {
      let l = e.players[d].hand.slice(0, i.count ?? 1).map((p) => p.instanceId);
      O(e, d, l);
      return;
    }
    case "BUFF_UNIT": {
      if (c?.type !== "UNIT") return;
      try {
        (y(e, c.playerId, c.unitId),
          ye(e, c.unitId, {
            sourceCardId: a,
            sourceName: n ?? a,
            type: "BUFF",
            attackDelta: i.attack,
            healthDelta: i.health,
            duration: i.duration ?? "THIS_ROUND",
          }));
      } catch {}
      return;
    }
    case "BUFF_ACTIVE_ALLIES": {
      for (let l of e.players[d].board)
        ye(e, l.instanceId, {
          sourceCardId: o ?? a,
          sourceName: n ?? a,
          type: "BUFF",
          attackDelta: i.attack,
          healthDelta: i.health,
          duration: i.duration ?? "THIS_ROUND",
        });
      return;
    }
    case "DEBUFF_UNIT": {
      if (c?.type !== "UNIT") return;
      try {
        (y(e, c.playerId, c.unitId),
          we(e, c.unitId, {
            sourceCardId: a,
            sourceName: n ?? a,
            type: "DEBUFF",
            attackDelta: i.attackDelta,
            healthDelta: i.healthDelta,
            duration: i.duration ?? "THIS_ROUND",
          }));
      } catch {}
      return;
    }
    case "BURN_ACTIVE_ENEMIES": {
      let l = u(d);
      for (let p of [...e.players[l].board])
        B(
          e,
          {
            playerId: d,
            sourceId: a,
            sourceInstanceId: a,
            sourceCardId: o,
            damageType: "EFFECT",
          },
          { type: "UNIT", playerId: l, unitId: p.instanceId },
          i.amount,
        );
      return;
    }
    case "BANISH_GRAVEYARD": {
      if (c?.type !== "GRAVEYARD" || !c.cardInstanceId) return;
      Pe(e, c.playerId, c.cardInstanceId, a);
      return;
    }
    case "GRANT_KEYWORD": {
      if (c?.type !== "UNIT") return;
      try {
        (y(e, c.playerId, c.unitId), Le(e, c.unitId, i.keyword));
      } catch {}
      return;
    }
    case "SUMMON_UNIT": {
      i.cardDefinition &&
        ke(e, d, i.cardDefinition.id, Ia(e, i.cardDefinition.id));
      return;
    }
    case "RESTORE_SPELL_MANA": {
      let l = e.players[d];
      l.spellMana = Math.min(3, l.spellMana + i.amount);
      return;
    }
    case "DRAW_CARD_BY_FILTER":
      ha(e, d, i);
      return;
    case "CREATE_RANDOM_CARD":
      fa(e, d, i.archetype, i.cardType);
      return;
    case "SUMMON_FROM_DECK":
      xt(e, d, i, ["deck"], c);
      return;
    case "SUMMON_FROM_HAND_OR_DECK":
      xt(e, d, i, ["hand", "deck"], c);
      return;
    case "RECALL_UNIT": {
      c?.type === "UNIT" && Ea(e, c.playerId, c.unitId);
      return;
    }
    case "REBIRTH_CARD": {
      if (c?.type !== "GRAVEYARD" || !c.cardInstanceId) return;
      let l = Me(e, c.playerId, c.cardInstanceId, i.allowedTypes);
      l &&
        (e.visualEvents.push({
          type: "GRAVEYARD_RESTORE",
          playerId: c.playerId,
          cardInstanceId: l.instanceId,
          mode: "REBIRTH",
        }),
        e.visualEvents.push({ type: "DRAW", playerId: c.playerId, count: 1 }));
      return;
    }
    case "REVIVE_CARD": {
      if (c?.type !== "GRAVEYARD" || !c.cardInstanceId) return;
      let l = Oe(e, c.playerId, c.cardInstanceId, i.allowedTypes);
      l &&
        (e.visualEvents.push({
          type: "GRAVEYARD_RESTORE",
          playerId: c.playerId,
          cardInstanceId: l.instanceId,
          mode: "REVIVE",
        }),
        e.visualEvents.push({
          type: "SUMMON",
          playerId: c.playerId,
          instanceId: l.instanceId,
        }));
      return;
    }
  }
}
function Ia(e, t) {
  let r = `${t}-generated-${e.rngSeed}`;
  return ((e.rngSeed += 1), r);
}
function ha(e, t, r) {
  let a = e.players[t],
    n = 0;
  for (let o = 0; o < r.count; o += 1) {
    let i = a.deck.findIndex((d) => He(g(d)) && xe(g(d), r));
    if (i === -1) return;
    let [c] = a.deck.splice(i, 1);
    (a.hand.push(c),
      (n += 1),
      m(e, { type: "CARD_DRAWN", playerId: t, cardInstanceId: c.instanceId }));
  }
  n > 0 && e.visualEvents.push({ type: "DRAW", playerId: t, count: n });
}
function fa(e, t, r, a) {
  let n = be().filter(
    (c) => c.archetype === r && (!a || c.type === a) && c.level !== 2,
  );
  if (n.length === 0) return;
  let o = n[e.rngSeed % n.length],
    i = oe(o.id, t, `${o.id}-created-${e.rngSeed}`);
  ((e.rngSeed += 1),
    e.players[t].hand.push(i),
    e.visualEvents.push({ type: "DRAW", playerId: t, count: 1 }));
}
function xt(e, t, r, a, n) {
  if (!(e.players[t].board.length >= Q)) {
    if (n?.type === "DECK_CARD" && n.playerId === t && a.includes("deck")) {
      Ht(e, t, "deck", n.cardInstanceId, r);
      return;
    }
    if (n?.type === "HAND_CARD" && n.playerId === t && a.includes("hand")) {
      Ht(e, t, "hand", n.cardInstanceId, r);
      return;
    }
    for (let o of a) {
      let i = e.players[t][o],
        c = i.findIndex((l) => (o !== "deck" || He(g(l))) && xe(g(l), r));
      if (c === -1) continue;
      let [d] = i.splice(c, 1);
      Kt(e, t, d);
      return;
    }
  }
}
function Ht(e, t, r, a, n) {
  let o = e.players[t][r],
    i = o.findIndex((l) => l.instanceId === a);
  if (i === -1) return;
  let c = o[i],
    d = g(c);
  (r !== "deck" || He(d)) && xe(d, n) && (o.splice(i, 1), Kt(e, t, c));
}
function Kt(e, t, r) {
  let a = N(r.cardId);
  if (!$(a)) return;
  let n = L(r);
  (e.players[t].board.push(n),
    m(e, {
      type: "UNIT_SUMMONED",
      playerId: t,
      cardInstanceId: r.instanceId,
      unitInstanceId: n.instanceId,
      sourcePlayerId: t,
      sourceInstanceId: r.instanceId,
      sourceCardId: r.cardId,
    }));
}
function Ea(e, t, r) {
  let a = e.players[t].board,
    n = a.findIndex((i) => i.instanceId === r);
  if (n === -1) return;
  let [o] = a.splice(n, 1);
  e.players[t].hand.push({
    instanceId: o.instanceId,
    cardId: o.cardId,
    ownerId: t,
  });
}
function xe(e, t) {
  return !(
    (t.cardType && e.type !== t.cardType) ||
    (t.cardTypes && !t.cardTypes.includes(e.type)) ||
    (t.spellSpeed && e.spellSpeed !== t.spellSpeed) ||
    (t.archetype && e.archetype !== t.archetype) ||
    (t.maxCost !== void 0 && e.cost > t.maxCost)
  );
}
function He(e) {
  return e.level !== 2;
}
function Yt(e, t) {
  switch (t.type) {
    case "UNIT_DIED":
      if (t.playerId) {
        e.players[t.playerId].championProgress.ALLIES_DIED =
          (e.players[t.playerId].championProgress.ALLIES_DIED || 0) + 1;
        let r = u(t.playerId);
        e.players[r].championProgress.ENEMIES_DIED =
          (e.players[r].championProgress.ENEMIES_DIED || 0) + 1;
      }
      break;
    case "SPELL_CAST":
      t.playerId &&
        (e.players[t.playerId].championProgress.SPELLS_CAST =
          (e.players[t.playerId].championProgress.SPELLS_CAST || 0) + 1);
      break;
    case "UNIT_STRUCK":
      if (t.playerId && t.unitInstanceId) {
        let r = Xt(t.unitInstanceId);
        e.players[t.playerId].championProgress[r] =
          (e.players[t.playerId].championProgress[r] || 0) + 1;
      }
      break;
    case "NEXUS_DAMAGED":
      if (t.playerId && t.amount) {
        let r = t.sourcePlayerId ?? u(t.playerId);
        e.players[r].championProgress.NEXUS_DAMAGE_DEALT =
          (e.players[r].championProgress.NEXUS_DAMAGE_DEALT || 0) + t.amount;
      }
      break;
  }
}
function _a(e) {
  for (let t of S) {
    if (e.winnerId) return;
    let r = e.players[t];
    for (let a of r.board) {
      let n = R(a);
      Be(r, n, a.instanceId) && Ve(r, n);
    }
    for (let a of [...r.deck, ...r.hand]) {
      if (!Y(a.cardId)) continue;
      let n = g(a);
      Be(r, n) && Ve(r, n);
    }
    for (let a of r.graveyard) {
      if (!Y(a.cardId)) continue;
      let n = N(a.cardId);
      Be(r, n) && Ve(r, n);
    }
    for (let a of r.board) {
      let n = R(a);
      if (!ze(r, n)) continue;
      let o = Xe(n);
      o && Ta(e, t, a, o);
    }
    for (let a of r.deck) Y(a.cardId) && jt(r, a);
    for (let a of r.hand) Y(a.cardId) && jt(r, a);
    for (let a of r.graveyard) Aa(r, a);
  }
}
function Be(e, t, r) {
  if (!x(t) || t.level !== 1 || !t.levelUpCondition) return !1;
  let a = t.levelUpCondition;
  if (a.type === "THIS_CHAMPION_STRUCK" && !r) return !1;
  let n = a.type === "THIS_CHAMPION_STRUCK" ? Xt(r) : a.type;
  return (e.championProgress[n] || 0) >= a.threshold;
}
function ze(e, t) {
  return Wt(t) ? !!e.leveledChampionIds?.[zt(t)] : !1;
}
function jt(e, t) {
  let r = g(t);
  if (!ze(e, r)) return;
  let a = Xe(r);
  a && (t.cardId = a.id);
}
function Aa(e, t) {
  if (!Y(t.cardId)) return;
  let r = N(t.cardId);
  if (!ze(e, r)) return;
  let a = Xe(r);
  a && (t.cardId = a.id);
}
function Ve(e, t) {
  Wt(t) && ((e.leveledChampionIds ??= {}), (e.leveledChampionIds[zt(t)] = !0));
}
function Wt(e) {
  return x(e) && e.level === 1;
}
function zt(e) {
  return e.championId ?? e.id;
}
function Xe(e) {
  let t = e.level2CardCode ?? e.leveledUpCardId;
  return t ? N(t) : void 0;
}
function Ta(e, t, r, a) {
  R(r).level !== 2 &&
    ((r.cardId = a.id),
    (r.attack = a.attack ?? r.attack),
    (r.maxHealth = a.health ?? r.maxHealth),
    (r.keywords = [...(a.keywords ?? [])]),
    m(e, {
      type: "CHAMPION_LEVELED_UP",
      playerId: t,
      unitInstanceId: r.instanceId,
    }),
    e.visualEvents.push({
      type: "CHAMPION_LEVELED_UP",
      playerId: t,
      unitId: r.instanceId,
      newLevel: 2,
    }));
}
function Xt(e) {
  return `CHAMPION_STRUCK:${e}`;
}
function $t(e, t) {
  Ut(e, t);
  let r = E(e);
  r.visualEvents = [];
  let a = r;
  switch (t.type) {
    case "START_GAME":
      a = Na(r, t.firstPlayerId ?? "P1");
      break;
    case "DRAW_CARD":
      a = Ca(r, t.playerId, t.count ?? 1);
      break;
    case "DISCARD_CARD":
      a = ba(r, t.playerId, t.cardInstanceId);
      break;
    case "START_ROUND":
      a = Da(r);
      break;
    case "PLAY_UNIT":
      a = Zt(
        r,
        t.playerId,
        t.cardInstanceId,
        t.replaceUnitId,
        t.target,
        t.costTargets,
      );
      break;
    case "PLAY_SPELL":
      a = va(r, t.playerId, t.cardInstanceId, t.target, t.costTargets);
      break;
    case "SUBMIT_ABILITY_TARGETS":
      a = Ua(r, t.playerId, t.targets);
      break;
    case "CANCEL_PENDING_CHOICE":
      a = La(r, t.playerId);
      break;
    case "DECLARE_ATTACKER":
      a = Ma(r, t.playerId, t.unitInstanceId);
      break;
    case "REMOVE_ATTACKER":
      a = Oa(r, t.playerId, t.unitInstanceId);
      break;
    case "COMMIT_ATTACK":
      a = Ga(r, t.playerId);
      break;
    case "DECLARE_BLOCKER":
      a = Fa(r, t.playerId, t.attackerId, t.blockerId);
      break;
    case "REMOVE_BLOCKER":
      a = Ya(r, t.playerId, t.blockerId);
      break;
    case "COMMIT_BLOCKS":
      a = tr(r, t.playerId);
      break;
    case "RESOLVE_COMBAT":
      a = We(r);
      break;
    case "END_TURN":
      a = ar(r, t.playerId);
      break;
    case "TIME_OUT":
      a = Va(r, t.playerId);
      break;
    case "SURRENDER":
      w(a, u(t.playerId), "SURRENDER");
      break;
  }
  (t.type !== "TIME_OUT" &&
    t.type !== "SURRENDER" &&
    "playerId" in t &&
    (a.players[t.playerId].consecutiveAfkCount = 0),
    j(a),
    Bt(a));
  let n = ce(a);
  return (Sa(n), n);
}
function Sa(e) {
  ((e.turnStartTime = Date.now()),
    (e.turnDuration =
      e.players[e.priorityPlayerId].consecutiveAfkCount > 0 ? 15e3 : 3e4));
}
function Na(e, t) {
  let r = E(e);
  ((r.started = !0),
    (r.activePlayerId = t),
    (r.priorityPlayerId = t),
    (r.attackTokenPlayerId = t),
    (r.attackTokenAvailable = !0),
    (r.phase = "ACTION"),
    (r.combat.attackers = []),
    (r.consecutivePasses = 0),
    (r.round = 1),
    (r.turn = 1));
  for (let a of S)
    ((r.players[a].deck = xa(
      r.players[a].deck,
      r.rngSeed + (a === "P1" ? 101 : 202),
    )),
      $e(r, r.players[a], vt));
  return ((r.rngSeed += 1), Qt(r, !1), m(r, { type: "GAME_STARTED" }), r);
}
function Da(e) {
  let t = E(e);
  return (qt(t), t);
}
function qt(e) {
  let t = e;
  (m(t, { type: "ROUND_ENDED" }),
    j(t, "END_ROUND"),
    (t.round += 1),
    (t.turn = 1),
    (t.attackTokenPlayerId = u(t.attackTokenPlayerId)),
    (t.attackTokenAvailable = !0),
    (t.activePlayerId = t.attackTokenPlayerId),
    (t.priorityPlayerId = t.attackTokenPlayerId),
    (t.phase = "ACTION"),
    (t.pendingDiscard = void 0),
    (t.combat.attackers = []),
    nr(t),
    (t.consecutivePasses = 0),
    Qt(t, !0),
    !t.winnerId && (m(t, { type: "ROUND_STARTED" }), Ka(t)));
}
function Qt(e, t) {
  for (let r of S) {
    if (e.winnerId) return;
    let a = e.players[r];
    ((a.spellMana = Math.min(Rt, a.spellMana + a.mana)),
      (a.maxMana = Math.min(bt, a.maxMana + 1)),
      (a.mana = a.maxMana),
      (a.board = a.board.map((n) => ({
        ...n,
        exhausted: !1,
        attacking: !1,
        blockingUnitId: void 0,
        blockedByUnitId: void 0,
      }))),
      (a.abilityProgress.SPELLS_CAST_THIS_ROUND = 0),
      t && $e(e, a, 1));
  }
}
function Ca(e, t, r) {
  let a = E(e);
  return ($e(a, a.players[t], r), a);
}
function ba(e, t, r) {
  let a = E(e),
    n = a.players[t];
  if ((O(a, t, [r]), n.hand.length <= (a.pendingDiscard?.downTo ?? M))) {
    let o = a.pendingDiscard,
      i = o?.returnPhase ?? "ACTION",
      c = o?.remainingPlayerIds ?? [];
    ((a.pendingDiscard = void 0), (a.phase = i), Qe(a, c, i));
  }
  return a;
}
function $e(e, t, r) {
  Z(e, t.id, r);
}
function Zt(e, t, r, a, n, o, i) {
  let c = E(e),
    d = c.players[t],
    l = d.hand.findIndex((I) => I.instanceId === r),
    [p] = d.hand.splice(l, 1),
    h = g(p),
    A = (h.abilities ?? []).filter((I) => I.onPlay);
  (qe(c, t, h.additionalCost, o),
    (d.mana -= h.cost),
    a && V(c, t, a, "EFFECT"),
    d.board.push(L(p)),
    (c.consecutivePasses = 0),
    fe(c, t),
    m(c, {
      type: "CARD_PLAYED",
      playerId: t,
      cardInstanceId: r,
      sourcePlayerId: t,
      sourceInstanceId: p.instanceId,
      sourceCardId: p.cardId,
    }),
    m(c, {
      type: "UNIT_SUMMONED",
      playerId: t,
      cardInstanceId: r,
      unitInstanceId: p.instanceId,
      sourcePlayerId: t,
      sourceInstanceId: p.instanceId,
      sourceCardId: p.cardId,
      targetPlayerId: t,
      targetInstanceId: p.instanceId,
      targetUnitId: p.instanceId,
      targetCardId: p.cardId,
    }));
  for (let I of A) {
    let G = i ?? (n ? { target: n } : {}),
      _ = d.board.find((U) => U.instanceId === p.instanceId),
      z = Ye(I, G);
    if (z.length > 0) {
      let U = z.filter((Te) => Ra(c, t, Te));
      if (U.length === 0) continue;
      return (
        (c.pendingChoice = {
          playerId: t,
          sourceInstanceId: p.instanceId,
          sourceCardId: p.cardId,
          abilityId: I.id,
          requiredTargets: U,
          chosenTargets: G,
          returnPhase: c.phase,
        }),
        (c.priorityPlayerId = t),
        (c.activePlayerId = t),
        c
      );
    } else {
      let U = d.board.find((Te) => Te.instanceId === p.instanceId);
      try {
        K(c, I, {
          sourceId: p.instanceId,
          sourceName: h.name,
          sourcePlayerId: t,
          sourceUnit: U,
          selectedTargets: G,
        });
      } catch {}
    }
  }
  return c;
}
function Ra(e, t, r) {
  let a = e.players[t],
    n = u(t),
    o = e.players[n];
  switch (r.kind) {
    case "SELF":
    case "ALLY_NEXUS":
    case "ENEMY_NEXUS":
      return !0;
    case "ALLY_UNIT":
      return a.board.length > 0;
    case "ENEMY_UNIT":
      return o.board.length > 0;
    case "ANY_UNIT":
    case "ANY_TARGET":
      return a.board.length + o.board.length > 0;
    case "ALLY_HAND_CARD":
      return a.hand.some((i) => J(i, r, !0));
    case "ENEMY_HAND_CARD":
      return o.hand.some((i) => J(i, r, !0));
    case "ANY_HAND_CARD":
      return [...a.hand, ...o.hand].some((i) => J(i, r, !0));
    case "ALLY_DECK_CARD":
      return a.deck.some((i) => J(i, r));
    case "ANY_DECK_CARD":
      return [...a.deck, ...o.deck].some((i) => J(i, r));
    case "ALLY_GRAVEYARD":
      return a.graveyard.some((i) => i.type !== "SPELL");
    case "ENEMY_GRAVEYARD":
      return o.graveyard.some((i) => i.type !== "SPELL");
    case "ANY_GRAVEYARD":
      return [...a.graveyard, ...o.graveyard].some((i) => i.type !== "SPELL");
  }
}
function J(e, t, r = !1) {
  let a = t.filter,
    n = g(e);
  return !r && n.level === 2
    ? !1
    : a
      ? (!a.archetype || n.archetype === a.archetype) &&
        (!a.cardType || n.type === a.cardType) &&
        (!a.cardTypes || a.cardTypes.includes(n.type)) &&
        (!a.spellSpeed || n.spellSpeed === a.spellSpeed) &&
        (a.maxCost === void 0 || n.cost <= a.maxCost)
      : !0;
}
function va(e, t, r, a, n) {
  let o = E(e),
    i = o.players[t],
    c = i.hand.findIndex((I) => I.instanceId === r),
    [d] = i.hand.splice(c, 1),
    l = g(d),
    p = l.spellSpeed ?? "slow",
    h = wa(t, a),
    A = (l.abilities ?? [])
      .filter((I) => !I.when)
      .map((I) => ({ ability: I, missingTargets: Ye(I, h) }))
      .find((I) => I.missingTargets.length > 0);
  if (A)
    return (
      i.hand.splice(c, 0, d),
      (o.pendingChoice = {
        playerId: t,
        sourceInstanceId: d.instanceId,
        sourceCardId: d.cardId,
        abilityId: A.ability.id,
        requiredTargets: A.missingTargets,
        chosenTargets: h,
        costTargets: n,
        returnPhase: o.phase,
      }),
      (o.priorityPlayerId = t),
      (o.activePlayerId = t),
      o
    );
  if ((qe(o, t, l.additionalCost, n), rr(i, l.cost), l.abilities?.length))
    Mt(o, d, a);
  else
    for (let I of l.effects ?? [])
      ge(o, {
        sourceId: d.instanceId,
        sourceName: l.name,
        sourceCardId: d.cardId,
        sourcePlayerId: t,
        effect: I,
        target: Vt(I, t, a),
      });
  return (
    le(o, d, t),
    (o.consecutivePasses = 0),
    p !== "burst" && fe(o, t),
    Jt(o, t, d, a),
    o
  );
}
function Ua(e, t, r) {
  let a = E(e),
    n = a.pendingChoice;
  if (!n) return a;
  let o = a.players[t];
  if (n.playUnit) {
    let _ = { ...n.chosenTargets, ...r };
    er(_);
    let z = n.requiredTargets.filter((U) => !_[U.id]);
    return z.length > 0
      ? ((a.pendingChoice = { ...n, chosenTargets: _, requiredTargets: z }), a)
      : ((a.pendingChoice = void 0),
        Zt(
          a,
          t,
          n.sourceInstanceId,
          n.playUnit.replaceUnitId,
          void 0,
          n.playUnit.costTargets,
          _,
        ));
  }
  let i = o.board.find((_) => _.instanceId === n.sourceInstanceId);
  if (i) return ka(a, t, n, i, r);
  let c = o.hand.findIndex((_) => _.instanceId === n.sourceInstanceId),
    d = o.hand[c];
  if (!d) throw new s("Pending choice source card is not in hand.");
  let l = g(d),
    p = (l.abilities ?? []).find((_) => _.id === n.abilityId);
  if (!p) throw new s("Pending choice ability not found.");
  let h = { ...n.chosenTargets, ...r };
  Pa(h, n.sourceInstanceId);
  let A = n.requiredTargets.filter((_) => !h[_.id]);
  if (A.length > 0)
    return (
      (a.pendingChoice = { ...n, chosenTargets: h, requiredTargets: A }),
      a
    );
  if (o.mana + o.spellMana < l.cost) throw new s("Not enough mana.");
  (qe(a, t, l.additionalCost, n.costTargets),
    K(a, p, {
      sourceId: d.instanceId,
      sourceName: l.name,
      sourcePlayerId: t,
      sourceCard: d,
      selectedTargets: h,
    }));
  let I = o.hand.findIndex((_) => _.instanceId === n.sourceInstanceId);
  if (I === -1) throw new s("Pending choice source card is not in hand.");
  let [G] = o.hand.splice(I, 1);
  return (
    rr(o, l.cost),
    le(a, G, t),
    (a.pendingChoice = void 0),
    (a.phase = n.returnPhase),
    (a.consecutivePasses = 0),
    (l.spellSpeed ?? "slow") !== "burst" && fe(a, t),
    Jt(a, t, G, h.target),
    a
  );
}
function ka(e, t, r, a, n) {
  let o = R(a),
    i = (o.abilities ?? []).find((l) => l.id === r.abilityId);
  if (!i) throw new s("Pending choice ability not found.");
  let c = { ...r.chosenTargets, ...n };
  er(c);
  let d = r.requiredTargets.filter((l) => !c[l.id]);
  return d.length > 0
    ? ((e.pendingChoice = { ...r, chosenTargets: c, requiredTargets: d }), e)
    : (K(e, i, {
        sourceId: a.instanceId,
        sourceName: o.name,
        sourcePlayerId: t,
        sourceUnit: a,
        selectedTargets: c,
      }),
      (e.pendingChoice = void 0),
      (e.phase = r.returnPhase),
      (e.priorityPlayerId = u(t)),
      (e.activePlayerId = u(t)),
      e);
}
function La(e, t) {
  let r = E(e),
    a = r.pendingChoice;
  return (
    a &&
      ((r.phase = a.returnPhase),
      (r.pendingChoice = void 0),
      r.players[a.playerId].board.some(
        (o) => o.instanceId === a.sourceInstanceId,
      ) && ((r.priorityPlayerId = u(t)), (r.activePlayerId = u(t)))),
    r
  );
}
function wa(e, t) {
  return { target: t, self: { type: "SELF", playerId: e } };
}
function Pa(e, t) {
  for (let r of Object.values(e))
    if (r.type === "HAND_CARD" && r.cardInstanceId === t)
      throw new s(
        "Ability cannot choose its source card as a hand-card target.",
      );
}
function Jt(e, t, r, a) {
  (m(e, {
    type: "CARD_PLAYED",
    playerId: t,
    cardInstanceId: r.instanceId,
    sourcePlayerId: t,
    sourceInstanceId: r.instanceId,
    sourceCardId: r.cardId,
  }),
    m(e, {
      type: "SPELL_CAST",
      playerId: t,
      cardInstanceId: r.instanceId,
      target: a,
      sourcePlayerId: t,
      sourceInstanceId: r.instanceId,
      sourceCardId: r.cardId,
    }));
}
function qe(e, t, r, a = []) {
  if (r)
    switch (r.type) {
      case "SACRIFICE_UNITS":
        for (let n of a) n.type === "UNIT" && V(e, t, n.unitId, "EFFECT");
        return;
    }
}
function er(e) {
  let t = new Set();
  for (let r of Object.values(e)) {
    if (r.type !== "UNIT") continue;
    let a = `${r.playerId}:${r.unitId}`;
    if (t.has(a)) throw new s("Ability targets must be unique.");
    t.add(a);
  }
}
function Ma(e, t, r) {
  let a = E(e),
    n = y(a, t, r);
  return (
    (n.exhausted = !0),
    a.combat.attackers.push({ attackerId: n.instanceId }),
    (a.consecutivePasses = 0),
    a
  );
}
function Oa(e, t, r) {
  let a = E(e),
    n = y(a, t, r);
  return (
    (n.exhausted = !1),
    (a.combat.attackers = a.combat.attackers.filter((o) => o.attackerId !== r)),
    (a.consecutivePasses = 0),
    a
  );
}
function Ga(e, t) {
  let r = E(e),
    a = u(t);
  return (
    m(r, { type: "ATTACK_COMMITTED", playerId: t }),
    (r.phase = "BLOCK"),
    (r.consecutivePasses = 0),
    (r.priorityPlayerId = a),
    (r.activePlayerId = a),
    (r.turn += 1),
    r
  );
}
function Fa(e, t, r, a) {
  let n = E(e);
  y(n, t, a);
  let o = n.combat.attackers.find((i) => i.attackerId === r);
  return (
    o && (o.blockerId = a),
    (n.consecutivePasses = 0),
    m(n, { type: "BLOCK_DECLARED", playerId: t, attackerId: r, blockerId: a }),
    n
  );
}
function Ya(e, t, r) {
  let a = E(e);
  y(a, t, r);
  let n = a.combat.attackers.find((o) => o.blockerId === r);
  return (n && (n.blockerId = void 0), (a.consecutivePasses = 0), a);
}
function tr(e, t) {
  let r = E(e);
  return (
    (r.phase = "COMBAT"),
    (r.consecutivePasses = 0),
    (r.priorityPlayerId = u(t)),
    (r.activePlayerId = u(t)),
    (r.turn += 1),
    r
  );
}
function We(e) {
  let t = E(e),
    r = t.players[t.attackTokenPlayerId],
    a = u(t.attackTokenPlayerId),
    n = t.players[a];
  for (let o of t.combat.attackers) {
    let i = r.board.find((d) => d.instanceId === o.attackerId);
    if (!i || T(i) <= 0) continue;
    let c = o.blockerId
      ? n.board.find((d) => d.instanceId === o.blockerId)
      : void 0;
    if (c && T(c) > 0)
      if (je(i, "QUICK_ATTACK")) {
        let d = P(i),
          l = Ie(t, c, d, i);
        if (
          (ee(t, i, l.damageDealt, c),
          je(i, "OVERWHELM") && Ke(t, i, a, l.excessDamage),
          T(c) > 0)
        ) {
          let p = Ie(t, i, P(c), c);
          ee(t, c, p.damageDealt, i);
        }
      } else {
        let d = Ie(t, c, P(i), i);
        ee(t, i, d.damageDealt, c);
        let l = Ie(t, i, P(c), c);
        (ee(t, c, l.damageDealt, i),
          je(i, "OVERWHELM") && Ke(t, i, a, d.excessDamage));
      }
    else (ee(t, i, P(i)), Ke(t, i, a, P(i)));
  }
  return (
    j(t, "COMBAT_END", "COMBAT"),
    nr(t),
    (t.combat.attackers = []),
    (t.phase = "ACTION"),
    (t.attackTokenAvailable = !1),
    (t.priorityPlayerId = a),
    (t.activePlayerId = a),
    (t.consecutivePasses = 0),
    t
  );
}
function rr(e, t) {
  let r = Math.min(e.spellMana, t);
  ((e.spellMana -= r), (e.mana -= t - r));
}
function xa(e, t) {
  let r = [...e],
    a = Ha(t);
  for (let n = r.length - 1; n > 0; n -= 1) {
    let o = Math.floor(a() * (n + 1));
    [r[n], r[o]] = [r[o], r[n]];
  }
  return r;
}
function Ha(e) {
  let t = e >>> 0;
  return () => {
    t += 1831565813;
    let r = t;
    return (
      (r = Math.imul(r ^ (r >>> 15), r | 1)),
      (r ^= r + Math.imul(r ^ (r >>> 7), r | 61)),
      ((r ^ (r >>> 14)) >>> 0) / 4294967296
    );
  };
}
function Ie(e, t, r, a) {
  return pe(
    e,
    t,
    r,
    a
      ? {
          playerId: a.ownerId,
          sourceId: a.instanceId,
          sourceInstanceId: a.instanceId,
          sourceCardId: a.cardId,
          damageType: "COMBAT",
        }
      : void 0,
  );
}
function Ke(e, t, r, a) {
  B(
    e,
    {
      playerId: t.ownerId,
      sourceId: t.instanceId,
      sourceInstanceId: t.instanceId,
      sourceCardId: t.cardId,
      damageType: "COMBAT",
    },
    { type: "NEXUS", playerId: r },
    a,
  );
}
function ee(e, t, r, a) {
  m(e, {
    type: "UNIT_STRUCK",
    playerId: t.ownerId,
    unitInstanceId: t.instanceId,
    sourcePlayerId: t.ownerId,
    sourceInstanceId: t.instanceId,
    sourceCardId: t.cardId,
    targetPlayerId: a?.ownerId,
    targetInstanceId: a?.instanceId,
    targetUnitId: a?.instanceId,
    targetCardId: a?.cardId,
    amount: r,
  });
}
function je(e, t) {
  return e.keywords.includes(t);
}
function Ba(e) {
  for (let t of e.combat.attackers)
    for (let r of S) {
      let a = e.players[r].board.find((n) => n.instanceId === t.attackerId);
      a && (a.exhausted = !1);
    }
  e.combat.attackers = [];
}
function ar(e, t) {
  let r = E(e);
  return (
    r.phase === "ACTION" && r.combat.attackers.length > 0 && Ba(r),
    (r.consecutivePasses += 1),
    r.consecutivePasses >= 2
      ? (qt(r), r)
      : (fe(r, t),
        (r.turn += 1),
        m(r, { type: "TURN_ENDED" }),
        j(r, "END_TURN"),
        m(r, { type: "TURN_STARTED" }),
        r)
  );
}
function Va(e, t) {
  let r = E(e),
    a = r.players[t];
  return (
    (a.consecutiveAfkCount += 1),
    a.consecutiveAfkCount >= 3
      ? (w(r, u(t), "AFK_TIMEOUT"), r)
      : (r.visualEvents.push({
          type: "AFK_WARNING",
          playerId: t,
          afkCount: a.consecutiveAfkCount,
        }),
        r.phase === "BLOCK"
          ? We(tr(r, t))
          : r.phase === "COMBAT"
            ? We(r)
            : ar(r, t))
  );
}
function fe(e, t) {
  ((e.priorityPlayerId = u(t)), (e.activePlayerId = u(t)));
}
function Ka(e) {
  let t = S.filter((r) => e.players[r].hand.length > M);
  Qe(e, t, "ACTION");
}
function Qe(e, t, r) {
  let [a, ...n] = t;
  if (a) {
    if (e.players[a].hand.length <= M) {
      Qe(e, n, r);
      return;
    }
    ja(e, a, r, n);
  }
}
function ja(e, t, r, a = []) {
  e.players[t].hand.length <= M ||
    ((e.pendingDiscard = {
      playerId: t,
      downTo: M,
      returnPhase: r,
      reason: "HAND_LIMIT",
      remainingPlayerIds: a,
    }),
    (e.phase = "DISCARD"),
    (e.priorityPlayerId = t),
    (e.activePlayerId = t),
    e.visualEvents.push({
      type: "HAND_LIMIT_DISCARD_REQUIRED",
      playerId: t,
      handSize: e.players[t].hand.length,
      downTo: M,
    }));
}
function j(e, t, r = "EFFECT") {
  t === "END_TURN"
    ? he(e, "THIS_TURN")
    : t === "END_ROUND"
      ? (he(e, "THIS_TURN"), he(e, "THIS_ROUND"))
      : t === "COMBAT_END" && he(e, "UNTIL_COMBAT_END");
  for (let a of S) Ue(e, e.players[a], r);
  _a(e);
}
function he(e, t) {
  for (let r of S)
    for (let a of e.players[r].board)
      a.modifiers = a.modifiers.filter((n) => n.duration !== t);
}
function nr(e) {
  for (let t of S)
    e.players[t].board = e.players[t].board.map((r) => ({
      ...r,
      boardRow: "WAITING",
      attacking: !1,
      blockingUnitId: void 0,
      blockedByUnitId: void 0,
    }));
}
function Wa(e) {
  return (
    e.started &&
    !e.winnerId &&
    Number.isFinite(e.turnStartTime) &&
    Number.isFinite(e.turnDuration) &&
    e.turnDuration > 0
  );
}
function Ze(e) {
  return e.turnStartTime + e.turnDuration;
}
function ir(e, t = Date.now()) {
  return Wa(e) && t >= Ze(e) + 1500;
}
var v = require("@aws-sdk/client-scheduler");
var Xa = process.env.AWS_REGION || process.env.DB_REGION || "ap-southeast-1",
  Ee = new v.SchedulerClient({ region: Xa }),
  $a = 1e3;
function qa() {
  let e = process.env.TURN_TIMEOUT_SCHEDULER_ROLE_ARN?.trim();
  if (!e) throw new Error("Missing TURN_TIMEOUT_SCHEDULER_ROLE_ARN.");
  if (!e.startsWith("arn:aws:iam::"))
    throw new Error("Invalid TURN_TIMEOUT_SCHEDULER_ROLE_ARN.");
  return e;
}
function Qa() {
  let e = process.env.HANDLE_TIMEOUT_LAMBDA_ARN?.trim();
  if (!e) throw new Error("Missing HANDLE_TIMEOUT_LAMBDA_ARN.");
  if (!e.startsWith("arn:aws:lambda:"))
    throw new Error("Invalid HANDLE_TIMEOUT_LAMBDA_ARN.");
  return e;
}
function or() {
  return process.env.TURN_TIMEOUT_SCHEDULER_GROUP?.trim() || "default";
}
function cr(e) {
  let t = "turn-",
    r = 64 - t.length,
    a = e.replace(/[^a-zA-Z0-9-_.]/g, "-"),
    n = a.length > r ? a.slice(-r) : a;
  return `${t}${n}`;
}
function Za(e, t = Date.now()) {
  let r = Math.max(e, t + $a),
    a = Math.ceil(r / 1e3) * 1e3;
  return `at(${new Date(a).toISOString().slice(0, 19)})`;
}
function Ja(e) {
  let t = typeof e?.message == "string" ? e.message : "",
    r = typeof e?.name == "string" ? e.name : "";
  return t.includes("allow AWS EventBridge Scheduler to assume the role") ||
    t.includes("AssumeRole")
    ? "ROLE_ASSUME"
    : r === "AccessDeniedException" ||
        t.includes("iam:PassRole") ||
        t.includes("AccessDenied")
      ? "IAM_DENIED"
      : r === "ResourceNotFoundException"
        ? "NOT_FOUND"
        : r === "ConflictException"
          ? "CONFLICT"
          : r === "ValidationException"
            ? "VALIDATION"
            : "UNKNOWN";
}
function en(e) {
  let { matchId: t, state: r, stateVersion: a, now: n = Date.now() } = e;
  if (!r.started || r.winnerId) return;
  let o = r.turnStartTime + r.turnDuration,
    i = Math.max(0, o - n),
    c = Math.ceil(i / 1e3);
  return {
    message: {
      matchId: t,
      stateVersion: a,
      expectedPlayerId: r.priorityPlayerId,
      turnStartTime: r.turnStartTime,
      turnDuration: r.turnDuration,
      deadline: o,
    },
    delaySeconds: c,
  };
}
async function Je(e) {
  let t = en(e);
  if (!t) return;
  let r = qa(),
    a = Qa(),
    n = or(),
    o = cr(e.matchId),
    i = Za(t.message.deadline + 1500, e.now),
    c = {
      Name: o,
      GroupName: n,
      ScheduleExpression: i,
      FlexibleTimeWindow: { Mode: "OFF" },
      ActionAfterCompletion: "NONE",
      Target: {
        Arn: a,
        RoleArn: r,
        Input: JSON.stringify(t.message),
        RetryPolicy: { MaximumEventAgeInSeconds: 300, MaximumRetryAttempts: 2 },
      },
    };
  try {
    await tn(c);
  } catch (d) {
    throw (
      console.error(`TURN_TIMEOUT_SCHEDULE_FAILED [${Ja(d)}]:`, {
        error: d?.message || d,
        name: o,
        groupName: n,
        scheduleExpression: i,
        targetArn: a,
        roleArn: r,
      }),
      d
    );
  }
}
async function tn(e) {
  try {
    await Ee.send(new v.UpdateScheduleCommand(e));
    return;
  } catch (t) {
    if (t?.name !== "ResourceNotFoundException") throw t;
  }
  try {
    await Ee.send(new v.CreateScheduleCommand(e));
  } catch (t) {
    if (t?.name !== "ConflictException") throw t;
    await Ee.send(new v.UpdateScheduleCommand(e));
  }
}
async function et(e) {
  try {
    await Ee.send(
      new v.DeleteScheduleCommand({ Name: cr(e), GroupName: or() }),
    );
  } catch (t) {
    t?.name !== "ResourceNotFoundException" &&
      console.warn("Could not delete turn timeout schedule:", t);
  }
}
var _e = require("@aws-sdk/client-sqs"),
  rn = process.env.AWS_REGION || process.env.DB_REGION || "ap-southeast-1",
  an = new _e.SQSClient({ region: rn });
async function sr(e) {
  let t = process.env.SQS_MATCH_RESULTS_QUEUE_URL;
  if (!t)
    return (
      console.error(
        "SQS_MATCH_RESULTS_QUEUE_URL is missing; match result was not queued.",
      ),
      !1
    );
  let r = e.match.player_1?.user_id,
    a = e.match.player_2?.user_id;
  return !r || !a
    ? (console.error(
        `Match ${e.match.match_id} has no authenticated player pair.`,
      ),
      !1)
    : (await an.send(
        new _e.SendMessageCommand({
          QueueUrl: t,
          MessageBody: JSON.stringify({
            matchId: e.match.match_id,
            winnerId: e.winnerId,
            reason: e.reason,
            endedAt: e.endedAt ?? Date.now(),
            player1: { userId: r },
            player2: { userId: a },
          }),
        }),
      ),
      !0);
}
var nn = process.env.AWS_REGION || process.env.DB_REGION || "ap-southeast-1",
  dr = process.env.GAME_STATE_TABLE || "GameState",
  on = process.env.GAME_LOGS_TABLE || "GameLogs";
function cn() {
  return process.env.WS_MANAGEMENT_ENDPOINT?.replace(/\/$/, "");
}
function sn(e) {
  return e?.name === "GoneException" || e?.$metadata?.httpStatusCode === 410;
}
function dn(e) {
  return e === "P1" || e === "P2";
}
function lr(e) {
  let t = e;
  if (typeof e == "string")
    try {
      t = JSON.parse(e);
    } catch {
      throw new Error("Invalid string payload for turn timeout.");
    }
  else e?.detail && typeof e.detail == "object" && (t = e.detail);
  if (
    typeof t?.matchId != "string" ||
    !t.matchId ||
    !Number.isInteger(t.stateVersion) ||
    Number(t.stateVersion) < 0 ||
    !dn(t.expectedPlayerId) ||
    !Number.isFinite(t.turnStartTime) ||
    !Number.isFinite(t.turnDuration) ||
    Number(t.turnDuration) <= 0 ||
    !Number.isFinite(t.deadline)
  )
    throw new Error(`Invalid turn-timeout payload: ${JSON.stringify(e)}`);
  return t;
}
function pr(e, t = Date.now()) {
  return e.status === "IN_PROGRESS" && ir(e.engine_state, t)
    ? e.engine_state.priorityPlayerId
    : void 0;
}
function ur(e, t) {
  let r = e.engine_state;
  return (
    e.status === "IN_PROGRESS" &&
    !r.winnerId &&
    (e.state_version ?? 0) === t.stateVersion &&
    r.priorityPlayerId === t.expectedPlayerId &&
    r.turnStartTime === t.turnStartTime &&
    r.turnDuration === t.turnDuration &&
    Ze(r) === t.deadline
  );
}
function ln(e, t) {
  let r = structuredClone(e),
    a = t === "P1" ? "P2" : "P1",
    n = r.players[a];
  return (
    (n.hand = n.hand.map((o, i) => ({
      instanceId: `hidden-hand-${a}-${i}`,
      cardId: "hidden-card",
      ownerId: a,
    }))),
    (n.deck = n.deck.map((o, i) => ({
      instanceId: `hidden-deck-${a}-${i}`,
      cardId: "hidden-card",
      ownerId: a,
    }))),
    r
  );
}
async function pn(e, t) {
  let r = cn();
  if (!r) {
    console.error(
      "Timeout committed without WS_MANAGEMENT_ENDPOINT; clients were not notified.",
    );
    return;
  }
  let a = new Ae.ApiGatewayManagementApiClient({ endpoint: r, region: nn }),
    n = [
      [e.player_1?.connection_id, "P1", e.player_2?.connected !== !1],
      [e.player_2?.connection_id, "P2", e.player_1?.connected !== !1],
    ];
  await Promise.all(
    n.map(async ([o, i, c]) => {
      if (o)
        try {
          await a.send(
            new Ae.PostToConnectionCommand({
              ConnectionId: o,
              Data: Buffer.from(
                JSON.stringify({
                  event: "room:update",
                  roomCode: e.match_id,
                  playerId: i,
                  opponentConnected: c,
                  serverTime: Date.now(),
                  state: ln(t, i),
                }),
              ),
            }),
          );
        } catch (d) {
          sn(d) || console.error("Could not publish timeout state:", d);
        }
    }),
  );
}
async function un(e, t, r) {
  let a = Date.now();
  try {
    await ae.send(
      new W.PutCommand({
        TableName: on,
        Item: {
          match_id: e,
          action_sequence: a,
          actor_id: t,
          action_type: "TIME_OUT",
          details: {
            playerId: t,
            round: r.round,
            afkCount: r.players[t].consecutiveAfkCount,
          },
          timestamp: a,
        },
      }),
    );
  } catch (n) {
    console.error("Could not write timeout log:", n);
  }
}
async function yn(e) {
  return (
    await ae.send(
      new W.GetCommand({
        TableName: dr,
        Key: { match_id: e },
        ConsistentRead: !0,
      }),
    )
  ).Item;
}
async function mn(e) {
  await Je({
    matchId: e.match_id,
    state: e.engine_state,
    stateVersion: e.state_version ?? 0,
  });
}
async function yr(e) {
  let t = await yn(e.matchId);
  if (!t || t.status !== "IN_PROGRESS" || t.engine_state?.winnerId) {
    await et(e.matchId);
    return;
  }
  let r = ur(t, e) ? pr(t) : void 0;
  if (!r) {
    await mn(t);
    return;
  }
  let a = t.engine_state,
    n = $t(a, { type: "TIME_OUT", playerId: r }),
    o = !!n.winnerId,
    i = n.endReason ?? "UNKNOWN_LEGACY",
    c = t.state_version ?? 0,
    d = c + 1;
  try {
    await ae.send(
      new W.UpdateCommand({
        TableName: dr,
        Key: { match_id: t.match_id },
        ConditionExpression:
          "#status = :active AND (attribute_not_exists(state_version) OR state_version = :version) AND engine_state.turnStartTime = :turnStart AND engine_state.turnDuration = :turnDuration AND engine_state.priorityPlayerId = :playerId",
        UpdateExpression:
          "SET engine_state = :state, #status = :status, current_round = :round, turn_player_id = :nextPlayerId, state_version = :nextVersion" +
          (o
            ? ", winner_id = :winnerId, end_reason = :endReason, ended_at = :endedAt"
            : ""),
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":active": "IN_PROGRESS",
          ":version": c,
          ":nextVersion": d,
          ":turnStart": a.turnStartTime,
          ":turnDuration": a.turnDuration,
          ":playerId": r,
          ":state": n,
          ":status": o ? "FINISHED" : "IN_PROGRESS",
          ":round": n.round,
          ":nextPlayerId": n.priorityPlayerId,
          ...(o
            ? {
                ":winnerId": n.winnerId,
                ":endReason": i,
                ":endedAt": Date.now(),
              }
            : {}),
        },
      }),
    );
  } catch (A) {
    if (A?.name === "ConditionalCheckFailedException") return;
    throw A;
  }
  await pn(t, n);
  let l = (
      o
        ? et(t.match_id)
        : Je({ matchId: t.match_id, state: n, stateVersion: d })
    ).catch(() => {}),
    p = n.winnerId
      ? sr({ match: t, winnerId: n.winnerId, reason: i })
      : Promise.resolve(!1),
    h = await Promise.allSettled([un(t.match_id, r, n), l, p]);
  h[2].status === "rejected" &&
    console.error("Could not queue the timed-out match result:", h[2].reason);
}
var gn = async (e) => {
  try {
    let t = lr(e);
    return (await yr(t), { statusCode: 200, body: "Success." });
  } catch (t) {
    return (
      console.error("Turn-timeout invocation failed:", { event: e, error: t }),
      { statusCode: 400, body: t?.message || "Turn-timeout failed." }
    );
  }
};
0 &&
  (module.exports = {
    duePlayer,
    handler,
    normalizeTurnTimeoutMessage,
    processTimeout,
    timeoutMessageMatches,
  });
