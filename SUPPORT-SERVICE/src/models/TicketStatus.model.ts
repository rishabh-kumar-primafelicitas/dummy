import mongoose, { Document, Schema } from 'mongoose';

export interface TicketStatus extends Document {
  name: string;
}
// statusCode :number, name , isActive, createdAt, updatedAt
const TicketStatusSchema: Schema = new Schema(
  {
    name: { 
      type: String, 
      required: true 
    },
  },
  {
    collection: 'ticket_status',
    timestamps: true
  }
);

export default mongoose.model<TicketStatus>('TicketStatus', TicketStatusSchema);
