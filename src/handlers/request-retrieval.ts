import {
    APIGatewayProxyEvent,
    APIGatewayProxyResult
} from "aws-lambda";
import { SES } from "aws-sdk";
import { validate } from 'deep-email-validator';
import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

import { BodyResponse } from "../types";
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
        // validate email (avoid STMP because ISP block them to prevent brute force)
        const validation = await validate({
            email: email,
            validateSMTP: false,
        });
        if (!validation.valid){
            return {
                statusCode: 200,
                body: JSON.stringify({
                    registered: false,
                    ...validation,
                } as BodyResponse),
            }
        }
        // check it is not in the blacklist (autodelete with DynamoDB TTL feature)
        const paramsToRead = {
            TableName: EMAILS_TABLE,
            Key: {
                email: email,
            }
        }
        const get = await ddbDocClient.send(new GetCommand(paramsToRead));
        const item = get.Item;
        if (item){
            // check that it is not an unauthorized spam attack
            if (item.tries > TRIES_LIMIT){
                if (item.expiration){
                    return {
                        statusCode: 200,
                        body: JSON.stringify({
                            registered: false,
                            ...get,
                        } as BodyResponse)
                    }
                }
                // TODO: set expiration to TIME_TO_EXPIRE_SPAM
                const paramsToBlock = {
                    TableName: EMAILS_TABLE,
                    Key: email,
                    UpdateExpression: 'ADD expiration 1',
                    ReturnValues: 'ALL_NEW',
                }
                const block = await ddbDocClient.send(new UpdateCommand(paramsToBlock));
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        registered: false,
                        ...block,
                        ...get,
                    } as BodyResponse)
                }
            }
            // TODO: update is not working
            const paramsToUpdate = {
                TableName: EMAILS_TABLE,
                Key: email,
                UpdateExpression: 'ADD tries 1',
                ReturnValues: 'ALL_NEW',
            }
            const update = await ddbDocClient.send(new UpdateCommand(paramsToUpdate));
            return {
                statusCode: 200,
                body: JSON.stringify({
                    registered: false,
                    ...update,
                    ...get,
                } as BodyResponse)
            }
        }
        // add email to the blacklist for a while
        const paramsToAdd = {
            TableName: EMAILS_TABLE,
            Item: {
                email: email,
                tries: 0,
            }
        }
        const save = await ddbDocClient.send(new PutCommand(paramsToAdd));
        // send email to confirm autorization
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
        return {
            statusCode: 200,
            body: JSON.stringify({
                registered: true,
                ...save,
                ...resultEmail,
            } as BodyResponse)
        }
    } catch (error) {
        // catch any error and return information about it
        console.log("Error: ", error);
        return {
            statusCode: 200,
            body: JSON.stringify({
                registered: false,
                ...error,
            } as BodyResponse)
        }
    }
}