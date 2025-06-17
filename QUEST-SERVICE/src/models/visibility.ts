import { model, Schema } from "mongoose";

const visibilitySchema = new Schema(
  {
    visibilityValue: {
      type: String,
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

const VisibilityModal = model("Visibility", visibilitySchema);
export default VisibilityModal;
