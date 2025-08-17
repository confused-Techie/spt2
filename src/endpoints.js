/**
  This file contains the setup for all non-authentication related endpoints.
*/

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

    frontend.app.get("/test", this.test.bind(this));

  }

  test(req, res) {
    this.log.debug("Endpoint hit!");
    this.server.auth.getUserFromRequest(req);
    res.send("Hello World");
  }
}
