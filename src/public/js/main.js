let camarasGlobal = [];
let hlsInstances = {};
const socket = io();

socket.on('camera:status', data => {
  console.log('Cambio estado cámara:', data);

  if (data.estado === 1) {
    cambiarEstadoCamara(data.id, 'live');

    const camara = camarasGlobal.find(x => x.id === data.id);

    if (camara && !hlsInstances[data.id]) {
      pintarVideoCamara(data.id, `${camara.hlsUrl}?t=${Date.now()}`);
    }
  }

  if (data.estado === 0) {
    destruirHlsCamara(data.id);
    cambiarEstadoCamara(data.id, 'offline');

    const container = document.getElementById(`stream-${data.id}`);

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
});

async function cargarHits() {
  const response = await fetch('/api/hits');
  const data = await response.json();

  document.getElementById('resultado').textContent = JSON.stringify(data, null, 2);
}

async function datosOostoDetenidos() {
  try {
    const response = await fetch('/api/hits/datos-oosto');
    const data = await response.json();

    const hits = Array.isArray(data.aData) ? data.aData : [data.aData];

    pintarHits(hits);

  } catch (error) {
    console.error('Error al obtener datos Oosto:', error);
  }
}

function pintarHits(hits) {
  const container = document.getElementById('hitsContainer');

  if (!container) return;

  container.innerHTML = '';

  if (!hits || hits.length === 0 || !hits[0]) {
    container.innerHTML = '<p class="empty-hits">Sin hits detectados.</p>';
    return;
  }

  hits.forEach(hit => {
    const subjectId = hit.subjectId || hit.subject_id || hit.id || '';
    const nombre = hit.subjectName || hit.name || 'Sujeto detectado';
    const camara = hit.cameraName || hit.camera || hit.cameraId || 'Sin cámara';
    const score = hit.score || hit.confidence || 'N/A';

    const imageUrl = hit?.image?.url || hit.imageUrl || '/public/img/no-image.png';
    const imageUrlProxy = `/api/hits/image?url=${encodeURIComponent(imageUrl)}`;

    const card = document.createElement('div');
    card.className = 'hit-card';

    card.innerHTML = `
      <img src="${imageUrlProxy}" alt="Imagen detenido">

      <div class="hit-info">
        <strong>${nombre}</strong>
        <p>Cámara: ${camara}</p>
        <p>Score Hit: ${score}</p>

        <div class="hit-actions">
          <a href="/kardex/" target="_blank">Ver kardex</a>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
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

      <div class="camera-status-badge live" id="status-${camara.id}">
        <span class="dot"></span>
        <span>EN VIVO</span>
      </div>
    `;

    container.appendChild(card);
    if (camara.estado === 1) {
      pintarVideoCamara(camara.id, camara.hlsUrl);
      cambiarEstadoCamara(camara.id, 'live');
    } else {
      cambiarEstadoCamara(camara.id, 'offline');

      const stream = document.getElementById(`stream-${camara.id}`);
      if (stream) {
        stream.innerHTML = `
          <div class="camera-offline-box">
            <div class="offline-icon">
              <i class="bi bi-camera-video-off-fill"></i>
            </div>

            <div class="offline-text">
              <strong style="color:#f87171;">Cámara inactiva</strong>
              <span>No se inició transmisión</span>
            </div>
          </div>
        `;
      }
    }
  });
}

function pintarVideoCamara(camaraId, hlsUrl) {
  const container = document.getElementById(`stream-${camaraId}`);

  if (!container) return;

  container.innerHTML = '';

  const video = document.createElement('video');
  video.controls = false;
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.className = 'camera-video';

  container.appendChild(video);

  inicializarHls(video, hlsUrl, camaraId);
}

function inicializarHls(video, hlsUrl, camaraId) {
  if (hlsInstances[camaraId]) {
    hlsInstances[camaraId].destroy();
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
      video.play().catch(() => { });
    });

    hlsInstances[camaraId] = hls;
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = hlsUrl;
    video.play().catch(() => { });
  }
}

function abrirModalCamara(camaraId) {
  const modal = document.getElementById('modalCamara');
  const titulo = document.getElementById('modalTitulo');
  const stream = document.getElementById('modalStream');

  const camara = camarasGlobal.find(x => x.id === camaraId);

  if (!camara) return;

  titulo.textContent = `Vista completa - ${camara.nombre}`;
  stream.innerHTML = '';

  const video = document.createElement('video');
  video.controls = false;
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.className = 'modal-video';

  stream.appendChild(video);

  inicializarHls(video, camara.hlsUrl, `modal-${camaraId}`);

  modal.classList.add('active');
}

function cerrarModalCamara() {
  const modal = document.getElementById('modalCamara');
  const stream = document.getElementById('modalStream');

  Object.keys(hlsInstances).forEach(key => {
    if (key.startsWith('modal-')) {
      hlsInstances[key].destroy();
      delete hlsInstances[key];
    }
  });

  stream.innerHTML = '';
  modal.classList.remove('active');
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
  if (hlsInstances[camaraId]) {
    hlsInstances[camaraId].destroy();
    delete hlsInstances[camaraId];
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

document.addEventListener('DOMContentLoaded', () => {
  cargarCamaras();
  datosOostoDetenidos();

  setInterval(datosOostoDetenidos, 5000);
});