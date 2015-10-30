serverUrl = 'http://localhost:' + process.env.PORT;

Clients = new Mongo.Collection('ddp2rest_clients');
Tokens = new Mongo.Collection('ddp2rest_tokens');
Fruits = new Mongo.Collection('fruits');

// Promisify HTTP
for (let k in HTTP) {
  HTTP[k + 'Async'] = HTTP[k].async();
}

errorHandler = test => err => {
  if (err instanceof Meteor.Error) test.fail(err);
  else if (err instanceof Error) test.fail(err.stack);
  else test.fail();
};

/** Creates a test config wrapper function */
const makeConfig = (setupFn, teardownFn) => (testFn) => (test, complete) => {
  // We hook into the complete function to run the teardown function.
  const wrappedComplete = (function (c) {
    return () => {
      c && c();
      teardownFn();
    };
  }(complete));

  teardownFn();
  setupFn();
  // If no complete function is provided, we assume it is a sync test, which
  // requires runing the teardown manually.
  testFn(test, wrappedComplete);
  if (!complete) clearFn();
};

testAction = {
  addServer (options = {}) {
    var server = ddp2rest(_.extend({clients: Clients, tokens: Tokens}, options));
    server.authServer.createClient({name: 'foo', env: ['dev', 'prod']});

    return server;
  },

  removeServer (server) {
    server && server.stop();
    { const stack = WebApp.connectHandlers.stack;
      stack.splice(stack.find(v => v.route === '/api'), 1);
    }
    Clients.remove({});
    Tokens.remove({});
  },

  getBearerToken () {
    const cred = Clients.findOne().env[0];

    return HTTP.postAsync(serverUrl + '/api/token', {
      auth: cred.key + ':' + cred.secret,
      params: {grant_type: 'client_credentials'}
    })
    .then(res => {
      return 'Bearer ' + new Buffer(res.data.access_token, 'utf-8')
      .toString('base64');
    });
  }
};

testConfig = {
  'default': (function () {
    var server;

    return makeConfig(
      () => { server = testAction.addServer(); },
      () => { testAction.removeServer(server); }
    );
  }()),

  data: makeConfig(
    () => {
      ['apple', 'banana', 'cherry'].forEach(name => {
        Fruits.insert({name, qty: 1});
      });
    },
    () => Fruits.remove({})
  ),

  accounts: makeConfig(
    () => Accounts.createUser({username: 'fruit', password: 'fruit'}),
    () => Meteor.users.remove({})
  )
};

Meteor.methods({
  'addFruit' (name, qty = 1) {
    check(name, String);
    check(qty, Match.Integer);
    return Fruits.insert({name, qty});
  }
});

Meteor.publish('fruits', function (limit = 200) {
  check(limit, Match.Integer);
  return Fruits.find({}, {limit});
});

Meteor.publish('secureFruits', function (limit = 200) {
  check(this.userId, String);
  return Fruits.find({}, {limit});
});
