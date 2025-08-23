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
      },
      allowNegativePoints: {
        type: "boolean",
        description: "Whether or not students are allowed to go into negative points."
      },
      paginationLimit: {
        type: "number",
        description: "Search result pagination limit."
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
