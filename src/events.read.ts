import { APIGatewayProxyEvent, APIGatewayProxyEventQueryStringParameters, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import isISO8601 from 'validator/lib/isISO8601';
import { ErrorMessage, validateAlphanumeric } from './request-helper';

/*
 * Types.
 */
type EventResponse = {
    dateTime: string;
    majorThing: string;
    minorThing: string;
    event: string;
};

/*
 * Variables.
 */
let queryMajorThing: string | undefined;    // Required
let queryDateTime: string | undefined;      // Optional - If not specified or invalid defaults to midnight UTC.
let queryMinorThing: string | undefined;    // Optional

let response: APIGatewayProxyResult = {
    statusCode: 0,
    body: ''
};
let events: Array<EventResponse> = [];
let errorMessages: Array<ErrorMessage> = [];

/*
 * Read events.
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {

    console.info('Request:', JSON.stringify(event, undefined, 2));

    /*
     * Parse query string parameters and validate.
     */
    if (readEventRequest(event.queryStringParameters)) {

        await readEvents();

    } else {

        response.statusCode = 400; // Bad Request
        response.body = JSON.stringify({ errors: errorMessages });
    }

    console.info('Response:', JSON.stringify(response, undefined, 2));
    return response;
}

/*
 * Parse query string parameters and validate.
 */
function readEventRequest(queryStringParameters: APIGatewayProxyEventQueryStringParameters | null): boolean {

    let validEventRequest = false;

    if (queryStringParameters) {
        // majorThing
        queryMajorThing = queryStringParameters.majorThing;
        let queryMajorThingValid = validateAlphanumeric('majorThing', true, queryMajorThing);
        if (queryMajorThingValid.errorMessage) errorMessages.push({ message: queryMajorThingValid.errorMessage });

        // dateTime
        queryDateTime = queryStringParameters.dateTime;
        if (!queryDateTime || !isISO8601(queryDateTime)) {
            console.error('Error:', 'dateTime is invalid. Defaulting to midnight UTC.', queryDateTime);
            // Midnight UTC
            let now = new Date();
            now.setHours(0, 0, 0, 0);
            queryDateTime = now.toISOString();
        }
        console.debug('dateTime:', queryDateTime);

        // minorThing
        queryMinorThing = queryStringParameters.minorThing;
        let queryMinorThingValid = validateAlphanumeric('minorThing', false, queryMinorThing);
        if (queryMinorThingValid.errorMessage) errorMessages.push({ message: queryMinorThingValid.errorMessage });

        // Query?
        if (queryMajorThingValid.valid && queryMinorThingValid.valid)
            validEventRequest = true;

    } else {

        console.error('Error:', 'majorThing is required.');
        errorMessages.push({ message: 'majorThing is required.' });
    }

    return validEventRequest;
}

/*
 * Read events from DynamoDB table.
 */
async function readEvents() {

    const dynamo = new DynamoDB();
    const params: DynamoDB.DocumentClient.QueryInput = {
        ExpressionAttributeNames: {
            '#majorThingName': 'majorThing',
            '#dateTime': 'dateTime'
        },
        ExpressionAttributeValues: {
            ':majorThingValue': { S: queryMajorThing },
            ':dateTimeValue': { S: queryDateTime }
        },
        KeyConditionExpression: '#majorThingName = :majorThingValue and #dateTime >= :dateTimeValue',
        ReturnConsumedCapacity: "TOTAL",
        ScanIndexForward: false, // sort descending
        TableName: process.env.EVENTS_TABLE_NAME!
    };
    if (queryMinorThing) {
        params.ExpressionAttributeValues![':minorThingValue'] = { S: queryMinorThing };
        params.FilterExpression = 'minorThing = :minorThingValue';
    }

    try {
        console.debug('dynamo.query:', params);
        const dynamoResponse = await dynamo.query(params).promise();
        console.debug('dynamoResponse:', JSON.stringify(dynamoResponse, undefined, 2));

        dynamoResponse.Items?.forEach(function (value, _index, _array) {
            const eventResponse: EventResponse = {
                dateTime: value['dateTime'].S!,
                majorThing: value['majorThing'].S!,
                minorThing: value['minorThing'].S!,
                event: value['event'].S!
            };
            events.push(eventResponse);
        });

        response.statusCode = 200; // OK
        response.body = JSON.stringify(events);

    } catch (error) {
        console.error('Error:', 'DynamoDB query failed.', error);
    }
}
