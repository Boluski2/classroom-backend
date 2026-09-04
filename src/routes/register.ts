import express from 'express';
import crypto from 'crypto';
import { and, eq, sql } from 'drizzle-orm';
import { db, user, account, session as sessionTable, enrollments, registrationCodes, classes } from '../db/index.js';

const router = express.Router();

function hashPassword(password: string): string {
  return crypto
    .createHash('sha256')
    .update(password + process.env.BETTER_AUTH_SECRET)
    .digest('hex');
}

function getSessionCookieString(token: string) {
  const cookieParts = [
    `better-auth.session_token=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=None',
    `Max-Age=${30 * 24 * 60 * 60}`,
  ];

  if (process.env.NODE_ENV === 'production') {
    cookieParts.push('Secure');
  }

  return cookieParts.join('; ');
}

const generateSessionToken = () => crypto.randomBytes(32).toString('hex');

router.post('/', async (req, res) => {
  try {
    const { email, password, name, inviteCode } = req.body as {
      email?: string;
      password?: string;
      name?: string;
      inviteCode?: string;
    };

    if (!email || !password || !name || !inviteCode) {
      return res.status(400).json({ error: 'Email, password, name, and registration code are required' });
    }

    const existingUser = await db.query.user.findFirst({
      where: (fields, { eq }) => eq(fields.email, email),
    });

    if (existingUser) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    const [codeRow] = await db
      .select({
        id: registrationCodes.id,
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

    const enrolledCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(enrollments)
      .where(eq(enrollments.classId, classRow.id));

    if ((enrolledCount[0]?.count ?? 0) >= classRow.capacity) {
      return res.status(409).json({ error: 'Class capacity reached' });
    }

    const userId = crypto.randomUUID();
    const hashedPassword = hashPassword(password);

    const [createdUser] = await db
      .insert(user)
      .values({
        id: userId,
        email,
        name,
        role: 'student',
        emailVerified: true,
      })
      .returning({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });

    await db.insert(account).values({
      id: crypto.randomUUID(),
      userId,
      accountId: email,
      providerId: 'email',
      password: hashedPassword,
    });

    await db.insert(enrollments).values({
      classId: classRow.id,
      studentId: userId,
    });

    const sessionToken = generateSessionToken();
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.insert(sessionTable).values({
      id: sessionId,
      token: sessionToken,
      expiresAt,
      userId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    await db
      .update(registrationCodes)
      .set({
        usesCount: sql`${registrationCodes.usesCount} + 1`,
        active:
          codeRow.usageLimit !== null && codeRow.usesCount + 1 >= codeRow.usageLimit
            ? false
            : true,
      })
      .where(eq(registrationCodes.id, codeRow.id));

    res.setHeader('Set-Cookie', getSessionCookieString(sessionToken));

    res.status(201).json({
      data: {
        user: createdUser ?? null,
        session: { token: sessionToken },
      },
    });
  } catch (error) {
    console.error('POST /register error:', error);
    return res.status(500).json({ error: 'Failed to register student' });
  }
});

export default router;
