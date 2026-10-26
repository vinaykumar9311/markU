const fs = require('fs');
const path = require('path');

const dashPath = path.join(__dirname, '../public/owner/dashboard.html');
let html = fs.readFileSync(dashPath, 'utf8');

// 1. Clean the head Tailwind script:
// Replace everything between <script src="https://cdn.tailwindcss.com"> and </script>\n  <style>
const tailwindPattern = /<script src="https:\/\/cdn\.tailwindcss\.com">[\s\S]*?<\/script>\s*<style>/;
if (tailwindPattern.test(html)) {
  html = html.replace(tailwindPattern, '<script src="https://cdn.tailwindcss.com"></script>\n  <style>');
  console.log('Fixed Tailwind script in <head>');
} else {
  console.log('Tailwind script pattern not matched, checking manual replace');
}

// 2. Remove any orphaned modal and trailing tags at the bottom
const modalIdx = html.indexOf('<!-- OWNER PROFILE & SHOP LOGO MODAL');
if (modalIdx !== -1) {
  html = html.slice(0, modalIdx).trim();
}

// Make sure </script> is intact
if (!html.includes('</script>')) {
  console.error('Missing </script>');
}

// 3. Remove any previous broken function insertions before </script>
const scriptContent = `
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
      const nameInput = document.getElementById('modalShopNameInput');
      if (nameInput) nameInput.value = currentShop.name || '';

      const slugEl = document.getElementById('modalShopSlug');
      if (slugEl) slugEl.textContent = '/shop/' + currentShop.slug;
      
      const currentLogo = currentShop.logoUrl || '';
      updateOwnerLogoDisplays(currentLogo);

      const urlInput = document.getElementById('modalLogoUrlInput');
      if (urlInput) urlInput.value = (currentLogo.startsWith('http') && !currentLogo.startsWith('data:')) ? currentLogo : '';
      
      const modal = document.getElementById('ownerProfileModal');
      if (modal) modal.classList.remove('hidden');
    }

    function closeOwnerProfileModal() {
      const modal = document.getElementById('ownerProfileModal');
      if (modal) modal.classList.add('hidden');
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

    async function saveShopProfileAndLogo() {
      const btn = document.getElementById('saveShopProfileBtn');
      const origText = btn.textContent;
      const newName = (document.getElementById('modalShopNameInput').value || '').trim();
      if (!newName) {
        alert('Please enter a shop name.');
        return;
      }

      btn.textContent = 'Saving to Supabase...';
      btn.disabled = true;

      try {
        const queryParam = activeShopSlug ? '?shop=' + encodeURIComponent(activeShopSlug) : '';
        const res = await fetch('/api/owner/settings' + queryParam, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({ 
            name: newName,
            logoUrl: currentSelectedLogo 
          })
        });
        const data = await res.json();
        if (data.success) {
          if (currentShop) {
            currentShop.name = newName;
            currentShop.logoUrl = currentSelectedLogo;
          }
          if (document.getElementById('headerShopName')) document.getElementById('headerShopName').textContent = newName;
          if (document.getElementById('topOwnerName')) document.getElementById('topOwnerName').textContent = newName;
          if (document.getElementById('welcomeGreeting')) document.getElementById('welcomeGreeting').textContent = 'Welcome back, ' + newName + '!';
          
          updateOwnerLogoDisplays(currentSelectedLogo);
          closeOwnerProfileModal();

          const alertBox = document.getElementById('settingsAlert');
          if (alertBox) {
            alertBox.className = 'rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 p-3.5 text-xs font-semibold text-center shadow-sm';
            alertBox.textContent = '✓ Shop profile & logo saved to Supabase and synced live across customer passes!';
            alertBox.classList.remove('hidden');
            setTimeout(() => alertBox.classList.add('hidden'), 5000);
          }
        } else {
          alert(data.message || 'Failed to save shop profile.');
        }
      } catch (err) {
        console.error(err);
        alert('Network error while saving to Supabase.');
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
    // LIVE NOTIFICATIONS DROPDOWN & REAL-TIME CUSTOMER JOINS
    // -------------------------------------------------------------
    let allNotifications = [];

    function toggleNotifications(e) {
      if (e) e.stopPropagation();
      const dd = document.getElementById('notifDropdown');
      if (dd) {
        dd.classList.toggle('hidden');
      }
    }

    document.addEventListener('click', (e) => {
      const dd = document.getElementById('notifDropdown');
      const bell = document.getElementById('notifBellBtn');
      if (dd && !dd.classList.contains('hidden')) {
        if (!dd.contains(e.target) && !bell.contains(e.target)) {
          dd.classList.add('hidden');
        }
      }
    });

    function updateNotificationsList(recentActivity, customers) {
      const notifList = document.getElementById('notifList');
      const badge = document.getElementById('notifBadge');
      const unreadPill = document.getElementById('notifUnreadCountPill');

      const acts = recentActivity || [];
      const custs = customers || [];

      // Combine both sources: Customer Joins + Recent Activity
      const combined = [];

      // 1. Customer Registration / Joins
      custs.forEach(c => {
        const time = c.created_at || c.createdAt || c.last_stamp_at || c.lastStampAt || Date.now();
        combined.push({
          id: 'join_' + c.phone,
          type: 'CUSTOMER_JOINED',
          name: c.name || 'Member',
          phone: c.phone,
          timestamp: new Date(time).getTime(),
          timeStr: formatRelativeTime(new Date(time).getTime()),
          stamps: c.stamps || 0
        });
      });

      // 2. Action History (Stamps + Rewards)
      acts.forEach((a, idx) => {
        const time = a.created_at || a.timestamp || Date.now();
        const actionType = a.action_type || a.actionType;
        combined.push({
          id: 'act_' + (a.id || idx + '_' + time),
          type: actionType,
          name: a.customer_name || a.customerName || a.phone || 'Customer',
          phone: a.phone || '',
          timestamp: new Date(time).getTime(),
          timeStr: formatRelativeTime(new Date(time).getTime()),
          stamps: a.stampsAtPoint || 1
        });
      });

      // Sort newest first
      combined.sort((a, b) => b.timestamp - a.timestamp);

      // Deduplicate
      const unique = [];
      const seenIds = new Set();
      for (const item of combined) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          unique.push(item);
        }
      }

      allNotifications = unique.slice(0, 20);

      // Count unread
      let unreadCount = 0;
      allNotifications.forEach(n => {
        if (!seenActivityTimestamps.has(n.id)) unreadCount++;
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
        if (allNotifications.length === 0) {
          notifList.innerHTML = '<div class="py-8 text-center text-xs text-gray-400">No customers or activity yet. Customers will appear here as they register!</div>';
          return;
        }

        notifList.innerHTML = allNotifications.map(n => {
          const isUnread = !seenActivityTimestamps.has(n.id);
          let icon = '👤';
          let iconBg = 'bg-blue-100 text-blue-800';
          let title = escapeHtml(n.name) + ' joined the loyalty program';
          let sub = 'Registered pass (' + escapeHtml(n.phone) + ')';

          if (n.type === 'REWARD_REDEEMED') {
            icon = '🎁';
            iconBg = 'bg-purple-100 text-purple-700';
            title = escapeHtml(n.name) + ' redeemed a reward!';
            sub = 'Completed loyalty card goal';
          } else if (n.type === 'STAMP_ADDED') {
            icon = '★';
            iconBg = 'bg-amber-100 text-amber-800';
            title = escapeHtml(n.name) + ' collected a stamp';
            sub = n.stamps + ' stamps currently held';
          }

          return \`
            <div class="p-2.5 rounded-xl flex items-center justify-between gap-3 \${isUnread ? 'bg-amber-50/70 border border-amber-200/60' : 'hover:bg-gray-50'} transition-colors">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="w-8 h-8 rounded-full \${iconBg} flex items-center justify-center text-xs font-bold shrink-0">
                  \${icon}
                </span>
                <div class="min-w-0 flex-1">
                  <div class="font-bold text-xs text-gray-900 truncate">\${title}</div>
                  <div class="text-[11px] text-gray-500 truncate">\${sub}</div>
                </div>
              </div>
              <div class="text-right shrink-0">
                <span class="text-[10px] font-mono text-gray-400 block whitespace-nowrap">\${n.timeStr}</span>
                \${isUnread ? '<span class="inline-block w-2 h-2 rounded-full bg-amber-500 mt-1"></span>' : ''}
              </div>
            </div>
          \`;
        }).join('');
      }
    }

    function formatRelativeTime(ts) {
      if (!ts) return '';
      const diff = Math.floor((Date.now() - ts) / 1000);
      if (diff < 60) return 'Just now';
      if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
      if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
      return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    function markAllNotificationsRead() {
      allNotifications.forEach(n => {
        seenActivityTimestamps.add(n.id);
      });
      localStorage.setItem('seen_activity_timestamps', JSON.stringify(Array.from(seenActivityTimestamps).slice(-100)));
      updateNotificationsList([], cachedCustomers);
    }
`;

