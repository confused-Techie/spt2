const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");

const defaultConfig = require("./app.default.js");

const VALID_CONFIG_FILENAMES = [ "app.yaml", "app.json" ];

module.exports =
class Config {
  constructor(resourcePath, log) {
    this.resourcePath = resourcePath;
    this.settings = {};
    this.configFileLocation = null;

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

  get(key) {
    if (this.settings[key]) {
      return this.settings[key];
    } else {
      return defaultConfig[key];
    }
  }

  set(key, value) {
    this.settings[key] = value;
    // TODO Maybe attempt to validate key values?
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
