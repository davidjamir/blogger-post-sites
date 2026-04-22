import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { AccountApi } from "@/lib/models";

export async function GET() {
  try {
    await connectDb();
    const doc = await AccountApi.findOne()
      .sort({ updatedAt: -1 })
      .select("email expired scope createdAt updatedAt")
      .lean()
      .exec();

    if (!doc || typeof doc !== "object" || !("email" in doc)) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      email: String(doc.email),
      expired: doc.expired,
      scope: "scope" in doc && doc.scope ? String(doc.scope) : "",
      createdAt: "createdAt" in doc ? doc.createdAt : undefined,
      updatedAt: "updatedAt" in doc ? doc.updatedAt : undefined,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Lỗi database";
    return NextResponse.json({ connected: false, error: message }, { status: 500 });
  }
}
