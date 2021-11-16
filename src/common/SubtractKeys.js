import ExplorableGraph from "../core/ExplorableGraph.js";

const originalGraph = Symbol("originalKey");
const removeGraph = Symbol("removeKey");

export default class SubtractKeys {
  constructor(original, remove) {
    this[originalGraph] = ExplorableGraph.from(original);
    this[removeGraph] = ExplorableGraph.from(remove);
  }

  async *[Symbol.asyncIterator]() {
    const removeKeys = await ExplorableGraph.keys(this[removeGraph]);
    for await (const key of this[originalGraph]) {
      if (!removeKeys.includes(key)) {
        // Remove graph doesn't have anything to say about this key, so we'll
        // include it.
        yield key;
      } else {
        // Remove graph has this key, but if the key's explorable, we want to
        // yield so that the traversals can consider this portion of the remove
        // graph.
        const isKeyExplorable = await ExplorableGraph.isKeyExplorable(
          this[removeGraph],
          key
        );
        if (isKeyExplorable) {
          yield key;
        }
      }
    }
  }

  async get(...keys) {
    let originalValue = await this[originalGraph].get(...keys);
    const removeValue = await this[removeGraph].get(...keys);
    if (ExplorableGraph.isExplorable(originalValue)) {
      if (ExplorableGraph.isExplorable(removeValue)) {
        originalValue = new SubtractKeys(originalValue, removeValue);
      }
    } else if (removeValue !== undefined) {
      originalValue = undefined;
    }

    return originalValue;
  }
}
