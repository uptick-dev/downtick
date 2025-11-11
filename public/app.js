// Screen management
const screens = {
  loading: document.getElementById('loading-screen'),
  setup: document.getElementById('setup-screen'),
  report: document.getElementById('report-screen')
};

let currentReport = 'weekly-variance';

function showScreen(screenName) {
  Object.values(screens).forEach(screen => screen.style.display = 'none');
  if (screens[screenName]) {
    screens[screenName].style.display = 'block';
  }
}

// Initialize app
async function init() {
  try {
    const response = await fetch('/api/user');
    const data = await response.json();
    
    if (data.user) {
      showScreen('report');
      setupNavigationHandlers();
      loadReport();
    } else {
      showScreen('setup');
    }
  } catch (error) {
    console.error('Init error:', error);
    showScreen('setup');
  }
}

// Setup navigation handlers
function setupNavigationHandlers() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const reportType = e.target.getAttribute('data-report');
      loadReport(reportType);
    });
  });
}

// Setup form handling
const setupForm = document.getElementById('setup-form');
const setupBtn = document.getElementById('setup-btn');
const setupError = document.getElementById('setup-error');

setupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const apiToken = document.getElementById('api-token').value;
  
  setupBtn.disabled = true;
  setupBtn.textContent = 'Verifying...';
  setupError.style.display = 'none';
  
  try {
    const response = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, apiToken })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showScreen('report');
      setupNavigationHandlers();
      loadReport();
    } else {
      setupError.textContent = data.error || 'Setup failed';
      setupError.style.display = 'block';
    }
  } catch (error) {
    setupError.textContent = `Error: ${error.message}`;
    setupError.style.display = 'block';
  } finally {
    setupBtn.disabled = false;
    setupBtn.textContent = 'Continue';
  }
});

// Report loading
const reportContainer = document.getElementById('report-container');
const refreshBtn = document.getElementById('refresh-btn');
const reportTitle = document.getElementById('report-title');
const reportSubtitle = document.getElementById('report-subtitle');

async function loadReport(reportType = currentReport, forceRefresh = false) {
  currentReport = reportType;
  
  // Update navigation active state
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  const activeLink = document.querySelector(`[data-report="${reportType}"]`);
  if (activeLink) {
    activeLink.parentElement.classList.add('active');
  }
  
  // Update report title and subtitle
  if (reportType === 'weekly-variance') {
    reportTitle.textContent = 'Weekly RPV Variance Report';
    reportSubtitle.textContent = 'Publisher sites with >10% RPV (Revenue Per View) variation between weeks (last 3 complete weeks)';
  } else if (reportType === 'low-rpv') {
    reportTitle.textContent = 'Low RPV Alert';
    reportSubtitle.textContent = 'Publications with publisher RPV below $0.20 that have dropped since last week';
  } else if (reportType === 'no-activity') {
    reportTitle.textContent = 'No Activity Alert';
    reportSubtitle.textContent = 'Publishers that had activity in the last week but no activity yesterday';
  }
  
  const loadingMessage = forceRefresh ? 'Refreshing data from Uptick API...' : 'Loading report...';
  reportContainer.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>${loadingMessage}</p>
    </div>
  `;
  
  refreshBtn.disabled = true;
  
  try {
    let endpoint = '/api/variance-report';
    if (reportType === 'low-rpv') {
      endpoint = '/api/low-rpv-report';
    } else if (reportType === 'no-activity') {
      endpoint = '/api/no-activity-report';
    }
    const url = forceRefresh ? `${endpoint}?refresh=true` : endpoint;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      reportContainer.innerHTML = `
        <div class="error">${data.error}</div>
      `;
      return;
    }
    
    if (data.sites.length === 0) {
      let emptyMessage, emptySubMessage;
      if (reportType === 'low-rpv') {
        emptyMessage = 'No publications with RPV below $0.20 that have dropped since last week.';
        emptySubMessage = 'All publisher sites are maintaining healthy RPV levels.';
      } else if (reportType === 'no-activity') {
        emptyMessage = 'All publishers that were active last week also had activity yesterday.';
        emptySubMessage = 'No inactive publishers detected.';
      } else {
        emptyMessage = 'No sites with >10% variance found in the last 3 weeks.';
        emptySubMessage = 'This means all publisher sites have stable performance.';
      }
      
      reportContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">✅</div>
          <h3>All Clear!</h3>
          <p>${emptyMessage}</p>
          <p style="margin-top: 10px;">${emptySubMessage}</p>
        </div>
      `;
      return;
    }
    
    if (reportType === 'low-rpv') {
      renderLowRPVReport(data);
    } else if (reportType === 'no-activity') {
      renderNoActivityReport(data);
    } else {
      renderVarianceReport(data);
    }
  } catch (error) {
    reportContainer.innerHTML = `
      <div class="error">Failed to load report: ${error.message}</div>
    `;
  } finally {
    refreshBtn.disabled = false;
  }
}

