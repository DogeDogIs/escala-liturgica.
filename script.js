let currentFocusedCell = null;

// Configs
let eventsConfig = JSON.parse(localStorage.getItem('eventsConfigV2')) || [
    { id: 'ev_1', name: 'Solenidade / Festa', color: '#FFEBEE', isGeneral: false },
    { id: 'ev_2', name: 'Quaresma / Advento', color: '#F3E5F5', isGeneral: false },
    { id: 'ev_3', name: 'Semana Santa', color: '#ffebee', isGeneral: true }
];
let rolesConfig = JSON.parse(localStorage.getItem('rolesConfigV2')) || [
    'Coroinha 1', 'Coroinha 2', 'Coroinha 3', 'Sino', 'Vela 1', 'Vela 2', 'Cruz',
    'Turiferário', 'Naveteiro', 'Cruciferário', 'Cerimonialista', 'Mitra', 'Báculo'
];
let coroinhasConfig = JSON.parse(localStorage.getItem('coroinhasConfigV2')) || ['João', 'Maria', 'Pedro', 'Lucas'];
let cerimoniariosConfig = JSON.parse(localStorage.getItem('cerimoniariosConfigV2')) || ['Marcos', 'Tiago', 'Felipe', 'Ana'];
let locaisConfig = JSON.parse(localStorage.getItem('locaisConfigV2')) || ['Igreja Matriz', 'Capela São José'];

document.addEventListener('DOMContentLoaded', () => {
    loadData();

    const activeTab = localStorage.getItem('activeTabV2') || 'tab-coroinhas';
    const tabBtn = document.querySelector(`.tab-btn[onclick*="${activeTab}"]`);
    if (tabBtn) tabBtn.click();
});

