// @ts-types="npm:@types/nodemailer@8.0.1"
import nodemailer from "npm:nodemailer@9.0.3";

export type SmtpMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

function smtpConfiguration() {
  const host = Deno.env.get("SMTP_HOST");
  const port = Number(Deno.env.get("SMTP_PORT") ?? 465);
  const user = Deno.env.get("SMTP_USER");
  const pass = Deno.env.get("SMTP_PASS");
  const from = Deno.env.get("SMTP_FROM");

  if (
    !host ||
    !Number.isInteger(port) ||
    port <= 0 ||
    !user ||
    !pass ||
    !from
  ) {
    throw new Error(
      "SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM are required",
    );
  }

  if (port !== 465 && port !== 2465) {
    throw new Error(
      "Hosted Supabase Edge email requires an implicit TLS SMTP port such as 465",
    );
  }

  return { host, port, user, pass, from };
}

export async function sendSmtpEmail(message: SmtpMessage) {
  const smtp = smtpConfiguration();
  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: true,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  try {
    const info = await transport.sendMail({
      from: smtp.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    return { providerMessageId: info.messageId };
  } finally {
    transport.close();
  }
}
