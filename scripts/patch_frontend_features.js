const fs = require('fs');
const path = require('path');

const dashboardPath = path.join(__dirname, '../public/owner/dashboard.html');
const cardPath = path.join(__dirname, '../public/card.html');
const shopPath = path.join(__dirname, '../public/shop.html');

// ====================================================================
// 1. UPDATE public/owner/dashboard.html
// ====================================================================
let dashHtml = fs.readFileSync(dashboardPath, 'utf8');

// Replace Header Kiosk Screen -> Counter QR
dashHtml = dashHtml.replace(
  `        <!-- Direct Quick Counter Kiosk Launcher -->\n        <a id="counterLink" href="/shop.html" target="_blank"\n          class="bg-[#fef6e7] hover:bg-[#faecd6] text-[#cb8926] border border-amber-200/80 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs whitespace-nowrap">\n          <span>Kiosk Screen</span>\n          <span class="text-xs">&nearr;</span>\n        </a>`,
  `        <!-- Direct Quick Counter QR Launcher -->\n        <a id="counterLink" href="/shop.html" target="_blank"\n          class="bg-[#fef6e7] hover:bg-[#faecd6] text-[#cb8926] border border-amber-200/80 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs whitespace-nowrap" title="Open live counter QR display">\n          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>\n          <span>Counter QR</span>\n          <span class="text-xs">&nearr;</span>\n        </a>`
);

// Replace notification bell and owner profile avatar trigger
const oldHeaderRight = `        <!-- Notification Bell with Red Dot (From Mockup) -->
        <button type="button" class="relative p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors" title="Notifications">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
          <span class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500"></span>
        </button>

        <!-- Owner Profile: Avatar + Name + Dropdown Arrow (From Mockup) -->
        <div class="flex items-center gap-2.5 pl-2 border-l border-gray-200">
          <div class="w-9 h-9 rounded-full bg-[#111113] border border-amber-500/60 text-amber-500 flex items-center justify-center text-sm shadow-xs font-bold">
            ☕
          </div>
          <div class="hidden sm:block text-left">
            <div id="topOwnerName" class="font-extrabold text-xs text-gray-900 leading-tight">Sunrise Café</div>
            <div class="text-[10px] text-gray-400 font-medium">Owner</div>
          </div>
          <svg class="w-3.5 h-3.5 text-gray-400 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
        </div>`;

const newHeaderRight = `        <!-- Notification Bell with Interactive Dropdown -->
        <div class="relative">
          <button type="button" onclick="toggleNotifications()" id="notifBellBtn"
            class="relative p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none" title="Store Notifications">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
            <span id="notifBadge" class="hidden absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center shadow-sm">0</span>
          </button>

          <!-- Notification Dropdown Panel -->
          <div id="notifDropdown" class="hidden absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-gray-100">
            <div class="p-3.5 bg-gray-50 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="font-extrabold text-xs text-gray-900">Live Customer Activity</span>
                <span id="notifUnreadCountPill" class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">0 new</span>
              </div>
              <button type="button" onclick="markAllNotificationsRead()" class="text-[11px] font-bold text-[#cb8926] hover:underline">Mark all read</button>
            </div>
            <div id="notifList" class="max-h-80 overflow-y-auto p-2 space-y-1 divide-y divide-gray-50">
              <div class="py-8 text-center text-xs text-gray-400">No new notifications yet</div>
            </div>
          </div>
        </div>

        <!-- Owner Profile Trigger: Avatar + Name + Dropdown Arrow (Clickable to edit logo & profile) -->
        <button type="button" onclick="openOwnerProfileModal()"
          class="flex items-center gap-2.5 pl-2 border-l border-gray-200 hover:opacity-85 transition-opacity text-left focus:outline-none cursor-pointer" title="Click to view shop info & change logo">
          <div id="topOwnerAvatar" class="w-9 h-9 rounded-full bg-[#111113] border border-amber-500/60 text-amber-500 flex items-center justify-center text-sm shadow-xs font-bold overflow-hidden shrink-0">
            ☕
          </div>
          <div class="hidden sm:block text-left">
            <div id="topOwnerName" class="font-extrabold text-xs text-gray-900 leading-tight">Sunrise Café</div>
            <div class="text-[10px] text-gray-400 font-medium flex items-center gap-1">
              <span>Owner</span>
              <span class="text-amber-500 font-bold">• Shop Logo</span>
            </div>
          </div>
          <svg class="w-3.5 h-3.5 text-gray-400 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
        </button>`;

