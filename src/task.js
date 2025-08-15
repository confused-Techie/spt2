/**
  Task Runner Class.
  Takes classes defined in the schema with the following anticipated properties:
    - name: Human Readable string for the name
    - schedule: The timetable to run the task on.
        This can be set to the following supported values or a CRON string:
          * `startup`: Executes during startup
          * `shutdown`: Executes during the shutdown process
    - action: An action for the script to execute
*/

const schedule = require("node-schedule");
const { v4: uuidv4 } = require("uuid");

module.exports =
class Task {
  constructor(server) {
    this.server = server;
    this.db = this.server.database;
    this.log = this.server.log;
    this.config = this.server.config;

    this.startupTasks = [];
    this.shutdownTasks = [];
    this.taskRuns = [];
  }

  async initialize() {

    for (const task of this.config.get("tasks")) {
      if (!this.validateTask(task)) {
        this.log.crit({
          host: "task",
          short_message: "Invalid task syntax found",
          _task: task
        });
        continue;
      }

      switch(task.schedule) {
        case "startup": {
          this.startupTasks.push(task);
          break;
        }
        case "shutdown": {
          this.shutdownTasks.push(task);
          break;
        }
        default: {
          const job = schedule.scheduleJob(
            task.schedule,
            async function (task) {
              await this.executeTask(task);
            }.bind(null, task)
          );
        }
      }
    }
  }

  async start() {
    for (const task of this.startupTasks) {
      await this.executeTask(task);
    }
  }

  async stop() {
    for (const task of this.shutdownTasks) {
      await this.executeTask(task);
    }
  }

  async executeTask(task) {
    let taskRunStatus = {
      runtime: new Date().toISOString(),
      exit_code: null,
      exit_details: null,
      task_details: task,
      uuid: uuidv4()
    };

    const builtInTaskHandler = async (scriptSrc) => {
      try {
        const mod = require(scriptSrc);
        const res = await mod(this.server, taskRunStatus.uuid);
        taskRunStatus.exit_code = 0;
        taskRunStatus.exit_details = res;
      } catch(err) {
        this.log.crit({
          host: "task",
          short_message: `The task '${task.name}' seems to have crashed.`,
          _err: err
        });
        taskRunStatus.exit_code = 1;
        taskRunStatus.exit_details = err;
      }
      return;
    };

    if (!this.validateTask(task)) {
      this.log.crit({
        host: "task",
        short_message: "Invalid task syntax found",
        _task: task
      });
      taskRunStatus.exit_code = 255;
      taskRunStatus.exit_details = `Task failed validation!`;
      return;
    }

    this.log.debug({
      host: "task",
      short_message: `Executing task '${task.name}'`
    });

    switch(task.action) {
      case "test": {
        await builtInTaskHandler("./tasks/test.js");
        break;
      }
      default: {
        this.log.crit({
          host: "task",
          short_message: `Unrecognized task '${task.action}' in '${task.name}'.`
        });
        taskRunStatus.exit_code = 2;
        taskRunStatus.exit_details = `Unrecognized task '${task.action}' in '${task.name}'.`;
      }
    }

    this.taskRuns.push(taskRunStatus);
    let logObj = {
      host: "task",
      short_message: `Executed task '${task.name}'`
    };
    for (const key of taskRunStatus) {
      logObj[`_${key}`] = taskRunStatus[key];
    }
    this.log.debug(logObj);
  }

  validateTask(task) {
    if (typeof task.name !== "string" && typeof task.schedule !== "string") {
      return false;
    } else {
      return true;
    }
  }
}
