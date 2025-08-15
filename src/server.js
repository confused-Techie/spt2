const Frontend = require("./frontend.js");
const Task = require("./task.js");

module.exports =
class Server {
  constructor({ config, log }) {
    this.config = config;
    this.log = log;

    this.frontend = new Frontend(this);
    this.task = new Task(this);
  }

  async initialize() {
    await this.task.initialize();
    await this.frontend.initialize();
  }

  async start() {
    await this.task.start();
    this.frontend.listen();
  }

  async stop() {
    await this.frontend.stop();
  }
}
