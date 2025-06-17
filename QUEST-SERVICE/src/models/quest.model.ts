import { model, Schema } from "mongoose";

const questSchema = new Schema(
  {
    tentId: {
      type: Schema.Types.ObjectId,
      ref: "Tent",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: null,
    },
    xpValue: {
      type: Number,
      default: 0,
    },
    status: {
      type: Schema.Types.ObjectId,
      ref: "Status",
      default: null,
    },
    scheduledAt: {
      type: Date,
      default: null,
    },
    prerequisites: {
      type: [Schema.Types.ObjectId],
      ref: "Quest",
      default: [],
    },
    rewardType: {
      type: Schema.Types.ObjectId,
      ref: "RewardType",
      default: null,
    },
    rewardValue: {
      type: String,
      default: null,
    },
    // This is the Airlyft ID for the quest
    taskId: {
      type: String,
      unique: true,
      required: true,
    },
    order: {
      type: Number,
      default: 1,
    },
    points: {
      type: Number,
      default: 0,
    },
    iconUrl: {
      type: String,
      default: null,
    },
    appType: {
      type: String,
      enum: [
        "TWITTER",
        "DISCORD",
        "TELEGRAM",
        "CUSTOM",
        "INSTAGRAM",
        "YOUTUBE",
        "EMAIL",
      ],
      default: null,
    },
    taskType: {
      type: String,
      default: null,
    },
    parentId: {
      type: String,
      default: null,
    },
    frequency: {
      type: String,
      enum: ["NONE", "DAILY", "WEEKLY", "MONTHLY"],
      default: "NONE",
    },
    xp: {
      type: Number,
      default: 0,
    },
    appKey: {
      type: String,
      default: null,
    },
    taskKey: {
      type: String,
      default: null,
    },
    verify: {
      type: String,
      enum: ["AUTO", "MANUAL"],
      default: "AUTO",
    },
    subTaskStats: {
      count: {
        type: Number,
        default: null,
      },
      totalPoints: {
        type: Number,
        default: null,
      },
      totalXp: {
        type: Number,
        default: null,
      },
    },
    participantCount: {
      type: Number,
      default: 0,
    },
    guardConfig: {
      type: Schema.Types.Mixed,
      default: null,
    },
    info: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);

const Quest = model("Quest", questSchema);
export default Quest;
