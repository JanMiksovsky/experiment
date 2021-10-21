import path from "path";
import ExplorableGraph from "../core/ExplorableGraph.js";
import { mediaTypeForExtension, mediaTypeIsText } from "./mediaTypes.js";

// Given a relative web path like "/foo/bar", return the corresponding object in
// the graph.
export async function getResourceAtPath(graph, href) {
  const keys = keysFromHref(href);
  return await graph.get(...keys);
}

// Explorable graph router as Express middleware.
export function graphRouter(graph) {
  // Return a router for the graph source.
  return async function (request, response, next) {
    const handled = await handleRequest(request, response, graph);
    if (!handled) {
      // Module not found, let next middleware function try.
      next();
    }
  };
}

export async function handleRequest(request, response, graph) {
  const decodedUrl = decodeURI(request.url);
  const keys = keysFromHref(decodedUrl);

  // Ask the graph for the resource with those keys.
  let resource;
  try {
    resource = await graph.get(...keys);
    // If resource is a function, invoke to get the object we want to return.
    if (typeof resource === "function") {
      resource = await resource();
    }
  } catch (/** @type {any} */ error) {
    console.log(error.message);
    resource = undefined;
  }

  if (resource !== undefined) {
    // Determine media type, what data we'll send, and encoding.
    const extname = path.extname(request.url).toLowerCase();
    let mediaType = extname ? mediaTypeForExtension[extname] : undefined;
    if (ExplorableGraph.isExplorable(resource)) {
      // The result should be something concrete like a string or Buffer that we
      // can send to the client. If we ended up with a subgraph as a result,
      // that's effectively the same as not finding a result. Exception:
      // if this graph is for a JSON request, cast the graph to JSON.
      if (mediaType === "application/json") {
        resource = await ExplorableGraph.plain(resource);
      } else if (!request.url.endsWith("/")) {
        // Redirect to the root of the explorable graph.
        const Location = `${request.url}/`;
        response.writeHead(307, { Location });
        response.end("ok");
        return true;
      } else {
        return false;
      }
    }

    if (resource instanceof ArrayBuffer) {
      // Convert JavaScrip ArrayBuffer to Node Buffer.
      resource = Buffer.from(resource);
    }

    const data =
      mediaType === "application/json" &&
      !(typeof resource === "string" || resource instanceof Buffer)
        ? JSON.stringify(resource, null, 2)
        : mediaType
        ? resource
        : textOrObject(resource);

    if (!mediaType) {
      // Can't identify media type; infer default type.
      mediaType =
        typeof data === "string" ? "text/html" : "application/octet-stream";
    }
    const encoding = mediaTypeIsText[mediaType] ? "utf-8" : undefined;

    response.writeHead(200, {
      "Content-Type": mediaType,
    });
    response.end(data, encoding);

    return true;
  }
  return false;
}

export function keysFromHref(href) {
  const keys = href.split("/");
  if (keys[0] === "") {
    // The path begins with a slash; drop that part.
    keys.shift();
  }
  if (keys[keys.length - 1] === "") {
    // The path ends with a slash; replace that with index.html as the default key.
    keys.pop();
    keys.push("index.html");
  }
  return keys;
}

/**
 * A request listener for use with the node http.createServer and
 * https.createServer calls, letting you serve an explorable function as a set
 * of pages.
 *
 * @param {GraphVariant} variant
 */
export function requestListener(variant) {
  const graph = ExplorableGraph.from(variant);
  return async function (request, response) {
    console.log(decodeURI(request.url));
    const handled = await handleRequest(request, response, graph);
    if (!handled) {
      response.writeHead(404, { "Content-Type": "text/html" });
      response.end(`Not found`, "utf-8");
    }
  };
}

/**
 * Convert to a string if we can, but leave objects that convert to something
 * like "[object Object]" alone.
 *
 * @param {any} obj
 */
export function textOrObject(obj) {
  if (typeof obj === "string") {
    // Return string as is.
    return obj;
  }

  // See if we can convert the object to a string.
  const text = String(obj);

  // See if we ended up with a default string.
  const constructor = obj.constructor;
  const name = constructor.name || "Object";
  if (text === `[object Object]` || text === `[object ${name}]`) {
    // Got a default string, so probably not what we wanted.
    // Return original object.
    return obj;
  } else {
    // We appear to have cast the object to a string; return that.
    return text;
  }
}
