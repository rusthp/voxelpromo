# Rulebook Setup and Configuration

## Current Status

### ✅ Installed Components
- Rulebook v0.18.0 installed
- AGENTS.md updated with latest templates
- Rulebook configuration files in `/rulebook/` directory

### ⚠️ Missing Components
- **Tasks directory**: `/rulebook/tasks/` does not exist
- **Vectorizer MCP**: Not configured or not returning resources
- **Git repository**: Not initialized (required for Git hooks)

## Rulebook Structure

```
rulebook/
├── AGENT_AUTOMATION.md    # Automation workflow rules
├── CONTEXT7.md            # Context7 MCP instructions
├── GIT.md                 # Git workflow rules
├── QUALITY_ENFORCEMENT.md # Quality standards
├── RULEBOOK.md            # Task management system
├── TYPESCRIPT.md          # TypeScript-specific rules
├── VECTORIZER.md          # Vectorizer MCP instructions
└── tasks/                 # ❌ MISSING - Task storage directory
    ├── <task-id>/
    │   ├── proposal.md
    │   ├── tasks.md
    │   └── specs/
    └── archive/
```

## Vectorizer MCP Configuration

### Purpose
The Vectorizer MCP provides semantic search and codebase indexing capabilities, allowing:
- Fast code exploration without file I/O
- Semantic search across the codebase
- Related file discovery
- Progressive reading of large files

### Current Status
- ❌ Vectorizer MCP not returning resources
- ⚠️ May need configuration in Cursor MCP settings

### Setup Steps

1. **Verify MCP Configuration**
   - Check Cursor settings for MCP servers
   - Ensure `vectorizer` server is configured
   - Verify collection name matches project

2. **Initialize Collection** (if needed)
   - Vectorizer should auto-index on first use
   - May need manual collection creation

3. **Test Vectorizer**
   ```bash
   # Test if vectorizer is accessible
   # Should return file listings and search capabilities
   ```

### Usage Examples

**Search for code:**
```
Use mcp_vectorizer_search with strategy: "intelligent"
Query: "How does AliExpress price conversion work?"
```

**Read file:**
```
Use get_content instead of read_file when available
File: "src/services/aliexpress/AliExpressService.ts"
```

**Find related files:**
```
Use get_related to find semantically similar files
File: "src/services/collector/CollectorService.ts"
```

## Task Management Setup

### Initialize Tasks Directory

```bash
# Create tasks directory structure
mkdir -p rulebook/tasks/archive

# Verify structure
ls -la rulebook/tasks/
```

### Create First Task (Example)

```bash
# Create a task for improving AliExpress price accuracy
npx @hivellm/rulebook task create improve-aliexpress-pricing

# This will create:
# rulebook/tasks/improve-aliexpress-pricing/
#   ├── proposal.md
#   ├── tasks.md
#   └── specs/
```

### Task Workflow

1. **Before implementing ANY feature:**
   ```bash
   rulebook task create <task-id>
   ```

2. **Write proposal and tasks:**
   - Edit `proposal.md` - Why and what
   - Edit `tasks.md` - Implementation checklist
   - Edit `specs/<module>/spec.md` - Requirements

3. **Validate task:**
   ```bash
   rulebook task validate <task-id>
   ```

4. **Implement feature**

5. **Update task status:**
   ```bash
   rulebook task update <task-id> --status in-progress
   rulebook task update <task-id> --status completed
   ```

6. **Archive when done:**
   ```bash
   rulebook task archive <task-id>
   ```

## Git Hooks Setup

### Initialize Git Repository

```bash
# Check if Git is initialized
git status

# If not initialized:
git init
git add .
git commit -m "Initial commit"

# Then install hooks:
npx @hivellm/rulebook update
```

### Git Hooks Benefits
- Pre-commit: Run quality checks before commit
- Pre-push: Run tests before push
- Automatic quality enforcement

## Recommended Improvements

### 1. Initialize Tasks Directory
```bash
mkdir -p rulebook/tasks/archive
```

### 2. Configure Vectorizer MCP
- Check Cursor MCP settings
- Verify vectorizer server configuration
- Test with sample queries

### 3. Initialize Git Repository
```bash
git init
git add .
git commit -m "Initial commit with rulebook setup"
```

### 4. Create Initial Tasks
Create tasks for:
- ✅ Improve AliExpress price accuracy
- ✅ Fix pagination issues
- ✅ Enhance duplicate prevention
- ✅ Add vectorizer integration

### 5. Set Up Quality Checks
Add to `package.json`:
```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write \"src/**/*.ts\"",
    "test": "jest",
    "test:coverage": "jest --coverage"
  }
}
```

## Next Steps

1. ✅ Create tasks directory
2. ✅ Initialize Git repository
3. ✅ Configure Vectorizer MCP
4. ✅ Create initial tasks for current work
5. ✅ Set up quality check scripts
6. ✅ Test task creation workflow

## Troubleshooting

### Vectorizer Not Working
- Check MCP server configuration in Cursor
- Verify collection name
- Test with simple query

### Task Creation Fails
- Ensure Context7 MCP is configured
- Check task ID format (kebab-case)
- Verify proposal.md format

### Git Hooks Not Installing
- Initialize Git repository first
- Run `rulebook update` again
- Check Git permissions

