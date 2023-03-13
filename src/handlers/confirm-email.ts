import {
    APIGatewayProxyEvent,
    APIGatewayProxyResult
} from "aws-lambda";
import { verify } from 'jsonwebtoken';
import {
    PutCommandOutput,
    UpdateCommand
} from "@aws-sdk/lib-dynamodb";
import {
    S3Client,
    RestoreObjectCommand,
    RestoreObjectCommandOutput,
    RestoreObjectCommandInput
} from "@aws-sdk/client-s3";

import { ddbDocClient } from "../dynamo";
import { BodyResponse, Payload } from "../types";
import {
    REGION,
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

        // TODO: if user is in blacklist then only respond: blacklisted: true ? what if it is requesting other file?
        // add to blacklist for a while
        const blacklist = await addToBlacklist(email);
        // TODO: start moving file from S3 Glacier to S3 Standard
        const restore = await restoreGlacierObject();
        return createResponse({blacklist, restore}, true);

    } catch (error) {
        // catch any error and return information about it
        console.log("Error: ", error);
        return createResponse({...error}, false);
    }
}

function createResponse(data: any, blacklisted: boolean): APIGatewayProxyResult {
    return {
        statusCode: 200,
        body: JSON.stringify({
            blacklisted: blacklisted,
            ...data,
        } as BodyResponse)
    }
}

async function restoreGlacierObject(): Promise<RestoreObjectCommandOutput> {
    const s3Client = new S3Client({ region: REGION });
    const paramsToRestore = {
        Bucket: 'perpetual-powers-of-tau',
        Key: 'challenges/current_state.txt',
        RestoreRequest: {
            Days: 1,
            GlacierJobParameters: {
                Tier: 'Standard'
            },
            Tier: 'Standard'
        },
    } as RestoreObjectCommandInput;
    const restore = await s3Client.send( new RestoreObjectCommand(paramsToRestore) );
    s3Client.destroy();
    return restore;
}

async function addToBlacklist(email: string): Promise<PutCommandOutput>{
    const paramsToBlacklist = {
        TableName: EMAILS_TABLE,
        Key: { "email": email },
        UpdateExpression: 'ADD #expiration :set',
        ExpressionAttributeNames: { '#expiration': 'expiration' },
        ExpressionAttributeValues: { ':set': Math.floor(Date.now() / 1000) + TIME_TO_EXPIRE_CONFIRMED_EMAIL }, //  86400 = 24 hours
        ReturnValues: 'ALL_NEW',
    };
    const blacklist = await ddbDocClient.send(new UpdateCommand(paramsToBlacklist));
    ddbDocClient.destroy();
    return blacklist;
}