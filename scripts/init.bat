@echo off
echo 🚀 VoxelPromo - Initialization Script
echo ======================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    exit /b 1
)

echo ✅ Node.js detected
echo.

REM Install backend dependencies
echo 📦 Installing backend dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to install backend dependencies
    exit /b 1
)

REM Install frontend dependencies
echo.
echo 📦 Installing frontend dependencies...
cd frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to install frontend dependencies
    cd ..
    exit /b 1
)
cd ..

REM Create .env if it doesn't exist
if not exist .env (
    echo.
    echo 📝 Creating .env file from .env.example...
    if exist .env.example (
        copy .env.example .env
        echo ⚠️  Please edit .env file with your credentials!
    ) else (
        echo ⚠️  .env.example not found. Please create .env manually.
    )
) else (
    echo ✅ .env file already exists
)

REM Create logs directory
if not exist logs mkdir logs

echo.
echo ✅ Initialization complete!
echo.
echo Next steps:
echo 1. Edit .env file with your API keys and credentials
echo 2. Make sure MongoDB is running
echo 3. Run 'npm run dev' to start the application
echo.

pause

