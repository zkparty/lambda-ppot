import {
    APIGatewayProxyEvent,
    APIGatewayProxyResult
} from "aws-lambda";
import { verify } from 'jsonwebtoken';
import { PutCommand } from "@aws-sdk/lib-dynamodb";

import { ddbDocClient } from "../dynamo";
import { BodyResponse } from "../types";
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
        // TODO: get request data from auth token
        // TODO: cannot destructure this
        const { token } = event.queryStringParameters;
        const save = verify(token, JWT_PRIVATE_KEY);

        /*// add email to the blacklist for a while
        const paramsToAdd = {
            TableName: EMAILS_TABLE,
            Item: {
                email: email,
                expiration: Math.floor(Date.now() / 1000) + TIME_TO_EXPIRE_CONFIRMED_EMAIL, //  86400 = 24 hours
            }
        }
        const save = await ddbDocClient.send(new PutCommand(paramsToAdd));*/
        return {
            statusCode: 200,
            body: JSON.stringify({
                registered: true,
                save: JSON.stringify(save),
                //...save,
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