dashHtml = dashHtml.replace(oldHeaderRight, newHeaderRight);

// Sidebar Outlet Icon ID
dashHtml = dashHtml.replace(
  `<span class="w-8 h-8 rounded-lg bg-black border border-amber-500/40 text-amber-500 flex items-center justify-center text-xs shrink-0">\n          ☕\n        </span>`,
  `<span id="sidebarShopAvatar" class="w-8 h-8 rounded-lg bg-black border border-amber-500/40 text-amber-500 flex items-center justify-center text-xs shrink-0 overflow-hidden font-bold">\n          ☕\n        </span>`
);

// Update VIEW 5: DEDICATED REVIEWS with verified mark & Update button logic
const oldViewReviews = `        <div class="max-w-2xl bg-white border border-gray-200/90 rounded-2xl p-6 sm:p-8 card-shadow space-y-6">
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
        </div>`;

const newViewReviews = `        <div class="max-w-2xl bg-white border border-gray-200/90 rounded-2xl p-6 sm:p-8 card-shadow space-y-6">
          <div class="pb-4 border-b border-gray-100 flex items-start gap-3.5">
            <span class="w-10 h-10 rounded-xl bg-[#fdf6e9] text-[#cb8926] flex items-center justify-center text-lg font-bold shrink-0">
              ⭐
            </span>
            <div class="flex-1">
              <h2 class="text-base font-bold text-gray-900">Google Reviews & Instagram Links</h2>
              <p class="text-xs text-gray-500 mt-0.5">Collect 5-star Google reviews and grow followers directly from customer passes.</p>
            </div>
          </div>

          <!-- Dynamic Status Banner showing whether review links are added -->
          <div id="reviewsStatusBox" class="p-3.5 rounded-xl border border-gray-200 bg-gray-50 text-xs text-gray-600 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span id="reviewsStatusIcon" class="w-2.5 h-2.5 rounded-full bg-gray-400"></span>
              <span id="reviewsStatusText" class="font-bold text-gray-700">Review links not configured yet.</span>
            </div>
            <span id="reviewsStatusPill" class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">INACTIVE</span>
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

            <div class="flex items-center gap-3 pt-1">
              <button type="submit" id="saveViewReviewsBtn" class="btn-gold px-7 py-3 rounded-xl text-xs sm:text-sm font-bold shadow-sm">
                Save Review Links &rarr;
              </button>
              <span id="viewReviewsSavedBadge" class="hidden text-xs font-bold text-emerald-600 animate-pulse">✓ Saved & Synced Live!</span>
            </div>
          </form>
        </div>`;

dashHtml = dashHtml.replace(oldViewReviews, newViewReviews);

