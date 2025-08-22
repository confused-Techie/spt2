/**
  Default Configuration File
*/

module.exports = {
  server: {
    port: 8080,
    allowNegativePoints: false,
    paginationLimit: 30
  },
  authentication: {
    enableAuthentication: false,
    forceAuthentication: false,
    sessionFileStoreTtl: 9000,
    googleClientId: "",
    googleClientSecret: "",
    domain: "",
    sessionSecret: "test"
  }
};
