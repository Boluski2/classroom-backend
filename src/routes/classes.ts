import express from 'express';
import { and, desc, eq, getTableColumns, ilike, or, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { classes, departments, enrollments, subjects, user } from '../db/schema/index.js';

const router = express.Router();

// Get all classes with optional search, subject, teacher filters, and pagination
router.get('/', async (req, res) => {
  try {
    const { search, subject, teacher, page = 1, limit = 10 } = req.query;

    const currentPage = Math.max(1, Number(page) || 1);
    const limitPage = Math.max(1, Math.min(Number(limit) || 10, 100));
    const offset = (currentPage - 1) * limitPage;

    const filterConditions = [];

    if (search) {
      filterConditions.push(
        or(
          ilike(classes.name, `%${search}%`),
          ilike(classes.inviteCode, `%${search}%`)
        )
      );
    }

    if (subject) {
      filterConditions.push(ilike(subjects.name, `%${subject}%`));
    }

    if (teacher) {
      filterConditions.push(ilike(user.name, `%${teacher}%`));
    }

    const whereClause =
      filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(classes)
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .leftJoin(user, eq(classes.teacherId, user.id))
      .where(whereClause);

    const totalItems = countResult[0]?.count ?? 0;

    const classesList = await db
      .select({
        ...getTableColumns(classes),
        subject: { ...getTableColumns(subjects) },
        teacher: { ...getTableColumns(user) },
      })
      .from(classes)
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .leftJoin(user, eq(classes.teacherId, user.id))
      .where(whereClause)
      .orderBy(desc(classes.createdAt))
      .limit(limitPage)
      .offset(offset);

    res.status(200).json({
      data: classesList,
      pagination: {
        page: currentPage,
        limit: limitPage,
        total: totalItems,
        totalPages: Math.ceil(totalItems / limitPage),
      },
    });
  } catch (e) {
    console.error(`Get /classes error: ${e}`);
    res.status(500).json({ error: 'Failed to Get Classes' });
  }
});

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
        inviteCode: req.body.inviteCode ?? Math.random().toString(36).substring(2, 9),
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



// Get class details with counts
router.get('/:id', async (req, res) => {
  try {
    const classId = Number(req.params.id);

    if (!Number.isFinite(classId) || classId <= 0 || !Number.isInteger(classId)) {
      return res.status(400).json({ error: 'Invalid class id' });
    }
    const [classDetails] = await db
      .select({
        ...getTableColumns(classes),
        subject: {
          ...getTableColumns(subjects),
        },
        department: {
          ...getTableColumns(departments),
        },
        teacher: {
          ...getTableColumns(user),
        },
      })
      .from(classes)
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .leftJoin(user, eq(classes.teacherId, user.id))
      .where(eq(classes.id, classId));

    if (!classDetails) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.status(200).json({ data: classDetails });
  } catch (error) {
    console.error('GET /classes/:id error:', error);
    res.status(500).json({ error: 'Failed to fetch class details' });
  }
});

router.get('/:id/users', async (req, res) => {
  try {
    const classId = Number(req.params.id);

    if (!Number.isInteger(classId) || classId <= 0) {
      return res.status(400).json({ error: 'Invalid class id' });
    }

    const { page = 1, limit = 10, role } = req.query;
    const currentPage = Math.max(1, Number(page) || 1);
    const limitPage = Math.max(1, Math.min(Number(limit) || 10, 100));
    const offset = (currentPage - 1) * limitPage;

    const filterConditions = [eq(enrollments.classId, classId)];

    if (role) {
      filterConditions.push(eq(user.role, role as 'student' | 'teacher' | 'admin'));
    }

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(enrollments)
      .leftJoin(user, eq(enrollments.studentId, user.id))
      .where(and(...filterConditions));

    const enrolledUsers = await db
      .select({
        ...getTableColumns(user),
      })
      .from(enrollments)
      .leftJoin(user, eq(enrollments.studentId, user.id))
      .where(and(...filterConditions))
      .orderBy(desc(enrollments.createdAt))
      .limit(limitPage)
      .offset(offset);

    res.status(200).json({
      data: enrolledUsers.filter((entry) => entry.id),
      pagination: {
        page: currentPage,
        limit: limitPage,
        total: countResult[0]?.count ?? 0,
        totalPages: Math.ceil((countResult[0]?.count ?? 0) / limitPage),
      },
    });
  } catch (error) {
    console.error('GET /classes/:id/users error:', error);
    res.status(500).json({ error: 'Failed to fetch class users' });
  }
});

router.post('/:id/enroll', async (req, res) => {
  try {
    const classId = Number(req.params.id);
    const { studentId } = req.body as { studentId?: string };

    if (!Number.isInteger(classId) || classId <= 0) {
      return res.status(400).json({ error: 'Invalid class id' });
    }

    if (!studentId) {
      return res.status(400).json({ error: 'Student id is required' });
    }

    const [classRow] = await db.select({ id: classes.id, capacity: classes.capacity }).from(classes).where(eq(classes.id, classId));

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
    console.error('POST /classes/:id/enroll error:', error);
    res.status(500).json({ error: 'Failed to enroll student' });
  }
});

router.delete('/:id/enroll/:studentId', async (req, res) => {
  try {
    const classId = Number(req.params.id);
    const studentId = req.params.studentId;

    if (!Number.isInteger(classId) || classId <= 0) {
      return res.status(400).json({ error: 'Invalid class id' });
    }

    if (!studentId) {
      return res.status(400).json({ error: 'Student id is required' });
    }

    await db
      .delete(enrollments)
      .where(and(eq(enrollments.classId, classId), eq(enrollments.studentId, studentId)));

    res.status(200).json({ data: { success: true } });
  } catch (error) {
    console.error('DELETE /classes/:id/enroll/:studentId error:', error);
    res.status(500).json({ error: 'Failed to remove enrollment' });
  }
});

export default router;