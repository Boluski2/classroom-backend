import express from 'express';
import { and, desc, eq, getTableColumns, ilike, or, sql } from 'drizzle-orm';
import { departments, subjects } from '../db/schema';
import { db } from '../db/index.js';

const router = express.Router();

// Get all subjects with optional search, filter and pagination
router.get('/', async (req, res) => {
 try {
    // Extract query parameters for search, filter, page and limit
    const { search, department, page = 1, limit = 10 } = req.query;

    // set current page and page size with default values 
    const currentPage = Math.max(1, Number(page) || 1);
    const limitPage = Math.max(1, Math.min(Number(limit) || 10, 100)); // Also cap max limit    

    // offset calculation for pagination
    const offset = (currentPage - 1) * limitPage;

    // Initialize an array to hold filter conditions for the database query
    const filterConditions = [];

    // If Search query parameter is provided, add conditions to filter subjects by name or code using case-insensitive matching
    if (search) {
        filterConditions.push(
            or(
                ilike(subjects.name, `%${search}%`),
                ilike(subjects.code, `%${search}%`)
            )
        );
    }

    // If department filter is provided, add a condition to filter subjects by department ID
    if (department){
        filterConditions.push(ilike(departments.name, `%${department}%`));
    }
  
    // Combine all filters using AND if any exist 
    const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const countResult  =  await  db
        .select({ count: sql<number>`count(*)` })
        .from(subjects)
        .leftJoin(departments, eq(subjects.departmentId, departments.id))
        .where(whereClause);

    const totalItems = countResult[0]?.count ?? 0;

    // Query the database to get subjects with applied filters, pagination and sorting by creation date
    const subjectsList = await db
      .select({...getTableColumns(subjects),
        department: {...getTableColumns(departments)}
      }).from(subjects).leftJoin(departments, eq(subjects.departmentId, departments.id))
      .where(whereClause)
      .orderBy(desc(subjects.createdAt))
      .limit(limitPage)
      .offset(offset);
        
    // Return the list of subjects along with pagination metadata
    res.status(200).json({
        data: subjectsList,
        pagination: {
            page: currentPage,
            limit: limitPage,
            total: totalItems,
            totalPages: Math.ceil(totalItems / limitPage)
        }
    });
 } catch (e) {
    console.error(`Get /subject error: ${e}`);
    res.status(500).json({ error: 'Failed to Get Subjects' });
 }
});

export default router;