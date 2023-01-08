import { Construct } from 'constructs';
import {
    aws_dynamodb as dynamodb,
    aws_lambda as lambda,
    aws_lambda_nodejs as lambdaNode,
    aws_certificatemanager as acm,
    aws_apigateway as apigw } from 'aws-cdk-lib';

/*
 * EventsProps.
 */
export interface EventsProps {
    domainName: string,
    account: {
        username: string;
        password: string;
    },
    apiKey: {
        name: string;
        value: string
    },
    usagePlan: {
        name: string;
        throttleRateLimit: number;
        throttleBurstLimit: number;
        quotaLimit: number;
        quotaPeriod: apigw.Period;
    }
}

/*
 * Events.
 */
export class Events extends Construct {

    constructor(scope: Construct, id: string, props: EventsProps) {

        super(scope, id);

        /*
         * DynamoDB table.
         */
        const table = new dynamodb.Table(this, 'Events', {
            partitionKey: {
                name: 'majorThing',
                type: dynamodb.AttributeType.STRING
            },
            sortKey: {
                name: 'dateTime',
                type: dynamodb.AttributeType.STRING
            }
        });

        /*
         * Lambda function - Auth
         */
        const authLambda = new lambdaNode.NodejsFunction(this, 'Auth', {
            architecture: lambda.Architecture.ARM_64,
            bundling: {
                minify: true
            },
            entry: __dirname + '/../src/events.auth.ts',
            environment: {
                USERNAME: props.account.username,
                PASSWORD: props.account.password
            },
            logRetention: 30,
            runtime: lambda.Runtime.NODEJS_16_X
        });

        /*
         * Lambda function - Create
         */
        const createLambda = new lambdaNode.NodejsFunction(this, 'Create', {
            architecture: lambda.Architecture.ARM_64,
            bundling: {
                minify: true
            },
            entry: __dirname + '/../src/events.create.ts',
            environment: {
                EVENTS_TABLE_NAME: table.tableName
            },
            logRetention: 30,
            runtime: lambda.Runtime.NODEJS_16_X
        });
        // Grant DynamoDB table read/write to Lambda
        table.grantReadWriteData(createLambda);

        /*
         * Lambda function - Read
         */
        const readLambda = new lambdaNode.NodejsFunction(this, 'Read', {
            architecture: lambda.Architecture.ARM_64,
            bundling: {
                minify: true
            },
            entry: __dirname + '/../src/events.read.ts',
            environment: {
                EVENTS_TABLE_NAME: table.tableName
            },
            logRetention: 30,
            runtime: lambda.Runtime.NODEJS_16_X
        });
        // Grant DynamoDB table read/write to Lambda
        table.grantReadWriteData(readLambda);

        /*
         * ACM - Certificate
         */
        const cert = new acm.Certificate(this, 'Certificate', {
            domainName: props.domainName,
            validation: acm.CertificateValidation.fromDns(),    // Records must be added manually
        });

        /*
         * API Gateway - REST API
         */
        const api = new apigw.RestApi(this, 'JarvisEventsApi', {
            endpointTypes: [apigw.EndpointType.REGIONAL],
            domainName: {
                domainName: props.domainName,
                certificate: cert,
                endpointType: apigw.EndpointType.REGIONAL,
                securityPolicy: apigw.SecurityPolicy.TLS_1_2
            }
        });

        /*
         * API Gateway - Lambda-based request authorizer
         */
        const authorizer = new apigw.RequestAuthorizer(this, 'EventsAuthorizer', {
            handler: authLambda,
            identitySources: [apigw.IdentitySource.header('Authorization')]
        });

        /*
         * API Gateway - Events Resource
         */
        const eventsResource = api.root.addResource('events', {
            defaultMethodOptions: {
                authorizer: authorizer,
                apiKeyRequired: true
            }
        });
        eventsResource.addMethod('POST', new apigw.LambdaIntegration(createLambda, {
            proxy: true
        }));
        eventsResource.addMethod('GET', new apigw.LambdaIntegration(readLambda, {
            proxy: true
        }));

        /*
         * Usage Plan
         */
        const plan = api.addUsagePlan('UsagePlan', {
            name: props.usagePlan.name,
            throttle: {
                rateLimit: props.usagePlan.throttleRateLimit,
                burstLimit: props.usagePlan.throttleBurstLimit
            },
            quota: {
                limit: props.usagePlan.quotaLimit,
                period: props.usagePlan.quotaPeriod
            }
        });
        plan.addApiStage({
            stage: api.deploymentStage
        });

        /*
         * API Key
         */
        const key = api.addApiKey('ApiKey', {
            apiKeyName: props.apiKey.name,
            value: props.apiKey.value
        });
        plan.addApiKey(key);
    }
}