// Add Owner Profile & Logo Upload Modal right before </body>
const ownerProfileModalHtml = `
  <!-- ======================================================== -->
  <!-- OWNER PROFILE & SHOP LOGO MODAL                          -->
  <!-- ======================================================== -->
  <div id="ownerProfileModal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
    <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-5 animate-in fade-in duration-150">
      
      <div class="flex items-center justify-between border-b pb-3">
        <div class="flex items-center gap-2">
          <span class="w-8 h-8 rounded-lg bg-[#fdf6e9] text-[#cb8926] flex items-center justify-center font-bold text-sm">🏪</span>
          <h3 class="text-sm font-extrabold text-gray-900">Shop Profile & Logo</h3>
        </div>
        <button onclick="closeOwnerProfileModal()" class="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
      </div>

      <!-- Shop Information Summary -->
      <div class="bg-gray-50 border border-gray-200/80 rounded-xl p-3.5 space-y-2 text-xs">
        <div class="flex justify-between items-center">
          <span class="text-gray-500">Outlet Name:</span>
          <span id="modalShopName" class="font-extrabold text-gray-900">Sunrise Café</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-500">Kiosk Slug:</span>
          <span id="modalShopSlug" class="font-mono text-amber-600 font-bold">/shop/sunrise-cafe</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-500">Loyalty Target:</span>
          <span id="modalShopTarget" class="font-bold text-gray-800">10 Stamps</span>
        </div>
      </div>

      <!-- Logo Preview & Customization -->
      <div class="space-y-3">
        <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider">
          Shop Logo / Display Icon
        </label>
        
        <div class="flex items-center gap-4">
          <div id="modalLogoPreview" class="w-16 h-16 rounded-2xl bg-[#111113] border-2 border-amber-500 text-amber-500 flex items-center justify-center text-2xl font-bold shadow-md overflow-hidden shrink-0">
            ☕
          </div>
          <div class="text-xs text-gray-500 space-y-1">
            <p class="font-semibold text-gray-800">Shows on Customer Loyalty Cards & Counter QR screen.</p>
            <p class="text-[11px] text-gray-400">Choose a preset icon below or upload your custom logo image.</p>
          </div>
        </div>

        <!-- Quick Preset Emojis -->
        <div class="space-y-1.5 pt-1">
          <span class="text-[11px] font-bold text-gray-500 block">Quick Icon Presets:</span>
          <div class="flex flex-wrap gap-2" id="presetLogoButtons">
            <button type="button" onclick="selectPresetLogo('☕')" class="w-9 h-9 rounded-xl border border-gray-200 hover:border-amber-500 hover:bg-amber-50 text-base flex items-center justify-center transition-all">☕</button>
            <button type="button" onclick="selectPresetLogo('🍵')" class="w-9 h-9 rounded-xl border border-gray-200 hover:border-amber-500 hover:bg-amber-50 text-base flex items-center justify-center transition-all">🍵</button>
            <button type="button" onclick="selectPresetLogo('✂️')" class="w-9 h-9 rounded-xl border border-gray-200 hover:border-amber-500 hover:bg-amber-50 text-base flex items-center justify-center transition-all">✂️</button>
            <button type="button" onclick="selectPresetLogo('🍔')" class="w-9 h-9 rounded-xl border border-gray-200 hover:border-amber-500 hover:bg-amber-50 text-base flex items-center justify-center transition-all">🍔</button>
            <button type="button" onclick="selectPresetLogo('🍕')" class="w-9 h-9 rounded-xl border border-gray-200 hover:border-amber-500 hover:bg-amber-50 text-base flex items-center justify-center transition-all">🍕</button>
            <button type="button" onclick="selectPresetLogo('🛍️')" class="w-9 h-9 rounded-xl border border-gray-200 hover:border-amber-500 hover:bg-amber-50 text-base flex items-center justify-center transition-all">🛍️</button>
            <button type="button" onclick="selectPresetLogo('⭐')" class="w-9 h-9 rounded-xl border border-gray-200 hover:border-amber-500 hover:bg-amber-50 text-base flex items-center justify-center transition-all">⭐</button>
            <button type="button" onclick="selectPresetLogo('🍰')" class="w-9 h-9 rounded-xl border border-gray-200 hover:border-amber-500 hover:bg-amber-50 text-base flex items-center justify-center transition-all">🍰</button>
          </div>
        </div>

        <!-- Custom Image File Upload -->
        <div class="space-y-1.5 pt-2">
          <label class="text-[11px] font-bold text-gray-500 block">Or Upload Logo Image (PNG, JPG, SVG):</label>
          <input type="file" id="modalLogoFileInput" accept="image/*" onchange="handleLogoFileSelect(event)"
            class="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#fdf6e9] file:text-[#cb8926] hover:file:bg-[#faecd6] cursor-pointer">
        </div>

        <!-- Or Direct Image URL -->
        <div class="space-y-1.5">
          <input type="url" id="modalLogoUrlInput" placeholder="Or paste image URL (https://...)" oninput="handleLogoUrlInput(this.value)"
            class="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500">
        </div>

      </div>

      <div class="flex items-center justify-end gap-2.5 pt-3 border-t">
        <button type="button" onclick="closeOwnerProfileModal()" class="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100">
          Cancel
        </button>
        <button type="button" id="saveLogoBtn" onclick="saveShopLogo()" class="btn-gold px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm">
          Save Shop Logo &rarr;
        </button>
      </div>

    </div>
  </div>
`;

dashHtml = dashHtml.replace('</body>', `${ownerProfileModalHtml}\n</body>`);

// Update the script section of dashboard.html
const oldScriptTarget = `        // Metrics
        const totalCust = data.metrics ? data.metrics.totalCustomers : (data.customers || []).length;`;

const newScriptTarget = `        // Update Logo & Avatars across Owner UI
        updateOwnerLogoDisplays(currentShop.logoUrl);

        // Update Reviews Tab Verified Indicator & Button Text
        updateReviewsTabState(googleReview, instagram);

        // Update Notifications Dropdown & Badge
        updateNotificationsList(data.recentActivity);

        // Metrics
        const totalCust = data.metrics ? data.metrics.totalCustomers : (data.customers || []).length;`;

