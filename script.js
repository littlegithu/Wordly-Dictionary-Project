// ======================= GLOBAL REFERENCES =======================
const form = document.getElementById('searchForm');
const input = document.getElementById('wordInput');
const results = document.getElementById('results');
const wotdDiv = document.getElementById('wotdContent');
const refreshWotd = document.getElementById('refreshWotd');

// Modals & buttons
const savedModal = document.getElementById('savedModal');
const signupModal = document.getElementById('signupModal');
const homeBtn = document.getElementById('homeBtn');
const savedBtn = document.getElementById('savedBtn');
const signupBtn = document.getElementById('signupBtn');
const savedList = document.getElementById('savedWordsList');
const themeToggle = document.getElementById('themeToggle');

// Mock user (stored in localStorage)
let currentUser = localStorage.getItem('wordlyUser') || null;

// ======================= THEME (light / navy) =======================
if (localStorage.getItem('wordlyTheme') === 'navy') {
  document.body.classList.add('navy-theme');
  themeToggle.querySelector('i').className = 'fas fa-sun';
}
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('navy-theme');
  const isNavy = document.body.classList.contains('navy-theme');
  const icon = themeToggle.querySelector('i');
  icon.className = isNavy ? 'fas fa-sun' : 'fas fa-moon';
  localStorage.setItem('wordlyTheme', isNavy ? 'navy' : 'light');
});

// ======================= SAVED WORDS (localStorage) =======================
function getSaved() {
  if (!currentUser) return [];
  return JSON.parse(localStorage.getItem(`saved_${currentUser}`)) || [];
}

function saveWord(word, preview) {
  if (!currentUser) return alert('Sign up first!');
  let saved = getSaved();
  if (saved.find(w => w.word === word)) return alert('Already saved');
  saved.push({ word, preview, note: '' });
  localStorage.setItem(`saved_${currentUser}`, JSON.stringify(saved));
  alert(`"${word}" saved`);
}

function deleteWord(word) {
  let saved = getSaved().filter(w => w.word !== word);
  localStorage.setItem(`saved_${currentUser}`, JSON.stringify(saved));
  renderSavedList();
}

function updateNote(word, newNote) {
  let saved = getSaved();
  const item = saved.find(w => w.word === word);
  if (item) item.note = newNote;
  localStorage.setItem(`saved_${currentUser}`, JSON.stringify(saved));
  renderSavedList();
}

function renderSavedList() {
  const saved = getSaved();
  if (!saved.length) {
    savedList.innerHTML = '<p>No saved words yet.</p>';
    return;
  }
  savedList.innerHTML = saved.map(item => `
    <div class="saved-word-item">
      <div class="saved-word-info">
        <strong>${item.word}</strong>
        <div class="saved-word-note">${item.note || 'No notes'}</div>
      </div>
      <div class="saved-word-actions">
        <button class="edit-note" data-word="${item.word}"><i class="fas fa-edit"></i></button>
        <button class="delete-word" data-word="${item.word}"><i class="fas fa-trash"></i></button>
      </div>
    </div>
  `).join('');
  // Attach edit/delete events
  document.querySelectorAll('.edit-note').forEach(btn => {
    btn.onclick = () => {
      const w = btn.dataset.word;
      const newNote = prompt('Add a note:', getSaved().find(x => x.word === w)?.note || '');
      if (newNote !== null) updateNote(w, newNote);
    };
  });
  document.querySelectorAll('.delete-word').forEach(btn => {
    btn.onclick = () => { if (confirm('Delete?')) deleteWord(btn.dataset.word); };
  });
}

// ======================= API CALL & DISPLAY =======================
async function fetchWord(word) {
  const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
  if (!res.ok) throw new Error(`"${word}" not found`);
  return res.json();
}

function showError(msg, target) { target.innerHTML = `<div class="error-message">⚠️ ${msg}</div>`; }
function showLoading(target) { target.innerHTML = '<div class="info-message">🔄 Loading...</div>'; }

async function searchAndDisplay(word, container = results) {
  showLoading(container);
  try {
    const data = await fetchWord(word);
    displayWord(data[0], container);
  } catch (err) { showError(err.message, container); }
}

