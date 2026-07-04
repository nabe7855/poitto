"use strict";
// StorageAdapter（S3 実装）。原本の署名付きURL発行・取得。
// 移植時はこのファイルを別ストレージ実装に差し替える。

const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const client = new S3Client({});
const bucket = process.env.BUCKET_NAME;

/** アップロード用の署名付きURL（PUT） */
async function presignPut(key, contentType, expiresIn = 300) {
  const cmd = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  return getSignedUrl(client, cmd, { expiresIn });
}

/** 参照用の署名付きURL（GET） */
async function presignGet(key, expiresIn = 300) {
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, cmd, { expiresIn });
}

/** オブジェクト本体をバイト列で取得 */
async function getBytes(key) {
  const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  return Buffer.from(await res.Body.transformToByteArray());
}

module.exports = { presignPut, presignGet, getBytes, bucket };
