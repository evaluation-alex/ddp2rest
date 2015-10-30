Tinytest.addAsync(
  'ddp2rest - Server - Stop all connections', (test, complete) => {
    const server = testAction.addServer();
    const connections = server.connectionManager._connections;

    test.equal(_.size(connections), 0);

    Promise.all([
      testAction.getBearerToken()
      .then(Authorization => HTTP.postAsync(
        serverUrl + '/api/subscribe/fruits', {headers: {Authorization}}
      ))
      .then(res => test.equal(res.statusCode, 200)),

      testAction.getBearerToken()
      .then(Authorization => HTTP.postAsync(
        serverUrl + '/api/subscribe/fruits', {headers: {Authorization}}
      ))
      .then(res => test.equal(res.statusCode, 200))
    ])
    .then(() => test.equal(_.size(connections), 2))
    .catch(errorHandler(test))
    .then(() => {
      testAction.removeServer();
      complete();
    });
  }
);

Tinytest.addAsync(
  'ddp2rest - Server - Clear expired connections', (test, complete) => {
    complete();
  }
);

Tinytest.addAsync(
  'ddp2rest - Server - Set connection timeout', (test, complete) => {
    complete();
  }
);

Tinytest.addAsync(
  'ddp2rest - Server - Set max connections', (test, complete) => {
    complete();
  }
);

Tinytest.addAsync(
  'ddp2rest - Server - Set connection lifetime', (test, complete) => {
    complete();
  }
);

Tinytest.addAsync(
  'ddp2rest - Server - Set token lifetime', (test, complete) => {
    complete();
  }
);

Tinytest.addAsync(
  'ddp2rest - Server - Set collections', (test, complete) => {
    complete();
  }
);

Tinytest.addAsync(
  'ddp2rest - Server - Set key and secret length', (test, complete) => {
    complete();
  }
)

Tinytest.addAsync(
  'ddp2rest - Server - Multi-instance configuration', (test, complete) => {
    complete();
  }
);

Tinytest.addAsync(
  'ddp2rest - Server - Deny rules', (test, complete) => {
    complete();
  }
);
