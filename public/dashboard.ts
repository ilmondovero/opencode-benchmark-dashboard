interface LLMVerification {
  verifiedBy: string;
  timestamp: string;
  correct: boolean;
  score: number;
  reasoning: string;
}

interface ModelResult {
  testCase: string;
  latencyMs: number;
  correct: boolean;
  score: number;
  timestamp: string;
  output: string;
  expected: string;
  verification?: LLMVerification;
}

interface ModelData {
  model: string;
  runs: unknown[];
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  avgLatency: number;
  accuracy: number;
  allResults: ModelResult[];
}

interface DashboardData {
  runs: unknown[];
  models: string[];
  testCases: string[];
}

let modelData: Record<string, ModelData> = {};
let models: string[] = [];
let testCases: string[] = [];

let heatmapResults: Record<string, ModelResult> = {};
let currentKey: string | null = null;

async function loadData(): Promise<void> {
  try {
    const [data, modelsData] = await Promise.all([
      fetch('/api/runs').then(r => r.json()) as Promise<DashboardData>,
      fetch('/api/models').then(r => r.json()) as Promise<Record<string, ModelData>>
    ]);
    
    modelData = modelsData;
    models = Object.keys(modelsData).sort();
    testCases = data.testCases || [];
  } catch (e) {
    console.error('Failed to load data:', e);
  }
}

function getHeatmapClass(correct: boolean, score: number): string {
  if (!correct) {
    if (score >= 0.75) return 'heatmap-fail-100';
    if (score >= 0.5) return 'heatmap-fail-75';
    if (score >= 0.25) return 'heatmap-fail-50';
    return 'heatmap-fail';
  } else {
    if (score >= 1) return 'heatmap-pass-100';
    if (score >= 0.75) return 'heatmap-pass-75';
    if (score >= 0.5) return 'heatmap-pass-50';
    return 'heatmap-pass';
  }
}

function renderHeatmap(selectedModels: string[] = []): void {
  const thead = document.getElementById('heatmapHead');
  const tbody = document.getElementById('heatmapBody');
  if (!thead || !tbody) return;

  const filteredModels = selectedModels.length > 0 ? selectedModels : models;
  
  heatmapResults = {};
  
  thead.innerHTML = '<tr><th class="model-col">Model</th>' + 
    testCases.map(tc => '<th>' + tc + '</th>').join('') + '</tr>';
  
  tbody.innerHTML = filteredModels.map(m => {
    const data = modelData[m];
    const resultsMap: Record<string, ModelResult> = {};
    data.allResults.forEach(r => {
      resultsMap[r.testCase] = r;
      heatmapResults[m + '|' + r.testCase] = r;
    });
    
    const cells = testCases.map(tc => {
      const result = resultsMap[tc];
      if (result) {
        if (!result.output || result.output.trim() === '') {
          return '<td class="heatmap-cell heatmap-empty" data-key="' + m + '|' + tc + '">-</td>';
        }
        const isCorrect = result.verification ? result.verification.correct : result.correct;
        const finalScore = result.verification ? result.verification.score : result.score;
        const cls = getHeatmapClass(isCorrect, finalScore);
        const pct = Math.round(finalScore * 100);
        const seconds = Math.round(result.latencyMs / 1000);
        return '<td class="heatmap-cell ' + cls + '" data-key="' + m + '|' + tc + '">' + pct + '% (' + seconds + 's)</td>';
      }
      return '<td class="heatmap-cell heatmap-empty" data-key="' + m + '|' + tc + '">-</td>';
    });
    
    return '<tr><td class="model-name">' + m + '</td>' + cells.join('') + '</tr>';
  }).join('');
}

function showModal(key: string): void {
  const r = heatmapResults[key];
  if (!r) return;
  currentKey = key;
  const [model, testCase] = key.split('|');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  if (!modalTitle || !modalBody) return;

  modalTitle.textContent = model + ' - ' + testCase;
  const matchClass = r.correct ? 'match' : 'no-match';
  const verification = r.verification;
  const reasoning = verification?.reasoning || '';
  const verifiedBy = verification?.verifiedBy || '';
  const timestamp = verification?.timestamp || '';
  
  modalBody.innerHTML = `
    <div class="modal-section ${matchClass}">
      <h4>Actual Output</h4>
      <pre>${escapeHtml(r.output || '')}</pre>
    </div>
    <div class="modal-section">
      <h4>Expected Output</h4>
      <pre>${escapeHtml(r.expected || '')}</pre>
    </div>
    ${(verifiedBy || timestamp) ? `
    <div class="modal-section">
      <h4>Verification Info</h4>
      <pre>${verifiedBy ? 'Verified by: ' + escapeHtml(verifiedBy) : ''}${timestamp ? '\nTimestamp: ' + escapeHtml(timestamp) : ''}</pre>
    </div>
    ` : ''}
    ${reasoning ? `
    <div class="modal-section">
      <h4>LLM Verification Reasoning</h4>
      <pre>${escapeHtml(reasoning)}</pre>
    </div>
    ` : ''}
  `;
  
  const modalOverlay = document.getElementById('modalOverlay');
  if (modalOverlay) modalOverlay.classList.add('active');
}

