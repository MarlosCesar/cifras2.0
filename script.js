// === VARIÁVEIS GLOBAIS ===
let customCategories = JSON.parse(localStorage.getItem('customCategories') || '[]');
let selectedCategory = fixedCategories[0].id; // Default selecionado
let allCifras = [];
let gapiInitialized = false;
let isLoadingCifras = false;

// === RENDER CATEGORIAS ===
function renderCategories() {
  const ul = document.getElementById('categoriesList');
  ul.innerHTML = '';

  // Botão "+ Adicionar" sempre deve ser o último
  // Portanto, renderiza as categorias fixas exceto o "+"
  fixedCategories.forEach(cat => {
    if (cat.name !== "+") {
      ul.innerHTML += `
        <li>
          <a href="#" class="text-blue-600 hover:text-blue-800 transition block px-2 py-1 rounded ${selectedCategory === cat.id ? 'bg-blue-100 font-bold' : ''}" data-category="${cat.id}">${cat.name}</a>
        </li>
      `;
    }
  });

  // Renderiza customCategories antes do botão "+ Adicionar"
  customCategories.forEach((cat, idx) => {
    ul.innerHTML += `
      <li class="relative">
        <div class="category-item px-2 py-1 rounded flex items-center group relative ${selectedCategory === cat.id ? 'bg-blue-100 font-bold' : ''}" data-idx="${idx}" draggable="false">
          <span class="flex-grow text-blue-600 hover:text-blue-800 transition cursor-pointer" data-category="${cat.id}">${cat.name}</span>
          <button class="delete-btn" data-idx="${idx}"><i class="fas fa-trash"></i></button>
        </div>
      </li>
    `;
  });

  // Botão "+ Adicionar" sempre por último
  ul.innerHTML += `
    <li>
      <button id="addCategoryBtn" class="text-green-600 hover:text-green-800 font-bold w-full text-left">+ Adicionar</button>
    </li>
  `;
}

// === RENDER CIFRAS ===
function renderCifras() {
  const songList = document.getElementById('songList');
  const loading = document.getElementById('loadingCifras');
  const erro = document.getElementById('erroCifras');
  
  loading.classList.add('hidden');
  erro.classList.add('hidden');
  songList.innerHTML = '';
  
  // Filtrar por categoria
  let filtered = allCifras;
  if (selectedCategory) {
    filtered = allCifras.filter(cifra => {
      // Checa se o nome da categoria aparece no nome da cifra (pode ser custom ou fixa)
      // Ex: "Domingo Manhã - Nome da Cifra.txt"
      return cifra.name.toLowerCase().includes(selectedCategory.toLowerCase());
    });
  }
  
  if (!filtered.length) {
    songList.innerHTML = `<div class="col-span-full text-center text-gray-500 py-16">Nenhuma cifra para esta categoria.</div>`;
    return;
  }
  
  filtered.forEach(file => {
    const nomeSemExt = file.name.replace(/\.[^/.]+$/, "");
    const html = `
      <div class="bg-white rounded-lg shadow-md p-4 flex items-center gap-4 cifra-card hover:ring-2 hover:ring-blue-400 transition relative">
        <div class="miniatura-cifra" data-fileid="${file.id}" data-nome="${nomeSemExt}" title="Abrir cifra">
          <i class="fas fa-music"></i>
        </div>
        <div class="flex-1">
          <span class="block font-bold text-lg text-blue-700">${nomeSemExt}</span>
          <span class="block text-xs text-gray-400 mt-1">${file.mimeType}</span>
        </div>
      </div>`;
    songList.insertAdjacentHTML('beforeend', html);
  });
}

