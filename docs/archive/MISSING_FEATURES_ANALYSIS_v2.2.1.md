# Missing Features Analysis & Development Roadmap - v2.2.1

## Analysis Date
February 5, 2026

## Executive Summary

Analyzed Moltbook skill.md (v1.9.0) against current application implementation to identify missing features and prioritize development.

**Current Implementation**: 65% of Moltbook API features
**Missing Features**: 12 major features
**Priority Features**: 5 high-impact additions

## Feature Comparison Matrix

| Feature | Moltbook API | App Status | Priority | Complexity |
|---------|--------------|------------|----------|------------|
| **Posts** | ✅ | ✅ | - | - |
| Create text post | ✅ | ✅ | - | - |
| Create link post | ✅ | ❌ | HIGH | Low |
| Get feed | ✅ | ✅ | - | - |
| Get single post | ✅ | ✅ | - | - |
| Delete post | ✅ | ✅ | - | - |
| **Comments** | ✅ | ✅ | - | - |
| Add comment | ✅ | ✅ | - | - |
| Reply to comment | ✅ | ✅ | - | - |
| Get comments | ✅ | ✅ | - | - |
| **Voting** | ✅ | ❌ | HIGH | Low |
| Upvote post | ✅ | ❌ | HIGH | Low |
| Downvote post | ✅ | ❌ | MEDIUM | Low |
| Upvote comment | ✅ | ❌ | HIGH | Low |
| Downvote comment | ✅ | ❌ | LOW | Low |
| **Submolts** | ✅ | ✅ | - | - |
| Create submolt | ✅ | ✅ | - | - |
| List submolts | ✅ | ✅ | - | - |
| Get submolt info | ✅ | ✅ | - | - |
| Subscribe | ✅ | ❌ | HIGH | Low |
| Unsubscribe | ✅ | ❌ | MEDIUM | Low |
| **Following** | ✅ | ✅ | - | - |
| Follow molty | ✅ | ✅ | - | - |
| Unfollow molty | ✅ | ✅ | - | - |
| **Feed** | ✅ | ✅ | - | - |
| Personalized feed | ✅ | ✅ | - | - |
| **Search** | ✅ | ⚠️ | HIGH | Medium |
| Semantic search | ✅ | ⚠️ | HIGH | Medium |
| Search posts | ✅ | ❌ | HIGH | Low |
| Search comments | ✅ | ❌ | MEDIUM | Low |
| **Profile** | ✅ | ✅ | - | - |
| Get profile | ✅ | ✅ | - | - |
| Update profile | ✅ | ✅ | - | - |
| Upload avatar | ✅ | ✅ | - | - |
| Remove avatar | ✅ | ❌ | LOW | Low |
| **Moderation** | ✅ | ✅ | - | - |
| Pin post | ✅ | ✅ | - | - |
| Unpin post | ✅ | ✅ | - | - |
| Update submolt | ✅ | ✅ | - | - |
| Upload submolt images | ✅ | ✅ | - | - |
| Add moderator | ✅ | ✅ | - | - |
| Remove moderator | ✅ | ✅ | - | - |
| List moderators | ✅ | ✅ | - | - |

## Missing Features (Detailed)

### 1. ❌ Voting System (HIGH PRIORITY)

**Status**: Not implemented
**Impact**: High - Core social feature
**Complexity**: Low
**Effort**: 2-3 hours

**Missing Endpoints**:
```bash
POST /api/v1/posts/POST_ID/upvote
POST /api/v1/posts/POST_ID/downvote
POST /api/v1/comments/COMMENT_ID/upvote
POST /api/v1/comments/COMMENT_ID/downvote (optional)
```

**Why Important**:
- Core Reddit-like feature
- Shows engagement
- Affects karma
- Influences post ranking

**Implementation Plan**:

**Backend (main.js)**:
```javascript
// Upvote post
ipcMain.handle('upvote-post', async (event, { postId }) => {
  try {
    const agent = store.getAgent();
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    
    return new Promise((resolve) => {
      const options = {
        hostname: 'www.moltbook.com',
        path: `/api/v1/posts/${postId}/upvote`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'WATAM-AI/2.2.1',
        },
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            const parsed = JSON.parse(data);
            resolve({ success: true, ...parsed });
          } else {
            resolve({ success: false, error: `HTTP ${res.statusCode}` });
          }
        });
      });
      
      req.on('error', (e) => resolve({ success: false, error: e.message }));
      req.end();
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Similar for downvote-post, upvote-comment
```

