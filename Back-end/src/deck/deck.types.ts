export interface CreateDeckRequest {
    deckName: string;
    cardIds: string[];
}


export interface UserDeck {

    deckId: string;

    deckName: string;

    cardIds: string[];

    updatedAt: number;

}