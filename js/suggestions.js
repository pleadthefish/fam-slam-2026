const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzJh9SIc1aBKI0Q1oFPu9QgS8rrjCYAXjbvetYpiiVIEnp3IZZRR_SXKY5mCo8PduQbcQ/exec';
const VOTES_KEY = 'famslamvotes';

let suggestions = [];
let localVotes = {};
let localComments = {};

// ── localStorage helpers ──────────────────────────────────
function getMyVotes() {
  try { return JSON.parse(localStorage.getItem(VOTES_KEY) || '{}'); }
  catch { return {}; }
}

function saveMyVote(id, voteType) {
  const stored = getMyVotes();
  stored[String(id)] = voteType;
  localStorage.setItem(VOTES_KEY, JSON.stringify(stored));
}

function clearMyVote(id) {
  const stored = getMyVotes();
  delete stored[String(id)];
  localStorage.setItem(VOTES_KEY, JSON.stringify(stored));
}

// ── Init ──────────────────────────────────────────────────
async function init() {
  const container = document.getElementById('suggestions-container');
  try {
    const res = await fetch(APPS_SCRIPT_URL);
    const data = await res.json();
    suggestions = data.suggestions || [];
    localVotes = data.votes || {};
    localComments = data.comments || {};

    if (!suggestions.length) {
      container.innerHTML = `<p class="empty-state">No suggestions yet — <a href="index.html">be the first</a>!</p>`;
      return;
    }

    container.innerHTML = suggestions.map(renderCard).join('');
    container.addEventListener('click', handleClick);
    container.addEventListener('keydown', handleKeydown);
    renderIndex();
  } catch {
    container.innerHTML = `<p class="error-state">Couldn't load suggestions — check your connection and refresh.</p>`;
  }
}

// ── Render ────────────────────────────────────────────────
function renderCard(s) {
  const { id, text, category } = s;
  const votes = localVotes[String(id)] || { heckYes: 0, like: 0, boring: 0 };
  const { heckYesPct, likePct, boringPct } = calcPcts(votes);
  const comments = localComments[String(id)] || [];
  const myVote = getMyVotes()[String(id)] || null;

  function btnClass(type) {
    if (!myVote) return '';
    return myVote === type ? ' vote-active' : ' vote-taken';
  }

  return `
    <div class="suggestion-card" data-id="${id}">
      <div class="card-header">
        <span class="category-badge">${escapeHtml(category)}</span>
        ${myVote ? `<span class="voted-label">your vote: ${voteLabel(myVote)}</span>` : ''}
      </div>
      <p class="card-text">${escapeHtml(text)}</p>
      <div class="vote-bar">
        <div class="bar-segment bar-heckyes" style="width:${heckYesPct}%"></div>
        <div class="bar-segment bar-like"    style="width:${likePct}%"></div>
        <div class="bar-segment bar-boring"  style="width:${boringPct}%"></div>
      </div>
      <div class="vote-actions">
        <button class="vote-btn btn-heckyes${btnClass('heckYes')}" data-vote="heckYes" data-id="${id}">
          ✅ Heck Yes<span class="vote-count">${votes.heckYes}</span>
        </button>
        <button class="vote-btn btn-like${btnClass('like')}" data-vote="like" data-id="${id}">
          👍 Like<span class="vote-count">${votes.like}</span>
        </button>
        <button class="vote-btn btn-boring${btnClass('boring')}" data-vote="boring" data-id="${id}">
          😐 Boring, Oregon<span class="vote-count">${votes.boring}</span>
        </button>
      </div>
      <button class="comment-toggle" data-toggle="${id}">
        💬 ${comments.length} comment${comments.length !== 1 ? 's' : ''}
      </button>
      <div class="comment-section" id="comments-${id}" hidden>
        <ul class="comment-list" id="comment-list-${id}">
          ${renderCommentItems(comments)}
        </ul>
        <div class="comment-input-row">
          <input class="comment-input" type="text" placeholder="Add a comment…" maxlength="200" data-comment-id="${id}">
          <button class="comment-submit" data-submit="${id}">Post</button>
        </div>
      </div>
    </div>`;
}

function voteLabel(voteType) {
  return { heckYes: 'Heck Yes', like: 'Like', boring: 'Boring, Oregon' }[voteType] || voteType;
}

function renderCommentItems(comments) {
  if (!comments.length) return `<li class="comment-empty">No comments yet.</li>`;
  return comments.map(c => `<li class="comment-item">${escapeHtml(c.text)}</li>`).join('');
}

function renderIndex() {
  const section = document.getElementById('suggestions-index');
  const list = document.getElementById('suggestions-index-list');
  if (!section || !list || !suggestions.length) return;

  const order = ['Meal', 'Activity', 'Committee', 'Other'];
  const grouped = {};
  suggestions.forEach(s => {
    const cat = s.category || 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(s);
  });

  list.innerHTML = order
    .filter(cat => grouped[cat])
    .map(cat =>
      grouped[cat].map(s =>
        `<li class="index-item">
          <span class="index-category">${escapeHtml(cat)}</span>
          <span class="index-text">${escapeHtml(s.text)}</span>
        </li>`
      ).join('')
    ).join('');

  section.style.display = '';
}

