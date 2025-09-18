(() => {
  const API_ROOT = resolveApiRoot();
  const ENDPOINTS = {
    notes: `${API_ROOT}/api/notes`,
    categories: `${API_ROOT}/api/notes/categories`,
    health: `${API_ROOT}/health`,
  };

  const state = {
    notes: [],
    categories: [],
    pagination: null,
    editingId: null,
    messageTimer: null,
    filters: {
      search: '',
      category: '',
      priority: '',
      pinned: 'all',
      archived: 'false',
      limit: 50,
    },
  };

  const elements = {
    form: document.getElementById('noteForm'),
    formHeading: document.getElementById('formHeading'),
    submitButton: document.getElementById('submitNote'),
    cancelButton: document.getElementById('cancelEdit'),
    titleInput: document.getElementById('titleInput'),
    contentInput: document.getElementById('contentInput'),
    categoryInput: document.getElementById('categoryInput'),
    priorityInput: document.getElementById('priorityInput'),
    tagsInput: document.getElementById('tagsInput'),
    pinnedInput: document.getElementById('pinnedInput'),
    archivedInput: document.getElementById('archivedInput'),
    categoryOptions: document.getElementById('categoryOptions'),
    searchInput: document.getElementById('searchInput'),
    categoryFilter: document.getElementById('categoryFilter'),
    priorityFilter: document.getElementById('priorityFilter'),
    pinnedFilter: document.getElementById('pinnedFilter'),
    archivedFilter: document.getElementById('archivedFilter'),
    notesList: document.getElementById('notesList'),
    notesSummary: document.getElementById('notesSummary'),
    notification: document.getElementById('notification'),
    apiStatus: document.getElementById('apiStatus'),
  };

  init();

  function init() {
    if (!elements.form) return;

    setStatus('loading', 'Checking API…');
    updateFormMode();
    registerEventListeners();
    refreshNotes();
    loadCategories();
    checkApiHealth();
    setInterval(checkApiHealth, 60_000);
  }

  function registerEventListeners() {
    elements.form.addEventListener('submit', handleFormSubmit);
    elements.cancelButton.addEventListener('click', cancelEditMode);

    if (elements.notification) {
      elements.notification.addEventListener('click', hideNotification);
    }

    const debouncedSearch = debounce(() => {
      state.filters.search = elements.searchInput.value.trim();
      refreshNotes();
    }, 300);
    elements.searchInput.addEventListener('input', debouncedSearch);

    elements.categoryFilter.addEventListener('change', event => {
      state.filters.category = event.target.value;
      refreshNotes();
    });

    elements.priorityFilter.addEventListener('change', event => {
      state.filters.priority = event.target.value;
      refreshNotes();
    });

    elements.pinnedFilter.addEventListener('change', event => {
      state.filters.pinned = event.target.value || 'all';
      refreshNotes();
    });

    elements.archivedFilter.addEventListener('change', event => {
      state.filters.archived = event.target.value || 'false';
      refreshNotes();
    });
  }

  async function refreshNotes() {
    setNotesPlaceholder('loading', 'Loading notes…');

    try {
      const params = new URLSearchParams();
      params.set('limit', String(state.filters.limit));
      params.set('archived', state.filters.archived);

      if (state.filters.search) params.set('search', state.filters.search);
      if (state.filters.category) params.set('category', state.filters.category);
      if (state.filters.priority) params.set('priority', state.filters.priority);
      if (state.filters.pinned !== 'all') params.set('pinned', state.filters.pinned);

      const response = await fetchJson(`${ENDPOINTS.notes}?${params.toString()}`);
      state.notes = Array.isArray(response?.data) ? response.data : [];
      state.pagination = response?.pagination || null;
      renderNotes();
      setStatus('ok', 'API ready');
    } catch (error) {
      console.error('Failed to load notes:', error);
      state.notes = [];
      state.pagination = null;
      setNotesPlaceholder('error', 'Unable to load notes. Please try again.');
      showNotification(error.message || 'Unable to load notes.', 'error');
      if (isNetworkError(error)) {
        setStatus('error', 'Cannot reach API');
      }
    }
  }

  async function loadCategories() {
    try {
      const response = await fetchJson(ENDPOINTS.categories);
      const categories = Array.isArray(response?.data) ? response.data : [];
      state.categories = [...new Set(categories.filter(Boolean))].sort((a, b) => a.localeCompare(b));
      renderCategoryControls();
    } catch (error) {
      console.warn('Unable to fetch categories:', error);
    }
  }

  function renderCategoryControls() {
    if (!elements.categoryOptions) return;

    elements.categoryOptions.innerHTML = '';
    state.categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      elements.categoryOptions.appendChild(option);
    });

    if (!elements.categoryFilter) return;

    const current = elements.categoryFilter.value;
    elements.categoryFilter.innerHTML = '';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'All categories';
    elements.categoryFilter.appendChild(defaultOption);

    const categories = [...state.categories];
    if (state.filters.category && !categories.includes(state.filters.category)) {
      categories.push(state.filters.category);
    }

    categories.sort((a, b) => a.localeCompare(b));

    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      if (category === current || category === state.filters.category) {
        option.selected = true;
      }
      elements.categoryFilter.appendChild(option);
    });
  }

  function renderNotes() {
    updateSummary();

    if (!state.notes.length) {
      setNotesPlaceholder('empty', 'No notes match your current filters.');
      return;
    }

    elements.notesList.dataset.state = 'ready';
    elements.notesList.innerHTML = '';

    const fragment = document.createDocumentFragment();
    state.notes.forEach(note => {
      fragment.appendChild(createNoteCard(note));
    });

    elements.notesList.appendChild(fragment);
  }

  function createNoteCard(note) {
    const card = document.createElement('article');
    card.className = 'note-card';
    card.dataset.pinned = note.isPinned ? 'true' : 'false';
    card.dataset.archived = note.isArchived ? 'true' : 'false';

    const header = document.createElement('div');
    header.className = 'note-card__head';

    const title = document.createElement('h3');
    title.className = 'note-card__title';
    title.textContent = note.title || 'Untitled note';
    header.appendChild(title);

    const badges = document.createElement('div');
    badges.className = 'badges';

    if (note.category) {
      badges.appendChild(createBadge(note.category));
    }

    if (note.priority) {
      badges.appendChild(createBadge(capitalize(note.priority), `badge--priority-${note.priority}`));
    }

    if (note.isPinned) {
      badges.appendChild(createBadge('Pinned', 'badge--state'));
    }

    if (note.isArchived) {
      badges.appendChild(createBadge('Archived', 'badge--archived'));
    }

    if (badges.childElementCount > 0) {
      header.appendChild(badges);
    }

    card.appendChild(header);

    const content = document.createElement('p');
    content.className = 'note-card__content';
    content.textContent = note.content || '';
    card.appendChild(content);

    const tags = Array.isArray(note.tags) ? note.tags.filter(Boolean) : [];
    if (tags.length) {
      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'note-card__tags';
      tags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.textContent = tag;
        tagsContainer.appendChild(tagElement);
      });
      card.appendChild(tagsContainer);
    }

    const footer = document.createElement('footer');
    footer.className = 'note-card__footer';

    const meta = document.createElement('div');
    meta.className = 'note-card__meta';

    const updatedSpan = document.createElement('span');
    updatedSpan.textContent = `Updated ${formatRelative(note.updatedAt)}`;
    updatedSpan.title = formatAbsolute(note.updatedAt);
    meta.appendChild(updatedSpan);

    const createdSpan = document.createElement('span');
    createdSpan.textContent = `Created ${formatRelative(note.createdAt)}`;
    createdSpan.title = formatAbsolute(note.createdAt);
    meta.appendChild(createdSpan);

    footer.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'note-card__actions';

    actions.appendChild(createActionButton('Edit', () => enterEditMode(note)));
    actions.appendChild(
      createActionButton(note.isPinned ? 'Unpin' : 'Pin', () => togglePin(note))
    );
    actions.appendChild(
      createActionButton(note.isArchived ? 'Restore' : 'Archive', () => toggleArchive(note))
    );
    actions.appendChild(createActionButton('Delete', () => deleteNote(note), 'danger'));

    footer.appendChild(actions);
    card.appendChild(footer);

    return card;
  }

  function createBadge(text, extraClass = '') {
    const badge = document.createElement('span');
    badge.className = `badge ${extraClass}`.trim();
    badge.textContent = text;
    return badge;
  }

  function createActionButton(label, handler, extraClass = '') {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    if (extraClass) {
      button.classList.add(extraClass);
    }
    button.addEventListener('click', handler);
    return button;
  }

  function updateSummary() {
    if (!elements.notesSummary) return;
    const totalShown = state.notes.length;
    const totalPinned = state.notes.filter(note => note.isPinned).length;
    const totalItems = state.pagination?.totalItems ?? totalShown;
    const currentPage = state.pagination?.currentPage ?? 1;
    const totalPages = state.pagination?.totalPages ?? 1;

    elements.notesSummary.textContent = `${totalShown} ${totalShown === 1 ? 'note' : 'notes'} shown • ${totalPinned} pinned • Page ${currentPage} of ${totalPages} • Total ${totalItems}`;
  }

  function updateFormMode() {
    const isEditing = Boolean(state.editingId);
    elements.formHeading.textContent = isEditing ? 'Edit note' : 'Create a note';
    elements.submitButton.textContent = isEditing ? 'Update note' : 'Create note';
    elements.cancelButton.classList.toggle('hidden', !isEditing);
    elements.archivedInput.disabled = !isEditing;

    if (!isEditing) {
      elements.archivedInput.checked = false;
    }
  }

  function enterEditMode(note) {
    state.editingId = note.id;
    elements.titleInput.value = note.title || '';
    elements.contentInput.value = note.content || '';
    elements.categoryInput.value = note.category || '';
    elements.priorityInput.value = note.priority || 'medium';
    elements.tagsInput.value = (Array.isArray(note.tags) ? note.tags : []).join(', ');
    elements.pinnedInput.checked = Boolean(note.isPinned);
    elements.archivedInput.checked = Boolean(note.isArchived);
    elements.archivedInput.disabled = false;
    updateFormMode();
    showNotification('Editing existing note. Submit to save changes.', 'info');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEditMode() {
    resetForm();
    showNotification('Cancelled editing mode.', 'info');
  }

  function resetForm() {
    elements.form.reset();
    elements.priorityInput.value = 'medium';
    elements.tagsInput.value = '';
    elements.pinnedInput.checked = false;
    elements.archivedInput.checked = false;
    elements.archivedInput.disabled = true;
    state.editingId = null;
    updateFormMode();
  }

  async function handleFormSubmit(event) {
    event.preventDefault();

    const payload = buildPayload();
    if (!payload.title || !payload.content) {
      showNotification('Title and content are required.', 'error');
      return;
    }

    elements.submitButton.disabled = true;
    try {
      if (state.editingId) {
        await updateExistingNote(payload);
      } else {
        await createNewNote(payload);
      }
      resetForm();
      await refreshNotes();
      await loadCategories();
    } catch (error) {
      console.error('Failed to save note:', error);
      showNotification(error.message || 'Unable to save note.', 'error');
      if (isNetworkError(error)) {
        setStatus('error', 'Cannot reach API');
      }
    } finally {
      elements.submitButton.disabled = false;
    }
  }

  function buildPayload() {
    const title = elements.titleInput.value.trim();
    const content = elements.contentInput.value.trim();
    const category = elements.categoryInput.value.trim();
    const priority = (elements.priorityInput.value || 'medium').toLowerCase();
    const tags = parseTags(elements.tagsInput.value);
    const isPinned = Boolean(elements.pinnedInput.checked);
    const isArchived = Boolean(elements.archivedInput.checked);

    const payload = {
      title,
      content,
      priority,
      tags,
      isPinned,
    };

    if (category) {
      payload.category = category;
    }

    if (state.editingId) {
      payload.isArchived = isArchived;
    }

    return payload;
  }

  async function createNewNote(payload) {
    const response = await fetchJson(ENDPOINTS.notes, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    showNotification(response?.message || 'Note created successfully.', 'success');
  }

  async function updateExistingNote(payload) {
    const response = await fetchJson(`${ENDPOINTS.notes}/${state.editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    showNotification(response?.message || 'Note updated successfully.', 'success');
    state.editingId = null;
    updateFormMode();
  }

  async function togglePin(note) {
    try {
      const response = await fetchJson(`${ENDPOINTS.notes}/${note.id}/pin`, { method: 'PATCH' });
      showNotification(response?.message || `Note ${note.isPinned ? 'unpinned' : 'pinned'}.`, 'success');
      await refreshNotes();
    } catch (error) {
      console.error('Failed to toggle pin:', error);
      showNotification(error.message || 'Unable to update pin status.', 'error');
    }
  }

  async function toggleArchive(note) {
    try {
      const response = await fetchJson(`${ENDPOINTS.notes}/${note.id}/archive`, { method: 'PATCH' });
      showNotification(response?.message || `Note ${note.isArchived ? 'restored' : 'archived'}.`, 'success');
      if (state.editingId === note.id) {
        resetForm();
      }
      await refreshNotes();
    } catch (error) {
      console.error('Failed to toggle archive:', error);
      showNotification(error.message || 'Unable to update archive status.', 'error');
    }
  }

  async function deleteNote(note) {
    const confirmed = window.confirm('Are you sure you want to permanently delete this note?');
    if (!confirmed) return;

    try {
      const response = await fetchJson(`${ENDPOINTS.notes}/${note.id}`, { method: 'DELETE' });
      showNotification(response?.message || 'Note deleted successfully.', 'success');
      if (state.editingId === note.id) {
        resetForm();
      }
      await refreshNotes();
      await loadCategories();
    } catch (error) {
      console.error('Failed to delete note:', error);
      showNotification(error.message || 'Unable to delete note.', 'error');
    }
  }

  async function checkApiHealth() {
    try {
      const response = await fetchJson(ENDPOINTS.health);
      const uptime = typeof response?.uptime === 'number' ? formatUptime(response.uptime) : null;
      setStatus('ok', uptime ? `API healthy • Uptime ${uptime}` : 'API healthy');
    } catch (error) {
      setStatus('error', 'Unable to reach API');
    }
  }

  async function fetchJson(url, options) {
    const response = await fetch(url, options);
    const text = await response.text();
    let data = null;

    if (text) {
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        data = null;
      }
    }

    if (!response.ok) {
      const message = data?.message || response.statusText || 'Request failed';
      const error = new Error(message);
      error.status = response.status;
      error.body = data;
      throw error;
    }

    return data;
  }

  function setNotesPlaceholder(stateName, message) {
    elements.notesList.dataset.state = stateName;
    elements.notesList.innerHTML = `<p class="placeholder">${message}</p>`;
    if (stateName === 'loading') {
      elements.notesSummary.textContent = 'Loading notes…';
    } else if (stateName === 'error') {
      elements.notesSummary.textContent = 'Unable to load notes.';
    }
  }

  function showNotification(message, type = 'info') {
    if (!elements.notification) return;
    elements.notification.textContent = message;
    elements.notification.dataset.type = type;
    elements.notification.classList.remove('hidden');

    if (state.messageTimer) {
      clearTimeout(state.messageTimer);
    }

    state.messageTimer = setTimeout(() => {
      hideNotification();
    }, 4000);
  }

  function hideNotification() {
    if (!elements.notification) return;
    elements.notification.classList.add('hidden');
    if (state.messageTimer) {
      clearTimeout(state.messageTimer);
      state.messageTimer = null;
    }
  }

  function setStatus(status, text) {
    if (!elements.apiStatus) return;
    elements.apiStatus.textContent = text;
    elements.apiStatus.classList.remove('status--loading', 'status--ok', 'status--error');
    elements.apiStatus.classList.add(`status--${status}`);
  }

  function parseTags(value) {
    return value
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);
  }

  function capitalize(value) {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function formatRelative(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    const diff = date.getTime() - Date.now();
    const absDiff = Math.abs(diff);
    const units = [
      { unit: 'day', ms: 86_400_000 },
      { unit: 'hour', ms: 3_600_000 },
      { unit: 'minute', ms: 60_000 },
    ];
    const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

    for (const { unit, ms } of units) {
      if (absDiff >= ms) {
        const valueRounded = Math.round(diff / ms);
        return formatter.format(valueRounded, unit);
      }
    }

    return 'just now';
  }

  function formatAbsolute(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  function formatUptime(seconds) {
    if (typeof seconds !== 'number' || Number.isNaN(seconds)) return '';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  }

  function isNetworkError(error) {
    return (
      error?.name === 'TypeError' ||
      /NetworkError|Failed to fetch|Load failed|offline/i.test(error?.message || '')
    );
  }

  function debounce(fn, wait = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(null, args), wait);
    };
  }

  function resolveApiRoot() {
    const origin = window.location.origin;
    if (origin && origin.startsWith('http')) {
      return origin.replace(/\/$/, '');
    }
    return 'http://localhost:3000';
  }
})();
