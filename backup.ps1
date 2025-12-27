param(
  [string]$Message = ""
)

$ErrorActionPreference = "Stop"

# Commit/push only if there are changes
$dirty = git status --porcelain
if ([string]::IsNullOrWhiteSpace($dirty)) {
  Write-Host "No changes to commit."
  exit 0
}

git add -A

if ([string]::IsNullOrWhiteSpace($Message)) {
  $Message = "Auto-backup " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
}

git commit -m $Message
git push

Write-Host "Backup complete."
