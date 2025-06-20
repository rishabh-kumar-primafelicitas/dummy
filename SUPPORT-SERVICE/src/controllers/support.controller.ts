import { Request, Response } from 'express';
import {
  mongoose,
  SupportTicket,
  uploadFile,
  generateUniqueTicketId,
  SupportManagerStats,
  fetchLoggedInUser,
  axios,
  config,
  SupportTicketModel,
  fetchTickets
} from '../utils/imports.util';


// // Submit ticket via a basic form (no file upload logic here)
// export const submitTicketForm = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { category, priority, issueDescription, requestedResolution } = req.body;

//     const ticketData = {
//       category,
//       priority,
//       issueDescription,
//       requestedResolution,
//       attachment: req.file ? req.file.filename : undefined,
//       submittedAt: new Date(),
//       lastUpdated: new Date(),
//     };

//     const newTicket = await SupportTicket.create(ticketData);
//     res.status(201).json({ status: true, message: 'Ticket submitted successfully', Data: { ticket: newTicket } });
//   } catch (err) {
//     res.status(500).json({ status: false, message: 'Failed to submit ticket', error: err });
//   }
// };

// // Core logic for creating ticket
// export const createTicket = async (req: Request, res: Response): Promise<void> => {
//   try {
//     let parsedMessages: any[] = [];

//     if (req.body.messages) {
//       try {
//         parsedMessages = typeof req.body.messages === 'string'
//           ? JSON.parse(req.body.messages)
//           : req.body.messages;
//       } catch (parseErr) {
//         res.status(400).json({ status: false, message: "Invalid JSON format in 'messages' field", error: parseErr });
//         return;
//       }
//     }

//     const ticketData = {
//       ...req.body,
//       messages: parsedMessages
//     };

//     const ticket = await createSupportTicket(ticketData);

//     res.status(201).json({
//       status: true,
//       message: "Ticket generation successful",
//       Data: ticket
//     });
//   } catch (err) {
//     console.error('Ticket creation failed:', err);
//     res.status(500).json({ status: false, message: 'Failed to create ticket', error: err });
//   }
// };

// // Combined file upload + ticket creation (for cleaner routing)
// export const generateTicket = async (req: Request, res: Response): Promise<void> => {
//   try {
//     await uploadFile('attachment')(req, res);

//     if (req.file) {
//       req.body.attachment = req.file.path;
//     }

//     await createTicket(req, res);
//   } catch (error: any) {
//     res.status(400).json({ status: false, message: error.message || 'File upload failed' });
//   }
// };

// working

// Core logic for creating ticket
// export const createTicket = async (req: Request, res: Response): Promise<void> => {
//   try {
//     let parsedMessages: any[] = [];

//     if (req.body.messages) {
//       try {
//         parsedMessages = typeof req.body.messages === 'string'
//           ? JSON.parse(req.body.messages)
//           : req.body.messages;
//       } catch (parseErr) {
//         res.status(400).json({ status: false, message: "Invalid JSON format in 'messages' field", error: parseErr });
//         return;
//       }
//     }

//     const ticketId: string = await generateUniqueTicketId(); // ensure it's always a string

//     const ticketData = {
//       ...req.body,
//       ticketId,
//       messages: parsedMessages
//     };

//     const ticket = await SupportTicket.create(ticketData);

//     res.status(201).json({
//       status: true,
//       message: "Ticket generation successful",
//       Data: ticket
//     });
//   } catch (err) {
//     console.error('Ticket creation failed:', err);
//     res.status(500).json({ status: false, message: 'Failed to create ticket', error: err });
//   }
// };

// // Combined file upload + ticket creation
// export const generateTicket = async (req: Request, res: Response): Promise<void> => {
//   try {
//     await uploadFile('attachment')(req, res);

//     if (req.file) {
//       req.body.attachment = req.file.path;
//     }

//     await createTicket(req, res);
//   } catch (error: any) {
//     res.status(400).json({ status: false, message: error.message || 'File upload failed' });
//   }
// };


