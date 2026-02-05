// Google Sheets Integration Module
let gapiLoaded = false;
let gisLoaded = false;
let tokenClient = null;
let accessToken = null;
// Spreadsheet ID único para ambas pestañas
const SPREADSHEET_ID = '1Co0MLqKOFWHfI0oViF3li6mRMRd1CgXfnJ8YQykUJmo';

let sheetConfig = {
    ambulatorio: SPREADSHEET_ID,
    urgencias: SPREADSHEET_ID
};

// Cargar configuración guardada
function loadSheetConfig() {
    const saved = localStorage.getItem('sheetConfig');
    if (saved) {
        sheetConfig = JSON.parse(saved);
        const sheetIdAmb = document.getElementById('sheet-id-amb');
        const sheetIdUrg = document.getElementById('sheet-id-urg');
        if (sheetIdAmb) sheetIdAmb.value = sheetConfig.ambulatorio || '';
        if (sheetIdUrg) sheetIdUrg.value = sheetConfig.urgencias || '';
    }
    
    const clientId = localStorage.getItem('googleClientId');
    const clientIdInput = document.getElementById('google-client-id');
    if (clientId && clientIdInput) {
        clientIdInput.value = clientId;
    }
    
    checkAuthStatus();
}

function saveSheetConfig() {
    sheetConfig.ambulatorio = document.getElementById('sheet-id-amb').value.trim();
    sheetConfig.urgencias = document.getElementById('sheet-id-urg').value.trim();
    localStorage.setItem('sheetConfig', JSON.stringify(sheetConfig));
    
    const clientId = document.getElementById('google-client-id').value.trim();
    if (clientId) {
        localStorage.setItem('googleClientId', clientId);
        // Reinicializar autenticación con nuevo Client ID
        if (gapiLoaded && gisLoaded) {
            initializeGoogleAuth();
        }
    }
    
    notify("Configuración guardada", "Los IDs de las hojas se han guardado correctamente", "success");
    closeSettings();
}

function openSettings() {
    loadSheetConfig();
    document.getElementById('settings-modal').classList.remove('hidden');
    lucide.createIcons();
}

function closeSettings() {
    document.getElementById('settings-modal').classList.add('hidden');
}

// Inicializar Google APIs
function gapiLoadedCallback() {
    gapiLoaded = true;
    maybeEnableButtons();
}

function gisLoadedCallback() {
    gisLoaded = true;
    // Una vez que GSI está listo, cargar la API de Google
    if (typeof gapi !== 'undefined') {
        gapi.load('client', () => {
            gapiLoaded = true;
            maybeEnableButtons();
        });
    } else {
        // Esperar a que gapi esté disponible
        setTimeout(() => {
            if (typeof gapi !== 'undefined') {
                gapi.load('client', () => {
                    gapiLoaded = true;
                    maybeEnableButtons();
                });
            }
        }, 100);
    }
    maybeEnableButtons();
    // También ejecutar autenticación automática cuando GSI se carga
    setTimeout(() => {
        if (tokenClient || (typeof google !== 'undefined' && typeof google.accounts !== 'undefined')) {
            autoAuthenticateIfNeeded();
        }
    }, 1500);
}

function maybeEnableButtons() {
    if (gapiLoaded && gisLoaded) {
        initializeGoogleAuth();
        // Después de inicializar, verificar autenticación y pedirla automáticamente si es necesario
        setTimeout(() => {
            autoAuthenticateIfNeeded();
        }, 1000);
    }
}

