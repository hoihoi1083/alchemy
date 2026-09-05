import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  conceptCopyFieldEmphasis,
  conceptCopyFocusKeyForStyle,
  resolveConceptCopyFocus,
  type ConceptCopyFocusMap,
} from "@/lib/concept-copy-focus";

const stub: ConceptCopyFocusMap = {
  info: {
    title: "info",
    body: "b",
    supportingLabel: "bullets",
    supportingPlaceholder: "p",
  },
  designed: {
    title: "designed",
    body: "b",
    hookLabel: "Poster title",
    supportingLabel: "tagline",
    supportingPlaceholder: "p",
  },
  parts: {
    title: "parts",
    body: "b",
    hookLabel: "Parts title",
    supportingLabel: "callouts",
    supportingPlaceholder: "p",
  },
  "gaming-cover": {
    title: "gaming",
    body: "b",
    hookLabel: "Cover title",
    supportingLabel: "HUD",
    supportingPlaceholder: "p",
  },
  "sports-big-words": {
    title: "sports",
    body: "b",
    hookLabel: "Big word / headline",
    supportingLabel: "HUD / support",
    supportingPlaceholder: "p",
  },
  "jelly-3d": {
    title: "jelly",
    body: "b",
    hookLabel: "Top line",
    supportingLabel: "Bottom line",
    supportingPlaceholder: "p",
  },
  "type-force": {
    title: "force",
    body: "b",
    hookLabel: "Force word",
    supportingLabel: "Support",
    supportingPlaceholder: "p",
  },
  "material-letters": {
    title: "material",
    body: "b",
    hookLabel: "Material word",
    supportingLabel: "Slogan",
    supportingPlaceholder: "p",
  },
  "type-interaction": {
    title: "interaction",
    body: "b",
    hookLabel: "Interaction word",
    supportingLabel: "Tagline",
    supportingPlaceholder: "p",
  },
  "product-lifestyle": {
    title: "lifestyle",
    body: "b",
    hookLabel: "Big title",
    supportingLabel: "Selling points",
    supportingPlaceholder: "p",
  },
  brand: {
    title: "brand",
    body: "b",
    supportingLabel: "brand msg",
    supportingPlaceholder: "p",
  },
  pricing: {
    title: "pricing",
    body: "b",
    supportingLabel: "plan",
    supportingPlaceholder: "p",
    offerLabel: "Offer",
  },
  website: {
    title: "website",
    body: "b",
    supportingLabel: "features",
    supportingPlaceholder: "p",
  },
};

describe("concept-copy-focus", () => {
  it("maps sports-big-words to sports labels", () => {
    assert.equal(
      conceptCopyFocusKeyForStyle("sports-big-words"),
      "sports-big-words",
    );
    const focus = resolveConceptCopyFocus("sports-big-words", stub);
    assert.equal(focus?.hookLabel, "Big word / headline");
    assert.equal(focus?.supportingLabel, "HUD / support");
    assert.deepEqual(conceptCopyFieldEmphasis("sports-big-words"), {
      hook: true,
      supporting: true,
      offer: false,
    });
  });

  it("emphasizes offer for pricing-offer", () => {
    assert.deepEqual(conceptCopyFieldEmphasis("pricing-offer"), {
      hook: true,
      supporting: true,
      offer: true,
    });
  });

  it("returns null focus for generic product stills", () => {
    assert.equal(resolveConceptCopyFocus("product", stub), null);
    assert.equal(conceptCopyFocusKeyForStyle("warm-shop"), null);
  });
});
