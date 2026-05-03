const express = require('express');
const { verifyToken } = require('./auth');
const db = require('../database');
const crypto = require('crypto');

const router = express.Router();

// Créer une évaluation
router.post('/', verifyToken, async (req, res) => {
  try {
    if (req.userRole !== 'teacher') {
      return res.status(403).json({ error: 'Seuls les professeurs peuvent créer des évaluations' });
    }

    const {
      title,
      description,
      class_id,
      total_points,
      shuffle_answers,
      show_score,
      show_question_scores,
      show_answers
    } = req.body;

    const code = crypto.randomBytes(4).toString('hex').toUpperCase();

    const result = await db.run(
      `INSERT INTO evaluations (
        title, code, teacher_id, class_id, description, total_points,
        shuffle_answers, show_score, show_question_scores, show_answers
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title, code, req.userId, class_id, description, total_points || 20,
        shuffle_answers ? 1 : 0, show_score ? 1 : 0,
        show_question_scores ? 1 : 0, show_answers ? 1 : 0
      ]
    );

    res.json({
      message: 'Évaluation créée',
      evaluation: {
        id: result.id,
        title,
        code,
        description,
        total_points: total_points || 20
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Récupérer les évaluations d'un professeur
router.get('/teacher/:teacherId', verifyToken, async (req, res) => {
  try {
    if (req.userId !== parseInt(req.params.teacherId) && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const evaluations = await db.all(
      'SELECT * FROM evaluations WHERE teacher_id = ? ORDER BY created_at DESC',
      [req.params.teacherId]
    );
    res.json(evaluations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Récupérer une évaluation par code
router.get('/code/:code', async (req, res) => {
  try {
    const evaluation = await db.get(
      'SELECT * FROM evaluations WHERE code = ? AND published = 1',
      [req.params.code]
    );

    if (!evaluation) {
      return res.status(404).json({ error: 'Évaluation non trouvée ou non publiée' });
    }

    res.json(evaluation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Récupérer une évaluation complète avec sections et questions
router.get('/:id/full', async (req, res) => {
  try {
    const evaluation = await db.get(
      'SELECT * FROM evaluations WHERE id = ? AND published = 1',
      [req.params.id]
    );

    if (!evaluation) {
      return res.status(404).json({ error: 'Évaluation non trouvée' });
    }

    // Récupérer les sections
    const sections = await db.all(
      'SELECT * FROM sections WHERE evaluation_id = ? ORDER BY order_index',
      [req.params.id]
    );

    // Récupérer les questions sans section
    const questions = await db.all(
      'SELECT * FROM questions WHERE evaluation_id = ? AND section_id IS NULL ORDER BY order_index',
      [req.params.id]
    );

    // Pour chaque question, récupérer les options
    for (let q of [...questions, ...sections.flatMap(s => s.questions || [])]) {
      q.options = await db.all(
        'SELECT * FROM question_options WHERE question_id = ? ORDER BY order_index',
        [q.id]
      );
    }

    // Ajouter les questions à chaque section
    for (let section of sections) {
      section.questions = await db.all(
        'SELECT * FROM questions WHERE section_id = ? ORDER BY order_index',
        [section.id]
      );
      for (let q of section.questions) {
        q.options = await db.all(
          'SELECT * FROM question_options WHERE question_id = ? ORDER BY order_index',
          [q.id]
        );
      }
    }

    res.json({ ...evaluation, sections, questions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Publier une évaluation
router.put('/:id/publish', verifyToken, async (req, res) => {
  try {
    const evaluation = await db.get('SELECT * FROM evaluations WHERE id = ?', [req.params.id]);
    
    if (!evaluation) {
      return res.status(404).json({ error: 'Évaluation non trouvée' });
    }

    if (evaluation.teacher_id !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    await db.run('UPDATE evaluations SET published = 1 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Évaluation publiée' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mettre à jour une évaluation
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const evaluation = await db.get('SELECT * FROM evaluations WHERE id = ?', [req.params.id]);
    
    if (!evaluation) {
      return res.status(404).json({ error: 'Évaluation non trouvée' });
    }

    if (evaluation.teacher_id !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const {
      title,
      description,
      total_points,
      shuffle_answers,
      show_score,
      show_question_scores,
      show_answers
    } = req.body;

    await db.run(
      `UPDATE evaluations SET
        title = ?, description = ?, total_points = ?,
        shuffle_answers = ?, show_score = ?,
        show_question_scores = ?, show_answers = ?
        WHERE id = ?`,
      [
        title || evaluation.title,
        description || evaluation.description,
        total_points || evaluation.total_points,
        shuffle_answers !== undefined ? (shuffle_answers ? 1 : 0) : evaluation.shuffle_answers,
        show_score !== undefined ? (show_score ? 1 : 0) : evaluation.show_score,
        show_question_scores !== undefined ? (show_question_scores ? 1 : 0) : evaluation.show_question_scores,
        show_answers !== undefined ? (show_answers ? 1 : 0) : evaluation.show_answers,
        req.params.id
      ]
    );

    res.json({ message: 'Évaluation mise à jour' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
