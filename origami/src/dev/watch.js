import { Tree } from "@weborigami/async-tree";
import { formatError, moduleCache } from "@weborigami/language";
import ConstantTree from "../common/ConstantTree.js";
import getTreeArgument from "../common/getTreeArgument.js";

/**
 * Let a tree (e.g., of files) respond to changes.
 *
 * @typedef {import("@weborigami/types").AsyncTree} AsyncTree
 * @typedef {import("@weborigami/async-tree").Treelike} Treelike
 * @typedef {import("../../index.ts").Invocable} Invocable
 *
 * @this {AsyncTree|null}
 * @param {Treelike} [treelike]
 * @param {Invocable} [fn]
 */
export default async function watch(treelike, fn) {
  /** @type {any} */
  const container = await getTreeArgument(
    this,
    arguments,
    treelike,
    "dev:watch"
  );

  // Watch the indicated tree.
  await /** @type {any} */ (container).watch?.();

  if (fn === undefined) {
    return container;
  }

  // The caller supplied a function to reevaluate whenever the tree changes.
  let tree = await evaluateTree(container, fn);

  // We want to return a stable reference to the tree, so we'll use a prototype
  // chain that will always point to the latest tree. We'll extend the tree's
  // prototype chain with an empty object, and use that as a handle (pointer to
  // a pointer) to the tree. This is what we'll return to the caller.
  const handle = Object.create(tree);

  // Reevaluate the function whenever the tree changes.
  container.addEventListener?.("change", async () => {
    const tree = await evaluateTree(container, fn);
    moduleCache.resetTimestamp();
    updateIndirectPointer(handle, tree);
  });

  return handle;
}

async function evaluateTree(parent, fn) {
  let tree;
  let message;
  let result;
  try {
    result = await fn();
  } catch (/** @type {any} */ error) {
    message = formatError(error);
  }
  tree = result ? Tree.from(result, { parent }) : undefined;
  if (tree) {
    return tree;
  }
  if (!message) {
    message = `warning: watch expression did not return a tree`;
  }
  console.warn(message);
  tree = new ConstantTree(message);
  tree.parent = parent;
  return tree;
}

// Update an indirect pointer to a target.
function updateIndirectPointer(indirect, target) {
  // Clean the pointer of any named properties or symbols that have been set
  // directly on it.
  try {
    for (const key of Object.getOwnPropertyNames(indirect)) {
      delete indirect[key];
    }
    for (const key of Object.getOwnPropertySymbols(indirect)) {
      delete indirect[key];
    }
  } catch {
    // Ignore errors.
  }

  Object.setPrototypeOf(indirect, target);
}
