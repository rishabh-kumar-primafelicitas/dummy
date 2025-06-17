import { Router } from "express";
import { getSupportManagers } from '@controllers/supportManager.controller';
import {
  getTickets,
  getTicketsAssignedToManager,
  getTicketById,
  updateTicket,
  deleteTicket,
  generateTicket,
  respondToTicket,
  getTicketsByAssignedManager,
  getUserTickets
} from '@controllers/support.controller';
import {getSupportManagerStats} from '@controllers/supportManagerStats.controller'
const router = Router();

// Ticket routes
router.post('/ticket', generateTicket);                         // POST /api/v1/support/generateTicket
router.get('/tickets', getTickets);                                  // GET /api/v1/support/getTickets
router.get('/ticketsAssignedToManager', getTicketsAssignedToManager);                                  // GET /api/v1/support/getTickets
router.get('/ticket/:id', getTicketById);                            // GET /api/v1/support/getTicket/:id
router.put('/updateTicket/:id', updateTicket);                          // PUT /api/v1/support/updateTicket/:id
router.delete('/delete/:id', deleteTicket);                              // DELETE /api/v1/support/delete/:id
router.get('/assigned/:managerId', getTicketsByAssignedManager);
router.get('/tickets/by-user', getUserTickets); 

// Response to ticket
router.post('/respondToTicket', respondToTicket);


// Auth routes
router.get('/supportManagers', getSupportManagers);

// support manager route
router.get('/stats/manager', getSupportManagerStats);
// router.get('/stats/manager', (req, res) => {
//   console.log('🔥 /stats/manager route hit');
//   res.json({ msg: 'stats working' });
// });


export default router;