# Daily Rundown

Your daily schedule as an app you can install on your phone. Check-offs and notes are saved on the phone itself.

## What's in this folder

| File | What it is | Edit it? |
|---|---|---|
| `schedule.js` | **The schedule**: every block, time, goal, stream day and color category | **Yes, this is the one** |
| `index.html` | The page layout | Rarely |
| `styles.css` | Colors and look (`--c-free`, `--c-body`, …) | Only to change colors |
| `app.js` | Check-offs, saving, week board, backup | No |
| `sw.js` | Lets the app open offline | No |
| `manifest.webmanifest`, `icons/` | App name and home-screen icon | No |

## One-time setup (about 15 minutes, no software to install)

1. **Make a GitHub account** at github.com if you don't have one.
2. **Create a repository**: click **+ → New repository**, name it `schedule`, set it to **Public**, and click **Create repository**.
   GitHub Pages is free only for public repositories. Anyone with the link can see your schedule layout, but **not** your check-offs or notes: those never leave your phone.
3. **Upload the files**: on the new repo page, click **uploading an existing file**. Drag in everything inside this `app` folder, including the `icons` folder. Then click **Commit changes**.
4. **Turn on GitHub Pages**: go to **Settings → Pages**. Under **Branch**, pick `main` and `/ (root)`, then **Save**. After a minute or two the page shows your link: `https://YOUR-USERNAME.github.io/schedule/`.
5. **Install it on your S24**: open that link in **Chrome** on the phone, tap the **⋮** menu, then **Install app** (or **Add to Home screen**). Daily Rundown gets its own icon and opens full screen.

## Changing the schedule later

Only `schedule.js` needs to change. Any of these work:

- **Ask Claude** to make the change in `schedule.js` in this folder, then upload the new file: on GitHub, open the repo, **Add file → Upload files**, drag in `schedule.js`, **Commit changes**.
- **Edit right on GitHub**, even from your phone: open `schedule.js` on github.com, tap the **pencil** icon, make the change, **Commit changes**.

Your phone picks up the new version the next time you open the app while online. GitHub can take up to about 10 minutes to serve the new file. Your check-offs aren't touched by schedule changes.

Tip: if you change a block's `id` (the first word in quotes in a `task(...)` line), past check-offs for that block won't show anymore. Changing its name, time, length or goal is always safe.

## Backups

Check-offs live only on the phone. Use **Export backup** in the app now and then. It saves a `.json` file to your Downloads. To move to a new phone, install the app there and use **Import backup**.
