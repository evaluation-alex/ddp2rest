const Future = Npm.require('fibers/future');

// Get Connection constructor
const Connection = (() => {
  var connection = DDP.connect(Meteor.absoluteUrl());
  connection.close();
  return connection.constructor;
}());

ProxyConnection = class ProxyConnection extends Connection {
  constructor (url, opt) {
    var self;
    opt = opt || {};
    const connectFuture = new Future;
    const connectionTimeout = opt.timeout && Meteor.setTimeout((function () {
      self.close();
      !connectFuture.isResolved() && connectFuture['throw'](
        new Error('Connection timeout')
      );
    }).bind(self), opt.timeout * 1000);
    const superOpt = {
      supportedDDPVersions: !opt.autoPublish ?
        DDPCommon.SUPPORTED_DDP_VERSIONS.concat('ddpproxy') :
        DDPCommon.SUPPORTED_DDP_VERSIONS,

      onConnected () {
        connectionTimeout && Meteor.clearTimeout(connectionTimeout);
        opt.onConnected && opt.onConnected.call(self);
        !connectFuture.isResolved() && connectFuture['return']();
      }
    };

    super(url, superOpt);
    self = this;

    // If no callback function is provided, wait for connection to be
    // established
    if (!opt.onConnected) connectFuture.wait();

    self.collections = self.collections || {};
    self._onClose = [];
    self._stream.on(
      'message',
      Meteor.bindEnvironment(self._onData.bind(self), Meteor._debug)
    );
  }

  // Callback for automatic creation of new mongo collections when data is
  // received
  _onData (raw_msg) {
    const self = this;
    var msg;

    try {
      msg = DDPCommon.parseDDP(raw_msg);
    } catch (e) {
      return;
    }
    if (!msg || !msg.msg || !msg.collection) return;

    self.collections[msg.collection] =
      self.collections[msg.collection] ||
      new Mongo.Collection(msg.collection, {connection: self});
  }

  /**
   * Apply callbacks when connection is closed
   */
  close (...args) {
    const self = this;
    super.close(...args);
    console.log('self', self._onClose);
    while (self._onClose.length) { self._onClose.pop()(); }
  }

  /**
   * Add a callback to run when the connection is closed
   */
  onClose (func) {
    if (typeof func !== 'function')
      throw new Error('Argument must be a function');
    this._onClose.push(func);
  }

  /**
   * reconnect() with options
   * @param {Object} [options]
   * @param {} [options.timeout] - time(s) for the reconnect attempt to timeout
   */
  reconnect (opt) {
    const self = this;
    opt = opt || {};
    super.reconnect();

    if (opt.timeout > 0) {
      const statusFut = new Future;
      const comp = Tracker.autorun((c) => {
        const status = self.status();
        if (status.connected) {
          Meteor.clearTimeout(timeout);
          c.stop();
          statusFut['return']();
        }
      });
      const timeout = Meteor.setTimeout(() => {
        comp.stop();
        statusFut['throw']('timeout');
      }, opt.timeout * 1000);

      statusFut.wait();
    }
  }

  fetch () {
    const self = this;
    const col = self.collections;

    return Object.keys(col).reduce((acc, k) => {
      const data = maybeIf(() => col[k].find().fetch());
      if (data) acc[k] = data;
      return acc;
    }, {});
  }
}
