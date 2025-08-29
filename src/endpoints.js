/**
  This file contains the setup for all non-authentication related endpoints.
*/

const path = require("node:path");
const ejs = require("ejs");
const utils = require("./utils.js");

module.exports =
class Endpoints {
  constructor(server) {
    this.server = server;
    this.config = this.server.config;
    this.log = this.server.log;
  }

  endpointSetupFunc(frontend) {
    // This function is added to `frontend.endpointSetupFuncs` array, and is
    // called to setup all endpoints contained within this class.

    // === Built-In ===
    // GET:/oauth2/redirect - Setup for auth, callback for google login
    // GET:/login - Setup for auth, default login prompt
    // GET:/requestLogin - Setup for auth, failed login redirect (reconsider?) TODO

    // === Frontend: Main ===
    frontend.app.get("/", this.getHome.bind(this));
    frontend.app.get("/students", this.getStudents.bind(this));
    frontend.app.get("/students/:id", this.getStudentsId.bind(this));
    frontend.app.get("/points", this.getPoints.bind(this));

    // === Frontend: Util ===
    frontend.app.get("/requestLogin", this.getRequestLogin.bind(this));
    frontend.app.get("/settings", this.getSettings.bind(this));
    frontend.app.post("/settings", this.postSettings.bind(this));
    frontend.app.get("/sessions", this.getSessions.bind(this));
    frontend.app.get("/logs", this.getLogs.bind(this));

    // === Codes ===
    frontend.app.get("/codes/403", this.getCodes403.bind(this));
    frontend.app.get("/codes/404", this.getCodes404.bind(this));
    frontend.app.get("/codes/500", this.getCodes500.bind(this));

    // === API ===
    frontend.app.delete("/api/notification/:id", this.deleteApiNotificationId.bind(this));

    // === Resources ===
    frontend.app.get("/resources/site.js", (req, res) => {
      res.sendFile(path.resolve("./static/site.js"));
    });

  }

  // === Utility ===
  shouldUserBeRedirected(user) {
    // Takes a user object and determines the if and where to redirect any given user.
    if (
      (typeof user !== "object" || Object.keys(user).length < 1)
      && this.config.get("authentication.forceAuthentication")
    ) {
      // The user is not logged in, and forceAuthentication is enabled
      return {
        status: true,
        location: "/login" // TODO should we redirect to requestLogin
      };
    } else { // TODO student redirection
      // There is no need to redirect the user
      return {
        status: false,
        location: ""
      };
    }
  }

  // === Frontend: Main ===
  async getHome(req, res) {
    const user = this.server.auth.getUserFromRequest(req);
    const redirection = this.shouldUserBeRedirected(user);

    if (redirection.status) {
      res.redirect(redirection.location);
    }

    // Nothing specific to check for access, so will serve the homepage to them
    // and let the different aspects check for access
    const notifications = this.server.notifications.getNotificationsForUser(user.email);

    const template = await ejs.renderFile(
      "./views/pages/home.ejs",
      {
        title: "Home",
        content: {},
        config: this.config,
        canPreformAction: (permission) => { return this.server.auth.canUserPreformAction(user, permission); },
      },
      {
        views: [path.resolve("./views")]
      }
    );

    res.set("Content-Type", "text/html");
    res.status(200).send(template);
  }

  async getStudents(req, res) {
    const user = this.server.auth.getUserFromRequest(req);
    const redirection = this.shouldUserBeRedirected(user);

    if (redirection.status) {
      res.redirect(redirection.location);
    }

    const hasAccess = this.server.auth.canUserPreformAction(user, "view:database.students");

    if (!hasAccess) {
      res.status(303).redirect("/codes/403");
    }

    const notifications = this.server.notifications.getNotificationsForUser(user.email);

    try {
      const students = await this.server.database.getAllStudents();

      if (!students.ok) {
        if (students.code === 404) {
          res.status(303).redirect("/codes/404");
        } else {
          res.status(303).redirect("/codes/500");
        }
      } else {
        const template = await ejs.renderFile(
          "./views/pages/students.ejs",
          {
            title: "Students",
            content: {
              students: students.content
            },
            notifications: notifications
          },
          {
            views: [path.resolve("./views")]
          }
        );

        res.set("Content-Type", "text/html");
        res.status(200).send(template);
      }

    } catch(err) {
      this.log.crit({
        host: "endpoints",
        short_message: "An error in 'database.getAllStudents' cased a page to crash",
        _err: err,
        _page: "/students"
      });

      res.status(303).redirect("/codes/500");
    }
  }

