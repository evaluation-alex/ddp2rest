const connect = WebAppInternals.NpmModules.connect.module;
const Fiber = Npm.require('fibers');

Server = class Server {
  constructor (opt = {}) {
    const self = this;

    self.authServer = opt.authServer || new AuthServer(opt);
    self.connectionManager =
      opt.connectionManager || new ConnectionManager(opt);
    self.persistMethods = opt.persistMethods || ['login'];
  }

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
      .use(middleware.method(authConnect, paramsParser))
    )
    .use(
      '/subscribe', connect()
      .use(middleware.allowSslOrLocal())
      .use(middleware.allowHttpMethod(['post', 'get']))
      .use(middleware.allowUrl(/^\/.+$/))
      .use(allowBearer)
      .use(paramsParser)
      .use(authConnect)
      .use(middleware.subscribe(authConnect, paramsParser))
    )
    .use(
      '/batch', connect()
      .use(middleware.allowSslOrLocal())
      .use(middleware.allowHttpMethod('post'))
      .use(middleware.allowUrl(/^\/$/))
      .use(allowBearer)
      .use(batchParamsParser)
      .use(authConnect)
      .use(middleware.batch(authConnect, batchParamsParser))
    );
  }
}
