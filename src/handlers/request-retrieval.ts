import {
    APIGatewayProxyEvent,
    APIGatewayProxyResult
} from "aws-lambda";
import { sign } from 'jsonwebtoken';
import { validate } from 'deep-email-validator';
import {
    SESClient,
    SendEmailCommand
} from "@aws-sdk/client-ses";
import {
    OutputFormat as ValidationOutputFormat
} from "deep-email-validator/dist/output/output";
import {
    GetCommand,
    PutCommand,
    PutCommandOutput,
    UpdateCommand,
    UpdateCommandOutput
} from "@aws-sdk/lib-dynamodb";

import { BodyResponse, Item, Payload } from "../types";
import { ddbDocClient } from "../dynamo";
import {
    EMAILS_TABLE,
    REGION,
    TRIES_LIMIT,
    TIME_TO_EXPIRE_SPAM,
    JWT_PRIVATE_KEY,
    JWT_EXPIRATION_TIME,
    EMAIL_FROM,
    EMAIL_RETURN,
    HEADERS,
    TOKEN_WEB_PAGE,
} from "../constants";

/**
 * Check if email can request retrieval
 */
export const requestRetrievalHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        if (event.httpMethod !== 'POST') {
            throw new Error(`requestRetrieval only accepts POST method, you tried: ${event.httpMethod} method.`);
        }
        // get request data
        const { email, file } = JSON.parse(event.body) as Payload;
        // validate email
        const [validation, invalid] = await validateEmail(email);
        if (invalid){
            return createResponse(validation, false);
        }
        const item = await getItemFromDB(email);
        // check email is not in blacklist
        let db;
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
            // increase number of tries for user
            db = await setTryInItem(email);
        } else {
            // add user to the db
            db = await addToDB(email);
        }

        const send = await sendEmail(email, file);
        return createResponse({...db, ...send}, true);

    } catch (error) {
        // catch any error and return information about it
        console.log(error);
        return createResponse({...error}, false);
    }
}

function createResponse(data: any, registered: boolean): APIGatewayProxyResult {
    return {
        statusCode: 200,
        headers: HEADERS,
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
        Key: { "email": email },
        UpdateExpression: 'ADD #expiration :set',
        ExpressionAttributeNames: { '#expiration': 'expiration' },
        ExpressionAttributeValues: { ':set': Math.floor(Date.now() / 1000) + TIME_TO_EXPIRE_SPAM },
        ReturnValues: 'ALL_NEW',
    };
    const block = await ddbDocClient.send(new UpdateCommand(paramsToBlock));
    return block;

}

async function setTryInItem(email: string): Promise<UpdateCommandOutput> {
    const paramsToUpdate = {
        TableName: EMAILS_TABLE,
        Key: { "email": email },
        UpdateExpression: 'ADD #tries :increment',
        ExpressionAttributeNames: { '#tries': 'tries' },
        ExpressionAttributeValues: { ':increment': 1 },
        ReturnValues: 'ALL_NEW',
    };
    const update = await ddbDocClient.send(new UpdateCommand(paramsToUpdate));
    return update;
}

async function addToDB(email: string): Promise<PutCommandOutput>{
    const paramsToAdd = {
        TableName: EMAILS_TABLE,
        Item: {
            email: email,
            tries: 1,
        }
    }
    const save = await ddbDocClient.send(new PutCommand(paramsToAdd));
    ddbDocClient.destroy();
    return save;
}

async function sendEmail(email: string, file: string) {
    const sesClient = new SESClient({ region: REGION });
    const payload: Payload = {email, file};
    const token = sign(payload, JWT_PRIVATE_KEY, { expiresIn: JWT_EXPIRATION_TIME });
    const linkToVerify = TOKEN_WEB_PAGE + token;
    const paramsForEmail = {
        Destination: {
            ToAddresses: [email],
        },
        Message: {
            Body: {
                Html: {
                    Charset: "UTF-8",
                    Data: `
                    <p>
                        You have requested an archive retrieval for one of the Perpetual
                        Powers of Tau contributions. To do so you need to verify your email
                        by clicking the following link:
                    </p>
                    <a href="${linkToVerify}">${linkToVerify}</a>
                    <p>
                        If you did not send this request. Please ignore this email.
                    </p>
                    `
                }
            },
            Subject: { Data: "Retrieval Request for Perpetual Powers of Tau Archive" },
        },
        Source: EMAIL_FROM,
        ReturnPath: EMAIL_RETURN,
    };
    const resultEmail = await sesClient.send( new SendEmailCommand(paramsForEmail) );
    sesClient.destroy();
    return resultEmail;
}