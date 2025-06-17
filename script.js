// === CONFIGURAÇÃO GOOGLE DRIVE E GIS ===
const GOOGLE_DRIVE_FOLDER_ID = "1OzrvB4NCBRTDgMsE_AhQy0b11bdn3v82";
const GOOGLE_CLIENT_ID = "977942417278-0mfg7iehelnjfqmk5a32elsr7ll8hkil.apps.googleusercontent.com";
const GOOGLE_SCOPES = "https://www.googleapis.com/auth/drive.readonly";
let googleAccessToken = null; // GIS token

// === CATEGORIAS ===
const fixedCategories = [
  { name: "Domingo Manhã", id: "Domingo Manhã" },
  { name: "Domingo Noite", id: "Domingo Noite" },
  { name: "Segunda", id: "Segunda" },
  { name: "Quarta", id: "Quarta" },
  { name: "+", id: "adicionar" }
];

// === VARIÁVEIS GLOBAIS ===
let customCategories = JSON.parse(localStorage.getItem('customCategories') || '[]');
let selectedCategory = fixedCategories[0].id; // Default selecionado
let allCifras = [];
let isLoadingCifras = false;

// ===== SELEÇÃO E INTERAÇÃO COM CIFRAS =====
let cifrasSelecionadas = [];

// Renderiza as cifras selecionadas na tela
function renderCifrasSelecionadas() {
  const cont = document.getElementById('cifrasSelecionadasContainer');
  if (!cont) return;
  cont.innerHTML = '';
  cifrasSelecionadas.forEach((cifra, idx) => {
    const div = document.createElement('div');
    div.className = 'cifra-card-sel' + (cifra.selected ? ' selected' : '');
    div.textContent = cifra.titulo;
    div.onclick = () => {
      cifra.selected = !cifra.selected;
      renderCifrasSelecionadas();
      renderBotoesFlutuantes();
    };
    cont.appendChild(div);
  });
  renderBotoesFlutuantes();
}

// Adicione esta função para usar ao selecionar (autocomplete ou lista)
function onCifraSelecionada(nomeCifra) {
  cifrasSelecionadas.push({ titulo: nomeCifra, selected: false });
  renderCifrasSelecionadas();
}

// Botões flutuantes
function renderBotoesFlutuantes() {
  const btnUp = document.getElementById('btn-up');
  const btnDown = document.getElementById('btn-down');
  if (!btnUp || !btnDown) return;
  const nSel = cifrasSelecionadas.filter(c => c.selected).length;
  if (nSel === 1) {
    btnUp.style.visibility = '';
    btnDown.style.visibility = '';
  } else {
    btnUp.style.visibility = 'hidden';
    btnDown.style.visibility = 'hidden';
  }
}

document.getElementById('btn-ok').onclick = () => {
  cifrasSelecionadas.forEach(c => c.selected = true);
  renderCifrasSelecionadas();
};
document.getElementById('btn-cancel').onclick = () => {
  cifrasSelecionadas.forEach(c => c.selected = false);
  renderCifrasSelecionadas();
};
document.getElementById('btn-trash').onclick = () => {
  cifrasSelecionadas = cifrasSelecionadas.filter(c => !c.selected);
  renderCifrasSelecionadas();
};
document.getElementById('btn-up').onclick = () => {
  const idx = cifrasSelecionadas.findIndex(c => c.selected);
  if (idx > 0) {
    [cifrasSelecionadas[idx - 1], cifrasSelecionadas[idx]] = [cifrasSelecionadas[idx], cifrasSelecionadas[idx - 1]];
    renderCifrasSelecionadas();
  }
};
document.getElementById('btn-down').onclick = () => {
  const idx = cifrasSelecionadas.findIndex(c => c.selected);
  if (idx >= 0 && idx < cifrasSelecionadas.length - 1) {
    [cifrasSelecionadas[idx], cifrasSelecionadas[idx + 1]] = [cifrasSelecionadas[idx + 1], cifrasSelecionadas[idx]];
    renderCifrasSelecionadas();
  }
};

// === LOCALSTORAGE PARA CIFRAS POR CATEGORIA ===
function getCifrasPorCategoria() {
  return JSON.parse(localStorage.getItem("cifrasPorCategoria") || '{}');
}
function setCifrasPorCategoria(obj) {
  localStorage.setItem("cifrasPorCategoria", JSON.stringify(obj));
}

