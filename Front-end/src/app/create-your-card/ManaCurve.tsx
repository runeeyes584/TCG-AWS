"use client";

import type { GalleryCard } from "./types";

interface Props {
    cards: GalleryCard[];
}

export default function ManaCurve({ cards }: Props) {
    const curve = [0, 1, 2, 3, 4, 5, 6];

    const counts = curve.map(cost =>
        cards.filter(card => {
            if (cost === 6) return card.cost >= 6;
            return card.cost === cost;
        }).length
    );

    const max = Math.max(...counts, 1);

    return (
        <section className="mana-curve">
            <h3>Mana Curve</h3>

            <div className="mana-chart">
                {counts.map((count, index) => (
                    <div
                        key={index}
                        className="mana-column"
                    >
                        <div
                            className="mana-bar"
                            style={{
                                height: `${(count / max) * 100}%`
                            }}
                        />

                        <span>
                            {index === 6 ? "6+" : index}
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
}