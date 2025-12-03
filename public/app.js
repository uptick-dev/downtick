// Screen management
const screens = {
  loading: document.getElementById('loading-screen'),
  setup: document.getElementById('setup-screen'),
  report: document.getElementById('report-screen')
};

let currentReport = 'weekly-variance';
let varianceReportData = null;
let varianceSortOrder = 'desc'; // 'desc' = highest absolute variance first (default), 'asc' = lowest first
let monthlyVarianceReportData = null;
let monthlyVarianceSortOrder = 'desc';
let lowRPVReportData = null;
let lowRPVSortOrder = 'desc'; // 'desc' = largest drop first (default), 'asc' = smallest drop first
let currentThreshold = 10; // Default variance threshold percentage

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
      await loadSlackConfig(); // Load Slack configuration
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
const thresholdControl = document.getElementById('threshold-control');
const thresholdInput = document.getElementById('threshold-input');

// Threshold input handling - debounced auto-refresh
let thresholdDebounceTimer = null;
thresholdInput.addEventListener('input', (e) => {
  const value = parseInt(e.target.value, 10);
  if (value >= 1 && value <= 100) {
    currentThreshold = value;
    // Debounce: wait 500ms after user stops typing before refreshing
    clearTimeout(thresholdDebounceTimer);
    thresholdDebounceTimer = setTimeout(() => {
      loadReport(currentReport, true);
    }, 500);
  }
});

// Also handle Enter key for immediate refresh
thresholdInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    clearTimeout(thresholdDebounceTimer);
    const value = parseInt(thresholdInput.value, 10);
    if (value >= 1 && value <= 100) {
      currentThreshold = value;
      loadReport(currentReport, true);
    }
  }
});

async function loadReport(reportType = currentReport, forceRefresh = false) {
  currentReport = reportType;
  
  // Update navigation active state
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  const activeLink = document.querySelector(`[data-report="${reportType}"]`);
  if (activeLink) {
    activeLink.parentElement.classList.add('active');
  }
  
  // Show/hide threshold control based on report type
  const isVarianceReport = reportType === 'weekly-variance' || reportType === 'monthly-variance';
  thresholdControl.style.display = isVarianceReport ? 'flex' : 'none';
  
  // Update report title and subtitle
  if (reportType === 'weekly-variance') {
    reportTitle.textContent = 'Weekly RPV Variance Report';
    reportSubtitle.innerHTML = `Publisher sites with >${currentThreshold}% RPV (Revenue Per View) variation between weeks<br>(last 3 complete weeks)`;
  } else if (reportType === 'monthly-variance') {
    reportTitle.textContent = 'Monthly RPV Variance Report';
    reportSubtitle.innerHTML = `Publisher sites with >${currentThreshold}% RPV (Revenue Per View) variation between months<br>(last 3 complete months + current MTD)`;
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
    if (reportType === 'monthly-variance') {
      endpoint = '/api/monthly-variance-report';
    } else if (reportType === 'low-rpv') {
      endpoint = '/api/low-rpv-report';
    } else if (reportType === 'no-activity') {
      endpoint = '/api/no-activity-report';
    }
    
    // Build URL with query parameters
    const params = new URLSearchParams();
    if (forceRefresh) params.append('refresh', 'true');
    if (isVarianceReport) params.append('threshold', currentThreshold);
    const url = params.toString() ? `${endpoint}?${params.toString()}` : endpoint;
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
      } else if (reportType === 'monthly-variance') {
        emptyMessage = `No sites with >${currentThreshold}% variance found in the last 3 months.`;
        emptySubMessage = 'This means all publisher sites have stable monthly performance.';
      } else {
        emptyMessage = `No sites with >${currentThreshold}% variance found in the last 3 weeks.`;
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
    } else if (reportType === 'monthly-variance') {
      renderMonthlyVarianceReport(data);
    } else {
      renderVarianceReport(data);
    }
    
    // Update PDF button visibility after rendering
    updatePdfButtonVisibility();
  } catch (error) {
    reportContainer.innerHTML = `
      <div class="error">Failed to load report: ${error.message}</div>
    `;
  } finally {
    refreshBtn.disabled = false;
  }
}

