Tinytest.addAsync(
  'ddp2rest - /token', testConfig.default((test, complete) => {
    const url = serverUrl + '/api/token';
    const cred = Clients.findOne().env[0];
    const validOpt = {
      auth: cred.key + ':' + cred.secret,
      params: {grant_type: 'client_credentials'}
    };

    Promise.all([
      // No GET
      HTTP.getAsync(url).catch(x=>x)
      .then(err => test.equal(err.response.statusCode, 404)),

      // Missing options
      HTTP.postAsync(url).catch(x=>x)
      .then(err => test.equal(err.response.statusCode, 403)),

      // Invalid options
      HTTP.postAsync(url, _.omit(validOpt, 'params')).catch(x=>x)
      .then(err => test.equal(err.response.statusCode, 403)),
      HTTP.postAsync(url, _.omit(validOpt, 'auth')).catch(x=>x)
      .then(err => test.equal(err.response.statusCode, 403)),

      // Valid case
      HTTP.postAsync(url, validOpt)
      .then(res => {
        test.equal(res.statusCode, 200);
        check(res.data, {
          access_token: String,
          token_type: Match.Where(x => x.toLowerCase() === 'bearer'),
          expires_in: 3600
        });
      })
    ])
    .catch(errorHandler)
    .then(complete);
  })
);

Tinytest.addAsync(
  'ddp2rest - /method', testConfig.default((test, complete) => {
    const url = serverUrl + '/api/method';
    const cred = Clients.findOne().env[0];

    HTTP.postAsync(serverUrl + '/api/token', {
      auth: cred.key + ':' + cred.secret,
      params: {grant_type: 'client_credentials'}
    })
    .then(res => {
      test.equal(res.statusCode, 200);

      return 'Bearer ' + new Buffer(res.data.access_token, 'utf-8')
      .toString('base64');
    })
    .then((Authorization) => Promise.all([
      // Missing method name
      HTTP.postAsync(url).catch(x=>x)
      .then(err => test.equal(err.response.statusCode, 404)),

      // Valid method name but no token
      HTTP.postAsync(url + '/addFruit').catch(x=>x)
      .then(err => test.equal(err.response.statusCode, 401)),

      // Does not allow GET
      HTTP.getAsync(url + '/addFruit', {headers: {Authorization}}).catch(x=>x)
      .then(err => test.equal(err.response.statusCode, 404)),

      // Invalid method name
      HTTP.postAsync(url + '/asdf', {headers: {Authorization}}).catch(x=>x)
      .then(err => test.equal(err.response.statusCode, 404)),

      // Invalid parameters
      HTTP.postAsync(url + '/addFruit', {
        headers: {Authorization},
        data: {params: 'pear'}
      }).catch(x=>x)
      .then(err => test.equal(err.response.statusCode, 403)),

      // Missing parameters
      HTTP.postAsync(url + '/addFruit', {headers: {Authorization}}).catch(x=>x)
      .then(err => test.equal(err.response.statusCode, 400)),

      // Valid case
      HTTP.postAsync(url + '/addFruit', {
        headers: {Authorization},
        data: {params: ['pear']}
      })
      .then(res => {
        test.equal(res.statusCode, 200);
        check(res.data, Match.ObjectIncluding({
          method: {
            name: 'addFruit',
            result: String
          }
        }));
      }),
    ]))
    .catch(errorHandler(test))
    .then(complete);
  })
);

