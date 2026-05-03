const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./database');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const classesRoutes = require('./routes/classes');
const evaluationsRoutes = require('./routes/evaluations');
const questionsRoutes = require('./routes/questions');
const submissionsRoutes = require('./routes/submissions');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

// Initialiser la base de données
db.initialize();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/evaluations', evaluationsRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/submissions', submissionsRoutes);

// Route par défaut
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erreur serveur', message: err.message });
});

app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
