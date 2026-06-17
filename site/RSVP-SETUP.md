# RSVP + Photo uploads → Google (with email alerts)

One Google Apps Script web app handles two things from the site:

1. **RSVP** form → a **RSVPs** tab in your Google Sheet, plus an email alert.
2. **Guest photo uploads** → saved straight into your **Google Drive folder**
   (`18MJf_2YCV_Ehnrs5JcUMGehYBQ-tZ6OL`), with a **Photos** tab logging each one.

Guests need **no Google account** for either. (Wishes use a Padlet wall, so
they don't touch this script.)

---

## To enable photo uploads (update your existing script)

Your RSVP script is already deployed — you just add the photo handling:

1. Open the Sheet → **Extensions → Apps Script**.
2. Select all, delete, and paste in the **whole script below**.
3. `PHOTO_FOLDER_ID` is already set to your shared Drive folder. Set
   `NOTIFY_EMAIL` to your email.
4. **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy.**
   (Same `/exec` URL — nothing changes on the website.)
5. It will ask you to **authorize again**, now also for **Google Drive**
   (so it can save the photos). Approve it (*Advanced → Go to project → Allow*).

> Because the script runs as **you**, it saves into your own folder with no
> extra sharing needed. (Only set the folder to "Anyone with the link → Viewer"
> if you also want guests to *browse* the album via the "View the shared album"
> link.)

After deploying, do a real test: upload a photo from the site's Photo Sharing
section and confirm it appears in your Drive folder and on the **Photos** tab.

---

## The Apps Script code — paste this whole block

```javascript
// TheEEAffair - RSVP + photo collector
const NOTIFY_EMAIL = "CHANGE_ME@example.com";                 // your email
const PHOTO_FOLDER_ID = "18MJf_2YCV_Ehnrs5JcUMGehYBQ-tZ6OL";  // your Drive folder

const COLUMNS = {
  rsvp: ["at", "firstName", "lastName", "email", "phone", "attending", "notes"],
  wish: ["at", "name", "role", "message"],
};

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const type = (data.type || "rsvp").toLowerCase();

    if (type === "photo") return savePhoto(data);

    const kind = type === "wish" ? "wish" : "rsvp";
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

// Save one uploaded photo into the Drive folder + log it on a Photos tab.
function savePhoto(data) {
  try {
    const folder = DriveApp.getFolderById(PHOTO_FOLDER_ID);
    const blob = Utilities.newBlob(
      Utilities.base64Decode(data.fileData),
      data.mimeType || "image/jpeg",
      data.fileName || ("photo-" + Date.now() + ".jpg")
    );
    const file = folder.createFile(blob);
    if (data.name) file.setDescription("Uploaded by: " + data.name);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("Photos");
    if (!sheet) { sheet = ss.insertSheet("Photos"); sheet.appendRow(["At", "Name", "File", "Link"]); }
    sheet.appendRow([new Date(), data.name || "", file.getName(), file.getUrl()]);

    return json({ ok: true, url: file.getUrl() });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doGet() { return json({ ok: true, service: "TheEEAffair forms" }); }

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

---

## Notes & limits

- Photos upload **one at a time** so large pictures don't hit request limits.
  Phone photos are fine; large videos are not meant for this.
- Uploads are **fire-and-forget** from the browser (Google can't return a
  readable response to an account-less request), so the site shows an
  optimistic confirmation. The real record is the **Photos** tab and the files
  in your **Drive folder** — check there after a test.
- The QR code in the Photo Sharing section opens the on-site **upload form**
  (this page, at `#shots`), so scanning at the reception lands guests on the
  form. The "View the shared album" link opens the Drive folder for browsing.
- Two alert inboxes? `NOTIFY_EMAIL = "one@x.com,two@y.com"`.
