const connect = WebAppInternals.NpmModules.connect.module;
const Fiber = Npm.require('fibers');

Server = class Server {
  /**
   * Server class to manage
   * @param {Object} [options]
   * @param {Object} [options.authServer]
   *   `AuthServer` instance used by the server. Use this option to share a
   *   single `authServer` among multiple `Server` instances.
   * @param {Object} [options.connectionManager]
   *   `ConnectionManager` instance used by the server. Use this option to
   *   share a single `connectionManager` among multiple `Server` instances.
   * @param {Object} [options.denyRules] - Route-based deny rules
   * @param {Object} [options.midwareOptions]
   *   Options passed directly to middlewares
   */
  constructor (opt = {}) {
    const self = this;

    self.authServer = opt.authServer || new AuthServer(opt);
    self.connectionManager =
      opt.connectionManager || new ConnectionManager(opt);

    self.midwareOptions = deepExtendObj({
      method: {
        // Set login on reconnect if login method is successful
        onLogin: function (methodRes, conn, req) {
          if (!methodRes || methodRes.error) return;
          const res = methodRes.result;
          if (Match.test(
            res, Match.ObjectIncluding({token: String, tokenExpires: Date})
          )) {
            conn.onReconnect('login', function () {
              this.call('login', {resume: res.token});
            });
          }
        }
      }
    }, opt.midwareOptions || {});

    self.denyRules = _.extend({
      '/method': [],
      '/subscribe': [],
      '/batch': [],
    }, opt.denyRules || {});
  }

  stop () { this.connectionManager.stop(); }

  routes () {
    const self = this;
    const {authServer, connectionManager} = self;
    const allowBearer =
      middleware.allowBearer(authServer.verifyToken.bind(authServer));
    const authConnect = middleware.connectWithToken(
      allowBearer,
      authServer.getTokenInfo.bind(authServer),
      connectionManager.open.bind(connectionManager)
    );
    const paramsParser = middleware.paramsParser();
    const batchParamsParser = middleware.batchParamsParser(paramsParser);

    return connect()
    .use(authServer.routes())
    .use(
      '/method', connect()
      .use(middleware.allowSslOrLocal())
      .use(middleware.allowHttpMethod('post'))
      .use(middleware.allowUrl(/^\/.+$/))
      .use(allowBearer)
      .use(paramsParser)
      .use(authConnect)
      .use(middleware.deny(self.denyRules['/method'], {
        token: allowBearer,
        params: paramsParser,
        connection: authConnect
      }))
      .use(middleware.method(
        authConnect, paramsParser, self.midwareOptions.method
      ))
    )
    .use(
      '/subscribe', connect()
      .use(middleware.allowSslOrLocal())
      .use(middleware.allowHttpMethod(['post', 'get']))
      .use(middleware.allowUrl(/^\/.+$/))
      .use(allowBearer)
      .use(paramsParser)
      .use(authConnect)
      .use(middleware.deny(self.denyRules['/subscribe'], {
        token: allowBearer,
        params: paramsParser,
        connection: authConnect
      }))
      .use(middleware.subscribe(
        authConnect, paramsParser, self.midwareOptions.subscribe
      ))
    )
    .use(
      '/batch', connect()
      .use(middleware.allowSslOrLocal())
      .use(middleware.allowHttpMethod('post'))
      .use(middleware.allowUrl(/^\/$/))
      .use(allowBearer)
      .use(batchParamsParser)
      .use(authConnect)
      .use(middleware.deny(self.denyRules['/batch'], {
        token: allowBearer,
        params: batchParamsParser,
        connection: authConnect
      }))
      .use(middleware.batch(authConnect, batchParamsParser))
    );
  }
}
