"use client";

import {
    Trash2,
    Sparkles,
    Swords,
    Crown,
    Wand2
} from "lucide-react";

import type { GalleryCard } from "./types";
import ProgressBar from "./ProgressBar";


interface Props {

    deckName: string;

    setDeckName: (value: string) => void;

    selectedCards: GalleryCard[];

    progress: number;

    stats: {
        champion: number;
        unit: number;
        spell: number;
    };

    completed: boolean;

    onRemove: (index: number) => void;

    onClear: () => void;

    onCreate: () => void;

}



export default function DeckSidebar({

    deckName,

    setDeckName,

    selectedCards,

    progress,

    stats,

    completed,

    onRemove,

    onClear,

    onCreate

}: Props) {



    /**
     * Gom card giống nhau
     *
     * Ví dụ:
     *
     * Cat Warrior
     * Cat Warrior
     * Cat Warrior
     *
     * =>
     *
     * Cat Warrior x3
     */

    const groupedCards = Object.values(

        selectedCards.reduce<Record<string, {
            card: GalleryCard;
            quantity: number;
            index: number;
        }>>((acc, card, index) => {


            if (!acc[card.id]) {

                acc[card.id] = {
                    card,
                    quantity: 0,
                    index
                };

            }


            acc[card.id].quantity++;


            return acc;


        }, {})

    );




    return (

        <aside className="deck-sidebar">


            <section className="deck-name-box">


                <label>

                    Deck Name

                </label>


                <input

                    value={deckName}

                    onChange={
                        e =>
                            setDeckName(
                                e.target.value
                            )
                    }

                    placeholder="Enter deck name"

                />


            </section>




            <ProgressBar

                progress={progress}

                total={
                    selectedCards.length
                }

            />





            <section className="deck-stats">


                <div>

                    <Crown size={18} />

                    <span>

                        Champion

                    </span>

                    <b>

                        {stats.champion}

                    </b>


                </div>



                <div>

                    <Swords size={18} />

                    <span>

                        Unit

                    </span>

                    <b>

                        {stats.unit}

                    </b>


                </div>




                <div>

                    <Wand2 size={18} />

                    <span>

                        Spell

                    </span>

                    <b>

                        {stats.spell}

                    </b>


                </div>


            </section>






            <section className="selected-card-list">


                <header>


                    <h3>

                        Your Cards

                    </h3>


                    <button

                        onClick={onClear}

                        title="Clear deck"

                    >

                        <Trash2 size={16} />

                    </button>


                </header>





                <div className="selected-scroll">


                    {
                        groupedCards.map(
                            ({
                                card,
                                quantity,
                                index
                            }) => (


                                <article

                                    key={card.id}

                                    className="selected-card-row"

                                >


                                    <div>


                                        <strong>

                                            {card.name}

                                        </strong>


                                        <small>

                                            Cost {card.cost}

                                        </small>


                                    </div>



                                    <span>

                                        x{quantity}

                                    </span>




                                    <button

                                        onClick={() =>
                                            onRemove(index)
                                        }

                                    >

                                        Remove

                                    </button>



                                </article>


                            ))

                    }



                    {
                        selectedCards.length === 0 && (

                            <div className="empty-deck">

                                Select cards from collection

                            </div>

                        )
                    }


                </div>



            </section>







            <button

                className={`
                    create-deck-button

                    ${completed
                        ? "ready"
                        : ""
                    }
                `}


                disabled={!completed}


                onClick={onCreate}

            >


                {
                    completed ? (

                        <>
                            <Sparkles size={18} />

                            Create Your Card

                        </>


                    ) : (

                        <>
                            {
                                selectedCards.length
                            }
                            /
                            30 Cards

                        </>

                    )
                }



            </button>



        </aside>

    );

}