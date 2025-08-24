/**
  Schema for the full configuration
*/

module.exports = {
  server: {
    type: "object",
    properties: {
      port: {
        type: "number",
        title: "Frontend Port",
        description: "The external port the frontend server is available on.",
        default: 8080
      },
      dev: {
        type: "boolean",
        description: "Whether or not the server is running in development mode.",
        default: false
      },
      allowNegativePoints: {
        type: "boolean",
        description: "Whether or not students are allowed to go into negative points.",
        default: false
      },
      paginationLimit: {
        type: "number",
        description: "Search result pagination limit.",
        default: 30
      }
    }
  },
  authentication: {
    type: "object",
    properties: {
      enableAuthentication: {
        type: "boolean",
        description: "If authentcation is enabled.",
        default: false
      },
      forceAuthentication: {
        type: "boolean",
        description: "If users are forced to be authenticated.",
        default: false
      },
      sessionFileStoreTtl: {
        type: "number",
        description: "The 'Time To Live' of the authentication file store cache.",
        default: 9000
      },
      googleClientId: {
        type: "string",
        description: "The client ID for Google Authentication.",
        default: ""
      },
      googleClientSecret: {
        type: "string",
        description: "The client secret for Google Authentication.",
        default: ""
      },
      domain: {
        type: "string",
        description: "The installations email domain.",
        default: "",
        example: "@example.com"
      },
      sessionSecret: {
        type: "string",
        description: "The secret key for the authentication session store.",
        default: "test"
      }
    }
  },
  database: {
    type: "object",
    properties: {
      host: {
        type: "string",
        description: "Hostname or IP address of the SQL server."
      },
      user: {
        type: "string",
        description: "The username to access the SQL server."
      },
      pass: {
        type: "string",
        description: "The password to access the SQL server."
      },
      database: {
        type: "string",
        description: "The database to access."
      },
      port: {
        type: "number",
        description: "The port of the SQL server."
      }
    }
  },
  permissions: {
    type: "object",
    properties: {
      users: {
        type: "array",
        items: {
          type: "object",
          properties: {
            email: {
              type: "string",
              description: "User's email address.",
              example: "name@example.com"
            },
            roles: {
              type: "array",
              description: "The roles assigned to the user.",
              items: {
                type: "string"
              }
            }
          }
        }
      },
      roles: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "The name of the role."
            },
            permissions: {
              type: "array",
              description: "The permissions assigned to the role.",
              items: {
                type: "string",
                enum: []
              }
            }
          }
        }
      }
    }
  }
};
