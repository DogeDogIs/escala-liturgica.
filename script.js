// ====== SUPABASE SETUP ======
const SUPABASE_URL = 'https://xpgsrqszqwpolqlggobs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_BxpxwgM2b4HAxx9E1qHNAQ_5-pAH3Gy';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentFocusedCell = null;

// Configs Globais (Supabase)
let sysConfig = {
    eventos: [
        { nome: 'Solenidade / Festa', cor: '#FFEBEE', todos_participam: false, pintar_linha: true },
        { nome: 'Quaresma / Advento', cor: '#F3E5F5', todos_participam: false, pintar_linha: true },
        { nome: 'Semana Santa', cor: '#ffebee', todos_participam: true, pintar_linha: true }
    ],
    locais: ['Igreja Matriz', 'Capela São José'],
    nomes: [
        { nome: 'João', is_coroinha: true, is_cerimoniario: false },
        { nome: 'Maria', is_coroinha: true, is_cerimoniario: false },
        { nome: 'Marcos', is_coroinha: false, is_cerimoniario: true },
        { nome: 'Tiago', is_coroinha: false, is_cerimoniario: true }
    ],
    funcoes_extras: ['Coroinha 1', 'Sino', 'Vela 1', 'Cruz', 'Turiferário']
};

// ====== ROTEAMENTO E INICIALIZAÇÃO ======
document.addEventListener('DOMContentLoaded', async () => {
    const isLoginPage = window.location.pathname.includes('login.html');

    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) throw error;

        if (isLoginPage) {
            if (session) {
                window.location.href = 'index.html';
                return;
            }
            setupLoginForm();
        } else {
            if (!session) {
                window.location.href = 'login.html';
                return;
            }
            await loadDataFromSupabase();

            // Ativar Supabase Realtime para sincronização entre usuários
            supabaseClient.channel('custom-all-channel')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'escalas' }, (payload) => {
                    console.log('Atualização Realtime recebida na tabela escalas:', payload);
                    loadDataFromSupabase();
                })
                .subscribe();

            const activeTab = localStorage.getItem('activeTabV2') || 'tab-coroinhas';
            const tabBtn = document.querySelector(`.tab-btn[onclick*="${activeTab}"]`);
            if (tabBtn) tabBtn.click();
        }
    } catch (err) {
        console.error("Erro na verificação de sessão:", err);
        if (!isLoginPage) window.location.href = 'login.html';
    }
});

// ====== AUTENTICAÇÃO ======
function setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
                if (error) throw error;
                window.location.href = 'index.html';
            } catch (err) {
                const errDiv = document.getElementById('login-error');
                if (errDiv) {
                    errDiv.style.display = 'block';
                    errDiv.innerText = "Usuário ou senha incorretos";
                } else {
                    alert("Usuário ou senha incorretos");
                }
            }
        });
    }
}

