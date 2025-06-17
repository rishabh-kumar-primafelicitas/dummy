import { model, Schema } from "mongoose";

const rewardTypeSchema = new Schema(
  {
    rewardType: {
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

const RewardTypeModal = model("reward_type", rewardTypeSchema);
export default RewardTypeModal;
