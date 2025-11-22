# Rulebook Commands Quick Reference

## ⚠️ IMPORTANT: Use the Correct Package Name

**❌ WRONG:**
```bash
npx rulebook <command>
```

**✅ CORRECT:**
```bash
npx @hivellm/rulebook <command>
```

## Available Commands

### Task Management

```bash
# Create a new task
npx @hivellm/rulebook task create <task-id>

# List all tasks
npx @hivellm/rulebook task list

# List only active tasks
npx @hivellm/rulebook task list --active

# Show task details
npx @hivellm/rulebook task show <task-id>

# Validate task format
npx @hivellm/rulebook task validate <task-id>

# Validate all tasks
npx @hivellm/rulebook task validate --all

# Update task status
npx @hivellm/rulebook task update <task-id> --status <status>

# Archive completed task
npx @hivellm/rulebook task archive <task-id>

# Archive without prompts
npx @hivellm/rulebook task archive <task-id> --yes
```

### Task Status Values

- `pending` - Task not started
- `in-progress` - Task being worked on
- `completed` - Task finished
- `blocked` - Task blocked by dependency

### Update Rulebook

```bash
# Update rulebook to latest version
npx @hivellm/rulebook update
```

## Examples

### Create a Task

```bash
# Create task for fixing AliExpress pricing
npx @hivellm/rulebook task create fix-aliexpress-pricing

# This creates:
# rulebook/tasks/fix-aliexpress-pricing/
#   ├── proposal.md
#   ├── tasks.md
#   └── specs/
```

### List Tasks

```bash
# List all tasks
npx @hivellm/rulebook task list

# List only active tasks
npx @hivellm/rulebook task list --active
```

### Validate Task

```bash
# Validate a specific task
npx @hivellm/rulebook task validate fix-aliexpress-pricing

# Validate all tasks
npx @hivellm/rulebook task validate --all
```

### Update Task Status

```bash
# Mark task as in progress
npx @hivellm/rulebook task update fix-aliexpress-pricing --status in-progress

# Mark task as completed
npx @hivellm/rulebook task update fix-aliexpress-pricing --status completed
```

### Archive Task

```bash
# Archive completed task
npx @hivellm/rulebook task archive fix-aliexpress-pricing

# Archive without prompts
npx @hivellm/rulebook task archive fix-aliexpress-pricing --yes
```

## Common Errors

### Error: "ENOENT: no such file or directory, open 'fix'"

**Cause**: Using wrong package name (`rulebook` instead of `@hivellm/rulebook`)

**Solution**: Always use `npx @hivellm/rulebook` not `npx rulebook`

### Error: "Context7 MCP not available"

**Cause**: Context7 MCP not configured in Cursor

**Solution**: 
1. Check Cursor MCP settings
2. Verify Context7 server is configured
3. See `rulebook/CONTEXT7.md` for setup

### Error: "Task validation failed"

**Cause**: Task format doesn't match OpenSpec requirements

**Solution**:
1. Check `rulebook/RULEBOOK.md` for format requirements
2. Ensure scenarios use `#### Scenario:` (4 hashtags)
3. Ensure requirements have SHALL/MUST statements
4. Query Context7 for official format: `@Context7 /fission-ai/openspec`

## Quick Start Workflow

1. **Create Task**
   ```bash
   npx @hivellm/rulebook task create my-feature
   ```

2. **Edit Files**
   - `rulebook/tasks/my-feature/proposal.md` - Why and what
   - `rulebook/tasks/my-feature/tasks.md` - Implementation checklist
   - `rulebook/tasks/my-feature/specs/<module>/spec.md` - Requirements

3. **Validate**
   ```bash
   npx @hivellm/rulebook task validate my-feature
   ```

4. **Implement**

5. **Update Status**
   ```bash
   npx @hivellm/rulebook task update my-feature --status in-progress
   npx @hivellm/rulebook task update my-feature --status completed
   ```

6. **Archive**
   ```bash
   npx @hivellm/rulebook task archive my-feature
   ```

## Notes

- Always use `@hivellm/rulebook` (with @hivellm prefix)
- Task IDs must be kebab-case (e.g., `fix-pricing`, not `fixPricing`)
- Context7 MCP is required for task creation
- Tasks must be validated before implementation

