#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { PoittoStack } from "../lib/poitto-stack";

const app = new cdk.App();

new PoittoStack(app, "PoittoStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "ap-northeast-1",
  },
  description: "ポイッと（POITTO）バックエンド: Cognito/API/Lambda/Aurora/S3/SQS/Secrets",
});
