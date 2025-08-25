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

    // GET:/oauth2/redirect - Setup for auth, callback for google login
    // GET:/login - Setup for auth, default login prompt
    // GET:/requestLogin - Setup for auth, failed login redirect (reconsider?) TODO
    frontend.app.get("/", this.getHome.bind(this));
    frontend.app.get("/requestLogin", this.getRequestLogin.bind(this));
    frontend.app.get("/student/:id", this.getStudentId.bind(this));
    
    frontend.app.get("/settings", this.getSettings.bind(this));
    frontend.app.post("/settings", this.postSettings.bind(this));
    frontend.app.get("/sessions", this.getSessions.bind(this));

    // === API ===
    frontend.app.delete("/api/notification/:id", this.deleteApiNotificationId.bind(this));

    // === Resources ===
    frontend.app.get("/resources/site.js", (req, res) => {
      res.sendFile(path.resolve("./static/site.js"));
    });

  }

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

  async getHome(req, res) {
    const user = this.server.auth.getUserFromRequest(req);
    const redirection = this.shouldUserBeRedirected(user);

    if (redirection.status) {
      res.redirect(redirection.location);
    }

    res.send("hiya");

    // Now that redirection is checked we can continue on with our homepage.
  }

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

  async getStudentId(req, res) {

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
      // Return permission error page
      res.send("no access");
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
      // Return generic error page about permissions
      res.send("no access");
    }

    const settings = req.body;

    for (const setting in settings) {
      if (this.config.get(setting) !== settings[setting]) {
        this.config.set(setting, settings[setting]);
      }
    }
    // TODO Unchecked boxes aren't sent as form data. How can we check those against
    // what the user has access to change to know if we need to change their setting?

    this.server.notifications.addNotification("Successfully updated settings", "success", user.email);

    res.status(301).redirect("/settings");
  }

  async getSessions(req, res) {
    const user = this.server.auth.getUserFromRequest(req);
    const redirection = this.shouldUserBeRedirected(user);

    if (redirection.status) {
      res.redirect(redirection.location);
    }

    const hasAccess = this.server.auth.canUserPreformAction(user, "view:frontend.sessions");

    if (!hasAccess) {
      // Return generic error page about permissions
      res.send("no access");
    }

    const notifications = this.server.notifications.getNotificationsForUser(user.email);

    // Return page about active sessions
    const sessions = await this.server.frontend.getActiveSessions();

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
