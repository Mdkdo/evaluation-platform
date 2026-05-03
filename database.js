const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DATABASE_PATH = process.env.DATABASE || path.join(__dirname, 'database.db');
const db = new sqlite3.Database(DATABASE_PATH);

const initialize = () => {
  db.serialize(() => {
    // Table utilisateurs
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        firstname TEXT NOT NULL,
        lastname TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('teacher', 'student')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table classes
    db.run(`
      CREATE TABLE IF NOT EXISTS classes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        teacher_id INTEGER NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teacher_id) REFERENCES users(id)
      )
    `);

    // Table inscriptions classe
    db.run(`
      CREATE TABLE IF NOT EXISTS class_enrollments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        class_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (class_id) REFERENCES classes(id),
        FOREIGN KEY (student_id) REFERENCES users(id),
        UNIQUE(class_id, student_id)
      )
    `);

    // Table évaluations
    db.run(`
      CREATE TABLE IF NOT EXISTS evaluations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        teacher_id INTEGER NOT NULL,
        class_id INTEGER,
        description TEXT,
        total_points REAL DEFAULT 20,
        shuffle_answers INTEGER DEFAULT 0,
        show_score INTEGER DEFAULT 1,
        show_question_scores INTEGER DEFAULT 1,
        show_answers INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        published INTEGER DEFAULT 0,
        FOREIGN KEY (teacher_id) REFERENCES users(id),
        FOREIGN KEY (class_id) REFERENCES classes(id)
      )
    `);

    // Table sections
    db.run(`
      CREATE TABLE IF NOT EXISTS sections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        evaluation_id INTEGER NOT NULL,
        title TEXT,
        description TEXT,
        image_url TEXT,
        order_index INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (evaluation_id) REFERENCES evaluations(id)
      )
    `);

    // Table questions
    db.run(`
      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        evaluation_id INTEGER NOT NULL,
        section_id INTEGER,
        type TEXT NOT NULL CHECK(type IN (
          'open_text',
          'radio',
          'checkbox',
          'table_radio',
          'table_checkbox',
          'drag_drop_image',
          'drag_drop_mapped_image',
          'drag_drop_text',
          'matching',
          'short_answer'
        )),
        title TEXT NOT NULL,
        description TEXT,
        image_url TEXT,
        points REAL DEFAULT 1,
        order_index INTEGER DEFAULT 0,
        alternative_group_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (evaluation_id) REFERENCES evaluations(id),
        FOREIGN KEY (section_id) REFERENCES sections(id)
      )
    `);

    // Table options/réponses
    db.run(`
      CREATE TABLE IF NOT EXISTS question_options (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_id INTEGER NOT NULL,
        text TEXT NOT NULL,
        image_url TEXT,
        is_correct INTEGER DEFAULT 0,
        points REAL DEFAULT 0,
        order_index INTEGER DEFAULT 0,
        x_position REAL,
        y_position REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (question_id) REFERENCES questions(id)
      )
    `);

    // Table réponses/soumissions
    db.run(`
      CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        evaluation_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        total_score REAL DEFAULT 0,
        max_score REAL DEFAULT 20,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (evaluation_id) REFERENCES evaluations(id),
        FOREIGN KEY (student_id) REFERENCES users(id)
      )
    `);

    // Table réponses aux questions
    db.run(`
      CREATE TABLE IF NOT EXISTS question_answers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        submission_id INTEGER NOT NULL,
        question_id INTEGER NOT NULL,
        answer_text TEXT,
        selected_options TEXT,
        score REAL DEFAULT 0,
        max_score REAL DEFAULT 0,
        is_correct INTEGER DEFAULT 0,
        answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (submission_id) REFERENCES submissions(id),
        FOREIGN KEY (question_id) REFERENCES questions(id)
      )
    `);
  });
};

const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

module.exports = {
  db,
  initialize,
  run,
  get,
  all
};
