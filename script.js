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

let isAdmin = false;
let isRendering = false;
let authInitialized = false;

// ====== ROTEAMENTO E INICIALIZAÇÃO ======
document.addEventListener('DOMContentLoaded', () => {
    const isLoginPage = window.location.pathname.includes('login.html');

    // Listener de estado de autenticação (Garante carregamento correto em Produção/GitHub Pages)
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {

            if (isLoginPage) {
                if (session) {
                    window.location.href = 'index.html';
                    return;
                }
                setupLoginForm();
                return;
            }

            // Evita duplo disparo se o estado de admin for o mesmo
            const newIsAdmin = !!session;
            if (authInitialized && isAdmin === newIsAdmin) return;

            isAdmin = newIsAdmin;
            authInitialized = true;

            const userDisplay = document.getElementById('user-display');
            if (isAdmin) {
                if (userDisplay && session.user) {
                    userDisplay.textContent = session.user.email;
                }
            } else {
                if (userDisplay) {
                    userDisplay.textContent = 'Visitante';
                }
                document.body.classList.add('visitante-mode');
                applyVisitanteMode();
            }

            try {
                await carregarConfiguracoes();
                await carregarEscalas();
            } catch (err) {
                console.error("Erro na inicialização:", err);
            }
        }
    });

    if (!isLoginPage) {
        // Ativar Supabase Realtime para sincronização entre usuários
        supabaseClient.channel('custom-all-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'escalas' }, (payload) => {
                console.log('Atualização Realtime recebida na tabela escalas:', payload);
                carregarEscalas();
            })
            .subscribe();

        const activeTab = localStorage.getItem('activeTabV2') || 'tab-coroinhas';
        const tabBtn = document.querySelector(`.tab-btn[onclick*="${activeTab}"]`);
        if (tabBtn) tabBtn.click();

        // Global Search Listener
        const searchInput = document.getElementById('global-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerms = e.target.value.toLowerCase().trim().split(' ').filter(t => t.length > 0);
                document.querySelectorAll('.main-row').forEach(row => {
                    let match = false;
                    const rowText = row.textContent.toLowerCase();

                    if (searchTerms.length === 0) {
                        match = true;
                    } else {
                        match = searchTerms.every(term => rowText.includes(term));
                    }

                    row.style.display = match ? '' : 'none';
                    // also toggle the sublist if it exists
                    const next = row.nextElementSibling;
                    if (next && next.classList.contains('sublist-row')) {
                        next.style.display = match ? '' : 'none';
                    }
                });
            });
        }
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
        window.location.reload();
    } catch (err) {
        alert("Erro ao sair do sistema.");
    }
}

