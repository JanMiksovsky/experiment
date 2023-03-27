import path from "node:path";
import { fileURLToPath } from "node:url";
import mapValues from "../../src/builtins/@map/values.js";
import FilesGraph from "../../src/core/FilesGraph.js";
import ObjectGraph from "../../src/core/ObjectGraph.js";
import InheritScopeTransform from "../../src/framework/InheritScopeTransform.js";
import OrigamiTemplate from "../../src/framework/OrigamiTemplate.js";
import assert from "../assert.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDirectory = path.join(dirname, "fixtures/templates");
const templateFiles = new FilesGraph(templatesDirectory);

describe("OrigamiTemplate", () => {
  it("can make substitutions from input and context", async () => {
    const template = new OrigamiTemplate("{{greeting}}, {{name}}.");
    const input = { name: "world" };
    const scope = new ObjectGraph({ greeting: "Hello" });
    const result = await template.apply(input, scope);
    assert.equal(result, "Hello, world.");
  });

  it("can inline files", async () => {
    const template = new OrigamiTemplate(
      `This template inlines a file.
{{ plain.txt }}`
    );
    const result = await template.apply(null, templateFiles);
    const normalized = result?.toString().replace(/\r\n/g, "\n");
    assert.equal(
      normalized,
      `This template inlines a file.
Hello, world.
`
    );
  });

  it("can map data to a nested template", async () => {
    const template = new OrigamiTemplate(
      "Greetings:\n{{map(people, =`{{greeting}}, {{./name}}.\n`)}}"
    );
    const graph = new (InheritScopeTransform(ObjectGraph))({
      greeting: "Hello",
      map: mapValues,
      people: {
        0: { name: "Alice" },
        1: { name: "Bob" },
        2: { name: "Carol" },
      },
    });
    const result = await template.apply(null, graph);
    assert.equal(
      result,
      `Greetings:
Hello, Alice.
Hello, Bob.
Hello, Carol.
`
    );
  });

  it("can recurse via @template/apply", async () => {
    const template = new OrigamiTemplate(
      `{{ @if @graph/isExplorable(@input)
        =\`({{ @map/values(@input, @template/recurse) }})\`
        =\`{{ @input }} \`
      }}`
    );
    const obj = {
      a: 1,
      b: 2,
      more: {
        c: 3,
        d: 4,
      },
    };
    const result = await template.apply(obj);
    assert.equal(String(result), "(1 2 (3 4 ))");
  });
});
