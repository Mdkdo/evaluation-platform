const express = require('express');
const { verifyToken } = require('./auth');
const db = require('../database');

const router = express.Router();

// Soumettre une réponse et obtenir la correction automatique
router.post('/submit', verifyToken, async (req, res) => {
  try {
    const { evaluation_id, answers } = req.body;

    // Récupérer l'évaluation
    const evaluation = await db.get(
      'SELECT * FROM evaluations WHERE id = ? AND published = 1',
      [evaluation_id]
    );

    if (!evaluation) {
      return res.status(404).json({ error: 'Évaluation non trouvée ou non publiée' });
    }

    // Créer la soumission
    const submissionResult = await db.run(
      'INSERT INTO submissions (evaluation_id, student_id, max_score) VALUES (?, ?, ?)',
      [evaluation_id, req.userId, evaluation.total_points]
    );

    const submissionId = submissionResult.id;
    let totalScore = 0;
    const detailedResults = [];

    // Traiter chaque réponse
    for (let answer of answers) {
      const { question_id, answer_text, selected_options } = answer;

      // Récupérer la question
      const question = await db.get(
        'SELECT * FROM questions WHERE id = ?',
        [question_id]
      );

      if (!question) continue;

      // Récupérer les options correctes
      const correctOptions = await db.all(
        'SELECT * FROM question_options WHERE question_id = ? AND is_correct = 1',
        [question_id]
      );

      let questionScore = 0;
      let isCorrect = false;
      const elementScores = [];

      // Corriger selon le type de question
      if (question.type === 'open_text') {
        // Les questions ouvertes nécessitent une correction manuelle
        // Pour maintenant, pas de points automatiques
        questionScore = 0;
      } else if (
        question.type === 'radio' ||
        question.type === 'table_radio' ||
        question.type === 'short_answer'
      ) {
        // Une seule réponse correcte attendue
        const selectedOpt = selected_options ? selected_options[0] : null;
        const correctOpt = correctOptions[0];

        if (selectedOpt === correctOpt?.id) {
          isCorrect = true;
          questionScore = question.points;
        }
      } else if (
        question.type === 'checkbox' ||
        question.type === 'table_checkbox'
      ) {
        // Plusieurs réponses possibles
        const selectedIds = selected_options || [];
        const correctIds = correctOptions.map(o => o.id);

        // Vérifier si toutes les bonnes réponses sont sélectionnées
        // et aucune mauvaise réponse
        const selectedSet = new Set(selectedIds);
        const correctSet = new Set(correctIds);

        if (
          selectedIds.length === correctIds.length &&
          correctIds.every(id => selectedSet.has(id))
        ) {
          isCorrect = true;
          questionScore = question.points;
        } else if (selectedIds.length > 0) {
          // Correction partielle: note par élément
          const pointsPerElement = question.points / correctIds.length;
          for (let optionId of selectedIds) {
            if (correctSet.has(optionId)) {
              questionScore += pointsPerElement;
              elementScores.push({
                option_id: optionId,
                score: pointsPerElement,
                correct: true
              });
            } else {
              elementScores.push({
                option_id: optionId,
                score: 0,
                correct: false
              });
            }
          }
        }
      } else if (question.type === 'drag_drop_image' ||
                 question.type === 'drag_drop_mapped_image' ||
                 question.type === 'drag_drop_text') {
        // Drag and drop: vérifier les positions
        const pointsPerElement = question.points / correctOptions.length;
        let correctCount = 0;

        for (let i = 0; i < selected_options?.length || 0; i++) {
          const answer_item = selected_options[i];
          const correct_item = correctOptions[i];

          if (answer_item && correct_item && answer_item.option_id === correct_item.id) {
            questionScore += pointsPerElement;
            correctCount++;
            elementScores.push({
              position: i,
              option_id: answer_item.option_id,
              correct: true,
              score: pointsPerElement
            });
          } else {
            elementScores.push({
              position: i,
              option_id: answer_item?.option_id,
              correct: false,
              score: 0
            });
          }
        }

        isCorrect = correctCount === correctOptions.length;
      } else if (question.type === 'matching') {
        // Relier les éléments
        const pointsPerElement = question.points / correctOptions.length;
        let correctCount = 0;

        // Supposant que selected_options contient des paires {source, target}
        for (let pair of selected_options || []) {
          const correctMatch = correctOptions.find(
            opt => opt.text === pair.source + '|' + pair.target
          );

          if (correctMatch) {
            questionScore += pointsPerElement;
            correctCount++;
            elementScores.push({
              pair,
              correct: true,
              score: pointsPerElement
            });
          } else {
            elementScores.push({
              pair,
              correct: false,
              score: 0
            });
          }
        }

        isCorrect = correctCount === correctOptions.length;
      }

      // Limiter la note de la question à points max
      questionScore = Math.min(questionScore, question.points);
      totalScore += questionScore;

      // Enregistrer la réponse
      await db.run(
        `INSERT INTO question_answers (
          submission_id, question_id, answer_text, selected_options,
          score, max_score, is_correct
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          submissionId,
          question_id,
          answer_text || null,
          JSON.stringify(selected_options || []),
          questionScore,
          question.points,
          isCorrect ? 1 : 0
        ]
      );

      detailedResults.push({
        question_id,
        question_title: question.title,
        question_type: question.type,
        max_points: question.points,
        earned_points: questionScore,
        is_correct: isCorrect,
        element_scores: elementScores
      });
    }

    // Mettre à jour le score total de la soumission
    await db.run(
      'UPDATE submissions SET total_score = ? WHERE id = ?',
      [totalScore, submissionId]
    );

    // Préparer la réponse avec les paramètres d'affichage
    const response = {
      submission_id: submissionId,
      total_score: totalScore,
      max_score: evaluation.total_points,
      percentage: ((totalScore / evaluation.total_points) * 100).toFixed(2),
      show_score: evaluation.show_score === 1,
      show_question_scores: evaluation.show_question_scores === 1,
      show_answers: evaluation.show_answers === 1,
      detailed_results: evaluation.show_question_scores === 1 ? detailedResults : []
    };

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Récupérer les résultats d'une soumission
router.get('/:submissionId', verifyToken, async (req, res) => {
  try {
    const submission = await db.get(
      'SELECT * FROM submissions WHERE id = ?',
      [req.params.submissionId]
    );

    if (!submission) {
      return res.status(404).json({ error: 'Soumission non trouvée' });
    }

    // Vérifier les permissions
    if (submission.student_id !== req.userId && req.userRole !== 'teacher' && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const evaluation = await db.get(
      'SELECT * FROM evaluations WHERE id = ?',
      [submission.evaluation_id]
    );

    // Si c'est un professeur, vérifier qu'il est le propriétaire
    if (req.userRole === 'teacher' && evaluation.teacher_id !== req.userId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const answers = await db.all(
      `SELECT qa.*, q.title, q.type, q.points
       FROM question_answers qa
       JOIN questions q ON qa.question_id = q.id
       WHERE qa.submission_id = ?`,
      [req.params.submissionId]
    );

    // Enrichir les réponses
    for (let answer of answers) {
      answer.selected_options = JSON.parse(answer.selected_options || '[]');
      answer.options = await db.all(
        'SELECT * FROM question_options WHERE question_id = ?',
        [answer.question_id]
      );
    }

    const response = {
      submission: {
        id: submission.id,
        total_score: submission.total_score,
        max_score: submission.max_score,
        percentage: ((submission.total_score / submission.max_score) * 100).toFixed(2),
        submitted_at: submission.submitted_at
      },
      evaluation: {
        title: evaluation.title,
        description: evaluation.description,
        show_score: evaluation.show_score === 1,
        show_question_scores: evaluation.show_question_scores === 1,
        show_answers: evaluation.show_answers === 1
      },
      answers: evaluation.show_question_scores === 1 ? answers : []
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Récupérer les soumissions pour une évaluation (professeur)
router.get('/evaluation/:evaluationId/results', verifyToken, async (req, res) => {
  try {
    const evaluation = await db.get(
      'SELECT * FROM evaluations WHERE id = ?',
      [req.params.evaluationId]
    );

    if (!evaluation) {
      return res.status(404).json({ error: 'Évaluation non trouvée' });
    }

    if (evaluation.teacher_id !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const submissions = await db.all(
      `SELECT s.*, u.firstname, u.lastname, u.email
       FROM submissions s
       JOIN users u ON s.student_id = u.id
       WHERE s.evaluation_id = ?
       ORDER BY s.submitted_at DESC`,
      [req.params.evaluationId]
    );

    const results = submissions.map(s => ({
      id: s.id,
      student_name: `${s.firstname} ${s.lastname}`,
      student_email: s.email,
      total_score: s.total_score,
      max_score: s.max_score,
      percentage: ((s.total_score / s.max_score) * 100).toFixed(2),
      submitted_at: s.submitted_at
    }));

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Récupérer l'historique des soumissions d'un élève
router.get('/student/:studentId', verifyToken, async (req, res) => {
  try {
    if (req.userId !== parseInt(req.params.studentId) && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const submissions = await db.all(
      `SELECT s.*, e.title, e.code
       FROM submissions s
       JOIN evaluations e ON s.evaluation_id = e.id
       WHERE s.student_id = ?
       ORDER BY s.submitted_at DESC`,
      [req.params.studentId]
    );

    const results = submissions.map(s => ({
      id: s.id,
      evaluation_title: s.title,
      evaluation_code: s.code,
      total_score: s.total_score,
      max_score: s.max_score,
      percentage: ((s.total_score / s.max_score) * 100).toFixed(2),
      submitted_at: s.submitted_at
    }));

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
