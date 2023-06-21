import ExplorableGraph from "../core/ExplorableGraph.js";
import { getScope, keySymbol, transformObject } from "../core/utilities.js";
import InheritScopeTransform from "../framework/InheritScopeTransform.js";

/**
 * Load a file as JSON.
 *
 * @param {string|HasString|GraphVariant} input
 * @param {any} [key]
 * @this {Explorable|null}
 */
export default function loadJson(input, key) {
  // See notes at yaml.js
  if (ExplorableGraph.canCastToExplorable(input)) {
    return input;
  }

  const text = String(input);
  const data = JSON.parse(text);

  const textWithGraph = new String(text);
  const scope = getScope(this);
  let graph;

  /** @type {any} */ (textWithGraph).toGraph = () => {
    if (!graph) {
      graph = ExplorableGraph.from(data);
      if (!("parent" in graph)) {
        graph = transformObject(InheritScopeTransform, graph);
      }
      graph.parent = scope;
      graph[keySymbol] = key;
    }
    return graph;
  };

  return textWithGraph;
}
