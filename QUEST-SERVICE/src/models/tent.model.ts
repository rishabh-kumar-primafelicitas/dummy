import { model, Schema } from "mongoose";

const tentSchema = new Schema(
  {
    tentName: {
      type: String,
      unique: true,
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
    tentType: {
      type: Schema.Types.ObjectId,
      ref: "TentType",
      default: null,
    },
    status: {
      type: Schema.Types.ObjectId,
      ref: "Status",
      default: null,
    },
    visibility: {
      type: Schema.Types.ObjectId,
      ref: "Visibility",
      default: null,
    },
    // This is the Airlyft ID for the tent
    eventId: {
      type: String,
      unique: true,
      required: true,
    },
    startTime: {
      type: Date,
      default: null,
    },
    endTime: {
      type: Date,
      default: null,
    },
    publicLink: {
      type: String,
      default: null,
    },
    bannerUrl: {
      type: String,
      default: null,
    },
    state: {
      type: String,
      enum: ["ONGOING", "COMPLETED", "DRAFT", "CANCELLED"],
      default: "DRAFT",
    },
    settlementFiles: {
      type: String,
      default: null,
    },
    settledAt: {
      type: Date,
      default: null,
    },
    eventType: {
      type: String,
      enum: ["CAMPAIGN", "EVENT"],
      default: "CAMPAIGN",
    },
    visibilityType: {
      type: String,
      enum: ["PUBLIC", "PRIVATE"],
      default: "PUBLIC",
    },
    mode: {
      type: String,
      default: null,
    },
    summary: {
      totalParticipants: {
        type: Number,
        default: 0,
      },
      totalPoints: {
        type: Number,
        default: 0,
      },
      totalPointsEarned: {
        type: Number,
        default: 0,
      },
      totalTaskParticipation: {
        type: Number,
        default: 0,
      },
      totalTasks: {
        type: Number,
        default: 0,
      },
      totalXP: {
        type: Number,
        default: 0,
      },
    },
    rewardTitle: {
      type: String,
      default: null,
    },
    rewardSubtitle: {
      type: String,
      default: null,
    },
    ipProtect: {
      type: Boolean,
      default: null,
    },
    leaderboard: {
      type: String,
      enum: ["NONE", "POINTS", "XP"],
      default: "NONE",
    },
    seasonId: {
      type: String,
      default: null,
    },
    tags: {
      type: [String],
      default: null,
    },
    questIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Quest",
      },
    ],
  },
  { timestamps: true, versionKey: false }
);

const Tent = model("Tent", tentSchema);
export default Tent;
