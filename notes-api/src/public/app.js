(() => {
  const API_ROOT = resolveApiRoot();
  const ENDPOINTS = {
    notes: `${API_ROOT}/api/notes`,
    health: `${API_ROOT}/health`,
  };

  const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

  const state = {
    notes: [],
    editingId: null,
    searchTerm: '',
    statusFilter: 'active',
    priorityFilter: 'all',
    pinnedOnly: false,
    messageTimer: null,
  };

  const ui = {
    form: document.getElementById('noteForm'),
    heading: document.getElementById('formHeading'),
    cancel: document.getElementById('cancelEdit'),
    title: document.getElementById('titleField'),
    category: document.getElementById('categoryField'),
    content: document.getElementById('contentField'),
    priority: document.getElementById('priorityField'),
    pinned: document.getElementById('pinnedField'),
    archived: document.getElementById('archivedField'),
    submit: document.getElementById('submitNote'),
    message: document.getElementById('messageBox'),
    status: document.getElementById('apiStatus'),
    filter: document.getElementById('filterInput'),
    statusFilter: document.getElementById('statusFilter'),
    priorityFilter: document.getElementById('priorityFilter'),
    filterPinned: document.getElementById('pinnedFilter'),
    list: document.getElementById('notesList'),
    summary: document.getElementById('notesCount'),
  };

  const STATUS_STYLES = {
    loading: 'status-badge status-badge--loading',
    ok: 'status-badge status-badge--ok',
    error: 'status-badge status-badge--error',
  };

  const MESSAGE_STYLES = {
    info: 'message message--info',
    success: 'message message--success',
    error: 'message message--error',
  };

  init();

  function init() {
    if (!ui.form) return;

    ui.form.addEventListener('submit', handleSubmit);
    ui.form.addEventListener('reset', event => {
      event.preventDefault();
      resetForm();
    });
    ui.cancel.addEventListener('click', () => resetForm(true));

    if (ui.filter) {
      state.searchTerm = ui.filter.value || '';
      ui.filter.addEventListener('input', event => {
        state.searchTerm = event.target.value;
        renderNotes();
      });
    }

    if (ui.statusFilter) {
      ui.statusFilter.value = state.statusFilter;
      ui.statusFilter.addEventListener('change', event => {
        state.statusFilter = event.target.value;
        renderNotes();
      });
    }

    if (ui.priorityFilter) {
      ui.priorityFilter.value = state.priorityFilter;
      ui.priorityFilter.addEventListener('change', event => {
        state.priorityFilter = event.target.value;
        renderNotes();
      });
    }

    if (ui.filterPinned) {
      ui.filterPinned.checked = state.pinnedOnly;
      ui.filterPinned.addEventListener('change', event => {
        state.pinnedOnly = Boolean(event.target.checked);
        renderNotes();
      });
    }
    if (ui.message) {
      ui.message.addEventListener('click', () => hideMessage(true));
    }

    updateFormMode();
    setStatus('loading', 'Checking API...');
    loadNotes();
    checkApiHealth();
    setInterval(checkApiHealth, 60_000);
  }

  async function loadNotes() {
    showListMessage('Loading notes...');

    try {
      const response = await fetchJson(`${ENDPOINTS.notes}?limit=100&archived=all`);
      const list = Array.isArray(response?.data) ? response.data : [];
      state.notes = list;
      renderNotes();
      setStatus('ok', 'API online');
    } catch (error) {
      console.error('Failed to load notes:', error);
      state.notes = [];
      showListMessage('Could not load notes. Maybe refresh later.');
      updateSummary([]);
      setStatus('error', 'API offline');
      showMessage(error.message || 'Unable to reach the API.', 'error');
    }
  }

  async function checkApiHealth() {
    try {
      const response = await fetchJson(ENDPOINTS.health);
      const uptime = formatUptime(response?.uptime);
      const label = uptime ? `API online • up ${uptime}` : 'API online';
      setStatus('ok', label);
    } catch (error) {
      setStatus('error', 'API offline');
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const payload = buildPayload();
    if (!payload.title || !payload.content) {
      showMessage('title and content are both required.', 'error');
      return;
    }

    ui.submit.disabled = true;
    const originalText = ui.submit.textContent;
    ui.submit.textContent = state.editingId ? 'Saving changes...' : 'Saving note...';

    try {
      if (state.editingId) {
        await updateExistingNote(payload);
        showMessage('note updated!', 'success');
      } else {
        await createNewNote(payload);
        showMessage('note created!', 'success');
      }
      resetForm();
      await loadNotes();
    } catch (error) {
      console.error('Save failed:', error);
      showMessage(error.message || 'Saving did not work.', 'error');
    } finally {
      ui.submit.disabled = false;
      ui.submit.textContent = originalText;
    }
  }

  function buildPayload() {
    const payload = {
      title: ui.title.value.trim(),
      content: ui.content.value.trim(),
      priority: normalizePriority(ui.priority.value),
      isPinned: Boolean(ui.pinned.checked),
    };

    const category = ui.category.value.trim();
    if (category) {
      payload.category = category;
    }

    if (state.editingId) {
      payload.isArchived = Boolean(ui.archived.checked);
    }

    return payload;
  }

  async function createNewNote(payload) {
    await fetchJson(ENDPOINTS.notes, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async function updateExistingNote(payload) {
    await fetchJson(`${ENDPOINTS.notes}/${state.editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    state.editingId = null;
  }

  async function togglePin(note) {
    try {
      await fetchJson(`${ENDPOINTS.notes}/${note.id}/pin`, { method: 'PATCH' });
      showMessage(note.isPinned ? 'note unpinned.' : 'note pinned.', 'info');
      await loadNotes();
    } catch (error) {
      console.error('Pin toggle failed:', error);
      showMessage(error.message || 'Could not change pin state.', 'error');
    }
  }

  async function toggleArchive(note) {
    try {
      await fetchJson(`${ENDPOINTS.notes}/${note.id}/archive`, { method: 'PATCH' });
      showMessage(note.isArchived ? 'note restored.' : 'note archived.', 'info');
      if (state.editingId === note.id) {
        resetForm();
      }
      await loadNotes();
    } catch (error) {
      console.error('Archive toggle failed:', error);
      showMessage(error.message || 'Could not change archive state.', 'error');
    }
  }

  async function deleteNote(note) {
    const confirmed = window.confirm('Delete this note for good?');
    if (!confirmed) return;

    try {
      await fetchJson(`${ENDPOINTS.notes}/${note.id}`, { method: 'DELETE' });
      showMessage('note deleted.', 'info');
      if (state.editingId === note.id) {
        resetForm();
      }
      await loadNotes();
    } catch (error) {
      console.error('Delete failed:', error);
      showMessage(error.message || 'Could not delete the note.', 'error');
    }
  }

  function enterEditMode(note) {
    state.editingId = note.id;
    ui.title.value = note.title || '';
    ui.category.value = note.category || '';
    ui.content.value = note.content || '';
    ui.priority.value = normalizePriority(note.priority);
    ui.pinned.checked = Boolean(note.isPinned);
    ui.archived.checked = Boolean(note.isArchived);
    ui.archived.disabled = false;
    updateFormMode();
    showMessage('editing existing note — do not forget to save.', 'info');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm(showNotice = false) {
    ui.title.value = '';
    ui.category.value = '';
    ui.content.value = '';
    ui.priority.value = 'medium';
    ui.pinned.checked = false;
    ui.archived.checked = false;
    ui.archived.disabled = true;
    state.editingId = null;
    updateFormMode();
    if (showNotice) {
      showMessage('back to new note mode.', 'info');
    }
  }

  function updateFormMode() {
    const editing = Boolean(state.editingId);
    ui.heading.textContent = editing ? 'Edit note' : 'Create a note';
    ui.submit.textContent = editing ? 'Save changes' : 'Save note';
    ui.cancel.classList.toggle('hidden', !editing);
    ui.archived.disabled = !editing;
  }

  function renderNotes() {
    if (!state.notes.length) {
      showListMessage('No notes yet. Add something above.');
      updateSummary([]);
      return;
    }

    const baseMatches = state.notes.filter(
      note => matchesStatus(note, state.statusFilter) && matchesPriority(note, state.priorityFilter)
    );

    const searchMatches = baseMatches.filter(note => matchesSearch(note, state.searchTerm));
    const pinnedMatches = searchMatches.filter(note => note.isPinned);
    const finalMatches = state.pinnedOnly ? pinnedMatches : searchMatches;

    if (!finalMatches.length) {
      const message = buildEmptyMessage({ baseMatches, searchMatches, pinnedMatches });
      showListMessage(message);
      updateSummary([]);
      return;
    }

    const sorted = [...finalMatches].sort(compareNotes);

    ui.list.innerHTML = '';
    sorted.forEach(note => {
      ui.list.appendChild(createNoteCard(note));
    });
    updateSummary(sorted);
  }

  function showListMessage(message) {
    ui.list.innerHTML = `<p class="note-list__empty">${message}</p>`;
  }

  function updateSummary(visibleNotes) {
    if (!ui.summary) return;
    const total = state.notes.length;
    if (total === 0) {
      ui.summary.textContent = 'No notes stored yet.';
      return;
    }

    const activeCount = state.notes.filter(note => !note.isArchived).length;
    const archivedCount = total - activeCount;
    const pinnedCount = state.notes.filter(note => note.isPinned).length;
    const shown = visibleNotes.length;

    const parts = [
      `${total} ${total === 1 ? 'note' : 'notes'} total`,
      `Active ${activeCount}`,
      `Archived ${archivedCount}`,
      `Pinned ${pinnedCount}`,
      `${shown} ${shown === 1 ? 'note' : 'notes'} shown`,
    ];

    const filters = [];
    if (state.statusFilter !== 'all') {
      filters.push(state.statusFilter === 'active' ? 'active only' : 'archived only');
    }
    if (state.priorityFilter !== 'all') {
      filters.push(`${formatPriority(state.priorityFilter)} priority`);
    }
    if (state.pinnedOnly) {
      filters.push('pinned only');
    }
    const searchText = state.searchTerm.trim();
    if (searchText) {
      filters.push(`search "${searchText}"`);
    }
    if (filters.length) {
      parts.push(`Filters: ${filters.join(', ')}`);
    }

    ui.summary.textContent = parts.join(' • ');
  }

  function buildEmptyMessage({ baseMatches, searchMatches, pinnedMatches }) {
    if (!state.notes.length) {
      return 'No notes yet. Add something above.';
    }

    if (!baseMatches.length) {
      if (state.statusFilter === 'archived') {
        return 'No archived notes yet.';
      }
      if (state.statusFilter === 'active') {
        return 'All saved notes are archived right now.';
      }
      if (state.priorityFilter !== 'all') {
        return 'No notes with that priority yet.';
      }
    }

    if (!searchMatches.length && state.searchTerm.trim()) {
      return 'Nothing matched your search.';
    }

    if (state.pinnedOnly && !pinnedMatches.length) {
      return 'No pinned notes match those filters.';
    }

    return 'Nothing matched your filters.';
  }

  function matchesSearch(note, query) {
    const value = (query || '').trim().toLowerCase();
    if (!value) return true;
    const haystack = [note.title, note.content, note.category]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(value);
  }

  function matchesStatus(note, filterValue) {
    if (!filterValue || filterValue === 'all') return true;
    if (filterValue === 'archived') return Boolean(note.isArchived);
    return !note.isArchived;
  }

  function matchesPriority(note, filterValue) {
    if (!filterValue || filterValue === 'all') return true;
    return normalizePriority(note.priority) === normalizePriority(filterValue);
  }

  function compareNotes(a, b) {
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }
    if (a.isArchived !== b.isArchived) {
      return a.isArchived ? 1 : -1;
    }

    const priorityDiff =
      (PRIORITY_ORDER[normalizePriority(a.priority)] ?? PRIORITY_ORDER.medium) -
      (PRIORITY_ORDER[normalizePriority(b.priority)] ?? PRIORITY_ORDER.medium);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    if (!Number.isNaN(timeA) && !Number.isNaN(timeB) && timeA !== timeB) {
      return timeB - timeA;
    }

    return String(a.title || '').localeCompare(String(b.title || ''));
  }

  function normalizePriority(value) {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(PRIORITY_ORDER, normalized)) {
      return normalized;
    }
    return 'medium';
  }

  function formatPriority(value) {
    const normalized = normalizePriority(value);
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  function createNoteCard(note) {
    const card = document.createElement('article');
    card.className = 'note-card';
    if (note.isArchived) {
      card.classList.add('note-card--archived');
    }

    const header = document.createElement('div');
    header.className = 'note-card__top';

    const title = document.createElement('h3');
    title.className = 'note-card__title';
    title.textContent = note.title || 'Untitled note';
    header.appendChild(title);

    const tags = document.createElement('div');
    tags.className = 'note-card__tags';

    if (note.isPinned) {
      const pin = document.createElement('span');
      pin.className = 'note-card__tag note-card__tag--pin';
      pin.textContent = 'Pinned';
      tags.appendChild(pin);
    }

    const priorityKey = normalizePriority(note.priority);
    const priorityTag = document.createElement('span');
    priorityTag.className = `note-card__tag note-card__tag--priority note-card__tag--priority-${priorityKey}`;
    priorityTag.textContent = `${formatPriority(priorityKey)} priority`;
    tags.appendChild(priorityTag);

    if (note.isArchived) {
      const archivedTag = document.createElement('span');
      archivedTag.className = 'note-card__tag note-card__tag--archived';
      archivedTag.textContent = 'Archived';
      tags.appendChild(archivedTag);
    }

    if (tags.children.length) {
      header.appendChild(tags);
    }

    card.appendChild(header);

    const meta = document.createElement('p');
    meta.className = 'note-card__meta';
    const categoryLabel = (note.category || 'general').toString().trim() || 'general';
    const priorityLabel = formatPriority(note.priority);
    const statusLabel = note.isArchived ? 'Archived' : 'Active';
    meta.textContent = `Category: ${categoryLabel} • Priority: ${priorityLabel} • ${statusLabel}`;
    card.appendChild(meta);

    const body = document.createElement('p');
    body.className = 'note-card__body';
    body.textContent = note.content || '';
    card.appendChild(body);

    const dates = document.createElement('p');
    dates.className = 'note-card__dates';
    dates.textContent = `Updated ${formatDate(note.updatedAt)} • Created ${formatDate(note.createdAt)}`;
    card.appendChild(dates);

    const buttons = document.createElement('div');
    buttons.className = 'note-card__actions';

    buttons.appendChild(makeButton('Edit', 'btn btn--primary btn--small', () => enterEditMode(note)));
    buttons.appendChild(
      makeButton(note.isPinned ? 'Unpin' : 'Pin', 'btn btn--ghost btn--small', () => togglePin(note))
    );
    buttons.appendChild(
      makeButton(note.isArchived ? 'Restore' : 'Archive', 'btn btn--ghost btn--small', () => toggleArchive(note))
    );
    buttons.appendChild(makeButton('Delete', 'btn btn--danger btn--small', () => deleteNote(note)));

    card.appendChild(buttons);

    return card;
  }

  function makeButton(label, classes, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.className = classes;
    button.addEventListener('click', handler);
    return button;
  }

  function showMessage(text, type = 'info') {
    if (!ui.message) return;
    const classes = MESSAGE_STYLES[type] || MESSAGE_STYLES.info;
    ui.message.textContent = text;
    ui.message.className = classes;
    ui.message.classList.remove('hidden');

    if (state.messageTimer) {
      clearTimeout(state.messageTimer);
    }
    state.messageTimer = setTimeout(() => hideMessage(), 4000);
  }

  function hideMessage(force = false) {
    if (!ui.message) return;
    ui.message.classList.add('hidden');
    if (force) {
      ui.message.textContent = '';
    }
    if (state.messageTimer) {
      clearTimeout(state.messageTimer);
      state.messageTimer = null;
    }
  }

  function setStatus(kind, text) {
    if (!ui.status) return;
    const classes = STATUS_STYLES[kind] || STATUS_STYLES.loading;
    ui.status.textContent = text;
    ui.status.className = classes;
  }

  async function fetchJson(url, options) {
    const response = await fetch(url, options);
    const text = await response.text();
    let data = null;

    if (text) {
      try {
        data = JSON.parse(text);
      } catch (error) {
        data = null;
      }
    }

    if (!response.ok) {
      const message = data?.message || response.statusText || 'Request failed';
      const err = new Error(message);
      err.status = response.status;
      err.body = data;
      throw err;
    }

    return data;
  }

  function formatDate(value) {
    if (!value) return 'some time ago';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString();
  }

  function formatUptime(seconds) {
    if (typeof seconds !== 'number' || Number.isNaN(seconds)) return '';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  }

  function resolveApiRoot() {
    const { origin } = window.location;
    if (origin && origin.startsWith('http')) {
      return origin.replace(/\/$/, '');
    }
    return 'http://localhost:3000';
  }
})();
