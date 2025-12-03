const express = require('express');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const axios = require('axios');
const os = require('os');

const app = express();
let server;
let dataPath;
let encryptionKeyPath;
let cachePath;
let ENCRYPTION_KEY;

// Get data path from environment or use default
const DATA_DIR = process.env.DOWNTICK_DATA_PATH || 
  path.join(os.homedir(), 'Library', 'Application Support', 'Downtick');

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize data storage
function initDataStorage() {
  dataPath = path.join(DATA_DIR, 'user-data.json');
  encryptionKeyPath = path.join(DATA_DIR, '.encryption-key');
  cachePath = path.join(DATA_DIR, 'report-cache.json');
  
  // Ensure directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  // Initialize or load encryption key
  if (fs.existsSync(encryptionKeyPath)) {
    // Load existing key
    const keyData = fs.readFileSync(encryptionKeyPath, 'utf8');
    ENCRYPTION_KEY = Buffer.from(keyData, 'hex');
  } else {
    // Generate new key and save it
    ENCRYPTION_KEY = crypto.randomBytes(32);
    fs.writeFileSync(encryptionKeyPath, ENCRYPTION_KEY.toString('hex'), 'utf8');
  }
  
  // Initialize user data file if it doesn't exist
  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, JSON.stringify({ user: null }), 'utf8');
  }
  
  console.log(`✓ Data directory: ${DATA_DIR}`);
}

// Get default Slack webhook from environment variable
function getDefaultSlackWebhook() {
  return process.env.SLACK_WEBHOOK_URL || null;
}

function getData() {
  try {
    const data = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { user: null };
  }
}

function saveData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
}

