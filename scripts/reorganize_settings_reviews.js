const fs = require('fs');

let html = fs.readFileSync('public/owner/dashboard.html', 'utf8');

// 1. Update Sidebar Navigation: Separate Reviews and Settings
const oldNav = `        <!-- Analytics -->
        <button type="button" onclick="openViewFromMenu('dashboard')" id="sideNavAnalytics"
          class="w-full text-gray-400 hover:text-white hover:bg-white/5 px-4 py-3 rounded-xl flex items-center gap-3 transition-all text-left">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
          <span>Analytics</span>
        </button>

        <!-- Settings (Social Review Links) -->
        <button type="button" onclick="openViewFromMenu('reviews')" id="sideNavReviews"
          class="w-full text-gray-400 hover:text-white hover:bg-white/5 px-4 py-3 rounded-xl flex items-center gap-3 transition-all text-left">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          <span>Settings</span>
        </button>`;

const newNav = `        <!-- Reviews (Dedicated View) -->
        <button type="button" onclick="openViewFromMenu('reviews')" id="sideNavReviews"
          class="w-full text-gray-400 hover:text-white hover:bg-white/5 px-4 py-3 rounded-xl flex items-center gap-3 transition-all text-left">
          <svg class="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
          <span>Reviews</span>
        </button>

        <!-- Settings (Quick Actions & Account) -->
        <button type="button" onclick="openViewFromMenu('settings')" id="sideNavSettings"
          class="w-full text-gray-400 hover:text-white hover:bg-white/5 px-4 py-3 rounded-xl flex items-center gap-3 transition-all text-left">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          <span>Settings</span>
        </button>`;

html = html.replace(oldNav, newNav);

// 2. Remove Quick Actions card from the main dashboard right column (keep promo card)
const oldRightCol = `          <!-- RIGHT 4 COLS: Quick Actions Card + Marketing Promotion Card (Exact from Mockup) -->
          <div class="lg:col-span-4 space-y-6">
            
            <!-- CARD 1: QUICK ACTIONS (Exact match to Mockup) -->
            <div class="bg-white border border-gray-200/80 rounded-2xl p-5 card-shadow space-y-3">
              <h3 class="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2.5">Quick Actions</h3>

              <div class="space-y-1.5 text-xs font-medium">
                
                <!-- Install App (PWA) -->
                <button type="button" onclick="openInstallModal()"
                  class="w-full text-left p-3 rounded-xl border border-gray-100 hover:border-amber-200 hover:bg-amber-50/50 flex items-center justify-between transition-all group">
                  <div class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center group-hover:bg-[#fdf6e9] group-hover:text-[#cb8926] transition-colors">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                    </span>
                    <div>
                      <div class="font-bold text-gray-900">Install App (PWA)</div>
                      
                    </div>
                  </div>
                  <span class="text-gray-300 group-hover:text-amber-600 transition-colors">&rsaquo;</span>
                </button>

                <!-- Launch Counter Kiosk -->
                <a id="drawerCounterLink" href="/shop.html" target="_blank"
                  class="w-full text-left p-3 rounded-xl border border-gray-100 hover:border-amber-200 hover:bg-amber-50/50 flex items-center justify-between transition-all group">
                  <div class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center group-hover:bg-[#fdf6e9] group-hover:text-[#cb8926] transition-colors">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                    </span>
                    <div>
                      <div class="font-bold text-gray-900">Launch Counter Screen</div>
                      
                    </div>
                  </div>
                  <span class="text-gray-300 group-hover:text-amber-600 transition-colors">&rsaquo;</span>
                </a>

                <!-- Sign Out -->
                <button type="button" onclick="handleLogout()"
                  class="w-full text-left p-3 rounded-xl border border-gray-100 hover:border-gray-300 hover:bg-gray-50 flex items-center justify-between transition-all group">
                  <div class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                    </span>
                    <div>
                      <div class="font-bold text-gray-900">Sign Out</div>
                      
                    </div>
                  </div>
                  <span class="text-gray-300">&rsaquo;</span>
                </button>

                <!-- Delete Account (Red) -->
                <button type="button" onclick="openDeleteModal()"
                  class="w-full text-left p-3 rounded-xl border border-red-50 hover:border-red-200 hover:bg-red-50/50 flex items-center justify-between transition-all group">
                  <div class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </span>
                    <div>
                      <div class="font-bold text-red-600">Delete Account</div>
                      
                    </div>
                  </div>
                  <span class="text-gray-300 group-hover:text-red-600">&rsaquo;</span>
                </button>

              </div>
            </div>

            <!-- CARD 2: "Grow Your Business with MarkU" PROMO (Exact match to Mockup) -->
            <div class="bg-[#121214] text-white rounded-3xl p-6 border border-gray-800 relative overflow-hidden space-y-4 shadow-xl">
              
              <!-- Subtle Gold Crown Graphic Top Right -->
              <span class="absolute top-4 right-5 text-amber-400 text-lg opacity-80">👑</span>

              <div class="space-y-1 relative z-10 max-w-[200px]">
                <h4 class="text-base font-extrabold tracking-tight leading-snug">
                  Grow Your Business with <span class="text-[#e5a83b]">MarkU</span>
                </h4>
                
              </div>

              <!-- Button "View Analytics →" -->
              <div class="pt-2 relative z-10">
                <button type="button" onclick="openViewFromMenu('reward')"
                  class="btn-gold px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                  <span>View Analytics</span>
                  <span>&rarr;</span>
                </button>
              </div>

              <!-- Mini Mockup Phone peeking in background -->
              <div class="absolute -bottom-6 -right-3 w-28 h-40 bg-[#1c1c1f] rounded-2xl border-2 border-amber-500/40 p-2 shadow-2xl opacity-90 transform rotate-6">
                <div class="text-[8px] text-center font-bold text-amber-400">Sunrise Café</div>
                <div class="grid grid-cols-2 gap-1 mt-2">
                  <div class="aspect-square bg-amber-400 rounded-full flex items-center justify-center text-[8px] text-black font-bold">★</div>
                  <div class="aspect-square bg-amber-400 rounded-full flex items-center justify-center text-[8px] text-black font-bold">★</div>
                  <div class="aspect-square border border-gray-500 rounded-full"></div>
                  <div class="aspect-square border border-gray-500 rounded-full"></div>
                </div>
              </div>

            </div>

          </div>`;

