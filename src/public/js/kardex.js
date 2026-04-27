async function datosOostoDetenidos() {
  try {
    const response = await fetch('/api/hits/datos-oosto');
    const data = await response.json();

    const imageUrl = data?.aData?.image?.url;
    
    if (imageUrl) {
      document.getElementById('imgDetenido').src = `/api/hits/image?url=${encodeURIComponent(imageUrl)}`;
    } else {
      console.warn('No se encontró imagen');
    }
    
    document.getElementById('resultado').textContent = JSON.stringify(data, null, 2);

  } catch (error) {
    console.error('Error al obtener datos:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  datosOostoDetenidos();
});