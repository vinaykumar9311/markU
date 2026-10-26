const fs = require('fs');

let html = fs.readFileSync('public/owner/dashboard.html', 'utf8');

// 1. Reset initial stats in HTML from dummy values to 0
html = html.replace(
  '<div id="statCustomers" class="text-2xl font-black text-gray-900 tracking-tight">842</div>',
  '<div id="statCustomers" class="text-2xl font-black text-gray-900 tracking-tight">0</div>'
);

html = html.replace(
  '<div id="statStamps" class="text-2xl font-black text-gray-900 tracking-tight">2,496</div>',
  '<div id="statStamps" class="text-2xl font-black text-gray-900 tracking-tight">0</div>'
);

html = html.replace(
  '<div id="statRewards" class="text-2xl font-black text-gray-900 tracking-tight">312</div>',
  '<div id="statRewards" class="text-2xl font-black text-gray-900 tracking-tight">0</div>'
);

html = html.replace(
  '<div id="statCampaigns" class="text-2xl font-black text-gray-900 tracking-tight">3</div>',
  '<div id="statCampaigns" class="text-2xl font-black text-gray-900 tracking-tight">1</div>'
);

// 2. Clear out hardcoded Rohit, Priya, Amit, Sneha from #activityList
const dummyActivityRegex = /<!-- Dynamic Activity List \(Container id="activityList"\) -->\s*<div id="activityList"[\s\S]*?<\/div>\s*<\/div>\s*<!-- Customer Growth Chart Card/m;

const cleanActivity = `<!-- Dynamic Activity List (Container id="activityList") -->
                <div id="activityList" class="space-y-3 divide-y divide-gray-100/60 max-h-72 overflow-y-auto pr-1">
                  <div class="py-8 text-center text-xs text-gray-400">
                    No activity recorded yet. Live stamps will show here.
                  </div>
                </div>
              </div>

              <!-- Customer Growth Chart Card`;

html = html.replace(dummyActivityRegex, cleanActivity);

// 3. Clear out hardcoded chart badge "342 ↑"
html = html.replace(
  `<div class="absolute right-6 top-0 bg-black text-white text-[10px] font-mono px-2 py-0.5 rounded-md font-bold shadow-md">
                    342 &uarr;
                  </div>`,
  `<div id="chartGrowthBadge" class="absolute right-6 top-0 bg-black text-white text-[10px] font-mono px-2 py-0.5 rounded-md font-bold shadow-md">
                    0 &uarr;
                  </div>`
);

// 4. Clear out hardcoded enrolled customers R, P, A, S, K from #customerOverviewList
const dummyOverviewRegex = /<!-- Dynamic Enrolled Customers Row \(Initial Badges R, P, A, S, K - From Mockup\) -->\s*<div id="customerOverviewList"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<!-- RIGHT 4 COLS/m;

const cleanOverview = `<!-- Dynamic Enrolled Customers Row -->
              <div id="customerOverviewList" class="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div class="w-full py-6 text-center text-xs text-gray-400">
                  No customers registered yet. Once customers scan your QR, they will appear here.
                </div>
              </div>

            </div>

          </div>

          <!-- RIGHT 4 COLS`;

html = html.replace(dummyOverviewRegex, cleanOverview);

// 5. Update renderCustomerList and loadDashboard in JS
// Ensure empty states are rendered if customers or activity are empty
html = html.replace(
  `      if (!customers || customers.length === 0) {
        return; // Retain default placeholder
      }`,
  `      if (!customers || customers.length === 0) {
        if (overviewList) {
          overviewList.innerHTML = '<div class="w-full py-6 text-center text-xs text-gray-400">No customers registered yet. Once customers scan your QR, they will appear here.</div>';
        }
        if (custList) {
          custList.innerHTML = '<div class="py-12 text-center text-xs text-gray-400">No registered customers found.</div>';
        }
        return;
      }`
);

// Update Recent Activity handling in JS
html = html.replace(
  `        // Recent Activity
        const actList = document.getElementById('activityList');
        if (actList && data.recentActivity && data.recentActivity.length > 0) {
          actList.innerHTML = data.recentActivity.map(a => \`
            <div class="pt-2 flex items-center justify-between text-xs">
              <div class="flex items-center gap-2.5">
                <span class="w-8 h-8 rounded-full bg-[#fdf6e9] text-[#cb8926] flex items-center justify-center shrink-0">
                  \${(a.action_type === 'REWARD_REDEEMED' || a.actionType === 'REWARD_REDEEMED') ? '🎁' : '★'}
                </span>
                <div>
                  <div class="font-bold text-gray-900">\${escapeHtml(a.customer_name || a.customerName || a.phone)} \${(a.action_type === 'REWARD_REDEEMED' || a.actionType === 'REWARD_REDEEMED') ? 'redeemed a reward' : 'collected a stamp'}</div>
                  <div class="text-[10px] text-gray-400 font-mono">\${new Date(a.created_at || a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
              <span class="text-gray-300">&rsaquo;</span>
            </div>
          \`).join('');
        }`,
  `        // Recent Activity
        const actList = document.getElementById('activityList');
        if (actList) {
          if (data.recentActivity && data.recentActivity.length > 0) {
            actList.innerHTML = data.recentActivity.map(a => \`
              <div class="pt-2 flex items-center justify-between text-xs">
                <div class="flex items-center gap-2.5">
                  <span class="w-8 h-8 rounded-full bg-[#fdf6e9] text-[#cb8926] flex items-center justify-center shrink-0">
                    \${(a.action_type === 'REWARD_REDEEMED' || a.actionType === 'REWARD_REDEEMED') ? '🎁' : '★'}
                  </span>
                  <div>
                    <div class="font-bold text-gray-900">\${escapeHtml(a.customer_name || a.customerName || a.phone)} \${(a.action_type === 'REWARD_REDEEMED' || a.actionType === 'REWARD_REDEEMED') ? 'redeemed a reward' : 'collected a stamp'}</div>
                    <div class="text-[10px] text-gray-400 font-mono">\${new Date(a.created_at || a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
                <span class="text-gray-300">&rsaquo;</span>
              </div>
            \`).join('');
          } else {
            actList.innerHTML = '<div class="py-8 text-center text-xs text-gray-400">No activity recorded yet. Live stamps will show here.</div>';
          }
        }`
);

// Update Customer Growth badge in JS
html = html.replace(
  `        if (document.getElementById('statCustomers')) document.getElementById('statCustomers').textContent = totalCust;`,
  `        if (document.getElementById('statCustomers')) document.getElementById('statCustomers').textContent = totalCust;
        if (document.getElementById('chartGrowthBadge')) document.getElementById('chartGrowthBadge').textContent = \`\${totalCust} ↑\`;`
);

fs.writeFileSync('public/owner/dashboard.html', html, 'utf8');
console.log('Successfully cleaned dummy info from dashboard.html');