const newRightCol = `          <!-- RIGHT 4 COLS: Grow Business Promo Card -->
          <div class="lg:col-span-4 space-y-6">
            
            <!-- "Grow Your Business with MarkU" PROMO -->
            <div class="bg-[#121214] text-white rounded-3xl p-6 border border-gray-800 relative overflow-hidden space-y-4 shadow-xl">
              
              <!-- Subtle Gold Crown Graphic Top Right -->
              <span class="absolute top-4 right-5 text-amber-400 text-lg opacity-80">👑</span>

              <div class="space-y-1 relative z-10 max-w-[200px]">
                <h4 class="text-base font-extrabold tracking-tight leading-snug">
                  Grow Your Business with <span class="text-[#e5a83b]">MarkU</span>
                </h4>
              </div>

              <div class="pt-2 relative z-10">
                <button type="button" onclick="openViewFromMenu('reward')"
                  class="btn-gold px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                  <span>Stamp Card Rules</span>
                  <span>&rarr;</span>
                </button>
              </div>

              <!-- Mini Mockup Phone peeking in background -->
              <div class="absolute -bottom-6 -right-3 w-28 h-40 bg-[#1c1c1f] rounded-2xl border-2 border-amber-500/40 p-2 shadow-2xl opacity-90 transform rotate-6">
                <div class="text-[8px] text-center font-bold text-amber-400">Sunrise Café</div>
                <div class="grid grid-cols-2 gap-1 mt-2">
                  <div class="aspect-square bg-amber-400 rounded-full flex items-center justify-center text-[8px] text-black font-bold">★</div>
                  <div class="aspect-square bg-amber-400 rounded-full flex items-center justify-center text-[8px] text-black font-bold">★</div>
                  <div class="aspect-square border border-gray-500 rounded-full"></div>
                  <div class="aspect-square border border-gray-500 rounded-full"></div>
                </div>
              </div>

            </div>

            <!-- Quick Jump to Settings -->
            <div class="bg-white border border-gray-200/80 rounded-2xl p-4 card-shadow flex items-center justify-between">
              <div>
                <h4 class="font-bold text-xs text-gray-900">Manage Shop Settings</h4>
                <p class="text-[11px] text-gray-400">Quick actions & account tools</p>
              </div>
              <button type="button" onclick="openViewFromMenu('settings')"
                class="px-3.5 py-1.5 rounded-xl bg-gray-100 hover:bg-[#fdf6e9] hover:text-[#cb8926] text-gray-700 text-xs font-bold transition-all">
                Settings &rarr;
              </button>
            </div>

          </div>`;