//working 
export const createTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[createTicket] Incoming request body:', req.body);

    let parsedMessages: any[] = [];

    if (req.body.messages) {
      parsedMessages = typeof req.body.messages === 'string'
        ? JSON.parse(req.body.messages)
        : req.body.messages;
    }

    // Get userId from headers
    const userId = req.headers['userid'] as string;
    if (!userId) {
      console.error('[createTicket] Missing userId in headers');
      res.status(400).json({ status: false, message: 'User ID is missing in headers' });
      return;
    }

    // Fetch user
    const user = await fetchLoggedInUser(userId);
    console.log('[createTicket] Fetched user:', user);

    const createdBy = user?._id;
    if (!createdBy) {
      console.error('[createTicket] Invalid user');
      res.status(400).json({ status: false, message: 'Invalid user' });
      return;
    }

    // Fetch support managers
    const stats = await SupportManagerStats.find({});
    console.log('[createTicket] Support manager stats count:', stats.length);

    if (!Array.isArray(stats) || stats.length === 0) {
      console.error('[createTicket] No support managers found');
      res.status(404).json({ status: false, message: 'No support managers found' });
      return;
    }

    // Choose manager with least load
    const managerWithLeastLoad = stats.reduce((prev, curr) => {
      const prevLoad = prev.openTickets + prev.assignedTickets;
      const currLoad = curr.openTickets + curr.assignedTickets;
      return currLoad < prevLoad ? curr : prev;
    });

    const assignedTo = managerWithLeastLoad.managerId;
    console.log('[createTicket] Assigned to managerId:', assignedTo);

    // Update manager stats
    await SupportManagerStats.findOneAndUpdate(
      { managerId: assignedTo },
      { $inc: { openTickets: 1, assignedTickets: 1 } }
    );

    // Generate ticket ID
    const ticketId = await generateUniqueTicketId();

    // Create ticket object
    const ticketData = {
      ...req.body,
      ticketId,
      messages: parsedMessages,
      createdBy,
      assignedTo,
    };

    const ticket = await SupportTicket.create(ticketData);
    console.log('[createTicket] Ticket created successfully');

    res.status(201).json({
      status: true,
      message: 'Ticket generated successfully',
      data: ticket,
    });

  } catch (err: any) {
    console.error('[createTicket] Ticket creation failed:', err);
    res.status(500).json({ status: false, message: 'Failed to create ticket', error: err.message });
  }
};

// FINAL CONTROLLER: Generate Ticket (with file upload)
export const generateTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    await uploadFile('attachment')(req, res);

    if (req.file) {
      req.body.attachment = req.file.path;
    }

    await createTicket(req, res);
  } catch (error: any) {
    console.error('[generateTicket] File upload failed:', error);
    res.status(400).json({ status: false, message: error.message || 'File upload failed' });
  }
};

// Get all tickets

// export const getTickets = async (req: Request, res: Response): Promise<void> => {
//   const page = parseInt(req.query.page as string, 10) || 1;
//   const limit = parseInt(req.query.limit as string, 10) || 10;
//   const skip = (page - 1) * limit;

//   const search = req.query.search ? (req.query.search as string).trim() : '';
//   const status = req.query.status === 'New' || req.query.status === 'Assigned' || req.query.status === 'On Hold' || req.query.status === 'Resolved'
//     ? (req.query.status as string)
//     : undefined;

//   try {
//     const result = await fetchTickets({ page, limit, skip, search, status });

