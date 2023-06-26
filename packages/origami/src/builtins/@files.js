/** @typedef {import("@graphorigami/types").AsyncDictionary} AsyncDictionary */
import { FilesGraph } from "@graphorigami/core";
import path from "node:path";
import process from "node:process";
import assertScopeIsDefined from "../language/assertScopeIsDefined.js";

/**
 * @this {AsyncDictionary|null}
 * @param {string} dirname
 */
export default async function files(dirname) {
  assertScopeIsDefined(this);
  const resolved = dirname
    ? path.resolve(process.cwd(), dirname)
    : process.cwd();
  return new FilesGraph(resolved);
}

files.usage = `@files [path]\tThe explorable files at the given path`;
files.documentation = "https://graphorigami.org/language/@files.html";
