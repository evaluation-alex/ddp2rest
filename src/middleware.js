const connect = WebAppInternals.NpmModules.connect.module;
const basicAuth = Npm.require('basic-auth');

var exports = {};

// Sourced from: https://github.com/meteor/meteor/blob/devel/packages/force-ssl/force_ssl_server.js
// Determine if the connection was over SSL at any point. Either we received it
// as SSL, or a proxy did and translated it for us.
//
// Note: someone could trick us into serving over non-ssl by setting
// x-forwarded-for or x-forwarded-proto. Not much we can do there if we still
// want to operate behind proxies.
const isSsl = (req) => {
  return req.connection.pair ||
    (req.headers['x-forwarded-proto'] &&
     req.headers['x-forwarded-proto'].indexOf('https') !== -1);
}

// Sourced from: https://github.com/meteor/meteor/blob/devel/packages/force-ssl/force_ssl_server.js
// Determine if the connection is only over localhost. Both we received it on
// localhost, and all proxies involved received on localhost.
const isLocal = (req) => {
  const remoteAddress =
    req.connection.remoteAddress || req.socket.remoteAddress;
  const localhostRegexp = /^\s*(127\.0\.0\.1|::1)\s*$/;
  return (
    localhostRegexp.test(remoteAddress) &&
      (!req.headers['x-forwarded-for'] ||
       _.all(req.headers['x-forwarded-for'].split(','), function (x) {
         return localhostRegexp.test(x);
       })));
}

exports.allowSslOrLocal = () => (req, res, next = () => {}) => {
  if (isLocal(req) || isSsl(req)) next();
  else {
    res.writeHead(403);
    res.end('SSL is required');
  }
}

exports.allowHttpMethod = (methods) => {
  check(methods, Match.OneOf([String], String));

  return (req, res, next = () => {}) => {
    if ([].concat(methods).indexOf(req.method.toLowerCase()) >= 0) next();
    else {
      res.writeHead(404)
      res.end();
    }
  };
};

exports.allowUrl = (pattern) => {
  check(pattern, Match.OneOf(RegExp, String));

  return (req, res, next = () => {}) => {
    if (req.url.match(pattern)) next();
    else {
      res.writeHead(404);
      res.end();
    }
  }
}

exports.allowOauth2Client = (verifyFn) => {
  check(verifyFn, Function);

  return memoizeMidWare((req, res, next) => {
    if (!req.body) {
      Promise.await(new Promise((y, n) => connect.bodyParser()(req, res, y)));
    }
    if (req.body.grant_type !== 'client_credentials') {
      res.writeHead(403);
      res.end('Missing or invalid grant_type');
      return undefined;
    }

    const credentials = basicAuth(req);
    if (credentials && verifyFn(credentials.name, credentials.pass)) {
      next();
      return (({name: key, pass: secret}) => ({key, secret}))(credentials);
    }
    else {
      res.writeHead(403);
      res.end('Unable to verify your credentials');
      return undefined;
    }
  });
};

exports.allowBearer = (verifyFn) => {
  check(verifyFn, Function);

  return memoizeMidWare((req, res, next) => {
    const auth = maybeIf(() => req.headers.authorization.split(' '));
    if (auth) auth[1] = auth[1] && new Buffer(auth[1], 'base64').toString();
    if (
      !Array.isArray(auth) || auth.length !== 2 ||
      auth[0].toLowerCase() !== 'bearer' || !verifyFn(auth[1])
    ) {
      res.writeHead(401);
      res.end('Invalid or expired token');
      return undefined;
    }
    else {
      next();
      return auth[1];
    }
  });
};

exports.grantToken = (keyFn, createTokenFn) => {
  check(keyFn, Function);
  check(createTokenFn, Function);

  return (req, res) => {
    const key = keyFn(req, res);
    const token = createTokenFn(key);
    if (!token) {
      res.writeHead(403);
      res.end('Unable to create token');
    }
    else {
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify(token));
    }
  };
}

exports.connectWithToken = (tokenFn, tokenInfoFn, newConnFn) => {
  check(tokenFn, Function);
  check(tokenInfoFn, Function);
  check(newConnFn, Function);

  return memoizeMidWare((req, res, next) => {
    const token = tokenFn(req, res, ()=>{});
    const tokenInfo = tokenInfoFn(token);
    const connection =
      maybeIf(
        () => newConnFn(
          tokenInfo.client_key, {expiresAt: tokenInfo.expires_at}
        )
      );
    if (!connection) {
      res.writeHead(500);
      res.end('Unable to create connection');
      return undefined;
    }
    else {
      next();
      return connection;
    }
  });
};

exports.paramsParser = () => {
  return memoizeMidWare((req, res, next) => {
    Promise.await(new Promise((y, n) => connect.bodyParser()(req, res, y)));
    const params = req.body.params || [];
    if (Array.isArray(params)) {
      next();
      return params;
    }

    res.writeHead(403);
    res.end('Invalid parameters');
    return undefined;
  });
};

exports.batchParamsParser = (paramsFn) => {
  check(paramsFn, Function);

  return memoizeMidWare((req, res, next) => {
    const params = paramsFn(req, res);
    const t = Match.test(params, Match.Where(params => {
      const len = params.length;
      if (!(len > 0 && len <= 50)) return false;

      return Match.test(params, [Match.OneOf(
        {method: String, params: Array},
        {subscribe: String, params: Array}
      )]);
    }));

    if (t) {
      next();
      return params;
    }
    else {
      res.writeHead(403);
      res.end('Invalid parameters');
      return undefined;
    }
  });
}

/**
 * Subscribe requests
 */
exports.subscribe = (connFn, paramsFn) => {
  check(connFn, Function);
  check(paramsFn, Function);

  return (req, res) => {
    const connection = connFn(req, res);
    const params = paramsFn(req, res);
    const subName = decodeURI(req.url.slice(1));

    connection._subscribeAndWait(subName, params);
    const data = connection.fetch();

    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({data}));
  }
}

/**
 * Method requests
 */
exports.method = (connFn, paramsFn) => {
  check(connFn, Function);
  check(paramsFn, Function);

  return (req, res) => {
    const connection = connFn(req, res);
    const params = paramsFn(req, res);
    const methodName = decodeURI(req.url.slice(1));

    const methodRes =
      maybeIf(
        () => connection.apply(methodName, params),
        v => ({result: v}), e => ({error: e})
      );
    const data = connection.fetch();

    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({
      method: _.extend({name: methodName}, methodRes),
      data
    }));
  }
};

/**
 * Accept batch requests
 */
exports.batch = (connFn, paramsFn) => {
  check(connFn, Function);
  check(paramsFn, Function);

  return (req, res) => {
    const connection = connFn(req, res);
    const params = paramsFn(req, res);

    const methodRes = params.reduce((acc, param) => {
      if (param.method) {
        acc.push(
          _.extend({name: param.method}, maybeIf(
            () => connection.apply(param.method, param.params),
            v => {result: v}, e => {error: e}
          ))
        );
      }
      else if (param.subscribe) {
        connection._subscribeAndWait(param.subscribe, param.params);
      }

      return acc;
    }, []);
    const data = connection.fetch();

    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({
      method: [_.extend({name: methodName}, methodRes)],
      data
    }));
  }
};

middleware = exports;
