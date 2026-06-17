# RSVP (and Wishes) → Google Sheet, with email alerts

The **RSVP** form posts to a Google Apps Script web app that appends each
reply to a Google Sheet and emails the couple. (Wishes now use a Padlet wall
on the site, and photos go straight to a Google Drive album, so neither of
those needs this script - it's really just the RSVP collector now.)

This is already set up and live. Keep this file as a reference in case the
script ever needs to be re-pasted or re-deployed.

---

## The Apps Script code (reference)

```javascript
// TheEEAffair - RSVP collector
const NOTIFY_EMAIL = "CHANGE_ME@example.com";   // the couple's email

const COLUMNS = {
  rsvp: ["at", "firstName", "lastName", "email", "phone", "attending", "notes"],
  wish: ["at", "name", "role", "message"],
};

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const kind = (data.type || "rsvp").toLowerCase() === "wish" ? "wish" : "rsvp";
    const tabName = kind === "wish" ? "Wishes" : "RSVPs";
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(tabName) || ss.insertSheet(tabName);

    let headers = COLUMNS[kind].slice();
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

    notify(kind, data);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doGet() { return json({ ok: true, service: "TheEEAffair RSVP" }); }

function notify(kind, data) {
  if (!NOTIFY_EMAIL || NOTIFY_EMAIL.indexOf("CHANGE_ME") === 0) return;
  let subject, body;
  if (kind === "wish") {
    subject = "New wish · " + (data.name || "Guest");
    body = "Name: " + (data.name || "") + "\n" +
           "Role: " + (data.role || "") + "\n\n" + (data.message || "");
  } else {
    const coming = (data.attending || "").toLowerCase() === "yes";
    subject = (coming ? "RSVP · coming · " : "RSVP · regrets · ") +
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

## Deploy / redeploy reminder

Deploy as **Web app**, **Execute as: Me**, **Who has access: Anyone**. If you
change the code, use **Deploy → Manage deployments → Edit → New version** so
the same `/exec` URL keeps working.

## Photos

Photos are **not** handled here. The site's "Add Your Photos" button and QR
code open your shared Google Drive album, where guests add their pictures
directly. For that to allow contributions, share the Drive folder as
**"Anyone with the link"**.
