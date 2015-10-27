const connect = WebAppInternals.NpmModules.connect.module;
// var basicAuth = Npm.require('basic-auth');
const ProxyConnection = ddp2rest.ProxyConnection;
const Fiber = Npm.require('fibers');

function auth () {
  var app = connect();

  app.use(allowHttps())
  // app.use(connect.bodyParser());
  // app.use(
  //   '/token', connect()
  //   .use(allowMethod('post'))
  //   .use(apiserver.authenticate('oauth2-client'))
  // );
  // app.use(apiserver.authenticate('bearer'));
  // app.use(
  //   '/subscribe', connect()
  //   .use(allow('method', 'post'))
  // )
  // app.use('/subscribe', apiserver.authenticate('bearer'));

  return app;
}

_.extend(ddp2rest, {Server});

Meteor.startup(function () {
  new ddp2rest.Server;
});

var onRequest = function (context) {
  var self = context;
  var result = {};
  self.setContentType("application/json");
  var headers = self.requestHeaders;
  var clientKey = headers['x-ddpproxy-clientkey'];
  if (!clientKey || !isValidClientKey) {
    self.setStatusCode(401);
    result.error = "Invalid client key";
    return result;
  }

  var proxySessionId = headers['x-ddpproxy-sessionid'];
  var loginOptions = headers['x-ddpproxy-login'];
  if (loginOptions) {
    try { loginOptions = EJSON.parse(loginOptions); } catch (e) {}
  }
  var connection = DDPproxy.connect('default', proxySessionId, loginOptions);
  // If connection fail
  if (!connection || !connection.status() ||
      !connection.status().connected) {
    self.setStatusCode(502);
    return {
      error: "Cannot make DDP connection"
    };
  }
  if (connection) result.connection = connection;

  // If login fail
  if (loginOptions && (!connection.loginStatus && !connection.loginStatus.id)) {
    self.setStatusCode(401);
    result.loginStatus = connection.loginStatus;
    result.error = "Fail to login";
    return result;
  }

  if (loginOptions && !loginOptions.resume && connection.loginStatus)
    result.loginStatus = connection.loginStatus;

  return result;
};
