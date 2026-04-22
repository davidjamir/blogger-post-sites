import { Schema, models, model, type Model } from "mongoose";

/** OAuth Google / Blogger — collection `account_api` trong DB `databases` (xem MONGODB_DB_NAME). */
export interface IAccountApi {
  /** Email tài khoản Google (để hiển thị & khóa upsert). */
  email: string;
  refreshToken: string;
  accessToken: string;
  /** Thời điểm access token hết hạn. */
  expired: Date;
  /** Chuỗi scope Google trả về lúc cấp token (dùng khoảng trắng phân tách). Bản ghi cũ có thể chưa có. */
  scope?: string;
  /** Mongoose version key (mặc định là `__v`, đổi thành `version` cho dễ đọc). */
  version?: number;
  /** `timestamps: true` — gán lại khi đổi access token. */
  createdAt?: Date;
  updatedAt?: Date;
}

const accountApiSchema = new Schema<IAccountApi>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    refreshToken: { type: String, default: "" },
    accessToken: { type: String, required: true },
    expired: { type: Date, required: true, index: true },
    scope: { type: String, default: "" },
  },
  { timestamps: true, collection: "account_api", versionKey: "version" }
);

/** Một tài khoản Google = một document; dùng để lọc upsert ổn định (tránh lệch hoa thường). */
export function normalizeAccountEmail(
  raw: string | null | undefined
): string {
  if (raw == null) {
    return "";
  }
  return String(raw).trim().toLowerCase();
}

export const AccountApi: Model<IAccountApi> =
  (models.AccountApi as Model<IAccountApi> | undefined) ??
  model<IAccountApi>("AccountApi", accountApiSchema);

/** Hàng đợi đăng bài — collection `post_queue` (có thể cấu hình / tích hợp bên ngoài). */
export type PostQueueStatus = "pending" | "processing" | "done" | "failed";

export interface IPostQueue {
  accountEmail: string;
  blogId: string;
  title: string;
  content: string;
  labels?: string[];
  status: PostQueueStatus;
  errorMessage?: string;
  postId?: string;
  postUrl?: string;
}

const postQueueSchema = new Schema<IPostQueue>(
  {
    accountEmail: { type: String, required: true, index: true },
    blogId: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    labels: { type: [String], default: undefined },
    status: {
      type: String,
      enum: ["pending", "processing", "done", "failed"],
      default: "pending",
      index: true,
    },
    errorMessage: { type: String, default: "" },
    postId: { type: String, default: "" },
    postUrl: { type: String, default: "" },
  },
  { timestamps: true, collection: "post_queue" }
);

postQueueSchema.index({ status: 1, createdAt: 1 });

export const PostQueue: Model<IPostQueue> =
  (models.PostQueue as Model<IPostQueue> | undefined) ??
  model<IPostQueue>("PostQueue", postQueueSchema);
