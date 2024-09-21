import { Tree } from "./internal.js";
import * as trailingSlash from "./trailingSlash.js";
import { setParent } from "./utilities.js";

/**
 * A tree of values obtained via HTTP/HTTPS calls. These values will be strings
 * for HTTP responses with a MIME text type; otherwise they will be ArrayBuffer
 * instances.
 *
 * @typedef {import("@weborigami/types").AsyncTree} AsyncTree
 * @implements {AsyncTree}
 */
export default class SiteTree {
  /**
   * @param {string} href
   */
  constructor(href = window?.location.href) {
    if (href?.startsWith(".") && window?.location !== undefined) {
      // URL represents a relative path; concatenate with current location.
      href = new URL(href, window.location.href).href;
    }

    // Add trailing slash if not present; URL should represent a directory.
    href = trailingSlash.add(href);

    this.href = href;
    this.serverKeysPromise = undefined;
    this.parent = null;
  }

  async get(key) {
    if (key == null) {
      // Reject nullish key.
      throw new ReferenceError(
        `${this.constructor.name}: Cannot get a null or undefined key.`
      );
    }

    // If there is only one key and it's the empty string, and the site is
    // explorable, we take the route as "index.html". With this and subsequent
    // checks, we try to avoid sniffing the site to see if it's explorable, as
    // that necessitates an extra network request per SiteTree instance. In many
    // cases, that can be avoided.
    if (key === "" && (await this.hasServerKeys())) {
      key = "index.html";
    }

    const href = new URL(key, this.href).href;

    // If the (possibly adjusted) route ends with a slash and the site is an
    // explorable site, we return a tree for the indicated route.
    if (href.endsWith("/") && (await this.hasServerKeys())) {
      const value = Reflect.construct(this.constructor, [href]);
      setParent(value, this);
      return value;
    }

    // Fetch the data at the given route.
    let response;
    try {
      response = await fetch(href);
    } catch (error) {
      return undefined;
    }
    if (!response.ok) {
      return undefined;
    }

    if (response.redirected && response.url.endsWith("/")) {
      // If the response is redirected to a route that ends with a slash, and
      // the site is an explorable site, we return a tree for the new route.
      if (await this.hasServerKeys()) {
        return Reflect.construct(this.constructor, [response.url]);
      }
    }

    const mediaType = response.headers?.get("Content-Type");
    if (SiteTree.mediaTypeIsText(mediaType)) {
      return response.text();
    } else {
      const buffer = response.arrayBuffer();
      setParent(buffer, this);
      return buffer;
    }
  }

  async getServerKeys() {
    // We use a promise to ensure we only check for keys once.
    const href = new URL(".keys.json", this.href).href;
    this.serverKeysPromise ??= fetch(href)
      .then((response) => (response.ok ? response.text() : null))
      .then((text) => {
        try {
          return text ? JSON.parse(text) : null;
        } catch (error) {
          // Got a response, but it's not JSON. Most likely the site doesn't
          // actually have a .keys.json file, and is returning a Not Found page,
          // but hasn't set the correct 404 status code.
          return null;
        }
      });
    return this.serverKeysPromise;
  }

  async hasServerKeys() {
    const serverKeys = await this.getServerKeys();
    return serverKeys !== null;
  }

  async isKeyForSubtree(key) {
    const serverKeys = await this.getServerKeys();
    if (serverKeys) {
      // The key will need to have a trailing slash to match.
      const keyWithSlash = trailingSlash.add(key);
      return serverKeys.includes(keyWithSlash);
    } else {
      // Expensive check, since this fetches the key's value.
      const value = await this.get(key);
      return Tree.isAsyncTree(value);
    }
  }

  async keys() {
    const serverKeys = await this.getServerKeys();
    return serverKeys ?? [];
  }

  // Return true if the given media type is a standard text type.
  static mediaTypeIsText(mediaType) {
    if (!mediaType) {
      return false;
    }
    const regex = /^(?<type>[^/]+)\/(?<subtype>[^;]+)/;
    const match = mediaType.match(regex);
    if (!match) {
      return false;
    }
    const { type, subtype } = match.groups;
    if (type === "text") {
      return true;
    } else if (type === "application") {
      return (
        subtype === "json" ||
        subtype.endsWith("+json") ||
        subtype.endsWith(".json") ||
        subtype === "xml" ||
        subtype.endsWith("+xml") ||
        subtype.endsWith(".xml")
      );
    }
    return false;
  }

  get path() {
    return this.href;
  }

  get url() {
    return new URL(this.href);
  }
}
