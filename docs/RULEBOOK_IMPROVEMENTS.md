# Rulebook Improvements and Vectorizer Setup

## Current Status ✅

### Completed
- ✅ Rulebook v0.18.0 installed and updated
- ✅ AGENTS.md updated with latest templates
- ✅ Tasks directory created: `/rulebook/tasks/`
- ✅ Archive directory created: `/rulebook/tasks/archive/`
- ✅ Documentation created: `docs/RULEBOOK_SETUP.md`

### Pending Configuration
- ⚠️ Vectorizer MCP: Needs verification/configuration
- ⚠️ Git repository: Not initialized (required for hooks)
- ⚠️ Quality check scripts: Need to be added to package.json

## Vectorizer MCP Setup

### What is Vectorizer?
Vectorizer MCP provides semantic codebase search and indexing, allowing:
- **Fast code exploration** without reading files from disk
- **Semantic search** to find related code
- **Progressive file reading** for large files
- **Related file discovery** based on code similarity

### Current Status
- Vectorizer MCP server may not be configured in Cursor
- No resources returned when querying vectorizer
- Collection may need to be initialized

### Setup Instructions

1. **Check Cursor MCP Settings**
   - Open Cursor Settings
   - Navigate to MCP Servers
   - Verify `vectorizer` server is listed
   - Check if collection name matches project

2. **Test Vectorizer Access**
   ```bash
   # Vectorizer should be accessible via MCP
   # Test with: list_files, get_outline, intelligent search
   ```

3. **Initialize Collection** (if needed)
   - Vectorizer auto-indexes on first use
   - May need to specify collection name
   - Collection name should match project root

### Usage Examples

**Instead of reading files:**
```typescript
// ❌ OLD: Read file from disk
read_file('src/services/aliexpress/AliExpressService.ts')

// ✅ NEW: Use vectorizer
mcp_vectorizer_get_content('src/services/aliexpress/AliExpressService.ts')
```

**Semantic search:**
```typescript
// Find code related to price conversion
mcp_vectorizer_search({
  query: "How does AliExpress convert USD to BRL?",
  strategy: "intelligent"
})
```

**Find related files:**
```typescript
// Find files similar to CollectorService
mcp_vectorizer_get_related('src/services/collector/CollectorService.ts')
```

## Task Management Workflow

### Creating Tasks

**Before implementing ANY feature:**

```bash
# 1. Create task
npx @hivellm/rulebook task create improve-aliexpress-pricing

# 2. Edit files in rulebook/tasks/improve-aliexpress-pricing/
#    - proposal.md: Why and what
#    - tasks.md: Implementation checklist
#    - specs/<module>/spec.md: Requirements

# 3. Validate format
npx @hivellm/rulebook task validate improve-aliexpress-pricing

# 4. Start implementation
```

### Task Structure

```
rulebook/tasks/<task-id>/
├── proposal.md          # Why and what changes
├── tasks.md             # Implementation checklist
├── design.md            # Technical decisions (optional)
└── specs/
    └── <module>/
        └── spec.md      # Requirements with ADDED/MODIFIED/REMOVED deltas
```

### Task Status Management

```bash
# Update task status during work
npx @hivellm/rulebook task update <task-id> --status in-progress
npx @hivellm/rulebook task update <task-id> --status completed

# Archive completed tasks
npx @hivellm/rulebook task archive <task-id>
```

## Quality Check Scripts

### Add to package.json

```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\" \"frontend/**/*.{ts,tsx}\"",
    "format:check": "prettier --check \"src/**/*.ts\" \"frontend/**/*.{ts,tsx}\"",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "quality": "npm run type-check && npm run lint && npm run format:check && npm run test:coverage"
  }
}
```

### Pre-commit Workflow

After implementing changes:
1. Run `npm run quality` (all checks must pass)
2. Fix any issues
3. Update task status
4. Commit with conventional format

## Recommended Next Steps

### Immediate Actions

1. **Initialize Git Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit with rulebook setup"
   npx @hivellm/rulebook update  # Install Git hooks
   ```

2. **Add Quality Scripts**
   - Add scripts to package.json (see above)
   - Install missing dev dependencies if needed

3. **Test Task Creation**
   ```bash
   # Create a test task
   npx @hivellm/rulebook task create test-task
   # Verify structure was created
   ls -la rulebook/tasks/test-task/
   ```

4. **Verify Vectorizer MCP**
   - Check Cursor MCP settings
   - Test with simple query
   - Document collection name if needed

### Future Improvements

1. **Create Tasks for Current Work**
   - Task: `fix-aliexpress-pricing`
   - Task: `improve-pagination`
   - Task: `enhance-duplicate-prevention`

2. **Set Up Automated Quality Checks**
   - Pre-commit hooks
   - Pre-push hooks
   - CI/CD integration (if applicable)

3. **Document Task Templates**
   - Create example tasks
   - Document common patterns
   - Share with team

## Troubleshooting

### Vectorizer Not Working
- **Check**: Cursor MCP settings
- **Verify**: Server is running
- **Test**: Simple query like `list_files`
- **Solution**: May need to configure collection name

### Task Creation Fails
- **Check**: Context7 MCP is configured
- **Verify**: Task ID format (kebab-case, verb-led)
- **Solution**: Check RULEBOOK.md for format requirements

### Git Hooks Not Installing
- **Check**: Git repository is initialized
- **Verify**: Git permissions
- **Solution**: Run `git init` then `rulebook update`

## Benefits of Proper Setup

### With Vectorizer
- ⚡ Faster code exploration
- 🔍 Better semantic search
- 📚 Automatic codebase indexing
- 🔗 Related file discovery

### With Task Management
- 📋 Track all features
- ✅ Clear completion criteria
- 📝 Implementation history
- 🔄 Easy to resume work

### With Quality Checks
- 🛡️ Prevent bad code from being committed
- ✅ Automated testing
- 📊 Coverage tracking
- 🔒 Security audits

