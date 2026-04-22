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
}

const accountApiSchema = new Schema<IAccountApi>(
  {
    email: { type: String, required: true, unique: true, index: true },
    refreshToken: { type: String, default: "" },
    accessToken: { type: String, required: true },
    expired: { type: Date, required: true, index: true },
    scope: { type: String, default: "" },
  },
  { timestamps: true, collection: "account_api", versionKey: "version" }
);

export const AccountApi: Model<IAccountApi> =
  (models.AccountApi as Model<IAccountApi> | undefined) ??
  model<IAccountApi>("AccountApi", accountApiSchema);
