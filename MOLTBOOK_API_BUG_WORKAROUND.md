# Moltbook API Bug Workaround & Fixes

**Date:** February 2, 2026  
**Status:** ✅ Workarounds Implemented

## 🐛 Known Moltbook API Bug

### Issue Description
Moltbook API has a confirmed bug with dynamic route endpoints that require authentication:

**Affected Endpoints:**
- `POST /api/v1/posts/{id}/comments` ❌ (Comment posting)
- `POST /api/v1/posts/{id}/upvote` ❌ (Upvoting)
- `POST /api/v1/submolts/{name}/subscribe` ❌ (Subscribing)
- `GET /api/v1/posts/{id}` ❌ (Single post fetch)
- `GET /api/v1/search` ❌ (Search)

**Working Endpoints:**
- `POST /api/v1/posts` ✅ (Creating posts)
- `GET /api/v1/posts` ✅ (Listing posts)
- `GET /api/v1/agents/me` ✅ (Agent status)
- `GET /api/v1/feed` ✅ (Feed)

### Root Cause
Dynamic route parameters (`{id}`, `{name}`) fail to pass authentication headers on POST requests. This appears to be a Vercel routing issue with dynamic segments.

### Source
- **Bug Report:** https://moltbookai.net/en/post/ea614230-ac33-4fa9-8d8a-22088a347930
- **Reported By:** VenusBot 🦊
- **Platform:** Moltbook AI
- **Status:** Unresolved (platform issue)

## 🔧 Our Workarounds

### 1. Enhanced Error Messages
Added clear error messages explaining the Moltbook API bug:

```javascript
console.log('[Reply] ⚠️ KNOWN ISSUE: Moltbook API has a bug with comment endpoints');
console.log('[Reply] Dynamic routes (/posts/{id}/comments) may fail with "Authentication required"');
console.log('[Reply] This is a Moltbook platform issue, not our app issue');
console.log('[Reply] See: https://moltbookai.net/en/post/ea614230-ac33-4fa9-8d8a-22088a347930');
```

### 2. User-Friendly Error Display
When comment posting fails, users see:
```
❌ Authentication failed. Authentication required
Please complete the claim process on Moltbook.

Note: This may also be due to a known Moltbook API bug with comment endpoints.
```

### 3. Detailed Logging
All API calls now include:
- Request details (URL, headers, body)
- Response status and data
- Error context and troubleshooting steps

## ✅ Fixes Implemented

### 1. Draft Deletion After Publishing
**Problem:** Published posts remained in Saved Drafts

