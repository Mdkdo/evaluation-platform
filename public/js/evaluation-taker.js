// Taker d'évaluation (pour les élèves qui passent l'évaluation)
let currentEval = null;
let currentAnswers = {};
let submissionId = null;

// Initialiser le formulaire d'évaluation
async function initEvaluationTaker() {
  const token = getToken();
  if (!token) {
    window.location.href = '/';
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const evaluationId = urlParams.get('id');
  const code = urlParams.get('code');

  if (evaluationId) {
    await loadEvaluationById(evaluationId);
  } else if (code) {
    await loadEvaluationByCode(code);
  } else {
    // L'utilisateur peut entrer le code sur le tableau de bord
  }
}

// Charger l'évaluation par ID
async function loadEvaluationById(evaluationId) {
  try {
    document.getElementById('loadingState').style.display = 'block';
    currentEval = await evaluationsAPI.getFull(evaluationId);
    displayEvaluation();
    document.getElementById('loadingState').style.display = 'none';
  } catch (error) {
    console.error('Erreur:', error);
    alert('Erreur lors du chargement de l\'évaluation');
  }
}

// Charger l'évaluation par code (depuis le tableau de bord)
async function loadEvaluationByCode() {
  const code = document.getElementById('evaluationCode').value.toUpperCase();
  if (!code) {
    alert('Veuillez entrer le code de l\'évaluation');
    return;
  }

  try {
    const eval = await evaluationsAPI.getByCode(code);
    window.location.href = `/take-evaluation.html?id=${eval.id}`;
  } catch (error) {
    alert('Évaluation non trouvée ou non publiée');
  }
}

// Afficher l'évaluation
function displayEvaluation() {
  // Afficher l'en-tête
  const header = document.getElementById('evaluationHeader');
  header.innerHTML = `
    <h2>${currentEval.title}</h2>
    <p>${currentEval.description || 'Pas de description'}</p>
    <p><strong>Points totaux: ${currentEval.total_points}</strong></p>
  `;

  // Afficher les questions
  const container = document.getElementById('questionsContainer');
  container.innerHTML = '';

  const allQuestions = [...(currentEval.questions || [])];  
  
  // Ajouter les questions des sections
  if (currentEval.sections) {
    currentEval.sections.forEach(section => {
      if (section.title) {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'question-block';
        sectionDiv.innerHTML = `<h3>${section.title}</h3><p>${section.description || ''}</p>`;
        container.appendChild(sectionDiv);
      }
      allQuestions.push(...(section.questions || []));
    });
  }

  allQuestions.forEach((question, index) => {
    const questionDiv = displayQuestion(question, index);
    container.appendChild(questionDiv);
  });
}

// Afficher une question individuelle
function displayQuestion(question, index) {
  const div = document.createElement('div');
  div.className = 'question-block';
  div.id = `question-${question.id}`;

  let options = question.options || [];
  
  // Mélanger les options si activé
  if (currentEval.shuffle_answers === 1) {
    options = [...options].sort(() => Math.random() - 0.5);
  }

  let questionHtml = `
    <h3>Question ${index + 1}</h3>
    <p>${question.title}</p>
    ${question.description ? `<p style="font-size: 14px; color: #666;">${question.description}</p>` : ''}
    ${question.image_url ? `<img src="${question.image_url}" style="max-width: 100%; margin: 10px 0; border-radius: 8px;">` : ''}
  `;

  if (question.type === 'open_text') {
    questionHtml += `
      <textarea 
        id="answer-${question.id}" 
        class="answer-option" 
        placeholder="Votre réponse..."
        style="width: 100%; min-height: 100px; padding: 10px; border: 1px solid #ddd; border-radius: 6px;"
      ></textarea>
    `;
    currentAnswers[question.id] = { type: 'text', value: '' };
  } else if (question.type === 'short_answer') {
    questionHtml += `
      <input 
        type="text" 
        id="answer-${question.id}" 
        class="answer-option" 
        placeholder="Votre réponse..."
        style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;"
      >
    `;
    currentAnswers[question.id] = { type: 'text', value: '' };
  } else if (question.type === 'radio' || question.type === 'table_radio') {
    questionHtml += '<div class="answer-options">';
    options.forEach(opt => {
      questionHtml += `
        <div class="answer-option">
          <input type="radio" name="question-${question.id}" value="${opt.id}" id="opt-${opt.id}">
          <label for="opt-${opt.id}">${opt.text}</label>
        </div>
      `;
    });
    questionHtml += '</div>';
    currentAnswers[question.id] = { type: 'radio', selected: null };
  } else if (question.type === 'checkbox' || question.type === 'table_checkbox') {
    questionHtml += '<div class="answer-options">';
    options.forEach(opt => {
      questionHtml += `
        <div class="answer-option">
          <input type="checkbox" name="question-${question.id}" value="${opt.id}" id="opt-${opt.id}">
          <label for="opt-${opt.id}">${opt.text}</label>
        </div>
      `;
    });
    questionHtml += '</div>';
    currentAnswers[question.id] = { type: 'checkbox', selected: [] };
  } else if (['drag_drop_image', 'drag_drop_mapped_image', 'drag_drop_text'].includes(question.type)) {
    questionHtml += `<p style="color: #f6ad55;">⚠ Drag & Drop à implémenter</p>`;
    questionHtml += '<div class="answer-options">';
    options.forEach(opt => {
      questionHtml += `<div class="option-item">${opt.text}</div>`;
    });
    questionHtml += '</div>';
    currentAnswers[question.id] = { type: 'drag_drop', selected: [] };
  } else if (question.type === 'matching') {
    questionHtml += `<p style="color: #f6ad55;">⚠ Matching à implémenter</p>`;
    questionHtml += '<div class="answer-options">';
    options.forEach(opt => {
      questionHtml += `<div class="option-item">${opt.text}</div>`;
    });
    questionHtml += '</div>';
    currentAnswers[question.id] = { type: 'matching', pairs: [] };
  }

  div.innerHTML = questionHtml;
  return div;
}

// Soumettre l'évaluation
document.getElementById('evaluationForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Collecter les réponses
  const answers = [];
  const allQuestions = [...(currentEval.questions || [])];
  
  if (currentEval.sections) {
    currentEval.sections.forEach(section => {
      allQuestions.push(...(section.questions || []));
    });
  }

  allQuestions.forEach(question => {
    let answerData = {
      question_id: question.id,
      answer_text: null,
      selected_options: []
    };

    if (question.type === 'open_text' || question.type === 'short_answer') {
      answerData.answer_text = document.getElementById(`answer-${question.id}`)?.value || '';
    } else if (question.type === 'radio' || question.type === 'table_radio') {
      const selected = document.querySelector(`input[name="question-${question.id}"]:checked`);
      if (selected) {
        answerData.selected_options = [parseInt(selected.value)];
      }
    } else if (question.type === 'checkbox' || question.type === 'table_checkbox') {
      const selected = document.querySelectorAll(`input[name="question-${question.id}"]:checked`);
      answerData.selected_options = Array.from(selected).map(el => parseInt(el.value));
    }

    answers.push(answerData);
  });

  try {
    const result = await submissionsAPI.submit(currentEval.id, answers);
    submissionId = result.submission_id;
    displayResults(result);
  } catch (error) {
    console.error('Erreur lors de la soumission:', error);
    alert('Erreur: ' + (error.error || 'Impossible de soumettre l\'évaluation'));
  }
});

