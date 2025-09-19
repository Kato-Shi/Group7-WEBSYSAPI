(() => {
  const API_ROOT = resolveApiRoot();
  const ENDPOINTS = {
    notes: `${API_ROOT}/api/notes`,
    health: `${API_ROOT}/health`,
  };

  const state = {
    notes: [],
    editingId: null,
    filter: '',
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
    ui.filter.addEventListener('input', event => {
      state.filter = event.target.value.toLowerCase();
      renderNotes();
    });
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
      const response = await fetchJson(`${ENDPOINTS.notes}?limit=100`);
      const list = Array.isArray(response?.data) ? response.data : [];
      state.notes = list;
      renderNotes();
      setStatus('ok', 'API online');
    } catch (error) {
      console.error('Failed to load notes:', error);
      state.notes = [];
      showListMessage('Could not load notes. Maybe refresh later.');
      updateSummary(0);
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
      priority: (ui.priority.value || 'medium').toLowerCase(),
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
    ui.priority.value = note.priority || 'medium';
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
    const filtered = state.notes.filter(note => matchesFilter(note, state.filter));

    if (!filtered.length) {
      if (!state.notes.length) {
        showListMessage('No notes yet. Add something above.');
      } else {
        showListMessage('Nothing matched your filter.');
      }
      updateSummary(filtered.length);
      return;
    }

    ui.list.innerHTML = '';
    filtered.forEach(note => {
      ui.list.appendChild(createNoteCard(note));
    });
    updateSummary(filtered.length);
  }

  function showListMessage(message) {
    ui.list.innerHTML = `<p class="note-list__empty">${message}</p>`;
  }

  function updateSummary(displayedCount) {
    if (!ui.summary) return;
    const total = state.notes.length;
    if (total === 0) {
      ui.summary.textContent = 'No notes stored yet.';
      return;
    }
    const extra = displayedCount === total ? '' : ` (showing ${displayedCount} of ${total})`;
    ui.summary.textContent = `${total} ${total === 1 ? 'note' : 'notes'}${extra}`;
  }

  function matchesFilter(note, value) {
    if (!value) return true;
    const haystack = [note.title, note.content, note.category]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(value);
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

    if (note.isPinned) {
      const pin = document.createElement('span');
      pin.className = 'note-card__tag note-card__tag--pin';
      pin.textContent = 'Pinned';
      header.appendChild(pin);
    }

    card.appendChild(header);

    const meta = document.createElement('p');
    meta.className = 'note-card__meta';
    const category = note.category ? `Category: ${note.category}` : 'Category: general';
    const priority = note.priority ? `Priority: ${note.priority}` : 'Priority: medium';
    const archived = note.isArchived ? 'Archived' : 'Active';
    meta.textContent = `${category} • ${priority} • ${archived}`;
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
