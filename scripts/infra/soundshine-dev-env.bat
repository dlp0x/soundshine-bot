@echo off
echo.
echo ===============================================
echo   🚀 Préparation de l’environnement soundSHINE
echo ===============================================

:: Vérifie si nvm est installé
where nvm >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ❌ NVM non trouvé. Installe-le depuis https://github.com/coreybutler/nvm-windows
    pause
    exit /b
)

:: Utilise Node 20.19.2 (LTS) - installe si nécessaire
echo.
echo 🔍 Vérification de Node.js v20.19.2...
nvm ls | find "20.19.2" >nul
IF %ERRORLEVEL% NEQ 0 (
    echo 📥 Installation de Node.js v20.19.2...
    nvm install 20.19.2
)

echo ✅ Utilisation de Node.js v20.19.2...
nvm use 20.19.2

:: Nettoyage des dépendances
echo.
echo 🧹 Nettoyage de node_modules et du lockfile...
IF EXIST node_modules (
    rmdir /s /q node_modules
)
IF EXIST package-lock.json (
    del package-lock.json
)

:: Réinstallation
echo.
echo 📦 Réinstallation des dépendances...
npm install

echo.
echo ✅ Environnement prêt. Bon dev, DJ du code !
pause
