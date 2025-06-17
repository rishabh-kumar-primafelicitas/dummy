import { model, Schema } from "mongoose";

const statusSchema = new Schema(
  {
    statusValue: {
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

const StatusModal = model("Status", statusSchema);
export default StatusModal;