//     res.status(200).json({
//       status: true,
//       message: 'Tickets retrieved successfully',
//       data: result.data.length === 0 ? null : result.data,
//       pagination: result.pagination,
//     });
//   } catch (err) {
//     console.error('Error fetching tickets:', err);
//     res.status(500).json({
//       status: false,
//       message: 'Failed to fetch tickets',
//     });
//   }
// };
export const getTickets = async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;
  const skip = (page - 1) * limit;

  const search = req.query.search ? (req.query.search as string).trim() : '';
  const statusParam = req.query.status as string;
  const status = mongoose.isValidObjectId(statusParam) ? statusParam : undefined;

  // 👇 Extract startDate and endDate from query
  const startDateStr = req.query.startDate as string;
  const endDateStr = req.query.endDate as string;
  const startDate = startDateStr ? new Date(startDateStr) : undefined;
  const endDate = endDateStr ? new Date(endDateStr) : undefined;

  try {
    // 👇 Pass them to fetchTickets
    const result = await fetchTickets({ page, limit, skip, search, status, startDate, endDate });

    res.status(200).json({
      status: true,
      message: 'Tickets retrieved successfully',
      data: result.data.length === 0 ? null : result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    console.error('Error fetching tickets:', err);
    res.status(500).json({
      status: false,
      message: 'Failed to fetch tickets',
    });
  }
};

interface UserResponse {
  status: boolean;
  message: string;
  data: {
    user: {
      _id: string;
      username: string;
      email: string;
      roleId: string;
      status: string;
      createdAt: string;
      updatedAt: string;
      lastLoginAt: string;
      loginAttempts: number;
      profilePicture: string | null;
      twoFactorEnabled: boolean;
      emailVerified: boolean;
      walletConnected: boolean;
      airLyftAuthToken: string;
      lockedUntil: string | null;
      oAuthProvider: string | null;
      oAuthId: string | null;
      walletAddress: string | null;
      emailVerificationExpires: string | null;
      passwordResetExpires: string | null;
    };
  };
}
// Get tickets assigned to the authenticated manager
export const getTicketsAssignedToManager = async (req: Request, res: Response): Promise<void> => {
  try {
    const authToken = req.headers.authorization;

    const { data: userResponse } = await axios.get<UserResponse>(
      `${config.services.authServiceUrl}/api/v1/me`,
      {
        headers: {
          Authorization: authToken,
        },
      }
    );

    const user = userResponse.data.user;
    console.log('Authenticated user:', user);

    const tickets = await SupportTicket.find({ assignedTo: user._id })

      .populate({
        path: 'category',
        model: 'TicketCategory', // Ensure the model name matches exactly
        select: 'name', // Select only the "name" field from the populated document
      })
      .populate({
        path: 'status',
        model: 'TicketStatus',
        select: 'name',
      })
      .populate({
        path: 'priority',
        model: 'TicketPriority',
        select: 'name',
      })
      .sort({ createdAt: -1 })
      .lean(); // Converts documents to plain JS objects 

    res.status(200).json({
      status: true,
      message: 'All existing tickets',
      data: { tickets },
    });
  } catch (err) {
    console.error('Error fetching tickets:', err); // Check logs if null or error
    res.status(500).json({
      status: false,
      message: 'Failed to fetch tickets',
    });
  }
};

// Get single ticket by ID
export const getTicketById = async (req: Request, res: Response): Promise<void> => {
  const ticketId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(ticketId)) {
    res.status(400).json({ status: false, message: 'Invalid ticket ID format' });
    return;
  }

  try {
    const ticket = await SupportTicket.findById(ticketId)
      .populate('status', 'name')
      .populate('priority', 'name')
      .populate('category', 'name');

    if (!ticket) {
      res.status(404).json({ status: false, message: 'Ticket not found' });
      return;
    }

    res
      .status(200)
      .json({ status: true, message: 'Ticket fetched successfully', data: { ticket } });
  } catch (err) {
    res.status(500).json({ status: false, message: 'Failed to fetch ticket' });
  }
};

// Update ticket details
export const updateTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const updated = await SupportTicket.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) {
      res.status(404).json({ status: false, message: 'Ticket not found' });
      return;
    }
    res
      .status(200)
      .json({ status: true, message: 'Ticket updated successfully', data: { updated } });
  } catch (err) {
    res.status(500).json({ status: false, message: 'Failed to update ticket' });
  }
};

export const respondToTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ticketId, message, senderId, sentAt, status } = req.body;

    if (!ticketId || !message || !senderId || !status) {
      res.status(400).json({
        status: false,
        message: 'ticketId, message, status and senderId are required',
      });
      return;
    }

    const updatedTicket = await SupportTicket.findOneAndUpdate(
      { ticketId },
      {
        $set: {
          responseMessage: {
            senderId,
            message,
            sentAt: sentAt ? new Date(sentAt) : new Date(),
          },
          status,
          updatedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!updatedTicket) {
      res.status(404).json({
        status: false,
        message: 'Ticket not found',
      });
      return;
    }

    res.status(200).json({
      status: true,
      message: 'Response added successfully',
      Data: { ticket: updatedTicket },
    });
  } catch (error) {
    console.error('Error in respondToTicket:', error);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
      error,
    });
  }
};

