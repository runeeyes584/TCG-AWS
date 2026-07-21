"use client";

import { memo, useMemo } from "react";
import type { GalleryCard } from "./types";
import { GameCard } from "../../components/game/cards/game-card";
import type { CardInstance } from "../../../../Back-end/src/game/types";


interface Props {

    cards: GalleryCard[];

    selectedCards: GalleryCard[];

    onSelect: (card: GalleryCard) => void;

    onPreview: (cardId: string) => void;

}



export default function CardGrid({

    cards,

    selectedCards,

    onSelect,

    onPreview

}: Props) {


    return (

        <section className="deck-card-grid">

            {
                cards.map(card => (

                    <CardTile

                        key={card.id}

                        card={card}

                        selectedCount={
                            selectedCards.filter(
                                c => c.id === card.id
                            ).length
                        }

                        onSelect={onSelect}

                        onPreview={onPreview}

                    />

                ))
            }


        </section>

    );

}



const CardTile = memo(function CardTile({

    card,

    selectedCount,

    onSelect,

    onPreview

}: {

    card: GalleryCard;

    selectedCount: number;

    onSelect: (card: GalleryCard) => void;

    onPreview: (id: string) => void;

}) {


    const instance = useMemo<CardInstance>(() => ({

        instanceId:
            `builder-${card.id}`,

        cardId:
            card.id,

        ownerId:
            "P1"

    }), [card.id]);



    const disabled =
        selectedCount >= 3;



    return (

        <article

            className={`
                deck-card-tile

                ${disabled
                    ? "is-disabled"
                    : ""
                }

                ${selectedCount > 0
                    ? "is-selected"
                    : ""
                }
            `}

            onMouseEnter={() =>
                onPreview(card.id)
            }

            onClick={() => {

                if (!disabled)
                    onSelect(card);

            }}

        >


            {
                selectedCount > 0 && (

                    <span className="card-count">

                        x{selectedCount}

                    </span>

                )
            }



            <GameCard

                card={instance}

                showDescription={false}

                staticRender

            />



            <div className="card-name">

                <strong>

                    {card.name}

                </strong>


                <small>

                    {card.cost} mana

                </small>


            </div>


        </article>

    );

});