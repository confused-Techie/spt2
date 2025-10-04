const { describe, it, before, mock } = require("node:test");
const Module = require("module");
const assert = require("assert-extensions");

const originalLoad = Module._load;
let config;

describe("initialization", () => {

  it("reads and loads available 'app.json'", (t) => {
    // Setup
    const mocks = {
      fs: t.mock.module("node:fs", {
        namedExports: {
          readdirSync: () => [ "app.yaml", "app.json" ], // Last match wins
          readFileSync: () => "server:\n  port: '8080'",
          writeFileSync: () => {}
        }
      }),
      path: t.mock.module("node:path", {
        namedExports: {
          join: (...xs) => xs.join("/"),
          parse: () => ({ ext: ".yaml" })
        }
      })
    };
    const logMock = {
      debug: t.mock.fn((obj) => obj),
      err: t.mock.fn((obj) => obj),
      warn: t.mock.fn((obj) => obj)
    };

    // Test
    const Config = require("../src/config.js");
    config = new Config("/app", logMock);

    assert.equal(config.resourcePath, "/app");
    assert.equal(config.configFileLocation, "/app/app.json");
    assert.deepEqual(config.settings, { server: { port: 8080 }});
    assert.strictEqual(logMock.debug.mock.callCount(), 1);
    assert.deepEqual(logMock.debug.mock.calls[0].arguments, [{
      host: "config",
      short_message: "Successfully read config from '/app/app.json'."
    }]);

    // Cleanup
    t.mock.reset();
    t.mock.restoreAll();
    delete require.cache[require.resolve("../src/config.js")];
  });

  it("reads and loads available 'app.yaml'", (t) => {
    // Setup
    const mocks = {
      fs: t.mock.module("node:fs", {
        namedExports: {
          readdirSync: () => [ "app.yaml" ],
          readFileSync: () => "server:\n  port: '8080'",
          writeFileSync: () => {}
        }
      }),
      path: t.mock.module("node:path", {
        namedExports: {
          join: (...xs) => xs.join("/"),
          parse: () => ({ ext: ".yaml" })
        }
      })
    };
    const logMock = {
      debug: t.mock.fn((obj) => obj),
      err: t.mock.fn((obj) => obj),
      warn: t.mock.fn((obj) => obj)
    };

    // Test
    const Config = require("../src/config.js");
    config = new Config("/app", logMock);

    assert.equal(config.resourcePath, "/app");
    assert.equal(config.configFileLocation, "/app/app.yaml");
    assert.deepEqual(config.settings, { server: { port: 8080 }});
    assert.strictEqual(logMock.debug.mock.callCount(), 1);
    assert.deepEqual(logMock.debug.mock.calls[0].arguments, [{
      host: "config",
      short_message: "Successfully read config from '/app/app.yaml'."
    }]);

    // Cleanup
    t.mock.reset();
    t.mock.restoreAll();
    delete require.cache[require.resolve("../src/config.js")];
  });

  it("warns when it can't find a valid config", (t) => {
    // Setup
    const mocks = {
      fs: t.mock.module("node:fs", {
        namedExports: {
          readdirSync: () => [],
          readFileSync: () => {},
          writeFileSync: () => {}
        }
      }),
      path: t.mock.module("node:path", {
        namedExports: {
          join: (...xs) => xs.join("/"),
          parse: () => {}
        }
      })
    };
    const logMock = {
      debug: t.mock.fn((obj) => obj),
      err: t.mock.fn((obj) => obj),
      warn: t.mock.fn((obj) => obj)
    };

    // Test
    const Config = require("../src/config.js");
    config = new Config("/app", logMock);

    assert.equal(config.resourcePath, "/app");
    assert.equal(config.configFileLocation, null);
    assert.strictEqual(logMock.warn.mock.callCount(), 1);
    assert.deepEqual(logMock.warn.mock.calls[0].arguments, [{
      host: "config",
      short_message: "Failed to locate a valid configuration file."
    }]);

    // Cleanup
    t.mock.reset();
    t.mock.restoreAll();
    delete require.cache[require.resolve("../src/config.js")];
  });

  it("errors when the config has an unsupported extension", (t) => {
    // NOTE: While funky, still a valid test.
    // We will only attempt to parse a file after matching it's full name, in this
    // case 'app.yaml', but we still have error checking in case we somehow proceed
    // to parse an unsupported extension, as determed by node:path.parse()
    // So in this test we lie in the node:fs.readdirSync() response, and change
    // the extension in the node:path.parse() response.

    // Setup
    const mocks = {
      fs: t.mock.module("node:fs", {
        namedExports: {
          readdirSync: () => [ "app.yaml" ], // It will only continue if it finds a valid name
          readFileSync: () => {},
          writeFileSync: () => {}
        }
      }),
      path: t.mock.module("node:path", {
        namedExports: {
          join: (...xs) => xs.join("/"),
          parse: () => ({ ext: ".toml" }) // We return an unsupported extension
        }
      })
    };
    const logMock = {
      debug: t.mock.fn((obj) => obj),
      err: t.mock.fn((obj) => obj),
      warn: t.mock.fn((obj) => obj)
    };

    // Test
    const Config = require("../src/config.js");
    config = new Config("/app", logMock);

    assert.equal(config.resourcePath, "/app");
    assert.equal(config.configFileLocation, "/app/app.yaml");
    assert.strictEqual(logMock.err.mock.callCount(), 1);
    assert.deepEqual(logMock.err.mock.calls[0].arguments, [{
      host: "config",
      short_message: "Failed to parse configuration file.",
      full_message: "Failed to find supported file type for identified configuration '/app/app.yaml'."
    }]);

    // Cleanup
    t.mock.reset();
    t.mock.restoreAll();
    delete require.cache[require.resolve("../src/config.js")];
  });

  it("errors when a json config doesn't return json", (t) => {
    // Setup
    const mocks = {
      fs: t.mock.module("node:fs", {
        namedExports: {
          readdirSync: () => [ "app.json" ],
          readFileSync: () => {}, // Return an empty object, not JSON
          writeFileSync: () => {}
        }
      }),
      path: t.mock.module("node:path", {
        namedExports: {
          join: (...xs) => xs.join("/"),
          parse: () => ({ ext: ".json" })
        }
      })
    };
    const logMock = {
      debug: t.mock.fn((obj) => obj),
      err: t.mock.fn((obj) => obj),
      warn: t.mock.fn((obj) => obj)
    };

    // Test
    const Config = require("../src/config.js");
    config = new Config("/app", logMock);

    assert.equal(config.resourcePath, "/app");
    assert.equal(config.configFileLocation, "/app/app.json");
    assert.strictEqual(logMock.err.mock.callCount(), 1);
    assert.deepEqual(logMock.err.mock.calls[0].arguments, [{
      host: "config",
      short_message: "Failed to initialize configuration file.",
      _err: new SyntaxError('"undefined" is not valid JSON')
    }]);

    // Cleanup
    t.mock.reset();
    t.mock.restoreAll();
    delete require.cache[require.resolve("../src/config.js")];
  });

  it("errors when a yaml config doesn't return yaml", (t) => {
    // Setup
    const mocks = {
      fs: t.mock.module("node:fs", {
        namedExports: {
          readdirSync: () => [ "app.yaml" ],
          readFileSync: () => "[ [",
          writeFileSync: () => {}
        }
      }),
      path: t.mock.module("node:path", {
        namedExports: {
          join: (...xs) => xs.join("/"),
          parse: () => ({ ext: ".yaml" })
        }
      })
    };
    const logMock = {
      debug: t.mock.fn((obj) => obj),
      err: t.mock.fn((obj) => obj),
      warn: t.mock.fn((obj) => obj)
    };

    // Test
    const Config = require("../src/config.js");
    config = new Config("/app", logMock);

    assert.equal(config.resourcePath, "/app");
    assert.equal(config.configFileLocation, "/app/app.yaml");
    assert.strictEqual(logMock.err.mock.callCount(), 1);
    assert.partialDeepStrictEqual(logMock.err.mock.calls[0].arguments, [{
      host: "config",
      short_message: "Failed to initialize configuration file.",
      // NOTE: We don't test '_err' here since it's a YAMLException, and crafting the right error code
      // by hand proved rather difficult.
    }]);

    // Cleanup
    t.mock.reset();
    t.mock.restoreAll();
    delete require.cache[require.resolve("../src/config.js")];
  });
});
