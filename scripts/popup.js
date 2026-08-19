const statusConfig = [
  { label: 'Reconocimiento', filter: 'reconocimiento', comment: 'TSH2000' },
  { label: 'Aceptado', filter: 'aceptado', comment: 'TSH2000' },
  { label: 'Revisión Pendiente del Supervisor', filter: 'REVISIÓN PENDIENTE DEL SUPERVISOR', comment: 'Walmart' },
  { label: 'Aprobación en Curso', filter: 'APROBACIÓN EN CURSO', comment: 'Walmart' },
  { label: 'En Espera de Componentes', filter: 'EN ESPERA DE COMPONENTES', comment: 'TSH2000' },
  { label: 'Activo', filter: 'activo', comment: 'TSH2000' },
  { label: 'Validación de Tienda Pendiente', filter: 'VALIDACIÓN DE TIENDA PENDIENTE', comment: 'Walmart' },
  { label: 'PO/GR Fallido', filter: 'PO/GR FALLIDO', comment: 'Walmart' },
  { label: 'Fallo en la Verificación', filter: 'FALLO EN LA VERIFICACIÓN', comment: 'TSH2000' },
  { label: 'Cierre de SAP Pendiente', filter: 'CIERRE DE SAP PENDIENTE', comment: 'Walmart' },
  { label: 'SOW FALLÓ', filter: 'SOW FALLÓ', comment: 'Walmart' },
  { label: 'Validación Pendiente del Supervisor', filter: 'VALIDACIÓN PENDIENTE DEL SUPERVISOR', comment: 'Walmart' },
  { label: 'Pendiente de Validación Final del Proveedor', filter: 'PENDIENTE DE VALIDACIÓN FINAL DEL PROVEEDOR', comment: 'TSH2000' },
  { label: 'Disponibilidad de Presupuesto Pendiente', filter: 'DISPONIBILIDAD DE PRESUPUESTO PENDIENTE EN ESPERA', comment: 'Walmart' },
  { label: 'Validación Fallida', filter: 'VALIDACIÓN FALLIDA', comment: 'Walmart' },
  { label: 'Revisión Costo Cambio Pendiente', filter: 'REVISIÓN DE COSTO DE CAMBIO PENDIENTE', comment: 'Walmart' }
];

const SESSION_URL = "https://ptririgamx.wal-mart.com/latam/api/v1/session/status";
const baseUrl = "https://ptririgamx.wal-mart.com/latam/api/v1/query/data?reportTemplId=151590&projectId=1&initialLoad=true&removeCancel=true&bookmarkable=false&suppressTitleChange=true&noHdr=0&context=bookmarked&portalSectionId=-1&fromUI=true&perform=refresh&filtCount=17&filterValue11=";
const commonParams = "&dsId11=0&sectionName11=RecordInformation&secSectionName11=&fieldName11=triStatusCL&fieldLabel11=Status&dataType11=320&filterType11=16&columnType11=5&=&resultSizeIn=50&pageNo=0&rt=-1&parentSOGuiId=-1&parentSOId=-1&source=&associatedId=-1&sAType=sectionCustomAction&parentSOSubCategoryId=-1&parentSOCategoryId=-1&selectType=&tempSpecId=746943413932543923&tempToken=-1&projectSearch=-1&manager=-1&guiId=-1&propagateQueryActions=false&accessLocalizedData=false&olv=false&ffCnt=-1&altGuiListId=-1&designTime=false&linkSection=-1&lastContext=default-view";

// Estado global
let sessionStatus = null;

// ─── Persistencia del desglose de Activos ───────────────────────────────────
const STORAGE_KEY_DESGLOSE = 'desgloseActivos';

/**
 * Guarda los valores de desglose en chrome.storage.local
 */
function saveDesgloseValues(eliminar, velada) {
  chrome.storage.local.set({
    [STORAGE_KEY_DESGLOSE]: { eliminar, velada }
  });
}

