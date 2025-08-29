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

// Pre-emptively capture all `console` output
// But save instance of original `console.`
const originalConsole = {
  log: console.log,
  error: console.error,
  info: console.info
};

console.log = (data) => {
  log.info(data);
};

console.error = (data) => {
  log.err(data);
};

console.debug = (data) => {
  log.debug(data);
};

console.info = (data) => {
  log.info(data);
};

console.warn = (data) => {
  log.warn(data);
};

// Add cli log method
log.send.push((obj) => {
  if (obj.level <= 3) {
    originalConsole.error(obj);
  } else if (obj.level <= 6) {
    originalConsole.log(obj);
  } else {
    originalConsole.info(obj);
  }
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
