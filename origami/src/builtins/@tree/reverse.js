import { Tree } from "@weborigami/async-tree";
import { Scope } from "@weborigami/language";
import assertScopeIsDefined from "../../misc/assertScopeIsDefined.js";

/**
 * Reverse the order of the top-level keys in the tree.
 *
 * @typedef  {import("@weborigami/types").AsyncTree} AsyncTree
 * @typedef {import("@weborigami/async-tree").Treelike} Treelike
 * @typedef {import("@weborigami/async-tree").PlainObject} PlainObject
 *
 * @this {AsyncTree|null}
 * @param {Treelike} [treelike]
 * @param {PlainObject} [options]
 */
export default async function reverse(treelike, options = {}) {
  assertScopeIsDefined(this);
  treelike = treelike ?? (await this?.get("@current"));
  if (treelike === undefined) {
    return undefined;
  }
  const scope = this;
  const tree = Tree.from(treelike);
  const deep = options.deep ?? false;

  /** @type {AsyncTree} */
  let reversed = {
    async get(key) {
      let value = await tree.get(key);

      if (deep && Tree.isAsyncTree(value)) {
        value = reverse.call(scope, value, options);
      }

      return value;
    },

    async keys() {
      const keys = Array.from(await tree.keys());
      keys.reverse();
      return keys;
    },
  };

  reversed = Scope.treeWithScope(reversed, this);

  return reversed;
}

reverse.usage = `reverse <tree>\tReverses the order of the tree's top-level keys`;
reverse.documentation = "https://weborigami.org/cli/builtins.html#reverse";
