import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { parseTransactionsCsv } from "./csv.js";
import { analyze } from "./elasticity.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: true, bodyLimit: 25 * 1024 * 1024 });

  app.register(cors, { origin: true });
  app.register(multipart, { limits: { fileSize: 25 * 1024 * 1024 } });

  app.get("/health", async () => ({ status: "ok", service: "elasticity-server" }));
  app.get("/api/health", async () => ({ status: "ok", service: "elasticity-server" }));

  /**
   * POST /api/analyze
   * Accepts either a multipart file field named `file`, or a raw text/csv body.
   * Returns the elasticity analysis (per product & per group + pooled).
   */
  app.post("/api/analyze", async (request, reply) => {
    let csvText: string | null = null;

    const contentType = request.headers["content-type"] ?? "";
    if (contentType.includes("multipart/form-data")) {
      const file = await request.file();
      if (!file) return reply.code(400).send({ error: "No file uploaded (field `file`)." });
      csvText = (await file.toBuffer()).toString("utf-8");
    } else if (typeof request.body === "string") {
      csvText = request.body;
    } else if (request.body && typeof request.body === "object" && "csv" in request.body) {
      csvText = String((request.body as { csv: unknown }).csv);
    }

    if (!csvText || !csvText.trim()) {
      return reply.code(400).send({ error: "Empty CSV payload." });
    }

    const parsed = parseTransactionsCsv(csvText);
    if (!parsed.ok) return reply.code(422).send({ error: parsed.error });

    const result = analyze(parsed.rows);
    return reply.send({ ...result, _meta: { rows_used: parsed.rows.length, rows_skipped: parsed.skipped } });
  });

  // Accept raw CSV bodies as text.
  app.addContentTypeParser(
    ["text/csv", "text/plain", "application/csv"],
    { parseAs: "string" },
    (_req, body, done) => done(null, body),
  );

  return app;
}
