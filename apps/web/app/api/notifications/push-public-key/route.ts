import { NextResponse } from "next/server";

export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;

  if (!publicKey) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "PUSH_NOT_CONFIGURED",
          message: "Web Push is not configured.",
        },
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    data: { publicKey },
    error: null,
  });
}
