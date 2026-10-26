const fs = require('fs');

let html = fs.readFileSync('public/owner/dashboard.html', 'utf8');

// Replace static SVG Y labels and paths with dynamic IDs and clean defaults
const oldChartSvg = `<svg class="w-full h-36" viewBox="0 0 300 120" fill="none">
                    <!-- Y Axis Grid Lines -->
                    <line x1="25" y1="20" x2="295" y2="20" stroke="#f1f2f4" stroke-dasharray="3 3" />
                    <line x1="25" y1="50" x2="295" y2="50" stroke="#f1f2f4" stroke-dasharray="3 3" />
                    <line x1="25" y1="80" x2="295" y2="80" stroke="#f1f2f4" stroke-dasharray="3 3" />
                    
                    <!-- Y Labels -->
                    <text x="5" y="24" fill="#9ca3af" font-size="9" font-family="JetBrains Mono">300</text>
                    <text x="5" y="54" fill="#9ca3af" font-size="9" font-family="JetBrains Mono">200</text>
                    <text x="5" y="84" fill="#9ca3af" font-size="9" font-family="JetBrains Mono">100</text>
                    <text x="10" y="112" fill="#9ca3af" font-size="9" font-family="JetBrains Mono">0</text>

                    <!-- Golden Gradient Area -->
                    <path d="M 30 95 Q 70 85, 110 90 T 170 65 T 230 50 T 285 20 L 285 110 L 30 110 Z" fill="url(#goldChartGradient)" opacity="0.35" />
                    
                    <!-- Golden Solid Line -->
                    <path d="M 30 95 Q 70 85, 110 90 T 170 65 T 230 50 T 285 20" stroke="#e5a83b" stroke-width="3" stroke-linecap="round" fill="none" />
                    
                    <defs>
                      <linearGradient id="goldChartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#e5a83b" />
                        <stop offset="100%" stop-color="#ffffff" />
                      </linearGradient>
                    </defs>
                  </svg>

                  <!-- X-Axis Days: Mon Tue Wed Thu Fri Sat Sun (From Mockup) -->
                  <div class="flex justify-between text-[10px] text-gray-400 font-mono px-6 pt-1">
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                    <span>Sun</span>
                  </div>`;

const newChartSvg = `<svg class="w-full h-36" viewBox="0 0 300 120" fill="none">
                    <!-- Y Axis Grid Lines -->
                    <line x1="25" y1="20" x2="295" y2="20" stroke="#f1f2f4" stroke-dasharray="3 3" />
                    <line x1="25" y1="50" x2="295" y2="50" stroke="#f1f2f4" stroke-dasharray="3 3" />
                    <line x1="25" y1="80" x2="295" y2="80" stroke="#f1f2f4" stroke-dasharray="3 3" />
                    
                    <!-- Dynamic Y-Axis Labels -->
                    <g id="chartYLabels">
                      <text id="chartY3" x="5" y="24" fill="#9ca3af" font-size="9" font-family="JetBrains Mono">3</text>
                      <text id="chartY2" x="5" y="54" fill="#9ca3af" font-size="9" font-family="JetBrains Mono">2</text>
                      <text id="chartY1" x="5" y="84" fill="#9ca3af" font-size="9" font-family="JetBrains Mono">1</text>
                      <text id="chartY0" x="10" y="112" fill="#9ca3af" font-size="9" font-family="JetBrains Mono">0</text>
                    </g>

                    <!-- Golden Gradient Area (Dynamic) -->
                    <path id="chartAreaPath" d="M 35 105 L 285 105 L 285 110 L 35 110 Z" fill="url(#goldChartGradient)" opacity="0.35" />
                    
                    <!-- Golden Solid Line (Dynamic) -->
                    <path id="chartLinePath" d="M 35 105 L 285 105" stroke="#e5a83b" stroke-width="2.5" stroke-linecap="round" fill="none" />
                    
                    <defs>
                      <linearGradient id="goldChartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#e5a83b" />
                        <stop offset="100%" stop-color="#ffffff" />
                      </linearGradient>
                    </defs>
                  </svg>

                  <!-- Dynamic X-Axis Days -->
                  <div id="chartXLabels" class="flex justify-between text-[10px] text-gray-400 font-mono px-6 pt-1">
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                    <span>Sun</span>
                  </div>`;