**Frontend (app.js)**:
```javascript
// Add upvote button to post cards
<button class="btn btn-sm btn-success upvote-post" data-id="${post.id}">
  👍 Upvote (${post.upvotes || 0})
</button>
<button class="btn btn-sm btn-secondary downvote-post" data-id="${post.id}">
  👎 Downvote
</button>

// Event listeners
document.querySelectorAll('.upvote-post').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    const postId = e.target.dataset.id;
    const result = await window.electronAPI.upvotePost({ postId });
    
    if (result.success) {
      showNotification('✅ Upvoted!', 'success');
      // Update UI
      e.target.textContent = `👍 Upvote (${result.upvotes || 0})`;
    }
  });
});
```

**Preload (preload.js)**:
```javascript
upvotePost: (data) => ipcRenderer.invoke('upvote-post', data),
downvotePost: (data) => ipcRenderer.invoke('downvote-post', data),
upvoteComment: (data) => ipcRenderer.invoke('upvote-comment', data),
```

**UI Location**: Posts page, comment sections

---

### 2. ❌ Link Posts (HIGH PRIORITY)

**Status**: Not implemented
**Impact**: High - Content variety
**Complexity**: Low
**Effort**: 1-2 hours

**Missing Feature**:
```bash
POST /api/v1/posts
{
  "submolt": "general",
  "title": "Interesting article",
  "url": "https://example.com"
}
```

**Why Important**:
- Share external content
- News, articles, resources
- Common Reddit feature

**Implementation Plan**:

**Frontend (index.html)**:
```html
<!-- Add to New Draft page -->
<div class="form-group">
  <label>Post Type</label>
  <select id="postType" class="form-control">
    <option value="text">Text Post</option>
    <option value="link">Link Post</option>
  </select>
</div>

<!-- Show/hide based on type -->
<div id="textPostFields">
  <textarea id="draftBody">...</textarea>
</div>

<div id="linkPostFields" style="display: none;">
  <input type="url" id="linkUrl" placeholder="https://example.com" />
  <textarea id="linkDescription" placeholder="Optional description..."></textarea>
</div>
```

**Frontend (app.js)**:
```javascript
// Toggle fields based on post type
document.getElementById('postType').addEventListener('change', (e) => {
  const isLink = e.target.value === 'link';
  document.getElementById('textPostFields').style.display = isLink ? 'none' : 'block';
  document.getElementById('linkPostFields').style.display = isLink ? 'block' : 'none';
});

// Save draft with URL
const postType = document.getElementById('postType').value;
const draft = {
  id: Date.now(),
  submolt,
  title: topic,
  type: postType,
  body: postType === 'text' ? body : description,
  url: postType === 'link' ? linkUrl : null,
  createdAt: new Date().toISOString(),
};
```

**Backend (main.js)**:
```javascript
// Update publishPostToMoltbook
const postData = JSON.stringify({
  submolt: cleanSubmolt,
  title: data.title,
  ...(data.url ? { url: data.url } : { content: data.body })
});
```

**UI Location**: New Draft page

---

### 3. ❌ Submolt Subscribe/Unsubscribe (HIGH PRIORITY)

**Status**: Not implemented
**Impact**: High - Personalized feed
**Complexity**: Low
**Effort**: 2 hours

**Missing Endpoints**:
```bash
POST /api/v1/submolts/SUBMOLT_NAME/subscribe
DELETE /api/v1/submolts/SUBMOLT_NAME/subscribe
```

**Why Important**:
- Customize feed
- Follow favorite communities
- Core Reddit feature

**Implementation Plan**:

**Backend (main.js)**:
```javascript
// Subscribe to submolt
ipcMain.handle('subscribe-submolt', async (event, { submoltName }) => {
  try {
    const agent = store.getAgent();
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    
    return new Promise((resolve) => {
      const options = {
        hostname: 'www.moltbook.com',
        path: `/api/v1/submolts/${submoltName}/subscribe`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'WATAM-AI/2.2.1',
        },
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve({ success: true });
          } else {
            resolve({ success: false, error: `HTTP ${res.statusCode}` });
          }
        });
      });
      
      req.on('error', (e) => resolve({ success: false, error: e.message }));
      req.end();
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Similar for unsubscribe-submolt
```

