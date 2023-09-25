import DeferredGraph2 from "./DeferredGraph2.js";
import * as Dictionary from "./Dictionary.js";
import FunctionGraph from "./FunctionGraph.js";
import MapGraph from "./MapGraph.js";
import ObjectGraph from "./ObjectGraph.js";
import SetGraph from "./SetGraph.js";
import defaultValueKey from "./defaultValueKey.js";

// Graph exports all dictionary helpers too.
export * from "./Dictionary.js";

/**
 * Helper functions for working with async graphs
 *
 * These add to the set of helper functions defined in Dictionary.
 *
 * @typedef {import("../index").Graphable} Graphable
 * @typedef {import("../index").PlainObject} PlainObject
 * @typedef {import("@graphorigami/types").AsyncGraph} AsyncGraph
 * @typedef {import("@graphorigami/types").AsyncMutableDictionary} AsyncMutableDictionary
 */

/**
 * Apply the key/values pairs from the source graph to the target graph.
 *
 * If a key exists in both graphs, and the values in both graphs are
 * subgraphs, then the subgraphs will be merged recursively. Otherwise, the
 * value from the source graph will overwrite the value in the target graph.
 *
 * @param {AsyncMutableDictionary} target
 * @param {AsyncGraph} source
 */
export async function assign(target, source) {
  const targetGraph = from(target);
  const sourceGraph = from(source);
  if (!Dictionary.isAsyncMutableDictionary(targetGraph)) {
    throw new TypeError("Target must be a mutable asynchronous graph");
  }
  // Fire off requests to update all keys, then wait for all of them to finish.
  const keys = Array.from(await sourceGraph.keys());
  const promises = keys.map(async (key) => {
    const sourceValue = await sourceGraph.get(key);
    if (Dictionary.isAsyncDictionary(sourceValue)) {
      const targetValue = await targetGraph.get(key);
      if (Dictionary.isAsyncMutableDictionary(targetValue)) {
        // Both source and target are graphs; recurse.
        await assign(targetValue, sourceValue);
        return;
      }
    }
    // Copy the value from the source to the target.
    await /** @type {any} */ (targetGraph).set(key, sourceValue);
  });
  await Promise.all(promises);
  return targetGraph;
}

// If the given plain object has only sequential integer keys, return it as an
// array. Otherwise return it as is.
function castArrayLike(obj) {
  let hasKeys = false;
  let expectedIndex = 0;
  for (const key in obj) {
    hasKeys = true;
    const index = Number(key);
    if (key === "" || isNaN(index) || index !== expectedIndex) {
      // Not an array-like object.
      return obj;
    }
    expectedIndex++;
  }
  return hasKeys ? Object.values(obj) : obj;
}

/**
 * Attempts to cast the indicated object to an async graph.
 *
 * @param {Graphable | Object} obj
 * @returns {AsyncGraph}
 */
export function from(obj) {
  if (Dictionary.isAsyncDictionary(obj)) {
    // Argument already supports the dictionary interface.
    // @ts-ignore
    return obj;
  } else if (obj && typeof obj === "object" && "toGraph" in obj) {
    // Variant exposes toGraph() method; invoke it.
    return obj.toGraph();
  } else if (obj instanceof Function) {
    return new FunctionGraph(obj);
  } else if (obj instanceof Map) {
    return new MapGraph(obj);
  } else if (obj instanceof Set) {
    return new SetGraph(obj);
  } else if (obj && typeof obj === "object" && "contents" in obj) {
    // Invoke contents and convert the result to a graph.
    let result = obj.contents();
    return result instanceof Promise
      ? new DeferredGraph2(result)
      : from(result);
  } else if (obj && typeof obj === "object") {
    // An instance of some class.
    return new ObjectGraph(obj);
  } else {
    // A primitive value like a number or string.
    return new ObjectGraph({
      [defaultValueKey]: obj,
    });
  }

  // throw new TypeError("Couldn't convert argument to an async graph");
}