dashHtml = dashHtml.replace(oldScriptTarget, newScriptTarget);

// Add helper functions to script
const additionalScript = `
    // -------------------------------------------------------------
    // LOGO CUSTOMIZATION & NOTIFICATIONS LOGIC
    // -------------------------------------------------------------
    let currentSelectedLogo = '';
    let seenActivityTimestamps = new Set(JSON.parse(localStorage.getItem('seen_activity_timestamps') || '[]'));

    function updateOwnerLogoDisplays(logo) {
      currentSelectedLogo = logo || '';
      const displayContent = formatAvatarContent(logo);

      const topAvatar = document.getElementById('topOwnerAvatar');
      if (topAvatar) topAvatar.innerHTML = displayContent;

      const sideAvatar = document.getElementById('sidebarShopAvatar');
      if (sideAvatar) sideAvatar.innerHTML = displayContent;

      const modalPreview = document.getElementById('modalLogoPreview');
      if (modalPreview) modalPreview.innerHTML = displayContent;
    }

    function formatAvatarContent(logo) {
      if (!logo || !logo.trim()) {
        return '☕';
      }
      const trimmed = logo.trim();
      if (trimmed.startsWith('data:image') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return '<img src="' + escapeHtml(trimmed) + '" class="w-full h-full object-cover rounded-full" alt="Shop Logo">';
      }
      return escapeHtml(trimmed);
    }

    function openOwnerProfileModal() {
      if (!currentShop) return;
      document.getElementById('modalShopName').textContent = currentShop.name;
      document.getElementById('modalShopSlug').textContent = '/shop/' + currentShop.slug;
      document.getElementById('modalShopTarget').textContent = (currentShop.stampsTarget || 10) + ' Stamps';
      
      const currentLogo = currentShop.logoUrl || '';
      updateOwnerLogoDisplays(currentLogo);
      const urlInput = document.getElementById('modalLogoUrlInput');
      if (urlInput) urlInput.value = (currentLogo.startsWith('http') && !currentLogo.startsWith('data:')) ? currentLogo : '';
      
      document.getElementById('ownerProfileModal').classList.remove('hidden');
    }

    function closeOwnerProfileModal() {
      document.getElementById('ownerProfileModal').classList.add('hidden');
    }

    function selectPresetLogo(emoji) {
      currentSelectedLogo = emoji;
      updateOwnerLogoDisplays(emoji);
      const urlInput = document.getElementById('modalLogoUrlInput');
      if (urlInput) urlInput.value = '';
    }

    function handleLogoUrlInput(val) {
      if (!val) return;
      currentSelectedLogo = val.trim();
      updateOwnerLogoDisplays(currentSelectedLogo);
    }

    function handleLogoFileSelect(e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        alert('Please choose an image under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = function(evt) {
        currentSelectedLogo = evt.target.result;
        updateOwnerLogoDisplays(currentSelectedLogo);
      };
      reader.readAsDataURL(file);
    }

    async function saveShopLogo() {
      const btn = document.getElementById('saveLogoBtn');
      const origText = btn.textContent;
      btn.textContent = 'Saving...';
      btn.disabled = true;

      try {
        const queryParam = activeShopSlug ? '?shop=' + encodeURIComponent(activeShopSlug) : '';
        const res = await fetch('/api/owner/settings' + queryParam, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({ logoUrl: currentSelectedLogo })
        });
        const data = await res.json();
        if (data.success) {
          if (currentShop) currentShop.logoUrl = currentSelectedLogo;
          updateOwnerLogoDisplays(currentSelectedLogo);
          closeOwnerProfileModal();
          const alertBox = document.getElementById('settingsAlert');
          if (alertBox) {
            alertBox.className = 'rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 p-3.5 text-xs font-semibold text-center shadow-sm';
            alertBox.textContent = '✓ Shop logo updated successfully and synced across loyalty cards!';
            alertBox.classList.remove('hidden');
            setTimeout(() => alertBox.classList.add('hidden'), 4000);
          }
        } else {
          alert(data.message || 'Failed to save logo.');
        }
      } catch (err) {
        console.error(err);
      } finally {
        btn.textContent = origText;
        btn.disabled = false;
      }
    }

    // -------------------------------------------------------------
    // REVIEWS TAB VERIFIED STATE
    // -------------------------------------------------------------
    function updateReviewsTabState(googleUrl, instaUrl) {
      const hasLinks = Boolean((googleUrl && googleUrl.trim()) || (instaUrl && instaUrl.trim()));
      const statusBox = document.getElementById('reviewsStatusBox');
      const statusIcon = document.getElementById('reviewsStatusIcon');
      const statusText = document.getElementById('reviewsStatusText');
      const statusPill = document.getElementById('reviewsStatusPill');
      const saveBtn = document.getElementById('saveViewReviewsBtn');

      if (hasLinks) {
        if (statusBox) statusBox.className = 'p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-xs text-emerald-900 flex items-center justify-between';
        if (statusIcon) statusIcon.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse';
        if (statusText) statusText.innerHTML = '✓ Review links active & live on customer passes!';
        if (statusPill) {
          statusPill.className = 'text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200';
          statusPill.textContent = 'ACTIVE & LIVE';
        }
        if (saveBtn) saveBtn.textContent = 'Update Review Links →';
      } else {
        if (statusBox) statusBox.className = 'p-3.5 rounded-xl border border-gray-200 bg-gray-50 text-xs text-gray-600 flex items-center justify-between';
        if (statusIcon) statusIcon.className = 'w-2.5 h-2.5 rounded-full bg-gray-400';
        if (statusText) statusText.textContent = 'Review links not configured yet. Add them below:';
        if (statusPill) {
          statusPill.className = 'text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-600';
          statusPill.textContent = 'NOT ADDED';
        }
        if (saveBtn) saveBtn.textContent = 'Save Review Links →';
      }
    }

    // -------------------------------------------------------------
    // LIVE NOTIFICATIONS DROPDOWN & REAL-TIME BADGE
    // -------------------------------------------------------------
    let currentActivities = [];

    function toggleNotifications() {
      const dd = document.getElementById('notifDropdown');
      if (dd) dd.classList.toggle('hidden');
    }

    // Close notifications dropdown on outside click
    document.addEventListener('click', (e) => {
      const dd = document.getElementById('notifDropdown');
      const bell = document.getElementById('notifBellBtn');
      if (dd && !dd.classList.contains('hidden') && !dd.contains(e.target) && !bell.contains(e.target)) {
        dd.classList.add('hidden');
      }
    });

    function updateNotificationsList(recentActivity) {
      currentActivities = recentActivity || [];
      const notifList = document.getElementById('notifList');
      const badge = document.getElementById('notifBadge');
      const unreadPill = document.getElementById('notifUnreadCountPill');

      if (!currentActivities || currentActivities.length === 0) {
        if (badge) badge.classList.add('hidden');
        if (unreadPill) unreadPill.textContent = '0 new';
        if (notifList) notifList.innerHTML = '<div class="py-8 text-center text-xs text-gray-400">No activity recorded yet</div>';
        return;
      }

      // Count unread
      let unreadCount = 0;
      currentActivities.forEach(a => {
        const key = String(a.created_at || a.timestamp || a.id);
        if (!seenActivityTimestamps.has(key)) unreadCount++;
      });

      if (badge) {
        if (unreadCount > 0) {
          badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      }

      if (unreadPill) {
        unreadPill.textContent = unreadCount + ' new';
      }

      if (notifList) {
        notifList.innerHTML = currentActivities.slice(0, 15).map(a => {
          const key = String(a.created_at || a.timestamp || a.id);
          const isUnread = !seenActivityTimestamps.has(key);
          const isReward = (a.action_type === 'REWARD_REDEEMED' || a.actionType === 'REWARD_REDEEMED');
          const timeStr = new Date(a.created_at || a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const name = escapeHtml(a.customer_name || a.customerName || a.phone || 'Customer');

          return \`
            <div class="p-2.5 rounded-xl flex items-center justify-between gap-3 \${isUnread ? 'bg-amber-50/70 border border-amber-200/60' : 'hover:bg-gray-50'} transition-colors">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="w-8 h-8 rounded-full \${isReward ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-800'} flex items-center justify-center text-xs font-bold shrink-0">
                  \${isReward ? '🎁' : '★'}
                </span>
                <div class="min-w-0 flex-1">
                  <div class="font-bold text-xs text-gray-900 truncate">\${name}</div>
                  <div class="text-[11px] text-gray-500">\${isReward ? 'Redeemed full reward!' : 'Collected a stamp'}</div>
                </div>
              </div>
              <div class="text-right shrink-0">
                <span class="text-[10px] font-mono text-gray-400 block">\${timeStr}</span>
                \${isUnread ? '<span class="inline-block w-2 h-2 rounded-full bg-amber-500 mt-1"></span>' : ''}
              </div>
            </div>
          \`;
        }).join('');
      }
    }

    function markAllNotificationsRead() {
      currentActivities.forEach(a => {
        const key = String(a.created_at || a.timestamp || a.id);
        seenActivityTimestamps.add(key);
      });
      localStorage.setItem('seen_activity_timestamps', JSON.stringify(Array.from(seenActivityTimestamps).slice(-100)));
      updateNotificationsList(currentActivities);
    }
`;

