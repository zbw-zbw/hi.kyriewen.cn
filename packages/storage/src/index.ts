import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

/**
 * Cloudflare R2 存储客户端。
 *
 * R2 完全兼容 S3 API，使用 AWS S3 SDK 即可操作。
 * 需要以下环境变量：
 * - R2_ACCOUNT_ID
 * - R2_ACCESS_KEY_ID
 * - R2_SECRET_ACCESS_KEY
 * - R2_BUCKET_NAME
 * - R2_PUBLIC_URL — 公开访问域名（通过 CF 自定义域名绑定）
 */

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (_client) return _client;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Missing R2 env vars: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY'
    );
  }

  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return _client;
}

function getBucket(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error('Missing R2_BUCKET_NAME env var');
  return bucket;
}

function getPublicBaseUrl(): string {
  const url = process.env.R2_PUBLIC_URL;
  if (!url) throw new Error('Missing R2_PUBLIC_URL env var');
  return url.replace(/\/$/, '');
}

/**
 * 上传文件到 R2。
 * @returns 公开访问 URL
 */
export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | ReadableStream,
  contentType: string
): Promise<string> {
  const client = getClient();
  const bucket = getBucket();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return `${getPublicBaseUrl()}/${key}`;
}

/**
 * 从 R2 删除文件。
 */
export async function deleteFile(key: string): Promise<void> {
  const client = getClient();
  const bucket = getBucket();

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

/**
 * 从公开 URL 提取 object key。
 */
export function getKeyFromUrl(url: string): string | null {
  const baseUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, '');
  if (!baseUrl || !url.startsWith(baseUrl)) return null;
  return url.slice(baseUrl.length + 1);
}

/**
 * 生成唯一的文件 key。
 * 格式: {prefix}/{timestamp}-{random}.{ext}
 */
export function generateKey(prefix: string, filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'bin';
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}/${timestamp}-${random}.${ext}`;
}
