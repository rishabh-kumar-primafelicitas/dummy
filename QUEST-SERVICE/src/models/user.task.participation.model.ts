import { model, Schema } from "mongoose";

const userTaskParticipationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    eventId: {
      type: String,
      required: true,
    },
    tentId: {
      type: Schema.Types.ObjectId,
      ref: "Tent",
      default: null,
    },
    participations: [
      {
        taskId: {
          type: String,
          required: true,
        },
        questId: {
          type: Schema.Types.ObjectId,
          ref: "Quest",
          default: null,
        },
        points: {
          type: Number,
          default: 0,
        },
        xp: {
          type: Number,
          default: 0,
        },
        status: {
          type: String,
          enum: ["VALID", "INVALID", "PENDING", "REJECTED"],
          required: true,
        },
        providerId: {
          type: String,
          default: null,
        },
        participatedAt: {
          type: Date,
          required: true,
        },
        taskData: {
          type: Schema.Types.Mixed,
          default: null,
        },
      },
    ],
    totalPoints: {
      type: Number,
      default: 0,
    },
    totalXp: {
      type: Number,
      default: 0,
    },
    completedTasksCount: {
      type: Number,
      default: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true, versionKey: false }
);

// Compound index for efficient queries
// userTaskParticipationSchema.index({ userId: 1, eventId: 1 }, { unique: true });
// userTaskParticipationSchema.index({ eventId: 1 });
// userTaskParticipationSchema.index({ userId: 1 });

const UserTaskParticipation = model(
  "UserTaskParticipation",
  userTaskParticipationSchema,
  "user_task_participations"
);
export default UserTaskParticipation;
