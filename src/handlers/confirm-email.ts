import {
    APIGatewayProxyEvent,
    APIGatewayProxyResult
} from "aws-lambda";
import { BodyResponse } from "../types";

import { PutCommand } from "@aws-sdk/lib-dynamodb";

import { ddbDocClient } from "../dynamo";
import { emailsTable, timeToExpire } from "../constants";


/*
 * Receive token from email and confirm validity
*/
export const confirmEmailHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    if (event.httpMethod !== 'POST') {
        throw new Error(`requestRetrieval only accepts POST method, you tried: ${event.httpMethod} method.`);
    }
    try {
        // TODO: get request data from auth token
        const { email } = JSON.parse(event.body);
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