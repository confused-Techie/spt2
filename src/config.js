const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");
const keyPathHelpers = require("key-path-helpers");

const defaultConfig = require("./config.default.js");
const configSchema = require("./config.schema.js");

const VALID_CONFIG_FILENAMES = [ "app.yaml", "app.json" ];

module.exports =
class Config {
  constructor(resourcePath, log) {
    this.resourcePath = resourcePath;
    this.settings = {};
    this.configFileLocation = null;

    this.default = defaultConfig;
    this.schema = configSchema;
    this.log = log;

    this.initialize();
  }

  initialize() {
    // Load config from disk
    const files = fs.readdirSync(this.resourcePath);

    for (const file of files) {
      // Check if we can find a valid config filename
      if (VALID_CONFIG_FILENAMES.includes(file)) {
        this.configFileLocation = path.join(this.resourcePath, file);
      }
    }

    if (typeof this.configFileLocation === "string") {
      const configFileExt = path.parse(this.configFileLocation).ext;

      if (configFileExt === ".json") {
        try {
          this.settings = JSON.parse(fs.readFileSync(this.configFileLocation, { encoding: "utf-8" }));
          this.log.debug({
            host: "config",
            short_message: `Successfully read config from '${this.configFileLocation}'.`
          });
        } catch(err) {
          this.log.err({
            host: "config",
            short_message: "Failed to initialize configuration file.",
            _err: err
          });
        }
      } else if (configFileExt === ".yaml") {
        try {
          let fileContent = fs.readFileSync(this.configFileLocation, { encoding: "utf-8" });
          this.settings = yaml.load(fileContent);
          this.log.debug({
            host: "config",
            short_message: `Successfully read config from '${this.configFileLocation}'.`
          });
        } catch(err) {
          this.log.err({
            host: "config",
            short_message: "Failed to initialize configuration file.",
            _err: err
          });
        }
      } else {
        // Couldn't parse config
        this.log.err({
          host: "config",
          short_message: "Failed to parse configuration file.",
          full_message: `Failed to find supported file type for identified configuration '${this.configFileLocation}'.`
        });
      }
    } else {
      // Couldn't find config
      this.log.warn({
        host: "config",
        short_message: "Failed to locate a valid configuration file."
      });
    }
  }

  get(keyPath) {
    let value =
      keyPathHelpers.getValueAtKeyPath(this.settings, keyPath) ??
      keyPathHelpers.getValueAtKeyPath(this.default, keyPath) ??
      process.env[keyPath] ??
      null;
    return value;
  }

  set(keyPath, value) {
    // TODO observe pulsar/src/config.js#setRawValue more closely for handling
    // errors and values that match the default
    keyPathHelpers.setValueAtKeyPath(this.settings, keyPath, value);
    // TODO Maybe attempt to validate key values?
    // TODO updating settings via the website will return 'on' and 'off' for booleans.
    // Plus will convert numbers into strings. We should use the schema to validate
    // what type the setting should be, and attempt to figure out any modifications
    // from there.
    
    // Now write back changes to disk

    const configFileExt = path.parse(this.configFileLocation).ext;

    if (configFileExt === ".json") {
      try {
        fs.writeFileSync(this.configFileLocation, JSON.stringify(this.settings, null, 2), { encoding: "utf-8" });
      } catch(err) {
        this.log.crit({
          host: "config",
          short_message: "Unable to save configuration file changes.",
          full_message: `Failed to save key '${key}' with new value '${value}' to configuration file at '${this.configFileLocation}'.`,
          _err: err.toString()
        });
      }
    } else if (configFileExt === ".yaml") {
      try {
        fs.writeFileSync(this.configFileLocation, yaml.dump(this.settings), { encoding: "utf-8" });
      } catch(err) {
        this.log.crit({
          host: "config",
          short_message: "Unable to save configuration file changes.",
          full_message: `Failed to save key '${key}' with new value '${value}' to configuration file at '${this.configFileLocation}'.`,
          _err: err.toString()
        });
      }
    }
  }

}
