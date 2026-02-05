let db, currentTemplate = 'Ambulatorio', currentMonth = new Date().getMonth(), currentYear = new Date().getFullYear().toString();
let activeFilters = {}, currentFilterCol = "", currentPage = 1;
let dataParaExportar = [];

const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// Función para calcular la fecha de Pascua (algoritmo de Gauss)
function calcularPascua(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mes = Math.floor((h + l - 7 * m + 114) / 31) - 1;
    const dia = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, mes, dia);
}

// Obtener días festivos de Colombia para un año
function getFestivosColombia(year) {
    const festivos = new Set();
    const y = parseInt(year);
    
    // Festivos fijos
    festivos.add(`${y}-01-01`); // Año Nuevo
    festivos.add(`${y}-05-01`); // Día del Trabajo
    festivos.add(`${y}-07-20`); // Día de la Independencia
    festivos.add(`${y}-08-07`); // Batalla de Boyacá
    festivos.add(`${y}-12-08`); // Inmaculada Concepción
    festivos.add(`${y}-12-25`); // Navidad
    
    // Festivos basados en Pascua
    const pascua = calcularPascua(y);
    
    // Jueves Santo (2 días antes de Pascua)
    const juevesSanto = new Date(pascua);
    juevesSanto.setDate(pascua.getDate() - 3);
    festivos.add(fechaLocalStr(juevesSanto));
    
    // Viernes Santo (1 día antes de Pascua)
    const viernesSanto = new Date(pascua);
    viernesSanto.setDate(pascua.getDate() - 2);
    festivos.add(fechaLocalStr(viernesSanto));
    
    // Ascensión (40 días después de Pascua)
    const ascension = new Date(pascua);
    ascension.setDate(pascua.getDate() + 40);
    festivos.add(fechaLocalStr(ascension));
    
    // Corpus Christi (60 días después de Pascua)
    const corpusChristi = new Date(pascua);
    corpusChristi.setDate(pascua.getDate() + 60);
    festivos.add(fechaLocalStr(corpusChristi));
    
    // Sagrado Corazón (68 días después de Pascua)
    const sagradoCorazon = new Date(pascua);
    sagradoCorazon.setDate(pascua.getDate() + 68);
    festivos.add(fechaLocalStr(sagradoCorazon));
    
    // Festivos que se mueven al lunes siguiente si caen en domingo
    const festivosMovibles = [
        { mes: 0, dia: 6 },   // Reyes Magos (6 enero)
        { mes: 2, dia: 19 },  // San José (19 marzo)
        { mes: 5, dia: 29 },  // San Pedro y San Pablo (29 junio)
        { mes: 7, dia: 15 },  // Asunción (15 agosto)
        { mes: 9, dia: 12 },  // Día de la Raza (12 octubre)
        { mes: 10, dia: 1 },  // Todos los Santos (1 noviembre)
        { mes: 10, dia: 11 }  // Independencia de Cartagena (11 noviembre)
    ];
    
    festivosMovibles.forEach(f => {
        const fecha = new Date(y, f.mes, f.dia);
        // Si cae en domingo (0), mover al lunes siguiente
        if (fecha.getDay() === 0) {
            fecha.setDate(fecha.getDate() + 1);
        }
        festivos.add(fechaLocalStr(fecha));
    });
    
    return festivos;
}

// Fecha en formato YYYY-MM-DD usando componentes locales (evita desfase por zona horaria)
function fechaLocalStr(fecha) {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

// Verificar si una fecha es día hábil (NO es sábado, domingo ni festivo de Colombia)
function esDiaHabil(fecha) {
    const diaSemana = fecha.getDay();
    if (diaSemana === 0 || diaSemana === 6) return false; // sábado y domingo no se trabajan
    
    const fechaStr = fechaLocalStr(fecha);
    const year = fecha.getFullYear();
    const festivos = getFestivosColombia(year);
    if (festivos.has(fechaStr)) return false;
    
    const festivosAnterior = getFestivosColombia(year - 1);
    const festivosSiguiente = getFestivosColombia(year + 1);
    return !festivosAnterior.has(fechaStr) && !festivosSiguiente.has(fechaStr);
}

// Inicializar select de años dinámicamente
function initYearFilter() {
    const yearSelect = document.getElementById('yearFilter');
    const currentYearNum = new Date().getFullYear();
    const startYear = 2023; // Año inicial desde 2023
    const yearsToShow = 5; // Mostrar 5 años hacia adelante desde el año actual
    
    yearSelect.innerHTML = '';
    
    // Agregar años desde 2023 hasta el año actual + años futuros
    for (let year = startYear; year <= currentYearNum + yearsToShow; year++) {
        const option = document.createElement('option');
        option.value = year.toString();
        option.textContent = year.toString();
        if (year === currentYearNum) option.selected = true;
        yearSelect.appendChild(option);
    }
    
    currentYear = currentYearNum.toString();
}

const reqDB = indexedDB.open("Sinfonia_2026_DB", 2);
reqDB.onupgradeneeded = e => {
    const db = e.target.result;
    const oldVersion = e.oldVersion;
    
    if (oldVersion < 2 && db.objectStoreNames.contains("facturas")) {
        // Eliminar store antiguo (los datos antiguos se perderán, pero ahora cada template será independiente)
        db.deleteObjectStore("facturas");
    }
    
    // Crear nuevo store con clave compuesta [template, factura]
    if (!db.objectStoreNames.contains("facturas")) {
        const store = db.createObjectStore("facturas", { keyPath: ["template", "factura"] });
        store.createIndex("template", "template", { unique: false });
        store.createIndex("factura", "factura", { unique: false });
    }
};
reqDB.onsuccess = e => { 
    db = e.target.result; 
    initYearFilter(); // Inicializar select de años dinámicamente
    initFilters(); // Inicializar filtros
    
    // Función simple para inicializar iconos de Lucide
    window.initLucideIcons = function() {
        if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
            lucide.createIcons();
        }
    };
    
    // Función para inicializar todo cuando el DOM esté listo
    const initializePage = () => {
        const currentFile = window.location.pathname.split('/').pop() || 'index.html';
        if (currentFile === 'index.html' || currentFile === '' || currentFile === '/') {
            initRouter();
        } else {
            if (currentFile === 'ambulatorio.html') {
                switchTemplate('Ambulatorio');
            } else if (currentFile === 'urgencias.html') {
                switchTemplate('Urgencias');
            }
        }
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePage);
    } else {
        initializePage();
    }
    
    // Inicializar iconos cuando todo esté cargado
    window.addEventListener('load', () => {
        setTimeout(() => window.initLucideIcons(), 100);
    });
    
    // Sincronización automática en tiempo real cada 15 segundos (más frecuente)
    // Solo sincronizar si estamos en una página de tablas (no en index.html)
    const currentFile = window.location.pathname.split('/').pop() || 'index.html';
    if (currentFile !== 'index.html' && currentFile !== '' && currentFile !== '/') {
        // Esperar a que el template se inicialice antes de sincronizar
        setTimeout(() => {
            if (currentTemplate) {
                syncWithGoogleSheetsAuto();
            }
        }, 2000);
        
        // Sincronizar cada 15 segundos (más tiempo real)
        const syncInterval = setInterval(() => {
            // Solo sincronizar si estamos en una página de tablas
            const checkFile = window.location.pathname.split('/').pop() || 'index.html';
            if (checkFile !== 'index.html' && checkFile !== '' && checkFile !== '/' && currentTemplate) {
                syncWithGoogleSheetsAuto();
            } else {
                // Si ya no estamos en una página de tablas, limpiar el intervalo
                clearInterval(syncInterval);
            }
        }, 15000); // 15 segundos para sincronización más frecuente
        
        // Sincronizar cuando la ventana recupera el foco (usuario vuelve a la pestaña)
        window.addEventListener('focus', () => {
            setTimeout(() => {
                if (currentTemplate) {
                    syncWithGoogleSheetsAuto();
                }
            }, 500);
        });
        
        // Sincronizar cuando la página se vuelve visible (usuario cambia de pestaña y vuelve)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && currentTemplate) {
                setTimeout(() => syncWithGoogleSheetsAuto(), 500);
            }
        });
    }
};

