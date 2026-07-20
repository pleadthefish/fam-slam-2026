const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzJh9SIc1aBKI0Q1oFPu9QgS8rrjCYAXjbvetYpiiVIEnp3IZZRR_SXKY5mCo8PduQbcQ/exec';

const LINK_LABELS = {
  workbook: {
    label: '📊 Meals, Activities & Shopping List',
    description: 'Say it with me, SPREADSHEETS! Meal schedule by day, daily activities/agenda, ingredient & shopping list',
  },
  mealSignUp: {
    label: '🍽️ Meal & Dish Team Sign-Up',
    description: 'Claim a slot for dinner prep, daytime cleanup, or dish duty! Through labor we will transcend!',
  },
  committeeSignUp: {
    label: '👥 Committee Sign-Up',
    description: "Join a committee! If you don't volunteer, you will be drafted!",
  },
};

async function init() {
  let data;
  try {
    const res = await fetch('data/site-data.json');
    data = await res.json();
  } catch (err) {
    document.querySelector('main').insertAdjacentHTML(
      'afterbegin',
      `<p style="color:#b03a2a;padding:1rem">Failed to load site data: ${err.message}</p>`
    );
    return;
  }

  renderLinks(data.links);
  renderItinerary(data.itinerary);
  renderNotes(data.notes);
  wireForm();
}

function renderLinks(links) {
  const container = document.getElementById('link-cards');
  container.innerHTML = Object.entries(links)
    .map(([key, url]) => {
      const { label, description } = LINK_LABELS[key] ?? { label: key, description: '' };
      const inner = `
        <span class="link-card-body">
          <span class="link-card-label">${label}</span>
          ${description ? `<span class="link-card-desc">${description}</span>` : ''}
        </span>
        <span class="arrow">↗</span>`;
      const isPlaceholder = url.startsWith('[');
      return isPlaceholder
        ? `<span class="link-card" aria-disabled="true" style="opacity:.45;cursor:default">${inner.replace('↗', '—')}</span>`
        : `<a class="link-card" href="${url}" target="_blank" rel="noopener">${inner}</a>`;
    })
    .join('');
}

function renderItinerary(days) {
  const container = document.getElementById('itinerary-days');
  container.innerHTML = days
    .map(({ day, color, lines }) => `
      <div class="day-card" style="background:${color}">
        <h3>${day}</h3>
        <ul>${lines.map(l => `<li>${l}</li>`).join('')}</ul>
      </div>
    `)
    .join('');
}

function renderNotes(notes) {
  const labels = { address: 'Address', wifi: 'Wi-Fi', emergencyContact: 'Emergency Contact' };
  const container = document.getElementById('notes-content');
  container.innerHTML = `<dl class="notes-list">` +
    Object.entries(notes)
      .map(([key, val]) => `<dt>${labels[key] ?? key}</dt><dd>${val}</dd>`)
      .join('') +
    `</dl>`;
}

function wireForm() {
  const form = document.getElementById('suggestion-form');
  const status = document.getElementById('form-status');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = '';
    status.className = '';

    const suggestion = form.suggestion.value.trim();
    const initials   = form.initials.value.trim();

    if (!suggestion) {
      status.textContent = 'Please enter a suggestion.';
      status.className = 'error';
      form.suggestion.focus();
      return;
    }
    if (!initials) {
      status.textContent = 'Please enter your name.';
      status.className = 'error';
      form.initials.focus();
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Sending…';

    const payload = {
      suggestion,
      category: form.category.value,
      initials,
    };

    try {
      // Apps Script doesn't handle CORS preflights. Sending Content-Type: text/plain
      // keeps this a "simple request" (no OPTIONS preflight). The body is still valid
      // JSON — Apps Script reads it from e.postData.contents. mode: no-cors is required
      // because Apps Script redirects the POST internally; the response is opaque but
      // the data lands in the sheet.
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
      });
      status.textContent = 'Got it — thanks!';
      status.className = 'success';
      form.reset();
    } catch {
      status.textContent = 'Couldn\'t reach the server. Check your connection and try again.';
      status.className = 'error';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit';
    }
  });
}

init();