function closeModal(): void {
  const modalOverlay = document.getElementById('modalOverlay');
  if (modalOverlay) modalOverlay.classList.remove('active');
  currentKey = null;
}

function getAdjacentKey(key: string, direction: string): string | null {
  if (!key) return null;
  const [model, testCase] = key.split('|');
  const modelIdx = models.indexOf(model);
  const testIdx = testCases.indexOf(testCase);
  if (modelIdx === -1 || testIdx === -1) return null;

  let newModelIdx = modelIdx;
  let newTestIdx = testIdx;

  if (direction === 'left') newTestIdx--;
  else if (direction === 'right') newTestIdx++;
  else if (direction === 'up') newModelIdx--;
  else if (direction === 'down') newModelIdx++;

  if (newModelIdx < 0 || newModelIdx >= models.length) return null;
  if (newTestIdx < 0 || newTestIdx >= testCases.length) return null;

  return models[newModelIdx] + '|' + testCases[newTestIdx];
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Chart plugin to draw persistent labels for selected points
const labelPlugin = {
  id: 'pointLabels',
  afterDraw: (chart: Chart) => {
    const ctx = chart.ctx;
    const xAxis = chart.scales.x;
    const yAxis = chart.scales.y;
    
    selectedPoints.forEach(idx => {
      const point = chart.data.datasets[0].data[idx] as ScatterPoint | undefined;
      if (!point || !point.label) return;
      
      const x = xAxis.getPixelForValue(point.x);
      const y = yAxis.getPixelForValue(point.y);
      
      const label = point.label;
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
      const textWidth = ctx.measureText(label).width;
      const padding = 6;
      const boxWidth = textWidth + padding * 2;
      const boxHeight = 20;
      const boxX = x + 12;
      const boxY = y - boxHeight / 2;
      
      ctx.save();
      ctx.fillStyle = 'rgba(107, 83, 68, 0.9)';
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 4);
      ctx.fill();
      
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, boxX + padding, boxY + boxHeight / 2);
      ctx.restore();
    });
  }
};

interface ScatterPoint {
  x: number;
  y: number;
  label: string;
}

Chart.register(labelPlugin);

let selectedPoints = new Set<number>();
let scatterChart: Chart | null = null;

function createChart(filteredModels?: string[]): void {
  if (scatterChart) scatterChart.destroy();
  
  const ctx = document.getElementById('scatterChart') as HTMLCanvasElement;
  if (!ctx) return;
  
  const displayModels = filteredModels && filteredModels.length > 0 ? filteredModels : models;
  
  scatterChart = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Models',
        data: displayModels.map<ScatterPoint>(m => ({ x: modelData[m].avgLatency, y: modelData[m].accuracy, label: m })),
        backgroundColor: 'rgba(139, 115, 85, 0.7)',
        borderColor: 'rgba(107, 83, 68, 1)',
        borderWidth: 1,
        pointRadius: 8,
        pointHoverRadius: 10
      }]
    },
    options: {
      responsive: true,
      onClick: (_event: unknown, elements: { index: number }[]) => {
        if (elements.length > 0) {
          const idx = elements[0].index;
          if (selectedPoints.has(idx)) {
            selectedPoints.delete(idx);
          } else {
            selectedPoints.add(idx);
          }
          scatterChart?.draw();
        }
      },
      plugins: { 
        title: { display: true, text: 'Accuracy vs Latency' },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const raw = ctx.raw as ScatterPoint;
              const label = raw.label || raw.x;
              return label + ': ' + raw.y + '% accuracy, ' + raw.x + 'ms latency';
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Latency (ms)' }
        },
        y: {
          title: { display: true, text: 'Accuracy (%)' },
          min: 0,
          max: 100
        }
      }
    }
  });
}

function updateStats(data: { runs: unknown[]; models: unknown }): void {
  const totalModelsEl = document.getElementById('totalModels');
  const totalRunsEl = document.getElementById('totalRuns');
  if (totalModelsEl) totalModelsEl.textContent = String(models.length);
  if (totalRunsEl) totalRunsEl.textContent = String(data.runs.length);
}