html = html.replace(oldRightCol, newRightCol);

// 3. Make viewReviews dedicated to Reviews & Social links, and add separate viewSettings with Quick Actions
const oldViewReviews = `      <!-- ======================================================== -->
      <!-- VIEW 5: SETTINGS & REVIEWS                               -->
      <!-- ======================================================== -->
      <div id="viewReviews" class="hidden space-y-6">
        
        <div class="flex items-center justify-between pb-2">
          <button type="button" onclick="openViewFromMenu('dashboard')"
            class="inline-flex items-center gap-1.5 text-xs font-bold text-[#cb8926] hover:underline">
            <span>&larr;</span>
            <span>Back to Dashboard</span>
          </button>
          <span class="text-xs font-medium text-gray-400">Social & Review Links</span>
        </div>

        <div class="max-w-2xl bg-white border border-gray-200/90 rounded-2xl p-6 sm:p-8 card-shadow space-y-6">
          <div class="pb-4 border-b border-gray-100 flex items-start gap-3.5">
            <span class="w-10 h-10 rounded-xl bg-[#fdf6e9] text-[#cb8926] flex items-center justify-center text-lg font-bold shrink-0">
              ⭐
            </span>
            <div>
              <h2 class="text-base font-bold text-gray-900">Google Review & Instagram Profile</h2>
              <p class="text-xs text-gray-500 mt-0.5">Prompt customers directly from their pass to leave 5-star Google reviews.</p>
            </div>
          </div>

          <form onsubmit="handleSaveReviewsFromView(event)" class="space-y-5">
            <div class="space-y-1.5">
              <label for="viewReviewsGoogle" class="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Google Business Review URL
              </label>
              <input type="url" id="viewReviewsGoogle"
                placeholder="https://g.page/r/.../review or Google Maps link"
                class="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500">
            </div>

            <div class="space-y-1.5">
              <label for="viewReviewsInstagram" class="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Instagram Profile or Handle
              </label>
              <input type="text" id="viewReviewsInstagram"
                placeholder="https://instagram.com/yourshop or @yourshop"
                class="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500">
            </div>

            <button type="submit" id="saveViewReviewsBtn" class="btn-gold px-7 py-3 rounded-xl text-xs sm:text-sm font-bold">
              Save Social Links &rarr;
            </button>
            <span id="viewReviewsSavedBadge" class="hidden text-xs font-bold text-emerald-600 ml-3">✓ Links saved live!</span>
          </form>
        </div>

      </div>`;

