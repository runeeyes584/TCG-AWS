import { UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDb } from "../config/dynamodb";

import {
    CreateDeckRequest,
    UserDeck
} from "./deck.types";

import {
    validateDeck
} from "./deck.validator";


const USER_TABLE = process.env.USER_TABLE || "UserProfile";


export async function createDeck(
    userId: string,
    data: CreateDeckRequest
) {

    const user = await dynamoDb.send(
        new GetCommand({
            TableName: USER_TABLE,
            Key:{
                user_id:userId
            }
        })
    );


    const currentDecks =
        user.Item?.decks ?? {};


    const deckId =
        `deck-${Date.now()}`;


    currentDecks[deckId] = {

        deckId,

        deckName:
            data.deckName,

        cardIds:
            data.cardIds,

        updatedAt:
            Date.now()

    };


    await dynamoDb.send(
        new UpdateCommand({

            TableName: USER_TABLE,

            Key:{
                user_id:userId
            },


            UpdateExpression:
            "SET decks = :decks, updated_at = :updatedAt",


            ExpressionAttributeValues:{

                ":decks":
                    currentDecks,

                ":updatedAt":
                    Date.now()

            }

        })
    );


    return currentDecks[deckId];
}