function updateStatsFiltered(filteredModels: string[]): void {
  const totalModelsEl = document.getElementById('totalModels');
  const totalRunsEl = document.getElementById('totalRuns');
  
  if (filteredModels.length === 0) {
    if (totalModelsEl) totalModelsEl.textContent = String(models.length);
  } else {
    if (totalModelsEl) totalModelsEl.textContent = String(filteredModels.length);
  }
  
  const filteredRuns = new Set<string>();
  for (const m of filteredModels) {
    const data = modelData[m];
    if (data?.runs) {
      for (const run of data.runs) {
        filteredRuns.add((run as { runId: string }).runId);
      }
    }
  }
  if (totalRunsEl) totalRunsEl.textContent = String(filteredRuns.size);
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Close modal handlers
  const modalClose = document.getElementById('modalClose');
  const modalOverlay = document.getElementById('modalOverlay');
  
  modalClose?.addEventListener('click', () => closeModal());
  modalOverlay?.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('modalOverlay');
    if (!modal?.classList.contains('active')) return;

    if (e.key === 'Escape') {
      closeModal();
      return;
    }

    if (currentKey) {
      if (e.key === 'ArrowLeft') {
        const newKey = getAdjacentKey(currentKey, 'left');
        if (newKey && heatmapResults[newKey]) { showModal(newKey); e.preventDefault(); }
      } else if (e.key === 'ArrowRight') {
        const newKey = getAdjacentKey(currentKey, 'right');
        if (newKey && heatmapResults[newKey]) { showModal(newKey); e.preventDefault(); }
      } else if (e.key === 'ArrowUp') {
        const newKey = getAdjacentKey(currentKey, 'up');
        if (newKey && heatmapResults[newKey]) { showModal(newKey); e.preventDefault(); }
      } else if (e.key === 'ArrowDown') {
        const newKey = getAdjacentKey(currentKey, 'down');
        if (newKey && heatmapResults[newKey]) { showModal(newKey); e.preventDefault(); }
      }
    }
  });

  // Heatmap cell click
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('heatmap-cell') && target.dataset.key) {
      showModal(target.dataset.key);
    }
  });

  // Model filter
  function populateModelSelect(): void {
    const modelSelect = document.getElementById('modelSelect') as HTMLSelectElement;
    if (!modelSelect) return;
    modelSelect.innerHTML = models.map(m => '<option value="' + m + '">' + m + '</option>').join('');
  }

  function applyFilter(): void {
    const modelSelect = document.getElementById('modelSelect') as HTMLSelectElement;
    const selected = Array.from(modelSelect?.selectedOptions || []).map(opt => opt.value).filter(v => v);
    const selectedModels = selected.length > 0 ? selected : [];
    renderHeatmap(selectedModels);
    createChart(selectedModels);
    updateStatsFiltered(selectedModels);
  }

  const modelSelect = document.getElementById('modelSelect') as HTMLSelectElement;

  const filterBtn = document.getElementById('filterBtn');
  filterBtn?.addEventListener('click', applyFilter);

  const clearFilterBtn = document.getElementById('clearFilterBtn');
  clearFilterBtn?.addEventListener('click', () => {
    if (modelSelect) {
      Array.from(modelSelect.options).forEach(opt => opt.selected = false);
    }
  });

  // Refresh button
  const refreshBtn = document.getElementById('refreshBtn');
  refreshBtn?.addEventListener('click', async () => {
    const btn = refreshBtn;
    btn.textContent = 'Loading...';
    try {
      const res = await fetch('/api/refresh');
      const fresh = await res.json() as { runs: unknown[]; models: Record<string, ModelData> };
      
      // Update global variables
      (window as unknown as { modelData: Record<string, ModelData> }).modelData = fresh.models;
      (window as unknown as { models: string[] }).models = Object.keys(fresh.models).sort();
      
      // Update filter dropdown
      populateModelSelect();
      
      // Clear filter
      const modelSelectRefresh = document.getElementById('modelSelect') as HTMLSelectElement;
      if (modelSelectRefresh) {
        Array.from(modelSelectRefresh.options).forEach(opt => opt.selected = false);
      }
      
      createChart();
      updateStats(fresh);
      renderHeatmap([]);
    } catch (e) {
      console.error('Refresh failed:', e);
    }
    btn.textContent = 'Refresh';
  });

  // Initial render - wait for data to load first
  await loadData();
  populateModelSelect();
  createChart();
  updateStats({ runs: [], models });
  renderHeatmap();
});
