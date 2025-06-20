import { SupportTicket } from '../utils/imports.util';
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

    return { data: tickets };
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

  console.log('🧾 Final query used for ticket fetch:', JSON.stringify(query));
  console.log(`📤 Pagination params => page: ${page}, limit: ${limit}, skip: ${skip}`);

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

  console.log(`✅ Tickets fetched: ${tickets.length}`);
  console.log(`📈 Total matching tickets: ${total}`);
  const totalPages = Math.ceil(total / limit);
  console.log(`📄 Total pages: ${totalPages}`);

  return {
    data: tickets,
    pagination: {
      total,
      page,
      limit,
      pages: totalPages,
    },
  };
};
