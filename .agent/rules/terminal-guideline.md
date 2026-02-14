---
trigger: always_on
---

# Terminal Operations Guidelines

## Core Principles

### 1. Always Use Non-Interactive Mode
- Add `-y` flags to package managers (apt, brew, npm)
- Use `--force` or `--no-confirm` when appropriate
- Avoid commands that prompt for user input
- Pre-configure git with user details before operations

### 2. Set Explicit Timeouts
- Wrap long-running commands with timeout utilities
- Use `timeout 30s <command>` for operations that shouldn't exceed 30 seconds
- Kill hanging processes after reasonable duration

### 3. Check Before Execute
```bash
# Always verify prerequisites
command -v git >/dev/null 2>&1 || echo "git not installed"

# Check if process is already running
pgrep -x "process_name" && echo "Already running"
```

### 4. Avoid Blocking Operations
**NEVER use:**
- Interactive text editors (vim, nano) without `-c` commands
- Commands waiting for STDIN without input
- Password prompts without pre-configuration
- Commands that spawn GUI applications

**ALWAYS use:**
- One-line commands or scripts
- Redirected input: `command < input.txt`
- Heredocs for multi-line input
- Backgrounded processes with `&` when appropriate

### 5. Capture and Handle Output
```bash
# Redirect to avoid buffer overflow
command > output.log 2>&1

# Use tee for simultaneous display and logging
command 2>&1 | tee output.log

# Suppress unnecessary output
command >/dev/null 2>&1
```

### 6. Git Operations Safety
```bash
# Configure before operations
git config user.name "Name" 2>/dev/null || true
git config user.email "email@example.com" 2>/dev/null || true

# Always check status first
git status --short

# Use --porcelain for scripting
git status --porcelain
```

### 7. Process Management
```bash
# Check if command will block
command --help 2>&1 | grep -q "interactive"

# Kill if taking too long
sleep 5 && pkill -9 command_name &

# Wait with timeout
wait $PID || kill -9 $PID
```

## Prohibited Commands
- `vim`, `nano`, `emacs` (without non-interactive flags)
- `python -m http.server` (without background)
- `npm start`, `npm run dev` (without background or timeout)
- `docker run -it` (interactive mode)
- Any command with `--interactive` or `-i` flag
- Password prompts: `sudo`, `ssh` without keys

## Allowed Patterns
✅ `git add . && git commit -m "message" && git push`
✅ `timeout 10s npm install`
✅ `echo "content" > file.txt`
✅ `sed -i 's/old/new/g' file.txt`
✅ `command & disown` (for background jobs)
✅ `nohup command > output.log 2>&1 &`

## Error Handling
```bash
# Always add error checks
if ! command; then
    echo "Command failed"
    exit 1
fi

# Use OR operators for graceful degradation
command || echo "Failed but continuing"

# Set error mode
set -e  # Exit on error
set -u  # Error on undefined variables
set -o pipefail  # Pipeline error detection
```

## macOS Specific
- Use `caffeinate -i command` to prevent sleep during long operations
- Avoid AppleScript unless absolutely necessary
- Check for Homebrew before using: `command -v brew`
- Use `pbcopy`/`pbpaste` for clipboard, but never wait on them

## Emergency Abort
If stuck:
1. Process should auto-timeout after 60 seconds
2. User can press Ctrl+C
3. Fallback: `pkill -9 -f <process_name>`

## Testing Commands
Before adding any new terminal command, verify:
1. ✅ Completes in < 30 seconds?
2. ✅ No interactive prompts?
3. ✅ Error handling in place?
4. ✅ Output captured/suppressed?
5. ✅ Can be killed cleanly?