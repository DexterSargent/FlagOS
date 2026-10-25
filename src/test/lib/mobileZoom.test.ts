import { readFileSync } from "node:fs";
import path from "node:path";
import postcss, { type Rule } from "postcss";
import { describe, expect, it } from "vitest";

const stylesheet = postcss.parse(
  readFileSync(path.resolve("src/app/globals.css"), "utf8")
);

describe("mobile zoom safeguards", () => {
  const mobileRules: Rule[] = [];
  stylesheet.walkAtRules("media", (media) => {
    if (media.params === "(max-width: 767px), (pointer: coarse)") {
      media.walkRules((rule) => { mobileRules.push(rule); });
    }
  });

  it("sets a zoom-safe font size for every editable control on phones and touch devices", () => {
    expect(mobileRules).toHaveLength(1);
    const rule = mobileRules[0];
    for (const markup of [
      "<input>",
      '<input type="text">',
      '<input type="search">',
      '<input type="email">',
      '<input type="password">',
      '<input type="number">',
      '<input type="tel">',
      '<input type="date">',
      "<textarea></textarea>",
      "<select></select>",
      '<div contenteditable="true"></div>',
      '<div contenteditable=""></div>',
      '<div contenteditable="plaintext-only"></div>',
    ]) {
      const container = document.createElement("div");
      container.innerHTML = markup;
      expect(container.firstElementChild?.matches(rule.selector)).toBe(true);
    }
    expect(rule.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ prop: "font-size", value: "max(16px, 1rem)" }),
    ]));
    expect(rule.parent?.type).toBe("atrule");
    expect(rule.parent?.parent?.type).toBe("root");
  });

  it("does not resize non-editable content", () => {
    const element = document.createElement("div");
    element.setAttribute("contenteditable", "false");
    expect(element.matches(mobileRules[0].selector)).toBe(false);
  });

  it("disables accidental double-tap zoom without blocking pinch zoom or panning", () => {
    const touchActions: string[] = [];
    stylesheet.walkDecls("touch-action", (declaration) => {
      expect((declaration.parent as Rule).selector).toBe("body");
      touchActions.push(declaration.value);
    });
    expect(touchActions).toEqual(["manipulation"]);
  });
});
