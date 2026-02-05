import { google } from "googleapis";

function base64UrlEncode(input: Buffer | string) {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export async function sendGmailMessage({
  googleClientId,
  googleClientSecret,
  refreshToken,
  accessToken,
  to,
  cc,
  subject,
  bodyText
}: {
  googleClientId: string;
  googleClientSecret: string;
  refreshToken: string;
  accessToken?: string | null;
  to: string;
  cc?: string | null;
  subject: string;
  bodyText: string;
}): Promise<{ id: string }> {
  const oauth2 = new google.auth.OAuth2({
    clientId: googleClientId,
    clientSecret: googleClientSecret
  });

  oauth2.setCredentials({
    access_token: accessToken ?? undefined,
    refresh_token: refreshToken
  });

  const gmail = google.gmail({ version: "v1", auth: oauth2 });

  const headers = [
    `To: ${to}`,
    cc ? `Cc: ${cc}` : "",
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit"
  ]
    .filter(Boolean)
    .join("\r\n");

  const raw = `${headers}\r\n\r\n${bodyText}\r\n`;

  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: base64UrlEncode(raw)
    }
  });

  const id = res.data.id;
  if (!id) throw new Error("Gmail send failed (no message id returned)");
  return { id };
}

