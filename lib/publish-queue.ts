import { connectDb } from "./db";
import { PostQueue, type IPostQueue } from "./models";
import { insertBloggerPost } from "./blogger-post";

type LeanQueue = IPostQueue & { _id?: unknown };

/**
 * Lấy tối đa `limit` bài `pending`, gán `processing` và đăng lên Blogger.
 */
export async function processPublishPostQueue(options: { limit: number }): Promise<{
  limit: number;
  claimed: number;
  published: number;
  failed: number;
  details: Array<{
    id: string;
    accountEmail: string;
    status: "published" | "failed";
    postId?: string | null;
    postUrl?: string | null;
    error?: string;
  }>;
}> {
  const { limit } = options;
  await connectDb();
  const details: Array<{
    id: string;
    accountEmail: string;
    status: "published" | "failed";
    postId?: string | null;
    postUrl?: string | null;
    error?: string;
  }> = [];
  let published = 0;
  let failed = 0;
  let claimed = 0;

  for (let i = 0; i < limit; i++) {
    const doc = await PostQueue.findOneAndUpdate(
      { status: "pending" },
      { $set: { status: "processing" } },
      { sort: { createdAt: 1 }, new: true, lean: true }
    );
    if (!doc) {
      break;
    }
    claimed += 1;
    const id = String(doc._id);
    const lean = doc as LeanQueue;
    const accountEmail = String(lean.accountEmail);

    try {
      const { postId, url } = await insertBloggerPost({
        blogId: lean.blogId,
        title: lean.title,
        content: lean.content,
        labels: lean.labels,
        accountEmail,
      });
      await PostQueue.updateOne(
        { _id: doc._id },
        {
          $set: {
            status: "done",
            postId: postId ?? "",
            postUrl: url ?? "",
            errorMessage: "",
          },
        }
      );
      published += 1;
      details.push({
        id,
        accountEmail,
        status: "published",
        postId,
        postUrl: url,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await PostQueue.updateOne(
        { _id: doc._id },
        { $set: { status: "failed", errorMessage: message } }
      );
      failed += 1;
      details.push({ id, accountEmail, status: "failed", error: message });
    }
  }

  return { limit, claimed, published, failed, details };
}

export function defaultPublishQueueLimit(): number {
  const raw = process.env.CRON_MAX_PUBLISH_PER_RUN;
  if (raw && /^\d+$/.test(raw)) {
    const n = parseInt(raw, 10);
    if (n > 0) {
      return Math.min(n, 100);
    }
  }
  return 10;
}
