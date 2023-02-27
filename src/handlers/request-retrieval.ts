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
    let response = null;
    try {
        // get request data
        const { email } = JSON.parse(event.body);
        const paramsToRead = {
            TableName: tableName,
            Key: {
                primaryKey: email,
            }
        }
        // validate email
        // TODO: check smtp in nicoserranop@gmail.com
        const validation = await validate(email);
        if (!validation.valid){
            return {
                statusCode: 200,
                body: JSON.stringify({
                    registered: false,
                    ...validation,
                }),
            }
        }
        return {
            statusCode: 200,
            body: JSON.stringify({
                nico: 1,
            })
        }
    } catch(error){
        return {
            statusCode: 201,
            body: JSON.stringify({
                error: true
            })
        }
    }
        /*// check it is not in the blacklist
        // TODO: after that, delete emails that already expired in blacklist
        const get = await ddbDocClient.send(new GetCommand(paramsToRead));
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
        const paramsToAdd = {
            TableName: tableName,
            Item: {
                email: email,
                addedTime: Date.now(),
            }
        }
        const save = await ddbDocClient.send(new PutCommand(paramsToAdd));
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
        body: JSON.stringify(response),
    }*/
}