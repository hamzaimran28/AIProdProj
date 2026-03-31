param([string]$Path)
if (-not $Path) { exit 1 }
(Get-Content -LiteralPath $Path) |
  ForEach-Object { $_ -replace '^pick (e678ef8)', 'edit $1' } |
  Set-Content -LiteralPath $Path
