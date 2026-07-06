(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/game/types.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GameValidationError",
    ()=>GameValidationError
]);
class GameValidationError extends Error {
    constructor(message){
        super(message);
        this.name = "GameValidationError";
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/game/data/UiaCard.json.[json].cjs [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = [
    {
        "id": "Cat-Black-Fat-Cat",
        "name": "Black Fat Cat",
        "cost": 5,
        "type": "spell",
        "effects": [
            {
                "type": "BANISH_UNIT",
                "target": "ENEMY_UNIT"
            }
        ],
        "imageUrl": "https://media1.tenor.com/m/FKkizy0WHJYAAAAC/jirniy-%D0%BA%D0%BE%D1%82.gif",
        "description": "A fat cat sat on the grave; its weight prevented the opponent from rising from the dead, causing them to vanish instead.",
        "spellSpeed": "fast"
    },
    {
        "id": "Cat-Curse-Paw",
        "name": "Curse Paw",
        "cost": 3,
        "type": "spell",
        "effects": [
            {
                "type": "BANISH_UNIT",
                "target": "ENEMY_UNIT"
            }
        ],
        "imageUrl": "https://media1.tenor.com/m/12ENYku6t2IAAAAC/cat-paw.gif",
        "description": "Mark an enemy unit with Banish. It stays on the board, but when it dies it enters the graveyard banished and can never be revived.",
        "spellSpeed": "fast"
    },
    {
        "id": "Cat-Grave-Seal",
        "name": "Grave Seal",
        "cost": 2,
        "type": "spell",
        "effects": [
            {
                "type": "BANISH_UNIT",
                "target": "ENEMY_GRAVEYARD"
            }
        ],
        "imageUrl": "https://media1.tenor.com/m/5n8PMeGmltAAAAAC/cat-stare.gif",
        "description": "Mark an enemy card in the graveyard with Banish, preventing that card from ever being revived.",
        "spellSpeed": "slow"
    },
    {
        "id": "Cat-Baby-with-bow",
        "name": "Baby Cat with Bow",
        "cost": 2,
        "type": "unit",
        "attack": 2,
        "health": 2,
        "abilities": [
            {
                "id": "Cat-Baby-with-bow-play",
                "onPlay": true,
                "targets": [
                    {
                        "id": "target",
                        "kind": "ENEMY_UNIT",
                        "required": true
                    }
                ],
                "effects": [
                    {
                        "type": "DEBUFF_UNIT",
                        "attackDelta": -1,
                        "healthDelta": 0,
                        "target": "target",
                        "duration": "PERMANENT"
                    }
                ]
            }
        ],
        "imageUrl": "https://media1.tenor.com/m/lwumhdMpAVkAAAAC/a.gif",
        "description": "When summoning the cat, its adorable bow and fluffiness cause the opponent to lower their guard, leaving them vulnerable (-1 Attack to a random enemy unit) [debuff]."
    },
    {
        "id": "Cat-Banana",
        "name": "Cat Banana",
        "cost": 3,
        "type": "unit",
        "attack": 2,
        "health": 3,
        "abilities": [
            {
                "id": "Cat-Banana-play",
                "when": {
                    "event": "UNIT_SUMMONED"
                },
                "effects": [
                    {
                        "type": "DEBUFF_UNIT",
                        "attackDelta": -1,
                        "healthDelta": -1,
                        "target": "RANDOM_ENEMY_UNIT",
                        "duration": "THIS_ROUND"
                    }
                ]
            }
        ],
        "imageUrl": "https://media1.tenor.com/m/JfrX5uK-_qIAAAAC/banana-cat.gif",
        "description": "Summoning the cat causes the opponent to slip and fall (-1 Attack and -1 Health to a random enemy) [debuff]"
    },
    {
        "id": "Cat-hold-gun",
        "name": "Cat Holding a Gun",
        "cost": 1,
        "type": "unit",
        "attack": 1,
        "health": 2,
        "imageUrl": "https://media1.tenor.com/m/bf51eRcGKSQAAAAd/outrageous-cat.gif",
        "description": "A cat holding a gun with its tail."
    }
];
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/game/cardRegistry.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "assertValidCardType",
    ()=>assertValidCardType,
    "assertValidSpellSpeed",
    ()=>assertValidSpellSpeed,
    "getCardDefinition",
    ()=>getCardDefinition,
    "hasCard",
    ()=>hasCard,
    "listCards",
    ()=>listCards,
    "normalizeCardDefinition",
    ()=>normalizeCardDefinition,
    "registerCardDefinition",
    ()=>registerCardDefinition,
    "registerCardDefinitions",
    ()=>registerCardDefinitions
]);
// import cardsJson from "./data/cards.json";
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$data$2f$UiaCard$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/data/UiaCard.json.[json].cjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/types.ts [app-client] (ecmascript)");
;
;
const cardMap = new Map();
for (const card of __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$data$2f$UiaCard$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"]){
    registerCardDefinition(card);
}
function assertValidCardType(type) {
    if (type !== "unit" && type !== "spell" && type !== "champion") {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"](`Invalid card type: ${type}`);
    }
}
function assertValidSpellSpeed(speed) {
    if (speed === undefined) {
        return;
    }
    if (speed !== "burst" && speed !== "fast" && speed !== "slow") {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"](`Invalid spell speed: ${speed}`);
    }
}
function registerCardDefinition(definition) {
    assertValidCardType(definition.type);
    assertValidSpellSpeed(definition.spellSpeed);
    const normalized = normalizeCardDefinition(definition);
    cardMap.set(normalized.id, normalized);
    return normalized;
}
function registerCardDefinitions(definitions) {
    for (const definition of definitions){
        registerCardDefinition(definition);
    }
}
function getCardDefinition(cardId) {
    const definition = cardMap.get(cardId);
    if (!definition) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"](`Card definition not found: ${cardId}`);
    }
    return definition;
}
function hasCard(cardId) {
    return cardMap.has(cardId);
}
function listCards() {
    return [
        ...cardMap.values()
    ];
}
function normalizeCardDefinition(definition) {
    assertValidCardType(definition.type);
    assertValidSpellSpeed(definition.spellSpeed);
    const existingAbilities = definition.abilities ?? [];
    const convertedAbilities = convertTriggersToAbilities(definition.triggers ?? [], existingAbilities);
    return {
        ...definition,
        spellSpeed: definition.type === "spell" ? definition.spellSpeed ?? "slow" : definition.spellSpeed,
        abilities: [
            ...existingAbilities,
            ...convertedAbilities
        ],
        triggers: undefined
    };
}
function convertTriggersToAbilities(triggers, existingAbilities) {
    const existingIds = new Set(existingAbilities.map((ability)=>ability.id));
    return triggers.filter((trigger)=>{
        const migratedId = legacyTriggerAbilityId(trigger.id);
        return !existingIds.has(trigger.id) && !existingIds.has(migratedId);
    }).map((trigger)=>({
            id: legacyTriggerAbilityId(trigger.id),
            when: {
                event: trigger.event
            },
            runtimeCondition: trigger.condition,
            effects: trigger.effects
        }));
}
function legacyTriggerAbilityId(triggerId) {
    return `legacy-trigger:${triggerId}`;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/game/cards.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createCardInstance",
    ()=>createCardInstance,
    "createUnitInstance",
    ()=>createUnitInstance,
    "getCardDefinitionForGraveyardEntry",
    ()=>getCardDefinitionForGraveyardEntry,
    "getCardDefinitionForInstance",
    ()=>getCardDefinitionForInstance,
    "getCardDefinitionForUnit",
    ()=>getCardDefinitionForUnit,
    "getUnitAttack",
    ()=>getUnitAttack,
    "getUnitHealth",
    ()=>getUnitHealth,
    "getUnitMaxHealth",
    ()=>getUnitMaxHealth,
    "isChampionCard",
    ()=>isChampionCard,
    "isUnitCard",
    ()=>isUnitCard,
    "requireStat",
    ()=>requireStat
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/types.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cardRegistry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/cardRegistry.ts [app-client] (ecmascript)");
;
;
function isChampionCard(definition) {
    if (!definition) {
        return false;
    }
    return definition.type === "champion";
}
function isUnitCard(definition) {
    return definition.type === "unit" || definition.type === "champion";
}
function createCardInstance(definitionOrCardId, ownerId, instanceId) {
    const cardId = typeof definitionOrCardId === "string" ? definitionOrCardId : (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cardRegistry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["registerCardDefinition"])(definitionOrCardId).id;
    return {
        instanceId,
        cardId,
        ownerId
    };
}
function createUnitInstance(card) {
    const definition = getCardDefinitionForInstance(card);
    if (!isUnitCard(definition)) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Only unit or champion cards can become units.");
    }
    const attack = requireStat(definition.attack, "attack");
    const health = requireStat(definition.health, "health");
    return {
        instanceId: card.instanceId,
        cardId: definition.id,
        ownerId: card.ownerId,
        attack,
        maxHealth: health,
        damage: 0,
        keywords: [
            ...definition.keywords ?? []
        ],
        temporaryKeywords: [],
        modifiers: [],
        exhausted: false,
        attacking: false
    };
}
function getCardDefinitionForInstance(card) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cardRegistry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCardDefinition"])(card.cardId);
}
function getCardDefinitionForUnit(unit) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cardRegistry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCardDefinition"])(unit.cardId);
}
function getCardDefinitionForGraveyardEntry(entry) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cardRegistry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCardDefinition"])(entry.cardId);
}
function getUnitAttack(unit) {
    return Math.max(0, unit.attack + unit.modifiers.reduce((total, modifier)=>total + modifier.attackDelta, 0));
}
function getUnitMaxHealth(unit) {
    return Math.max(0, unit.maxHealth + unit.modifiers.reduce((total, modifier)=>total + modifier.healthDelta, 0));
}
function getUnitHealth(unit) {
    return getUnitMaxHealth(unit) - unit.damage;
}
function requireStat(value, label) {
    if (value === undefined) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"](`Unit requires ${label}.`);
    }
    return value;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/game/rules.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BOARD_LIMIT",
    ()=>BOARD_LIMIT,
    "HAND_LIMIT",
    ()=>HAND_LIMIT,
    "MAX_MANA",
    ()=>MAX_MANA,
    "MAX_SPELL_MANA",
    ()=>MAX_SPELL_MANA,
    "PLAYER_IDS",
    ()=>PLAYER_IDS,
    "STARTING_HAND_SIZE",
    ()=>STARTING_HAND_SIZE,
    "STARTING_NEXUS_HP",
    ()=>STARTING_NEXUS_HP,
    "checkWinConditions",
    ()=>checkWinConditions,
    "cloneState",
    ()=>cloneState,
    "findCardInHand",
    ()=>findCardInHand,
    "findUnit",
    ()=>findUnit,
    "getAttackers",
    ()=>getAttackers,
    "opponentOf",
    ()=>opponentOf,
    "validateAction",
    ()=>validateAction
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/cards.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/types.ts [app-client] (ecmascript)");
;
;
const PLAYER_IDS = [
    "P1",
    "P2"
];
const STARTING_NEXUS_HP = 20;
const MAX_MANA = 10;
const MAX_SPELL_MANA = 3;
const STARTING_HAND_SIZE = 4;
const HAND_LIMIT = 6;
const BOARD_LIMIT = 6;
function validateAction(state, action) {
    if (state.winnerId) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Cannot apply actions after the game is won.");
    }
    if (action.type !== "START_GAME" && !state.started) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Game has not started.");
    }
    if (state.phase === "DISCARD" && action.type !== "DISCARD_CARD") {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Discard cards until your hand has 6 cards.");
    }
    if (state.pendingChoice && action.type !== "SUBMIT_ABILITY_TARGETS" && action.type !== "CANCEL_PENDING_CHOICE") {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Resolve the pending ability choice first.");
    }
    switch(action.type){
        case "START_GAME":
            if (state.started) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Game has already started.");
            }
            if (action.firstPlayerId && !isPlayerId(action.firstPlayerId)) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Invalid first player.");
            }
            return;
        case "DRAW_CARD":
            assertPlayer(action.playerId);
            if ((action.count ?? 1) < 1) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Draw count must be positive.");
            }
            return;
        case "DISCARD_CARD":
            assertDiscardCard(state, action.playerId, action.cardInstanceId);
            return;
        case "START_ROUND":
            assertPhase(state, "ACTION");
            return;
        case "PLAY_UNIT":
            assertPhase(state, "ACTION");
            assertPriority(state, action.playerId);
            assertBoardSpace(state.players[action.playerId], action.replaceUnitId);
            assertPlayableUnit(state, action.playerId, action.cardInstanceId);
            return;
        case "PLAY_SPELL":
            assertPhase(state, "ACTION");
            assertPriority(state, action.playerId);
            assertPlayableSpell(state, action.playerId, action.cardInstanceId, action.target);
            return;
        case "SUBMIT_ABILITY_TARGETS":
            assertPendingChoicePlayer(state, action.playerId);
            return;
        case "CANCEL_PENDING_CHOICE":
            assertPendingChoicePlayer(state, action.playerId);
            return;
        case "DECLARE_ATTACKER":
            assertPhase(state, "ACTION");
            assertPriority(state, action.playerId);
            if (state.attackTokenPlayerId !== action.playerId) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Player does not have the attack token.");
            }
            if (!state.attackTokenAvailable) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Attack token has already been used.");
            }
            assertUnitCanAttack(state, action.playerId, action.unitInstanceId);
            return;
        case "REMOVE_ATTACKER":
            assertPhase(state, "ACTION");
            assertPriority(state, action.playerId);
            if (state.attackTokenPlayerId !== action.playerId) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Player does not have the attack token.");
            }
            assertCombatAttackerExists(state, action.unitInstanceId);
            return;
        case "COMMIT_ATTACK":
            assertPhase(state, "ACTION");
            assertPriority(state, action.playerId);
            if (state.attackTokenPlayerId !== action.playerId) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Only the attacker can commit attacks.");
            }
            if (!state.attackTokenAvailable) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Attack token has already been used.");
            }
            if (!hasAttackers(state)) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("No attackers declared.");
            }
            return;
        case "DECLARE_BLOCKER":
            assertPhase(state, "BLOCK");
            assertPriority(state, action.playerId);
            if (opponentOf(state.attackTokenPlayerId) !== action.playerId) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Only the defending player can block.");
            }
            assertUnitCanBlock(state, action.playerId, action.blockerId);
            assertCombatAttackerCanBeBlocked(state, action.attackerId);
            return;
        case "REMOVE_BLOCKER":
            assertPhase(state, "BLOCK");
            assertPriority(state, action.playerId);
            if (opponentOf(state.attackTokenPlayerId) !== action.playerId) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Only the defending player can remove blockers.");
            }
            assertAssignedBlocker(state, action.blockerId);
            return;
        case "COMMIT_BLOCKS":
            assertPhase(state, "BLOCK");
            assertPriority(state, action.playerId);
            if (opponentOf(state.attackTokenPlayerId) !== action.playerId) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Only the defending player can commit blocks.");
            }
            return;
        case "RESOLVE_COMBAT":
            assertPhase(state, "COMBAT");
            if (!hasAttackers(state)) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("No attackers declared.");
            }
            return;
        case "END_TURN":
            assertPhase(state, "ACTION");
            assertPriority(state, action.playerId);
            return;
    }
}
function checkWinConditions(state) {
    if (state.winnerId) {
        return state;
    }
    const p1Dead = state.players.P1.nexusHp <= 0;
    const p2Dead = state.players.P2.nexusHp <= 0;
    if (p1Dead && p2Dead) {
        state.winnerId = state.priorityPlayerId;
    } else if (p1Dead) {
        state.winnerId = "P2";
    } else if (p2Dead) {
        state.winnerId = "P1";
    }
    return state;
}
function findUnit(state, playerId, unitInstanceId) {
    const unit = state.players[playerId].board.find((candidate)=>candidate.instanceId === unitInstanceId);
    if (!unit) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Unit is not on board.");
    }
    return unit;
}
function findCardInHand(state, playerId, cardInstanceId) {
    const card = state.players[playerId].hand.find((candidate)=>candidate.instanceId === cardInstanceId);
    if (!card) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Card is not in hand.");
    }
    return card;
}
function getAttackers(state) {
    return state.combat.attackers.map((lane)=>findUnit(state, state.attackTokenPlayerId, lane.attackerId));
}
function opponentOf(playerId) {
    return playerId === "P1" ? "P2" : "P1";
}
function cloneState(state) {
    return {
        ...state,
        effectQueue: state.effectQueue.map((queuedEffect)=>({
                ...queuedEffect,
                target: queuedEffect.target ? {
                    ...queuedEffect.target
                } : undefined
            })),
        visualEvents: state.visualEvents.map((event)=>({
                ...event
            })),
        pendingDiscard: state.pendingDiscard ? {
            ...state.pendingDiscard
        } : undefined,
        pendingChoice: state.pendingChoice ? {
            ...state.pendingChoice,
            requiredTargets: state.pendingChoice.requiredTargets.map((target)=>({
                    ...target
                })),
            chosenTargets: cloneAbilityTargetMap(state.pendingChoice.chosenTargets),
            playUnit: state.pendingChoice.playUnit ? {
                ...state.pendingChoice.playUnit
            } : undefined
        } : undefined,
        combat: {
            attackers: state.combat.attackers.map((lane)=>({
                    ...lane
                }))
        },
        players: {
            P1: clonePlayer(state.players.P1),
            P2: clonePlayer(state.players.P2)
        }
    };
}
function assertPlayer(playerId) {
    if (!isPlayerId(playerId)) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Invalid player.");
    }
}
function assertPriority(state, playerId) {
    assertPlayer(playerId);
    if (state.priorityPlayerId !== playerId) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Player does not have priority.");
    }
}
function assertPhase(state, phase) {
    if (state.phase !== phase) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"](`Action is not allowed during ${state.phase}.`);
    }
}
function assertPendingChoicePlayer(state, playerId) {
    assertPlayer(playerId);
    if (!state.pendingChoice) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("No ability choice is pending.");
    }
    if (state.pendingChoice.playerId !== playerId) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Only the pending player can submit ability targets.");
    }
}
function assertDiscardCard(state, playerId, cardInstanceId) {
    assertPlayer(playerId);
    if (state.phase !== "DISCARD" || !state.pendingDiscard) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("No discard is pending.");
    }
    if (state.pendingDiscard.playerId !== playerId) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Only the pending player can discard.");
    }
    if (state.players[playerId].hand.length <= state.pendingDiscard.downTo) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Hand is already within the limit.");
    }
    assertCardInHand(state, playerId, cardInstanceId);
}
function assertBoardSpace(player, replaceUnitId) {
    if (player.board.length >= BOARD_LIMIT) {
        if (!replaceUnitId) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Board is full. You must replace a unit.");
        }
        const unitToReplace = player.board.find((u)=>u.instanceId === replaceUnitId);
        if (!unitToReplace) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Unit to replace not found on board.");
        }
    } else if (replaceUnitId) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Cannot replace a unit when the board is not full.");
    }
}
function assertCardInHand(state, playerId, cardInstanceId) {
    const card = state.players[playerId].hand.find((candidate)=>candidate.instanceId === cardInstanceId);
    if (!card) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Card is not in hand.");
    }
    return card;
}
function assertPlayableUnit(state, playerId, cardInstanceId) {
    const player = state.players[playerId];
    const card = assertCardInHand(state, playerId, cardInstanceId);
    const definition = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCardDefinitionForInstance"])(card);
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isUnitCard"])(definition)) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Card is not a unit or champion.");
    }
    if (definition.attack === undefined || definition.health === undefined) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Unit card requires attack and health.");
    }
    if (player.mana < definition.cost) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Not enough mana.");
    }
}
function assertPlayableSpell(state, playerId, cardInstanceId, target) {
    const player = state.players[playerId];
    const card = assertCardInHand(state, playerId, cardInstanceId);
    const definition = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCardDefinitionForInstance"])(card);
    if (definition.type !== "spell") {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Card is not a spell.");
    }
    if (!definition.effects?.length && !definition.abilities?.length) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Spell card requires at least one effect.");
    }
    if (player.mana + player.spellMana < definition.cost) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Not enough mana.");
    }
    for (const effect of definition.effects ?? []){
        assertSpellTarget(state, playerId, effect, target);
    }
}
function assertSpellTarget(state, casterId, effect, target) {
    switch(effect.target){
        case "SOURCE":
        case "EVENT_UNIT":
        case "ALLY_NEXUS":
        case "ENEMY_NEXUS":
        case "RANDOM_ENEMY_UNIT":
            return;
        case "ENEMY_UNIT":
            if (target.type !== "UNIT" || target.playerId !== opponentOf(casterId)) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Spell requires an enemy unit target.");
            }
            findUnit(state, target.playerId, target.unitId);
            return;
        case "ALLY_UNIT":
            if (target.type !== "UNIT" || target.playerId !== casterId) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Spell requires an ally unit target.");
            }
            findUnit(state, target.playerId, target.unitId);
            return;
        case "NEXUS":
            if (target.type !== "NEXUS") {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Spell requires a nexus target.");
            }
            assertPlayer(target.playerId);
            return;
        case "SELF":
            return;
        case "ALLY_GRAVEYARD":
            if (target.type !== "GRAVEYARD" || target.playerId !== casterId) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Spell requires an ally graveyard target.");
            }
            if (target.cardInstanceId) {
                const card = state.players[casterId].graveyard.find((c)=>c.instanceId === target.cardInstanceId);
                if (!card) throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Target card not found in ally graveyard.");
            }
            return;
        case "ENEMY_GRAVEYARD":
            if (target.type !== "GRAVEYARD" || target.playerId !== opponentOf(casterId)) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Spell requires an enemy graveyard target.");
            }
            if (target.cardInstanceId) {
                const card = state.players[opponentOf(casterId)].graveyard.find((c)=>c.instanceId === target.cardInstanceId);
                if (!card) throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Target card not found in enemy graveyard.");
            }
            return;
    }
}
function assertUnitCanAttack(state, playerId, unitInstanceId) {
    const unit = findUnit(state, playerId, unitInstanceId);
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getUnitHealth"])(unit) <= 0) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Attacker must be alive.");
    }
    if (unit.exhausted) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Unit is exhausted.");
    }
    if (state.combat.attackers.some((lane)=>lane.attackerId === unitInstanceId)) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Unit is already attacking.");
    }
}
function assertUnitCanBlock(state, playerId, unitInstanceId) {
    const unit = findUnit(state, playerId, unitInstanceId);
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getUnitHealth"])(unit) <= 0) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Blocker must be alive.");
    }
    if (state.combat.attackers.some((lane)=>lane.blockerId === unitInstanceId)) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Unit is already blocking.");
    }
}
function assertCombatAttackerCanBeBlocked(state, attackerId) {
    const lane = state.combat.attackers.find((candidate)=>candidate.attackerId === attackerId);
    if (!lane) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Attacker is not in the attack lineup.");
    }
    findUnit(state, state.attackTokenPlayerId, attackerId);
    if (lane.blockerId) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Attacker is already blocked.");
    }
}
function assertCombatAttackerExists(state, attackerId) {
    if (!state.combat.attackers.some((lane)=>lane.attackerId === attackerId)) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Attacker is not in the attack lineup.");
    }
    findUnit(state, state.attackTokenPlayerId, attackerId);
}
function assertAssignedBlocker(state, blockerId) {
    if (!state.combat.attackers.some((lane)=>lane.blockerId === blockerId)) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Unit is not assigned as a blocker.");
    }
}
function hasAttackers(state) {
    return state.combat.attackers.length > 0;
}
function isPlayerId(playerId) {
    return playerId === "P1" || playerId === "P2";
}
function clonePlayer(player) {
    return {
        ...player,
        deck: player.deck.map(cloneCard),
        hand: player.hand.map(cloneCard),
        board: player.board.map((unit)=>({
                ...unit,
                keywords: [
                    ...unit.keywords
                ],
                temporaryKeywords: [
                    ...unit.temporaryKeywords ?? []
                ],
                modifiers: unit.modifiers.map((modifier)=>({
                        ...modifier
                    }))
            })),
        graveyard: player.graveyard.map((entry)=>({
                ...entry
            })),
        abilityProgress: {
            ...player.abilityProgress
        }
    };
}
function cloneCard(card) {
    return {
        ...card,
        cardId: card.cardId
    };
}
function cloneAbilityTargetMap(targets) {
    return Object.fromEntries(Object.entries(targets).map(([key, target])=>[
            key,
            {
                ...target
            }
        ]));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/game/graveyard.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cleanupDeadUnits",
    ()=>cleanupDeadUnits,
    "findReviveTargets",
    ()=>findReviveTargets,
    "getGraveyardEntries",
    ()=>getGraveyardEntries,
    "moveCardToGraveyard",
    ()=>moveCardToGraveyard,
    "moveSpellToGraveyard",
    ()=>moveSpellToGraveyard,
    "moveUnitToGraveyard",
    ()=>moveUnitToGraveyard
]);
/**
 * graveyard.ts
 * Helpers for the graveyard and death pipeline.
 *
 * All functions mutate state in-place (same pattern as engine helpers).
 * They are called from engine.ts after damage, spell resolution, and modifier expiry.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/cards.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$triggers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/triggers.ts [app-client] (ecmascript)");
;
;
function moveUnitToGraveyard(state, unit, cause, sourceInstanceId) {
    const player = state.players[unit.ownerId];
    // Guard: never add the same instance twice in one pipeline pass
    if (player.graveyard.some((e)=>e.instanceId === unit.instanceId)) {
        return;
    }
    const entry = {
        id: `${unit.instanceId}-gy`,
        instanceId: unit.instanceId,
        cardId: unit.cardId,
        ownerId: unit.ownerId,
        type: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isChampionCard"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCardDefinitionForUnit"])(unit)) ? "CHAMPION" : "UNIT",
        round: state.round,
        cause,
        sourceInstanceId
    };
    player.graveyard.push(entry);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$triggers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["emitEvent"])(state, {
        type: "UNIT_DIED",
        playerId: unit.ownerId,
        unitInstanceId: unit.instanceId,
        targetPlayerId: unit.ownerId,
        targetUnitId: unit.instanceId,
        targetInstanceId: unit.instanceId,
        targetCardId: unit.cardId,
        sourceInstanceId,
        cause
    });
}
function moveSpellToGraveyard(state, card, casterId) {
    const player = state.players[casterId];
    // Guard: never add duplicate
    if (player.graveyard.some((e)=>e.instanceId === card.instanceId)) {
        return;
    }
    const entry = {
        id: `${card.instanceId}-gy`,
        instanceId: card.instanceId,
        cardId: card.cardId,
        ownerId: casterId,
        type: "SPELL",
        round: state.round,
        cause: "SPELL"
    };
    player.graveyard.push(entry);
}
function moveCardToGraveyard(state, card, ownerId, cause) {
    const player = state.players[ownerId];
    if (player.graveyard.some((e)=>e.instanceId === card.instanceId)) {
        return;
    }
    const type = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isChampionCard"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCardDefinitionForInstance"])(card)) ? "CHAMPION" : (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCardDefinitionForInstance"])(card).type === "spell" ? "SPELL" : "UNIT";
    player.graveyard.push({
        id: `${card.instanceId}-gy`,
        instanceId: card.instanceId,
        cardId: card.cardId,
        ownerId,
        type,
        round: state.round,
        cause
    });
}
function cleanupDeadUnits(state, player, cause = "EFFECT", sourceInstanceId) {
    const survivors = [];
    for (const unit of player.board){
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getUnitHealth"])(unit) <= 0) {
            moveUnitToGraveyard(state, unit, cause, sourceInstanceId);
        } else {
            survivors.push(unit);
        }
    }
    player.board = survivors;
}
function getGraveyardEntries(state, playerId, filter) {
    let entries = state.players[playerId].graveyard;
    if (filter?.type !== undefined) {
        entries = entries.filter((e)=>e.type === filter.type);
    }
    if (filter?.cause !== undefined) {
        entries = entries.filter((e)=>e.cause === filter.cause);
    }
    if (filter?.round !== undefined) {
        entries = entries.filter((e)=>e.round === filter.round);
    }
    return entries;
}
function findReviveTargets(state, playerId) {
    return state.players[playerId].graveyard.filter((e)=>e.type === "UNIT" || e.type === "CHAMPION");
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/game/operations/draw.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "drawCards",
    ()=>drawCards
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$triggers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/triggers.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/rules.ts [app-client] (ecmascript)");
;
;
function drawCards(state, playerId, amount) {
    const player = state.players[playerId];
    let drawn = 0;
    for(let index = 0; index < amount; index += 1){
        const card = player.deck.shift();
        if (!card) {
            player.nexusHp = 0;
            state.winnerId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["opponentOf"])(player.id);
            return;
        }
        player.hand.push(card);
        drawn += 1;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$triggers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["emitEvent"])(state, {
            type: "CARD_DRAWN",
            playerId,
            cardInstanceId: card.instanceId
        });
    }
    if (drawn > 0) {
        state.visualEvents.push({
            type: "DRAW",
            playerId,
            count: drawn
        });
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/game/operations/discard.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "discardCards",
    ()=>discardCards
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$triggers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/triggers.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$graveyard$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/graveyard.ts [app-client] (ecmascript)");
;
;
function discardCards(state, playerId, cardInstanceIds) {
    const player = state.players[playerId];
    for (const cardInstanceId of cardInstanceIds){
        const index = player.hand.findIndex((card)=>card.instanceId === cardInstanceId);
        if (index === -1) {
            continue;
        }
        const [card] = player.hand.splice(index, 1);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$graveyard$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["moveCardToGraveyard"])(state, card, playerId, "DISCARD");
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$triggers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["emitEvent"])(state, {
            type: "CARD_DISCARDED",
            playerId,
            cardInstanceId
        });
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/game/operations/damage.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "dealDamage",
    ()=>dealDamage,
    "dealDamageToUnitState",
    ()=>dealDamageToUnitState
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/cards.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$triggers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/triggers.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/rules.ts [app-client] (ecmascript)");
;
;
;
function dealDamage(state, source, target, amount) {
    if (amount <= 0) {
        return;
    }
    if (target.type === "UNIT") {
        const unit = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findUnit"])(state, target.playerId, target.unitId);
        dealDamageToUnitState(state, unit, amount, source);
        return;
    }
    if (target.type === "NEXUS" || target.type === "SELF") {
        const playerId = target.playerId;
        state.players[playerId].nexusHp -= amount;
        state.visualEvents.push({
            type: "DAMAGE",
            targetId: `nexus-${playerId}`,
            amount,
            isNexus: true
        });
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$triggers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["emitEvent"])(state, {
            type: "NEXUS_DAMAGED",
            playerId,
            targetPlayerId: playerId,
            sourcePlayerId: source?.playerId,
            sourceInstanceId: source?.sourceInstanceId ?? source?.sourceId,
            sourceCardId: source?.sourceCardId,
            amount,
            damageType: source?.damageType
        });
    }
}
function dealDamageToUnitState(state, unit, amount, source) {
    if (amount <= 0) {
        return {
            damageDealt: 0,
            excessDamage: 0
        };
    }
    if (removeKeyword(unit, "BARRIER")) {
        return {
            damageDealt: 0,
            excessDamage: 0
        };
    }
    const modifiedDamage = unit.keywords.includes("TOUGH") ? Math.max(0, amount - 1) : amount;
    const healthBefore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getUnitHealth"])(unit);
    const damageDealt = Math.min(healthBefore, modifiedDamage);
    unit.damage += modifiedDamage;
    state.visualEvents.push({
        type: "DAMAGE",
        targetId: unit.instanceId,
        amount: modifiedDamage,
        isNexus: false
    });
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$triggers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["emitEvent"])(state, {
        type: "UNIT_DAMAGED",
        playerId: unit.ownerId,
        unitInstanceId: unit.instanceId,
        targetPlayerId: unit.ownerId,
        targetUnitId: unit.instanceId,
        targetInstanceId: unit.instanceId,
        targetCardId: unit.cardId,
        sourcePlayerId: source?.playerId,
        sourceInstanceId: source?.sourceInstanceId ?? source?.sourceId,
        sourceCardId: source?.sourceCardId,
        damageType: source?.damageType,
        amount: damageDealt
    });
    return {
        damageDealt,
        excessDamage: Math.max(0, modifiedDamage - healthBefore)
    };
}
function removeKeyword(unit, keyword) {
    const index = unit.keywords.indexOf(keyword);
    if (index === -1) {
        return false;
    }
    unit.keywords.splice(index, 1);
    return true;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/game/operations/heal.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "healTarget",
    ()=>healTarget,
    "healUnitById",
    ()=>healUnitById
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$triggers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/triggers.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/rules.ts [app-client] (ecmascript)");
;
;
function healTarget(state, target, amount) {
    if (amount <= 0) {
        return;
    }
    if (target.type === "UNIT") {
        const unit = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findUnit"])(state, target.playerId, target.unitId);
        const healed = Math.min(unit.damage, amount);
        unit.damage = Math.max(0, unit.damage - amount);
        if (healed > 0) {
            state.visualEvents.push({
                type: "HEAL",
                targetId: unit.instanceId,
                amount: healed,
                isNexus: false
            });
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$triggers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["emitEvent"])(state, {
                type: "UNIT_HEALED",
                playerId: unit.ownerId,
                unitInstanceId: unit.instanceId,
                amount: healed
            });
        }
        return;
    }
    if (target.type === "NEXUS" || target.type === "SELF") {
        const player = state.players[target.playerId];
        const healed = Math.min(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STARTING_NEXUS_HP"] - player.nexusHp, amount);
        if (healed > 0) {
            player.nexusHp += healed;
            state.visualEvents.push({
                type: "HEAL",
                targetId: `nexus-${target.playerId}`,
                amount: healed,
                isNexus: true
            });
        }
    }
}
function healUnitById(state, playerId, unitId, amount) {
    const unit = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findUnit"])(state, playerId, unitId);
    healTarget(state, {
        type: "UNIT",
        playerId,
        unitId: unit.instanceId
    }, amount);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/game/operations/summon.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "summonUnit",
    ()=>summonUnit
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/cards.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$triggers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/triggers.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/rules.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cardRegistry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/cardRegistry.ts [app-client] (ecmascript)");
;
;
;
;
function summonUnit(state, playerId, cardId, instanceId) {
    const player = state.players[playerId];
    if (player.board.length >= __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BOARD_LIMIT"]) {
        return;
    }
    const nextInstanceId = instanceId ?? `${cardId}-generated-${state.rngSeed}`;
    if (!instanceId) {
        state.rngSeed += 1;
    }
    const definition = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cardRegistry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCardDefinition"])(cardId);
    const unit = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createUnitInstance"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createCardInstance"])(definition, playerId, nextInstanceId));
    player.board.push(unit);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$triggers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["emitEvent"])(state, {
        type: "UNIT_SUMMONED",
        playerId,
        cardInstanceId: nextInstanceId,
        unitInstanceId: unit.instanceId
    });
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/game/operations/buff.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "addModifier",
    ()=>addModifier,
    "grantKeyword",
    ()=>grantKeyword
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/rules.ts [app-client] (ecmascript)");
;
function addModifier(state, targetUnitId, modifier) {
    const unit = findUnitById(state, targetUnitId);
    const nextModifier = {
        ...modifier,
        id: modifier.id ?? `${targetUnitId}-${modifier.sourceCardId}-${state.round}-${state.turn}-${unit.modifiers.length}`,
        createdRound: modifier.createdRound ?? state.round,
        createdTurn: modifier.createdTurn ?? state.turn
    };
    unit.modifiers.push(nextModifier);
    state.visualEvents.push({
        type: "BUFF",
        targetId: unit.instanceId,
        attackDelta: nextModifier.attackDelta,
        healthDelta: nextModifier.healthDelta
    });
}
function grantKeyword(state, targetUnitId, keyword, _duration = "PERMANENT") {
    const unit = findUnitById(state, targetUnitId);
    if (!unit.keywords.includes(keyword)) {
        unit.keywords.push(keyword);
    }
}
function findUnitById(state, targetUnitId) {
    for (const playerId of __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLAYER_IDS"]){
        const unit = state.players[playerId].board.find((candidate)=>candidate.instanceId === targetUnitId);
        if (unit) {
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findUnit"])(state, playerId, targetUnitId);
        }
    }
    throw new Error(`Unit not found: ${targetUnitId}`);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/game/operations/debuff.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "addDebuff",
    ()=>addDebuff,
    "removeKeyword",
    ()=>removeKeyword
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/rules.ts [app-client] (ecmascript)");
;
function addDebuff(state, targetUnitId, modifier) {
    const unit = findUnitById(state, targetUnitId);
    const nextModifier = {
        ...modifier,
        attackDelta: -Math.abs(modifier.attackDelta),
        healthDelta: -Math.abs(modifier.healthDelta),
        id: modifier.id ?? `${targetUnitId}-${modifier.sourceCardId}-${state.round}-${state.turn}-${unit.modifiers.length}`,
        createdRound: modifier.createdRound ?? state.round,
        createdTurn: modifier.createdTurn ?? state.turn
    };
    unit.modifiers.push(nextModifier);
    state.visualEvents.push({
        type: "DEBUFF",
        targetId: unit.instanceId,
        attackDelta: nextModifier.attackDelta,
        healthDelta: nextModifier.healthDelta
    });
}
function removeKeyword(state, targetUnitId, keyword) {
    const unit = findUnitById(state, targetUnitId);
    if (unit.keywords.includes(keyword)) {
        unit.keywords = unit.keywords.filter((candidate)=>candidate !== keyword);
    }
}
function findUnitById(state, targetUnitId) {
    for (const playerId of __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLAYER_IDS"]){
        const unit = state.players[playerId].board.find((candidate)=>candidate.instanceId === targetUnitId);
        if (unit) {
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findUnit"])(state, playerId, targetUnitId);
        }
    }
    throw new Error(`Unit not found: ${targetUnitId}`);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/game/operations/banish.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "banishCard",
    ()=>banishCard,
    "banishUnit",
    ()=>banishUnit
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$triggers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/triggers.ts [app-client] (ecmascript)");
;
function banishUnit(state, unit, sourceInstanceId) {
    const player = state.players[unit.ownerId];
    player.board = player.board.filter((candidate)=>candidate.instanceId !== unit.instanceId);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$triggers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["emitEvent"])(state, {
        type: "UNIT_BANISHED",
        playerId: unit.ownerId,
        unitInstanceId: unit.instanceId,
        targetPlayerId: unit.ownerId,
        targetUnitId: unit.instanceId,
        targetInstanceId: unit.instanceId,
        targetCardId: unit.cardId,
        sourceInstanceId
    });
}
function banishCard(state, card, ownerId, zone) {
    const player = state.players[ownerId];
    player[zone] = player[zone].filter((candidate)=>candidate.instanceId !== card.instanceId);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$triggers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["emitEvent"])(state, {
        type: "CARD_BANISHED",
        playerId: ownerId,
        cardInstanceId: card.instanceId,
        targetPlayerId: ownerId,
        targetInstanceId: card.instanceId,
        targetCardId: card.cardId
    });
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/game/operations/index.ts [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$draw$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/operations/draw.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$discard$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/operations/discard.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$damage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/operations/damage.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$heal$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/operations/heal.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$summon$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/operations/summon.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$buff$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/operations/buff.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$debuff$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/operations/debuff.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$banish$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/operations/banish.ts [app-client] (ecmascript)");
;
;
;
;
;
;
;
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/game/abilities.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "executeAbility",
    ()=>executeAbility,
    "executePlayedSpellAbilities",
    ()=>executePlayedSpellAbilities,
    "executeTriggeredAbilities",
    ()=>executeTriggeredAbilities,
    "getMissingRequiredTargets",
    ()=>getMissingRequiredTargets
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$effects$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/effects.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/types.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/rules.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/cards.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$graveyard$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/graveyard.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/src/game/operations/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$discard$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/operations/discard.ts [app-client] (ecmascript)");
;
;
;
;
;
;
function getMissingRequiredTargets(ability, selectedTargets = {}) {
    return (ability.targets ?? []).filter((targetDefinition)=>targetDefinition.required !== false && !selectedTargets[targetDefinition.id]);
}
function executeAbility(state, ability, context) {
    if (!doesTriggerMatch(ability, context.event)) {
        return false;
    }
    if (ability.runtimeCondition && context.event && !ability.runtimeCondition(state, context.event)) {
        return false;
    }
    assertConditions(state, ability.conditions ?? [], context);
    const targets = resolveAbilityTargets(state, ability.targets ?? [], context);
    assertCosts(state, ability.costs ?? [], context, targets);
    payCosts(state, ability.costs ?? [], context, targets);
    for (const effect of ability.effects){
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$effects$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["enqueueEffect"])(state, {
            sourceId: context.sourceId,
            sourceName: context.sourceName ?? ability.id,
            sourceCardId: context.sourceCard?.cardId ?? context.sourceUnit?.cardId,
            sourcePlayerId: context.sourcePlayerId,
            effect,
            target: resolveEffectTarget(state, effect, context, targets)
        });
    }
    return true;
}
function executePlayedSpellAbilities(state, card, selectedTarget) {
    const definition = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCardDefinitionForInstance"])(card);
    const abilities = definition.abilities ?? [];
    const selectedTargets = {
        target: selectedTarget,
        self: {
            type: "SELF",
            playerId: card.ownerId
        }
    };
    for (const ability of abilities.filter((candidate)=>!candidate.when)){
        executeAbility(state, ability, {
            sourceId: card.instanceId,
            sourceName: definition.name,
            sourcePlayerId: card.ownerId,
            sourceCard: card,
            selectedTargets
        });
    }
}
function executeTriggeredAbilities(state, event) {
    for (const playerId of [
        "P1",
        "P2"
    ]){
        for (const unit of state.players[playerId].board){
            const definition = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCardDefinitionForUnit"])(unit);
            for (const ability of definition.abilities ?? []){
                if (!ability.when || ability.when.event !== event.type) {
                    continue;
                }
                try {
                    const didFire = executeAbility(state, ability, {
                        sourceId: unit.instanceId,
                        sourceName: getTriggeredAbilitySourceName(ability.id),
                        sourcePlayerId: playerId,
                        sourceUnit: unit,
                        event
                    });
                    if (didFire) {
                        state.visualEvents.push({
                            type: "TRIGGER_ACTIVATED",
                            sourceId: unit.instanceId,
                            effectName: ability.id
                        });
                    }
                } catch  {
                // Triggered abilities with unmet conditions/costs simply do not fire.
                }
            }
        }
    }
}
function getTriggeredAbilitySourceName(abilityId) {
    return abilityId.startsWith("legacy-trigger:") ? abilityId.slice("legacy-trigger:".length) : abilityId;
}
function doesTriggerMatch(ability, event) {
    if (!ability.when) {
        return true;
    }
    return ability.when.event === event?.type;
}
function assertConditions(state, conditions, context) {
    for (const condition of conditions){
        switch(condition.type){
            case "HAS_MANA":
                if (state.players[context.sourcePlayerId].mana < condition.amount) {
                    throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Ability condition failed: not enough mana.");
                }
                break;
            case "HAS_CARD_IN_HAND":
                if (state.players[context.sourcePlayerId].hand.length < (condition.count ?? 1)) {
                    throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Ability condition failed: not enough cards in hand.");
                }
                break;
            case "ALLY_UNIT_EXISTS":
                if (state.players[context.sourcePlayerId].board.length === 0) {
                    throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Ability condition failed: no allied unit exists.");
                }
                break;
            case "SPELLS_CAST_THIS_ROUND_AT_LEAST":
                if ((state.players[context.sourcePlayerId].abilityProgress["SPELLS_CAST_THIS_ROUND"] || 0) < condition.count) {
                    throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Ability condition failed: not enough spells this round.");
                }
                break;
            case "UNIT_DIED_THIS_GAME_AT_LEAST":
                if ((state.players[context.sourcePlayerId].abilityProgress["UNIT_DIED_THIS_GAME"] || 0) < condition.count) {
                    throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Ability condition failed: not enough units died.");
                }
                break;
            case "NEXUS_HEALTH_BELOW":
                {
                    const playerId = condition.player === "SELF" ? context.sourcePlayerId : (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["opponentOf"])(context.sourcePlayerId);
                    if (state.players[playerId].nexusHp >= condition.amount) {
                        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Ability condition failed: nexus health is too high.");
                    }
                    break;
                }
            case "UNIT_HAS_KEYWORD":
                {
                    const target = context.selectedTargets?.[condition.target];
                    if (target?.type !== "UNIT") {
                        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Ability condition failed: missing unit target.");
                    }
                    const unit = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findUnit"])(state, target.playerId, target.unitId);
                    if (!unit.keywords.includes(condition.keyword)) {
                        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Ability condition failed: unit lacks keyword.");
                    }
                    break;
                }
        }
    }
}
function resolveAbilityTargets(state, definitions, context) {
    const targets = {
        ...context.selectedTargets ?? {}
    };
    for (const definition of definitions){
        const selected = targets[definition.id];
        if (!selected) {
            if (definition.kind === "SELF") {
                targets[definition.id] = context.sourceUnit ? {
                    type: "UNIT",
                    playerId: context.sourcePlayerId,
                    unitId: context.sourceUnit.instanceId
                } : {
                    type: "SELF",
                    playerId: context.sourcePlayerId
                };
                continue;
            }
            if (definition.kind === "ALLY_NEXUS") {
                targets[definition.id] = {
                    type: "NEXUS",
                    playerId: context.sourcePlayerId
                };
                continue;
            }
            if (definition.kind === "ENEMY_NEXUS") {
                targets[definition.id] = {
                    type: "NEXUS",
                    playerId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["opponentOf"])(context.sourcePlayerId)
                };
                continue;
            }
            if (definition.required !== false) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Ability requires a target.");
            }
            continue;
        }
        assertTargetDefinition(state, context.sourcePlayerId, definition, selected);
    }
    return targets;
}
function assertTargetDefinition(state, sourcePlayerId, definition, target) {
    switch(definition.kind){
        case "SELF":
            if (target.type !== "SELF" && !(target.type === "UNIT" && target.playerId === sourcePlayerId)) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Ability target must be self.");
            }
            break;
        case "ALLY_UNIT":
            if (target.type !== "UNIT" || target.playerId !== sourcePlayerId) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Ability target must be an allied unit.");
            }
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findUnit"])(state, target.playerId, target.unitId);
            break;
        case "ENEMY_UNIT":
            if (target.type !== "UNIT" || target.playerId !== (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["opponentOf"])(sourcePlayerId)) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Ability target must be an enemy unit.");
            }
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findUnit"])(state, target.playerId, target.unitId);
            break;
        case "ANY_UNIT":
            if (target.type !== "UNIT") {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Ability target must be a unit.");
            }
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findUnit"])(state, target.playerId, target.unitId);
            break;
        case "ALLY_NEXUS":
            if (target.type !== "NEXUS" || target.playerId !== sourcePlayerId) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Ability target must be allied nexus.");
            }
            break;
        case "ENEMY_NEXUS":
            if (target.type !== "NEXUS" || target.playerId !== (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["opponentOf"])(sourcePlayerId)) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Ability target must be enemy nexus.");
            }
            break;
        case "ANY_TARGET":
            if (target.type === "UNIT") {
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findUnit"])(state, target.playerId, target.unitId);
            } else if (target.type === "HAND_CARD") {
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findCardInHand"])(state, target.playerId, target.cardInstanceId);
            }
            break;
        case "ALLY_HAND_CARD":
            if (target.type !== "HAND_CARD" || target.playerId !== sourcePlayerId) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Ability target must be an allied hand card.");
            }
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findCardInHand"])(state, target.playerId, target.cardInstanceId);
            break;
        case "ENEMY_HAND_CARD":
            if (target.type !== "HAND_CARD" || target.playerId !== (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["opponentOf"])(sourcePlayerId)) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Ability target must be an enemy hand card.");
            }
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findCardInHand"])(state, target.playerId, target.cardInstanceId);
            break;
        case "ANY_HAND_CARD":
            if (target.type !== "HAND_CARD") {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Ability target must be a hand card.");
            }
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findCardInHand"])(state, target.playerId, target.cardInstanceId);
            break;
    }
}
function assertCosts(state, costs, context, targets) {
    for (const cost of costs){
        switch(cost.type){
            case "PAY_MANA":
                if (state.players[context.sourcePlayerId].mana < cost.amount) {
                    throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Cannot pay ability mana cost.");
                }
                break;
            case "PAY_HEALTH":
                if (state.players[context.sourcePlayerId].nexusHp <= cost.amount) {
                    throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Cannot pay ability health cost.");
                }
                break;
            case "DISCARD":
                requireDiscardHandCardTarget(state, context.sourcePlayerId, targets[cost.target]);
                break;
            case "SACRIFICE_UNIT":
            case "DESTROY_ALLY":
                requireAlliedUnitTarget(state, context.sourcePlayerId, targets[cost.target]);
                break;
            case "EXHAUST_UNIT":
                {
                    const unit = requireAlliedUnitTarget(state, context.sourcePlayerId, targets[cost.target]);
                    if (unit.exhausted || (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getUnitHealth"])(unit) <= 0) {
                        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Cannot exhaust unit for ability cost.");
                    }
                    break;
                }
        }
    }
}
function payCosts(state, costs, context, targets) {
    for (const cost of costs){
        switch(cost.type){
            case "PAY_MANA":
                state.players[context.sourcePlayerId].mana -= cost.amount;
                break;
            case "PAY_HEALTH":
                state.players[context.sourcePlayerId].nexusHp -= cost.amount;
                break;
            case "DISCARD":
                {
                    const target = targets[cost.target];
                    requireDiscardHandCardTarget(state, context.sourcePlayerId, target);
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$discard$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["discardCards"])(state, context.sourcePlayerId, [
                        target.cardInstanceId
                    ]);
                    break;
                }
            case "SACRIFICE_UNIT":
            case "DESTROY_ALLY":
                {
                    const unit = requireAlliedUnitTarget(state, context.sourcePlayerId, targets[cost.target]);
                    state.players[context.sourcePlayerId].board = state.players[context.sourcePlayerId].board.filter((candidate)=>candidate.instanceId !== unit.instanceId);
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$graveyard$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["moveUnitToGraveyard"])(state, unit, "EFFECT");
                    break;
                }
            case "EXHAUST_UNIT":
                {
                    const unit = requireAlliedUnitTarget(state, context.sourcePlayerId, targets[cost.target]);
                    unit.exhausted = true;
                    break;
                }
        }
    }
}
function resolveEffectTarget(state, effect, context, targets) {
    const effectTarget = effect.target;
    if (targets[effectTarget]) {
        return targets[effectTarget];
    }
    switch(effectTarget){
        case "SELF":
            if (effect.type === "DRAW_CARD") {
                return {
                    type: "SELF",
                    playerId: context.sourcePlayerId
                };
            }
            return resolveSourceUnitOrSelf(context);
        case "SOURCE":
            return resolveSourceUnitOrSelf(context);
        case "ALLY_NEXUS":
            return {
                type: "NEXUS",
                playerId: context.sourcePlayerId
            };
        case "ENEMY_NEXUS":
            return {
                type: "NEXUS",
                playerId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["opponentOf"])(context.sourcePlayerId)
            };
        case "NEXUS":
            return {
                type: "NEXUS",
                playerId: effect.type === "HEAL" ? context.sourcePlayerId : (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["opponentOf"])(context.sourcePlayerId)
            };
        case "EVENT_UNIT":
            return resolveEventUnitTarget(context.event);
        case "RANDOM_ENEMY_UNIT":
            return resolveRandomEnemyUnitTarget(state, context.sourcePlayerId);
        case "ALLY_UNIT":
        case "ENEMY_UNIT":
            return context.sourceUnit ? {
                type: "UNIT",
                playerId: context.sourcePlayerId,
                unitId: context.sourceUnit.instanceId
            } : targets.target;
        default:
            return targets.target;
    }
}
function resolveSourceUnitOrSelf(context) {
    return context.sourceUnit ? {
        type: "UNIT",
        playerId: context.sourcePlayerId,
        unitId: context.sourceUnit.instanceId
    } : {
        type: "SELF",
        playerId: context.sourcePlayerId
    };
}
function resolveEventUnitTarget(event) {
    const unitId = event?.unitInstanceId ?? event?.attackerId ?? event?.blockerId;
    if (!event?.playerId || !unitId) {
        return undefined;
    }
    return {
        type: "UNIT",
        playerId: event.playerId,
        unitId
    };
}
function resolveRandomEnemyUnitTarget(state, sourcePlayerId) {
    const enemyId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["opponentOf"])(sourcePlayerId);
    const enemyBoard = state.players[enemyId].board;
    if (enemyBoard.length === 0) {
        return undefined;
    }
    const index = state.rngSeed % enemyBoard.length;
    state.rngSeed += 1;
    return {
        type: "UNIT",
        playerId: enemyId,
        unitId: enemyBoard[index].instanceId
    };
}
function requireDiscardHandCardTarget(state, playerId, target) {
    if (!target || target.type !== "HAND_CARD" || target.playerId !== playerId) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Discard cost requires an allied hand card target.");
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findCardInHand"])(state, playerId, target.cardInstanceId);
}
function requireAlliedUnitTarget(state, playerId, target) {
    if (!target || target.type !== "UNIT" || target.playerId !== playerId) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Cost requires an allied unit target.");
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findUnit"])(state, playerId, target.unitId);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/game/triggers.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "emitEvent",
    ()=>emitEvent
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$abilities$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/abilities.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/src/game/engine.ts [app-client] (ecmascript) <locals>");
;
;
function emitEvent(state, event) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["updateChampionProgress"])(state, event);
    updateAbilityProgress(state, event);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$abilities$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["executeTriggeredAbilities"])(state, event);
}
function updateAbilityProgress(state, event) {
    if (event.type === "SPELL_CAST" && event.playerId) {
        const progress = state.players[event.playerId].abilityProgress;
        progress["SPELLS_CAST_THIS_ROUND"] = (progress["SPELLS_CAST_THIS_ROUND"] || 0) + 1;
    }
    if (event.type === "UNIT_DIED" && event.playerId) {
        const progress = state.players[event.playerId].abilityProgress;
        progress["UNIT_DIED_THIS_GAME"] = (progress["UNIT_DIED_THIS_GAME"] || 0) + 1;
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/game/effects.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "enqueueEffect",
    ()=>enqueueEffect,
    "enqueueEffects",
    ()=>enqueueEffects,
    "resolveEffectQueue",
    ()=>resolveEffectQueue,
    "resolvePlayedSpellEffectTarget",
    ()=>resolvePlayedSpellEffectTarget
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/types.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/rules.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/src/game/engine.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/cards.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$triggers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/triggers.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/src/game/operations/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$debuff$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/operations/debuff.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$buff$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/operations/buff.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$banish$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/operations/banish.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$damage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/operations/damage.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$discard$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/operations/discard.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$draw$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/operations/draw.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$heal$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/operations/heal.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$summon$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/operations/summon.ts [app-client] (ecmascript)");
;
;
;
;
;
;
function enqueueEffect(state, queuedEffect) {
    state.effectQueue.push(queuedEffect);
}
function enqueueEffects(state, queuedEffects) {
    state.effectQueue.push(...queuedEffects);
}
function resolveEffectQueue(state) {
    let iterations = 0;
    const MAX_EFFECTS = 100;
    while(state.effectQueue.length > 0){
        if (state.winnerId) return; // Stop resolving effects if game is over
        if (iterations >= MAX_EFFECTS) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Maximum effect resolution limit exceeded. Infinite loop detected.");
        }
        iterations++;
        const nextEffect = state.effectQueue.shift();
        if (!nextEffect) continue;
        applyEffect(state, nextEffect);
        // After each effect, run cleanup and check for win conditions.
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["runCleanupPipeline"])(state);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["checkWinConditions"])(state);
    }
}
function resolvePlayedSpellEffectTarget(effect, casterId, selectedTarget) {
    switch(effect.target){
        case "SELF":
            if ((effect.type === "BUFF_UNIT" || effect.type === "GRANT_KEYWORD") && selectedTarget.type === "UNIT") {
                return selectedTarget;
            }
            return {
                type: "SELF",
                playerId: casterId
            };
        case "ALLY_NEXUS":
            return {
                type: "NEXUS",
                playerId: casterId
            };
        case "ENEMY_NEXUS":
            return {
                type: "NEXUS",
                playerId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["opponentOf"])(casterId)
            };
        case "ENEMY_UNIT":
        case "ALLY_UNIT":
        case "NEXUS":
        case "ALLY_GRAVEYARD":
        case "ENEMY_GRAVEYARD":
            return selectedTarget;
        case "SOURCE":
        case "EVENT_UNIT":
        case "RANDOM_ENEMY_UNIT":
            return selectedTarget;
    }
}
function applyEffect(state, queuedEffect) {
    const { sourcePlayerId, sourceId, sourceName, sourceCardId, effect, target } = queuedEffect;
    const casterId = sourcePlayerId;
    switch(effect.type){
        case "DEAL_DAMAGE":
            if (target) {
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$damage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["dealDamage"])(state, {
                    playerId: casterId,
                    sourceId,
                    sourceInstanceId: sourceId,
                    sourceCardId,
                    damageType: "SPELL"
                }, target, effect.amount);
            }
            return;
        case "HEAL":
            if (target) {
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$heal$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["healTarget"])(state, target, effect.amount);
            }
            return;
        case "DRAW_CARD":
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$draw$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["drawCards"])(state, casterId, effect.count);
            return;
        case "DISCARD_CARD":
            {
                const ids = state.players[casterId].hand.slice(0, effect.count ?? 1).map((card)=>card.instanceId);
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$discard$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["discardCards"])(state, casterId, ids);
                return;
            }
        case "BUFF_UNIT":
            {
                if (target?.type !== "UNIT") {
                    return;
                }
                try {
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findUnit"])(state, target.playerId, target.unitId);
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$buff$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addModifier"])(state, target.unitId, {
                        sourceCardId: sourceId,
                        sourceName: sourceName ?? sourceId,
                        type: "BUFF",
                        attackDelta: effect.attack,
                        healthDelta: effect.health,
                        duration: effect.duration ?? "THIS_ROUND"
                    });
                } catch (e) {}
                return;
            }
        case "DEBUFF_UNIT":
            {
                if (target?.type !== "UNIT") {
                    return;
                }
                try {
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findUnit"])(state, target.playerId, target.unitId);
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$debuff$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addDebuff"])(state, target.unitId, {
                        sourceCardId: sourceId,
                        sourceName: sourceName ?? sourceId,
                        type: "DEBUFF",
                        attackDelta: effect.attackDelta,
                        healthDelta: effect.healthDelta,
                        duration: effect.duration ?? "THIS_ROUND"
                    });
                } catch (e) {}
                return;
            }
        case "BANISH_UNIT":
            {
                if (target?.type !== "UNIT") {
                    return;
                }
                try {
                    const unit = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findUnit"])(state, target.playerId, target.unitId);
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$banish$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["banishUnit"])(state, unit, sourceId);
                } catch (e) {}
                return;
            }
        case "GRANT_KEYWORD":
            {
                if (target?.type !== "UNIT") {
                    return;
                }
                try {
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findUnit"])(state, target.playerId, target.unitId);
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$buff$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["grantKeyword"])(state, target.unitId, effect.keyword);
                } catch (e) {}
                return;
            }
        case "SUMMON_UNIT":
            {
                if (effect.cardDefinition) {
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$summon$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["summonUnit"])(state, casterId, effect.cardDefinition.id, createGeneratedInstanceId(state, effect.cardDefinition.id));
                }
                return;
            }
        case "REVIVE_UNIT":
            {
                const targetPlayerId = effect.target === "ALLY_GRAVEYARD" ? casterId : (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["opponentOf"])(casterId);
                const player = state.players[targetPlayerId];
                if (player.graveyard.length === 0 || player.board.length >= __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BOARD_LIMIT"]) return;
                let entryIndex = player.graveyard.length - 1; // Default to most recently dead
                if (target?.type === "GRAVEYARD" && target.cardInstanceId) {
                    const found = player.graveyard.findIndex((c)=>c.instanceId === target.cardInstanceId);
                    if (found !== -1) entryIndex = found;
                }
                const [entry] = player.graveyard.splice(entryIndex, 1);
                const instance = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createUnitInstance"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createCardInstance"])(entry.cardId, targetPlayerId, createGeneratedInstanceId(state, entry.cardId)));
                player.board.push(instance);
                state.visualEvents.push({
                    type: "DRAW",
                    playerId: targetPlayerId,
                    count: 0
                }); // Placeholder for summon animation? We don't have SUMMON_UNIT visual event.
                // Wait, let's emit UNIT_SUMMONED event.
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$triggers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["emitEvent"])(state, {
                    type: "UNIT_SUMMONED",
                    playerId: targetPlayerId,
                    cardInstanceId: entry.instanceId,
                    unitInstanceId: instance.instanceId
                });
                return;
            }
    }
}
function createGeneratedInstanceId(state, cardId) {
    const id = `${cardId}-generated-${state.rngSeed}`;
    state.rngSeed += 1;
    return id;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/game/engine.ts [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "applyAction",
    ()=>applyAction,
    "checkChampionLevelUps",
    ()=>checkChampionLevelUps,
    "createInitialGameState",
    ()=>createInitialGameState,
    "createInitialPlayerState",
    ()=>createInitialPlayerState,
    "dealDamageToUnit",
    ()=>dealDamageToUnit,
    "drawInto",
    ()=>drawInto,
    "hasKeyword",
    ()=>hasKeyword,
    "healUnit",
    ()=>healUnit,
    "runCleanupPipeline",
    ()=>runCleanupPipeline,
    "updateChampionProgress",
    ()=>updateChampionProgress
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/cards.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cardRegistry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/cardRegistry.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/rules.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/types.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$effects$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/effects.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$abilities$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/abilities.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$triggers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/triggers.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$graveyard$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/graveyard.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/src/game/operations/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$damage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/operations/damage.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$discard$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/operations/discard.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$draw$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/operations/draw.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$heal$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/operations/heal.ts [app-client] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
function updateChampionProgress(state, event) {
    switch(event.type){
        case "UNIT_DIED":
            if (event.playerId) {
                state.players[event.playerId].championProgress["ALLIES_DIED"] = (state.players[event.playerId].championProgress["ALLIES_DIED"] || 0) + 1;
            }
            break;
        case "SPELL_CAST":
            if (event.playerId) {
                state.players[event.playerId].championProgress["SPELLS_CAST"] = (state.players[event.playerId].championProgress["SPELLS_CAST"] || 0) + 1;
            }
            break;
        case "UNIT_STRUCK":
            if (event.playerId && event.unitInstanceId) {
                const key = championStrikeProgressKey(event.unitInstanceId);
                state.players[event.playerId].championProgress[key] = (state.players[event.playerId].championProgress[key] || 0) + 1;
            }
            break;
        case "NEXUS_DAMAGED":
            if (event.playerId && event.amount) {
                const dealerId = event.sourcePlayerId ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["opponentOf"])(event.playerId);
                state.players[dealerId].championProgress["NEXUS_DAMAGE_DEALT"] = (state.players[dealerId].championProgress["NEXUS_DAMAGE_DEALT"] || 0) + event.amount;
            }
            break;
    }
}
function checkChampionLevelUps(state) {
    for (const playerId of __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLAYER_IDS"]){
        if (state.winnerId) {
            return;
        }
        const player = state.players[playerId];
        for (const unit of player.board){
            if (!shouldLevelChampion(player, unit)) {
                continue;
            }
            const definition = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCardDefinitionForUnit"])(unit);
            const level2Code = definition.level2CardCode ?? definition.leveledUpCardId;
            const level2Def = level2Code ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cardRegistry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCardDefinition"])(level2Code) : undefined;
            if (level2Def) {
                levelChampionUnit(state, playerId, unit, level2Def);
            }
        }
    }
}
function shouldLevelChampion(player, unit) {
    const definition = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCardDefinitionForUnit"])(unit);
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isChampionCard"])(definition) || definition.level !== 1 || !definition.levelUpCondition) {
        return false;
    }
    const condition = definition.levelUpCondition;
    const key = condition.type === "THIS_CHAMPION_STRUCK" ? championStrikeProgressKey(unit.instanceId) : condition.type;
    return (player.championProgress[key] || 0) >= condition.threshold;
}
function levelChampionUnit(state, playerId, unit, level2Def) {
    unit.cardId = level2Def.id;
    unit.attack = level2Def.attack ?? unit.attack;
    unit.maxHealth = level2Def.health ?? unit.maxHealth;
    unit.keywords = [
        ...level2Def.keywords ?? []
    ];
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$triggers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["emitEvent"])(state, {
        type: "CHAMPION_LEVELED_UP",
        playerId,
        unitInstanceId: unit.instanceId
    });
    state.visualEvents.push({
        type: "CHAMPION_LEVELED_UP",
        playerId,
        unitId: unit.instanceId,
        newLevel: 2
    });
}
function championStrikeProgressKey(unitInstanceId) {
    return `CHAMPION_STRUCK:${unitInstanceId}`;
}
function createInitialPlayerState(id, deck = []) {
    return {
        id,
        nexusHp: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STARTING_NEXUS_HP"],
        mana: 0,
        spellMana: 0,
        maxMana: 0,
        deck,
        hand: [],
        board: [],
        graveyard: [],
        championProgress: {},
        abilityProgress: {}
    };
}
function createInitialGameState(p1Deck = [], p2Deck = [], rngSeed = 1, extraCardRegistry = {}) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cardRegistry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["registerCardDefinitions"])(Object.values(extraCardRegistry));
    const normalizedP1Deck = normalizeDeck(p1Deck, "P1");
    const normalizedP2Deck = normalizeDeck(p2Deck, "P2");
    return {
        players: {
            P1: createInitialPlayerState("P1", normalizedP1Deck),
            P2: createInitialPlayerState("P2", normalizedP2Deck)
        },
        activePlayerId: "P1",
        priorityPlayerId: "P1",
        attackTokenPlayerId: "P1",
        attackTokenAvailable: true,
        phase: "ACTION",
        pendingDiscard: undefined,
        combat: {
            attackers: []
        },
        round: 0,
        turn: 0,
        consecutivePasses: 0,
        rngSeed,
        started: false,
        effectQueue: [],
        visualEvents: []
    };
}
function applyAction(state, action) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["validateAction"])(state, action);
    let cleanState = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cloneState"])(state);
    cleanState.visualEvents = [];
    let next = cleanState;
    switch(action.type){
        case "START_GAME":
            next = startGame(cleanState, action.firstPlayerId ?? "P1");
            break;
        case "DRAW_CARD":
            next = drawCards(cleanState, action.playerId, action.count ?? 1);
            break;
        case "DISCARD_CARD":
            next = discardCard(cleanState, action.playerId, action.cardInstanceId);
            break;
        case "START_ROUND":
            next = startRound(cleanState);
            break;
        case "PLAY_UNIT":
            next = playUnit(cleanState, action.playerId, action.cardInstanceId, action.replaceUnitId, action.target);
            break;
        case "PLAY_SPELL":
            next = playSpell(cleanState, action.playerId, action.cardInstanceId, action.target);
            break;
        case "SUBMIT_ABILITY_TARGETS":
            next = submitAbilityTargets(cleanState, action.playerId, action.targets);
            break;
        case "CANCEL_PENDING_CHOICE":
            next = cancelPendingChoice(cleanState, action.playerId);
            break;
        case "DECLARE_ATTACKER":
            next = declareAttacker(cleanState, action.playerId, action.unitInstanceId);
            break;
        case "REMOVE_ATTACKER":
            next = removeAttacker(cleanState, action.playerId, action.unitInstanceId);
            break;
        case "COMMIT_ATTACK":
            next = commitAttack(cleanState, action.playerId);
            break;
        case "DECLARE_BLOCKER":
            next = declareBlocker(cleanState, action.playerId, action.attackerId, action.blockerId);
            break;
        case "REMOVE_BLOCKER":
            next = removeBlocker(cleanState, action.playerId, action.blockerId);
            break;
        case "COMMIT_BLOCKS":
            next = commitBlocks(cleanState, action.playerId);
            break;
        case "RESOLVE_COMBAT":
            next = resolveCombat(cleanState);
            break;
        case "END_TURN":
            next = endTurn(cleanState, action.playerId);
            break;
    }
    runCleanupPipeline(next);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$effects$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resolveEffectQueue"])(next);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["checkWinConditions"])(next);
}
function startGame(state, firstPlayerId) {
    const next = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cloneState"])(state);
    next.started = true;
    next.activePlayerId = firstPlayerId;
    next.priorityPlayerId = firstPlayerId;
    next.attackTokenPlayerId = firstPlayerId;
    next.attackTokenAvailable = true;
    next.phase = "ACTION";
    next.combat.attackers = [];
    next.consecutivePasses = 0;
    next.round = 1;
    next.turn = 1;
    for (const playerId of __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLAYER_IDS"]){
        next.players[playerId].deck = shuffleDeck(next.players[playerId].deck, next.rngSeed + (playerId === "P1" ? 101 : 202));
        drawInto(next, next.players[playerId], __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STARTING_HAND_SIZE"]);
    }
    next.rngSeed += 1;
    refreshRound(next, false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$triggers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["emitEvent"])(next, {
        type: "GAME_STARTED"
    });
    return next;
}
function startRound(state) {
    const next = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cloneState"])(state);
    beginNextRound(next);
    return next;
}
function beginNextRound(state) {
    const next = state;
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$triggers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["emitEvent"])(next, {
        type: "ROUND_ENDED"
    });
    runCleanupPipeline(next, "END_ROUND");
    next.round += 1;
    next.turn = 1;
    next.attackTokenPlayerId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["opponentOf"])(next.attackTokenPlayerId);
    next.attackTokenAvailable = true;
    next.activePlayerId = next.attackTokenPlayerId;
    next.priorityPlayerId = next.attackTokenPlayerId;
    next.phase = "ACTION";
    next.pendingDiscard = undefined;
    next.combat.attackers = [];
    next.consecutivePasses = 0;
    refreshRound(next, true);
    if (next.winnerId) {
        return;
    }
    requestDiscardIfNeeded(next, next.priorityPlayerId);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$triggers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["emitEvent"])(next, {
        type: "ROUND_STARTED"
    });
}
function refreshRound(state, draw) {
    for (const playerId of __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLAYER_IDS"]){
        if (state.winnerId) {
            return;
        }
        const player = state.players[playerId];
        player.spellMana = Math.min(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MAX_SPELL_MANA"], player.spellMana + player.mana);
        player.maxMana = Math.min(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MAX_MANA"], player.maxMana + 1);
        player.mana = player.maxMana;
        player.board = player.board.map((unit)=>({
                ...unit,
                exhausted: false,
                attacking: false,
                blockingUnitId: undefined,
                blockedByUnitId: undefined
            }));
        player.abilityProgress["SPELLS_CAST_THIS_ROUND"] = 0;
        if (draw) {
            drawInto(state, player, 1);
        }
    }
}
function drawCards(state, playerId, count) {
    const next = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cloneState"])(state);
    drawInto(next, next.players[playerId], count);
    return next;
}
function discardCard(state, playerId, cardInstanceId) {
    const next = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cloneState"])(state);
    const player = next.players[playerId];
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$discard$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["discardCards"])(next, playerId, [
        cardInstanceId
    ]);
    if (player.hand.length <= (next.pendingDiscard?.downTo ?? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["HAND_LIMIT"])) {
        const returnPhase = next.pendingDiscard?.returnPhase ?? "ACTION";
        next.pendingDiscard = undefined;
        next.phase = returnPhase;
    }
    return next;
}
function drawInto(state, player, count) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$draw$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["drawCards"])(state, player.id, count);
}
function playUnit(state, playerId, cardInstanceId, replaceUnitId, target) {
    const next = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cloneState"])(state);
    const player = next.players[playerId];
    const handIndex = player.hand.findIndex((card)=>card.instanceId === cardInstanceId);
    const [card] = player.hand.splice(handIndex, 1);
    const definition = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCardDefinitionForInstance"])(card);
    const onPlayAbilities = (definition.abilities ?? []).filter((ability)=>ability.onPlay);
    for (const ability of onPlayAbilities){
        const selectedTargets = target ? {
            target
        } : {};
        const missingTargets = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$abilities$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMissingRequiredTargets"])(ability, selectedTargets);
        if (missingTargets.length > 0) {
            player.hand.splice(handIndex, 0, card);
            next.pendingChoice = {
                playerId,
                sourceInstanceId: card.instanceId,
                sourceCardId: card.cardId,
                abilityId: ability.id,
                requiredTargets: missingTargets,
                chosenTargets: selectedTargets,
                returnPhase: next.phase,
                playUnit: {
                    replaceUnitId
                }
            };
            next.priorityPlayerId = playerId;
            next.activePlayerId = playerId;
            return next;
        }
    }
    player.mana -= definition.cost;
    if (replaceUnitId) {
        const replaceIndex = player.board.findIndex((u)=>u.instanceId === replaceUnitId);
        if (replaceIndex !== -1) {
            const replacedUnit = player.board[replaceIndex];
            // Note: we're directly splicing it out of the array before adding to graveyard
            // to ensure it is actually gone, but moveUnitToGraveyard also expects unit to be 
            // removed externally from board usually (cleanupDeadUnits does this).
            player.board.splice(replaceIndex, 1);
            // Move it to graveyard (cause=EFFECT since it's a replacement sacrifice)
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$graveyard$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["moveUnitToGraveyard"])(next, replacedUnit, "EFFECT");
        }
    }
    player.board.push((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createUnitInstance"])(card));
    next.consecutivePasses = 0;
    passPriority(next, playerId);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$triggers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["emitEvent"])(next, {
        type: "CARD_PLAYED",
        playerId,
        cardInstanceId,
        sourcePlayerId: playerId,
        sourceInstanceId: card.instanceId,
        sourceCardId: card.cardId
    });
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$triggers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["emitEvent"])(next, {
        type: "UNIT_SUMMONED",
        playerId,
        cardInstanceId,
        unitInstanceId: card.instanceId,
        sourcePlayerId: playerId,
        sourceInstanceId: card.instanceId,
        sourceCardId: card.cardId,
        targetPlayerId: playerId,
        targetInstanceId: card.instanceId,
        targetUnitId: card.instanceId,
        targetCardId: card.cardId
    });
    // Handle on-play abilities that require player targeting
    for (const ability of onPlayAbilities){
        const selectedTargets = target ? {
            target
        } : {};
        const unit = player.board.find((candidate)=>candidate.instanceId === card.instanceId);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$abilities$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["executeAbility"])(next, ability, {
            sourceId: card.instanceId,
            sourceName: definition.name,
            sourcePlayerId: playerId,
            sourceUnit: unit,
            selectedTargets
        });
        continue;
        const missingTargets = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$abilities$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMissingRequiredTargets"])(ability, selectedTargets);
        if (missingTargets.length > 0) {
            // Player must choose target → create pendingChoice
            next.pendingChoice = {
                playerId,
                sourceInstanceId: card.instanceId,
                sourceCardId: card.cardId,
                abilityId: ability.id,
                requiredTargets: missingTargets,
                chosenTargets: selectedTargets,
                returnPhase: next.phase
            };
            next.priorityPlayerId = playerId;
            next.activePlayerId = playerId;
        } else {
            // All targets resolved → execute ability immediately
            const unit = player.board.find((u)=>u.instanceId === card.instanceId);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$abilities$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["executeAbility"])(next, ability, {
                sourceId: card.instanceId,
                sourceName: definition.name,
                sourcePlayerId: playerId,
                sourceUnit: unit,
                selectedTargets
            });
        }
    }
    return next;
}
function playSpell(state, playerId, cardInstanceId, target) {
    const next = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cloneState"])(state);
    const player = next.players[playerId];
    const handIndex = player.hand.findIndex((card)=>card.instanceId === cardInstanceId);
    const [card] = player.hand.splice(handIndex, 1);
    const definition = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCardDefinitionForInstance"])(card);
    const spellSpeed = definition.spellSpeed ?? "slow";
    const selectedTargets = createPlayedSpellTargetMap(playerId, target);
    const pendingAbility = (definition.abilities ?? []).filter((ability)=>!ability.when).map((ability)=>({
            ability,
            missingTargets: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$abilities$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMissingRequiredTargets"])(ability, selectedTargets)
        })).find((candidate)=>candidate.missingTargets.length > 0);
    if (pendingAbility) {
        player.hand.splice(handIndex, 0, card);
        next.pendingChoice = {
            playerId,
            sourceInstanceId: card.instanceId,
            sourceCardId: card.cardId,
            abilityId: pendingAbility.ability.id,
            requiredTargets: pendingAbility.missingTargets,
            chosenTargets: selectedTargets,
            returnPhase: next.phase
        };
        next.priorityPlayerId = playerId;
        next.activePlayerId = playerId;
        return next;
    }
    spendSpellMana(player, definition.cost);
    if (definition.abilities?.length) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$abilities$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["executePlayedSpellAbilities"])(next, card, target);
    } else {
        for (const effect of definition.effects ?? []){
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$effects$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["enqueueEffect"])(next, {
                sourceId: card.instanceId,
                sourceName: definition.name,
                sourceCardId: card.cardId,
                sourcePlayerId: playerId,
                effect,
                target: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$effects$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resolvePlayedSpellEffectTarget"])(effect, playerId, target)
            });
        }
    }
    // Move spell card to graveyard with full metadata
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$graveyard$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["moveSpellToGraveyard"])(next, card, playerId);
    next.consecutivePasses = 0;
    // TODO: Add a full stack/response window for fast and slow spells.
    if (spellSpeed !== "burst") {
        passPriority(next, playerId);
    }
    emitPlayedSpellEvents(next, playerId, card, target);
    return next;
}
function submitAbilityTargets(state, playerId, targets) {
    const next = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cloneState"])(state);
    const pendingChoice = next.pendingChoice;
    if (!pendingChoice) {
        return next;
    }
    const player = next.players[playerId];
    if (pendingChoice.playUnit) {
        const selectedTargets = {
            ...pendingChoice.chosenTargets,
            ...targets
        };
        const primaryTargetId = pendingChoice.requiredTargets[0]?.id ?? "target";
        const target = selectedTargets[primaryTargetId] ?? selectedTargets.target;
        if (!target) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Ability requires a target.");
        }
        next.pendingChoice = undefined;
        return playUnit(next, playerId, pendingChoice.sourceInstanceId, pendingChoice.playUnit.replaceUnitId, target);
    }
    // Check if the source is a unit on the board (on-play ability)
    const boardUnit = player.board.find((u)=>u.instanceId === pendingChoice.sourceInstanceId);
    if (boardUnit) {
        // On-play ability: source is a unit already on the board
        return submitOnPlayAbilityTargets(next, playerId, pendingChoice, boardUnit, targets);
    }
    // Otherwise, source is a spell card in hand (existing flow)
    const cardIndex = player.hand.findIndex((card)=>card.instanceId === pendingChoice.sourceInstanceId);
    const card = player.hand[cardIndex];
    if (!card) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Pending choice source card is not in hand.");
    }
    const definition = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCardDefinitionForInstance"])(card);
    const ability = (definition.abilities ?? []).find((candidate)=>candidate.id === pendingChoice.abilityId);
    if (!ability) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Pending choice ability not found.");
    }
    const selectedTargets = {
        ...pendingChoice.chosenTargets,
        ...targets
    };
    rejectSourceCardAsHandTarget(selectedTargets, pendingChoice.sourceInstanceId);
    if (player.mana + player.spellMana < definition.cost) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Not enough mana.");
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$abilities$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["executeAbility"])(next, ability, {
        sourceId: card.instanceId,
        sourceName: definition.name,
        sourcePlayerId: playerId,
        sourceCard: card,
        selectedTargets
    });
    const playedCardIndex = player.hand.findIndex((candidate)=>candidate.instanceId === pendingChoice.sourceInstanceId);
    if (playedCardIndex === -1) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Pending choice source card is not in hand.");
    }
    const [playedCard] = player.hand.splice(playedCardIndex, 1);
    spendSpellMana(player, definition.cost);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$graveyard$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["moveSpellToGraveyard"])(next, playedCard, playerId);
    next.pendingChoice = undefined;
    next.phase = pendingChoice.returnPhase;
    next.consecutivePasses = 0;
    if ((definition.spellSpeed ?? "slow") !== "burst") {
        passPriority(next, playerId);
    }
    emitPlayedSpellEvents(next, playerId, playedCard, selectedTargets.target);
    return next;
}
function submitOnPlayAbilityTargets(state, playerId, pendingChoice, unit, targets) {
    const definition = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCardDefinitionForUnit"])(unit);
    const ability = (definition.abilities ?? []).find((candidate)=>candidate.id === pendingChoice.abilityId);
    if (!ability) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Pending choice ability not found.");
    }
    const selectedTargets = {
        ...pendingChoice.chosenTargets,
        ...targets
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$abilities$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["executeAbility"])(state, ability, {
        sourceId: unit.instanceId,
        sourceName: definition.name,
        sourcePlayerId: playerId,
        sourceUnit: unit,
        selectedTargets
    });
    state.pendingChoice = undefined;
    state.phase = pendingChoice.returnPhase;
    // Restore priority to opponent — playUnit already called passPriority
    // before the pendingChoice temporarily overrode it to the caster.
    state.priorityPlayerId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["opponentOf"])(playerId);
    state.activePlayerId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["opponentOf"])(playerId);
    return state;
}
function cancelPendingChoice(state, _playerId) {
    const next = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cloneState"])(state);
    if (next.pendingChoice) {
        next.phase = next.pendingChoice.returnPhase;
        next.pendingChoice = undefined;
    }
    return next;
}
function createPlayedSpellTargetMap(playerId, target) {
    return {
        target,
        self: {
            type: "SELF",
            playerId
        }
    };
}
function rejectSourceCardAsHandTarget(targets, sourceInstanceId) {
    for (const target of Object.values(targets)){
        if (target.type === "HAND_CARD" && target.cardInstanceId === sourceInstanceId) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"]("Ability cannot choose its source card as a hand-card target.");
        }
    }
}
function emitPlayedSpellEvents(state, playerId, card, target) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$triggers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["emitEvent"])(state, {
        type: "CARD_PLAYED",
        playerId,
        cardInstanceId: card.instanceId,
        sourcePlayerId: playerId,
        sourceInstanceId: card.instanceId,
        sourceCardId: card.cardId
    });
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$triggers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["emitEvent"])(state, {
        type: "SPELL_CAST",
        playerId,
        cardInstanceId: card.instanceId,
        target,
        sourcePlayerId: playerId,
        sourceInstanceId: card.instanceId,
        sourceCardId: card.cardId
    });
}
function declareAttacker(state, playerId, unitInstanceId) {
    const next = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cloneState"])(state);
    const unit = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findUnit"])(next, playerId, unitInstanceId);
    unit.exhausted = true;
    next.combat.attackers.push({
        attackerId: unit.instanceId
    });
    next.consecutivePasses = 0;
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$triggers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["emitEvent"])(next, {
        type: "ATTACK_DECLARED",
        playerId,
        unitInstanceId
    });
    return next;
}
function removeAttacker(state, playerId, unitInstanceId) {
    const next = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cloneState"])(state);
    const unit = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findUnit"])(next, playerId, unitInstanceId);
    unit.exhausted = false;
    next.combat.attackers = next.combat.attackers.filter((lane)=>lane.attackerId !== unitInstanceId);
    next.consecutivePasses = 0;
    return next;
}
function commitAttack(state, playerId) {
    const next = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cloneState"])(state);
    const defenderId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["opponentOf"])(playerId);
    next.phase = "BLOCK";
    next.consecutivePasses = 0;
    next.priorityPlayerId = defenderId;
    next.activePlayerId = defenderId;
    next.turn += 1;
    return next;
}
function declareBlocker(state, playerId, attackerId, blockerId) {
    const next = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cloneState"])(state);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findUnit"])(next, playerId, blockerId);
    const lane = next.combat.attackers.find((candidate)=>candidate.attackerId === attackerId);
    if (lane) {
        lane.blockerId = blockerId;
    }
    next.consecutivePasses = 0;
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$triggers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["emitEvent"])(next, {
        type: "BLOCK_DECLARED",
        playerId,
        attackerId,
        blockerId
    });
    return next;
}
function removeBlocker(state, playerId, blockerId) {
    const next = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cloneState"])(state);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findUnit"])(next, playerId, blockerId);
    const lane = next.combat.attackers.find((candidate)=>candidate.blockerId === blockerId);
    if (lane) {
        lane.blockerId = undefined;
    }
    next.consecutivePasses = 0;
    return next;
}
function commitBlocks(state, playerId) {
    const next = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cloneState"])(state);
    next.phase = "COMBAT";
    next.consecutivePasses = 0;
    next.priorityPlayerId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["opponentOf"])(playerId);
    next.activePlayerId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["opponentOf"])(playerId);
    next.turn += 1;
    return next;
}
function resolveCombat(state) {
    const next = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cloneState"])(state);
    const attackerPlayer = next.players[next.attackTokenPlayerId];
    const defenderId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["opponentOf"])(next.attackTokenPlayerId);
    const defenderPlayer = next.players[defenderId];
    for (const lane of next.combat.attackers){
        const attacker = attackerPlayer.board.find((unit)=>unit.instanceId === lane.attackerId);
        if (!attacker) {
            continue;
        }
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getUnitHealth"])(attacker) <= 0) {
            continue;
        }
        const blocker = lane.blockerId ? defenderPlayer.board.find((unit)=>unit.instanceId === lane.blockerId) : undefined;
        if (blocker && (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getUnitHealth"])(blocker) > 0) {
            if (hasKeyword(attacker, "QUICK_ATTACK")) {
                const attackerAttack = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getUnitAttack"])(attacker);
                const result = dealDamageToUnit(next, blocker, attackerAttack, attacker);
                emitUnitStruck(next, attacker, result.damageDealt, blocker);
                if (hasKeyword(attacker, "OVERWHELM")) {
                    dealCombatNexusDamage(next, attacker, defenderId, result.excessDamage);
                }
                if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getUnitHealth"])(blocker) > 0) {
                    const blockerResult = dealDamageToUnit(next, attacker, (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getUnitAttack"])(blocker), blocker);
                    emitUnitStruck(next, blocker, blockerResult.damageDealt, attacker);
                }
            } else {
                const result = dealDamageToUnit(next, blocker, (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getUnitAttack"])(attacker), attacker);
                emitUnitStruck(next, attacker, result.damageDealt, blocker);
                const blockerResult = dealDamageToUnit(next, attacker, (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getUnitAttack"])(blocker), blocker);
                emitUnitStruck(next, blocker, blockerResult.damageDealt, attacker);
                if (hasKeyword(attacker, "OVERWHELM")) {
                    dealCombatNexusDamage(next, attacker, defenderId, result.excessDamage);
                }
            }
        } else {
            emitUnitStruck(next, attacker, (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getUnitAttack"])(attacker));
            dealCombatNexusDamage(next, attacker, defenderId, (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getUnitAttack"])(attacker));
        }
    }
    runCleanupPipeline(next, "COMBAT_END", "COMBAT");
    clearCombatAssignments(next);
    next.combat.attackers = [];
    next.phase = "ACTION";
    next.attackTokenAvailable = false;
    next.priorityPlayerId = defenderId;
    next.activePlayerId = defenderId;
    next.consecutivePasses = 0;
    return next;
}
function spendSpellMana(player, cost) {
    const spellManaPaid = Math.min(player.spellMana, cost);
    player.spellMana -= spellManaPaid;
    player.mana -= cost - spellManaPaid;
}
function shuffleDeck(deck, seed) {
    const shuffled = [
        ...deck
    ];
    const random = createRandom(seed);
    for(let index = shuffled.length - 1; index > 0; index -= 1){
        const swapIndex = Math.floor(random() * (index + 1));
        [shuffled[index], shuffled[swapIndex]] = [
            shuffled[swapIndex],
            shuffled[index]
        ];
    }
    return shuffled;
}
function createRandom(seed) {
    let value = seed >>> 0;
    return ()=>{
        value += 0x6d2b79f5;
        let result = value;
        result = Math.imul(result ^ result >>> 15, result | 1);
        result ^= result + Math.imul(result ^ result >>> 7, result | 61);
        return ((result ^ result >>> 14) >>> 0) / 4294967296;
    };
}
function dealDamageToUnit(state, unit, amount, sourceUnit) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$damage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["dealDamageToUnitState"])(state, unit, amount, sourceUnit ? {
        playerId: sourceUnit.ownerId,
        sourceId: sourceUnit.instanceId,
        sourceInstanceId: sourceUnit.instanceId,
        sourceCardId: sourceUnit.cardId,
        damageType: "COMBAT"
    } : undefined);
}
function dealCombatNexusDamage(state, attacker, defenderId, amount) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$damage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["dealDamage"])(state, {
        playerId: attacker.ownerId,
        sourceId: attacker.instanceId,
        sourceInstanceId: attacker.instanceId,
        sourceCardId: attacker.cardId,
        damageType: "COMBAT"
    }, {
        type: "NEXUS",
        playerId: defenderId
    }, amount);
}
function emitUnitStruck(state, unit, amount, targetUnit) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$triggers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["emitEvent"])(state, {
        type: "UNIT_STRUCK",
        playerId: unit.ownerId,
        unitInstanceId: unit.instanceId,
        sourcePlayerId: unit.ownerId,
        sourceInstanceId: unit.instanceId,
        sourceCardId: unit.cardId,
        targetPlayerId: targetUnit?.ownerId,
        targetInstanceId: targetUnit?.instanceId,
        targetUnitId: targetUnit?.instanceId,
        targetCardId: targetUnit?.cardId,
        amount
    });
}
function healUnit(state, unit, amount) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$operations$2f$heal$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["healTarget"])(state, {
        type: "UNIT",
        playerId: unit.ownerId,
        unitId: unit.instanceId
    }, amount);
}
function hasKeyword(unit, keyword) {
    return unit.keywords.includes(keyword);
}
function endTurn(state, playerId) {
    const next = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cloneState"])(state);
    next.consecutivePasses += 1;
    if (next.consecutivePasses >= 2) {
        beginNextRound(next);
        return next;
    }
    passPriority(next, playerId);
    next.turn += 1;
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$triggers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["emitEvent"])(next, {
        type: "TURN_ENDED"
    });
    runCleanupPipeline(next, "END_TURN");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$triggers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["emitEvent"])(next, {
        type: "TURN_STARTED"
    });
    return next;
}
function passPriority(state, playerId) {
    state.priorityPlayerId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["opponentOf"])(playerId);
    state.activePlayerId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["opponentOf"])(playerId);
    if (state.phase === "ACTION") {
        requestDiscardIfNeeded(state, state.priorityPlayerId);
    }
}
function requestDiscardIfNeeded(state, playerId) {
    if (state.players[playerId].hand.length <= __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["HAND_LIMIT"]) {
        return;
    }
    state.pendingDiscard = {
        playerId,
        downTo: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["HAND_LIMIT"],
        returnPhase: "ACTION"
    };
    state.phase = "DISCARD";
    state.priorityPlayerId = playerId;
    state.activePlayerId = playerId;
}
function runCleanupPipeline(state, timing, cause = "EFFECT") {
    if (timing === "END_TURN") {
        expireModifiers(state, "THIS_TURN");
    } else if (timing === "END_ROUND") {
        expireModifiers(state, "THIS_TURN");
        expireModifiers(state, "THIS_ROUND");
    } else if (timing === "COMBAT_END") {
        expireModifiers(state, "UNTIL_COMBAT_END");
    }
    for (const playerId of __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLAYER_IDS"]){
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$graveyard$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cleanupDeadUnits"])(state, state.players[playerId], cause);
    }
    checkChampionLevelUps(state);
}
function expireModifiers(state, duration) {
    for (const playerId of __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLAYER_IDS"]){
        for (const unit of state.players[playerId].board){
            unit.modifiers = unit.modifiers.filter((modifier)=>modifier.duration !== duration);
        }
    }
// After expiry, dead units (health dropped below 0 due to lost health buffs) are caught
// by cleanupDeadUnits called immediately after in runCleanupPipeline.
}
function clearCombatAssignments(state) {
    for (const playerId of __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLAYER_IDS"]){
        state.players[playerId].board = state.players[playerId].board.map((unit)=>({
                ...unit,
                attacking: false,
                blockingUnitId: undefined,
                blockedByUnitId: undefined
            }));
    }
}
function normalizeDeck(deck, ownerId) {
    return deck.map((entry, index)=>{
        if ("instanceId" in entry) {
            if (!entry.cardId) {
                throw new Error("Card instance requires cardId.");
            }
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cardRegistry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCardDefinition"])(entry.cardId);
            return {
                instanceId: entry.instanceId,
                cardId: entry.cardId,
                ownerId: entry.ownerId
            };
        }
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cardRegistry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["registerCardDefinition"])(entry);
        return {
            instanceId: `${ownerId}-${entry.id}-${index}`,
            cardId: entry.id,
            ownerId
        };
    });
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/game/sampleCards.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "sampleAbilityCards",
    ()=>sampleAbilityCards,
    "sampleDeckCards",
    ()=>sampleDeckCards,
    "sampleSpellCards",
    ()=>sampleSpellCards,
    "sampleUnitCards",
    ()=>sampleUnitCards
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cardRegistry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/cardRegistry.ts [app-client] (ecmascript)");
;
const sampleDeckCards = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cardRegistry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["listCards"])();
const sampleUnitCards = sampleDeckCards.filter((card)=>card.type === "unit" || card.type === "champion");
const sampleSpellCards = sampleDeckCards.filter((card)=>card.type === "spell");
const sampleAbilityCards = sampleDeckCards.filter((card)=>Boolean(card.abilities?.length));
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/hooks/useLocalGame.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useLocalGame",
    ()=>useLocalGame
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/cards.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/src/game/engine.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$sampleCards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/sampleCards.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/types.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
function useLocalGame() {
    _s();
    const initialState = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "useLocalGame.useMemo[initialState]": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createInitialGameState"])(buildDeck("P1"), buildDeck("P2"), Date.now())
    }["useLocalGame.useMemo[initialState]"], []);
    const [gameState, setGameState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(initialState);
    const [actionLog, setActionLog] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([
        {
            id: 1,
            message: "Local battle loaded."
        }
    ]);
    function dispatch(action, label = describeAction(action)) {
        try {
            const nextState = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["applyAction"])(gameState, action);
            setGameState(nextState);
            const newLogs = nextState.visualEvents.map(describeVisualEvent).filter((s)=>Boolean(s));
            const allMessages = [
                label,
                ...newLogs
            ].reverse();
            allMessages.forEach((msg)=>{
                if (msg) setActionLog((current)=>[
                        {
                            id: Date.now() + Math.random(),
                            message: msg
                        },
                        ...current
                    ]);
            });
            return true;
        } catch (error) {
            addLog(error instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"] ? error.message : "Action failed.");
            return false;
        }
    }
    /** Chain multiple actions: each acts on the result of the previous one. */ function dispatchChain(actions) {
        let state = gameState;
        const allMessages = [];
        for (const { action, label } of actions){
            try {
                state = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["applyAction"])(state, action);
                const msg = label ?? describeAction(action);
                if (msg) allMessages.push(msg);
                const newLogs = state.visualEvents.map(describeVisualEvent).filter((s)=>Boolean(s));
                allMessages.push(...newLogs);
            } catch (error) {
                addLog(error instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameValidationError"] ? error.message : "Action failed.");
                return false;
            }
        }
        setGameState(state);
        [
            ...allMessages
        ].reverse().forEach((msg)=>{
            if (msg) setActionLog((current)=>[
                    {
                        id: Date.now() + Math.random(),
                        message: msg
                    },
                    ...current
                ]);
        });
        return true;
    }
    function resetGame() {
        setGameState((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createInitialGameState"])(buildDeck("P1"), buildDeck("P2"), Date.now()));
        setActionLog([
            {
                id: Date.now(),
                message: "New local battle created."
            }
        ]);
    }
    function addLog(message) {
        setActionLog((current)=>[
                {
                    id: Date.now() + Math.random(),
                    message
                },
                ...current
            ]);
    }
    return {
        gameState,
        actionLog,
        dispatch,
        dispatchChain,
        resetGame
    };
}
_s(useLocalGame, "xaKoEgYP4wmrlGU5xm2blZuXzC0=");
function buildDeck(playerId) {
    return buildSampleLocalDeck().map((definition, index)=>{
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createCardInstance"])(definition, playerId, `${playerId}-${definition.id}-${index}`);
    });
}
function buildSampleLocalDeck() {
    const deck = [];
    let unitIndex = 0;
    let spellIndex = 0;
    for(let index = 0; index < 24; index += 1){
        const shouldAddSpell = (index + 1) % 3 === 0;
        if (shouldAddSpell) {
            deck.push(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$sampleCards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sampleSpellCards"][spellIndex % __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$sampleCards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sampleSpellCards"].length]);
            spellIndex += 1;
        } else {
            deck.push(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$sampleCards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sampleUnitCards"][unitIndex % __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$sampleCards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sampleUnitCards"].length]);
            unitIndex += 1;
        }
    }
    return deck;
}
function describeAction(action) {
    switch(action.type){
        case "START_GAME":
            return `Started game with ${action.firstPlayerId ?? "P1"} attacking first.`;
        case "DRAW_CARD":
            return `${action.playerId} drew ${action.count ?? 1} card(s).`;
        case "DISCARD_CARD":
            return `${action.playerId} discarded a card.`;
        case "START_ROUND":
            return "Started a new round.";
        case "PLAY_UNIT":
            return `${action.playerId} played a unit.`;
        case "PLAY_SPELL":
            return `${action.playerId} played a spell.`;
        case "SUBMIT_ABILITY_TARGETS":
            return `${action.playerId} submitted ability targets.`;
        case "CANCEL_PENDING_CHOICE":
            return `${action.playerId} cancelled an ability choice.`;
        case "DECLARE_ATTACKER":
            return `${action.playerId} declared an attacker.`;
        case "REMOVE_ATTACKER":
            return `${action.playerId} removed an attacker.`;
        case "COMMIT_ATTACK":
            return `${action.playerId} committed attackers.`;
        case "DECLARE_BLOCKER":
            return `${action.playerId} declared a blocker.`;
        case "REMOVE_BLOCKER":
            return `${action.playerId} removed a blocker.`;
        case "COMMIT_BLOCKS":
            return `${action.playerId} committed blocks.`;
        case "RESOLVE_COMBAT":
            return "Resolved combat.";
        case "END_TURN":
            return `${action.playerId} passed priority.`;
    }
}
function describeVisualEvent(event) {
    switch(event.type){
        case "TRIGGER_ACTIVATED":
            return `Trigger activated: ${event.effectName}`;
        case "DAMAGE":
            return `${event.targetId} took ${event.amount} damage.`;
        case "HEAL":
            return `${event.targetId} healed ${event.amount}.`;
        case "DRAW":
            return `${event.playerId} drew ${event.count} card(s).`;
        case "BUFF":
            return `${event.targetId} gained ${event.attackDelta > 0 ? '+' : ''}${event.attackDelta}/${event.healthDelta > 0 ? '+' : ''}${event.healthDelta}.`;
        case "CHAMPION_LEVELED_UP":
            return `${event.playerId}'s champion leveled up to level ${event.newLevel}!`;
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ActionLog.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ActionLog",
    ()=>ActionLog
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
"use client";
;
function ActionLog({ entries }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
        className: "action-log",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                children: "Action Log"
            }, void 0, false, {
                fileName: "[project]/src/components/ActionLog.tsx",
                lineNumber: 12,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ol", {
                className: "log-list",
                children: entries.map((entry)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                        children: entry.message
                    }, entry.id, false, {
                        fileName: "[project]/src/components/ActionLog.tsx",
                        lineNumber: 15,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/src/components/ActionLog.tsx",
                lineNumber: 13,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ActionLog.tsx",
        lineNumber: 11,
        columnNumber: 5
    }, this);
}
_c = ActionLog;
var _c;
__turbopack_context__.k.register(_c, "ActionLog");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/contexts/HoverContext.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "HoverProvider",
    ()=>HoverProvider,
    "useHover",
    ()=>useHover
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
const HoverContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(undefined);
function HoverProvider({ children }) {
    _s();
    const [hoveredCard, setHoveredCardState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])();
    const [hoveredUnit, setHoveredUnit] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(HoverContext.Provider, {
        value: {
            hoveredCard,
            hoveredUnit,
            setHoveredCard: (c, u)=>{
                setHoveredCardState(c);
                setHoveredUnit(u);
            }
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/src/contexts/HoverContext.tsx",
        lineNumber: 18,
        columnNumber: 5
    }, this);
}
_s(HoverProvider, "tMgEk9NRgw2z0vozk+u/BGH9jr0=");
_c = HoverProvider;
function useHover() {
    _s1();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(HoverContext);
    if (!context) throw new Error("useHover must be used within HoverProvider");
    return context;
}
_s1(useHover, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
var _c;
__turbopack_context__.k.register(_c, "HoverProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/CardView.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CardView",
    ()=>CardView
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/shield.mjs [app-client] (ecmascript) <export default as Shield>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$swords$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Swords$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/swords.mjs [app-client] (ecmascript) <export default as Swords>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$zap$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Zap$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/zap.mjs [app-client] (ecmascript) <export default as Zap>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/cards.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$HoverContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/contexts/HoverContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cardRegistry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/cardRegistry.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
function CardView({ card, unit, selected = false, onClick, visualEvents }) {
    _s();
    const { setHoveredCard } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$HoverContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useHover"])();
    const cardId = unit?.cardId ?? card?.cardId;
    if (!cardId) {
        return null;
    }
    const definition = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cardRegistry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCardDefinition"])(cardId);
    const attack = unit ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getUnitAttack"])(unit) : definition.attack;
    const health = unit ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getUnitHealth"])(unit) : definition.health;
    const maxHealth = unit ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getUnitMaxHealth"])(unit) : definition.health;
    const isTriggerActivated = visualEvents?.some((e)=>e.type === "TRIGGER_ACTIVATED");
    const floatingEvents = visualEvents?.filter((e)=>e.type !== "TRIGGER_ACTIVATED" && e.type !== "DRAW");
    const className = [
        "card-view",
        onClick ? "is-clickable" : "",
        selected ? "is-selected" : "",
        unit?.attacking ? "is-attacking" : "",
        unit?.blockingUnitId ? "is-blocking" : "",
        isTriggerActivated ? "is-trigger-activated" : ""
    ].filter(Boolean).join(" ");
    const style = definition.imageUrl ? {
        backgroundImage: `url(${definition.imageUrl})`
    } : undefined;
    const content = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            definition.imageUrl && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "card-bg-image",
                style: style
            }, void 0, false, {
                fileName: "[project]/src/components/CardView.tsx",
                lineNumber: 46,
                columnNumber: 31
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "card-header-bg",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "card-meta",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$zap$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Zap$3e$__["Zap"], {
                                size: 13,
                                "aria-hidden": "true"
                            }, void 0, false, {
                                fileName: "[project]/src/components/CardView.tsx",
                                lineNumber: 49,
                                columnNumber: 11
                            }, this),
                            " ",
                            definition.cost
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/CardView.tsx",
                        lineNumber: 48,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "card-name",
                        children: definition.name
                    }, void 0, false, {
                        fileName: "[project]/src/components/CardView.tsx",
                        lineNumber: 51,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/CardView.tsx",
                lineNumber: 47,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "card-stats",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "card-stat attack",
                        title: "Attack",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$swords$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Swords$3e$__["Swords"], {
                                size: 14,
                                "aria-hidden": "true"
                            }, void 0, false, {
                                fileName: "[project]/src/components/CardView.tsx",
                                lineNumber: 55,
                                columnNumber: 11
                            }, this),
                            " ",
                            attack ?? "-"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/CardView.tsx",
                        lineNumber: 54,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "card-stat health",
                        title: "Health",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__["Shield"], {
                                size: 14,
                                "aria-hidden": "true"
                            }, void 0, false, {
                                fileName: "[project]/src/components/CardView.tsx",
                                lineNumber: 58,
                                columnNumber: 11
                            }, this),
                            " ",
                            health ?? "-",
                            unit && maxHealth !== undefined ? `/${maxHealth}` : ""
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/CardView.tsx",
                        lineNumber: 57,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/CardView.tsx",
                lineNumber: 53,
                columnNumber: 7
            }, this),
            unit?.modifiers.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "effect-list",
                children: unit.modifiers.map((modifier)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "effect-chip",
                        children: [
                            modifier.sourceName,
                            " ",
                            formatEffect(modifier.attackDelta, modifier.healthDelta)
                        ]
                    }, modifier.id, true, {
                        fileName: "[project]/src/components/CardView.tsx",
                        lineNumber: 65,
                        columnNumber: 13
                    }, this))
            }, void 0, false, {
                fileName: "[project]/src/components/CardView.tsx",
                lineNumber: 63,
                columnNumber: 9
            }, this) : null,
            floatingEvents && floatingEvents.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "floating-events-container",
                children: floatingEvents.map((e, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: `floating-event ${e.type.toLowerCase()}`,
                        children: e.type === "DAMAGE" ? `-${e.amount}` : e.type === "HEAL" ? `+${e.amount}` : e.type === "BUFF" ? `+${e.attackDelta}/+${e.healthDelta}` : ""
                    }, idx, false, {
                        fileName: "[project]/src/components/CardView.tsx",
                        lineNumber: 76,
                        columnNumber: 13
                    }, this))
            }, void 0, false, {
                fileName: "[project]/src/components/CardView.tsx",
                lineNumber: 74,
                columnNumber: 9
            }, this) : null
        ]
    }, void 0, true);
    const hoverProps = {
        onMouseEnter: ()=>setHoveredCard(card, unit),
        onMouseLeave: ()=>setHoveredCard(undefined, undefined)
    };
    if (!onClick) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: className,
            ...hoverProps,
            children: content
        }, void 0, false, {
            fileName: "[project]/src/components/CardView.tsx",
            lineNumber: 91,
            columnNumber: 12
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        className: className,
        type: "button",
        onClick: onClick,
        ...hoverProps,
        children: content
    }, void 0, false, {
        fileName: "[project]/src/components/CardView.tsx",
        lineNumber: 95,
        columnNumber: 5
    }, this);
}
_s(CardView, "yZhb/MuO1X72sQ55NI5BF1HIrKs=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$HoverContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useHover"]
    ];
});
_c = CardView;
function formatEffect(attackDelta, healthDelta) {
    const attack = attackDelta >= 0 ? `+${attackDelta}` : `${attackDelta}`;
    const health = healthDelta >= 0 ? `+${healthDelta}` : `${healthDelta}`;
    return `${attack}|${health}`;
}
var _c;
__turbopack_context__.k.register(_c, "CardView");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/CardInspector.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CardInspector",
    ()=>CardInspector
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$HoverContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/contexts/HoverContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/cards.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/shield.mjs [app-client] (ecmascript) <export default as Shield>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$swords$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Swords$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/swords.mjs [app-client] (ecmascript) <export default as Swords>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$zap$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Zap$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/zap.mjs [app-client] (ecmascript) <export default as Zap>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cardRegistry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/cardRegistry.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
function CardInspector() {
    _s();
    const { hoveredCard, hoveredUnit } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$HoverContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useHover"])();
    const cardId = hoveredUnit?.cardId ?? hoveredCard?.cardId;
    const definition = cardId ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cardRegistry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCardDefinition"])(cardId) : undefined;
    if (!definition) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "card-inspector empty",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                children: "Hover over a card to view details"
            }, void 0, false, {
                fileName: "[project]/src/components/CardInspector.tsx",
                lineNumber: 15,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/components/CardInspector.tsx",
            lineNumber: 14,
            columnNumber: 7
        }, this);
    }
    const attack = hoveredUnit ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getUnitAttack"])(hoveredUnit) : definition.attack;
    const health = hoveredUnit ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getUnitHealth"])(hoveredUnit) : definition.health;
    const maxHealth = hoveredUnit ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getUnitMaxHealth"])(hoveredUnit) : definition.health;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "card-inspector",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "inspector-header",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        children: definition.name
                    }, void 0, false, {
                        fileName: "[project]/src/components/CardInspector.tsx",
                        lineNumber: 27,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "card-meta",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$zap$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Zap$3e$__["Zap"], {
                                size: 14
                            }, void 0, false, {
                                fileName: "[project]/src/components/CardInspector.tsx",
                                lineNumber: 28,
                                columnNumber: 37
                            }, this),
                            " ",
                            definition.cost
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/CardInspector.tsx",
                        lineNumber: 28,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/CardInspector.tsx",
                lineNumber: 26,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "inspector-type",
                children: [
                    definition.supertype ? `${definition.supertype} ` : "",
                    definition.type
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/CardInspector.tsx",
                lineNumber: 31,
                columnNumber: 7
            }, this),
            (attack !== undefined || health !== undefined) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "card-stats",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "card-stat attack",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$swords$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Swords$3e$__["Swords"], {
                                size: 14
                            }, void 0, false, {
                                fileName: "[project]/src/components/CardInspector.tsx",
                                lineNumber: 37,
                                columnNumber: 46
                            }, this),
                            " ",
                            attack
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/CardInspector.tsx",
                        lineNumber: 37,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "card-stat health",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__["Shield"], {
                                size: 14
                            }, void 0, false, {
                                fileName: "[project]/src/components/CardInspector.tsx",
                                lineNumber: 38,
                                columnNumber: 46
                            }, this),
                            " ",
                            health,
                            hoveredUnit && maxHealth !== undefined ? `/${maxHealth}` : ""
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/CardInspector.tsx",
                        lineNumber: 38,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/CardInspector.tsx",
                lineNumber: 36,
                columnNumber: 9
            }, this),
            definition.description && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "inspector-description",
                style: {
                    marginTop: '8px',
                    fontStyle: 'italic',
                    color: '#ccc'
                },
                children: definition.description
            }, void 0, false, {
                fileName: "[project]/src/components/CardInspector.tsx",
                lineNumber: 43,
                columnNumber: 9
            }, this),
            definition.keywords && definition.keywords.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "inspector-keywords",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                        children: "Keywords:"
                    }, void 0, false, {
                        fileName: "[project]/src/components/CardInspector.tsx",
                        lineNumber: 50,
                        columnNumber: 11
                    }, this),
                    " ",
                    definition.keywords.join(", ")
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/CardInspector.tsx",
                lineNumber: 49,
                columnNumber: 9
            }, this),
            definition.effects && definition.effects.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "inspector-effects",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                        children: "Effects:"
                    }, void 0, false, {
                        fileName: "[project]/src/components/CardInspector.tsx",
                        lineNumber: 56,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                        children: definition.effects.map((eff, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                children: [
                                    eff.type,
                                    " ",
                                    eff.target && `(Target: ${eff.target})`,
                                    " ",
                                    "amount" in eff && `(${eff.amount})`,
                                    " ",
                                    "count" in eff && `(${eff.count})`
                                ]
                            }, i, true, {
                                fileName: "[project]/src/components/CardInspector.tsx",
                                lineNumber: 59,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/src/components/CardInspector.tsx",
                        lineNumber: 57,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/CardInspector.tsx",
                lineNumber: 55,
                columnNumber: 9
            }, this),
            definition.triggers && definition.triggers.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "inspector-triggers",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                        children: "Triggers:"
                    }, void 0, false, {
                        fileName: "[project]/src/components/CardInspector.tsx",
                        lineNumber: 67,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                        children: definition.triggers.map((trig, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("em", {
                                        children: trig.event
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/CardInspector.tsx",
                                        lineNumber: 71,
                                        columnNumber: 17
                                    }, this),
                                    ": ",
                                    trig.effects.map((e)=>e.type).join(", ")
                                ]
                            }, i, true, {
                                fileName: "[project]/src/components/CardInspector.tsx",
                                lineNumber: 70,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/src/components/CardInspector.tsx",
                        lineNumber: 68,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/CardInspector.tsx",
                lineNumber: 66,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/CardInspector.tsx",
        lineNumber: 25,
        columnNumber: 5
    }, this);
}
_s(CardInspector, "7w/kKNBL/ciIzETDD7VIyEMjweE=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$HoverContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useHover"]
    ];
});
_c = CardInspector;
var _c;
__turbopack_context__.k.register(_c, "CardInspector");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/HandView.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "HandView",
    ()=>HandView
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$CardView$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/CardView.tsx [app-client] (ecmascript)");
"use client";
;
;
function HandView({ cards, selectedCardId, canPlay, onPlayCard }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "lane",
        "aria-label": "Hand",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "lane-label",
                children: "Hand"
            }, void 0, false, {
                fileName: "[project]/src/components/HandView.tsx",
                lineNumber: 16,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "card-grid",
                children: cards.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "empty-slot",
                    children: "No cards"
                }, void 0, false, {
                    fileName: "[project]/src/components/HandView.tsx",
                    lineNumber: 19,
                    columnNumber: 11
                }, this) : cards.map((card)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$CardView$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardView"], {
                        card: card,
                        selected: card.instanceId === selectedCardId,
                        onClick: canPlay(card) ? ()=>onPlayCard(card) : undefined
                    }, card.instanceId, false, {
                        fileName: "[project]/src/components/HandView.tsx",
                        lineNumber: 22,
                        columnNumber: 13
                    }, this))
            }, void 0, false, {
                fileName: "[project]/src/components/HandView.tsx",
                lineNumber: 17,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/HandView.tsx",
        lineNumber: 15,
        columnNumber: 5
    }, this);
}
_c = HandView;
var _c;
__turbopack_context__.k.register(_c, "HandView");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/GameBoard.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GameBoard",
    ()=>GameBoard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$rotate$2d$ccw$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RotateCcw$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/rotate-ccw.mjs [app-client] (ecmascript) <export default as RotateCcw>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/shield.mjs [app-client] (ecmascript) <export default as Shield>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$swords$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Swords$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/swords.mjs [app-client] (ecmascript) <export default as Swords>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.mjs [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$zap$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Zap$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/zap.mjs [app-client] (ecmascript) <export default as Zap>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useLocalGame$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/hooks/useLocalGame.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ActionLog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ActionLog.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$CardView$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/CardView.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/cards.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/src/game/engine.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$HoverContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/contexts/HoverContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$CardInspector$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/CardInspector.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$HandView$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/HandView.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cardRegistry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/cardRegistry.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
;
;
;
;
function GameBoard() {
    _s();
    const { gameState, actionLog, dispatch, dispatchChain, resetGame } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useLocalGame$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLocalGame"])();
    const [selectedBlockerId, setSelectedBlockerId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])();
    const [selectedSpell, setSelectedSpell] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])();
    const [selectedSpellTarget, setSelectedSpellTarget] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])();
    const [viewingGraveyard, setViewingGraveyard] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])();
    const attackPlayerId = gameState.attackTokenPlayerId;
    const defenderId = attackPlayerId === "P1" ? "P2" : "P1";
    const attackerCount = gameState.combat.attackers.length;
    const selectedBlocker = selectedBlockerId ? gameState.players[defenderId].board.find((unit)=>unit.instanceId === selectedBlockerId) : undefined;
    const attackerIds = gameState.combat.attackers.map((lane)=>lane.attackerId);
    const assignedBlockerIds = gameState.combat.attackers.map((lane)=>lane.blockerId).filter((blockerId)=>Boolean(blockerId));
    const cardDef = (card)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cardRegistry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCardDefinition"])(card.cardId);
    const unitDef = (unit)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cardRegistry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCardDefinition"])(unit.cardId);
    function canPlay(playerId, card) {
        const player = gameState.players[playerId];
        const definition = cardDef(card);
        const isSpell = definition.type === "spell";
        if (gameState.phase === "DISCARD") {
            return gameState.pendingDiscard?.playerId === playerId && card.ownerId === playerId && player.hand.length > gameState.pendingDiscard.downTo;
        }
        return gameState.started && !gameState.winnerId && gameState.phase === "ACTION" && gameState.priorityPlayerId === playerId && (isSpell ? player.mana + player.spellMana >= definition.cost : player.mana >= definition.cost);
    }
    function playCard(playerId, card) {
        const definition = cardDef(card);
        if (gameState.phase === "DISCARD") {
            dispatch({
                type: "DISCARD_CARD",
                playerId,
                cardInstanceId: card.instanceId
            }, `${playerId} discarded ${definition.name}.`);
            return;
        }
        if (definition.supertype?.toLowerCase() === "champion") {
            if (!window.confirm(`Are you sure you want to play Champion ${definition.name}?`)) {
                return;
            }
        }
        if (definition.type === "spell") {
            playOrSelectSpell(playerId, card);
            return;
        }
        if ((definition.type === "unit" || definition.type === "champion") && gameState.players[playerId].board.length >= 6) {
            setSelectedSpell(card); // Treat as spell to select replacement target
            return;
        }
        dispatch({
            type: "PLAY_UNIT",
            playerId,
            cardInstanceId: card.instanceId
        }, `${playerId} played ${definition.name}.`);
    }
    function playOrSelectSpell(playerId, card) {
        if (selectedSpell?.instanceId === card.instanceId) {
            setSelectedSpell(undefined);
            setSelectedSpellTarget(undefined);
            return;
        }
        const targetKind = getPrimarySpellTarget(card);
        setSelectedSpell(card);
        if (targetKind === "SELF") {
            setSelectedSpellTarget({
                type: "SELF",
                playerId
            });
            return;
        }
        if (targetKind === "NEXUS") {
            const targetPlayerId = cardDef(card).effects?.[0]?.type === "HEAL" ? playerId : opponentOf(playerId);
            setSelectedSpellTarget({
                type: "NEXUS",
                playerId: targetPlayerId
            });
            return;
        }
        setSelectedSpellTarget(undefined);
    }
    function getDamagePreview(attacker, blocker) {
        if (!blocker) {
            return {
                attackerTakes: 0,
                blockerTakes: 0,
                nexusTakes: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getUnitAttack"])(attacker)
            };
        }
        const atk = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getUnitAttack"])(attacker);
        const blkAtk = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getUnitAttack"])(blocker);
        let attackerTakes = 0;
        let blockerTakes = 0;
        let nexusTakes = 0;
        const calcDamage = (amount, unit)=>{
            if (amount <= 0) return 0;
            if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["hasKeyword"])(unit, "BARRIER")) return 0;
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["hasKeyword"])(unit, "TOUGH") ? Math.max(0, amount - 1) : amount;
        };
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["hasKeyword"])(attacker, "QUICK_ATTACK")) {
            const dmgToBlocker = calcDamage(atk, blocker);
            blockerTakes = Math.min((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getUnitHealth"])(blocker), dmgToBlocker);
            if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["hasKeyword"])(attacker, "OVERWHELM")) {
                nexusTakes = Math.max(0, dmgToBlocker - (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getUnitHealth"])(blocker));
            }
            if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getUnitHealth"])(blocker) - blockerTakes > 0) {
                attackerTakes = calcDamage(blkAtk, attacker);
            }
        } else {
            const dmgToBlocker = calcDamage(atk, blocker);
            blockerTakes = Math.min((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getUnitHealth"])(blocker), dmgToBlocker);
            attackerTakes = calcDamage(blkAtk, attacker);
            if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$engine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["hasKeyword"])(attacker, "OVERWHELM")) {
                nexusTakes = Math.max(0, dmgToBlocker - (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getUnitHealth"])(blocker));
            }
        }
        return {
            attackerTakes,
            blockerTakes,
            nexusTakes
        };
    }
    function getPrimarySpellTarget(card) {
        const target = cardDef(card).effects?.[0]?.target;
        if (target === "ENEMY_UNIT" || target === "ALLY_UNIT" || target === "NEXUS" || target === "SELF" || target === "ALLY_GRAVEYARD" || target === "ENEMY_GRAVEYARD") {
            return target;
        }
        return undefined;
    }
    function assignBlocker(attacker, blockerId) {
        const blockerName = gameState.players[defenderId].board.find((candidate)=>candidate.instanceId === blockerId);
        const blockerLabel = blockerName ? unitDef(blockerName).name : "a unit";
        dispatch({
            type: "DECLARE_BLOCKER",
            playerId: defenderId,
            attackerId: attacker.instanceId,
            blockerId
        }, `${defenderId} blocked ${unitDef(attacker).name} with ${blockerLabel}.`);
        setSelectedBlockerId(undefined);
    }
    function selectBoardUnit(playerId, unit) {
        if (!gameState.started || gameState.winnerId) {
            return;
        }
        if (selectedSpell && gameState.phase === "ACTION") {
            const casterId = selectedSpell.ownerId;
            const selectedDefinition = cardDef(selectedSpell);
            if (selectedDefinition.type === "unit" || selectedDefinition.type === "champion") {
                if (playerId === casterId) {
                    dispatch({
                        type: "PLAY_UNIT",
                        playerId: casterId,
                        cardInstanceId: selectedSpell.instanceId,
                        replaceUnitId: unit.instanceId
                    }, `${casterId} played ${selectedDefinition.name}, replacing ${unitDef(unit).name}.`);
                    setSelectedSpell(undefined);
                    setSelectedSpellTarget(undefined);
                }
                return;
            }
            const targetKind = getPrimarySpellTarget(selectedSpell);
            const isValidUnitTarget = targetKind === "ALLY_UNIT" && playerId === casterId || targetKind === "ENEMY_UNIT" && playerId !== casterId;
            if (!isValidUnitTarget) {
                return;
            }
            setSelectedSpellTarget({
                type: "UNIT",
                playerId,
                unitId: unit.instanceId
            });
            return;
        }
        if (playerId === attackPlayerId && gameState.phase === "BLOCK" && gameState.priorityPlayerId === defenderId && selectedBlockerId && gameState.combat.attackers.some((lane)=>lane.attackerId === unit.instanceId && !lane.blockerId)) {
            assignBlocker(unit, selectedBlockerId);
            return;
        }
        if (playerId === attackPlayerId && gameState.priorityPlayerId === playerId) {
            if (gameState.phase !== "ACTION" || !gameState.attackTokenAvailable) {
                return;
            }
            if (gameState.combat.attackers.some((lane)=>lane.attackerId === unit.instanceId)) {
                dispatch({
                    type: "REMOVE_ATTACKER",
                    playerId,
                    unitInstanceId: unit.instanceId
                }, `${playerId} removed ${unitDef(unit).name} from the attack.`);
                return;
            }
            dispatch({
                type: "DECLARE_ATTACKER",
                playerId,
                unitInstanceId: unit.instanceId
            }, `${playerId} sent ${unitDef(unit).name} to attack.`);
            return;
        }
        if (playerId === defenderId && gameState.priorityPlayerId === playerId) {
            if (gameState.phase !== "BLOCK") {
                return;
            }
            if (gameState.combat.attackers.some((lane)=>lane.blockerId === unit.instanceId)) {
                dispatch({
                    type: "REMOVE_BLOCKER",
                    playerId,
                    blockerId: unit.instanceId
                }, `${playerId} removed ${unitDef(unit).name} from blocking.`);
                setSelectedBlockerId(undefined);
                return;
            }
            const unblockedAttackers = gameState.combat.attackers.filter((lane)=>!lane.blockerId).map((lane)=>gameState.players[attackPlayerId].board.find((attacker)=>attacker.instanceId === lane.attackerId)).filter((attacker)=>Boolean(attacker));
            if (unblockedAttackers.length === 1) {
                assignBlocker(unblockedAttackers[0], unit.instanceId);
                return;
            }
            setSelectedBlockerId(unit.instanceId === selectedBlockerId ? undefined : unit.instanceId);
        }
    }
    function commitAttack() {
        setSelectedBlockerId(undefined);
        setSelectedSpell(undefined);
        setSelectedSpellTarget(undefined);
        dispatch({
            type: "COMMIT_ATTACK",
            playerId: attackPlayerId
        }, `${attackPlayerId} committed attackers. ${defenderId} may block.`);
    }
    function passPriority() {
        setSelectedBlockerId(undefined);
        setSelectedSpell(undefined);
        setSelectedSpellTarget(undefined);
        dispatch({
            type: "END_TURN",
            playerId: gameState.priorityPlayerId
        }, `${gameState.priorityPlayerId} passed priority.`);
    }
    function commitBlocks() {
        setSelectedBlockerId(undefined);
        setSelectedSpell(undefined);
        setSelectedSpellTarget(undefined);
        dispatch({
            type: "COMMIT_BLOCKS",
            playerId: defenderId
        }, `${defenderId} committed blocks. Combat is ready.`);
    }
    function startRound() {
        setSelectedBlockerId(undefined);
        setSelectedSpell(undefined);
        setSelectedSpellTarget(undefined);
        dispatch({
            type: "START_ROUND"
        }, "Round advanced. Mana refilled and attack token rotated.");
    }
    function resolveCombat() {
        setSelectedBlockerId(undefined);
        setSelectedSpell(undefined);
        setSelectedSpellTarget(undefined);
        dispatch({
            type: "RESOLVE_COMBAT"
        }, "Combat resolved.");
    }
    function getSmartAction() {
        const started = gameState.started && !gameState.winnerId;
        // ATTACK/PASS: attacker has priority, action phase, attack token still available.
        if (started && gameState.phase === "ACTION" && gameState.priorityPlayerId === attackPlayerId && gameState.attackTokenAvailable) {
            if (attackerCount === 0) {
                return {
                    label: "PASS",
                    sublabel: "No attack",
                    mode: "idle",
                    enabled: true,
                    onClick: passPriority
                };
            }
            return {
                label: "ATTACK",
                sublabel: `${attackerCount} unit${attackerCount > 1 ? "s" : ""}`,
                mode: "attack",
                enabled: true,
                onClick: commitAttack
            };
        }
        // DEFEND: block phase, defender has priority, no pending manual assignment
        if (started && gameState.phase === "BLOCK" && gameState.priorityPlayerId === defenderId && !selectedBlockerId) {
            const hasBlocks = assignedBlockerIds.length > 0;
            return {
                label: hasBlocks ? "DEFEND" : "PASS",
                sublabel: hasBlocks ? `${assignedBlockerIds.length} block${assignedBlockerIds.length > 1 ? "s" : ""}` : "No blocks",
                mode: "defend",
                enabled: true,
                // Commit blocks then auto-resolve in one atomic step
                onClick: ()=>{
                    setSelectedBlockerId(undefined);
                    setSelectedSpell(undefined);
                    setSelectedSpellTarget(undefined);
                    dispatchChain([
                        {
                            action: {
                                type: "COMMIT_BLOCKS",
                                playerId: defenderId
                            },
                            label: `${defenderId} committed blocks.`
                        },
                        {
                            action: {
                                type: "RESOLVE_COMBAT"
                            },
                            label: "Combat resolved."
                        }
                    ]);
                }
            };
        }
        // ROUND: action phase — advance the round
        if (started && gameState.phase === "ACTION") {
            return {
                label: "ROUND",
                sublabel: `#${gameState.round}`,
                mode: "round",
                enabled: true,
                onClick: startRound
            };
        }
        return {
            label: "ROUND",
            sublabel: `#${gameState.round}`,
            mode: "idle",
            enabled: false,
            onClick: ()=>{}
        };
    }
    function castSelectedSpell() {
        if (!selectedSpell || !selectedSpellTarget) {
            return;
        }
        dispatch({
            type: "PLAY_SPELL",
            playerId: selectedSpell.ownerId,
            cardInstanceId: selectedSpell.instanceId,
            target: selectedSpellTarget
        }, `${selectedSpell.ownerId} played ${cardDef(selectedSpell).name}.`);
        setSelectedSpell(undefined);
        setSelectedSpellTarget(undefined);
    }
    function submitPendingAbilityTarget(targetId, target) {
        const pendingChoice = gameState.pendingChoice;
        if (!pendingChoice) {
            return;
        }
        const targets = {
            [targetId]: target
        };
        dispatch({
            type: "SUBMIT_ABILITY_TARGETS",
            playerId: pendingChoice.playerId,
            targets
        }, `${pendingChoice.playerId} chose an ability target.`);
    }
    function cancelPendingChoice() {
        const pendingChoice = gameState.pendingChoice;
        if (!pendingChoice) {
            return;
        }
        dispatch({
            type: "CANCEL_PENDING_CHOICE",
            playerId: pendingChoice.playerId
        }, `${pendingChoice.playerId} cancelled the ability choice.`);
    }
    function getPendingTargetUnits(targetDefinition) {
        const pendingChoice = gameState.pendingChoice;
        if (!pendingChoice) {
            return [];
        }
        const sourcePlayerId = pendingChoice.playerId;
        const enemyPlayerId = opponentOf(sourcePlayerId);
        const playerIds = targetDefinition.kind === "ALLY_UNIT" ? [
            sourcePlayerId
        ] : targetDefinition.kind === "ENEMY_UNIT" ? [
            enemyPlayerId
        ] : targetDefinition.kind === "ANY_UNIT" || targetDefinition.kind === "ANY_TARGET" ? [
            "P1",
            "P2"
        ] : [];
        return playerIds.flatMap((playerId)=>gameState.players[playerId].board.map((unit)=>({
                    playerId,
                    unit
                })));
    }
    function renderPendingChoice() {
        const pendingChoice = gameState.pendingChoice;
        if (!pendingChoice) {
            return null;
        }
        const targetDefinition = pendingChoice.requiredTargets[0];
        const sourceName = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$cardRegistry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCardDefinition"])(pendingChoice.sourceCardId).name;
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "pending-choice-overlay",
            role: "dialog",
            "aria-modal": "true",
            onClick: cancelPendingChoice,
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "pending-choice-panel",
                onClick: (event)=>event.stopPropagation(),
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "pending-choice-header",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                children: sourceName
                            }, void 0, false, {
                                fileName: "[project]/src/components/GameBoard.tsx",
                                lineNumber: 521,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: describeAbilityTargetNeed(targetDefinition)
                            }, void 0, false, {
                                fileName: "[project]/src/components/GameBoard.tsx",
                                lineNumber: 522,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/GameBoard.tsx",
                        lineNumber: 520,
                        columnNumber: 11
                    }, this),
                    targetDefinition ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "pending-choice-grid",
                        children: getPendingTargetUnits(targetDefinition).map(({ playerId, unit })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$CardView$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardView"], {
                                unit: unit,
                                onClick: ()=>submitPendingAbilityTarget(targetDefinition.id, {
                                        type: "UNIT",
                                        playerId,
                                        unitId: unit.instanceId
                                    }),
                                visualEvents: []
                            }, unit.instanceId, false, {
                                fileName: "[project]/src/components/GameBoard.tsx",
                                lineNumber: 528,
                                columnNumber: 17
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/src/components/GameBoard.tsx",
                        lineNumber: 526,
                        columnNumber: 13
                    }, this) : null,
                    targetDefinition && getPendingTargetUnits(targetDefinition).length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "empty-message",
                        children: "No valid targets."
                    }, void 0, false, {
                        fileName: "[project]/src/components/GameBoard.tsx",
                        lineNumber: 545,
                        columnNumber: 13
                    }, this) : null
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/GameBoard.tsx",
                lineNumber: 519,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/components/GameBoard.tsx",
            lineNumber: 513,
            columnNumber: 7
        }, this);
    }
    function renderPlayerStatus(playerId, label) {
        const player = gameState.players[playerId];
        const isAttacker = gameState.attackTokenPlayerId === playerId;
        const hasPriority = gameState.priorityPlayerId === playerId;
        const RoleIcon = isAttacker ? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$swords$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Swords$3e$__["Swords"] : __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__["Shield"];
        const roleLabel = isAttacker ? gameState.attackTokenAvailable ? "Attack" : "Spent" : "Defense";
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: `nexus-orb ${hasPriority ? "is-priority" : ""} ${isAttacker ? "is-attacker" : "is-defender"}`,
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    children: label
                }, void 0, false, {
                    fileName: "[project]/src/components/GameBoard.tsx",
                    lineNumber: 570,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                    children: player.nexusHp
                }, void 0, false, {
                    fileName: "[project]/src/components/GameBoard.tsx",
                    lineNumber: 571,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("small", {
                    children: [
                        player.mana,
                        "/",
                        player.maxMana,
                        " mana · ",
                        player.spellMana,
                        " spell"
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/GameBoard.tsx",
                    lineNumber: 572,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("small", {
                    className: `combat-role ${isAttacker ? "is-attacker" : "is-defender"}`,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(RoleIcon, {
                            size: 11,
                            "aria-hidden": "true"
                        }, void 0, false, {
                            fileName: "[project]/src/components/GameBoard.tsx",
                            lineNumber: 580,
                            columnNumber: 11
                        }, this),
                        roleLabel
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/GameBoard.tsx",
                    lineNumber: 575,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/GameBoard.tsx",
            lineNumber: 565,
            columnNumber: 7
        }, this);
    }
    function renderDeckStack(playerId, label) {
        const player = gameState.players[playerId];
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "deck-stack",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    children: label
                }, void 0, false, {
                    fileName: "[project]/src/components/GameBoard.tsx",
                    lineNumber: 592,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                    children: player.deck.length
                }, void 0, false, {
                    fileName: "[project]/src/components/GameBoard.tsx",
                    lineNumber: 593,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/GameBoard.tsx",
            lineNumber: 591,
            columnNumber: 7
        }, this);
    }
    function renderGraveyard(playerId, label) {
        const entryCount = gameState.players[playerId].graveyard.length;
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: `deck-stack graveyard-stack ${entryCount > 0 ? "has-cards" : ""}`,
            onClick: ()=>setViewingGraveyard(playerId),
            onKeyDown: (event)=>{
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setViewingGraveyard(playerId);
                }
            },
            role: "button",
            tabIndex: 0,
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    children: label
                }, void 0, false, {
                    fileName: "[project]/src/components/GameBoard.tsx",
                    lineNumber: 613,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                    children: entryCount
                }, void 0, false, {
                    fileName: "[project]/src/components/GameBoard.tsx",
                    lineNumber: 614,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/GameBoard.tsx",
            lineNumber: 601,
            columnNumber: 7
        }, this);
    }
    function renderSpellStack(label) {
        if (!selectedSpell) {
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "spell-stack spell-stack--empty",
                "aria-hidden": "true"
            }, void 0, false, {
                fileName: "[project]/src/components/GameBoard.tsx",
                lineNumber: 621,
                columnNumber: 14
            }, this);
        }
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "spell-stack",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    children: label
                }, void 0, false, {
                    fileName: "[project]/src/components/GameBoard.tsx",
                    lineNumber: 626,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                    children: cardDef(selectedSpell).name
                }, void 0, false, {
                    fileName: "[project]/src/components/GameBoard.tsx",
                    lineNumber: 627,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/GameBoard.tsx",
            lineNumber: 625,
            columnNumber: 7
        }, this);
    }
    function getRecallUnits(playerId) {
        const combatUnitIds = new Set([
            ...attackerIds,
            ...assignedBlockerIds
        ]);
        return gameState.players[playerId].board.filter((unit)=>!combatUnitIds.has(unit.instanceId));
    }
    function getActiveUnits(playerId) {
        if (playerId === attackPlayerId) {
            return gameState.combat.attackers.map((lane)=>gameState.players[playerId].board.find((unit)=>unit.instanceId === lane.attackerId));
        }
        return gameState.combat.attackers.map((lane)=>lane.blockerId ? gameState.players[playerId].board.find((unit)=>unit.instanceId === lane.blockerId) : undefined);
    }
    function renderSixSlots(slots, options) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: `battle-row ${options.rowClassName}`,
            children: Array.from({
                length: 6
            }).map((_, index)=>{
                const unit = slots[index];
                if (!unit) {
                    const canUseEmptySlot = Boolean(options.onEmptySlotClick) && (options.isEmptySlotEnabled?.(index) ?? true);
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: "battle-slot battle-slot--empty",
                        type: "button",
                        onClick: ()=>options.onEmptySlotClick?.(index),
                        disabled: !canUseEmptySlot,
                        "aria-label": `Empty slot ${index + 1}`
                    }, `${options.rowClassName}-empty-${index}`, false, {
                        fileName: "[project]/src/components/GameBoard.tsx",
                        lineNumber: 679,
                        columnNumber: 15
                    }, this);
                }
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "battle-slot",
                    children: options.renderUnit ? options.renderUnit(unit, index) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$CardView$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardView"], {
                        unit: unit,
                        selected: unit.instanceId === selectedBlockerId || Boolean(options.selectedUnitIds?.includes(unit.instanceId)),
                        onClick: ()=>selectBoardUnit(options.playerId, unit),
                        visualEvents: gameState.visualEvents.filter((event)=>event.targetId === unit.instanceId || event.sourceId === unit.instanceId)
                    }, void 0, false, {
                        fileName: "[project]/src/components/GameBoard.tsx",
                        lineNumber: 695,
                        columnNumber: 17
                    }, this)
                }, unit.instanceId, false, {
                    fileName: "[project]/src/components/GameBoard.tsx",
                    lineNumber: 691,
                    columnNumber: 13
                }, this);
            })
        }, void 0, false, {
            fileName: "[project]/src/components/GameBoard.tsx",
            lineNumber: 669,
            columnNumber: 7
        }, this);
    }
    function renderWaitingRow(playerId) {
        const units = getRecallUnits(playerId);
        const isEnemy = playerId === "P2";
        const selectedIds = playerId === attackPlayerId ? attackerIds : assignedBlockerIds;
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: `battle-row-wrap waiting-row-wrap ${isEnemy ? "opponent-waiting" : "own-waiting"}`,
            "aria-label": `${playerId} waiting row`,
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "battle-row-label",
                    children: [
                        isEnemy ? "Opponent waiting row" : "Your waiting row",
                        " ",
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                            children: [
                                units.length,
                                "/6"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/GameBoard.tsx",
                            lineNumber: 730,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/GameBoard.tsx",
                    lineNumber: 728,
                    columnNumber: 9
                }, this),
                renderSixSlots(units, {
                    playerId,
                    rowClassName: isEnemy ? "opponent-waiting-row" : "own-waiting-row",
                    selectedUnitIds: selectedIds
                })
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/GameBoard.tsx",
            lineNumber: 722,
            columnNumber: 7
        }, this);
    }
    function renderActiveRow(playerId) {
        const isEnemy = playerId === "P2";
        const slots = getActiveUnits(playerId);
        const canAssignToEmptyLane = playerId === defenderId && gameState.phase === "BLOCK" && gameState.priorityPlayerId === defenderId && Boolean(selectedBlockerId);
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: `battle-row-wrap active-row-wrap ${isEnemy ? "opponent-active" : "own-active"}`,
            "aria-label": `${playerId} active row`,
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "battle-row-label",
                    children: isEnemy ? "Opponent active row" : "Your active row"
                }, void 0, false, {
                    fileName: "[project]/src/components/GameBoard.tsx",
                    lineNumber: 757,
                    columnNumber: 9
                }, this),
                renderSixSlots(slots, {
                    playerId,
                    rowClassName: isEnemy ? "opponent-active-row" : "own-active-row",
                    isEmptySlotEnabled: canAssignToEmptyLane ? (index)=>{
                        const lane = gameState.combat.attackers[index];
                        return Boolean(lane && !lane.blockerId);
                    } : undefined,
                    onEmptySlotClick: canAssignToEmptyLane ? (index)=>{
                        const lane = gameState.combat.attackers[index];
                        if (!lane || lane.blockerId || !selectedBlockerId) {
                            return;
                        }
                        const attacker = gameState.players[attackPlayerId].board.find((candidate)=>candidate.instanceId === lane.attackerId);
                        if (attacker) {
                            assignBlocker(attacker, selectedBlockerId);
                        }
                    } : undefined,
                    renderUnit: (unit, index)=>renderActiveUnit(playerId, unit, index)
                })
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/GameBoard.tsx",
            lineNumber: 751,
            columnNumber: 7
        }, this);
    }
    function renderActiveUnit(playerId, unit, index) {
        const lane = gameState.combat.attackers[index];
        const canToggleAttacker = playerId === attackPlayerId && gameState.phase === "ACTION" && gameState.priorityPlayerId === attackPlayerId && gameState.attackTokenAvailable;
        const canRemoveBlocker = playerId === defenderId && gameState.phase === "BLOCK" && gameState.priorityPlayerId === defenderId;
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "active-unit-card",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$CardView$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardView"], {
                    unit: unit,
                    selected: unit.instanceId === selectedBlockerId || attackerIds.includes(unit.instanceId) || assignedBlockerIds.includes(unit.instanceId),
                    onClick: canToggleAttacker ? ()=>selectBoardUnit(playerId, unit) : canRemoveBlocker ? ()=>{
                        dispatch({
                            type: "REMOVE_BLOCKER",
                            playerId: defenderId,
                            blockerId: unit.instanceId
                        }, `${defenderId} removed ${unitDef(unit).name} from blocking.`);
                    } : undefined,
                    visualEvents: gameState.visualEvents.filter((event)=>event.targetId === unit.instanceId || event.sourceId === unit.instanceId)
                }, void 0, false, {
                    fileName: "[project]/src/components/GameBoard.tsx",
                    lineNumber: 804,
                    columnNumber: 9
                }, this),
                playerId === defenderId && lane ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "damage-preview",
                    children: (()=>{
                        const attacker = gameState.players[attackPlayerId].board.find((candidate)=>candidate.instanceId === lane.attackerId);
                        if (!attacker) {
                            return "No damage";
                        }
                        const preview = getDamagePreview(attacker, unit);
                        const parts = [];
                        if (preview.attackerTakes > 0) parts.push(`Atk ${preview.attackerTakes}`);
                        if (preview.blockerTakes > 0) parts.push(`Blk ${preview.blockerTakes}`);
                        if (preview.nexusTakes > 0) parts.push(`Nexus ${preview.nexusTakes}`);
                        return parts.length > 0 ? parts.join(" · ") : "No damage";
                    })()
                }, void 0, false, {
                    fileName: "[project]/src/components/GameBoard.tsx",
                    lineNumber: 834,
                    columnNumber: 11
                }, this) : null
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/GameBoard.tsx",
            lineNumber: 803,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$HoverContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["HoverProvider"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
            className: "app-shell board-layout",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
                    className: "left-rail",
                    children: [
                        viewingGraveyard ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "graveyard-modal-overlay",
                            onClick: ()=>setViewingGraveyard(undefined),
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "graveyard-modal-content",
                                onClick: (e)=>e.stopPropagation(),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                                children: [
                                                    viewingGraveyard,
                                                    "'s Graveyard"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/GameBoard.tsx",
                                                lineNumber: 863,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>setViewingGraveyard(undefined),
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                                    size: 20
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/GameBoard.tsx",
                                                    lineNumber: 864,
                                                    columnNumber: 74
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/GameBoard.tsx",
                                                lineNumber: 864,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/GameBoard.tsx",
                                        lineNumber: 862,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "graveyard-grid",
                                        children: gameState.players[viewingGraveyard].graveyard.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "empty-message",
                                            children: "Graveyard is empty."
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/GameBoard.tsx",
                                            lineNumber: 868,
                                            columnNumber: 21
                                        }, this) : gameState.players[viewingGraveyard].graveyard.map((entry)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "graveyard-entry",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$CardView$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardView"], {
                                                        card: {
                                                            instanceId: entry.id,
                                                            cardId: entry.cardId,
                                                            ownerId: entry.ownerId
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/GameBoard.tsx",
                                                        lineNumber: 872,
                                                        columnNumber: 25
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "cause-tag",
                                                        children: [
                                                            entry.cause,
                                                            " (R",
                                                            entry.round,
                                                            ")"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/GameBoard.tsx",
                                                        lineNumber: 873,
                                                        columnNumber: 25
                                                    }, this)
                                                ]
                                            }, entry.id, true, {
                                                fileName: "[project]/src/components/GameBoard.tsx",
                                                lineNumber: 871,
                                                columnNumber: 23
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/GameBoard.tsx",
                                        lineNumber: 866,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/GameBoard.tsx",
                                lineNumber: 861,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/GameBoard.tsx",
                            lineNumber: 860,
                            columnNumber: 13
                        }, this) : null,
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ActionLog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ActionLog"], {
                            entries: actionLog
                        }, void 0, false, {
                            fileName: "[project]/src/components/GameBoard.tsx",
                            lineNumber: 881,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                            className: "quick-controls",
                            "aria-label": "Game controls",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "button-row",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: ()=>dispatch({
                                                type: "START_GAME",
                                                firstPlayerId: "P1"
                                            }),
                                        disabled: gameState.started,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$zap$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Zap$3e$__["Zap"], {
                                                size: 16,
                                                "aria-hidden": "true"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/GameBoard.tsx",
                                                lineNumber: 889,
                                                columnNumber: 17
                                            }, this),
                                            " Start"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/GameBoard.tsx",
                                        lineNumber: 884,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: ()=>dispatch({
                                                type: "DRAW_CARD",
                                                playerId: gameState.priorityPlayerId
                                            }),
                                        disabled: !gameState.started || Boolean(gameState.winnerId),
                                        children: "Draw"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/GameBoard.tsx",
                                        lineNumber: 891,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: startRound,
                                        disabled: !gameState.started || Boolean(gameState.winnerId) || gameState.phase !== "ACTION",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$rotate$2d$ccw$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RotateCcw$3e$__["RotateCcw"], {
                                                size: 16,
                                                "aria-hidden": "true"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/GameBoard.tsx",
                                                lineNumber: 909,
                                                columnNumber: 17
                                            }, this),
                                            " Round"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/GameBoard.tsx",
                                        lineNumber: 900,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: passPriority,
                                        disabled: !gameState.started || Boolean(gameState.winnerId) || gameState.phase !== "ACTION",
                                        children: "Pass"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/GameBoard.tsx",
                                        lineNumber: 911,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: resetGame,
                                        children: "Reset"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/GameBoard.tsx",
                                        lineNumber: 922,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/GameBoard.tsx",
                                lineNumber: 883,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/GameBoard.tsx",
                            lineNumber: 882,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/GameBoard.tsx",
                    lineNumber: 858,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                    className: "battle-table lor-table",
                    "aria-label": "Local battle board",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                            className: "topbar compact-topbar",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "stat-row",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "stat-pill",
                                            children: [
                                                "Round ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                    children: gameState.round
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/GameBoard.tsx",
                                                    lineNumber: 932,
                                                    columnNumber: 49
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/GameBoard.tsx",
                                            lineNumber: 932,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "stat-pill",
                                            children: [
                                                "Turn ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                    children: gameState.turn
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/GameBoard.tsx",
                                                    lineNumber: 933,
                                                    columnNumber: 48
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/GameBoard.tsx",
                                            lineNumber: 933,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "stat-pill",
                                            children: [
                                                "Priority ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                    children: gameState.priorityPlayerId
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/GameBoard.tsx",
                                                    lineNumber: 934,
                                                    columnNumber: 52
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/GameBoard.tsx",
                                            lineNumber: 934,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "stat-pill",
                                            children: [
                                                "Phase ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                    children: gameState.phase
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/GameBoard.tsx",
                                                    lineNumber: 935,
                                                    columnNumber: 49
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/GameBoard.tsx",
                                            lineNumber: 935,
                                            columnNumber: 15
                                        }, this),
                                        gameState.pendingDiscard ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "stat-pill",
                                            children: [
                                                "Discard",
                                                " ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                    children: [
                                                        gameState.pendingDiscard.playerId,
                                                        " ",
                                                        gameState.players[gameState.pendingDiscard.playerId].hand.length,
                                                        "/",
                                                        gameState.pendingDiscard.downTo
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/GameBoard.tsx",
                                                    lineNumber: 939,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/GameBoard.tsx",
                                            lineNumber: 937,
                                            columnNumber: 17
                                        }, this) : null,
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "stat-pill",
                                            children: [
                                                "Attack ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                    children: [
                                                        gameState.attackTokenPlayerId,
                                                        gameState.attackTokenAvailable ? "" : " spent"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/GameBoard.tsx",
                                                    lineNumber: 947,
                                                    columnNumber: 24
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/GameBoard.tsx",
                                            lineNumber: 946,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/GameBoard.tsx",
                                    lineNumber: 931,
                                    columnNumber: 13
                                }, this),
                                gameState.winnerId ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "winner-banner",
                                    children: [
                                        gameState.winnerId,
                                        " wins."
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/GameBoard.tsx",
                                    lineNumber: 951,
                                    columnNumber: 15
                                }, this) : null
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/GameBoard.tsx",
                            lineNumber: 930,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$HandView$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["HandView"], {
                            cards: gameState.players.P2.hand,
                            selectedCardId: selectedSpell?.ownerId === "P2" ? selectedSpell.instanceId : undefined,
                            canPlay: (card)=>canPlay("P2", card),
                            onPlayCard: (card)=>playCard("P2", card)
                        }, void 0, false, {
                            fileName: "[project]/src/components/GameBoard.tsx",
                            lineNumber: 955,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "arena-grid",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "side-counters",
                                    children: [
                                        renderGraveyard("P2", "GY"),
                                        renderDeckStack("P2", "Deck"),
                                        renderDeckStack("P1", "Deck"),
                                        renderGraveyard("P1", "GY")
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/GameBoard.tsx",
                                    lineNumber: 965,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "center-board",
                                    children: [
                                        renderWaitingRow("P2"),
                                        renderActiveRow("P2"),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "combat-status-bar",
                                            children: [
                                                gameState.phase === "BLOCK" && attackerCount > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "stat-pill",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$swords$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Swords$3e$__["Swords"], {
                                                            size: 12,
                                                            "aria-hidden": "true"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/GameBoard.tsx",
                                                            lineNumber: 979,
                                                            columnNumber: 21
                                                        }, this),
                                                        " ",
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                            children: attackerCount
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/GameBoard.tsx",
                                                            lineNumber: 979,
                                                            columnNumber: 61
                                                        }, this),
                                                        " attacking"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/GameBoard.tsx",
                                                    lineNumber: 978,
                                                    columnNumber: 19
                                                }, this) : null,
                                                selectedBlocker ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "stat-pill",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__["Shield"], {
                                                            size: 12,
                                                            "aria-hidden": "true"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/GameBoard.tsx",
                                                            lineNumber: 984,
                                                            columnNumber: 21
                                                        }, this),
                                                        " ",
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                            children: unitDef(selectedBlocker).name
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/GameBoard.tsx",
                                                            lineNumber: 984,
                                                            columnNumber: 61
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/GameBoard.tsx",
                                                    lineNumber: 983,
                                                    columnNumber: 19
                                                }, this) : null
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/GameBoard.tsx",
                                            lineNumber: 976,
                                            columnNumber: 15
                                        }, this),
                                        renderActiveRow("P1"),
                                        renderWaitingRow("P1")
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/GameBoard.tsx",
                                    lineNumber: 972,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "status-column",
                                    children: [
                                        renderPlayerStatus("P2", "Nexus"),
                                        renderSpellStack("Spell"),
                                        (()=>{
                                            const action = getSmartAction();
                                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                type: "button",
                                                className: `action-orb action-orb--${action.mode} ${action.enabled ? "action-orb--active" : ""}`,
                                                onClick: action.onClick,
                                                disabled: !action.enabled,
                                                "aria-label": action.label,
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "action-orb__label",
                                                        children: action.label
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/GameBoard.tsx",
                                                        lineNumber: 1008,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "action-orb__sub",
                                                        children: action.sublabel
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/GameBoard.tsx",
                                                        lineNumber: 1009,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/GameBoard.tsx",
                                                lineNumber: 999,
                                                columnNumber: 19
                                            }, this);
                                        })(),
                                        renderSpellStack("Spell"),
                                        renderPlayerStatus("P1", "Nexus")
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/GameBoard.tsx",
                                    lineNumber: 993,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/GameBoard.tsx",
                            lineNumber: 964,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$HandView$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["HandView"], {
                            cards: gameState.players.P1.hand,
                            selectedCardId: selectedSpell?.ownerId === "P1" ? selectedSpell.instanceId : undefined,
                            canPlay: (card)=>canPlay("P1", card),
                            onPlayCard: (card)=>playCard("P1", card)
                        }, void 0, false, {
                            fileName: "[project]/src/components/GameBoard.tsx",
                            lineNumber: 1018,
                            columnNumber: 11
                        }, this),
                        selectedSpell ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                            className: "spell-panel floating-spell-panel",
                            "aria-label": "Selected spell",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "spell-summary",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                            children: cardDef(selectedSpell).name
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/GameBoard.tsx",
                                            lineNumber: 1030,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: [
                                                "Target:",
                                                " ",
                                                cardDef(selectedSpell).type === "unit" || cardDef(selectedSpell).type === "champion" ? "click one of your 6 units to replace it" : selectedSpellTarget ? describeSpellTarget(selectedSpellTarget) : describeNeededTarget(getPrimarySpellTarget(selectedSpell))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/GameBoard.tsx",
                                            lineNumber: 1031,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/GameBoard.tsx",
                                    lineNumber: 1029,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "button-row",
                                    children: cardDef(selectedSpell).type === "spell" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: castSelectedSpell,
                                        disabled: !selectedSpellTarget,
                                        children: "Cast Spell"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/GameBoard.tsx",
                                        lineNumber: 1043,
                                        columnNumber: 19
                                    }, this) : null
                                }, void 0, false, {
                                    fileName: "[project]/src/components/GameBoard.tsx",
                                    lineNumber: 1041,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/GameBoard.tsx",
                            lineNumber: 1028,
                            columnNumber: 13
                        }, this) : null
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/GameBoard.tsx",
                    lineNumber: 929,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
                    className: "right-panel inspector-panel",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$CardInspector$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardInspector"], {}, void 0, false, {
                        fileName: "[project]/src/components/GameBoard.tsx",
                        lineNumber: 1057,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/GameBoard.tsx",
                    lineNumber: 1056,
                    columnNumber: 9
                }, this),
                renderPendingChoice()
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/GameBoard.tsx",
            lineNumber: 857,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/GameBoard.tsx",
        lineNumber: 856,
        columnNumber: 5
    }, this);
}
_s(GameBoard, "pXqdhVqpxJm+MJ7+cOreGBroR44=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useLocalGame$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLocalGame"]
    ];
});
_c = GameBoard;
function opponentOf(playerId) {
    return playerId === "P1" ? "P2" : "P1";
}
function describeNeededTarget(targetKind) {
    switch(targetKind){
        case "ALLY_UNIT":
            return "click an allied unit";
        case "ENEMY_UNIT":
            return "click an enemy unit";
        case "NEXUS":
            return "nexus";
        case "SELF":
            return "self";
        case "ALLY_GRAVEYARD":
            return "click a card in your graveyard";
        case "ENEMY_GRAVEYARD":
            return "click a card in enemy graveyard";
        default:
            return "none";
    }
}
function describeAbilityTargetNeed(targetDefinition) {
    if (!targetDefinition) {
        return "Resolve ability choice";
    }
    switch(targetDefinition.kind){
        case "ALLY_UNIT":
            return "Choose an allied unit";
        case "ENEMY_UNIT":
            return "Choose an enemy unit";
        case "ANY_UNIT":
        case "ANY_TARGET":
            return "Choose a unit";
        case "ALLY_NEXUS":
            return "Choose your nexus";
        case "ENEMY_NEXUS":
            return "Choose the enemy nexus";
        case "SELF":
            return "Choose self";
        case "ALLY_HAND_CARD":
            return "Choose a card in your hand";
        case "ENEMY_HAND_CARD":
            return "Choose a card in enemy hand";
        case "ANY_HAND_CARD":
            return "Choose a hand card";
    }
}
function describeSpellTarget(target) {
    switch(target.type){
        case "UNIT":
            return `${target.playerId} unit`;
        case "NEXUS":
            return `${target.playerId} nexus`;
        case "SELF":
            return `${target.playerId}`;
        case "GRAVEYARD":
            return `${target.playerId} graveyard`;
        case "HAND_CARD":
            return `${target.playerId} hand card`;
    }
}
var _c;
__turbopack_context__.k.register(_c, "GameBoard");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_0xn0s3l._.js.map