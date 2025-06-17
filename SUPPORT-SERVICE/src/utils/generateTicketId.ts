import SupportTicket from '@models/supportTicket.model';

function generateRandomAlphanumeric(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const nums = '0123456789';
  let letters = '';
  let digits = '';

  for (let i = 0; i < 3; i++) {
    letters += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  for (let i = 0; i < 4; i++) {
    digits += nums.charAt(Math.floor(Math.random() * nums.length));
  }

  return `#${letters}-${digits}`;
}
export async function generateUniqueTicketId(): Promise<string> {
  let ticketId = '';
  let exists = true;

  while (exists) {
    ticketId = generateRandomAlphanumeric();
    exists = !!(await SupportTicket.exists({ ticketId }));
  }

  return ticketId;
}
