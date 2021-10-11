import ExplorableGraph from "../../core/ExplorableGraph.js";

export default async function keys(variant) {
  const graph = ExplorableGraph.from(variant);
  return await ExplorableGraph.keys(graph);
}

keys.usage = `keys(graph)\tThe top-level keys in the graph`;
