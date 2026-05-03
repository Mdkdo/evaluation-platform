// Application principale
let currentUser = null;
let currentUserRole = null;

// Initialiser l'application
async function initApp() {
  const token = getToken();
  
  if (!token) {
    showAuthSection();
    return;
  }

  try {
    currentUser = await authAPI.me();
    currentUserRole = currentUser.role;
    showDashboard();
  } catch (error) {
    console.error('Erreur lors de la récupération des données utilisateur:', error);
    removeToken();
    showAuthSection();
  }
}

// Afficher la section authentification
function showAuthSection() {
  document.getElementById('authSection').style.display = 'block';
  document.getElementById('dashboardSection').style.display = 'none';
}

// Afficher le tableau de bord
async function showDashboard() {
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('dashboardSection').style.display = 'block';
  
  // Afficher les informations de l'utilisateur
  const userInfoEl = document.getElementById('userInfo');
  userInfoEl.innerHTML = `
    <strong>${currentUser.firstname} ${currentUser.lastname}</strong><br>
    <small>${currentUser.email}</small>
  `;

  if (currentUserRole === 'teacher') {
    document.getElementById('teacherDashboard').style.display = 'block';
    document.getElementById('studentDashboard').style.display = 'none';
    loadTeacherDashboard();
  } else {
    document.getElementById('teacherDashboard').style.display = 'none';
    document.getElementById('studentDashboard').style.display = 'block';
    loadStudentDashboard();
  }
}

// Charger le tableau de bord professeur
async function loadTeacherDashboard() {
  // Charger les classes
  try {
    const classes = await classesAPI.getTeacherClasses(currentUser.id);
    displayClasses(classes);
  } catch (error) {
    console.error('Erreur lors du chargement des classes:', error);
  }

  // Charger les évaluations
  try {
    const evaluations = await evaluationsAPI.getTeacherEvaluations(currentUser.id);
    displayEvaluations(evaluations);
  } catch (error) {
    console.error('Erreur lors du chargement des évaluations:', error);
  }
}

// Charger le tableau de bord élève
async function loadStudentDashboard() {
  try {
    const classes = await classesAPI.getStudentClasses(currentUser.id);
    displayStudentClasses(classes);
  } catch (error) {
    console.error('Erreur lors du chargement des classes:', error);
  }

  try {
    const submissions = await submissionsAPI.getStudentSubmissions(currentUser.id);
    displayStudentResults(submissions);
  } catch (error) {
    console.error('Erreur lors du chargement des résultats:', error);
  }
}

// Afficher les classes (professeur)
function displayClasses(classes) {
  const container = document.getElementById('classesList');
  container.innerHTML = '';

  if (classes.length === 0) {
    container.innerHTML = '<p>Aucune classe pour le moment.</p>';
    return;
  }

  classes.forEach(cls => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>${cls.name}</h3>
      <p>${cls.description || 'Pas de description'}</p>
      <div class="card-code">Code: ${cls.code}</div>
      <div class="card-actions">
        <button class="btn btn-primary" onclick="loadClassStudents(${cls.id})">Voir élèves</button>
        <button class="btn btn-secondary" onclick="copyCode('${cls.code}')">Copier code</button>
      </div>
    `;
    container.appendChild(card);
  });
}

// Afficher les évaluations (professeur)
function displayEvaluations(evaluations) {
  const container = document.getElementById('evaluationsList');
  container.innerHTML = '';

  if (evaluations.length === 0) {
    container.innerHTML = '<p>Aucune évaluation pour le moment.</p>';
    return;
  }

  evaluations.forEach(eval => {
    const card = document.createElement('div');
    card.className = 'card';
    const statusBadge = eval.published === 1 ? '<span style="color: #48bb78; font-weight: bold;">✓ Publiée</span>' : '<span style="color: #f6ad55; font-weight: bold;">⚠ Brouillon</span>';
    
    card.innerHTML = `
      <h3>${eval.title}</h3>
      <p>${eval.description || 'Pas de description'}</p>
      <p>Note totale: <strong>${eval.total_points}/20</strong></p>
      <div class="card-code">Code: ${eval.code}</div>
      <p>${statusBadge}</p>
      <div class="card-actions">
        <button class="btn btn-primary" onclick="editEvaluation(${eval.id})">Éditer</button>
        <button class="btn btn-secondary" onclick="viewEvaluationResults(${eval.id})">Résultats</button>
      </div>
    `;
    container.appendChild(card);
  });
}

// Afficher les classes (élève)
function displayStudentClasses(classes) {
  const container = document.getElementById('myClassesList');
  container.innerHTML = '';

  if (classes.length === 0) {
    container.innerHTML = '<p>Vous n\'êtes inscrit dans aucune classe. Rejoignez une classe avec le code de la classe.</p>';
    return;
  }

  classes.forEach(cls => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>${cls.name}</h3>
      <p>${cls.description || 'Pas de description'}</p>
      <p><strong>Professeur:</strong> ${cls.firstname} ${cls.lastname}</p>
      <div class="card-actions">
        <button class="btn btn-primary">Voir les évaluations</button>
      </div>
    `;
    container.appendChild(card);
  });
}

