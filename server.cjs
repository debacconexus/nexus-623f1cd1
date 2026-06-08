const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Initialize database tables
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        student_id VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        year_level INTEGER,
        major VARCHAR(50),
        enrollment_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS faculty (
        id SERIAL PRIMARY KEY,
        faculty_id VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        department VARCHAR(50),
        position VARCHAR(50),
        specialization TEXT,
        hire_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        course_code VARCHAR(20) UNIQUE NOT NULL,
        course_name VARCHAR(200) NOT NULL,
        description TEXT,
        credits INTEGER,
        semester VARCHAR(20),
        year INTEGER,
        faculty_id INTEGER REFERENCES faculty(id),
        max_enrollment INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id),
        course_id INTEGER REFERENCES courses(id),
        enrollment_date DATE DEFAULT CURRENT_DATE,
        grade VARCHAR(5),
        attendance_rate DECIMAL(5,2),
        participation_score INTEGER,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS research_projects (
        id SERIAL PRIMARY KEY,
        project_title VARCHAR(300) NOT NULL,
        description TEXT,
        faculty_id INTEGER REFERENCES faculty(id),
        start_date DATE,
        end_date DATE,
        funding_amount DECIMAL(12,2),
        funding_source VARCHAR(200),
        status VARCHAR(50),
        publications TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS curriculum_documentation (
        id SERIAL PRIMARY KEY,
        document_title VARCHAR(300) NOT NULL,
        document_type VARCHAR(50),
        content TEXT,
        course_id INTEGER REFERENCES courses(id),
        faculty_id INTEGER REFERENCES faculty(id),
        version VARCHAR(20),
        approval_status VARCHAR(50),
        last_updated DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_engagement (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id),
        engagement_type VARCHAR(100),
        activity_name VARCHAR(200),
        description TEXT,
        participation_level VARCHAR(50),
        hours_logged INTEGER,
        academic_year VARCHAR(10),
        semester VARCHAR(20),
        notes TEXT, -- [IGM-GOVERNED]
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS learning_outcomes (
        id SERIAL PRIMARY KEY,
        outcome_name VARCHAR(200) NOT NULL,
        description TEXT,
        course_id INTEGER REFERENCES courses(id),
        assessment_method VARCHAR(100),
        benchmark_score DECIMAL(5,2),
        achievement_rate DECIMAL(5,2),
        semester VARCHAR(20),
        year INTEGER,
        notes TEXT, -- [IGM-GOVERNED]
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS outcome_reports (
        id SERIAL PRIMARY KEY,
        report_title VARCHAR(300) NOT NULL,
        report_type VARCHAR(50),
        academic_year VARCHAR(10),
        semester VARCHAR(20),
        course_id INTEGER REFERENCES courses(id),
        faculty_id INTEGER REFERENCES faculty(id),
        total_students INTEGER,
        success_rate DECIMAL(5,2),
        average_score DECIMAL(5,2),
        improvement_areas TEXT,
        recommendations TEXT,
        notes TEXT, -- [IGM-GOVERNED]
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        subject VARCHAR(200),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// CRUD Operations for Students
app.get('/api/students', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM students ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM students WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/students', async (req, res) => {
  try {
    const { student_id, name, email, year_level, major } = req.body;
    const result = await pool.query(
      'INSERT INTO students (student_id, name, email, year_level, major) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [student_id, name, email, year_level, major]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { student_id, name, email, year_level, major } = req.body;
    const result = await pool.query(
      'UPDATE students SET student_id = $1, name = $2, email = $3, year_level = $4, major = $5 WHERE id = $6 RETURNING *',
      [student_id, name, email, year_level, major, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM students WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CRUD Operations for Faculty
app.get('/api/faculty', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM faculty ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching faculty:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/faculty/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM faculty WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Faculty member not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching faculty member:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/faculty', async (req, res) => {
  try {
    const { faculty_id, name, email, department, position, specialization, hire_date } = req.body;
    const result = await pool.query(
      'INSERT INTO faculty (faculty_id, name, email, department, position, specialization, hire_date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [faculty_id, name, email, department, position, specialization, hire_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating faculty member:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/faculty/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { faculty_id, name, email, department, position, specialization, hire_date } = req.body;
    const result = await pool.query(
      'UPDATE faculty SET faculty_id = $1, name = $2, email = $3, department = $4, position = $5, specialization = $6, hire_date = $7 WHERE id = $8 RETURNING *',
      [faculty_id, name, email, department, position, specialization, hire_date, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Faculty member not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating faculty member:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/faculty/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM faculty WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Faculty member not found' });
    }
    res.json({ message: 'Faculty member deleted successfully' });
  } catch (error) {
    console.error('Error deleting faculty member:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CRUD Operations for Courses
app.get('/api/courses', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, f.name as faculty_name 
      FROM courses c 
      LEFT JOIN faculty f ON c.faculty_id = f.id 
      ORDER BY c.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT c.*, f.name as faculty_name 
      FROM courses c 
      LEFT JOIN faculty f ON c.faculty_id = f.id 
      WHERE c.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/courses', async (req, res) => {
  try {
    const { course_code, course_name, description, credits, semester, year, faculty_id, max_enrollment } = req.body;
    const result = await pool.query(
      'INSERT INTO courses (course_code, course_name, description, credits, semester, year, faculty_id, max_enrollment) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [course_code, course_name, description, credits, semester, year, faculty_id, max_enrollment]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { course_code, course_name, description, credits, semester, year, faculty_id, max_enrollment } = req.body;
    const result = await pool.query(
      'UPDATE courses SET course_code = $1, course_name = $2, description = $3, credits = $4, semester = $5, year = $6, faculty_id = $7, max_enrollment = $8 WHERE id = $9 RETURNING *',
      [course_code, course_name, description, credits, semester, year, faculty_id, max_enrollment, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM courses WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CRUD Operations for Enrollments
app.get('/api/enrollments', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, s.name as student_name, s.student_id, c.course_code, c.course_name 
      FROM enrollments e 
      LEFT JOIN students s ON e.student_id = s.id 
      LEFT JOIN courses c ON e.course_id = c.id 
      ORDER BY e.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/enrollments', async (req, res) => {
  try {
    const { student_id, course_id, grade, attendance_rate, participation_score, status } = req.body;
    const result = await pool.query(
      'INSERT INTO enrollments (student_id, course_id, grade, attendance_rate, participation_score, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [student_id, course_id, grade, attendance_rate, participation_score, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating enrollment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/enrollments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { student_id, course_id, grade, attendance_rate, participation_score, status } = req.body;
    const result = await pool.query(
      'UPDATE enrollments SET student_id = $1, course_id = $2, grade = $3, attendance_rate = $4, participation_score = $5, status = $6 WHERE id = $7 RETURNING *',
      [student_id, course_id, grade, attendance_rate, participation_score, status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating enrollment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/enrollments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM enrollments WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    res.json({ message: 'Enrollment deleted successfully' });
  } catch (error) {
    console.error('Error deleting enrollment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CRUD Operations for Research Projects
app.get('/api/research-projects', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, f.name as faculty_name 
      FROM research_projects r 
      LEFT JOIN faculty f ON r.faculty_id = f.id 
      ORDER BY r.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching research projects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/research-projects', async (req, res) => {
  try {
    const { project_title, description, faculty_id, start_date, end_date, funding_amount, funding_source, status, publications } = req.body;
    const result = await pool.query(
      'INSERT INTO research_projects (project_title, description, faculty_id, start_date, end_date, funding_amount, funding_source, status, publications) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [project_title, description, faculty_id, start_date, end_date, funding_amount, funding_source, status, publications]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating research project:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/research-projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { project_title, description, faculty_id, start_date, end_date, funding_amount, funding_source, status, publications } = req.body;
    const result = await pool.query(
      'UPDATE research_projects SET project_title = $1, description = $2, faculty_id = $3, start_date = $4, end_date = $5, funding_amount = $6, funding_source = $7, status = $8, publications = $9 WHERE id = $10 RETURNING *',
      [project_title, description, faculty_id, start_date, end_date, funding_amount, funding_source, status, publications, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Research project not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating research project:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/research-projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM research_projects WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Research project not found' });
    }
    res.json({ message: 'Research project deleted successfully' });
  } catch (error) {
    console.error('Error deleting research project:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CRUD Operations for Curriculum Documentation
app.get('/api/curriculum-documentation', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cd.*, c.course_code, c.course_name, f.name as faculty_name 
      FROM curriculum_documentation cd 
      LEFT JOIN courses c ON cd.course_id = c.id 
      LEFT JOIN faculty f ON cd.faculty_id = f.id 
      ORDER BY cd.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching curriculum documentation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/curriculum-documentation', async (req, res) => {
  try {
    const { document_title, document_type, content, course_id, faculty_id, version, approval_status } = req.body;
    const result = await pool.query(
      'INSERT INTO curriculum_documentation (document_title, document_type, content, course_id, faculty_id, version, approval_status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [document_title, document_type, content, course_id, faculty_id, version, approval_status]
    );
    res.status(201).json(result
});

}
