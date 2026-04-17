// DOM elements
const form = document.getElementById('searchForm');
const wordInput = document.getElementById('wordInput');
const resultsDiv = document.getElementById('results');
const wotdContent = document.getElementById('wotdContent');
const refreshWotdBtn = document.getElementById('refreshWotd');

// Modals & Navigation
const savedModal = document.getElementById('savedModal');
const signupModal = document.getElementById('signupModal');
const homeBtn = document.getElementById('homeBtn');
const savedBtn = document.getElementById('savedBtn');
const signupBtn = document.getElementById('signupBtn');
const closeModals = document.querySelectorAll('.close-modal');
const savedWordsListDiv = document.getElementById('savedWordsList');

// Theme toggle button
const themeToggle = document.getElementById('themeToggle');

// Mock authentication (localStorage)
let currentUser = localStorage.getItem('wordlyUser') || null;

// --- THEME TOGGLE (navy blue / light) ---
// Load saved theme preference
if (localStorage.getItem('wordlyTheme') === 'navy') {
  document.body.classList.add('navy-theme');
  if (themeToggle) {
    const icon = themeToggle.querySelector('i');
    icon.classList.remove('fa-moon');
    icon.classList.add('fa-sun');
  }
}
// Add event listener if button exists
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('navy-theme');
    const isNavy = document.body.classList.contains('navy-theme');
    const icon = themeToggle.querySelector('i');
    if (isNavy) {
      icon.classList.remove('fa-moon');
      icon.classList.add('fa-sun');
      localStorage.setItem('wordlyTheme', 'navy');
    } else {
      icon.classList.remove('fa-sun');
      icon.classList.add('fa-moon');
      localStorage.setItem('wordlyTheme', 'light');
    }
  });
}

// --- Saved Words CRUD (using localStorage as mock backend) ---
// GET saved words
function getSavedWords() {
  if (!currentUser) return [];
  const key = `savedWords_${currentUser}`;
  return JSON.parse(localStorage.getItem(key)) || [];
}

// POST (save a new word)
function saveWord(word, definitionPreview = '') {
  if (!currentUser) {
    alert('Please sign up first to save words.');
    return false;
  }
  const saved = getSavedWords();
  if (saved.find(w => w.word === word)) {
    alert('Word already saved!');
    return false;
  }
  saved.push({ word, definitionPreview, note: '' });
  localStorage.setItem(`savedWords_${currentUser}`, JSON.stringify(saved));
  return true;
}

// DELETE a saved word
function deleteSavedWord(word) {
  let saved = getSavedWords();
  saved = saved.filter(w => w.word !== word);
  localStorage.setItem(`savedWords_${currentUser}`, JSON.stringify(saved));
  renderSavedWordsList();
}

// PATCH (update note for a saved word)
function updateWordNote(word, newNote) {
  let saved = getSavedWords();
  const item = saved.find(w => w.word === word);
  if (item) {
    item.note = newNote;
    localStorage.setItem(`savedWords_${currentUser}`, JSON.stringify(saved));
    renderSavedWordsList();
  }
}

// Render saved words in modal
function renderSavedWordsList() {
  if (!savedWordsListDiv) return;
  const saved = getSavedWords();
  if (saved.length === 0) {
    savedWordsListDiv.innerHTML = '<p>No saved words yet. Search and save some!</p>';
    return;
  }
  savedWordsListDiv.innerHTML = saved.map(item => `
    <div class="saved-word-item" data-word="${item.word}">
      <div class="saved-word-info">
        <div class="saved-word-word">${item.word}</div>
        <div class="saved-word-note">${item.note || 'No notes'}</div>
      </div>
      <div class="saved-word-actions">
        <button class="edit-note-btn" data-word="${item.word}"><i class="fas fa-edit"></i></button>
        <button class="delete-word-btn" data-word="${item.word}"><i class="fas fa-trash"></i></button>
      </div>
    </div>
  `).join('');

  // Attach event listeners for edit/delete
  document.querySelectorAll('.edit-note-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const word = btn.getAttribute('data-word');
      const newNote = prompt('Enter a note for this word:', getSavedWords().find(w => w.word === word)?.note || '');
      if (newNote !== null) updateWordNote(word, newNote);
    });
  });
  document.querySelectorAll('.delete-word-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const word = btn.getAttribute('data-word');
      if (confirm(`Delete "${word}" from saved words?`)) deleteSavedWord(word);
    });
  });
}

