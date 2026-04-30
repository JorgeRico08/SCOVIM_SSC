let camarasGlobal = [];

const hlsCamaras = {};
const hlsModales = {};

const hitsImagenesMap = {};

let dashboardSocket = null;
const socket = io();

document.addEventListener('DOMContentLoaded', async () => {
  inicializarSocketDashboard();
  await cargarCamaras();
});

function inicializarSocketDashboard() {
  dashboardSocket = io(window.location.origin, {
    transports: ['websocket', 'polling']
  });

  dashboardSocket.on('connect', () => {
    console.log('Dashboard conectado al socket interno:', dashboardSocket.id);
  });

  dashboardSocket.on('recognition:created', (hit) => {
    console.log('Nuevo hit en dashboard:', hit);

    /*
    const score = hit?.score ?? 0;
    // VALIDACIÓN DE SCORE (ACTIVAR CUANDO QUIERAS FILTRAR)
    const SCORE_MINIMO = 0.45; // ajusta según tu operación real
    if (score < SCORE_MINIMO) {
      console.warn(`❌ Hit descartado por bajo score: ${score}`);
      return;
    }
    */

    agregarHitEnVivo(hit);
  });

  dashboardSocket.on('camera:status', (data) => {
    console.log('Cambio estado cámara:', data);
    manejarEstadoCamara(data);
  });

  dashboardSocket.on('disconnect', () => {
    console.warn('Dashboard desconectado del socket interno');
  });
}

function agregarHitEnVivo(hit) {
  const container = document.getElementById('hitsContainer');

  if (!container) return;

  const empty = container.querySelector('.empty-hits');
  if (empty) empty.remove();

  const subjectId = hit?.subject?.id || '';
  const nombre = hit?.subject?.name || 'Sujeto detectado';
  const camara = hit?.camera?.title || 'Sin cámara';
  const score = hit?.score ?? 'N/A';

  const scoreNumber = Number(score);
  const scorePercent = !isNaN(scoreNumber)
    ? `${(scoreNumber * 100).toFixed(1)}%`
    : score;

  const images = Array.isArray(hit?.images) ? hit.images : [];

  const imageUrl =
    hit?.subject?.imageUrl ||
    hit?.detectionImageUrl ||
    '/public/img/no-image.png';

  const primeraImagen =
    images.find(x => x.imageType === 0)?.url ||
    images[0]?.url ||
    hit?.detectionImageUrl ||
    hit?.subject?.imageUrl ||
    '/public/img/no-image.png';

  const imageUrlProxyPrimary = primeraImagen.startsWith('/storage')
    ? `/api/hits/image?url=${encodeURIComponent(primeraImagen)}`
    : primeraImagen;

  hitsImagenesMap[hit.id] = images;
  const nivel = obtenerNivelScore(scoreNumber);

  const card = document.createElement('div');
  card.className = 'hit-card hit-card-new';

  card.innerHTML = `
    <img src="${imageUrlProxyPrimary}" alt="Imagen detenido">

    <div class="hit-info">
      <strong>${nombre}</strong>
      <p>Cámara: ${camara}</p>
      <p>Confianza: ${scorePercent} (${nivel})</p>

      <div class="hit-actions">

        <button class="btn-hit subtle" onclick="abrirModalImagenesHit('${hit.id}')">
          Imágenes
        </button>

        <a href="/kardex/${subjectId}" target="_blank" class="btn-hit primary">
          Kardex
        </a>

      </div>
    </div>
  `;

  container.prepend(card);
}

function obtenerNivelScore(score) {
  if (score >= 0.75) return 'ALTO';
  if (score >= 0.55) return 'MEDIO';
  return 'BAJO';
}

