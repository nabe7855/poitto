import * as path from "node:path";
import {
  Stack,
  StackProps,
  Duration,
  RemovalPolicy,
  CfnOutput,
  aws_ec2 as ec2,
  aws_rds as rds,
  aws_s3 as s3,
  aws_s3_notifications as s3n,
  aws_sqs as sqs,
  aws_lambda as lambda,
  aws_lambda_event_sources as eventsources,
  aws_cognito as cognito,
  aws_secretsmanager as secrets,
} from "aws-cdk-lib";
import {
  HttpApi,
  HttpMethod,
  CorsHttpMethod,
} from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { HttpJwtAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { Construct } from "constructs";

const LAMBDA_DIR = path.join(__dirname, "..", "lambda");

/**
 * ポイッと バックエンド一式。
 * 設計原則: DB/ストレージ/認証/AI抽出はアダプタ越し。SQLは標準PostgreSQL。秘密はSecrets Manager。
 */
export class PoittoStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // 許可するフロントのオリジン（CORS）。将来ドメインを足すときはここに追加、または
    // `cdk deploy -c allowedOrigins=https://poitto.jp,https://…` で上書き。
    const allowedOrigins: string[] = (
      (this.node.tryGetContext("allowedOrigins") as string | undefined) ??
      "https://poitto-tau.vercel.app,http://localhost:3000"
    )
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // ── ネットワーク（Aurora用。NATなしでコスト抑制。LambdaはData API利用でVPC不要）──
    const vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        { name: "isolated", subnetType: ec2.SubnetType.PRIVATE_ISOLATED, cidrMask: 24 },
      ],
    });

    // ── 認証: Cognito ユーザープール（UIから自己サインアップ可能）──
    const userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: "poitto-users",
      selfSignUpEnabled: true, // 画面からの新規登録を許可
      signInAliases: { email: true },
      autoVerify: { email: true }, // 確認コードをメール送信
      standardAttributes: { email: { required: true, mutable: false } },
      // 団体名を保持（登録時に入力）。テナントはユーザーのsubを使うためtenant_idは互換目的で残置。
      customAttributes: {
        tenant_id: new cognito.StringAttribute({ mutable: true }),
        org_name: new cognito.StringAttribute({ mutable: true }),
      },
      passwordPolicy: { minLength: 8, requireLowercase: true, requireDigits: true },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const userPoolClient = userPool.addClient("WebClient", {
      userPoolClientName: "poitto-web",
      authFlows: { userSrp: true },
      idTokenValidity: Duration.hours(1),
      accessTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.days(30),
    });

    // ── 秘密情報: Gemini APIキー（値は後から設定）──
    const geminiSecret = new secrets.Secret(this, "GeminiApiKey", {
      secretName: "poitto/gemini-api-key",
      description: "Google Gemini API key for extraction",
    });

    // ── ストレージ: 原本保管バケット ──
    const bucket = new s3.Bucket(this, "OriginalsBucket", {
      bucketName: undefined, // 自動命名
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      removalPolicy: RemovalPolicy.RETAIN,
      // ブラウザから署名付きURLで直接アップロード(PUT)できるようCORS許可。
      // 認証は署名付きURL自体が担保するためオリジンは制限しない。
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.PUT,
            s3.HttpMethods.GET,
            s3.HttpMethods.HEAD,
          ],
          allowedOrigins: allowedOrigins,
          allowedHeaders: ["*"],
          exposedHeaders: ["ETag"],
          maxAge: 3000,
        },
      ],
    });

    // ── キュー: 抽出ジョブ（DLQ付き）──
    const dlq = new sqs.Queue(this, "ExtractionDlq", {
      queueName: "poitto-extraction-dlq",
      retentionPeriod: Duration.days(14),
    });
    const extractionQueue = new sqs.Queue(this, "ExtractionQueue", {
      queueName: "poitto-extraction",
      visibilityTimeout: Duration.seconds(120),
      deadLetterQueue: { queue: dlq, maxReceiveCount: 3 },
    });

    // 原本アップロード(S3 put)→SQSへ通知
    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.SqsDestination(extractionQueue),
      { prefix: "originals/" },
    );

    // ── DB: Aurora Serverless v2 (PostgreSQL) + Data API ──
    const dbCluster = new rds.DatabaseCluster(this, "Db", {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_16_4,
      }),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      writer: rds.ClusterInstance.serverlessV2("writer"),
      // スケール・トゥ・ゼロ: アイドル時は 0 ACU まで自動停止し課金をほぼ$0に。
      // アクセス時に自動起動（初回は十数秒のコールドスタート）。
      serverlessV2MinCapacity: 0,
      serverlessV2MaxCapacity: 4,
      enableDataApi: true, // Lambdaから driver 不要で SQL 実行
      defaultDatabaseName: "poitto",
      storageEncrypted: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // ── Lambda 共通環境 ──
    const commonEnv: Record<string, string> = {
      DB_CLUSTER_ARN: dbCluster.clusterArn,
      DB_SECRET_ARN: dbCluster.secret?.secretArn ?? "",
      DB_NAME: "poitto",
      BUCKET_NAME: bucket.bucketName,
      GEMINI_SECRET_ARN: geminiSecret.secretArn,
      NODE_OPTIONS: "--enable-source-maps",
    };

    // ── Lambda: 抽出ワーカー（SQSトリガー）──
    const extractWorker = new lambda.Function(this, "ExtractWorker", {
      functionName: "poitto-extract-worker",
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "extract-worker/index.handler",
      code: lambda.Code.fromAsset(LAMBDA_DIR),
      timeout: Duration.seconds(90),
      memorySize: 512,
      environment: commonEnv,
    });
    extractWorker.addEventSource(
      new eventsources.SqsEventSource(extractionQueue, { batchSize: 1 }),
    );

    // ── Lambda: API ハンドラ（documents CRUD/検索）──
    const apiHandler = new lambda.Function(this, "ApiHandler", {
      functionName: "poitto-api",
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "api/index.handler",
      code: lambda.Code.fromAsset(LAMBDA_DIR),
      timeout: Duration.seconds(29),
      memorySize: 512,
      environment: commonEnv,
    });

    // ── 権限（最小権限）──
    bucket.grantReadWrite(extractWorker);
    bucket.grantReadWrite(apiHandler);
    geminiSecret.grantRead(extractWorker);
    dbCluster.grantDataApiAccess(extractWorker);
    dbCluster.grantDataApiAccess(apiHandler);

    // ── API Gateway (HTTP API) + Cognito JWT オーソライザ ──
    const authorizer = new HttpJwtAuthorizer(
      "JwtAuthorizer",
      `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
      { jwtAudience: [userPoolClient.userPoolClientId] },
    );

    const httpApi = new HttpApi(this, "HttpApi", {
      apiName: "poitto-api",
      corsPreflight: {
        allowHeaders: ["authorization", "content-type"],
        allowMethods: [
          CorsHttpMethod.GET,
          CorsHttpMethod.POST,
          CorsHttpMethod.PATCH,
          CorsHttpMethod.DELETE,
          CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: allowedOrigins,
      },
    });

    const integration = new HttpLambdaIntegration("ApiIntegration", apiHandler);
    for (const route of [
      { path: "/documents", methods: [HttpMethod.GET, HttpMethod.POST] },
      {
        path: "/documents/{id}",
        methods: [HttpMethod.GET, HttpMethod.PATCH, HttpMethod.DELETE],
      },
      { path: "/documents/{id}/restore", methods: [HttpMethod.POST] },
      { path: "/trash", methods: [HttpMethod.GET] },
      { path: "/audit", methods: [HttpMethod.GET] },
      { path: "/months/{ym}", methods: [HttpMethod.GET] },
      { path: "/export.csv", methods: [HttpMethod.GET] },
    ]) {
      httpApi.addRoutes({
        path: route.path,
        methods: route.methods,
        integration,
        authorizer,
      });
    }

    // ── 出力 ──
    new CfnOutput(this, "UserPoolId", { value: userPool.userPoolId });
    new CfnOutput(this, "UserPoolClientId", { value: userPoolClient.userPoolClientId });
    new CfnOutput(this, "ApiUrl", { value: httpApi.apiEndpoint });
    new CfnOutput(this, "BucketName", { value: bucket.bucketName });
    new CfnOutput(this, "ExtractionQueueUrl", { value: extractionQueue.queueUrl });
    new CfnOutput(this, "DbClusterArn", { value: dbCluster.clusterArn });
    new CfnOutput(this, "DbSecretArn", { value: dbCluster.secret?.secretArn ?? "" });
    new CfnOutput(this, "GeminiSecretArn", { value: geminiSecret.secretArn });
  }
}
