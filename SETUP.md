# Wishlist App - Quick Setup Guide

Your wishlist app is ready to deploy! Here's everything you need:

## ✅ What's Already Done

- **Supabase Project Created**: `wishlist` (EU region)
  - Project ID: `tomzrvnvdywpffzjiesd`
  - Database tables set up with `wishlist_items` table
  - RLS disabled for public anon access
  - Edge Function deployed: `fetch-product-meta`

- **Frontend Code Ready**: 
  - `index.html` — UI with tabs, filters, modals
  - `app.js` — All app logic (add, edit, delete, import)
  - `config.js` — Supabase credentials pre-filled
  - `README.md` — Full documentation

## 🚀 Next Steps

### 1. Create GitHub Repository

```bash
# Initialize git in the wishlist folder
cd /path/to/wishlist
git init
git config user.name "Your Name"
git config user.email "your@email.com"

# Stage and commit
git add .
git commit -m "Initial commit: wishlist app"

# Create repo on GitHub: https://github.com/new
# Name: wishlist
# Public
# No template

# Connect and push
git remote add origin https://github.com/chetcutijc/wishlist.git
git branch -M main
git push -u origin main
```

### 2. Enable GitHub Pages

1. Go to: `https://github.com/chetcutijc/wishlist/settings/pages`
2. **Source**: Select "Deploy from a branch"
3. **Branch**: `main`
4. **Folder**: `/ (root)`
5. Click **Save**

GitHub will deploy in ~2 minutes. Your app will be live at:
```
https://chetcutijc.github.io/wishlist/
```

### 3. Test It Out

1. Navigate to your GitHub Pages URL
2. Click **+ Add Item** and create a test item
3. Try **Import from URL** with a product link
4. Play with filters, status updates, priorities

## 📋 Credentials Summary

**Supabase Project:**
```
URL: https://tomzrvnvdywpffzjiesd.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbXpydm52ZHl3cGZmanppZXNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc4NDg1MDUsImV4cCI6MTc2Njc2ODEwNX0.HF9xXPxK0EflUeEv9xXvL5pT1VW7eTKZ2k2e9Z8x9Ik
```

These are **public keys** (not secrets) — safe to commit to GitHub.

**Edge Function:**
```
POST https://tomzrvnvdywpffzjiesd.supabase.co/functions/v1/fetch-product-meta
```

## 📚 Database Schema

```
Table: wishlist_items

Columns:
- id (UUID, PK)
- name (text, required)
- url (text, optional)
- price (numeric, optional)
- priority (text: High, Medium, Low)
- status (text: Wanted, Monitoring, Purchased)
- notes (text, optional)
- source_image_url (text, optional)
- created_at (timestamp, auto)
- updated_at (timestamp, auto)
```

## 🎯 Features Included

✓ Add/edit/delete wishlist items  
✓ Import product metadata from URLs  
✓ Filter by priority (High/Medium/Low)  
✓ Track status (Wanted → Monitoring → Purchased)  
✓ Sort by: newest, priority, price, name  
✓ Stats dashboard (total items, value, counts by status)  
✓ Responsive design (desktop & mobile)  
✓ Zero cost (free Supabase tier + GitHub Pages)  

## 🔧 Customization

All styling in `index.html` `<style>` section:
- Modify colors, spacing, fonts
- Change badge colors for priorities/status
- Adjust grid layout for item cards

Add features by editing `app.js`:
- Add more status options
- Implement search
- Add categories/tags
- Price tracking history

## 📞 Support

- Supabase Dashboard: https://app.supabase.com
- Check Edge Function logs in Supabase dashboard (Functions → fetch-product-meta)
- Browser console (F12) for JavaScript errors
- GitHub Pages status: https://github.com/chetcutijc/wishlist/deployments

## ⚡ Tips

1. **URL imports work best with**: Amazon, retail sites, product pages with Open Graph metadata
2. **If images don't load**: Some sites block scraping; fill in manually
3. **Free tier limits**: Supabase free tier has generous limits for personal projects
4. **Backup your data**: Supabase auto-backups daily; you can also export from dashboard

---

**You're all set!** Push to GitHub, enable Pages, and start wishlisting! 🎁
