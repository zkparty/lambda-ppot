// Types
import {
    APIGatewayProxyEvent,
    APIGatewayProxyResult
  } from "aws-lambda";


import { validate } from 'deep-email-validator';
// Document client to connect to blacklist table
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

const tableName = process.env.SAMPLE_TABLE;

/**
 * Check if email can request retrieval
 */
export const requestRetrievalHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    if (event.httpMethod !== 'POST') {
        throw new Error(`requestRetrieval only accepts POST method, you tried: ${event.httpMethod} method.`);
    }
    return {
        statusCode: 200,
        body: JSON.stringify({
            'nico': 'serrano palacio',
            'age': 28,
        })
    }
    /*let response = null;
    try {
        // get request data
        const { email } = JSON.parse(event.body);
        const params = {
            TableName: tableName,
            Item: {
                email: email,
                addedTime: Date.now(),
            }
        }
        // validate email
        const validation = validate(email);
        if (!validation.valid){
            return {
                statusCode: 200,
                body: JSON.stringify({
                    registered: false,
                    ...validation,
                }),
            }
        }
        // check it is not in the blacklist
        // TODO: after that, delete emails that already expired in blacklist
        const get = await ddbDocClient.send(new GetCommand(params));
        if (!get.Item){
            return {
                statusCode: 200,
                body: JSON.stringify({
                    registered: false,
                    ...get,
                })
            }
        }
        // add email to the blacklist for a while
        const save = await ddbDocClient.send(new PutCommand(params));
        response = {
            registered: true,
            ...save,
        };
    } catch (error) {
        console.log("Error", error);
        response = {
            registered: false,
            ...error,
        };
    }
    return {
        statusCode: 200,
        body: JSON.stringify({nico: true}),
    }*/
}