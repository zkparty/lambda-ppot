// Types
import {
    APIGatewayProxyEvent,
    APIGatewayProxyResult
} from "aws-lambda";
import { BodyResponse } from "../types";

import { validate } from 'deep-email-validator';
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

import { ddbDocClient } from "../dynamo";
import { emailsTable, timeToExpire } from "../constants";

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
            TableName: emailsTable,
            Key: {
                email: email,
            }
        }
        const get = await ddbDocClient.send(new GetCommand(paramsToRead));
        if (get.Item){
            return {
                statusCode: 200,
                body: JSON.stringify({
                    registered: false,
                    ...get,
                } as BodyResponse)
            }
        }
        // TODO: send email to confirm autorization
        // TODO: move below code to another lambda
        // add email to the blacklist for a while
        const paramsToAdd = {
            TableName: emailsTable,
            Item: {
                email: email,
                expiration: Math.floor(Date.now() / 1000) + timeToExpire, //  86400 = 24 hours
            }
        }
        const save = await ddbDocClient.send(new PutCommand(paramsToAdd));
        return {
            statusCode: 200,
            body: JSON.stringify({
                registered: true,
                ...save,
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