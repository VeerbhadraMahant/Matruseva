import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { handleIncomingWhatsAppMessage } from "@/lib/whatsappBot";

export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Verifies Meta's X-Hub-Signature-256 (HMAC-SHA256 of the raw body, keyed with the app secret). */
function hasValidSignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  return safeEqual(header.slice("sha256=".length), expected);
}

/**
 * Meta WhatsApp Cloud API Webhook Verification Endpoint (GET).
 * Requires WHATSAPP_VERIFY_TOKEN — there is deliberately no default value.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (verifyToken && mode === "subscribe" && token && safeEqual(token, verifyToken)) {
    return new Response(challenge || "", { status: 200 });
  }

  return new Response("Forbidden: Invalid verification token", { status: 403 });
}

/**
 * Meta WhatsApp Cloud API incoming message webhook (POST).
 * Every request must carry a valid X-Hub-Signature-256 (WHATSAPP_APP_SECRET);
 * this route uses the service-role client, so it must never accept unsigned input.
 * The in-app bot simulator does not use this route — it calls the authenticated
 * `processBotReply` server action instead.
 */
export async function POST(req: NextRequest) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  if (!hasValidSignature(rawBody, req.headers.get("x-hub-signature-256"), appSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const body = JSON.parse(rawBody);

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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
