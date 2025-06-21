import { Request, Response } from 'express';
import { searchSupportTickets } from '../services/ticketSearch.service';

// export const searchTicketsHandler = async (req: Request, res: Response) => {
//   try {
//     const searchTerm = String(req.query.searchTerm || '').trim();
//     const page = parseInt(String(req.query.page || 1));
//     const limit = parseInt(String(req.query.limit || 10));

//     const { total, tickets, pagination } = await searchSupportTickets(searchTerm, page, limit);

//     res.status(200).json({
//       status: true,
//       message: 'Tickets retrieved successfully',
//       data: tickets,
//       pagination
//     });
//   } catch (err) {
//     console.error('Search failed:', err);
//     res.status(500).json({
//       status: false,
//       message: 'Internal server error',
//     });
//   }
// };

export const searchTicketsHandler = async (req: Request, res: Response) => {
  try {
    const searchTerm = String(req.query.searchQuery || '').trim();
    const page = parseInt(String(req.query.page || 1));
    const limit = parseInt(String(req.query.limit || 10));
    const status = req.query.status as string | undefined;
    const assignedTo = req.query.assignedTo as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const result = await searchSupportTickets({
      searchTerm,
      page,
      limit,
      status,
      assignedTo,
      startDate,
      endDate
    });

    res.status(200).json({
      status: true,
      message: 'Tickets retrieved successfully',
      data: result.tickets,
      pagination: result.pagination
    });
  } catch (err) {
    console.error('Search failed:', err);
    res.status(500).json({
      status: false,
      message: 'Internal server error'
    });
  }
};
