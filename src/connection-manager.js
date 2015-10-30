ConnectionManager = class ConnectionManager {
  constructor ({
    connectTimeout = 10,
    connectUrl = Meteor.absoluteUrl(),
    connectionLifetime = 3600,
    maxConnections = 5000,
    expireInterval = 11000
  } = {}) {
    const self = this;
    _.extend(self, {
      connectTimeout,
      connectUrl,
      _connections: {},
      _stopped: false,
    });

    const startExpire = () => {
      if (self._stopped || !(expireInterval > 0)) return;

      self._expireHandle = Meteor.setTimeout(function () {
        self.clearExpired();
        startExpire();
      }, expireInterval);
    };
    startExpire();
  }

  open (key, {expiresAt = this.connectionLifetime} = {}) {
    const self = this;
    if (self._stopped) return undefined;
    if (!key || !(expiresAt > new Date))
      throw new Error('Invalid key or expiry');

    var connInfo = self._connections[key];
    if (connInfo) {
      connInfo.expiresAt = expiresAt;

      if (!connInfo.connection.status().connected)
        connInfo.connection.reconnect({timeout: self.connectTimeout});
      return connInfo.connection;
    }

    if (self.maxConnections + 1 > _.size(self._connections))
      throw new Error('Maximum number of connections reached');

    connInfo = {
      connection:
        new ProxyConnection(self.connectUrl, {timeout: self.connectTimeout}),
      expiresAt
    }
    self._connections[key] = connInfo;

    if (self._stopped) connInfo.connection.close();

    return connInfo.connection;
  }

  close (key) {
    const self = this;
    const connInfo = self._connections[key];
    maybeIf(() => connInfo.connection.close());
    delete self._connections[key];
  }

  stop () {
    const self = this;
    if (self._stopped) return;
    self._stopped = true;
    for (let k in self._connections) {
      self.close(k);
    }
  }

  clearExpired () {
    const self = this;
    const now = this;
    for (let k in self._connections) {
      const v = self._connections[k];
      if (!v.expiresAt > now) self.close(k);
    }
  }
}
