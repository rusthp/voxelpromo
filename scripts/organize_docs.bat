@echo off
echo Organizando documentacao...
echo.

REM Criar estrutura de pastas
mkdir "docs\archive\fixes" 2>nul
mkdir "docs\archive\analysis" 2>nul
mkdir "docs\archive\old-reviews" 2>nul
mkdir "docs\integrations" 2>nul
mkdir "docs\development" 2>nul
mkdir "docs\deployment" 2>nul
mkdir "docs\getting-started" 2>nul

echo Estrutura de pastas criada.
echo.

REM Mover fixes
echo Movendo correções...
move "docs\*_FIX.md" "docs\archive\fixes\" 2>nul
move "docs\*_FIXES.md" "docs\archive\fixes\" 2>nul
move "docs\*QUICK_FIX.md" "docs\archive\fixes\" 2>nul
move "docs\LINTING_FIXES.md" "docs\archive\fixes\" 2>nul
move "docs\TESTING_FIXES.md" "docs\archive\fixes\" 2>nul
move "docs\WHATSAPP_FIXES_QRCODE_SYNC.md" "docs\archive\fixes\" 2>nul

REM Mover análises  
echo Movendo análises...
move "docs\*_ANALYSIS.md" "docs\archive\analysis\" 2>nul
move "docs\*_ISSUE.md" "docs\archive\analysis\" 2>nul

REM Mover reviews antigos
echo Movendo reviews antigos...
move "docs\PROJECT_REVIEW*.md" "docs\archive\old-reviews\" 2>nul
move "docs\IRIS*.md" "docs\archive\old-reviews\" 2>nul
move "docs\*_IMPROVEMENTS_IMPLEMENTED.md" "docs\archive\old-reviews\" 2>nul
move "docs\VERIFICATION_SUMMARY.md" "docs\archive\old-reviews\" 2>nul
move "docs\SYSTEM_STATUS.md" "docs\archive\old-reviews\" 2>nul
move "docs\OFFERS_DELETION_VERIFICATION.md" "docs\archive\old-reviews\" 2>nul
move "docs\COVERAGE_IMPROVEMENT_PLAN.md" "docs\archive\old-reviews\" 2>nul
move "docs\ROADMAP_TESTING.md" "docs\archive\old-reviews\" 2>nul

echo.
echo ✓ Organizacao concluida!
echo.
echo Arquivos movidos para:
echo   - docs\archive\fixes\
echo   - docs\archive\analysis\
echo   - docs\archive\old-reviews\
echo.
pause
