// Constructeur d'évaluations
let currentEvaluation = null;
let currentQuestions = [];
let questionEditIndex = null;

// Initialiser le constructeur d'évaluations
async function initEvaluationBuilder() {
  const token = getToken();
  if (!token) {
    window.location.href = '/';
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const evaluationId = urlParams.get('id');

  if (evaluationId) {
    // Charger une évaluation existante
    try {
      currentEvaluation = await evaluationsAPI.getFull(evaluationId);
      loadEvaluationData();
    } catch (error) {
      console.error('Erreur lors du chargement de l\'évaluation:', error);
      alert('Erreur lors du chargement de l\'évaluation');
    }
  } else {
    // Nouvelle évaluation
    currentEvaluation = {
      id: null,
      title: '',
      description: '',
      total_points: 20,
      shuffle_answers: 0,
      show_score: 1,
      show_question_scores: 1,
      show_answers: 1
    };
  }

  updatePreview();
}

// Charger les données d'une évaluation existante
function loadEvaluationData() {
  document.getElementById('evalTitle').value = currentEvaluation.title || '';
  document.getElementById('evalDescription').value = currentEvaluation.description || '';
  document.getElementById('evalPoints').value = currentEvaluation.total_points || 20;
  document.getElementById('shuffleAnswers').checked = currentEvaluation.shuffle_answers === 1;
  document.getElementById('showScore').checked = currentEvaluation.show_score === 1;
  document.getElementById('showQuestionScores').checked = currentEvaluation.show_question_scores === 1;
  document.getElementById('showAnswers').checked = currentEvaluation.show_answers === 1;

  // Charger les questions
  if (currentEvaluation.questions) {
    currentQuestions = currentEvaluation.questions;
  }
}

// Ajouter une section
function addSection() {
  const title = prompt('Titre de la section:');
  if (!title) return;

  // À implémenter: créer une section dans la base de données
  alert('Création de section à implémenter');
}

// Ajouter une question
function addQuestion() {
  questionEditIndex = null;
  resetQuestionForm();
  document.getElementById('questionModal').style.display = 'flex';
}

// Réinitialiser le formulaire de question
function resetQuestionForm() {
  document.getElementById('questionForm').reset();
  document.getElementById('optionsContainer').style.display = 'none';
  document.getElementById('optionsList').innerHTML = '';
}

// Mettre à jour le formulaire de question en fonction du type
function updateQuestionForm() {
  const type = document.getElementById('questionType').value;
  const optionsContainer = document.getElementById('optionsContainer');

  // Types qui ont besoin d'options
  const typesWithOptions = [
    'radio', 'checkbox', 'table_radio', 'table_checkbox',
    'drag_drop_image', 'drag_drop_mapped_image', 'drag_drop_text', 'matching'
  ];

  if (typesWithOptions.includes(type)) {
    optionsContainer.style.display = 'block';
  } else {
    optionsContainer.style.display = 'none';
  }
}

// Ajouter une option/réponse
function addOption() {
  const optionsList = document.getElementById('optionsList');
  const optionIndex = optionsList.children.length;

  const optionDiv = document.createElement('div');
  optionDiv.className = 'option-item';
  optionDiv.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 100px 60px; gap: 10px; align-items: center;">
      <input type="text" placeholder="Texte de l'option" class="option-text" style="padding: 8px; border: 1px solid #ddd; border-radius: 6px;">
      <input type="url" placeholder="Image (URL)" class="option-image" style="padding: 8px; border: 1px solid #ddd; border-radius: 6px;">
      <label style="display: flex; align-items: center; gap: 5px;">
        <input type="checkbox" class="option-correct">
        <span>Correcte</span>
      </label>
    </div>
    <input type="number" placeholder="Points" class="option-points" min="0" step="0.5" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; margin-top: 8px;">
    <button type="button" class="btn btn-secondary" onclick="removeOption(${optionIndex})" style="width: 100%; margin-top: 8px;">Supprimer</button>
  `;

  optionsList.appendChild(optionDiv);
}

// Supprimer une option
function removeOption(index) {
  document.getElementById('optionsList').children[index].remove();
}

// Enregistrer la question
document.getElementById('questionForm').addEventListener('submit', (e) => {
  e.preventDefault();

  const type = document.getElementById('questionType').value;
  const title = document.getElementById('questionTitle').value;
  const description = document.getElementById('questionDescription').value;
  const image_url = document.getElementById('questionImage').value;
  const points = parseFloat(document.getElementById('questionPoints').value);

  // Collecter les options si applicable
  const options = [];
  const optionsList = document.getElementById('optionsList');
  if (optionsList.style.display !== 'none') {
    Array.from(optionsList.children).forEach((optDiv, index) => {
      const textInput = optDiv.querySelector('.option-text');
      const imageInput = optDiv.querySelector('.option-image');
      const correctCheckbox = optDiv.querySelector('.option-correct');
      const pointsInput = optDiv.querySelector('.option-points');

      options.push({
        text: textInput?.value || '',
        image_url: imageInput?.value || null,
        is_correct: correctCheckbox?.checked || false,
        points: parseFloat(pointsInput?.value) || 0
      });
    });
  }

  const question = {
    type,
    title,
    description,
    image_url,
    points,
    options
  };

  if (questionEditIndex !== null) {
    // Modifier la question existante
    currentQuestions[questionEditIndex] = question;
  } else {
    // Ajouter une nouvelle question
    currentQuestions.push(question);
  }

  closeModal('questionModal');
  updatePreview();
});

// Mettre à jour l'aperçu de l'évaluation
function updatePreview() {
  const previewHeader = document.getElementById('previewHeader');
  previewHeader.innerHTML = `
    <h2>${document.getElementById('evalTitle').value || 'Sans titre'}</h2>
    <p>${document.getElementById('evalDescription').value || 'Pas de description'}</p>
    <p><strong>Points totaux: ${document.getElementById('evalPoints').value}</strong></p>
  `;

  const container = document.getElementById('questionsContainer');
  container.innerHTML = '';

  currentQuestions.forEach((question, index) => {
    const questionCard = document.createElement('div');
    questionCard.className = 'question-card';

    let optionsHtml = '';
    if (question.options && question.options.length > 0) {
      optionsHtml = '<div style="margin-top: 10px;">';
      question.options.forEach(opt => {
        const correctClass = opt.is_correct ? 'correct' : 'incorrect';
        optionsHtml += `
          <div class="option-item ${correctClass}">
            ${opt.text}${opt.is_correct ? ' ✓' : ''}
          </div>
        `;
      });
      optionsHtml += '</div>';
    }

    questionCard.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start;">
        <div style="flex: 1;">
          <h4>Question ${index + 1} (${question.type}) - ${question.points} pts</h4>
          <p>${question.title}</p>
          ${question.description ? `<p style="font-size: 12px; color: #666;">${question.description}</p>` : ''}
          ${optionsHtml}
        </div>
        <div style="display: flex; gap: 5px;">
          <button class="btn btn-secondary" onclick="editQuestion(${index})" style="padding: 6px 12px; font-size: 12px;">Éditer</button>
          <button class="btn btn-secondary" onclick="deleteQuestion(${index})" style="padding: 6px 12px; font-size: 12px;">Supprimer</button>
        </div>
      </div>
    `;

    container.appendChild(questionCard);
  });
}

