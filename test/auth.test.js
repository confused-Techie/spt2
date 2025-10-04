const { describe, it, before } = require("node:test");
const assert = require("assert-extensions");
const Auth = require("../src/auth.js");
let auth;

class MockConfig {
  constructor(config = {}) {
    this.config = config;
  }

  get(key) {
    // Fake key-path reader for what auth needs, just:
    // - permissions.users
    // - permissions.roles
    if (key === "permissions.users") {
      return this.config.permissions?.users ?? [];
    } else if (key === "permissions.roles") {
      return this.config.permissions?.roles ?? [];
    } else {
      return undefined;
    }
  }
}

function initAuth(conf) {
  const server = {
    config: new MockConfig(conf),
    log: { info() {}, error() {} },
  };
  return new Auth(server);
}

const initConfig = {
  permissions: {
    roles: [
      {
        name: "viewer",
        permissions: [ "view:database.students" ]
      },
      {
        name: "editor",
        permissions: [ "edit:database.students" ]
      },
      {
        name: "nsall", // namespace wildcard
        permissions: [ "view:*.*" ]
      },
      {
        name: "resall", // resource wildcard
        permissions: [ "view:database.*" ]
      },
      {
        name: "actionall", // action wildcard
        permissions: [ "*:database.students" ]
      },
      {
        name: "super", // everything wildcard
        permissions: [ "*:*.*" ]
      },
      {
        name: "no-op",
        permissions: []
      }
    ],
    users: [
      { email: "editor@example.com", roles: ["editor"] },
      { email: "viewer@example.com", roles: ["viewer"] },
      { email: "nobody@example.com", roles: [] },
      { email: "nsall@example.com", roles: ["nsall"] },
      { email: "resall@example.com", roles: ["resall"] },
      { email: "actionall@example.com", roles: ["actionall"] },
      { email: "super@example.com", roles: ["super"] },
      { email: "viewer_editor@example.com", roles: ["viewer", "editor"] },
      { email: "no-op@example.com", roles: [ "no-op" ] }
    ]
  }
};

describe("getUserFromRequest", () => {
  before(() => {
    auth = initAuth(initConfig);
  });

  it("returns {} when req.user is not a valid object", () => {
    assert.deepEqual(auth.getUserFromRequest({}), {});
    assert.deepEqual(auth.getUserFromRequest({ user: null }), {});
    assert.deepEqual(auth.getUserFromRequest({ user: undefined }), {});
    assert.deepEqual(auth.getUserFromRequest({ user: 123 }), {});
  });

  it("returns a user object augmented with roles and permissions based on email", () => {
    const req = { user: { email: "editor@example.com", name: "Editor" }};
    const user = auth.getUserFromRequest(req);

    assert.equal(user.email, "editor@example.com");
    assert.equal(user.name, "Editor");
    assert.toHaveLength(user.roles, 1);
    assert.equal(user.roles[0], "editor");
    assert.toHaveLength(user.permissions, 1);
    assert.equal(user.permissions[0], "edit:database.students");
  });

  it("handles users with multiple roles (concatenating permissions, no de-duplication)", () => {
    const req = { user: { email: "viewer_editor@example.com", name: "Multi" }};
    const user = auth.getUserFromRequest(req);

    assert.deepEqual(user.roles, [ "viewer", "editor" ]);
    assert.deepEqual(user.permissions, [ "view:database.students", "edit:database.students" ]);
  });

  it("returns user with empty roles/permissions when not found in config", () => {
    const req = { user: { email: "unknown@example.com", name: "Unknown" }};
    const user = auth.getUserFromRequest(req);

    assert.ok(Array.isArray(user.roles));
    assert.ok(Array.isArray(user.permissions));
    assert.toHaveLength(user.roles, 0);
    assert.toHaveLength(user.permissions, 0);
  });
});

describe("objectifyPermission", () => {
  before(() => {
    auth = initAuth(initConfig);
  });

  it("throws when permission is not a string", () => {
    assert.throws(() => auth.objectifyPermission(), /MUST be a string/);
    assert.throws(() => auth.objectifyPermission(null), /MUST be a string/);
    assert.throws(() => auth.objectifyPermission(123), /MUST be a string/);
    assert.throws(() => auth.objectifyPermission({}), /MUST be a string/);
  });

  it("throws on invalid format (missing parts or bad chars)", () => {
    assert.throws(() => auth.objectifyPermission("view:database"), /Invalid permission format/); // missing resource
    assert.throws(() => auth.objectifyPermission("view-database.students"), /Invalid permission format/); // missing colon
    assert.throws(() => auth.objectifyPermission("database.students"), /Invalid permission format/); // missing action
  });

  it("parses a valid permission into full object", () => {
    assert.deepEqual(auth.objectifyPermission("view:database.students"), {
      action: "view",
      namespace: "database",
      resource: "students"
    });
  });

  it("accepts wildcards for action, namespace, and resource", () => {
    assert.deepEqual(auth.objectifyPermission("*:database.students"), {
      action: "*",
      namespace: "database",
      resource: "students"
    });
    assert.deepEqual(auth.objectifyPermission("edit:*.*"), {
      action: "edit",
      namespace: "*",
      resource: "*"
    });
    assert.deepEqual(auth.objectifyPermission("*:*.*"), {
      action: "*",
      namespace: "*",
      resource: "*"
    });
  });

  it("ignores trailing specificity beyond the first three segments", () => {
    assert.deepEqual(auth.objectifyPermission("view:database.students.student_id"), {
      action: "view",
      namespace: "database",
      resource: "students"
    });
  });
});


