import express from 'express';
import { and, desc, eq, getTableColumns, ilike, or, sql } from 'drizzle-orm';
import { classes, departments, enrollments, subjects, user } from '../db/schema/index.js';
import { db } from '../db/index.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { search, department, page = 1, limit = 10 } = req.query;
    const currentPage = Math.max(1, Number(page) || 1);
    const limitPage = Math.max(1, Math.min(Number(limit) || 10, 100));
    const offset = (currentPage - 1) * limitPage;

    const filterConditions = [] as Array<ReturnType<typeof ilike> | ReturnType<typeof eq> | ReturnType<typeof or>>;

    if (search) {
      filterConditions.push(
        or(
          ilike(subjects.name, `%${String(search)}%`),
          ilike(subjects.code, `%${String(search)}%`)
        )
      );
    }

    if (department) {
      filterConditions.push(ilike(departments.name, `%${String(department)}%`));
    }

    const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(subjects)
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .where(whereClause);

    const totalItems = countResult[0]?.count ?? 0;

    const subjectsList = await db
      .select({
        ...getTableColumns(subjects),
        department: { ...getTableColumns(departments) },
      })
      .from(subjects)
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .where(whereClause)
      .orderBy(desc(subjects.createdAt))
      .limit(limitPage)
      .offset(offset);

    res.status(200).json({
      data: subjectsList,
      pagination: {
        page: currentPage,
        limit: limitPage,
        total: totalItems,
        totalPages: Math.ceil(totalItems / limitPage),
      },
    });
  } catch (e) {
    console.error('Get /subjects error:', e);
    res.status(500).json({ error: 'Failed to get subjects' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { departmentId, name, code, description } = req.body as {
      departmentId?: number;
      name?: string;
      code?: string;
      description?: string;
    };

    if (!departmentId || !name || !code) {
      return res.status(400).json({ error: 'Department, name and code are required' });
    }

    const [createdSubject] = await db
      .insert(subjects)
      .values({ departmentId, name, code, description: description ?? null })
      .returning({ id: subjects.id, name: subjects.name, code: subjects.code });

    res.status(201).json({ data: createdSubject });
  } catch (error) {
    console.error('POST /subjects error:', error);
    res.status(500).json({ error: 'Failed to create subject' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const subjectId = Number(req.params.id);

    if (!Number.isInteger(subjectId) || subjectId <= 0) {
      return res.status(400).json({ error: 'Invalid subject id' });
    }

    const [subjectRow] = await db
      .select({
        ...getTableColumns(subjects),
        department: { ...getTableColumns(departments) },
      })
      .from(subjects)
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .where(eq(subjects.id, subjectId));

    if (!subjectRow) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    const classesCount = await db.select({ count: sql<number>`count(*)` }).from(classes).where(eq(classes.subjectId, subjectId));

    res.status(200).json({
      data: {
        subject: subjectRow,
        totals: {
          classes: classesCount[0]?.count ?? 0,
        },
      },
    });
  } catch (error) {
    console.error('GET /subjects/:id error:', error);
    res.status(500).json({ error: 'Failed to get subject details' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const subjectId = Number(req.params.id);
    const { departmentId, name, code, description } = req.body as {
      departmentId?: number;
      name?: string;
      code?: string;
      description?: string;
    };

    const [updatedSubject] = await db
      .update(subjects)
      .set({ departmentId, name, code, description: description ?? null })
      .where(eq(subjects.id, subjectId))
      .returning({ id: subjects.id, name: subjects.name, code: subjects.code });

    if (!updatedSubject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.status(200).json({ data: updatedSubject });
  } catch (error) {
    console.error('PUT /subjects/:id error:', error);
    res.status(500).json({ error: 'Failed to update subject' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const subjectId = Number(req.params.id);
    await db.delete(subjects).where(eq(subjects.id, subjectId));
    res.status(200).json({ data: { success: true } });
  } catch (error) {
    console.error('DELETE /subjects/:id error:', error);
    res.status(500).json({ error: 'Failed to delete subject' });
  }
});

router.get('/:id/classes', async (req, res) => {
  try {
    const subjectId = Number(req.params.id);
    const classesList = await db
      .select({
        ...getTableColumns(classes),
        teacher: { ...getTableColumns(user) },
      })
      .from(classes)
      .leftJoin(user, eq(classes.teacherId, user.id))
      .where(eq(classes.subjectId, subjectId))
      .orderBy(desc(classes.createdAt));

    res.status(200).json({ data: classesList });
  } catch (error) {
    console.error('GET /subjects/:id/classes error:', error);
    res.status(500).json({ error: 'Failed to get subject classes' });
  }
});

router.get('/:id/users', async (req, res) => {
  try {
    const subjectId = Number(req.params.id);
    const role = req.query.role as 'teacher' | 'student' | undefined;

    if (role === 'teacher') {
      const teachers = await db
        .select({ ...getTableColumns(user) })
        .from(classes)
        .leftJoin(user, eq(classes.teacherId, user.id))
        .where(eq(classes.subjectId, subjectId));

      return res.status(200).json({ data: teachers.filter((entry) => entry.id) });
    }

    const students = await db
      .select({ ...getTableColumns(user) })
      .from(enrollments)
      .leftJoin(classes, eq(enrollments.classId, classes.id))
      .leftJoin(user, eq(enrollments.studentId, user.id))
      .where(eq(classes.subjectId, subjectId));

    res.status(200).json({ data: students.filter((entry) => entry.id) });
  } catch (error) {
    console.error('GET /subjects/:id/users error:', error);
    res.status(500).json({ error: 'Failed to get subject users' });
  }
});

export default router;