import ExpressionGraph from "../../src/common/ExpressionGraph.js";
import loadTextWithFrontMatter from "../../src/common/loadTextWithFrontMatter.js";
import ExplorableGraph from "../../src/core/ExplorableGraph.js";
import ObjectGraph from "../../src/core/ObjectGraph.js";
import Template from "../../src/framework/Template.js";
import { createExpressionFunction } from "../../src/language/expressionFunction.js";
import * as ops from "../../src/language/ops.js";
import assert from "../assert.js";

describe("Template", () => {
  it("accepts template that has no front matter", () => {
    const container = {};
    const template = new Template("text", container);
    assert.equal(template.graph, null);
    assert.equal(template.bodyText, "text");
    assert.equal(template.scope, container);
    assert.equal(template.text, "text");
  });

  it("accepts template with front matter graph", async () => {
    const scope = {};
    const text = `---
a: 1
---
text`;
    const document = loadTextWithFrontMatter.call(null, text);
    const template = new Template(document, scope);
    assert.deepEqual(await ExplorableGraph.plain(template.graph), {
      a: 1,
    });
    assert.equal(template.bodyText, "text");
    assert.equal(template.scope, scope);
    assert.equal(template.text, text);
  });

  it("extends scope with input data", async () => {
    const template = new Template("");
    const scope = new ObjectGraph({});
    const input = { a: 1 };
    /** @this {Explorable|null} */
    template.compiled = async function () {
      assert.equal(await this?.get("a"), 1);
      return "";
    };
    await template.apply(input, scope);
  });

  it("extends container scope with template and input data", async () => {
    const template = new Template(
      loadTextWithFrontMatter.call(
        null,
        `---
b: 2
---
template`
      )
    );
    const scope = new ObjectGraph({
      a: 1,
    });
    const input = { c: 3 };
    /** @this {Explorable|null} */
    template.compiled = async function () {
      // Scope includes input + template + container
      assert.equal(await this?.get("a"), 1);
      assert.equal(await this?.get("b"), 2);
      assert.equal(await this?.get("c"), 3);
      return "";
    };
    await template.apply(input, scope);
  });

  it("defines ambient properties for input and template data", async () => {
    const text = `---
a: 1
---
template`;
    const templateScope = {};
    const templateDocument = loadTextWithFrontMatter.call(null, text);
    const template = new Template(templateDocument, templateScope);
    const inputScope = new ObjectGraph({});
    const input = {
      b: 2,
    };
    /** @this {Explorable|null} */
    template.compiled = async function () {
      const templateInfo = await this?.get("@template");
      const info = await ExplorableGraph.plain(templateInfo);
      assert.deepEqual(info.graph, { a: 1 });
      assert.deepEqual(info.scope, templateScope);
      assert.equal(info.text, "template");

      const dot = await this?.get(".");
      assert.deepEqual(await ExplorableGraph.plain(dot), { b: 2 });
      assert.equal(await this?.get("@text"), "[object Object]");
      return "";
    };
    await template.apply(input, inputScope);
  });

  it("input graph can refer to template graph", async () => {
    const template = new Template(
      loadTextWithFrontMatter.call(
        null,
        `---
a: 1
---
template`
      )
    );
    const graph = new ObjectGraph({});
    const input = new ExpressionGraph({
      b: createExpressionFunction([ops.scope, "a"]),
    });
    /** @this {Explorable|null} */
    template.compiled = async function () {
      assert.equal(await this?.get("b"), 1);
      return "";
    };
    await template.apply(input, graph);
  });

  it("template graph can refer to input graph via dot (.) ambient", async () => {
    const template = new Template(
      loadTextWithFrontMatter.call(
        null,
        `---
a: !ori ./b
---
`
      )
    );
    const graph = new ObjectGraph({});
    const input = {
      b: 2,
    };
    /** @this {Explorable|null} */
    template.compiled = async function () {
      assert.equal(await this?.get("a"), 2);
      return "";
    };
    await template.apply(input, graph);
  });

  it("template result has graph of input data", async () => {
    const template = new Template(
      loadTextWithFrontMatter.call(
        null,
        `---
a: 1
---
template`
      )
    );
    const graph = new ObjectGraph({});
    const input = { b: 2 };
    const result = await template.apply(input, graph);
    const resultGraph = result.toGraph();
    assert.deepEqual(await ExplorableGraph.plain(resultGraph), {
      b: 2,
      "@template": {
        a: 1,
      },
    });
  });
});
