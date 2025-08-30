/**
  When interacting with methods in this class to manipulate the database, keep
  in mind that queries will respond with status objects, not errors.
  Inside the status object is the following properties:

  - `ok` [Boolean]: Mandatory, indicates success or failure.
  - `content` [Any]: The optional results of the query.
  - `code` [Integer]: The optional error code of what went wrong. Follows suite
      of HTTP status codes, with the following valid possibilities:
        * `404`: not found
        * `500`: server error
*/
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

      try {
        await dbSetup();
      } catch(err) {
        this.log.panic({
          host: "database",
          short_message: "Failed to startup dev database!",
          full_message: "Failed to start development database, is Docker running?",
          _err: err
        });
      }
    }
  }

  async start() {
    const postgresOpts = {
      host: "",
      username: "",
      database: "",
      port: ""
    };

    if (this.config.get("server.dev")) {
      const dbUrl = process.env.DATABASE_URL;
      const dbUrlReg = /postgres:\/\/([\/\S]+)@([\/\S]+):(\d+)\/([\/\S]+)/;
      const dbUrlParsed = dbUrlReg.exec(dbUrl);

      if (dbUrlParsed?.length > 4) {
        postgresOpts.host = dbUrlParsed[2];
        postgresOpts.username = dbUrlParsed[1];
        postgresOpts.database = dbUrlParsed[4];
        postgresOpts.port = parseInt(dbUrlParsed[3], 10);
      } else {
        this.log.crit({
          host: "database",
          short_message: "Couldn't decode dev 'DATABASE_URL' string."
        });
      }
    } else {
      // Production Mode
      postgresOpts.host = this.config.get("database.host");
      postgresOpts.username = this.config.get("database.username");
      postgresOpts.database = this.config.get("database.database");
      postgresOpts.port = this.config.get("database.port");
      postgresOpts.password = this.config.get("database.password");
    }

    this.sql = postgres(postgresOpts);

    this.log.debug({
      host: "database",
      short_message: "SQL Connection Initiated"
    });


    // DB Migrations
    // While tools exist to handle this, may be the simplest to just do these ourselves
    // Most tools seem to want to run via cli and all sorts of fancy business, but...
    try {
      await this.migrations();
      this.log.debug({
        host: "database",
        short_message: "Preformed migrations"
      });
    } catch(err) {
      this.log.panic({
        host: "database",
        short_message: "Failed to complete migrations!",
        _err: err
      });
    }
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

  async migrations() {
    // try...catch handler is elsewhere, only focus on migrations here
    // Keep in mind these migrations must be compatible with `https://github.com/confused-Techie/student-point-tracker`
    await this.sql`CREATE EXTENSION pgcrypto;`;
    await this.sql`CREATE TABLE IF NOT EXISTS students ();`;
    await this.sql`ALTER TABLE students ADD COLUMN student_id BIGINT NOT NULL PRIMARY KEY;`;
    await this.sql`ALTER TABLE students ADD COLUMN first_name VARCHAR(128) NOT NULL;`;
    await this.sql`ALTER TABLE students ADD COLUMN last_name VARCHAR(128) NOT NULL;`;
    await this.sql`ALTER TABLE students ADD COLUMN created TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;`;
    await this.sql`ALTER TABLE students ADD COLUMN enabled BOOLEAN NOT NULL DEFAULT TRUE;`;
    await this.sql`ALTER TABLE students ADD COLUMN points BIGINT NOT NULL DEFAULT 0;`;

    await this.sql`CREATE TYPE pointsAction AS ENUM('added', 'removed');`;

    await this.sql`CREATE TABLE IF NOT EXISTS points ();`;
    await this.sql`ALTER TABLE points ADD COLUMN point_id UUID DEFAULT GEN_RANDOM_UUID() PRIMARY KEY;`;
    await this.sql`ALTER TABLE points ADD COLUMN student BIGINT NOT NULL REFERENCES students(student_id);`;
    await this.sql`ALTER TABLE points ADD COLUMN points_modified BIGINT NOT NULL DEFAULT 0;`;
    await this.sql`ALTER TABLE points ADD COLUMN points_action pointsAction NOT NULL;`;
    await this.sql`ALTER TABLE points ADD COLUMN created TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;`;
    await this.sql`ALTER TABLE points ADD COLUMN points_before BIGINT NOT NULL;`;
    await this.sql`ALTER TABLE points ADD COLUMN points_after BIGINT NOT NULL;`;
    await this.sql`ALTER TABLE points ADD COLUMN reason text;`;

    // === spt2 1.0 Changes
    await this.sql`ALTER TABLE points RENAME COLUMN points_before TO total_points_before;`;
    await this.sql`ALTER TABLE points RENAME COLUMN points_after TO total_points_after;`;
  }

  // Actual Queries
  async getStudentByID(id) {
    const command = await this.sql`
      SELECT *
      FROM students
      WHERE student_id = ${id};
    `;

    return command.count !== 0
      ? { ok: true, content: command[0] }
      : {
          ok: false,
          content: `Student ${id} not found.`,
          code: 404
        };
  }

  async addPointsToStudent(id, points, reason) {
    let student = await this.getStudentByID(id);

    if (!student.ok) {
      return student;
    }

    const newPointsTotal = parseInt(student.content.points, 10) + parseInt(points, 10);

    return await this.sql
      .begin(async (sqlTrans) => {
        let insertNewPoints = {};
        try {
          insertNewPoints = await sqlTrans`
            INSERT INTO points (student, points_modified, points_action, total_points_before, total_points_after, reason)
            VALUES (${id}, ${points}, 'added', ${student.content.points}, ${newPointsTotal}, ${reason})
            RETURNING point_id;
          `;
        } catch(e) {
          throw `A constraint has been voilated while inserting ${id}'s new points! ${e.toString()}`;
        }

        if (!insertNewPoints.count) {
          throw `Cannot insert points to ${id}!`;
        }

        // Add the new total points
        let modifyPoints = {};
        try {
          modifyPoints = await sqlTrans`
            UPDATE students
            SET points = ${newPointsTotal}
            WHERE student_id = ${id} AND enabled = TRUE
            RETURNING student_id;
          `;
        } catch(e) {
          throw `A constraint has been voilated while inserting ${id}'s new points! ${e.toString()}`;
        }

        if (!modifyPoints.count) {
          throw `Cannot insert points to ${id}!`;
        }

        return { ok: true };
      })
      .catch((err) => {
        return {
          ok: false,
          content: err,
          code: 500
        };
      });
  }

  async addStudent(obj) {
    const command = await this.sql`
      INSERT INTO students (student_id, first_name, last_name)
      VALUES (${obj.student_id}, ${obj.first_name}, ${obj.last_name})
      RETURNING student_id;
    `;

    return command.count !== 0
      ? { ok: true, content: command[0] }
      : { ok: false, content: command, code: 500 };
  }

  async disableStudentByID(id) {
    const command = await this.sql`
      UPDATE students
      SET enabled = FALSE
      WHERE student_id = ${id}
      RETURNING student_id;
    `;

    return command.count !== 0
      ? { ok: true, content: command[0] }
      : { ok: false, content: command, code: 500 };
  }

  async getAllStudents() {
    const command = await this.sql`
      SELECT *
      FROM students
      WHERE enabled = TRUE;
    `;

    return command.count !== 0
      ? { ok: true, content: command }
      : { ok: false, content: "no students found", code: 404 };
  }

  async getAllPoints() {
    const command = await this.sql`
      SELECT *
      FROM points;
    `;

    return command.count !== 0
      ? { ok: true, content: command }
      : { ok: false, content: "no points found", code: 404 };
  }

  async getPointsByStudentID(id) {
    const command = await this.sql`
      SELECT *
      FROM points
      WHERE student = ${id}
      ORDER BY created DESC;
    `;

    return command.count !== 0
      ? { ok: true, content: command }
      : { ok: false, content: `Student ${id} not found, or no points found.`, code: 404 };
  }

  async getPointsByStudentIdByDate(id, date) {
    /**
      * It is mandatory that the dates provided to this method are exactly as follows:
      * 'YYYY-MM-DDTHH:mi:ss.msZ'
      * A format loosely based off ISO8601
      * And what you are provided using JavaScript: 'new Date().toISOString()'
      * Any other format WILL NOT WORK.
    */
    const modifiedDate = date.replace("T", " "); // remove 'T' const from JavaScript
    // timezone. Seems this value causes hour parsing within PostgreSQL to fail.
    const command = this.sql`
      SELECT *
      FROM points
      WHERE student = ${id} AND created >= to_timestamp(${modifiedDate}, 'YYYY-MM-DD HH24:MI:SS.MSZ') at time zone 'utc'
      ORDER BY created DESC;
    `;

    return command.count !== 0
      ? { ok: true, content: command }
      : { ok: false, content: `Student ${id} not found, or points not found.`, code: 404 };
  }

  async removePointsFromStudent(id, points, reason) {
    let student = await this.getStudentByID(id);

    if (!student.ok) {
      return student;
    }

    let newPointsTotal = parseInt(student.content.points, 10) - parseInt(points, 10);

    if (newPointsTotal < 0 && this.config.get("server.allowNegativePoints")) {
      newPointsTotal = 0;
    }

    return await this.sql
      .begin(async (sqlTrans) => {
        let insertNewPoints = {};
        try {
          insertNewPoints = await sqlTrans`
            INSERT INTO points (student, points_modified, points_action, total_points_before, total_points_after, reason)
            VALUES (${id}, ${points}, 'removed', ${student.content.points}, ${newPointsTotal}, ${reason})
            RETURNING point_id;
          `;
        } catch(e) {
          throw `A constraint has been voilated while removing ${id}'s new negative points! ${e.toString()}`;
        }

        if (!insertNewPoints.count) {
          throw `Cannot remove points from ${id}!`;
        }

        // Add the new total points
        let modifyPoints = {};
        try {
          modifyPoints = await sqlTrans`
            UPDATE students
            SET points = ${newPointsTotal}
            WHERE student_id = ${id} AND enabled = TRUE
            RETURNING student_id;
          `;
        } catch(e) {
          throw `A constraint has been voilated while removing ${id}'s new negative points! ${e.toString()}`;
        }

        if (!modifyPoints.count) {
          throw `Cannot remove points from ${id}!`;
        }

        return { ok: true };
      })
      .catch((err) => {
        return {
          ok: false,
          content: err,
          code: 500
        };
      });
  }
  // TODO see if we need to migrate the remove student method
  async searchStudent(query, page) {
    const limit = this.config.get("server.paginationLimit");
    const offset = page > 1 ? (page - 1) * limit : 0;

    const wordSeparators = /[-. ]/g; // Word Separators: - . SPACE
    const searchTerm =
      "%" + query.toLowerCase().replace(wordSeparators, "%") + "%";

    const command = await this.sql`
      SELECT *
      FROM students
      WHERE
      (
        LOWER(first_name) LIKE ${searchTerm}
        OR LOWER(last_name) LIKE ${searchTerm}
        OR CAST(student_id AS TEXT) LIKE ${searchTerm}
      ) AND enabled = TRUE
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const resultCount = command.length ?? 0;
    const quotient = Math.trunc(resultCount / limit);
    const remainder = resultCount % limit;
    const totalPages = quotient + (remainder > 0 ? 1 : 0);

    return {
      ok: true,
      content: command,
      pagination: {
        count: resultCount,
        page: page < totalPages ? page : totalPages,
        total: totalPages,
        limit: limit
      }
    };
  }

}
