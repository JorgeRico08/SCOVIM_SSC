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
  const oosto = data?.dataOosto || {};
  const resumen = data?.resumen || {};

  const imageUrl =
    oosto?.imageUrl ||
    oosto?.detectionImage ||
    '/public/img/no_imagen.jpg';

  const imageProxy = imageUrl.startsWith('/storage')
    ? `/api/hits/image?url=${encodeURIComponent(imageUrl)}`
    : imageUrl;

  document.getElementById('imgDetenido').src = imageProxy;

  setText('nombreDetenido', data?.nombreCompleto || oosto?.nombreOosto || 'Sujeto detectado');
  setText('aliasDetenido', data?.alias || 'N/A');
  setText('edadDetenido', data?.edad || 'N/A');
  setText('sexoDetenido', data?.sexo || 'N/A');
  setText('fechaNacimiento', formatoFecha(data?.fechaNacimiento || 'N/A'));
  setText('ultimaDeteccion', formatoFecha(resumen?.ultimaDetencion?.fecha));

  setText('nombreCompleto', data?.nombreCompleto || 'N/A');
  setText('domicilio', data?.domicilio || 'N/A');
  setText('origen', data?.origen || 'N/A');
  setText('estadoCivil', data?.estadoCivil || 'N/A');
  setText('conyuge', data?.conyuge || 'N/A');
  setText('ingresoSemanal', formatoMoneda(data?.ingresoSemanal));
  setText('escolaridad', data?.gradoEstudios || 'N/A');
  setText('observaciones', `Cámara: ${oosto?.camera || 'N/A'} | Confianza: ${formatearScore(oosto?.score)}`);

  setText('contadorDetenciones', `${resumen?.total || 0} registros`);

  setText('totalDetenciones', `${resumen?.total || 0} detenciones totales`);
  setText('faltasAdministrativas', `${resumen?.faltasAdministrativas || 0} faltas administrativas`);
  setText('puestasDisposicion', `${resumen?.puestasDisposicion || 0} puestas a disposición`);
  setText('depositos', `${resumen?.depositos || 0} depósitos`);
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
      <div class="detencion-index">#${index + 1}</div>

      <div class="detencion-content">
        <div class="detencion-top">
          <h4>${item.tipoIngreso || 'Evento no especificado'}</h4>
          <span>${formatoFechaHora(item.fecha, item.horaArribo)}</span>
        </div>

        <div class="detencion-grid">
          <div>
            <label>Hora arribo</label>
            <strong>${item.horaArribo || 'N/A'}</strong>
          </div>

          <div>
            <label>Agencia presenta</label>
            <strong>${item.agenciaPresenta || 'N/A'}</strong>
          </div>

          <div>
            <label>Lugar detención</label>
            <strong>${item.lugarDetencion || 'N/A'}</strong>
          </div>

          <div>
            <label>Tipo ingreso</label>
            <strong>${item.tipoIngreso || 'N/A'}</strong>
          </div>

          <!-- <div>
            <label>Fuente</label>
            <strong>${item.fuente || 'N/A'}</strong>
          </div> -->
        </div>

        <div class="detencion-desc">
          <label>Motivo de detención</label>
          <p>${item.motivoDetencion || 'Sin motivo registrado.'}</p>
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
  if (!value || value === 'N/A') return 'N/A';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

function formatoFechaHora(fecha, hora) {
  if (!fecha || fecha === 'N/A') return 'N/A';

  if (!hora || hora === 'N/A') {
    return formatoFecha(fecha);
  }

  return formatoFecha(`${fecha}T${hora}`);
}

function formatearScore(score) {
  const value = Number(score);
  if (Number.isNaN(value)) return 'N/A';
  return `${(value * 100).toFixed(1)}%`;
}

function formatoMoneda(value) {
  const number = Number(value);
  if (Number.isNaN(number)) return 'N/A';

  return number.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN'
  });
}