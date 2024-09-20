import { Tree } from "./internal.js";
import * as symbols from "./symbols.js";
import * as trailingSlash from "./trailingSlash.js";
import { getRealmObjectPrototype, setParent } from "./utilities.js";

/**
 * A tree defined by a plain object or array.
 *
 * @typedef {import("@weborigami/types").AsyncMutableTree} AsyncMutableTree
 * @implements {AsyncMutableTree}
 */
export default class ObjectTree {
  /**
   * Create a tree wrapping a given plain object or array.
   *
   * @param {any} object The object/array to wrap.
   */
  constructor(object) {
    this.object = object;
    this.parent = object[symbols.parent] ?? null;
  }

  /**
   * Return the value for the given key.
   *
   * @param {any} key
   */
  async get(key) {
    if (key == null) {
      // Reject nullish key.
      throw new ReferenceError(
        `${this.constructor.name}: Cannot get a null or undefined key.`
      );
    }

    // Try key as is
    let value = this.object[key];
    if (value === undefined) {
      if (trailingSlash.has(key)) {
        // Try key without trailing slash
        key = trailingSlash.remove(key);
        value = this.object[key];
        if (!Tree.isTreelike(value)) {
          return undefined;
        }
      } else {
        // Try key with trailing slash
        key = trailingSlash.add(key);
        value = this.object[key];
      }
    }

    // Resolve the value if it's a promise
    value = await value;

    if (value === undefined) {
      // Key exists but value is undefined
      return undefined;
    }

    setParent(value, this);

    if (typeof value === "function" && !Object.hasOwn(this.object, key)) {
      // Value is an inherited method; bind it to the object.
      value = value.bind(this.object);
    }

    return value;
  }

  async isKeyForSubtree(key) {
    const value = await this.object[key];
    return Tree.isAsyncTree(value);
  }

  /**
   * Enumerate the object's keys.
   */
  async keys() {
    // Walk up the prototype chain to realm's Object.prototype.
    let obj = this.object;
    const objectPrototype = getRealmObjectPrototype(obj);

    const result = new Set();
    while (obj && obj !== objectPrototype) {
      // Get the enumerable instance properties and the get/set properties.
      const descriptors = Object.getOwnPropertyDescriptors(obj);
      const propertyNames = Object.entries(descriptors)
        .filter(
          ([name, descriptor]) =>
            name !== "constructor" &&
            (descriptor.enumerable ||
              (descriptor.get !== undefined && descriptor.set !== undefined))
        )
        .map(([name]) => name);
      for (const name of propertyNames) {
        const key = trailingSlash.add(name, await this.isKeyForSubtree(name));
        result.add(key);
      }
      obj = Object.getPrototypeOf(obj);
    }
    return result;
  }

  /**
   * Set the value for the given key. If the value is undefined, delete the key.
   *
   * @param {any} key
   * @param {any} value
   */
  async set(key, value) {
    const existingKey = findExistingKey(this.object, key);

    if (value === undefined) {
      // Delete the key if it exists.
      if (existingKey !== null) {
        delete this.object[existingKey];
      }
    } else {
      // If the key exists under a different form, delete the existing key.
      if (existingKey !== null && existingKey !== key) {
        delete this.object[existingKey];
      }

      // Set the value for the key.
      this.object[key] = value;
    }

    return this;
  }
}

function findExistingKey(object, key) {
  // First try key as is
  if (key in object) {
    return key;
  }
  // Try alternate form
  const alternateKey = trailingSlash.toggle(key);
  if (alternateKey in object) {
    return alternateKey;
  }
  return null;
}
