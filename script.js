// ==================== 1. DOM Elements ====================
const form = document.getElementById('searchForm');
const input = document.getElementById('wordInput');
const resultsDiv = document.getElementById('results');
const wotdDiv = document.getElementById('wotdContent');
const refreshWotd = document.getElementById('refreshWotd');
const savedModal = document.getElementById('savedModal');
const signupModal = document.getElementById('signupModal');
const homeBtn = document.getElementById('homeBtn');
const savedBtn = document.getElementById('savedBtn');
const signupBtn = document.getElementById('signupBtn');
const savedListDiv = document.getElementById('savedWordsList');
const themeToggle = document.getElementById('themeToggle');

// ==================== 2. User & Theme Setup ====================
let currentUser = localStorage.getItem('wordlyUser') || null;  // mock login

// Load saved theme (navy or light)
if (localStorage.getItem('wordlyTheme') === 'navy') {
  document.body.classList.add('navy-theme');
  themeToggle.querySelector('i').className = 'fas fa-sun';
}
// Toggle theme on button click
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('navy-theme');
  const isNavy = document.body.classList.contains('navy-theme');
  const icon = themeToggle.querySelector('i');
  icon.className = isNavy ? 'fas fa-sun' : 'fas fa-moon';
  localStorage.setItem('wordlyTheme', isNavy ? 'navy' : 'light');
});

// ==================== 3. Saved Words Functions ====================
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
    savedListDiv.innerHTML = '<p>No saved words yet.</p>';
    return;
  }
  savedListDiv.innerHTML = saved.map(item => `
    <div class="saved-word-item">
      <div><strong>${item.word}</strong><br><small>${item.note || 'No notes'}</small></div>
      <div>
        <button class="edit-note" data-word="${item.word}">✏️</button>
        <button class="delete-word" data-word="${item.word}">🗑️</button>
      </div>
    </div>
  `).join('');
  // Edit note
  document.querySelectorAll('.edit-note').forEach(btn => {
    btn.onclick = () => {
      const w = btn.dataset.word;
      const newNote = prompt('Add a note:', getSaved().find(x => x.word === w)?.note || '');
      if (newNote !== null) updateNote(w, newNote);
    };
  });
  // Delete word
  document.querySelectorAll('.delete-word').forEach(btn => {
    btn.onclick = () => { if (confirm('Delete?')) deleteWord(btn.dataset.word); };
  });
}

// ==================== 4. API Calls & Display ====================
async function fetchWord(word) {
  const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
  if (!res.ok) throw new Error(`"${word}" not found`);
  return res.json();
}

async function searchAndDisplay(word) {
  resultsDiv.innerHTML = '<div class="info-message">Loading...</div>';
  try {
    const data = await fetchWord(word);
    displayWord(data[0]);
  } catch (err) {
    resultsDiv.innerHTML = `<div class="error-message">⚠️ ${err.message}</div>`;
  }
}

function displayWord(entry) {
  const word = entry.word;
  const phonetic = entry.phonetic || entry.phonetics?.find(p => p.text)?.text || '';
  const audioUrl = entry.phonetics?.find(p => p.audio)?.audio || null;
  const preview = entry.meanings[0]?.definitions[0]?.definition.slice(0, 100) || '';
  let html = `<h2>${word}</h2><p>${phonetic}</p>`;
  // Audio button
  if (audioUrl) {
    html += `<button class="audio-btn" data-audio="${audioUrl}">🔊 Listen</button>`;
  } else {
    html += `<p>🔇 No audio</p>`;
  }
  // Definitions & examples
  entry.meanings.forEach(meaning => {
    meaning.definitions.forEach((def, idx) => {
      html += `<div><b>${meaning.partOfSpeech}</b>: ${def.definition}</div>`;
      if (def.example) html += `<div><i>📝 "${def.example}"</i></div>`;
    });
    if (meaning.synonyms?.length) {
      html += `<div>🔗 Synonyms: ${meaning.synonyms.join(', ')}</div>`;
    }
  });
  html += `<button class="save-word-btn" data-word="${word}" data-preview="${preview}">💾 Save</button>`;
  resultsDiv.innerHTML = html;
  // Play audio
  const audioBtn = resultsDiv.querySelector('.audio-btn');
  if (audioBtn) audioBtn.onclick = () => new Audio(audioBtn.dataset.audio).play();
  // Save button
  const saveBtn = resultsDiv.querySelector('.save-word-btn');
  if (saveBtn) saveBtn.onclick = () => saveWord(saveBtn.dataset.word, saveBtn.dataset.preview);
}

// ==================== 5. Word of the Day ====================
const wordBank = ['serendipity', 'ephemeral', 'luminous', 'petrichor', 'resilience'];
async function loadWotD(word) {
  wotdDiv.innerHTML = '<p>Loading...</p>';
  try {
    const data = await fetchWord(word);
    const entry = data[0];
    wotdDiv.innerHTML = `<b>${entry.word}</b> <button class="wotd-lookup">🔍 Look up</button>`;
    wotdDiv.querySelector('.wotd-lookup').onclick = () => searchAndDisplay(entry.word);
  } catch { wotdDiv.innerHTML = '<p>Error loading word of the day</p>'; }
}
refreshWotd.onclick = () => loadWotD(wordBank[Math.floor(Math.random() * wordBank.length)]);
loadWotD(wordBank[0]);

// ==================== 6. Event Listeners (UI) ====================
form.onsubmit = e => {
  e.preventDefault();
  const w = input.value.trim();
  if (w) searchAndDisplay(w);
  else resultsDiv.innerHTML = '<div class="error-message">Enter a word</div>';
};
// Popular word buttons
document.querySelectorAll('.popular-word').forEach(btn => {
  btn.onclick = () => {
    input.value = btn.dataset.word;
    searchAndDisplay(btn.dataset.word);
  };
});
homeBtn.onclick = () => {
  input.value = '';
  resultsDiv.innerHTML = '<div class="info-message">📖 Search any word above</div>';
};
savedBtn.onclick = () => {
  if (!currentUser) { alert('Sign up first!'); signupModal.style.display = 'block'; }
  else { renderSavedList(); savedModal.style.display = 'block'; }
};
signupBtn.onclick = () => signupModal.style.display = 'block';
// Close modals
document.querySelectorAll('.close-modal').forEach(close => {
  close.onclick = () => { savedModal.style.display = 'none'; signupModal.style.display = 'none'; };
});
window.onclick = e => {
  if (e.target === savedModal) savedModal.style.display = 'none';
  if (e.target === signupModal) signupModal.style.display = 'none';
};

// ==================== 7. Mock Signup Form ====================
document.getElementById('mockAuthForm').onsubmit = e => {
  e.preventDefault();
  const name = document.getElementById('username').value.trim();
  if (name) {
    currentUser = name;
    localStorage.setItem('wordlyUser', name);
    document.getElementById('currentUserDisplay').innerHTML = `Logged as <strong>${name}</strong>`;
    alert(`Welcome ${name}!`);
    signupModal.style.display = 'none';
  } else alert('Enter a name');
};
if (currentUser) document.getElementById('currentUserDisplay').innerHTML = `Logged as <strong>${currentUser}</strong>`;