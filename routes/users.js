const express = require('express');
const { verifyToken } = require('./auth');
const db = require('../database');

const router = express.Router();

// Récupérer les informations de l'utilisateur
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const user = await db.get(
      'SELECT id, email, firstname, lastname, role, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mettre à jour le profil
router.put('/:id', verifyToken, async (req, res) => {
  try {
    if (req.userId !== parseInt(req.params.id) && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const { firstname, lastname } = req.body;
    const result = await db.run(
      'UPDATE users SET firstname = ?, lastname = ? WHERE id = ?',
      [firstname, lastname, req.params.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({ message: 'Profil mis à jour' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