function notify(title, msg, type = 'success') {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast border-l-4 ${type === 'success' ? 'border-emerald-500' : 'border-indigo-500'}`;
    t.innerHTML = `<div><p class="text-xs font-bold text-slate-900">${title}</p><p class="text-[10px] text-slate-500">${msg}</p></div>`;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// --- FILTROS ---
function initFilters() {
    const filterInput = document.getElementById('filterSearchInput');
    if (filterInput) {
        filterInput.addEventListener('input', (e) => {
            const uniqueValues = [...new Set((window.fullMonthData || []).map(item => String(item[currentFilterCol] || 'N/A')))].sort();
            renderFilterList(uniqueValues, e.target.value.toLowerCase());
        });
    }
}

function openFilter(event, col) {
    event.stopPropagation();
    const menu = document.getElementById('filter-menu-container');
    currentFilterCol = col;
    document.getElementById('filterSearchInput').value = "";
    
    // Manejar campos calculados o especiales
    let uniqueValues = [];
    if (col === 'diasRest') {
        // Calcular días restantes para cada factura
        uniqueValues = [...new Set((window.fullMonthData || []).map(item => {
            const rest = calcRemaining(item.vencimiento);
            return rest <= 0 ? 'VENCIDA' : rest + ' DH';
        }))].sort((a, b) => {
            // Ordenar: VENCIDA primero, luego numéricamente
            if (a === 'VENCIDA') return -1;
            if (b === 'VENCIDA') return 1;
            const numA = parseInt(a.replace(' DH', ''));
            const numB = parseInt(b.replace(' DH', ''));
            return numA - numB;
        });
    } else {
        uniqueValues = [...new Set((window.fullMonthData || []).map(item => {
            const value = item[col];
            if (value === null || value === undefined || value === '') return 'N/A';
            return String(value);
        }))].sort();
    }
    
    renderFilterList(uniqueValues);
    menu.style.display = 'flex';
    const rect = event.target.getBoundingClientRect();
    let left = rect.left - 180;
    menu.style.left = Math.max(10, left) + 'px';
    menu.style.top = (rect.bottom + 8) + 'px';
    const closeH = (e) => { if(!menu.contains(e.target)) { closeFilterMenu(); document.removeEventListener('click', closeH); } };
    setTimeout(() => document.addEventListener('click', closeH), 10);
}

function renderFilterList(values, searchTerm = "") {
    const list = document.getElementById('filterList');
    list.innerHTML = "";
    values.filter(v => v.toLowerCase().includes(searchTerm)).forEach(val => {
        const isChecked = activeFilters[currentFilterCol]?.includes(val);
        const item = document.createElement('div');
        item.className = 'filter-item';
        item.innerHTML = `<input type="checkbox" ${isChecked ? 'checked' : ''}> <span class="truncate">${val}</span>`;
        item.onclick = (e) => { e.stopPropagation(); updateFilter(val, !isChecked); };
        list.appendChild(item);
    });
}

function updateFilter(val, isChecked) {
    if(!activeFilters[currentFilterCol]) activeFilters[currentFilterCol] = [];
    if(isChecked) { if(!activeFilters[currentFilterCol].includes(val)) activeFilters[currentFilterCol].push(val); }
    else activeFilters[currentFilterCol] = activeFilters[currentFilterCol].filter(v => v !== val);
    currentPage = 1; refreshUI();
}

function clearFilterColumn() { delete activeFilters[currentFilterCol]; closeFilterMenu(); currentPage = 1; refreshUI(); }
function closeFilterMenu() { document.getElementById('filter-menu-container').style.display='none'; }

// --- EXPORTACIÓN ---
async function exportToExcel() {
    if (dataParaExportar.length === 0) return notify("Error", "No hay datos", "indigo");
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Reporte Facturación');

    ws.columns = [
        { header: 'FACTURA', key: 'factura', width: 15 },
        { header: 'VALOR', key: 'valor', width: 15 },
        { header: 'FECHA FACTURA', key: 'fecha', width: 12 },
        { header: 'VENCIMIENTO', key: 'vencimiento', width: 12 },
        { header: 'ENTIDAD', key: 'entidad', width: 30 },
        { header: 'FACTURADOR', key: 'facturador', width: 20 },
        { header: 'ESTADO EMPAQUETADO', key: 'estadoEmp', width: 18 },
        { header: 'FECHA EMPAQUETADO', key: 'fechaEmp', width: 18 },
        { header: 'ESTADO RADICACIÓN', key: 'estadoRad', width: 18 },
        { header: 'FECHA RADICACIÓN', key: 'fechaRad', width: 18 },
        { header: 'ESTADO RADICACIÓN ENTIDAD', key: 'estadoRadicacion', width: 22 },
        { header: 'FECHA RADICACIÓN ENTIDAD', key: 'fechaRadicacion', width: 22 },
        { header: 'DÍAS RESTANTES', key: 'diasRest', width: 15 },
        { header: 'OBSERVACIÓN', key: 'obs', width: 30 }
    ];

    ws.getRow(1).eachCell(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F46E5' } };
        c.font = { color: { argb: 'FFFFFF' }, bold: true };
    });

        dataParaExportar.forEach(f => {
            const rest = calcRemaining(f.vencimiento);
            const row = ws.addRow({
                ...f,
                estadoRadicacion: f.estadoRadicacion || 'Pendiente',
                fechaRadicacion: f.fechaRadicacion || '',
                diasRest: rest <= 0 ? `VENCIDA (${rest})` : rest + ' DH'
            });
            row.getCell('valor').numFmt = '"$"#,##0';
            if(rest <= 0) row.getCell('diasRest').font = { color: { argb: 'FF0000' }, bold: true };
        });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Sinfonia_${currentTemplate}_${meses[currentMonth]}.xlsx`);
}

// --- VENCIMIENTO: respeta festivos y días que no se trabajan (sábado, domingo, festivos Colombia) ---
// Fecha de vencimiento = fecha factura + 22 días HÁBILES (solo lunes a viernes no festivos).
function calcExpiry(dStr) {
    let d = new Date(dStr + 'T12:00:00');
    if (isNaN(d.getTime())) return '';
    
    let c = 0;
    while (c < 22) {
        d.setDate(d.getDate() + 1);
        if (esDiaHabil(d)) c++;
    }
    return fechaLocalStr(d);
}

