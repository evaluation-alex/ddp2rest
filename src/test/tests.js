Tinytest.addAsync(
  'ddp2rest - /token', testConfig.default((test, complete) => {
    const url = serverUrl + '/api/token';
    const cred = Clients.findOne().env[0];
    const validOpt = {
      auth: cred.key + ':' + cred.secret,
      params: {grant_type: 'client_credentials'}
    };

    Promise.all([
      HTTP.getAsync(url).catch(x=>x)
      .then(err => test.equal(err.response.statusCode, 404)),
      HTTP.postAsync(url).catch(x=>x)
      .then(err => test.equal(err.response.statusCode, 403)),
      HTTP.postAsync(url, _.omit(validOpt, 'params')).catch(x=>x)
      .then(err => test.equal(err.response.statusCode, 403)),
      HTTP.postAsync(url, _.omit(validOpt, 'auth')).catch(x=>x)
      .then(err => test.equal(err.response.statusCode, 403)),
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
      params: {grant_type: 'client_credentials'},
      timeout: 2000
    })
    .then(res => {
      test.equal(res.statusCode, 200);
      return res.data.access_token;
    })
    .then((token) => Promise.all([
      HTTP.getAsync(url).catch(x=>x)
      .then(err => test.equal(err.response.statusCode, 404)),
      HTTP.postAsync(url).catch(x=>x)
      .then(err => test.equal(err.response.statusCode, 404)),
      // HTTP.postAsync(url + 'asdf').catch(x=>x)
      // .then(err => test.equal(err.response.statusCode, 404)),
      HTTP.postAsync(url + '/addFruit', {
        headers: {
          Authorization:
            'Bearer ' + new Buffer(token, 'utf-8').toString('base64')
        },
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
    .catch(errorHandler)
    .then(complete);
  })
);

Tinytest.addAsync(
  'ddp2rest - /subscribe', testConfig.default((test, complete) => {
    const url = serverUrl + '/api/subscribe';
    const cred = Clients.findOne().env[0];

    HTTP.postAsync(serverUrl + '/api/token', {
      auth: cred.key + ':' + cred.secret,
      params: {grant_type: 'client_credentials'},
      timeout: 2000
    })
    .then(res => {
      test.equal(res.statusCode, 200);
      return res.data.access_token;
    })
    .then((token) => Promise.all([
      HTTP.getAsync(url).catch(x=>x)
      .then(err => test.equal(err.response.statusCode, 404)),
      // HTTP.postAsync(url).catch(x=>x)
      // .then(err => test.equal(err.response.statusCode, 404)),
      // HTTP.postAsync(url + '/addFruit', {
      //   headers: {
      //     Authorization:
      //       'Bearer ' + new Buffer(token, 'utf-8').toString('base64')
      //   },
      //   data: {params: ['pear']}
      // })
      // .then(res => {
      //   test.equal(res.statusCode, 200);
      //   check(res.data, Match.ObjectIncluding({
      //     method: {
      //       name: 'addFruit',
      //       result: String
      //     }
      //   }));
      // }),
    ]))
    .catch(errorHandler)
    .then(complete);
  })
);