function applyVisitanteMode() {
    const logoutBtn = document.getElementById('fab-logout');
    if (logoutBtn) {
        logoutBtn.style.display = '';
        logoutBtn.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>
            Fazer Login
        `;
        logoutBtn.onclick = () => window.location.href = 'login.html';
        logoutBtn.classList.remove('bg-red-50', 'text-red-600', 'hover:bg-red-100');
        logoutBtn.classList.add('bg-blue-50', 'text-blue-600', 'hover:bg-blue-100');
    }
}

// ====== MOBILE SIDEBAR ======
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    const isOpen = sidebar.classList.contains('translate-x-0');

    if (isOpen) {
        // Fechar
        sidebar.classList.remove('translate-x-0');
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('opacity-0');
        setTimeout(() => overlay.classList.add('hidden'), 300); // aguarda animação do tailwind (duration-300)
    } else {
        // Abrir
        sidebar.classList.remove('-translate-x-full');
        sidebar.classList.add('translate-x-0');
        overlay.classList.remove('hidden');
        // Pequeno delay para a transição de opacidade do Tailwind (opacity-0 -> opacity-100)
        setTimeout(() => overlay.classList.remove('opacity-0'), 10);
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
    if (colorable) {
        if (currentFocusedCell) currentFocusedCell.classList.remove('selected-cell');
        currentFocusedCell = colorable;
        currentFocusedCell.classList.add('selected-cell');
    } else if (!e.target.closest('.color-picker-container')) {
        if (currentFocusedCell) {
            currentFocusedCell.classList.remove('selected-cell');
            currentFocusedCell = null;
        }
    }

    // Fechar autocomplete se clicar fora do container do input
    if (!e.target.closest('.name-cell') && !e.target.closest('.role-item') && !e.target.closest('.autocomplete-list')) {
        document.querySelectorAll('.autocomplete-list.show').forEach(ul => {
            ul.classList.remove('show');
            const container = ul.closest('.name-cell') || ul.closest('.role-item');
            if (container) container.style.zIndex = '';
            const tr = ul.closest('tr');
            if (tr) tr.style.zIndex = '';
        });
    }

    // Fechar dropdown de ações se clicar fora
    if (!e.target.closest('.dropdown') && !e.target.closest('.dropdown-menu')) {
        document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
        const backdrop = document.getElementById('dropdown-backdrop');
        if (backdrop) backdrop.classList.remove('show');
    }
});

// Fechar dropdowns e autocomplete se o usuário rolar a página ou a tabela (mas permitir rolar a própria lista)
window.addEventListener('scroll', (e) => {
    if (e.target && e.target.closest && (e.target.closest('.autocomplete-list') || e.target.closest('.dropdown-menu'))) {
        return;
    }
    document.querySelectorAll('.autocomplete-list.show, .dropdown-menu.show').forEach(el => el.classList.remove('show'));
    const backdrop = document.getElementById('dropdown-backdrop');
    if (backdrop) backdrop.classList.remove('show');
}, true);


function calculateDayOfWeek(inputElement) {
    const dateStr = inputElement.value;
    if (!dateStr) return;
    const parts = dateStr.split('-');
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const tr = inputElement.closest('tr');
    const dayCell = tr.querySelector('.day-cell');
    if (dayCell) dayCell.innerText = dias[date.getDay()];

    const rowId = tr.id;
    ordenarTodasTabelas();

    if (rowId) destacarLinha(rowId);
}

function destacarLinha(rowId, shouldScroll = true) {
    setTimeout(() => {
        const rows = document.querySelectorAll(`[id="${rowId}"]`);
        rows.forEach(row => {
            if (row.closest('.tab-content.active') && shouldScroll) {
                row.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            }
            row.classList.add('linha-destaque');
            setTimeout(() => {
                row.classList.remove('linha-destaque');
            }, 3000);
        });
    }, 100); // Dá tempo do DOM renderizar a nova ordem
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
    const tr = input.closest('tr');
    const isCoroinhas = table ? table.id.includes('coroinhas') : true;

    let currentDay = '';
    if (tr) {
        const dayCell = tr.querySelector('.day-cell');
        if (dayCell) currentDay = dayCell.innerText.trim();
    }

    const validNomes = Array.isArray(sysConfig.nomes) ? sysConfig.nomes : [];
    const availableServers = validNomes.filter(n => {
        if (!n || typeof n.nome !== 'string') return false;

        // Verifica a função
        const hasRole = isCoroinhas ? n.is_coroinha : n.is_cerimoniario;
        if (!hasRole) return false;

        // Verifica indisponibilidade
        if (currentDay && Array.isArray(n.dias_indisponiveis) && n.dias_indisponiveis.includes(currentDay)) {
            return false;
        }

        return true;
    });

    const configList = availableServers.map(n => n.nome);

    document.querySelectorAll('.name-cell, .role-item').forEach(el => {
        el.style.zIndex = '';
        el.style.position = '';
    });
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

        // Usar posicionamento fixed para escapar totalmente do container da tabela (overflow)
        const inputRect = input.getBoundingClientRect();
        ul.style.position = 'fixed';
        ul.style.left = inputRect.left + 'px';
        ul.style.width = inputRect.width + 'px';
        ul.style.zIndex = '999999';

        const ulHeight = ul.offsetHeight || 180;
        const spaceBelow = window.innerHeight - inputRect.bottom;
        const spaceAbove = inputRect.top;

        if (spaceBelow < ulHeight && spaceAbove > spaceBelow) {
            ul.style.top = 'auto';
            ul.style.bottom = (window.innerHeight - inputRect.top + 4) + 'px';
        } else {
            ul.style.top = (inputRect.bottom + 4) + 'px';
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

    container.style.zIndex = '';
    const tr = container.closest('tr');
    if (tr) tr.style.zIndex = '';

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
    updateFiltrosEscalaLocais();
}

// --- GERENCIAMENTO DE SERVIDORES (NOVO) ---
let editingServidorId = null;

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

async function salvarNovoServidor() {
    const nome = document.getElementById('novo-servidor-nome').value.trim();
    const dataNascimento = document.getElementById('novo-servidor-data-nascimento').value;
    const idadeStr = document.getElementById('novo-servidor-idade').value;
    const funcao = document.getElementById('novo-servidor-funcao').value;
    const tags = document.getElementById('novo-servidor-tags').value;

    const responsavelNome = document.getElementById('novo-servidor-responsavel').value.trim();
    const responsavelTel = document.getElementById('novo-servidor-tel-responsavel').value.trim();
    const servidorTel = document.getElementById('novo-servidor-tel-proprio').value.trim();

    const enderecoRua = document.getElementById('novo-servidor-endereco-rua').value.trim();
    const enderecoBairro = document.getElementById('novo-servidor-endereco-bairro').value.trim();
    const enderecoCidade = document.getElementById('novo-servidor-endereco-cidade').value.trim();

    const autorizaImagem = document.getElementById('novo-servidor-autoriza-imagem').checked;
    const autorizaEventos = document.getElementById('novo-servidor-autoriza-eventos').checked;

    const observacoes = document.getElementById('novo-servidor-observacoes').value.trim();

    if (!nome) {
        alert("Por favor, preencha o nome do servidor.");
        return;
    }

    const checkboxes = document.querySelectorAll('.cb-dia-indisponivel');
    const diasIndisponiveis = [];
    checkboxes.forEach(cb => {
        if (cb.checked) diasIndisponiveis.push(cb.value);
    });

    const tagsArray = tags.split(',').map(t => t.trim()).filter(t => t !== "");

    if (!Array.isArray(sysConfig.nomes)) sysConfig.nomes = [];

    const serverData = {
        nome: nome,
        is_coroinha: funcao === 'coroinha',
        is_cerimoniario: funcao === 'cerimoniario',
        data_nascimento: dataNascimento || null,
        idade: dataNascimento ? calcularIdadeNumber(dataNascimento) : (idadeStr ? parseInt(idadeStr) : null),
        tags: tagsArray,
        dias_indisponiveis: diasIndisponiveis,
        responsavel_nome: responsavelNome,
        responsavel_telefone: responsavelTel,
        servidor_telefone: servidorTel,
        endereco_rua: enderecoRua,
        endereco_bairro: enderecoBairro,
        endereco_cidade: enderecoCidade,
        autoriza_imagem: autorizaImagem,
        autoriza_eventos: autorizaEventos,
        observacoes: observacoes
    };

    if (editingServidorId) {
        // Edit mode
        const serverIndex = sysConfig.nomes.findIndex(n => n.id === editingServidorId);
        if (serverIndex !== -1) {
            sysConfig.nomes[serverIndex] = {
                ...sysConfig.nomes[serverIndex],
                ...serverData
            };
        }
    } else {
        // Add mode
        serverData.id = generateUUID();
        sysConfig.nomes.push(serverData);
    }

    sysConfig.nomes.sort((a, b) => a.nome.localeCompare(b.nome));

    try {
        const { error } = await supabaseClient.from('configuracoes').update({
            nomes: sysConfig.nomes
        }).eq('id', 1);
        if (error) throw error;

        alert(editingServidorId ? "Servidor atualizado com sucesso!" : "Servidor cadastrado com sucesso!");
        fecharModalServidor();
        aplicarFiltrosServidores(); // Ao invés de apenas renderizar, reaplica filtros
    } catch (err) {
        console.error("Erro ao salvar servidor:", err);
        alert("Erro ao salvar no banco de dados.");
    }
}

function editarServidor(id) {
    const servidor = sysConfig.nomes.find(n => n.id === id);
    if (!servidor) return;

    editingServidorId = id;

    // Popula modal
    document.getElementById('modal-servidor-titulo').innerText = 'Editar Servidor';
    document.getElementById('btn-salvar-servidor-text').innerText = 'Salvar Edição';

    document.getElementById('novo-servidor-nome').value = servidor.nome || '';

    document.getElementById('novo-servidor-data-nascimento').value = servidor.data_nascimento || '';
    if (servidor.data_nascimento) {
        calcularIdadeInput();
    } else {
        document.getElementById('novo-servidor-idade').value = servidor.idade ? `${servidor.idade} anos` : '';
    }

    document.getElementById('novo-servidor-funcao').value = servidor.is_cerimoniario ? 'cerimoniario' : 'coroinha';
    document.getElementById('novo-servidor-tags').value = servidor.tags ? servidor.tags.join(', ') : '';

    document.getElementById('novo-servidor-responsavel').value = servidor.responsavel_nome || '';
    document.getElementById('novo-servidor-tel-responsavel').value = servidor.responsavel_telefone || '';
    document.getElementById('novo-servidor-tel-proprio').value = servidor.servidor_telefone || '';

    document.getElementById('novo-servidor-endereco-rua').value = servidor.endereco_rua || '';
    document.getElementById('novo-servidor-endereco-bairro').value = servidor.endereco_bairro || '';
    document.getElementById('novo-servidor-endereco-cidade').value = servidor.endereco_cidade || '';

    document.getElementById('novo-servidor-autoriza-imagem').checked = !!servidor.autoriza_imagem;
    document.getElementById('novo-servidor-autoriza-eventos').checked = !!servidor.autoriza_eventos;

    document.getElementById('novo-servidor-observacoes').value = servidor.observacoes || '';

    // Checkboxes de indisponibilidade
    const checkboxes = document.querySelectorAll('.cb-dia-indisponivel');
    checkboxes.forEach(cb => {
        cb.checked = (servidor.dias_indisponiveis || []).includes(cb.value);
    });

    if (typeof alternarAbaServidor === 'function') alternarAbaServidor('dados');

    const modal = document.getElementById('modal-novo-servidor');
    if (modal) modal.classList.remove('hidden');
}

async function excluirServidor(id) {
    const servidor = sysConfig.nomes.find(n => n.id === id);
    if (!servidor) return;

    if (confirm(`Tem certeza que deseja excluir o servidor "${servidor.nome}"? Esta ação não pode ser desfeita.`)) {
        sysConfig.nomes = sysConfig.nomes.filter(n => n.id !== id);

        try {
            const { error } = await supabaseClient.from('configuracoes').update({
                nomes: sysConfig.nomes
            }).eq('id', 1);
            if (error) throw error;

            aplicarFiltrosServidores(); // Reaplica filtros na lista atualizada
        } catch (err) {
            console.error("Erro ao excluir servidor:", err);
            alert("Erro ao excluir no banco de dados.");
        }
    }
}

function renderServidoresCadastrados(listaCustom = null) {
    const tbody = document.getElementById('table-servidores-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Se não foi passada uma lista filtrada customizada, aplicamos os filtros atuais do DOM
    const lista = listaCustom !== null ? listaCustom : (Array.isArray(sysConfig.nomes) ? sysConfig.nomes : []);

    if (!Array.isArray(lista) || lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-slate-500 text-sm italic">Nenhum servidor encontrado.</td></tr>';
        return;
    }

    lista.forEach(n => {
        const funcaoStr = n.is_coroinha ? 'Coroinha' : (n.is_cerimoniario ? 'Cerimoniário' : 'Outro');
        const badgeColor = n.is_coroinha ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700';

        const tagsHtml = (n.tags && n.tags.length > 0)
            ? n.tags.map(t => `<span class="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs border border-slate-200 font-medium">${t}</span>`).join('')
            : '<span class="text-xs text-gray-400">-</span>';

        const diasStr = (n.dias_indisponiveis && n.dias_indisponiveis.length > 0)
            ? `<span class="text-xs text-red-500 font-medium">Não pode: ${n.dias_indisponiveis.join(', ')}</span>`
            : `<span class="text-xs text-green-600 font-medium">Livre todos os dias</span>`;

        tbody.innerHTML += `
            <tr class="hover:bg-gray-50/80 transition-colors">
                <td class="p-4">
                    <div class="font-bold text-slate-800">${n.nome}</div>
                    <span class="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${badgeColor}">${funcaoStr}</span>
                </td>
                <td class="p-4 text-sm text-slate-600">${n.idade ? n.idade + ' anos' : '-'}</td>
                <td class="p-4"><div class="flex flex-wrap gap-1">${tagsHtml}</div></td>
                <td class="p-4">${diasStr}</td>
                <td class="p-4 text-center">
                    <div class="flex items-center justify-center gap-2">
                        <button onclick="editarServidor('${n.id}')" class="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors" title="Editar">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                        <button onclick="excluirServidor('${n.id}')" class="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors" title="Excluir">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
}

function aplicarFiltrosServidores() {
    if (!Array.isArray(sysConfig.nomes)) {
        renderServidoresCadastrados([]);
        return;
    }

    const nomeTerm = (document.getElementById('filtro-servidor-nome')?.value || '').toLowerCase().trim();
    const funcaoVal = document.getElementById('filtro-servidor-funcao')?.value || '';
    const tagTerm = (document.getElementById('filtro-servidor-tag')?.value || '').toLowerCase().trim();
    const idadeVal = document.getElementById('filtro-servidor-idade')?.value || '';
    const indisponibilidadeVal = document.getElementById('filtro-servidor-indisponibilidade')?.value || '';

    const filtrados = sysConfig.nomes.filter(n => {
        if (!n) return false;

        // Filtro por Nome
        if (nomeTerm && (!n.nome || !n.nome.toLowerCase().includes(nomeTerm))) {
            return false;
        }

        // Filtro por Função (Coroinha / Cerimoniário)
        if (funcaoVal === 'coroinha' && !n.is_coroinha) return false;
        if (funcaoVal === 'cerimoniario' && !n.is_cerimoniario) return false;

        // Filtro por Tag / Especialidade
        if (tagTerm) {
            const hasTagMatch = Array.isArray(n.tags) && n.tags.some(t => t.toLowerCase().includes(tagTerm));
            if (!hasTagMatch) return false;
        }

        // Filtro por Faixa de Idade
        if (idadeVal) {
            const idade = n.idade ? parseInt(n.idade) : null;
            if (idade === null) return false;
            if (idadeVal === '0-12' && idade > 12) return false;
            if (idadeVal === '13-17' && (idade < 13 || idade > 17)) return false;
            if (idadeVal === '18+' && idade < 18) return false;
        }

        // Filtro por Indisponibilidade
        if (indisponibilidadeVal) {
            const dias = Array.isArray(n.dias_indisponiveis) ? n.dias_indisponiveis : [];
            if (indisponibilidadeVal === 'livre' && dias.length > 0) return false;
            if (indisponibilidadeVal === 'indisponivel' && dias.length === 0) return false;
            if (indisponibilidadeVal !== 'livre' && indisponibilidadeVal !== 'indisponivel') {
                if (!dias.includes(indisponibilidadeVal)) return false;
            }
        }

        return true;
    });

    renderServidoresCadastrados(filtrados);
}

function limparFiltrosServidores() {
    if (document.getElementById('filtro-servidor-nome')) document.getElementById('filtro-servidor-nome').value = '';
    if (document.getElementById('filtro-servidor-funcao')) document.getElementById('filtro-servidor-funcao').value = '';
    if (document.getElementById('filtro-servidor-tag')) document.getElementById('filtro-servidor-tag').value = '';
    if (document.getElementById('filtro-servidor-idade')) document.getElementById('filtro-servidor-idade').value = '';
    if (document.getElementById('filtro-servidor-indisponibilidade')) document.getElementById('filtro-servidor-indisponibilidade').value = '';
    aplicarFiltrosServidores();
}

// --- MODAL CONFIG ---
function openConfigModal() {
    closeAllDropdowns();
    document.querySelectorAll('.autocomplete-list.show').forEach(ul => ul.classList.remove('show'));
    document.querySelectorAll('.name-cell, .role-item').forEach(el => el.style.zIndex = '');
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
    document.querySelectorAll('.autocomplete-list').forEach(ul => ul.classList.remove('show'));
    const backdrop = document.getElementById('dropdown-backdrop');
    if (backdrop) backdrop.classList.remove('show');
    document.querySelectorAll('tr, .main-row, .sublist-row, .name-cell, .role-item, .dropdown').forEach(el => {
        el.style.zIndex = '';
        el.style.position = '';
    });
}

function toggleDropdown(btn) {
    const menu = btn.nextElementSibling;
    const isShowing = menu.classList.contains('show');
    closeAllDropdowns();
    if (!isShowing) {
        const tr = btn.closest('tr');
        if (tr) {
            tr.style.zIndex = '999999';
            tr.style.position = 'relative';
        }
        const dropdownContainer = btn.closest('.dropdown') || btn.parentElement;
        if (dropdownContainer) {
            dropdownContainer.style.zIndex = '999999';
            dropdownContainer.style.position = 'relative';
        }

        const hasSublist = tr ? (tr.nextElementSibling && tr.nextElementSibling.classList.contains('sublist-row')) : false;
        menu.innerHTML = getDropdownHTML(hasSublist);

        // Reset styles for recalculation
        menu.style.top = '';
        menu.style.bottom = '';
        menu.style.marginTop = '';
        menu.style.marginBottom = '';
        menu.style.transformOrigin = '';

        menu.classList.add('show');

        // Usar fixed positioning para escapar do container overflow da tabela
        const btnRect = btn.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.zIndex = '999999';

        const menuWidth = 224; // w-56 is 224px
        menu.style.left = Math.max(10, btnRect.right - menuWidth) + 'px';

        const menuHeight = menu.offsetHeight || 200;
        const spaceBelow = window.innerHeight - btnRect.bottom;
        const spaceAbove = btnRect.top;

        if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
            // Abre para cima
            menu.style.top = 'auto';
            menu.style.bottom = (window.innerHeight - btnRect.top + 4) + 'px';
            menu.style.transformOrigin = 'bottom right';
        } else {
            // Abre para baixo
            menu.style.top = (btnRect.bottom + 4) + 'px';
            menu.style.bottom = 'auto';
            menu.style.transformOrigin = 'top right';
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

    html += `<div class="border-t border-slate-100 my-1 pt-1"></div>`;
    html += `<button class="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded flex items-center gap-2 transition-colors" onclick="applyEvent(this, null)">↺ Remover Evento (Restaurar Padrão)</button>`;

    html += `<hr><div class="dropdown-header">Opções de Linha:</div>`;
    html += `<button class="dropdown-item" onclick="abrirModalPintura(this)">🎨 Pintar Células</button>`;

    html += `<hr><div class="dropdown-header">Sub-lista de Funções:</div>`;
    html += `<div class="relative ml-2 pl-3 border-l-2 border-slate-200 space-y-1">
                <button class="w-full text-left text-slate-600 hover:text-blue-700 hover:bg-blue-50/60 rounded px-2 py-1.5 transition-colors text-sm font-medium" onclick="toggleSublist(this)">
                    ${hasSublist ? '➖ Ocultar Sub-lista' : '➕ Exibir Sub-lista'}
                </button>
             </div>`;
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
    const nameCells = Array.from(tr.cells).filter(c => c.classList.contains('name-cell'));
    if (nameCells.length > 0) {
        tr.cells[4].colSpan = nameCells.length;
        for (let i = 1; i < nameCells.length; i++) {
            tr.cells[4 + i].style.display = 'none';
        }
        tr.cells[4].querySelector('.name-input').style.display = 'none';
        if (!tr.cells[4].querySelector('.conv-text')) {
            tr.cells[4].insertAdjacentHTML('beforeend', '<span class="conv-text" style="font-weight:bold; color:#d97706;">TODOS NECESSÁRIOS</span>');
        }
        tr.cells[4].style.backgroundColor = "rgba(255, 193, 7, 0.15)";
    }
}

function removeGeneralDOM(tr, type) {
    const nameCells = Array.from(tr.cells).filter(c => c.classList.contains('name-cell'));
    if (nameCells.length > 0) {
        tr.cells[4].colSpan = 1;
        for (let i = 1; i < nameCells.length; i++) {
            tr.cells[4 + i].style.display = '';
        }
        tr.cells[4].querySelector('.name-input').style.display = '';
        const txt = tr.cells[4].querySelector('.conv-text');
        if (txt) txt.remove();
        tr.cells[4].style.backgroundColor = '';
    }
    const obsCell = tr.querySelector('.obs-cell');
    if (obsCell) {
        const warn = obsCell.querySelector('.conv-obs-warn');
        if (warn) warn.remove();
        else obsCell.innerHTML = obsCell.innerHTML.replace(/<strong class="conv-obs-warn".*?<\/strong>(<br>)?/, '').replace(/<span class="conv-obs-warn".*?<\/span>\s?/, '');
    }
}

function getEventBadgeHTML(ev) {
    const corH = ev.cor || '#3b82f6';
    const bgRgba = hexToRgba(corH, 0.18);
    const borderRgba = hexToRgba(corH, 0.5);
    return `<span class="event-badge" contenteditable="false" style="display:inline-flex; align-items:center; margin-bottom:4px; padding:3px 8px; background-color:${bgRgba}; color:#1e293b; font-size:0.75rem; border-radius:9999px; border:1px solid ${borderRgba}; font-weight:700; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:${corH}; margin-right:6px; flex-shrink:0;"></span>${ev.nome}</span><br class="event-badge-br no-print" contenteditable="false">`;
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
    tr.style.borderLeft = '';
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
            const corH = ev.cor || '#3b82f6';
            if (ev.pintar_linha !== false) {
                // Apply subtle row background and thick left border
                tr.style.backgroundColor = hexToRgba(corH, 0.12);
                tr.style.borderLeft = `4px solid ${corH}`;
            }
            tr.dataset.eventId = ev.nome;

            // Pill/Badge styling with color dot and valid RGBA background
            const badgeHtml = getEventBadgeHTML(ev);
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
    syncToSupabase();
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

    const defaultRoles = type === 'coroinhas' ? ['Coroinha 1', 'Coroinha 2'] : ['Cruciferário', 'Cerimonialista'];
    let rolesData = existingData || defaultRoles.map(r => ({ name: r, val: '' }));

    if (!isAdmin) {
        let html = `<td colspan="${colsCount}">
        <div class="sublist-container w-full bg-slate-50 border border-slate-200 rounded-lg p-4 mt-3 mb-4 shadow-inner">
            <div class="flex justify-between items-center border-b border-slate-200 pb-2 mb-3">
                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Missa - Definição de Funções</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">`;

        rolesData.forEach(r => {
            const valSafe = r.val.trim();
            if (valSafe === '') return;
            html += `<div class="role-item relative flex items-center gap-2 bg-white border border-slate-200 p-2 rounded-md shadow-sm">
                        <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">${r.name}</span>
                        <span class="text-sm font-semibold text-slate-700 ml-2">${valSafe}</span>
                     </div>`;
        });

        html += `</div></div></td>`;
        subTr.innerHTML = html;
        mainRow.parentNode.insertBefore(subTr, mainRow.nextSibling);
        return;
    }

    let html = `<td colspan="${colsCount}">
        <div class="sublist-container w-full bg-slate-50 border border-slate-200 rounded-lg p-4 mt-3 mb-4 shadow-inner">
            <div class="flex justify-between items-center border-b border-slate-200 pb-2 mb-3">
                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Missa - Definição de Funções</span>
                <button class="flex items-center gap-1 text-xs text-slate-600 hover:text-blue-600 no-print" onclick="toggleSublistFullscreen(this)">🔍 Tela Cheia</button>
            </div>
            <div class="sublist-roles grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">`;

    rolesData.forEach(r => {
        const valSafe = r.val.replace(/"/g, '&quot;');
        html += `<div class="role-item relative flex items-center gap-2 bg-white border border-slate-200 p-2 rounded-md shadow-sm">
                    <select class="role-select text-xs font-semibold text-slate-700 whitespace-nowrap bg-transparent border-0 p-0 focus:ring-0 cursor-pointer" onchange="saveData()">${getRoleSelectOptionsHTML(r.name)}</select> 
                    <input type="text" class="colorable name-input role-val text-xs border border-slate-300 rounded px-2 py-1.5 w-full focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" value="${valSafe}" oninput="handleNameInput(this); saveData();" onfocus="handleNameInput(this)" placeholder="Nome">
                    <button class="text-slate-400 hover:text-rose-500 font-bold px-1 cursor-pointer no-print" onclick="removeRole(this)">&times;</button>
                 </div>`;
    });
    html += `</div><button class="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-100 px-3 py-1.5 rounded-md mt-4 transition-colors cursor-pointer no-print" onclick="addDynamicRole(this)">+ Adicionar Função</button></div></td>`;

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
    div.className = 'role-item relative flex items-center gap-2 bg-white border border-slate-200 p-2 rounded-md shadow-sm';
    div.innerHTML = `<select class="role-select text-xs font-semibold text-slate-700 whitespace-nowrap bg-transparent border-0 p-0 focus:ring-0 cursor-pointer" onchange="saveData()">${getRoleSelectOptionsHTML(sysConfig.funcoes_extras[0] || 'Função')}</select> 
                     <input type="text" class="colorable name-input role-val text-xs border border-slate-300 rounded px-2 py-1.5 w-full focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" oninput="handleNameInput(this); saveData();" onfocus="handleNameInput(this)" placeholder="Nome">
                     <button class="text-slate-400 hover:text-rose-500 font-bold px-1 cursor-pointer no-print" onclick="removeRole(this)">&times;</button>`;
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
            newRow.dataset.wasGeneral = data.wasGeneral ? 'true' : 'false';

            const ev = sysConfig.eventos.find(e => e.nome === data.eventId);
            if (ev) {
                const corH = ev.cor || '#3b82f6';
                if (ev.pintar_linha !== false) {
                    newRow.style.backgroundColor = hexToRgba(corH, 0.12);
                    newRow.style.borderLeft = `4px solid ${corH}`;
                }
                if (obsCell && !obsCell.querySelector('.event-badge')) {
                    const badgeHtml = getEventBadgeHTML(ev);
                    obsCell.insertAdjacentHTML('afterbegin', badgeHtml);
                }
            } else if (data.rowColor) {
                newRow.style.backgroundColor = data.rowColor;
            }
            if (data.wasGeneral) applyGeneralDOM(newRow, type);
        }

        if (data.coresCelulas) {
            newRow.dataset.coresCelulas = JSON.stringify(data.coresCelulas);
            // Vai aguardar ser injetado no DOM, a função aplicarCoresCelulas será chamada no final.
        }
    }

    tbodyBloco.appendChild(newRow);
    table.appendChild(tbodyBloco);
    if (data && data.sublist) createSublist(newRow, type, data.sublist);

    if (data && data.coresCelulas) {
        aplicarCoresCelulas(newRow, data.coresCelulas);
    }

    if (!data) {
        saveData();
        destacarLinha(newRow.id, false);
    }
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
    if (!isAdmin) return;
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
    const btn = document.getElementById('fab-manual-save');
    if (!btn || btn.disabled) return;
    
    const originalHtml = btn.innerHTML;
    
    // Animação de loading (Spinner)
    btn.disabled = true;
    btn.innerHTML = `<svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Salvando...`;

    // Se houver mudanças pendentes, envia. Senão apenas simula para dar feedback visual.
    if (isDirty) {
        await syncToSupabase();
    } else {
        await new Promise(r => setTimeout(r, 400));
    }

    // Feedback de Sucesso (Verdinho)
    btn.classList.replace('bg-blue-600', 'bg-emerald-500');
    btn.classList.replace('hover:bg-blue-700', 'hover:bg-emerald-600');
    btn.innerHTML = `<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Salvo!`;
    
    showToast("Alterações salvas com sucesso!");
    
    // Retorna o botão ao estado original
    setTimeout(() => {
        btn.classList.replace('bg-emerald-500', 'bg-blue-600');
        btn.classList.replace('hover:bg-emerald-600', 'hover:bg-blue-700');
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }, 2500);
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-5 right-5 bg-slate-800 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 transform transition-all translate-y-10 opacity-0 z-50';
    toast.style.transitionDuration = '300ms';
    toast.innerHTML = `<svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span class="font-medium text-sm">${message}</span>`;
    document.body.appendChild(toast);
    
    // Animate In
    setTimeout(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
    }, 10);
    
    // Animate Out
    setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
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
    if (!isAdmin) return;
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

async function carregarConfiguracoes() {
    try {
        const { data: configData, error: configError } = await supabaseClient.from('configuracoes').select('*').eq('id', 1).single();
        if (!configError && configData) {
            if (Array.isArray(configData.eventos)) sysConfig.eventos = configData.eventos;
            if (Array.isArray(configData.locais)) sysConfig.locais = configData.locais;
            if (Array.isArray(configData.funcoes_extras)) sysConfig.funcoes_extras = configData.funcoes_extras;

            if (Array.isArray(configData.nomes)) {
                sysConfig.nomes = configData.nomes.map(n => {
                    if (typeof n === 'string') {
                        return { id: generateUUID(), nome: n, is_coroinha: true, is_cerimoniario: false, idade: null, tags: [], dias_indisponiveis: [] };
                    }
                    if (!n.id) n.id = generateUUID();
                    if (!n.dias_indisponiveis) n.dias_indisponiveis = [];
                    if (!n.tags) n.tags = [];
                    return n;
                });
            }
            renderServidoresCadastrados();
            renderConfigEventos();
            renderConfigLocais();
            renderConfigFuncoes();

            const mesEl = document.getElementById('select-mes');
            const anoEl = document.getElementById('select-ano');
            if (mesEl && configData.mes_cabecalho) mesEl.value = configData.mes_cabecalho;
            if (anoEl && configData.ano_cabecalho) anoEl.value = configData.ano_cabecalho;
            updateTituloEscala();
        } else if (configError && configError.code === 'PGRST116' && isAdmin) {
            await supabaseClient.from('configuracoes').insert([{ id: 1, ...sysConfig }]);
            renderServidoresCadastrados();
            renderConfigEventos();
            renderConfigLocais();
            renderConfigFuncoes();
        }

        if (!isAdmin) {
            const todayStr = new Date().toISOString().split('T')[0];
            let { data: targetEscala } = await supabaseClient.from('escalas')
                .select('data')
                .gte('data', todayStr)
                .order('data', { ascending: true })
                .limit(1);

            if (!targetEscala || targetEscala.length === 0) {
                const { data: lastEscala } = await supabaseClient.from('escalas')
                    .select('data')
                    .order('data', { ascending: false })
                    .limit(1);
                targetEscala = lastEscala;
            }

            if (targetEscala && targetEscala.length > 0 && targetEscala[0].data) {
                const parts = targetEscala[0].data.split('-');
                if (parts.length === 3) {
                    const mesesArray = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
                    const mesIndex = parseInt(parts[1], 10) - 1;
                    const mesEl = document.getElementById('select-mes');
                    const anoEl = document.getElementById('select-ano');
                    if (mesEl && mesesArray[mesIndex]) mesEl.value = mesesArray[mesIndex];
                    if (anoEl) anoEl.value = parts[0];
                    updateTituloEscala();
                }
            }
        }
    } catch (err) {
        console.error("Erro ao carregar configurações:", err);
    }
}

async function carregarEscalas() {
    if (isRendering) return;
    isRendering = true;

    try {
        const mesVal = document.getElementById('select-mes') ? document.getElementById('select-mes').value : '';
        const anoVal = document.getElementById('select-ano') ? document.getElementById('select-ano').value : '';
        const meses = { "Janeiro": "01", "Fevereiro": "02", "Março": "03", "Abril": "04", "Maio": "05", "Junho": "06", "Julho": "07", "Agosto": "08", "Setembro": "09", "Outubro": "10", "Novembro": "11", "Dezembro": "12" };
        const mesNum = meses[mesVal] || "01";
        const anoNum = anoVal || new Date().getFullYear();

        const dataInicio = `${anoNum}-${mesNum}-01`;
        const lastDay = new Date(anoNum, parseInt(mesNum), 0).getDate();
        const dataFim = `${anoNum}-${mesNum}-${lastDay.toString().padStart(2, '0')}`;

        let query = supabaseClient.from('escalas')
            .select('*')
            .gte('data', dataInicio)
            .lte('data', dataFim)
            .order('data', { ascending: true })
            .order('horario', { ascending: true });

        if (isAdmin) {
            query = query.eq('versao', 'edicao');
        } else {
            query = query.eq('versao', 'publicada');
        }

        const { data: escalas, error } = await query;
        if (error) throw error;

        const tableCoroinhas = document.getElementById('table-coroinhas');
        if (tableCoroinhas) {
            const theadHtml = tableCoroinhas.querySelector('thead') ? tableCoroinhas.querySelector('thead').outerHTML : '';
            tableCoroinhas.innerHTML = theadHtml + '<tbody class="divide-y divide-gray-100"></tbody>';
        }

        const tableCerimoniarios = document.getElementById('table-cerimoniarios');
        if (tableCerimoniarios) {
            const theadHtml = tableCerimoniarios.querySelector('thead') ? tableCerimoniarios.querySelector('thead').outerHTML : '';
            tableCerimoniarios.innerHTML = theadHtml + '<tbody class="divide-y divide-gray-100"></tbody>';
        }

        let latestMesAno = null;
        let hasRascunho = false;

        if (escalas && escalas.length > 0) {
            escalas.forEach(row => {

                const rowData = row.extras || {};
                rowData.id = row.id;
                if (row.data) rowData.dateVal = row.data;
                if (row.horario) rowData.timeVal = row.horario;
                if (row.local) rowData.localVal = row.local;
                if (row.observacao) rowData.obsHtml = row.observacao;
                if (row.cores_celulas) rowData.coresCelulas = row.cores_celulas;
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

        // Empty state check for visitors
        let emptyMsg = document.getElementById('empty-escala-msg');

        if (!isAdmin && (!escalas || escalas.length === 0)) {
            if (tableCoroinhas) tableCoroinhas.parentElement.style.display = 'none';
            if (tableCerimoniarios) tableCerimoniarios.parentElement.style.display = 'none';
            const tabBtnCor = document.querySelector('.tab-btn[onclick*="tab-coroinhas"]');
            if (tabBtnCor) tabBtnCor.style.display = 'none';
            const tabBtnCer = document.querySelector('.tab-btn[onclick*="tab-cerimoniarios"]');
            if (tabBtnCer) tabBtnCer.style.display = 'none';

            if (!emptyMsg) {
                const msg = document.createElement('div');
                msg.id = 'empty-escala-msg';
                msg.className = 'text-center p-8 bg-white rounded-xl shadow-sm border border-slate-100 mb-6';
                msg.innerHTML = '<p class="text-slate-500 font-semibold text-lg">Nenhuma escala publicada para este mês ainda.</p>';
                const sectionEscalas = document.getElementById('section-escalas');
                if (sectionEscalas) sectionEscalas.appendChild(msg);
            } else {
                emptyMsg.style.display = 'block';
            }
        } else {
            if (tableCoroinhas) tableCoroinhas.parentElement.style.display = '';
            if (tableCerimoniarios) tableCerimoniarios.parentElement.style.display = '';
            const tabBtnCor = document.querySelector('.tab-btn[onclick*="tab-coroinhas"]');
            if (tabBtnCor) tabBtnCor.style.display = '';
            const tabBtnCer = document.querySelector('.tab-btn[onclick*="tab-cerimoniarios"]');
            if (tabBtnCer) tabBtnCer.style.display = '';
            if (emptyMsg) emptyMsg.style.display = 'none';
        }

        // Badge & Publish button logic for admin
        if (isAdmin) {
            const badge = document.getElementById('badge-status-escala');
            const btnPublicar = document.getElementById('btn-publicar-mes');

            if (badge) {
                badge.textContent = 'Modo Edição (Restrito)';
                badge.className = 'admin-only ml-2 px-2.5 py-1.5 text-xs font-bold rounded-full no-print bg-purple-100 text-purple-700';
                badge.style.display = 'inline-block';
            }
            if (btnPublicar) {
                btnPublicar.style.display = 'flex';
            }
        } else {
            const badge = document.getElementById('badge-status-escala');
            const btnPublicar = document.getElementById('btn-publicar-mes');
            if (badge) badge.style.display = 'none';
            if (btnPublicar) btnPublicar.style.display = 'none';
        }

        highlightNextMass();
        ordenarTodasTabelas();

        // Populate Location Filter for Visitors dynamically
        if (!isAdmin) {
            const uniqueLocals = new Set();
            escalas.forEach(r => { if (r.local && r.local.trim()) uniqueLocals.add(r.local.trim()); });

            const localFiltro = document.getElementById('filtro-escala-local');
            if (localFiltro) {
                const currentVal = localFiltro.value;
                let html = '<option value="">Todos os Locais</option>';
                Array.from(uniqueLocals).sort().forEach(loc => {
                    html += `<option value="${loc}">${loc}</option>`;
                });
                localFiltro.innerHTML = html;
                localFiltro.value = currentVal;
            }
        }

        // Render Mobile Cards (Read Only)
        renderMobileCards(escalas);
    } catch (err) {
        console.error("Erro ao carregar escalas:", err);
        alert("Erro ao carregar escalas: " + err.message);
    } finally {
        isRendering = false;
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
        const timeInputA = a.querySelector('.time-input');
        const timeInputB = b.querySelector('.time-input');

        const dateA = dateInputA ? dateInputA.value : '';
        const dateB = dateInputB ? dateInputB.value : '';
        const timeA = timeInputA ? timeInputA.value : '';
        const timeB = timeInputB ? timeInputB.value : '';

        // Se ambos estão vazios, mantém a ordem original
        if (!dateA && !dateB) return 0;
        // Se A está vazio, joga pro final
        if (!dateA) return 1;
        // Se B está vazio, joga pro final
        if (!dateB) return -1;

        if (dateA !== dateB) {
            return new Date(dateA) - new Date(dateB);
        }

        // Se as datas são iguais, ordena pelo horário
        if (!timeA && !timeB) return 0;
        if (!timeA) return 1;
        if (!timeB) return -1;

        return timeA.localeCompare(timeB);
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

    // Preencher temporariamente inputs vazios com "-" para a impressão
    const nameInputs = document.querySelectorAll('.name-input');
    const emptyInputs = [];
    nameInputs.forEach(input => {
        // Ignora inputs que estão invisíveis (ex: quando há "TODOS CONVOCADOS")
        if (input.style.display !== 'none' && input.value.trim() === '') {
            input.value = '-';
            emptyInputs.push(input);
        }
    });

    window.print();

    document.title = originalTitle;

    // Reverter os campos para ficarem vazios de novo após imprimir
    emptyInputs.forEach(input => {
        input.value = '';
    });
}

// --- ZONA DE CONFIGURAÇÕES (GRID) ---

let editingEventoIndex = -1;

function renderConfigEventos() {
    const list = document.getElementById('lista-eventos');
    if (!list) return;
    list.innerHTML = '';

    if (!sysConfig.eventos || sysConfig.eventos.length === 0) {
        list.innerHTML = '<li class="p-4 text-slate-500 text-center italic">Nenhum evento cadastrado.</li>';
        return;
    }

    sysConfig.eventos.forEach((ev, index) => {
        const li = document.createElement('li');
        li.className = 'flex items-center justify-between p-3 hover:bg-slate-50 transition-colors';

        let badges = '';
        if (ev.todos_participam) badges += `<span class="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-bold uppercase tracking-wider">Geral</span>`;
        if (ev.pintar_linha !== false) badges += `<span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase tracking-wider">Pintar</span>`;

        li.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-6 h-6 rounded shadow-inner border border-gray-200" style="background-color: ${ev.cor || '#ccc'}"></div>
                <div>
                    <p class="font-bold text-slate-700 leading-tight">${ev.nome}</p>
                    <div class="flex gap-1 mt-1">${badges}</div>
                </div>
            </div>
            <div class="flex gap-1">
                <button onclick="iniciarEdicaoEvento(${index})" class="text-slate-400 hover:text-blue-500 p-1.5 hover:bg-blue-50 rounded transition-colors" title="Editar">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                </button>
                <button onclick="removerEvento(${index})" class="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded transition-colors" title="Remover">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </div>
        `;
        list.appendChild(li);
    });
}

function renderConfigLocais() {
    const container = document.getElementById('lista-locais');
    if (!container) return;
    container.innerHTML = '';

    sysConfig.locais.forEach((local, index) => {
        const div = document.createElement('div');
        div.className = 'bg-white text-slate-700 border border-gray-200 rounded-full pl-3 pr-1 py-1 text-sm font-medium flex items-center gap-2 shadow-sm';
        div.innerHTML = `
            ${local}
            <button onclick="removerLocal(${index})" class="text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 p-1 rounded-full transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        `;
        container.appendChild(div);
    });
}

function renderConfigFuncoes() {
    const container = document.getElementById('lista-funcoes');
    if (!container) return;
    container.innerHTML = '';

    sysConfig.funcoes_extras.forEach((func, index) => {
        const div = document.createElement('div');
        div.className = 'bg-white text-slate-700 border border-gray-200 rounded-full pl-3 pr-1 py-1 text-sm font-medium flex items-center gap-2 shadow-sm';
        div.innerHTML = `
            ${func}
            <button onclick="removerFuncao(${index})" class="text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 p-1 rounded-full transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        `;
        container.appendChild(div);
    });
}

async function salvarConfiguracaoNoBanco() {
    try {
        const { error } = await supabaseClient.from('configuracoes').update({
            eventos: sysConfig.eventos,
            locais: sysConfig.locais,
            funcoes_extras: sysConfig.funcoes_extras
        }).eq('id', 1);

        if (error) throw error;
    } catch (err) {
        console.error("Erro ao salvar config no banco:", err);
        alert("Erro ao salvar a configuração na nuvem. Verifique sua conexão.");
    }
}

function iniciarEdicaoEvento(index) {
    editingEventoIndex = index;
    const ev = sysConfig.eventos[index];

    document.getElementById('novo-evento-nome').value = ev.nome;
    document.getElementById('novo-evento-cor').value = ev.cor || '#FFEBEE';
    document.getElementById('novo-evento-geral').checked = !!ev.todos_participam;
    document.getElementById('novo-evento-pintar').checked = ev.pintar_linha !== false;

    document.getElementById('btn-salvar-evento').innerHTML = '✓ Salvar Edição';
    document.getElementById('btn-cancelar-edicao-evento').classList.remove('hidden');
}

function cancelarEdicaoEvento() {
    editingEventoIndex = -1;
    document.getElementById('novo-evento-nome').value = '';
    document.getElementById('novo-evento-cor').value = '#FFEBEE';
    document.getElementById('novo-evento-geral').checked = false;
    document.getElementById('novo-evento-pintar').checked = true;

    document.getElementById('btn-salvar-evento').innerHTML = '+ Adicionar';
    document.getElementById('btn-cancelar-edicao-evento').classList.add('hidden');
}

async function salvarFormEvento() {
    const nome = document.getElementById('novo-evento-nome').value.trim();
    const cor = document.getElementById('novo-evento-cor').value;
    const geral = document.getElementById('novo-evento-geral').checked;
    const pintar = document.getElementById('novo-evento-pintar').checked;

    if (!nome) { alert('Digite o nome do evento.'); return; }

    if (editingEventoIndex !== -1) {
        // Edit mode
        sysConfig.eventos[editingEventoIndex] = { nome, cor, todos_participam: geral, pintar_linha: pintar };
        cancelarEdicaoEvento();
    } else {
        // Add mode
        sysConfig.eventos.push({ nome, cor, todos_participam: geral, pintar_linha: pintar });
        document.getElementById('novo-evento-nome').value = '';
    }

    renderConfigEventos();
    await salvarConfiguracaoNoBanco();
}

async function removerEvento(index) {
    if (confirm('Remover este evento?')) {
        sysConfig.eventos.splice(index, 1);
        renderConfigEventos();
        await salvarConfiguracaoNoBanco();
    }
}

async function adicionarLocal() {
    const nome = document.getElementById('novo-local-nome').value.trim();
    if (!nome) { alert('Digite o nome do local.'); return; }

    sysConfig.locais.push(nome);
    document.getElementById('novo-local-nome').value = '';

    renderConfigLocais();
    await salvarConfiguracaoNoBanco();
}

async function removerLocal(index) {
    if (confirm('Remover este local?')) {
        sysConfig.locais.splice(index, 1);
        renderConfigLocais();
        await salvarConfiguracaoNoBanco();
    }
}

async function adicionarFuncao() {
    const nome = document.getElementById('nova-funcao-nome').value.trim();
    if (!nome) { alert('Digite o nome da função.'); return; }

    sysConfig.funcoes_extras.push(nome);
    document.getElementById('nova-funcao-nome').value = '';

    renderConfigFuncoes();
    await salvarConfiguracaoNoBanco();
}

async function removerFuncao(index) {
    if (confirm('Remover esta função?')) {
        sysConfig.funcoes_extras.splice(index, 1);
        renderConfigFuncoes();
        await salvarConfiguracaoNoBanco();
    }
}

// --- SISTEMA DE BACKUP ROBUSTO (JSON) ---
async function exportarBackupJSON() {
    try {
        const { data: escalasData, error: escalasError } = await supabaseClient.from('escalas').select('*');
        if (escalasError) throw escalasError;

        const { data: configData, error: configError } = await supabaseClient.from('configuracoes').select('*').eq('id', 1).single();
        if (configError) throw configError;

        const backupData = {
            escalas: escalasData,
            configuracoes: configData
        };

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `backup_completo_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    } catch (err) {
        console.error("Erro ao exportar:", err);
        alert("Erro ao exportar: " + err.message);
    }
}

async function restaurarBackupJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!confirm('Atenção: A restauração irá sobrescrever escalas e configurações (incluindo servidores) existentes. Deseja prosseguir?')) {
        event.target.value = ''; // reseta input
        return;
    }

    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const jsonData = JSON.parse(e.target.result);

            // Verifica estrutura do JSON antigo (array de escalas) ou novo (objeto com escalas e configuracoes)
            let escalasParaImportar = [];
            let configuracoesParaImportar = null;

            if (Array.isArray(jsonData)) {
                escalasParaImportar = jsonData;
            } else if (jsonData && jsonData.escalas) {
                escalasParaImportar = jsonData.escalas;
                configuracoesParaImportar = jsonData.configuracoes;
            } else {
                throw new Error("O arquivo JSON não está num formato válido.");
            }

            // 1. Restaura Configurações
            if (configuracoesParaImportar) {
                const { error: configError } = await supabaseClient.from('configuracoes').update({
                    eventos: configuracoesParaImportar.eventos,
                    locais: configuracoesParaImportar.locais,
                    funcoes_extras: configuracoesParaImportar.funcoes_extras,
                    nomes: configuracoesParaImportar.nomes
                }).eq('id', 1);

                if (configError) throw configError;
            }

            // 2. Restaura Escalas
            if (Array.isArray(escalasParaImportar) && escalasParaImportar.length > 0) {
                const uniqueMap = new Map();
                escalasParaImportar.forEach(item => uniqueMap.set(item.id, item));
                const uniqueRows = Array.from(uniqueMap.values());

                const { error: escalasError } = await supabaseClient.from('escalas').upsert(uniqueRows);
                if (escalasError) throw escalasError;
            }

            alert('Backup restaurado com sucesso! A página será recarregada.');
            location.reload();
        } catch (err) {
            console.error("Erro na restauração:", err);
            alert('Erro ao restaurar: ' + err.message);
        }
        event.target.value = ''; // reseta input
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
        let currentWeekCount = 1;

        const formatDM = (d) => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');

        blocos.forEach(bloco => {
            const dateInput = bloco.querySelector('.date-input');
            if (dateInput && dateInput.value) {
                const parts = dateInput.value.split('-');
                const currentDate = new Date(parts[0], parts[1] - 1, parts[2]);

                let isNewWeek = false;

                if (!lastDate) {
                    isNewWeek = true;
                } else {
                    const diffTime = Math.abs(currentDate - lastDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    if ((currentDate.getDay() === 0 && lastDate.getDay() !== 0) || diffDays > 6 || (currentDate.getDay() < lastDate.getDay() && diffDays > 0)) {
                        isNewWeek = true;
                        currentWeekCount++;
                    }
                }

                if (isNewWeek) {
                    const sunday = new Date(currentDate);
                    sunday.setDate(currentDate.getDate() - currentDate.getDay());
                    const saturday = new Date(sunday);
                    saturday.setDate(sunday.getDate() + 6);

                    const spacerTbody = document.createElement('tbody');
                    spacerTbody.className = 'linha-separadora-semana';
                    spacerTbody.innerHTML = `<tr class="bg-slate-100/80 border-y border-slate-200"><td colspan="100%" class="py-2.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-600"><div class="flex items-center gap-2">📅 Semana ${currentWeekCount} • ${formatDM(sunday)} a ${formatDM(saturday)}</div></td></tr>`;
                    table.insertBefore(spacerTbody, bloco);
                }
                lastDate = currentDate;
            }
        });
    });
}

// --- SPA NAVIGATION E MODAIS ---
function switchView(viewId) {
    // Esconder todas as seções
    const sections = ['section-escalas', 'section-servidores', 'section-configuracoes'];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('hidden');
            el.classList.remove('block');
        }
    });

    // Mostrar a seção alvo
    const target = document.getElementById(`section-${viewId}`);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('block');
    }

    // Atualizar visual dos botões da sidebar
    document.querySelectorAll('.nav-btn').forEach(btn => {
        const btnView = btn.getAttribute('data-view');
        if (btnView === viewId) {
            // Estado ativo
            btn.classList.remove('text-slate-700', 'hover:bg-slate-100', 'bg-blue-900');
            btn.classList.add('bg-blue-600', 'text-white', 'shadow-md');
        } else {
            // Estado inativo
            btn.classList.add('text-slate-700', 'hover:bg-slate-100');
            btn.classList.remove('bg-blue-600', 'bg-blue-900', 'text-white', 'shadow-md');
        }
    });
}

function abrirModalServidor() {
    editingServidorId = null;
    document.getElementById('modal-servidor-titulo').innerText = 'Cadastrar Novo Servidor';
    document.getElementById('btn-salvar-servidor-text').innerText = 'Salvar';

    if (typeof alternarAbaServidor === 'function') alternarAbaServidor('dados');

    const modal = document.getElementById('modal-novo-servidor');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function fecharModalServidor() {
    editingServidorId = null;
    const modal = document.getElementById('modal-novo-servidor');
    if (modal) {
        modal.classList.add('hidden');
        document.getElementById('novo-servidor-nome').value = '';
        document.getElementById('novo-servidor-data-nascimento').value = '';
        document.getElementById('novo-servidor-idade').value = '';
        document.getElementById('novo-servidor-tags').value = '';
        document.getElementById('novo-servidor-responsavel').value = '';
        document.getElementById('novo-servidor-tel-responsavel').value = '';
        document.getElementById('novo-servidor-tel-proprio').value = '';

        document.getElementById('novo-servidor-endereco-rua').value = '';
        document.getElementById('novo-servidor-endereco-bairro').value = '';
        document.getElementById('novo-servidor-endereco-cidade').value = '';

        document.getElementById('novo-servidor-autoriza-imagem').checked = false;
        document.getElementById('novo-servidor-autoriza-eventos').checked = false;

        document.getElementById('novo-servidor-observacoes').value = '';
        document.querySelectorAll('.cb-dia-indisponivel').forEach(cb => cb.checked = false);
    }
}

function calcularIdadeNumber(dataNascimentoStr) {
    if (!dataNascimentoStr) return null;
    const dataNasc = new Date(dataNascimentoStr + "T00:00:00");
    if (isNaN(dataNasc.getTime())) return null;
    const hoje = new Date();
    let idade = hoje.getFullYear() - dataNasc.getFullYear();
    const mes = hoje.getMonth() - dataNasc.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < dataNasc.getDate())) {
        idade--;
    }
    return idade;
}

function calcularIdadeInput() {
    const dataStr = document.getElementById('novo-servidor-data-nascimento').value;
    const idadeNum = calcularIdadeNumber(dataStr);
    const inputIdade = document.getElementById('novo-servidor-idade');
    if (idadeNum !== null) {
        inputIdade.value = `${idadeNum} ano${idadeNum !== 1 ? 's' : ''}`;
    } else {
        inputIdade.value = '';
    }
}

function alternarAbaServidor(aba) {
    const btnDados = document.getElementById('tab-btn-dados');
    const btnContato = document.getElementById('tab-btn-contato');
    const conteudoDados = document.getElementById('tab-conteudo-dados');
    const conteudoContato = document.getElementById('tab-conteudo-contato');

    if (!btnDados || !btnContato || !conteudoDados || !conteudoContato) return;

    if (aba === 'dados') {
        btnDados.classList.add('border-blue-600', 'text-blue-600');
        btnDados.classList.remove('text-slate-500', 'border-transparent');
        btnContato.classList.remove('border-blue-600', 'text-blue-600');
        btnContato.classList.add('text-slate-500', 'border-transparent');

        conteudoDados.classList.remove('hidden');
        conteudoDados.classList.add('block');
        conteudoContato.classList.add('hidden');
        conteudoContato.classList.remove('block');
    } else {
        btnContato.classList.add('border-blue-600', 'text-blue-600');
        btnContato.classList.remove('text-slate-500', 'border-transparent');
        btnDados.classList.remove('border-blue-600', 'text-blue-600');
        btnDados.classList.add('text-slate-500', 'border-transparent');

        conteudoContato.classList.remove('hidden');
        conteudoContato.classList.add('block');
        conteudoDados.classList.add('hidden');
        conteudoDados.classList.remove('block');
    }
}

// --- MODO PINTURA DE CÉLULAS ---
let currentPinturaRowId = null;
let currentCoresCelulas = {};
let corSelecionadaPincel = null;

function selecionarCorPincel(cor, btn) {
    corSelecionadaPincel = cor;
    document.querySelectorAll('.cor-pincel-btn, #cor-livre').forEach(el => {
        el.classList.remove('border-blue-500', 'border-slate-400');
        el.classList.add('border-transparent');
    });
    if (btn) {
        btn.classList.remove('border-transparent');
        btn.classList.add('border-blue-500');
    }
}

function abrirModalPintura(btn) {
    closeAllDropdowns();
    const tr = btn.closest('.main-row');
    if (!tr) return;
    currentPinturaRowId = tr.id;

    try {
        currentCoresCelulas = JSON.parse(tr.dataset.coresCelulas || '{}');
    } catch (e) {
        currentCoresCelulas = {};
    }

    renderGridPintura(tr);
    const modal = document.getElementById('modal-pintura');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function fecharModalPintura() {
    const modal = document.getElementById('modal-pintura');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    currentPinturaRowId = null;
    currentCoresCelulas = {};
    corSelecionadaPincel = null;
    document.querySelectorAll('.cor-pincel-btn, #cor-livre').forEach(el => {
        el.classList.remove('border-blue-500', 'border-slate-400');
        el.classList.add('border-transparent');
    });
}

function renderGridPintura(tr) {
    const grid = document.getElementById('grid-pintura');
    grid.innerHTML = '';

    const type = tr.closest('table').id.includes('coroinhas') ? 'Coroinha' : 'Cerimoniário';
    const colunas = [
        { id: 'data', label: 'Data', index: 0 },
        { id: 'dia', label: 'Dia da Semana', index: 1 },
        { id: 'horario', label: 'Horário', index: 2 },
        { id: 'local', label: 'Local', index: 3 },
        { id: 'nome1', label: `${type} 1`, index: 4 },
        { id: 'nome2', label: `${type} 2`, index: 5 },
        { id: 'observacao', label: 'Observações', index: 6 },
    ];

    colunas.forEach(col => {
        const cor = currentCoresCelulas[col.id] || 'transparent';
        const btn = document.createElement('button');
        btn.className = 'p-4 border border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors hover:border-blue-500 shadow-sm';
        btn.style.backgroundColor = cor === 'transparent' ? '#f8fafc' : cor;
        btn.innerHTML = `<span class="text-xs font-bold text-slate-700 bg-white/70 px-2 py-1 rounded backdrop-blur-sm">${col.label}</span>`;
        btn.onclick = () => {
            if (corSelecionadaPincel === null) return;

            if (corSelecionadaPincel === 'transparent') {
                delete currentCoresCelulas[col.id];
                btn.style.backgroundColor = '#f8fafc';
            } else {
                currentCoresCelulas[col.id] = corSelecionadaPincel;
                btn.style.backgroundColor = corSelecionadaPincel;
            }
        };
        grid.appendChild(btn);
    });
}

async function salvarPintura() {
    if (!currentPinturaRowId) return;

    const tr = document.getElementById(currentPinturaRowId);
    if (tr) {
        tr.dataset.coresCelulas = JSON.stringify(currentCoresCelulas);
        aplicarCoresCelulas(tr, currentCoresCelulas);
        saveData();
    }

    try {
        if (!currentPinturaRowId.startsWith('row_')) {
            await supabaseClient.from('escalas').update({ cores_celulas: currentCoresCelulas }).eq('id', currentPinturaRowId);
        }
        fecharModalPintura();
    } catch (err) {
        console.error("Erro ao salvar pintura:", err);
        alert("Erro ao salvar no banco de dados.");
    }
}

function aplicarCoresCelulas(tr, coresObj) {
    const colunasMap = {
        'data': 0,
        'dia': 1,
        'horario': 2,
        'local': 3,
        'nome1': 4,
        'nome2': 5,
        'observacao': 6
    };

    for (const [key, idx] of Object.entries(colunasMap)) {
        if (tr.cells[idx]) {
            tr.cells[idx].style.backgroundColor = coresObj[key] || 'transparent';
            tr.cells[idx].style.transition = 'background-color 0.3s ease';
        }
    }
}

// --- GERAR MÊS (EM LOTE) ---
function abrirModalGerarMes() {
    document.getElementById('gerar-mes-select').value = document.getElementById('select-mes').value;
    document.getElementById('gerar-ano-select').value = document.getElementById('select-ano').value;
    document.getElementById('gerar-trava-input').value = '';
    document.getElementById('btn-confirmar-gerar').disabled = true;
    document.getElementById('btn-confirmar-gerar').className = "px-4 py-2 bg-slate-300 text-white rounded-lg text-sm font-bold shadow-sm cursor-not-allowed transition-colors";

    document.getElementById('modal-gerar-mes').classList.remove('hidden');
}

function fecharModalGerarMes() {
    document.getElementById('modal-gerar-mes').classList.add('hidden');
}

function validarTravaGerar() {
    const input = document.getElementById('gerar-trava-input');
    const btn = document.getElementById('btn-confirmar-gerar');
    if (input.value === 'GERAR') {
        btn.disabled = false;
        btn.className = "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm cursor-pointer transition-colors";
    } else {
        btn.disabled = true;
        btn.className = "px-4 py-2 bg-slate-300 text-white rounded-lg text-sm font-bold shadow-sm cursor-not-allowed transition-colors";
    }
}

async function confirmarGeracaoMes() {
    const mesDestino = document.getElementById('gerar-mes-select').value;
    const anoDestino = document.getElementById('gerar-ano-select').value;
    const copiarPadrao = document.getElementById('gerar-copiar-padrao').checked;

    // Captura configurações dos dias da semana
    const diasUteis = [];
    if (document.getElementById('chk-segunda')?.checked) diasUteis.push(1);
    if (document.getElementById('chk-terca')?.checked) diasUteis.push(2);
    if (document.getElementById('chk-quarta')?.checked) diasUteis.push(3);
    if (document.getElementById('chk-quinta')?.checked) diasUteis.push(4);
    if (document.getElementById('chk-sexta')?.checked) diasUteis.push(5);
    const horaSemana = document.getElementById('input-hora-semana')?.value || "19:00";
    const substituir = document.getElementById('chk-substituir-mes')?.checked;

    const btn = document.getElementById('btn-confirmar-gerar');
    btn.innerText = "Gerando...";
    btn.disabled = true;

    try {
        const meses = { "Janeiro": "01", "Fevereiro": "02", "Março": "03", "Abril": "04", "Maio": "05", "Junho": "06", "Julho": "07", "Agosto": "08", "Setembro": "09", "Outubro": "10", "Novembro": "11", "Dezembro": "12" };
        const mesNum = parseInt(meses[mesDestino]);
        const anoNum = parseInt(anoDestino);

        const date = new Date(anoNum, mesNum - 1, 1);
        const novasEscalas = [];
        const mesAnoStr = `${mesDestino} ${anoDestino}`;

        // 1. Substituir missas existentes se checkbox marcado
        if (substituir) {
            const startStr = `${anoNum}-${(mesNum).toString().padStart(2, '0')}-01`;
            const endDay = new Date(anoNum, mesNum, 0).getDate();
            const endStr = `${anoNum}-${(mesNum).toString().padStart(2, '0')}-${endDay.toString().padStart(2, '0')}`;

            const { error: delError } = await supabaseClient.from('escalas')
                .delete()
                .gte('data', startStr)
                .lte('data', endStr);
            if (delError) throw delError;
        }

        // 2. Calcular datas a inserir
        while (date.getMonth() === mesNum - 1) {
            const dayOfWeek = date.getDay(); // 0 = Domingo, 1=Seg, ..., 6 = Sábado
            const diaStr = date.getDate().toString().padStart(2, '0');
            const mesStr = (mesNum).toString().padStart(2, '0');
            const dataVal = `${anoNum}-${mesStr}-${diaStr}`;
            const nomesDias = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
            const diaSemanaStr = nomesDias[dayOfWeek];

            let horarios = [];

            // A. Regras Finais de Semana
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                if (copiarPadrao) {
                    if (dayOfWeek === 6) {
                        horarios.push({ horario: "19:00", local: "Igreja Matriz" });
                    } else if (dayOfWeek === 0) {
                        horarios.push({ horario: "07:00", local: "Igreja Matriz" });
                        horarios.push({ horario: "09:00", local: "Igreja Matriz" });
                        horarios.push({ horario: "18:30", local: "Igreja Matriz" });
                    }
                } else {
                    horarios.push({ horario: "", local: "" });
                }
            }
            // B. Regras Dias Úteis
            else if (diasUteis.includes(dayOfWeek)) {
                horarios.push({ horario: horaSemana, local: "Igreja Matriz" });
            }

            // C. Inserir na lista de novas escalas
            horarios.forEach(h => {
                const row = {
                    data: dataVal,
                    horario: h.horario,
                    local: h.local,
                    observacao: "",
                    coroinhas: [{ val: "", color: "" }, { val: "", color: "" }],
                    cerimoniarios: [{ val: "", color: "" }, { val: "", color: "" }],
                    extras: {
                        mesAno: mesAnoStr,
                        dayHtml: diaSemanaStr,
                        sublist: null
                    }
                };
                novasEscalas.push(row);
            });

            date.setDate(date.getDate() + 1);
        }

        if (novasEscalas.length > 0) {
            const { error } = await supabaseClient.from('escalas').insert(novasEscalas);
            if (error) throw error;
        }

        document.getElementById('select-mes').value = mesDestino;
        document.getElementById('select-ano').value = anoDestino;

        updateTituloEscala();
        saveData();
        await carregarEscalas();

        fecharModalGerarMes();
        alert(`Mês de ${mesDestino} de ${anoDestino} gerado com sucesso!`);
    } catch (err) {
        console.error("Erro ao gerar mês:", err);
        alert("Erro ao gerar mês. Verifique o console.");
    } finally {
        btn.innerText = "Confirmar Geração";
        btn.disabled = false;
    }
}

// --- INSERIR MISSA ENTRE LINHAS (INLINE) ---
async function inserirMissaApos(btn) {
    const tr = btn.closest('tr');
    const dateInput = tr.querySelector('.date-input');
    const dataRef = dateInput ? dateInput.value : '';

    const mesDestino = document.getElementById('select-mes').value;
    const anoDestino = document.getElementById('select-ano').value;
    const mesAnoStr = `${mesDestino} ${anoDestino}`;

    let diaSemanaStr = "";
    if (dataRef) {
        const parts = dataRef.split('-');
        if (parts.length === 3) {
            const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
            const dias = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
            diaSemanaStr = dias[dateObj.getDay()];
        }
    }

    const rowData = {
        data: dataRef,
        horario: "",
        local: "",
        observacao: "",
        coroinhas: [{ val: "", color: "" }, { val: "", color: "" }],
        cerimoniarios: [{ val: "", color: "" }, { val: "", color: "" }],
        extras: {
            mesAno: mesAnoStr,
            dayHtml: diaSemanaStr,
            sublist: null
        }
    };

    try {
        const { data, error } = await supabaseClient.from('escalas').insert([rowData]).select();
        if (error) throw error;

        await carregarEscalas();

        if (data && data.length > 0) {
            const newRowId = data[0].id;
            setTimeout(() => {
                destacarLinha(newRowId, false);
            }, 500);
        }
    } catch (err) {
        console.error("Erro ao inserir nova linha:", err);
        alert("Erro ao inserir nova missa. Verifique o console.");
    }
}

// --- FILTROS DE ESCALA ---
function limparFiltrosEscala() {
    document.getElementById('filtro-escala-nome').value = '';
    document.getElementById('filtro-escala-local').value = '';
    document.getElementById('filtro-escala-dia').value = '';
    document.getElementById('filtro-escala-hora').value = '';
    aplicarFiltrosEscala();
}

function aplicarFiltrosEscala() {
    const nomeInput = document.getElementById('filtro-escala-nome').value.toLowerCase().trim();
    const termosBusca = nomeInput ? nomeInput.split(' ').filter(t => t.length > 0) : [];

    const localTerm = document.getElementById('filtro-escala-local').value.toLowerCase().trim();
    const diaTerm = document.getElementById('filtro-escala-dia').value.toLowerCase().trim();
    const horaTerm = document.getElementById('filtro-escala-hora').value;

    const tabelas = ['table-coroinhas', 'table-cerimoniarios'];

    tabelas.forEach(tableId => {
        const table = document.getElementById(tableId);
        if (!table) return;
        const rows = table.querySelectorAll('tbody.bloco-missa');

        rows.forEach(tbody => {
            const tr = tbody.querySelector('.main-row');
            if (!tr) return;

            let matchNome = false;
            let matchLocal = false;
            let matchDia = false;
            let matchHora = false;

            // Check name
            if (termosBusca.length === 0) {
                matchNome = true;
            } else {
                const nameInputs = tbody.querySelectorAll('.name-input');
                for (let inp of nameInputs) {
                    if (inp.value) {
                        const nomeServo = inp.value.toLowerCase();
                        if (termosBusca.every(termo => nomeServo.includes(termo))) {
                            matchNome = true;
                            break;
                        }
                    }
                }
            }

            // Check local
            if (!localTerm) {
                matchLocal = true;
            } else {
                const localSelect = tr.querySelector('.local-select');
                if (localSelect && localSelect.value.toLowerCase().includes(localTerm)) {
                    matchLocal = true;
                }
            }

            // Check dia
            if (!diaTerm) {
                matchDia = true;
            } else {
                const dayCell = tr.querySelector('.day-cell');
                if (dayCell && dayCell.innerText.toLowerCase().includes(diaTerm)) {
                    matchDia = true;
                }
            }

            // Check hora
            if (!horaTerm) {
                matchHora = true;
            } else {
                const timeInput = tr.querySelector('.time-input');
                if (timeInput && timeInput.value === horaTerm) {
                    matchHora = true;
                }
            }

            if (matchNome && matchLocal && matchDia && matchHora) {
                tbody.style.display = '';
            } else {
                tbody.style.display = 'none';
            }
        });
    });

    // Filtro para os Cards Mobile
    const cards = document.querySelectorAll('.mobile-card');
    cards.forEach(card => {
        let matchNome = false;
        let matchLocal = false;
        let matchDia = false;
        let matchHora = false;

        const cNome = card.getAttribute('data-nome') || '';
        const cLocal = card.getAttribute('data-local') || '';
        const cDia = card.getAttribute('data-dia') || '';
        const cHora = card.getAttribute('data-hora') || '';

        if (termosBusca.length === 0) {
            matchNome = true;
        } else {
            // Em mobile, data-nome tem todos os nomes em caixa baixa concatenados
            matchNome = termosBusca.every(termo => cNome.includes(termo));
        }

        if (!localTerm || cLocal.includes(localTerm)) matchLocal = true;
        if (!diaTerm || cDia.includes(diaTerm)) matchDia = true;
        if (!horaTerm || cHora === horaTerm) matchHora = true;

        if (matchNome && matchLocal && matchDia && matchHora) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

function updateFiltrosEscalaLocais() {
    const localFiltro = document.getElementById('filtro-escala-local');
    if (!localFiltro) return;

    const currentVal = localFiltro.value;
    let html = '<option value="">Todos os Locais</option>';

    if (sysConfig.locais && sysConfig.locais.length > 0) {
        sysConfig.locais.forEach(loc => {
            html += `<option value="${loc}">${loc}</option>`;
        });
    }

    localFiltro.innerHTML = html;
    localFiltro.value = currentVal;
}

// --- PUBLICAR MÊS ---
async function publicarMesAtual() {
    const btn = document.getElementById('btn-publicar-mes');
    if (!btn) return;

    if (btn.disabled) return;

    if (!confirm("Isso irá espelhar todas as missas e edições deste mês para a visão do público (Visitantes). Deseja continuar?")) return;

    btn.disabled = true;
    const btnOriginalHtml = btn.innerHTML;
    btn.innerHTML = `<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Publicando...`;

    // Suspende o autosave temporariamente
    const previousIsAdmin = isAdmin;
    isAdmin = false;

    try {
        const mesVal = document.getElementById('select-mes') ? document.getElementById('select-mes').value : '';
        const anoVal = document.getElementById('select-ano') ? document.getElementById('select-ano').value : '';
        const meses = { "Janeiro": "01", "Fevereiro": "02", "Março": "03", "Abril": "04", "Maio": "05", "Junho": "06", "Julho": "07", "Agosto": "08", "Setembro": "09", "Outubro": "10", "Novembro": "11", "Dezembro": "12" };
        const mesNum = meses[mesVal] || "01";
        const anoNum = anoVal || new Date().getFullYear();

        const dataInicio = `${anoNum}-${mesNum}-01`;
        const lastDay = new Date(anoNum, parseInt(mesNum), 0).getDate();
        const dataFim = `${anoNum}-${mesNum}-${lastDay.toString().padStart(2, '0')}`;

        // 1. Apaga a "vitrine" atual (Deleta todas as linhas onde versao = publicada deste mês)
        const { error: errDel } = await supabaseClient.from('escalas')
            .delete()
            .eq('versao', 'publicada')
            .gte('data', dataInicio)
            .lte('data', dataFim);

        if (errDel) throw errDel;

        // 2. Coleta os dados de edição mais recentes do banco
        const { data: edicaoRows, error: errFetch } = await supabaseClient.from('escalas')
            .select('*')
            .eq('versao', 'edicao')
            .gte('data', dataInicio)
            .lte('data', dataFim);

        if (errFetch) throw errFetch;

        // 3. Clona e insere na "vitrine" (versao = publicada)
        if (edicaoRows && edicaoRows.length > 0) {
            const publicadasToInsert = edicaoRows.map(row => {
                const newRow = { ...row };
                delete newRow.id; // supabase gerará um novo UUID automaticamente
                newRow.versao = 'publicada';
                return newRow;
            });

            const { error: errIns } = await supabaseClient.from('escalas')
                .insert(publicadasToInsert);

            if (errIns) throw errIns;
        }

        alert("Escala publicada com sucesso!");

        isAdmin = previousIsAdmin; // Restaura permissão
        btn.disabled = false;
        btn.innerHTML = btnOriginalHtml;

        carregarEscalas(); // Refresh visual

    } catch (err) {
        console.error(err);
        alert("Erro ao publicar escala. Verifique o console.");
        isAdmin = previousIsAdmin;
        btn.disabled = false;
        btn.innerHTML = btnOriginalHtml;
    }
}

// --- RENDER MOBILE CARDS (VISITANTES/LEITURA) ---
function renderMobileCards(escalasArray) {
    const containerCoroinhas = document.getElementById('cards-coroinhas');
    const containerCerimoniarios = document.getElementById('cards-cerimoniarios');
    if (!containerCoroinhas || !containerCerimoniarios) return;

    containerCoroinhas.innerHTML = '';
    containerCerimoniarios.innerHTML = '';

    if (!escalasArray || escalasArray.length === 0) return;

    const sorted = [...escalasArray].sort((a, b) => {
        if (a.data !== b.data) return (a.data || "").localeCompare(b.data || "");
        return (a.horario || "").localeCompare(b.horario || "");
    });

    const formatData = (d) => {
        if (!d) return '--/--';
        const parts = d.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
        return d;
    };

    let htmlCoroinhas = '';
    let htmlCerimoniarios = '';

    sorted.forEach(row => {
        const dataStr = formatData(row.data);
        let dia = '--';
        if (row.data) {
            const parts = row.data.split('-');
            if (parts.length === 3) {
                const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
                const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                dia = diasSemana[dateObj.getDay()];
            }
        }

        const hora = row.horario || '--:--';
        const local = row.local || 'Não definido';
        const obs = row.observacao || '';

        const title = `${dia}, ${dataStr} &bull; ${hora}`;

        let obsHtml = '';
        if (obs.trim() !== '') {
            let cleanObs = obs.replace(/<br[^>]*>/gi, ' ').trim();
            cleanObs = cleanObs.replace(/margin-bottom:\s*4px;?/gi, 'margin-bottom: 0px;');
            // Removemos o fundo amarelo e deixamos apenas a tag original
            obsHtml = `<div class="mt-2 flex flex-wrap gap-1 items-center">${cleanObs}</div>`;
        }

        const buildCard = (servos, type) => {
            let servosList = '';
            let nomesBusca = [];
            let validNamesCount = 0;

            const isTodosConvocados = row.extras && row.extras.wasGeneral;
            const isCerimoniarios = type === 'cerimoniarios';
            const labels = isCerimoniarios ? ["Cruciferário", "Cerimonialista"] : ["Coroinha 1", "Coroinha 2", "Coroinha 3"];

            (servos || []).forEach((nomeObj, idx) => {
                let nomeStr = '';
                if (typeof nomeObj === 'object' && nomeObj !== null) {
                    nomeStr = nomeObj.val || '';
                } else if (nomeObj !== null && nomeObj !== undefined) {
                    nomeStr = String(nomeObj);
                }

                if (nomeStr.trim() !== '') {
                    validNamesCount++;
                    nomesBusca.push(nomeStr.toLowerCase());
                } else {
                    nomeStr = '-';
                }

                const label = labels[idx] || `Servo ${idx + 1}`;

                let renderNames = `<div class="text-sm ${nomeStr === '-' ? 'text-slate-400 font-medium' : 'text-slate-700 font-semibold'} pl-2 border-l-2 border-slate-200"><p>${nomeStr}</p></div>`;

                servosList += `
                    <div class="mb-2 last:mb-0">
                        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 block">${label}</span>
                        ${renderNames}
                    </div>
                `;
            });

            // Renderiza funções adicionais (Sublistas)
            if (row.extras && row.extras.sublist) {
                row.extras.sublist.forEach(r => {
                    const nomeStr = r.val.trim();
                    if (nomeStr !== '') {
                        const nomesArray = nomeStr.split(',').map(n => n.trim()).filter(n => n);
                        const label = r.name || 'Função Adicional';

                        validNamesCount += nomesArray.length;
                        nomesBusca.push(...nomesArray.map(n => n.toLowerCase()));

                        const renderNames = `<div class="text-sm text-slate-700 font-semibold pl-2 border-l-2 border-slate-200">
                            ${nomesArray.map(n => `<p>${n}</p>`).join('')}
                        </div>`;

                        servosList += `
                            <div class="mb-2 last:mb-0 mt-3">
                                <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">${label}</span>
                                ${renderNames}
                            </div>
                        `;
                    }
                });
            }

            if (!servosList) servosList = '<div class="text-sm text-slate-400 py-2">Nenhum servo escalado</div>';

            const nomesBuscaStr = nomesBusca.join(' ');
            const shouldHide = isTodosConvocados || validNamesCount > 3;

            let servosContainer = '';
            if (shouldHide) {
                const summaryText = isTodosConvocados ? "Todos Convocados (Ver lista)" : `${validNamesCount} Servos (Ver lista)`;
                servosContainer = `
                    <details class="group bg-slate-50 rounded-xl mt-4 border border-slate-100 overflow-hidden">
                        <summary class="flex justify-between items-center w-full p-4 text-sm font-medium text-slate-600 cursor-pointer list-none select-none [&::-webkit-details-marker]:hidden hover:bg-slate-100/50 transition-colors outline-none">
                            <span class="flex items-center gap-2">
                                <svg class="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                                ${summaryText}
                            </span>
                            <svg class="w-4 h-4 text-slate-400 transition-transform duration-200 group-open:rotate-180 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                        </summary>
                        <div class="px-4 pb-4 border-t border-slate-200/60 pt-3">
                            ${servosList}
                        </div>
                    </details>
                `;
            } else {
                servosContainer = `
                    <div class="bg-slate-50 rounded-xl p-4 mt-4 border border-slate-100">
                        ${servosList}
                    </div>
                `;
            }

            return `
                <div class="mobile-card bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4"
                     data-nome="${nomesBuscaStr}"
                     data-local="${local.toLowerCase()}"
                     data-dia="${dia.toLowerCase()}"
                     data-hora="${hora}">
                    <h3 class="text-lg font-bold text-slate-800">${title}</h3>
                    <div class="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
                        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        <span>${local}</span>
                    </div>
                    ${obsHtml}
                    ${servosContainer}
                </div>
            `;
        };

        if (row.coroinhas) htmlCoroinhas += buildCard(row.coroinhas, 'coroinhas');
        if (row.cerimoniarios) htmlCerimoniarios += buildCard(row.cerimoniarios, 'cerimoniarios');
    });

    containerCoroinhas.innerHTML = htmlCoroinhas;
    containerCerimoniarios.innerHTML = htmlCerimoniarios;
}