function renderVarianceReport(data) {
  // Debug: Log the received data
  console.log('Report data received:', data);
  console.log('Week ranges:', data.weekRanges);
  
  // Format date ranges for display
  const formatDateRange = (range) => {
    if (!range) return 'N/A';
    // Parse as local date to avoid timezone shifts
    const start = new Date(range.start + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = new Date(range.end + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${start} - ${end}`;
  };

  const week1Label = data.weekRanges?.week1 ? formatDateRange(data.weekRanges.week1) : 'Week 1';
  const week2Label = data.weekRanges?.week2 ? formatDateRange(data.weekRanges.week2) : 'Week 2';
  const week3Label = data.weekRanges?.week3 ? formatDateRange(data.weekRanges.week3) : 'Week 3';
  
  console.log('Week labels:', { week1Label, week2Label, week3Label });

  let html = `
    <table>
      <thead>
        <tr>
          <th>Publisher Site</th>
          <th>Trend</th>
          <th>${week1Label}</th>
          <th>${week2Label}</th>
          <th>${week3Label}</th>
          <th>Max Variance</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  data.sites.forEach(site => {
    const varianceClass = site.maxVariance > 0 ? 'variance-positive' : 'variance-negative';
    const varianceSymbol = site.maxVariance > 0 ? '+' : '';
    const sparkline = generateSparkline([site.week1Value, site.week2Value, site.week3Value], site.maxVariance > 0);
    
    html += `
      <tr>
        <td><strong>${escapeHtml(site.siteName)}</strong></td>
        <td class="sparkline-cell">${sparkline}</td>
        <td>${formatNumber(site.week1Value)}</td>
        <td>${formatNumber(site.week2Value)}</td>
        <td>${formatNumber(site.week3Value)}</td>
        <td class="${varianceClass}">${varianceSymbol}${site.maxVariance.toFixed(1)}%</td>
      </tr>
    `;
  });
  
  html += `
      </tbody>
    </table>
    <div class="report-meta">
      <p><strong>Report generated:</strong> ${new Date(data.generatedAt).toLocaleString()}</p>
      <p><strong>Variance threshold:</strong> >${data.threshold}%</p>
      <p><strong>Sites with variance:</strong> ${data.sites.length}</p>
    </div>
  `;
  
  reportContainer.innerHTML = html;
}

function formatNumber(num) {
  if (num === null || num === undefined) return 'N/A';
  // Format as currency with up to 4 decimal places for RPV (can be small values)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(num);
}

function capitalizeMetric(metric) {
  if (metric.toLowerCase() === 'rpv') return 'RPV';
  if (metric.toLowerCase() === 'publisher_rpv') return 'Publisher RPV';
  return metric.charAt(0).toUpperCase() + metric.slice(1);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function generateSparkline(values, isPositive) {
  const width = 80;
  const height = 30;
  const padding = 2;
  
  // Filter out invalid values
  const validValues = values.filter(v => v !== null && v !== undefined && !isNaN(v));
  if (validValues.length < 2) {
    return '<span style="color: #86868b;">—</span>';
  }
  
  // Normalize values to fit in the chart
  const min = Math.min(...validValues);
  const max = Math.max(...validValues);
  const range = max - min || 1; // Avoid division by zero
  
  // Generate points for the line
  const points = validValues.map((value, index) => {
    const x = padding + (index / (validValues.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((value - min) / range) * (height - 2 * padding);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  
  // Choose color based on trend direction
  const color = isPositive ? '#0071e3' : '#ff3b30';
  const fillColor = isPositive ? 'rgba(0, 113, 227, 0.1)' : 'rgba(255, 59, 48, 0.1)';
  
  // Create area fill points (line + bottom)
  const areaPoints = points + ` ${width - padding},${height - padding} ${padding},${height - padding}`;
  
  return `
    <svg width="${width}" height="${height}" class="sparkline">
      <polyline 
        points="${areaPoints}" 
        fill="${fillColor}" 
        stroke="none"
      />
      <polyline 
        points="${points}" 
        fill="none" 
        stroke="${color}" 
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `;
}

function renderLowRPVReport(data) {
  const formatDateRange = (range) => {
    if (!range) return 'N/A';
    // Parse as local date to avoid timezone shifts
    const start = new Date(range.start + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = new Date(range.end + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${start} - ${end}`;
  };

  const lastWeekLabel = data.weekRanges?.lastWeek ? formatDateRange(data.weekRanges.lastWeek) : 'Last Week';
  const thisWeekLabel = data.weekRanges?.thisWeek ? formatDateRange(data.weekRanges.thisWeek) : 'This Week';

  let html = `
    <table>
      <thead>
        <tr>
          <th>Publisher Site</th>
          <th>Trend</th>
          <th>${lastWeekLabel} RPV</th>
          <th>${thisWeekLabel} RPV</th>
          <th>Change</th>
          <th>This Week Views</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  data.sites.forEach(site => {
    const changeClass = 'variance-negative';
    const changeSymbol = site.change < 0 ? '' : '+';
    const sparkline = generateSparkline([site.lastWeekRPV, site.thisWeekRPV], false);
    
    html += `
      <tr>
        <td><strong>${escapeHtml(site.siteName)}</strong></td>
        <td class="sparkline-cell">${sparkline}</td>
        <td>${formatNumber(site.lastWeekRPV)}</td>
        <td>${formatNumber(site.thisWeekRPV)}</td>
        <td class="${changeClass}">${changeSymbol}${site.change.toFixed(1)}%</td>
        <td>${site.thisWeekViews.toLocaleString()}</td>
      </tr>
    `;
  });
  
  html += `
      </tbody>
    </table>
    <div class="report-meta">
      <p><strong>Report generated:</strong> ${new Date(data.generatedAt).toLocaleString()}</p>
      <p><strong>RPV threshold:</strong> $${data.rpvThreshold.toFixed(2)}</p>
      <p><strong>Sites below threshold:</strong> ${data.sites.length}</p>
    </div>
  `;
  
  reportContainer.innerHTML = html;
}

function renderNoActivityReport(data) {
  const formatDateRange = (range) => {
    if (!range) return 'N/A';
    // Parse as local date to avoid timezone shifts
    const start = new Date(range.start + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = new Date(range.end + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${start} - ${end}`;
  };

  const yesterdayLabel = data.dateRanges?.yesterday ? formatDateRange(data.dateRanges.yesterday) : 'Yesterday';
  const lastWeekLabel = data.dateRanges?.lastWeek ? formatDateRange(data.dateRanges.lastWeek) : 'Last Week';

  let html = `
    <table>
      <thead>
        <tr>
          <th>Publisher Site</th>
          <th>Status</th>
          <th>Last Week Views</th>
          <th>Last Week Revenue</th>
          <th>Last Week RPV</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  data.sites.forEach(site => {
    html += `
      <tr>
        <td><strong>${escapeHtml(site.siteName)}</strong></td>
        <td><span style="color: #ff3b30;">⚠️ No Activity</span></td>
        <td>${site.lastWeekViews.toLocaleString()}</td>
        <td>${formatNumber(site.lastWeekRevenue)}</td>
        <td>${formatNumber(site.lastWeekRPV)}</td>
      </tr>
    `;
  });
  
  html += `
      </tbody>
    </table>
    <div class="report-meta">
      <p><strong>Report generated:</strong> ${new Date(data.generatedAt).toLocaleString()}</p>
      <p><strong>Yesterday:</strong> ${yesterdayLabel}</p>
      <p><strong>Last week period:</strong> ${lastWeekLabel}</p>
      <p><strong>Inactive publishers:</strong> ${data.sites.length}</p>
    </div>
  `;
  
  reportContainer.innerHTML = html;
}

// Refresh button
refreshBtn.addEventListener('click', () => loadReport(currentReport, true));

// Logout button
const logoutBtn = document.getElementById('logout-btn');
logoutBtn.addEventListener('click', async () => {
  if (!confirm('Are you sure you want to logout? You will need to re-enter your API token.')) {
    return;
  }
  
  try {
    await fetch('/api/logout', { method: 'POST' });
    showScreen('setup');
    setupForm.reset();
  } catch (error) {
    alert(`Logout failed: ${error.message}`);
  }
});

// Start the app
init();