// Cache management
function getCache() {
  try {
    if (fs.existsSync(cachePath)) {
      const data = fs.readFileSync(cachePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading cache:', error.message);
  }
  return {};
}

function saveCache(cache) {
  try {
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving cache:', error.message);
  }
}

function isCacheValid(cacheEntry) {
  if (!cacheEntry || !cacheEntry.timestamp) return false;
  
  const now = new Date();
  const cacheDate = new Date(cacheEntry.timestamp);
  
  // Check if cache is from today (same day)
  return now.toDateString() === cacheDate.toDateString();
}

// Encryption functions
function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return { encrypted, iv: iv.toString('hex') };
}

function decrypt(encrypted, ivHex) {
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Uptick API Service
class UptickAPI {
  constructor(token) {
    this.token = token;
    this.baseURL = 'https://dashboard.uptick.com';
  }

  getAuthHeader() {
    const encoded = Buffer.from(`${this.token}:X`).toString('base64');
    return `Basic ${encoded}`;
  }

  async fetchWeeklyData(weeksAgo) {
    // Calculate rolling 7-day periods
    // weeksAgo = 0: last 7 complete days (today-7 to today-1)
    // weeksAgo = 1: days 8-14 ago
    // weeksAgo = 2: days 15-21 ago
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() - (weeksAgo * 7 + 1)); // End yesterday for week 0
    
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6); // 7 days total

    const dateRange = {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    };

    const baseParams = {
      date_range: 'custom',
      date_from: startDate.toISOString().split('T')[0],
      date_to: endDate.toISOString().split('T')[0],
      pivot: 'Day',
      sort_field: 'impressions',
      sort_order: 'desc'
    };

    try {
      let allData = [];
      let page = 1;
      let hasMorePages = true;
      const maxPages = 100; // Safety limit to prevent infinite loops
      let lastResponse;

      while (hasMorePages && page <= maxPages) {
        const params = new URLSearchParams({
          ...baseParams,
          page: page.toString()
        });

        const response = await axios.get(`${this.baseURL}/?${params}`, {
          headers: {
            'Authorization': this.getAuthHeader(),
            'Accept': 'application/json'
          },
          timeout: 30000
        });

        lastResponse = response;
        const pageData = response.data.data || [];
        
        if (pageData.length === 0) {
          // No more data, stop pagination
          hasMorePages = false;
        } else {
          allData = allData.concat(pageData);
          console.log(`Fetched page ${page}: ${pageData.length} records (total: ${allData.length})`);
          
          // Check for pagination indicators
          // Common patterns: next_page, has_more, total_pages, etc.
          if (response.data.next_page === false || 
              response.data.has_more === false ||
              (response.data.total_pages && page >= response.data.total_pages)) {
            hasMorePages = false;
          } else {
            page++;
          }
        }
      }

      console.log(`Pagination complete: ${allData.length} total records from ${page - 1} pages`);
      
      // Process daily data into site-level aggregates for the rolling 7-day period
      const processedData = this.processDailyData(allData);
      
      return { 
        success: true,
        dateRange,
        data: { 
          ...lastResponse.data,
          data: processedData,
          total_records: processedData.length,
          pages_fetched: page - 1
        } 
      };
    } catch (error) {
      return { 
        success: false,
        dateRange,
        error: error.response?.data?.message || error.message 
      };
    }
  }

  async fetchMonthlyData(monthsAgo, isCurrentMonth = false) {
    // Calculate monthly date ranges
    // monthsAgo = 0: current month to date (1st of month to yesterday)
    // monthsAgo = 1: last complete month
    // monthsAgo = 2: 2 months ago (complete)
    // monthsAgo = 3: 3 months ago (complete)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let startDate, endDate;
    
    if (isCurrentMonth) {
      // Current month: 1st of this month to yesterday
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today);
      endDate.setDate(endDate.getDate() - 1); // Yesterday
    } else {
      // Complete month: monthsAgo months back
      const targetMonth = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1);
      startDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
      endDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0); // Last day of month
    }

    const dateRange = {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
      isCurrentMonth
    };

    // If start date is after end date (e.g., 1st of month and today is the 1st), return empty
    if (startDate > endDate) {
      return {
        success: true,
        dateRange,
        data: { data: [], total_records: 0, pages_fetched: 0 }
      };
    }

    const baseParams = {
      date_range: 'custom',
      date_from: startDate.toISOString().split('T')[0],
      date_to: endDate.toISOString().split('T')[0],
      pivot: 'Day',
      sort_field: 'impressions',
      sort_order: 'desc'
    };

    try {
      let allData = [];
      let page = 1;
      let hasMorePages = true;
      const maxPages = 100;
      let lastResponse;

      while (hasMorePages && page <= maxPages) {
        const params = new URLSearchParams({
          ...baseParams,
          page: page.toString()
        });

        const response = await axios.get(`${this.baseURL}/?${params}`, {
          headers: {
            'Authorization': this.getAuthHeader(),
            'Accept': 'application/json'
          },
          timeout: 30000
        });

        lastResponse = response;
        const pageData = response.data.data || [];
        
        if (pageData.length === 0) {
          hasMorePages = false;
        } else {
          allData = allData.concat(pageData);
          console.log(`Monthly data page ${page}: ${pageData.length} records (total: ${allData.length})`);
          
          if (response.data.next_page === false || 
              response.data.has_more === false ||
              (response.data.total_pages && page >= response.data.total_pages)) {
            hasMorePages = false;
          } else {
            page++;
          }
        }
      }

      console.log(`Monthly pagination complete: ${allData.length} total records from ${page - 1} pages`);
      
      // Process daily data into site-level aggregates for the month
      const processedData = this.processDailyData(allData);
      
      return { 
        success: true,
        dateRange,
        data: { 
          ...lastResponse.data,
          data: processedData,
          total_records: processedData.length,
          pages_fetched: page - 1
        } 
      };
    } catch (error) {
      return { 
        success: false,
        dateRange,
        error: error.response?.data?.message || error.message 
      };
    }
  }

  async fetchYesterdayData() {
    // Fetch data for yesterday only
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateRange = {
      start: yesterday.toISOString().split('T')[0],
      end: yesterday.toISOString().split('T')[0]
    };

    const baseParams = {
      date_range: 'custom',
      date_from: yesterday.toISOString().split('T')[0],
      date_to: yesterday.toISOString().split('T')[0],
      pivot: 'Day',
      sort_field: 'impressions',
      sort_order: 'desc'
    };

    try {
      let allData = [];
      let page = 1;
      let hasMorePages = true;
      const maxPages = 100;
      let lastResponse = null;

      while (hasMorePages && page <= maxPages) {
        const params = new URLSearchParams({
          ...baseParams,
          page: page.toString()
        });

        lastResponse = await axios.get(`${this.baseURL}/?${params}`, {
          headers: {
            'Authorization': this.getAuthHeader(),
            'Accept': 'application/json'
          },
          timeout: 30000
        });

        const pageData = lastResponse.data.data || [];
        
        if (pageData.length === 0) {
          hasMorePages = false;
        } else {
          allData = allData.concat(pageData);
          console.log(`Fetched page ${page}: ${pageData.length} records (total: ${allData.length})`);
          
          if (lastResponse.data.next_page === false || 
              lastResponse.data.has_more === false ||
              (lastResponse.data.total_pages && page >= lastResponse.data.total_pages)) {
            hasMorePages = false;
          } else {
            page++;
          }
        }
      }

      console.log(`Yesterday data fetch complete: ${allData.length} total records`);
      
      return { 
        success: true, 
        dateRange,
        data: allData
      };
    } catch (error) {
      return { 
        success: false,
        dateRange,
        error: error.response?.data?.message || error.message 
      };
    }
  }

  processDailyData(dailyData) {
    // Group daily data by publisher_site and aggregate metrics
    const siteMap = {};
    
    // Debug: Log first record to see available fields
    if (dailyData.length > 0) {
      console.log('\n=== DEBUG: First daily record fields ===');
      console.log('Available fields:', Object.keys(dailyData[0]));
      console.log('Sample record:', JSON.stringify(dailyData[0], null, 2));
      console.log('=== END DEBUG ===\n');
    }
    
    for (const record of dailyData) {
      const siteName = record.publisher_site || 'Unknown';
      
      if (!siteMap[siteName]) {
        siteMap[siteName] = {
          publisher_site: siteName,
          views: 0,
          clicks: 0,
          revenue: 0
        };
      }
      
      // Aggregate metrics across all days in the period
      siteMap[siteName].views += parseFloat(record.views || 0);
      siteMap[siteName].clicks += parseFloat(record.clicks || 0);
      siteMap[siteName].revenue += parseFloat(record.publisher_revenue || 0);
    }
    
    // Calculate RPV for each site
    const result = [];
    for (const [siteName, data] of Object.entries(siteMap)) {
      const rpv = data.views > 0 ? data.revenue / data.views : 0;
      result.push({
        publisher_site: siteName,
        views: Math.round(data.views),
        clicks: Math.round(data.clicks),
        publisher_revenue: Math.round(data.revenue * 100) / 100,
        publisher_rpv: Math.round(rpv * 100) / 100
      });
    }
    
    // Sort by views descending
    result.sort((a, b) => b.views - a.views);
    
    return result;
  }

  async verify() {
    try {
      const response = await axios.get(`${this.baseURL}/?date_range=yesterday`, {
        headers: {
          'Authorization': this.getAuthHeader(),
          'Accept': 'application/json'
        },
        timeout: 10000
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

// Slack API Service
class SlackService {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl;
  }

  async sendMessage(message) {
    try {
      const response = await axios.post(this.webhookUrl, message, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      return response.status === 200;
    } catch (error) {
      console.error('Slack API error:', error.response?.data || error.message);
      throw new Error(`Failed to send Slack message: ${error.response?.data?.error || error.message}`);
    }
  }

  formatVarianceReport(report, reportType = 'weekly') {
    const { sites } = report;
    const isWeekly = reportType === 'weekly';
    
    if (sites.length === 0) {
      return {
        text: `✅ All Clear! No ${isWeekly ? 'weekly' : 'monthly'} variance issues detected.`,
        color: 'good'
      };
    }

    // Filter for downward-trending sites only
    const downwardSites = sites.filter(site => site.maxVariance < 0);
    
    if (downwardSites.length === 0) {
      return {
        text: `✅ All Clear! No ${isWeekly ? 'weekly' : 'monthly'} downward variance issues detected.`,
        color: 'good'
      };
    }

    const threshold = 10; // Show top 10 by default, rest can be unfurled
    const topSites = downwardSites.slice(0, threshold);
    const hasMore = downwardSites.length > threshold;
    const periodLabel = isWeekly ? 'Week' : 'Month';
    
    let text = `🚨 ${isWeekly ? 'Weekly' : 'Monthly'} RPV Variance Alert\n`;
    text += `Found ${downwardSites.length} sites with significant downward variance:\n\n`;

    // Always show top sites
    const fields = topSites.map((site, index) => {
      const varianceSymbol = '📉'; // Always downward for variance reports
      const varianceText = `${varianceSymbol} ${site.maxVariance.toFixed(1)}%`;
      
      const value1 = isWeekly ? 
        `$${site.week1Value.toFixed(2)}` : 
        `$${site.month1Value.toFixed(2)}`;
      const value2 = isWeekly ? 
        `$${site.week3Value.toFixed(2)}` : 
        `$${site.monthCurrentValue.toFixed(2)}`;

      return {
        title: `${index + 1}. ${site.siteName}`,
        value: `${varianceText}\n${periodLabel} 1: ${value1} → ${periodLabel} 3: ${value2}`,
        short: false
      };
    });

    if (hasMore) {
      fields.push({
        title: `... and ${downwardSites.length - threshold} more sites`,
        value: '(Open the Downtick app to view the full report)',
        short: false
      });
    }

    return {
      text,
      attachments: [{
        color: 'danger', // Always danger for downward variance
        fields,
        footer: 'Downtick Analytics',
        ts: Math.floor(Date.now() / 1000)
      }]
    };
  }

  formatLowRPVReport(report) {
    const { sites } = report;
    
    if (sites.length === 0) {
      return {
        text: '✅ All Clear! No sites with low RPV detected.',
        color: 'good'
      };
    }

    const threshold = 10; // Show top 10 by default, rest can be unfurled
    const topSites = sites.slice(0, threshold);
    const hasMore = sites.length > threshold;
    
    let text = `⚠️ Low RPV Alert\n`;
    text += `Found ${sites.length} sites with RPV below $0.20:\n\n`;

    // Always show top sites
    const fields = topSites.map((site, index) => {
      const changeSymbol = '📉';
      const changeText = `${changeSymbol} ${site.change.toFixed(1)}%`;
      
      return {
        title: `${index + 1}. ${site.siteName}`,
        value: `${changeText}\nLast Week: $${site.lastWeekRPV.toFixed(2)} → This Week: $${site.thisWeekRPV.toFixed(2)}\nViews: ${site.thisWeekViews.toLocaleString()}`,
        short: false
      };
    });

    if (hasMore) {
      fields.push({
        title: `... and ${sites.length - threshold} more sites`,
        value: '(Open the Downtick app to view the full report)',
        short: false
      });
    }

    return {
      text,
      attachments: [{
        color: 'warning',
        fields,
        footer: 'Downtick Analytics',
        ts: Math.floor(Date.now() / 1000)
      }]
    };
  }

  formatNoActivityReport(report) {
    const { sites } = report;
    
    if (sites.length === 0) {
      return {
        text: '✅ All Clear! All publishers were active yesterday.',
        color: 'good'
      };
    }

    const threshold = 10; // Show top 10 by default, rest can be unfurled
    const topSites = sites.slice(0, threshold);
    const hasMore = sites.length > threshold;
    
    let text = `🔕 No Activity Alert\n`;
    text += `Found ${sites.length} publishers with no activity yesterday:\n\n`;

    // Always show top sites
    const fields = topSites.map((site, index) => {
      return {
        title: `${index + 1}. ${site.siteName}`,
        value: `Last Week: ${site.lastWeekViews.toLocaleString()} views\nRevenue: $${site.lastWeekRevenue.toFixed(2)}\nRPV: $${site.lastWeekRPV.toFixed(2)}`,
        short: false
      };
    });

    if (hasMore) {
      fields.push({
        title: `... and ${sites.length - threshold} more sites`,
        value: '(Open the Downtick app to view the full report)',
        short: false
      });
    }

    return {
      text,
      attachments: [{
        color: 'danger',
        fields,
        footer: 'Downtick Analytics',
        ts: Math.floor(Date.now() / 1000)
      }]
    };
  }
}

// Report Generator
class ReportGenerator {
  constructor(token, threshold = 10.0) {
    this.api = new UptickAPI(token);
    this.threshold = threshold;
  }

  async generateVarianceReport() {
    // Fetch 3 rolling 7-day periods (last 21 complete days)
    const [week1, week2, week3] = await Promise.all([
      this.api.fetchWeeklyData(2), // Days 15-21 ago
      this.api.fetchWeeklyData(1), // Days 8-14 ago
      this.api.fetchWeeklyData(0)  // Last 7 complete days (yesterday and prior)
    ]);

    if (!week1.success || !week2.success || !week3.success) {
      return {
        error: week1.error || week2.error || week3.error,
        sites: []
      };
    }

    const sitesMap = this.buildSitesMap(
      week1.data.data || [],
      week2.data.data || [],
      week3.data.data || []
    );

    const sitesWithVariance = [];
    const metric = 'publisher_rpv'; // Publisher Revenue Per View

    for (const [siteName, weeks] of Object.entries(sitesMap)) {
      if (!weeks.week1 || !weeks.week2 || !weeks.week3) continue;

      // Debug logging for specific sites
      if (siteName.toLowerCase().includes('cozy')) {
        console.log('\n=== DEBUG: Cozy Earth Data ===');
        console.log('Week 1 raw data:', JSON.stringify(weeks.week1, null, 2));
        console.log('Week 2 raw data:', JSON.stringify(weeks.week2, null, 2));
        console.log('Week 3 raw data:', JSON.stringify(weeks.week3, null, 2));
        console.log('Week 1 publisher_rpv:', weeks.week1.publisher_rpv);
        console.log('Week 2 publisher_rpv:', weeks.week2.publisher_rpv);
        console.log('Week 3 publisher_rpv:', weeks.week3.publisher_rpv);
      }

      const varianceData = this.calculateVariance(weeks, metric);
      
      // More debug logging
      if (siteName.toLowerCase().includes('cozy')) {
        console.log('Parsed values:', {
          week1: varianceData.week1Value,
          week2: varianceData.week2Value,
          week3: varianceData.week3Value,
          maxVariance: varianceData.maxVariance
        });
        console.log('=== END DEBUG ===\n');
      }
      
      if (Math.abs(varianceData.maxVariance) > this.threshold) {
        sitesWithVariance.push({
          siteName,
          week1Value: varianceData.week1Value,
          week2Value: varianceData.week2Value,
          week3Value: varianceData.week3Value,
          week1Views: this.parseValue(weeks.week1.views),
          week2Views: this.parseValue(weeks.week2.views),
          week3Views: this.parseValue(weeks.week3.views),
          maxVariance: varianceData.maxVariance,
          metric
        });
      }
    }

    sitesWithVariance.sort((a, b) => Math.abs(b.maxVariance) - Math.abs(a.maxVariance));

    return {
      generatedAt: new Date().toISOString(),
      threshold: this.threshold,
      sites: sitesWithVariance,
      weekRanges: {
        week1: week1.dateRange,
        week2: week2.dateRange,
        week3: week3.dateRange
      }
    };
  }

  async generateMonthlyVarianceReport() {
    // Fetch 3 complete months + current month to date
    const [month1, month2, month3, monthCurrent] = await Promise.all([
      this.api.fetchMonthlyData(3),           // 3 months ago (complete)
      this.api.fetchMonthlyData(2),           // 2 months ago (complete)
      this.api.fetchMonthlyData(1),           // Last month (complete)
      this.api.fetchMonthlyData(0, true)      // Current month to date
    ]);

    if (!month1.success || !month2.success || !month3.success || !monthCurrent.success) {
      return {
        error: month1.error || month2.error || month3.error || monthCurrent.error,
        sites: []
      };
    }

    const sitesMap = this.buildMonthsSitesMap(
      month1.data.data || [],
      month2.data.data || [],
      month3.data.data || [],
      monthCurrent.data.data || []
    );

    const sitesWithVariance = [];
    const metric = 'publisher_rpv'; // Publisher Revenue Per View

    for (const [siteName, months] of Object.entries(sitesMap)) {
      // Require at least 3 months of data (month1, month2, month3) plus current month
      if (!months.month1 || !months.month2 || !months.month3 || !months.monthCurrent) continue;

      const varianceData = this.calculateMonthlyVariance(months, metric);
      
      if (Math.abs(varianceData.maxVariance) > this.threshold) {
        sitesWithVariance.push({
          siteName,
          month1Value: varianceData.month1Value,
          month2Value: varianceData.month2Value,
          month3Value: varianceData.month3Value,
          monthCurrentValue: varianceData.monthCurrentValue,
          month1Views: this.parseValue(months.month1.views),
          month2Views: this.parseValue(months.month2.views),
          month3Views: this.parseValue(months.month3.views),
          monthCurrentViews: this.parseValue(months.monthCurrent.views),
          maxVariance: varianceData.maxVariance,
          metric
        });
      }
    }

    sitesWithVariance.sort((a, b) => Math.abs(b.maxVariance) - Math.abs(a.maxVariance));

    return {
      generatedAt: new Date().toISOString(),
      threshold: this.threshold,
      sites: sitesWithVariance,
      monthRanges: {
        month1: month1.dateRange,
        month2: month2.dateRange,
        month3: month3.dateRange,
        monthCurrent: monthCurrent.dateRange
      }
    };
  }

  buildMonthsSitesMap(month1Data, month2Data, month3Data, monthCurrentData) {
    const sites = {};

    for (const site of month1Data) {
      const name = site.publisher_site || 'Unknown';
      if (!sites[name]) sites[name] = {};
      sites[name].month1 = site;
    }

    for (const site of month2Data) {
      const name = site.publisher_site || 'Unknown';
      if (!sites[name]) sites[name] = {};
      sites[name].month2 = site;
    }

    for (const site of month3Data) {
      const name = site.publisher_site || 'Unknown';
      if (!sites[name]) sites[name] = {};
      sites[name].month3 = site;
    }

    for (const site of monthCurrentData) {
      const name = site.publisher_site || 'Unknown';
      if (!sites[name]) sites[name] = {};
      sites[name].monthCurrent = site;
    }

    return sites;
  }

  calculateMonthlyVariance(months, metric) {
    const month1Value = this.parseValue(months.month1[metric]);
    const month2Value = this.parseValue(months.month2[metric]);
    const month3Value = this.parseValue(months.month3[metric]);
    const monthCurrentValue = this.parseValue(months.monthCurrent[metric]);

    // Calculate consecutive month-over-month variances
    let variance1to2 = 0;
    let variance2to3 = 0;
    let variance3toCurrent = 0;

    if (month1Value > 0) {
      variance1to2 = ((month2Value - month1Value) / month1Value) * 100;
    }
    if (month2Value > 0) {
      variance2to3 = ((month3Value - month2Value) / month2Value) * 100;
    }
    if (month3Value > 0) {
      variance3toCurrent = ((monthCurrentValue - month3Value) / month3Value) * 100;
    }

    // Check if last 3 variances are in the same direction (all positive or all negative)
    // and all exceed the threshold
    let maxVariance = 0;
    
    if (variance1to2 > this.threshold && variance2to3 > this.threshold && variance3toCurrent > this.threshold) {
      // Consistent upward trend
      maxVariance = Math.max(variance1to2, variance2to3, variance3toCurrent);
    } else if (variance1to2 < -this.threshold && variance2to3 < -this.threshold && variance3toCurrent < -this.threshold) {
      // Consistent downward trend
      maxVariance = Math.min(variance1to2, variance2to3, variance3toCurrent);
    }

    return { month1Value, month2Value, month3Value, monthCurrentValue, maxVariance };
  }

  async generateLowRPVReport() {
    const rpvThreshold = 0.20;
    
    // Fetch last week and this week data
    const [lastWeek, thisWeek] = await Promise.all([
      this.api.fetchWeeklyData(1), // Days 8-14 ago (last week)
      this.api.fetchWeeklyData(0)  // Last 7 complete days (this week)
    ]);

    if (!lastWeek.success || !thisWeek.success) {
      return {
        error: lastWeek.error || thisWeek.error,
        sites: []
      };
    }

    // Build map of sites with both weeks' data
    const sitesMap = {};
    
    for (const site of lastWeek.data.data || []) {
      const name = site.publisher_site || 'Unknown';
      if (!sitesMap[name]) sitesMap[name] = {};
      sitesMap[name].lastWeek = site;
    }
    
    for (const site of thisWeek.data.data || []) {
      const name = site.publisher_site || 'Unknown';
      if (!sitesMap[name]) sitesMap[name] = {};
      sitesMap[name].thisWeek = site;
    }

    const lowRPVSites = [];

    for (const [siteName, weeks] of Object.entries(sitesMap)) {
      // Only include sites that have data for both weeks
      if (!weeks.lastWeek || !weeks.thisWeek) continue;

      const lastWeekRPV = this.parseValue(weeks.lastWeek.publisher_rpv);
      const thisWeekRPV = this.parseValue(weeks.thisWeek.publisher_rpv);

      // Check if this week's RPV is below threshold AND it dropped from last week
      if (thisWeekRPV < rpvThreshold && thisWeekRPV < lastWeekRPV) {
        const change = lastWeekRPV > 0 ? ((thisWeekRPV - lastWeekRPV) / lastWeekRPV) * 100 : 0;
        
        lowRPVSites.push({
          siteName,
          lastWeekRPV,
          thisWeekRPV,
          change,
          lastWeekViews: weeks.lastWeek.views || 0,
          thisWeekViews: weeks.thisWeek.views || 0
        });
      }
    }

    // Sort by this week's RPV (lowest first)
    lowRPVSites.sort((a, b) => a.thisWeekRPV - b.thisWeekRPV);

    return {
      generatedAt: new Date().toISOString(),
      rpvThreshold,
      sites: lowRPVSites,
      weekRanges: {
        lastWeek: lastWeek.dateRange,
        thisWeek: thisWeek.dateRange
      }
    };
  }

  async generateNoActivityReport() {
    // Fetch yesterday's data and last week's data to compare
    const [yesterday, lastWeek] = await Promise.all([
      this.api.fetchYesterdayData(),
      this.api.fetchWeeklyData(0) // Last 7 complete days
    ]);

    if (!yesterday.success || !lastWeek.success) {
      return {
        error: yesterday.error || lastWeek.error,
        sites: []
      };
    }

    // Get all publishers that had activity in the last week
    const lastWeekPublishers = new Set();
    for (const site of lastWeek.data.data || []) {
      const name = site.publisher_site || 'Unknown';
      lastWeekPublishers.add(name);
    }

    // Get publishers that had activity yesterday
    const yesterdayPublishers = new Set();
    for (const record of yesterday.data || []) {
      const name = record.publisher_site || 'Unknown';
      yesterdayPublishers.add(name);
    }

    // Find publishers with no activity yesterday but had activity in the last week
    const inactiveSites = [];
    const minViews = 10; // Minimum views threshold
    
    for (const publisher of lastWeekPublishers) {
      if (!yesterdayPublishers.has(publisher)) {
        // Find the last week data for this publisher
        const lastWeekData = lastWeek.data.data.find(s => s.publisher_site === publisher);
        const views = lastWeekData?.views || 0;
        
        // Only include publishers with at least 10 views in the last week
        if (views >= minViews) {
          inactiveSites.push({
            siteName: publisher,
            lastWeekViews: views,
            lastWeekRevenue: lastWeekData?.publisher_revenue || 0,
            lastWeekRPV: lastWeekData?.publisher_rpv || 0
          });
        }
      }
    }

    // Sort by last week views (highest first) to prioritize important sites
    inactiveSites.sort((a, b) => b.lastWeekViews - a.lastWeekViews);

    return {
      generatedAt: new Date().toISOString(),
      sites: inactiveSites,
      dateRanges: {
        yesterday: yesterday.dateRange,
        lastWeek: lastWeek.dateRange
      }
    };
  }

  buildSitesMap(week1Data, week2Data, week3Data) {
    const sites = {};

    for (const site of week1Data) {
      const name = site.publisher_site || 'Unknown';
      if (!sites[name]) sites[name] = {};
      sites[name].week1 = site;
    }

    for (const site of week2Data) {
      const name = site.publisher_site || 'Unknown';
      if (!sites[name]) sites[name] = {};
      sites[name].week2 = site;
    }

    for (const site of week3Data) {
      const name = site.publisher_site || 'Unknown';
      if (!sites[name]) sites[name] = {};
      sites[name].week3 = site;
    }

    return sites;
  }

  calculateVariance(weeks, metric) {
    const week1Value = this.parseValue(weeks.week1[metric]);
    const week2Value = this.parseValue(weeks.week2[metric]);
    const week3Value = this.parseValue(weeks.week3[metric]);

    // Calculate consecutive week-over-week variances
    let variance1to2 = 0;
    let variance2to3 = 0;

    if (week1Value > 0) {
      variance1to2 = ((week2Value - week1Value) / week1Value) * 100;
    }
    if (week2Value > 0) {
      variance2to3 = ((week3Value - week2Value) / week2Value) * 100;
    }

    // Check if both variances are in the same direction (both positive or both negative)
    // and both exceed the threshold
    let maxVariance = 0;
    
    if (variance1to2 > this.threshold && variance2to3 > this.threshold) {
      // Consistent upward trend
      maxVariance = Math.max(variance1to2, variance2to3);
    } else if (variance1to2 < -this.threshold && variance2to3 < -this.threshold) {
      // Consistent downward trend
      maxVariance = Math.min(variance1to2, variance2to3);
    }

    return { week1Value, week2Value, week3Value, maxVariance };
  }

  parseValue(value) {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'string') {
      return parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
    }
    return parseFloat(value) || 0;
  }
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/user', (req, res) => {
  try {
    const data = getData();
    const user = data.user ? { id: 1, email: data.user.email } : null;
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/setup', async (req, res) => {
  const { email, apiToken } = req.body;

  if (!email || !apiToken) {
    return res.status(400).json({ error: 'Email and API token required' });
  }

  // Verify token
  const api = new UptickAPI(apiToken);
  const isValid = await api.verify();

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid API token' });
  }

  // Encrypt and store
  const { encrypted, iv } = encrypt(apiToken);

  try {
    const data = {
      user: {
        email,
        encryptedToken: encrypted,
        iv,
        createdAt: new Date().toISOString()
      }
    };
    
    saveData(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/variance-report', async (req, res) => {
  try {
    const data = getData();
    
    if (!data.user) {
      return res.status(401).json({ error: 'No user configured' });
    }

    // Parse threshold from query params (default: 10)
    const threshold = parseFloat(req.query.threshold) || 10.0;
    const cacheKey = `varianceReport_${threshold}`;

    // Check cache first
    const cache = getCache();
    const forceRefresh = req.query.refresh === 'true';
    
    if (!forceRefresh && cache[cacheKey] && isCacheValid(cache[cacheKey])) {
      console.log(`✓ Serving variance report (threshold: ${threshold}%) from cache`);
      return res.json(cache[cacheKey].data);
    }

    console.log(`⟳ Fetching fresh variance report data (threshold: ${threshold}%)...`);
    const token = decrypt(data.user.encryptedToken, data.user.iv);
    const generator = new ReportGenerator(token, threshold);
    const report = await generator.generateVarianceReport();

    // Save to cache
    cache[cacheKey] = {
      timestamp: new Date().toISOString(),
      data: report
    };
    saveCache(cache);

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/monthly-variance-report', async (req, res) => {
  try {
    const data = getData();
    
    if (!data.user) {
      return res.status(401).json({ error: 'No user configured' });
    }

    // Parse threshold from query params (default: 10)
    const threshold = parseFloat(req.query.threshold) || 10.0;
    const cacheKey = `monthlyVarianceReport_${threshold}`;

    // Check cache first
    const cache = getCache();
    const forceRefresh = req.query.refresh === 'true';
    
    if (!forceRefresh && cache[cacheKey] && isCacheValid(cache[cacheKey])) {
      console.log(`✓ Serving monthly variance report (threshold: ${threshold}%) from cache`);
      return res.json(cache[cacheKey].data);
    }

    console.log(`⟳ Fetching fresh monthly variance report data (threshold: ${threshold}%)...`);
    const token = decrypt(data.user.encryptedToken, data.user.iv);
    const generator = new ReportGenerator(token, threshold);
    const report = await generator.generateMonthlyVarianceReport();

    // Save to cache
    cache[cacheKey] = {
      timestamp: new Date().toISOString(),
      data: report
    };
    saveCache(cache);

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/low-rpv-report', async (req, res) => {
  try {
    const data = getData();
    
    if (!data.user) {
      return res.status(401).json({ error: 'No user configured' });
    }

    // Check cache first
    const cache = getCache();
    const forceRefresh = req.query.refresh === 'true';
    
    if (!forceRefresh && cache.lowRpvReport && isCacheValid(cache.lowRpvReport)) {
      console.log('✓ Serving low RPV report from cache');
      return res.json(cache.lowRpvReport.data);
    }

    console.log('⟳ Fetching fresh low RPV report data...');
    const token = decrypt(data.user.encryptedToken, data.user.iv);
    const generator = new ReportGenerator(token);
    const report = await generator.generateLowRPVReport();

    // Save to cache
    cache.lowRpvReport = {
      timestamp: new Date().toISOString(),
      data: report
    };
    saveCache(cache);

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/no-activity-report', async (req, res) => {
  try {
    const data = getData();
    
    if (!data.user) {
      return res.status(401).json({ error: 'No user configured' });
    }

    // Check cache first
    const cache = getCache();
    const forceRefresh = req.query.refresh === 'true';
    
    if (!forceRefresh && cache.noActivityReport && isCacheValid(cache.noActivityReport)) {
      console.log('✓ Serving no activity report from cache');
      return res.json(cache.noActivityReport.data);
    }

    console.log('⟳ Fetching fresh no activity report data...');
    const token = decrypt(data.user.encryptedToken, data.user.iv);
    const generator = new ReportGenerator(token);
    const report = await generator.generateNoActivityReport();

    // Save to cache
    cache.noActivityReport = {
      timestamp: new Date().toISOString(),
      data: report
    };
    saveCache(cache);

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/logout', (req, res) => {
  try {
    saveData({ user: null });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save Slack configuration
app.post('/api/slack-config', (req, res) => {
  try {
    const data = getData();
    
    if (!data.user) {
      return res.status(401).json({ error: 'No user configured' });
    }

    const { webhookUrl } = req.body;
    
    if (!webhookUrl) {
      return res.status(400).json({ error: 'Webhook URL is required' });
    }

    // Validate webhook URL format
    if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
      return res.status(400).json({ error: 'Invalid Slack webhook URL' });
    }

    // Encrypt and store webhook URL
    const { encrypted: encryptedWebhook, iv: webhookIv } = encrypt(webhookUrl);
    data.user.slackWebhookUrl = encryptedWebhook;
    data.user.slackWebhookIv = webhookIv;
    
    // Remove channel override if it exists
    delete data.user.slackChannel;
    
    saveData(data);
    
    res.json({ 
      success: true, 
      message: 'Slack configuration saved successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/slack-config', (req, res) => {
  try {
    const data = getData();
    
    if (!data.user) {
      return res.status(401).json({ error: 'No user configured' });
    }

    const hasSlackConfig = data.user.slackWebhookUrl && data.user.slackWebhookIv;
    const defaultWebhook = getDefaultSlackWebhook();
    
    res.json({ 
      configured: hasSlackConfig || !!defaultWebhook,
      webhookUrl: hasSlackConfig ? '***configured***' : (defaultWebhook ? '***default***' : null),
      hasDefault: !!defaultWebhook
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/slack-config', (req, res) => {
  try {
    const data = getData();
    
    if (!data.user) {
      return res.status(401).json({ error: 'No user configured' });
    }

    delete data.user.slackWebhookUrl;
    delete data.user.slackWebhookIv;
    
    saveData(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Slack notification endpoints
app.post('/api/slack/send-variance', async (req, res) => {
  try {
    const data = getData();
    
    if (!data.user) {
      return res.status(401).json({ error: 'No user configured' });
    }

    // Get webhook URL from user config or default
    let webhookUrl = null;
    if (data.user.slackWebhookUrl && data.user.slackWebhookIv) {
      webhookUrl = decrypt(data.user.slackWebhookUrl, data.user.slackWebhookIv);
    } else {
      webhookUrl = getDefaultSlackWebhook();
    }

    if (!webhookUrl) {
      return res.status(400).json({ error: 'Slack not configured' });
    }

    const { reportType = 'weekly', threshold = 10.0 } = req.body;
    const token = decrypt(data.user.encryptedToken, data.user.iv);
    
    // Generate fresh report
    const generator = new ReportGenerator(token, threshold);
    let report;
    
    if (reportType === 'monthly') {
      report = await generator.generateMonthlyVarianceReport();
    } else {
      report = await generator.generateVarianceReport();
    }

    if (report.error) {
      return res.status(500).json({ error: report.error });
    }

    // Send to Slack with channel override
    const slackService = new SlackService(webhookUrl);
    const slackMessage = slackService.formatVarianceReport(report, reportType);
    await slackService.sendMessage(slackMessage);

    res.json({ 
      success: true, 
      message: `Report sent to Slack (${report.sites.length} sites with variance)` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/slack/send-low-rpv', async (req, res) => {
  try {
    const data = getData();
    
    if (!data.user) {
      return res.status(401).json({ error: 'No user configured' });
    }

    // Get webhook URL from user config or default
    let webhookUrl = null;
    if (data.user.slackWebhookUrl && data.user.slackWebhookIv) {
      webhookUrl = decrypt(data.user.slackWebhookUrl, data.user.slackWebhookIv);
    } else {
      webhookUrl = getDefaultSlackWebhook();
    }

    if (!webhookUrl) {
      return res.status(400).json({ error: 'Slack not configured' });
    }

    const token = decrypt(data.user.encryptedToken, data.user.iv);
    
    // Generate fresh report
    const generator = new ReportGenerator(token);
    const report = await generator.generateLowRPVReport();

    if (report.error) {
      return res.status(500).json({ error: report.error });
    }

    // Send to Slack with channel override
    const slackService = new SlackService(webhookUrl);
    const slackMessage = slackService.formatLowRPVReport(report);
    await slackService.sendMessage(slackMessage);

    res.json({ 
      success: true, 
      message: `Report sent to Slack (${report.sites.length} sites with low RPV)` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/slack/send-no-activity', async (req, res) => {
  try {
    const data = getData();
    
    if (!data.user) {
      return res.status(401).json({ error: 'No user configured' });
    }

    // Get webhook URL from user config or default
    let webhookUrl = null;
    if (data.user.slackWebhookUrl && data.user.slackWebhookIv) {
      webhookUrl = decrypt(data.user.slackWebhookUrl, data.user.slackWebhookIv);
    } else {
      webhookUrl = getDefaultSlackWebhook();
    }

    if (!webhookUrl) {
      return res.status(400).json({ error: 'Slack not configured' });
    }

    const token = decrypt(data.user.encryptedToken, data.user.iv);
    
    // Generate fresh report
    const generator = new ReportGenerator(token);
    const report = await generator.generateNoActivityReport();

    if (report.error) {
      return res.status(500).json({ error: report.error });
    }

    // Send to Slack with channel override
    const slackService = new SlackService(webhookUrl);
    const slackMessage = slackService.formatNoActivityReport(report);
    await slackService.sendMessage(slackMessage);

    res.json({ 
      success: true, 
      message: `Report sent to Slack (${report.sites.length} inactive publishers)` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// What's New endpoints
app.get('/api/whats-new/:version', (req, res) => {
  try {
    const whatsNewPath = path.join(__dirname, 'public', 'whats-new.json');
    const whatsNewData = JSON.parse(fs.readFileSync(whatsNewPath, 'utf8'));
    const version = req.params.version;
    
    if (whatsNewData[version]) {
      res.json(whatsNewData[version]);
    } else {
      res.status(404).json({ error: 'Version not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/whats-new', (req, res) => {
  try {
    const whatsNewPath = path.join(__dirname, 'public', 'whats-new.json');
    const whatsNewData = JSON.parse(fs.readFileSync(whatsNewPath, 'utf8'));
    res.json(whatsNewData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/version-seen', (req, res) => {
  try {
    const { version } = req.body;
    const data = getData();
    
    if (!data.user) {
      return res.status(401).json({ error: 'No user configured' });
    }
    
    data.user.lastSeenVersion = version;
    saveData(data);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/should-show-whats-new', (req, res) => {
  try {
    const data = getData();
    
    if (!data.user) {
      return res.json({ shouldShow: false });
    }
    
    const currentVersion = require('./package.json').version;
    const lastSeenVersion = data.user.lastSeenVersion;
    
    res.json({ 
      shouldShow: !lastSeenVersion || lastSeenVersion !== currentVersion,
      currentVersion,
      lastSeenVersion
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
function startServer() {
  initDataStorage();
  
  const PORT = 3737;
  server = app.listen(PORT, 'localhost', () => {
    console.log(`✓ Server running on http://localhost:${PORT}`);
    console.log(`\nPress Ctrl+C to stop\n`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${PORT} is already in use`);
      console.error('   Please close other instances or choose a different port\n');
    } else {
      console.error('\n❌ Server error:', error.message);
    }
    process.exit(1);
  });
  
  return server;
}

// Stop server
function stopServer() {
  if (server) {
    server.close(() => {
      console.log('✓ Server stopped');
    });
  }
}

// Start if run directly
if (require.main === module) {
  startServer();
}

module.exports = { startServer, stopServer };
