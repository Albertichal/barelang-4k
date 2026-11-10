# Fungsi bersama render-4k.ps1 dan render-preview.ps1.
$ErrorActionPreference = 'Stop'

function Invoke-Step {
  param([string]$Exe, [string[]]$Arguments)
  & $Exe @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Gagal: $Exe $($Arguments -join ' ')" }
}

function Invoke-SceneRender {
  param(
    [string]$OutDir,
    [string]$FinalName,
    [string[]]$ExtraArgs,
    [int[]]$OnlyScenes = @()
  )

  New-Item -ItemType Directory -Force $OutDir | Out-Null

  Write-Host '== Bundle proyek' -ForegroundColor Cyan
  Invoke-Step 'npx' @('remotion', 'bundle', '--out-dir=build')

  Write-Host '== Membaca timeline + menulis subtitle.srt' -ForegroundColor Cyan
  Invoke-Step 'node' @('scripts/timeline.mjs', 'build')
  $timeline = Get-Content 'out/timeline.json' -Raw | ConvertFrom-Json

  foreach ($seg in $timeline.segments) {
    $name = 'scene{0:d2}.mp4' -f [int]$seg.scene
    $file = Join-Path $OutDir $name
    if ($OnlyScenes.Count -gt 0 -and $OnlyScenes -notcontains [int]$seg.scene) { continue }
    if ((Test-Path $file) -and ($OnlyScenes.Count -eq 0)) {
      Write-Host "   lewati $name (sudah ada; hapus file untuk render ulang)" -ForegroundColor DarkGray
      continue
    }
    $tmp = "$file.part.mp4"
    Write-Host "== Scene $($seg.scene): frame $($seg.start)-$($seg.end)" -ForegroundColor Cyan
    Invoke-Step 'npx' (@('remotion', 'render', 'build', 'Barelang', $tmp,
      "--frames=$($seg.start)-$($seg.end)", '--codec=h264', '--concurrency=1',
      '--gl=angle', '--color-space=bt709', '--muted') + $ExtraArgs)
    Move-Item -Force $tmp $file
  }

  if ($OnlyScenes.Count -gt 0) {
    Write-Host 'Selesai render scene pilihan (tidak digabung).' -ForegroundColor Yellow
    return
  }

  Write-Host '== Render audio utuh' -ForegroundColor Cyan
  $audio = Join-Path $OutDir 'audio.m4a'
  Invoke-Step 'npx' @('remotion', 'render', 'build', 'Barelang', $audio, '--codec=aac')

  Write-Host '== Menggabungkan video + audio' -ForegroundColor Cyan
  $list = Join-Path $OutDir 'list.txt'
  $lines = foreach ($seg in $timeline.segments) { "file 'scene{0:d2}.mp4'" -f [int]$seg.scene }
  [IO.File]::WriteAllLines((Resolve-Path $OutDir).Path + '\list.txt', [string[]]$lines)
  Invoke-Step 'ffmpeg' @('-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0',
    '-i', $list, '-i', $audio, '-map', '0:v:0', '-map', '1:a:0', '-c', 'copy',
    '-movflags', '+faststart', '-shortest', $FinalName)
  Write-Host "SELESAI: $FinalName" -ForegroundColor Green
}
