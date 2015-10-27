/**
 * A small function for handling empty or erroneous expressions
 *
 * @param {function} valueFunc - A function which evaluate and return a value.
 * @param {function} [ifSomething]
 *   A callback function which should receive the valueFunc value if it is not
 *   null, undefined or an error.
 * @param {function} [ifNothingOrError]
 *   A callback function which should receive the valueFunc value if it is null,
 *   undefined or an error.
 *
 * @return {*}
 *   Returns the value return by ifSomething or ifNothing. If callbacks are not
 *   specified, this returns the value by valueFunc or undefined if an error
 *   occurs in the valueFunc.
 */
maybeIf = (fn, ifSomething, ifNothingOrError) => {
  var value;

  if (typeof fn !== 'function') throw new Error('Argument must be function');

  try {
    value = fn.call(this);
  }
  catch (e) {
    return ifNothingOrError ? ifNothingOrError(e) : undefined;
  }

  if (value === null || value === undefined || value instanceof Error)
    return ifNothingOrError ? ifNothingOrError(value) : value;

  return ifSomething ? ifSomething(value) : value;
}
