const postgres = require("postgres");

module.exports =
class Database {
  constructor(server) {
    this.server = server;
    this.config = this.server.config;
    this.log = this.server.log;

    this.sql = null;
    this.dbTeardown = null; // Used only in dev environments
  }

  async initialize() {
    if (this.config.get("server.dev")) {
      // Dev Setup of database
      const dbSetup = require("../node_modules/@databases/pg-test/jest/globalSetup");
      this.dbTeardown = require("../node_modules/@databases/pg-test/jest/globalTeardown");

      await dbSetup(); // TODO wrap in error handler to warn of docker not running
    }
  }

  start() {
    const postgresOpts = {
      host: this.config.get("database.host"),
      username: this.config.get("database.user"),
      database: this.config.get("database.database"),
      port: this.config.get("database.port")
    };

    if (!this.config.get("dev")) {
      postgresOpts.password = this.config.get("database.pass");
    }

    this.sql = postgres(postgresOpts);
    this.log.debug({
      host: "database",
      short_message: "SQL Connection Initiated"
    });
    // TODO db migrations
  }

  async stop() {
    if (this.sql !== null) {
      await this.sql.end({ timeout: 5 });

      if (this.config.get("server.dev")) {
        await this.dbTeardown();
      }

      this.log.debug({
        host: "database",
        short_message: "SQL Connection Shutdown"
      });
    }
  }

  // Actual Queries

}
