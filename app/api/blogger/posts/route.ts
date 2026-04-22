import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { insertBloggerPost } from "@/lib/blogger-post";

export const dynamic = "force-dynamic";

type Body = {
  blogId?: string;
  title?: string;
  content?: string;
  labels?: string[];
};

/**
 * Đăng bài lên Blogger bằng access token (tự refresh từ refresh token đã lưu sau OAuth).
 *
 * Bảo vệ: Authorization: Bearer <CRON_SECRET> (cùng secret dùng cho cron).
 *
 * Body JSON: { "blogId", "title", "content", "labels?": string[] }
 */
export async function POST(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { blogId, title, content, labels } = body;
  if (!blogId || !title || !content) {
    return NextResponse.json(
      { error: "Missing blogId, title, or content" },
      { status: 400 }
    );
  }

  try {
    const result = await insertBloggerPost({
      blogId,
      title,
      content,
      labels,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