  async getStudentsId(req, res) {
    const user = this.server.auth.getUserFromRequest(req);
    const redirection = this.shouldUserBeRedirected(user);

    if (redirection.status) {
      res.redirect(redirection.location);
    }

    const hasAccess = this.server.auth.canUserPreformAction(user, "view:database.students");

    if (!hasAccess) {
      res.status(303).redirect("/codes/403");
    }

    const notifications = this.server.notifications.getNotificationsForUser(user.email);

    try {
      const studentId = req.params.id; // TODO Validation?
      const student = await this.server.database.getStudentByID(studentId);
      const studentPoints = await this.server.database.getPointsByStudentID(studentId);

      if (!student.ok) {
        if (student.code === 404) {
          res.status(303).redirect("/codes/404");
        } else {
          res.status(303).redirect("/codes/500");
        }
      } else {
        if (!studentPoints.ok && studentPoints.code !== 404) {
          // We only check for the points failing if it's NOT not found, because
          // a student may not have any points
          res.status(303).redirect("/codes/500");
        } else {
          // Everything succeeded as expected, but still check for a bad student points
          const template = await ejs.renderFile(
            "./views/pages/studentsId.ejs",
            {
              title: `${student.content.last_name}, ${student.content.first_name}`,
              content: {
                student: student.content,
                points: studentPoints.ok ? studentPoints.content : []
              },
              notifications: notifications
            },
            {
              views: [path.resolve("./views")]
            }
          );
          res.set("Content-Type", "text/html");
          res.status(200).send(template);
        }
      }
    } catch(err) {
      this.log.crit({
        host: "endpoints",
        short_message: "An error in the db caused a page to crash",
        _err: err,
        _page: "/students/:id"
      });
      res.status(303).redirect("/codes/500");
    }
  }

  async getPoints(req, res) {
    const user = this.server.auth.getUserFromRequest(req);
    const redirection = this.shouldUserBeRedirected(user);

    if (redirection.status) {
      res.redirect(redirection.location);
    }

    const hasAccess = this.server.auth.canUserPreformAction(user, "view:database.points");

    if (!hasAccess) {
      res.status(303).redirect("/codes/403");
    }

    const notifications = this.server.notifications.getNotificationsForUser(user.email);

    try {
      const points = await this.server.database.getAllPoints();

      if (!points.ok) {
        if (points.code === 404) {
          res.status(303).redirect("/codes/404");
        } else {
          res.status(303).redirect("/codes/500");
        }
      } else {
        const template = await ejs.renderFile(
          "./views/pages/points.ejs",
          {
            title: "Points",
            content: {
              points: points.content
            },
            notifications: notifications
          },
          {
            views: [path.resolve("./views")]
          }
        );

        res.set("Content-Type", "text/html");
        res.status(200).send(template);
      }

    } catch(err) {
      this.log.crit({
        host: "endpoints",
        short_message: "An error in 'database.getAllStudents' cased a page to crash",
        _err: err,
        _page: "/students"
      });

      res.status(303).redirect("/codes/500");
    }
  }

  // === Frontend: Util ===
  async getRequestLogin(req, res) {
    // Since this is the failed login page and has no access to resources,
    // we will skip any user or access steps.
    const template = await ejs.renderFile(
      "./views/pages/requestLogin.ejs",
      {
        title: "Please Login",
        notifications: []
      },
      {
        views: [path.resolve("./views")]
      }
    );

    res.set("Content-Type", "text/html");
    res.status(200).send(template);
  }

  async getSettings(req, res) {
    const user = this.server.auth.getUserFromRequest(req);
    const redirection = this.shouldUserBeRedirected(user);

    if (redirection.status) {
      res.redirect(redirection.location);
    }

    const hasAccess = this.server.auth.canUserPreformAction(user, "view:config.*");
    // We just check if they have any permissions at all to the config, and let
    // EJS check config values specifically
    if (!hasAccess) {
      res.status(303).redirect("/codes/403");
    }

    const notifications = this.server.notifications.getNotificationsForUser(user.email);

    // Return settings page
    const template = await ejs.renderFile(
      "./views/pages/settings.ejs",
      {
        title: "Settings",
        content: {
          default: this.config.default,
          schema: this.config.schema
        },
        config: this.config,
        canPreformAction: (permission) => { return this.server.auth.canUserPreformAction(user, permission); },
        uncamelcase: utils.uncamelcase,
        notifications: notifications
      },
      {
        views: [path.resolve("./views")]
      }
    );

    res.set("Content-Type", "text/html");
    res.status(200).send(template);
  }

