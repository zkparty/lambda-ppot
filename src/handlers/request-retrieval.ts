import {
    APIGatewayProxyEvent,
    APIGatewayProxyResult
} from "aws-lambda";
import { SES } from "aws-sdk";
import { validate } from 'deep-email-validator';
import { OutputFormat as ValidationOutputFormat } from "deep-email-validator/dist/output/output";
import { GetCommand, PutCommand, PutCommandOutput, UpdateCommand, UpdateCommandOutput } from "@aws-sdk/lib-dynamodb";

import { BodyResponse, Item } from "../types";
import { ddbDocClient } from "../dynamo";
import { EMAILS_TABLE, REGION, TRIES_LIMIT, TIME_TO_EXPIRE_SPAM } from "../constants";

/**
 * Check if email can request retrieval
 */
export const requestRetrievalHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    if (event.httpMethod !== 'POST') {
        throw new Error(`requestRetrieval only accepts POST method, you tried: ${event.httpMethod} method.`);
    }
    try {
        // get request data
        const { email } = JSON.parse(event.body);
        // validate email
        const [validation, invalid] = await validateEmail(email);
        if (invalid){
            return createResponse(validation, false);
        }
        const item = await getItemFromDB(email);
        // check email is not in blacklist
        if (item){
            // check it has not tried too many times
            if (item.tries > TRIES_LIMIT){
                // check if expiration has been set
                if (item.expiration){
                    return createResponse(item, false);
                }
                const expire = await setExpirationInItem(email);
                return createResponse({...item, ...expire}, false);
            }
            const tries = await setTryInItem(email);
            return createResponse({...item, ...tries}, false);
        }

        const add = await addToDB(email);
        const send = sendEmail(email);
        return createResponse({...add, ...send}, true);

    } catch (error) {
        // catch any error and return information about it
        console.log("Error: ", error);
        return createResponse(error, false);
    }
}

function createResponse(data: any, registered: boolean): APIGatewayProxyResult {
    return {
        statusCode: 200,
        body: JSON.stringify({
            registered: registered,
            ...data,
        } as BodyResponse)
    }
}

async function validateEmail(email: string): Promise<[ValidationOutputFormat, boolean]> {
    const validation = await validate({
        email: email,
        validateSMTP: false, // avoid STMP because ISP block them to prevent brute force
    });
    if (!validation.valid){
        return [validation, true];
    }
    return [validation, false];
}

async function getItemFromDB(email: string): Promise<Item> {
    const paramsToRead = {
        TableName: EMAILS_TABLE,
        Key: {
            email: email,
        }
    }
    const get = await ddbDocClient.send(new GetCommand(paramsToRead));
    const item = get.Item as Item;
    return item;
}

async function setExpirationInItem(email: string): Promise<UpdateCommandOutput> {
    const paramsToBlock = {
        TableName: EMAILS_TABLE,
        Key: email,
        UpdateExpression: 'ADD expiration 1',
        ReturnValues: 'ALL_NEW',
    };
    // TODO: update is not working
    const block = await ddbDocClient.send(new UpdateCommand(paramsToBlock));
    return block;

}

async function setTryInItem(email: string): Promise<UpdateCommandOutput> {
    const paramsToUpdate = {
        TableName: EMAILS_TABLE,
        Key: email,
        UpdateExpression: 'ADD tries 1',
        ReturnValues: 'ALL_NEW',
    };
    // TODO: update is not working
    const update = await ddbDocClient.send(new UpdateCommand(paramsToUpdate));
    return update;
}

async function addToDB(email: string): Promise<PutCommandOutput>{
    const paramsToAdd = {
        TableName: EMAILS_TABLE,
        Item: {
            email: email,
            tries: 0,
        }
    }
    const save = await ddbDocClient.send(new PutCommand(paramsToAdd));
    return save;
}

async function sendEmail(email: string) {
    const sesClient = new SES({ region: REGION });
    const paramsForEmail = {
        Destination: {
            ToAddresses: [email],
        },
        Message: {
            Body: {
            Text: { Data: "Test" },
            },

            Subject: { Data: "Test Email" },
        },
        Source: "contact@inno-maps.com",
    };
    const resultEmail = await sesClient.sendEmail(paramsForEmail).promise();
    return resultEmail;
}