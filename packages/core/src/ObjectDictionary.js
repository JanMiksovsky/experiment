/**
 * A dictionary defined by a plain object or array.
 *
 * @typedef {import("@graphorigami/types").AsyncMutableDictionary} AsyncMutableDictionary
 * @implements {AsyncMutableDictionary}
 */
export default class ObjectDictionary {
  /**
   * Create a graph wrapping a given plain object or array.
   *
   * @param {any} object The object/array to wrap.
   */
  constructor(object) {
    this.object = object;
  }

  /**
   * Return the value for the given key.
   *
   * @param {any} key
   */
  async get(key) {
    if (key === undefined) {
      // Getting undefined returns the dictionary itself.
      return this;
    }

    // If the value is an array, we require that the key be one of its own
    // properties: we don't want to return Array prototype methods like `map`
    // and `find`.
    if (this.object instanceof Array && !this.object.hasOwnProperty(key)) {
      return undefined;
    }

    const value = this.object[key];
    return value;
  }

  /**
   * Enumerate the object's keys.
   */
  async keys() {
    // Walk up the prototype chain to Object.prototype.
    let obj = this.object;
    const result = new Set();
    while (obj && obj !== Object.prototype) {
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
        result.add(name);
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
    if (value === undefined) {
      // Delete the key.
      delete this.object[key];
    } else {
      // Set the value for the key.
      this.object[key] = value;
    }
    return this;
  }
}
