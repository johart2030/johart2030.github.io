param(
  [string]$EnvFile = ".env.preview"
)

if (-not (Test-Path $EnvFile)) {
  Write-Error "Missing $EnvFile. Copy .env.preview.example to .env.preview and fill in your values."
  exit 1
}

Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*$' -or $_ -match '^\s*#') {
    return
  }

  $parts = $_ -split '=', 2
  if ($parts.Length -eq 2) {
    [System.Environment]::SetEnvironmentVariable($parts[0], $parts[1], "Process")
  }
}

node scripts/generate-nef-previews.mjs
