param(
    [string]$Action,
    [string]$TaskId,
    [string]$Message
)

$jsonPath = "$PSScriptRoot\PRD-System\tasks.json"

if (-not (Test-Path $jsonPath)) {
    Write-Error "tasks.json not found at $jsonPath"
    exit 1
}

$data = Get-Content -Raw $jsonPath | ConvertFrom-Json

function Save-Tasks {
    # Convert back to JSON and format nicely
    $json = $data | ConvertTo-Json -Depth 100
    [System.IO.File]::WriteAllText($jsonPath, $json)
}

switch ($Action) {
    "list-tasks" {
        Write-Host ""
        Write-Host "======================================== TASK LIST ========================================" -ForegroundColor Cyan
        $data.tasks | Format-Table -Property id, status, priority, title -AutoSize
        Write-Host "==========================================================================================" -ForegroundColor Cyan
        Write-Host ""
    }
    "start-task" {
        if (-not $TaskId) { Write-Error "Task ID is required"; exit 1 }
        $task = $data.tasks | Where-Object { $_.id -eq [int]$TaskId }
        if (-not $task) { Write-Error "Task $TaskId not found"; exit 1 }
        $task.status = "in_progress"
        Save-Tasks
        Write-Host "Task $TaskId ('$($task.title)') started successfully." -ForegroundColor Green
    }
    "complete-task" {
        if (-not $TaskId) { Write-Error "Task ID is required"; exit 1 }
        $task = $data.tasks | Where-Object { $_.id -eq [int]$TaskId }
        if (-not $task) { Write-Error "Task $TaskId not found"; exit 1 }
        $task.status = "completed"
        Save-Tasks
        Write-Host "Task $TaskId ('$($task.title)') completed: $Message" -ForegroundColor Green
    }
    "cancel-task" {
        if (-not $TaskId) { Write-Error "Task ID is required"; exit 1 }
        $task = $data.tasks | Where-Object { $_.id -eq [int]$TaskId }
        if (-not $task) { Write-Error "Task $TaskId not found"; exit 1 }
        $task.status = "cancelled"
        Save-Tasks
        Write-Host "Task $TaskId ('$($task.title)') cancelled: $Message" -ForegroundColor Yellow
    }
    default {
        Write-Host "Usage: task-manager [list-tasks | start-task <id> | complete-task <id> <msg> | cancel-task <id> <reason>]"
    }
}
