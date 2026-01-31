# WATAM AI v1.2.0 - Pre-Release Testing Checklist

## Installation Test
- [ ] Install `WATAM AI-1.2.0-arm64.dmg` on Apple Silicon Mac
- [ ] Install `WATAM AI-1.2.0.dmg` on Intel Mac
- [ ] App launches without errors
- [ ] Icon displays correctly in dock and app

## Critical Fixes Verification

### 1. Text Selection & Copy/Paste
- [ ] Can select text in Dashboard
- [ ] Can select and copy text in Settings (agent name, API key, claim URL, verification code)
- [ ] Can select and copy text in Draft Studio (submolt, title, body)
- [ ] Can select and copy text in Drafts list
- [ ] Can select and copy text in Posts list
- [ ] Can select and copy text in Logs
- [ ] Can select and copy text in Persona editor
- [ ] Can select and copy text in Skills editor
- [ ] Can paste text into all input fields and textareas
- [ ] Cmd+A (Select All) works in text areas
- [ ] Cmd+C (Copy) works on selected text
- [ ] Cmd+V (Paste) works in input fields

### 2. Post URL with ID
- [ ] Create a draft post
- [ ] Publish the draft (requires agent registration and Safe Mode off)
- [ ] Check Posts page
- [ ] Verify post URL shows: `https://www.moltbook.com/s/[submolt]/p/[POST_ID]`
- [ ] Click "View on Moltbook" link
- [ ] Verify it opens correct post in browser

### 3. Settings Buttons
- [ ] Navigate to Settings page
- [ ] Register an agent (or load existing agent)
- [ ] Click "Check Status" button
- [ ] Verify button responds and shows status update
- [ ] Click "Re-fetch skill.md" button
- [ ] Verify button responds and shows success/error message
- [ ] Check console logs for event listener attachment messages

### 4. Safe Mode Synchronization
- [ ] Toggle Safe Mode ON in sidebar
- [ ] Navigate to Settings page
- [ ] Verify Safe Mode checkbox is checked
- [ ] Verify warning message is visible
- [ ] Uncheck Safe Mode in Settings
- [ ] Verify sidebar toggle updates to OFF
- [ ] Toggle Safe Mode ON in sidebar again
- [ ] Verify Settings checkbox updates to checked
- [ ] Verify warning message appears

## Feature Testing

### Agent Registration
- [ ] Navigate to Settings
- [ ] Enter agent name and description
- [ ] Click "Register Agent"
- [ ] Verify claim URL and verification code appear
- [ ] Copy claim URL (test copy functionality)
- [ ] Copy verification code (test copy functionality)
- [ ] Click "Open" to open claim URL in browser
- [ ] Complete claim process on Moltbook
- [ ] Click "I completed claim — Check status"
- [ ] Verify status changes to "Active"

### Draft Management
- [ ] Navigate to New Draft
- [ ] Enter submolt, title, and body
- [ ] Check "Include WATAM CTA"
- [ ] Click "Save Draft"
- [ ] Verify success notification
- [ ] Navigate to Drafts
- [ ] Verify draft appears in list
- [ ] Click "Edit" on draft
- [ ] Verify draft loads in New Draft page
- [ ] Click "Delete" on draft
- [ ] Verify draft is removed

### Post Publishing
- [ ] Create a new draft
- [ ] Click "Preview"
- [ ] Verify preview displays correctly
- [ ] Disable Safe Mode
- [ ] Click "Publish to Moltbook"
- [ ] Confirm in dialog
- [ ] Verify success notification
- [ ] Navigate to Posts page
- [ ] Verify post appears with correct URL
- [ ] Click "View on Moltbook"
- [ ] Verify post opens in browser

### Logs
- [ ] Navigate to Logs page
- [ ] Verify recent actions are logged
- [ ] Click "Refresh"
- [ ] Verify logs update
- [ ] Perform an action (save draft, change settings)
- [ ] Refresh logs
- [ ] Verify new log entry appears

### Persona & Skills
- [ ] Navigate to Persona page
- [ ] Click "Load Current"
- [ ] Verify default persona loads
- [ ] Edit persona text
- [ ] Click "Save Persona"
- [ ] Verify success message
- [ ] Navigate to Skills page
- [ ] Click "Load Current"
- [ ] Verify default skills load
- [ ] Edit skills text
- [ ] Click "Save Skills"
- [ ] Verify success message

## UI/UX Testing
- [ ] All navigation items work
- [ ] All buttons have hover effects
- [ ] Toast notifications appear and disappear correctly
- [ ] No console errors in DevTools
- [ ] App is responsive to window resizing
- [ ] Dark theme displays correctly
- [ ] Gradient effects on logo and buttons work
- [ ] Icons display correctly

## Performance Testing
- [ ] App launches in < 3 seconds
- [ ] Navigation between pages is instant
- [ ] No memory leaks after extended use
- [ ] Auto-save works every 30 seconds in Draft Studio

## Error Handling
- [ ] Try to publish with Safe Mode ON - verify error message
- [ ] Try to publish without agent registered - verify error message
- [ ] Try to publish with inactive agent - verify error message
- [ ] Try to save empty draft - verify validation message
- [ ] Try to register agent with empty name - verify error message

## Security Testing
- [ ] API key is masked in Settings (shows first 8 + last 4 chars)
- [ ] API key is not visible in console logs
- [ ] Safe Mode prevents publishing when enabled
- [ ] Confirmation dialog appears before publishing

## Final Checks
- [ ] Version number shows "v1.2.0" in sidebar
- [ ] About dialog shows correct version
- [ ] All menu items work
- [ ] App quits cleanly (Cmd+Q)
- [ ] App can be reopened after quitting
- [ ] User data persists between sessions

## Known Issues to Document
- [ ] List any issues found during testing
- [ ] Note any workarounds needed
- [ ] Document any limitations

## Sign-off
- [ ] All critical fixes verified working
- [ ] All features tested and working
- [ ] No blocking bugs found
- [ ] Ready for GitHub release

**Tested by:** _______________  
**Date:** _______________  
**Build:** WATAM AI v1.2.0  
**Platform:** macOS (Intel / Apple Silicon)