// Función para autenticar automáticamente al iniciar la aplicación
async function autoAuthenticateIfNeeded() {
    const savedToken = sessionStorage.getItem('googleAccessToken');
    
    // Si no hay token, autenticar automáticamente
    if (!savedToken || savedToken === '') {
        console.log('🔐 No hay token de autenticación. Solicitando acceso a Google...');
        if (typeof notify === 'function') {
            notify("Autenticación requerida", "Iniciando sesión con Google...", "indigo");
        }
        
        // Esperar un momento para que todo esté listo
        setTimeout(async () => {
            try {
                await ensureAuthenticated();
            } catch (error) {
                console.error('Error en autenticación automática:', error);
            }
        }, 500);
    } else {
        // Verificar si el token es válido
        accessToken = savedToken;
        try {
            const testResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?access_token=${accessToken}`);
            if (!testResponse.ok && testResponse.status === 401) {
                // Token expirado, autenticar de nuevo
                console.log('🔐 Token expirado. Solicitando reautenticación...');
                accessToken = null;
                sessionStorage.removeItem('googleAccessToken');
                if (typeof notify === 'function') {
                    notify("Sesión expirada", "Por favor, inicia sesión nuevamente", "indigo");
                }
                setTimeout(async () => {
                    try {
                        await ensureAuthenticated();
                    } catch (error) {
                        console.error('Error en reautenticación automática:', error);
                    }
                }, 500);
            } else {
                console.log('✅ Token válido, ya estás autenticado');
                if (typeof notify === 'function') {
                    notify("Conectado", "Sesión activa con Google Sheets", "success");
                }
            }
        } catch (error) {
            console.log('Error verificando token:', error);
            // Si hay error de red, asumir que el token puede ser válido y continuar
        }
    }
}

function initializeGoogleAuth() {
    // Google OAuth no funciona abriendo el archivo directo (file://). Debe usarse un servidor local o un dominio.
    if (window.location.protocol === 'file:') {
        console.warn('⚠️ La app está abierta desde file://. Google no permite OAuth desde file://. Abre la app desde http://localhost (ej: npx serve .) y añade ese origen en Google Cloud Console.');
        if (typeof notify === 'function') {
            notify("Google no permite inicio de sesión desde archivo local", "Abre la app desde http://localhost (ver OAUTH_CONFIG.md)", "indigo");
        }
        return;
    }

    // Verificar que Google APIs estén disponibles
    if (typeof google === 'undefined' || typeof google.accounts === 'undefined' || typeof google.accounts.oauth2 === 'undefined') {
        console.log('⚠️ Google APIs aún no están disponibles, esperando...');
        setTimeout(() => {
            if (typeof google !== 'undefined' && typeof google.accounts !== 'undefined') {
                initializeGoogleAuth();
            }
        }, 500);
        return;
    }
    
    // Cargar Client ID desde configuración o usar el Client ID por defecto
    const clientId = localStorage.getItem('googleClientId') || '531214369219-eau6v1nu09vrck0hs5rfte5jpd8q7l8f.apps.googleusercontent.com';
    
    // Obtener el origen actual (protocolo + host + puerto si existe)
    const currentOrigin = window.location.origin;
    // Para desarrollo local, usar http://localhost, para producción usar el dominio real
    const redirectUri = currentOrigin.includes('localhost') || currentOrigin.includes('127.0.0.1') 
        ? 'http://localhost' 
        : currentOrigin;
    
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
        callback: (response) => {
            console.log('Callback de autenticación:', response);
            if (response.error) {
                console.error('Error de autenticación:', response.error);
                if (typeof notify === 'function') {
                    notify("Error de autenticación", response.error + (response.error_description ? ': ' + response.error_description : ''), "indigo");
                }
                // Rechazar promesa pendiente si existe
                if (window._authPromiseResolve) {
                    window._authPromiseResolve(false);
                    window._authPromiseResolve = null;
                }
                return;
            }
            if (response.access_token) {
                accessToken = response.access_token;
                sessionStorage.setItem('googleAccessToken', accessToken);
                checkAuthStatus();
                console.log('✅ Autenticación exitosa, token guardado');
                if (typeof notify === 'function') {
                    notify("Autenticación exitosa", "Conectado a Google Sheets", "success");
                }
                // Resolver promesa pendiente si existe
                if (window._authPromiseResolve) {
                    window._authPromiseResolve(true);
                    window._authPromiseResolve = null;
                }
            } else {
                console.error('No se recibió access_token en la respuesta');
                if (window._authPromiseResolve) {
                    window._authPromiseResolve(false);
                    window._authPromiseResolve = null;
                }
            }
        },
    });
    checkAuthStatus();
}

function authenticateGoogle() {
    if (!tokenClient) {
        // Intentar inicializar si aún no está inicializado
        if (gapiLoaded && gisLoaded) {
            initializeGoogleAuth();
        } else {
            notify("Error", "Las APIs de Google no están cargadas. Recarga la página.", "indigo");
            return;
        }
    }
    tokenClient.requestAccessToken({ prompt: 'consent' });
}

// Función para asegurar autenticación automática
async function ensureAuthenticated() {
    // Verificar si ya hay un token guardado
    const savedToken = sessionStorage.getItem('googleAccessToken');
    if (savedToken && savedToken !== '') {
        accessToken = savedToken;
        // Verificar si el token sigue siendo válido haciendo una petición simple
        try {
            const testResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?access_token=${accessToken}`);
            if (testResponse.ok) {
                return true; // Token válido
            } else if (testResponse.status === 401) {
                // Token expirado, limpiar y autenticar de nuevo
                accessToken = null;
                sessionStorage.removeItem('googleAccessToken');
            }
        } catch (error) {
            console.log('Error verificando token:', error);
        }
    }
    
    // Si no hay token o está expirado, autenticar automáticamente
    if (!accessToken) {
        return new Promise((resolve) => {
            // Verificar si las APIs están disponibles
            const checkAPIs = () => {
                // Solo necesitamos GSI (Google Sign-In) para OAuth, no necesitamos gapi.load completo
                if (typeof google !== 'undefined' && typeof google.accounts !== 'undefined' && typeof google.accounts.oauth2 !== 'undefined') {
                    gisLoaded = true;
                    if (!tokenClient) {
                        initializeGoogleAuth();
                    }
                    // Esperar un momento para que tokenClient se inicialice
                    setTimeout(() => {
                        if (tokenClient) {
                            // Guardar la función resolve para que el callback la use
                            window._authPromiseResolve = resolve;
                            tokenClient.requestAccessToken({ prompt: 'consent' });
                        } else {
                            console.error('No se pudo inicializar tokenClient');
                            resolve(false);
                        }
                    }, 500);
                    return true;
                }
                return false;
            };
            
            // Intentar inmediatamente
            if (checkAPIs()) {
                return;
            }
            
            // Si no están listas, esperar
            console.log('Esperando a que las APIs de Google se carguen...');
            let attempts = 0;
            const maxAttempts = 50; // 5 segundos máximo (50 * 100ms)
            
            const checkInterval = setInterval(() => {
                attempts++;
                if (checkAPIs()) {
                    clearInterval(checkInterval);
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    console.error('Timeout esperando APIs de Google');
                    if (window._authPromiseResolve === resolve) {
                        window._authPromiseResolve = null;
                    }
                    resolve(false);
                }
            }, 100);
        });
    }
    
    return true;
}

