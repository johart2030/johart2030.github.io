param(
    [Parameter(Mandatory = $true)]
    [string] $Destination
)

$ErrorActionPreference = 'Stop'
$repository = 'https://raw.githubusercontent.com/johart2030/wav-player/main'
$files = @(
    'wav-player.html',
    'server.py',
    'Run WAV Player.bat',
    'favicon-32x32-wav-player-html.png',
    'favicon-wav-player-html.ico'
)
$destinationPath = [System.IO.Path]::GetFullPath($Destination.Trim('"'))
$temporaryPath = Join-Path ([System.IO.Path]::GetTempPath()) ('wav-player-' + [guid]::NewGuid().ToString('N'))

try {
    New-Item -ItemType Directory -Path $temporaryPath | Out-Null
    New-Item -ItemType Directory -Path $destinationPath -Force | Out-Null

    foreach ($file in $files) {
        $downloadPath = Join-Path $temporaryPath $file
        $downloadUrl = $repository + '/' + [uri]::EscapeDataString($file)
        Write-Host "Downloading $file..."
        Invoke-WebRequest -UseBasicParsing -Uri $downloadUrl -OutFile $downloadPath
        if (-not (Test-Path -LiteralPath $downloadPath -PathType Leaf) -or (Get-Item -LiteralPath $downloadPath).Length -eq 0) {
            throw "GitHub returned an empty download for $file."
        }
    }

    foreach ($file in $files) {
        Copy-Item -LiteralPath (Join-Path $temporaryPath $file) -Destination (Join-Path $destinationPath $file) -Force
    }

    Write-Host "Installed WAV Player files in: $destinationPath"
    Write-Host 'Your WAV and MP3 files were not changed.'
}
catch {
    Write-Error "Could not install WAV Player: $($_.Exception.Message)"
    exit 1
}
finally {
    if (Test-Path -LiteralPath $temporaryPath) {
        Remove-Item -LiteralPath $temporaryPath -Recurse -Force
    }
}
