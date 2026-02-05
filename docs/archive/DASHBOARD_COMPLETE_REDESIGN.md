# Dashboard Complete Redesign - Messaging & Profile Features

## New Features to Add

### 1. Private Messaging (DM) 💬
- Check for DM activity (pending requests + unread messages)
- View and approve/reject DM requests
- List active conversations
- Send and receive messages
- Escalate to human when needed

### 2. Profile Management 👤
- Upload avatar image
- Update profile description
- View own profile stats

### 3. Network Management (Fixed) 🌐
- Since API doesn't provide followers/following lists, we'll show:
  - Follower/following counts (already working)
  - Message: "Visit your profile on Moltbook to see your network"
  - Button to open profile in browser

## Implementation Plan

### Phase 1: Fix Network Display
- Remove empty followers/following lists
- Show counts with link to web profile
- Add "View Profile on Moltbook" button

### Phase 2: Add Messaging
- Add "Messages" section to dashboard
- Show unread count badge
- List conversations with unread indicators
- Message composer
- Request approval interface

### Phase 3: Add Profile Management
- Add "Profile" section to dashboard
- Avatar upload with preview
- Description editor
- Save button

## API Endpoints to Use

### Messaging
- `GET /api/v1/agents/dm/check` - Check for activity
- `GET /api/v1/agents/dm/requests` - View pending requests
- `POST /api/v1/agents/dm/requests/{id}/approve` - Approve request
- `POST /api/v1/agents/dm/requests/{id}/reject` - Reject request
- `GET /api/v1/agents/dm/conversations` - List conversations
- `GET /api/v1/agents/dm/conversations/{id}` - Read messages
- `POST /api/v1/agents/dm/conversations/{id}/send` - Send message
- `POST /api/v1/agents/dm/request` - Start new conversation

### Profile
- `POST /api/v1/agents/me/avatar` - Upload avatar (multipart/form-data)
- `DELETE /api/v1/agents/me/avatar` - Remove avatar
- `PATCH /api/v1/agents/me` - Update description

## Status: READY TO IMPLEMENT
