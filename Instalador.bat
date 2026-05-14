@echo off
setlocal enabledelayedexpansion

:: ==========================================
:: Elevación de privilegios a Administrador
:: ==========================================
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo Solicitando privilegios de administrador...
    goto UACPrompt
) else ( goto gotAdmin )

:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    exit /B

:gotAdmin
    if exist "%temp%\getadmin.vbs" ( del "%temp%\getadmin.vbs" )
    pushd "%CD%"
    CD /D "%~dp0"

:: ==========================================
:: Configuración del Instalador
:: ==========================================
set INSTALL_DIR=C:\WalmartCasosExtension
set REPO_URL=https://github.com/tecniserviciosh2000/walmart-casos-extension.git
set TASK_NAME=WalmartCasosExtensionUpdater

echo ===================================================
echo Instalador de Walmart Casos Extension
echo ===================================================

echo Comprobando instalacion de Git...
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Git no esta instalado en este sistema.
    echo Por favor, instale Git ^(https://git-scm.com/^) asegurando que se agregue al PATH y vuelva a intentarlo.
    pause
    exit /B
)

if exist "%INSTALL_DIR%" (
    echo.
    echo El directorio %INSTALL_DIR% ya existe.
    echo Actualizando repositorio existente...
    cd /d "%INSTALL_DIR%"
    git fetch origin main
    git reset --hard origin/main
) else (
    echo.
    echo Clonando el repositorio en %INSTALL_DIR%...
    git clone "%REPO_URL%" "%INSTALL_DIR%"
    cd /d "%INSTALL_DIR%"
)

:: ==========================================
:: Configurar la Tarea Programada de Windows
:: ==========================================
echo.
echo Configuracion de la tarea automatica de Windows...

set PS_SCRIPT=%INSTALL_DIR%\updater.ps1

if not exist "%PS_SCRIPT%" (
    echo ERROR: No se encontro updater.ps1 en el repositorio clonado.
    pause
    exit /B
)

REM Borrar tarea si existe para evitar duplicados
schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1

REM Crear tarea (se ejecuta cada 30 minutos, con privilegios SYSTEM y de forma oculta)
schtasks /create /tn "%TASK_NAME%" /tr "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%PS_SCRIPT%\"" /sc minute /mo 30 /ru SYSTEM /f

echo.
echo ===================================================
echo Instalacion y configuracion completadas exitosamente.
echo ===================================================
echo - La extension esta instalada en: %INSTALL_DIR%
echo - El script de fondo comprobara actualizaciones cada 30 minutos.
echo - Para cargar la extension en Chrome, ve a chrome://extensions,
echo   activa "Modo desarrollador", haz clic en "Cargar descomprimida"
echo   y selecciona la carpeta: %INSTALL_DIR%
echo.
pause