function displayWord(entry, container) {
  const word = entry.word;
  const phonetic = entry.phonetic || entry.phonetics?.find(p => p.text)?.text || '';
  const audioUrl = entry.phonetics?.find(p => p.audio)?.audio || null;
  const preview = entry.meanings[0]?.definitions[0]?.definition.slice(0, 100) || '';

  let html = `<div class="word-header"><h2>${word}</h2><span class="phonetic">${phonetic}</span></div>`;
  
  // Audio button: icon only (no text)
  if (audioUrl) {
    html += `<button class="audio-icon-btn" data-audio="${audioUrl}"><i class="fas fa-volume-up"></i></button>`;
  } else {
    html += `<p class="no-audio">🔇 No audio available</p>`;
  }

  entry.meanings.forEach(meaning => {
    meaning.definitions.forEach((def, idx) => {
      html += `
        <div class="definition-card">
          <div class="part-of-speech">${meaning.partOfSpeech}${idx > 0 ? ` (${idx+1})` : ''}</div>
          <div class="definition-text">📖 ${def.definition}</div>
          ${def.example ? `<div class="example-text">✍️ "${def.example}"</div>` : ''}
        </div>
      `;
    });
    if (meaning.synonyms?.length) {
      html += `<div class="synonyms-block">🔗 <strong>Synonyms:</strong> ${meaning.synonyms.join(', ')}</div>`;
    }
  });

  html += `<button class="save-word-btn" data-word="${word}" data-preview="${preview}">💾 Save this word</button>`;
  container.innerHTML = html;

  // Audio playback
  const audioBtn = container.querySelector('.audio-icon-btn');
  if (audioBtn) audioBtn.onclick = () => new Audio(audioBtn.dataset.audio).play().catch(e => console.log);

  // Save button
  const saveBtn = container.querySelector('.save-word-btn');
  if (saveBtn) saveBtn.onclick = () => saveWord(saveBtn.dataset.word, saveBtn.dataset.preview);
}

// ======================= WORD OF THE DAY =======================
const wordBank = ['serendipity', 'ephemeral', 'luminous', 'petrichor', 'mellifluous', 'resilience', 'nostalgia'];
async function loadWotD(word) {
  showLoading(wotdDiv);
  try {
    const data = await fetchWord(word);
    const entry = data[0];
    // Changed: search icon instead of "Look up" text
    wotdDiv.innerHTML = `
      <div class="wotd-word">${entry.word}</div>
      <div class="wotd-pronounce">${entry.phonetic || ''}</div>
      <button class="search-wotd-btn" data-word="${entry.word}"><i class="fas fa-search"></i></button>
    `;
    wotdDiv.querySelector('.search-wotd-btn').onclick = () => searchAndDisplay(entry.word);
  } catch { wotdDiv.innerHTML = '<div class="error-message">Could not load word of the day</div>'; }
}
refreshWotd.onclick = () => loadWotD(wordBank[Math.floor(Math.random() * wordBank.length)]);
loadWotD(wordBank[0]);

// ======================= EVENT LISTENERS (UI) =======================
form.onsubmit = e => { e.preventDefault(); const w = input.value.trim(); if (w) searchAndDisplay(w); else showError('Enter a word', results); };
document.querySelectorAll('.popular-word').forEach(btn => {
  btn.onclick = () => { input.value = btn.dataset.word; searchAndDisplay(btn.dataset.word); };
});
homeBtn.onclick = () => { input.value = ''; results.innerHTML = '<div class="info-message">📖 Enter a word to see definition, pronunciation, synonyms and more.</div>'; };
savedBtn.onclick = () => { if (!currentUser) { alert('Sign up first!'); signupModal.style.display = 'block'; } else { renderSavedList(); savedModal.style.display = 'block'; } };
signupBtn.onclick = () => signupModal.style.display = 'block';
document.querySelectorAll('.close-modal').forEach(close => close.onclick = () => { savedModal.style.display = 'none'; signupModal.style.display = 'none'; });
window.onclick = e => { if (e.target === savedModal) savedModal.style.display = 'none'; if (e.target === signupModal) signupModal.style.display = 'none'; };

// ======================= MOCK AUTH (SIGNUP) =======================
document.getElementById('mockAuthForm').onsubmit = e => {
  e.preventDefault();
  const name = document.getElementById('username').value.trim();
  if (name) {
    currentUser = name;
    localStorage.setItem('wordlyUser', name);
    document.getElementById('currentUserDisplay').innerHTML = `Logged in as <strong>${name}</strong>`;
    alert(`Welcome ${name}! You can now save words.`);
    signupModal.style.display = 'none';
  } else alert('Enter a name');
};
if (currentUser) document.getElementById('currentUserDisplay').innerHTML = `Logged in as <strong>${currentUser}</strong>`;