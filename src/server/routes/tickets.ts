import { Router } from 'express';
import { db } from '../db.ts';
import { authenticateUser } from '../auth.ts';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.get('/', authenticateUser, (req: any, res) => {
  const user = req.user;
  const tickets = (db.supportTickets || [])
    .filter((t: any) => t.userId === user.id)
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ tickets });
});

router.post('/', authenticateUser, (req: any, res) => {
  const user = req.user;
  const { subject, message, priority } = req.body;
  if (!subject || !message) {
    return res.status(400).json({ error: 'Subject and message are required.' });
  }

  const newTicket = {
    id: uuidv4(),
    userId: user.id,
    userEmail: user.email,
    userName: user.fullName,
    subject,
    message,
    status: 'OPEN',
    priority: priority || 'MEDIUM',
    replies: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.mutate((d: any) => {
    if (!d.supportTickets) d.supportTickets = [];
    d.supportTickets.push(newTicket);
  });

  res.status(201).json({ message: 'Support ticket created successfully.', ticket: newTicket });
});

export default router;