// Afficher les résultats de l'élève
function displayStudentResults(submissions) {
  const container = document.getElementById('myResultsList');
  container.innerHTML = '';

  if (submissions.length === 0) {
    container.innerHTML = '<p>Vous n\'avez pas encore soumis d\'évaluation.</p>';
    return;
  }

  const table = document.createElement('table');
  table.style.cssText = 'width: 100%; border-collapse: collapse;';
  table.innerHTML = `
    <thead>
      <tr style="background: #f7fafc; border-bottom: 2px solid #e2e8f0;">
        <th style="padding: 12px; text-align: left; font-weight: 600;">Évaluation</th>
        <th style="padding: 12px; text-align: left; font-weight: 600;">Note</th>
        <th style="padding: 12px; text-align: left; font-weight: 600;">Pourcentage</th>
        <th style="padding: 12px; text-align: left; font-weight: 600;">Date</th>
        <th style="padding: 12px; text-align: left; font-weight: 600;">Actions</th>
      </tr>
    </thead>
    <tbody>
  `;

  submissions.forEach(sub => {
    const date = new Date(sub.submitted_at).toLocaleDateString('fr-FR');
    table.innerHTML += `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px;">${sub.evaluation_title}</td>
        <td style="padding: 12px;"><strong>${sub.total_score.toFixed(2)}/${sub.max_score}</strong></td>
        <td style="padding: 12px;">${sub.percentage}%</td>
        <td style="padding: 12px;">${date}</td>
        <td style="padding: 12px;">
          <button class="btn btn-primary" onclick="viewSubmissionResults(${sub.id})" style="padding: 6px 12px; font-size: 12px;">Voir</button>
        </td>
      </tr>
    `;
  });

  table.innerHTML += '</tbody>';
  container.appendChild(table);
}

// Basculer entre les onglets d'authentification
function switchTab(tab) {
  document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  
  document.getElementById(tab + 'Form').classList.add('active');
  event.target.classList.add('active');
}

// Basculer entre les onglets du tableau de bord
function switchDashboardTab(tab) {
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  document.querySelectorAll('.section-btn').forEach(btn => btn.classList.remove('active'));
  
  const tabId = currentUserRole === 'teacher' ? 
    (tab === 'classes' ? 'classesTab' : tab === 'evaluations' ? 'evaluationsTab' : 'resultsTab') :
    (tab === 'myClasses' ? 'myClassesTab' : tab === 'takeTest' ? 'takeTestTab' : 'myResultsTab');
  
  document.getElementById(tabId).classList.add('active');
  event.target.classList.add('active');
}

// Gestion de l'authentification
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const response = await authAPI.login(email, password);
    setToken(response.token);
    currentUser = response.user;
    currentUserRole = response.user.role;
    showDashboard();
  } catch (error) {
    document.getElementById('loginError').textContent = error.error || 'Erreur de connexion';
    document.getElementById('loginError').classList.add('show');
  }
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const firstname = document.getElementById('registerFirstname').value;
  const lastname = document.getElementById('registerLastname').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  const role = document.getElementById('registerRole').value;

  try {
    const response = await authAPI.register(firstname, lastname, email, password, role);
    setToken(response.token);
    currentUser = response.user;
    currentUserRole = response.user.role;
    showDashboard();
  } catch (error) {
    document.getElementById('registerError').textContent = error.error || 'Erreur lors de l\'inscription';
    document.getElementById('registerError').classList.add('show');
  }
});

// Gestion des classes
document.getElementById('createClassForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('className').value;
  const description = document.getElementById('classDescription').value;

  try {
    await classesAPI.create(name, description);
    closeModal('createClassModal');
    loadTeacherDashboard();
  } catch (error) {
    alert('Erreur: ' + (error.error || 'Impossible de créer la classe'));
  }
});

document.getElementById('enrollForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const code = document.getElementById('classCode').value;

  try {
    // Chercher la classe par code
    const classes = await classesAPI.getTeacherClasses(currentUser.id); // Ceci ne fonctionne pas pour les élèves
    alert('Fonction de recherche à implémenter avec un endpoint de recherche par code');
  } catch (error) {
    alert('Erreur: ' + (error.error || 'Impossible de rejoindre la classe'));
  }
});

// Utilitaires
function showCreateClassModal() {
  document.getElementById('createClassModal').style.display = 'flex';
}

function showEnrollModal() {
  document.getElementById('enrollModal').style.display = 'flex';
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

function copyCode(code) {
  navigator.clipboard.writeText(code);
  alert('Code copié: ' + code);
}

function redirectToCreateEvaluation() {
  window.location.href = '/create-evaluation.html';
}

function editEvaluation(evaluationId) {
  window.location.href = `/create-evaluation.html?id=${evaluationId}`;
}

function viewEvaluationResults(evaluationId) {
  // À implémenter: afficher les résultats des évaluations
  alert('Vue des résultats à implémenter');
}

function loadClassStudents(classId) {
  alert('Chargement des élèves de la classe');
}

function viewSubmissionResults(submissionId) {
  // À implémenter: afficher les résultats détaillés d'une soumission
  alert('Vue des résultats détaillés à implémenter');
}

function logout() {
  removeToken();
  showAuthSection();
  // Réinitialiser les formulaires
  document.getElementById('loginForm').reset();
  document.getElementById('registerForm').reset();
  document.getElementById('loginError').classList.remove('show');
  document.getElementById('registerError').classList.remove('show');
}

// Fermer les modals en cliquant en dehors
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.style.display = 'none';
  }
});

// Initialiser l'application au chargement
window.addEventListener('DOMContentLoaded', initApp);
