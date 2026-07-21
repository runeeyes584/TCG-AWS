"use client";

import { useMemo, useState } from "react";
import { Search, Sparkles, Swords, Crown } from "lucide-react";

import type {
    CardDefinition,
    CardType
} from "@backend/game/types";

import {
    listCards
} from "@backend/game/entities/cardRegistry";

import {
    GameCard
} from "../../components/game/cards/game-card";


interface CardPoolProps {
    onAddCard: (card: CardDefinition) => void;
    isSelected: (cardId: string) => boolean;
    isCardLimitReached: (cardId: string) => boolean;
}


type FilterType = "all" | CardType;


export function CardPool({
    onAddCard,
    isSelected,
    isCardLimitReached
}: CardPoolProps) {


    const cards = useMemo(
        () =>
            (listCards() as CardDefinition[])
                .filter(card => card.collectible !== false),
        []
    );


    const [search, setSearch] = useState("");

    const [type, setType] =
        useState<FilterType>("all");


    const filteredCards = useMemo(() => {

        const keyword =
            search.trim().toLowerCase();


        return cards.filter(card => {

            const matchType =
                type === "all" ||
                card.type === type;


            const matchSearch =
                !keyword ||
                card.name
                    .toLowerCase()
                    .includes(keyword)
                ||
                card.id
                    .toLowerCase()
                    .includes(keyword);


            return matchType && matchSearch;

        });


    }, [
        cards,
        search,
        type
    ]);



    return (

        <section className="card-pool">

            <header className="card-pool-header">

                <h2>
                    Available Cards
                </h2>


                <div className="card-filter">

                    <label className="card-search">

                        <Search size={16} />

                        <input
                            value={search}
                            onChange={
                                e => setSearch(e.target.value)
                            }
                            placeholder="Search card..."
                        />

                    </label>


                    <FilterButton
                        active={type === "all"}
                        onClick={() => setType("all")}
                    >
                        All
                    </FilterButton>


                    <FilterButton
                        active={type === "unit"}
                        onClick={() => setType("unit")}
                    >
                        <Swords size={16} />
                        Unit
                    </FilterButton>


                    <FilterButton
                        active={type === "spell"}
                        onClick={() => setType("spell")}
                    >
                        <Sparkles size={16} />
                        Spell
                    </FilterButton>


                    <FilterButton
                        active={type === "champion"}
                        onClick={() => setType("champion")}
                    >
                        <Crown size={16} />
                        Champion
                    </FilterButton>

                </div>

            </header>



            <div className="card-pool-grid">

                {
                    filteredCards.map(card => {

                        const selected =
                            isSelected(card.id);

                        const limitReached =
                            isCardLimitReached(card.id);


                        return (

                            <article
                                key={card.id}
                                className={
                                    `
                                    pool-card
                                    ${selected ? "selected" : ""}
                                    ${limitReached ? "limit" : ""}
                                    `
                                }

                                onClick={() => {
                                    if (!limitReached) {
                                        onAddCard(card);
                                    }
                                }}

                            >

                                <GameCard
                                    card={{
                                        instanceId:
                                            `pool-${card.id}`,

                                        cardId:
                                            card.id,

                                        ownerId: "P1"
                                    }}

                                    staticRender
                                />


                                {
                                    selected && (

                                        <span className="card-copy-count">
                                            x3
                                        </span>

                                    )
                                }


                            </article>

                        );

                    })
                }

            </div>


        </section>

    );
}



function FilterButton({
    active,
    onClick,
    children
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {

    return (

        <button
            className={
                active ? "active" : ""
            }
            onClick={onClick}
        >
            {children}
        </button>

    );

}