/**
 * Returns true if the indicated object can be directly treated as an
 * asynchronous graph. This includes:
 *
 * - An object that implements the AsyncDictionary interface (including
 *   AsyncGraph instances)
 * - An object that implements the `toGraph()` method
 * - A function
 * - An `Array` instance
 * - A `Map` instance
 * - A `Set` instance
 * - A plain object
 *
 * Note: the `from()` method accepts any JavaScript object, but `isGraphable`
 * returns `false` for an object that isn't one of the above types.
 *
 * @param {any} obj
 */
export function isGraphable(obj) {
  return (
    Dictionary.isAsyncDictionary(obj) ||
    obj instanceof Function ||
    obj instanceof Array ||
    obj instanceof Set ||
    obj?.toGraph instanceof Function ||
    obj?.contents instanceof Function ||
    Dictionary.isPlainObject(obj)
  );
}

/**
 * Return true if the indicated key produces or is expected to produce an
 * async graph.
 *
 * This defers to the graph's own isKeyForSubgraph method. If not found, this
 * gets the value of that key and returns true if the value is an async
 * dictionary.
 */
export async function isKeyForSubgraph(graph, key) {
  if (graph.isKeyForSubgraph) {
    return graph.isKeyForSubgraph(key);
  }
  const value = await graph.get(key);
  return isGraphable(value);
}

/**
 * Given a path like "/foo/bar/baz", return an array of keys like ["foo", "bar",
 * "baz"].
 *
 * Leading slashes are ignored. Consecutive slashes or a trailing slash will
 * be represented by the `defaultValueKey` symbol. Example: the keys for the path
 * "/foo//bar/" will be ["foo", defaultValueKey, "bar", defaultValueKey].
 *
 * @param {string} pathname
 */
export function keysFromPath(pathname) {
  const keys = pathname.split("/");
  if (keys[0] === "") {
    // The path begins with a slash; drop that part.
    keys.shift();
  }
  // Map empty strings to the default value key.
  const mapped =
    keys.length === 0
      ? [defaultValueKey]
      : keys.map((key) => (key === "" ? defaultValueKey : key));
  return mapped;
}

export function makeGraphable(obj) {
  return isGraphable(obj)
    ? obj
    : new ObjectGraph({
        [defaultValueKey]: obj,
      });
}

/**
 * Map the values of a graph.
 *
 * @param {Graphable} variant
 * @param {Function} mapFn
 */
export async function map(variant, mapFn) {
  const result = new Map();
  const graph = from(variant);
  const keys = Array.from(await graph.keys());
  const promises = keys.map((key) =>
    graph.get(key).then(async (value) => {
      // If the value is a subgraph, recurse.
      const fn = Dictionary.isAsyncDictionary(value)
        ? map(value, mapFn)
        : mapFn(value, key);
      const mappedValue = await fn;
      result.set(key, mappedValue);
    })
  );
  await Promise.all(promises);
  return new MapGraph(result);
}

/**
 * Map and reduce a graph.
 *
 * This is done in as parallel fashion as possible. Each of the graph's values
 * will be requested in an async call, then those results will be awaited
 * collectively. If a mapFn is provided, it will be invoked to convert each
 * value to a mapped value; otherwise, values will be used as is. When the
 * values have been obtained, all the values and keys will be passed to the
 * reduceFn, which should consolidate those into a single result.
 *
 * @param {Graphable} variant
 * @param {Function|null} mapFn
 * @param {Function} reduceFn
 */