// === AUTOCOMPLETE BUSCA CIFRAS ===
function setupAutocompleteCifras() {
  const input = document.getElementById('autocompleteCifras');
  const list = document.getElementById('autocompleteList');
  if (!input || !list) return;

  let filtered = [];
  let activeIndex = -1;

  function closeDropdown() {
    list.classList.add('hidden');
    list.innerHTML = '';
    activeIndex = -1;
  }

  input.addEventListener('input', function () {
    const value = this.value.trim().toLowerCase();
    if (!value) {
      closeDropdown();
      return;
    }
    // Busca com base no nome sem extensão
    filtered = allCifras
      .map(f => ({ ...f, nomeSemExt: f.name.replace(/\.[^/.]+$/, "") }))
      .filter(f => f.nomeSemExt.toLowerCase().includes(value))
      .sort((a, b) => a.nomeSemExt.localeCompare(b.nomeSemExt, 'pt-BR', { sensitivity: 'base' }));

    if (!filtered.length) {
      closeDropdown();
      return;
    }

    list.innerHTML = filtered
      .map((f, idx) => `<li data-idx="${idx}" ${idx === 0 ? 'class="active"' : ''}>${f.nomeSemExt}</li>`)
      .join('');
    list.classList.remove('hidden');
    activeIndex = 0;
  });

  input.addEventListener('keydown', function (e) {
    if (list.classList.contains('hidden')) return;
    if (e.key === "ArrowDown") {
      activeIndex = (activeIndex + 1) % filtered.length;
      updateActive();
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      activeIndex = (activeIndex - 1 + filtered.length) % filtered.length;
      updateActive();
      e.preventDefault();
    } else if (e.key === "Enter") {
      if (filtered[activeIndex]) {
        openCifraModal(filtered[activeIndex].id, filtered[activeIndex].nomeSemExt);
        input.value = "";
        closeDropdown();
        e.preventDefault();
      }
    } else if (e.key === "Escape") {
      closeDropdown();
    }
  });

  list.addEventListener('mousedown', function (e) {
    const li = e.target.closest('li[data-idx]');
    if (li) {
      const idx = parseInt(li.dataset.idx, 10);
      openCifraModal(filtered[idx].id, filtered[idx].nomeSemExt);
      input.value = "";
      closeDropdown();
      // Não deixa o input perder o foco
      e.preventDefault();
    }
  });

  input.addEventListener('blur', function () {
    setTimeout(closeDropdown, 120); // Permite clicar no item
  });

  function updateActive() {
    const items = Array.from(list.children);
    items.forEach((li, idx) => {
      li.classList.toggle('active', idx === activeIndex);
    });
    if (items[activeIndex]) {
      items[activeIndex].scrollIntoView({ block: 'nearest' });
    }
  }
}

// === GOOGLE DRIVE ===
function gapiLoadAndInit(callback) {
  gapi.load('client:auth2', async function() {
    await gapi.client.init({
      apiKey: GOOGLE_API_KEY,
      clientId: GOOGLE_CLIENT_ID,
      scope: GOOGLE_SCOPES,
      discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"]
    });
    gapiInitialized = true;
    callback && callback();
  });
}

async function ensureGoogleAuth() {
  const authInstance = gapi.auth2.getAuthInstance();
  if (!authInstance.isSignedIn.get()) {
    await authInstance.signIn();
    document.getElementById("btnGoogleSignOut").classList.remove("hidden");
  }
}

function signOutGoogle() {
  const authInstance = gapi.auth2.getAuthInstance();
  if (authInstance && authInstance.isSignedIn.get()) {
    authInstance.signOut().then(() => {
      document.getElementById("btnGoogleSignOut").classList.add("hidden");
      document.getElementById("songList").innerHTML = `<div class="col-span-full text-center text-gray-600 py-20">Faça login novamente para ver as cifras.</div>`;
    });
  }
}

async function listDriveCifras() {
  await ensureGoogleAuth();
  const res = await gapi.client.drive.files.list({
    q: `'${GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed = false`,
    fields: "files(id, name, mimeType)",
    pageSize: 200
  });
  return res.result.files;
}

async function loadCifras() {
  isLoadingCifras = true;
  document.getElementById('loadingCifras').classList.remove('hidden');
  
  try {
    allCifras = await listDriveCifras();
    renderCifras();
  } catch (e) {
    document.getElementById('erroCifras').textContent = "Erro ao acessar o Google Drive: " + e.message;
    document.getElementById('erroCifras').classList.remove('hidden');
    allCifras = [];
  }
  
  document.getElementById('loadingCifras').classList.add('hidden');
  isLoadingCifras = false;
}

// === FULLSCREEN MODAL PARA CIFRA ===
async function openCifraModal(fileId, nomeCifra) {
  const modal = document.getElementById('modalCifra');
  const titulo = document.getElementById('modalCifraTitulo');
  const content = document.getElementById('modalCifraContent');
  
  titulo.textContent = nomeCifra;
  content.textContent = "Carregando...";
  modal.classList.remove('hidden');
  
  try {
    await ensureGoogleAuth();
    // Pega o conteúdo
    const file = await gapi.client.drive.files.get({
      fileId,
      alt: 'media'
    });
    // Pode ser text, pdf, etc. Aqui exibimos somente texto (cifras txt)
    if (typeof file.body === "string") {
      content.textContent = file.body;
    } else {
      content.textContent = "Não foi possível exibir o conteúdo deste arquivo.";
    }
  } catch (e) {
    content.textContent = "Erro ao carregar cifra: " + e.message;
  }
}

