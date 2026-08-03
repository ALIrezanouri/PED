/**
 * Vercel serverless entrypoint for the Fastify app.
 *
 * Locally we run a persistent server (src/index.ts). On Vercel every request is
 * a serverless invocation, so we hand the raw request/response to Fastify's
 * underlying HTTP server after it is ready. `vercel.json` rewrites all paths
 * here so Fastify's own router handles routing.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { buildApp } from "../src/app.js";

const app = buildApp();
let ready: Promise<unknown> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!ready) ready = Promise.resolve(app.ready());
  await ready;
  app.server.emit("request", req, res);
}
