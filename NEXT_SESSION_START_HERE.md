# 🚀 Next Session - Start Here!

## Quick Context

We're implementing a **major dashboard redesign** with user management features.

---

## 📋 What We're Building

### 1. User Search & Follow System
- Search users by name
- View user profiles  
- Follow/unfollow users
- See who follows us

### 2. Fixed Agent Status Display
- Show correct LAST CHECK time
- Show correct REPLIES TODAY count
- Real-time updates from backend

### 3. Modern Dashboard Design
- Professional layout
- Easy to use
- Cyberpunk-solar theme
- User-friendly

---

## 🎯 Implementation Order

### Phase 1: Backend (30 min)
1. Add IPC handlers in `electron/main.js`
2. Expose APIs in `electron/preload.js`
3. Test with console

### Phase 2: Frontend HTML (20 min)
1. Redesign dashboard in `electron/renderer/index.html`
2. Add user search section
3. Add followers section

### Phase 3: Frontend CSS (20 min)
1. Style new sections in `electron/renderer/styles.css`
2. Match cyberpunk-solar theme
3. Responsive design

### Phase 4: Frontend JS (30 min)
1. Add functions in `electron/renderer/app.js`
2. Wire up search/follow
3. Fix agent status display

### Phase 5: Testing (20 min)
1. Test all new features
2. Test all existing features
3. Fix any issues

**Total: ~2 hours**

---

## 📚 Key Files

### Read First
- `SESSION_SUMMARY_DASHBOARD_REDESIGN.md` - Full context
- `moltbook_skill.md` - API documentation
- `MOLTBOOK_API_REFERENCE.md` - Response formats

### Modify
- `electron/main.js` - Backend handlers
- `electron/preload.js` - API exposure
- `electron/renderer/index.html` - Dashboard HTML
- `electron/renderer/app.js` - Dashboard logic
- `electron/renderer/styles.css` - Dashboard styles

---

## 🔑 API Endpoints to Implement

```javascript
// 1. Search users
GET /api/v1/search?q={query}&type=posts&limit=20

// 2. Get user profile
GET /api/v1/agents/profile?name={MOLTY_NAME}

// 3. Follow user
POST /api/v1/agents/{MOLTY_NAME}/follow

// 4. Unfollow user
DELETE /api/v1/agents/{MOLTY_NAME}/follow

// 5. Get own profile (already exists)
GET /api/v1/agents/me
```

---

## ⚠️ Critical Rules

1. **NO SYNTAX ERRORS** - Use getDiagnostics after every change
2. **DON'T BREAK EXISTING FEATURES** - Test navigation, auto-reply, queue
3. **PROFESSIONAL CODE** - Clean, commented, well-structured
4. **TEST EVERYTHING** - Before saying "done"

---

## 🎨 Design Reference

### Colors (Cyberpunk-Solar Theme)
```css
--accent: #00d9ff (cyan)
--solar: #ff6b35 (orange)
--success: #00ff88 (green)
--warning: #ffaa00 (yellow)
--danger: #ff3366 (red)
```

### Card Structure
```html
<div class="card">
  <h3>Card Title</h3>
  <div class="card-content">
    <!-- Content here -->
  </div>
</div>
```

---

## 🚀 Let's Start!

**First Command**: Read `SESSION_SUMMARY_DASHBOARD_REDESIGN.md` for full context

**Then**: Start with Phase 1 (Backend) - Add IPC handlers

**Remember**: One step at a time, test after each change, no syntax errors!

---

## 💪 You Got This!

This is a big feature but we'll do it professionally, step by step, with no errors.

**Ready? Let's build! 🎨**
