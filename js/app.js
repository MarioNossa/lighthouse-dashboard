const API_KEY = 'AIzaSyDAoLsRkVih2hvLyxh6F_eW8mewQNSEfIM';

// Mensajes creativos para el modal
const waitingMessages = [
  "Mientras espera... ¡canta como si nadie te escuchara! 🎤",
  "¿Ya te estiraste hoy? Hazlo mientras analizamos... 🤸‍♂️",
  "El café siempre es buena idea en tiempos de espera ☕️",
  "Respira profundo... la paciencia es clave 🧘",
  "Esto está quedando increíble, espera un poco más 🚀"
];

let modalInterval;
let modalCurrent = 0;

// Muestra el modal de análisis
function showModal() {
  let modal = document.getElementById('analyze-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'analyze-modal';
    modal.className = "fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-60";
    modal.innerHTML = `
      <div class="bg-white p-8 rounded-lg shadow-lg text-center flex flex-col items-center">
        <div class="mb-4 animate-spin">
          <svg width="40" height="40" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="35" stroke="#2563eb" stroke-width="10" fill="none" stroke-dasharray="164" stroke-dashoffset="124"></circle>
          </svg>
        </div>
        <div id="modal-message" class="text-lg font-semibold mb-2">${waitingMessages[0]}</div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  // Mensaje cíclico
  modalCurrent = 0;
  document.getElementById('modal-message').textContent = waitingMessages[modalCurrent];
  modalInterval = setInterval(() => {
    modalCurrent = (modalCurrent + 1) % waitingMessages.length;
    document.getElementById('modal-message').textContent = waitingMessages[modalCurrent];
  }, 3000);
  modal.style.display = 'flex';
}

// Oculta el modal de análisis
function hideModal() {
  clearInterval(modalInterval);
  const modal = document.getElementById('analyze-modal');
  if (modal) modal.style.display = 'none';
}

// Mensaje de error visual
function showError(message) {
  let alert = document.getElementById('error-alert');
  if (!alert) {
    alert = document.createElement('div');
    alert.id = 'error-alert';
    alert.className = 'fixed top-8 left-1/2 transform -translate-x-1/2 z-50 bg-red-500 text-white px-6 py-3 rounded shadow-lg text-lg font-bold max-w-xl w-fit break-words';
    document.body.appendChild(alert);
  }
  alert.textContent = message;
  alert.style.display = 'block';
  setTimeout(() => {
    alert.style.display = 'none';
  }, 10000);
}

document.getElementById('analyzeBtn').addEventListener('click', async () => {
  const urls = [
    document.getElementById('url1').value,
    document.getElementById('url2').value,
    document.getElementById('url3').value,
    document.getElementById('url4').value,
  ].filter(Boolean);

  if (urls.length === 0) {
    showError('Debes ingresar al menos una URL');
    return;
  }

  showModal();

  const resultsContainer = document.getElementById('results');
  resultsContainer.innerHTML = '';

  for (const url of urls) {
    const data = await fetchLighthouseData(url);
    if (data && data.categories) {
      renderResult(url, data.categories);
      saveToHistory(url, data.categories);
    } else if (data && data.apiError) {
      showError(`Error al analizar ${url}: ${data.apiError}`);
    } else {
      showError(`No se pudo analizar correctamente la URL: ${url}`);
    }
  }
  hideModal();
  // Re-dibujar la gráfica con los datos actualizados
  renderChart();
});

async function fetchLighthouseData(url) {
  const api = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=desktop&key=${API_KEY}`;
  try {
    const res = await fetch(api);
    const json = await res.json();
    if (!json.lighthouseResult) {
      // Mostrar en pantalla el error que devuelve la API
      let apiErrorMsg = (json.error && json.error.message) ? json.error.message : JSON.stringify(json);
      return { apiError: apiErrorMsg };
    }
    return json.lighthouseResult;
  } catch (e) {
    showError(`Error al obtener datos para ${url}: ${e.message}`);
    return null;
  }
}

// Solo las 4 métricas clave
function renderResult(url, categories) {
  const results = document.getElementById('results');

  const labels = {
    performance: "Rendimiento",
    accessibility: "Accesibilidad",
    "best-practices": "Buenas prácticas",
    seo: "SEO"
  };

  const getScore = (cat) =>
    categories[cat]?.score != null ? Math.round(categories[cat].score * 100) : 'N/A';

  const html = `
    <div class="bg-white shadow rounded p-4">
      <h2 class="text-lg font-bold mb-2">${url}</h2>
      <ul class="space-y-1">
        ${Object.entries(labels)
          .map(([key, label]) => `<li><strong>${label}:</strong> ${getScore(key)}</li>`)
          .join('')}
      </ul>
    </div>
  `;

  results.insertAdjacentHTML('beforeend', html);
}

function saveToHistory(url, data) {
  if (!data || !data.performance || !data.accessibility || !data.seo || !data["best-practices"]) {
    showError(`Datos incompletos para ${url}, no se guardó en historial.`);
    return;
  }

  const history = JSON.parse(localStorage.getItem('lighthouse-history') || '{}');
  if (!history[url]) history[url] = [];
  history[url].push({
    date: new Date().toISOString(),
    performance: Math.round(data.performance.score * 100),
    accessibility: Math.round(data.accessibility.score * 100),
    bestPractices: Math.round(data["best-practices"].score * 100),
    seo: Math.round(data.seo.score * 100)
  });
  localStorage.setItem('lighthouse-history', JSON.stringify(history));
}

function exportToCSV() {
  const history = JSON.parse(localStorage.getItem('lighthouse-history') || '{}');
  let csv = "URL,Fecha,Rendimiento,Accesibilidad,Buenas prácticas,SEO\n";

  for (const url in history) {
    history[url].forEach(entry => {
      csv += `${url},${entry.date},${entry.performance},${entry.accessibility},${entry.bestPractices},${entry.seo}\n`;
    });
  }

  const blob = new Blob([csv.replace(/\n/g, "\r\n")], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = "lighthouse_report.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

document.addEventListener('DOMContentLoaded', () => {
  const exportBtn = document.createElement('button');
  exportBtn.textContent = "Exportar CSV";
  exportBtn.className = "mt-4 px-4 py-2 bg-green-600 text-white rounded ml-2";
  exportBtn.onclick = exportToCSV;
  document.querySelector('body').appendChild(exportBtn);
  renderChart(); // dibujar gráfica al cargar
});

// Nueva gráfica con las 4 métricas abajo
function renderChart() {
  const ctx = document.getElementById('historyChart').getContext('2d');
  const history = JSON.parse(localStorage.getItem('lighthouse-history') || '{}');

  // Borra el canvas si ya existe un gráfico
  if (window.lhChart && typeof window.lhChart.destroy === 'function') {
    window.lhChart.destroy();
  }

  const metrics = [
    { key: "performance", label: "Rendimiento", color: "hsl(220, 70%, 55%)" },
    { key: "accessibility", label: "Accesibilidad", color: "hsl(120, 60%, 50%)" },
    { key: "bestPractices", label: "Buenas prácticas", color: "hsl(35, 90%, 55%)" },
    { key: "seo", label: "SEO", color: "hsl(320, 70%, 50%)" }
  ];

  const datasets = [];
  let colorIndex = 0;

  Object.entries(history).forEach(([url, records]) => {
    metrics.forEach((metric, i) => {
      datasets.push({
        label: `${metric.label} - ${url}`,
        data: records.map(entry => ({
          x: new Date(entry.date),
          y: entry[metric.key]
        })),
        borderColor: metric.color,
        backgroundColor: metric.color + "44",
        fill: false,
        tension: 0.2,
        borderDash: [4 * i, 4 * i + 2],
        pointRadius: 3
      });
    });
    colorIndex++;
  });

  window.lhChart = new Chart(ctx, {
    type: 'line',
    data: { datasets },
    options: {
      parsing: { xAxisKey: 'x', yAxisKey: 'y' },
      scales: {
        x: {
          type: 'time',
          time: { unit: 'day' },
          title: { display: true, text: 'Fecha' }
        },
        y: {
          title: { display: true, text: 'Puntaje (%)' },
          min: 0, max: 100
        }
      },
      plugins: {
        title: { display: true, text: 'Evolución de Métricas Lighthouse por URL' },
        legend: { display: true, position: 'top' }
      }
    }
  });
}
