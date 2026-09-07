$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
# dist/ é a saída do Vite; os pacotes de deploy vão para dep/, que é ignorado pelo Git.
$depDir = Join-Path $scriptDir 'dep'
$parentDir = Split-Path -Parent $scriptDir
$folderName = Split-Path -Leaf $scriptDir

if (-not (Test-Path -LiteralPath $depDir)) {
    New-Item -ItemType Directory -Path $depDir | Out-Null
    Write-Host 'Pasta dep/ criada.'
}

$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$tarName = "${folderName}_${timestamp}.tar.gz"
$tarPath = Join-Path $depDir $tarName
$tarExe = "$env:SystemRoot\System32\tar.exe"

if (-not (Test-Path -LiteralPath $tarExe)) {
    throw "tar.exe não encontrado em $tarExe (requer Windows 10 1803+)."
}

# O pacote leva só o que o Dockerfile copia, mais o captain-definition. Em particular
# docs/ fica de fora: são 21 MB de originais que a imagem não usa, porque as cópias
# servidas pela aplicação vivem em public/assets/references.
$incluidos = @(
    'captain-definition', 'Dockerfile', 'nginx.conf',
    'package.json', 'package-lock.json', 'tsconfig.json',
    'vite.visita.config.ts', 'visita.html',
    'src', 'public'
)
$faltando = $incluidos | Where-Object { -not (Test-Path -LiteralPath (Join-Path $scriptDir $_)) }
if ($faltando) {
    throw ("Faltam arquivos exigidos pelo pacote: {0}" -f ($faltando -join ', '))
}
$archiveItems = $incluidos | ForEach-Object { "$folderName/$_" }

# Credenciais e saídas de build nunca seguem para o servidor.
& $tarExe -czf $tarPath -C $parentDir `
    "--exclude=*/node_modules" `
    "--exclude=*/node_modules/*" `
    "--exclude=*/.env" `
    "--exclude=*/dist" `
    "--exclude=*/dep" `
    $archiveItems

if ($LASTEXITCODE -ne 0) {
    throw "tar falhou com código $LASTEXITCODE."
}

$sizeKB = [math]::Round((Get-Item -LiteralPath $tarPath).Length / 1KB)
Write-Host "OK  dep\$tarName  (${sizeKB} KB)"

# Conserva somente os cinco pacotes mais recentes.
$archives = Get-ChildItem -LiteralPath $depDir -File |
    Where-Object { $_.Name -like '*.tar' -or $_.Name -like '*.tar.gz' } |
    Sort-Object LastWriteTime -Descending
$oldArchives = @($archives | Select-Object -Skip 5)
if ($oldArchives) {
    $oldArchives | Remove-Item -Force
    Write-Host ("Removidos {0} arquivo(s) antigo(s) de dep/." -f $oldArchives.Count)
}
