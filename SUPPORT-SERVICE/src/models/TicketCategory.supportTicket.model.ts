import mongoose, { Document, Schema } from 'mongoose';

export interface TicketCategory extends Document {
  name: string;
}

const TicketCategorySchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true },
  },
  {
    collection: 'ticket_categories',
    timestamps : true,
  }
);

export default mongoose.model<TicketCategory>('TicketCategory', TicketCategorySchema);
