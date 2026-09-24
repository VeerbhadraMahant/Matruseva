import { describe, expect, it } from "vitest";
import { normalizeIndianPhone, telLink, whatsAppLink } from "./whatsapp";

describe("normalizeIndianPhone", () => {
  it("adds 91 to a bare 10-digit number", () => {
    expect(normalizeIndianPhone("9876543210")).toBe("919876543210");
  });

  it("accepts a number already prefixed with 91", () => {
    expect(normalizeIndianPhone("919876543210")).toBe("919876543210");
  });

  it("strips a leading 0 trunk prefix before the country code", () => {
    expect(normalizeIndianPhone("0919876543210")).toBe("919876543210");
  });

  it("strips formatting characters", () => {
    expect(normalizeIndianPhone("+91 98765-43210")).toBe("919876543210");
    expect(normalizeIndianPhone("(987) 654-3210")).toBe("919876543210");
  });

  it("rejects numbers of the wrong length", () => {
    expect(normalizeIndianPhone("12345")).toBeNull();
    expect(normalizeIndianPhone("")).toBeNull();
  });
});

describe("telLink / whatsAppLink", () => {
  it("builds a tel: link", () => {
    expect(telLink("9876543210")).toBe("tel:+919876543210");
  });

  it("builds a wa.me link with an encoded message", () => {
    const link = whatsAppLink("9876543210", "Hello there");
    expect(link).toBe("https://wa.me/919876543210?text=Hello%20there");
  });

  it("returns null for an unparseable phone number", () => {
    expect(telLink("abc")).toBeNull();
    expect(whatsAppLink("abc", "hi")).toBeNull();
  });
});
