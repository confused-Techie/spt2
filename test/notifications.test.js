const { describe, it, before } = require("node:test");
const assert = require("assert-extensions");
const Notifications = require("../src/notifications.js");
let notifications;

describe("addNotification", () => {
  before(() => {
    notifications = new Notifications({});
  });

  it("successfully adds a notification for a new user and returns a string id", () => {
    const id = notifications.addNotification("Hello World", "success", "email@example.com");

    assert.equal(notifications.notifications["email@example.com"].length, 1);
    assert.equal(notifications.notifications["email@example.com"][0].msg, "Hello World");
    assert.equal(notifications.notifications["email@example.com"][0].status, "success");
    assert.toBeString(notifications.notifications["email@example.com"][0].id);
    assert.toBeString(id);
    assert.equal(notifications.notifications["email@example.com"][0].id, id);
  });

  it("adds multiple notifications for the same user and preserves order", () => {
    const id1 = notifications.addNotification("First", "success", "user@example.com");
    const id2 = notifications.addNotification("Second", "warning", "user@example.com");

    assert.equal(notifications.notifications["user@example.com"].length, 2);
    assert.equal(notifications.notifications["user@example.com"][0].msg, "First");
    assert.equal(notifications.notifications["user@example.com"][0].status, "success");
    assert.equal(notifications.notifications["user@example.com"][0].id, id1);

    assert.equal(notifications.notifications["user@example.com"][1].msg, "Second");
    assert.equal(notifications.notifications["user@example.com"][1].status, "warning");
    assert.equal(notifications.notifications["user@example.com"][1].id, id2);

    assert.notEqual(id1, id2); // ids should be unique
  });

  it("stores notifications separately per user", () => {
    const a = notifications.addNotification("Msg A", "success", "a@example.com");
    const b = notifications.addNotification("Msg B", "danger", "b@example.com");

    assert.equal(notifications.notifications["a@example.com"].length, 1);
    assert.equal(notifications.notifications["a@example.com"][0].id, a);
    assert.equal(notifications.notifications["a@example.com"][0].status, "success");

    assert.equal(notifications.notifications["b@example.com"].length, 1);
    assert.equal(notifications.notifications["b@example.com"][0].id, b);
    assert.equal(notifications.notifications["b@example.com"][0].status, "danger");
  });

  it("accepts arbitrary status strings (no validation performed)", () => {
    notifications.addNotification("Free-form", "custom-status", "x@example.com");
    assert.equal(notifications.notifications["x@example.com"][0].status, "custom-status");
  });
});

describe("getNotificationsForUser", () => {
  before(() => {
    notifications = new Notifications({});
  });

  it("returns an empty array for a user with no notifications", () => {
    const list = notifications.getNotificationsForUser("nope@example.com");
    assert.deepEqual(list, []);
  });

  it("returns the array of notifications for a user that has them", () => {
    const id = notifications.addNotification("Hi", "success", "h@example.com");
    const list = notifications.getNotificationsForUser("h@example.com");

    assert.equal(list.length, 1);
    assert.equal(list[0].msg, "Hi");
    assert.equal(list[0].status, "success");
    assert.equal(list[0].id, id);
  });
});

describe("deleteNotification", () => {
  before(() => {
    notifications = new Notifications({});
  });

  it("successfully deletes an existing notification and returns { ok: true }", () => {
    const email = "del@example.com";
    const id1 = notifications.addNotification("Keep me", "success", email);
    const id2 = notifications.addNotification("Delete me", "warning", email);

    const result = notifications.deleteNotification(id2, email);
    assert.deepEqual(result, { ok: true });

    const remaining = notifications.notifications[email];
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].id, id1);
    assert.equal(remaining[0].msg, "Keep me");
  });

  it("returns { ok: false, code: 404 } when the id does not exist for that user", () => {
    const email = "missing@example.com";
    notifications.addNotification("Only one", "success", email);

    const result = notifications.deleteNotification("non-existent-id", email);
    assert.deepEqual(result, { ok: false, code: 404 });

    assert.equal(notifications.notifications[email].length, 1);
    assert.equal(notifications.notifications[email][0].msg, "Only one");
  });

  it("returns { ok: false, code: 404 } when the user has an empty list", () => {
    const email = "empty@example.com";
    notifications.notifications[email] = []; // simulate an existing user with empty notifications

    const result = notifications.deleteNotification("anything", email);
    assert.deepEqual(result, { ok: false, code: 404 });
    assert.equal(notifications.notifications[email].length, 0);
  });

  it("returns { ok: false, code: 404 } when deleting for a user that does not exist", () => {
    const result = notifications.deleteNotification("id", "unknown@example.com");

    assert.deepEqual(result, { ok: false, code: 404 });
  });
});
