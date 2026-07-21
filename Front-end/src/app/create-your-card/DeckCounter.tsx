"use client";

import { Layers, Sparkles, Swords, Crown } from "lucide-react";


interface DeckCounterProps {

    total: number;

    unit: number;

    spell: number;

    champion: number;

}


export function DeckCounter({
    total,
    unit,
    spell,
    champion
}: DeckCounterProps) {


    const isComplete =
        total === 30;


    return (

        <section className="deck-counter">


            <div className="deck-counter-header">

                <Layers size={20} />

                <div>

                    <strong>
                        YOUR DECK
                    </strong>

                    <span>
                        {total}/30 Cards
                    </span>

                </div>

            </div>



            <div className="deck-counter-progress">

                <div
                    className="deck-counter-progress-fill"
                    style={{
                        width:
                            `${(total / 30) * 100}%`
                    }}
                />

            </div>



            <div className="deck-counter-types">


                <div>

                    <Swords size={18} />

                    <span>
                        Unit
                    </span>

                    <b>
                        {unit}
                    </b>

                </div>



                <div>

                    <Sparkles size={18} />

                    <span>
                        Spell
                    </span>

                    <b>
                        {spell}
                    </b>

                </div>



                <div>

                    <Crown size={18} />

                    <span>
                        Champion
                    </span>

                    <b>
                        {champion}
                    </b>

                </div>


            </div>



            {
                isComplete ? (

                    <div className="deck-ready">

                        Deck Complete

                    </div>

                ) : (

                    <div className="deck-warning">

                        Need {30 - total} more cards

                    </div>

                )
            }


        </section>

    );

}