// === HANDLERS DE EVENTOS ===
function initializeMenuEvents() {
  const sidebarMenu = document.getElementById('sidebarMenu');
  const hamburgerOverlay = document.getElementById('hamburgerOverlay');
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const closeSidebar = document.getElementById('closeSidebar');
  
  hamburgerBtn.addEventListener('click', openSidebar);
  closeSidebar.addEventListener('click', closeSidebarFn);
  hamburgerOverlay.addEventListener('click', closeSidebarFn);
  
  function openSidebar() {
    sidebarMenu.classList.remove('sidebar-closed');
    sidebarMenu.classList.add('sidebar-open');
    hamburgerOverlay.style.display = 'block';
  }
  
  function closeSidebarFn() {
    sidebarMenu.classList.remove('sidebar-open');
    sidebarMenu.classList.add('sidebar-closed');
    hamburgerOverlay.style.display = 'none';
  }
  
  document.addEventListener('keydown', function(e){
    if (e.key === "Escape" && sidebarMenu.classList.contains('sidebar-open')) {
      closeSidebarFn();
    }
  });
}

function initializeCategoryEvents() {
  // CATEGORIAS (seleção/filtro)
  document.getElementById('categoriesList').addEventListener('click', function(e){
    if (e.target.dataset.category) {
      selectedCategory = e.target.dataset.category;
      renderCategories();
      renderCifras();
    }
  });

  // Adição de categoria customizada
  document.getElementById('categoriesList').addEventListener('click', function(e){
    if (e.target.id === "addCategoryBtn") {
      const li = e.target.closest('li');
      li.innerHTML = `
        <input id="newCatInput" type="text" class="border px-2 py-1 rounded w-2/3" placeholder="Nova categoria">
        <button id="saveCatBtn" class="ml-2 text-green-600"><i class="fas fa-check"></i></button>
      `;
      setTimeout(() => document.getElementById('newCatInput').focus(), 100);
    }
    
    if (e.target.id === "saveCatBtn" || e.target.closest("#saveCatBtn")) {
      const input = document.getElementById('newCatInput');
      if (input && input.value.trim()) {
        const value = input.value.trim();
        const id = value;
        customCategories.unshift({ name: value, id }); // Adiciona no início da lista
        localStorage.setItem('customCategories', JSON.stringify(customCategories));
        renderCategories();
      }
    }
    
    if (e.target.classList.contains('delete-btn') || e.target.closest('.delete-btn')) {
      const idx = e.target.dataset.idx || e.target.closest('.delete-btn').dataset.idx;
      customCategories.splice(idx, 1);
      localStorage.setItem('customCategories', JSON.stringify(customCategories));
      renderCategories();
      if (selectedCategory === customCategories[idx]?.id) {
        selectedCategory = fixedCategories[0].id;
      }
    }
  });
}

function initializeSwipeEvents() {
  // Swipe para deletar categoria customizada
  let startX = 0, swipedIdx = null;
  
  document.getElementById('categoriesList').addEventListener('touchstart', function(e){
    const item = e.target.closest('.category-item');
    if (item) {
      startX = e.touches[0].clientX;
      swipedIdx = item.dataset.idx;
    }
  });
  
  document.getElementById('categoriesList').addEventListener('touchmove', function(e){
    if (swipedIdx !== null) {
      const item = document.querySelector(`.category-item[data-idx="${swipedIdx}"]`);
      if (item) {
        let diff = e.touches[0].clientX - startX;
        if (diff < -30) item.classList.add('swiped');
        else item.classList.remove('swiped');
      }
    }
  });
  
  document.getElementById('categoriesList').addEventListener('touchend', function(){
    swipedIdx = null;
  });
}

function initializeCifraEvents() {
  // Abrir cifra em tela cheia
  document.getElementById('songList').addEventListener('click', function(e) {
    const miniatura = e.target.closest('.miniatura-cifra');
    if (miniatura) {
      const fileId = miniatura.dataset.fileid;
      const nome = miniatura.dataset.nome;
      openCifraModal(fileId, nome);
    }
  });

  // Fechar modal cifra
  document.getElementById('closeModalCifra').addEventListener('click', () => {
    document.getElementById('modalCifra').classList.add('hidden');
  });
  
  document.getElementById('modalCifra').addEventListener('click', function(e){
    if (e.target === this) {
      this.classList.add('hidden');
    }
  });
}

// === INICIALIZAÇÃO ===
document.addEventListener("DOMContentLoaded", () => {
  // GOOGLE
  gapiLoadAndInit(() => {
    document.getElementById("btnGoogleSignOut").addEventListener("click", signOutGoogle);
    loadCifras();
  });

  // Inicializar todos os eventos
  initializeMenuEvents();
  initializeCategoryEvents();
  initializeSwipeEvents();
  initializeCifraEvents();
  setupAutocompleteCifras();

  // Inicializa renderização de categorias
  renderCategories();
});
