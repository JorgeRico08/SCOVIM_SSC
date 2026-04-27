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

function abrirModalCamara(camaraId) {
  const modal = document.getElementById('modalCamara');
  const titulo = document.getElementById('modalTitulo');
  const stream = document.getElementById('modalStream');

  titulo.textContent = `Vista completa - ${camaraId}`;
  stream.textContent = `STREAMING COMPLETO ${camaraId}`;

  modal.classList.add('active');
}

function cerrarModalCamara() {
  document.getElementById('modalCamara').classList.remove('active');
}

document.addEventListener('DOMContentLoaded', () => {
  datosOostoDetenidos();

  setInterval(datosOostoDetenidos, 5000);
});