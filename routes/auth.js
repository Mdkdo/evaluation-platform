const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';

// Middleware pour vérifier le token
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token manquant' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token invalide' });
  }
};

// Inscription
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstname, lastname, role } = req.body;
    
    if (!email || !password || !firstname || !lastname || !role) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    // Vérifier si l'utilisateur existe
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    const result = await db.run(
      'INSERT INTO users (email, password, firstname, lastname, role) VALUES (?, ?, ?, ?, ?)',
      [email, hashedPassword, firstname, lastname, role]
    );

    const token = jwt.sign(
      { id: result.id, email, role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Inscription réussie',
      token,
      user: { id: result.id, email, firstname, lastname, role }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Connexion
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    
    if (!user) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Connexion réussie',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await db.get('SELECT id, email, firstname, lastname, role FROM users WHERE id = ?', [req.userId]);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
module.exports.verifyToken = verifyToken;
