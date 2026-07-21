import {
    CreateDeckRequest
} from "./deck.types";

import {
    listCards
} from "../game/entities/cardRegistry";


const MAX_DECK_SIZE = 30;
const MAX_COPY = 3;


export function validateDeck(
    data:CreateDeckRequest
){

    if(!data.deckName){

        throw new Error(
            "Deck name is required"
        );

    }


    if(
        data.cardIds.length !== MAX_DECK_SIZE
    ){

        throw new Error(
            "Deck must contain exactly 30 cards"
        );

    }


    const cards = listCards();


    const counter:Record<string,number>
        = {};



    for(const id of data.cardIds){

        counter[id] =
            (counter[id] || 0) + 1;


        if(
            counter[id] > MAX_COPY
        ){

            throw new Error(
                `Card ${id} exceeds max copies`
            );

        }


        const exists =
            cards.find(
                c=>c.id===id
            );


        if(!exists){

            throw new Error(
                `Card ${id} does not exist`
            );

        }

    }


    const champions =
        data.cardIds.filter(id=>{

            const card =
                cards.find(
                    c=>c.id===id
                );

            return card?.type==="champion";

        });


    if(
        champions.length > 3
    ){

        throw new Error(
            "Only three champions allowed"
        );

    }


    return true;

}