function checkAuthStatus() {
    const savedToken = sessionStorage.getItem('googleAccessToken');
    const statusEl = document.getElementById('auth-status');
    
    if (savedToken && savedToken !== '') {
        accessToken = savedToken;
        if (statusEl) {
            statusEl.textContent = 'Autenticado';
            statusEl.className = 'text-emerald-600 font-bold';
        }
    } else {
        accessToken = null;
        if (statusEl) {
            statusEl.textContent = 'No autenticado';
            statusEl.className = 'text-amber-600';
        }
    }
}

// Obtener Spreadsheet ID (único para ambas pestañas)
function getSheetId(template) {
    return SPREADSHEET_ID;
}

// Obtener nombre de la pestaña según template
function getSheetName(template) {
    return template === 'Ambulatorio' ? 'Ambulatorio' : 'Urgencias';
}

// Función helper para hacer fetch con timeout y reintentos
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
    const timeout = 30000; // 30 segundos de timeout
    let currentUrl = url; // Variable para actualizar la URL si el token cambia
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Crear un AbortController para el timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            // Agregar signal al options (si no hay uno existente)
            const existingSignal = options.signal;
            const fetchOptions = {
                ...options,
                signal: existingSignal || controller.signal
            };
            
            const response = await fetch(currentUrl, fetchOptions);
            clearTimeout(timeoutId);
            
            // Si el token expiró (401), intentar reautenticar
            if (response.status === 401 && attempt < maxRetries) {
                console.log(`Token expirado, intentando reautenticar (intento ${attempt}/${maxRetries})...`);
                accessToken = null;
                sessionStorage.removeItem('googleAccessToken');
                
                // Intentar reautenticar
                const reauthSuccess = await ensureAuthenticated();
                if (reauthSuccess && accessToken) {
                    // Actualizar el token en la URL
                    if (currentUrl.includes('access_token=')) {
                        currentUrl = currentUrl.replace(/access_token=[^&]+/, `access_token=${accessToken}`);
                        // Continuar con el siguiente intento usando el nuevo token
                        continue;
                    }
                } else {
                    throw new Error('No se pudo reautenticar. Por favor, autentícate manualmente.');
                }
            }
            
            return response;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log(`Timeout en intento ${attempt}/${maxRetries}`);
            } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                console.log(`Error de red en intento ${attempt}/${maxRetries}:`, error.message);
            } else {
                // Si no es timeout o error de red, y no es 401, lanzar inmediatamente
                throw error;
            }
            
            // Si es el último intento, lanzar el error
            if (attempt === maxRetries) {
                throw new Error(`Error después de ${maxRetries} intentos: ${error.message || 'Error desconocido'}`);
            }
            
            // Esperar antes del siguiente intento (backoff exponencial: 1s, 2s, 4s)
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
            console.log(`Esperando ${delay}ms antes del siguiente intento...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Validar token antes de operaciones
async function validateToken() {
    if (!accessToken) {
        const authenticated = await ensureAuthenticated();
        if (!authenticated || !accessToken) {
            throw new Error('No estás autenticado con Google');
        }
    }
    
    // Verificar que el token sigue siendo válido (test rápido)
    try {
        const testUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=properties&access_token=${accessToken}`;
        
        // Usar AbortController para timeout en navegadores que no soporten AbortSignal.timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos para validación rápida
        
        const testResponse = await fetch(testUrl, { 
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (testResponse.status === 401) {
            // Token expirado
            accessToken = null;
            sessionStorage.removeItem('googleAccessToken');
            const reauthSuccess = await ensureAuthenticated();
            if (!reauthSuccess || !accessToken) {
                throw new Error('Token expirado y no se pudo reautenticar');
            }
        } else if (!testResponse.ok && testResponse.status !== 404) {
            // Otro error, pero puede ser un problema temporal
            console.log('Advertencia: token podría tener problemas:', testResponse.status);
        }
    } catch (error) {
        // Si falla la validación pero tenemos token, intentar reautenticar
        if (error.name === 'AbortError' || error.message.includes('Failed to fetch')) {
            console.log('Timeout o error de red validando token, continuando con token actual...');
        } else if (accessToken && error.message.includes('401')) {
            // Solo intentar reautenticar si tenemos un token y fue error 401
            accessToken = null;
            sessionStorage.removeItem('googleAccessToken');
            const reauthSuccess = await ensureAuthenticated();
            if (!reauthSuccess || !accessToken) {
                throw new Error('No se pudo validar ni reautenticar');
            }
        }
    }
}

// Leer datos de Google Sheets
async function readFromGoogleSheets(template) {
    const sheetId = getSheetId(template);
    const sheetName = getSheetName(template);
    
    // Validar y refrescar token si es necesario
    await validateToken();

    try {
        // Usar formato SheetName!A1:Z para especificar la pestaña
        const range = `${sheetName}!A1:Z10000`;
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?access_token=${accessToken}`;
        
        const response = await fetchWithRetry(url);
        
        if (!response.ok) {
            if (response.status === 401) {
                accessToken = null;
                sessionStorage.removeItem('googleAccessToken');
                throw new Error('Sesión expirada. Por favor, autentícate nuevamente.');
            }
            const errorText = await response.text();
            throw new Error(`Error al leer datos: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        const data = await response.json();
        return parseSheetData(data.values || []);
    } catch (error) {
        console.error('Error leyendo Google Sheets:', error);
        throw error;
    }
}

// Escribir datos a Google Sheets
async function writeToGoogleSheets(template, data) {
    const sheetId = getSheetId(template);
    const sheetName = getSheetName(template);
    
    // Validar y refrescar token si es necesario
    await validateToken();

    // Preparar datos para escribir
    const values = [['Factura', 'Valor', 'Fecha', 'Vencimiento', 'Entidad', 'Facturador', 'Estado Emp', 'Fecha Emp', 'Estado Rad', 'Fecha Rad', 'Estado Radicación', 'Fecha Radicación', 'Observación', 'Año', 'Mes']];
    
    data.forEach(item => {
        values.push([
            item.factura || '',
            item.valor || 0,
            item.fecha || '',
            item.vencimiento || '',
            item.entidad || '',
            item.facturador || '',
            item.estadoEmp || '',
            item.fechaEmp || '',
            item.estadoRad || '',
            item.fechaRad || '',
            item.estadoRadicacion || 'Pendiente',
            item.fechaRadicacion || '',
            item.obs || '',
            item.year || currentYear,
            item.mes !== undefined ? item.mes : currentMonth
        ]);
    });

    try {
        // Usar formato SheetName!A1:Z para especificar la pestaña
        const range = `${sheetName}!A1:Z10000`;
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW&access_token=${accessToken}`;
        
        const response = await fetchWithRetry(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                values: values
            })
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                accessToken = null;
                sessionStorage.removeItem('googleAccessToken');
                throw new Error('Sesión expirada. Por favor, autentícate nuevamente.');
            }
            const errorText = await response.text();
            throw new Error(`Error al escribir datos: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error escribiendo a Google Sheets:', error);
        throw error;
    }
}

// Crear backup diario
async function createDailyBackup(template) {
    const sheetId = getSheetId(template);
    const sheetName = getSheetName(template);
    
    // Validar y refrescar token si es necesario
    try {
        await validateToken();
    } catch (error) {
        console.error('Error validando token para backup:', error);
        return;
    }
    
    if (!sheetId || !accessToken) return;

    try {
        const today = new Date().toISOString().split('T')[0];
        const backupSheetName = `Backup_${sheetName}_${today}`;
        
        // Leer datos actuales desde la pestaña correspondiente
        const data = await readFromGoogleSheets(template);
        
        // Crear nueva hoja de backup en el mismo spreadsheet
        const createSheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate?access_token=${accessToken}`;
        const createSheetResponse = await fetchWithRetry(createSheetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requests: [{
                    addSheet: {
                        properties: {
                            title: backupSheetName
                        }
                    }
                }]
            })
        });

        if (createSheetResponse.ok) {
            // Escribir datos en la hoja de backup usando formato SheetName!A1:Z
            const values = [['Factura', 'Valor', 'Fecha', 'Vencimiento', 'Entidad', 'Facturador', 'Estado Emp', 'Fecha Emp', 'Estado Rad', 'Fecha Rad', 'Estado Radicación', 'Fecha Radicación', 'Observación', 'Año', 'Mes']];
            data.forEach(item => {
                values.push([
                    item.factura || '',
                    item.valor || 0,
                    item.fecha || '',
                    item.vencimiento || '',
                    item.entidad || '',
                    item.facturador || '',
                    item.estadoEmp || '',
                    item.fechaEmp || '',
                    item.estadoRad || '',
                    item.fechaRad || '',
                    item.estadoRadicacion || 'Pendiente',
                    item.fechaRadicacion || '',
                    item.obs || '',
                    item.year || currentYear,
                    item.mes !== undefined ? item.mes : currentMonth
                ]);
            });

            const backupRange = `${backupSheetName}!A1:Z10000`;
            const backupUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(backupRange)}?valueInputOption=RAW&access_token=${accessToken}`;
            await fetchWithRetry(backupUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ values: values })
            });
        }
    } catch (error) {
        console.error('Error creando backup:', error);
    }
}

