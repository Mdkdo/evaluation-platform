const express = require('express');
const { verifyToken } = require('./auth');
const db = require('../database');

const router = express.Router();

// Créer une classe (professeur)
router.post('/', verifyToken, async (req, res) => {
  try {
    if (req.userRole !== 'teacher') {
      return res.status(403).json({ error: 'Seuls les professeurs peuvent créer des classes' });
    }

    const { name, description } = req.body;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const result = await db.run(
      'INSERT INTO classes (name, code, teacher_id, description) VALUES (?, ?, ?, ?)',
      [name, code, req.userId, description]
    );

    res.json({
      message: 'Classe créée',
      class: {
        id: result.id,
        name,
        code,
        description,
        teacher_id: req.userId
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Récupérer les classes d'un professeur
router.get('/teacher/:id', verifyToken, async (req, res) => {
  try {
    if (req.userId !== parseInt(req.params.id) && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const classes = await db.all(
      'SELECT id, name, code, description, created_at FROM classes WHERE teacher_id = ?',
      [req.params.id]
    );
    res.json(classes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ajouter un élève à une classe
router.post('/:classId/enroll', verifyToken, async (req, res) => {
  try {
    const { classId } = req.params;
    
    // Vérifier que c'est une classe valide
    const classData = await db.get('SELECT * FROM classes WHERE id = ?', [classId]);
    if (!classData) {
      return res.status(404).json({ error: 'Classe non trouvée' });
    }

    // Ajouter l'élève
    const result = await db.run(
      'INSERT OR IGNORE INTO class_enrollments (class_id, student_id) VALUES (?, ?)',
      [classId, req.userId]
    );

    res.json({ message: 'Élève ajouté à la classe' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Récupérer les élèves d'une classe
router.get('/:classId/students', verifyToken, async (req, res) => {
  try {
    const { classId } = req.params;
    
    // Vérifier les permissions
    const classData = await db.get('SELECT * FROM classes WHERE id = ?', [classId]);
    if (!classData) {
      return res.status(404).json({ error: 'Classe non trouvée' });
    }

    if (classData.teacher_id !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const students = await db.all(`
      SELECT u.id, u.email, u.firstname, u.lastname 
      FROM users u
      JOIN class_enrollments ce ON u.id = ce.student_id
      WHERE ce.class_id = ?
    `, [classId]);
    
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtenir les classes d'un élève
router.get('/student/:studentId', verifyToken, async (req, res) => {
  try {
    if (req.userId !== parseInt(req.params.studentId) && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const classes = await db.all(`
      SELECT c.id, c.name, c.code, c.description, u.firstname, u.lastname
      FROM classes c
      JOIN class_enrollments ce ON c.id = ce.class_id
      JOIN users u ON c.teacher_id = u.id
      WHERE ce.student_id = ?
    `, [req.params.studentId]);
    
    res.json(classes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
