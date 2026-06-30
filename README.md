# Blossom SMP — Website

Static site, no build step. Plain HTML/CSS/JS.

## Deploy on Cloudflare Pages (via GitHub)

1. **Push this folder to a GitHub repo.**
   ```bash
   git init
   git add .
   git commit -m "Blossom SMP site"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

2. **Connect it in Cloudflare:**
   - Go to the Cloudflare dashboard → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
   - Pick your GitHub account, then this repo.
   - Build settings:
     - **Framework preset:** None
     - **Build command:** *(leave empty)*
     - **Build output directory:** `/`
   - Click **Save and Deploy**.

That's it — Cloudflare builds nothing, it just serves the files as-is. Every push to `main` auto-redeploys.

3. **(Optional) Custom domain:** Pages project → Custom domains → add your domain, point its DNS to Cloudflare if it isn't already.

## File structure
```
/
├── index.html
├── rules.html
├── gallery.html
├── changelog.html
├── admin.html
└── assets/
    ├── css/style.css
    ├── js/main.js
    └── img/gallery/
```

## About the admin panel (`/admin.html`)
Password-gated (default `blossom123`, change it from the Settings tab). It edits the homepage hero/about text and the changelog list.

**Important:** this currently saves to `localStorage` in your browser only. That means edits you make are only visible to you, on that browser/device — not to other visitors. It's fine for previewing changes locally, but it does **not** sync changes to the live site for everyone.

If you want edits to actually go live for all visitors, you need a tiny bit of backend — the easiest path on Cloudflare is a **Pages Function + KV namespace** (a few lines of code, free tier covers this easily). Ask and I'll wire that up: it'd let the admin panel save real changes that every visitor sees, with no separate server to host.

## Updating server IP / Discord link
Search-and-replace across the HTML files:
- IP: `108.181.119.197`
- Discord invite: `discord.gg/Z3HkAgtzfa`