// Parsear datos de Google Sheets a formato interno
function parseSheetData(rows) {
    if (!rows || rows.length < 2) return [];
    
    const headers = rows[0];
    const data = [];
    
    // Orden de columnas: Factura, Valor, Fecha, Vencimiento, Entidad, Facturador, Estado Emp, Fecha Emp, Estado Rad, Fecha Rad, Estado Radicación, Fecha Radicación, Observación, Año, Mes
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row[0]) continue; // Saltar filas vacías
        
        // Parsear mes correctamente (puede venir como número o string)
        let mesValue = currentMonth;
        if (row[14] !== undefined && row[14] !== null && row[14] !== '') {
            mesValue = parseInt(row[14]);
            if (isNaN(mesValue)) mesValue = currentMonth;
        }
        
        // Parsear año correctamente
        let yearValue = currentYear;
        if (row[13] !== undefined && row[13] !== null && row[13] !== '') {
            yearValue = String(row[13]);
        }
        
        data.push({
            factura: String(row[0] || ''),
            valor: parseFloat(row[1] || 0),
            fecha: row[2] || '',
            vencimiento: row[3] || '',
            entidad: row[4] || '',
            facturador: row[5] || '',
            estadoEmp: row[6] || 'PENDIENTE',
            fechaEmp: row[7] || '',
            estadoRad: row[8] || 'PENDIENTE',
            fechaRad: row[9] || '',
            estadoRadicacion: row[10] || 'Pendiente', // Nueva columna
            fechaRadicacion: row[11] || '', // Nueva columna
            obs: row[12] || '',
            year: yearValue,
            mes: mesValue,
            template: currentTemplate
        });
    }
    
    console.log(`✅ Parseados ${data.length} registros desde Google Sheets`);
    return data;
}

