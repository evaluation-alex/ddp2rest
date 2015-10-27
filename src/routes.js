routes = {
  '/oauth2/token': function (req, res, next) {
    Fiber(() => {
      console.log('oauth2/token');
      req = req || {};
      const self = this;

      if (req.url !== '/' || req.method !== 'POST') {
        res.writeHead(404);
        return res.end();
      }

      const body = req.body || {};
      if (body.grant_type !== 'client_credentials') {
        res.writeHead(403);
        return res.end('Missing or invalid grant_type');
      }
      const credentials = basicAuth(req);
      var token;

      if (credentials && self.verifyClient(credentials.name, credentials.pass))
        token = self.createToken(credentials.name);

      if (token) {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify(token));
      }
      else {
        res.writeHead(403);
        res.end('Unable to verify your credentials');
      }
    }).run();
  },

  '/oauth2/invalidate_token': function (req, res, next) {
    // POST
    Fiber(() => {
    }).run();
  },

  '/method': function (req, res, next) {
    Fiber(() => {
      const self = this;
      req = req || {};
      const methodName =
        decodeURI(req._parsedUrl.pathname).replace('/method', '').slice(1);
      if (!methodName || req.method !== 'POST') {
        res.writeHead(404);
        return res.end();
      }
      console.log('method', methodName);
      next();
    }).run();
  },

  '/subscribe': function (req, res, next) {
    Fiber(() => {
      const self = this;
      req = req || {};
      const subName =
        decodeURI(req._parsedUrl.pathname).replace('/subscribe', '').slice(1);
      if (!subName || ['POST', 'GET'].indexOf(req.subName) < 0) {
        res.writeHead(404);
        return res.end();
      }
      console.log('subscribe', subName);
      next()
    }).run();
  },

  '/batch': function (req, res, next) {
  }
};
