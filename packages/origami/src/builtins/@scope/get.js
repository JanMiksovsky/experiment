/** @typedef {import("@graphorigami/types").AsyncDictionary} AsyncDictionary */
import { GraphHelpers } from "@graphorigami/core";
import assertScopeIsDefined from "../../language/assertScopeIsDefined.js";

/**
 * Returns the scope of the indicated graph or the current scope.
 *
 * @this {AsyncDictionary|null}
 * @param {GraphVariant} [variant]
 */
export default async function getScope(variant) {
  assertScopeIsDefined(this);
  let scope;
  if (variant) {
    const graph = GraphHelpers.from(variant);
    scope = /** @type {any} */ (graph).scope;
  } else {
    scope = this;
  }
  return scope;
}

getScope.usage = `@scope/get [<graph>]\tReturns the scope of the graph or the current scope`;
getScope.documentation = "https://graphorigami.org/cli/builtins.html#@scope";
