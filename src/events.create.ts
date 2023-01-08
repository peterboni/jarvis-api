import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import { ErrorMessage, validateAlphanumeric } from './request-helper';

/*
 * Variables.
 */
let dateTimeIso: string;

let eventRequest = {
    majorThing: undefined,
    minorThing: undefined,
    event: undefined
}

let response: APIGatewayProxyResult = {
    statusCode: 0,
    body: ''
};
let errorMessages: Array<ErrorMessage> = [];

/*
 * Create event.
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {

    dateTimeIso = new Date().toISOString();

    console.info('Request:', JSON.stringify(event, undefined, 2));
    console.debug('dateTime:', dateTimeIso);

    if (readEventRequest(event.body)) {

        await createEvent();

    } else {

        response.statusCode = 400; // Bad Request
        response.body = JSON.stringify({ errors: errorMessages });
    }


    console.info('Response:', JSON.stringify(response, undefined, 2));
    return response;
}

/*
 * Parse body and validate.
 */
function readEventRequest(bodyStr: string | null): boolean {

    let validEventRequest = false;

    if (bodyStr) {
        try {
            eventRequest = JSON.parse(bodyStr);

            let majorThingValid = validateAlphanumeric('majorThing', true, eventRequest.majorThing);
            if (majorThingValid.errorMessage) errorMessages.push({ message: majorThingValid.errorMessage });

            let minorThingValid = validateAlphanumeric('minorThing', true, eventRequest.minorThing);
            if (minorThingValid.errorMessage) errorMessages.push({ message: minorThingValid.errorMessage });

            let eventValid = validateAlphanumeric('event', true, eventRequest.event);
            if (eventValid.errorMessage) errorMessages.push({ message: eventValid.errorMessage });

            if (majorThingValid.valid && minorThingValid.valid && eventValid.valid)
                validEventRequest = true;

        } catch (error) {
            console.error('Error:', 'body must be valid JSON.', error);
            errorMessages.push({ message: 'body must be valid JSON.' });
        }
    } else {
        console.error('Error:', 'body must be valid JSON.');
        errorMessages.push({ message: 'body must be valid JSON.' });
    }

    return validEventRequest;
}

/*
 * Create event in DynamoDB table.
 */
async function createEvent() {

    const dynamo = new DynamoDB();
    const params: DynamoDB.DocumentClient.PutItemInput = {
        TableName: process.env.EVENTS_TABLE_NAME!,
        Item: {
            'dateTime': { S: dateTimeIso },
            'majorThing': { S: eventRequest.majorThing },
            'minorThing': { S: eventRequest.minorThing },
            'event': { S: eventRequest.event }
        }
    };

    try {
        console.debug('dynamo.putItem:', params);
        const dynamoResponse = await dynamo.putItem(params).promise();
        console.debug('dynamoResponse:', JSON.stringify(dynamoResponse, undefined, 2));

        response.statusCode = dynamoResponse.$response.httpResponse.statusCode;

    } catch (error) {
        console.error('Error:', 'DynamoDB putItem failed.', error);
    }
}
