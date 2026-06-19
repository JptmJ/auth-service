import { Schema, Document, Types, Connection, Model } from "mongoose";

export interface IUser extends Document {
  _id: Types.ObjectId;
  appId: string; // redundant audit copy of the tenant this record belongs to
  email: string;
  password: string;
  name: string;
  roles: string[];
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const userSchema = new Schema<IUser>(
  {
    appId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false, // never return password by default
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    roles: {
      type: [String],
      default: ["user"],
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Each tenant now has its own dedicated database, so a user's email only
// needs to be unique WITHIN that database — no more compound appId+email.
userSchema.index({ email: 1 }, { unique: true });

/**
 * Models in Mongoose are bound to a specific Connection. Since every tenant
 * has its own Connection (see config/dbManager.ts), we can't export a single
 * pre-built `User` model anymore — we build/reuse one per connection here.
 */
export const getUserModel = (connection: Connection): Model<IUser> => {
  return (connection.models.User as Model<IUser>) || connection.model<IUser>("User", userSchema);
};
