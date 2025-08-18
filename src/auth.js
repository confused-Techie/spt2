/**
  Assists in determining the permissions of a user and if they are authenticated.
*/

const RE_PERMISSION = /^(?<action>[a-z*]+):(?<namespace>[a-z*]+).(?<resource>[a-z*]+)$/;

module.exports =
class Auth {
  constructor(server) {
    this.server = server;
    this.config = this.server.config;
    this.log = this.server.log;
  }

  getUserFromRequest(req) {
    // Takes an ExpressJS Request object and returns a user object
    const usrObj = req.user;

    if (typeof usrObj !== "object" || Object.keys(usrObj).length < 1) {
      // There is no found usrObj
      return {};
    }
    // The user object will already have details such as `email` and name.
    // But we want to also use their name to determine permission levels and roles
    usrObj.permissions = this.getPermissionsForUser(usrObj.email);
    usrObj.roles = this.getRolesForUser(usrObj.email);

    return usrObj;
  }

  objectifyPermission(permission) {
    if (typeof permission !== "string") {
      throw new Error("Permissions MUST be a string");
    }

    const validPermission = RE_PERMISSION.test(permission);

    if (!validPermission) {
      throw new Error(`Invalid permission format of '${permission}'`);
    }

    // Decode permission
    const re = RE_PERMISSION.exec(permission);

    return {
      action: re.groups.action,
      namespace: re.groups.namespace,
      resource: re.groups.resource
    };
  }

  canUserPreformAction(usrObj, permission) {
    if (typeof usrObj !== "object" || Object.keys(usrObj).length < 1) {
      // No valid usrObj provided
      return false;
    }

    const permObj = this.objectifyPermission(permission);

    // Now find whatever permissions the user has that matches with the resource
    for (const candidate of usrObj.permissions) {
      const candidateObj = this.objectifyPermission(candidate);
      if (candidateObj.namespace === permObj.namespace || candidateObj.namespace === "*") {
        // Namespace match found, now check resource
        if (candidateObj.resource === permObj.resource || candidateObj.resource === "*") {
          // Resource matches, now ensure action
          if (candidateObj.action === permObj.action || candidateObj.action === "*") {
            return true;
          }
        }
      }
    }

    return false;
  }

  getRolesForUser(userEmail) {
    const users = this.config.get("permissions.users");

    let foundUser = null;

    for (const user of users) {
      if (user.email === userEmail) {
        foundUser = user;
      }
    }

    if (foundUser === null) {
      return [];
    }

    return foundUser.roles;
  }

  getPermissionsForRole(roleName) {
    const roles = this.config.get("permissions.roles");

    let foundRole = null;

    for (const role of roles) {
      if (role.name === roleName) {
        foundRole = role;
      }
    }

    if (foundRole === null) {
      return [];
    }

    return foundRole.permissions;
  }

  getPermissionsForUser(userEmail) {
    const roles = this.getRolesForUser(userEmail);
    let permissions = [];

    for (const role of roles) {
      permissions.push(...this.getPermissionsForRole(role));
    }

    return permissions;
  }
}