function renderVarianceReport(data, sortOrder = 'desc') {
  // Store data for re-sorting
  varianceReportData = data;
  varianceSortOrder = sortOrder;
  
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
          <th class="sortable-header" id="variance-sort-header">Max Variance <span class="sort-indicator">${sortOrder === 'desc' ? '▼' : '▲'}</span></th>
        </tr>
      </thead>
      <tbody>
  `;
  
  // Sort sites based on current sort order
  const sortedSites = [...data.sites].sort((a, b) => {
    if (sortOrder === 'desc') {
      return Math.abs(b.maxVariance) - Math.abs(a.maxVariance);
    } else {
      return Math.abs(a.maxVariance) - Math.abs(b.maxVariance);
    }
  });

  sortedSites.forEach(site => {
    // Debug: log views data
    console.log('Site views data:', site.siteName, { week1Views: site.week1Views, week2Views: site.week2Views, week3Views: site.week3Views });
    
    const varianceClass = site.maxVariance > 0 ? 'variance-positive' : 'variance-negative';
    const varianceSymbol = site.maxVariance > 0 ? '+' : '';
    const sparkline = generateSparkline([site.week1Value, site.week2Value, site.week3Value], site.maxVariance > 0);
    
    html += `
      <tr>
        <td><strong>${escapeHtml(site.siteName)}</strong></td>
        <td class="sparkline-cell">${sparkline}</td>
        <td class="rpv-cell" data-views="Views: ${formatViews(site.week1Views)}">${formatNumber(site.week1Value)}</td>
        <td class="rpv-cell" data-views="Views: ${formatViews(site.week2Views)}">${formatNumber(site.week2Value)}</td>
        <td class="rpv-cell" data-views="Views: ${formatViews(site.week3Views)}">${formatNumber(site.week3Value)}</td>
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
  
  // Add click handler for sorting
  const sortHeader = document.getElementById('variance-sort-header');
  if (sortHeader) {
    sortHeader.addEventListener('click', () => {
      const newSortOrder = varianceSortOrder === 'desc' ? 'asc' : 'desc';
      renderVarianceReport(varianceReportData, newSortOrder);
    });
  }
}