/**
 * Carga los valores de desglose desde chrome.storage.local
 * @returns {Promise<{eliminar: number, velada: number}>}
 */
function loadDesgloseValues() {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY_DESGLOSE, (data) => {
      const stored = data[STORAGE_KEY_DESGLOSE];
      resolve({
        eliminar: stored?.eliminar || 0,
        velada: stored?.velada || 0
      });
    });
  });
}

/**
 * Recalcula "Pendientes de Realizar" y actualiza la UI + persistencia
 */
function recalcularPendientesRealizar(totalActivos) {
  const inputEliminar = document.getElementById('inputEliminar');
  const inputVelada = document.getElementById('inputVelada');
  const spanRealizar = document.getElementById('countRealizar');
  const validationMsg = document.getElementById('desgloseValidation');

  let eliminar = parseInt(inputEliminar.value) || 0;
  let velada = parseInt(inputVelada.value) || 0;

  // No permitir negativos
  if (eliminar < 0) { eliminar = 0; inputEliminar.value = 0; }
  if (velada < 0) { velada = 0; inputVelada.value = 0; }

  const suma = eliminar + velada;
  const realizar = totalActivos - suma;

  // Validación: la suma no puede exceder el total
  if (suma > totalActivos) {
    inputEliminar.classList.add('invalid');
    inputVelada.classList.add('invalid');
    spanRealizar.textContent = '0';
    spanRealizar.style.color = 'var(--danger)';
    validationMsg.textContent = `⚠️ La suma (${suma}) excede los Activos (${totalActivos})`;
    validationMsg.style.display = 'block';
  } else {
    inputEliminar.classList.remove('invalid');
    inputVelada.classList.remove('invalid');
    spanRealizar.textContent = realizar;
    spanRealizar.style.color = 'var(--primary)';
    validationMsg.style.display = 'none';
  }

  // Guardar en persistencia
  saveDesgloseValues(eliminar, velada);
}

/**
 * Renderiza las sub-filas del desglose de Activos (expandidas por defecto)
 */
async function renderDesgloseActivo(table, totalActivos) {
  const saved = await loadDesgloseValues();
  const realizar = Math.max(0, totalActivos - saved.eliminar - saved.velada);

  // Sub-fila: Pendientes de Eliminar
  const trEliminar = document.createElement('tr');
  trEliminar.className = 'sub-row';
  trEliminar.innerHTML = `
    <td class="label">Pendientes de Eliminar</td>
    <td class="count">
      <input type="number" id="inputEliminar" class="sub-input" 
             value="${saved.eliminar}" min="0" max="${totalActivos}">
    </td>
    <td class="comment">WM</td>
  `;
  table.appendChild(trEliminar);

  // Sub-fila: Pendientes de Velada
  const trVelada = document.createElement('tr');
  trVelada.className = 'sub-row';
  trVelada.innerHTML = `
    <td class="label">Pendientes de Velada</td>
    <td class="count">
      <input type="number" id="inputVelada" class="sub-input" 
             value="${saved.velada}" min="0" max="${totalActivos}">
    </td>
    <td class="comment">WM</td>
  `;
  table.appendChild(trVelada);

  // Sub-fila: Pendientes de Realizar (calculado)
  const trRealizar = document.createElement('tr');
  trRealizar.className = 'sub-row';
  trRealizar.innerHTML = `
    <td class="label">Pendientes de Realizar</td>
    <td class="count"><span class="auto-value" id="countRealizar">${realizar}</span></td>
    <td class="comment">TSH2000</td>
  `;
  table.appendChild(trRealizar);

  // Fila oculta para mensaje de validación
  const trValidation = document.createElement('tr');
  trValidation.innerHTML = `
    <td colspan="3" id="desgloseValidation" class="validation-alert" style="display:none;"></td>
  `;
  table.appendChild(trValidation);

  // Event listeners para recálculo en tiempo real
  const recalc = () => recalcularPendientesRealizar(totalActivos);
  document.getElementById('inputEliminar').addEventListener('input', recalc);
  document.getElementById('inputVelada').addEventListener('input', recalc);

  // Validar con valores cargados
  recalcularPendientesRealizar(totalActivos);
}


