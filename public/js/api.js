// API Base URL
const API_BASE = 'http://localhost:3000/api';

// Store token in localStorage
function setToken(token) {
  localStorage.setItem('token', token);
}

function getToken() {
  return localStorage.getItem('token');
}

function removeToken() {
  localStorage.removeItem('token');
}

// API Calls
async function apiCall(endpoint, method = 'GET', data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(API_BASE + endpoint, options);
  
  if (response.status === 401) {
    removeToken();
    window.location.href = '/';
  }

  return response.json();
}

// Auth API
const authAPI = {
  register: (firstname, lastname, email, password, role) => 
    apiCall('/auth/register', 'POST', { firstname, lastname, email, password, role }),
  
  login: (email, password) => 
    apiCall('/auth/login', 'POST', { email, password }),
  
  me: () => apiCall('/auth/me', 'GET')
};

// Users API
const usersAPI = {
  get: (userId) => apiCall(`/users/${userId}`, 'GET'),
  update: (userId, firstname, lastname) => 
    apiCall(`/users/${userId}`, 'PUT', { firstname, lastname })
};

// Classes API
const classesAPI = {
  create: (name, description) => 
    apiCall('/classes', 'POST', { name, description }),
  
  getTeacherClasses: (teacherId) => 
    apiCall(`/classes/teacher/${teacherId}`, 'GET'),
  
  getStudentClasses: (studentId) => 
    apiCall(`/classes/student/${studentId}`, 'GET'),
  
  enroll: (classId) => 
    apiCall(`/classes/${classId}/enroll`, 'POST'),
  
  getStudents: (classId) => 
    apiCall(`/classes/${classId}/students`, 'GET')
};

// Evaluations API
const evaluationsAPI = {
  create: (title, description, class_id, total_points, shuffle_answers, show_score, show_question_scores, show_answers) => 
    apiCall('/evaluations', 'POST', {
      title, description, class_id, total_points,
      shuffle_answers, show_score, show_question_scores, show_answers
    }),
  
  getTeacherEvaluations: (teacherId) => 
    apiCall(`/evaluations/teacher/${teacherId}`, 'GET'),
  
  getByCode: (code) => 
    apiCall(`/evaluations/code/${code}`, 'GET'),
  
  getFull: (evaluationId) => 
    apiCall(`/evaluations/${evaluationId}/full`, 'GET'),
  
  update: (evaluationId, data) => 
    apiCall(`/evaluations/${evaluationId}`, 'PUT', data),
  
  publish: (evaluationId) => 
    apiCall(`/evaluations/${evaluationId}/publish`, 'PUT')
};

// Questions API
const questionsAPI = {
  create: (evaluation_id, section_id, type, title, description, image_url, points, order_index, options) => 
    apiCall('/questions', 'POST', {
      evaluation_id, section_id, type, title, description,
      image_url, points, order_index, options
    }),
  
  getByEvaluation: (evaluationId) => 
    apiCall(`/questions/evaluation/${evaluationId}`, 'GET'),
  
  get: (questionId) => 
    apiCall(`/questions/${questionId}`, 'GET'),
  
  update: (questionId, data) => 
    apiCall(`/questions/${questionId}`, 'PUT', data),
  
  delete: (questionId) => 
    apiCall(`/questions/${questionId}`, 'DELETE')
};

// Submissions API
const submissionsAPI = {
  submit: (evaluation_id, answers) => 
    apiCall('/submissions/submit', 'POST', { evaluation_id, answers }),
  
  get: (submissionId) => 
    apiCall(`/submissions/${submissionId}`, 'GET'),
  
  getEvaluationResults: (evaluationId) => 
    apiCall(`/submissions/evaluation/${evaluationId}/results`, 'GET'),
  
  getStudentSubmissions: (studentId) => 
    apiCall(`/submissions/student/${studentId}`, 'GET')
};
