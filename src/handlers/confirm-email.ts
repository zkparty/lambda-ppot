import {
    APIGatewayProxyEvent,
    APIGatewayProxyResult
} from "aws-lambda";
import { verify } from 'jsonwebtoken';
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";

import { ddbDocClient } from "../dynamo";
import { BodyResponse, Payload } from "../types";
import {
    EMAILS_TABLE,
    JWT_PRIVATE_KEY,
    TIME_TO_EXPIRE_CONFIRMED_EMAIL
} from "../constants";


/*
 * Receive token from email and confirm validity
*/
export const confirmEmailHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    if (event.httpMethod !== 'GET') {
        throw new Error(`confirmEmail only accepts GET method, you tried: ${event.httpMethod} method.`);
    }
    try {
        const { token } = event.queryStringParameters;
        const { email } = verify(token, JWT_PRIVATE_KEY) as Payload;

        // add email to the blacklist for a while
        const paramsToBlacklist = {
            TableName: EMAILS_TABLE,
            Key: { "email": email },
            UpdateExpression: 'ADD #expiration :set',
            ExpressionAttributeNames: { '#expiration': 'expiration' },
            ExpressionAttributeValues: { ':set': Math.floor(Date.now() / 1000) + TIME_TO_EXPIRE_CONFIRMED_EMAIL }, //  86400 = 24 hours
            ReturnValues: 'ALL_NEW',
        };
        const blacklist = await ddbDocClient.send(new UpdateCommand(paramsToBlacklist));
        return {
            statusCode: 200,
            body: JSON.stringify({
                registered: true,
                ...blacklist,
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