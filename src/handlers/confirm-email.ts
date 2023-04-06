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
    HeadObjectCommand,
    HeadObjectCommandOutput
} from "@aws-sdk/client-s3";

import { ddbDocClient } from "../dynamo";
import { BodyResponse, Payload } from "../types";
import {
    REGION,
    EMAILS_TABLE,
    JWT_PRIVATE_KEY,
    TIME_TO_EXPIRE_CONFIRMED_EMAIL,
    S3_BUCKET_NAME,
    S3_PREFIX,
    DAYS_TO_RESTORE,
    RETRIEVAL_TYPE,
    HEADERS
} from "../constants";


/*
 * Receive token from email and confirm validity
*/
export const confirmEmailHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        if (event.httpMethod !== 'GET') {
            throw new Error(`confirmEmail only accepts GET method, you tried: ${event.httpMethod} method.`);
        }
        const { token } = event.queryStringParameters;
        const { email, file } = verify(token, JWT_PRIVATE_KEY) as Payload;

        // add to blacklist for a while
        const blacklist = await addToBlacklist(email);
        // start moving file from S3 Glacier to S3 Standard
        const restore = await restoreGlacierObject(file);
        return createResponse({blacklist, restore}, true);

    } catch (error) {
        // catch any error and return information about it
        console.log(error);
        return createResponse({...error}, false);
    }
}

function createResponse(data: any, verified: boolean): APIGatewayProxyResult {
    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({
            verified: verified,
            ...data,
        } as BodyResponse)
    }
}

async function restoreGlacierObject(file: string): Promise<HeadObjectCommandOutput|RestoreObjectCommandOutput> {
    const s3Client = new S3Client({ region: REGION });
    const paramsToConsult = {
        Bucket: S3_BUCKET_NAME,
        Key: `${S3_PREFIX}/${file}`,
    };
    const consult = await s3Client.send( new HeadObjectCommand(paramsToConsult) );
    if (consult.Restore === 'ongoing-request="true"'){
        return consult;
    }
    const paramsToRestore = {
        Bucket: S3_BUCKET_NAME,
        Key: `${S3_PREFIX}/${file}`,
        RestoreRequest: {
            Days: DAYS_TO_RESTORE,
            GlacierJobParameters: { Tier: RETRIEVAL_TYPE },
        },
    };
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