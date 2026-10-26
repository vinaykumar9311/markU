const fs = require('fs');
const path = require('path');

function upgradeDashboard() {
  const filePath = path.join(__dirname, '..', 'public', 'owner', 'dashboard.html');
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Kiosk icon in header
  content = content.replace(
    `<span class="xs:hidden">🖥️</span>`,
    `<svg class="w-3.5 h-3.5 xs:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`
  );

  // 2. Metrics cards icons (Card 1: Users, Card 2: Stamps, Card 3: Rewards)
  content = content.replace(
    `<span class="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-bold group-hover:scale-105 transition-transform">👥</span>`,
    `<span class="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg></span>`
  );

  content = content.replace(
    `<span class="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-bold">✓</span>`,
    `<span class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></span>`
  );

  content = content.replace(
    `<span class="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-bold group-hover:scale-105 transition-transform">🎁</span>`,
    `<span class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-100 transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V4a2 2 0 112 2h-2zm0 0V4a2 2 0 10-2 2h2m-7 4h14a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2z"/></svg></span>`
  );

  // Directory header icon
  content = content.replace(
    `<span class="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-bold shadow-2xs">👥</span>`,
    `<span class="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg></span>`
  );

  // 3. Reward section header icon & ideas
  content = content.replace(
    `<span class="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center text-lg font-bold shrink-0 shadow-xs">🎁</span>`,
    `<span class="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs"><svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V4a2 2 0 112 2h-2zm0 0V4a2 2 0 10-2 2h2m-7 4h14a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2z"/></svg></span>`
  );

  const oldPresetsBlock = `<div class="space-y-1.5 pt-1">
                <span class="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">💡 Popular 1-Tap Ideas:</span>
                <div class="flex flex-wrap gap-1.5">
                  <button type="button" onclick="fillRewardPreset('Free Specialty Coffee')"
                    class="px-2.5 py-1 text-xs rounded-lg border border-gray-200 bg-gray-50/80 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-all text-gray-700">
                    ☕ Free Coffee
                  </button>
                  <button type="button" onclick="fillRewardPreset('20% Total Bill Discount')"
                    class="px-2.5 py-1 text-xs rounded-lg border border-gray-200 bg-gray-50/80 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-all text-gray-700">
                    🏷️ 20% Discount
                  </button>
                  <button type="button" onclick="fillRewardPreset('Buy 1 Get 1 Free Item')"
                    class="px-2.5 py-1 text-xs rounded-lg border border-gray-200 bg-gray-50/80 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-all text-gray-700">
                    🎁 Buy 1 Get 1
                  </button>
                  <button type="button" onclick="fillRewardPreset('Free Chef Dessert / Pastry')"
                    class="px-2.5 py-1 text-xs rounded-lg border border-gray-200 bg-gray-50/80 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-all text-gray-700">
                    🍰 Free Dessert
                  </button>
                  <button type="button" onclick="fillRewardPreset('₹100 Store Voucher')"
                    class="px-2.5 py-1 text-xs rounded-lg border border-gray-200 bg-gray-50/80 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-all text-gray-700">
                    💵 ₹100 Voucher
                  </button>
                  <button type="button" onclick="fillRewardPreset('Free Appetizer / Snack')"
                    class="px-2.5 py-1 text-xs rounded-lg border border-gray-200 bg-gray-50/80 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-all text-gray-700">
                    🍕 Free Snack
                  </button>
                </div>
              </div>`;

  const newPresetsBlock = `<div class="space-y-1.5 pt-1">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Recommended Reward Presets:</span>
                <div class="flex flex-wrap gap-2">
                  <button type="button" onclick="fillRewardPreset('Complimentary Specialty Beverage')"
                    class="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all text-slate-700">
                    Complimentary Beverage
                  </button>
                  <button type="button" onclick="fillRewardPreset('15% Total Invoice Credit')"
                    class="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all text-slate-700">
                    15% Invoice Credit
                  </button>
                  <button type="button" onclick="fillRewardPreset('Buy One Get One (BOGO) Item')"
                    class="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all text-slate-700">
                    BOGO Item
                  </button>
                  <button type="button" onclick="fillRewardPreset('Complimentary House Dessert')"
                    class="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all text-slate-700">
                    House Dessert
                  </button>
                  <button type="button" onclick="fillRewardPreset('₹100 Store Credit Voucher')"
                    class="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all text-slate-700">
                    ₹100 Store Credit
                  </button>
                  <button type="button" onclick="fillRewardPreset('Complimentary Tasting Plate')"
                    class="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all text-slate-700">
                    Tasting Plate
                  </button>
                </div>
              </div>`;

  if (content.includes(oldPresetsBlock)) {
    content = content.replace(oldPresetsBlock, newPresetsBlock);
  }

  // 4. Reviews View
  content = content.replace(
    `<span class="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-pink-500 text-white flex items-center justify-center text-lg font-bold shrink-0 shadow-xs">⭐</span>`,
    `<span class="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs"><svg class="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg></span>`
  );
  content = content.replace(
    `<span>⭐ Google Review Share URL</span>`,
    `<span class="flex items-center gap-1.5"><svg class="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg><span>Google Business Review URL</span></span>`
  );
  content = content.replace(
    `<span>📸 Instagram Profile URL or Handle</span>`,
    `<span class="flex items-center gap-1.5"><svg class="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg><span>Instagram Profile URL or Handle</span></span>`
  );

  // 5. Anti-cheat Cooldown Header
  content = content.replace(
    `<span class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center text-xl font-bold shrink-0 shadow-xs">🛡️</span>`,
    `<span class="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs"><svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg></span>`
  );

  // Cooldown Cards
  const oldCooldownGrid = `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5" id="cooldownCardGroup">
              
              <!-- Card 1: 0 Hours -->
              <div onclick="setInteractiveCooldown(0)" data-hours="0"
                class="cooldown-card p-4 rounded-2xl border-2 border-gray-200 hover:border-indigo-400 bg-white cursor-pointer transition-all flex flex-col justify-between space-y-3 group shadow-2xs">
                <div class="space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="text-xl">🧪</span>
                    <span class="cooldown-check hidden text-xs font-bold text-indigo-600">✓ Selected</span>
                  </div>
                  <h4 class="font-bold text-xs text-gray-900 group-hover:text-indigo-600 transition-colors">Instant / No Wait</h4>
                  <p class="text-[11px] text-gray-500 leading-snug">0 Hours &bull; Perfect for testing scans and counter employee demos.</p>
                </div>
                <div class="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded-lg text-center">
                  Testing Mode
                </div>
              </div>

              <!-- Card 2: 1 Hour -->
              <div onclick="setInteractiveCooldown(1)" data-hours="1"
                class="cooldown-card p-4 rounded-2xl border-2 border-gray-200 hover:border-indigo-400 bg-white cursor-pointer transition-all flex flex-col justify-between space-y-3 group shadow-2xs">
                <div class="space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="text-xl">☕</span>
                    <span class="cooldown-check hidden text-xs font-bold text-indigo-600">✓ Selected</span>
                  </div>
                  <h4 class="font-bold text-xs text-gray-900 group-hover:text-indigo-600 transition-colors">High Frequency</h4>
                  <p class="text-[11px] text-gray-500 leading-snug">1 - 2 Hours &bull; Best for cafes, bakeries & bubble tea spots.</p>
                </div>
                <div class="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded-lg text-center">
                  Quick Repeat
                </div>
              </div>

              <!-- Card 3: 12 Hours -->
              <div onclick="setInteractiveCooldown(12)" data-hours="12"
                class="cooldown-card p-4 rounded-2xl border-2 border-gray-200 hover:border-indigo-400 bg-white cursor-pointer transition-all flex flex-col justify-between space-y-3 group shadow-2xs">
                <div class="space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="text-xl">🍽️</span>
                    <span class="cooldown-check hidden text-xs font-bold text-indigo-600">✓ Selected</span>
                  </div>
                  <h4 class="font-bold text-xs text-gray-900 group-hover:text-indigo-600 transition-colors">Twice Daily</h4>
                  <p class="text-[11px] text-gray-500 leading-snug">12 Hours &bull; Allows separate lunch & dinner visits.</p>
                </div>
                <div class="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded-lg text-center">
                  Lunch & Dinner
                </div>
              </div>

              <!-- Card 4: 24 Hours -->
              <div onclick="setInteractiveCooldown(24)" data-hours="24"
                class="cooldown-card p-4 rounded-2xl border-2 border-indigo-600 bg-indigo-50/40 cursor-pointer transition-all flex flex-col justify-between space-y-3 group shadow-2xs">
                <div class="space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="text-xl">🛡️</span>
                    <span class="cooldown-check text-xs font-bold text-indigo-600">✓ Selected</span>
                  </div>
                  <h4 class="font-bold text-xs text-gray-900 group-hover:text-indigo-600 transition-colors">Daily Visit (Best)</h4>
                  <p class="text-[11px] text-gray-500 leading-snug">24 Hours &bull; 1 visit per day. Retail, salons & restaurants.</p>
                </div>
                <div class="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-100/70 px-2 py-1 rounded-lg text-center">
                  Recommended
                </div>
              </div>

            </div>`;

  const newCooldownGrid = `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5" id="cooldownCardGroup">
              
              <!-- Card 1: 0 Hours -->
              <div onclick="setInteractiveCooldown(0)" data-hours="0"
                class="cooldown-card p-4 rounded-xl border border-slate-200 hover:border-slate-400 bg-white cursor-pointer transition-all flex flex-col justify-between space-y-3 group shadow-2xs">
                <div class="space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="font-mono font-bold text-base text-slate-800">0h</span>
                    <span class="cooldown-check hidden text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Selected</span>
                  </div>
                  <h4 class="font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors">Instant / Zero Wait</h4>
                  <p class="text-[11px] text-slate-500 leading-snug">0 Hours · Diagnostic mode, counter demonstrations and staff testing.</p>
                </div>
                <div class="text-[10px] font-mono text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded text-center">
                  Diagnostic Mode
                </div>
              </div>

              <!-- Card 2: 1 Hour -->
              <div onclick="setInteractiveCooldown(1)" data-hours="1"
                class="cooldown-card p-4 rounded-xl border border-slate-200 hover:border-slate-400 bg-white cursor-pointer transition-all flex flex-col justify-between space-y-3 group shadow-2xs">
                <div class="space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="font-mono font-bold text-base text-slate-800">1h</span>
                    <span class="cooldown-check hidden text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Selected</span>
                  </div>
                  <h4 class="font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors">High Frequency</h4>
                  <p class="text-[11px] text-slate-500 leading-snug">1 - 2 Hours · Quick-service cafes, bakeries, coffee shops and beverage bars.</p>
                </div>
                <div class="text-[10px] font-mono text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded text-center">
                  Quick Repeat
                </div>
              </div>

              <!-- Card 3: 12 Hours -->
              <div onclick="setInteractiveCooldown(12)" data-hours="12"
                class="cooldown-card p-4 rounded-xl border border-slate-200 hover:border-slate-400 bg-white cursor-pointer transition-all flex flex-col justify-between space-y-3 group shadow-2xs">
                <div class="space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="font-mono font-bold text-base text-slate-800">12h</span>
                    <span class="cooldown-check hidden text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Selected</span>
                  </div>
                  <h4 class="font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors">Twice Daily</h4>
                  <p class="text-[11px] text-slate-500 leading-snug">12 Hours · Supports distinct lunch and dinner dining cycles.</p>
                </div>
                <div class="text-[10px] font-mono text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded text-center">
                  Dual Shift
                </div>
              </div>

              <!-- Card 4: 24 Hours -->
              <div onclick="setInteractiveCooldown(24)" data-hours="24"
                class="cooldown-card p-4 rounded-xl border-2 border-slate-900 bg-slate-50 cursor-pointer transition-all flex flex-col justify-between space-y-3 group shadow-xs">
                <div class="space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="font-mono font-bold text-base text-slate-900">24h</span>
                    <span class="cooldown-check text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">Selected</span>
                  </div>
                  <h4 class="font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors">Daily Standard</h4>
                  <p class="text-[11px] text-slate-500 leading-snug">24 Hours · Single daily stamp. Retail storefronts, salons and full restaurants.</p>
                </div>
                <div class="text-[10px] font-mono font-semibold text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded text-center">
                  Recommended
                </div>
              </div>

            </div>`;

  if (content.includes(oldCooldownGrid)) {
    content = content.replace(oldCooldownGrid, newCooldownGrid);
  }

  content = content.replace(
    `🛡️ Live Customer Walkthrough & Protection Flow:`,
    `Customer Protection & Check-In Protocol:`
  );

  // Search input icon
  content = content.replace(
    `<span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 text-sm">🔍</span>`,
    `<span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg></span>`
  );

  // Counter Kiosk view icon
  content = content.replace(
    `<span class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg font-bold shrink-0">🖥️</span>`,
    `<span class="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs"><svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg></span>`
  );
  content = content.replace(
    `<span>📋 Copy Counter URL</span>`,
    `<span class="flex items-center gap-1.5"><svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg><span>Copy Counter URL</span></span>`
  );
  content = content.replace(
    `<span class="text-2xl">📱</span>`,
    `<svg class="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>`
  );

  // Mobile Footer Navigation
  content = content.replace(
    `<span class="text-base">📊</span>`,
    `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>`
  );
  content = content.replace(
    `<span class="text-base">🎁</span>`,
    `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V4a2 2 0 112 2h-2zm0 0V4a2 2 0 10-2 2h2m-7 4h14a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2z"/></svg>`
  );
  content = content.replace(
    `<span class="text-base">⭐</span>`,
    `<svg class="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>`
  );
  content = content.replace(
    `<span class="text-base">🖥️</span>`,
    `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`
  );

  // Drawer Options
  content = content.replace(
    `<span class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white flex items-center justify-center text-base font-bold group-hover:scale-105 transition-transform shrink-0 shadow-xs">📊</span>`,
    `<span class="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs"><svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg></span>`
  );

  content = content.replace(
    `<span class="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center text-base font-bold group-hover:scale-105 transition-transform shrink-0 shadow-xs">👥</span>`,
    `<span class="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs"><svg class="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg></span>`
  );

  content = content.replace(
    `<span class="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center text-base font-bold group-hover:scale-105 transition-transform shrink-0 shadow-xs">🖥️</span>`,
    `<span class="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs"><svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg></span>`
  );

  content = content.replace(
    `<span class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center text-base font-bold group-hover:scale-105 transition-transform shrink-0 shadow-xs">🎁</span>`,
    `<span class="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs"><svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V4a2 2 0 112 2h-2zm0 0V4a2 2 0 10-2 2h2m-7 4h14a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2z"/></svg></span>`
  );

  content = content.replace(
    `<span class="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center text-base font-bold group-hover:scale-105 transition-transform shrink-0 shadow-xs">⏱️</span>`,
    `<span class="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs"><svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></span>`
  );

  content = content.replace(
    `<span class="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center text-base font-bold group-hover:scale-105 transition-transform shrink-0 shadow-xs">⭐</span>`,
    `<span class="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs"><svg class="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg></span>`
  );

  content = content.replace(
    `<span class="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-base font-bold group-hover:scale-105 transition-transform shrink-0 shadow-xs">📲</span>`,
    `<span class="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg></span>`
  );

  content = content.replace(
    `<span class="w-9 h-9 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center text-sm shrink-0">🚪</span>`,
    `<span class="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg></span>`
  );

  content = content.replace(
    `<span class="w-9 h-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center text-sm shrink-0">🗑️</span>`,
    `<span class="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></span>`
  );

  // Social Modal
  content = content.replace(
    `<span class="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white text-lg flex items-center justify-center font-bold shadow-xs">⭐</span>`,
    `<span class="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs"><svg class="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg></span>`
  );

  content = content.replace(
    `<span>⭐ Google Review URL</span>`,
    `<span>Google Business Review URL</span>`
  );
  content = content.replace(
    `<span>📸 Instagram Profile or Handle</span>`,
    `<span>Instagram Profile or Handle</span>`
  );
  content = content.replace(
    `<span>⭐</span>\n              <span>Review on Google</span>`,
    `<span>Review on Google</span>`
  );
  content = content.replace(
    `<span>📸</span>\n              <span>Follow on Instagram</span>`,
    `<span>Follow on Instagram</span>`
  );

  // Install Modal PWA icon
  content = content.replace(
    `<span class="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 text-lg flex items-center justify-center font-bold">📲</span>`,
    `<span class="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg></span>`
  );
  content = content.replace(
    `<span>🤖</span>\n              <span>Android / Chrome:</span>`,
    `<span>Android / Chrome:</span>`
  );
  content = content.replace(
    `<span>🍎</span>\n              <span>iPhone / Safari:</span>`,
    `<span>iPhone / Safari:</span>`
  );

  // Delete Modal Warning icon
  content = content.replace(
    `<span class="w-9 h-9 rounded-xl bg-red-50 text-red-600 text-lg flex items-center justify-center font-bold">⚠️</span>`,
    `<span class="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg></span>`
  );

  // Add Outlet Modal icon
  content = content.replace(
    `<span class="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 text-lg flex items-center justify-center font-bold">🏪</span>`,
    `<span class="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0"><svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg></span>`
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Upgraded dashboard.html successfully.');
}

function upgradeShopKiosk() {
  const filePath = path.join(__dirname, '..', 'public', 'shop.html');
  let content = fs.readFileSync(filePath, 'utf8');

  // Change avatar gradient to crisp institutional slate-900
  content = content.replace(
    `class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow-xs"`,
    `class="w-11 h-11 rounded-xl bg-slate-900 text-white font-bold text-base flex items-center justify-center shrink-0 border border-slate-800 shadow-xs"`
  );

  // Verified checkmark
  content = content.replace(
    `<span class="text-indigo-600 text-xs shrink-0" title="Verified Merchant">✓</span>`,
    `<svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" title="Verified Merchant"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
  );

  // Active Reward Highlight Banner - remove purple gradient, use clean emerald trust/growth styling
  content = content.replace(
    `class="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100/80 rounded-xl p-3 flex items-center gap-3"`,
    `class="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 flex items-center gap-3"`
  );

  content = content.replace(
    `<span class="w-9 h-9 rounded-xl bg-white text-indigo-600 flex items-center justify-center text-lg shadow-2xs shrink-0">🎁</span>`,
    `<span class="w-9 h-9 rounded-lg bg-white border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-xs shrink-0"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V4a2 2 0 112 2h-2zm0 0V4a2 2 0 10-2 2h2m-7 4h14a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2z"/></svg></span>`
  );

  content = content.replace(
    `<span class="text-[10px] uppercase font-bold text-indigo-700 tracking-wider block">Customer Loyalty Perk</span>`,
    `<span class="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">Customer Loyalty Perk</span>`
  );

  // Social reviews buttons
  content = content.replace(
    `<span>⭐</span>\n          <span>Google Reviews</span>`,
    `<span class="flex items-center gap-1.5"><svg class="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg><span>Google Reviews</span></span>`
  );

  content = content.replace(
    `<span>📸</span>\n          <span>Instagram</span>`,
    `<span class="flex items-center gap-1.5"><svg class="w-3.5 h-3.5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg><span>Instagram</span></span>`
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Upgraded shop.html successfully.');
}

function upgradeCardPass() {
  const filePath = path.join(__dirname, '..', 'public', 'card.html');
  let content = fs.readFileSync(filePath, 'utf8');

  // Camera scan button icon
  content = content.replace(
    `<span class="text-base">📷</span>\n        <span>Scan Counter QR with Camera</span>`,
    `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg><span>Scan Counter QR with Camera</span>`
  );

  content = content.replace(
    `<span>📷</span>\n          <span>At counter? Scan QR with Camera &rarr;</span>`,
    `<span class="flex items-center gap-1.5"><svg class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg><span>At counter? Scan QR with Camera &rarr;</span></span>`
  );

  // Social review buttons in card
  content = content.replace(
    `<span>⭐</span>\n            <span>Review on Google</span>`,
    `<span class="flex items-center gap-1.5"><svg class="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg><span>Review on Google</span></span>`
  );

  content = content.replace(
    `<span>📸</span>\n            <span>Follow on Instagram</span>`,
    `<span class="flex items-center gap-1.5"><svg class="w-3.5 h-3.5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg><span>Follow on Instagram</span></span>`
  );

  // Camera modal icon
  content = content.replace(
    `<span class="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-bold">📷</span>`,
    `<span class="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-sm font-bold shadow-xs"><svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg></span>`
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Upgraded card.html successfully.');
}

function upgradeScanGate() {
  const filePath = path.join(__dirname, '..', 'public', 'scan.html');
  let content = fs.readFileSync(filePath, 'utf8');

  // Quick check-in box icon
  content = content.replace(
    `<div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-xl animate-pulse">\n        ★\n      </div>`,
    `<div class="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center mx-auto shadow-xs">\n        <svg class="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>\n      </div>`
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Upgraded scan.html successfully.');
}

function upgradeIndexPage() {
  const filePath = path.join(__dirname, '..', 'public', 'index.html');
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace lightbulb tip
  content = content.replace(
    `💡 Works on any iPad, Android tablet, POS terminal, or counter smartphone browser.`,
    `Hardware Agnostic: Compatible with any iPad, tablet, POS terminal, or smartphone browser.`
  );

  // Features grid icons
  content = content.replace(
    `<span class="text-2xl">🏪</span>\n          <h3 class="text-base font-bold text-gray-900">Multi-Shop Outlets</h3>`,
    `<span class="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs"><svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg></span>\n          <h3 class="text-base font-bold text-gray-900">Multi-Shop Outlets</h3>`
  );

  content = content.replace(
    `<span class="text-2xl">🛡️</span>\n          <h3 class="text-base font-bold text-gray-900">7-Hour Anti-Cheat System</h3>`,
    `<span class="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs"><svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg></span>\n          <h3 class="text-base font-bold text-gray-900">Anti-Cheat Architecture</h3>`
  );

  content = content.replace(
    `<span class="text-2xl">👥</span>\n          <h3 class="text-base font-bold text-gray-900">Live Customer CRM</h3>`,
    `<span class="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs"><svg class="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg></span>\n          <h3 class="text-base font-bold text-gray-900">Live Customer CRM</h3>`
  );

  content = content.replace(
    `<span class="text-2xl">⭐</span>\n          <h3 class="text-base font-bold text-gray-900">Google Review Booster</h3>`,
    `<span class="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs"><svg class="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg></span>\n          <h3 class="text-base font-bold text-gray-900">Google Review Accelerator</h3>`
  );

  content = content.replace(
    `<span class="text-2xl">📸</span>\n          <h3 class="text-base font-bold text-gray-900">Instagram Follower Hub</h3>`,
    `<span class="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs"><svg class="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg></span>\n          <h3 class="text-base font-bold text-gray-900">Instagram Follower Hub</h3>`
  );

  content = content.replace(
    `<span class="text-2xl">☁️</span>\n          <h3 class="text-base font-bold text-gray-900">Supabase Cloud Symmetry</h3>`,
    `<span class="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs"><svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z"/></svg></span>\n          <h3 class="text-base font-bold text-gray-900">Enterprise Cloud Symmetry</h3>`
  );

  // Outlet Switcher Demo box
  content = content.replace(
    `<span>☕ Royal Cafe - Downtown</span>`,
    `<span>Metro Flagship - Downtown</span>`
  );
  content = content.replace(
    `<span>🍰 Royal Bakery - Uptown</span>`,
    `<span>Boutique Outlet - Uptown</span>`
  );
  content = content.replace(
    `<span>🍕 Royal Pizzeria - Mall</span>`,
    `<span>Express Terminal - North Mall</span>`
  );

  // Mock pass social icons
  content = content.replace(
    `<div class=\"px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex items-center justify-center gap-1 shadow-2xs\">\n                  <span>⭐</span>\n                  <span>Review</span>\n                </div>`,
    `<div class=\"px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex items-center justify-center gap-1 shadow-2xs\"><svg class=\"w-3 h-3 text-amber-500\" fill=\"currentColor\" viewBox=\"0 0 20 20\"><path d=\"M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z\"/></svg><span>Review</span></div>`
  );

  content = content.replace(
    `<div class=\"px-2.5 py-1.5 bg-pink-50 border border-pink-200 rounded-lg text-pink-900 flex items-center justify-center gap-1 shadow-2xs\">\n                  <span>📸</span>\n                  <span>Instagram</span>\n                </div>`,
    `<div class=\"px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 flex items-center justify-center gap-1 shadow-2xs\"><svg class=\"w-3 h-3 text-slate-600\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z\"/><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M15 13a3 3 0 11-6 0 3 3 0 016 0z\"/></svg><span>Instagram</span></div>`
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Upgraded index.html successfully.');
}

upgradeDashboard();
upgradeShopKiosk();
upgradeCardPass();
upgradeScanGate();
upgradeIndexPage();

