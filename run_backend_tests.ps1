# Script para ejecutar pruebas de backend en AstroKid.Tests
# Uso: .\run_backend_tests.ps1 [opciones]

param(
    [string]$Filter = "",
    [switch]$Verbose,
    [switch]$ListTests,
    [string]$Logger = "console;verbosity=normal"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AstroKid Backend Tests Runner" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que dotnet esté instalado
Write-Host "Verificando .NET SDK..." -ForegroundColor Yellow
try {
    $dotnetVersion = dotnet --version
    Write-Host "✓ .NET SDK encontrado: $dotnetVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Error: .NET SDK no está instalado o no está en el PATH" -ForegroundColor Red
    Write-Host "  Por favor, instala .NET SDK desde https://dotnet.microsoft.com/download" -ForegroundColor Yellow
    exit 1
}

# Navegar al directorio del proyecto
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$solutionPath = Join-Path $scriptPath "AstroKid.Tests.sln"
$apiTestsPath = Join-Path $scriptPath "API.Tests"

if (-not (Test-Path $solutionPath)) {
    Write-Host "✗ Error: No se encontró AstroKid.Tests.sln en $scriptPath" -ForegroundColor Red
    exit 1
}

Write-Host "Directorio de trabajo: $scriptPath" -ForegroundColor Gray
Write-Host ""

# Restaurar dependencias
Write-Host "Restaurando dependencias de NuGet..." -ForegroundColor Yellow
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

Write-Host ""

# Listar tests si se solicita
if ($ListTests) {
    Write-Host "Listando tests disponibles..." -ForegroundColor Yellow
    try {
        Push-Location $scriptPath
        dotnet test $solutionPath --list-tests --no-build
        Pop-Location
        exit 0
    } catch {
        Write-Host "✗ Error al listar tests: $_" -ForegroundColor Red
        Pop-Location
        exit 1
    }
}

# Construir el proyecto
Write-Host "Compilando proyectos..." -ForegroundColor Yellow
try {
    Push-Location $scriptPath
    dotnet build $solutionPath --configuration Debug --no-restore
    if ($LASTEXITCODE -ne 0) {
        throw "dotnet build falló"
    }
    Write-Host "✓ Proyectos compilados exitosamente" -ForegroundColor Green
} catch {
    Write-Host "✗ Error al compilar: $_" -ForegroundColor Red
    Pop-Location
    exit 1
} finally {
    Pop-Location
}

Write-Host ""

# Ejecutar tests
Write-Host "Ejecutando pruebas..." -ForegroundColor Yellow
Write-Host ""

$testArgs = @(
    "test",
    $solutionPath,
    "--configuration", "Debug",
    "--no-build",
    "--logger", $Logger
)

if ($Verbose) {
    $testArgs += "--verbosity", "detailed"
}

if ($Filter) {
    $testArgs += "--filter", $Filter
    Write-Host "Filtro aplicado: $Filter" -ForegroundColor Gray
}

$testExitCode = 1
try {
    Push-Location $scriptPath
    dotnet $testArgs
    $testExitCode = $LASTEXITCODE
    
    if ($testExitCode -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  ✓ Todas las pruebas pasaron" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Red
        Write-Host "  ✗ Algunas pruebas fallaron" -ForegroundColor Red
        Write-Host "========================================" -ForegroundColor Red
    }
} catch {
    Write-Host ""
    Write-Host "✗ Error al ejecutar pruebas: $_" -ForegroundColor Red
    $testExitCode = 1
} finally {
    Pop-Location
}

exit $testExitCode

