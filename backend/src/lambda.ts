import configure from "@codegenie/serverless-express";
import app from "./app";

/**
 * Serverless Express handler wrapping the Flight Detective Express app.
 * Automatically adapts AWS Lambda Payload Format Version 2.0 (Lambda Function URLs
 * and API Gateway HTTP API v2) and Payload Format Version 1.0 (API Gateway REST API)
 * into standard Express requests and maps Express responses back to the Lambda format.
 */
export const handler = configure({ app });

export default handler;
