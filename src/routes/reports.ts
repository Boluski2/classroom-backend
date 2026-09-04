import express from 'express';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { classes, reports, subjects, user } from '../db/schema/index.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const filter = req.user?.role === 'teacher'
      ? eq(reports.teacherId, req.user.id)
      : undefined;

    const reportRows = await db
      .select({
        id: reports.id,
        teacherId: reports.teacherId,
        studentId: reports.studentId,
        classId: reports.classId,
        title: reports.title,
        content: reports.content,
        type: reports.type,
        status: reports.status,
        submittedAt: reports.submittedAt,
        reviewedAt: reports.reviewedAt,
        createdAt: reports.createdAt,
        updatedAt: reports.updatedAt,
        teacher: { id: user.id, name: user.name, email: user.email },
        class: { id: classes.id, name: classes.name },
        subject: { id: subjects.id, name: subjects.name },
      })
      .from(reports)
      .leftJoin(user, eq(reports.teacherId, user.id))
      .leftJoin(classes, eq(reports.classId, classes.id))
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .where(filter)
      .orderBy(desc(reports.createdAt));

    return res.status(200).json({ data: reportRows });
  } catch (error) {
    console.error('GET /reports error:', error);
    return res.status(500).json({ error: 'Failed to load reports' });
  }
});

router.post('/', requireRole('teacher'), async (req, res) => {
  try {
    const { studentId, classId, title, content, type = 'performance' } = req.body as {
      studentId?: string;
      classId?: number;
      title?: string;
      content?: string;
      type?: 'performance' | 'incident' | 'progress';
    };

    if (!studentId || !classId || !title || !content) {
      return res.status(400).json({ error: 'Student, class, title, and content are required' });
    }

    const [classRow] = await db
      .select({ teacherId: classes.teacherId })
      .from(classes)
      .where(eq(classes.id, classId));

    if (!classRow) {
      return res.status(404).json({ error: 'Class not found' });
    }

    if (classRow.teacherId !== req.user?.id) {
      return res.status(403).json({ error: 'You can only create reports for your classes' });
    }

    const [createdReport] = await db
      .insert(reports)
      .values({
        teacherId: req.user.id,
        studentId,
        classId,
        title,
        content,
        type,
        status: 'submitted',
        submittedAt: new Date(),
      })
      .returning();

    return res.status(201).json({ data: createdReport });
  } catch (error) {
    console.error('POST /reports error:', error);
    return res.status(500).json({ error: 'Failed to create report' });
  }
});

export default router;