/**
 * Valida el estado de la sesión en Tririga
 */
async function checkSession() {
  try {
    const response = await fetch(SESSION_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const status = await response.text(); // La respuesta es texto plano: "active" o "expired"
    return status.trim().toLowerCase();
  } catch (err) {
    console.error("Error validando sesión:", err);
    return 'error';
  }
}

/**
 * Obtiene el perfil del usuario activo
 */
async function getUserProfile() {
  try {
    const response = await fetch("https://ptririgamx.wal-mart.com/latam/ui/navContext/properties");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.userProfile;
  } catch (err) {
    console.error("Error obteniendo perfil:", err);
    return null;
  }
}

/**
 * Muestra el estado de la sesión en la UI
 */
function displaySessionStatus(status, user = null) {
  const statusDiv = document.getElementById("sessionStatus");
  const startBtn = document.getElementById("startBtn");

  if (status === 'active' && user) {
    const initial = user.userFullName ? user.userFullName.charAt(0).toUpperCase() : '👤';
    statusDiv.innerHTML = `
      <div class="user-card fade-in">
        <div class="user-avatar">${initial}</div>
        <div class="user-details">
          <h4>¡Hola, ${user.userFullName || 'Usuario'}!</h4>
          <p class="user-email">${user.userEmail || ''}</p>
          <div class="user-badges">
            <span class="badge" title="Cuenta">🔑 ${user.userAccount}</span>
            <span class="badge" title="Usuario">👤 ${user.userName}</span>
          </div>
        </div>
      </div>
      <div class="session-alert success fade-in" style="margin-top: 15px;">
        ✅ Conexión establecida con Tririga
      </div>
    `;
    startBtn.style.display = "block";
    startBtn.disabled = false;
  } else if (status === 'active') {
    statusDiv.innerHTML = `
      <div class="session-alert success fade-in">
        ✅ Sesión activa - Listo para iniciar
      </div>
    `;
    startBtn.style.display = "block";
    startBtn.disabled = false;
  } else if (status === 'expired') {
    statusDiv.innerHTML = `
      <div class="session-alert error fade-in">
        ⚠️ Sesión expirada<br>
        <small style="display:block; margin-top:8px;">Inicia sesión en <a href="https://retaillink.login.wal-mart.com" target="_blank" style="color:var(--danger); font-weight:600;">Tririga</a> para continuar</small>
      </div>
    `;
    startBtn.style.display = "none";
    startBtn.disabled = true;
  } else {
    statusDiv.innerHTML = `
      <div class="session-alert info fade-in">
        ℹ️ No se pudo verificar la sesión<br>
        <small>Asegúrate de tener acceso a Tririga</small>
      </div>
    `;
    startBtn.style.display = "none";
    startBtn.disabled = true;
  }
}

/**
 * Muestra un indicador de carga
 */
function showLoading(message = "Cargando...") {
  const statusDiv = document.getElementById("sessionStatus");
  statusDiv.innerHTML = `
    <div class="loading-container fade-in">
      <div class="bouncing-dots">
        <div></div><div></div><div></div>
      </div>
      <p class="loading-text">${message}</p>
    </div>
  `;
}

/**
 * Obtiene el conteo de casos para un filtro específico (con reintentos automáticos)
 */
async function getCount(filterValue, retries = 3) {
  // Codificar el filtro automáticamente
  const encodedFilter = encodeURIComponent(filterValue);
  const url = baseUrl + encodedFilter + commonParams;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.result_total_size || 0;
    } catch (err) {
      console.warn(`Intento ${attempt} fallido para ${filterValue}:`, err);
      if (attempt === retries) {
        console.error("Error definitivo en:", filterValue, err);
        return "Error";
      }
      // Esperar 1.5 segundos antes de reintentar para dar tiempo al servidor
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
}

/**
 * Carga todos los casos y muestra los resultados
 */
async function loadAll() {
  const table = document.getElementById("results");
  const summaryDiv = document.getElementById("summary");
  table.innerHTML = "";
  
  const totalItems = statusConfig.length;
  let currentItem = 0;

  summaryDiv.innerHTML = `
    <div class="loading-container fade-in">
      <div class="bouncing-dots">
        <div></div><div></div><div></div>
      </div>
      <p class="loading-text" id="progressText">Cargando datos (0/${totalItems})...</p>
    </div>
  `;

  let results = [];
  let errorCount = 0;

  for (const item of statusConfig) {
    const count = await getCount(item.filter);
    
    currentItem++;
    const progressText = document.getElementById("progressText");
    if (progressText) {
      progressText.textContent = `Cargando datos (${currentItem}/${totalItems})...`;
    }

    if (count === "Error") errorCount++;
    results.push({ ...item, count });

    // Renderizar fila normal
    const tr = document.createElement('tr');
    const isActivo = item.label === 'Activo';
    if (isActivo) tr.className = 'activo-row';
    tr.innerHTML = `
      <td class="label">${item.label}${isActivo ? ' ▾' : ''}</td>
      <td class="count">${count === 'Error' ? '<span style="color:#d32f2f" title="Error de conexión">⚠️</span>' : count}</td>
      <td class="comment">${item.comment}</td>
    `;
    table.appendChild(tr);

    // Si es Activo, renderizar desglose expandido
    if (isActivo && typeof count === 'number') {
      await renderDesgloseActivo(table, count);
    }
  }

  // Mostrar alerta si hay errores
  if (errorCount > 0) {
    const alertRow = document.createElement("tr");
    alertRow.innerHTML = `
      <td colspan="3" style="text-align: center; color: #d32f2f; padding: 10px; font-weight: bold; font-size: 11px;">
        ⚠️ ${errorCount} estado(s) fallaron después de varios intentos.<br>Los totales podrían ser inexactos.
      </td>
    `;
    table.appendChild(alertRow);
  }

  // Calcular consolidado
  const getVal = (label) => {
    const r = results.find(x => x.label === label);
    return (typeof r?.count === 'number') ? r.count : 0;
  };

  const presupuestos = getVal('Reconocimiento') + getVal('Aceptado') + getVal('Fallo en la Verificación');
  const facturacion = getVal('Pendiente de Validación Final del Proveedor');
  const walmart =
    getVal('Revisión Pendiente del Supervisor') +
    getVal('Aprobación en Curso') +
    getVal('Validación de Tienda Pendiente') +
    getVal('PO/GR Fallido') +
    getVal('Cierre de SAP Pendiente') +
    getVal('SOW FALLÓ') +
    getVal('Validación Pendiente del Supervisor') +
    getVal('Disponibilidad de Presupuesto Pendiente') +
    getVal('Validación Fallida') +
    getVal('Revisión Costo Cambio Pendiente');

  const warningSymbol = errorCount > 0 ? ' <span title="Datos incompletos por error de conexión">⚠️</span>' : '';

  summaryDiv.innerHTML = `
    <h4>📊 Consolidado${warningSymbol}</h4>
    <table class="summary-table">
      <tr><td>Presupuestos:</td><td class="count">${presupuestos}</td></tr>
      <tr><td>Facturación:</td><td class="count">${facturacion}</td></tr>
      <tr><td>Walmart:</td><td class="count">${walmart}</td></tr>
    </table>
  `;
}

/**
 * Copia el dashboard como imagen al portapapeles
 */
async function copyToClipboard() {
  const content = document.getElementById('content');
  const copyBtn = document.getElementById('copyImage');

  try {
    copyBtn.disabled = true;
    copyBtn.textContent = '⏳ Copiando...';

    const canvas = await html2canvas(content, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });

    // Convertir canvas a blob
    canvas.toBlob(async (blob) => {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob
          })
        ]);

        // Feedback visual de éxito
        copyBtn.textContent = '✅ ¡Copiado!';
        copyBtn.style.background = '#2e7d32';

        setTimeout(() => {
          copyBtn.textContent = '📋 Copiar Imagen';
          copyBtn.style.background = '#388e3c';
          copyBtn.disabled = false;
        }, 2000);
      } catch (err) {
        console.error('Error al copiar:', err);
        copyBtn.textContent = '❌ Error al copiar';
        copyBtn.style.background = '#c62828';

        setTimeout(() => {
          copyBtn.textContent = '📋 Copiar Imagen';
          copyBtn.style.background = '#388e3c';
          copyBtn.disabled = false;
        }, 2000);
      }
    }, 'image/png');
  } catch (err) {
    console.error('Error generando imagen:', err);
    copyBtn.textContent = '❌ Error';
    copyBtn.disabled = false;
  }
}