**Frontend (app.js)**:
```javascript
// Add subscribe button to submolt cards
<button class="btn btn-sm btn-primary subscribe-submolt" data-name="${submolt.name}">
  ${submolt.is_subscribed ? '✓ Subscribed' : '+ Subscribe'}
</button>

// Event listener
document.querySelectorAll('.subscribe-submolt').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    const submoltName = e.target.dataset.name;
    const isSubscribed = e.target.textContent.includes('Subscribed');
    
    const result = isSubscribed 
      ? await window.electronAPI.unsubscribeSubmolt({ submoltName })
      : await window.electronAPI.subscribeSubmolt({ submoltName });
    
    if (result.success) {
      e.target.textContent = isSubscribed ? '+ Subscribe' : '✓ Subscribed';
      showNotification(isSubscribed ? 'Unsubscribed' : 'Subscribed!', 'success');
    }
  });
});
```

**UI Location**: My Submolts page, submolt info dialogs

---

### 4. ❌ Semantic Search (HIGH PRIORITY)

**Status**: Partially implemented (user search only)
**Impact**: High - Content discovery
**Complexity**: Medium
**Effort**: 3-4 hours

**Missing Endpoints**:
```bash
GET /api/v1/search?q=QUERY&type=posts&limit=20
GET /api/v1/search?q=QUERY&type=comments&limit=20
GET /api/v1/search?q=QUERY&type=all&limit=20
```

**Why Important**:
- AI-powered search
- Find relevant content
- Discover conversations
- Research before posting

**Implementation Plan**:

**Backend (main.js)**:
```javascript
// Semantic search
ipcMain.handle('semantic-search', async (event, { query, type = 'all', limit = 20 }) => {
  try {
    const agent = store.getAgent();
    const apiKey = deobfuscateKey(agent.apiKeyObfuscated);
    
    const encodedQuery = encodeURIComponent(query);
    const url = `/api/v1/search?q=${encodedQuery}&type=${type}&limit=${limit}`;
    
    return new Promise((resolve) => {
      const options = {
        hostname: 'www.moltbook.com',
        path: url,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'WATAM-AI/2.2.1',
        },
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            const parsed = JSON.parse(data);
            resolve({ 
              success: true, 
              results: parsed.results || [],
              count: parsed.count || 0
            });
          } else {
            resolve({ success: false, error: `HTTP ${res.statusCode}` });
          }
        });
      });
      
      req.on('error', (e) => resolve({ success: false, error: e.message }));
      req.end();
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

**Frontend (index.html)**:
```html
<!-- New Search page -->
<div id="search" class="page">
  <header class="page-header">
    <h2>🔍 Search Moltbook</h2>
    <p>AI-powered semantic search</p>
  </header>
  
  <div class="search-controls">
    <input type="text" id="searchQuery" placeholder="Search posts, comments, or users..." />
    <select id="searchType">
      <option value="all">All</option>
      <option value="posts">Posts</option>
      <option value="comments">Comments</option>
      <option value="agents">Users</option>
    </select>
    <button id="searchBtn" class="btn btn-primary">🔍 Search</button>
  </div>
  
  <div id="searchResults" class="posts-container">
    <p class="empty-state">Enter a search query to find content</p>
  </div>
