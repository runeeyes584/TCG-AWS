import { createCardInstance } from "./cards";
import { sampleDeckCards } from "./sampleCards";
import { CardDefinition, PlayerId } from "./types";

export function buildDefaultDeck(playerId: PlayerId) {
  return buildSampleLocalDeck().map((definition, index) =>
    createCardInstance(definition, playerId, `${playerId}-${definition.id}-${index}`)
  );
}

function buildSampleLocalDeck(): CardDefinition[] {
  const deck: CardDefinition[] = [];

  // let unitIndex = 0;
  // let spellIndex = 0;

  // for (let index = 0; index < 24; index += 1) {
  //   const shouldAddSpell = (index + 1) % 3 === 0;
  //   if (shouldAddSpell) {
  //     deck.push(sampleSpellCards[spellIndex % sampleSpellCards.length]);
  //     spellIndex += 1;
  //   } else {
  //     deck.push(sampleUnitCards[unitIndex % sampleUnitCards.length]);
  //     unitIndex += 1;
  //   }
  // }

  // return deck;



   //đảm bảo các card trong data xuất hiện ít nhất 1 lần trong deck
  const allCards = sampleDeckCards.filter((card) => card.level !== 2);

  // 1. Ensure at least 1 of every card is added (so they appear 100%)
  for (const card of allCards) {
    deck.push(card);
  }

  // 2. Fill the remaining slots up to 24 randomly
  const targetDeckSize = 24;
  while (deck.length < targetDeckSize) {
    const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
    deck.push(randomCard);
  }

  // 3. Shuffle the deck to ensure random drawing order
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  // If there are more than 24 unique cards, slicing it ensures we don't exceed 24
  return deck.slice(0, targetDeckSize);
}
