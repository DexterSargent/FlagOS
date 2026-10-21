import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";
import { DEMO_TEAM_IDS } from "@/lib/demoSandboxRuntime";
import { SEED_DEMO_TEAMS } from "@/lib/demoSeedData";

it("keeps demo and historical York fixtures outside the root layout's eager import graph", () => {
  const src = path.resolve("src");
  const visited = new Set<string>();
  function visit(file: string) {
    if (visited.has(file)) return;
    visited.add(file);
    const ast = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    for (const statement of ast.statements) {
      let specifier: string | null = null;
      if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
        const clause = statement.importClause;
        if (clause?.isTypeOnly) continue;
        if (clause && !clause.name && clause.namedBindings && ts.isNamedImports(clause.namedBindings) &&
          clause.namedBindings.elements.every((element) => element.isTypeOnly)) continue;
        specifier = statement.moduleSpecifier.text;
      } else if (ts.isExportDeclaration(statement) && !statement.isTypeOnly &&
        statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
        specifier = statement.moduleSpecifier.text;
      }
      if (!specifier) continue;
      const base = specifier.startsWith("@/")
        ? path.join(src, specifier.slice(2))
        : specifier.startsWith(".") ? path.resolve(path.dirname(file), specifier) : null;
      if (!base) continue;
      const dependency = [base + ".ts", base + ".tsx", path.join(base, "index.ts"), path.join(base, "index.tsx")]
        .find(existsSync);
      if (dependency) visit(dependency);
    }
  }
  visit(path.join(src, "app", "layout.tsx"));
  const fixtures = ["demoSandbox.ts", "demoSeedData.ts", "yorkTeamData.ts"];
  expect([...visited].filter((file) => fixtures.includes(path.basename(file)))).toEqual([]);
});

it("classifies exactly the seeded demo teams without importing fixtures in the runtime helper", () => {
  expect([...DEMO_TEAM_IDS].sort()).toEqual(SEED_DEMO_TEAMS.map((team) => team.id).sort());
});
