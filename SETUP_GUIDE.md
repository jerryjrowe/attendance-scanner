# Attendance Scanner — Complete Setup Guide

This guide walks you through every step needed to get the system
running. It assumes no technical background. Every step tells you
both *what goal you are achieving* and *exactly what to click.*

You will need:
- A Google account (the same one that owns your attendance spreadsheet)
- A GitHub account (free — you may need to create one)
- An Android tablet or phone to use as the scanner
- About 45–60 minutes total, most of which is waiting for pages to load

---

## Overview: What You Are Setting Up

The system has three pieces:

**1. The Google Apps Script backend**
This is code that lives inside your Google account. It receives
scan results from the tablet and writes them to your spreadsheet.

**2. The scanner page** (`scanner.html`)
This is a webpage that runs on your Android tablet. It uses the
tablet's camera to scan QR codes and automatically sends results
to your backend.

**3. The QR generator page** (`qr-generator.html`)
This is a webpage you open on any computer to generate and print
QR code cards for your students.

Both webpages live on GitHub Pages, which is a free static web
hosting service provided by GitHub. Nothing costs money.

---

## PART 1 — Set Up Your Google Spreadsheet

**Goal:** Create a spreadsheet with the correct tab names and
columns so the backend knows where to read and write data.

### Step 1.1 — Open or create your attendance spreadsheet

