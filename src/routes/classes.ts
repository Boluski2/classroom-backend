import express from 'express';
import { and, desc, eq, getTableColumns, ilike, or, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { classes, subjects, user } from '../db/schema/index.js';

const router = express.Router();

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