// --- Helper: display error ---
function showError(message, target = resultsDiv) {
  target.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> ${message}</div>`;
}
function showLoading(target = resultsDiv) {
  target.innerHTML = '<div class="info-message"><i class="fas fa-spinner fa-pulse"></i> Loading...</div>';
}

// --- Core fetch & display ---
async function fetchWordData(word) {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 404) throw new Error(`"${word}" not found.`);
    throw new Error('API request failed.');
  }
  return await response.json();
}

async function fetchAndDisplayWord(word, targetElement = resultsDiv) {
  showLoading(targetElement);
  try {
    const data = await fetchWordData(word);
    displayWordData(data, targetElement);
  } catch (error) {
    showError(error.message, targetElement);
  }
}

// --- DISPLAY FUNCTION WITH AUDIO ICON BUTTON (instead of full player) ---
function displayWordData(data, container) {
  const entry = data[0];
  const word = entry.word;
  const phonetic = entry.phonetic || entry.phonetics?.find(p => p.text)?.text || 'Pronunciation not available';
  const audioObj = entry.phonetics?.find(p => p.audio && p.audio.trim() !== '');
  const audioUrl = audioObj ? audioObj.audio : null;
  const definitionPreview = entry.meanings[0]?.definitions[0]?.definition.substring(0, 100) || '';

  let html = `
    <div class="word-header">
      <h2>${word}</h2>
      <span class="phonetic">${phonetic}</span>
    </div>
  `;

  // Audio icon button instead of full <audio> player
  if (audioUrl) {
    html += `
      <button class="audio-icon-btn" data-audio="${audioUrl}" aria-label="Play pronunciation">
        <i class="fas fa-volume-up"></i> Listen
      </button>
    `;
  } else {
    html += `<p class="no-audio"><i class="fas fa-volume-mute"></i> No audio pronunciation available.</p>`;
  }

  entry.meanings.forEach(meaning => {
    const partOfSpeech = meaning.partOfSpeech;
    meaning.definitions.forEach((def, idx) => {
      html += `
        <div class="definition-card">
          <div class="part-of-speech">${partOfSpeech}${idx > 0 ? ` (sense ${idx+1})` : ''}</div>
          <div class="definition-text"><i class="fas fa-book"></i> ${def.definition}</div>
          ${def.example ? `<div class="example-text"><i class="fas fa-quote-left"></i> ${def.example}</div>` : ''}
        </div>
      `;
    });
    if (meaning.synonyms && meaning.synonyms.length) {
      html += `<div class="synonyms-block"><i class="fas fa-link"></i> <strong>Synonyms:</strong> ${meaning.synonyms.join(', ')}</div>`;
    }
  });

  html += `<button class="save-word-btn" data-word="${word}" data-def="${definitionPreview}"><i class="fas fa-save"></i> Save this word</button>`;
  container.innerHTML = html;

  // Attach audio play event to the icon button
  const audioBtn = container.querySelector('.audio-icon-btn');
  if (audioBtn) {
    audioBtn.addEventListener('click', () => {
      const url = audioBtn.getAttribute('data-audio');
      if (url) {
        new Audio(url).play().catch(e => console.log('Audio play failed:', e));
      }
    });
  }

  // Attach save button event
  const saveBtn = container.querySelector('.save-word-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', (e) => {
      const w = saveBtn.getAttribute('data-word');
      const def = saveBtn.getAttribute('data-def');
      if (saveWord(w, def)) {
        alert(`"${w}" saved!`);
        saveBtn.textContent = ' Saved!';
        saveBtn.disabled = true;
      }
    });
  }
}

// --- Form submission ---
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const word = wordInput.value.trim();
  if (!word) return showError('Please enter a word to search.');
  fetchAndDisplayWord(word);
});

// --- Popular words click ---
document.querySelectorAll('.popular-word').forEach(btn => {
  btn.addEventListener('click', () => {
    const word = btn.getAttribute('data-word');
    wordInput.value = word;
    fetchAndDisplayWord(word);
  });
});

// --- Word of the Day ---
const wotdList = ["coterminous", "serendipity", "ephemeral", "luminous", "petrichor", "mellifluous", "ineffable", "resilience", "nostalgia", "euphoria"];
async function loadWordOfTheDay(word) {
  showLoading(wotdContent);
  try {
    const data = await fetchWordData(word);
    const entry = data[0];
    const phonetic = entry.phonetic || entry.phonetics?.find(p => p.text)?.text || '';
    wotdContent.innerHTML = `
      <div class="wotd-word">${entry.word}</div>
      <div class="wotd-pronounce">${phonetic}</div>
      <button class="search-wotd-btn" data-word="${entry.word}" style="margin-top:0.8rem; background:#3b82f6; border:none; padding:0.3rem 1rem; border-radius:40px; color:white; cursor:pointer;">
        <i class="fas fa-search"></i> Look up
      </button>
    `;
    const lookupBtn = wotdContent.querySelector('.search-wotd-btn');
    if (lookupBtn) lookupBtn.addEventListener('click', () => fetchAndDisplayWord(entry.word));
  } catch (err) {
    wotdContent.innerHTML = `<div class="error-message">Could not load word of the day.</div>`;
  }
}
function getRandomWotd() { return wotdList[Math.floor(Math.random() * wotdList.length)]; }
function refreshWordOfTheDay() { loadWordOfTheDay(getRandomWotd()); }
refreshWotdBtn.addEventListener('click', refreshWordOfTheDay);
refreshWordOfTheDay();

// --- Navigation & Modals ---
homeBtn.addEventListener('click', () => {
  wordInput.value = '';
  resultsDiv.innerHTML = `<div class="info-message"><i class="fas fa-book-open"></i> Enter a word above to see its definition, pronunciation, synonyms, and more.</div>`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
savedBtn.addEventListener('click', () => {
  if (!currentUser) { alert('Please sign up first to view saved words.'); signupModal.style.display = 'block'; return; }
  renderSavedWordsList();
  savedModal.style.display = 'block';
});
signupBtn.addEventListener('click', () => { signupModal.style.display = 'block'; });
closeModals.forEach(close => {
  close.addEventListener('click', () => {
    savedModal.style.display = 'none';
    signupModal.style.display = 'none';
  });
});
window.addEventListener('click', (e) => {
  if (e.target === savedModal) savedModal.style.display = 'none';
  if (e.target === signupModal) signupModal.style.display = 'none';
});

// Mock signup form
const mockAuthForm = document.getElementById('mockAuthForm');
if (mockAuthForm) {
  mockAuthForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    if (username) {
      currentUser = username;
      localStorage.setItem('wordlyUser', currentUser);
      document.getElementById('currentUserDisplay').innerHTML = `Logged in as <strong>${currentUser}</strong>`;
      alert(`Welcome, ${currentUser}! You can now save words.`);
      signupModal.style.display = 'none';
    } else {
      alert('Please enter a name.');
    }
  });
}
if (currentUser) {
  const display = document.getElementById('currentUserDisplay');
  if (display) display.innerHTML = `Logged in as <strong>${currentUser}</strong>`;
}