// === GIS LOGIN ===
let tokenClient;
function initializeGIS() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: GOOGLE_SCOPES,
    callback: (tokenResponse) => {
      if (tokenResponse && tokenResponse.access_token) {
        googleAccessToken = tokenResponse.access_token;
        document.getElementById('googleSignInBtn').style.display = 'none';
        document.getElementById('btnGoogleSignOut').classList.remove('hidden');
        loadCifras();
      }
    }
  });
  document.getElementById('googleSignInBtn').innerHTML = `
    <button id="doGoogleLogin" class="px-4 py-2 bg-blue-600 rounded text-white font-bold flex items-center">
      <i class="fab fa-google mr-2"></i> Entrar com Google
    </button>
  `;
  document.getElementById('doGoogleLogin').onclick = () => {
    tokenClient.requestAccessToken();
  };
  document.getElementById('btnGoogleSignOut').onclick = googleSignOut;
}
function googleSignOut() {
  googleAccessToken = null;
  document.getElementById('btnGoogleSignOut').classList.add('hidden');
  document.getElementById('googleSignInBtn').style.display = '';
  document.getElementById("songList").innerHTML = `<div class="col-span-full text-center text-gray-600 py-20">Faça login novamente para ver as cifras.</div>`;
}

// === RENDER CATEGORIAS ===
function renderCategories() {
  const ul = document.getElementById('categoriesList');
  if (!ul) return;
  ul.innerHTML = '';
  fixedCategories.forEach(cat => {
    if (cat.name !== "+") {
      ul.innerHTML += `
        <li>
          <a href="#" class="text-blue-600 hover:text-blue-800 transition block px-2 py-1 rounded ${selectedCategory === cat.id ? 'bg-blue-100 font-bold' : ''}" data-category="${cat.id}">${cat.name}</a>
        </li>
      `;
    }
  });
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
  ul.innerHTML += `
    <li>
      <button id="addCategoryBtn" class="text-green-600 hover:text-green-800 font-bold w-full text-left">+ Adicionar</button>
    </li>
  `;
}

// === RENDER CIFRAS DA CATEGORIA ===
function renderCifras() {
  const songList = document.getElementById('songList');
  const loading = document.getElementById('loadingCifras');
  const erro = document.getElementById('erroCifras');
  if (!songList || !loading || !erro) return;
  loading.classList.add('hidden');
  erro.classList.add('hidden');
  songList.innerHTML = '';
  document.getElementById('categoriaTitulo').textContent = selectedCategory ? selectedCategory : "Cifras Disponíveis";
  const cifrasPorCategoria = getCifrasPorCategoria();
  let filtered = cifrasPorCategoria[selectedCategory] || [];
  if (!filtered.length) {
    songList.innerHTML = `<div class="col-span-full text-center text-gray-500 py-16">Nenhuma cifra para esta categoria.</div>`;
    return;
  }
  filtered.forEach((file, idx) => {
    const nomeSemExt = file.name.replace(/\.[^/.]+$/, "");
    const html = `
      <div class="bg-white rounded-lg shadow-md p-4 flex items-center gap-4 cifra-card hover:ring-2 hover:ring-blue-400 transition relative cifra-item" data-idx="${idx}" draggable="false">
        <div class="miniatura-cifra" data-fileid="${file.id}" data-nome="${nomeSemExt}" title="Abrir cifra">
          <i class="fas fa-music"></i>
        </div>
        <div class="flex-1">
          <span class="block font-bold text-lg text-blue-700">${nomeSemExt}</span>
          <span class="block text-xs text-gray-400 mt-1">${file.mimeType || ""}</span>
        </div>
        <button class="delete-cifra-btn absolute right-4 top-1/2 -translate-y-1/2 bg-red-500 text-white rounded-full px-2 py-1 shadow-lg"><i class="fas fa-trash"></i></button>
      </div>`;
    songList.insertAdjacentHTML('beforeend', html);
  });
}

// === AUTOCOMPLETE BUSCA CIFRAS ===
function setupAutocompleteCifras() {
  const input = document.getElementById('autocompleteCifras');
  const list = document.getElementById('autocompleteList');
  if (!input || !list) return;
  input.oninput = null;
  input.onkeydown = null;
  input.onblur = null;
  list.onmousedown = null;
  let filtered = [];
  let activeIndex = -1;
  function closeDropdown() {
    list.classList.add('hidden');
    list.innerHTML = '';
    activeIndex = -1;
  }
  input.oninput = function () {
    const value = this.value.trim().toLowerCase();
    if (!value) {
      closeDropdown();
      return;
    }
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
  };
  input.onkeydown = function (e) {
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
        onCifraSelecionada(filtered[activeIndex].nomeSemExt);
        input.value = "";
        closeDropdown();
        e.preventDefault();
      }
    } else if (e.key === "Escape") {
      closeDropdown();
    }
  };
  list.onmousedown = function (e) {
    const li = e.target.closest('li[data-idx]');
    if (li) {
      const idx = parseInt(li.dataset.idx, 10);
      onCifraSelecionada(filtered[idx].nomeSemExt);
      input.value = "";
      closeDropdown();
      e.preventDefault();
    }
  };
  input.onblur = function () { setTimeout(closeDropdown, 120); };
  function updateActive() {
    const items = Array.from(list.children);
    items.forEach((li, idx) => { li.classList.toggle('active', idx === activeIndex); });
    if (items[activeIndex]) { items[activeIndex].scrollIntoView({ block: 'nearest' }); }
  }
}

