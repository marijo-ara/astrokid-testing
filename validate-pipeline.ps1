# Script para validar que el pipeline de Azure puede ejecutarse correctamente
# Este script simula los pasos del pipeline localmente

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Validación del Pipeline de Azure" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$solutionPath = Join-Path $scriptPath "AstroKid.Tests.sln"

# Verificar que dotnet esté instalado
Write-Host "[1/7] Verificando .NET SDK..." -ForegroundColor Yellow
try {
    $dotnetVersion = dotnet --version
    Write-Host "✓ .NET SDK encontrado: $dotnetVersion" -ForegroundColor Green
    
    # Verificar que sea .NET 9.0
    if ($dotnetVersion -notmatch "^9\.") {
        Write-Host "⚠ Advertencia: Se recomienda .NET 9.0, pero se encontró $dotnetVersion" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ Error: .NET SDK no está instalado" -ForegroundColor Red
    exit 1
}

# Verificar variables de entorno
Write-Host ""
Write-Host "[2/7] Verificando variables de entorno..." -ForegroundColor Yellow
$requiredVars = @("ASTROKID_BASE_URL")
$missingVars = @()

foreach ($var in $requiredVars) {
    $value = [Environment]::GetEnvironmentVariable($var)
    if ([string]::IsNullOrWhiteSpace($value)) {
        $missingVars += $var
        Write-Host "✗ Variable faltante: $var" -ForegroundColor Red
    } else {
        Write-Host "✓ $var = $value" -ForegroundColor Green
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host ""
    Write-Host "⚠ Advertencia: Faltan variables de entorno requeridas" -ForegroundColor Yellow
    Write-Host "  Configura estas variables antes de ejecutar el pipeline:" -ForegroundColor Yellow
    foreach ($var in $missingVars) {
        Write-Host "    - $var" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "  Ejemplo:" -ForegroundColor Yellow
    Write-Host "    `$env:ASTROKID_BASE_URL = 'https://astrokid-480117.uc.r.appspot.com'" -ForegroundColor Gray
    Write-Host ""
    $continue = Read-Host "¿Deseas continuar de todas formas? (s/N)"
    if ($continue -ne "s" -and $continue -ne "S") {
        exit 1
    }
}

# Restaurar dependencias
Write-Host ""
Write-Host "[3/7] Restaurando dependencias..." -ForegroundColor Yellow
try {
    Push-Location $scriptPath
    dotnet restore $solutionPath
    if ($LASTEXITCODE -ne 0) {
        throw "dotnet restore falló"
    }
    Write-Host "✓ Dependencias restauradas" -ForegroundColor Green
} catch {
    Write-Host "✗ Error al restaurar dependencias: $_" -ForegroundColor Red
    Pop-Location
    exit 1
} finally {
    Pop-Location
}

# Compilar solución
Write-Host ""
Write-Host "[4/7] Compilando solución..." -ForegroundColor Yellow
try {
    Push-Location $scriptPath
    dotnet build $solutionPath --configuration Release --no-restore
    if ($LASTEXITCODE -ne 0) {
        throw "dotnet build falló"
    }
    Write-Host "✓ Solución compilada exitosamente" -ForegroundColor Green
} catch {
    Write-Host "✗ Error al compilar: $_" -ForegroundColor Red
    Pop-Location
    exit 1
} finally {
    Pop-Location
}

# Verificar estructura de proyectos
Write-Host ""
Write-Host "[5/7] Verificando estructura de proyectos..." -ForegroundColor Yellow
$projects = @(
    "API.Tests\API.Tests.csproj",
    "UI.Tests\UI.Tests.csproj",
    "Core\Core.csproj"
)

$allProjectsExist = $true
foreach ($project in $projects) {
    $projectPath = Join-Path $scriptPath $project
    if (Test-Path $projectPath) {
        Write-Host "✓ $project" -ForegroundColor Green
    } else {
        Write-Host "✗ $project no encontrado" -ForegroundColor Red
        $allProjectsExist = $false
    }
}

if (-not $allProjectsExist) {
    Write-Host "✗ Error: Faltan proyectos en la solución" -ForegroundColor Red
    exit 1
}

# Verificar que los tests se pueden listar
Write-Host ""
Write-Host "[6/7] Verificando que los tests se pueden listar..." -ForegroundColor Yellow
try {
    Push-Location $scriptPath
    $testList = dotnet test $solutionPath --list-tests --no-build 2>&1
    if ($LASTEXITCODE -eq 0) {
        $testCount = ($testList | Select-String "Test run will use").Count
        Write-Host "✓ Tests listados correctamente" -ForegroundColor Green
        Write-Host "  (Ejecuta 'dotnet test --list-tests' para ver la lista completa)" -ForegroundColor Gray
    } else {
        Write-Host "⚠ Advertencia: No se pudieron listar los tests, pero esto puede ser normal" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ Advertencia: Error al listar tests: $_" -ForegroundColor Yellow
} finally {
    Pop-Location
}

# Verificar archivo de pipeline
Write-Host ""
Write-Host "[7/7] Verificando archivo de pipeline..." -ForegroundColor Yellow
$pipelinePath = Join-Path $scriptPath "azure-pipelines.yml"
if (Test-Path $pipelinePath) {
    Write-Host "✓ azure-pipelines.yml encontrado" -ForegroundColor Green
    
    # Verificar sintaxis básica del YAML
    $pipelineContent = Get-Content $pipelinePath -Raw
    if ($pipelineContent -match "trigger:" -and $pipelineContent -match "jobs:") {
        Write-Host "✓ Estructura básica del pipeline válida" -ForegroundColor Green
    } else {
        Write-Host "⚠ Advertencia: El pipeline puede tener problemas de sintaxis" -ForegroundColor Yellow
    }
} else {
    Write-Host "✗ azure-pipelines.yml no encontrado" -ForegroundColor Red
    exit 1
}

# Resumen
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Resumen de Validación" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✓ Validación completada" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Yellow
Write-Host "1. Configura las variables de entorno en Azure DevOps" -ForegroundColor White
Write-Host "2. Verifica que el pool esté disponible" -ForegroundColor White
Write-Host "3. Ejecuta el pipeline en Azure DevOps" -ForegroundColor White
Write-Host ""
Write-Host "Para más información, consulta:" -ForegroundColor Gray
Write-Host "  - AZURE_PIPELINE_SETUP.md" -ForegroundColor Gray
Write-Host ""