// Sincronizar IndexedDB con Google Sheets (descargar desde Google)
async function syncWithGoogleSheets() {
    const syncBtn = document.getElementById('sync-btn');
    if (!syncBtn) return;
    
    const originalText = syncBtn.innerHTML;
    syncBtn.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Sincronizando...';
    syncBtn.disabled = true;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    try {
        if (!accessToken) {
            throw new Error('Por favor, autentícate con Google primero');
        }

        // Leer datos de Google Sheets
        const sheetData = await readFromGoogleSheets(currentTemplate);
        
        // Obtener todos los registros actuales del template desde IndexedDB
        const txRead = db.transaction("facturas", "readonly");
        const storeRead = txRead.objectStore("facturas");
        const indexRead = storeRead.index("template");
        const requestRead = indexRead.getAll(currentTemplate);
        
        const existingLocalData = await new Promise((resolve, reject) => {
            requestRead.onsuccess = (e) => resolve(e.target.result);
            requestRead.onerror = () => reject(requestRead.error);
        });
        
        // Crear un Set con las facturas que existen en Google Sheets
        const facturasEnGoogle = new Set(sheetData.map(item => String(item.factura || '')));
        
        // Crear un Set con todas las facturas locales
        const facturasLocales = new Set(existingLocalData.map(item => String(item.factura || '')));
        
        // Identificar facturas que están en local pero no en Google Sheets (deben eliminarse)
        const facturasAEliminar = [];
        facturasLocales.forEach(factura => {
            if (!facturasEnGoogle.has(factura)) {
                facturasAEliminar.push(factura);
            }
        });
        
        // Actualizar IndexedDB: eliminar los que no están en Google Sheets y actualizar/insertar los que sí están
        const tx = db.transaction("facturas", "readwrite");
        const store = tx.objectStore("facturas");
        
        // Eliminar registros que no están en Google Sheets
        for (const factura of facturasAEliminar) {
            await new Promise((resolve, reject) => {
                const request = store.delete([currentTemplate, factura]);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }
        
        // Actualizar/insertar registros que sí están en Google Sheets
        for (const item of sheetData) {
            item.template = currentTemplate;
            await new Promise((resolve, reject) => {
                const request = store.put(item);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }
        
        await new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
        
        let mensaje = `Se sincronizaron ${sheetData.length} registros desde Google Sheets`;
        if (facturasAEliminar.length > 0) {
            mensaje += ` y se eliminaron ${facturasAEliminar.length} registros que no existen en Google Sheets`;
        }
        notify("Sincronización exitosa", mensaje, "success");
        if (typeof refreshUI === 'function') refreshUI();
        
    } catch (error) {
        console.error('Error en sincronización:', error);
        notify("Error de sincronización", error.message, "indigo");
    } finally {
        syncBtn.innerHTML = originalText;
        syncBtn.disabled = false;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

// Subir datos de IndexedDB a Google Sheets
async function uploadToGoogleSheets() {
    try {
        if (!accessToken) {
            return; // Silenciosamente fallar si no hay autenticación
        }

        const sheetId = getSheetId(currentTemplate);
        if (!sheetId) {
            return; // Silenciosamente fallar si no hay hoja configurada
        }

        // Leer todos los datos del template actual desde IndexedDB
        const tx = db.transaction("facturas", "readonly");
        const store = tx.objectStore("facturas");
        const index = store.index("template");
        const request = index.getAll(currentTemplate);
        
        const allData = await new Promise((resolve, reject) => {
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = () => reject(request.error);
        });
        
        if (allData.length === 0) {
            return; // No hay datos para subir
        }
        
        // Escribir a Google Sheets
        await writeToGoogleSheets(currentTemplate, allData);
        console.log(`✅ Datos subidos a Google Sheets: ${allData.length} registros de ${currentTemplate}`);
        
    } catch (error) {
        console.error('Error subiendo datos a Google Sheets:', error);
        // No mostrar notificación para errores silenciosos en segundo plano
    }
}

// Verificar y ejecutar backup diario
function checkAndRunDailyBackup() {
    const lastBackup = localStorage.getItem(`lastBackup_${currentTemplate}`);
    const today = new Date().toDateString();
    
    if (lastBackup !== today) {
        createDailyBackup(currentTemplate).then(() => {
            localStorage.setItem(`lastBackup_${currentTemplate}`, today);
            console.log(`Backup diario creado para ${currentTemplate}`);
        }).catch(err => {
            console.error('Error en backup automático:', err);
        });
    }
}

// Ejecutar backup cada 24 horas
setInterval(() => {
    if (accessToken) {
        checkAndRunDailyBackup();
    }
}, 24 * 60 * 60 * 1000); // 24 horas

// Verificar backup al cargar
window.addEventListener('load', () => {
    setTimeout(() => {
        if (accessToken) {
            checkAndRunDailyBackup();
        }
    }, 5000); // Esperar 5 segundos después de cargar
    
    // Intentar autenticación automática cuando la página carga completamente
    // Esto asegura que se ejecute incluso si las APIs ya estaban cargadas
    setTimeout(() => {
        if (typeof autoAuthenticateIfNeeded === 'function') {
            // Verificar si las APIs están disponibles
            if (typeof google !== 'undefined' && typeof google.accounts !== 'undefined') {
                if (!tokenClient) {
                    // Si no hay tokenClient, inicializar primero
                    if (gisLoaded || (typeof gapi !== 'undefined')) {
                        initializeGoogleAuth();
                    }
                }
                // Ejecutar autenticación automática
                autoAuthenticateIfNeeded();
            }
        }
    }, 2000); // Esperar 2 segundos para que todo esté listo
});

// Inicializar cuando las APIs estén listas
window.gapiLoadedCallback = gapiLoadedCallback;
window.gisLoadedCallback = gisLoadedCallback;

// Cargar configuración al iniciar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSheetConfig);
} else {
    loadSheetConfig();
}