// Afficher les résultats
function displayResults(result) {
  document.getElementById('evaluationTaker').style.display = 'none';
  document.getElementById('resultsSection').style.display = 'block';

  const content = document.getElementById('resultsContent');
  content.innerHTML = '';

  // Afficher le score si autorisé
  if (result.show_score) {
    const scoreDiv = document.createElement('div');
    scoreDiv.className = 'score-display';
    const percentage = parseFloat(result.percentage);
    const scoreColor = percentage >= 70 ? '#48bb78' : percentage >= 50 ? '#f6ad55' : '#e53e3e';
    scoreDiv.innerHTML = `
      <div class="score-value" style="color: ${scoreColor};">${result.total_score.toFixed(2)}/${result.max_score}</div>
      <div class="score-label">${result.percentage}%</div>
    `;
    content.appendChild(scoreDiv);
  }

  // Afficher les résultats détaillés des questions
  if (result.show_question_scores && result.detailed_results.length > 0) {
    const detailsDiv = document.createElement('div');
    detailsDiv.innerHTML = '<h3 style="margin-top: 20px; margin-bottom: 15px; color: #667eea;">Résultats détaillés</h3>';
    content.appendChild(detailsDiv);

    result.detailed_results.forEach((qResult, index) => {
      const resultDiv = document.createElement('div');
      const isCorrect = qResult.is_correct;
      resultDiv.className = `answer-result ${isCorrect ? 'correct' : 'incorrect'}`;

      let detailsHtml = `
        <h4>Question ${index + 1}: ${qResult.question_title}</h4>
        <div class="result-status">${isCorrect ? '✓ Correcte' : '✗ Incorrecte'}</div>
        <div class="result-details">
          Points: ${qResult.earned_points}/${qResult.max_points}
        </div>
      `;

      if (result.show_answers && qResult.element_scores.length > 0) {
        detailsHtml += '<div class="result-details" style="margin-top: 10px;"><strong>Détails par élément:</strong>';
        qResult.element_scores.forEach(elem => {
          const status = elem.correct ? '✓' : '✗';
          detailsHtml += `<br>${status} ${elem.score}/${qResult.max_points / qResult.element_scores.length}`;
        });
        detailsHtml += '</div>';
      }

      resultDiv.innerHTML = detailsHtml;
      content.appendChild(resultDiv);
    });
  }
}

window.addEventListener('DOMContentLoaded', initEvaluationTaker);