dashHtml = dashHtml.replace('// -------------------------------------------------------------', additionalScript + '\n    // -------------------------------------------------------------');

fs.writeFileSync(dashboardPath, dashHtml, 'utf8');
console.log('public/owner/dashboard.html updated successfully');

// ====================================================================
// 2. UPDATE public/card.html
// ====================================================================
let cardHtml = fs.readFileSync(cardPath, 'utf8');

// Give shop avatar an ID in card.html
cardHtml = cardHtml.replace(
  `<div class="w-12 h-12 rounded-full border-2 border-amber-500 bg-black flex items-center justify-center mx-auto text-amber-500 text-lg shadow-md font-bold">\n          ☕\n        </div>`,
  `<div id="cardShopAvatar" class="w-12 h-12 rounded-full border-2 border-amber-500 bg-black flex items-center justify-center mx-auto text-amber-500 text-lg shadow-md font-bold overflow-hidden">\n          ☕\n        </div>`
);

// In renderCard(card, shop), render shop.logoUrl
cardHtml = cardHtml.replace(
  `function renderCard(card, shop) {\n      const target = shop?.stampsTarget || 10;\n      document.getElementById('cardContainer').classList.remove('hidden');\n      document.getElementById('cardShopName').textContent = shop?.name || 'Loyalty Card';`,
  `function renderCard(card, shop) {\n      const target = shop?.stampsTarget || 10;\n      document.getElementById('cardContainer').classList.remove('hidden');\n      document.getElementById('cardShopName').textContent = shop?.name || 'Loyalty Card';\n      \n      // Render Shop Logo / Avatar\n      const avatarEl = document.getElementById('cardShopAvatar');\n      if (avatarEl) {\n        const logo = (shop?.logoUrl || '').trim();\n        if (logo.startsWith('data:image') || logo.startsWith('http://') || logo.startsWith('https://')) {\n          avatarEl.innerHTML = '<img src="' + escapeHtml(logo) + '" class="w-full h-full object-cover rounded-full" alt="Shop Logo">';\n        } else if (logo) {\n          avatarEl.textContent = logo;\n        } else {\n          avatarEl.textContent = '☕';\n        }\n      }`
);