function calcRemaining(exp) {
    if (!exp) return 0;
    let today = new Date(); 
    today.setHours(0,0,0,0);
    let target = new Date(exp); 
    target.setHours(0,0,0,0);
    let count = 0;
    let cur = new Date(today);
    
    if (cur.getTime() === target.getTime()) {
        return 0; // Misma fecha
    }
    
    if (cur > target) {
        // Fecha vencida - contar hacia atrás (excluyendo el día de hoy)
        // NO cuenta sábados, domingos ni festivos de Colombia
        cur.setDate(cur.getDate() - 1);
        while (cur >= target) {
            if (esDiaHabil(cur)) count--; // Solo cuenta días hábiles
            cur.setDate(cur.getDate() - 1);
        }
    } else {
        // Fecha futura - contar hacia adelante (excluyendo el día de hoy)
        // NO cuenta sábados, domingos ni festivos de Colombia
        cur.setDate(cur.getDate() + 1);
        while (cur <= target) {
            if (esDiaHabil(cur)) count++; // Solo cuenta días hábiles
            cur.setDate(cur.getDate() + 1);
        }
    }
    return count;
}

function refreshUI() {
    // Cargar desde IndexedDB primero (instantáneo) - Google Sheets solo para sincronización
    const tx = db.transaction("facturas", "readonly");
    const store = tx.objectStore("facturas");
    const index = store.index("template");
    const request = index.getAll(currentTemplate);
    
    request.onsuccess = e => {
        const all = e.target.result;
        window.fullMonthData = all.filter(f => f.mes === currentMonth && f.year === currentYear);
        let data = [...window.fullMonthData];
        
        const search = document.getElementById('globalSearch').value.toLowerCase();
        if(search) data = data.filter(f => Object.values(f).some(v => String(v).toLowerCase().includes(search)));
        
        Object.keys(activeFilters).forEach(col => {
            if (activeFilters[col]?.length > 0) {
                data = data.filter(f => {
                    if (col === 'diasRest') {
                        const rest = calcRemaining(f.vencimiento);
                        const diasRestStr = rest <= 0 ? 'VENCIDA' : rest + ' DH';
                        return activeFilters[col].includes(diasRestStr);
                    } else {
                        const value = f[col];
                        const valueStr = (value === null || value === undefined || value === '') ? 'N/A' : String(value);
                        return activeFilters[col].includes(valueStr);
                    }
                });
            }
        });

        dataParaExportar = data;
        const pageSize = parseInt(document.getElementById('pageSize').value);
        const pagedData = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);

        renderStats(data);
        renderTable(pagedData);
        renderPagination(data.length, Math.ceil(data.length / pageSize));
        renderTabs();
    };
}

