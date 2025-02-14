import AttributeMarshallingMixin from "./AttributeMarshallingMixin.js";
import DebugContext from "./DebugContext.js";

const html = String.raw;
const forceLoad = [DebugContext];
const marker = "~";

export default class DebugTrace extends AttributeMarshallingMixin(HTMLElement) {
  constructor() {
    super();
    this._href = null;
    this._tracedResultPath = null;
  }

  connectedCallback() {
    super.connectedCallback?.();

    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = this.template;

    this.addEventListener("click", (event) => {
      // If we got a click, it was on the trace background
      // Restore the default selection
      this.dispatchEvent(
        new CustomEvent("navigate", {
          bubbles: true,
          detail: {
            href: this._tracedResultPath,
          },
        })
      );
    });

    this.addEventListener("linkclick", (event) => {
      const directResult = event.detail.href === "/";
      let tracedPath = this._tracedResultPath;
      if (tracedPath.endsWith("/")) {
        tracedPath = tracedPath.slice(0, -1);
      }
      const href = directResult
        ? this._tracedResultPath
        : `/.results${tracedPath}/${marker}${event.detail.href}`;
      this.dispatchEvent(
        new CustomEvent("navigate", {
          bubbles: true,
          detail: {
            href,
          },
        })
      );
    });
  }

  // The href of the resource being traced
  get href() {
    return this._href;
  }
  set href(href) {
    if (href !== this._href) {
      this._href = href;
      this.render();
    }
  }

  async render() {
    const newResultPath = resultPath(this.href);
    let updateTrace = true;
    if (this._tracedResultPath) {
      // Are we already showing the trace for this resource?
      const normalizedNewPath = newResultPath.endsWith("/")
        ? newResultPath.slice(0, -1)
        : newResultPath;
      const normalizedOldPath = this._tracedResultPath.endsWith("/")
        ? this._tracedResultPath.slice(0, -1)
        : this._tracedResultPath;
      if (normalizedNewPath === normalizedOldPath) {
        // Already traced
        updateTrace = false;
      }
    }
    this._tracedResultPath = newResultPath;

    if (updateTrace) {
      const tracePathname = `/.trace${newResultPath}`;
      const origin = new URL(this.href).origin;
      const traceUrl = new URL(tracePathname, origin);
      const traceResponse = await fetch(traceUrl);
      const traceHtml = await traceResponse.json();

      // sourceFilePath.textContent = new URL(url).pathname;
      this.innerHTML = traceHtml;
    }

    // Select contexts and links where the link href matches decomposition path
    const path = decompositionPath(this.href);
    console.log(`selection path: ${path}`);
    const contexts = this.querySelectorAll("debug-context");
    contexts.forEach((context) => {
      let selected = false;

      context.querySelectorAll("debug-link").forEach((link) => {
        const match = link.href === path;
        link.classList.toggle("selected", match);
        selected ||= match;
      });

      context.classList.toggle("selected", selected);
      context.classList.toggle("applicable", path.startsWith(context.href));
    });
  }

  get template() {
    return html`
      <style>
        :host {
          --color-highlight: white;
          --trace-background: #222;
          background: var(--trace-background);
          color: #ccc;
          display: grid;
          font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
          font-family: monospace;
          font-size: 15px;
          gap: 0.5rem;
          padding: 1rem;
          user-select: none;
        }

        #sourceFilePath {
          /* color: var(--color-highlight); */
        }

        ::slotted(debug-context:not(.applicable)) {
          display: none;
        }
      </style>
      <slot></slot>
    `;
  }
}

// Return the result decomposition path for a given href
function decompositionPath(href) {
  let keys = new URL(href).pathname.split("/");
  // Remove empty string at the beginning
  keys.shift();
  if (keys[0] === ".results") {
    // Currently showing a point in the result decomposition
    keys.shift();
    const markerIndex = keys.indexOf(marker);
    // Remove the marker and everthing before it
    if (markerIndex >= 0) {
      keys = keys.slice(markerIndex + 1);
    }
    if (keys.at(-1) === "") {
      // Remove trailing slash
      keys.pop();
    }
  } else {
    // Raw resource from original site, use path as is
    keys = [""];
  }
  // Restore leading slash
  keys.unshift("");
  return keys.join("/");
}

// Return the result path for a given href
function resultPath(href) {
  let keys = new URL(href).pathname.split("/");
  // Remove empty string at the beginning
  keys.shift();
  if (keys[0] === ".results") {
    // Currently showing a point in the result decomposition
    keys.shift();
    const markerIndex = keys.indexOf(marker);
    if (markerIndex >= 0) {
      // Remove everything after the marker
      keys = keys.slice(0, markerIndex);
    }
  } else {
    // Raw resource from original site, use path as is
  }
  // Restore leading slash
  keys.unshift("");
  return keys.join("/");
}

customElements.define("debug-trace", DebugTrace);
