# Codex Task Management Guide

## Documentation Available

📚 **Project Documentation**: Check the documentation files in this directory for project-specific setup instructions and guides.
**Project Tasks**: Check the tasks directory in `PRD-System/tasks.json` for the list of tasks to be completed. Use the custom CLI commands below to interact with them.

## MANDATORY Task Management Workflow

🚨 **YOU MUST FOLLOW THIS EXACT WORKFLOW - NO EXCEPTIONS** 🚨

### **STEP 1: DISCOVER TASKS (MANDATORY)**
You MUST start by running this command to see all available tasks:
```powershell
# Add project root to path for local task-manager execution
$env:PATH += ";D:\InvoiceFlow"
task-manager list-tasks
```

### **STEP 2: START EACH TASK (MANDATORY)**
Before working on any task, you MUST mark it as started:
```powershell
task-manager start-task <task_id>
```

### **STEP 3: COMPLETE OR CANCEL EACH TASK (MANDATORY)**
After finishing implementation, you MUST mark the task as completed, or cancel if you cannot complete it:
```powershell
task-manager complete-task <task_id> "Brief description of what was implemented"
# or
task-manager cancel-task <task_id> "Reason for cancellation"
```

## Task Files Location

📁 **Task Data**: Your tasks are organized in the `PRD-System/tasks.json` file:
- Use ONLY the custom `task-manager` command wrapper script in the root directory.
- Follow the mandatory workflow sequence for each task.

## MANDATORY Task Workflow Sequence

🔄 **For EACH individual task, you MUST follow this sequence:**

1. 📋 **DISCOVER**: `task-manager list-tasks` (first time only)
2. 🚀 **START**: `task-manager start-task <task_id>` (mark as in progress)
3. 💻 **IMPLEMENT**: Do the actual coding/implementation work
4. ✅ **COMPLETE**: `task-manager complete-task <task_id> "What was done"` (or cancel with `task-manager cancel-task <task_id> "Reason"`)
5. 🔁 **REPEAT**: Go to next task (start from step 2)

## Task Status Options

- `pending` - Ready to work on
- `in_progress` - Currently being worked on  
- `completed` - Successfully finished
- `blocked` - Cannot proceed (waiting for dependencies)
- `cancelled` - No longer needed

## CRITICAL WORKFLOW RULES

❌ **NEVER skip** the `task-manager start-task` command
❌ **NEVER skip** the `task-manager complete-task` command
❌ **NEVER work on multiple tasks simultaneously**
✅ **ALWAYS complete one task fully before starting the next**
✅ **ALWAYS provide completion details in the complete command**
✅ **ALWAYS follow the exact 3-step sequence: list → start → complete (or cancel if not required)**