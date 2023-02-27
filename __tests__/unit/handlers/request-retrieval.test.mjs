// Import putItemHandler function from put-item.mjs
import { requestRetrieval } from '../../../src/handlers/request-retrieval.mjs';
// Import dynamodb from aws-sdk
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from "aws-sdk-client-mock";
// This includes all tests for putItemHandler()
describe('Test requestRetrieval', function () {
    const ddbMock = mockClient(DynamoDBDocumentClient);

    beforeEach(() => {
        ddbMock.reset();
    });

    // This test invokes putItemHandler() and compare the result
    it('should registered succesfully the email', async () => {
        const returnedItem = { registered: true, /*TODO*/ };

        // TODO: save in database
        /*// Return the specified value whenever the spied put function is called
        ddbMock.on(PutCommand).resolves({
            returnedItem
        });*/

        const event = {
            httpMethod: 'POST',
            body: '{"email": "nicoserranop@gmail.com"}'
        };

        const result = await requestRetrieval(event);

        const expectedResult = {
            statusCode: 200,
            body: JSON.stringify(returnedItem)
        };

        // Compare the result with the expected result
        expect(result).toEqual(expectedResult);
    });
});