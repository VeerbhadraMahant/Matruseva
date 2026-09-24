import { describe, expect, it } from "vitest";
import { normalizeIndianPhone, telLink, whatsAppLink, reminderMessage } from "./whatsapp";

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

describe("reminderMessage", () => {
  it("fills the built-in template with the patient and item names", () => {
    const msg = reminderMessage("Priya", "overdue", "NT scan");
    expect(msg).toContain("Priya");
    expect(msg).toContain("NT scan");
  });

  it("falls back to 'checkup' when no care event name is given", () => {
    expect(reminderMessage("Priya", "due_soon")).toContain("checkup");
  });

  it("uses the clinic's custom template when one is set", () => {
    const msg = reminderMessage("Priya", "overdue", "NT scan", {
      overdue: "Reminder for {name}: {item} is overdue.",
    });
    expect(msg).toBe("Reminder for Priya: NT scan is overdue.");
  });

  it("falls back to the default when the clinic's template for that reason is blank", () => {
    const msg = reminderMessage("Priya", "at_risk", undefined, { at_risk: "   " });
    expect(msg).toContain("Priya");
    expect(msg).not.toBe("   ");
  });

  it("substitutes every occurrence of a placeholder, not just the first", () => {
    const msg = reminderMessage("Priya", "overdue", "scan", {
      overdue: "{name}, {name} again: your {item} ({item}) is overdue.",
    });
    expect(msg).toBe("Priya, Priya again: your scan (scan) is overdue.");
  });
});
