[CmdletBinding(SupportsShouldProcess)]
param(
    # São lidas exclusivamente as três chaves CAPROVER_*; o conteúdo do .env
    # nunca é executado como PowerShell e demais valores ficam intactos.
    [string]$EnvironmentFile,
    [string]$TarFile,
    [switch]$SkipBuild,
    [switch]$SkipTests
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($EnvironmentFile)) {
    $EnvironmentFile = Join-Path -Path $PSScriptRoot -ChildPath '.env'
}

function Import-DeployEnvironment {
    param([Parameter(Mandatory)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw ("Arquivo de configuração não encontrado: $Path`n" +
            "Crie-o a partir de .env.example e defina:`n" +
            "  CAPROVER_URL=https://captain.exemplo.com`n" +
            "  CAPROVER_APP=vovo-bisa`n" +
            "  CAPROVER_APP_TOKEN=App Token da aba Deployment")
    }

    $allowed = @('CAPROVER_URL', 'CAPROVER_APP', 'CAPROVER_APP_TOKEN')
    $values = @{}
    foreach ($line in Get-Content -LiteralPath $Path) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith('#')) { continue }
        if ($trimmed -notmatch '^(?<name>[A-Za-z0-9_]+)=(?<value>.*)$') { continue }
        $name = $Matches.name
        if ($name -notin $allowed) { continue }
        $value = $Matches.value.Trim()
        if ($value.Length -ge 2 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        $values[$name] = $value
    }
    return $values
}

function Require-EnvironmentValue {
    param([Parameter(Mandatory)][string]$Name, [Parameter(Mandatory)][hashtable]$Values)

    $value = if ($Values.ContainsKey($Name)) { $Values[$Name] } else { [Environment]::GetEnvironmentVariable($Name) }
    if ([string]::IsNullOrWhiteSpace($value)) {
        throw "Defina $Name em $EnvironmentFile antes de fazer o deploy."
    }
    return $value.Trim()
}

$deployEnvironment = Import-DeployEnvironment -Path $EnvironmentFile
$caproverUrl = Require-EnvironmentValue -Name 'CAPROVER_URL' -Values $deployEnvironment
$caproverApp = Require-EnvironmentValue -Name 'CAPROVER_APP' -Values $deployEnvironment
$appToken = Require-EnvironmentValue -Name 'CAPROVER_APP_TOKEN' -Values $deployEnvironment

# Barra final vira barra dupla quando a CLI concatena o caminho da API, e o servidor
# responde 404 a //api/v2/... . Cortar aqui evita depender de como o .env foi escrito.
$caproverUrl = $caproverUrl.TrimEnd('/')

$uri = $null
if (-not [Uri]::TryCreate($caproverUrl, [UriKind]::Absolute, [ref]$uri) -or $uri.Scheme -ne 'https') {
    throw 'CAPROVER_URL deve ser uma URL HTTPS completa, por exemplo https://captain.exemplo.com'
}
if ($caproverApp -notmatch '^[a-z0-9][a-z0-9-]*$') {
    throw 'CAPROVER_APP deve conter apenas minúsculas, números e hifens.'
}
if (-not (Get-Command caprover -ErrorAction SilentlyContinue)) {
    throw 'CLI do CapRover não encontrada. Instale-a com: npm install -g caprover'
}

$projectRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$buildScript = Join-Path $projectRoot 'build.ps1'
if ($TarFile) {
    if (-not (Test-Path -LiteralPath $TarFile -PathType Leaf)) { throw "Tarball informado não encontrado: $TarFile" }
    $archivePath = (Resolve-Path -LiteralPath $TarFile).Path
}
else {
    if ($SkipBuild) { throw '-SkipBuild exige também -TarFile.' }
    if (-not (Test-Path -LiteralPath $buildScript -PathType Leaf)) { throw "build.ps1 não encontrado em $projectRoot" }
    $archivePath = $null
}

$target = "$caproverApp em $caproverUrl"
if (-not $PSCmdlet.ShouldProcess($target, 'Rodar testes, criar tarball e publicar no CapRover')) { return }

if (-not $SkipTests) {
    Write-Host 'Rodando testes e typecheck...'
    Push-Location -LiteralPath $projectRoot
    try {
        & npm test
        if ($LASTEXITCODE -ne 0) { throw 'A suíte de testes falhou; deploy cancelado.' }
        & npm run typecheck
        if ($LASTEXITCODE -ne 0) { throw 'O typecheck falhou; deploy cancelado.' }
    }
    finally { Pop-Location }
}

if ($null -eq $archivePath) {
    Write-Host 'Criando tarball...'
    $buildStartedAt = [DateTime]::UtcNow
    Push-Location -LiteralPath $projectRoot
    try {
        & $buildScript
        if ($LASTEXITCODE -ne 0) { throw 'build.ps1 falhou; deploy cancelado.' }
    }
    finally { Pop-Location }
    $archivePath = Get-ChildItem -LiteralPath (Join-Path $projectRoot 'dep') -File |
        Where-Object { $_.Name -like '*.tar.gz' -or $_.Name -like '*.tar' } |
        Where-Object { $_.LastWriteTimeUtc -ge $buildStartedAt.AddSeconds(-2) } |
        Sort-Object LastWriteTimeUtc -Descending |
        Select-Object -First 1 -ExpandProperty FullName
    if ([string]::IsNullOrWhiteSpace($archivePath)) { throw 'build.ps1 terminou sem criar um tarball novo em dep/.' }
}

Push-Location -LiteralPath $projectRoot
try {
    # Caminho relativo evita a concatenação incorreta de caminho absoluto na CLI do CapRover no Windows.
    $archiveForCli = Resolve-Path -LiteralPath $archivePath -Relative
    $previousToken = [Environment]::GetEnvironmentVariable('CAPROVER_APP_TOKEN')
    try {
        $env:CAPROVER_APP_TOKEN = $appToken
        Write-Host "Publicando $($archivePath | Split-Path -Leaf) em $caproverApp..."
        & caprover deploy --caproverUrl $caproverUrl --caproverApp $caproverApp --tarFile $archiveForCli
        if ($LASTEXITCODE -ne 0) { throw 'A CLI do CapRover retornou falha no deploy.' }
    }
    finally {
        if ($null -eq $previousToken) { Remove-Item Env:CAPROVER_APP_TOKEN -ErrorAction SilentlyContinue }
        else { $env:CAPROVER_APP_TOKEN = $previousToken }
    }
}
finally { Pop-Location }

Write-Host 'Deploy enviado. Acompanhe o build no CapRover; a imagem serve apenas arquivos estáticos.'
