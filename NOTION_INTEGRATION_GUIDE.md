# Notion API Integration Guide

## 🚀 Quick Start

### Step 1: Get Your Notion API Key
1. Visit https://www.notion.com/my-integrations
2. Click "Create new integration"
3. Name it (e.g., "WebNest")
4. Copy the **Internal Integration Token** (looks like `secret_abc123...`)

### Step 2: Configure in Web Nest
1. Click the **Settings ⚙️** button in the top-right header
2. Paste your Notion API token into the input field
3. Click **Save**

### Step 3: Share Your Pages with the Integration
In Notion:
1. Open any page you want to sync
2. Click **Share** → **Invite**
3. Search for your integration name (e.g., "WebNest")
4. Click to add it to your page
5. Done! The integration can now read that page

### Step 4: Add Notion Links to Web Nest
Simply paste any shared Notion page URL into the "New Link" form:
- ✅ `https://www.notion.com/My-Page-title-abc123def456`
- ✅ `https://notion.com/abc123def456`
- ✅ `https://academy.notion.com/...`

Web Nest will now automatically extract:
- 📄 Page title
- 📝 Page description
- 🖼️ Encoded cover image
- 🌐 Notion favicon

## ✨ What Gets Extracted

When you add a Notion page, the app will fetch:

| Field | Source |
|-------|--------|
| **Title** | Page's `Name` or `Title` property |
| **Description** | Page's `Description` field (first 200 chars) |
| **Image** | Page cover image URL |
| **Icon** | Notion favicon |

## 🔒 Security & Privacy

- ✅ Your API token is stored **locally in your browser only**
- ✅ Never sent to our servers
- ✅ You fully control who has access to your Notion pages
- ✅ The integration can only read pages you explicitly share
- ✅ Token can be cleared anytime from Settings

## ⚙️ Troubleshooting

### "API token is invalid or expired"
- Verify the token at https://www.notion.com/my-integrations
- Create a new integration and try again
- Make sure your integration has access to the page (Share with integration)

### "Notion page not found"
- Make sure the page is shared with your integration
- In Notion, click **Share** → add your integration
- Wait a few seconds for sync, then try again

### Images not loading
- Make sure the page has a cover image set
- The integration only reads public/shared page metadata

## 📚 How It Works Behind the Scenes

1. **URL Parsing**: Extracts the 32-character Notion page ID
2. **API Call**: Sends request to Notion API v2022-06-28
3. **Metadata Extraction**: Reads page properties and cover image
4. **Fallback Chain**: 
   - Tries Notion API first (if you configured it)
   - Falls back to Microlink if Notion API fails
   - Falls back to Noembed for other providers
   - Finally shows domain name with cached favicon

## 🔄 Fallback Behavior

If your Notion API token isn't configured, links still work! The app will:
1. Try Microlink API *(gets blocked by CloudFront)*
2. Try Noembed API *(not supported for Notion)*
3. Show domain name with fallback favicon

This is why configuring the Notion API key solves the `academy.notion.com` thumbnail issue!

## 💡 Tips & Tricks

- **Batch Add Pages**: You can add multiple Notion pages at once via import
- **Search Works**: All imported Notion pages are searchable
- **Categories**: Organize imported Notion pages with categories
- **Favorites**: Star important Notion pages in Web Nest
- **Sync**: New metadata is cached for 24 hours to save API calls

## Need Help?

If you encounter issues:
1. Check that the token is correct at https://www.notion.com/my-integrations
2. Verify the page is shared with your integration (Notion: Share → Invite)
3. Try clearing the token in Settings and re-entering it
4. Check browser console (F12) for detailed error messages