function renderMonthlyVarianceReport(data, sortOrder = 'desc') {
  // Store data for re-sorting
  monthlyVarianceReportData = data;
  monthlyVarianceSortOrder = sortOrder;
  
  // Format month ranges for display
  const formatMonthRange = (range) => {
    if (!range) return 'N/A';
    const start = new Date(range.start + 'T00:00:00');
    const end = new Date(range.end + 'T00:00:00');
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    const year = start.getFullYear();
    
    // If same month, show "Nov 2024" or "Nov 1-30"
    if (startMonth === endMonth) {
      if (range.isCurrentMonth) {
        return `${startMonth} ${start.getDate()}-${end.getDate()} (MTD)`;
      }
      return `${startMonth} ${year}`;
    }
    return `${startMonth} - ${endMonth}`;
  };

  const month1Label = data.monthRanges?.month1 ? formatMonthRange(data.monthRanges.month1) : 'Month 1';
  const month2Label = data.monthRanges?.month2 ? formatMonthRange(data.monthRanges.month2) : 'Month 2';
  const month3Label = data.monthRanges?.month3 ? formatMonthRange(data.monthRanges.month3) : 'Month 3';
  const monthCurrentLabel = data.monthRanges?.monthCurrent ? formatMonthRange(data.monthRanges.monthCurrent) : 'Current MTD';

  let html = `
    <table>
      <thead>
        <tr>
          <th>Publisher Site</th>
          <th>Trend</th>
          <th>${month1Label}</th>
          <th>${month2Label}</th>
          <th>${month3Label}</th>
          <th>${monthCurrentLabel}</th>
          <th class="sortable-header" id="monthly-variance-sort-header">Max Variance <span class="sort-indicator">${sortOrder === 'desc' ? '▼' : '▲'}</span></th>
        </tr>
      </thead>
      <tbody>
  `;
  
  // Sort sites based on current sort order
  const sortedSites = [...data.sites].sort((a, b) => {
    if (sortOrder === 'desc') {
      return Math.abs(b.maxVariance) - Math.abs(a.maxVariance);
    } else {
      return Math.abs(a.maxVariance) - Math.abs(b.maxVariance);
    }
  });

  sortedSites.forEach(site => {
    const varianceClass = site.maxVariance > 0 ? 'variance-positive' : 'variance-negative';
    const varianceSymbol = site.maxVariance > 0 ? '+' : '';
    const sparkline = generateSparkline([site.month1Value, site.month2Value, site.month3Value, site.monthCurrentValue], site.maxVariance > 0);
    
    html += `
      <tr>
        <td><strong>${escapeHtml(site.siteName)}</strong></td>
        <td class="sparkline-cell">${sparkline}</td>
        <td class="rpv-cell" data-views="Views: ${formatViews(site.month1Views)}">${formatNumber(site.month1Value)}</td>
        <td class="rpv-cell" data-views="Views: ${formatViews(site.month2Views)}">${formatNumber(site.month2Value)}</td>
        <td class="rpv-cell" data-views="Views: ${formatViews(site.month3Views)}">${formatNumber(site.month3Value)}</td>
        <td class="rpv-cell" data-views="Views: ${formatViews(site.monthCurrentViews)}">${formatNumber(site.monthCurrentValue)}</td>
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
  
  // Add click handler for sorting
  const sortHeader = document.getElementById('monthly-variance-sort-header');
  if (sortHeader) {
    sortHeader.addEventListener('click', () => {
      const newSortOrder = monthlyVarianceSortOrder === 'desc' ? 'asc' : 'desc';
      renderMonthlyVarianceReport(monthlyVarianceReportData, newSortOrder);
    });
  }
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

function formatViews(views) {
  if (views === null || views === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US').format(Math.round(views));
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

function renderLowRPVReport(data, sortOrder = 'desc') {
  // Store data for re-sorting
  lowRPVReportData = data;
  lowRPVSortOrder = sortOrder;
  
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
          <th class="sortable-header" id="low-rpv-change-sort-header">Change <span class="sort-indicator">${sortOrder === 'desc' ? '▼' : '▲'}</span></th>
          <th>This Week Views</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  // Sort sites based on current sort order (by change percentage)
  const sortedSites = [...data.sites].sort((a, b) => {
    if (sortOrder === 'desc') {
      return a.change - b.change; // Most negative (largest drop) first
    } else {
      return b.change - a.change; // Least negative (smallest drop) first
    }
  });

  sortedSites.forEach(site => {
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
  
  // Add click handler for sorting
  const sortHeader = document.getElementById('low-rpv-change-sort-header');
  if (sortHeader) {
    sortHeader.addEventListener('click', () => {
      const newSortOrder = lowRPVSortOrder === 'desc' ? 'asc' : 'desc';
      renderLowRPVReport(lowRPVReportData, newSortOrder);
    });
  }
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

// PDF Download functionality
const downloadPdfBtn = document.getElementById('download-pdf-btn');

function generateWeeklyVariancePDF() {
  if (!varianceReportData) return;
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Uptick Weekly RPV Variance Report', 14, 20);
  
  // Subtitle
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Publisher sites with >10% RPV variation between weeks (last 3 complete weeks)', 14, 28);
  
  // Format date ranges for headers
  const formatDateRange = (range) => {
    if (!range) return 'N/A';
    const start = new Date(range.start + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = new Date(range.end + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${start} - ${end}`;
  };
  
  const week1Label = varianceReportData.weekRanges?.week1 ? formatDateRange(varianceReportData.weekRanges.week1) : 'Week 1';
  const week2Label = varianceReportData.weekRanges?.week2 ? formatDateRange(varianceReportData.weekRanges.week2) : 'Week 2';
  const week3Label = varianceReportData.weekRanges?.week3 ? formatDateRange(varianceReportData.weekRanges.week3) : 'Week 3';
  
  // Sort sites by absolute variance (descending)
  const sortedSites = [...varianceReportData.sites].sort((a, b) => 
    Math.abs(b.maxVariance) - Math.abs(a.maxVariance)
  );
  
  // Prepare table data
  const tableData = sortedSites.map(site => [
    site.siteName,
    formatNumber(site.week1Value),
    formatNumber(site.week2Value),
    formatNumber(site.week3Value),
    `${site.maxVariance > 0 ? '+' : ''}${site.maxVariance.toFixed(1)}%`
  ]);
  
  // Generate table
  doc.autoTable({
    startY: 35,
    head: [['Publisher Site', week1Label, week2Label, week3Label, 'Max Variance']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [0, 113, 227],
      textColor: 255,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 9,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 60 },
      4: { halign: 'right' }
    },
    didParseCell: function(data) {
      // Color variance column based on positive/negative
      if (data.section === 'body' && data.column.index === 4) {
        const value = parseFloat(data.cell.raw);
        if (value > 0) {
          data.cell.styles.textColor = [0, 113, 227]; // Blue for positive
        } else {
          data.cell.styles.textColor = [255, 59, 48]; // Red for negative
        }
      }
    }
  });
  
  // Footer with metadata
  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Report generated: ${new Date(varianceReportData.generatedAt).toLocaleString()}`, 14, finalY);
  doc.text(`Variance threshold: >${varianceReportData.threshold}%`, 14, finalY + 5);
  doc.text(`Sites with variance: ${varianceReportData.sites.length}`, 14, finalY + 10);
  
  // Save the PDF
  const dateStr = new Date().toISOString().split('T')[0];
  doc.save(`uptick-weekly-variance-report-${dateStr}.pdf`);
}

function generateMonthlyVariancePDF() {
  if (!monthlyVarianceReportData) return;
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Uptick Monthly RPV Variance Report', 14, 20);
  
  // Subtitle
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Publisher sites with >10% RPV variation between months (last 3 complete months + current MTD)', 14, 28);
  
  // Format month ranges for headers
  const formatMonthRange = (range) => {
    if (!range) return 'N/A';
    const start = new Date(range.start + 'T00:00:00');
    const end = new Date(range.end + 'T00:00:00');
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const year = start.getFullYear();
    
    if (range.isCurrentMonth) {
      return `${startMonth} ${start.getDate()}-${end.getDate()} (MTD)`;
    }
    return `${startMonth} ${year}`;
  };
  
  const month1Label = monthlyVarianceReportData.monthRanges?.month1 ? formatMonthRange(monthlyVarianceReportData.monthRanges.month1) : 'Month 1';
  const month2Label = monthlyVarianceReportData.monthRanges?.month2 ? formatMonthRange(monthlyVarianceReportData.monthRanges.month2) : 'Month 2';
  const month3Label = monthlyVarianceReportData.monthRanges?.month3 ? formatMonthRange(monthlyVarianceReportData.monthRanges.month3) : 'Month 3';
  const monthCurrentLabel = monthlyVarianceReportData.monthRanges?.monthCurrent ? formatMonthRange(monthlyVarianceReportData.monthRanges.monthCurrent) : 'Current MTD';
  
  // Sort sites by absolute variance (descending)
  const sortedSites = [...monthlyVarianceReportData.sites].sort((a, b) => 
    Math.abs(b.maxVariance) - Math.abs(a.maxVariance)
  );
  
  // Prepare table data
  const tableData = sortedSites.map(site => [
    site.siteName,
    formatNumber(site.month1Value),
    formatNumber(site.month2Value),
    formatNumber(site.month3Value),
    formatNumber(site.monthCurrentValue),
    `${site.maxVariance > 0 ? '+' : ''}${site.maxVariance.toFixed(1)}%`
  ]);
  
  // Generate table
  doc.autoTable({
    startY: 35,
    head: [['Publisher Site', month1Label, month2Label, month3Label, monthCurrentLabel, 'Max Variance']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [0, 113, 227],
      textColor: 255,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 9,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 50 },
      5: { halign: 'right' }
    },
    didParseCell: function(data) {
      // Color variance column based on positive/negative
      if (data.section === 'body' && data.column.index === 5) {
        const value = parseFloat(data.cell.raw);
        if (value > 0) {
          data.cell.styles.textColor = [0, 113, 227]; // Blue for positive
        } else {
          data.cell.styles.textColor = [255, 59, 48]; // Red for negative
        }
      }
    }
  });
  
  // Footer with metadata
  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Report generated: ${new Date(monthlyVarianceReportData.generatedAt).toLocaleString()}`, 14, finalY);
  doc.text(`Variance threshold: >${monthlyVarianceReportData.threshold}%`, 14, finalY + 5);
  doc.text(`Sites with variance: ${monthlyVarianceReportData.sites.length}`, 14, finalY + 10);
  
  // Save the PDF
  const dateStr = new Date().toISOString().split('T')[0];
  doc.save(`uptick-monthly-variance-report-${dateStr}.pdf`);
}

