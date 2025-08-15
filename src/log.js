/**
  Handles logging of data of various levels.
  Prefers objects conforming to the GELF specification:
  https://go2docs.graylog.org/current/getting_in_log_data/gelf.html#GELFPayloadSpecification
*/

const LVL_STRING = {
  0: "emergency",
  1: "alert",
  2: "critical",
  3: "error",
  4: "warning",
  5: "notice",
  6: "informational",
  7: "debug"
};

module.exports =
class Log {
  constructor() {
    this.send = []; // An array of functions to call when logging
    this.cache = []; // An array of log objects to save in memory
  }

  debug(data) { this.log(data, 7); } // Debug-Level Messages
  info(data) { this.log(data, 6); } // Informational Messages
  notice(data) { this.log(data, 5); } // Normal but significant conditions
  warn(data) { this.log(data, 4); } // Warning Conditions
  err(data) { this.log(data, 3); } // Error Conditions
  crit(data) { this.log(data, 2); } // Critical Conditions
  alert(data) { this.log(data, 1); } // Action must be taken immediately
  panic(data) { this.log(data, 0); } // System is unusuable

  // Main
  log(data, lvl = 1) {
    let gelf = {};

    // Add all provided data to the above `gelf` object
    if (typeof data === "string") {
      // We have been provided only a string, which we will assume is a msg,
      // and means we must infer all other data
      gelf.short_message = data;
    } else {
      // We have been provided an object of data.
      for (const [key, value] of Object.entries(data)) {
        if (!key.startsWith("_") && !this.isStandardGelfField(key)) {
          // If the key doesn't already start with an underscore, and is not a
          // standard field, we must ensure to prepend it with an underscore
          gelf[`_${key}`] = value;
        } else {
          // Otherwise it's either a standard gelf key, or it already has an underscore
          gelf[key] = value;
        }
      }
    }

    // Now with all fields provided added to the object, lets check for anything
    // missing and add whatever else we have
    if (!this.isSuppliedString(gelf.version)) {
      gelf.version = "1.1";
    }
    if (!this.isSuppliedString(gelf.host)) {
      gelf.host = "logger";
    }
    if (!this.isSuppliedString(gelf.short_message)) {
      if (this.isSuppliedString(gelf.full_message)) {
        gelf.short_message = gelf.full_message;
      } else {
        gelf.short_message = "No data being logged...";
      }
    }
    if (!this.isSuppliedString(gelf.timestamp)) {
      gelf.timestamp = Date.now();
    }
    if (!Number.isInteger(gelf.level)) {
      gelf.level = lvl;
    }

    // Add custom string descriptions to numeric values
    if (LVL_STRING[gelf.level]) {
      gelf._level_string = LVL_STRING[gelf.level];
    }

    // Now that data has been handled, lets manage sending and caching
    this.cache.push(gelf);
    for (const sendMethod of this.send) {
      sendMethod(gelf);
    }
  }

  // Util
  isStandardGelfField(field) {
    const standardFields = [
      "version", "host", "short_message", "full_message", "timestamp", "level"
    ];

    return standardFields.includes(field);
  }

  isSuppliedString(value) {
    if (typeof value === "string" && value.length > 0) {
      return true;
    } else {
      return false;
    }
  }

}
