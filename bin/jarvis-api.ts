#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import { JarvisApiStack } from '../lib/jarvis-api-stack';

const app = new App();
new JarvisApiStack(app, 'JarvisApiStack');
