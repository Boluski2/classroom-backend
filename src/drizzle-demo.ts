import { eq } from 'drizzle-orm';
import { db } from './db';
import { demoUsers } from './db/schema';

async function main() {
  try {
    console.log('Performing CRUD operations...');

    // CREATE
    const [newUser] = await db.insert(demoUsers).values({ name: 'Admin User', email: 'admin@example.com' }).returning();
    if (!newUser) throw new Error('Failed to create user');
    console.log('✅ CREATE:', newUser);

    // READ
    const found = await db.select().from(demoUsers).where(eq(demoUsers.id, newUser.id));
    console.log('✅ READ:', found[0]);

    // UPDATE
    const [updated] = await db.update(demoUsers).set({ name: 'Super Admin' }).where(eq(demoUsers.id, newUser.id)).returning();
    if (!updated) throw new Error('Failed to update user');
    console.log('✅ UPDATE:', updated);

    // DELETE
    await db.delete(demoUsers).where(eq(demoUsers.id, newUser.id));
    console.log('✅ DELETE: removed user');

    console.log('CRUD operations completed successfully.');
  } catch (err) {
    console.error('Error during CRUD demo:', err);
    process.exit(1);
  }
}

main();
