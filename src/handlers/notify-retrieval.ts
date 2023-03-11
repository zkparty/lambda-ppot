import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { BodyResponse } from "../types";

/**
 * Notify email uer that file has been retrieved and it is ready to use
 */
export const notifyRetrievalHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        // TODO: get it is an internal AWS S3 event
        // TODO: get users that requested file
        // TODO: notify users
        return createResponse({}, true);
    } catch (error) {
        return createResponse(error, false);
    }
}

function createResponse(data: any, notified: boolean): APIGatewayProxyResult {
    return {
        statusCode: 200,
        body: JSON.stringify({
            notified: notified,
            ...data,
        } as BodyResponse)
    }
}