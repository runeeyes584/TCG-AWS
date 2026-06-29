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
  { id: "kaleido-drake", name: "Kaleido Drake", cost: 7, type: "unit", attack: 8, health: 8 }
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
