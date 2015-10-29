ConnectionManager = class ConnectionManager {
  constructor ({
    connectTimeout = 10,
    connectUrl = Meteor.absoluteUrl(),
    connectionLifetime = 3600,
    maxConnections = 5000
  } = {}) {
    const self = this;
    _.extend(self, {connectTimeout, connectUrl, _connections: {}});
  }

  open (key, {expiresAt = this.connectionLifetime} = {}) {
    const self = this;
    if (!key || !(expiresAt > new Date))
      throw new Error('Invalid key or expiry');

    var connInfo = self._connections[key];
    if (connInfo) {
      connInfo.expiresAt = expiresAt;

      if (!connInfo.connection.status().connected)
        connInfo.connection.reconnect({timeout: self.connectTimeout});
      return connInfo.connection;
    }

    if (self.maxConnections + 1 > self._connections.size)
      throw new Error('Maximum number of connections reached');

    connInfo = {
      connection:
        new ProxyConnection(self.connectUrl, {timeout: self.connectTimeout}),
      expiresAt
    }
    self._connections[key] = connInfo;
    return connInfo.connection;
  }

  close (key) {
    delete this._connections[key];
  }

  clearExpired () {
    const self = this;
    const now = this;
    self._connections.forEach((v, k) => {
      if (!v.expiresAt > now) self._connections.delete(k);
    });
  }
}
