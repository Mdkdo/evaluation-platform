const express = require('express');
const { verifyToken } = require('./auth');
const db = require('../database');

const router = express.Router();

// Créer une question
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      evaluation_id,
      section_id,
      type,
      title,
      description,
      image_url,
      points,
      order_index,
      options,
      alternative_group_id
    } = req.body;

    // Vérifier que c'est le propriétaire de l'évaluation
    const evaluation = await db.get(
      'SELECT teacher_id FROM evaluations WHERE id = ?',
      [evaluation_id]
    );

    if (!evaluation || evaluation.teacher_id !== req.userId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const result = await db.run(
      `INSERT INTO questions (
        evaluation_id, section_id, type, title, description,
        image_url, points, order_index, alternative_group_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        evaluation_id,
        section_id || null,
        type,
        title,
        description || null,
        image_url || null,
        points || 1,
        order_index || 0,
        alternative_group_id || null
      ]
    );

    // Ajouter les options si fournis
    if (options && Array.isArray(options)) {
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        await db.run(
          `INSERT INTO question_options (
            question_id, text, image_url, is_correct, points, order_index, x_position, y_position
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            result.id,
            opt.text,
            opt.image_url || null,
            opt.is_correct ? 1 : 0,
            opt.points || 0,
            i,
            opt.x_position || null,
            opt.y_position || null
          ]
        );
      }
    }

    res.json({
      message: 'Question créée',
      question: {
        id: result.id,
        evaluation_id,
        type,
        title,
        points: points || 1
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Récupérer les questions d'une évaluation
router.get('/evaluation/:evaluationId', async (req, res) => {
  try {
    const questions = await db.all(
      'SELECT * FROM questions WHERE evaluation_id = ? ORDER BY order_index',
      [req.params.evaluationId]
    );

    // Pour chaque question, récupérer les options
    for (let q of questions) {
      q.options = await db.all(
        'SELECT * FROM question_options WHERE question_id = ? ORDER BY order_index',
        [q.id]
      );
    }

    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Récupérer une question avec ses options
router.get('/:id', async (req, res) => {
  try {
    const question = await db.get(
      'SELECT * FROM questions WHERE id = ?',
      [req.params.id]
    );

    if (!question) {
      return res.status(404).json({ error: 'Question non trouvée' });
    }

    question.options = await db.all(
      'SELECT * FROM question_options WHERE question_id = ? ORDER BY order_index',
      [req.params.id]
    );

    res.json(question);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mettre à jour une question
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const question = await db.get('SELECT * FROM questions WHERE id = ?', [req.params.id]);
    
    if (!question) {
      return res.status(404).json({ error: 'Question non trouvée' });
    }

    const evaluation = await db.get(
      'SELECT teacher_id FROM evaluations WHERE id = ?',
      [question.evaluation_id]
    );

    if (!evaluation || evaluation.teacher_id !== req.userId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const { title, description, image_url, points, options } = req.body;

    await db.run(
      'UPDATE questions SET title = ?, description = ?, image_url = ?, points = ? WHERE id = ?',
      [title || question.title, description, image_url, points || question.points, req.params.id]
    );

    // Mettre à jour les options si fournis
    if (options && Array.isArray(options)) {
      // Supprimer les anciennes options
      await db.run('DELETE FROM question_options WHERE question_id = ?', [req.params.id]);
      
      // Ajouter les nouvelles
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        await db.run(
          `INSERT INTO question_options (
            question_id, text, image_url, is_correct, points, order_index, x_position, y_position
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            req.params.id,
            opt.text,
            opt.image_url || null,
            opt.is_correct ? 1 : 0,
            opt.points || 0,
            i,
            opt.x_position || null,
            opt.y_position || null
          ]
        );
      }
    }

    res.json({ message: 'Question mise à jour' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Supprimer une question
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const question = await db.get('SELECT * FROM questions WHERE id = ?', [req.params.id]);
    
    if (!question) {
      return res.status(404).json({ error: 'Question non trouvée' });
    }

    const evaluation = await db.get(
      'SELECT teacher_id FROM evaluations WHERE id = ?',
      [question.evaluation_id]
    );

    if (!evaluation || evaluation.teacher_id !== req.userId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    // Supprimer les options
    await db.run('DELETE FROM question_options WHERE question_id = ?', [req.params.id]);
    
    // Supprimer la question
    await db.run('DELETE FROM questions WHERE id = ?', [req.params.id]);

    res.json({ message: 'Question supprimée' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