- Go to [sheets.google.com](https://sheets.google.com)
- If you already have a student list spreadsheet, open it.
  If not, click **+ Blank** to create a new one.

### Step 1.2 — Create the Students tab

You need a tab (the tabs are at the bottom of the screen) named
exactly **Students** (capital S, no extra spaces).

- Look at the bottom of the screen for a tab. By default it is
  called "Sheet1."
- Double-click the tab name "Sheet1" to rename it.
- Type: `Students`
- Press Enter.

### Step 1.3 — Fill in the Students tab

Click cell **A1** and type the headers exactly as shown:

| A (Column A)   | B (Column B) | C (Column C) |
|----------------|--------------|--------------|
| Student Name   | Grade        | School       |

Then fill in your students starting from row 2:

| A              | B     | C          |
|----------------|-------|------------|
| Jane Smith     | 3rd   | My School  |
| John Doe       | 4th   | My School  |
| Alice Johnson  | 3rd   | My School  |

**Important:** The name in column A must match *exactly* what you
will type into the QR Generator later (same spelling, same
capitalization). The easiest approach: type names here first,
then copy-paste them into the QR Generator.

Grade and School (columns B and C) are optional — you can leave
them blank if you don't need that data.

### Step 1.4 — Create the Attendance tab

- At the bottom of the screen, click the **+** button (it is to
  the right of your existing tabs) to add a new tab.
- Double-click the new tab's name and rename it: `Attendance`
- Press Enter.

You do not need to add any headers to the Attendance tab —
the system creates them automatically on the first scan.

---

## PART 2 — Set Up the Google Apps Script Backend

**Goal:** Add the backend code to your spreadsheet so it can
receive scan results from the tablet and write them to the sheet.

### Step 2.1 — Open the Apps Script editor

- In your spreadsheet, click the menu item **Extensions**
  (in the top menu bar, between "Tools" and "Help").
- Click **Apps Script**.
- A new browser tab will open. This is the script editor.

### Step 2.2 — Replace the default code

- In the script editor, you will see a file called `Code.gs`
  on the left side, and some starter code in the main area that
  looks like:

  ```
  function myFunction() {

  }
  ```

- Click inside that code area and press **Ctrl+A** (or ⌘A on Mac)
  to select all of it.
- Press **Delete** or **Backspace** to clear it.
- Open the file `Code.gs` that came with this guide.
- Select all of its contents (Ctrl+A) and copy it (Ctrl+C).
- Paste it into the Apps Script editor (Ctrl+V).

### Step 2.3 — Set your school name

- Near the top of the code you just pasted, find this line:

  ```
  var SCHOOL_NAME = "My School";
  ```

- Change `My School` to your actual school name. Keep the
  quotation marks. Example:

  ```
  var SCHOOL_NAME = "Lincoln Elementary";
  ```

  **Important:** Remember exactly what you type here — you will
  need to type the same thing in the QR Generator later.

### Step 2.4 — Save the script

- Click the **floppy disk icon** (💾) in the toolbar, or press
  **Ctrl+S** (⌘S on Mac).
- If it asks you to name the project, type `Attendance Scanner`
  and click **Rename**.

### Step 2.5 — Deploy the script as a web app

This step makes your script accessible from the internet so the
tablet scanner can send it data.

- In the top-right area of the Apps Script editor, click the
  blue button that says **Deploy**.
- A dropdown appears. Click **New deployment**.
- A dialog window opens. You will see a gear icon ⚙ next to
  "Select type." Click it.
- Click **Web app**.
- Fill in the fields:
  - **Description:** `Attendance Scanner v1` (or anything you like)
  - **Execute as:** Select `Me (your-email@gmail.com)`
  - **Who has access:** Select `Anyone`
    *(This is required so the tablet can send scan data. The script
    only writes to your sheet — it does not expose any other data.)*
- Click **Deploy**.
- A new dialog appears asking you to authorize the app.
  Click **Authorize access**.
- Choose your Google account from the list.
- A warning screen may appear saying "Google hasn't verified this
  app." This is normal for personal scripts. Click **Advanced**
  (bottom left), then click **Go to Attendance Scanner (unsafe)**.
- Click **Allow**.

### Step 2.6 — Copy your deployment URL

- After authorization, a dialog appears with a **Web app URL.**
  It looks like:

  ```
  https://script.google.com/macros/s/AKfycb…(long string)…/exec
  ```

- Click the **Copy** button next to the URL.
- Paste it somewhere safe (a note, a text file, an email to
  yourself). You will need this URL in Part 4.

- Click **Done.**

---

## PART 3 — Put the Web Pages on GitHub Pages

**Goal:** Host `scanner.html` and `qr-generator.html` on the
internet for free so your tablet can open them.

### Step 3.1 — Create a GitHub account (if you don't have one)

- Go to [github.com](https://github.com)
- Click **Sign up** in the top right.
- Follow the prompts to create a free account.
- Verify your email address when GitHub sends you a confirmation email.

### Step 3.2 — Create a new repository

A "repository" is like a folder that GitHub hosts for you.

- After logging in, click the **+** icon in the top-right corner.
- Click **New repository**.
- Fill in:
  - **Repository name:** `attendance-scanner`
    (lowercase, hyphens, no spaces)
  - **Description:** Leave blank or write anything.
  - **Public/Private:** Select **Public**
    *(GitHub Pages only works on public repositories on free accounts.)*
  - Check the box that says **Add a README file**
- Click **Create repository**.

### Step 3.3 — Upload the scanner files

You will upload two files: `scanner.html` and `qr-generator.html`.

- You are now on your new repository's page.
- Click **Add file** (near the top, above the file list).
- Click **Upload files**.
- Drag both `scanner.html` and `qr-generator.html` onto the
  upload area, or click **choose your files** and select them
  from your computer.
- Wait for both files to finish uploading (you will see their
  names appear in the upload area).
- At the bottom of the page, in the "Commit changes" section:
  - Leave the message as-is, or write `Add scanner files`.
  - Make sure **Commit directly to the main branch** is selected.
  - Click **Commit changes**.

### Step 3.4 — Enable GitHub Pages

- On your repository page, click **Settings** (the tab at the
  top, to the right of "Insights").
- In the left sidebar, scroll down and click **Pages**.
- Under **Branch**, click the dropdown that says "None" and
  select **main**.
- Leave the folder set to **/ (root)**.
- Click **Save**.
- A green banner will appear at the top saying "GitHub Pages
  source saved."

### Step 3.5 — Find your GitHub Pages URL

- Stay on the Pages settings page.
- After about 60 seconds, refresh the page.
- Near the top you will see a box that says:
  **"Your site is live at https://YOUR-USERNAME.github.io/attendance-scanner/"**
- Write down that base URL. Your two pages will be at:
  - Scanner: `https://YOUR-USERNAME.github.io/attendance-scanner/scanner.html`
  - QR Generator: `https://YOUR-USERNAME.github.io/attendance-scanner/qr-generator.html`

*(Replace YOUR-USERNAME with your actual GitHub username.)*

---

## PART 4 — Configure the Scanner on Your Tablet

**Goal:** Open the scanner page on your Android tablet and connect
it to your backend.

### Step 4.1 — Open the scanner page on the tablet

- On your Android tablet, open the **Chrome** browser.
  *(Chrome is required — other browsers may not support camera access
  for web pages.)*
- In the address bar, type your scanner URL:
  `https://YOUR-USERNAME.github.io/attendance-scanner/scanner.html`
- The page will load. It may ask for camera permission — tap **Allow**.

### Step 4.2 — Open the Settings panel

- Tap the **⚙** (gear) icon in the bottom-right corner of the
  scanner page.
- The Settings panel will open.

### Step 4.3 — Enter your backend URL

- In the field labeled **Backend URL**, paste or type the long
  deployment URL you copied in Step 2.6.
  It starts with `https://script.google.com/macros/s/`...
- Tap the **Test Connection** button.
- After a moment, it should show **✓ Connected!** in green.
  If it shows an error, double-check that you copied the full URL
  from Step 2.6 with no extra spaces.

### Step 4.4 — Enter your school name

- In the field labeled **School Name**, type your school name
  *exactly* as you entered it in the Apps Script in Step 2.3.

### Step 4.5 — Save and start the scanner

- Tap **Save & Restart Scanner**.
- The camera will activate and you will see the live camera view.
- The dot in the top-right corner should turn green, confirming
  the backend is connected.

### Step 4.6 — Add the page to your home screen (recommended)

This lets you open the scanner like an app without typing the URL.

- In Chrome, tap the **three-dot menu** (⋮) in the top-right corner.
- Tap **Add to Home screen**.
- Name it `Attendance Scanner` and tap **Add**.
- The scanner icon will appear on your tablet's home screen.

---

## PART 5 — Generate and Print Student QR Codes

**Goal:** Create a printable QR code card for each student.

### Step 5.1 — Open the QR Generator

- On any computer, open your browser and go to:
  `https://YOUR-USERNAME.github.io/attendance-scanner/qr-generator.html`

### Step 5.2 — Set the school name

- In the **School Name** field, type your school name exactly as
  you used in Steps 2.3 and 4.4.
- The page remembers this between visits.

### Step 5.3 — Add your students

**Option A: One at a time**
- Type a student's name in the **Single Student — Name** field.
- A preview QR code appears as you type.
- Click **Add to Sheet** to add that student's card to the grid.

**Option B: All at once (recommended for a full class)**
- Open your Google Spreadsheet.
- Click on the first student's name in column A, then hold Shift
  and click the last student's name to select all names.
- Copy them (Ctrl+C).
- In the QR Generator, click inside the **Bulk Add** text area.
- Paste (Ctrl+V).
- Click **Generate All Cards**.
- All cards will appear in the grid below.

### Step 5.4 — Print the cards

- Click the **🖨 Print All Cards** button.
- Your browser's print dialog will open.
- Recommended print settings:
  - **Layout:** Portrait
  - **Margins:** Minimum / None
  - **Scale:** 100% (do not shrink to fit)
  - **Background graphics:** On (so borders print)
- Click **Print**.

Each card shows the school name, a QR code, and the student's name.
Cards are sized to fit 3 per row on a standard sheet of paper.

### Step 5.5 — Laminate and attach to lanyards (optional)

- Cut out each card.
- Laminate if possible (a laminator costs about $25 and laminates
  last years).
- Punch a hole in the top corner.
- Attach to a lanyard or keyring.

---

## PART 6 — Daily Use

### To take attendance:

1. Open the scanner on the tablet (tap the home screen icon).
2. Check that the connection dot is green.
3. Each student walks up and holds their lanyard QR code
   toward the tablet's camera.
4. The scanner beeps (if tablet sound is on) and shows the
   student's name in green with a checkmark.
5. That's it. The record is written to your Google Spreadsheet
   instantly.

### To view attendance records:

- Open your Google Spreadsheet.
- Click the **Attendance** tab at the bottom.
- Each row is one scan: Timestamp, Date, Student Name, Grade,
  School, Raw QR Value.
- You can sort, filter, or query this data however you like.

### If a student loses their card:

- Go to the QR Generator page.
- Enter the exact same school name.
- Type the student's name exactly as it appears in your
  Students sheet.
- Print the new card. It will be identical to the original —
  no changes needed anywhere.

---

## Troubleshooting

**The scanner says "Camera error"**
- Make sure you are using Chrome on Android.
- Make sure you tapped "Allow" when Chrome asked for camera
  permission. If you accidentally denied it:
  - In Chrome, tap the lock icon (🔒) or info icon (ℹ) in the
    address bar.
  - Tap **Permissions**.
  - Find Camera and set it to **Allow**.

**The connection dot is red or says "offline"**
- Check that you pasted the full backend URL into Settings.
- Make sure your tablet has an internet connection.
- In the Apps Script editor, check that your deployment is still
  active: click Deploy → Manage deployments.

**A student scans in but shows "UNKNOWN STUDENT" in yellow**
- This means the name encoded in their QR code does not match
  any name in your Students sheet.
- Common cause: a typo in the name either in the QR generator
  or in the spreadsheet. Check for extra spaces or different
  capitalization.
- The scan is still recorded in your Attendance tab, flagged
  as UNKNOWN.

**The same student scans twice very quickly**
- The scanner has a 3-second cooldown per card, so accidental
  double-scans are ignored automatically.
- If a student intentionally needs to be re-scanned (rare),
  wait 3 seconds.

**I need to update the student list**
- Simply edit your Students sheet — add, remove, or correct
  names as needed. No other changes are required.
- For any student whose name changed: generate a new QR code
  with the corrected name and replace their card.

---

## Quick Reference

| What                     | Where                                                           |
|--------------------------|-----------------------------------------------------------------|
| Backend code             | Google Apps Script (Extensions menu in your spreadsheet)        |
| Scanner page             | `https://YOUR-USERNAME.github.io/attendance-scanner/scanner.html`    |
| QR Generator             | `https://YOUR-USERNAME.github.io/attendance-scanner/qr-generator.html` |
| Attendance records       | Your Google Spreadsheet → Attendance tab                        |
| Student list             | Your Google Spreadsheet → Students tab                          |

---

*Setup guide version 1.0. All software used is free and open-source.*
*No subscriptions. No accounts beyond Google and GitHub.*
