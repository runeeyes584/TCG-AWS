import { createCardInstance } from "./cards";
import { sampleSpellCards, sampleUnitCards } from "./sampleCards";
import { CardDefinition, PlayerId } from "./types";

export function buildDefaultDeck(playerId: PlayerId) {
  return buildSampleLocalDeck().map((definition, index) =>
    createCardInstance(definition, playerId, `${playerId}-${definition.id}-${index}`)
  );
}

function buildSampleLocalDeck(): CardDefinition[] {
  const deck: CardDefinition[] = [];
  let unitIndex = 0;
  let spellIndex = 0;

  for (let index = 0; index < 24; index += 1) {
    const shouldAddSpell = (index + 1) % 3 === 0;
    if (shouldAddSpell) {
      deck.push(sampleSpellCards[spellIndex % sampleSpellCards.length]);
      spellIndex += 1;
    } else {
      deck.push(sampleUnitCards[unitIndex % sampleUnitCards.length]);
      unitIndex += 1;
    }
  }

  return deck;
}
