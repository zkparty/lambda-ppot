/*
 * Generate a presigned URL for a file download from AWS S3
*/
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { HEADERS, REGION, S3_BUCKET_NAME, S3_PREFIX } from "../constants";
import { GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { BodyResponse, PresignedUrlObject } from "../types";

export const getPresignedUrlHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        if (event.httpMethod !== 'GET') {
            throw new Error(`getPresignedUrl only accepts GET method, you tried: ${event.httpMethod} method.`);
        }
        const { file } = event.queryStringParameters;
        const preSignedUrlObject = await getPresignedUrl(file);
        return createResponse({preSignedUrlObject}, true);

    } catch (error) {
        // catch any error and return information about it
        console.log(error);
        return createResponse({...error}, false);
    }
}

function createResponse(data: any, result: boolean): APIGatewayProxyResult {
    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({
            result: result,
            ...data,
        } as BodyResponse)
    }
}

async function getPresignedUrl(file: string): Promise<PresignedUrlObject> {
    const s3Client = new S3Client({ region: REGION });
    const params = {
        Bucket: S3_BUCKET_NAME,
        Key: `${S3_PREFIX}/${file}`,
    };
    const url = await getSignedUrl(s3Client, new GetObjectCommand(params), { expiresIn: 60 });
    const object = await s3Client.send( new HeadObjectCommand(params) );
    return {...object, url};
}