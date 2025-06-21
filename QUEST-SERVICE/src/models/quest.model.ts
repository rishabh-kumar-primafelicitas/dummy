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
    // Dynamic prerequisites from guardConfig TASK_ID rules
    dynamicPrerequisites: {
      type: [Schema.Types.ObjectId],
      ref: "Quest",
      default: [],
    },
    // Custom prerequisites for cross-campaign dependencies
    customPrerequisites: {
      type: [Schema.Types.ObjectId],
      ref: "Quest",
      default: [],
    },
    // Condition logic from guardConfig (AND/OR)
    prerequisiteCondition: {
      type: String,
      enum: ["AND", "OR"],
      default: "AND",
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

// Virtual fields for quiz identification
questSchema.virtual("isQuizParent").get(function () {
  return (
    this.taskType === "QUIZ_PLAY" &&
    (this.parentId === null || this.parentId === undefined)
  );
});

questSchema.virtual("isQuizQuestion").get(function () {
  return this.taskType === "QUIZ_PLAY" && this.parentId !== null;
});

questSchema.virtual("questType").get(function () {
  if (this.taskType === "QUIZ_PLAY") {
    return this.parentId === null ? "QUIZ_PARENT" : "QUIZ_QUESTION";
  }
  return "REGULAR";
});

// Add indexes for quiz functionality
questSchema.index({ parentId: 1 });
questSchema.index({ taskType: 1, parentId: 1 });

// Ensure virtuals are included in JSON output
questSchema.set("toJSON", { virtuals: true });
questSchema.set("toObject", { virtuals: true });

const Quest = model("Quest", questSchema);
export default Quest;
