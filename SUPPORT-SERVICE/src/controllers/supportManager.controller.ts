import { Request, Response } from 'express';
import {fetchManagerStats, fetchSupportManagers } from '@utils/imports.util';

// This controller handles fetching support managers with pagination, search, and status filtering.
export const getSupportManagers = async (req: Request, res: Response) => {
  const token = req.headers.authorization;

  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
  const search = req.query.search ? (req.query.search as string) : '';
  const status = req.query.status ? parseInt(req.query.status as string, 10) : '';

  console.log('[getSupportManagers] Request received with params:', {
    page,
    limit,
    search,
    tokenProvided: !!token,
  });

  if (!token) {
    console.warn('[getSupportManagers] No token provided');
    res.status(401).json({ message: 'No token provided' });
    return;
  }

  try {
    const managers = await fetchSupportManagers(token, page, limit, search, status);

    // console.log(`[getSupportManagers] Fetched ${managers.data?.length || 0} support managers`);

    const enrichedManagers = await Promise.all(
      managers.data.map(async (manager: any) => {
        try {
          // console.log(`[getSupportManagers] Fetching stats for managerId=${manager._id}`);
          const stats = await fetchManagerStats(manager._id.toString());

          // console.log(`[getSupportManagers] Stats for ${manager._id}:`, stats);

          return {
            ...manager,
            assignedTickets: stats?.assignedTickets || 0,
            openTickets: stats?.openTickets || 0,
            closedTickets: stats?.closedTickets || 0,
          };
        } catch (err: any) {
          console.warn(
            `[getSupportManagers] Failed to fetch stats for managerId=${manager._id}:`,
            err.message
          );

          return {
            ...manager,
            assignedTickets: 0,
            openTickets: 0,
            closedTickets: 0,
          };
        }
      })
    );

    // console.log('[getSupportManagers] Final enriched manager list:', enrichedManagers);

    res.status(200).json({
      ...managers,
      data: enrichedManagers,
    });
  } catch (error: unknown) {
    console.error('[getSupportManagers] Unexpected error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
