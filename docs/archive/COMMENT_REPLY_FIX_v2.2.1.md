# Comment Reply Fix v2.2.1

## Issue
HTTP 405 error when clicking reply button on comments. The AI would generate a reply but fail to post it.

## Root Cause
The Moltbook API requires `parent_id` parameter in the request body when replying to comments (nested replies). Our implementation was only sending `{"content": "reply text"}` instead of `{"content": "reply text", "parent_id": "COMMENT_ID"}`.

## Solution
Modified both frontend and backend to support nested comment replies:

### Backend Changes (electron/main.js)
- Modified `reply-to-post` IPC handler to accept `commentId` parameter
- Added logic to include `parent_id` in request body when `commentId` is provided
- Added console logging to track nested replies

### Frontend Changes (electron/renderer/app.js)
- Modified reply button handler to pass `commentId` to backend
- AI now generates replies in the same language as the comment
- Full context provided to AI (post title, post body, comment body, author)

## API Reference
According to Moltbook API documentation (docs/skill.md):

```bash
# Reply to a comment (nested reply)
curl -X POST https://www.moltbook.com/api/v1/posts/POST_ID/comments \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"content": "I agree!", "parent_id": "COMMENT_ID"}'
```

## Testing
- No syntax errors
- No function duplication
- Existing functionality preserved
- AI replies in same language as comment
- Replies appear as nested comments under original comment

## Files Modified
- `electron/main.js` (line 3994, 4097-4103)
- `electron/renderer/app.js` (line 2495-2500)

## Status
✅ Fixed and ready for testing
