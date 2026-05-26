import express from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { classes, subjects, user } from '../db/schema/index.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { subjectId, teacherId } = req.body as {
      subjectId?: number;
      teacherId?: string;
    };

    if (!subjectId) {
      return res.status(400).json({ error: 'Subject is required' });
    }

    if (!teacherId) {
      return res.status(400).json({ error: 'Teacher is required' });
    }

    const [subject] = await db
      .select({ id: subjects.id })
      .from(subjects)
      .where(eq(subjects.id, Number(subjectId)));

    if (!subject) {
      return res.status(400).json({ error: 'Subject not found' });
    }

    const [teacher] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, teacherId));

    if (!teacher) {
      return res.status(400).json({ error: 'Teacher not found' });
    }

    const [createdClass] = await db
      .insert(classes)
      .values({
        ...req.body,
        inviteCode: Math.random().toString(36).substring(2, 9),
      })
      .returning({ id: classes.id });

    if (!createdClass) {
      throw new Error('Failed to create class');
    }

    return res.status(201).json({ data: createdClass });
  } catch (e) {
    console.error(`Post /classes error: ${e}`);
    res.status(500).json({ error: 'Failed to Create Class' });
  }
});

export default router;