// === ADICIONAR CIFRA À CATEGORIA ===
function addCifraToCategory(cifra, categoria) {
  const cifrasPorCategoria = getCifrasPorCategoria();
  if (!cifrasPorCategoria[categoria]) cifrasPorCategoria[categoria] = [];
  if (!cifrasPorCategoria[categoria].some(f => f.id === cifra.id)) {
    cifrasPorCategoria[categoria].push(cifra);
    setCifrasPorCategoria(cifrasPorCategoria);
  }
}

// === GOOGLE DRIVE FETCH ===
async function listDriveCifras() {
  if (!googleAccessToken) throw new Error("Não autenticado!");
  const url = `https://www.googleapis.com/drive/v3/files?q='${GOOGLE_DRIVE_FOLDER_ID}'+in+parents+and+trashed=false&fields=files(id,name,mimeType)&pageSize=200`;
  const res = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + googleAccessToken }
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.files;
}
async function getDriveFileContent(fileId) {
  if (!googleAccessToken) throw new Error("Não autenticado!");
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + googleAccessToken }
  });
  return await res.text();
}
async function loadCifras() {
  isLoadingCifras = true;
  document.getElementById('loadingCifras').classList.remove('hidden');
  try {
    allCifras = await listDriveCifras();
    renderCifras();
    setupAutocompleteCifras();
  } catch (e) {
    document.getElementById('erroCifras').textContent = "Erro ao acessar o Google Drive: " + e.message;
    document.getElementById('erroCifras').classList.remove('hidden');
    allCifras = [];
    setupAutocompleteCifras();
  }
  document.getElementById('loadingCifras').classList.add('hidden');
  isLoadingCifras = false;
}

// === FULLSCREEN MODAL PARA CIFRA ===
let currentTranspose = 0;
let cifraModalOriginal = "";

async function openCifraModal(fileId, nomeCifra) {
  const modal = document.getElementById('modalCifra');
  const titulo = document.getElementById('modalCifraTitulo');
  const content = document.getElementById('modalCifraContent');
  const addBtnWrap = document.getElementById('modalAddBtnWrap');
  const transposeLabel = document.getElementById('transposeLabel');
  titulo.textContent = nomeCifra;
  content.innerHTML = "Carregando...";
  addBtnWrap.innerHTML = '';
  modal.classList.remove('hidden');
  currentTranspose = 0;
  cifraModalOriginal = "";
  transposeLabel.textContent = "";
  try {
    const text = await getDriveFileContent(fileId);
    cifraModalOriginal = text;
    renderCifraWithTranspose();
    if (selectedCategory) {
      const addBtn = document.createElement('button');
      addBtn.textContent = `Adicionar à categoria "${selectedCategory}"`;
      addBtn.className = "mt-4 px-4 py-2 bg-blue-600 rounded text-white font-bold";
      addBtn.onclick = () => {
        addCifraToCategory({id: fileId, name: nomeCifra}, selectedCategory);
        renderCifras();
        modal.classList.add('hidden');
      };
      addBtnWrap.innerHTML = '';
      addBtnWrap.appendChild(addBtn);
    }
  } catch (e) {
    content.textContent = "Erro ao carregar cifra: " + e.message;
  }
}

function renderCifraWithTranspose() {
  const content = document.getElementById('modalCifraContent');
  const transposeLabel = document.getElementById('transposeLabel');
  if (!cifraModalOriginal) return;
  content.innerHTML = window.cifraTransposerRender(cifraModalOriginal, currentTranspose);
  if (currentTranspose === 0) transposeLabel.textContent = "Tom original";
  else transposeLabel.textContent = (currentTranspose > 0 ? "+" : "") + currentTranspose + " semitom(s)";
}

// Eventos dos botões de transposição e fullscreen
document.addEventListener("DOMContentLoaded", () => {
  initializeGIS();
  initializeMenuEvents();
  initializeCategoryEvents();
  initializeSwipeEvents();
  initializeCifraEvents();
  setupCifraSwipeEvents();
  renderCategories();
  setupFavMenu();
  renderCifrasSelecionadas();

  document.getElementById('btnTransposeUp').onclick = () => {
    currentTranspose++;
    renderCifraWithTranspose();
  };
  document.getElementById('btnTransposeDown').onclick = () => {
    currentTranspose--;
    renderCifraWithTranspose();
  };
  document.getElementById('btnFullscreenCifra').onclick = () => {
    const modal = document.querySelector('.cifra-modal-box');
    if (!document.fullscreenElement) {
      modal.requestFullscreen();
      modal.classList.add('fullscreen');
    } else {
      document.exitFullscreen();
      modal.classList.remove('fullscreen');
    }
  };
});

