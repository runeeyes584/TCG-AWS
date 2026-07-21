"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { listCards } from "@backend/game/entities/cardRegistry";
import type { CardType } from "@backend/game/types";

import { GalleryPhaserBackdrop } from "../../components/gallery/GalleryPhaserBackdrop";
import { HoverProvider } from "../../contexts/HoverContext";

import CardGrid from "./CardGrid";
import DeckSidebar from "./DeckSidebar";
import CardPreview from "./CardPreview";
import ManaCurve from "./ManaCurve";

import { useDeckBuilder } from "./useDeckBuilder";
import type { GalleryCard } from "./types";
import { createDeck } from "../../libs/api";

export default function CreateYourCardPage() {
    const router = useRouter();

    const cards = useMemo(
        () =>
            (listCards() as GalleryCard[])
                .filter(card => card.collectible !== false)
                .sort((a, b) =>
                    a.cost - b.cost ||
                    a.name.localeCompare(b.name)
                ),
        []
    );

    const {
        deckName,
        setDeckName,
        selectedCards,
        addCard,
        removeCard,
        clearDeck,
        stats,
        progress,
        completed
    } = useDeckBuilder();

    const [query, setQuery] = useState("");
    const [type, setType] = useState<CardType>("unit");
    const [previewId, setPreviewId] = useState<string>();

    const filteredCards = useMemo(() => {
        const keyword = query.toLowerCase();

        return cards.filter(card => {
            return (
                card.type === type &&
                (
                    !keyword ||
                    card.name
                        .toLowerCase()
                        .includes(keyword) ||
                    card.description
                        ?.toLowerCase()
                        .includes(keyword)
                )
            );
        });
    }, [cards, query, type]);

    const previewCard = useMemo(
        () =>
            cards.find(
                card => card.id === previewId
            ),
        [cards, previewId]
    );

    async function createDeckHandler() {

        try {

            await createDeck({

                deckName,

                cardIds: selectedCards.map(
                    card => card.id
                )

            });


            alert("Deck created!");

            router.push("/");


        } catch (error) {

            alert(
                error instanceof Error
                    ? error.message
                    : "Create deck failed"
            );

        }

    }

    return (
        <HoverProvider>
            <main className="deck-builder-shell">

                <GalleryPhaserBackdrop />

                <div className="gallery-grid-bg" />
                <div className="gallery-vignette" />

                <header className="deck-builder-header">

                    <button
                        className="gallery-back"
                        onClick={() =>
                            router.push("/play")
                        }
                    >
                        <ArrowLeft size={18} />
                        Collection
                    </button>

                    <div className="deck-builder-title">
                        <strong>
                            CREATE YOUR CARD
                        </strong>

                        <small>
                            Chrono Genesis Deck Forge
                        </small>
                    </div>

                </header>


                <section className="deck-builder-layout">

                    <div className="deck-builder-left">

                        <div className="deck-toolbar">

                            <div className="deck-search">

                                <Search size={18} />

                                <input
                                    value={query}
                                    onChange={e =>
                                        setQuery(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Search cards..."
                                />

                            </div>


                            <div className="deck-type-tabs">

                                {[
                                    "unit",
                                    "spell",
                                    "champion"
                                ].map(item => (

                                    <button
                                        key={item}
                                        className={
                                            type === item
                                                ? "active"
                                                : ""
                                        }
                                        onClick={() =>
                                            setType(
                                                item as CardType
                                            )
                                        }
                                    >
                                        {item}
                                    </button>

                                ))}

                            </div>

                        </div>


                        <CardGrid

                            cards={filteredCards}

                            selectedCards={
                                selectedCards
                            }

                            onSelect={
                                addCard
                            }

                            onPreview={
                                setPreviewId
                            }

                        />

                    </div>



                    <div className="deck-builder-right">

                        <CardPreview
                            card={previewCard}
                        />

                        <DeckSidebar

                            deckName={deckName}

                            setDeckName={
                                setDeckName
                            }

                            selectedCards={
                                selectedCards
                            }

                            progress={
                                progress
                            }

                            stats={
                                stats
                            }

                            completed={
                                completed
                            }

                            onRemove={
                                removeCard
                            }

                            onClear={
                                clearDeck
                            }

                            onCreate={
                                createDeckHandler
                            }

                        />

                        <ManaCurve
                            cards={
                                selectedCards
                            }
                        />

                    </div>

                </section>

            </main>
        </HoverProvider>
    );
}