"use client";

import type { CardDefinition } from "@backend/game/types";
import { GameCard } from "../../components/game/cards/game-card";


interface SelectedCardProps {

    card: CardDefinition;

    index: number;

    onRemove: (
        index: number
    ) => void;

}



export function SelectedCard({
    card,
    index,
    onRemove
}: SelectedCardProps) {


    return (

        <article

            className="selected-card"

            onClick={() => onRemove(index)}

            title="Click to remove"

        >

            <div className="selected-card-inner">


                <GameCard

                    card={{

                        instanceId:
                            `selected-${card.id}-${index}`,

                        cardId:
                            card.id,

                        ownerId:
                            "P1"

                    }}

                    staticRender

                />


            </div>



            <div className="selected-card-overlay">

                <span>
                    Remove
                </span>

            </div>


        </article>

    );

}