function manejarEstadoCamara(data) {
  const camara = camarasGlobal.find(x => x.id === data.id);
  const container = document.getElementById(`stream-${data.id}`);

  if (data.estado === 1) {
    cambiarEstadoCamara(data.id, 'live');

    if (camara && container) {
      pintarVideoCamara(data.id, `${camara.hlsUrl}?t=${Date.now()}`);
    }

    return;
  }

  if (data.estado === 0) {
    destruirHlsCamara(data.id);
    cambiarEstadoCamara(data.id, 'offline');

    if (container) {
      container.innerHTML = `
        <div class="camera-offline-box">
          <div class="offline-icon">
            <i class="bi bi-camera-video-off-fill"></i>
          </div>

          <div class="offline-text">
            <strong style="color:#f87171;">Cámara sin señal</strong>
            <span>${data.motivo || 'Transmisión desconectada'}</span>
          </div>
        </div>
      `;
    }
  }
}
async function cargarCamaras() {
  try {
    const response = await fetch('/api/cameras/obtener-camaras');
    const result = await response.json();

    const camaras = result?.aData?.data || result?.data?.data || result?.data || [];
    console.log('Respuesta cámaras:', result);
    console.log('Cámaras detectadas:', camaras);
    camarasGlobal = camaras;

    pintarCamaras(camaras);

    activarTooltips();
  } catch (error) {
    console.error('Error al cargar cámaras:', error);
  }
}

function pintarCamaras(camaras) {
  const container = document.getElementById('camerasContainer');

  if (!container) return;

  container.innerHTML = '';

  camaras.forEach(camara => {
    const card = document.createElement('div');
    card.className = 'camera-card';
    card.id = `card-${camara.id}`;

    card.innerHTML = `
      <div class="camera-header d-flex justify-content-between align-items-center">
        <span class="badge bg-dark border border-primary">
          ${camara.nombre}
        </span>

        <div class="camera-actions d-flex gap-2">
          <button class="btn btn-sm btn-outline-light border"
            data-bs-toggle="tooltip"
            data-bs-title="Ver en pantalla completa"
            onclick="abrirModalCamara('${camara.id}')">
            <i class="bi bi-fullscreen"></i>
          </button>

          <!---->
          <button class="btn btn-sm btn-outline-danger"
            data-bs-toggle="tooltip"
            data-bs-title="Desconectar cámara"
            onclick="desconectarCamara('${camara.id}')">
            <i class="bi bi-power"></i>
          </button>

          <button class="btn btn-sm btn-outline-success"
            data-bs-toggle="tooltip"
            data-bs-title="Reconectar cámara"
            onclick="reconectarCamara('${camara.id}')">
            <i class="bi bi-arrow-repeat"></i>
          </button>
        </div>
      </div>

      <div class="camera-stream" id="stream-${camara.id}">
        Cargando ${camara.nombre}...
      </div>

      <div class="camera-status-badge" id="status-${camara.id}">
        <span class="dot"></span>
        <span>VALIDANDO</span>
      </div>
    `;

    container.appendChild(card);

    if (camara.estado === 1) {
      cambiarEstadoCamara(camara.id, 'live');
      pintarVideoCamara(camara.id, `${camara.hlsUrl}?t=${Date.now()}`);
    } else {
      cambiarEstadoCamara(camara.id, 'offline');
      pintarCamaraOffline(camara.id, 'Cámara inactiva', 'No se inició transmisión');
    }
  });

  activarTooltips();
}

function pintarVideoCamara(camaraId, hlsUrl) {
  const container = document.getElementById(`stream-${camaraId}`);

  if (!container) return;

  destruirHlsCamara(camaraId);

  container.innerHTML = '';

  const video = document.createElement('video');
  video.controls = false;
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.className = 'camera-video';

  container.appendChild(video);

  inicializarHlsCamara(video, hlsUrl, camaraId);
}

