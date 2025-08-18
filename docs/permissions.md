# Permissions

I've been through a few iterations of how I'd like to handle permissions.
Mostly relating to their format, and I think I've settled.

Permissions should be defined as `ACTION:namespace.resource`.

Each one of these is allowed to be an `*` to indicate 'everything'.

Additionally, the namespace can only be so deep. Consider in the settings, and resource
like `authentication.enableAuthentication`, we can't target specifically `enableAuthentication`
but we can target `authentication`.
Being able to go that deep seems rather difficult, and unlikely to be needed.

So to allow view only access of this, I'd say `view:config.authentication`.

Or view access to all of the config namespace `view:config.*`.

## Valid `ACTION` values:

* `view`: Read only permission.
* `edit`: Edit & Delete permission.

## Valid `namespace`s:

Most namespaces will correspond with their namespace in the source code layout:

* `config`: All configuration items.
* `task`: Task related items.
* `database`: Database related items, such as actual write and edit permissions in the DB.
* `frontend`: Items relating to the frontend and HTTP server.
* `log`: Log related items.

## Valid `resource`s:

These are the actual targeted permissions available within the server:

* `config.server`: Server configuration namespace.
* `config.tasks`: Task configuration namespace.
* `config.authentication`: Authentication configuration namespace.
* `config.permissions`: Permissions configuration namespace.
* `config.database`: Database configuration namespace.
* `log.debug`: Debug log availability.
* `log.info`: "
* `log.notice`: "
* `log.warn`: "
* `log.err`: "
* `log.crit`: "
* `log.alert`: "
* `log.panic`: "
* `database.students`: Access to the `students` table.
* `database.points`: Access to the `points` table.
* `frontend.sessions`: Access to active authenticated sessions.