function downloadCurrentReportPDF() {
  if (currentReport === 'weekly-variance') {
    generateWeeklyVariancePDF();
  } else if (currentReport === 'monthly-variance') {
    generateMonthlyVariancePDF();
  }
}

// Update PDF button visibility based on current report
function updatePdfButtonVisibility() {
  if (currentReport === 'weekly-variance' || currentReport === 'monthly-variance') {
    downloadPdfBtn.style.display = 'inline-block';
  } else {
    downloadPdfBtn.style.display = 'none';
  }
}

downloadPdfBtn.addEventListener('click', downloadCurrentReportPDF);

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

// Slack integration
let slackConfigured = false;

// Get Slack elements safely
function getSlackElements() {
  return {
    slackConfigBtn: document.getElementById('slack-config-btn'),
    sendSlackBtn: document.getElementById('send-slack-btn'),
    slackModal: document.getElementById('slack-modal'),
    slackModalClose: document.querySelector('#slack-modal .modal-close'),
    saveSlackConfigBtn: document.getElementById('save-slack-config-btn'),
    removeSlackConfigBtn: document.getElementById('remove-slack-config-btn'),
    slackWebhookUrlInput: document.getElementById('slack-webhook-url'),
    slackStatus: document.getElementById('slack-status')
  };
}

