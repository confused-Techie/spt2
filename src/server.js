const Frontend = require("./frontend.js");
const Task = require("./task.js");
const Endpoints = require("./endpoints.js");
const Auth = require("./auth.js");
const Database = require("./database.js");

module.exports =
class Server {
  constructor({ config, log }) {
    this.config = config;
    this.log = log;

    this.frontend = new Frontend(this);
    this.task = new Task(this);
    this.endpoints = new Endpoints(this);
    this.auth = new Auth(this);
    this.database = new Database(this);

    this.frontend.endpointSetupFuncs.push((frontend) => {
      // Used to help the endpoint setup maintain `this` context
      this.endpoints.endpointSetupFunc(frontend);
    });
  }

  async initialize() {
    await this.database.initialize();
    await this.task.initialize();
    await this.frontend.initialize();
  }

  async start() {
    await this.task.start();
    this.database.start();
    await this.frontend.listen();
  }

  async stop() {
    await this.frontend.stop();
    await this.database.stop();
  }
}
