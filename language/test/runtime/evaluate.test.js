import { ObjectTree } from "@graphorigami/async-tree";
import assert from "node:assert";
import { describe, test } from "node:test";
import * as ops from "../../src/runtime/ops.js";

import evaluate from "../../src/runtime/evaluate.js";

describe("evaluate", () => {
  test("can retrieve values from scope", async () => {
    const code = [ops.scope, "message"];
    const scope = {
      message: "Hello",
    };
    const result = await evaluate.call(scope, code);
    assert.equal(result, "Hello");
  });

  test("can invoke functions in scope", async () => {
    // Match the array representation of code generated by the parser.
    const code = [
      [ops.scope, "greet"],
      [ops.scope, "name"],
    ];

    const scope = new ObjectTree({
      async greet(name) {
        return `Hello ${name}`;
      },
      name: "world",
    });

    const result = await evaluate.call(scope, code);
    assert.equal(result, "Hello world");
  });

  test("passes context to invoked functions", async () => {
    const code = [ops.scope, "fn"];
    const scope = {
      async fn() {
        assert.equal(this, scope);
      },
    };
    await evaluate.call(scope, code);
  });

  test("if object in function position isn't a function, can unpack it", async () => {
    const fn = (...args) => args.join(",");
    const packed = {
      unpack: async () => fn,
    };
    const code = [packed, "a", "b", "c"];
    const result = await evaluate.call(null, code);
    assert.equal(result, "a,b,c");
  });
});
