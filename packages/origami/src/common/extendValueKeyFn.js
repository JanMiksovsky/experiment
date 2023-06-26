/** @typedef {import("@graphorigami/types").AsyncDictionary} AsyncDictionary */
import { GraphHelpers, ObjectGraph } from "@graphorigami/core";
import ExplorableGraph from "../core/ExplorableGraph.js";
import { getScope, keySymbol, transformObject } from "../core/utilities.js";
import InheritScopeTransform from "../framework/InheritScopeTransform.js";
import Scope from "./Scope.js";

/**
 * Builtins like map() want to call a function that takes a value and a key.
 * They want to extend the scope passed to such a function to include the value
 * and key. This helper does that.
 *
 * @param {Invocable} valueKeyFn
 */
export default function extendValueKeyFn(valueKeyFn, options = {}) {
  // Convert from an Invocable to a real function.
  /** @type {any} */
  const fn =
    typeof valueKeyFn === "function"
      ? valueKeyFn
      : valueKeyFn &&
        typeof valueKeyFn === "object" &&
        "toFunction" in valueKeyFn
      ? valueKeyFn.toFunction()
      : ExplorableGraph.canCastToExplorable(valueKeyFn)
      ? ExplorableGraph.toFunction(valueKeyFn)
      : valueKeyFn;

  /**
   * @this {AsyncDictionary|null}
   * @param {any} value
   * @param {any} key
   */
  return async function extendedValueKeyFn(value, key) {
    if (typeof fn !== "function") {
      // Constant value, return as is.
      return fn;
    }

    // Create a scope graph by extending the context graph with the @key and
    // @dot ambient properties.
    const keyName = options.keyName ?? "@key";
    const valueName = options.valueName ?? "@value";

    // See if the value is a graph or can be cast to a graph.
    let valueGraph;
    if (ExplorableGraph.isExplorable(value)) {
      valueGraph = value;
    } else if (ExplorableGraph.canCastToExplorable(value)) {
      valueGraph = GraphHelpers.from(value);
    }
    if (valueGraph && !("parent" in valueGraph && "scope" in valueGraph)) {
      valueGraph = transformObject(InheritScopeTransform, valueGraph);
    }

    const ambientsGraph = new (InheritScopeTransform(ObjectGraph))({
      ".": valueGraph ?? null,
      [keyName]: key,
      [valueName]: value ?? null,
    });
    ambientsGraph[keySymbol] = key;

    let scope = new Scope(valueGraph, ambientsGraph, getScope(this));

    if (valueGraph) {
      valueGraph.parent = scope;
      // REVIEW: If this option doesn't prove valuable, remove it
      if (options.addValueToScope) {
        scope = valueGraph.scope;
      }
    }

    return fn.call(scope, value, key);
  };
}