// Insert the functions right before </script> at the bottom
const lastScriptEnd = html.lastIndexOf('</script>');
html = html.slice(0, lastScriptEnd) + scriptContent + '\n  </script>';

// Modal HTML
const modalHtml = `
  <!-- ======================================================== -->
  <!-- OWNER PROFILE & SHOP LOGO MODAL                          -->
  <!-- ======================================================== -->
  <div id="ownerProfileModal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
    <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-5 animate-in fade-in duration-150">
      
      <div class="flex items-center justify-between border-b pb-3">
        <div class="flex items-center gap-2">
          <span class="w-8 h-8 rounded-lg bg-[#fdf6e9] text-[#cb8926] flex items-center justify-center font-bold text-sm">🏪</span>
          <h3 class="text-sm font-extrabold text-gray-900">Edit Shop Profile & Logo</h3>
        </div>
        <button type="button" onclick="closeOwnerProfileModal()" class="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">&times;</button>
      </div>

      <!-- Editable Shop Name Field -->
      <div class="space-y-1.5">
        <label for="modalShopNameInput" class="block text-xs font-bold text-gray-700 uppercase tracking-wider">
          Shop / Outlet Name
        </label>
        <input type="text" id="modalShopNameInput" required
          placeholder="e.g. Sunrise Café"
          class="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500">
        <div class="flex items-center justify-between text-[11px] text-gray-500 pt-0.5">
          <span>Counter Kiosk Link:</span>
          <span id="modalShopSlug" class="font-mono text-amber-600 font-bold">/shop/...</span>
        </div>
      </div>

      <!-- Logo Preview & Customization -->
      <div class="space-y-3 pt-1 border-t border-gray-100">
        <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider">
          Shop Logo / Avatar
        </label>
        
        <div class="flex items-center gap-3.5">
          <div id="modalLogoPreview" class="w-16 h-16 rounded-2xl bg-[#111113] border-2 border-amber-500 text-amber-500 flex items-center justify-center text-2xl font-bold shadow-md overflow-hidden shrink-0">
            ☕
          </div>
          <div class="text-xs text-gray-500 space-y-1 min-w-0">
            <p class="font-semibold text-gray-800 leading-tight">Shown on Customer Loyalty Cards & Counter QR.</p>
            <p class="text-[11px] text-gray-400">Choose an icon preset or upload an image file.</p>
          </div>
        </div>

        <!-- Quick Preset Emojis -->
        <div class="space-y-1.5">
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
        <div class="space-y-1.5 pt-1">
          <label class="text-[11px] font-bold text-gray-500 block">Upload Logo Image (PNG, JPG, SVG):</label>
          <input type="file" id="modalLogoFileInput" accept="image/*" onchange="handleLogoFileSelect(event)"
            class="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#fdf6e9] file:text-[#cb8926] hover:file:bg-[#faecd6] cursor-pointer">
        </div>

        <!-- Or Direct Image URL -->
        <div class="space-y-1">
          <input type="url" id="modalLogoUrlInput" placeholder="Or paste image URL (https://...)" oninput="handleLogoUrlInput(this.value)"
            class="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500">
        </div>
      </div>

      <div class="flex items-center justify-end gap-2.5 pt-3 border-t">
        <button type="button" onclick="closeOwnerProfileModal()" class="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100">
          Cancel
        </button>
        <button type="button" id="saveShopProfileBtn" onclick="saveShopProfileAndLogo()" class="btn-gold px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm">
          Save Changes &rarr;
        </button>
      </div>

    </div>
  </div>
</body>
</html>
`;

html = html + '\n' + modalHtml;

fs.writeFileSync(dashPath, html, 'utf8');
console.log('Successfully repaired public/owner/dashboard.html');