export async function mapReduce(variant, mapFn, reduceFn) {
  const graph = from(variant);

  // We're going to fire off all the get requests in parallel, as quickly as
  // the keys come in. We call the graph's `get` method for each key, but
  // *don't* wait for it yet.
  const keys = Array.from(await graph.keys());
  const promises = keys.map((key) =>
    graph.get(key).then((value) =>
      // If the value is a subgraph, recurse.
      Dictionary.isAsyncDictionary(value)
        ? mapReduce(value, mapFn, reduceFn)
        : mapFn
        ? mapFn(value, key)
        : value
    )
  );

  // Wait for all the promises to resolve. Because the promises were captured
  // in the same order as the keys, the values will also be in the same order.
  const values = await Promise.all(promises);

  // Reduce the values to a single result.
  return reduceFn(values, keys);
}

/**
 * Converts an asynchronous graph into a synchronous plain JavaScript object.
 *
 * The result's keys will be the graph's keys cast to strings. Any graph value
 * that is itself a graph will be similarly converted to a plain object.
 *
 * @param {Graphable} variant
 * @returns {Promise<PlainObject|Array>}
 */
export async function plain(variant) {
  return mapReduce(variant, null, (values, keys) => {
    const obj = {};
    for (let i = 0; i < keys.length; i++) {
      obj[keys[i]] = values[i];
    }
    return castArrayLike(obj);
  });
}

/**
 * Returns a function that invokes the graph's `get` method.
 *
 * @param {Graphable} graphable
 * @returns {Function}
 */
export function toFunction(graphable) {
  const graph = from(graphable);
  return graph.get.bind(graph);
}

/**
 * Return the value at the corresponding path of keys.
 *
 * @this {any}
 * @param {Graphable} variant
 * @param {...any} keys
 */
export async function traverse(variant, ...keys) {
  try {
    // Await the result here so that, if the path doesn't exist, the catch
    // block below will catch the exception.
    return await traverseOrThrow.call(this, variant, ...keys);
  } catch (/** @type {any} */ error) {
    if (error instanceof TraverseError) {
      return undefined;
    } else {
      throw error;
    }
  }
}

/**
 * Return the value at the corresponding path of keys. Throw if any interior
 * step of the path doesn't lead to a result.
 *
 * @this {any}
 * @param {Graphable} graphable
 * @param  {...any} keys
 */
export async function traverseOrThrow(graphable, ...keys) {
  // Start our traversal at the root of the graph.
  /** @type {any} */
  let value = graphable;

  // Process each key in turn.
  // If the value is ever undefined, short-circuit the traversal.
  const remainingKeys = keys.slice();
  while (remainingKeys.length > 0) {
    if (value === undefined) {
      const keyStrings = keys.map((key) => String(key));
      throw new TraverseError(
        `Couldn't traverse the path: ${keyStrings.join("/")}`,
        value,
        keys
      );
    }

    if (typeof value.contents === "function") {
      value = await value.contents();
    }

    // If the traversal operation was given a context, and the value we need to
    // traverse is a function, bind the function to the context.
    if (this && typeof value === "function") {
      value = value.bind(this);
    }

    // If someone is trying to traverse this thing, they mean to treat it as a
    // graph. If it's not already a graph, cast it to one.
    const graph = from(value);

    // If the graph supports the traverse() method, pass the remaining keys
    // all at once.
    if (graph.traverse) {
      value = await graph.traverse(...remainingKeys);
      break;
    }

    // Otherwise, process the next key.
    const key = remainingKeys.shift();
    value = await graph.get(key);

    // The default value is the graph itself.
    if (value === undefined && key === defaultValueKey) {
      value = graph;
    }
  }
  return value;
}

/**
 * Given a slash-separated path like "foo/bar", traverse the keys "foo" and
 * "bar" and return the resulting value.
 *
 * @param {Graphable} graph
 * @param {string} path
 */
export async function traversePath(graph, path) {
  const keys = keysFromPath(path);
  return traverse(graph, ...keys);
}

// Error class thrown by traverseOrThrow()
class TraverseError extends ReferenceError {
  constructor(message, graph, keys) {
    super(message);
    this.graph = graph;
    this.name = "TraverseError";
    this.keys = keys;
  }
}
