import express from 'express';
import crypto from 'crypto';
import { and, desc, eq, getTableColumns } from 'drizzle-orm';
import { db } from '../db/index.js';
import { classes, registrationCodes, subjects } from '../db/schema/index.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

const generateCode = () => {
  return crypto.randomBytes(6).toString('base64url').slice(0, 8);
};

router.get('/', requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const queryTeacherId = req.query.teacherId as string | undefined;
    const teacherId = req.user?.role === 'teacher' ? req.user.id : queryTeacherId;

    const filter = teacherId ? eq(registrationCodes.teacherId, teacherId) : undefined;

    const codes = await db
      .select({
        ...getTableColumns(registrationCodes),
        class: {
          id: classes.id,
          name: classes.name,
        },
        subject: {
          id: subjects.id,
          name: subjects.name,
        },
      })
      .from(registrationCodes)
      .leftJoin(classes, eq(registrationCodes.classId, classes.id))
      .leftJoin(subjects, eq(registrationCodes.subjectId, subjects.id))
      .where(filter)
      .orderBy(desc(registrationCodes.createdAt));

    res.status(200).json({ data: codes });
  } catch (error) {
    console.error('GET /registration-codes error:', error);
    res.status(500).json({ error: 'Failed to load registration codes' });
  }
});

router.post('/', requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const teacherId = req.user?.id;
    const { classId, code, expiresAt, usageLimit } = req.body as {
      classId?: number;
      code?: string;
      expiresAt?: string;
      usageLimit?: number;
    };

    if (!classId || !Number.isInteger(classId) || classId <= 0) {
      return res.status(400).json({ error: 'Class id is required' });
    }

    const [classRow] = await db
      .select({ subjectId: classes.subjectId, teacherId: classes.teacherId })
      .from(classes)
      .where(eq(classes.id, classId));

    if (!classRow) {
      return res.status(404).json({ error: 'Class not found' });
    }

    if (req.user?.role === 'teacher' && classRow.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Not authorized to create registration codes for this class' });
    }

    const generatedCode = code?.trim() || generateCode();

    const [createdCode] = await db
      .insert(registrationCodes)
      .values({
        classId,
        teacherId: classRow.teacherId,
        subjectId: classRow.subjectId,
        code: generatedCode,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        usageLimit: usageLimit ?? null,
        active: true,
      })
      .returning({
        ...getTableColumns(registrationCodes),
      });

    res.status(201).json({ data: createdCode });
  } catch (error) {
    console.error('POST /registration-codes error:', error);
    res.status(500).json({ error: 'Failed to create registration code' });
  }
});

export default router;
