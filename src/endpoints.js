/**
  This file contains the setup for all non-authentication related endpoints.
*/

const path = require("node:path");
const ejs = require("ejs");

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
    frontend.app.get("/sessions", this.getSessions.bind(this));

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

    // Return page about active sessions
    const sessions = await this.server.frontend.getActiveSessions();

    const template = await ejs.renderFile(
      "./views/pages/sessions.ejs",
      {
        title: "Sessions",
        content: {
          sessions: sessions
        }
      },
      {
        views: [path.resolve("./views")]
      }
    );

    res.set("Content-Type", "text/html");
    res.status(200).send(template);
  }
}
