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
router.post('/ticket', generateTicket);                         
router.get('/tickets', getTickets);                                  
// router.get('/ticketsAssignedToManager', getTicketsAssignedToManager);                                
router.get('/ticket/:id', getTicketById);                           
router.put('/updateTicket/:id', updateTicket);                         
router.delete('/delete/:id', deleteTicket);                              
router.get('/assigned/:managerId', getTicketsByAssignedManager);
router.get('/tickets/by-user', getUserTickets); 
router.post('/respondToTicket', respondToTicket);

// Support manager routes
router.get('/supportManagers', getSupportManagers);
router.get('/stats/manager', getSupportManagerStats);


export default router;