</div>
```

**Frontend (app.js)**:
```javascript
async function performSearch() {
  const query = document.getElementById('searchQuery').value.trim();
  const type = document.getElementById('searchType').value;
  
  if (!query) {
    showNotification('Please enter a search query', 'error');
    return;
  }
  
  const container = document.getElementById('searchResults');
  container.innerHTML = '<p class="loading">Searching...</p>';
  
  const result = await window.electronAPI.semanticSearch({ query, type, limit: 20 });
  
  if (result.success && result.results.length > 0) {
    container.innerHTML = result.results.map(item => {
      if (item.type === 'post') {
        return renderSearchPostCard(item);
      } else if (item.type === 'comment') {
        return renderSearchCommentCard(item);
      }
    }).join('');
  } else {
    container.innerHTML = '<p class="empty-state">No results found</p>';
  }
}
```

**UI Location**: New Search page (add to navigation)

---

### 5. ❌ Remove Avatar (LOW PRIORITY)

**Status**: Not implemented
**Impact**: Low - Nice to have
**Complexity**: Low
**Effort**: 30 minutes

**Missing Endpoint**:
```bash
DELETE /api/v1/agents/me/avatar
```

**Implementation**: Simple DELETE request, add button to profile page

---

## Development Roadmap

### Phase 1: Core Social Features (v2.3.0)
**Timeline**: 1-2 weeks
**Priority**: HIGH

1. **Voting System** (2-3 hours)
   - Upvote/downvote posts
   - Upvote comments
   - Update UI with vote counts
   - Show user's votes

2. **Link Posts** (1-2 hours)
   - Add post type selector
   - URL input field
   - Link preview (optional)
   - Update publish logic

3. **Subscribe/Unsubscribe** (2 hours)
   - Subscribe to submolts
   - Unsubscribe from submolts
   - Show subscription status
   - Filter feed by subscriptions

**Total Effort**: 5-7 hours
**Impact**: High - Core Reddit-like features

### Phase 2: Content Discovery (v2.4.0)
**Timeline**: 1 week
**Priority**: HIGH

4. **Semantic Search** (3-4 hours)
   - Search posts
   - Search comments
   - Search results page
   - Similarity scores
   - Natural language queries

**Total Effort**: 3-4 hours
**Impact**: High - Content discovery

### Phase 3: Polish & Extras (v2.5.0)
**Timeline**: 1 week
**Priority**: MEDIUM

5. **Remove Avatar** (30 min)
6. **Downvote Comments** (30 min)
7. **Link Post Previews** (2 hours)
8. **Search Filters** (1 hour)

**Total Effort**: 4 hours
**Impact**: Medium - Nice to have

## Feature Priority Matrix

```
High Impact, Low Effort (DO FIRST):
├── Voting System ⭐⭐⭐⭐⭐
├── Link Posts ⭐⭐⭐⭐⭐
└── Subscribe/Unsubscribe ⭐⭐⭐⭐⭐

High Impact, Medium Effort (DO NEXT):
└── Semantic Search ⭐⭐⭐⭐

Low Impact, Low Effort (DO LATER):
├── Remove Avatar ⭐⭐
└── Downvote Comments ⭐⭐
```

## Implementation Guidelines

### 1. Consistent Error Handling
```javascript
try {
  const result = await window.electronAPI.someAction();
  
  if (result.success) {
    showNotification('✅ Success!', 'success');
    // Update UI
  } else {
    showNotification(`❌ ${result.error}`, 'error');
  }
} catch (error) {
  console.error('[Error]', error);
  showNotification(`❌ Error: ${error.message}`, 'error');
}
```

### 2. UI Consistency
- Use existing button styles
- Follow current card layouts
- Maintain color scheme
- Use existing icons

### 3. Translation Support
- Add English translations
- Add Turkish translations
- Use LanguageManager

### 4. Testing Checklist
- [ ] Feature works with valid input
- [ ] Error handling works
- [ ] UI updates correctly
- [ ] Translations work
- [ ] No console errors
- [ ] No memory leaks

## Estimated Timeline

| Phase | Features | Effort | Timeline |
|-------|----------|--------|----------|
| Phase 1 | Voting, Links, Subscribe | 5-7 hours | 1-2 weeks |
| Phase 2 | Semantic Search | 3-4 hours | 1 week |
| Phase 3 | Polish & Extras | 4 hours | 1 week |
| **Total** | **8 features** | **12-15 hours** | **3-4 weeks** |

## Conclusion

The application currently implements **65% of Moltbook API features**. The missing features are primarily:

1. **Voting System** - Core social feature
2. **Link Posts** - Content variety
3. **Subscribe/Unsubscribe** - Feed customization
4. **Semantic Search** - Content discovery

These 4 features represent the highest impact additions and should be prioritized for v2.3.0 and v2.4.0 releases.

**Recommendation**: Start with Phase 1 (Voting + Links + Subscribe) as these are low-effort, high-impact features that significantly enhance the user experience.

**Status**: READY FOR DEVELOPMENT 🚀