// Slack modal handlers
document.addEventListener('DOMContentLoaded', () => {
  const elements = getSlackElements();
  
  if (elements.slackConfigBtn) {
    elements.slackConfigBtn.addEventListener('click', async () => {
      await loadSlackConfig();
      if (elements.slackModal) {
        elements.slackModal.style.display = 'flex';
      }
    });
  }
  
  // Handle all modal close buttons
  if (elements.slackModal) {
    const closeButtons = elements.slackModal.querySelectorAll('.modal-close');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.slackModal.style.display = 'none';
      });
    });
    
    // Close when clicking outside
    elements.slackModal.addEventListener('click', (e) => {
      if (e.target === elements.slackModal) {
        elements.slackModal.style.display = 'none';
      }
    });
  }
  
  if (elements.saveSlackConfigBtn) {
    elements.saveSlackConfigBtn.addEventListener('click', saveSlackConfig);
  }
  
  if (elements.removeSlackConfigBtn) {
    elements.removeSlackConfigBtn.addEventListener('click', removeSlackConfig);
  }
  
  if (elements.sendSlackBtn) {
    elements.sendSlackBtn.addEventListener('click', sendToSlack);
  }
});

// Load Slack configuration
async function loadSlackConfig() {
  try {
    const elements = getSlackElements();
    
    // Check if Slack elements exist before trying to use them
    if (!elements.slackWebhookUrlInput || !elements.slackStatus) {
      console.warn('Slack elements not found, skipping config load');
      return;
    }
    
    const response = await fetch('/api/slack-config');
    const data = await response.json();
    
    slackConfigured = data.configured;
    
    if (slackConfigured) {
      if (data.hasDefault) {
        elements.slackStatus.innerHTML = '✅ Slack integration is pre-configured for all users.';
        elements.slackStatus.className = 'slack-status configured';
        elements.slackWebhookUrlInput.value = '***pre-configured***';
        elements.slackWebhookUrlInput.disabled = true;
        if (elements.saveSlackConfigBtn) elements.saveSlackConfigBtn.style.display = 'none';
        if (elements.removeSlackConfigBtn) elements.removeSlackConfigBtn.style.display = 'none';
      } else {
        elements.slackStatus.innerHTML = '✅ Slack integration is configured and ready to use.';
        elements.slackStatus.className = 'slack-status configured';
        elements.slackWebhookUrlInput.value = '***configured***';
        elements.slackWebhookUrlInput.disabled = true;
        if (elements.saveSlackConfigBtn) elements.saveSlackConfigBtn.style.display = 'none';
        if (elements.removeSlackConfigBtn) elements.removeSlackConfigBtn.style.display = 'inline-block';
      }
    } else {
      elements.slackStatus.innerHTML = '⚠️ Slack integration is not configured yet.';
      elements.slackStatus.className = 'slack-status not-configured';
      elements.slackWebhookUrlInput.value = '';
      elements.slackWebhookUrlInput.disabled = false;
      if (elements.saveSlackConfigBtn) elements.saveSlackConfigBtn.style.display = 'inline-block';
      if (elements.removeSlackConfigBtn) elements.removeSlackConfigBtn.style.display = 'none';
    }
    
    updateSlackButtonState();
  } catch (error) {
    console.error('Failed to load Slack config:', error);
    const elements = getSlackElements();
    if (elements.slackStatus) {
      elements.slackStatus.innerHTML = '❌ Failed to load Slack configuration.';
      elements.slackStatus.className = 'slack-status not-configured';
    }
  }
}

