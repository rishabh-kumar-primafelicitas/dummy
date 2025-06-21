// import { getDatabases } from '../config/mongoClient';
// import { ObjectId } from 'mongodb';

// export const searchSupportTickets = async (searchTerm: string, page = 1, limit = 10) => {
//   const { db1, db2 } = await getDatabases();
//   const ticketCollection = db1.collection('support_tickets');
//   const userCollection = db2.collection('users');

//   const matchQuery: any = {};

//   if (searchTerm) {
//     const matchedUsers = await userCollection.find({
//       $or: [
//         { username: { $regex: searchTerm, $options: 'i' } },
//         { email: { $regex: searchTerm, $options: 'i' } }
//       ]
//     }).project({ _id: 1 }).toArray();

//     const matchedUserIds = matchedUsers.map(user => user._id);

//     matchQuery.$or = [
//       { ticketId: { $regex: searchTerm, $options: 'i' } },
//       { subject: { $regex: searchTerm, $options: 'i' } },
//       { description: { $regex: searchTerm, $options: 'i' } }
//     ];

//     if (matchedUserIds.length > 0) {
//       matchQuery.$or.push(
//         { createdBy: { $in: matchedUserIds } },
//         { assignedTo: { $in: matchedUserIds } }
//       );
//     }
//   }

//   const aggregation: any[] = [];

//   if (searchTerm) {
//     aggregation.push({ $match: matchQuery });
//   }

//   aggregation.push(
//     {
//       $lookup: {
//         from: 'ticket_statuses',
//         localField: 'status',
//         foreignField: '_id',
//         as: 'statusData'
//       }
//     },
//     {
//       $lookup: {
//         from: 'ticket_priorities',
//         localField: 'priority',
//         foreignField: '_id',
//         as: 'priorityData'
//       }
//     },
//     {
//       $lookup: {
//         from: 'ticket_categories',
//         localField: 'category',
//         foreignField: '_id',
//         as: 'categoryData'
//       }
//     },
//     {
//       $addFields: {
//         status: { $arrayElemAt: ['$statusData', 0] },
//         priority: { $arrayElemAt: ['$priorityData', 0] },
//         category: { $arrayElemAt: ['$categoryData', 0] }
//       }
//     },
//     {
//       $project: {
//         statusData: 0,
//         priorityData: 0,
//         categoryData: 0
//       }
//     },
//     { $sort: { createdAt: -1 } },
//     { $skip: (page - 1) * limit },
//     { $limit: limit }
//   );

//   const tickets = await ticketCollection.aggregate(aggregation).toArray();

//   const userIdsToResolve = new Set<string>();
//   for (const ticket of tickets) {
//     if (ticket.createdBy) userIdsToResolve.add(ticket.createdBy.toString());
//     if (ticket.assignedTo) userIdsToResolve.add(ticket.assignedTo.toString());
//   }

//   const userIdList = Array.from(userIdsToResolve).map(id => new ObjectId(id));
//   const userDocs = await userCollection.find({ _id: { $in: userIdList } }).toArray();

//   const userIdMap = new Map<string, string>();
//   userDocs.forEach(user => userIdMap.set(user._id.toString(), user.username));

//   const enrichedTickets = tickets.map(ticket => {
//     const createdById = ticket.createdBy?.toString();
//     const assignedToId = ticket.assignedTo?.toString();

//     return {
//       ...ticket,
//       createdBy: createdById
//         ? { _id: createdById, username: userIdMap.get(createdById) || null }
//         : null,
//       assignedTo: assignedToId
//         ? { _id: assignedToId, username: userIdMap.get(assignedToId) || null }
//         : null
//     };
//   });

//   const total = searchTerm
//     ? await ticketCollection.countDocuments(matchQuery)
//     : await ticketCollection.estimatedDocumentCount();

//   const totalPages = Math.ceil(total / limit);

//   return {
//     total,
//     tickets: enrichedTickets,
//     pagination: {
//       total,
//       page,
//       limit: limit,
//       pages: totalPages
//     }
//   };
// };


