// Database: support_db - Schema
// Purpose: Manages support tickets and user queries.
// Collections:
// Tickets_id: ObjectId (Primary Key)
// createdBy: ObjectId (Reference to Identity Service's Users._id via API)
// assignedTo: ObjectId (Reference to Identity Service's Users._id via API, support manager)
// tentId: ObjectId (Reference to Quest Service's Tents._id via API, Optional)
// subject: String
// description: String
// category: String (Enum: 'tent', 'quest', 'general', 'bug', 'feedback')
// status: String (Enum: { 'New', 'Assigned', 'OnHold', 'Resolved' })
// priority: String (Enum: 'low', 'medium', 'high')
// messages: Array of Objects (e.g., {sender: ObjectId, message: String, sentAt: Date})
// createdAt: Date
// updatedAt: Date
// escalatedTo: ObjectId (Reference to Identity Service's Users._id via API, Optional)
// assignedAt: Date (Optional)
import mongoose, { Schema, Document } from 'mongoose';

export interface SupportTicket extends Document {
  ticketId: string;
  createdBy: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  tentId?: mongoose.Types.ObjectId;
  subject: string;
  description: string;
  category: mongoose.Types.ObjectId;
  status: mongoose.Types.ObjectId;
  priority: mongoose.Types.ObjectId;
  requestedResolution: string;
  escalatedTo?: mongoose.Types.ObjectId;
  assignedAt?: Date;
  initialMessage: {
    senderId: mongoose.Types.ObjectId;
    message: string;
    sentAt: Date;
  };
  responseMessage?: {
    senderId: mongoose.Types.ObjectId;
    message: string;
    sentAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SupportTicketSchema: Schema = new Schema(
  {
    ticketId: { 
      type: String, 
      required: true 
    },
    createdBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    assignedTo: { 
      type: Schema.Types.ObjectId, 
      ref: 'User' 
    },
    tentId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Tent' 
    },
    subject: { 
      type: String, 
      required: true 
    },
    description: { 
      type: String, 
      required: true 
    },
    category: { 
      type: Schema.Types.ObjectId, 
      ref: 'TicketCategory', 
      required: true 
    },
    status: { 
      type: Schema.Types.ObjectId, 
      ref: 'TicketStatus', 
      required: true 
    },
    priority: { 
      type: Schema.Types.ObjectId, 
      ref: 'TicketPriority', 
      required: true 
    },
    requestedResolution: { 
      type: String, 
      required: true 
    },
    escalatedTo: { 
      type: Schema.Types.ObjectId, 
      ref: 'User' 
    },
    assignedAt: { 
      type: Date 
    },

    initialMessage: {
      senderId: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', required: true 
      },
      message: { 
        type: String, 
        required: true 
      },
      sentAt: { 
        type: Date, 
        default: Date.now }
    },

    responseMessage: {
      senderId: { 
        type: Schema.Types.ObjectId, 
        ref: 'User' 
      },
      message: { 
        type: String 
      },
      sentAt: { 
        type: Date 
      }
    }
  },
  {
    timestamps: true,
    collection: 'support_tickets'
  }
);

export default mongoose.model<SupportTicket>('SupportTicket', SupportTicketSchema);