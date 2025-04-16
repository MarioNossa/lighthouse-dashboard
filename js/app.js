const API_KEY = 'AIzaSyDAoLsRkVih2hvLyxh6F_eW8mewQNSEfIM';

document.getElementById('analyzeBtn').addEventListener('click', async () => {
  const urls = [
    document.getElementById('url1').value,
    document.getElementById('url2').value,
    document.getElementById('url3').value,
    document.getElementById('url4').value,
  ].filter(Boolean);

  if (urls.length === 0) {
    alert('Debes ingresar al menos una URL');
    return;
  }

  const resultsContainer = document.getElementById('results');
  resultsContainer.innerHTML = '';

  for (const url of urls) {
    const data = await fetchLighthouseData(url);
    if (data) renderResult(url, data);
    saveToHistory(url, data);
  }
});

async function fetchLighthouseData(url) {
  const api = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=desktop&key=${API_KEY}`;
  try {
    const res = await fetch(api);
    const json = await res.json();
    return json.lighthouseResult?.categories;
  } catch (e) {
    console.error('Error al obtener los datos:', e);
    return null;
  }
}

function renderResult(url, categories) {
  const results = document.getElementById('results');
  const getScore = (cat) => categories[cat]?.score ? Math.round(categories[cat].score * 100) : 'N/A';

  const html = `
    <div class="bg-white shadow rounded p-4">
      <h2 class="text-lg font-bold mb-2">${url}</h2>
      <ul class="space-y-1">
        <li><strong>Performance:</strong> ${getScore('performance')}</li>
        <li><strong>Accesibilidad:</strong> ${getScore('accessibility')}</li>
        <li><strong>Buenas prácticas:</strong> ${getScore('best-practices')}</li>
        <li><strong>SEO:</strong> ${getScore('seo')}</li>
        <li><strong>PWA:</strong> ${getScore('pwa')}</li>
      </ul>
    </div>
  `;

  results.insertAdjacentHTML('beforeend', html);
}

function saveToHistory(url, data) {
  const history = JSON.parse(localStorage.getItem('lighthouse-history') || '{}');
  if (!history[url]) history[url] = [];
  history[url].push({
    date: new Date().toISOString(),
    performance: Math.round(data.performance.score * 100),
    accessibility: Math.round(data.accessibility.score * 100),
    seo: Math.round(data.seo.score * 100),
  };
  localStorage.setItem('lighthouse-history', JSON.stringify(history));
}


function exportToCSV() {
  const history = JSON.parse(localStorage.getItem('lighthouse-history') || '{}');
  let csv = "URL,Fecha,Performance,Accessibility,SEO\n";
  for (const url in history) {
    const h = history[url];
    csv += `${url},${h.date},${h.performance},${h.accessibility},${h.seo}\n`;
  }

  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = "lighthouse_report.csv";
  link.click();
}

document.addEventListener('DOMContentLoaded', () => {
  const exportBtn = document.createElement('button');
  exportBtn.textContent = "Exportar CSV";
  exportBtn.className = "mt-4 px-4 py-2 bg-green-600 text-white rounded ml-2";
  exportBtn.onclick = exportToCSV;
  document.querySelector('body').appendChild(exportBtn);
});

function renderChart() {
  const ctx = document.getElementById('historyChart').getContext('2d');
  const history = JSON.parse(localStorage.getItem('lighthouse-history') || '{}');

  const labels = Object.keys(history);
  const performance = labels.map(url => history[url].performance);
  const accessibility = labels.map(url => history[url].accessibility);
  const seo = labels.map(url => history[url].seo);

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Performance',
          data: performance,
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
        },
        {
          label: 'Accessibility',
          data: accessibility,
          backgroundColor: 'rgba(153, 102, 255, 0.5)',
        },
        {
          label: 'SEO',
          data: seo,
          backgroundColor: 'rgba(255, 159, 64, 0.5)',
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        title: { display: true, text: 'Historial de Métricas por URL' }
      }
    }
  });
}

function renderChart() {
  const ctx = document.getElementById('historyChart').getContext('2d');
  const history = JSON.parse(localStorage.getItem('lighthouse-history') || '{}');

  const datasets = [];
  let labels = new Set();

  Object.entries(history).forEach(([url, records], i) => {
    const perfData = records.map(entry => ({
      x: new Date(entry.date),
      y: entry.performance
    }));
    datasets.push({
      label: `Performance - ${url}`,
      data: perfData,
      fill: false,
      borderColor: `hsl(${i * 60}, 70%, 50%)`,
      tension: 0.1
    });
    records.forEach(r => labels.add(new Date(r.date).toISOString().split("T")[0]));
  });

  new Chart(ctx, {
    type: 'line',
    data: {
      datasets: datasets
    },
    options: {
      parsing: {
        xAxisKey: 'x',
        yAxisKey: 'y'
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'day'
          },
          title: { display: true, text: 'Fecha' }
        },
        y: {
          title: { display: true, text: 'Performance' }
        }
      },
      plugins: {
        legend: { position: 'top' },
        title: { display: true, text: 'Evolución de Performance por URL' }
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', renderChart);