  async postSettings(req, res) {
    const user = this.server.auth.getUserFromRequest(req);
    const redirection = this.shouldUserBeRedirected(user);

    if (redirection.status) {
      res.redirect(redirection.location);
    }

    const hasAccess = this.server.auth.canUserPreformAction(user, "edit:config.*");

    if (!hasAccess) {
      res.status(303).redirect("/codes/403");
    }

    const settings = req.body;

    for (const setting in settings) {
      if (this.config.get(setting) !== settings[setting]) {
        const hasSpecificAccess = this.server.auth.canUserPreformAction(user, `edit:config.${setting}`);
        if (hasSpecificAccess) {
          this.config.set(setting, settings[setting]);
        }
      }
    }
    // TODO Unchecked boxes aren't sent as form data. How can we check those against
    // what the user has access to change to know if we need to change their setting?

    this.server.notifications.addNotification("Successfully updated settings", "success", user.email);

    res.status(303).redirect("/settings");
  }

  async getSessions(req, res) {
    const user = this.server.auth.getUserFromRequest(req);
    const redirection = this.shouldUserBeRedirected(user);

    if (redirection.status) {
      res.redirect(redirection.location);
    }

    const hasAccess = this.server.auth.canUserPreformAction(user, "view:frontend.sessions");

    if (!hasAccess) {
      res.status(303).redirect("/codes/403");
    }

    const notifications = this.server.notifications.getNotificationsForUser(user.email);

    // Return page about active sessions
    const sessions = await this.server.frontend.getActiveSessions();
    console.log(sessions);

    const template = await ejs.renderFile(
      "./views/pages/sessions.ejs",
      {
        title: "Sessions",
        content: {
          sessions: sessions
        },
        notifications: notifications
      },
      {
        views: [path.resolve("./views")]
      }
    );

    res.set("Content-Type", "text/html");
    res.status(200).send(template);
  }

  async getLogs(req, res) {
    const user = this.server.auth.getUserFromRequest(req);
    const redirection = this.shouldUserBeRedirected(user);

    if (redirection.status) {
      res.redirect(redirection.location);
    }

    const hasAccess = this.server.auth.canUserPreformAction(user, "view:log.*");

    if (!hasAccess) {
      res.status(303).redirect("/codes/403");
    }

    const notifications = this.server.notifications.getNotificationsForUser(user.email);

    const template = await ejs.renderFile(
      "./views/pages/logs.ejs",
      {
        title: "Logs",
        content: {
          logs: this.log.cache
        },
        notifications: notifications
      },
      {
        views: [path.resolve("./views")]
      }
    );

    res.set("Content-Type", "text/html");
    res.status(200).send(template);
  }

  // === Code Returns ===
  async getCodes403(req, res) {
    // Skip all other checks
    const template = await ejs.renderFile(
      "./views/codes/403.ejs",
      {
        title: "Access Denied",
        notifications: []
      },
      {
        views: [path.resolve("./views")]
      }
    );

    res.set("Content-Type", "text/html");
    res.status(403).send(template);
  }

  async getCodes404(req, res) {
    // Skip all other checks
    const template = await ejs.renderFile(
      "./views/codes/404.ejs",
      {
        title: "Access Denied",
        notifications: []
      },
      {
        views: [path.resolve("./views")]
      }
    );

    res.set("Content-Type", "text/html");
    res.status(404).send(template);
  }

  async getCodes500(req, res) {
    // Skip all other checks
    const template = await ejs.renderFile(
      "./views/codes/500.ejs",
      {
        title: "Server Error",
        notifications: []
      },
      {
        views: [path.resolve("./views")]
      }
    );

    res.set("Content-Type", "text/html");
    res.status(500).send(template);
  }

  // === API ===
  async deleteApiNotificationId(req, res) {
    const user = this.server.auth.getUserFromRequest(req);
    const notificationId = req.params.id;

    try {
      const result = this.server.notifications.deleteNotification(notificationId, user.email);

      if (result.ok) {
        res.status(200).send();
      } else {
        if (result.code === 404) {
          res.status(404).send();
        } else {
          res.status(500).send();
        }
      }
    } catch(err) {
      this.log.err({
        host: "endpoints",
        short_message: `Unable to delete notification '${notificationId}'.`,
        _err: err
      });
      res.status(500).send();
    }
  }

}
