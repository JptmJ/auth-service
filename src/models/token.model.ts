import { Schema, Document, Types, Connection, Model } from "mongoose";

export interface IRefreshToken extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  token: string; // hashed token
  appId: string; // redundant audit copy of the tenant this record belongs to
  expiresAt: Date;
  revoked: boolean;
  createdAt: Date;
}

export const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    appId: {
      type: String,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revoked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// MongoDB will auto-delete documents once expiresAt passes
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Same per-connection pattern as user.model.ts — see the comment there.
export const getRefreshTokenModel = (connection: Connection): Model<IRefreshToken> => {
  return (
    (connection.models.RefreshToken as Model<IRefreshToken>) ||
    connection.model<IRefreshToken>("RefreshToken", refreshTokenSchema)
  );
};