function inicializarHlsCamara(video, hlsUrl, camaraId) {
  if (!window.Hls) {
    console.error('Hls.js no está cargado');
    return;
  }

  if (Hls.isSupported()) {
    const hls = new Hls({
      liveSyncDuration: 2,
      liveMaxLatencyDuration: 5,
      enableWorker: true
    });

    hls.loadSource(hlsUrl);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(err => console.warn('No se pudo reproducir cámara:', err));
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
      console.warn(`Error HLS cámara ${camaraId}:`, data);
    });

    hlsCamaras[camaraId] = hls;
    return;
  }

  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = hlsUrl;
    video.play().catch(() => {});
  }
}

function destruirHlsCamara(camaraId) {
  if (hlsCamaras[camaraId]) {
    hlsCamaras[camaraId].destroy();
    delete hlsCamaras[camaraId];
  }
}

function abrirModalCamara(camaraId) {
  const modal = document.getElementById('modalCamara');
  const titulo = document.getElementById('modalTitulo');
  const stream = document.getElementById('modalStream');

  const camara = camarasGlobal.find(x => x.id === camaraId);

  if (!camara) return;

  cerrarModalCamara();

  titulo.textContent = `Vista completa - ${camara.nombre}`;
  stream.innerHTML = '';

  const video = document.createElement('video');
  video.controls = false;
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.className = 'modal-video';

  stream.appendChild(video);

  inicializarHlsModal(video, `${camara.hlsUrl}?t=${Date.now()}`, camaraId);

  modal.classList.add('active');
}

function inicializarHlsModal(video, hlsUrl, camaraId) {
  const key = `modal-${camaraId}`;

  if (hlsModales[key]) {
    hlsModales[key].destroy();
    delete hlsModales[key];
  }

  if (Hls.isSupported()) {
    const hls = new Hls({
      liveSyncDuration: 2,
      liveMaxLatencyDuration: 5,
      enableWorker: true
    });

    hls.loadSource(hlsUrl);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(() => {});
    });

    hlsModales[key] = hls;
    return;
  }

  video.src = hlsUrl;
  video.play().catch(() => {});
}

function cerrarModalCamara() {
  const modal = document.getElementById('modalCamara');
  const stream = document.getElementById('modalStream');

  Object.keys(hlsModales).forEach(key => {
    hlsModales[key].destroy();
    delete hlsModales[key];
  });

  if (stream) stream.innerHTML = '';
  if (modal) modal.classList.remove('active');
}

async function desconectarCamara(camaraId) {
  try {
    cambiarEstadoCamara(camaraId, 'reconnecting');
    const container = document.getElementById(`stream-${camaraId}`);

    if (container) {
      container.innerHTML = `
        <div class="camera-offline-box">
          <div class="reconnecting-icon">
            <i class="bi bi-arrow-repeat"></i>
          </div>

          <div class="offline-text">
            <strong style="color:#facc15;">Desconectando...</strong>
            <span>Deteniendo transmisión</span>
          </div>
        </div>
      `;
    }

    await fetch(`/api/cameras/${camaraId}/desconectar`, {
      method: 'POST'
    });

    destruirHlsCamara(camaraId);

    cambiarEstadoCamara(camaraId, 'offline');

    if (container) {
      container.innerHTML = `
        <div class="camera-offline-box">

          <div class="offline-icon">
            <i class="bi bi-camera-video-off-fill"></i>
          </div>

          <div class="offline-text">
            <strong>Cámara desconectada</strong>
            <span>Sin señal de video</span>
          </div>

          <div class="offline-actions">
            <button class="btn btn-sm btn-outline-success"
              onclick="reconectarCamara('${camaraId}')">
              <i class="bi bi-arrow-repeat"></i> Reconectar
            </button>
          </div>

        </div>
      `;
    }

  } catch (error) {
    console.error('Error al desconectar cámara:', error);
    cambiarEstadoCamara(camaraId, 'offline');
  }
}

