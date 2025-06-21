// import { Request, Response } from 'express';
// import mongoose from 'mongoose';
// import SupportManagerStats from '@models/SupportManagerStats.model';

// export const getSupportManagerStats = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const managerId = req.query.managerId as string;
//     console.log('managerId received:', managerId);

//     if (!managerId) {
//       res.status(400).json({ success: false, message: 'Missing managerId' });
//       return;
//     }

//     let stats = null;

//     // Try with ObjectId if valid
//     if (mongoose.Types.ObjectId.isValid(managerId)) {
//       console.log('Querying with ObjectId');
//       stats = await SupportManagerStats.findOne({ managerId: new mongoose.Types.ObjectId(managerId) });
//     }

//     // If still not found, try as string (fallback)
//     if (!stats) {
//     //   console.log('Trying fallback string match');
//       stats = await SupportManagerStats.findOne({ managerId: managerId });
//     }

//     if (!stats) {
//       console.log('No stats found for:', managerId);
//       res.status(404).json({ success: false, message: 'Stats not found for this manager' });
//       return;
//     }

//     console.log('Stats found:', stats);
//     res.status(200).json({ success: true, data: stats });
//   } catch (err) {
//     console.error('Error fetching stats:', err);
//     res.status(500).json({ success: false, message: 'Internal server error' });
//   }
// };

import { Request, Response } from 'express';
import { fetchManagerStats } from '../services/stats.service';

// This controller handles fetching support manager statistics
export const getSupportManagerStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const managerId = req.query.managerId as string;
    console.log('managerId received:', managerId);

    const stats = await fetchManagerStats(managerId);

    if (!stats) {
      console.log('No stats found for:', managerId);
      res.status(404).json({ success: false, message: 'Stats not found for this manager' });
      return;
    }

    console.log('Stats found:', stats);
    res.status(200).json({ success: true, data: stats });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};