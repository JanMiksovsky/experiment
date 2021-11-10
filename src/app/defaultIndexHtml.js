import ExplorableGraph from "../core/ExplorableGraph.js";

export default async function defaultIndexHtml() {
  // @ts-ignore
  const graph = ExplorableGraph.from(this);
  const links = [];
  for await (const key of graph) {
    // Skip keys that start with a "." (like .keys.json).
    if (!String(key).startsWith(".")) {
      const isFormula = key.toString().includes("=");
      const linkClass = isFormula ? `class="formula"` : "";
      const link = `<li ${linkClass}><a href="${key}">${key}</a></li>`;
      links.push(link);
    }
  }
  const parts = graph.path?.split("/");
  const heading = parts?.[parts.length - 1] ?? "Index";
  const list = `
    <h1>${heading.trim()}</h1>
    <ul>\n${links.join("\n").trim()}\n</ul>
  `;
  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <style>
          li {
            margin-bottom: 0.20em;
          }

          a {
            text-decoration: none;
          }
          a:hover {
            text-decoration: revert;
          }
        </style>
      </head>
      <body>
        ${list.trim()}
      </body>
    </html>`;
  return html.trim();
}
