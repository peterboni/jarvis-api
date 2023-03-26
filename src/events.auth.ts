import { APIGatewayRequestAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';

/*
 * Authorizer.
 */
export async function handler(event: APIGatewayRequestAuthorizerEvent): Promise<APIGatewayAuthorizerResult> {

    console.info('Request:', JSON.stringify(event, undefined, 2));

    const authorizationHeader = event.headers?.authorization;
    if (!authorizationHeader) throw new Error("Unauthorized");

    // Authorization: Basic <credentials - username:password>
    // e.g. Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=
    const encodedCreds = authorizationHeader.split(' ')[1];
    const plainCreds = (Buffer.from(encodedCreds, 'base64')).toString().split(':');

    const username = plainCreds[0];
    const password = plainCreds[1];

    console.debug('Username:', username);

    if (!(username === process.env.USERNAME &&
          password === process.env.PASSWORD)) throw new Error("Unauthorized");

    const response = buildPolicy(event, username);

    console.info('Response:', JSON.stringify(response, undefined, 2));
    return response;
}

/*
 * Build IAM Policy.
 */
function buildPolicy(event: APIGatewayRequestAuthorizerEvent, principalId: string): APIGatewayAuthorizerResult {

    const tmp = event.methodArn.split(':');
    const apiGatewayArnTmp = tmp[5].split('/');
    const awsAccountId = tmp[4];
    const awsRegion = tmp[3];
    const restApiId = apiGatewayArnTmp[0];
    const stage = apiGatewayArnTmp[1];

    const apiArn = 'arn:aws:execute-api:' + awsRegion + ':' + awsAccountId + ':' +
        restApiId + '/' + stage + '/*/*';

    return {
        principalId: principalId,
        policyDocument: {
            Version: '2012-10-17',
            Statement: [
                {
                    Action: 'execute-api:Invoke',
                    Effect: 'Allow',
                    Resource: [apiArn]
                }
            ]
        }
    }
}
