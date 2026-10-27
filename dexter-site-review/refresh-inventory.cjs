const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");

const root = path.resolve(__dirname, "..");
const slash = (value) => value.split(path.sep).join("/");
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const relative = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(relative);
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(slash(relative));
  }
}
walk("src");
const production = files.filter((file) => !/\.(test|spec)\./.test(file) && !file.startsWith("src/test/"));
const available = new Set(files);
function resolveImport(from, specifier) {
  const base = specifier.startsWith("@/") ? `src/${specifier.slice(2)}`
    : specifier.startsWith(".") ? slash(path.normalize(path.join(path.dirname(from), specifier))) : null;
  if (!base) return null;
  return [base, `${base}.tsx`, `${base}.ts`, `${base}/index.tsx`, `${base}/index.ts`].find((candidate) => available.has(candidate)) || null;
}
function analyze(file) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const imports = new Set();
  const controls = [];
  const symbols = [];
  const methods = [];
  const headings = [];
  const line = (node) => ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1;
  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const spec = node.moduleSpecifier;
      if (spec && ts.isStringLiteral(spec)) {
        const resolved = resolveImport(file, spec.text);
        if (resolved) imports.add(resolved);
      }
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isStringLiteral(node.arguments[0])) {
      const resolved = resolveImport(file, node.arguments[0].text);
      if (resolved) imports.add(resolved);
    }
    if (ts.isFunctionDeclaration(node) && node.name) {
      if (/^[A-Z]/.test(node.name.text)) symbols.push({ name: node.name.text, line: line(node) });
      if (/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(node.name.text)) methods.push(node.name.text);
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const value = node.initializer;
      if (/^[A-Z]/.test(node.name.text) && (ts.isArrowFunction(value) || ts.isFunctionExpression(value) ||
        ts.isCallExpression(value) && /^(memo|forwardRef|dynamic)$/.test(value.expression.getText(ast).split(".").pop()))) {
        symbols.push({ name: node.name.text, line: line(node) });
      }
      if (/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(node.name.text)) methods.push(node.name.text);
    }
    if (ts.isJsxAttribute(node) && node.name.getText(ast) === "data-tour") {
      const value = node.initializer && ts.isStringLiteral(node.initializer)
        ? node.initializer.text : node.initializer?.getText(ast) || "(dynamic)";
      if (!controls.some((entry) => entry.name === value)) controls.push({ name: value, line: line(node), dynamic: !node.initializer || !ts.isStringLiteral(node.initializer) });
    }
    if (ts.isJsxElement(node) && /^h[1-3]$/.test(node.openingElement.tagName.getText(ast))) {
      const value = node.children.filter(ts.isJsxText).map((child) => child.text.trim()).filter(Boolean).join(" ").replace(/\s+/g, " ");
      if (value && headings.length < 30) headings.push({ name: value, line: line(node) });
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return { path: file, fingerprint: createHash("sha256").update(text).digest("hex"), imports: [...imports].sort(), controls, symbols, methods, headings, lines: text.split("\n").length };
}
const sources = production.map(analyze);
const byPath = new Map(sources.map((source) => [source.path, source]));
function closure(start) {
  const visited = new Set();
  function follow(file) {
    if (visited.has(file)) return;
    visited.add(file);
    for (const child of byPath.get(file)?.imports || []) follow(child);
  }
  start.forEach(follow);
  return [...visited].sort();
}
const tests = files.filter((file) => /\.(test|spec)\./.test(file)).map((file) => ({ path: file, imports: analyze(file).imports }));
const routes = sources.filter((source) => source.path.startsWith("src/app/") && source.path.endsWith("/page.tsx")).map((source) => {
  const route = source.path.slice("src/app".length, -"/page.tsx".length) || "/";
  const layouts = sources.filter((entry) => entry.path.endsWith("/layout.tsx") && source.path.startsWith(entry.path.slice(0, -"layout.tsx".length))).map((entry) => entry.path);
  const directClosure = closure([source.path]);
  return { id: `page:${route}`, route, file: source.path, layouts, directClosure, allClosure: closure([source.path, ...layouts]) };
}).sort((a, b) => a.route.localeCompare(b.route));
const components = sources.filter((source) => source.path.startsWith("src/components/")).map((source) => ({
  ...source, id: `component:${source.path}`,
  pages: routes.filter((route) => route.directClosure.includes(source.path)).map((route) => route.route),
  shellPages: routes.filter((route) => route.allClosure.includes(source.path) && !route.directClosure.includes(source.path)).map((route) => route.route),
}));
const apis = sources.filter((source) => source.path.startsWith("src/app/api/") && source.path.endsWith("/route.ts")).map((source) => ({
  ...source, id: `api:${source.path}`, route: source.path.slice("src/app".length, -"/route.ts".length),
}));
const modules = sources.filter((source) => source.path.endsWith(".tsx") &&
  !components.some((component) => component.path === source.path) &&
  !routes.some((route) => route.file === source.path)).map((source) => ({
  ...source, id: `module:${source.path}`,
  pages: routes.filter((route) => route.allClosure.includes(source.path)).map((route) => route.route),
}));
let revision = "unknown";
try { revision = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: root, encoding: "utf8" }).trim(); } catch { console.warn("Git revision unavailable; inventory still generated."); }
const output = { generatedAt: new Date().toISOString(), revision, root: slash(root), routes, components, modules, apis, sources, tests };
fs.writeFileSync(path.join(__dirname, "inventory.js"), `// Generated by refresh-inventory.cjs; do not edit by hand.\nwindow.FLAGOS_INVENTORY = ${JSON.stringify(output, null, 2)};\n`);
console.log(`Inventory: ${routes.length} pages, ${components.length} production component files, ${apis.length} API routes, ${sources.length} source files, ${tests.length} test files.`);