import { getDatabases } from '../config/mongoClient';
import { ObjectId } from 'mongodb';

interface SearchTicketOptions {
  searchTerm?: string;
  page?: number;
  limit?: number;
  status?: string;
  assignedTo?: string;
  startDate?: string;
  endDate?: string;
}

export const searchSupportTickets = async ({
  searchTerm = '',
  page = 1,
  limit = 10,
  status,
  assignedTo,
  startDate,
  endDate
}: SearchTicketOptions) => {
  const { db1, db2 } = await getDatabases();
  const ticketCollection = db1.collection('support_tickets');
  const userCollection = db2.collection('users');

  const matchQuery: any = {};
  const searchOr: any[] = [];

  // 🔍 Text search filters
  if (searchTerm) {
    searchOr.push(
      { ticketId: { $regex: searchTerm, $options: 'i' } },
      { subject: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } }
    );

    const matchedUsers = await userCollection.find({
      $or: [
        { username: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } }
      ]
    }).project({ _id: 1 }).toArray();

    const matchedUserIds = matchedUsers.map(u => u._id);
    if (matchedUserIds.length) {
      searchOr.push(
        { createdBy: { $in: matchedUserIds } },
        { assignedTo: { $in: matchedUserIds } }
      );
    }

    if (searchOr.length) {
      matchQuery.$or = searchOr;
    }
  }

  // AssignedTo filter
  if (assignedTo) {
    matchQuery.assignedTo = new ObjectId(assignedTo);
  }

  // Status filter
  if (status) {
    matchQuery.status = new ObjectId(status);
  }

  // Date range filter
  if (startDate || endDate) {
    matchQuery.createdAt = {};
    if (startDate) {
      matchQuery.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      matchQuery.createdAt.$lte = new Date(endDate);
    }
  }

  const aggregation = [
    { $match: matchQuery },
    {
      $lookup: {
        from: 'ticket_status',
        localField: 'status',
        foreignField: '_id',
        as: 'statusData'
      }
    },
    {
      $lookup: {
        from: 'ticket_priorities',
        localField: 'priority',
        foreignField: '_id',
        as: 'priorityData'
      }
    },
    {
      $lookup: {
        from: 'ticket_categories',
        localField: 'category',
        foreignField: '_id',
        as: 'categoryData'
      }
    },
    {
      $addFields: {
        status: {
          $ifNull: [{ $arrayElemAt: ['$statusData', 0] }, null]
        },
        priority: {
          $ifNull: [{ $arrayElemAt: ['$priorityData', 0] }, null]
        },
        category: {
          $ifNull: [{ $arrayElemAt: ['$categoryData', 0] }, null]
        }
      }
    },
    {
      $project: {
        statusData: 0,
        priorityData: 0,
        categoryData: 0
      }
    },
    { $sort: { createdAt: -1 } },
    { $skip: (page - 1) * limit },
    { $limit: limit }
  ];

  const tickets = await ticketCollection.aggregate(aggregation).toArray();

  // Resolve usernames for createdBy and assignedTo
  const userIds = new Set<string>();
  for (const t of tickets) {
    if (t.createdBy) userIds.add(t.createdBy.toString());
    if (t.assignedTo) userIds.add(t.assignedTo.toString());
  }

  const userDocs = await userCollection.find({
    _id: { $in: Array.from(userIds).map(id => new ObjectId(id)) }
  }).toArray();

  const userMap = new Map(userDocs.map(u => [u._id.toString(), u.username]));

  const enriched = tickets.map(t => ({
    ...t,
    createdBy: t.createdBy ? { _id: t.createdBy, username: userMap.get(t.createdBy.toString()) || null } : null,
    assignedTo: t.assignedTo ? { _id: t.assignedTo, username: userMap.get(t.assignedTo.toString()) || null } : null
  }));

  const total = await ticketCollection.countDocuments(matchQuery);
  const totalPages = Math.ceil(total / limit);

  return {
    tickets: enriched,
    pagination: {
      total,
      page,
      limit,
      pages: totalPages
    }
  };
};
