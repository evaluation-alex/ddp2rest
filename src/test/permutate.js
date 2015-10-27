const permutate = (setupFn) => {
  const solver = new Logic.Solver;
  setupFn(solver);

  return function gen () {
    var sol = solver.solve();
    if (sol) solver.forbid(sol.getFormula());
    return sol && sol.getTrueVars();
  }
}

/**
 * Breadth-first traversal
 * @param {Object} tree
 * @param {Function} callback
 *   Function which receives information about the current node and returns
 *   the next node to traverse. Returning the current node value means no
 *   nodes are skipped.
 */
const traverse = (tree, callback) => {
  var queue = [];
  var next = {parent: null, value: tree, path: []};
  var nextNodes;

  while (next) {
    nextNodes = callback(next);
    if (nextNodes instanceof Object) {
      for (var k in nextNodes) {
        const node = nextNodes[k];
        if (!node) return;
        queue.push({parent: next, value: node, path: next.path.concat(k)});
      }
    }
    next = queue.shift();
  }
};

// g = permutateParams({
//   method: {alt: ['post', 'get'], required: true},
//   auth: [cred.key + ':' + cred.secret, 'user:password'],
//   params: [[1, 2], {a: 1}, {grant_type: ['client_credentials', 'user']}]
// });

// All values must be either arrays or objects.
// Arrays are interpreted as alternative values. The first value of the array is
// the default.
function proto1 (solver) {
  var values = [];

  traverse(tree, node => {
    var value = Array.isArray(node.value) ?
    if (!node.parent) {
      values.push({key: node.path, value: node.value});
      solver.require(values.length - 1 + '');
      return node.value;
    }
    else if (node.)
    if (node.value instanceof ) {
    }
  });
}

// Intermediate
// {
//   []: {
//     {value: {}, id: '3'},
//   }
//   ['method']: [
//     {value: 'post', id: '1'}
//     {value: 'get', id: '2'}
//   ],
//   ['auth']: [
//     {value: 'asdf:zxcv', id: '3'},
//     {value: 'user:password', id: '4'}
//     {id: '5'}
//   ],
//   ['params']: [
//     {value: [1, 2], id: 'x'}
//     {value: null, id: 'x'}
//     {value: {}, id: '6'}
//   ],
//   ['params', 'grant_type']: [
//     {value: 'client_credentials', id: '7'}
//     {value: 'user', id: '8'}
//     {id: '9'}
//   ]
// }

// Default
// {
//   method: 'post',
//   auth: 'asdf:zxcv',
//   params: {grant_type: 'client_credentials'}
// }


const traverseParams = (params) => {
  const iter = (keyPath, ) => {
    var a, b, c;
    if (Array.isArray(params)) {
      return params;
    }
    else if (params instanceof Object)
  }
  iter('')
};

const makeTree = (params) => {
}

permutateParams = (params) {
  permutate(solver => {
  });
  // return {
  //   'default':
  //   next: ()
  // }
}
