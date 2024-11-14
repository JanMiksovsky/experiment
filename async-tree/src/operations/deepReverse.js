import { Tree } from "../internal.js";

/**
 * Reverse the order of keys at all levels of the tree.
 *
 * @typedef  {import("@weborigami/types").AsyncTree} AsyncTree
 * @typedef {import("../../index.ts").Treelike} Treelike
 *
 * @param {Treelike} treelike
 * @returns {AsyncTree}
 */
export default function deepReverse(treelike) {
  if (!treelike) {
    const error = new TypeError(
      `deepReverse: The tree to reverse isn't defined.`
    );
    /** @type {any} */ (error).position = 0;
    throw error;
  }

  const tree = Tree.from(treelike, { deep: true });
  return {
    async get(key) {
      let value = await tree.get(key);
      if (Tree.isAsyncTree(value)) {
        value = deepReverse(value);
      }
      return value;
    },

    async keys() {
      const keys = Array.from(await tree.keys());
      keys.reverse();
      return keys;
    },
  };
}
