"use client";

import type { CardDefinition } from "@backend/game/types";
import { DeckCounter } from "./DeckCounter";
import { SelectedCard } from "./SelectedCard";
import { Plus } from "lucide-react";


interface DeckBuilderPanelProps {

    selectedCards: CardDefinition[];

    deckStats: {

        total: number;

        unit: number;

        spell: number;

        champion: number;

    };


    removeCard: (
        index: number
    ) => void;


    onCreate: () => void;


    disabled?: boolean;

}



export function DeckBuilderPanel({

    selectedCards,

    deckStats,

    removeCard,

    onCreate,

    disabled = false

}: DeckBuilderPanelProps) {


    return (

        <aside className="deck-builder-panel">


            <DeckCounter

                total={deckStats.total}

                unit={deckStats.unit}

                spell={deckStats.spell}

                champion={deckStats.champion}

            />



            <div className="selected-card-area">


                {
                    selectedCards.length === 0 ? (

                        <div className="empty-deck">

                            <Plus size={32} />

                            <p>
                                Select cards to build your deck
                            </p>

                        </div>

                    ) : (


                        selectedCards.map(
                            (card, index) => (

                                <SelectedCard

                                    key={
                                        `${card.id}-${index}`
                                    }

                                    card={card}

                                    index={index}

                                    onRemove={
                                        removeCard
                                    }

                                />

                            )
                        )

                    )
                }


            </div>



            <button

                className={

                    disabled

                        ? "create-deck-button disabled"

                        : "create-deck-button"

                }


                disabled={disabled}


                onClick={onCreate}

            >

                CREATE YOUR CARD

            </button>


        </aside>

    );

}