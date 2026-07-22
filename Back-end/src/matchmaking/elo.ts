export function calculateElo(

    playerA: number,

    playerB: number,

    winner: "A" | "B" | "DRAW",

    k = 32

) {

    const expectedA =
        1 /
        (1 + Math.pow(10, (playerB - playerA) / 400));

    const expectedB =
        1 /
        (1 + Math.pow(10, (playerA - playerB) / 400));

    const scoreA = winner === "DRAW" ? 0.5 : winner === "A" ? 1 : 0;

    const scoreB = winner === "DRAW" ? 0.5 : winner === "B" ? 1 : 0;

    return {

        playerA:
            Math.round(
                playerA +
                    k *
                        (scoreA - expectedA)
            ),

        playerB:
            Math.round(
                playerB +
                    k *
                        (scoreB - expectedB)
            )

    };

}
