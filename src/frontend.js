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

    this.app = null; // Instance of `express`
    this.serve = null; // Instance of the running server
    this.passport = passport;
  }

  initialize() {
    this.app = express();

    // Basic setup
    this.app.use(compression());

    if (this.server.config.get("enableAuthentication")) {
      this.app.use(
        session({
          secret: this.config.get("sessionSecret"),
          resave: false,
          saveUninitialized: false,
          store: new SessionFileStore({
            path: path.join(this.config.resourcePath, "sessions"),
            ttl: this.config.get("sessionFileStoreTtl")
          })
        })
      );

      this.app.use(this.passport.authenticate("session"));

      this.passport.serializeUser((user, cb) => {
        process.nextTick(() => {
          cb(null, user); // Allows the user object o be available via req.session.passport.user
        });
      });

      this.passport.deserializerUser((user, cb) => {
        process.nextTick(() => {
          return cb(null, user);
        });
      });

      this.passport.use(
        "google",
        new GoogleStrategy({
          clientID: this.config.get("googleClientId"),
          clientSecret: this.config.get("googleClientSecret"),
          callbackURL: "/oauth2/redirect",
          scope: ["profile", "email", "openid"]
        },
      (issuer, profile, cb) => {
        if (
          !Array.isArray(profile.emails) ||
          typeof profile.emails[0]?.value !== "string"
        ) {
          this.log.warn({
            host: "frontend",
            short_message: "Invalid email object retreived from Google.",
            _profile: profile
          });
          return cb("Invalid email object retreived from Google.");
        }

        if (profile.emails[0].value.endsWith(this.config.get("domain"))) {
          const usrObj = {
            issuer: issuer,
            id: profile.id,
            displayName: profile.displayName,
            first_name: profile.name.givenName,
            last_name: profile.name.familyName,
            email: profile.emails[0].value
          };

          this.log.debug({
            host: "frontend",
            short_message: `Successfully authenticated '${usrObj.email}'.`,
            _usrObj: usrObj
          });
          return cb(null, usrObj);
        } else {
          this.log.warn({
            host: "frontend",
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
    // TODO setup other endpoints
  }

  listen() {
    this.serve = this.app.listen(this.config.get("port"), () => {
      this.server.log.notice({
        host: "frontend",
        short_message: `Server Listening on port ${this.config.get("port")}.`
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
}
