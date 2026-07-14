import express from 'express';
import { and, desc, eq, getTableColumns, ilike, or, sql } from 'drizzle-orm';
import { classes, departments, enrollments, subjects, user } from '../db/schema/index.js';
import { db } from '../db/index.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { search, role, page = 1, limit = 10 } = req.query;

    const currentPage = Math.max(1, Number(page) || 1);
    const limitPage = Math.max(1, Math.min(Number(limit) || 10, 100));
    const offset = (currentPage - 1) * limitPage;

    const filterConditions = [] as Array<ReturnType<typeof ilike> | ReturnType<typeof eq> | ReturnType<typeof or>>;

    if (search) {
      filterConditions.push(
        or(
          ilike(user.name, `%${String(search)}%`),
          ilike(user.email, `%${String(search)}%`)
        )
      );
    }

    if (role) {
      const roleFilter = role as 'student' | 'teacher' | 'admin';
      filterConditions.push(eq(user.role, roleFilter));
    }

    const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const countResult = await db.select({ count: sql<number>`count(*)` }).from(user).where(whereClause);
    const totalItems = countResult[0]?.count ?? 0;

    const usersList = await db
      .select({ ...getTableColumns(user) })
      .from(user)
      .where(whereClause)
      .orderBy(desc(user.createdAt))
      .limit(limitPage)
      .offset(offset);

    res.status(200).json({
      data: usersList,
      pagination: {
        page: currentPage,
        limit: limitPage,
        total: totalItems,
        totalPages: Math.ceil(totalItems / limitPage),
      },
    });
  } catch (e) {
    console.error('Get /users error:', e);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { id, name, email, role, emailVerified = false } = req.body as {
      id?: string;
      name?: string;
      email?: string;
      role?: 'student' | 'teacher' | 'admin';
      emailVerified?: boolean;
    };

    if (!id || !name || !email) {
      return res.status(400).json({ error: 'User id, name and email are required' });
    }

    const [createdUser] = await db
      .insert(user)
      .values({
        id,
        name,
        email,
        role: role ?? 'student',
        emailVerified,
      })
      .returning({ id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: user.emailVerified });

    res.status(201).json({ data: createdUser });
  } catch (error) {
    console.error('POST /users error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    const [userRow] = await db.select({ ...getTableColumns(user) }).from(user).where(eq(user.id, userId));

    if (!userRow) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ data: userRow });
  } catch (error) {
    console.error('GET /users/:id error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, email, role, emailVerified } = req.body as {
      name?: string;
      email?: string;
      role?: 'student' | 'teacher' | 'admin';
      emailVerified?: boolean;
    };

    const [updatedUser] = await db
      .update(user)
      .set({ name, email, role, emailVerified })
      .where(eq(user.id, userId))
      .returning({ id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: user.emailVerified });

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ data: updatedUser });
  } catch (error) {
    console.error('PUT /users/:id error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    await db.delete(user).where(eq(user.id, userId));
    res.status(200).json({ data: { success: true } });
  } catch (error) {
    console.error('DELETE /users/:id error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.get('/:id/departments', async (req, res) => {
  try {
    const userId = req.params.id;
    const departmentsList = await db
      .select({
        id: departments.id,
        name: departments.name,
        code: departments.code,
        description: departments.description,
      })
      .from(classes)
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .where(eq(classes.teacherId, userId))
      .orderBy(desc(departments.createdAt));

    res.status(200).json({ data: departmentsList });
  } catch (error) {
    console.error('GET /users/:id/departments error:', error);
    res.status(500).json({ error: 'Failed to get user departments' });
  }
});

router.get('/:id/subjects', async (req, res) => {
  try {
    const userId = req.params.id;
    const subjectsList = await db
      .select({
        ...getTableColumns(subjects),
        department: { ...getTableColumns(departments) },
      })
      .from(classes)
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .where(eq(classes.teacherId, userId))
      .orderBy(desc(subjects.createdAt));

    res.status(200).json({ data: subjectsList });
  } catch (error) {
    console.error('GET /users/:id/subjects error:', error);
    res.status(500).json({ error: 'Failed to get user subjects' });
  }
});

export default router;
