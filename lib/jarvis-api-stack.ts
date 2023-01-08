import { App, Stack, StackProps } from 'aws-cdk-lib';
import { Events } from './events';

/*
 * Jarvis API Stack.
 */
export class JarvisApiStack extends Stack {

    constructor(scope: App, id: string, props?: StackProps) {

        super(scope, id, props);

        /*
         * Events
         */
        const eventsConfig = require("../config/events.json");
        new Events(this, 'Events', eventsConfig);
    }
}
