import axios from 'axios';
import SupportManagerStats from '@models/SupportManagerStats.model';
import mongoose from 'mongoose';


const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL;

export const seedSupportManagerStats = async (managers: any[]) => {
  for (const manager of managers) {
    const { _id, username } = manager;

    // Check if already exists
    const existing = await SupportManagerStats.findOne({ managerId: _id });

    if (existing) {
      console.log(`Stats already exist for manager ${username}`);
      continue;
    }

    // Create new record
    await SupportManagerStats.create({
      managerId: _id,
      managerName: username, // from your response
      assignedTickets: 0,
      closedTickets: 0,
      openTickets: 0,
    });

    console.log(`Stats created for manager ${username}`);
  }
};

export const fetchSupportManagers = async (accessToken: string, page : number, limit:number, search:string) => {
  try {
    const response = await axios.get(`${AUTH_SERVICE_URL}/api/v1/support-managers?page=${page}&limit=${limit}&search=${search}`, {
      headers: {
        Authorization: accessToken,
      },
    });

    const managers = response.data?.data || [];

    // Save or update stats in DB for each manager
    for (const manager of managers) {
      const { _id, username } = manager;

      // Validate if it's a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(_id)) continue;

      // Check if stats already exist
      const existingStats = await SupportManagerStats.findOne({ managerId: _id });
      if (!existingStats) {
        await SupportManagerStats.create({
          managerId: _id,
          managerName: username,
          assignedTickets: 0,
          closedTickets: 0,
          openTickets: 0,
        });
        console.log(`[Stats Created] managerName: ${username}, managerId: ${_id}`);
      }
    }

    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error('[fetchSupportManagers] Axios error:', error.response?.data);
      if (error.response?.status === 401) {
        throw new Error('Token expired or unauthorized');
      }
      throw new Error(error.response?.data?.message || 'Failed to fetch support managers');
    }

    throw new Error('Unexpected error in fetchSupportManagers');
  }
};

export const fetchLoggedInUser = async (userId: string) => {
  try {
    const url = `${AUTH_SERVICE_URL}/api/v1/public/me`;
    console.log('[fetchLoggedInUser] Making request to:', url);

    const response = await axios.get(url, {
      headers: {
        userId: userId, 
      },
    });

    console.log('[fetchLoggedInUser] Response data:', response.data);

    if (response.data?.status && response.data?.data?.user) {
      return response.data.data.user;
    } else {
      throw new Error('User data missing in response');
    }
  } catch (err: any) {
    console.error('[fetchLoggedInUser] Axios error:', err.message);
    throw new Error('Failed to fetch user');
  }
};