function renderTable(data) {
    const tbody = document.getElementById('table-body');
    // Usar DocumentFragment para renderizado más rápido
    const fragment = document.createDocumentFragment();
    const rowsHTML = [];
    
    data.forEach(f => {
        const rest = calcRemaining(f.vencimiento);
        const style = rest <= 0 ? 'bg-slate-900 text-white' : (rest <= 5 ? 'bg-red-500 text-white animate-pulse' : (rest <= 12 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'));
        const obsEscaped = (f.obs || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        const facturaEscaped = String(f.factura || '').replace(/'/g, '&#39;');
        rowsHTML.push(`<tr>
            <td class="font-bold text-indigo-900">${facturaEscaped}</td>
            <td class="font-mono font-bold text-indigo-600">$${Number(f.valor || 0).toLocaleString()}</td>
            <td class="whitespace-nowrap">${f.fecha || ''}</td>
            <td class="font-semibold text-slate-500">${f.vencimiento || ''}</td>
            <td class="uppercase text-[10px] truncate max-w-[140px]" title="${(f.entidad || '').replace(/"/g, '&quot;')}">${f.entidad || 'N/A'}</td>
            <td class="text-slate-400 font-bold text-[10px] truncate max-w-[100px]">${f.facturador || 'N/A'}</td>
            <td class="text-center">${renderSelect(facturaEscaped, 'estadoEmp', f.estadoEmp)}</td>
            <td class="text-[10px] font-bold text-slate-500">${f.fechaEmp || '-'}</td>
            <td class="text-center">${renderSelect(facturaEscaped, 'estadoRad', f.estadoRad)}</td>
            <td class="text-[10px] font-bold text-slate-500">${f.fechaRad || '-'}</td>
            <td class="text-center"><span class="status-pill ${f.estadoRadicacion === 'Radicado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">${f.estadoRadicacion || 'Pendiente'}</span></td>
            <td class="text-[10px] font-bold text-slate-500">${f.fechaRadicacion || '-'}</td>
            <td class="text-center"><span class="status-pill ${style}">${rest <= 0 ? 'VENCIDA' : rest + ' DH'}</span></td>
            <td><input type="text" value="${obsEscaped}" onchange="updateField('${facturaEscaped}', 'obs', this.value)" class="w-full bg-transparent outline-none border-b border-transparent focus:border-indigo-300"></td>
        </tr>`);
    });
    
    tbody.innerHTML = rowsHTML.join('');
    lucide.createIcons();
}

function renderPagination(totalItems, totalPages) {
    const info = document.getElementById('page-info');
    const btns = document.getElementById('page-btns');
    info.innerText = `Mostrando ${totalItems} registros`;
    btns.innerHTML = '';
    if (totalPages <= 1) return;
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            let b = document.createElement('button');
            b.innerText = i;
            b.className = `px-2 py-1 rounded text-[10px] font-bold ${i===currentPage ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`;
            b.onclick = () => { currentPage = i; refreshUI(); };
            btns.appendChild(b);
        }
    }
}

function renderSelect(id, field, val) {
    const color = val === 'ENTREGADO' ? 'text-emerald-600 bg-emerald-50' : (val === 'ANULADA' ? 'text-red-600 bg-red-50' : 'text-amber-600 bg-amber-50');
    return `<select onchange="updateField('${id}', '${field}', this.value)" class="text-[10px] font-bold rounded px-1 py-1 outline-none ${color}"><option value="PENDIENTE" ${val==='PENDIENTE'?'selected':''}>PENDIENTE</option><option value="ENTREGADO" ${val==='ENTREGADO'?'selected':''}>ENTREGADO</option><option value="ANULADA" ${val==='ANULADA'?'selected':''}>ANULADA</option></select>`;
}

function updateField(id, field, val) {
    // Actualizar primero en IndexedDB (instantáneo)
    const tx = db.transaction("facturas", "readwrite");
    const store = tx.objectStore("facturas");
    store.get([currentTemplate, id]).onsuccess = e => {
        const data = e.target.result;
        if(data) { 
            data[field] = val; 
            store.put(data).onsuccess = () => {
                refreshUI(); // Actualizar UI inmediatamente
                
                // Sincronizar con Google Sheets en segundo plano (sin bloquear)
                if (typeof readFromGoogleSheets === 'function' && typeof writeToGoogleSheets === 'function') {
                    setTimeout(async () => {
                        try {
                            const savedToken = sessionStorage.getItem('googleAccessToken');
                            if (!savedToken) return;
                            
                            let allData = await readFromGoogleSheets(currentTemplate);
                            const item = allData.find(f => f.factura === id);
                            if (item) {
                                item[field] = val;
                                await writeToGoogleSheets(currentTemplate, allData);
                                console.log('✅ Campo sincronizado con Google Sheets');
                            }
                        } catch (error) {
                            console.log('Error sincronizando con Google Sheets (no crítico):', error);
                        }
                    }, 100);
                }
            };
        }
    };
}

// --- CARGA EXCEL ---
[1, 2, 3].forEach(n => {
    const inputElement = document.getElementById(`excel${n}`);
    if (!inputElement) {
        console.error(`No se encontró el elemento excel${n}`);
        return;
    }
    
    inputElement.addEventListener('change', async e => {
        // Validar que se seleccionó un archivo
        if (!e.target.files || !e.target.files[0]) {
            notify("Error", "No se seleccionó ningún archivo", "indigo");
            return;
        }
        
        const file = e.target.files[0];
        const reader = new FileReader();
        
        // Manejar errores del FileReader
        reader.onerror = (error) => {
            console.error('Error leyendo archivo:', error);
            notify("Error", "Error al leer el archivo. Por favor, intenta de nuevo.", "indigo");
            e.target.value = ''; // Limpiar input
        };
        
        reader.onload = async (evt) => {
            try {
                notify("Procesando", "Leyendo archivo Excel...", "success");
                const workbook = XLSX.read(evt.target.result, { type: 'binary' });
                const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                
                // Si Google Sheets está disponible, trabajar directamente con él
                if (typeof readFromGoogleSheets === 'function' && typeof writeToGoogleSheets === 'function' && typeof ensureAuthenticated === 'function') {
                    try {
                        // Asegurar autenticación automática
                        notify("Conectando", "Conectando con Google Sheets...", "success");
                        const isAuthenticated = await ensureAuthenticated();
                        
                        if (!isAuthenticated) {
                            throw new Error('No se pudo autenticar con Google. Por favor, verifica tu configuración.');
                        }
                        
                        notify("Sincronizando", "Cargando datos desde Google Sheets...", "success");
                        // Leer datos existentes de Google Sheets
                        let existingData = [];
                        try {
                            existingData = await readFromGoogleSheets(currentTemplate);
                        } catch (err) {
                            console.log('No hay datos previos en Google Sheets, creando nuevos');
                        }
                        
                        // Crear un mapa de datos existentes por factura
                        const dataMap = new Map();
                        existingData.forEach(item => {
                            dataMap.set(item.factura, item);
                        });
                        
                        // Procesar datos del Excel
                        json.forEach(row => {
                            const id = String(row.FACTURA || row.NÚMERO_DE_FACTURA || ''); 
                            if(!id) return;
                            
                            if(n===1) {
                                // Alimentación - fecha = FEC_FACTURA (fecha y hora); después de 23:59 -> día siguiente
                                const dateStr = fechaFacturaEfectivaDesdeFEC(row.FEC_FACTURA) || (dataMap.get(id) || {}).fecha || '';
                                const d = dateStr ? parseExcelDate(dateStr) : null;
                                let yearValue = currentYear;
                                let mesValue = currentMonth;
                                if (d && !isNaN(d.getTime())) {
                                    yearValue = d.getFullYear().toString();
                                    mesValue = d.getMonth();
                                } else {
                                    const existing = dataMap.get(id) || {};
                                    if (existing.year !== undefined) {
                                        yearValue = existing.year;
                                        mesValue = existing.mes !== undefined ? existing.mes : currentMonth;
                                    }
                                }
                                const existing = dataMap.get(id) || {};
                                dataMap.set(id, {
                                    factura: id,
                                    valor: row.VLR_FACTURADO || existing.valor || 0,
                                    fecha: dateStr || existing.fecha || '',
                                    vencimiento: dateStr ? calcExpiry(dateStr) : (existing.vencimiento || ''),
                                    year: yearValue,
                                    mes: mesValue,
                                    entidad: row.PB_FACTURA || existing.entidad || 'N/A',
                                    facturador: row.FACTURADOR || existing.facturador || 'N/A',
                                    template: currentTemplate,
                                    estadoEmp: existing.estadoEmp || 'PENDIENTE',
                                    estadoRad: existing.estadoRad || 'PENDIENTE',
                                    fechaEmp: existing.fechaEmp || '',
                                    fechaRad: existing.fechaRad || '',
                                    estadoRadicacion: existing.estadoRadicacion || 'Pendiente',
                                    fechaRadicacion: existing.fechaRadicacion || '',
                                    obs: existing.obs || ''
                                });
                            } else {
                                // Empaquetado (n=2) o Radicación (n=3) - actualizar registro existente
                                const existing = dataMap.get(id);
                                if(existing) {
                                    // Misma regla que FEC_FACTURA: fecha tal cual, sin zona horaria; 23:59 -> día siguiente
                                    const fechaOriginal = row.FECHA || row.FECHA_ENTREGA || row.FEC_ENTREGA;
                                    const fechaStr = fechaFacturaEfectivaDesdeFEC(fechaOriginal);
                                    if(n===2) { 
                                        existing.estadoEmp = 'ENTREGADO'; 
                                        existing.fechaEmp = fechaStr; 
                                    }
                                    if(n===3) { 
                                        existing.estadoRad = 'ENTREGADO'; 
                                        existing.fechaRad = fechaStr; 
                                    }
                                }
                            }
                        });
                        
                        // Convertir mapa a array y guardar en Google Sheets
                        const allData = Array.from(dataMap.values());
                        notify("Guardando", "Subiendo datos a Google Sheets...", "success");
                        await writeToGoogleSheets(currentTemplate, allData);
                        
                        // Guardar también en IndexedDB como caché
                        const txCache = db.transaction("facturas", "readwrite");
                        const storeCache = txCache.objectStore("facturas");
                        allData.forEach(item => {
                            item.template = currentTemplate;
                            storeCache.put(item);
                        });
                        txCache.oncomplete = () => {
                            console.log('Datos guardados en caché local');
                        };
                        
                        notify("Éxito", `Procesados ${json.length} registros y guardados en Google Sheets`, "success");
                        // Recargar datos desde Google Sheets para mostrar en la tabla
                        await refreshUI();
                        // Limpiar input para permitir seleccionar el mismo archivo de nuevo
                        e.target.value = '';
                        return;
                    } catch (error) {
                        console.error('Error con Google Sheets, usando IndexedDB como fallback:', error);
                        notify("Advertencia", "Error con Google Sheets, usando almacenamiento local", "indigo");
                        // Continuar con IndexedDB como fallback
                    }
                }
                
                // Fallback a IndexedDB si Google Sheets no está disponible
                const tx = db.transaction("facturas", "readwrite");
                const store = tx.objectStore("facturas");
                json.forEach(row => {
                    const id = String(row.FACTURA || row.NÚMERO_DE_FACTURA || ''); if(!id) return;
                    if(n===1) {
                        // Fecha de factura: FEC_FACTURA con fecha y hora; después de 23:59 -> día siguiente
                        const dateStr = fechaFacturaEfectivaDesdeFEC(row.FEC_FACTURA);
                        const d = dateStr ? parseExcelDate(dateStr) : null;
                        let yearValue = currentYear;
                        let mesValue = currentMonth;
                        if (d && !isNaN(d.getTime())) {
                            yearValue = d.getFullYear().toString();
                            mesValue = d.getMonth();
                        }
                        store.put({ 
                            factura: id, 
                            valor: row.VLR_FACTURADO||0, 
                            fecha: dateStr, 
                            vencimiento: calcExpiry(dateStr), 
                            year: yearValue, 
                            mes: mesValue, 
                            entidad: row.PB_FACTURA||'N/A', 
                            facturador: row.FACTURADOR||'N/A', 
                            template: currentTemplate, 
                            estadoEmp: 'PENDIENTE', 
                            estadoRad: 'PENDIENTE', 
                            fechaEmp: '', 
                            fechaRad: '', 
                            estadoRadicacion: 'Pendiente', 
                            fechaRadicacion: '', 
                            obs: '' 
                        });
                    } else {
                        store.get([currentTemplate, id]).onsuccess = ev => { 
                            const f = ev.target.result; 
                            if(f){ 
                                // Misma regla que FEC_FACTURA: fecha tal cual, sin zona horaria; 23:59 -> día siguiente
                                const fechaOriginal = row.FECHA || row.FECHA_ENTREGA || row.FEC_ENTREGA;
                                const fechaStr = fechaFacturaEfectivaDesdeFEC(fechaOriginal);
                                if(n===2) { f.estadoEmp = 'ENTREGADO'; f.fechaEmp = fechaStr; }
                                if(n===3) { f.estadoRad = 'ENTREGADO'; f.fechaRad = fechaStr; }
                                store.put(f); 
                            } 
                        };
                    }
                });
                tx.oncomplete = () => { 
                    notify("Éxito", "Procesado y guardado localmente", "success"); 
                    refreshUI();
                    // Limpiar input para permitir seleccionar el mismo archivo de nuevo
                    e.target.value = '';
                };
                
                tx.onerror = (error) => {
                    console.error('Error en transacción IndexedDB:', error);
                    notify("Error", "Error al guardar en la base de datos local", "indigo");
                    e.target.value = ''; // Limpiar input
                };
            } catch (error) {
                console.error('Error procesando Excel:', error);
                notify("Error", `Error al procesar el archivo Excel: ${error.message || 'Error desconocido'}`, "indigo");
                e.target.value = ''; // Limpiar input
            }
        };
        
        // Leer el archivo
        try {
            reader.readAsBinaryString(file);
        } catch (error) {
            console.error('Error iniciando lectura de archivo:', error);
            notify("Error", "No se pudo leer el archivo. Verifica que sea un archivo Excel válido.", "indigo");
            e.target.value = ''; // Limpiar input
        }
    });
});

// --- CARGA EXCEL ESTADO RADICACIÓN (excel4) ---
const excel4Element = document.getElementById('excel4');
if (!excel4Element) {
    console.error('No se encontró el elemento excel4');
} else {
    excel4Element.addEventListener('change', async e => {
        // Validar que se seleccionó un archivo
        if (!e.target.files || !e.target.files[0]) {
            notify("Error", "No se seleccionó ningún archivo", "indigo");
            return;
        }
        
        const file = e.target.files[0];
        const reader = new FileReader();
        
        // Manejar errores del FileReader
        reader.onerror = (error) => {
            console.error('Error leyendo archivo:', error);
            notify("Error", "Error al leer el archivo. Por favor, intenta de nuevo.", "indigo");
            e.target.value = ''; // Limpiar input
        };
        
        reader.onload = async (evt) => {
            try {
                notify("Procesando", "Leyendo archivo Excel de Estado Radicación...", "success");
            const workbook = XLSX.read(evt.target.result, { type: 'binary' });
            const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
            
            // Si Google Sheets está disponible, trabajar directamente con él
            if (typeof readFromGoogleSheets === 'function' && typeof writeToGoogleSheets === 'function' && typeof ensureAuthenticated === 'function') {
                try {
                    // Asegurar autenticación automática
                    notify("Conectando", "Conectando con Google Sheets...", "success");
                    const isAuthenticated = await ensureAuthenticated();
                    
                    if (!isAuthenticated) {
                        throw new Error('No se pudo autenticar con Google. Por favor, verifica tu configuración.');
                    }
                    
                    notify("Sincronizando", "Cargando datos desde Google Sheets...", "success");
                    // Leer datos existentes de Google Sheets
                    let allData = await readFromGoogleSheets(currentTemplate);
                    
                    // Crear mapa de facturas del Excel
                    const facturasEnExcel = new Map();
                    json.forEach(row => {
                        const facturaId = String(row['ListadoCxC.CxC.Factura'] || '');
                        if(facturaId) {
                            // Misma regla que FEC_FACTURA: fecha tal cual, sin zona horaria; 23:59 -> día siguiente
                            const fechaOriginal = row['ListadoCxC.CxC.Fecha'] || row.FechaDocumento;
                            const fechaStr = fechaFacturaEfectivaDesdeFEC(fechaOriginal);
                            facturasEnExcel.set(facturaId, {
                                estadoRadicacion: 'Radicado',
                                fechaRadicacion: fechaStr
                            });
                        }
                    });
                    
                    let procesadas = 0;
                    let noEncontradas = 0;
                    
                    // Actualizar facturas que están en el Excel
                    allData.forEach(f => {
                        const excelData = facturasEnExcel.get(f.factura);
                        if(excelData) {
                            f.estadoRadicacion = excelData.estadoRadicacion;
                            f.fechaRadicacion = excelData.fechaRadicacion;
                            procesadas++;
                        } else {
                            // Marcar como Pendiente las que no están en el Excel
                            if(!f.estadoRadicacion || f.estadoRadicacion === 'Pendiente') {
                                f.estadoRadicacion = 'Pendiente';
                                f.fechaRadicacion = '';
                            }
                        }
                    });
                    
                    // Guardar de vuelta en Google Sheets
                    notify("Guardando", "Subiendo datos a Google Sheets...", "success");
                    await writeToGoogleSheets(currentTemplate, allData);
                    
                    // Actualizar también en IndexedDB como caché
                    const tx = db.transaction("facturas", "readwrite");
                    const store = tx.objectStore("facturas");
                    allData.forEach(item => {
                        item.template = currentTemplate;
                        store.put(item);
                    });
                    tx.oncomplete = () => {
                        notify("Éxito", `Procesadas: ${procesadas} facturas | Guardadas en Google Sheets`, "success");
                        refreshUI();
                        // Limpiar input para permitir seleccionar el mismo archivo de nuevo
                        e.target.value = '';
                    };
                    
                    tx.onerror = (error) => {
                        console.error('Error en transacción IndexedDB:', error);
                        notify("Error", "Error al guardar en la base de datos local", "indigo");
                        e.target.value = ''; // Limpiar input
                    };
                    return;
                } catch (error) {
                    console.error('Error con Google Sheets, usando IndexedDB como fallback:', error);
                    notify("Advertencia", "Error con Google Sheets, usando almacenamiento local", "indigo");
                    // Continuar con IndexedDB como fallback
                }
            }
            
            // Fallback a IndexedDB si Google Sheets no está disponible
            const tx = db.transaction("facturas", "readwrite");
            const store = tx.objectStore("facturas");
            let procesadas = 0;
            let noEncontradas = 0;
            
            json.forEach(row => {
                const facturaId = String(row['ListadoCxC.CxC.Factura'] || '');
                if(!facturaId) return;
                
                store.get([currentTemplate, facturaId]).onsuccess = ev => {
                    const f = ev.target.result;
                    if(f) {
                        f.estadoRadicacion = 'Radicado';
                        // Misma regla que FEC_FACTURA: fecha tal cual, sin zona horaria; 23:59 -> día siguiente
                        const fechaOriginal = row['ListadoCxC.CxC.Fecha'] || row.FechaDocumento;
                        const fechaStr = fechaFacturaEfectivaDesdeFEC(fechaOriginal);
                        if (fechaStr) {
                            f.fechaRadicacion = fechaStr;
                        }
                        store.put(f);
                        procesadas++;
                    } else {
                        noEncontradas++;
                    }
                };
            });
            
            tx.oncomplete = () => {
                const tx2 = db.transaction("facturas", "readwrite");
                const store2 = tx2.objectStore("facturas");
                const index2 = store2.index("template");
                const request2 = index2.getAll(currentTemplate);
                
                request2.onsuccess = e2 => {
                    const todasFacturas = e2.target.result;
                    const facturasEnExcel = json.map(r => String(r['ListadoCxC.CxC.Factura'] || '')).filter(id => id);
                    
                    todasFacturas.forEach(f => {
                        if(!facturasEnExcel.includes(f.factura) && (!f.estadoRadicacion || f.estadoRadicacion === 'Pendiente')) {
                            f.estadoRadicacion = 'Pendiente';
                            f.fechaRadicacion = '';
                            store2.put(f);
                        }
                    });
                    
                    tx2.oncomplete = () => {
                        notify("Éxito", `Procesadas: ${procesadas} | No encontradas: ${noEncontradas}`);
                        refreshUI();
                        // Limpiar input para permitir seleccionar el mismo archivo de nuevo
                        e.target.value = '';
                    };
                    
                    tx2.onerror = (error) => {
                        console.error('Error en transacción IndexedDB (tx2):', error);
                        notify("Error", "Error al guardar en la base de datos local", "indigo");
                        e.target.value = ''; // Limpiar input
                    };
                };
            };
        } catch (error) {
            console.error('Error procesando Excel:', error);
            notify("Error", `Error al procesar el archivo Excel: ${error.message || 'Error desconocido'}`, "indigo");
            e.target.value = ''; // Limpiar input
        }
    };
    
    // Leer el archivo
    try {
        reader.readAsBinaryString(file);
    } catch (error) {
        console.error('Error iniciando lectura de archivo:', error);
        notify("Error", "No se pudo leer el archivo. Verifica que sea un archivo Excel válido.", "indigo");
        e.target.value = ''; // Limpiar input
    }
    });
}

function renderStats(data) {
    const facturasRadicadas = data.filter(f => f.estadoRadicacion === 'Radicado').length;
    const facturasEntregadas = data.filter(f => f.estadoEmp === 'ENTREGADO').length;
    
    document.getElementById('stats-panel').innerHTML = `
        <div class="bg-white p-3 rounded-2xl border shadow-sm"><p class="text-[9px] font-bold text-slate-400 uppercase">Facturas</p><p class="text-xl font-black">${data.length}</p></div>
        <div class="bg-white p-3 rounded-2xl border-l-4 border-emerald-500 shadow-sm"><p class="text-[9px] font-bold text-slate-400 uppercase">Radicadas</p><p class="text-xl font-black text-emerald-600">${facturasRadicadas}</p></div>
        <div class="bg-white p-3 rounded-2xl border-l-4 border-blue-500 shadow-sm"><p class="text-[9px] font-bold text-slate-400 uppercase">Entregadas</p><p class="text-xl font-black text-blue-600">${facturasEntregadas}</p></div>
        <div class="bg-white p-3 rounded-2xl border-l-4 border-amber-500 shadow-sm"><p class="text-[9px] font-bold text-slate-400 uppercase">Pendientes</p><p class="text-xl font-black text-amber-600">${data.filter(f=>f.estadoRad==='PENDIENTE').length}</p></div>
        <div class="bg-white p-3 rounded-2xl border-l-4 border-red-500 shadow-sm"><p class="text-[9px] font-bold text-slate-400 uppercase">Vencidas</p><p class="text-xl font-black text-red-600">${data.filter(f=>calcRemaining(f.vencimiento)<=0).length}</p></div>
        <div class="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-100"><p class="text-[9px] font-bold text-indigo-200 uppercase">Cartera Filtrada</p><p class="text-xl font-black text-white">$${data.reduce((a,b)=>a+Number(b.valor),0).toLocaleString()}</p></div>`;
}

function renderTabs() {
    const div = document.getElementById('month-tabs'); div.innerHTML = '';
    meses.forEach((m, i) => {
        div.innerHTML += `<button onclick="currentMonth=${i}; currentPage=1; refreshUI();" class="px-3 py-1 rounded-lg text-xs font-bold transition-all ${currentMonth===i?'bg-indigo-600 text-white shadow-md':'text-slate-400 hover:bg-slate-200'}">${m}</button>`;
    });
}

// Usada para TODAS las fechas que subes (FEC_FACTURA, FECHA/FECHA_ENTREGA, ListadoCxC.CxC.Fecha, etc.).
// Guarda la fecha tal como la das, SIN aplicar zona horaria.
// Solo se aplica este parámetro: si la hora es 11:59 PM o después -> va al DÍA SIGUIENTE.
function fechaFacturaEfectivaDesdeFEC(v) {
    if (v === undefined || v === null || v === '') return '';
    const FRACCION_23_59 = (23 * 60 + 59) / (24 * 60); // 0.9993 aprox.

    if (typeof v === 'number' && !isNaN(v)) {
        // Serial de Excel: fecha tal cual (sin zona horaria). Regla 23:59 -> día siguiente.
        let diaSerial = Math.floor(v);
        const fraccion = v - diaSerial;
        if (fraccion >= FRACCION_23_59) diaSerial += 1;
        const d = new Date((diaSerial - 25569) * 86400 * 1000);
        const year = d.getUTCFullYear();
        const month = d.getUTCMonth();
        const day = d.getUTCDate();
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    if (v instanceof Date && !isNaN(v.getTime())) {
        // Tomar fecha y hora tal cual (UTC = como viene del dato), sin convertir a zona horaria local.
        let year = v.getUTCFullYear();
        let month = v.getUTCMonth();
        let day = v.getUTCDate();
        const h = v.getUTCHours();
        const m = v.getUTCMinutes();
        if (h >= 23 && m >= 59) {
            const siguiente = new Date(Date.UTC(year, month, day + 1));
            year = siguiente.getUTCFullYear();
            month = siguiente.getUTCMonth();
            day = siguiente.getUTCDate();
        }
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    if (typeof v === 'string') {
        // DD/MM/YYYY o D/M/YYYY (con o sin hora) - común en Excel en español
        const dmyMatch = v.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/);
        if (dmyMatch) {
            let y = parseInt(dmyMatch[3], 10);
            let mo = parseInt(dmyMatch[2], 10) - 1;
            let d = parseInt(dmyMatch[1], 10);
            if (dmyMatch[4] !== undefined && dmyMatch[5] !== undefined) {
                const h = parseInt(dmyMatch[4], 10);
                const min = parseInt(dmyMatch[5], 10);
                if (h >= 23 && min >= 59) {
                    const siguiente = new Date(y, mo, d + 1);
                    y = siguiente.getFullYear();
                    mo = siguiente.getMonth();
                    d = siguiente.getDate();
                }
            }
            return `${y}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        }
        // ISO con Z: usar la fecha del string (YYYY-MM-DD) para no cambiar de día por UTC
        const isoDateOnly = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoDateOnly) {
            let y = parseInt(isoDateOnly[1], 10);
            let mo = parseInt(isoDateOnly[2], 10) - 1;
            let d = parseInt(isoDateOnly[3], 10);
            const timeMatch = v.match(/T(\d{1,2}):(\d{1,2})/);
            if (timeMatch) {
                const h = parseInt(timeMatch[1], 10);
                const min = parseInt(timeMatch[2], 10);
                if (h >= 23 && min >= 59) {
                    const siguiente = new Date(y, mo, d + 1);
                    y = siguiente.getFullYear();
                    mo = siguiente.getMonth();
                    d = siguiente.getDate();
                }
            }
            return `${y}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        }
        const parsed = new Date(v);
        if (!isNaN(parsed.getTime())) {
            // Fecha tal cual (UTC), sin zona horaria; solo regla 23:59 -> día siguiente.
            let year = parsed.getUTCFullYear();
            let month = parsed.getUTCMonth();
            let day = parsed.getUTCDate();
            const h = parsed.getUTCHours();
            const m = parsed.getUTCMinutes();
            if (h >= 23 && m >= 59) {
                const siguiente = new Date(Date.UTC(year, month, day + 1));
                year = siguiente.getUTCFullYear();
                month = siguiente.getUTCMonth();
                day = siguiente.getUTCDate();
            }
            return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
    }
    return '';
}

// Función mejorada para parsear fechas de Excel con mejor detección de año
function parseExcelDate(v) {
    if (!v) return null;
    
    // Si ya es un objeto Date: usar fecha tal cual (UTC), sin aplicar zona horaria.
    if (v instanceof Date) {
        if (isNaN(v.getTime())) return null;
        const year = v.getUTCFullYear();
        const month = v.getUTCMonth();
        const day = v.getUTCDate();
        return new Date(year, month, day, 12, 0, 0);
    }
    
    // Serial de Excel: fecha tal cual (25569 = días hasta 1970-01-01), sin zona horaria.
    if (!isNaN(v) && typeof v === 'number') {
        const serial = Math.floor(v);
        const date = new Date((serial - 25569) * 86400 * 1000);
        const year = date.getUTCFullYear();
        const month = date.getUTCMonth();
        const day = date.getUTCDate();
        return new Date(year, month, day, 12, 0, 0);
    }
    
    // Si es string, parsearlo manualmente para evitar problemas de zona horaria
    if (typeof v === 'string') {
        // Intentar formato YYYY-MM-DD primero (más común en Excel exportado)
        const isoMatch = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) {
            const year = parseInt(isoMatch[1], 10);
            const month = parseInt(isoMatch[2], 10) - 1; // Mes en JS es 0-indexed
            const day = parseInt(isoMatch[3], 10);
            // Crear fecha directamente en hora local (mediodía para evitar problemas)
            return new Date(year, month, day, 12, 0, 0);
        }
        
        // Intentar formato DD/MM/YYYY o MM/DD/YYYY
        const slashMatch = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (slashMatch) {
            // Asumir formato DD/MM/YYYY (formato colombiano)
            const day = parseInt(slashMatch[1], 10);
            const month = parseInt(slashMatch[2], 10) - 1; // Mes en JS es 0-indexed
            const year = parseInt(slashMatch[3], 10);
            // Si el día es > 12, definitivamente es DD/MM/YYYY
            // Si no, podría ser ambiguo, pero asumimos DD/MM/YYYY
            if (day > 12) {
                return new Date(year, month, day, 12, 0, 0);
            } else {
                // Podría ser DD/MM o MM/DD, pero asumimos DD/MM/YYYY
                return new Date(year, month, day, 12, 0, 0);
            }
        }
        
        // Último recurso: extraer fecha tal cual (UTC), sin aplicar zona horaria.
        const parsed = new Date(v);
        if (!isNaN(parsed.getTime())) {
            const year = parsed.getUTCFullYear();
            const month = parsed.getUTCMonth();
            const day = parsed.getUTCDate();
            return new Date(year, month, day, 12, 0, 0);
        }
    }
    
    return null;
}

// Función para formatear fecha en formato YYYY-MM-DD sin problemas de zona horaria
function formatearFechaLocal(fecha) {
    if (!fecha || isNaN(fecha.getTime())) return '';
    
    // Extraer año, mes y día directamente de la fecha parseada (métodos locales)
    const year = fecha.getFullYear();
    const mes = fecha.getMonth(); // 0-11
    const dia = fecha.getDate();
    
    // Formatear fecha como YYYY-MM-DD (sin usar toISOString que usa UTC)
    const mesFormateado = String(mes + 1).padStart(2, '0');
    const diaFormateado = String(dia).padStart(2, '0');
    return `${year}-${mesFormateado}-${diaFormateado}`;
}

// Función para obtener fecha y hora actual en formato legible
function getFechaHoraActual() {
    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    const horas = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');
    const segundos = String(ahora.getSeconds()).padStart(2, '0');
    return `${dia}/${mes}/${año} ${horas}:${minutos}:${segundos}`;
}

// --- SISTEMA DE RUTAS ---
function initRouter() {
    // Manejar navegación del navegador (back/forward)
    window.addEventListener('popstate', (e) => {
        handleRoute(window.location.pathname);
    });
    
    // Manejar ruta inicial
    handleRoute(window.location.pathname || '/');
}

function navigateTo(path) {
    // Actualizar URL sin recargar la página
    window.history.pushState({}, '', path);
    handleRoute(path);
}

function handleRoute(path) {
    // Normalizar la ruta
    path = path === '' ? '/' : path;
    
    const homePage = document.getElementById('home-page');
    const tablesSection = document.getElementById('tables-section');
    const headerActions = document.getElementById('header-actions');
    
    // Verificar que los elementos críticos existan
    if (!homePage || !tablesSection) {
        // Si los elementos no existen aún, reintentar después de un breve delay (solo una vez)
        if (!window._routeRetry) {
            window._routeRetry = true;
            setTimeout(() => {
                window._routeRetry = false;
                handleRoute(path);
            }, 200);
        }
        return;
    }
    
    // Ocultar todo primero
    homePage.classList.add('hidden');
    tablesSection.classList.add('hidden');
    if (headerActions) headerActions.classList.add('hidden');
    
    // Mostrar sección según la ruta
    if (path === '/') {
        // Página principal - ocultar botones de exportar/importar
        homePage.classList.remove('hidden');
        if (headerActions) headerActions.classList.add('hidden');
        if (typeof updateNavButtons === 'function') updateNavButtons('Inicio');
    } else if (path === '/ambulatorio') {
        // Tablas de Ambulatorio - mostrar botones
        tablesSection.classList.remove('hidden');
        if (headerActions) headerActions.classList.remove('hidden');
        if (typeof switchTemplate === 'function') switchTemplate('Ambulatorio');
        if (typeof updateNavButtons === 'function') updateNavButtons('Ambulatorio');
    } else if (path === '/urgencias') {
        // Tablas de Urgencias - mostrar botones
        tablesSection.classList.remove('hidden');
        if (headerActions) headerActions.classList.remove('hidden');
        if (typeof switchTemplate === 'function') switchTemplate('Urgencias');
        if (typeof updateNavButtons === 'function') updateNavButtons('Urgencias');
    } else {
        // Ruta no reconocida, redirigir a inicio sin cambiar el historial
        window.history.replaceState({}, '', '/');
        handleRoute('/');
        return;
    }
    
    // Actualizar iconos de Lucide
    if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 100);
    }
}

function updateNavButtons(activePage) {
    const btnHome = document.getElementById('btn-home');
    const btnAmb = document.getElementById('btn-amb');
    const btnUrg = document.getElementById('btn-urg');
    
    const activeClass = 'px-6 py-1.5 rounded-lg text-xs font-bold transition-all bg-white shadow-sm text-indigo-600';
    const inactiveClass = 'px-6 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-500';
    
    if (btnHome) {
        btnHome.className = activePage === 'Inicio' ? activeClass : inactiveClass;
    }
    if (btnAmb) {
        btnAmb.className = activePage === 'Ambulatorio' ? activeClass : inactiveClass;
    }
    if (btnUrg) {
        btnUrg.className = activePage === 'Urgencias' ? activeClass : inactiveClass;
    }
}

// Variable global para evitar múltiples sincronizaciones concurrentes
let isSyncing = false;
let lastSyncTime = 0;
const SYNC_COOLDOWN = 1000; // Mínimo 1 segundo entre sincronizaciones

// Función de sincronización automática con Google Sheets (mejorada y robusta)
async function syncWithGoogleSheetsAuto() {
    // Verificar que estamos en una página de tablas
    const currentFile = window.location.pathname.split('/').pop() || 'index.html';
    if (currentFile === 'index.html' || currentFile === '' || currentFile === '/') {
        return; // No sincronizar en la página principal
    }
    
    // Verificar que currentTemplate esté definido
    if (!currentTemplate || (currentTemplate !== 'Ambulatorio' && currentTemplate !== 'Urgencias')) {
        console.log('⚠️ Template no definido, esperando...');
        return;
    }
    
    // Evitar múltiples sincronizaciones concurrentes
    if (isSyncing) {
        console.log('⏳ Sincronización ya en curso, saltando...');
        return;
    }
    
    // Cooldown: evitar sincronizaciones muy frecuentes
    const now = Date.now();
    if (now - lastSyncTime < SYNC_COOLDOWN) {
        return;
    }
    
    // Verificar que las funciones necesarias estén disponibles
    if (typeof readFromGoogleSheets !== 'function' || typeof ensureAuthenticated !== 'function') {
        console.log('⚠️ Funciones de Google Sheets no disponibles aún');
        return;
    }
    
    isSyncing = true;
    lastSyncTime = now;
    
    try {
        // Verificar token guardado
        const savedToken = sessionStorage.getItem('googleAccessToken');
        if (!savedToken || savedToken === '') {
            isSyncing = false;
            return; // No autenticado, saltar sincronización
        }
        
        // Verificar autenticación (con timeout para no bloquear)
        const authPromise = ensureAuthenticated();
        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(false), 5000));
        const isAuthenticated = await Promise.race([authPromise, timeoutPromise]);
        
        if (!isAuthenticated) {
            isSyncing = false;
            return;
        }
        
        // Leer datos de Google Sheets con timeout
        const readPromise = readFromGoogleSheets(currentTemplate);
        const readTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout leyendo Google Sheets')), 20000)
        );
        const data = await Promise.race([readPromise, readTimeout]);
        
        // Obtener todos los registros actuales del template desde IndexedDB
        await new Promise((resolve, reject) => {
            const txRead = db.transaction("facturas", "readonly");
            const storeRead = txRead.objectStore("facturas");
            const indexRead = storeRead.index("template");
            const requestRead = indexRead.getAll(currentTemplate);
            
            requestRead.onsuccess = (e) => {
                const existingLocalData = e.target.result || [];
                
                // Crear un Set con las facturas que existen en Google Sheets
                const facturasEnGoogle = new Set(data.map(item => String(item.factura || '')));
                
                // Crear un Set con todas las facturas locales
                const facturasLocales = new Set(existingLocalData.map(item => String(item.factura || '')));
                
                // Identificar facturas que están en local pero no en Google Sheets (deben eliminarse)
                const facturasAEliminar = [];
                facturasLocales.forEach(factura => {
                    if (factura && !facturasEnGoogle.has(factura)) {
                        facturasAEliminar.push(factura);
                    }
                });
                
                // Verificar si hay cambios (comparación más eficiente)
                let hayCambios = false;
                
                if (facturasAEliminar.length > 0) {
                    hayCambios = true;
                } else if (existingLocalData.length !== data.length) {
                    hayCambios = true;
                } else {
                    // Comparación rápida por hash simple
                    const localHash = existingLocalData.map(f => `${f.factura}|${f.estadoEmp}|${f.estadoRad}|${f.estadoRadicacion}`).sort().join('||');
                    const googleHash = data.map(f => `${f.factura}|${f.estadoEmp}|${f.estadoRad}|${f.estadoRadicacion}`).sort().join('||');
                    if (localHash !== googleHash) {
                        hayCambios = true;
                    }
                }
                
                if (!hayCambios) {
                    // No hay cambios, no hacer nada
                    isSyncing = false;
                    resolve();
                    return;
                }
                
                // Actualizar IndexedDB: eliminar los que no están en Google Sheets y actualizar/insertar los que sí están
                const tx = db.transaction("facturas", "readwrite");
                const store = tx.objectStore("facturas");
                
                // Eliminar registros que no están en Google Sheets
                let deleteCount = 0;
                facturasAEliminar.forEach(factura => {
                    try {
                        store.delete([currentTemplate, factura]);
                        deleteCount++;
                    } catch (err) {
                        console.error('Error eliminando registro:', err);
                    }
                });
                
                // Actualizar/insertar registros que sí están en Google Sheets
                data.forEach(item => {
                    try {
                        item.template = currentTemplate;
                        store.put(item);
                    } catch (err) {
                        console.error('Error guardando registro:', err);
                    }
                });
                
                tx.oncomplete = () => {
                    if (deleteCount > 0) {
                        console.log(`🗑️ Eliminados ${deleteCount} registros que no existen en Google Sheets`);
                        notify("Actualización", `${deleteCount} registro(s) eliminado(s) desde Google Sheets`, "indigo");
                    }
                    console.log(`✅ Sincronizados ${data.length} registros desde Google Sheets`);
                    // Refrescar UI para mostrar los cambios
                    refreshUI();
                    isSyncing = false;
                    resolve();
                };
                
                tx.onerror = (e) => {
                    console.error('Error en transacción de IndexedDB:', e);
                    isSyncing = false;
                    reject(e);
                };
            };
            
            requestRead.onerror = (e) => {
                console.error('Error leyendo de IndexedDB:', e);
                isSyncing = false;
                reject(e);
            };
        });
        
    } catch (error) {
        // Error silencioso en segundo plano, pero log para debugging
        console.log('⚠️ Sincronización automática falló:', error.message || error);
        isSyncing = false;
        // No lanzar el error para que la sincronización pueda continuar
    }
}

function switchTemplate(t) { 
    currentTemplate = t; 
    currentPage = 1;
    activeFilters = {}; // Limpiar filtros al cambiar de template
    currentFilterCol = "";
    const searchInput = document.getElementById('globalSearch');
    if (searchInput) searchInput.value = ""; // Limpiar búsqueda global
    
    // Cargar primero desde IndexedDB (instantáneo)
    refreshUI();
    
    // Sincronizar con Google Sheets en segundo plano (sin bloquear la UI)
    setTimeout(() => syncWithGoogleSheetsAuto(), 500);
}
function updateYear() { currentYear = document.getElementById('yearFilter').value; refreshUI(); }

