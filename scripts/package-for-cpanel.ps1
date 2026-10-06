# ============================================================
# package-for-cpanel.ps1
# Packages the pre-built Next.js standalone output into a
# deployment ZIP ready for manual upload to cPanel.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\scripts\package-for-cpanel.ps1
# ============================================================

$ErrorActionPreference = "Stop"
$ProjectRoot  = Split-Path -Parent $PSScriptRoot
$StandaloneSrc = Join-Path $ProjectRoot ".next\standalone"
$StaticSrc     = Join-Path $ProjectRoot ".next\static"
$PublicSrc     = Join-Path $ProjectRoot "public"
$PrismaSrc     = Join-Path $ProjectRoot "prisma"
$OutputDir     = Join-Path $ProjectRoot "dist-cpanel"
$ZipPath       = Join-Path $ProjectRoot "novixa-cpanel-deploy.zip"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  NOVIXA -- cPanel Deployment Packager" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# -- 0. Pre-flight checks
if (-not (Test-Path $StandaloneSrc)) {
    Write-Host "[ERROR] .next/standalone not found. Run 'npm run build' first." -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $StaticSrc)) {
    Write-Host "[ERROR] .next/static not found. Run 'npm run build' first." -ForegroundColor Red
    exit 1
}

# -- 1. Clean previous dist
Write-Host "[1/8] Cleaning previous dist..." -ForegroundColor Yellow
if (Test-Path $OutputDir)  { Remove-Item $OutputDir -Recurse -Force }
if (Test-Path $ZipPath)    { Remove-Item $ZipPath -Force }

# -- 2. Copy standalone
Write-Host "[2/8] Copying standalone build..." -ForegroundColor Yellow
Copy-Item $StandaloneSrc -Destination $OutputDir -Recurse

# -- 3. FIX: Replace standalone's trimmed next/dist with full dist from project
#    The Windows file-tracer produces an incomplete next/dist in standalone.
#    The full dist/ is pure JavaScript (platform-independent) -- safe on Linux.
Write-Host "[3/8] Patching node_modules/next/dist (cross-platform fix)..." -ForegroundColor Yellow
$StandaloneNextDist = Join-Path $OutputDir "node_modules\next\dist"
$FullNextDist       = Join-Path $ProjectRoot "node_modules\next\dist"
if (Test-Path $StandaloneNextDist) { Remove-Item $StandaloneNextDist -Recurse -Force }
Copy-Item $FullNextDist -Destination $StandaloneNextDist -Recurse

# -- 4. Remove Windows-only native binaries (not needed at runtime on Linux)
Write-Host "[4/8] Removing Windows-only native binaries..." -ForegroundColor Yellow
$WinBinaries = @(
    (Join-Path $OutputDir "node_modules\@next\swc-win32-x64-msvc"),
    (Join-Path $OutputDir "node_modules\@next\swc-win32-arm64-msvc"),
    (Join-Path $OutputDir "node_modules\@swc\core-win32-x64-msvc"),
    (Join-Path $OutputDir "node_modules\@img\sharp-win32-x64")
)
foreach ($bin in $WinBinaries) {
    if (Test-Path $bin) {
        Remove-Item $bin -Recurse -Force
        Write-Host "  Removed: $($bin | Split-Path -Leaf)" -ForegroundColor DarkGray
    }
}
# Remove Windows Prisma binary (server must run 'prisma generate' for Linux binary)
$WinPrismaBin = Join-Path $OutputDir "node_modules\.prisma\client\query_engine-windows.dll.node"
if (Test-Path $WinPrismaBin) {
    Remove-Item $WinPrismaBin -Force
    Write-Host "  Removed: query_engine-windows.dll.node (Prisma Windows binary)" -ForegroundColor DarkGray
}

# -- 5. Copy static assets into standalone
Write-Host "[5/8] Copying static assets..." -ForegroundColor Yellow
$StaticDest = Join-Path $OutputDir ".next\static"
if (-not (Test-Path $StaticDest)) { New-Item -ItemType Directory -Path $StaticDest | Out-Null }
Copy-Item "$StaticSrc\*" -Destination $StaticDest -Recurse -Force

# -- 6. Copy public folder
Write-Host "[6/8] Copying public folder..." -ForegroundColor Yellow
$PublicDest = Join-Path $OutputDir "public"
if (Test-Path $PublicSrc) {
    if (-not (Test-Path $PublicDest)) { New-Item -ItemType Directory -Path $PublicDest | Out-Null }
    Copy-Item "$PublicSrc\*" -Destination $PublicDest -Recurse -Force
}

# -- 7. Copy Prisma + Linux Query Engines + server.cjs (LiteSpeed CJS wrapper)
Write-Host "[7/8] Copying Prisma, engines and server.cjs..." -ForegroundColor Yellow
$PrismaDest = Join-Path $OutputDir "prisma"
Copy-Item $PrismaSrc -Destination $PrismaDest -Recurse -Force

# Copy complete .prisma/client from project root to include cross-compiled Linux query engines
$LocalPrismaClient = Join-Path $ProjectRoot "node_modules\.prisma\client"
$DestPrismaClient  = Join-Path $OutputDir "node_modules\.prisma\client"
if (Test-Path $LocalPrismaClient) {
    if (-not (Test-Path $DestPrismaClient)) { New-Item -ItemType Directory -Path $DestPrismaClient -Force | Out-Null }
    Copy-Item "$LocalPrismaClient\*" -Destination $DestPrismaClient -Recurse -Force
    Write-Host "  Bundled Linux Prisma engines from project client" -ForegroundColor DarkGray
}

# DO NOT copy raw local .env with developer secrets into deployment ZIP.
# Instead copy .env.example so production environment is configured safely in cPanel.
$EnvExample = Join-Path $ProjectRoot ".env.example"
if (Test-Path $EnvExample) {
    Copy-Item $EnvExample -Destination (Join-Path $OutputDir ".env.example") -Force
}

$ServerCjs = Join-Path $ProjectRoot "server.cjs"
if (Test-Path $ServerCjs) {
    Copy-Item $ServerCjs -Destination (Join-Path $OutputDir "server.cjs") -Force
}

# Explicit forensic safeguard: Ensure no secret env files, git dirs, or pem keys exist in release package
Get-ChildItem -Path $OutputDir -Include ".env", ".env.local", ".env.production", "*.pem", "*.key" -Recurse -Force -File | Remove-Item -Force

# -- 8. Create ZIP
Write-Host "[8/8] Creating deployment ZIP..." -ForegroundColor Yellow
Compress-Archive -Path "$OutputDir\*" -DestinationPath $ZipPath -CompressionLevel Optimal

# -- Done
$ZipSize = [Math]::Round((Get-Item $ZipPath).Length / 1MB, 2)
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  Done! New deployment ZIP ready:" -ForegroundColor Green
Write-Host "  $ZipPath" -ForegroundColor White
Write-Host "  Size: $ZipSize MB" -ForegroundColor White
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Upload to cPanel File Manager:" -ForegroundColor Cyan
Write-Host "  1. Delete everything in /home/noviqzwh/novixa/ (keep .git)" -ForegroundColor White
Write-Host "  2. Upload + Extract this new 'novixa-cpanel-deploy.zip'" -ForegroundColor White
Write-Host "  3. In cPanel Node.js App settings: set startup file to 'server.cjs'" -ForegroundColor White
Write-Host "  4. Click Restart" -ForegroundColor White
Write-Host "  5. In SSH: run 'npx prisma generate' to build the Linux Prisma binary" -ForegroundColor Yellow
Write-Host ""
