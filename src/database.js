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
    if (this.config.get("dev")) {
      // Dev Setup of database
      const dbSetup = require("../node_modules/@databases/pg-test/jest/globalSetup");
      this.dbTeardown = require("../node_modules/@databases/pg-test/jest/globalTeardown");

      await dbSetup();
    }
  }

  start() {
    const postgresOpts = {
      host: this.config.get("db.host"),
      username: this.config.get("db.user"),
      database: this.config.get("db.database"),
      port: this.config.get("db.port")
    };

    if (!this.config.get("dev")) {
      postgresOpts.password = this.config.get("db.pass");
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

      if (this.config.get("dev")) {
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
