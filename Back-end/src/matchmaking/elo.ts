export function calculateElo(

    playerA: number,

    playerB: number,

    winner: "A" | "B",

    k = 32

) {

    const expectedA =
        1 /
        (1 + Math.pow(10, (playerB - playerA) / 400));

    const expectedB =
        1 /
        (1 + Math.pow(10, (playerA - playerB) / 400));

    const scoreA = winner === "A" ? 1 : 0;

    const scoreB = winner === "B" ? 1 : 0;

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