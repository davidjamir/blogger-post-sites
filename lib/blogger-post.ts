import { getBloggerClient } from "./google-auth";

export async function insertBloggerPost(params: {
  blogId: string;
  title: string;
  content: string;
  labels?: string[];
}) {
  const blogger = await getBloggerClient();
  const res = await blogger.posts.insert({
    blogId: params.blogId,
    requestBody: {
      title: params.title,
      content: params.content,
      labels: params.labels?.length ? params.labels : undefined,
    },
  });

  return {
    postId: res.data.id ?? null,
    url: res.data.url ?? null,
  };
}
