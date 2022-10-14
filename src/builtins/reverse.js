import ExplorableGraph from "../core/ExplorableGraph.js";

/**
 * Reverse the order of the top-level keys in the graph.
 *
 * @this {Explorable}
 * @param {GraphVariant} [variant]
 */
export default async function reverse(variant) {
  variant = variant ?? (await this?.get("@defaultGraph"));
  if (variant === undefined) {
    return undefined;
  }
  const graph = ExplorableGraph.from(variant);
  return {
    async *[Symbol.asyncIterator]() {
      const keys = await ExplorableGraph.keys(graph);
      keys.reverse();
      yield* keys;
    },

    async get(key) {
      const value = await graph.get(key);
      return ExplorableGraph.isExplorable(value) ? reverse(value) : value;
    },
  };
}

reverse.usage = `reverse <graph>\tReverses the order of the graph's top-level keys`;
reverse.documentation = "https://graphorigami.org/cli/builtins.html#reverse";