async function logout() {
    try {
        await supabaseClient.auth.signOut();
        window.location.href = 'login.html';
    } catch (err) {
        alert("Erro ao sair do sistema.");
    }
}

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

    const validNomes = Array.isArray(sysConfig.nomes) ? sysConfig.nomes : [];
    const configList = isCoroinhas
        ? validNomes.filter(n => n && n.is_coroinha && typeof n.nome === 'string').map(n => n.nome)
        : validNomes.filter(n => n && n.is_cerimoniario && typeof n.nome === 'string').map(n => n.nome);

    document.querySelectorAll('.name-cell, .role-item').forEach(el => el.style.zIndex = '');
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
        container.style.zIndex = '99999';

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
    const defaultLocal = sysConfig.locais[0] || '';
    const cleanSelected = selectedValue ? selectedValue.replace('📍 ', '').replace('📍', '').trim() : defaultLocal;
    const effectiveSelected = sysConfig.locais.includes(cleanSelected) ? cleanSelected : defaultLocal;

    let html = '';
    sysConfig.locais.forEach((local, idx) => {
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
    renderNamesConfigList();
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
    sysConfig.eventos.forEach((ev, idx) => {
        const div = document.createElement('div');
        div.className = 'event-config-item';
        div.innerHTML = `
            <input type="color" value="${ev.cor}" onchange="sysConfig.eventos[${idx}].cor = this.value">
            <input type="text" value="${ev.nome}" placeholder="Nome do Evento" oninput="sysConfig.eventos[${idx}].nome = this.value">
            <label class="checkbox-group"><input type="checkbox" ${ev.todos_participam ? 'checked' : ''} onchange="sysConfig.eventos[${idx}].todos_participam = this.checked"> Todos</label>
            <label class="checkbox-group"><input type="checkbox" ${ev.pintar_linha ? 'checked' : ''} onchange="sysConfig.eventos[${idx}].pintar_linha = this.checked"> Pintar Linha</label>
            <button class="btn-remove-role" style="color:#d32f2f; margin-left:10px;" onclick="removeEventConfig(${idx})">✖</button>
        `;
        list.appendChild(div);
    });
}
function addNewEventConfig() { sysConfig.eventos.push({ nome: 'Novo Evento', cor: '#ffffff', todos_participam: false, pintar_linha: true }); renderEventsConfigList(); }
function removeEventConfig(idx) { if (confirm('Excluir evento?')) { sysConfig.eventos.splice(idx, 1); renderEventsConfigList(); } }

function renderLocaisConfigList() {
    const list = document.getElementById('locais-list');
    list.innerHTML = '';
    sysConfig.locais.forEach((local, idx) => {
        const div = document.createElement('div');
        div.className = 'event-config-item';
        div.innerHTML = `<input type="text" value="${local}" oninput="sysConfig.locais[${idx}] = this.value">
                         <button class="btn-remove-role" style="color:#d32f2f; margin-left:10px;" onclick="removeLocalConfig(${idx})">✖</button>`;
        list.appendChild(div);
    });
}
function addNewLocalConfig() { sysConfig.locais.push('Novo Local'); renderLocaisConfigList(); }
function removeLocalConfig(idx) { if (confirm('Excluir local?')) { sysConfig.locais.splice(idx, 1); renderLocaisConfigList(); } }

let tempCoroinhas = [];
let tempCerimoniarios = [];

function renderNamesConfigList() {
    tempCoroinhas = [];
    tempCerimoniarios = [];
    
    sysConfig.nomes.forEach(n => {
        if (n.is_coroinha) tempCoroinhas.push(n.nome);
        if (n.is_cerimoniario) tempCerimoniarios.push(n.nome);
    });
    
    renderCoroinhasList();
    renderCerimoniariosList();
}

function renderCoroinhasList() {
    const list = document.getElementById('coroinhas-config-list');
    if (!list) return;
    list.innerHTML = '';
    tempCoroinhas.forEach((nome, idx) => {
        const div = document.createElement('div');
        div.className = 'event-config-item';
        div.innerHTML = `
            <input type="text" value="${nome}" placeholder="Nome" oninput="tempCoroinhas[${idx}] = this.value" style="flex:1;">
            <button class="btn-remove-role" style="color:#d32f2f; margin-left:10px;" onclick="removeCoroinha(${idx})">✖</button>
        `;
        list.appendChild(div);
    });
}

function renderCerimoniariosList() {
    const list = document.getElementById('cerimoniarios-config-list');
    if (!list) return;
    list.innerHTML = '';
    tempCerimoniarios.forEach((nome, idx) => {
        const div = document.createElement('div');
        div.className = 'event-config-item';
        div.innerHTML = `
            <input type="text" value="${nome}" placeholder="Nome" oninput="tempCerimoniarios[${idx}] = this.value" style="flex:1;">
            <button class="btn-remove-role" style="color:#d32f2f; margin-left:10px;" onclick="removeCerimoniario(${idx})">✖</button>
        `;
        list.appendChild(div);
    });
}

function addNewCoroinha() { tempCoroinhas.push('Novo Coroinha'); renderCoroinhasList(); }
function removeCoroinha(idx) { tempCoroinhas.splice(idx, 1); renderCoroinhasList(); }

function addNewCerimoniario() { tempCerimoniarios.push('Novo Cerimoniário'); renderCerimoniariosList(); }
function removeCerimoniario(idx) { tempCerimoniarios.splice(idx, 1); renderCerimoniariosList(); }

function processNamesFromTextareas() {
    const coroinhasList = tempCoroinhas.map(n => n.trim()).filter(n => n);
    const cerimoniariosList = tempCerimoniarios.map(n => n.trim()).filter(n => n);
    
    const allNames = new Set([...coroinhasList, ...cerimoniariosList]);
    
    sysConfig.nomes = Array.from(allNames).map(name => {
        return {
            nome: name,
            is_coroinha: coroinhasList.includes(name),
            is_cerimoniario: cerimoniariosList.includes(name)
        };
    }).sort((a, b) => a.nome.localeCompare(b.nome));
}

function renderRolesConfigList() {
    const list = document.getElementById('roles-list');
    list.innerHTML = '';
    sysConfig.funcoes_extras.forEach((role, idx) => {
        const div = document.createElement('div');
        div.className = 'event-config-item';
        div.innerHTML = `<input type="text" value="${role}" oninput="sysConfig.funcoes_extras[${idx}] = this.value">
                         <button class="btn-remove-role" style="color:#d32f2f; margin-left:10px;" onclick="removeRoleConfig(${idx})">✖</button>`;
        list.appendChild(div);
    });
}
function addNewRoleConfig() { sysConfig.funcoes_extras.push('Nova Função'); renderRolesConfigList(); }
function removeRoleConfig(idx) { if (confirm('Excluir função?')) { sysConfig.funcoes_extras.splice(idx, 1); renderRolesConfigList(); } }

async function saveConfigAndClose() {
    try {
        processNamesFromTextareas();
        const mesVal = document.getElementById('select-mes') ? document.getElementById('select-mes').value : '';
        const anoVal = document.getElementById('select-ano') ? document.getElementById('select-ano').value : '';
        const { error } = await supabaseClient.from('configuracoes').update({
            eventos: sysConfig.eventos,
            locais: sysConfig.locais,
            nomes: sysConfig.nomes,
            funcoes_extras: sysConfig.funcoes_extras,
            mes_cabecalho: mesVal,
            ano_cabecalho: anoVal
        }).eq('id', 1);
        if (error) throw error;
    } catch (err) {
        console.error("Erro ao salvar config", err);
        alert("Erro ao salvar configurações na nuvem.");
    }

    document.querySelectorAll('.role-select').forEach(select => { select.innerHTML = getRoleSelectOptionsHTML(select.value); });
    updateAllLocalSelects();

    closeConfigModal();
}

// --- DROPDOWNS E EVENTOS ---
function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
    const backdrop = document.getElementById('dropdown-backdrop');
    if (backdrop) backdrop.classList.remove('show');
    document.querySelectorAll('.main-row').forEach(tr => { tr.style.zIndex = ''; tr.style.position = ''; });
}

