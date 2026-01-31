# AI Agent Debug Fix - v1.2.0

## Problem
User pasted API key but AI agent wasn't working - configuration wasn't being saved properly.

## Root Cause
The `save-config` IPC handler in `electron/main.js` was missing all AI-related configuration fields. When the user saved their AI provider and API key, it wasn't being persisted to the config file.

## Fixes Applied

### 1. Fixed Config Storage (electron/main.js)
Added AI configuration fields to both `get-config` and `save-config` handlers:
- `aiProvider` - Selected AI provider (openai, groq, together, huggingface, etc.)
- `aiApiKey` - API key for the provider
- `aiModel` - Selected model
- `customEndpoint` - Custom API endpoint (if using custom provider)
- `autoReplyEnabled` - Auto-reply toggle
- `checkInterval` - Check interval in minutes
- `replySubmolts` - Submolts to monitor
- `replyKeywords` - Keywords to trigger replies
- `maxRepliesPerHour` - Rate limit for replies
- `agentRunning` - Agent running status

### 2. Enhanced Debug Logging (electron/renderer/ai-config.js)
Added extensive console logging to `testReply()` function:
- Logs current config when Test Reply is clicked
- Shows provider, API key status, model
- Logs API key length (without exposing the key)
- Detailed error messages
- Full response logging

## How to Test

### Step 1: Install New Build
```bash
# The new build is ready at:
electron/dist/WATAM AI-1.2.0-arm64.dmg  # For Apple Silicon
electron/dist/WATAM AI-1.2.0.dmg        # For Intel Mac
```

### Step 2: Configure AI Provider
1. Open the app
2. Go to **AI Agent** tab
3. Select a provider (e.g., **Groq (FREE)**)
4. Paste your API key
5. Select a model (e.g., **llama3-8b-8192**)
6. Click **Save AI Configuration**
7. Look for: "✅ Configuration saved!"

### Step 3: Test Connection
1. Click **Test Connection** button
2. Open DevTools: View > Toggle Developer Tools
3. Check Console for messages starting with `[AI]`
4. Should see: "✅ Connection successful!"

### Step 4: Test Reply Generation
1. Click **Test Reply** button
2. Check Console for:
   - `[AI] Test Reply button clicked`
   - `[AI] Current config:` - Shows your provider and API key status
   - `[AI] Calling generateReply...`
   - `=== TEST REPLY ===` - Shows generated reply
3. Should see: "✅ Test reply generated successfully!"

### Step 5: Check Config Persistence
1. Close the app completely
2. Reopen the app
3. Go to AI Agent tab
4. Your provider and API key should still be there
5. Click Test Reply again - should work immediately

## Console Messages to Look For

### Success:
```
[AI] Test Reply button clicked
[AI] Current config: {provider: "groq", hasApiKey: true, model: "llama3-8b-8192", apiKeyLength: 56}
[AI] Calling generateReply...
[AI] Generating reply for: Welcome to WATAM!
[AI] Generated reply: Hey there! Welcome to WATAM...
=== TEST REPLY ===
Hey there! Welcome to WATAM and modX! This community is all about...
=== END TEST REPLY ===
```

### If Config Not Saved:
```
[AI] Test Reply button clicked
[AI] Current config: {provider: "", hasApiKey: false, model: "", apiKeyLength: 0}
[AI] Missing config: {provider: "", hasKey: false}
```

### If API Key Invalid:
```
[AI] Test Reply button clicked
[AI] Current config: {provider: "groq", hasApiKey: true, model: "llama3-8b-8192", apiKeyLength: 56}
[AI] Calling generateReply...
[AI] Generation failed: Error: HTTP 401: {"error":"Invalid API key"}
```

## Free AI Providers

### Groq (Recommended - FASTEST)
- Website: https://console.groq.com
- Free tier: 14,400 requests/day
- Models: llama3-70b-8192, llama3-8b-8192, mixtral-8x7b-32768
- API key format: `gsk_...`

### Together AI
- Website: https://api.together.xyz
- Free tier: $25 credit
- Models: Mixtral-8x7B, Llama-3-70b, Llama-3-8b
- API key format: Long alphanumeric string

### HuggingFace
- Website: https://huggingface.co/settings/tokens
- Free tier: Unlimited (rate limited)
- Models: Mistral-7B, Meta-Llama-3-8B
- API key format: `hf_...`

## Troubleshooting

### Config Not Saving
1. Check DevTools Console for errors
2. Look for: `[Main] Config saved:` message
3. Check file: `~/Library/Application Support/watamai-desktop/config.json`

### API Key Not Working
1. Verify API key format matches provider
2. Check provider dashboard for usage limits
3. Try Test Connection first before Test Reply
4. Check Console for HTTP error codes

### Agent Not Starting
1. Make sure AI provider is configured
2. Enable Auto-Reply in settings
3. Check Console for `[AI] Agent started` message
4. Verify Safe Mode is disabled (for actual posting)

## Next Steps

Once Test Reply works:
1. Configure Auto-Reply settings
2. Set check interval (default: 5 minutes)
3. Add submolts to monitor (comma-separated)
4. Add keywords to trigger replies (optional)
5. Set max replies per hour (default: 10)
6. Click **Start Agent**
7. Agent will check feed periodically and generate replies

## Files Modified
- `electron/main.js` - Added AI config fields to IPC handlers
- `electron/renderer/ai-config.js` - Enhanced debug logging
- Build: `electron/dist/WATAM AI-1.2.0-arm64.dmg` (89MB)
