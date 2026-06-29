import { CardDefinition } from "./types";

export const sampleUnitCards: CardDefinition[] = [
  { id: "sparksmith", name: "Sparksmith Adept", cost: 1, type: "unit", attack: 1, health: 2 },
  { id: "glassblade", name: "Glassblade Duelist", cost: 1, type: "unit", attack: 2, health: 1 },
  { id: "river-scout", name: "River Scout", cost: 2, type: "unit", attack: 2, health: 2 },
  { id: "prism-guard", name: "Prism Guard", cost: 2, type: "unit", attack: 1, health: 4 },
  { id: "ember-runner", name: "Ember Runner", cost: 3, type: "unit", attack: 4, health: 2 },
  { id: "mirror-knight", name: "Mirror Knight", cost: 3, type: "unit", attack: 3, health: 3 },
  { id: "aurora-mage", name: "Aurora Mage", cost: 4, type: "unit", attack: 3, health: 5 },
  { id: "shardbreaker", name: "Shardbreaker", cost: 4, type: "unit", attack: 5, health: 3 },
  { id: "sunlit-veteran", name: "Sunlit Veteran", cost: 5, type: "unit", attack: 5, health: 5 },
  { id: "void-cartographer", name: "Void Cartographer", cost: 5, type: "unit", attack: 4, health: 6 },
  { id: "crystal-colossus", name: "Crystal Colossus", cost: 6, type: "unit", attack: 7, health: 6 },
  { id: "kaleido-drake", name: "Kaleido Drake", cost: 7, type: "unit", attack: 8, health: 8 },
  
  // TRIGGER CARDS
  {
    id: "acolyte", name: "Acolyte of Knowledge", cost: 2, type: "unit", attack: 1, health: 1,
    triggers: [{ id: "acolyte-draw", event: "UNIT_SUMMONED", sourceId: "", effects: [{ type: "DRAW_CARD", count: 1, target: "SELF" }] }]
  },
  {
    id: "fierce-striker", name: "Fierce Striker", cost: 2, type: "unit", attack: 3, health: 2,
    triggers: [{ id: "fierce-buff", event: "ATTACK_DECLARED", sourceId: "", effects: [{ type: "BUFF_UNIT", attack: 1, health: 0, duration: "THIS_ROUND", target: "SELF" }] }]
  },
  {
    id: "volatile-bomb", name: "Volatile Bomb", cost: 1, type: "unit", attack: 0, health: 1,
    triggers: [{ id: "bomb-damage", event: "UNIT_DIED", sourceId: "", effects: [{ type: "DEAL_DAMAGE", amount: 2, target: "NEXUS" }] }]
  },
  {
    id: "spellweaver", name: "Spellweaver", cost: 3, type: "unit", attack: 2, health: 2,
    triggers: [{ id: "weaver-buff", event: "SPELL_CAST", sourceId: "", effects: [{ type: "BUFF_UNIT", attack: 1, health: 1, duration: "PERMANENT", target: "ALLY_UNIT" }] }]
  },
  {
    id: "dawn-healer", name: "Dawn Healer", cost: 3, type: "unit", attack: 1, health: 4,
    triggers: [{ id: "dawn-heal", event: "ROUND_STARTED", sourceId: "", effects: [{ type: "HEAL", amount: 2, target: "NEXUS" }] }]
  },
  {
    id: "revenge-spirit", name: "Revenge Spirit", cost: 4, type: "unit", attack: 3, health: 3,
    triggers: [{ id: "revenge-buff", event: "UNIT_DIED", sourceId: "", effects: [{ type: "BUFF_UNIT", attack: 2, health: 0, duration: "PERMANENT", target: "SELF" }] }]
  },
  {
    id: "nexus-guard", name: "Nexus Guard", cost: 5, type: "unit", attack: 4, health: 5,
    triggers: [{ id: "guard-buff", event: "NEXUS_DAMAGED", sourceId: "", effects: [{ type: "BUFF_UNIT", attack: 1, health: 1, duration: "PERMANENT", target: "SELF" }] }]
  },
  {
    id: "blood-mage", name: "Blood Mage", cost: 3, type: "unit", attack: 3, health: 2,
    triggers: [{ id: "blood-draw", event: "UNIT_SUMMONED", sourceId: "", effects: [{ type: "DEAL_DAMAGE", amount: 1, target: "SELF" }, { type: "DRAW_CARD", count: 1, target: "SELF" }] }]
  },
  {
    id: "echoing-strike", name: "Echoing Strike", cost: 4, type: "unit", attack: 3, health: 4,
    triggers: [{ id: "echo-dmg", event: "SPELL_CAST", sourceId: "", effects: [{ type: "DEAL_DAMAGE", amount: 1, target: "NEXUS" }] }]
  },
  {
    id: "chain-brute", name: "Chain Brute", cost: 6, type: "unit", attack: 6, health: 6,
    triggers: [{ id: "chain-heal", event: "UNIT_DIED", sourceId: "", effects: [{ type: "HEAL", amount: 1, target: "SELF" }] }]
  }
];

export const sampleSpellCards: CardDefinition[] = [
  {
    id: "shard-bolt",
    name: "Shard Bolt",
    cost: 1,
    type: "spell",
    effects: [{ type: "DEAL_DAMAGE", amount: 1, target: "ENEMY_UNIT" }]
  },
  {
    id: "mending-light",
    name: "Mending Light",
    cost: 1,
    type: "spell",
    effects: [{ type: "HEAL", amount: 2, target: "ALLY_UNIT" }]
  },
  {
    id: "refocus",
    name: "Refocus",
    cost: 2,
    type: "spell",
    effects: [{ type: "DRAW_CARD", count: 1, target: "SELF" }]
  },
  {
    id: "prismatic-charge",
    name: "Prismatic Charge",
    cost: 2,
    type: "spell",
    effects: [{ type: "BUFF_UNIT", attack: 1, health: 1, target: "ALLY_UNIT" }]
  },
  {
    id: "nexus-spark",
    name: "Nexus Spark",
    cost: 2,
    type: "spell",
    effects: [{ type: "DEAL_DAMAGE", amount: 2, target: "NEXUS" }]
  }
];

export const sampleDeckCards: CardDefinition[] = [
  ...sampleUnitCards,
  ...sampleSpellCards
];