async function reconectarCamara(camaraId) {
  try {
    cambiarEstadoCamara(camaraId, 'reconnecting');

    const container = document.getElementById(`stream-${camaraId}`);

    if (container) {
      container.innerHTML = `
        <div class="camera-offline-box">

          <div class="reconnecting-icon">
            <i class="bi bi-arrow-repeat"></i>
          </div>

          <div class="offline-text">
            <strong style="color:#facc15;">Reconectando...</strong>
            <span>Restableciendo transmisión</span>
          </div>

        </div>
      `;
    }

    await fetch(`/api/cameras/${camaraId}/reconectar`, {
      method: 'POST'
    });

    const camara = camarasGlobal.find(x => x.id === camaraId);

    setTimeout(() => {
      if (!camara) {
        cambiarEstadoCamara(camaraId, 'offline');
        return;
      }

      pintarVideoCamara(camara.id, `${camara.hlsUrl}?t=${Date.now()}`);
      cambiarEstadoCamara(camaraId, 'live');

    }, 2500);


  } catch (error) {
    console.error('Error al reconectar cámara:', error);
    cambiarEstadoCamara(camaraId, 'offline');
  }
}

function destruirHlsCamara(camaraId) {
  if (hlsCamaras[camaraId]) {
    hlsCamaras[camaraId].destroy();
    delete hlsCamaras[camaraId];
  }
}

function activarTooltips() {
  const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');

  tooltipTriggerList.forEach(el => {
    new bootstrap.Tooltip(el);
  });
}

function cambiarEstadoCamara(camaraId, estado) {
  const card = document.getElementById(`card-${camaraId}`);
  const status = document.getElementById(`status-${camaraId}`);

  if (card) {
    card.classList.remove('live', 'offline', 'reconnecting');
    card.classList.add(estado);
  }

  if (!status) return;

  status.classList.remove('live', 'offline', 'reconnecting');
  status.classList.add(estado);

  if (estado === 'live') {
    status.innerHTML = `
      <span class="dot"></span>
      <span>EN VIVO</span>
    `;
  }

  if (estado === 'offline') {
    status.innerHTML = `
      <span class="dot"></span>
      <span>SIN SEÑAL</span>
    `;
  }

  if (estado === 'reconnecting') {
    status.innerHTML = `
      <span class="dot"></span>
      <span>RECONECTANDO</span>
    `;
  }
}

function pintarCamaraOffline(camaraId, titulo, mensaje) {
  const stream = document.getElementById(`stream-${camaraId}`);

  if (!stream) return;

  stream.innerHTML = `
    <div class="camera-offline-box">
      <div class="offline-icon">
        <i class="bi bi-camera-video-off-fill"></i>
      </div>

      <div class="offline-text">
        <strong style="color:#f87171;">${titulo}</strong>
        <span>${mensaje}</span>
      </div>
    </div>
  `;
}

function abrirModalImagenesHit(hitId) {
  const modal = document.getElementById('modalImagenesHit');
  const body = document.getElementById('modalImagenesBody');
  const titulo = document.getElementById('modalImagenesTitulo');

  const images = hitsImagenesMap[hitId] || [];

  titulo.textContent = `Imágenes del hit`;

  if (!images.length) {
    body.innerHTML = `<p>No hay imágenes disponibles.</p>`;
    modal.classList.add('active');
    return;
  }

  body.innerHTML = images.map((img, index) => {
    const url = img.url.startsWith('/storage')
      ? `/api/hits/image?url=${encodeURIComponent(img.url)}`
      : img.url;

    const tipo = img.imageType === 0 ? 'Crop' : 'Large Crop';

    return `
      <div class="hit-image-item">
        <div class="hit-image-header">
          <strong>${index + 1}. ${tipo}</strong>
          <span>Quality: ${img.featuresQuality}</span>
        </div>

        <img src="${url}" alt="Imagen hit ${index + 1}">
      </div>
    `;
  }).join('');

  modal.classList.add('active');
}

function cerrarModalImagenesHit() {
  const modal = document.getElementById('modalImagenesHit');
  const body = document.getElementById('modalImagenesBody');

  body.innerHTML = '';
  modal.classList.remove('active');
}