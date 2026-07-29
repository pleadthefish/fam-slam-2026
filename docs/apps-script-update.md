# Apps Script Update — Suggestions & Voting

This doc covers the one-time update needed to support the Suggestions Ticker and
Voting Page. You'll replace the existing Apps Script code and create one new Sheet tab.

---

## Step 1 — Add a "Votes" sheet tab

In your Google Sheet:
1. Click the **+** icon at the bottom to add a new tab
2. Rename it exactly: `Votes`
3. In row 1, add these headers (one per column): `suggestion_id`, `vote_type`, `timestamp`

Leave it otherwise empty — the script will fill it.

---

## Step 2 — Verify your Suggestions sheet column order

The script assumes this column layout in the `Suggestions` tab (which it created when you
first set up the form):

| A | B | C | D |
|---|---|---|---|
| timestamp | suggestion | category | initials |

If your columns are in a different order, adjust the indices in the `doGet()` function
below (lines with `row[1]`, `row[2]`, `row[3]`).

---

## Step 3 — Replace the Apps Script code

1. Open your Google Sheet
2. Click **Extensions → Apps Script**
3. Select all the code in the editor and replace it with the code below
4. Click **Save** (disk icon or Cmd/Ctrl+S)

```javascript
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sugSheet = ss.getSheetByName('Suggestions');
  var votesSheet = ss.getSheetByName('Votes');

  // Read suggestions (skip header row 1)
  var sugData = sugSheet.getDataRange().getValues();
  var suggestions = [];
  for (var i = 1; i < sugData.length; i++) {
    var row = sugData[i];
    if (!row[1]) continue; // skip blank rows
    suggestions.push({
      id: i + 1,        // actual sheet row number (1-indexed; row 1 = headers)
      text: row[1],     // column B: suggestion text
      category: row[2], // column C: category
      initials: row[3], // column D: initials / name
    });
  }

  // Aggregate votes by suggestion id
  var votes = {};
  if (votesSheet) {
    var voteData = votesSheet.getDataRange().getValues();
    for (var j = 1; j < voteData.length; j++) {
      var vrow = voteData[j];
      var sid = String(vrow[0]);
      var vtype = vrow[1];
      if (!votes[sid]) votes[sid] = { heckYes: 0, like: 0, boring: 0 };
      if (vtype in votes[sid]) votes[sid][vtype]++;
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({ suggestions: suggestions, votes: votes }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var data = JSON.parse(e.postData.contents);

  if (data.type === 'vote') {
    var votesSheet = ss.getSheetByName('Votes');
    if (!votesSheet) {
      votesSheet = ss.insertSheet('Votes');
      votesSheet.appendRow(['suggestion_id', 'vote_type', 'timestamp']);
    }
    votesSheet.appendRow([data.suggestionId, data.voteType, new Date().toISOString()]);
  } else {
    // Existing suggestion submission
    var sheet = ss.getSheetByName('Suggestions') || ss.getActiveSheet();
    sheet.appendRow([new Date().toISOString(), data.suggestion, data.category, data.initials]);
  }

  return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);
}
```

---

## Step 4 — Redeploy as a new version

1. Click **Deploy → Manage deployments**
2. Click the pencil (edit) icon next to your existing deployment
3. Under **Version**, choose **New version**
4. Click **Deploy**
5. The deployment URL stays the same — no changes needed in the site code

---

## Verification

After deploying, open this URL in your browser (replace `YOUR_SCRIPT_ID` with your actual
deployment ID from the URL in `js/main.js`):

```
https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

You should see JSON like:
```json
{"suggestions":[{"id":2,"text":"...","category":"Meal","initials":"DP"}],"votes":{}}
```

If you see JSON, the GET endpoint is working and the site will display suggestions.
