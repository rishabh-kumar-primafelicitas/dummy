import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import { default as supportRoutes } from '@routes/v1/index';
import SupportTicket from '../models/supportTicket.model';
import TicketCategory from '../models/TicketCategory.supportTicket.model';
import TicketPriority from '../models/TicketPriority.supportTicket.model';
import TicketStatus from '../models/TicketStatus.supportTicket.model'
import { createSupportTicket } from '../repository/supportTicket.repository';
import { uploadFile } from '../middleware/upload';
import {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  updateTicketStatus,
  deleteTicket,
} from '../controllers/support.controller';

export {
  express,
  SupportTicket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  dotenv,
  mongoose,
  cors,
  supportRoutes,
  createSupportTicket,
  Request,
  Response,
  uploadFile,
  bodyParser,
  jwt,
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  updateTicketStatus,
  deleteTicket,
};
