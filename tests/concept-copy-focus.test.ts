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
  "spatial-layout": {
    title: "spatial",
    body: "b",
    hookLabel: "Architectural word",
    supportingLabel: "Support",
    supportingPlaceholder: "p",
  },
  "photo-doodle": {
    title: "doodle",
    body: "b",
    hookLabel: "Theme",
    supportingLabel: "Support",
    supportingPlaceholder: "p",
  },
  "light-trail": {
    title: "trail",
    body: "b",
    hookLabel: "Theme",
    supportingLabel: "Support",
    supportingPlaceholder: "p",
  },
  "screen-break": {
    title: "break",
    body: "b",
    hookLabel: "Theme",
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
  "product-hold-poster": {
    title: "hold",
    body: "b",
    hookLabel: "Talking headline",
    supportingLabel: "Brush slogan",
    supportingPlaceholder: "p",
  },
  "mold-word-poster": {
    title: "mold",
    body: "b",
    hookLabel: "Funny words",
    supportingLabel: "Support",
    supportingPlaceholder: "p",
  },
  "deconstruct-archive-poster": {
    title: "deconstruct",
    body: "b",
    hookLabel: "Study title",
    supportingLabel: "Part callouts",
    supportingPlaceholder: "p",
  },
  "orbit-type-poster": {
    title: "orbit",
    body: "b",
    hookLabel: "Orbit words",
    supportingLabel: "Support",
    supportingPlaceholder: "p",
  },
  "cloche-reveal-poster": {
    title: "cloche",
    body: "b",
    hookLabel: "Reveal theme",
    supportingLabel: "Support",
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

  it("maps product-hold-poster to talking headline labels", () => {
    assert.equal(
      conceptCopyFocusKeyForStyle("product-hold-poster"),
      "product-hold-poster",
    );
    const focus = resolveConceptCopyFocus("product-hold-poster", stub);
    assert.equal(focus?.hookLabel, "Talking headline");
    assert.deepEqual(conceptCopyFieldEmphasis("product-hold-poster"), {
      hook: true,
      supporting: true,
      offer: false,
    });
  });

  it("maps mold-word-poster to funny-word labels", () => {
    assert.equal(
      conceptCopyFocusKeyForStyle("mold-word-poster"),
      "mold-word-poster",
    );
    const focus = resolveConceptCopyFocus("mold-word-poster", stub);
    assert.equal(focus?.hookLabel, "Funny words");
    assert.deepEqual(conceptCopyFieldEmphasis("mold-word-poster"), {
      hook: true,
      supporting: true,
      offer: false,
    });
  });

  it("maps deconstruct-archive-poster to study labels", () => {
    assert.equal(
      conceptCopyFocusKeyForStyle("deconstruct-archive-poster"),
      "deconstruct-archive-poster",
    );
    const focus = resolveConceptCopyFocus("deconstruct-archive-poster", stub);
    assert.equal(focus?.hookLabel, "Study title");
    assert.deepEqual(conceptCopyFieldEmphasis("deconstruct-archive-poster"), {
      hook: true,
      supporting: true,
      offer: false,
    });
  });

  it("maps orbit-type-poster to orbit words labels", () => {
    assert.equal(
      conceptCopyFocusKeyForStyle("orbit-type-poster"),
      "orbit-type-poster",
    );
    const focus = resolveConceptCopyFocus("orbit-type-poster", stub);
    assert.equal(focus?.hookLabel, "Orbit words");
    assert.deepEqual(conceptCopyFieldEmphasis("orbit-type-poster"), {
      hook: true,
      supporting: true,
      offer: false,
    });
  });

  it("maps cloche-reveal-poster to reveal theme labels", () => {
    assert.equal(
      conceptCopyFocusKeyForStyle("cloche-reveal-poster"),
      "cloche-reveal-poster",
    );
    const focus = resolveConceptCopyFocus("cloche-reveal-poster", stub);
    assert.equal(focus?.hookLabel, "Reveal theme");
    assert.deepEqual(conceptCopyFieldEmphasis("cloche-reveal-poster"), {
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
