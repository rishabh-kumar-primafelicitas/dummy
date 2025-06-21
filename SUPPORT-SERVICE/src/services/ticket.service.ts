import { axios, SupportTicket } from '../utils/imports.util';
// import mongoose from 'mongoose';

// interface FetchTicketsOptions {
//   page?: number;
//   limit?: number;
//   skip?: number;
//   search?: string;
//   status?: string;
// }

// export const fetchTickets = async (
//   options?: FetchTicketsOptions
// ): Promise<{
//   data: any[];
//   pagination?: {
//     total: number;
//     page: number;
//     limit: number;
//     pages: number;
//   };
// }> => {
//   if (!options) {
//     const tickets = await SupportTicket.find()
//       .populate('category', 'name')
//       .populate('status', 'name')
//       .populate('priority', 'name')
//       .sort({ createdAt: -1 })
//       .lean();

//     console.log('No options provided. Returning all tickets.');
//     return { data: tickets };
//   }

//   let { page = 1, limit = 10, skip = 0, search = '', status } = options;
//   const query: any = {};

//   // Apply status filter safely
//   if (status && mongoose.isValidObjectId(status)) {
//     query.status = new mongoose.Types.ObjectId(status);
//   } else if (status && status !== 'all') {
//     console.warn('Invalid status ObjectId passed, ignoring filter:', status);
//   }

//   // pply search filter
//   if (search) {
//     query.initialMessage = { $regex: search, $options: 'i' };
//   }

//   skip = (page - 1) * limit;

//   console.log('Final query used for ticket fetch:', JSON.stringify(query));
//   console.log(`Pagination params => page: ${page}, limit: ${limit}, skip: ${skip}`);

//   const [tickets, total] = await Promise.all([
//     SupportTicket.find(query)
//       .populate('category', 'name')
//       .populate('status', 'name')
//       .populate('priority', 'name')
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean(),

//     SupportTicket.countDocuments(query),
//   ]);

//   const totalPages = Math.ceil(total / limit);

//   console.log(`Tickets fetched: ${tickets.length}`);
//   console.log(`Total matching tickets: ${total}`);
//   console.log(`Total pages: ${totalPages}`);

//   return {
//     data: tickets,
//     pagination: {
//       total,
//       page,
//       limit,
//       pages: totalPages,
//     },
//   };
// };

const getUsernameById = async (id: string): Promise<string | null> => {
  try {
    const response = await axios.get(`${process.env.AUTH_SERVICE_URL}/api/v1/public/me`, {
      headers: { userid: id },
    });

    if (response.data?.status && response.data?.data?.user?.username) {
      return response.data.data.user.username;
    }
    return null;
  } catch (err) {
    console.error(`❌ Failed to fetch username for ID ${id}:`, err);
    return null;
  }
};
const enrichUsernames = async (tickets: any[]): Promise<any[]> => {
  const userIds = new Set<string>();

  tickets.forEach(ticket => {
    if (ticket.createdBy) userIds.add(ticket.createdBy.toString());
    if (ticket.assignedTo) userIds.add(ticket.assignedTo.toString());
  });

  const userMap = new Map<string, string>();
  await Promise.all(
    Array.from(userIds).map(async userId => {
      const username = await getUsernameById(userId);
      userMap.set(userId, username || 'Unknown');
    })
  );

  return tickets.map(ticket => ({
    ...ticket,
    createdBy: {
      _id: ticket.createdBy,
      username: userMap.get(ticket.createdBy?.toString() || '') || 'Unknown',
    },
    assignedTo: {
      _id: ticket.assignedTo,
      username: userMap.get(ticket.assignedTo?.toString() || '') || 'Unknown',
    },
  }));
};

interface FetchTicketsOptions {
  page?: number;
  limit?: number;
  skip?: number;
  search?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}

export const fetchTickets = async (
  options?: FetchTicketsOptions
): Promise<{
  data: any[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}> => {
  if (!options) {
    const tickets = await SupportTicket.find()
      .populate('category', 'name')
      .populate('status', 'name')
      .populate('priority', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return { data: await enrichUsernames(tickets) }; // username enrichment
  }

  const { page = 1, limit = 10, skip = 0, search = '', status, startDate, endDate } = options;

  const query: any = {};

  if (status) {
    query.status = status;
  }

  if (search) {
    query.initialMessage = { $regex: search, $options: 'i' };
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      const start = new Date(startDate);
      query.createdAt.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  const [tickets, total] = await Promise.all([
    SupportTicket.find(query)
      .populate('category', 'name')
      .populate('status', 'name')
      .populate('priority', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    SupportTicket.countDocuments(query),
  ]);

  const enrichedTickets = await enrichUsernames(tickets); // 💡 Add usernames

  const totalPages = Math.ceil(total / limit);

  return {
    data: enrichedTickets,
    pagination: {
      total,
      page,
      limit,
      pages: totalPages,
    },
  };
};