/**
 * Guarda el dashboard como imagen
 */
async function saveAsImage() {
  const content = document.getElementById('content');
  const saveBtn = document.getElementById('saveImage');

  try {
    saveBtn.disabled = true;
    saveBtn.textContent = '⏳ Guardando...';

    const canvas = await html2canvas(content, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });

    const link = document.createElement('a');
    link.download = `reporte_walmart_${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    // Feedback visual de éxito
    saveBtn.textContent = '✅ ¡Guardado!';

    setTimeout(() => {
      saveBtn.textContent = '💾 Guardar como Imagen';
      saveBtn.disabled = false;
    }, 2000);
  } catch (err) {
    console.error('Error guardando imagen:', err);
    saveBtn.textContent = '❌ Error';
    setTimeout(() => {
      saveBtn.textContent = '💾 Guardar como Imagen';
      saveBtn.disabled = false;
    }, 2000);
  }
}

/**
 * Cambia entre vistas
 */
function showView(viewName) {
  document.getElementById('welcomeView').style.display = viewName === 'welcome' ? 'block' : 'none';
  document.getElementById('resultsView').style.display = viewName === 'results' ? 'block' : 'none';
}

/**
 * Inicia el dashboard
 */
async function startDashboard() {
  // Validar sesión nuevamente antes de iniciar
  showLoading("Validando sesión...");
  sessionStatus = await checkSession();

  if (sessionStatus !== 'active') {
    displaySessionStatus(sessionStatus);
    return;
  }

  // Cambiar a vista de resultados y cargar datos
  showView('results');
  await loadAll();
}

/**
 * Flujo principal de inicialización
 */
async function initializeApp() {
  showLoading("Verificando sesión...");
  sessionStatus = await checkSession();
  
  if (sessionStatus === 'active') {
    showLoading("Obteniendo datos de la cuenta...");
    const userProfile = await getUserProfile();
    displaySessionStatus(sessionStatus, userProfile);
  } else {
    displaySessionStatus(sessionStatus);
  }
}

/**
 * Vuelve a la vista de inicio
 */
async function backToWelcome() {
  showView('welcome');
  await initializeApp();
}

// Inicialización
document.addEventListener("DOMContentLoaded", async () => {
  // Validar sesión y cargar perfil
  await initializeApp();

  // Configurar event listeners
  document.getElementById("startBtn").addEventListener("click", startDashboard);
  document.getElementById("refresh").addEventListener("click", loadAll);
  document.getElementById("copyImage").addEventListener("click", copyToClipboard);
  document.getElementById("saveImage").addEventListener("click", saveAsImage);
  document.getElementById("backBtn").addEventListener("click", backToWelcome);
});