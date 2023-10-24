import GlobTree from "../common/GlobTree.js";
import { treeWithScope } from "../common/utilities.js";
import assertScopeIsDefined from "../language/assertScopeIsDefined.js";

/**
 * Define a tree whose keys are globs.
 *
 * @typedef {import("@graphorigami/types").AsyncDictionary} AsyncDictionary
 * @typedef {import("@graphorigami/types").AsyncTree} AsyncTree
 * @typedef {import("@graphorigami/core").Treelike} Treelike
 * @param {Treelike} tree
 * @this {AsyncDictionary|null}
 */
export default async function globs(tree) {
  assertScopeIsDefined(this);
  /** @type {AsyncTree} */
  let result = new GlobTree(tree);
  if (this) {
    tree = treeWithScope(tree, this);
  }
  return result;
}

globs.usage = `@globs <patterns>\tDefine a tree whose keys can include wildcard globs`;
globs.documentation = "https://graphorigami.org/language/@globs.html";
