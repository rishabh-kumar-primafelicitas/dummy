import { model, Schema, Document, Types } from "mongoose";

// 1) TS interface for the participation sub-doc:
interface Participation {
  taskId: string;
  questId: Types.ObjectId | null;
  quizParentId: string | null;
  answers: string[];
  correctAnswers: string[];
  isCorrect: boolean | null;
  points: number;
  xp: number;
  status: "VALID" | "INVALID" | "PENDING" | "REJECTED";
  providerId: string | null;
  participatedAt: Date;
  taskData: any | null;
  airLyftParticipationId: string | null;
}

// 2) TS interface for the root document:
export interface UserTaskParticipationDocument extends Document {
  userId: Types.ObjectId;
  eventId: string;
  tentId: Types.ObjectId | null;
  participations: Participation[];
  totalPoints: number;
  totalXp: number;
  completedTasksCount: number;
  lastUpdated: Date;
}

// 3) Pass that interface into your Schema<>:
const userTaskParticipationSchema = new Schema<UserTaskParticipationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    eventId: { type: String, required: true },
    tentId: { type: Schema.Types.ObjectId, ref: "Tent", default: null },
    participations: [
      {
        taskId: { type: String, required: true },
        questId: { type: Schema.Types.ObjectId, ref: "Quest", default: null },
        quizParentId: { type: String, default: null },
        answers: { type: [String] },
        correctAnswers: { type: [String], default: [] },
        isCorrect: { type: Boolean, default: null },
        points: { type: Number, default: 0 },
        xp: { type: Number, default: 0 },
        status: {
          type: String,
          enum: ["VALID", "INVALID", "PENDING", "REJECTED"],
          required: true,
        },
        providerId: {
          type: String,
          default: null,
        },
        participatedAt: { type: Date, required: true },
        taskData: { type: Schema.Types.Mixed, default: null },
        airLyftParticipationId: { type: String, default: null },
      },
    ],
    totalPoints: { type: Number, default: 0 },
    totalXp: { type: Number, default: 0 },
    completedTasksCount: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true, versionKey: false }
);

userTaskParticipationSchema.index({ userId: 1, eventId: 1 });
userTaskParticipationSchema.index({ eventId: 1 });
userTaskParticipationSchema.index({ userId: 1 });
userTaskParticipationSchema.index({ "participations.taskId": 1 });
userTaskParticipationSchema.index({ "participations.quizParentId": 1 });

const UserTaskParticipation = model<UserTaskParticipationDocument>(
  "UserTaskParticipation",
  userTaskParticipationSchema,
  "user_task_participations"
);

export default UserTaskParticipation;
