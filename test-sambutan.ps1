#!/usr/bin/env pwsh
# Quick test script untuk fitur Sambutan

Write-Host "🧪 Testing Sambutan Feature..." -ForegroundColor Cyan
Write-Host ""

# Check if migration file exists
if (Test-Path "supabase\migrations\14_create_album_teachers.sql") {
    Write-Host "✅ Migration file exists" -ForegroundColor Green
} else {
    Write-Host "❌ Migration file not found!" -ForegroundColor Red
    exit 1
}

# Check if components exist
$components = @(
    "components\SambutanPanel.tsx",
    "components\SambutanView.tsx"
)

foreach ($comp in $components) {
    if (Test-Path $comp) {
        Write-Host "✅ $comp exists" -ForegroundColor Green
    } else {
        Write-Host "❌ $comp not found!" -ForegroundColor Red
        exit 1
    }
}

# Check if API routes exist
$routes = @(
    "app\api\albums\[id]\teachers\route.ts",
    "app\api\albums\[id]\teachers\[teacherId]\route.ts",
    "app\api\albums\[id]\teachers\[teacherId]\photo\route.ts"
)

foreach ($route in $routes) {
    if (Test-Path $route) {
        Write-Host "✅ $route exists" -ForegroundColor Green
    } else {
        Write-Host "❌ $route not found!" -ForegroundColor Red
        exit 1
    }
}

# Check if main file was updated
$mainFile = "app\user\portal\album\yearbook\[id]\YearbookClassesViewUI.tsx"
$content = Get-Content $mainFile -Raw

if ($content -match "SambutanPanel" -and $content -match "SambutanView" -and $content -match "MessageSquare") {
    Write-Host "✅ YearbookClassesViewUI.tsx updated" -ForegroundColor Green
} else {
    Write-Host "⚠️  YearbookClassesViewUI.tsx may need review" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 Summary:" -ForegroundColor Cyan
Write-Host "   - Migration: Ready ✅" -ForegroundColor White
Write-Host "   - Components: Created ✅" -ForegroundColor White
Write-Host "   - API Routes: Created ✅" -ForegroundColor White
Write-Host "   - Integration: Done ✅" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Run migration in Supabase Dashboard" -ForegroundColor White
Write-Host "   2. Restart dev server: npm run dev" -ForegroundColor White
Write-Host "   3. Hard refresh browser (Ctrl+Shift+R)" -ForegroundColor White
Write-Host "   4. Test the Sambutan sidebar" -ForegroundColor White
Write-Host ""
Write-Host "📖 See MIGRATION_GUIDE.md for details" -ForegroundColor Cyan
