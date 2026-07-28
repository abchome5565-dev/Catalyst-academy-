# Ledger LMS — Deployment Guide (Roman Urdu)

Ye ek React app hai jo Supabase database ke sath connected hai. Public link banane
ke liye 2 steps hain: (1) Supabase par database banana, (2) Vercel par app deploy karna.
Dono free hain.

## Step 1 — Supabase par database banayein (5 min)

1. https://supabase.com par jayein, free account banayein.
2. "New Project" par click karein, koi bhi naam aur password rakh dein, region select
   karein, aur "Create new project" dabayein. 1-2 minute lagega.
3. Left sidebar mein "SQL Editor" par jayein.
4. Is project ke `supabase-schema.sql` file ka pura content copy karein aur SQL Editor
   mein paste karke "Run" dabayein. Isse aapke 4 tables (questions, papers, students,
   attempts) ban jayenge.
5. Left sidebar mein "Project Settings" → "API" par jayein. Wahan se 2 cheezein copy
   kar lein:
   - **Project URL** (kuch is tarah: `https://xxxx.supabase.co`)
   - **anon public key** (ek lambi string)

## Step 2 — App ko GitHub par upload karein

1. https://github.com par account banayein (agar nahi hai).
2. Naya repository banayein (e.g. `ledger-lms`), public ya private, koi farq nahi.
3. Is poore project folder (`lms-project`) ka content us repository mein upload
   kar dein — GitHub website par "uploading an existing file" option se seedha
   drag-and-drop bhi ho sakta hai, ya `git` command line se.

## Step 3 — Vercel par deploy karein (5 min)

1. https://vercel.com par jayein, GitHub account se sign up karein.
2. "Add New Project" par click karein, apni `ledger-lms` repository select karein.
3. Deploy karne se pehle "Environment Variables" section mein ye 2 values daal dein
   (Step 1 se copy ki hui):
   - `VITE_SUPABASE_URL` = aapka Project URL
   - `VITE_SUPABASE_ANON_KEY` = aapka anon public key
4. "Deploy" dabayein. 1-2 minute mein aapko ek live public link mil jayega, jaise:
   `https://ledger-lms.vercel.app`

Ye link aap teachers aur students ke sath share kar sakte hain — koi bhi is se
seedha browser mein LMS use kar sakega, aur data (papers, results, accounts)
hamesha Supabase mein save rahega.

## Important note on privacy

Is prototype mein koi password-based login nahi hai (student sirf apna naam/roll
number se account banata hai), aur database ki security policy sab ke liye
read/write khuli hai — taake link seedha kaam kare bina alag se auth system ke.
Ye ek chhoti class/demo ke liye theek hai. Agar bara scale par (multiple schools,
sensitive data) use karna ho, to real authentication (Supabase Auth) aur tighter
security rules add karwana behtar hoga — us ke liye bata dein, main wo bhi bana
sakta hoon.

## Local testing (optional)

```bash
npm install
cp .env.example .env   # then fill in your Supabase URL and anon key
npm run dev
```
