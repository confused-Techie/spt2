const { v4: uuidv4 } = require("uuid");

module.exports =
class Notifications {
  constructor(server) {
    this.server = server;

    this.notifications = {}; // Saved on a per user basis
  }

  addNotification(notificationMsg, status, email) {
    // Status' are roughly manually mapped to bulma notification classes
    // Currently supports: success, warnning, danger
    if (!this.notifications[email]) {
      this.notifications[email] = [];
    }

    const id = uuidv4();

    const notificationObj = {
      msg: notificationMsg,
      id: id,
      status: status
    };

    this.notifications[email].push(notificationObj);

    return id;
  }

  deleteNotification(notificationId, email) {
    for (let i = 0; i < this.notifications[email].length; i++) {
      if (this.notifications[email][i].id === notificationId) {
        this.notifications[email].splice(i, 1);
        return { ok: true };
      }
    }
    return { ok: false, code: 404 };
  }

  getNotificationsForUser(email) {
    return this.notifications[email] ?? [];
  }
}
