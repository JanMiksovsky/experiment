import DefaultValues from "../common/DefaultValues.js";
import ExplorableFiles from "../node/ExplorableFiles.js";
import FileLoadersMixin from "../node/FileLoadersMixin.js";
// import HandlebarsHtmlMixin from "./HandlebarsHtmlMixin.js";
import ImplicitModulesMixin from "../node/ImplicitModulesMixin.js";
import defaultIndexHtml from "./defaultIndexHtml.js";
import defaultKeysJson from "./defaultKeysJson.js";
// import VirtualValuesMixin from "./VirtualValuesMixin.js";
import FormulasMixin from "./FormulasMixin.js";
// import PlusKeysMixin from "./PlusKeysMixin.js";
// import SplatKeysMixin from "./SplatKeysMixin.js";
import VirtualKeysMixin from "./VirtualKeysMixin.js";

class AppGraph extends FileLoadersMixin(
  VirtualKeysMixin(FormulasMixin(ImplicitModulesMixin(ExplorableFiles)))
) {}

export default class ExplorableApp extends DefaultValues {
  #main;

  constructor(dirname) {
    const main = new AppGraph(dirname);
    const defaults = {
      ".index": defaultIndexHtml,
      ".keys.json": defaultKeysJson,
      "index.html": defaultIndexHtml,
    };
    super(main, defaults);
    this.#main = main;
  }

  get scope() {
    return this.#main.scope;
  }
  set scope(scope) {
    this.#main.scope = scope;
  }
}