fs.writeFileSync(cardPath, cardHtml, 'utf8');
console.log('public/card.html updated successfully');

// ====================================================================
// 3. UPDATE public/shop.html
// ====================================================================
let shopHtml = fs.readFileSync(shopPath, 'utf8');

// In loadQr(data), update shopAvatar with logoUrl
shopHtml = shopHtml.replace(
  `document.getElementById('shopTitle').textContent = shop.name;\n        document.getElementById('shopRewardSub').textContent = \`\${shop.stampsTarget || 10} stamps = \${shop.rewardDescription || '1 Free Item'}\`;`,
  `document.getElementById('shopTitle').textContent = shop.name;\n        document.getElementById('shopRewardSub').textContent = \`\${shop.stampsTarget || 10} stamps = \${shop.rewardDescription || '1 Free Item'}\`;\n        \n        const avatarEl = document.getElementById('shopAvatar');\n        if (avatarEl) {\n          const logo = (shop.logoUrl || '').trim();\n          if (logo.startsWith('data:image') || logo.startsWith('http://') || logo.startsWith('https://')) {\n            avatarEl.innerHTML = '<img src="' + escapeHtml(logo) + '" class="w-full h-full object-cover rounded-xl" alt="Shop Logo">';\n          } else if (logo) {\n            avatarEl.textContent = logo;\n          } else {\n            avatarEl.textContent = shop.name ? shop.name.charAt(0).toUpperCase() : 'S';\n          }\n        }`
);

fs.writeFileSync(shopPath, shopHtml, 'utf8');
console.log('public/shop.html updated successfully');
