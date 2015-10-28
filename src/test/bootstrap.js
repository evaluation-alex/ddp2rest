serverUrl = 'http://localhost:' + process.env.PORT;

Clients = new Mongo.Collection('ddp2rest_clients');
Tokens = new Mongo.Collection('ddp2rest_tokens');
Fruits = new Mongo.Collection('fruits');

// Promisify HTTP
for (let k in HTTP) {
  HTTP[k + 'Async'] = (...args) => {
    return new Promise((y, n) => {
      HTTP[k](...args, (err, res) => {
        if (err) n(err);
        else y(res);
      });
    });
  };
}

errorHandler = test => err => {
  if (err instanceof Meteor.Error) test.fail(err);
  else if (err instanceof Error) test.fail(err.stack);
  else test.fail();
};

testConfig = {
  'default': (testFn) => {
    return (...args) => {
      Clients.remove({});
      Tokens.remove({});
      { const stack = WebApp.connectHandlers.stack;
        stack.splice(stack.find(v => v.route === '/api'), 1);
      }
      const server = ddp2rest({clients: Clients, tokens: Tokens});
      server.authServer.createClient({name: 'foo', env: ['dev', 'prod']});

      testFn(...args);
    }
  },

  data: (testFn) => {
    return (...args) => {
      Fruits.remove({});
      ['apple', 'banana', 'cherry'].forEach(name => {
        Fruits.insert({name, qty: 1});
      });

      testFn(...args);
    }
  },
};

Meteor.methods({
  'addFruit' (name, qty = 1) {
    check(name, String);
    check(qty, Match.Integer);
    return Fruits.insert({name, qty});
  }
});

Meteor.publish('fruits', (limit = 200) => {
  check(limit, Match.Integer);
  return Fruits.find({}, {limit});
});
