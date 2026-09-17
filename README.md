# Wishlist

A personal wishlist tracking app with URL import, priority levels, and status tracking. Built with GitHub Pages frontend and Supabase backend.

## Features

- **Add items** with name, price, priority (High/Medium/Low), and notes
- **Import from URLs** — paste a product link, automatically scrapes title and price
- **Track status** — Wanted → Monitoring → Purchased
- **Filter & sort** — by priority, status, price, name, or date
- **Stats dashboard** — total items, count by status, total value
- **Responsive design** — works on desktop and mobile

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (GitHub Pages)
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **URL scraping**: Supabase Edge Function (fetch-product-meta)

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/chetcutijc/wishlist.git
cd wishlist
```

### 2. Supabase Configuration

The app is already connected to a Supabase project. Here are the credentials:

- **Project ID**: `tomzrvnvdywpffzjiesd`
- **Region**: EU (eu-west-1)
- **Database**: `wishlist_items`
- **Edge Function**: `fetch-product-meta`

These are embedded in `config.js`.

### 3. Enable GitHub Pages

1. Go to your repository Settings → Pages
2. Select "Deploy from a branch"
3. Set source to `main` branch, `/ (root)` folder
4. Save

Your wishlist will be live at: `https://chetcutijc.github.io/wishlist/`

### 4. Database Schema

The Supabase `wishlist_items` table has the following structure:

```sql
CREATE TABLE wishlist_items (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT,
  price NUMERIC(10, 2),
  priority TEXT (High, Medium, Low),
  status TEXT (Wanted, Monitoring, Purchased),
  notes TEXT,
  source_image_url TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Usage

### Add an Item

1. Click **+ Add Item**
2. Fill in name (required), URL, price, priority, status, and notes
3. Click **Save Item**

### Import from URL

1. Click **Import from URL**
2. Paste a product link (Amazon, retailer sites, etc.)
3. The Edge Function scrapes the title, price, and image
4. Complete the details (priority, notes) and save

**Supported sites**: Most e-commerce sites with proper Open Graph metadata. Falls back to parsing basic HTML if OG tags unavailable.

### Manage Items

- **Edit**: Click the "Edit" button on any card
- **Change Status**: Click status button to cycle: Wanted → Monitoring → Purchased
- **Delete**: Click the × button (prompts for confirmation)

### Filter & Sort

Use the dropdown menus to:
- Sort by: newest, oldest, priority, price, or name
- Filter by priority: High, Medium, or Low
- View by status tabs: All, Wanted, Monitoring, Purchased

## Project Structure

```
wishlist/
├── index.html        # Main HTML template
├── app.js            # Application logic (Supabase, rendering, interactions)
├── config.js         # Supabase credentials and API URLs
├── README.md         # This file
└── .gitignore        # Git ignore rules
```

## Edge Function Details

**Function**: `fetch-product-meta`

Deployed at: `https://tomzrvnvdywpffzjiesd.supabase.co/functions/v1/fetch-product-meta`

**Input**:
```json
{ "url": "https://example.com/product" }
```

**Output**:
```json
{
  "name": "Product Name",
  "source_image_url": "https://...",
  "price": 99.99
}
```

Extracts:
- Title from `og:title` or `<title>` tag
- Image from `og:image` or first `<img>` tag
- Price from common currency patterns ($, €, £)

## Customization

### Modify Styles

Edit the `<style>` section in `index.html`. Current color scheme:

- **High Priority**: Red/pink badges
- **Medium Priority**: Orange/amber badges
- **Low Priority**: Green badges
- **Wanted**: Blue status
- **Monitoring**: Yellow status
- **Purchased**: Green status

### Add More Priorities

Modify in `index.html`:
- Add option to `<select id="itemPriority">`
- Update CSS badge styles
- Update SQL CHECK constraint in Supabase

### Change Status Options

1. Update in `index.html` form: `<select id="itemStatus">`
2. Update Supabase table: Modify CHECK constraint on `status` column
3. Update status flow in `app.js`: `getNextStatus()` and badge styles

## Troubleshooting

### Items not loading?

1. Check browser console (F12) for errors
2. Verify Supabase credentials in `config.js`
3. Ensure RLS is disabled on `wishlist_items` table

### URL import not working?

1. Some sites block scraping — this is expected
2. Try filling in details manually
3. Check browser console for specific error

### Images not loading?

Sites may block image requests. The app gracefully falls back to a placeholder.

## Future Ideas

- Search/full-text search
- Tags for additional organization
- Price drop alerts
- Share wishlist with friends (public link)
- Export to CSV
- Mobile app version
- Dark mode

## License

MIT

## Author

Jean (@chetcutijc)