// ── Event handlers ────────────────────────────────────────
function handleClick(e) {
  const toggleBtn = e.target.closest('[data-toggle]');
  if (toggleBtn) { toggleComments(toggleBtn.dataset.toggle); return; }

  const submitBtn = e.target.closest('[data-submit]');
  if (submitBtn) { submitComment(submitBtn.dataset.submit); return; }

  const voteBtn = e.target.closest('[data-vote]');
  if (voteBtn) { handleVote(voteBtn); return; }
}

function handleKeydown(e) {
  if (e.key !== 'Enter') return;
  const input = e.target.closest('.comment-input');
  if (input) submitComment(input.dataset.commentId);
}

function handleVote(btn) {
  const id = String(btn.dataset.id);
  const voteType = btn.dataset.vote;
  const myVotes = getMyVotes();
  const currentVote = myVotes[id] || null;

  if (!localVotes[id]) localVotes[id] = { heckYes: 0, like: 0, boring: 0 };

  if (currentVote === voteType) {
    // Undo vote
    localVotes[id][currentVote] = Math.max(0, localVotes[id][currentVote] - 1);
    clearMyVote(id);
    postVote(id, 'remove_' + currentVote);
  } else {
    if (currentVote) {
      // Remove old vote first
      localVotes[id][currentVote] = Math.max(0, localVotes[id][currentVote] - 1);
      postVote(id, 'remove_' + currentVote);
    }
    // Cast new vote
    localVotes[id][voteType]++;
    saveMyVote(id, voteType);
    postVote(id, voteType);
  }

  updateCard(id);
}

function postVote(id, voteType) {
  fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ type: 'vote', suggestionId: id, voteType }),
  });
}

// ── Card update (no re-render) ────────────────────────────
function updateCard(id) {
  const card = document.querySelector(`.suggestion-card[data-id="${id}"]`);
  if (!card) return;

  const votes = localVotes[id] || { heckYes: 0, like: 0, boring: 0 };
  const { heckYesPct, likePct, boringPct } = calcPcts(votes);
  const myVote = getMyVotes()[id] || null;

  card.querySelector('.bar-heckyes').style.width = heckYesPct + '%';
  card.querySelector('.bar-like').style.width    = likePct + '%';
  card.querySelector('.bar-boring').style.width  = boringPct + '%';

  card.querySelector('.btn-heckyes .vote-count').textContent = votes.heckYes;
  card.querySelector('.btn-like .vote-count').textContent    = votes.like;
  card.querySelector('.btn-boring .vote-count').textContent  = votes.boring;

  card.querySelectorAll('.vote-btn').forEach(btn => {
    btn.classList.toggle('vote-active', btn.dataset.vote === myVote);
    btn.classList.toggle('vote-taken', !!myVote && btn.dataset.vote !== myVote);
  });

  let label = card.querySelector('.voted-label');
  if (myVote) {
    if (!label) {
      label = document.createElement('span');
      label.className = 'voted-label';
      card.querySelector('.card-header').appendChild(label);
    }
    label.textContent = `your vote: ${voteLabel(myVote)}`;
  } else if (label) {
    label.remove();
  }
}

// ── Comments ──────────────────────────────────────────────
function toggleComments(id) {
  const section = document.getElementById(`comments-${id}`);
  if (!section) return;
  section.hidden = !section.hidden;
  if (!section.hidden) section.querySelector('.comment-input').focus();
}

function submitComment(id) {
  const input = document.querySelector(`.comment-input[data-comment-id="${id}"]`);
  const text = input.value.trim();
  if (!text) return;

  if (!localComments[id]) localComments[id] = [];
  localComments[id].push({ text });
  input.value = '';

  const list = document.getElementById(`comment-list-${id}`);
  if (list) list.innerHTML = renderCommentItems(localComments[id]);

  const toggle = document.querySelector(`[data-toggle="${id}"]`);
  const count = localComments[id].length;
  if (toggle) toggle.textContent = `💬 ${count} comment${count !== 1 ? 's' : ''}`;

  fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ type: 'comment', suggestionId: id, text }),
  });
}

// ── Utils ─────────────────────────────────────────────────
function calcPcts(votes) {
  const total = votes.heckYes + votes.like + votes.boring;
  if (!total) return { heckYesPct: 0, likePct: 0, boringPct: 0 };
  return {
    heckYesPct: Math.round((votes.heckYes / total) * 100),
    likePct:    Math.round((votes.like    / total) * 100),
    boringPct:  Math.round((votes.boring  / total) * 100),
  };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

init();
