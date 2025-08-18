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
        description: "The external port the frontend server is available on."
      },
      dev: {
        type: "boolean",
        description: "Whether or not the server is running in development mode."
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
              description: "User's email address."
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
          name: {
            type: "string",
            description: "The name of the role."
          },
          permissions: {
            type: "array",
            description: "The permissions assigned to the role.",
            items: {
              type: "string",
              enum: [
                "config.*.*",
                "config.server:port.*", "config.server:port.view", "config.server:port.edit",
                "config.database:host.*", "config.database:host.view", "config.database:host.edit",
                "config.database:user.*", "config.database:user.view", "config.database:user.edit",
                "config.database:database.*", "config.database:database.view", "config.database:database.edit",
                "config.database:port.*", "config.database:port.view", "config.database:port.edit",
              ]
            }
          }
        }
      }
    }
  }
};
