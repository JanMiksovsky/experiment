import MapExtensionsTree from "../../common/MapExtensionsTree.js";
import MapValuesTree from "../../common/MapValuesTree.js";
import { treeWithScope } from "../../common/utilities.js";
import assertScopeIsDefined from "../../language/assertScopeIsDefined.js";

/**
 * Map the top-level values of a tree with a map function.
 *
 * @typedef {import("@graphorigami/types").AsyncDictionary} AsyncDictionary
 * @typedef {import("@graphorigami/types").AsyncTree} AsyncTree
 * @typedef {import("@graphorigami/core").Treelike} Treelike
 * @typedef {import("@graphorigami/core").PlainObject} PlainObject
 * @typedef {import("../../..").Invocable} Invocable
 *
 * @this {AsyncDictionary|null}
 * @param {Treelike} treelike
 * @param {Invocable} mapFn
 * @param {PlainObject} options
 */
export default function map(treelike, mapFn, options = {}) {
  assertScopeIsDefined(this);
  if (!treelike) {
    return undefined;
  }

  const TreeClass =
    options.extension === undefined ? MapValuesTree : MapExtensionsTree;
  /** @type {AsyncTree} */
  let mappedTree = new TreeClass(treelike, mapFn, options);
  if (this) {
    mappedTree = treeWithScope(mappedTree, this);
  }
  return mappedTree;
}

map.usage = `map <tree, fn>\tMap the top-level values in a tree`;
map.documentation = "https://graphorigami.org/cli/builtins.html#map";
