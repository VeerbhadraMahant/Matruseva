import { describe, expect, it } from "vitest";
import {
  normalizeIndianPhone,
  telLink,
  whatsAppLink,
  reminderMessage,
  allLanguageMessages,
} from "./whatsapp";

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

  it("builds a wa.me link with encoded Hindi and Marathi text", () => {
    const link = whatsAppLink("9876543210", "नमस्ते प्रिया जी");
    expect(link).toContain("https://wa.me/919876543210?text=");
    expect(decodeURIComponent(link!)).toContain("नमस्ते प्रिया जी");
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

  it("generates natural Hindi reminder message", () => {
    const msg = reminderMessage("प्रिया", "overdue", "सोनोग्राफी", undefined, "hi", "मातृत्व क्लिनिक");
    expect(msg).toContain("प्रिया");
    expect(msg).toContain("सोनोग्राफी");
    expect(msg).toContain("मातृत्व क्लिनिक");
    expect(msg).toContain("नियत तारीख निकल चुकी है");
  });

  it("generates natural Marathi reminder message", () => {
    const msg = reminderMessage("अनिता", "due_soon", "टीडी इंजेक्शन", undefined, "mr", "सेवा क्लिनिक");
    expect(msg).toContain("अनिता");
    expect(msg).toContain("टीडी इंजेक्शन");
    expect(msg).toContain("सेवा क्लिनिक");
    expect(msg).toContain("तपासणीची वेळ जवळ आली आहे");
  });

  it("uses the clinic's custom template when one is set", () => {
    const msg = reminderMessage("Priya", "overdue", "NT scan", {
      overdue: "Reminder for {name}: {item} is overdue at {clinic}.",
    });
    expect(msg).toBe("Reminder for Priya: NT scan is overdue at the clinic.");
  });

  it("uses multi-lingual custom templates when configured", () => {
    const templates = {
      hi: {
        overdue: "अति आवश्यक सूचना {name} जी: {item} हेतु तुरंत {clinic} पधारें।",
      },
    };
    const msg = reminderMessage("अनिता", "overdue", "रक्त जांच", templates, "hi", "सिटी हॉस्पिटल");
    expect(msg).toBe("अति आवश्यक सूचना अनिता जी: रक्त जांच हेतु तुरंत सिटी हॉस्पिटल पधारें।");
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

  it("generates all 3 language messages at once", () => {
    const msgs = allLanguageMessages("Sunita", "overdue", "Growth Scan", undefined, "Matru Clinic");
    expect(msgs.en).toContain("Sunita");
    expect(msgs.hi).toContain("Sunita");
    expect(msgs.mr).toContain("Sunita");
    expect(msgs.hi).toContain("जांच");
    expect(msgs.mr).toContain("तपासणी");
  });
});