html = html.replace(oldChartSvg, newChartSvg);

// Now add renderGrowthChart function in JS
const renderGrowthChartCode = `
    function renderGrowthChart(customers, recentActivity) {
      const custList = customers || [];
      const actList = recentActivity || [];
      
      // 1. Generate last 7 days buckets
      const now = new Date();
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const buckets = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        buckets.push({
          key,
          label: dayNames[d.getDay()],
          count: 0
        });
      }

      // 2. Count joins/activity per day
      custList.forEach(c => {
        const joinTime = c.created_at || c.createdAt || c.last_stamp_at || c.lastStampAt;
        if (joinTime) {
          try {
            const dayKey = new Date(joinTime).toISOString().slice(0, 10);
            const b = buckets.find(x => x.key === dayKey);
            if (b) b.count++;
          } catch(e) {}
        }
      });

      const total = custList.length;
      let running = Math.max(0, total - buckets.reduce((acc, b) => acc + b.count, 0));
      const points = buckets.map(b => {
        running += b.count;
        return running;
      });

      const maxVal = Math.max(total, ...points, 1);
      
      // Y-axis tick values: normal realistic scale
      let y3 = Math.ceil(maxVal);
      let y2 = Math.ceil(maxVal * 0.66);
      let y1 = Math.ceil(maxVal * 0.33);
      let y0 = 0;
      if (total === 0) {
        y3 = 3; y2 = 2; y1 = 1; y0 = 0;
      }

      if (document.getElementById('chartY3')) document.getElementById('chartY3').textContent = y3;
      if (document.getElementById('chartY2')) document.getElementById('chartY2').textContent = y2;
      if (document.getElementById('chartY1')) document.getElementById('chartY1').textContent = y1;
      if (document.getElementById('chartY0')) document.getElementById('chartY0').textContent = y0;

      // Update X-axis day labels
      const xLabelsEl = document.getElementById('chartXLabels');
      if (xLabelsEl) {
        xLabelsEl.innerHTML = buckets.map(b => \`<span>\${b.label}</span>\`).join('');
      }

      // Calculate SVG curve coordinates (viewBox 0 0 300 120)
      const coords = points.map((p, idx) => {
        const x = 35 + idx * (250 / 6);
        const ratio = total > 0 ? (p / maxVal) : 0;
        const y = 105 - (ratio * 80);
        return { x, y };
      });

      // Build SVG smooth path
      let pathD = \`M \${coords[0].x} \${coords[0].y}\`;
      for (let i = 1; i < coords.length; i++) {
        const prev = coords[i - 1];
        const curr = coords[i];
        const cpX1 = prev.x + (curr.x - prev.x) / 2;
        const cpY1 = prev.y;
        const cpX2 = cpX1;
        const cpY2 = curr.y;
        pathD += \` C \${cpX1} \${cpY1}, \${cpX2} \${cpY2}, \${curr.x} \${curr.y}\`;
      }

      const lineEl = document.getElementById('chartLinePath');
      const areaEl = document.getElementById('chartAreaPath');
      if (lineEl) lineEl.setAttribute('d', pathD);
      if (areaEl) {
        const areaD = \`\${pathD} L \${coords[coords.length - 1].x} 110 L \${coords[0].x} 110 Z\`;
        areaEl.setAttribute('d', areaD);
      }

      const badgeEl = document.getElementById('chartGrowthBadge');
      if (badgeEl) {
        badgeEl.textContent = \`\${total} ↑\`;
      }
    }
`;

// Insert renderGrowthChart right before renderCustomerList
html = html.replace('function renderCustomerList(', renderGrowthChartCode + '\n    function renderCustomerList(');

// Call renderGrowthChart inside loadDashboard
html = html.replace(
  'renderCustomerList(cachedCustomers, stampsTarget);',
  'renderCustomerList(cachedCustomers, stampsTarget);\n        renderGrowthChart(cachedCustomers, data.recentActivity);'
);

fs.writeFileSync('public/owner/dashboard.html', html, 'utf8');
console.log('Customer growth graph successfully connected to real customer data');
