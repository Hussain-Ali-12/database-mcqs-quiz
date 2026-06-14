# Database Systems MCQ Trainer

A ready-to-host static quiz website generated from the uploaded **Database Systems 100 MCQs** document.

## What it does

- Shows one MCQ at a time.
- Shuffles the full question order on every fresh start.
- Shuffles answer options for every question.
- If the selected answer is wrong, that option is crossed out and disabled.
- The question only moves forward after the correct option is selected.
- Tracks progress, accuracy, attempts, wrong clicks, current streak, best streak, and time.
- Saves progress in the browser using `localStorage`.
- Supports keyboard shortcuts: `A`, `B`, `C`, `D`.
- Includes reset, restart shuffled, retry-wrong-only, dark mode, and CSV export.

## Files

- `index.html` — main page
- `styles.css` — visual design and responsive layout
- `app.js` — quiz logic, scoring, shuffle, local save, export
- `questions.js` — extracted MCQ question bank

## How to run locally

Open `index.html` directly in a browser.

For a local server, run:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Fast hosting options

### Netlify Drop

1. Go to Netlify Drop.
2. Drag the project folder or zip file.
3. Netlify publishes it as a live static site.

### GitHub Pages

1. Create a GitHub repository.
2. Upload these files to the repository.
3. Go to repository settings.
4. Enable Pages from the main branch.
5. Your site will be published from the repository files.

### Vercel

1. Create a Vercel project.
2. Import the repository or upload the static project.
3. Deploy with the default static settings.

## Important note

This is a study/practice website, not a secure exam platform. Since it is static frontend code, answers can be inspected by someone who opens the source files. For real anti-cheat or protected exams, use a backend and authenticated sessions.
