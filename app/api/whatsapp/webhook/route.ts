import { NextRequest, NextResponse } from "next/server";
import { handleIncomingWhatsAppMessage } from "@/lib/whatsappBot";

export const dynamic = "force-dynamic";

/**
 * Meta WhatsApp Cloud API Webhook Verification Endpoint (GET).
 * Used when setting up the webhook in Meta Developers Console.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "matrusetu_secret";

  if (mode === "subscribe" && token === verifyToken) {
    return new Response(challenge || "", { status: 200 });
  }

  return new Response("Forbidden: Invalid verification token", { status: 403 });
}

/**
 * Meta WhatsApp Cloud API Incoming Message Webhook Endpoint (POST).
 * Also accepts direct JSON requests from the in-app Bot Simulator.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Direct Simulator format: { patientId, phone, messageText, preferredLang }
    if (body.messageText) {
      const res = await handleIncomingWhatsAppMessage({
        patientId: body.patientId,
        phone: body.phone,
        messageText: body.messageText,
        preferredLang: body.preferredLang,
      });
      return NextResponse.json(res);
    }

    // 2. Meta WhatsApp Cloud API format
    if (body.object === "whatsapp_business_account" && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value;
          if (value?.messages && Array.isArray(value.messages)) {
            for (const msg of value.messages) {
              if (msg.type === "text" && msg.text?.body) {
                const fromPhone = msg.from;
                const textBody = msg.text.body;

                const result = await handleIncomingWhatsAppMessage({
                  phone: fromPhone,
                  messageText: textBody,
                });

                // If Meta Cloud API credentials are set, send the WhatsApp reply back
                if (process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
                  try {
                    await fetch(
                      `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
                      {
                        method: "POST",
                        headers: {
                          Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          messaging_product: "whatsapp",
                          to: fromPhone,
                          type: "text",
                          text: { body: result.replyText },
                        }),
                      }
                    );
                  } catch (apiErr) {
                    console.error("Meta Graph API delivery error:", apiErr);
                  }
                }
              }
            }
          }
        }
      }

      return NextResponse.json({ status: "EVENT_RECEIVED" });
    }

    return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });
  } catch (err: unknown) {
    console.error("WhatsApp webhook error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
