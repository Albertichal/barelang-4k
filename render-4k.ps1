# Render final 4K per scene lalu digabung. Pakai: .\render-4k.ps1
# Bisa dilanjutkan kalau terhenti: scene yang sudah jadi akan dilewati.
# Render satu scene saja: .\render-4k.ps1 -Scene 3
param([int[]]$Scene = @())
. "$PSScriptRoot\scripts\render-lib.ps1"
Set-Location $PSScriptRoot
Invoke-SceneRender -OutDir 'out/4k' -FinalName 'out/Barelang_4K_final.mp4' `
  -ExtraArgs @('--crf=16') -OnlyScenes $Scene
