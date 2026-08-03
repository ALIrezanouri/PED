import { buildApp } from "./app.js";

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";

const app = buildApp();
app
  .listen({ port, host })
  .then((addr) => app.log.info(`elasticity-server listening on ${addr}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
