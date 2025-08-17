/**
  Assists in determining the permissions of a user and if they are authenticated.
*/

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

  canUserPreformAction(usrObj, action) {
    // action examples: `edit.googleClientId`, `view.studentPoints`, `add.studentPoints` etc
    // Each action that can be made within the system should have an associated
    // `action` handle, which can be assigned per role and each role can then be assigned to the user.
    // In the config we should have a list of `users`, each user then has a list of roles.
    // Additionally a top level key will be a list of roles, and the permissions they
    // are given. With each permission being the action examples above. Although maybe
    // the other way `studentPoints.view` so that `studentPoints.*` can exist and
    // easily provide permissions for all actions in the namespace.
    // Then roles can be created as needed completey custom.
    // Lastly, we will likely want a way to allow easy login and identification of
    // permissions. Such as allowing anyone in the org to have view permissions.
    // Or regex to assign a role, allowing any teacher to have the view permissions.
  }

  getRolesForUser(userEmail) {
    const users = this.config.get("users");

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
    const roles = this.config.get("roles");

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
