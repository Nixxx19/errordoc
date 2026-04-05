import type { Matcher } from "../types.js";
import { extractGroup } from "../utils/extract.js";

export const awsAccessDenied: Matcher = {
  id: "aws-access-denied",
  name: "AWS AccessDenied",
  frameworks: ["aws", "node"],
  test: (input) => /AccessDenied|Access Denied/i.test(input) && /AWS|S3|IAM|s3:|arn:/i.test(input),
  match(input) {
    const resource = extractGroup(input, /(?:resource|bucket|arn)[:\s]+["']?(\S+?)["']?(?:\s|$)/i);
    const action = extractGroup(input, /Action[:\s]+["']?(\S+?)["']?(?:\s|$)/i);

    return {
      id: this.id,
      pattern: "AWS AccessDenied",
      explanation: `Access denied${resource ? ` for resource "${resource}"` : ""}${action ? ` (action: ${action})` : ""}. Your IAM user/role doesn't have the required permissions.`,
      fixes: [
        { description: "Check your IAM policy and ensure the required action is allowed", safe: false },
        { description: "Verify your AWS credentials are correct", command: "aws sts get-caller-identity", safe: true },
        { description: "Check the S3 bucket policy if accessing S3 resources", safe: false },
        { description: "If using temporary credentials, check they haven't expired", safe: false },
      ],
      confidence: 0.93,
      category: "permission",
      framework: "aws",
      matched: input.match(/AccessDenied|Access Denied/i)![0],
    };
  },
};

export const awsNoSuchBucket: Matcher = {
  id: "aws-no-such-bucket",
  name: "AWS NoSuchBucket",
  frameworks: ["aws", "node"],
  test: (input) => /NoSuchBucket/.test(input),
  match(input) {
    const bucket = extractGroup(input, /(?:bucket|Bucket)[:\s]+["']?(\S+?)["']?(?:\s|$)/i) ??
      extractGroup(input, /NoSuchBucket[:\s]+["']?(\S+?)["']?/);

    return {
      id: this.id,
      pattern: "AWS NoSuchBucket",
      explanation: `The S3 bucket${bucket ? ` "${bucket}"` : ""} does not exist. It may have been deleted, the name is wrong, or it's in a different region.`,
      fixes: [
        { description: "Check the bucket name for typos", safe: false },
        { description: "List your S3 buckets", command: "aws s3 ls", safe: true },
        { description: "Check that you're using the correct AWS region", safe: false },
        { description: "Create the bucket if it should exist", command: bucket ? `aws s3 mb s3://${bucket}` : undefined, safe: false },
      ],
      confidence: 0.95,
      category: "config",
      framework: "aws",
      matched: input.match(/NoSuchBucket\S*/)![0],
    };
  },
};

export const awsNoSuchKey: Matcher = {
  id: "aws-no-such-key",
  name: "AWS NoSuchKey",
  frameworks: ["aws", "node"],
  test: (input) => /NoSuchKey/.test(input),
  match(input) {
    const key = extractGroup(input, /(?:key|Key)[:\s]+["']?(\S+?)["']?(?:\s|$)/i);

    return {
      id: this.id,
      pattern: "AWS NoSuchKey",
      explanation: `The S3 object key${key ? ` "${key}"` : ""} does not exist in the bucket. The file hasn't been uploaded or the path is wrong.`,
      fixes: [
        { description: "Check the object key/path for typos (S3 keys are case-sensitive)", safe: false },
        { description: "List objects in the bucket to verify the key exists", command: "aws s3 ls s3://your-bucket/ --recursive", safe: true },
        { description: "Check that the file was uploaded successfully", safe: false },
      ],
      confidence: 0.94,
      category: "runtime",
      framework: "aws",
      matched: input.match(/NoSuchKey/)![0],
    };
  },
};

export const awsInvalidAccessKey: Matcher = {
  id: "aws-invalid-access-key",
  name: "AWS InvalidAccessKeyId",
  frameworks: ["aws", "node"],
  test: (input) => /InvalidAccessKeyId|InvalidClientTokenId/i.test(input),
  match(input) {
    return {
      id: this.id,
      pattern: "AWS InvalidAccessKeyId",
      explanation: "The AWS access key ID is invalid or doesn't exist. The credentials may be wrong, rotated, or the IAM user was deleted.",
      fixes: [
        { description: "Verify your AWS credentials", command: "aws sts get-caller-identity", safe: true },
        { description: "Check your environment variables or ~/.aws/credentials file", command: "cat ~/.aws/credentials", safe: true },
        { description: "Regenerate access keys in the IAM console if needed", safe: false },
        { description: "Check that AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set correctly", safe: false },
      ],
      confidence: 0.95,
      category: "auth",
      framework: "aws",
      matched: input.match(/InvalidAccessKeyId|InvalidClientTokenId/i)![0],
    };
  },
};

export const awsExpiredToken: Matcher = {
  id: "aws-expired-token",
  name: "AWS ExpiredToken",
  frameworks: ["aws", "node"],
  test: (input) => /ExpiredToken|TokenExpired|expired.*token|token.*expired/i.test(input) && /AWS|aws|arn:|s3:/i.test(input),
  match(input) {
    return {
      id: this.id,
      pattern: "AWS ExpiredToken",
      explanation: "The AWS security token has expired. Temporary credentials (STS, SSO, assumed roles) have a limited lifetime.",
      fixes: [
        { description: "Refresh your AWS SSO session", command: "aws sso login", safe: true },
        { description: "If using STS, request new temporary credentials", safe: false },
        { description: "If using MFA, re-authenticate and get new session tokens", safe: false },
        { description: "Check that your system clock is accurate (time skew can cause token expiry)", safe: false },
      ],
      confidence: 0.92,
      category: "auth",
      framework: "aws",
      matched: input.match(/ExpiredToken|TokenExpired|expired.*token|token.*expired/i)![0],
    };
  },
};

export const awsLambdaTimeout: Matcher = {
  id: "aws-lambda-timeout",
  name: "AWS Lambda Timeout",
  frameworks: ["aws", "node"],
  test: (input) => /Task timed out after \d+.*seconds|Lambda.*timeout|FUNCTION_INVOCATION_TIMEOUT/i.test(input),
  match(input) {
    const seconds = extractGroup(input, /timed? out after (\d+(?:\.\d+)?)\s*(?:seconds|sec|s)/i);

    return {
      id: this.id,
      pattern: "Lambda Timeout",
      explanation: `Lambda function timed out${seconds ? ` after ${seconds} seconds` : ""}. The function didn't complete within the configured timeout limit.`,
      fixes: [
        { description: "Increase the Lambda timeout in your function configuration (max 900s / 15 min)", safe: false },
        { description: "Optimize the function: reduce cold starts, use connection pooling, cache results", safe: false },
        { description: "If calling external services, add timeouts to those calls to fail fast", safe: false },
        { description: "Consider using Step Functions for long-running workflows", safe: false },
      ],
      confidence: 0.94,
      category: "runtime",
      framework: "aws",
      matched: input.match(/Task timed out after \d+.*seconds|Lambda.*timeout|FUNCTION_INVOCATION_TIMEOUT/i)![0],
    };
  },
};

export const awsLambdaMemory: Matcher = {
  id: "aws-lambda-memory",
  name: "AWS Lambda Out of Memory",
  frameworks: ["aws", "node"],
  test: (input) => /Runtime\.ExitError|Runtime exited.*signal|memory.*size.*limit.*exceeded|Process exited before completing/i.test(input) && /Lambda|lambda|AWS/i.test(input),
  match(input) {
    const memorySize = extractGroup(input, /(\d+)\s*MB/);

    return {
      id: this.id,
      pattern: "Lambda Out of Memory",
      explanation: `Lambda function ran out of memory${memorySize ? ` (configured: ${memorySize}MB)` : ""}. The function's memory usage exceeded the configured limit.`,
      fixes: [
        { description: "Increase the Lambda memory allocation (also increases CPU proportionally)", safe: false },
        { description: "Profile memory usage and optimize: stream large files instead of loading them into memory", safe: false },
        { description: "Use /tmp storage (up to 10GB) for large file processing", safe: false },
        { description: "Consider splitting the workload across multiple invocations", safe: false },
      ],
      confidence: 0.88,
      category: "memory",
      framework: "aws",
      matched: input.match(/Runtime\.ExitError|Runtime exited.*signal|memory.*size.*limit.*exceeded|Process exited before completing/i)![0],
    };
  },
};

export const awsRegionNotFound: Matcher = {
  id: "aws-region-not-found",
  name: "AWS Region Not Found",
  frameworks: ["aws", "node"],
  test: (input) => /Could not load credentials|Missing region|ConfigError.*region|region.*not.*(?:found|set|configured)/i.test(input) && /AWS|aws/i.test(input),
  match(input) {
    return {
      id: this.id,
      pattern: "AWS Region Not Configured",
      explanation: "No AWS region is configured. The SDK doesn't know which region to send requests to.",
      fixes: [
        { description: "Set the AWS_REGION environment variable", command: "export AWS_REGION=us-east-1", safe: false },
        { description: "Configure a default region", command: "aws configure set region us-east-1", safe: false },
        { description: "Set the region in your SDK client: new S3Client({ region: 'us-east-1' })", safe: false },
        { description: "Check ~/.aws/config for a [default] profile with a region", command: "cat ~/.aws/config", safe: true },
      ],
      confidence: 0.88,
      category: "config",
      framework: "aws",
      matched: input.match(/Could not load credentials|Missing region|ConfigError.*region|region.*not.*(?:found|set|configured)/i)![0],
    };
  },
};
