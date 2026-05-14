# updater.ps1
$ErrorActionPreference = "SilentlyContinue"

# El script asume que está en el directorio de instalación
$installPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
cd $installPath

$logPath = "$installPath\updater.log"

function Write-Log($message) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logPath -Value "[$timestamp] $message"
}

Write-Log "--- Iniciando comprobación de actualización ---"

$remoteUrl = "https://raw.githubusercontent.com/tecniserviciosh2000/walmart-casos-extension/main/manifest.json"
$localManifestPath = "$installPath\manifest.json"

try {
    # Evitar problemas de versión TLS
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    
    # Añadir timestamp para evitar caché
    $timestampForUrl = (Get-Date).Ticks
    $remoteManifest = Invoke-RestMethod -Uri "$remoteUrl?t=$timestampForUrl" -UseBasicParsing
    $remoteVersion = $remoteManifest.version

    if (Test-Path $localManifestPath) {
        $localManifest = Get-Content -Path $localManifestPath -Raw | ConvertFrom-Json
        $localVersion = $localManifest.version
        
        Write-Log "Versión Local: $localVersion | Versión Remota: $remoteVersion"

        if ($localVersion -ne $remoteVersion) {
            Write-Log "Actualización detectada. Descargando nueva versión..."
            
            # Hacer el pull/reset de github de forma limpia
            $outFetch = git fetch origin main 2>&1
            Write-Log "Git Fetch: $outFetch"
            
            $outReset = git reset --hard origin/main 2>&1
            Write-Log "Git Reset: $outReset"
            
            Write-Log "Actualización completada a la versión $remoteVersion."
        } else {
            Write-Log "La extensión está actualizada."
        }
    } else {
         Write-Log "Error: No se encontró el manifest.json local en $localManifestPath."
    }
} catch {
    Write-Log "Error al verificar la actualización: $($_.Exception.Message)"
}
