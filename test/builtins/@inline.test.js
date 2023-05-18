import inline from "../../src/builtins/@inline.js";
import loadTextWithFrontMatter from "../../src/common/loadTextWithFrontMatter.js";
import ObjectGraph from "../../src/core/ObjectGraph.js";
import assert from "../assert.js";

describe("inline", () => {
  it("inlines Origami expressions found in input text", async () => {
    const scope = new ObjectGraph({
      name: "Alice",
    });
    const text = `Hello, {{name}}!`;
    const inlined = await inline.call(scope, text);
    assert.equal(inlined, "Hello, Alice!");
  });

  it("can reference keys in an attached graph", async () => {
    const text = `---
name: Bob
---
Hello, {{ name }}!`;
    const textWithGraph = loadTextWithFrontMatter.call(null, text);
    const inlined = await inline.call(null, textWithGraph);
    assert.equal(inlined, `Hello, Bob!`);
  });

  it("can preserve front matter", async () => {
    const text = `---
name: Bob
---
Hello, {{ name }}!`;
    const textWithGraph = loadTextWithFrontMatter.call(null, text);
    const inlined = await inline.call(null, textWithGraph, true);
    assert.equal(inlined, `Hello, Bob!`);
  });
});
