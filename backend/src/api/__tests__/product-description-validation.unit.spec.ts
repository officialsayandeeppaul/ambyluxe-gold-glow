import {
  extractProductDescription,
  isNonEmptyDescription,
} from "../lib/product-description-validation";

describe("extractProductDescription", () => {
  it("reads flat description", () => {
    expect(extractProductDescription({ description: "Gold ring" })).toEqual({
      present: true,
      value: "Gold ring",
    });
  });

  it("reads nested product.description", () => {
    expect(
      extractProductDescription({ product: { description: "Necklace" } }),
    ).toEqual({
      present: true,
      value: "Necklace",
    });
  });

  it("treats empty string as present", () => {
    expect(extractProductDescription({ description: "" })).toEqual({
      present: true,
      value: "",
    });
  });

  it("returns absent when no description key", () => {
    expect(extractProductDescription({ title: "x" })).toEqual({
      present: false,
      value: undefined,
    });
  });
});

describe("isNonEmptyDescription", () => {
  it("rejects whitespace-only", () => {
    expect(isNonEmptyDescription("   ")).toBe(false);
  });

  it("accepts trimmed text", () => {
    expect(isNonEmptyDescription("  hi  ")).toBe(true);
  });
});
