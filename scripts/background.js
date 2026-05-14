/**
 * Walmart LATAM - Casos Dashboard
 * background.js - Lógica para manejar la apertura del Side Panel o Popup
 */

// Listener para el clic en el icono de la extensión
chrome.action.onClicked.addListener(async (tab) => {
    // 1. Verificamos si la API sidePanel y su método open están disponibles
    if (chrome.sidePanel && typeof chrome.sidePanel.open === 'function') {
        try {
            // Intentamos abrir el panel lateral para la ventana actual
            await chrome.sidePanel.open({ windowId: tab.windowId });
            console.log("Side Panel abierto correctamente.");
        } catch (error) {
            console.error("Error al intentar abrir Side Panel:", error);
            // Si falla por alguna razón técnica, usamos el fallback
            openFallbackPopup();
        }
    } else {
        // 2. Fallback para navegadores que no soportan la API Side Panel (versiones antiguas)
        console.log("Side Panel no soportado. Usando fallback a ventana popup.");
        openFallbackPopup();
    }
});

/**
 * Abre una ventana emergente (popup) como alternativa al panel lateral
 */
function openFallbackPopup() {
    chrome.windows.create({
        url: 'views/popup.html',
        type: 'popup',
        width: 600,
        height: 700,
        focused: true
    });
}

// Configuración inicial al instalar o actualizar la extensión
chrome.runtime.onInstalled.addListener(() => {
    console.log("Extensión Walmart Casos Dashboard instalada/actualizada.");

    // Opcional: Configurar comportamiento global si el navegador lo permite
    if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
        chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
            .catch((err) => console.warn("No se pudo configurar openPanelOnActionClick:", err));
    }
});