// Types
import {
    APIGatewayProxyEvent,
    APIGatewayProxyResult
} from "aws-lambda";
import { SES } from "aws-sdk";
import { validate } from 'deep-email-validator';
import { GetCommand } from "@aws-sdk/lib-dynamodb";

import { BodyResponse } from "../types";
import { ddbDocClient } from "../dynamo";
import { emailsTable, region } from "../constants";

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
        // send email to confirm autorization
        const sesClient = new SES({ region: region });
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