#!/usr/bin/env node

// Set resourcePath
// This would be wherever we want to collect data such as our config from
let resourcePath;

// if (process.argv.length > 2) {
//   resourcePath = process.argv[3];
// } else if (typeof process.env.STP_RESOURCE_PATH === "string") {
//   resourcePath = process.env.STP_RESOURCE_PATH;
// } else {
//   resourcePath = process.cwd();
// }
//
// process.resourcePath = resourcePath;
//

resourcePath = "./demo"; // TODO

// Handle initial server startup
const Log = require("../src/log.js");
const Config = require("../src/config.js");
const Server = require("../src/server.js");

const log = new Log();

// Add cli log method
log.send.push((obj) => {
  console.log(obj);
});

log.notice({
  host: "bootstrap",
  short_message: "Initializing Server"
});

const config = new Config(resourcePath, log);
const server = new Server({
  config: config,
  log: log
});

(async () => {
  await server.initialize();

  server.start();
})();


process.on("SIGTERM", async () => {
  await exterminate("SIGTERM");
});

process.on("SIGINT", async () => {
  await exterminate("SIGINT");
});

async function exterminate(callee) {
  log.notice({
    host: "bootstrap",
    short_message: `${callee} signal received: Shutting down server.`
  });

  await server.stop();

  process.exit(0);
}
