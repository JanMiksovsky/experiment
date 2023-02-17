import YAML from "yaml";
import ExplorableGraph from "../core/ExplorableGraph.js";
import { extname, toSerializable } from "../core/utilities.js";

/**
 * Render a graph in DOT format.
 *
 * @this {Explorable}
 * @param {GraphVariant} [variant]
 * @param {PlainObject} [options]
 */
export default async function dot(variant, options = {}) {
  variant = variant ?? (await this?.get("@defaultGraph"));
  if (variant === undefined) {
    return undefined;
  }
  const graph = ExplorableGraph.from(variant);
  const graphArcs = await statements(graph, "", options);
  return `digraph g {
  bgcolor="transparent";
  nodesep=1;
  rankdir=LR;
  ranksep=1.5;
  node [color=gray70; fillcolor="white"; fontname="Helvetica"; fontsize="10"; nojustify=true; style="filled"; shape=box];
  edge [arrowhead=vee; arrowsize=0.75; color=gray60; fontname="Helvetica"; fontsize="10"; labeldistance=5];

${graphArcs.join("\n")}
}`;
}

// Return true if the text appears to contain non-printable binary characters.
function probablyBinary(text) {
  // https://stackoverflow.com/a/1677660/76472
  return /[\x00-\x09\x0E-\x1F\x80-\xFF]/.test(text);
}

async function statements(graph, nodePath, options) {
  let result = [];
  const createLinks = options.createLinks ?? true;

  // Add a node for the root of this (sub)graph.
  const rootUrl = nodePath || ".";
  const url = createLinks ? `; URL="${rootUrl}"` : "";
  result.push(
    `  "${nodePath}" [label=""; shape=circle; color=gray40; width=0.15${url}];`
  );

  // Draw edges and collect labels for the nodes they lead to.
  let nodes = {};
  for await (const key of graph) {
    const destPath = nodePath ? `${nodePath}/${key}` : key;
    const arc = `  "${nodePath}" -> "${destPath}" [label="${key}"];`;
    result.push(arc);

    let isError = false;
    let value;
    try {
      value = await graph.get(key);
    } catch (error) {
      isError = true;
      value =
        error.name && error.message
          ? `${error.name}: ${error.message}`
          : error.name ?? error.message ?? error;
    }

    // We expand certain types of files known to contain graphs.
    const extension = extname(key);
    const expand =
      {
        ".graph": true,
        ".json": true,
        ".yaml": true,
      }[extension] ?? extension === "";

    if (expand && ExplorableGraph.canCastToExplorable(value)) {
      const subgraph = ExplorableGraph.from(value);
      const subStatements = await statements(subgraph, destPath, options);
      result = result.concat(subStatements);
    } else {
      const serializable = value ? toSerializable(value) : undefined;
      let label =
        typeof serializable === "object"
          ? YAML.stringify(serializable)
          : serializable ?? "";
      nodes[key] = { label };
      if (isError) {
        nodes[key].isError = true;
      }
    }
  }

  // If we have more than one label, we'll focus on the labels' differences.
  // We'll use the first label as a representative baseline for all labels but
  // the first (which will use the second label as a baseline).
  const values = Object.values(nodes);
  const showLabelDiffs = values.length > 1;
  const label1 = showLabelDiffs ? String(values[0].label) : undefined;
  const label2 = showLabelDiffs ? String(values[1].label) : undefined;

  // Trim labels.
  let i = 0;
  for (const key of Object.keys(nodes)) {
    let label = String(nodes[key].label);
    if (probablyBinary(label)) {
      nodes[key].label = "[binary data]";
    } else if (label) {
      let clippedStart = false;
      let clippedEnd = false;

      if (showLabelDiffs) {
        const baseline = i === 0 ? label2 : label1;
        const diff = stringDiff(baseline, label);
        if (diff !== label) {
          label = diff;
          clippedStart = true;
        }
      }

      if (label.length > 40) {
        // Long text, just use the beginning
        label = label.slice(0, 40);
        clippedEnd = true;
      }

      // Left justify node label using weird Dot escape character
      // See https://stackoverflow.com/a/13104953/76472
      const endsWithNewline = label.endsWith("\n");
      label = label.replace(/\n/g, "\\l");

      label = label.replace(/"/g, '\\"'); // Escape quotes
      label = label.replace(/[\ \t]+/g, " "); // Collapse spaces and tabs

      // Add ellipses if we clipped the label. We'd prefer to end with a real
      // ellipsis, but GraphViz warns about "non-ASCII character 226" if we do.
      // (That's not even the ellipsis character!) We could use a real ellipsis
      // for the start, but then they might look different.
      if (clippedStart) {
        label = "..." + label;
      }
      if (clippedEnd) {
        label += "...";
      }

      if (!endsWithNewline) {
        // See note above
        label += "\\l";
      }

      nodes[key].label = label;
    }
    i++;
  }

  // Draw labels.
  for (const key in nodes) {
    const node = nodes[key];
    const icon = node.isError ? "⚠️ " : "";
    const label = `label="${icon}${node.label}"`;
    const color = node.isError ? `; color="red"` : "";
    const fill = node.isError ? `; fillcolor="#FFF4F4"` : "";
    const destPath = nodePath ? `${nodePath}/${key}` : key;
    const url = createLinks ? `; URL="${destPath}"` : "";
    result.push(`  "${destPath}" [${label}${color}${fill}${url}];`);
  }

  return result;
}

// Return the second string, removing the initial portion it shares with the
// first string. The returned string will start with the first non-whitespace
// character of the first line that differs from the first string.
function stringDiff(first, second) {
  let i = 0;
  // Find point of first difference.
  while (i < first.length && i < second.length && first[i] === second[i]) {
    i++;
  }
  // Back up to start of that line.
  while (i > 0 && second[i - 1] !== "\n") {
    i--;
  }
  // Move forward to first non-whitespace character.
  while (i < second.length && /\s/.test(second[i])) {
    i++;
  }
  return second.slice(i);
}

dot.usage = `dot <graph>\tRender a graph visually in dot language`;
dot.documentation = "https://graphorigami.org/cli/builtins.html#dot";