const newViewReviewsAndSettings = `      <!-- ======================================================== -->
      <!-- VIEW 5: DEDICATED REVIEWS                                 -->
      <!-- ======================================================== -->
      <div id="viewReviews" class="hidden space-y-6">
        
        <div class="flex items-center justify-between pb-2">
          <button type="button" onclick="openViewFromMenu('dashboard')"
            class="inline-flex items-center gap-1.5 text-xs font-bold text-[#cb8926] hover:underline">
            <span>&larr;</span>
            <span>Back to Dashboard</span>
          </button>
          <span class="text-xs font-medium text-gray-400">Customer Reviews & Social Engagement</span>
        </div>

        <div class="max-w-2xl bg-white border border-gray-200/90 rounded-2xl p-6 sm:p-8 card-shadow space-y-6">
          <div class="pb-4 border-b border-gray-100 flex items-start gap-3.5">
            <span class="w-10 h-10 rounded-xl bg-[#fdf6e9] text-[#cb8926] flex items-center justify-center text-lg font-bold shrink-0">
              ⭐
            </span>
            <div>
              <h2 class="text-base font-bold text-gray-900">Google Reviews & Instagram Links</h2>
              <p class="text-xs text-gray-500 mt-0.5">Collect 5-star Google reviews and grow followers directly from customer passes.</p>
            </div>
          </div>

          <form onsubmit="handleSaveReviewsFromView(event)" class="space-y-5">
            <div class="space-y-1.5">
              <label for="viewReviewsGoogle" class="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Google Business Review Link
              </label>
              <input type="url" id="viewReviewsGoogle"
                placeholder="https://g.page/r/.../review or Google Maps link"
                class="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500">
            </div>

            <div class="space-y-1.5">
              <label for="viewReviewsInstagram" class="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Instagram Profile or Handle
              </label>
              <input type="text" id="viewReviewsInstagram"
                placeholder="https://instagram.com/yourshop or @yourshop"
                class="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500">
            </div>

            <button type="submit" id="saveViewReviewsBtn" class="btn-gold px-7 py-3 rounded-xl text-xs sm:text-sm font-bold">
              Save Review Links &rarr;
            </button>
            <span id="viewReviewsSavedBadge" class="hidden text-xs font-bold text-emerald-600 ml-3">✓ Links saved live!</span>
          </form>
        </div>

      </div>

      <!-- ======================================================== -->
      <!-- VIEW 6: SETTINGS (QUICK ACTIONS & ACCOUNT MANAGEMENT)     -->
      <!-- ======================================================== -->
      <div id="viewSettings" class="hidden space-y-6">
        
        <div class="flex items-center justify-between pb-2">
          <button type="button" onclick="openViewFromMenu('dashboard')"
            class="inline-flex items-center gap-1.5 text-xs font-bold text-[#cb8926] hover:underline">
            <span>&larr;</span>
            <span>Back to Dashboard</span>
          </button>
          <span class="text-xs font-medium text-gray-400">Account & Quick Actions</span>
        </div>

        <div class="max-w-2xl bg-white border border-gray-200/90 rounded-2xl p-6 sm:p-8 card-shadow space-y-6">
          <div class="pb-4 border-b border-gray-100 flex items-start gap-3.5">
            <span class="w-10 h-10 rounded-xl bg-[#fdf6e9] text-[#cb8926] flex items-center justify-center text-lg font-bold shrink-0">
              ⚙️
            </span>
            <div>
              <h2 class="text-base font-bold text-gray-900">Settings & Quick Actions</h2>
              <p class="text-xs text-gray-500 mt-0.5">Manage terminal display, kiosk app installation, and account security.</p>
            </div>
          </div>

          <!-- Quick Actions Grid inside Settings -->
          <div class="space-y-3">
            <span class="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">Quick Action Tools:</span>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              <!-- Install App (PWA) -->
              <button type="button" onclick="openInstallModal()"
                class="p-4 rounded-xl border border-gray-200 hover:border-amber-300 hover:bg-amber-50/40 flex items-center gap-3 transition-all text-left">
                <span class="w-10 h-10 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
                  <svg class="w-5 h-5 text-[#cb8926]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                </span>
                <div>
                  <div class="font-bold text-xs text-gray-900">Install App (PWA)</div>
                  <div class="text-[10px] text-gray-400">Home screen kiosk</div>
                </div>
              </button>

              <!-- Launch Counter Terminal Screen -->
              <a id="drawerCounterLink" href="/shop.html" target="_blank"
                class="p-4 rounded-xl border border-gray-200 hover:border-amber-300 hover:bg-amber-50/40 flex items-center gap-3 transition-all text-left">
                <span class="w-10 h-10 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
                  <svg class="w-5 h-5 text-[#cb8926]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                </span>
                <div>
                  <div class="font-bold text-xs text-gray-900">Counter Screen</div>
                  <div class="text-[10px] text-gray-400">Rolling QR checkout</div>
                </div>
              </a>

            </div>

            <div class="pt-4 border-t border-gray-100 space-y-3">
              <span class="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">Account & Security:</span>

              <div class="flex flex-col sm:flex-row gap-3">
                <!-- Sign Out -->
                <button type="button" onclick="handleLogout()"
                  class="flex-1 p-3.5 rounded-xl border border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-2 text-xs font-bold text-gray-700 transition-all">
                  <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                  <span>Sign Out</span>
                </button>

                <!-- Delete Account -->
                <button type="button" onclick="openDeleteModal()"
                  class="flex-1 p-3.5 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 flex items-center justify-center gap-2 text-xs font-bold transition-all">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  <span>Delete Account</span>
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>`;

html = html.replace(oldViewReviews, newViewReviewsAndSettings);