// Mark ticket as (New, Assigned, On Hold, Resolved)
export const updateTicketStatus = async (req: Request, res: Response): Promise<void> => {
  const { status } = req.body;

  try {
    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!ticket) {
      res.status(404).json({ status: false, message: 'Ticket not found' });
      return;
    }
    res.status(200).json({ status: true, message: 'Ticket status updated', data: ticket });
  } catch (err) {
    res.status(500).json({ status: false, message: 'Failed to update ticket status' });
  }
};

// Delete a ticket
export const deleteTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const ticket = await SupportTicket.findByIdAndDelete(req.params.id);
    if (!ticket) {
      res.status(404).json({ status: false, message: 'Ticket not found' });
      return;
    }
    res.status(200).json({ status: true, message: 'Ticket deleted successfully' });
  } catch (err) {
    res.status(500).json({ status: false, message: 'Failed to delete ticket' });
  }
};

// export const getTicketsByAssignedManager = async (req: Request, res: Response): Promise<void> => {
//   const managerId = req.params.managerId;
//   if (!mongoose.Types.ObjectId.isValid(managerId)) {
//     res.status(400).json({ status: false, message: 'Invalid manager ID' });
//     return;
//   }

//   try {
//     const tickets = await SupportTicket.find({ assignedTo: managerId })
//       .populate('status', 'name')
//       .populate('priority', 'name')
//       .populate('category', 'name')
//       .sort({ createdAt: -1 });

//     res.status(200).json({
//       status: true,
//       message: 'Tickets assigned to the support manager fetched successfully',
//       data: { tickets }
//     });
//   } catch (err) {
//     console.error('Error fetching assigned tickets:', err);
//     res.status(500).json({ status: false, message: 'Failed to fetch assigned tickets' });
//   }
// };
export const getTicketsByAssignedManager = async (req: Request, res: Response): Promise<void> => {
  const managerId = req.params.managerId;

  if (!mongoose.Types.ObjectId.isValid(managerId)) {
    res.status(400).json({ status: false, message: 'Invalid manager ID' });
    return;
  }

  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;
  const skip = (page - 1) * limit;

  const status = req.query.status && mongoose.isValidObjectId(req.query.status as string)
    ? req.query.status as string
    : undefined;

  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
  if (endDate) endDate.setHours(23, 59, 59, 999);

  const query: any = { assignedTo: managerId };
  if (status) query.status = status;
  if (startDate && endDate) {
    query.createdAt = { $gte: startDate, $lte: endDate };
  }

  try {
    const [tickets, total] = await Promise.all([
      SupportTicket.find(query)
        .populate('status', 'name')
        .populate('priority', 'name')
        .populate('category', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SupportTicket.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: true,
      message: 'Tickets assigned to the support manager fetched successfully',
      data: tickets,
      pagination: {
        total,
        page,
        limit,
        pages: totalPages,
      },
    });
  } catch (err) {
    console.error('Error fetching assigned tickets:', err);
    res.status(500).json({ status: false, message: 'Failed to fetch assigned tickets' });
  }
};
// Get tickets created by a specific user
export const getUserTickets = async (_req: Request, _res: Response) => {
  try {
    const userId = _req.headers['userid'];

    if (!userId) {
      _res.status(400).json({ success: false, message: 'User ID missing in headers' });
      return;
    }

    const tickets = await SupportTicketModel.find({ createdBy: userId })
      .populate('category', 'name')
      .populate('status', 'name')
      .populate('priority', 'name')
      .sort({ createdAt: -1 });

    _res.status(200).json({ success: true, data: tickets });
  } catch (error) {
    console.error('Error fetching tickets by user:', error);
    _res.status(500).json({ success: false, message: 'Failed to fetch tickets', error });
  }
};