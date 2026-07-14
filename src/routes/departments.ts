import express from 'express';
import { and, desc, eq, getTableColumns, ilike, or, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { classes, departments, enrollments, subjects, user } from '../db/schema/index.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const currentPage = Math.max(1, Number(page) || 1);
    const limitPage = Math.max(1, Math.min(Number(limit) || 10, 100));
    const offset = (currentPage - 1) * limitPage;

    const filterConditions = [] as Array<ReturnType<typeof ilike> | ReturnType<typeof or>>;

    if (search) {
      filterConditions.push(
        or(
          ilike(departments.name, `%${String(search)}%`),
          ilike(departments.code, `%${String(search)}%`)
        )
      );
    }

    const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const countResult = await db.select({ count: sql<number>`count(*)` }).from(departments).where(whereClause);
    const totalItems = countResult[0]?.count ?? 0;

    const departmentsList = await db
      .select({
        ...getTableColumns(departments),
        totalSubjects: sql<number>`(select count(*) from subjects where subjects.department_id = departments.id)`,
      })
      .from(departments)
      .where(whereClause)
      .orderBy(desc(departments.createdAt))
      .limit(limitPage)
      .offset(offset);

    res.status(200).json({
      data: departmentsList,
      pagination: {
        page: currentPage,
        limit: limitPage,
        total: totalItems,
        totalPages: Math.ceil(totalItems / limitPage),
      },
    });
  } catch (error) {
    console.error('GET /departments error:', error);
    res.status(500).json({ error: 'Failed to get departments' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { code, name, description } = req.body as {
      code?: string;
      name?: string;
      description?: string;
    };

    if (!code || !name) {
      return res.status(400).json({ error: 'Code and name are required' });
    }

    const [createdDepartment] = await db
      .insert(departments)
      .values({ code, name, description: description ?? null })
      .returning({ id: departments.id });

    res.status(201).json({ data: createdDepartment });
  } catch (error) {
    console.error('POST /departments error:', error);
    res.status(500).json({ error: 'Failed to create department' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const departmentId = Number(req.params.id);

    if (!Number.isInteger(departmentId) || departmentId <= 0) {
      return res.status(400).json({ error: 'Invalid department id' });
    }

    const [departmentRow] = await db.select({ ...getTableColumns(departments) }).from(departments).where(eq(departments.id, departmentId));

    if (!departmentRow) {
      return res.status(404).json({ error: 'Department not found' });
    }

    const subjectsCount = await db.select({ count: sql<number>`count(*)` }).from(subjects).where(eq(subjects.departmentId, departmentId));
    const classesCount = await db.select({ count: sql<number>`count(*)` }).from(classes).leftJoin(subjects, eq(classes.subjectId, subjects.id)).where(eq(subjects.departmentId, departmentId));
    const enrolledStudentsCount = await db.select({ count: sql<number>`count(*)` }).from(enrollments).leftJoin(classes, eq(enrollments.classId, classes.id)).leftJoin(subjects, eq(classes.subjectId, subjects.id)).where(eq(subjects.departmentId, departmentId));

    res.status(200).json({
      data: {
        department: departmentRow,
        totals: {
          subjects: subjectsCount[0]?.count ?? 0,
          classes: classesCount[0]?.count ?? 0,
          enrolledStudents: enrolledStudentsCount[0]?.count ?? 0,
        },
      },
    });
  } catch (error) {
    console.error('GET /departments/:id error:', error);
    res.status(500).json({ error: 'Failed to get department details' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const departmentId = Number(req.params.id);
    const { code, name, description } = req.body as {
      code?: string;
      name?: string;
      description?: string;
    };

    if (!Number.isInteger(departmentId) || departmentId <= 0) {
      return res.status(400).json({ error: 'Invalid department id' });
    }

    const [updatedDepartment] = await db.update(departments).set({ code, name, description: description ?? null }).where(eq(departments.id, departmentId)).returning({ id: departments.id, name: departments.name, description: departments.description, code: departments.code });

    res.status(200).json({ data: updatedDepartment });
  } catch (error) {
    console.error('PUT /departments/:id error:', error);
    res.status(500).json({ error: 'Failed to update department' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const departmentId = Number(req.params.id);

    if (!Number.isInteger(departmentId) || departmentId <= 0) {
      return res.status(400).json({ error: 'Invalid department id' });
    }

    const linkedSubjects = await db.select({ id: subjects.id }).from(subjects).where(eq(subjects.departmentId, departmentId));

    if (linkedSubjects.length > 0) {
      return res.status(409).json({ error: 'Department has linked subjects and cannot be deleted' });
    }

    await db.delete(departments).where(eq(departments.id, departmentId));

    res.status(200).json({ data: { success: true } });
  } catch (error) {
    console.error('DELETE /departments/:id error:', error);
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

router.get('/:id/subjects', async (req, res) => {
  try {
    const departmentId = Number(req.params.id);
    const subjectsList = await db
      .select({
        ...getTableColumns(subjects),
        department: { ...getTableColumns(departments) },
      })
      .from(subjects)
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .where(eq(subjects.departmentId, departmentId))
      .orderBy(desc(subjects.createdAt));

    res.status(200).json({ data: subjectsList });
  } catch (error) {
    console.error('GET /departments/:id/subjects error:', error);
    res.status(500).json({ error: 'Failed to get department subjects' });
  }
});

router.get('/:id/classes', async (req, res) => {
  try {
    const departmentId = Number(req.params.id);
    const classesList = await db
      .select({
        ...getTableColumns(classes),
        subject: { ...getTableColumns(subjects) },
        teacher: { ...getTableColumns(user) },
      })
      .from(classes)
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .leftJoin(user, eq(classes.teacherId, user.id))
      .where(eq(subjects.departmentId, departmentId))
      .orderBy(desc(classes.createdAt));

    res.status(200).json({ data: classesList });
  } catch (error) {
    console.error('GET /departments/:id/classes error:', error);
    res.status(500).json({ error: 'Failed to get department classes' });
  }
});

router.get('/:id/users', async (req, res) => {
  try {
    const departmentId = Number(req.params.id);
    const usersList = await db
      .select({ ...getTableColumns(user) })
      .from(classes)
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .leftJoin(user, eq(classes.teacherId, user.id))
      .where(eq(subjects.departmentId, departmentId))
      .orderBy(desc(user.createdAt));

    res.status(200).json({ data: usersList.filter((entry) => entry.id) });
  } catch (error) {
    console.error('GET /departments/:id/users error:', error);
    res.status(500).json({ error: 'Failed to get department users' });
  }
});

export default router;