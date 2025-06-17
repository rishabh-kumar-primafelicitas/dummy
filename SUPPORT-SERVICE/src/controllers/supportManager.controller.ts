import { Request, Response } from 'express';
import { fetchSupportManagers } from '../services/authService';
import axios from 'axios'; 
export const getSupportManagers = async (req: Request, res: Response) => {
  const token = req.headers.authorization;

  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
  const search = req.query.search ? (req.query.search as string) : '';

//   console.log('[getSupportManagers] Received token:', token); //  Debug token

  if (!token) {
    // console.warn('[getSupportManagers] No token provided'); // Warn if token missing
    res.status(401).json({ message: 'No token provided' });
    return;
  }

  try {
    const managers = await fetchSupportManagers(token, page, limit, search);
    // console.log('[getSupportManagers] Managers fetched successfully:', managers?.length); //  Count of users
    res.status(200).json(managers);
    return;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
    //   console.error('[getSupportManagers] Axios error response:', error.response?.data); //  Axios error
      res.status(error.response?.status || 500).json({
        message: error.response?.data?.message || 'Error fetching support managers',
      });
      return;
    }

    // fallback for non-Axios errors
    console.error('[getSupportManagers] Unexpected error:', error); //  Unexpected error
    res.status(500).json({ message: 'Internal Server Error' });
    return;
  }
};