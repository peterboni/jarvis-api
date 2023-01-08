import { Template, Capture } from 'aws-cdk-lib/assertions';
import { App } from 'aws-cdk-lib';
import { JarvisApiStack } from '../lib/jarvis-api-stack';

/*
 * DynamoDB table.
 */
test('DynamoDB Table Created', () => {
    const app = new App();
    // WHEN
    const stack = new JarvisApiStack(app, 'JarvisApiStack-Test');
    // THEN
    const template = Template.fromStack(stack);
    template.resourceCountIs("AWS::DynamoDB::Table", 1);
});
