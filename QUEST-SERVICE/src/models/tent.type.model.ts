import { model, Schema } from "mongoose";

const tentTypeSchema = new Schema(
  {
    tentType: {
      type: String,
      required: true,
      unique: true,
    },
    tentId: {
      type: Number,
      required: true,
      unique: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const TentType = model("TentType", tentTypeSchema, "tent_types");
export default TentType;
