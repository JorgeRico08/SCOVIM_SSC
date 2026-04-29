document.addEventListener('DOMContentLoaded', () => {
  cargarKardex();
});

async function cargarKardex() {
  try {
    const response = await fetch(`/api/hits/datos-oosto/${iidOosto}`);
    const result = await response.json();

    const data = result?.aData || result?.data || result;

    pintarDatosGenerales(data);
    pintarDetenciones(data?.detenciones || []);

  } catch (error) {
    console.error('Error al cargar kardex:', error);
  }
}

function pintarDatosGenerales(data) {
  const sujetoOosto = data || {};
  const detenido = data?.detenido?.image?.url || {};
  
  const imageUrl =
  data?.image?.url ||
  '/public/img/no-image.png';
  
  const imageProxy = imageUrl.startsWith('/storage')
    ? `/api/hits/image?url=${encodeURIComponent(imageUrl)}`
    : imageUrl;

  document.getElementById('imgDetenido').src = imageProxy;

  setText('nombreDetenido', detenido.nombreCompleto || sujetoOosto.name || 'Sujeto detectado');
  // setText('idOosto', iidOosto);
  setText('aliasDetenido', detenido.alias || 'N/A');
  setText('edadDetenido', detenido.edad || 'N/A');
  setText('sexoDetenido', detenido.sexo || 'N/A');
  setText('ultimaDeteccion', formatoFecha(sujetoOosto.ultimaDeteccion));
  // setText('scoreOosto', sujetoOosto.score ? Number(sujetoOosto.score).toFixed(3) : 'N/A');

  setText('nombreCompleto', detenido.nombreCompleto || 'N/A');
  setText('curp', detenido.curp || 'N/A');
  setText('domicilio', detenido.domicilio || 'N/A');
  setText('ocupacion', detenido.ocupacion || 'N/A');
  setText('escolaridad', detenido.escolaridad || 'N/A');
  setText('observaciones', detenido.observaciones || 'N/A');

  const total = data?.detenciones?.length || 0;

  setText('totalDetenciones', `${total} detenciones`);
  setText('contadorDetenciones', `${total} registros`);

  const estatus = document.getElementById('estatusOosto');
  if (estatus) {
    estatus.textContent = sujetoOosto?.name ? 'Identificado por Oosto' : 'Sin información Oosto';
    estatus.className = sujetoOosto?.name
      ? 'badge-kardex success'
      : 'badge-kardex warning';
  }
}

function pintarDetenciones(detenciones) {
  const container = document.getElementById('detencionesContainer');

  if (!container) return;

  container.innerHTML = '';

  if (!detenciones || detenciones.length === 0) {
    container.innerHTML = `
      <div class="empty-detenciones">
        No se encontraron detenciones registradas.
      </div>
    `;
    return;
  }

  detenciones.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'detencion-card';

    card.innerHTML = `
      <div class="detencion-index">
        #${index + 1}
      </div>

      <div class="detencion-content">
        <div class="detencion-top">
          <h4>${item.tipoEvento || 'Evento no especificado'}</h4>
          <span>${formatoFecha(item.fecha)}</span>
        </div>

        <div class="detencion-grid">
          <div>
            <label>Folio remisión</label>
            <strong>${item.folioRemision || 'N/A'}</strong>
          </div>

          <div>
            <label>Hora ingreso</label>
            <strong>${item.horaIngreso || 'N/A'}</strong>
          </div>

          <div>
            <label>Motivo / Falta</label>
            <strong>${item.motivo || 'N/A'}</strong>
          </div>

          <div>
            <label>Fundamento</label>
            <strong>${item.fundamento || 'N/A'}</strong>
          </div>

          <div>
            <label>Lugar detención</label>
            <strong>${item.lugarDetencion || 'N/A'}</strong>
          </div>

          <div>
            <label>Elemento</label>
            <strong>${item.elemento || 'N/A'}</strong>
          </div>
        </div>

        <div class="detencion-desc">
          <label>Descripción / Hechos</label>
          <p>${item.descripcion || 'Sin descripción registrada.'}</p>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value ?? 'N/A';
}

function formatoFecha(value) {
  if (!value) return 'N/A';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}