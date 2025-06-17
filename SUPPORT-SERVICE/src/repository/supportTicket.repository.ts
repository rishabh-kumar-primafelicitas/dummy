import {mongoose, SupportTicket} from '../utils/imports.util';

// CREATE TICKET
export const createSupportTicket = async (ticketData: any) => {
  const ticket = new SupportTicket({
    createdBy: ticketData.createdBy ? new mongoose.Types.ObjectId(ticketData.createdBy) : undefined,
    assignedTo: ticketData.assignedTo ? new mongoose.Types.ObjectId(ticketData.assignedTo) : undefined,
    tentId: ticketData.tentId ? new mongoose.Types.ObjectId(ticketData.tentId) : undefined,
    subject: ticketData.subject,
    description: ticketData.description,
    category: new mongoose.Types.ObjectId(ticketData.category),
    status: new mongoose.Types.ObjectId(ticketData.status),
    priority: new mongoose.Types.ObjectId(ticketData.priority),
    messages: ticketData.messages?.map((msg: any) => ({
      sender: new mongoose.Types.ObjectId(msg.sender),
      message: msg.message,
      sentAt: msg.sentAt ? new Date(msg.sentAt) : new Date()
    })),
    escalatedTo: ticketData.escalatedTo ? new mongoose.Types.ObjectId(ticketData.escalatedTo) : undefined,
    assignedAt: ticketData.assignedAt ? new Date(ticketData.assignedAt) : undefined
  });

  return await ticket.save();
};


// GET ALL
export const getAllTickets = async () => {
  return await SupportTicket.find().sort({ createdAt: -1 });
};

// GET BY ID
export const getTicketById = async (id: string) => {
  return await SupportTicket.findById(id);
};

// UPDATE BY ID
export const updateTicketById = async (id: string, updateData: any) => {
  return await SupportTicket.findByIdAndUpdate(id, updateData, { new: true });
};


// UPDATE STATUS
export const updateTicketStatusById = async (id: string, status: string) => {
  return await SupportTicket.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  );
};


// DELETE
export const deleteTicketById = async (id: string) => {
  return await SupportTicket.findByIdAndDelete(id);
};