**Solution:**
- After successful post publishing, automatically delete matching draft
- Matches by title AND body content
- Works for both manual publishing and auto-post queue
- Graceful error handling (doesn't fail publish if draft deletion fails)

**Code:**
```javascript
// Delete matching draft if exists
const drafts = store.getDrafts();
const matchingDraft = drafts.find(d => 
  d.title === data.title && d.body === data.body
);

if (matchingDraft) {
  store.deleteDraft(matchingDraft.id);
  console.log('[Publish] ✅ Draft deleted from Saved Drafts');
}
```

### 2. Auto-Post Queue Enhancement
**Problem:** Countdown showed "READY TO POST" but didn't explain auto-posting

**Solution:**
- Enhanced countdown message: "✅ READY TO POST!"
- Subtitle: "Queue will auto-post next draft"
- Rocket icon (🚀) for ready state
- Extended display time (10 seconds)
- Refreshes drafts page automatically
- Refreshes dashboard to show activity

**Code:**
```javascript
countdownElement.textContent = '✅ READY TO POST!';
document.querySelector('.rate-limit-subtitle').textContent = 'Queue will auto-post next draft';
document.querySelector('.rate-limit-icon').textContent = '🚀';
```

### 3. Dashboard Activity Refresh
**Problem:** Dashboard didn't update after auto-posting

**Solution:**
- Added dashboard refresh on queue-post-published event
- Shows recent activity immediately
- Updates all relevant pages (posts, drafts, dashboard)

## 📋 User Instructions

### For Comment Posting (Currently Broken)
1. **Understand the limitation:** Comment posting is broken due to Moltbook API bug
2. **Alternative:** Post new content instead of commenting
3. **Wait for fix:** Monitor Moltbook for API bug fixes
4. **Workaround:** Use Moltbook web interface for commenting

### For Auto-Post Queue
1. **Add drafts to queue:** Check "Auto-Post" checkbox on drafts
2. **Wait for countdown:** Rate limit countdown shows time remaining
3. **Ready state:** When countdown ends, shows "✅ READY TO POST!"
4. **Automatic posting:** Queue processor posts first draft automatically (every 30 seconds check)
5. **Draft cleanup:** Published draft is automatically removed from Saved Drafts

### For Safe Mode
- **Enabled:** No auto-posting, no manual posting
- **Disabled:** Auto-posting works, manual posting works
- **Toggle:** Use sidebar switch or Settings page

## 🔍 Troubleshooting

### "Authentication required" Error
**Possible Causes:**
1. Agent not claimed on Moltbook (most common)
2. Moltbook API bug with dynamic routes (for comments)
3. API key expired or invalid
4. Safe Mode enabled

**Solutions:**
1. Complete claim process on Moltbook
2. Check Settings → Agent Status
3. Verify API key is valid
4. Disable Safe Mode if needed
5. For comments: Wait for Moltbook to fix API bug

### Auto-Post Not Working
**Check:**
1. ✅ Safe Mode is disabled
2. ✅ Draft has "Auto-Post" checked
3. ✅ Rate limit countdown has ended
4. ✅ Agent is claimed and active
5. ✅ Queue processor is running (automatic)

**Debug:**
- Check console for "[Queue]" messages
- Verify rate limit status
- Check agent status in Settings

## 📊 Impact Assessment

### What Works ✅
- ✅ Post creation
- ✅ Post listing
- ✅ Agent status checks
- ✅ Feed browsing
- ✅ Auto-post queue
- ✅ Draft management
- ✅ Rate limit tracking
- ✅ Dashboard activity

### What's Broken ❌ (Due to Moltbook API Bug)
- ❌ Comment posting
- ❌ Post upvoting
- ❌ Submolt subscribing
- ❌ Single post fetching
- ❌ Search functionality

### Workaround Status
- ✅ Clear error messages implemented
- ✅ User guidance provided
- ✅ Logging enhanced for debugging
- ✅ Alternative workflows suggested
- ⏳ Waiting for Moltbook API fix

## 🚀 Future Improvements

### When Moltbook Fixes API
1. Remove workaround messages
2. Enable comment posting
3. Enable upvoting
4. Enable subscribing
5. Test all dynamic route endpoints

### Additional Features
- Retry logic for failed comments
- Queue for comments (like posts)
- Offline comment drafting
- Comment templates

## 📝 Technical Details

### Files Modified
- `electron/main.js` - Added draft deletion, enhanced logging
- `electron/renderer/app.js` - Enhanced countdown, added dashboard refresh
- `MOLTBOOK_API_BUG_WORKAROUND.md` - This documentation

### API Endpoints Used
```
Working:
POST https://www.moltbook.com/api/v1/posts
GET  https://www.moltbook.com/api/v1/posts
GET  https://www.moltbook.com/api/v1/agents/me
GET  https://www.moltbook.com/api/v1/feed

Broken (Moltbook bug):
POST https://www.moltbook.com/api/v1/posts/{id}/comments
POST https://www.moltbook.com/api/v1/posts/{id}/upvote
POST https://www.moltbook.com/api/v1/submolts/{name}/subscribe
GET  https://www.moltbook.com/api/v1/posts/{id}
GET  https://www.moltbook.com/api/v1/search
```

### Authentication
- **Method:** Bearer token
- **Header:** `Authorization: Bearer {API_KEY}`
- **Issue:** Dynamic routes don't receive auth header properly

## 🔗 References

- **Bug Report:** https://moltbookai.net/en/post/ea614230-ac33-4fa9-8d8a-22088a347930
- **Moltbook Platform:** https://www.moltbook.com
- **Our Repository:** https://github.com/WeAreTheArtMakers/watamai

---

**Note:** This is a platform-level issue with Moltbook, not a bug in our application. We've implemented workarounds and clear error messages to help users understand the limitation.
