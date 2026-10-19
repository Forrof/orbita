$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskCache = Join-Path $taskRoot '.cache'
New-Item -ItemType Directory -Path $taskCache -Force | Out-Null
$taskSources = @{
  'ine-nombres.xlsx' = 'https://www.ine.es/daco/daco42/nombyapel/nombres_por_edad_media.xlsx'
  'ine-apellidos.xls' = 'https://www.ine.es/daco/daco42/nombyapel/apellidos_frecuencia.xls'
}
foreach ($taskName in $taskSources.Keys) {
  $taskTarget = Join-Path $taskCache $taskName
  if (-not (Test-Path -LiteralPath $taskTarget)) {
    Invoke-WebRequest -Uri $taskSources[$taskName] -OutFile $taskTarget -UseBasicParsing
  }
  Get-FileHash -LiteralPath $taskTarget -Algorithm SHA256 | Select-Object Hash, Path
}