// 4. Update Mobile Drawer navigation
const oldDrawerNav = `<button onclick="openViewFromMenu('dashboard'); toggleCornerDrawer(false);" class="w-full text-left p-2.5 rounded-xl hover:bg-white/10">Dashboard</button>
            <button onclick="openViewFromMenu('customers'); toggleCornerDrawer(false);" class="w-full text-left p-2.5 rounded-xl hover:bg-white/10">Customers</button>
            <button onclick="openViewFromMenu('reward'); toggleCornerDrawer(false);" class="w-full text-left p-2.5 rounded-xl hover:bg-white/10">Stamp Cards</button>
            <button onclick="openViewFromMenu('cooldown'); toggleCornerDrawer(false);" class="w-full text-left p-2.5 rounded-xl hover:bg-white/10">Campaigns</button>
            <button onclick="openViewFromMenu('reviews'); toggleCornerDrawer(false);" class="w-full text-left p-2.5 rounded-xl hover:bg-white/10">Settings</button>`;

const newDrawerNav = `<button onclick="openViewFromMenu('dashboard'); toggleCornerDrawer(false);" class="w-full text-left p-2.5 rounded-xl hover:bg-white/10">Dashboard</button>
            <button onclick="openViewFromMenu('customers'); toggleCornerDrawer(false);" class="w-full text-left p-2.5 rounded-xl hover:bg-white/10">Customers</button>
            <button onclick="openViewFromMenu('reward'); toggleCornerDrawer(false);" class="w-full text-left p-2.5 rounded-xl hover:bg-white/10">Stamp Cards</button>
            <button onclick="openViewFromMenu('cooldown'); toggleCornerDrawer(false);" class="w-full text-left p-2.5 rounded-xl hover:bg-white/10">Campaigns</button>
            <button onclick="openViewFromMenu('reviews'); toggleCornerDrawer(false);" class="w-full text-left p-2.5 rounded-xl hover:bg-white/10">Reviews</button>
            <button onclick="openViewFromMenu('settings'); toggleCornerDrawer(false);" class="w-full text-left p-2.5 rounded-xl hover:bg-white/10">Settings</button>`;

html = html.replace(oldDrawerNav, newDrawerNav);

// 5. Update openViewFromMenu in JS to handle both 'reviews' and 'settings'
const oldOpenView = `    function openViewFromMenu(viewId) {
      const views = ['dashboard', 'reward', 'cooldown', 'customers', 'reviews'];
      views.forEach(v => {
        const el = document.getElementById('view' + capitalizeFirst(v));
        if (el) el.classList.toggle('hidden', v !== viewId);
      });

      // Update sidebar nav active state
      ['Dashboard', 'Customers', 'Reward', 'Cooldown', 'Reviews'].forEach(n => {
        const navBtn = document.getElementById('sideNav' + n);
        if (navBtn) {
          if (n.toLowerCase() === viewId.toLowerCase() || (n === 'Reward' && viewId === 'reward') || (n === 'Reviews' && viewId === 'reviews')) {
            navBtn.className = 'w-full gold-active-nav px-4 py-3 rounded-xl flex items-center gap-3 transition-all text-left';
          } else {
            navBtn.className = 'w-full text-gray-400 hover:text-white hover:bg-white/5 px-4 py-3 rounded-xl flex items-center gap-3 transition-all text-left';
          }
        }
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }`;

const newOpenView = `    function openViewFromMenu(viewId) {
      const views = ['dashboard', 'reward', 'cooldown', 'customers', 'reviews', 'settings'];
      views.forEach(v => {
        const el = document.getElementById('view' + capitalizeFirst(v));
        if (el) el.classList.toggle('hidden', v !== viewId);
      });

      // Update sidebar nav active state
      ['Dashboard', 'Customers', 'Reward', 'Cooldown', 'Reviews', 'Settings'].forEach(n => {
        const navBtn = document.getElementById('sideNav' + n);
        if (navBtn) {
          if (n.toLowerCase() === viewId.toLowerCase() || (n === 'Reward' && viewId === 'reward') || (n === 'Reviews' && viewId === 'reviews') || (n === 'Settings' && viewId === 'settings')) {
            navBtn.className = 'w-full gold-active-nav px-4 py-3 rounded-xl flex items-center gap-3 transition-all text-left';
          } else {
            navBtn.className = 'w-full text-gray-400 hover:text-white hover:bg-white/5 px-4 py-3 rounded-xl flex items-center gap-3 transition-all text-left';
          }
        }
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }`;

html = html.replace(oldOpenView, newOpenView);

fs.writeFileSync('public/owner/dashboard.html', html, 'utf8');
console.log('Reorganized Quick Actions into Settings, and created separate Reviews view');