// Save Slack configuration
async function saveSlackConfig() {
  const elements = getSlackElements();
  
  // Check if elements exist
  if (!elements.slackWebhookUrlInput) {
    showToast('Slack configuration elements not found', 'error');
    return;
  }
  
  const webhookUrl = elements.slackWebhookUrlInput.value.trim();
  
  if (!webhookUrl) {
    showToast('Please enter a Slack webhook URL', 'error');
    return;
  }
  
  if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
    showToast('Invalid Slack webhook URL format', 'error');
    return;
  }
  
  try {
    if (elements.saveSlackConfigBtn) {
      elements.saveSlackConfigBtn.disabled = true;
      elements.saveSlackConfigBtn.textContent = 'Saving...';
    }
    
    const response = await fetch('/api/slack-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ webhookUrl })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showToast(data.message || 'Slack configuration saved successfully', 'success');
      await loadSlackConfig();
      updateSlackButtonState();
    } else {
      showToast(data.error || 'Failed to save Slack configuration', 'error');
    }
  } catch (error) {
    showToast(`Error: ${error.message}`, 'error');
  } finally {
    if (elements.saveSlackConfigBtn) {
      elements.saveSlackConfigBtn.disabled = false;
      elements.saveSlackConfigBtn.textContent = 'Save Configuration';
    }
  }
}

// Remove Slack configuration
async function removeSlackConfig() {
  if (!confirm('Are you sure you want to remove the Slack integration?')) {
    return;
  }
  
  try {
    const response = await fetch('/api/slack-config', { method: 'DELETE' });
    const data = await response.json();
    
    if (response.ok) {
      showToast('Slack integration removed', 'info');
      await loadSlackConfig();
    } else {
      showToast(data.error || 'Failed to remove Slack configuration', 'error');
    }
  } catch (error) {
    showToast(`Error: ${error.message}`, 'error');
  }
}

// Send to Slack
async function sendToSlack() {
  if (!slackConfigured) {
    showToast('Please configure Slack integration first', 'error');
    return;
  }
  
  const elements = getSlackElements();
  if (!elements.sendSlackBtn) {
    showToast('Send button not found', 'error');
    return;
  }
  
  elements.sendSlackBtn.disabled = true;
  elements.sendSlackBtn.innerHTML = '<img src="assets/slack-logo.svg" alt="Slack" width="16" height="16" style="vertical-align: text-bottom; margin-right: 4px;"> Sending...';
  
  try {
    let endpoint = '/api/slack/send-variance';
    let body = { reportType: 'weekly' };
    
    if (currentReport === 'monthly-variance') {
      body.reportType = 'monthly';
      body.threshold = currentThreshold;
    } else if (currentReport === 'low-rpv') {
      endpoint = '/api/slack/send-low-rpv';
      body = {};
    } else if (currentReport === 'no-activity') {
      endpoint = '/api/slack/send-no-activity';
      body = {};
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showToast(data.message || 'Report sent to Slack!', 'success');
    } else {
      showToast(data.error || 'Failed to send report to Slack', 'error');
    }
  } catch (error) {
    showToast(`Error: ${error.message}`, 'error');
  } finally {
    elements.sendSlackBtn.disabled = false;
    elements.sendSlackBtn.innerHTML = '<img src="assets/slack-logo.svg" alt="Slack" width="16" height="16" style="vertical-align: text-bottom; margin-right: 4px;"> Send to Slack';
  }
}