// Éditer une question
function editQuestion(index) {
  questionEditIndex = index;
  const question = currentQuestions[index];

  document.getElementById('questionType').value = question.type;
  document.getElementById('questionTitle').value = question.title;
  document.getElementById('questionDescription').value = question.description || '';
  document.getElementById('questionImage').value = question.image_url || '';
  document.getElementById('questionPoints').value = question.points;

  updateQuestionForm();

  // Ajouter les options
  const optionsList = document.getElementById('optionsList');
  optionsList.innerHTML = '';
  if (question.options) {
    question.options.forEach((opt, optIndex) => {
      const optionDiv = document.createElement('div');
      optionDiv.className = 'option-item';
      optionDiv.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 100px 60px; gap: 10px; align-items: center;">
          <input type="text" placeholder="Texte de l'option" class="option-text" value="${opt.text}" style="padding: 8px; border: 1px solid #ddd; border-radius: 6px;">
          <input type="url" placeholder="Image (URL)" class="option-image" value="${opt.image_url || ''}" style="padding: 8px; border: 1px solid #ddd; border-radius: 6px;">
          <label style="display: flex; align-items: center; gap: 5px;">
            <input type="checkbox" class="option-correct" ${opt.is_correct ? 'checked' : ''}>
            <span>Correcte</span>
          </label>
        </div>
        <input type="number" placeholder="Points" class="option-points" value="${opt.points || 0}" min="0" step="0.5" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; margin-top: 8px;">
        <button type="button" class="btn btn-secondary" onclick="removeOption(${optIndex})" style="width: 100%; margin-top: 8px;">Supprimer</button>
      `;
      optionsList.appendChild(optionDiv);
    });
  }

  document.getElementById('questionModal').style.display = 'flex';
}

// Supprimer une question
function deleteQuestion(index) {
  if (confirm('Êtes-vous sûr de vouloir supprimer cette question?')) {
    currentQuestions.splice(index, 1);
    updatePreview();
  }
}

// Enregistrer l'évaluation
async function saveEvaluation() {
  const title = document.getElementById('evalTitle').value;
  if (!title) {
    alert('Veuillez entrer un titre pour l\'évaluation');
    return;
  }

  try {
    const description = document.getElementById('evalDescription').value;
    const total_points = parseFloat(document.getElementById('evalPoints').value);
    const shuffle_answers = document.getElementById('shuffleAnswers').checked;
    const show_score = document.getElementById('showScore').checked;
    const show_question_scores = document.getElementById('showQuestionScores').checked;
    const show_answers = document.getElementById('showAnswers').checked;

    if (!currentEvaluation.id) {
      // Créer une nouvelle évaluation
      const response = await evaluationsAPI.create(
        title, description, null, total_points,
        shuffle_answers, show_score, show_question_scores, show_answers
      );
      currentEvaluation.id = response.evaluation.id;
    } else {
      // Mettre à jour l'évaluation existante
      await evaluationsAPI.update(currentEvaluation.id, {
        title, description, total_points,
        shuffle_answers, show_score, show_question_scores, show_answers
      });
    }

    // Enregistrer les questions
    for (let i = 0; i < currentQuestions.length; i++) {
      const question = currentQuestions[i];
      await questionsAPI.create(
        currentEvaluation.id,
        null,
        question.type,
        question.title,
        question.description,
        question.image_url,
        question.points,
        i,
        question.options
      );
    }

    alert('Évaluation enregistrée avec succès!');
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement:', error);
    alert('Erreur: ' + (error.error || 'Impossible d\'enregistrer l\'évaluation'));
  }
}

// Publier l'évaluation
async function publishEvaluation() {
  if (!currentEvaluation.id) {
    alert('Veuillez d\'abord enregistrer l\'évaluation');
    return;
  }

  try {
    await evaluationsAPI.publish(currentEvaluation.id);
    alert(`Évaluation publiée!\nCode de partage: ${currentEvaluation.code}`);
  } catch (error) {
    alert('Erreur: ' + (error.error || 'Impossible de publier l\'évaluation'));
  }
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.style.display = 'none';
  }
});

window.addEventListener('DOMContentLoaded', initEvaluationBuilder);
