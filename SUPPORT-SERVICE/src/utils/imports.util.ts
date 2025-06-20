import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import { default as supportRoutes } from '@routes/v1/index';
import SupportTicket from '../models/supportTicket.model';
import TicketCategory from '../models/TicketCategory.model';
import TicketPriority from '../models/TicketPriority.model';
import TicketStatus from '../models/TicketStatus.model'
import { createSupportTicket } from '../repository/supportTicket.repository';
import { uploadFile } from '../middleware/upload';
import { generateUniqueTicketId } from '@utils/generateTicketId';
import SupportManagerStats from '@models/SupportManagerStats.model';
import { fetchLoggedInUser } from '../services/authService';
import axios from 'axios';
import { config } from '@config/server.config';
import SupportTicketModel from '../models/supportTicket.model';
import { fetchTickets } from '../services/ticketService';
import { fetchSupportManagers } from '@services/authService';
import { fetchManagerStats } from '@services/statsService';
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
  generateUniqueTicketId,
  SupportManagerStats,
  fetchLoggedInUser,
  axios,
  config,
  SupportTicketModel,
  fetchTickets,
  fetchManagerStats,
  fetchSupportManagers
};
