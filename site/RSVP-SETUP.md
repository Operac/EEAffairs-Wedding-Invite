# RSVP & Wishes → Google Sheet (with email alerts)

Submissions from the **RSVP** form and the **Words & Wishes** form are sent
to a single Google Apps Script web app, which:

1. Appends each one to a Google Sheet the bride owns
   (separate **RSVPs** and **Wishes** tabs), and
2. Emails the bride a notification for every submission.

Free, unlimited, and the spreadsheet doubles as the master headcount for
catering, seating, and Aso Ebi. One web app handles both forms.

---

## One-time setup (≈10 minutes, in the bride's Google account)

1. Go to **https://sheets.new** to create a new Google Sheet. Name it
   something like *“TheEEAffair — RSVPs & Wishes”*. Leave the tabs alone;
   the script creates **RSVPs** and **Wishes** automatically.
2. In that sheet: **Extensions → Apps Script**. Delete whatever is in the
   editor and paste in the **entire script below**.
3. At the top of the script, set `NOTIFY_EMAIL` to the bride's email
   address (the inbox that should receive every RSVP/wish).
4. Click **Deploy → New deployment**. Click the gear ⚙ → **Web app**.
   - **Description:** `EE forms`
   - **Execute as:** *Me*
   - **Who has access:** **Anyone**  ← important, or guests can't submit
   - Click **Deploy**, then **Authorize access** and allow the permissions
     (Google will warn it's an unverified app — that's normal for your own
     script; choose *Advanced → Go to project → Allow*).
5. Copy the **Web app URL** (ends in `/exec`).
6. Send me that URL. I'll paste it into the site config (`RSVP_ENDPOINT`
   **and** `WISHES_ENDPOINT` both get the same URL) and verify end-to-end.

> If you ever change the script, use **Deploy → Manage deployments → Edit
> (pencil) → Version: New version** so the same URL keeps working.

---

## The Apps Script code — paste this whole block

```javascript
// ── TheEEAffair — RSVP & Wishes collector ─────────────────────────
// Set this to the bride's email (where notifications should land):
const NOTIFY_EMAIL = "CHANGE_ME@example.com";

// Column order per form (anything extra is appended automatically):
const COLUMNS = {
  rsvp: ["at", "firstName", "lastName", "email", "phone", "attending", "notes"],
  wish: ["at", "name", "role", "message"],
};

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const type = (data.type || "rsvp").toLowerCase() === "wish" ? "wish" : "rsvp";
    const tabName = type === "wish" ? "Wishes" : "RSVPs";

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(tabName);
    if (!sheet) sheet = ss.insertSheet(tabName);

    // Build / reuse the header row
    let headers = COLUMNS[type].slice();
    Object.keys(data).forEach((k) => {
      if (k !== "type" && headers.indexOf(k) === -1) headers.push(k);
    });
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers.map(prettify));
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
    } else {
      headers = sheet.getRange(1, 1, 1, sheet.getLastColumn())
        .getValues()[0].map(unprettify);
    }

    sheet.appendRow(headers.map((h) => (data[h] !== undefined ? data[h] : "")));

    notify(type, data);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

// Lets you open the /exec URL in a browser to confirm it's live.
function doGet() {
  return json({ ok: true, service: "TheEEAffair forms" });
}

function notify(type, data) {
  if (!NOTIFY_EMAIL || NOTIFY_EMAIL.indexOf("CHANGE_ME") === 0) return;
  let subject, body;
  if (type === "wish") {
    subject = "💌 New wish — " + (data.name || "Guest");
    body = "Name: " + (data.name || "") + "\n" +
           "Role: " + (data.role || "") + "\n\n" +
           (data.message || "");
  } else {
    const coming = (data.attending || "").toLowerCase() === "yes";
    subject = (coming ? "✅ RSVP — coming — " : "🚫 RSVP — regrets — ") +
              [data.firstName, data.lastName].filter(Boolean).join(" ");
    body = "Name:  " + [data.firstName, data.lastName].filter(Boolean).join(" ") + "\n" +
           "Email: " + (data.email || "") + "\n" +
           "Phone: " + (data.phone || "") + "\n" +
           "Attending: " + (data.attending || "") + "\n" +
           "Notes: " + (data.notes || "");
  }
  MailApp.sendEmail(NOTIFY_EMAIL, subject, body);
}

function prettify(k) {
  return String(k).replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase()).trim();
}
function unprettify(h) {
  const s = String(h).trim();
  const map = { "At": "at", "First Name": "firstName", "Last Name": "lastName",
    "Email": "email", "Phone": "phone", "Attending": "attending",
    "Notes": "notes", "Name": "name", "Role": "role", "Message": "message" };
  return map[s] || s.charAt(0).toLowerCase() + s.slice(1).replace(/\s+/g, "");
}
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

---

## Notes

- The site also keeps a local copy in the guest's browser, so a brief
  network hiccup never loses the on-screen confirmation — but the Sheet
  is the source of truth.
- Gmail can send a few hundred emails/day on a free account — far more
  than a wedding needs.
- Want the alerts to go to **two** inboxes (e.g. bride + planner)? Set
  `NOTIFY_EMAIL = "one@x.com,two@y.com"`.
