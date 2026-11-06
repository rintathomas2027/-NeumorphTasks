/**
 * Neumorphism Task Management System - Client Application
 */

const API_BASE = '/api';

// Application State
const state = {
  tasks: [],
  stats: null,
  filters: {
    search: '',
    status: 'all',
    priority: 'all',
    category: 'all',
    sortBy: 'created_desc',
  },
  editingTaskId: null,
  theme: localStorage.getItem('neu-theme') || 'light',
};

// DOM Elements
const elements = {
  themeToggle: document.getElementById('theme-toggle'),
  themeIcon: document.getElementById('theme-icon'),
  newTaskBtn: document.getElementById('new-task-btn'),
  clearCompletedBtn: document.getElementById('clear-completed-btn'),
  searchInput: document.getElementById('search-input'),
  filterChips: document.querySelectorAll('.filter-chip'),
  priorityFilter: document.getElementById('priority-filter'),
  categoryFilter: document.getElementById('category-filter'),
  sortSelect: document.getElementById('sort-select'),
  taskList: document.getElementById('task-list'),
  emptyState: document.getElementById('empty-state'),
  
  // Stats
  statTotal: document.getElementById('stat-total'),
  statTodo: document.getElementById('stat-todo'),
  statInProgress: document.getElementById('stat-in-progress'),
  statCompleted: document.getElementById('stat-completed'),
  statUrgent: document.getElementById('stat-urgent'),
  progressRateText: document.getElementById('progress-rate-text'),
  progressBar: document.getElementById('progress-bar'),
  
  // Modal
  taskModal: document.getElementById('task-modal'),
  modalTitle: document.getElementById('modal-title'),
  taskForm: document.getElementById('task-form'),
  taskIdInput: document.getElementById('task-id-input'),
  taskTitleInput: document.getElementById('task-title-input'),
  taskDescInput: document.getElementById('task-desc-input'),
  taskPrioritySelect: document.getElementById('task-priority-select'),
  taskCategoryInput: document.getElementById('task-category-input'),
  taskStatusSelect: document.getElementById('task-status-select'),
  taskDueDateInput: document.getElementById('task-due-date-input'),
  modalCancelBtn: document.getElementById('modal-cancel-btn'),
  modalCloseBtn: document.getElementById('modal-close-btn'),
  
  // Toast
  toastContainer: document.getElementById('toast-container'),
};

// ==========================================
// Initialization
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  setupEventListeners();
  loadAllData();
});

function initTheme() {
  if (state.theme === 'dark') {
    document.body.classList.add('dark-theme');
    elements.themeIcon.className = 'fas fa-sun';
  } else {
    document.body.classList.remove('dark-theme');
    elements.themeIcon.className = 'fas fa-moon';
  }
}

function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-theme');
  state.theme = isDark ? 'dark' : 'light';
  localStorage.setItem('neu-theme', state.theme);
  elements.themeIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
  showToast(isDark ? 'Dark Neumorphism activated' : 'Light Neumorphism activated', 'info');
}

// ==========================================
// Event Listeners
// ==========================================
function setupEventListeners() {
  // Theme Toggle
  elements.themeToggle.addEventListener('click', toggleTheme);

  // New Task & Clear Completed
  elements.newTaskBtn.addEventListener('click', () => openTaskModal());
  elements.clearCompletedBtn.addEventListener('click', handleClearCompleted);

  // Search Debounce
  let searchTimeout = null;
  elements.searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.filters.search = e.target.value.trim();
      fetchTasks();
    }, 280);
  });

  // Status Filter Chips
  elements.filterChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      elements.filterChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      state.filters.status = chip.dataset.status;
      fetchTasks();
    });
  });

  // Select Filters
  elements.priorityFilter.addEventListener('change', (e) => {
    state.filters.priority = e.target.value;
    fetchTasks();
  });

  elements.categoryFilter.addEventListener('change', (e) => {
    state.filters.category = e.target.value;
    fetchTasks();
  });

  elements.sortSelect.addEventListener('change', (e) => {
    state.filters.sortBy = e.target.value;
    fetchTasks();
  });

  // Modal Controls
  elements.taskForm.addEventListener('submit', handleFormSubmit);
  elements.modalCancelBtn.addEventListener('click', closeTaskModal);
  elements.modalCloseBtn.addEventListener('click', closeTaskModal);

  // Close modal when clicking on backdrop
  elements.taskModal.addEventListener('click', (e) => {
    if (e.target === elements.taskModal) {
      closeTaskModal();
    }
  });

  // Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      openTaskModal();
    } else if (e.key === 'Escape' && elements.taskModal.classList.contains('open')) {
      closeTaskModal();
    }
  });
}

