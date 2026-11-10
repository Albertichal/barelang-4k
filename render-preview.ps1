# Preview 1080p. Pakai: .\render-preview.ps1
# Bisa dilanjutkan kalau terhenti: scene yang sudah jadi akan dilewati.
param([int[]]$Scene = @())
. "$PSScriptRoot\scripts\render-lib.ps1"
Set-Location $PSScriptRoot
Invoke-SceneRender -OutDir 'out/preview' -FinalName 'out/Barelang_preview_1080p.mp4' `
  -ExtraArgs @('--scale=0.5', '--crf=22') -OnlyScenes $Scene
