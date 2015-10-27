serverUrl = 'http://localhost:' + process.env.PORT;

Clients = new Mongo.Collection('ddp2rest_clients');
Tokens = new Mongo.Collection('ddp2rest_tokens');

// Promisify HTTP
for (let k in HTTP) {
  HTTP[k + 'Async'] = HTTP[k].async();
}

errorHandler = err => {
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
  }
};

Fruits = new Mongo.Collection('fruits');

Meteor.methods({
  'addFruit' (name, qty = 1) {
    check(name, String);
    check(qty, Match.Integer);
    return Fruits.insert({name, qty});
  }
});

Meteor.publish('fruits', () => Fruits.find());