function toggleDropdown(btn) {
    const menu = btn.nextElementSibling;
    const isShowing = menu.classList.contains('show');
    closeAllDropdowns();
    if (!isShowing) {
        const tr = btn.closest('.main-row');
        if (tr) {
            tr.style.zIndex = '999995';
            tr.style.position = 'relative';
        }
        const hasSublist = tr.nextElementSibling && tr.nextElementSibling.classList.contains('sublist-row');
        menu.innerHTML = getDropdownHTML(hasSublist);

        // Reset styles for recalculation
        menu.style.top = '';
        menu.style.bottom = '';
        menu.style.marginTop = '';
        menu.style.marginBottom = '';
        menu.style.transformOrigin = '';

        menu.classList.add('show');

        // Logic for smart positioning on PC
        if (window.innerWidth > 768) {
            const btnRect = btn.getBoundingClientRect();
            const spaceAbove = btnRect.top;
            const spaceBelow = window.innerHeight - btnRect.bottom;

            if (spaceBelow > spaceAbove) {
                // Abre para baixo
                menu.style.top = '100%';
                menu.style.bottom = 'auto';
                menu.style.marginTop = '5px';
                menu.style.marginBottom = '0';
                menu.style.transformOrigin = 'top right';
            } else {
                // Abre para cima
                menu.style.top = 'auto';
                menu.style.bottom = '100%';
                menu.style.marginTop = '0';
                menu.style.marginBottom = '5px';
                menu.style.transformOrigin = 'bottom right';
            }
        }

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
    sysConfig.eventos.forEach(ev => {
        html += `<button class="dropdown-item" onclick="applyEvent(this, '${ev.nome}')">
                    <span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${ev.cor}; margin-right:8px; border:1px solid #ccc;"></span>
                    ${ev.nome} ${ev.todos_participam ? '(Convocação)' : ''}
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
        const ev = sysConfig.eventos.find(e => e.nome === eventId);
        if (ev) {
            if (ev.pintar_linha !== false) {
                tr.style.backgroundColor = hexToRgba(ev.cor, 0.15);
            }
            tr.dataset.eventId = ev.nome;

            const badgeHtml = `<span class="event-badge" contenteditable="false" style="display:inline-block; margin-bottom:4px; padding:3px 6px; background:${ev.cor}; color:#111; font-size:0.75rem; border-radius:4px; border:1px solid rgba(0,0,0,0.1); font-weight:bold; box-shadow: inset 0 0 0 1000px ${ev.cor}; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;">${ev.nome}</span><br class="event-badge-br no-print" contenteditable="false">`;
            obsCell.insertAdjacentHTML('afterbegin', badgeHtml);

            if (ev.todos_participam) {
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
    const defaultLocal = sysConfig.locais[0] || '';
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
    sysConfig.funcoes_extras.forEach(r => {
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
    div.innerHTML = `<select class="role-select" onchange="saveData()">${getRoleSelectOptionsHTML(sysConfig.funcoes_extras[0] || 'Função')}</select> 
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
        const savedLocal = (data && data.localVal) ? data.localVal : (sysConfig.locais[0] || '');
        const cleanSaved = savedLocal.replace('📍 ', '').replace('📍', '').trim();
        const effectiveLocal = sysConfig.locais.includes(cleanSaved) ? cleanSaved : (sysConfig.locais[0] || '');
        localSelect.innerHTML = getLocalSelectOptionsHTML(effectiveLocal);
        localSelect.value = effectiveLocal;
        handleLocalChange(localSelect);
    }

    if (data) {
        if (newRow.querySelector('.date-input')) newRow.querySelector('.date-input').value = data.dateVal || '';
        if (newRow.querySelector('.data-cell')) newRow.querySelector('.data-cell').style.backgroundColor = data.dateColor || '';

        const dayCell = newRow.querySelector('.day-cell');
        if (dayCell) { dayCell.innerHTML = data.dayHtml || ''; dayCell.style.backgroundColor = data.dayColor || ''; }

        if (newRow.querySelector('.time-input')) newRow.querySelector('.time-input').value = data.timeVal || '';
        if (newRow.querySelector('.time-cell')) newRow.querySelector('.time-cell').style.backgroundColor = data.timeColor || '';

        const nameInputs = newRow.querySelectorAll('.name-input');
        if (data.names) {
            data.names.forEach((n, idx) => {
                if (nameInputs[idx]) {
                    nameInputs[idx].value = n.val || '';
                    nameInputs[idx].parentElement.style.backgroundColor = n.color || '';
                }
            });
        }

        const obsCell = newRow.querySelector('.obs-cell');
        if (obsCell) { obsCell.innerHTML = data.obsHtml || ''; obsCell.style.backgroundColor = data.obsColor || ''; }

        if (data.eventId) {
            newRow.dataset.eventId = data.eventId;
            newRow.style.backgroundColor = data.rowColor;
            newRow.dataset.wasGeneral = data.wasGeneral ? 'true' : 'false';

            const ev = sysConfig.eventos.find(e => e.nome === data.eventId);
            if (ev && obsCell && !obsCell.querySelector('.event-badge')) {
                const rgbaColor = hexToRgba(ev.cor, 0.6);
                const badgeHtml = `<span class="event-badge" contenteditable="false" style="display:inline-block; margin-bottom:4px; padding:3px 6px; background:${rgbaColor}; color:#111; font-size:0.75rem; border-radius:4px; border:1px solid rgba(0,0,0,0.1); font-weight:bold; box-shadow: inset 0 0 0 1000px ${rgbaColor}; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;">${ev.nome}</span><br class="event-badge-br no-print" contenteditable="false">`;
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

async function removeRow(btn) {
    if (confirm('Tem certeza que deseja remover esta missa?')) {
        const row = btn.closest('.main-row');
        const rowId = row.id;

        try {
            // Deleta do Supabase
            const { error } = await supabaseClient.from('escalas').delete().eq('id', rowId);
            if (error) throw error;

            // Remove do DOM
            const tbodyBloco = row.closest('.bloco-missa');
            if (tbodyBloco) {
                tbodyBloco.remove();
            } else {
                if (row.nextElementSibling && row.nextElementSibling.classList.contains('sublist-row')) row.nextElementSibling.remove();
                row.remove();
            }

            ordenarTodasTabelas();
            saveData();
        } catch (err) {
            console.error("Erro ao excluir", err);
            alert("Ocorreu um erro ao excluir a missa no sistema.");
        }
    }
}

// --- DADOS E SUPABASE CRUD ---

let inactivityTimeout = null;
let isDirty = false;

function updateTituloEscala() {
    const mesEl = document.getElementById('select-mes');
    const anoEl = document.getElementById('select-ano');
    const tituloEl = document.getElementById('titulo-escala');
    if (mesEl && anoEl && tituloEl) {
        tituloEl.textContent = `${mesEl.value} de ${anoEl.value}`;
    }
}

function saveData() {
    const mes = document.getElementById('select-mes') ? document.getElementById('select-mes').value : '';
    const ano = document.getElementById('select-ano') ? document.getElementById('select-ano').value : '';
    const mesAno = `${mes} ${ano}`;
    const printEl = document.getElementById('print-mes-ano');
    if (printEl) printEl.innerText = `${mes} de ${ano}`;
    applyWeekSeparator();

    isDirty = true;
    const saveBtn = document.getElementById('fab-manual-save');
    if (saveBtn) saveBtn.classList.add('is-dirty');

    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(async () => {
        if (isDirty) {
            await syncToSupabase();
        }
    }, 5 * 60 * 1000); // 5 minutos inativo salva automático
}

async function manualSave() {
    if (!isDirty) return;
    await syncToSupabase();
}

// Autosave instantâneo ao sair da edição
document.addEventListener('focusout', (e) => {
    setTimeout(() => {
        const activeElement = document.activeElement;
        // Se o usuário clicou fora de qualquer campo de entrada
        if (!activeElement || (!activeElement.matches('input') && !activeElement.matches('select') && !activeElement.closest('.fab-container'))) {
            if (isDirty) {
                syncToSupabase();
            }
        }
    }, 50);
});

function getTableData(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return [];
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

        const nameInputs = row.querySelectorAll('.name-cell .name-input');
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

async function syncToSupabase() {
    if (!isDirty) return;

    const saveBtn = document.getElementById('fab-manual-save');
    if (saveBtn) {
        saveBtn.classList.remove('is-dirty');
        saveBtn.classList.add('is-saving');
    }

    isDirty = false;

    const mes = document.getElementById('select-mes') ? document.getElementById('select-mes').value : '';
    const ano = document.getElementById('select-ano') ? document.getElementById('select-ano').value : '';
    const mesAno = `${mes} ${ano}`;
    
    // Atualiza automaticamente o cabeçalho nas configurações
    try {
        await supabaseClient.from('configuracoes').update({
            mes_cabecalho: mes,
            ano_cabecalho: ano
        }).eq('id', 1);
    } catch (e) {
        console.error("Erro ao salvar cabeçalho nas configurações", e);
    }

    const rowsToInsert = [];
    const rowsToUpdate = [];
    const mergedRows = {};

    const processRow = (r, tipo) => {
        let isRealId = r.id && !r.id.toString().startsWith('row_');
        let idKey = r.id;

        if (!mergedRows[idKey]) {
            mergedRows[idKey] = {
                data: r.dateVal || '2000-01-01',
                horario: r.timeVal || null,
                local: r.localVal || null,
                observacao: r.obsHtml || null,
                extras: {
                    dateColor: r.dateColor,
                    dayHtml: r.dayHtml,
                    dayColor: r.dayColor,
                    timeColor: r.timeColor,
                    obsColor: r.obsColor,
                    eventId: r.eventId,
                    rowColor: r.rowColor,
                    wasGeneral: r.wasGeneral,
                    sublist: r.sublist,
                    mesAno: mesAno
                }
            };
            if (isRealId) {
                mergedRows[idKey].id = r.id; // Mantém como string UUID
            } else {
                mergedRows[idKey].extras.tempId = idKey; // Salva o temp id para recuperar depois
            }
        }

        if (tipo === 'coroinhas') mergedRows[idKey].coroinhas = r.names;
        if (tipo === 'cerimoniarios') mergedRows[idKey].cerimoniarios = r.names;
    };

    getTableData('table-coroinhas').forEach(r => processRow(r, 'coroinhas'));
    getTableData('table-cerimoniarios').forEach(r => processRow(r, 'cerimoniarios'));

    for (const key in mergedRows) {
        const obj = mergedRows[key];
        if (!obj.coroinhas) obj.coroinhas = null;
        if (!obj.cerimoniarios) obj.cerimoniarios = null;

        if (obj.id) rowsToUpdate.push(obj);
        else rowsToInsert.push(obj);
    }

    try {
        let returnedRows = [];

        if (rowsToInsert.length > 0) {
            const { data: inserted, error: errInsert } = await supabaseClient.from('escalas').insert(rowsToInsert).select();
            if (errInsert) throw errInsert;
            if (inserted) returnedRows = returnedRows.concat(inserted);
        }

        if (rowsToUpdate.length > 0) {
            const { data: updated, error: errUpdate } = await supabaseClient.from('escalas').upsert(rowsToUpdate).select();
            if (errUpdate) throw errUpdate;
            if (updated) returnedRows = returnedRows.concat(updated);
        }

        // Atualizamos os IDs reais no DOM
        if (returnedRows.length > 0) {
            returnedRows.forEach(dbRow => {
                if (dbRow.extras && dbRow.extras.tempId) {
                    const tempId = dbRow.extras.tempId;
                    if (tempId.startsWith('row_')) {
                        const domRows = document.querySelectorAll(`[id="${tempId}"]`);
                        domRows.forEach(domRow => {
                            domRow.id = dbRow.id; // Atualiza com UUID
                        });
                    }
                }
            });
        }
    } catch (err) {
        console.error("Erro no Upsert:", err);
        isDirty = true;
        if (saveBtn) {
            saveBtn.classList.add('is-dirty');
            const errorMsg = err.message || err.details || JSON.stringify(err);
            alert("Falha no autosave. Detalhe do banco: " + errorMsg);
        }
    }

    if (saveBtn) saveBtn.classList.remove('is-saving');
}

async function loadDataFromSupabase() {
    try {
        // Busca Configurações
        const { data: configData, error: configError } = await supabaseClient.from('configuracoes').select('*').eq('id', 1).single();
        if (!configError && configData) {
            if (Array.isArray(configData.eventos)) sysConfig.eventos = configData.eventos;
            if (Array.isArray(configData.locais)) sysConfig.locais = configData.locais;
            if (Array.isArray(configData.nomes)) sysConfig.nomes = configData.nomes;
            if (Array.isArray(configData.funcoes_extras)) sysConfig.funcoes_extras = configData.funcoes_extras;
            
            const mesEl = document.getElementById('select-mes');
            const anoEl = document.getElementById('select-ano');
            if (mesEl && configData.mes_cabecalho) mesEl.value = configData.mes_cabecalho;
            if (anoEl && configData.ano_cabecalho) anoEl.value = configData.ano_cabecalho;
            updateTituloEscala();
        } else if (configError && configError.code === 'PGRST116') {
            await supabaseClient.from('configuracoes').insert([{ id: 1, ...sysConfig }]);
        }

        const { data: escalas, error } = await supabaseClient.from('escalas').select('*').order('data', { ascending: true });
        if (error) throw error;

        document.querySelectorAll('#table-coroinhas tbody.bloco-missa').forEach(tb => tb.remove());
        document.querySelectorAll('#table-cerimoniarios tbody.bloco-missa').forEach(tb => tb.remove());
        document.querySelectorAll('.linha-separadora-semana').forEach(row => row.remove());

        let latestMesAno = null;

        if (escalas && escalas.length > 0) {
            escalas.forEach(row => {
                const rowData = row.extras || {};
                rowData.id = row.id;
                if (row.data) rowData.dateVal = row.data;
                if (row.horario) rowData.timeVal = row.horario;
                if (row.local) rowData.localVal = row.local;
                if (row.observacao) rowData.obsHtml = row.observacao;
                if (rowData.mesAno && !latestMesAno) latestMesAno = rowData.mesAno;

                if (row.coroinhas) {
                    const rowDataCor = { ...rowData, names: row.coroinhas };
                    addRow('table-coroinhas', rowDataCor);
                }

                if (row.cerimoniarios) {
                    const rowDataCer = { ...rowData, names: row.cerimoniarios };
                    addRow('table-cerimoniarios', rowDataCer);
                }
            });
        }

        if (latestMesAno) {
            const printEl = document.getElementById('print-mes-ano');
            if (printEl) {
                const mes = document.getElementById('select-mes') ? document.getElementById('select-mes').value : '';
                const ano = document.getElementById('select-ano') ? document.getElementById('select-ano').value : '';
                printEl.innerText = `${mes} de ${ano}`;
            }
        } else {
            const mes = document.getElementById('select-mes') ? document.getElementById('select-mes').value : '';
            const ano = document.getElementById('select-ano') ? document.getElementById('select-ano').value : '';
            const printEl = document.getElementById('print-mes-ano');
            if (printEl) printEl.innerText = `${mes} de ${ano}`;
        }

        highlightNextMass();
        ordenarTodasTabelas();
    } catch (err) {
        console.error(err);
        alert("Erro ao carregar dados do Supabase. A tabela estará vazia.");
    }
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
    const mes = document.getElementById('select-mes').value;
    const ano = document.getElementById('select-ano').value;
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
            const defaultLocal = sysConfig.locais[0] || '';
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
    const mes = document.getElementById('select-mes').value;
    const ano = document.getElementById('select-ano').value;
    const mesAno = `${mes} de ${ano}`;
    const originalTitle = document.title;
    if (mesAno) document.title = `Escala Litúrgica - ${mesAno}`;
    window.print();
    document.title = originalTitle;
}

// --- SISTEMA DE BACKUP ---
function exportData() {
    const data = {
        configuracoes: sysConfig,
        coroinhas: getTableData('table-coroinhas'),
        cerimoniarios: getTableData('table-cerimoniarios')
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'backup_escala_supabase.json';
    link.click();
}

async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.configuracoes) {
                await supabaseClient.from('configuracoes').update({
                    eventos: data.configuracoes.eventos,
                    locais: data.configuracoes.locais,
                    nomes: data.configuracoes.nomes,
                    funcoes_extras: data.configuracoes.funcoes_extras
                }).eq('id', 1);
            }
            alert('Backup importado para a nuvem com sucesso! A página será recarregada.');
            location.reload();
        } catch (err) {
            alert('Erro ao importar: O arquivo JSON é inválido ou ocorreu um erro de conexão.');
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
