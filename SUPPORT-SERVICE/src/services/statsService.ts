import mongoose from 'mongoose';
import SupportManagerStats from '@models/SupportManagerStats.model';

// fetch support manager stats
export const fetchManagerStats = async (managerId: string) => {
    if (!managerId) throw new Error('Missing managerId');

    let stats = null;

    if (mongoose.Types.ObjectId.isValid(managerId)) {
        stats = await SupportManagerStats.findOne({ managerId: new mongoose.Types.ObjectId(managerId) });
    }

    if (!stats) {
        stats = await SupportManagerStats.findOne({ managerId });
    }

    return stats;
};