function hexToRgba(hex, alpha) {
    if (!hex) return '';
    if (hex.startsWith('rgb')) return hex;
    let r = 0, g = 0, b = 0;
    if (hex.length == 4) {
        r = parseInt(hex[1] + hex[1], 16); g = parseInt(hex[2] + hex[2], 16); b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length == 7) {
        r = parseInt(hex.substring(1, 3), 16); g = parseInt(hex.substring(3, 5), 16); b = parseInt(hex.substring(5, 7), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

document.addEventListener('click', (e) => {
    const colorable = e.target.closest('.colorable');
    // Controle de cor de células
    if (colorable && !e.target.matches('.name-input')) {
        if (currentFocusedCell) currentFocusedCell.classList.remove('selected-cell');
        currentFocusedCell = colorable;
        currentFocusedCell.classList.add('selected-cell');
    } else if (!e.target.closest('.color-picker-container')) {
        if (currentFocusedCell) {
            currentFocusedCell.classList.remove('selected-cell');
            currentFocusedCell = null;
        }
    }

    // Fechar autocomplete se clicar fora do input
    if (!e.target.matches('.name-input')) {
        document.querySelectorAll('.autocomplete-list.show').forEach(ul => ul.classList.remove('show'));
    }

    // Fechar dropdown de ações se clicar fora
    if (!e.target.closest('.dropdown') && !e.target.closest('.dropdown-menu')) {
        closeAllDropdowns();
    }
});

document.getElementById('cell-color-picker').addEventListener('input', function (e) {
    if (currentFocusedCell) {
        currentFocusedCell.style.backgroundColor = hexToRgba(e.target.value, 0.20);
        saveData();
    }
});
function clearCellColor() {
    if (currentFocusedCell) { currentFocusedCell.style.backgroundColor = ''; saveData(); }
}

function calculateDayOfWeek(inputElement) {
    const dateStr = inputElement.value;
    if (!dateStr) return;
    const parts = dateStr.split('-');
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const tr = inputElement.closest('tr');
    const dayCell = tr.querySelector('.day-cell');
    if (dayCell) dayCell.innerText = dias[date.getDay()];
    ordenarTodasTabelas();
}

function openTab(evt, tabId) {
    const tabContents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < tabContents.length; i++) tabContents[i].classList.remove('active');
    const tabBtns = document.getElementsByClassName('tab-btn');
    for (let i = 0; i < tabBtns.length; i++) tabBtns[i].classList.remove('active');
    document.getElementById(tabId).classList.add('active');
    evt.currentTarget.classList.add('active');
    localStorage.setItem('activeTabV2', tabId);
}

// --- AUTOCOMPLETE CUSTOMIZADO ---
function handleNameInput(input) {
    const container = input.closest('.name-cell') || input.closest('.role-item');
    const table = input.closest('table');
    const isCoroinhas = table.id.includes('coroinhas');
    const configList = isCoroinhas ? coroinhasConfig : cerimoniariosConfig;

    document.querySelectorAll('.autocomplete-list.show').forEach(ul => {
        if (ul.parentElement !== container) ul.classList.remove('show');
    });

    let ul = container.querySelector('.autocomplete-list');
    if (!ul) {
        ul = document.createElement('ul');
        ul.className = 'autocomplete-list no-print';
        container.appendChild(ul);
    }

    const val = input.value.toLowerCase().trim();
    let isExactMatch = configList.some(name => name.toLowerCase() === val);
    const filtered = (val && !isExactMatch) ? configList.filter(name => name.toLowerCase().includes(val)) : configList;

    if (filtered.length > 0) {
        ul.innerHTML = filtered.map(name => {
            const safeName = name.replace(/"/g, '&quot;');
            return `<li onmousedown="selectAutocomplete('${safeName}', this)">${name}</li>`;
        }).join('');
        ul.classList.add('show');

        const rect = ul.getBoundingClientRect();
        if (rect.bottom > window.innerHeight) {
            ul.style.top = 'auto';
            ul.style.bottom = '100%';
        } else {
            ul.style.top = '100%';
            ul.style.bottom = 'auto';
        }
    } else {
        ul.classList.remove('show');
    }
}

function selectAutocomplete(name, liElement) {
    const container = liElement.closest('.name-cell') || liElement.closest('.role-item');
    const input = container.querySelector('.name-input');
    input.value = name;

    const ul = container.querySelector('.autocomplete-list');
    if (ul) ul.classList.remove('show');
    saveData();
}

function getLocalSelectOptionsHTML(selectedValue = '') {
    const defaultLocal = locaisConfig[0] || '';
    const cleanSelected = selectedValue ? selectedValue.replace('📍 ', '').replace('📍', '').trim() : defaultLocal;
    const effectiveSelected = locaisConfig.includes(cleanSelected) ? cleanSelected : defaultLocal;

    let html = '';
    locaisConfig.forEach((local, idx) => {
        const isDefault = (idx === 0);
        const label = isDefault ? local : `📍 ${local}`;
        const isSelected = (local === effectiveSelected);
        html += `<option value="${local}" ${isSelected ? 'selected' : ''}>${label}</option>`;
    });
    return html;
}

function updateAllLocalSelects() {
    document.querySelectorAll('.local-select').forEach(select => {
        const currentVal = select.value;
        select.innerHTML = getLocalSelectOptionsHTML(currentVal);
        handleLocalChange(select);
    });
}

// --- MODAL CONFIG ---
function openConfigModal() {
    renderEventsConfigList();
    renderLocaisConfigList();
    renderServersConfigList();
    renderRolesConfigList();
    document.getElementById('config-modal').classList.add('show');
}
function closeConfigModal() { document.getElementById('config-modal').classList.remove('show'); }

function openConfigTab(evt, tabId) {
    const tabContents = document.getElementsByClassName('config-tab-content');
    for (let i = 0; i < tabContents.length; i++) tabContents[i].style.display = 'none';
    const tabBtns = document.getElementsByClassName('config-tab-btn');
    for (let i = 0; i < tabBtns.length; i++) tabBtns[i].classList.remove('active');
    document.getElementById(tabId).style.display = 'block';
    evt.currentTarget.classList.add('active');
}

function renderEventsConfigList() {
    const list = document.getElementById('events-list');
    list.innerHTML = '';
    eventsConfig.forEach(ev => {
        if (ev.paintRow === undefined) ev.paintRow = true;
        
        const div = document.createElement('div');
        div.className = 'event-config-item';
        div.innerHTML = `
            <input type="color" value="${ev.color}" onchange="updateEventObj('${ev.id}', 'color', this.value)">
            <input type="text" value="${ev.name}" placeholder="Nome do Evento" oninput="updateEventObj('${ev.id}', 'name', this.value)">
            <label class="checkbox-group"><input type="checkbox" ${ev.isGeneral ? 'checked' : ''} onchange="updateEventObj('${ev.id}', 'isGeneral', this.checked)"> Todos</label>
            <label class="checkbox-group"><input type="checkbox" ${ev.paintRow ? 'checked' : ''} onchange="updateEventObj('${ev.id}', 'paintRow', this.checked)"> Pintar Linha</label>
            <button class="btn-remove-role" style="color:#d32f2f; margin-left:10px;" onclick="removeEventConfig('${ev.id}')">✖</button>
        `;
        list.appendChild(div);
    });
}
function updateEventObj(id, field, value) { const ev = eventsConfig.find(e => e.id === id); if (ev) ev[field] = value; }
function addNewEventConfig() { eventsConfig.push({ id: 'ev_' + Date.now(), name: 'Novo Evento', color: '#ffffff', isGeneral: false, paintRow: true }); renderEventsConfigList(); }
function removeEventConfig(id) { if (confirm('Excluir evento?')) { eventsConfig = eventsConfig.filter(e => e.id !== id); renderEventsConfigList(); } }

function renderLocaisConfigList() {
    const list = document.getElementById('locais-list');
    list.innerHTML = '';
    locaisConfig.forEach((local, idx) => {
        const div = document.createElement('div');
        div.className = 'event-config-item';
        div.innerHTML = `<input type="text" value="${local}" oninput="updateLocalArray(${idx}, this.value)">
                         <button class="btn-remove-role" style="color:#d32f2f; margin-left:10px;" onclick="removeLocalConfig(${idx})">✖</button>`;
        list.appendChild(div);
    });
}
function updateLocalArray(idx, val) { locaisConfig[idx] = val; }
function addNewLocalConfig() { locaisConfig.push('Novo Local'); renderLocaisConfigList(); }
function removeLocalConfig(idx) { if (confirm('Excluir local?')) { locaisConfig.splice(idx, 1); renderLocaisConfigList(); } }

function renderServersConfigList() {
    const renderList = (arr, containerId, type) => {
        const list = document.getElementById(containerId);
        list.innerHTML = '';
        arr.forEach((name, idx) => {
            const div = document.createElement('div');
            div.className = 'event-config-item';
            div.innerHTML = `<input type="text" value="${name}" oninput="updateServerArray('${type}', ${idx}, this.value)">
                             <button class="btn-remove-role" style="color:#d32f2f; margin-left:5px;" onclick="removeServerConfig('${type}', ${idx})">✖</button>`;
            list.appendChild(div);
        });
    };
    renderList(coroinhasConfig, 'coroinhas-config-list', 'coroinhas');
    renderList(cerimoniariosConfig, 'cerimoniarios-config-list', 'cerimoniarios');
}
function updateServerArray(type, idx, val) { type === 'coroinhas' ? coroinhasConfig[idx] = val : cerimoniariosConfig[idx] = val; }
function addNewServer(type) { type === 'coroinhas' ? coroinhasConfig.push('Nome') : cerimoniariosConfig.push('Nome'); renderServersConfigList(); }
function removeServerConfig(type, idx) { type === 'coroinhas' ? coroinhasConfig.splice(idx, 1) : cerimoniariosConfig.splice(idx, 1); renderServersConfigList(); }

function renderRolesConfigList() {
    const list = document.getElementById('roles-list');
    list.innerHTML = '';
    rolesConfig.forEach((role, idx) => {
        const div = document.createElement('div');
        div.className = 'event-config-item';
        div.innerHTML = `<input type="text" value="${role}" oninput="rolesConfig[${idx}] = this.value">
                         <button class="btn-remove-role" style="color:#d32f2f; margin-left:10px;" onclick="removeRoleConfig(${idx})">✖</button>`;
        list.appendChild(div);
    });
}
function addNewRoleConfig() { rolesConfig.push('Nova Função'); renderRolesConfigList(); }
function removeRoleConfig(idx) { if (confirm('Excluir função?')) { rolesConfig.splice(idx, 1); renderRolesConfigList(); } }

function saveConfigAndClose() {
    localStorage.setItem('eventsConfigV2', JSON.stringify(eventsConfig));
    localStorage.setItem('locaisConfigV2', JSON.stringify(locaisConfig));
    localStorage.setItem('coroinhasConfigV2', JSON.stringify(coroinhasConfig));
    localStorage.setItem('cerimoniariosConfigV2', JSON.stringify(cerimoniariosConfig));
    localStorage.setItem('rolesConfigV2', JSON.stringify(rolesConfig));

    document.querySelectorAll('.role-select').forEach(select => { select.innerHTML = getRoleSelectOptionsHTML(select.value); });
    updateAllLocalSelects();

    closeConfigModal();
}

// --- DROPDOWNS E EVENTOS ---
function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
    const backdrop = document.getElementById('dropdown-backdrop');
    if (backdrop) backdrop.classList.remove('show');
}

function toggleDropdown(btn) {
    const menu = btn.nextElementSibling;
    const isShowing = menu.classList.contains('show');
    closeAllDropdowns();
    if (!isShowing) {
        const tr = btn.closest('.main-row');
        const hasSublist = tr.nextElementSibling && tr.nextElementSibling.classList.contains('sublist-row');
        menu.innerHTML = getDropdownHTML(hasSublist);
        menu.classList.add('show');

        let backdrop = document.getElementById('dropdown-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.id = 'dropdown-backdrop';
            backdrop.onclick = closeAllDropdowns;
            document.body.appendChild(backdrop);
        }
        backdrop.classList.add('show');
    }
}

function getDropdownHTML(hasSublist) {
    let html = `<div class="dropdown-header">Eventos:</div>`;
    eventsConfig.forEach(ev => {
        html += `<button class="dropdown-item" onclick="applyEvent(this, '${ev.id}')">
                    <span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${ev.color}; margin-right:8px; border:1px solid #ccc;"></span>
                    ${ev.name} ${ev.isGeneral ? '(Convocação)' : ''}
                 </button>`;
    });
    html += `<hr><button class="dropdown-item text-danger" onclick="applyEvent(this, null)">Remover Evento (Normalizar)</button>`;
    html += `<hr><div class="dropdown-header">Sub-lista de Funções:</div>`;
    html += `<button class="dropdown-item" onclick="toggleSublist(this)">${hasSublist ? '➖ Ocultar Sub-lista' : '➕ Exibir Sub-lista'}</button>`;
    return html;
}

function toggleSublist(btn) {
    closeAllDropdowns();
    const tr = btn.closest('.main-row');
    const tableId = tr.closest('table').id;
    const type = tableId.includes('coroinhas') ? 'coroinhas' : 'cerimoniarios';
    if (tr.nextElementSibling && tr.nextElementSibling.classList.contains('sublist-row')) tr.nextElementSibling.remove();
    else createSublist(tr, type);
    saveData();
}

function applyGeneralDOM(tr, type) {
    tr.cells[4].colSpan = 2;
    tr.cells[5].style.display = 'none';
    tr.cells[4].querySelector('.name-input').style.display = 'none';
    if (!tr.cells[4].querySelector('.conv-text')) {
        tr.cells[4].insertAdjacentHTML('beforeend', '<span class="conv-text" style="font-weight:bold; color:#d97706;">TODOS NECESSÁRIOS</span>');
    }
    tr.cells[4].style.backgroundColor = "rgba(255, 193, 7, 0.15)";
}

function removeGeneralDOM(tr, type) {
    tr.cells[4].colSpan = 1;
    tr.cells[5].style.display = '';
    tr.cells[4].querySelector('.name-input').style.display = '';
    const txt = tr.cells[4].querySelector('.conv-text');
    if (txt) txt.remove();
    tr.cells[4].style.backgroundColor = '';
    const warn = tr.cells[6].querySelector('.conv-obs-warn');
    if (warn) warn.remove();
    else tr.cells[6].innerHTML = tr.cells[6].innerHTML.replace(/<strong class="conv-obs-warn".*?<\/strong>(<br>)?/, '').replace(/<span class="conv-obs-warn".*?<\/span>\s?/, '');
}

function applyEvent(btn, eventId) {
    closeAllDropdowns();
    const tr = btn.closest('.main-row');
    const type = tr.closest('table').id.includes('coroinhas') ? 'coroinhas' : 'cerimoniarios';
    const obsCell = tr.querySelector('.obs-cell');

    if (tr.dataset.wasGeneral === 'true') {
        tr.dataset.wasGeneral = 'false';
        if (tr.nextElementSibling && tr.nextElementSibling.classList.contains('sublist-row')) {
            tr.nextElementSibling.remove();
        }
        removeGeneralDOM(tr, type);
    }

    tr.style.backgroundColor = '';
    tr.dataset.eventId = '';

    const oldBadge = obsCell.querySelector('.event-badge');
    if (oldBadge) {
        const br = oldBadge.nextElementSibling;
        if (br && br.classList.contains('event-badge-br')) br.remove();
        oldBadge.remove();
    }

    if (eventId) {
        const ev = eventsConfig.find(e => e.id === eventId);
        if (ev) {
            if (ev.paintRow !== false) {
                tr.style.backgroundColor = hexToRgba(ev.color, 0.15);
            }
            tr.dataset.eventId = ev.id;

            const badgeHtml = `<span class="event-badge" contenteditable="false" style="display:inline-block; margin-bottom:4px; padding:3px 6px; background:${ev.color}; color:#111; font-size:0.75rem; border-radius:4px; border:1px solid rgba(0,0,0,0.1); font-weight:bold; box-shadow: inset 0 0 0 1000px ${ev.color}; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;">${ev.name}</span><br class="event-badge-br no-print" contenteditable="false">`;
            obsCell.insertAdjacentHTML('afterbegin', badgeHtml);

            if (ev.isGeneral) {
                tr.dataset.wasGeneral = 'true';
                if (!(tr.nextElementSibling && tr.nextElementSibling.classList.contains('sublist-row'))) {
                    createSublist(tr, type);
                }
                applyGeneralDOM(tr, type);
            }
        }
    }
    saveData();
}

function handleLocalChange(selectEl) {
    if (!selectEl) return;

    let val = selectEl.value;
    selectEl.dataset.previousValue = val;
    const defaultLocal = locaisConfig[0] || '';
    const td = selectEl.closest('td');

    if (td) {
        if (val && val !== defaultLocal) {
            td.classList.add('local-highlight');
        } else {
            td.classList.remove('local-highlight');
        }
    }
}

function getRoleSelectOptionsHTML(selectedValue = '') {
    let options = '';
    let found = false;
    rolesConfig.forEach(r => {
        if (r === selectedValue) found = true;
        options += `<option value="${r}" ${r === selectedValue ? 'selected' : ''}>${r}</option>`;
    });
    if (selectedValue && !found) options += `<option value="${selectedValue}" selected>${selectedValue}</option>`;
    return options;
}

function createSublist(mainRow, type, existingData = null) {
    const colsCount = type === 'coroinhas' ? 8 : 7;
    const subTr = document.createElement('tr');
    subTr.className = 'sublist-row';

    let html = `<td colspan="${colsCount}">
        <div class="sublist-container">
            <div class="sublist-header-flex">
                <div class="sublist-title">Missa - Definição de Funções</div>
                <button class="btn-sublist-toggle no-print" onclick="toggleSublistFullscreen(this)">📱 Tela Cheia</button>
            </div>
            <div class="sublist-roles">`;

    const defaultRoles = type === 'coroinhas' ? ['Coroinha 1', 'Coroinha 2'] : ['Cruciferário', 'Cerimonialista'];
    let rolesData = existingData || defaultRoles.map(r => ({ name: r, val: '' }));

    rolesData.forEach(r => {
        const valSafe = r.val.replace(/"/g, '&quot;');
        html += `<div class="role-item" style="position:relative;">
                    <select class="role-select" onchange="saveData()">${getRoleSelectOptionsHTML(r.name)}</select> 
                    <input type="text" class="colorable name-input role-val" value="${valSafe}" oninput="handleNameInput(this); saveData();" onfocus="handleNameInput(this)">
                    <button class="btn-remove-role no-print" onclick="removeRole(this)">&times;</button>
                 </div>`;
    });
    html += `</div><button class="btn btn-small btn-add-role no-print" onclick="addDynamicRole(this)">+ Adicionar Função</button></div></td>`;

    subTr.innerHTML = html;
    mainRow.parentNode.insertBefore(subTr, mainRow.nextSibling);
}

function toggleSublistFullscreen(btn) {
    const container = btn.closest('.sublist-container');
    if (!container) return;
    const isFullscreen = container.classList.toggle('sublist-fullscreen');
    btn.innerHTML = isFullscreen ? '✓ Concluir Edição' : '📱 Tela Cheia';
}

function addDynamicRole(btn) {
    const div = document.createElement('div');
    div.className = 'role-item';
    div.style.position = 'relative';
    div.innerHTML = `<select class="role-select" onchange="saveData()">${getRoleSelectOptionsHTML(rolesConfig[0] || 'Função')}</select> 
                     <input type="text" class="colorable name-input role-val" oninput="handleNameInput(this); saveData();" onfocus="handleNameInput(this)">
                     <button class="btn-remove-role no-print" onclick="removeRole(this)">&times;</button>`;
    btn.previousElementSibling.appendChild(div);
    saveData();
}
function removeRole(btn) { btn.parentElement.remove(); saveData(); }

function addRow(tableId, data = null) {
    const table = document.getElementById(tableId);
    const tbodyBloco = document.createElement('tbody');
    tbodyBloco.className = 'bloco-missa';
    const type = tableId.includes('coroinhas') ? 'coroinhas' : 'cerimoniarios';
    const templateId = type === 'coroinhas' ? 'row-coroinhas-template' : 'row-cerimoniarios-template';
    const newRow = document.getElementById(templateId).content.cloneNode(true).querySelector('tr');

    newRow.id = (data && data.id) ? data.id : 'row_' + Date.now() + Math.random().toString(36).substr(2, 5);

    const localSelect = newRow.querySelector('.local-select');
    if (localSelect) {
        const savedLocal = (data && data.localVal) ? data.localVal : (locaisConfig[0] || '');
        const cleanSaved = savedLocal.replace('📍 ', '').replace('📍', '').trim();
        const effectiveLocal = locaisConfig.includes(cleanSaved) ? cleanSaved : (locaisConfig[0] || '');
        localSelect.innerHTML = getLocalSelectOptionsHTML(effectiveLocal);
        localSelect.value = effectiveLocal;
        handleLocalChange(localSelect);
    }

    if (data) {
        if (newRow.querySelector('.date-input')) newRow.querySelector('.date-input').value = data.dateVal;
        if (newRow.querySelector('.data-cell')) newRow.querySelector('.data-cell').style.backgroundColor = data.dateColor;

        const dayCell = newRow.querySelector('.day-cell');
        if (dayCell) { dayCell.innerHTML = data.dayHtml; dayCell.style.backgroundColor = data.dayColor; }

        if (newRow.querySelector('.time-input')) newRow.querySelector('.time-input').value = data.timeVal;
        if (newRow.querySelector('.time-cell')) newRow.querySelector('.time-cell').style.backgroundColor = data.timeColor;

        const nameInputs = newRow.querySelectorAll('.name-input');
        data.names.forEach((n, idx) => {
            if (nameInputs[idx]) {
                nameInputs[idx].value = n.val;
                nameInputs[idx].parentElement.style.backgroundColor = n.color;
            }
        });

        const obsCell = newRow.querySelector('.obs-cell');
        if (obsCell) { obsCell.innerHTML = data.obsHtml; obsCell.style.backgroundColor = data.obsColor; }

        if (data.eventId) {
            newRow.dataset.eventId = data.eventId;
            newRow.style.backgroundColor = data.rowColor;
            newRow.dataset.wasGeneral = data.wasGeneral ? 'true' : 'false';

            const ev = eventsConfig.find(e => e.id === data.eventId);
            if (ev && obsCell && !obsCell.querySelector('.event-badge')) {
                const rgbaColor = hexToRgba(ev.color, 0.6);
                const badgeHtml = `<span class="event-badge" contenteditable="false" style="display:inline-block; margin-bottom:4px; padding:3px 6px; background:${rgbaColor}; color:#111; font-size:0.75rem; border-radius:4px; border:1px solid rgba(0,0,0,0.1); font-weight:bold; box-shadow: inset 0 0 0 1000px ${rgbaColor}; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;">${ev.name}</span><br class="event-badge-br no-print" contenteditable="false">`;
                obsCell.insertAdjacentHTML('afterbegin', badgeHtml);
            }
            if (data.wasGeneral) applyGeneralDOM(newRow, type);
        }
    }

    tbodyBloco.appendChild(newRow);
    table.appendChild(tbodyBloco);
    if (data && data.sublist) createSublist(newRow, type, data.sublist);
    saveData();
}

function removeRow(btn) {
    if (confirm('Tem certeza que deseja remover esta missa?')) {
        const row = btn.closest('.main-row');
        const tbodyBloco = row.closest('.bloco-missa');
        if (tbodyBloco) {
            tbodyBloco.remove();
        } else {
            if (row.nextElementSibling && row.nextElementSibling.classList.contains('sublist-row')) row.nextElementSibling.remove();
            row.remove();
        }
        saveData();
        ordenarTodasTabelas();
    }
}

// --- DADOS E LOCALSTORAGE ---
function saveData() {
    const mes = document.getElementById('mes').value;
    const ano = document.getElementById('ano').value;
    const mesAno = `${mes} ${ano}`;
    const data = {
        mes: mes,
        ano: ano,
        mesAno: mesAno,
        coroinhas: getTableData('table-coroinhas'),
        cerimoniarios: getTableData('table-cerimoniarios')
    };
    localStorage.setItem('escalaLiturgicaDataV2', JSON.stringify(data));
    document.getElementById('print-mes-ano').innerText = mesAno;
    applyWeekSeparator();
}

function getTableData(tableId) {
    const table = document.getElementById(tableId);
    const rows = table.querySelectorAll('.main-row');
    const tableData = [];

    rows.forEach(row => {
        const dateInput = row.querySelector('.date-input');
        const dateCellWrapper = row.querySelector('.data-cell');
        const dayCell = row.querySelector('.day-cell');
        const timeInput = row.querySelector('.time-input');
        const timeCellWrapper = row.querySelector('.time-cell');
        const localSelect = row.querySelector('.local-select');
        const obsCell = row.querySelector('.obs-cell');

        const nameInputs = row.querySelectorAll('.main-row > .name-cell .name-input');
        const namesData = Array.from(nameInputs).map(inp => ({ val: inp.value, color: inp.parentElement.style.backgroundColor }));

        const rowData = {
            id: row.id,
            eventId: row.dataset.eventId || '',
            wasGeneral: row.dataset.wasGeneral === 'true',
            rowColor: row.style.backgroundColor,

            dateVal: dateInput ? dateInput.value : '',
            dateColor: dateCellWrapper ? dateCellWrapper.style.backgroundColor : '',

            dayHtml: dayCell ? dayCell.innerHTML : '',
            dayColor: dayCell ? dayCell.style.backgroundColor : '',

            timeVal: timeInput ? timeInput.value : '',
            timeColor: timeCellWrapper ? timeCellWrapper.style.backgroundColor : '',

            localVal: localSelect ? localSelect.value.replace('📍 ', '').replace('📍', '').trim() : '',

            names: namesData,

            obsHtml: obsCell ? obsCell.innerHTML : '',
            obsColor: obsCell ? obsCell.style.backgroundColor : ''
        };

        const next = row.nextElementSibling;
        if (next && next.classList.contains('sublist-row')) {
            const sublistData = [];
            next.querySelectorAll('.role-item').forEach(item => {
                const select = item.querySelector('.role-select');
                const valInput = item.querySelector('.role-val');
                sublistData.push({ name: select ? select.value : '', val: valInput ? valInput.value : '' });
            });
            rowData.sublist = sublistData;
        }
        tableData.push(rowData);
    });
    return tableData;
}

function loadData() {
    const savedData = localStorage.getItem('escalaLiturgicaDataV2');
    if (savedData) {
        const data = JSON.parse(savedData);
        if (data.mes) document.getElementById('mes').value = data.mes;
        if (data.ano) document.getElementById('ano').value = data.ano;
        else if (data.mesAno) {
            const parts = data.mesAno.split(' ');
            if (parts.length > 1) {
                document.getElementById('mes').value = parts[0];
                document.getElementById('ano').value = parts[1];
            }
        }
        document.getElementById('print-mes-ano').innerText = data.mesAno || `${document.getElementById('mes').value} ${document.getElementById('ano').value}`;

        document.querySelectorAll('#table-coroinhas tbody.bloco-missa').forEach(tb => tb.remove());
        document.querySelectorAll('#table-cerimoniarios tbody.bloco-missa').forEach(tb => tb.remove());
        document.querySelectorAll('.linha-separadora-semana').forEach(row => row.remove());

        if (data.coroinhas && data.coroinhas.length > 0) data.coroinhas.forEach(r => addRow('table-coroinhas', r));
        else addRow('table-coroinhas');

        if (data.cerimoniarios && data.cerimoniarios.length > 0) data.cerimoniarios.forEach(r => addRow('table-cerimoniarios', r));
        else addRow('table-cerimoniarios');
    } else {
        for (let i = 0; i < 3; i++) { addRow('table-coroinhas'); addRow('table-cerimoniarios'); }
    }
    highlightNextMass();
    ordenarTodasTabelas();
}

// --- ORDENAÇÃO E AGRUPAMENTO ---
function ordenarTodasTabelas() {
    // 1º: Remover todas as linhas separadoras atuais
    document.querySelectorAll('.linha-separadora-semana').forEach(row => row.remove());
    
    // 2º: Ordenar as tabelas individualmente
    ordenarTabelaPorData('table-coroinhas');
    ordenarTabelaPorData('table-cerimoniarios');
    
    // 3º e 4º: Adicionar separadores e re-calcular dias da semana (via applyWeekSeparator)
    applyWeekSeparator();
}

function ordenarTabelaPorData(tableId) {
    const table = document.getElementById(tableId);
    const blocos = Array.from(table.querySelectorAll('tbody.bloco-missa'));
    
    blocos.sort((a, b) => {
        const dateInputA = a.querySelector('.date-input');
        const dateInputB = b.querySelector('.date-input');
        
        const dateA = dateInputA ? dateInputA.value : '';
        const dateB = dateInputB ? dateInputB.value : '';
        
        // Se ambos estão vazios, mantém a ordem original
        if (!dateA && !dateB) return 0;
        // Se A está vazio, joga pro final
        if (!dateA) return 1;
        // Se B está vazio, joga pro final
        if (!dateB) return -1;
        
        return new Date(dateA) - new Date(dateB);
    });
    
    // Reposiciona os blocos já ordenados na tabela
    blocos.forEach(bloco => table.appendChild(bloco));
}

document.addEventListener('paste', function (e) {
    if (e.target.classList && e.target.classList.contains('colorable') && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        const text = (e.originalEvent || e).clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
    }
});

function exportWhatsApp() {
    const activeTabId = localStorage.getItem('activeTabV2') || 'tab-coroinhas';
    const tableId = activeTabId === 'tab-coroinhas' ? 'table-coroinhas' : 'table-cerimoniarios';
    const tbody = document.getElementById(tableId).querySelector('tbody');
    const rows = tbody.querySelectorAll('.main-row');

    let text = `*ESCALA DE ${activeTabId === 'tab-coroinhas' ? 'COROINHAS' : 'CERIMONIÁRIOS'}*\n`;
    const mes = document.getElementById('mes').value;
    const ano = document.getElementById('ano').value;
    text += `Mês: ${mes} / ${ano}\n\n`;

    rows.forEach(row => {
        const dateInput = row.querySelector('.date-input').value;
        if (!dateInput) return;

        const parts = dateInput.split('-');
        const formattedDate = `${parts[2]}/${parts[1]}`;
        const dayCell = row.querySelector('.day-cell');
        const dayText = dayCell && dayCell.innerText ? dayCell.innerText.substring(0, 3) : '';
        const timeInput = row.querySelector('.time-input');
        const timeText = timeInput && timeInput.value ? timeInput.value : '--:--';
        const localSelect = row.querySelector('.local-select');
        let localStr = '';
        if (localSelect && localSelect.value) {
            let val = localSelect.value.replace('📍 ', '').replace('📍', '').trim();
            const defaultLocal = locaisConfig[0] || '';
            if (val !== defaultLocal) val = '📍 ' + val;
            localStr = ' | ' + val;
        }

        let names = [];
        row.querySelectorAll('.main-row > .name-cell .name-input').forEach(inp => {
            if (inp.value.trim() && inp.style.display !== 'none') names.push(inp.value.trim());
        });

        const isGeneral = row.dataset.wasGeneral === 'true';
        if (isGeneral) names = ["TODOS CONVOCADOS"];

        let namesStr = names.length > 0 ? names.join(', ') : 'A definir';

        text += `🗓️ ${formattedDate} (${dayText}) - ${timeText}${localStr} | ${namesStr}\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
        alert("Escala copiada para a área de transferência!");
    }).catch(err => {
        alert("Erro ao copiar. Tente selecionar o texto manualmente.");
    });
}

function highlightNextMass() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let closestRow = null;
    let minDiff = Infinity;

    document.querySelectorAll('.main-row').forEach(row => {
        row.classList.remove('next-mass-highlight');
        const dateVal = row.querySelector('.date-input').value;
        if (dateVal) {
            const parts = dateVal.split('-');
            const rowDate = new Date(parts[0], parts[1] - 1, parts[2]);
            rowDate.setHours(0, 0, 0, 0);

            const diff = rowDate - today;
            if (diff >= 0 && diff < minDiff) {
                minDiff = diff;
                closestRow = row;
            }
        }
    });

    if (closestRow) {
        closestRow.classList.add('next-mass-highlight');
    }
}

function exportPDF() {
    const mes = document.getElementById('mes').value;
    const ano = document.getElementById('ano').value;
    const mesAno = `${mes} ${ano}`;
    const originalTitle = document.title;
    if (mesAno) document.title = `Escala Litúrgica - ${mesAno}`;
    window.print();
    document.title = originalTitle;
}

// --- SISTEMA DE BACKUP ---
function exportData() {
    const data = {
        escalaLiturgicaDataV2: localStorage.getItem('escalaLiturgicaDataV2'),
        eventsConfigV2: localStorage.getItem('eventsConfigV2'),
        locaisConfigV2: localStorage.getItem('locaisConfigV2'),
        rolesConfigV2: localStorage.getItem('rolesConfigV2'),
        coroinhasConfigV2: localStorage.getItem('coroinhasConfigV2'),
        cerimoniariosConfigV2: localStorage.getItem('cerimoniariosConfigV2')
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'backup_escala.json';
    link.click();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.escalaLiturgicaDataV2) localStorage.setItem('escalaLiturgicaDataV2', data.escalaLiturgicaDataV2);
            if (data.eventsConfigV2) localStorage.setItem('eventsConfigV2', data.eventsConfigV2);
            if (data.locaisConfigV2) localStorage.setItem('locaisConfigV2', data.locaisConfigV2);
            if (data.rolesConfigV2) localStorage.setItem('rolesConfigV2', data.rolesConfigV2);
            if (data.coroinhasConfigV2) localStorage.setItem('coroinhasConfigV2', data.coroinhasConfigV2);
            if (data.cerimoniariosConfigV2) localStorage.setItem('cerimoniariosConfigV2', data.cerimoniariosConfigV2);
            alert('Backup importado com sucesso! A página será recarregada.');
            location.reload();
        } catch (err) {
            alert('Erro ao importar: O arquivo JSON é inválido ou está corrompido.');
        }
    };
    reader.readAsText(file);
}

function applyWeekSeparator() {
    ['table-coroinhas', 'table-cerimoniarios'].forEach(tableId => {
        const table = document.getElementById(tableId);
        if (!table) return;
        
        table.querySelectorAll('.linha-separadora-semana').forEach(el => el.remove());

        const blocos = Array.from(table.querySelectorAll('tbody.bloco-missa'));
        let lastDate = null;
        
        blocos.forEach(bloco => {
            const dateInput = bloco.querySelector('.date-input');
            if (dateInput && dateInput.value) {
                const parts = dateInput.value.split('-');
                const currentDate = new Date(parts[0], parts[1] - 1, parts[2]);

                if (lastDate) {
                    const diffTime = Math.abs(currentDate - lastDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    // Quebra de semana se pular para Domingo (getDay === 0 e dia anterior != 0), ou mais de 6 dias de diferença
                    if ((currentDate.getDay() === 0 && lastDate.getDay() !== 0) || diffDays > 6 || (currentDate.getDay() < lastDate.getDay() && diffDays > 0)) {
                        const spacerTbody = document.createElement('tbody');
                        spacerTbody.className = 'linha-separadora-semana';
                        spacerTbody.innerHTML = '<tr><td colspan="100%"></td></tr>';
                        table.insertBefore(spacerTbody, bloco);
                    }
                }
                lastDate = currentDate;
            }
        });
    });
}
