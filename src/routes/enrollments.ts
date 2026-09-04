import express from 'express';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { classes, enrollments, registrationCodes } from '../db/schema/index.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const { classId: classIdRaw, studentId } = req.body as {
      classId?: number;
      studentId?: string;
    };

    if (typeof classIdRaw !== 'number' || !Number.isInteger(classIdRaw) || classIdRaw <= 0) {
      return res.status(400).json({ error: 'Invalid class id' });
    }

    const classId = classIdRaw;

    if (!studentId) {
      return res.status(400).json({ error: 'Student id is required' });
    }

    const [classRow] = await db
      .select({ id: classes.id, capacity: classes.capacity })
      .from(classes)
      .where(eq(classes.id, classId));

    if (!classRow) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const existingEnrollment = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(and(eq(enrollments.classId, classId), eq(enrollments.studentId, studentId)));

    if (existingEnrollment.length > 0) {
      return res.status(409).json({ error: 'Student is already enrolled in this class' });
    }

    const enrolledCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(enrollments)
      .where(eq(enrollments.classId, classId));

    if ((enrolledCount[0]?.count ?? 0) >= classRow.capacity) {
      return res.status(409).json({ error: 'Class capacity reached' });
    }

    const [createdEnrollment] = await db
      .insert(enrollments)
      .values({ classId, studentId })
      .returning({ id: enrollments.id, classId: enrollments.classId, studentId: enrollments.studentId });

    res.status(201).json({ data: createdEnrollment });
  } catch (error) {
    console.error('POST /enrollments error:', error);
    res.status(500).json({ error: 'Failed to enroll student' });
  }
});

router.post('/join', requireRole('student'), async (req, res) => {
  try {
    const studentId = req.user?.id;
    const { inviteCode } = req.body as { inviteCode?: string };

    if (!studentId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!inviteCode) {
      return res.status(400).json({ error: 'Invite code is required' });
    }

    const [codeRow] = await db
      .select({
        id: registrationCodes.id,
        code: registrationCodes.code,
        classId: registrationCodes.classId,
        teacherId: registrationCodes.teacherId,
        subjectId: registrationCodes.subjectId,
        expiresAt: registrationCodes.expiresAt,
        usageLimit: registrationCodes.usageLimit,
        usesCount: registrationCodes.usesCount,
        active: registrationCodes.active,
      })
      .from(registrationCodes)
      .where(eq(registrationCodes.code, inviteCode));

    if (!codeRow || !codeRow.active) {
      return res.status(404).json({ error: 'Invalid registration code' });
    }

    if (codeRow.expiresAt && new Date() > codeRow.expiresAt) {
      return res.status(410).json({ error: 'Registration code has expired' });
    }

    if (codeRow.usageLimit !== null && codeRow.usesCount >= codeRow.usageLimit) {
      return res.status(410).json({ error: 'Registration code has already been used' });
    }

    const [classRow] = await db
      .select({ id: classes.id, capacity: classes.capacity })
      .from(classes)
      .where(eq(classes.id, codeRow.classId));

    if (!classRow) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const existingEnrollment = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(and(eq(enrollments.classId, codeRow.classId), eq(enrollments.studentId, studentId)));

    if (existingEnrollment.length > 0) {
      return res.status(409).json({ error: 'You are already enrolled in this class' });
    }

    const enrolledCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(enrollments)
      .where(eq(enrollments.classId, codeRow.classId));

    if ((enrolledCount[0]?.count ?? 0) >= classRow.capacity) {
      return res.status(409).json({ error: 'Class capacity reached' });
    }

    const [createdEnrollment] = await db
      .insert(enrollments)
      .values({ classId: codeRow.classId, studentId: studentId ?? '' })
      .returning({ id: enrollments.id, classId: enrollments.classId, studentId: enrollments.studentId });

    await db
      .update(registrationCodes)
      .set({
        usesCount: sql<number>`${registrationCodes.usesCount} + 1`,
        active:
          codeRow.usageLimit !== null && codeRow.usesCount + 1 >= codeRow.usageLimit
            ? false
            : true,
      })
      .where(eq(registrationCodes.id, codeRow.id));

    res.status(201).json({ data: createdEnrollment });
  } catch (error) {
    console.error('POST /enrollments/join error:', error);
    res.status(500).json({ error: 'Failed to join class with code' });
  }
});

router.delete('/:classId/:studentId', requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const classId = Number(req.params.classId);
    const studentId = String(req.params.studentId);

    if (!Number.isInteger(classId) || classId <= 0) {
      return res.status(400).json({ error: 'Invalid class id' });
    }

    if (!studentId) {
      return res.status(400).json({ error: 'Student id is required' });
    }

    const [classRow] = await db
      .select({ teacherId: classes.teacherId })
      .from(classes)
      .where(eq(classes.id, classId));

    if (!classRow) {
      return res.status(404).json({ error: 'Class not found' });
    }

    if (req.user?.role === 'teacher' && classRow.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to modify this class roster' });
    }

    await db
      .delete(enrollments)
      .where(and(eq(enrollments.classId, classId), eq(enrollments.studentId, studentId)));

    res.status(200).json({ data: { success: true } });
  } catch (error) {
    console.error('DELETE /enrollments/:classId/:studentId error:', error);
    res.status(500).json({ error: 'Failed to remove enrollment' });
  }
});

export default router;