// === SWIPE E EXCLUSÃO DE CIFRA ===
function setupCifraSwipeEvents() {
  let startX = 0, swipedIdx = null;
  document.getElementById('songList').addEventListener('touchstart', function(e){
    const item = e.target.closest('.cifra-item');
    if (item) {
      startX = e.touches[0].clientX;
      swipedIdx = item.dataset.idx;
    }
  });
  document.getElementById('songList').addEventListener('touchmove', function(e){
    if (swipedIdx !== null) {
      const item = document.querySelector(`.cifra-item[data-idx="${swipedIdx}"]`);
      if (item) {
        let diff = e.touches[0].clientX - startX;
        const btn = item.querySelector('.delete-cifra-btn');
        if (diff < -30) btn.classList.add('visible');
        else btn.classList.remove('visible');
      }
    }
  });
  document.getElementById('songList').addEventListener('touchend', function(){ swipedIdx = null; });
  document.getElementById('songList').addEventListener('click', function(e) {
    if (e.target.closest('.delete-cifra-btn')) {
      const idx = e.target.closest('.cifra-item').dataset.idx;
      const cifrasPorCategoria = getCifrasPorCategoria();
      cifrasPorCategoria[selectedCategory].splice(idx, 1);
      setCifrasPorCategoria(cifrasPorCategoria);
      renderCifras();
    }
  });
}

// === HANDLERS DE EVENTOS ===
function initializeMenuEvents() {
  const sidebarMenu = document.getElementById('sidebarMenu');
  const hamburgerOverlay = document.getElementById('hamburgerOverlay');
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const closeSidebar = document.getElementById('closeSidebar');
  if (hamburgerBtn) hamburgerBtn.addEventListener('click', openSidebar);
  if (closeSidebar) closeSidebar.addEventListener('click', closeSidebarFn);
  if (hamburgerOverlay) hamburgerOverlay.addEventListener('click', closeSidebarFn);
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
  document.getElementById('categoriesList').addEventListener('click', function(e){
    if (e.target.dataset.category) {
      selectedCategory = e.target.dataset.category;
      renderCategories();
      renderCifras();
    }
  });
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
        customCategories.unshift({ name: value, id });
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
  document.getElementById('categoriesList').addEventListener('touchend', function(){ swipedIdx = null; });
}
function initializeCifraEvents() {
  document.getElementById('songList').addEventListener('click', function(e) {
    const miniatura = e.target.closest('.miniatura-cifra');
    if (miniatura) {
      const fileId = miniatura.dataset.fileid;
      const nome = miniatura.dataset.nome;
      openCifraModal(fileId, nome);
    }
  });
  document.getElementById('closeModalCifra').addEventListener('click', () => {
    document.getElementById('modalCifra').classList.add('hidden');
  });
  document.getElementById('modalCifra').addEventListener('click', function(e){
    if (e.target === this) {
      this.classList.add('hidden');
    }
  });
}

// === FAV MENU FLUTUANTE ===
function setupFavMenu() {
  const favMenu = document.getElementById('favMenu');
  if (!favMenu) return;
  document.getElementById('favMenuToggle').onclick = () => {
    favMenu.classList.toggle('open');
  };
  document.body.addEventListener('click', e => {
    if (!e.target.closest('.fav-menu-container')) {
      favMenu.classList.remove('open');
    }
  });
  function setDarkMode(on) {
    if (on) {
      document.body.classList.add('darkmode');
      localStorage.setItem('darkmode', '1');
    } else {
      document.body.classList.remove('darkmode');
      localStorage.setItem('darkmode', '0');
    }
  }
  if (localStorage.getItem('darkmode') === '1') setDarkMode(true);
  document.getElementById('favDarkMode').onclick = function() {
    const isDark = document.body.classList.contains('darkmode');
    setDarkMode(!isDark);
    this.classList.toggle('active', !isDark);
  };
  document.getElementById('favImportImg').onclick = function() {
    document.getElementById('favFileInput').click();
  };
  document.getElementById('favFileInput').onchange = function(e) {
    const file = e.target.files[0];
    if (file) {
      alert("Imagem importada: " + file.name);
    }
    this.value = '';
  };
  document.getElementById('favTakePhoto').onclick = function() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({video: true})
        .then(stream => {
          alert('Câmera acionada! (implemente sua lógica)');
          stream.getTracks().forEach(track => track.stop());
        })
        .catch(() => alert('Não foi possível acessar a câmera!'));
    } else {
      alert('Este navegador não suporta acesso à câmera.');
    }
  };
  document.getElementById('favSendCloud').onclick = function() {
    alert('Funcionalidade de envio para nuvem ainda não implementada!');
  };
}
