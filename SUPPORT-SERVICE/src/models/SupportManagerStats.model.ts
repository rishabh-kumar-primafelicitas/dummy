import mongoose, { Schema, Document } from 'mongoose';

export interface ISupportManagerStats extends Document {
  managerId: mongoose.Types.ObjectId;
  managerName: string;
  assignedTickets: number;
  closedTickets: number;
  openTickets: number;
}

const supportManagerStatsSchema = new Schema<ISupportManagerStats>(
  {
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      ref: 'User',
    },
    managerName: {
      type: String,
      required: true,
    },
    assignedTickets: {
      type: Number,
      default: 0,
    },
    closedTickets: {
      type: Number,
      default: 0,
    },
    openTickets: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'support_manager_stats',
  }
);

const SupportManagerStats = mongoose.model<ISupportManagerStats>(
  ' ',
  supportManagerStatsSchema
);

export default SupportManagerStats;
