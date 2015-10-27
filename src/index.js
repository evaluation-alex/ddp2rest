ddp2rest = function (opt = {}) {
  const server = new Server(opt);
  WebApp.connectHandlers.use(opt.route || '/api', server.routes());
  return server;
}
_.extend(ddp2rest, {
  middleware, memoizeMidWare, Server, AuthServer, ConnectionManager
});
