import mongoose, { Document, Schema } from 'mongoose';

export interface TicketPriority extends Document {
  name: string;
}

const TicketPrioritySchema: Schema = new Schema(
  {
    name: { type: String, required: true },
  },
  {
    collection: 'ticket_priorities',
    timestamps: true
  }
);

export default mongoose.model<TicketPriority>('TicketPriority', TicketPrioritySchema);