// Update Slack button states
function updateSlackButtonState() {
  const elements = getSlackElements();
  
  if (!elements.slackConfigBtn || !elements.sendSlackBtn) {
    console.warn('Slack button elements not found, skipping state update');
    return;
  }
  
  if (slackConfigured) {
    elements.slackConfigBtn.classList.add('configured');
    elements.sendSlackBtn.style.display = 'inline-block';
  } else {
    elements.slackConfigBtn.classList.remove('configured');
    elements.sendSlackBtn.style.display = 'none';
  }
}

// Toast notification system
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Hide after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 3000);
}

// What's New Modal
const whatsNewModal = document.getElementById('whats-new-modal');
const whatsNewBody = document.getElementById('whats-new-body');
const whatsNewCloseBtn = document.getElementById('whats-new-close-btn');

async function checkAndShowWhatsNew() {
  try {
    const response = await fetch('/api/should-show-whats-new');
    const data = await response.json();
    
    if (data.shouldShow && data.currentVersion) {
      await showWhatsNew(data.currentVersion);
    }
  } catch (error) {
    console.error('Error checking what\'s new:', error);
  }
}

async function showWhatsNew(version) {
  try {
    const response = await fetch(`/api/whats-new/${version}`);
    const releaseNotes = await response.json();
    
    if (response.ok) {
      displayWhatsNew(releaseNotes);
      whatsNewModal.style.display = 'flex';
    }
  } catch (error) {
    console.error('Error loading what\'s new:', error);
  }
}

function displayWhatsNew(notes) {
  let html = `
    <div class="whats-new-version">Version ${notes.version}</div>
    <div class="whats-new-date">${formatDate(notes.date)}</div>
  `;
  
  if (notes.highlights && notes.highlights.length > 0) {
    html += `
      <div class="whats-new-section">
        <h4>✨ New Features</h4>
        <ul>
          ${notes.highlights.map(item => `<li>${item}</li>`).join('')}
        </ul>
      </div>
    `;
  }
  
  if (notes.bugFixes && notes.bugFixes.length > 0) {
    html += `
      <div class="whats-new-section">
        <h4>🐛 Bug Fixes</h4>
        <ul>
          ${notes.bugFixes.map(item => `<li>${item}</li>`).join('')}
        </ul>
      </div>
    `;
  }
  
  if (notes.notes) {
    html += `
      <div class="whats-new-notes">
        ${notes.notes}
      </div>
    `;
  }
  
  whatsNewBody.innerHTML = html;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

async function markVersionAsSeen(version) {
  try {
    await fetch('/api/version-seen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version })
    });
  } catch (error) {
    console.error('Error marking version as seen:', error);
  }
}

// What's New modal close handlers
whatsNewCloseBtn.addEventListener('click', async () => {
  const versionElement = whatsNewBody.querySelector('.whats-new-version');
  if (versionElement) {
    const version = versionElement.textContent.replace('Version ', '');
    await markVersionAsSeen(version);
  }
  whatsNewModal.style.display = 'none';
});

document.querySelectorAll('#whats-new-modal .modal-close').forEach(btn => {
  btn.addEventListener('click', async () => {
    const versionElement = whatsNewBody.querySelector('.whats-new-version');
    if (versionElement) {
      const version = versionElement.textContent.replace('Version ', '');
      await markVersionAsSeen(version);
    }
    whatsNewModal.style.display = 'none';
  });
});

// Close modal when clicking outside
whatsNewModal.addEventListener('click', async (e) => {
  if (e.target === whatsNewModal) {
    const versionElement = whatsNewBody.querySelector('.whats-new-version');
    if (versionElement) {
      const version = versionElement.textContent.replace('Version ', '');
      await markVersionAsSeen(version);
    }
    whatsNewModal.style.display = 'none';
  }
});

// Start the app
init();

// Check for what's new after a short delay to let the app initialize
setTimeout(() => {
  checkAndShowWhatsNew();
}, 1000);