// ==========================================
// API Operations
// ==========================================
async function loadAllData() {
  await Promise.all([fetchTasks(), fetchStats()]);
}

async function fetchTasks() {
  try {
    const params = new URLSearchParams();
    if (state.filters.search) params.append('search', state.filters.search);
    if (state.filters.status && state.filters.status !== 'all') params.append('status', state.filters.status);
    if (state.filters.priority && state.filters.priority !== 'all') params.append('priority', state.filters.priority);
    if (state.filters.category && state.filters.category !== 'all') params.append('category', state.filters.category);
    if (state.filters.sortBy) params.append('sort_by', state.filters.sortBy);

    const res = await fetch(`${API_BASE}/tasks?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to load tasks');
    state.tasks = await res.json();
    renderTasks();
    updateCategoryDropdown();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function fetchStats() {
  try {
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error('Failed to load stats');
    state.stats = await res.json();
    renderStats();
  } catch (err) {
    console.error('Stats load error:', err);
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const title = elements.taskTitleInput.value.trim();
  if (!title) {
    showToast('Please enter a task title', 'warning');
    return;
  }

  const payload = {
    title,
    description: elements.taskDescInput.value.trim(),
    priority: elements.taskPrioritySelect.value,
    category: elements.taskCategoryInput.value.trim() || 'General',
    status: elements.taskStatusSelect.value,
    due_date: elements.taskDueDateInput.value ? new Date(elements.taskDueDateInput.value).toISOString() : null,
  };

  try {
    if (state.editingTaskId) {
      // Update
      const res = await fetch(`${API_BASE}/tasks/${state.editingTaskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to update task');
      showToast('Task updated successfully', 'success');
    } else {
      // Create
      const res = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to create task');
      showToast('New task created', 'success');
    }

    closeTaskModal();
    await loadAllData();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function toggleTaskStatus(taskId) {
  try {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/toggle`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to toggle status');
    await loadAllData();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function deleteTask(taskId) {
  if (!confirm('Are you sure you want to delete this task?')) return;

  try {
    const res = await fetch(`${API_BASE}/tasks/${taskId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete task');
    showToast('Task deleted', 'info');
    await loadAllData();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function handleClearCompleted() {
  if (!confirm('Are you sure you want to remove all completed tasks?')) return;

  try {
    const res = await fetch(`${API_BASE}/tasks/clear-completed`, { method: 'POST' });
    const data = await res.json();
    showToast(data.message || 'Completed tasks cleared', 'success');
    await loadAllData();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// ==========================================
// Rendering Functions
// ==========================================
function renderTasks() {
  elements.taskList.innerHTML = '';

  if (state.tasks.length === 0) {
    elements.emptyState.style.display = 'flex';
    return;
  }

  elements.emptyState.style.display = 'none';

  state.tasks.forEach((task) => {
    const isCompleted = task.status === 'completed';
    const isOverdue = task.due_date && !isCompleted && new Date(task.due_date) < new Date();

    const card = document.createElement('div');
    card.className = `task-card ${isCompleted ? 'completed' : ''}`;
    card.id = `task-${task.id}`;

    const formattedDue = task.due_date ? formatFriendlyDate(task.due_date) : null;

    card.innerHTML = `
      <button class="neu-checkbox-btn ${isCompleted ? 'checked' : ''}" 
              title="${isCompleted ? 'Mark as pending' : 'Mark as completed'}"
              onclick="toggleTaskStatus(${task.id})">
        <i class="fas ${isCompleted ? 'fa-check' : ''}"></i>
      </button>

      <div class="task-content">
        <div class="task-header-row">
          <h3 class="task-title">${escapeHtml(task.title)}</h3>
          <div class="task-actions">
            <button class="neu-action-btn edit-btn" title="Edit Task" onclick="openEditModal(${task.id})">
              <i class="fas fa-pen"></i>
            </button>
            <button class="neu-action-btn delete-btn" title="Delete Task" onclick="deleteTask(${task.id})">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>

        ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}

        <div class="task-meta">
          <span class="neu-badge priority-${task.priority}">
            <i class="fas fa-circle" style="font-size: 7px;"></i> ${task.priority}
          </span>
          <span class="neu-badge category-badge">
            <i class="fas fa-tag"></i> ${escapeHtml(task.category)}
          </span>
          <span class="neu-badge status-badge">
            ${task.status === 'in_progress' ? '<i class="fas fa-spinner fa-spin"></i> In Progress' : task.status}
          </span>
          ${formattedDue ? `
            <span class="neu-badge due-date ${isOverdue ? 'overdue' : ''}">
              <i class="fas fa-calendar-alt"></i> ${formattedDue} ${isOverdue ? '(Overdue)' : ''}
            </span>
          ` : ''}
        </div>
      </div>
    `;

    elements.taskList.appendChild(card);
  });
}

function renderStats() {
  if (!state.stats) return;

  elements.statTotal.textContent = state.stats.total;
  elements.statTodo.textContent = state.stats.todo;
  elements.statInProgress.textContent = state.stats.in_progress;
  elements.statCompleted.textContent = state.stats.completed;
  elements.statUrgent.textContent = state.stats.urgent;

  const rate = state.stats.completion_rate || 0;
  elements.progressRateText.textContent = `${rate}% Complete`;
  elements.progressBar.style.width = `${rate}%`;
}

function updateCategoryDropdown() {
  const currentVal = elements.categoryFilter.value;
  const categories = Array.from(new Set(state.tasks.map((t) => t.category).filter(Boolean))).sort();

  // Keep 'all' option
  elements.categoryFilter.innerHTML = '<option value="all">All Categories</option>';
  categories.forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    if (cat === currentVal) opt.selected = true;
    elements.categoryFilter.appendChild(opt);
  });
}

// ==========================================
// Modal Operations
// ==========================================
function openTaskModal(task = null) {
  state.editingTaskId = task ? task.id : null;
  elements.modalTitle.textContent = task ? 'Edit Task' : 'Create New Task';

  if (task) {
    elements.taskIdInput.value = task.id;
    elements.taskTitleInput.value = task.title;
    elements.taskDescInput.value = task.description || '';
    elements.taskPrioritySelect.value = task.priority;
    elements.taskCategoryInput.value = task.category;
    elements.taskStatusSelect.value = task.status;
    
    if (task.due_date) {
      // Format datetime-local string (YYYY-MM-DDTHH:MM)
      const d = new Date(task.due_date);
      const localISO = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      elements.taskDueDateInput.value = localISO;
    } else {
      elements.taskDueDateInput.value = '';
    }
  } else {
    elements.taskForm.reset();
    elements.taskIdInput.value = '';
    elements.taskPrioritySelect.value = 'medium';
    elements.taskCategoryInput.value = 'Work';
    elements.taskStatusSelect.value = 'todo';
    elements.taskDueDateInput.value = '';
  }

  elements.taskModal.classList.add('open');
  elements.taskTitleInput.focus();
}

function openEditModal(taskId) {
  const task = state.tasks.find((t) => t.id === taskId);
  if (task) {
    openTaskModal(task);
  }
}

function closeTaskModal() {
  elements.taskModal.classList.remove('open');
  state.editingTaskId = null;
  elements.taskForm.reset();
}

// ==========================================
// Toast Notification
// ==========================================
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `neu-toast ${type}`;
  
  let icon = 'info-circle';
  if (type === 'success') icon = 'check-circle';
  if (type === 'danger') icon = 'exclamation-circle';
  if (type === 'warning') icon = 'exclamation-triangle';

  toast.innerHTML = `<i class="fas fa-${icon}"></i> <span>${escapeHtml(message)}</span>`;
  elements.toastContainer.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// ==========================================
// Helper Utilities
// ==========================================
function formatFriendlyDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isToday) return `Today at ${timeStr}`;
  if (isTomorrow) return `Tomorrow at ${timeStr}`;

  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Expose globals for inline event handlers
window.toggleTaskStatus = toggleTaskStatus;
window.openEditModal = openEditModal;
window.deleteTask = deleteTask;
