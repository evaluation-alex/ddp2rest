const connect = WebAppInternals.NpmModules.connect.module;
const Fiber = Npm.require('fibers');

AuthServer = class AuthServer {
  constructor ({
    tokenLifetime = 3600,
    keyLength = 42,
    secretLength = 42,
    clients = new Mongo.Collection('ddp2rest_clients'),
    tokens = new Mongo.Collection('ddp2rest_tokens')
  } = {}) {
    check(keyLength, Match.Where(x => {
      check(x, Match.Integer);
      return x >= 32;
    }));
    check(secretLength, Match.Where(x => {
      check(x, Match.Integer);
      return x >= 32;
    }));
    const self = this;

    _.extend(self, {tokenLifetime, clients, tokens});

    self.denyRules = {
      '/token': []
    };
  }

  verifyClientCredentials (key, secret) {
    return this.clients.find({env: {$elemMatch: {key, secret}}}).count() === 1;
  }

  createClient (fields) {
    const self = this;

    // Basic check
    check(fields, {
      name: String,
      env: Match.Optional([String])
    });

    // Normalize
    fields.name = fields.name.trim();
    if (fields.env) fields.env = fields.env.map(x => x.trim());

    // Check
    if (fields.name)
      check(fields.name, Match.Where(x => x.length >= 1 && x.length <= 255));

    // Commit
    fields.created_at = new Date;
    fields.env = (fields.env || []).map(name => {
      return {
        name,
        key: Random.id(self.keyLength),
        secret: Random.secret(self.secretLength)
      };
    });

    return self.clients.insert(fields);
  }

  updateClient (id, fields) {
    const self = this;
    var modifiers = {$set: {}, $pull: {}, $push: {}};
    var result = [];

    // Basic check
    check(id, String);
    check(fields, {
      name: Match.Optional(String),
      env: Match.Optional(Match.OneOf(
        {set: [String]},
        {unset: [String]},
        {reset: [String]}
      ))
    });

    // Normalize
    if (fields.name) fields.name = fields.name.trim();

    // Check
    if (fields.name)
      check(fields.name, Match.Where(x => x.length >= 1 && x.length <= 255));

    // Commit
    if (fields.name) modifiers.$set.name = fields.name;
    (env => {
      if (!env) return;
      if (env.set) {
        modifiers.$push.env = {
          $each: env.set.map(name => {
            return {name, key: Random.id(32), secret: Random.secret(32)};
          })
        };
      }
      if (env.reset) {
        env.reset.forEach(key => {
          // It seems that we can't update of array elements in bulk
          result.push(self.clients.update(
            {_id: id, 'env.key': key},
            {$set: {'env.$.secret': Random.secret(32)}}
          ));
        });
      }
      if (env.unset) {
        modifiers.$pull.env = {key: {$in: env.unset}};
      }
    }(fields.env))
    modifiers = Object.keys(modifiers).reduce((acc, k) => {
      if (Object.keys(modifiers[k]).length > 0) acc[k] = modifiers[k];
      return acc;
    }, {});
    modifiers && result.push(self.clients.update({_id: id}, modifiers));

    return result;
  }

  removeClient (id) {
    const self = this;
    check(id, String);
    return self.clients.remove({_id: id});
  }

  verifyToken (token) {
    return !!this.tokens.find({token, expires_at: {$gt: new Date}}).count();
  }

  getTokenInfo (token) {
    return this.tokens.findOne({token});
  }

  createToken (client_key) {
    const self = this;
    const token = Random.secret(16);
    const now = new Date;
    const expires_at = new Date;
    expires_at.setSeconds(expires_at.getSeconds() + self.tokenLifetime);

    self.tokens.insert({token, client_key, expires_at, created_at: now});

    return token;
  }

  removeExpiredTokens () {
    this.tokens.remove({expires_at: {$lt: new Date}});
  }

  routes () {
    const self = this;
    const allowClient = middleware.allowOauth2Client(
      self.verifyClientCredentials.bind(self)
    );

    return connect()
    .use(
      '/token', connect()
      .use(middleware.allowSslOrLocal())
      .use(middleware.allowHttpMethod('post'))
      .use(middleware.allowUrl(/^\/$/))
      .use(allowClient)
      .use(middleware.deny(self.denyRules['/token'], {
        token: allowClient
      }))
      .use(middleware.grantToken(
        (...args) => maybeIf(() => allowClient(...args), x => x.key),
        key => ({
          access_token: self.createToken(key),
          token_type: 'Bearer',
          expires_in: self.tokenLifetime
        })
      ))
    );
  }
}