describe("canUserPreformAction", () => {
  before(() => {
    auth = initAuth(initConfig);
  });

  it("returns false when usrObj is not an object", () => {
    assert.equal(auth.canUserPreformAction(null, "view:database.students"), false);
    assert.equal(auth.canUserPreformAction(undefined, "view:database.students"), false);
    assert.equal(auth.canUserPreformAction({}, "view:database.students"), false);
  });

  it("returns true for exact permission match", () => {
    const usr = { permissions: [ "view:database.students" ]};
    assert.ok(auth.canUserPreformAction(usr, "view:database.students"));
  });

  it("returns true when user has edit permissions and we ask about view permissions", () => {
    const usr = { permissions: [ "edit:database.students" ]};
    // When a user has edit permissions they are automatically granted view permissions
    assert.ok(auth.canUserPreformAction(usr, "view:database.students"));
    // But only to the defined namespace/resource
    assert.toBeFalsy(auth.canUserPreformAction(usr, "view:database.points"));
  });

  it("returns true when user has action wildcard", () => {
    const usr = { permissions: [ "*:database.students" ]};
    assert.ok(auth.canUserPreformAction(usr, "view:database.students"));
    assert.ok(auth.canUserPreformAction(usr, "edit:database.students"));
  });

  it("returns true when user has resource wildcard", () => {
    const usr = { permissions: [ "view:database.*" ]};
    assert.ok(auth.canUserPreformAction(usr, "view:database.students"));
    assert.ok(auth.canUserPreformAction(usr, "view:database.points"));
  });

  it("returns true when requested permission contains a resource wildcard", () => {
    const usr = { permissions: [ "view:database.students" ]};
    assert.ok(auth.canUserPreformAction(usr, "view:database.*"));
  });

  it("returns true for super wildcard", () => {
    const usr = { permissions: [ "*:*.*" ]};
    assert.ok(auth.canUserPreformAction(usr, "view:database.students"));
    assert.ok(auth.canUserPreformAction(usr, "edit:database.points"));
    assert.ok(auth.canUserPreformAction(usr, "*:*.*"));
  });

  it("returns false for any combination of action/namespace/resource", () => {
    const usr = { permissions: [ "view:database.students" ]};
    assert.toBeFalsy(auth.canUserPreformAction(usr, "edit:database.students")); // action
    assert.toBeFalsy(auth.canUserPreformAction(usr, "view:config.students")); // namesapce
    assert.toBeFalsy(auth.canUserPreformAction(usr, "view:database.points")); // resource
  });

  it("propagates error when the requested permission string is invalid", () => {
    const usr = { permissions: [ "view:database.students" ]};
    assert.throws(() => auth.canUserPreformAction(usr, "view:settings"), /Invalid permission format/);
  });

  it("propagates error if candidate permission in the user list is invalid", () => {
    const usr = { permissions: [ "not-a-perm", "view:database.students" ]};
    assert.throws(() => auth.canUserPreformAction(usr, "view:database.students"), /Invalid permission format/);
  });
});

describe("getRolesForUser", () => {
  before(() => {
    auth = initAuth(initConfig);
  });

  it("returns roles array for a known user", () => {
    assert.deepEqual(auth.getRolesForUser("editor@example.com"), [ "editor" ]);
  });

  it("returns empty array for unknown user", () => {
    assert.deepEqual(auth.getRolesForUser("unknown@example.com"), []);
  });

  it("returns empty array when user has no roles", () => {
    assert.deepEqual(auth.getRolesForUser("nobody@example.com"), []);
  });

  it("returns all roles for a given user", () => {
    assert.deepEqual(auth.getRolesForUser("viewer_editor@example.com"), [ "viewer", "editor" ]);
  });
});

describe("getPermissionsForRole", () => {
  before(() => {
    auth = initAuth(initConfig);
  });

  it("returns permissions array for a known role", () => {
    assert.deepEqual(auth.getPermissionsForRole("editor"), [ "edit:database.students" ]);
  });

  it("returns empty array for unknown role", () => {
    assert.deepEqual(auth.getPermissionsForRole("unknown"), []);
  });

  it("returns empty array when role has no permissions", () => {
    assert.deepEqual(auth.getPermissionsForRole("no-op"), []);
  });
});

describe("getPermissionsForUser", () => {
  before(() => {
    auth = initAuth(initConfig);
  });

  it("concatenates permissions from all user roles", () => {
    assert.deepEqual(auth.getPermissionsForUser("viewer_editor@example.com"), [ "view:database.students", "edit:database.students" ]);
  });

  it("returns permissions for single-role users", () => {
    assert.deepEqual(auth.getPermissionsForUser("editor@example.com"), [ "edit:database.students" ]);
  });

  it("returns empty array for user with no permissions, or no roles", () => {
    assert.deepEqual(auth.getPermissionsForUser("nobody@example.com"), []); // no roles
    assert.deepEqual(auth.getPermissionsForUser("no-op@example.com"), []); // no permission role
  });
});
