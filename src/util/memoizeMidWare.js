const http = Npm.require('http');

memoizeMidWare = (midWare) => (req, res, next = ()=>{}) => Promise.Fiber(() => {
  const cache = req._memoized = req._memoized || new Map;
  if (cache.has(midWare)) return cache.get(midWare);

  // We convert next() to an async function so we can obtain the return value
  // of the middleware
  let oldNext = next;
  next = () => Meteor.setTimeout(oldNext, 0);

  const result = midWare(req, res, next);
  cache.set(midWare, result);
  return result;
}).run();