Tinytest.addAsync(
  'ddp2rest - /subscribe',
  testConfig.default(testConfig.data((test, complete) => {
    const url = serverUrl + '/api/subscribe';
    const cred = Clients.findOne().env[0];

    HTTP.postAsync(serverUrl + '/api/token', {
      auth: cred.key + ':' + cred.secret,
      params: {grant_type: 'client_credentials'}
    })
    .then(res => {
      test.equal(res.statusCode, 200);
      return 'Bearer ' + new Buffer(res.data.access_token, 'utf-8')
      .toString('base64');
    })
    .then(Authorization => Promise.all([
      // Missing subscription name
      HTTP.getAsync(url).catch(x=>x)
      .then(err => test.equal(err.response.statusCode, 404)),
      HTTP.postAsync(url).catch(x=>x)
      .then(err => test.equal(err.response.statusCode, 404)),

      // Valid subscription name but no token
      HTTP.postAsync(url + '/fruits').catch(x=>x)
      .then(err => test.equal(err.response.statusCode, 401)),

      // Invalid subscription name
      HTTP.postAsync(url + '/asdf', {headers: {Authorization}}).catch(x=>x)
      .then(err => test.equal(err.response.statusCode, 404)),

      // Invalid parameters
      HTTP.postAsync(url + '/fruits', {
        headers: {Authorization},
        data: {params: 1}
      }).catch(x=>x)
      .then(err => test.equal(err.response.statusCode, 403)),
      HTTP.getAsync(url + '/fruits', {
        headers: {Authorization},
        params: {
          params: encodeURIComponent(
            new Buffer(JSON.stringify(1), 'utf-8').toString('base64')
          )
        }
      }).catch(x=>x)
      .then(err => test.equal(err.response.statusCode, 403)),

      // Valid case
      HTTP.postAsync(url + '/fruits', {
        headers: {Authorization},
        data: {params: [1]}
      })
      .then(res => {
        test.equal(res.statusCode, 200);
        check(res.data, Match.ObjectIncluding({
          data: {
            fruits: Match.Where(x => {
              check(x, [{_id: String, name: String, qty: Match.Integer}]);
              return x.length === 1;
            }),
          }
        }));
      }),
      HTTP.getAsync(url + '/fruits', {
        headers: {Authorization},
        params: {
          params: encodeURIComponent(
            new Buffer(JSON.stringify([2]), 'utf-8').toString('base64')
          )
        }
      })
      .then(res => {
        test.equal(res.statusCode, 200);
        check(res.data, Match.ObjectIncluding({
          data: {
            fruits: Match.Where(x => {
              check(x, [{_id: String, name: String, qty: Match.Integer}]);
              return x.length === 2;
            }),
          }
        }));
      }),
    ]))
    .catch(errorHandler(test))
    .then(complete);
  }))
);

Tinytest.addAsync(
  'ddp2rest - /batch',
  testConfig.default(testConfig.data((test, complete) => {
    const url = serverUrl + '/api/batch';
    const cred = Clients.findOne().env[0];

    HTTP.postAsync(serverUrl + '/api/token', {
      auth: cred.key + ':' + cred.secret,
      params: {grant_type: 'client_credentials'}
    })
    .then(res => {
      test.equal(res.statusCode, 200);
      return 'Bearer ' + new Buffer(res.data.access_token, 'utf-8')
      .toString('base64');
    })
    .then(Authorization => Promise.all([
      //Invalid url
      HTTP.postAsync(url + '/asdf').catch(x=>x)
      .then(err => test.equal(err.response.statusCode, 404)),

      // Missing token
      HTTP.postAsync(url).catch(x=>x)
      .then(err => test.equal(err.response.statusCode, 401)),

      // Disallow GET
      HTTP.getAsync(url).catch(x=>x)
      .then(err => test.equal(err.response.statusCode, 404)),

      // No token
      HTTP.postAsync(url, {
        data: {params: [{subscribe: 'fruits', params: []}]}
      }).catch(x=>x)
      .then(err => test.equal(err.response.statusCode, 401)),

      // Invalid parameters
      HTTP.postAsync(url, {
        headers: {Authorization},
        data: {params: [{subscribe: 'fruits', params: 1}]}
      }).catch(x=>x)
      .then(err => test.equal(err.response.statusCode, 403)),

      // Valid case
      HTTP.postAsync(url, {
        headers: {Authorization},
        data: {
          params: [
            {subscribe: 'fruits', params: []},
            {method: 'addFruit', params: ['mango']},
            {method: 'asdf', params: []},
            {subscribe: 'zxcv', params: []},
            {subscribe: 'fruits', params: [{}]}
          ]
        }
      })
      .then(res => {
        test.equal(res.statusCode, 200);
        check(res.data, Match.ObjectIncluding({
          batch: Match.Where(x => {
            check(x[0], {subscribe: 'fruits', result: String});
            check(x[1], {method: 'addFruit', result: String});
            check(x[2], {method: 'asdf', error: 404});
            check(x[3], {subscribe: 'zxcv', error: 404});
            check(x[4], {subscribe: 'fruits', error: 400});
            return true;
          }),
          data: {
            fruits: Match.Where(x => {
              check(x, [{_id: String, name: String, qty: Match.Integer}]);
              return x.find(fruit => fruit.name === 'mango');
            }),
          }
        }));
      }),
    ]))
   .catch(errorHandler(test))
    .then(complete);
  }))
);
