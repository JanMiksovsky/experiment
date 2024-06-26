import assert from "node:assert";
import { describe, test } from "node:test";
import * as utilities from "../src/utilities.js";

describe("utilities", () => {
  test("getRealmObjectPrototype returns the object's root prototype", () => {
    const object = {};
    const proto = utilities.getRealmObjectPrototype(object);
    assert.equal(proto, Object.prototype);
  });

  test("isPlainObject returns true if the object is a plain object", () => {
    assert.equal(utilities.isPlainObject({}), true);
    assert.equal(utilities.isPlainObject(new Object()), true);
    assert.equal(utilities.isPlainObject(Object.create(null)), true);
    class Foo {}
    assert.equal(utilities.isPlainObject(new Foo()), false);
  });

  test("keysFromPath() returns the keys from a slash-separated path", () => {
    assert.deepEqual(utilities.keysFromPath("a/b/c"), ["a", "b", "c"]);
    assert.deepEqual(utilities.keysFromPath("foo/"), ["foo", ""]);
  });

  test("naturalOrder compares strings in natural order", () => {
    const strings = ["file10", "file1", "file9"];
    strings.sort(utilities.naturalOrder);
    assert.deepEqual(strings, ["file1", "file9", "file10"]);
  });

  test("pipeline applies a series of functions to a value", async () => {
    const addOne = (n) => n + 1;
    const double = (n) => n * 2;
    const square = (n) => n * n;
    const result = await utilities.pipeline(1, addOne, double, square);
    assert.equal(result, 16);
  });

  test("toString returns the value of an object's `toString` method", () => {
    const object = {
      toString: () => "text",
    };
    assert.equal(utilities.toString(object), "text");
  });

  test("toString returns null for an object with no useful `toString`", () => {
    const object = {};
    assert.equal(utilities.toString(object), null);
  });

  test("toString decodes an ArrayBuffer as UTF-8", () => {
    const buffer = Buffer.from("text", "utf8");
    assert.equal(utilities.toString(buffer), "text");
  });

  test("toString returns the string values of a generator", () => {
    const iterator = function* () {
      yield 1;
      yield "a";
    };
    assert.equal(utilities.toString(iterator), "1a");
  });
});
