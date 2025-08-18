const path = require("node:path");
const express = require("express");
const compression = require("compression");
const session = require("express-session");
const SessionFileStore = require("session-file-store")(session);
const passport = require("passport");
const GoogleStrategy = require("passport-google-oidc");

module.exports =
class Frontend {
  constructor(server) {
    this.server = server;
    this.log = this.server.log;
    this.config = this.server.config;

    this.endpointSetupFuncs = []; // An array of functions that allow setting up
    // various endpoints to expand on the system.

    this.app = null; // Instance of `express`
    this.serve = null; // Instance of the running server
    this.sessionFileStore = null; // Instance of our session file store
    this.passport = passport;
  }

  initialize() {
    this.app = express();

    // Basic setup
    this.app.use(compression());

    if (this.server.config.get("authentication.enableAuthentication")) {

      this.sessionFileStore = new SessionFileStore({
        path: path.join(this.config.resourcePath, "sessions"),
        ttl: this.config.get("authentication.sessionFileStoreTtl")
      });

      this.app.use(
        session({
          secret: this.config.get("authentication.sessionSecret"),
          resave: false,
          saveUninitialized: false,
          store: this.sessionFileStore
        })
      );

      this.app.use(this.passport.authenticate("session"));

      this.passport.serializeUser((user, cb) => {
        process.nextTick(() => {
          cb(null, user); // Allows the user object o be available via req.session.passport.user
        });
      });

      this.passport.deserializeUser((user, cb) => {
        process.nextTick(() => {
          return cb(null, user);
        });
      });

      this.passport.use(
        "google",
        new GoogleStrategy({
          clientID: this.config.get("authentication.googleClientId"),
          clientSecret: this.config.get("authentication.googleClientSecret"),
          callbackURL: "/oauth2/redirect",
          scope: ["profile", "email", "openid"]
        },
      (issuer, profile, cb) => {
        if (
          !Array.isArray(profile.emails) ||
          typeof profile.emails[0]?.value !== "string"
        ) {
          this.log.warn({
            host: "frontend.login",
            short_message: "Invalid email object retreived from Google.",
            _profile: profile
          });
          return cb("Invalid email object retreived from Google.");
        }

        if (profile.emails[0].value.endsWith(this.config.get("authentication.domain"))) {
          const usrObj = {
            issuer: issuer,
            id: profile.id,
            display_name: profile.displayName,
            first_name: profile.name.givenName,
            last_name: profile.name.familyName,
            email: profile.emails[0].value
          };

          this.log.debug({
            host: "frontend.login",
            short_message: `Successfully authenticated '${usrObj.email}'.`,
            _usrObj: usrObj
          });
          return cb(null, usrObj);
        } else {
          this.log.warn({
            host: "frontend.login",
            short_message: `Bad email domain attempted to be used during login! '${profile.emails[0].value}'.`,
            _profile: profile
          });
          return cb(`Bad email domain attempted to be used during login! '${profile.emails[0].value}'`);
        }
      })
      );

      this.app.get("/login", this.passport.authenticate("google"));
      this.app.get(
        "/oauth2/redirect",
        this.passport.authenticate("google", {
          successRedirect: "/",
          failureRedirect: "/requestLogin"
        })
      );
    }

    // Setup all other endpoints provided via `this.endpointSetupFuncs`
    for (const endpointFunc of this.endpointSetupFuncs) {
      endpointFunc(this);
    }

  }

  listen() {
    this.serve = this.app.listen(this.config.get("server.port"), () => {
      this.server.log.notice({
        host: "frontend",
        short_message: `Server Listening on port ${this.config.get("server.port")}.`
      });
    });
  }

  stop() {
    this.serve.close(() => {
      this.server.log.notice({
        host: "frontend",
        short_message: "HTTP Server Closed."
      });
    });
  }

  async getActiveSessions() {
    // Get all currently active authenticated sessions

    if (!this.sessionFileStore) {
      // The file store was never initialized, we likely aren't using authentication
      return [];
    }

    // Declare async wrappers around callback style file session store interface
    const list = async () => {
      return new Promise((resolve, reject) => {
        this.sessionFileStore.list((err, files) => {
          if (err) {
            reject(err);
          }
          resolve(files);
        });
      });
    };

    const expired = async (sessionId) => {
      return new Promise((resolve, reject) => {
        this.sessionFileStore.expired(sessionId, (err, isExpired) => {
          if (err) {
            reject(err);
          }
          resolve(isExpired);
        });
      });
    };

    const get = async (sessionId) => {
      return new Promise((resolve, reject) => {
        this.sessionFileStore.get(sessionId, (err, result) => {
          if (err) {
            reject(err);
          }
          resolve(result);
        });
      });
    };

    const activeSessions = [];

    const allSessions = await list();

    for (const session of allSessions) {
      const sessionId = session.replace(".json", "");
      const isExpired = await expired(sessionId);

      if (!isExpired) {
        const result = await get(sessionId);
        activeSessions.push(result);
      }
    }

    return activeSessions;
  }
}
