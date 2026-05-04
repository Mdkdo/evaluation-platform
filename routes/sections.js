const express = require('express');
const db = require('../database');
const { verifyToken } = require('./auth');

const router = express.Router();

// Créer une section
router.post('/', verifyToken, async (req, res) => {
  try {
    if (req.userRole !== 'teacher') {
      return res.status(403).json({ error: 'Seuls les professeurs peuvent créer des sections' });
    }
    
    const { evaluationId, title, description, imageUrl, orderIndex = 0 } = req.body;
    
    if (!evaluationId) {
      return res.status(400).json({ error: 'ID d\'évaluation manquant' });
    }
    
    // Vérifier que le prof est propriétaire de l'évaluation
    const evaluation = await db.get(
      'SELECT teacher_id FROM evaluations WHERE id = ?',
      [evaluationId]
    );
    
    if (!evaluation || evaluation.teacher_id !== req.userId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    
    const result = await db.run(
      `INSERT INTO sections (evaluation_id, title, description, image_url, order_index)
       VALUES (?, ?, ?, ?, ?)`,
      [evaluationId, title || null, description || null, imageUrl || null, orderIndex]
    );
    
    res.status(201).json({
      message: 'Section créée avec succès',
      id: result.id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la création' });
  }
});

// Récupérer les sections d'une évaluation
router.get('/evaluation/:evalId', verifyToken, async (req, res) => {
  try {
    const { evalId } = req.params;
    
    const evaluation = await db.get(
      'SELECT id FROM evaluations WHERE id = ?',
      [evalId]
    );
    
    if (!evaluation) {
      return res.status(404).json({ error: 'Évaluation non trouvée' });
    }
    
    const sections = await db.all(
      `SELECT * FROM sections 
       WHERE evaluation_id = ?
       ORDER BY order_index`,
      [evalId]
    );
    
    // Pour chaque section, récupérer les questions associées
    for (let section of sections) {
      section.questions = await db.all(
        'SELECT * FROM questions WHERE section_id = ? ORDER BY order_index',
        [section.id]
      );
      
      // Pour chaque question, récupérer les options
      for (let question of section.questions) {
        question.options = await db.all(
          'SELECT * FROM question_options WHERE question_id = ? ORDER BY order_index',
          [question.id]
        );
      }
    }
    
    res.json(sections);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

// Récupérer une section spécifique
router.get('/:sectionId', verifyToken, async (req, res) => {
  try {
    const { sectionId } = req.params;
    
    const section = await db.get(
      `SELECT s.*, e.teacher_id FROM sections s
       JOIN evaluations e ON s.evaluation_id = e.id
       WHERE s.id = ?`,
      [sectionId]
    );
    
    if (!section) {
      return res.status(404).json({ error: 'Section non trouvée' });
    }
    
    // Vérifier les permissions (professeur propriétaire)
    if (req.userRole === 'teacher' && section.teacher_id !== req.userId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    
    // Récupérer les questions de la section
    section.questions = await db.all(
      'SELECT * FROM questions WHERE section_id = ? ORDER BY order_index',
      [sectionId]
    );
    
    // Pour chaque question, récupérer les options
    for (let question of section.questions) {
      question.options = await db.all(
        'SELECT * FROM question_options WHERE question_id = ? ORDER BY order_index',
        [question.id]
      );
    }
    
    res.json(section);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

// Mettre à jour une section
router.put('/:sectionId', verifyToken, async (req, res) => {
  try {
    if (req.userRole !== 'teacher') {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    
    const { sectionId } = req.params;
    const { title, description, imageUrl, orderIndex } = req.body;
    
    const section = await db.get(
      `SELECT s.id, e.teacher_id FROM sections s
       JOIN evaluations e ON s.evaluation_id = e.id
       WHERE s.id = ?`,
      [sectionId]
    );
    
    if (!section || section.teacher_id !== req.userId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    
    await db.run(
      `UPDATE sections 
       SET title = ?, description = ?, image_url = ?, order_index = ?
       WHERE id = ?`,
      [title, description, imageUrl, orderIndex, sectionId]
    );
    
    res.json({ message: 'Section mise à jour avec succès' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

// Supprimer une section
router.delete('/:sectionId', verifyToken, async (req, res) => {
  try {
    if (req.userRole !== 'teacher') {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    
    const { sectionId } = req.params;
    
    const section = await db.get(
      `SELECT s.id, e.teacher_id FROM sections s
       JOIN evaluations e ON s.evaluation_id = e.id
       WHERE s.id = ?`,
      [sectionId]
    );
    
    if (!section || section.teacher_id !== req.userId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    
    // Supprimer les questions associées et leurs options
    const questions = await db.all(
      'SELECT id FROM questions WHERE section_id = ?',
      [sectionId]
    );
    
    for (let q of questions) {
      await db.run('DELETE FROM question_options WHERE question_id = ?', [q.id]);
      await db.run('DELETE FROM questions WHERE id = ?', [q.id]);
    }
    
    // Supprimer la section
    await db.run('DELETE FROM sections WHERE id = ?', [sectionId]);
    
    res.json({ message: 'Section supprimée avec succès' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

module.exports = router;
