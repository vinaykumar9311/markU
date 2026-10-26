const fs = require('fs');

// ==========================================
// 1. UPDATE public/card.html
// ==========================================
let card = fs.readFileSync('public/card.html', 'utf8');

// A. Remove "Switch mobile number" container completely
const switchActionRegex = /<!-- Switch Number Action -->\s*<div id="switchAction"[\s\S]*?<\/div>/m;
card = card.replace(switchActionRegex, '<!-- Switch Number Action Removed -->');

// Also safely handle any references to switchAction in JS
card = card.replace(
  "document.getElementById('switchAction').classList.add('hidden');",
  "if (document.getElementById('switchAction')) document.getElementById('switchAction').classList.add('hidden');"
);
card = card.replace(
  "document.getElementById('switchAction').classList.remove('hidden');",
  "if (document.getElementById('switchAction')) document.getElementById('switchAction').classList.remove('hidden');"
);

// B. Overwrite onScanSuccess in card.html to NEVER redirect to scan.html or show login
const oldScanSuccess = card.match(/async function onScanSuccess\(decodedText\) \{[\s\S]*?^    \}/m);
if (oldScanSuccess) {
  const newScanSuccess = `async function onScanSuccess(decodedText) {
      await closeQrScanner();
      try {
        const text = (decodedText || '').trim();
        let scannedShop = shopSlug;
        let scannedToken = text;

        if (text.startsWith('http://') || text.startsWith('https://')) {
          try {
            const urlObj = new URL(text);
            scannedShop = urlObj.searchParams.get('shop') || shopSlug;
            scannedToken = urlObj.searchParams.get('token') || '';
          } catch(e) {}
        } else if (text.startsWith('{')) {
          try {
            const parsed = JSON.parse(text);
            if (parsed.token) scannedToken = parsed.token;
            if (parsed.shop) scannedShop = parsed.shop;
          } catch (e) {}
        }

        const savedPhone = localStorage.getItem('loyalty_phone');
        const savedToken = localStorage.getItem('loyalty_token');

        if (!scannedToken) {
          showNotice('Could not read QR token. Please scan the counter code again.', false);
          return;
        }

        // Direct in-page stamp claim: NEVER show login or navigate away
        showNotice('Verifying scan at counter...', true);

        try {
          const res = await fetch('/api/claim-stamp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              shopSlug: scannedShop,
              token: scannedToken,
              phone: savedPhone,
              verificationToken: savedToken
            })
          });
          const data = await res.json();

          if (data.success) {
            if (data.verificationToken) localStorage.setItem('loyalty_token', data.verificationToken);
            showNotice(data.message || '✓ Stamp collected successfully!', true);
            if (window.confetti) confetti({ particleCount: 60, spread: 70 });
            await loadCard(scannedShop, savedPhone, data.verificationToken || savedToken);
          } else if (data.code === 'COOLDOWN_ACTIVE') {
            showNotice(data.message || 'Stamp already collected today! Cooldown is active.', false);
            await loadCard(scannedShop, savedPhone, savedToken);
          } else if (data.code === 'QR_ALREADY_USED') {
            showNotice('This QR code was already scanned. Please scan the current counter code.', false);
          } else if (data.code === 'EXPIRED_QR') {
            showNotice('Counter QR has refreshed. Please scan the current code on screen.', false);
          } else {
            showNotice(data.message || 'Could not claim stamp. Please scan the active counter QR.', false);
          }
        } catch (claimErr) {
          console.error('Claim error:', claimErr);
          showNotice('Network error. Please try scanning again.', false);
        }
      } catch (err) {
        console.error('QR parsing error:', err);
        showNotice('Invalid QR code scanned. Please aim at the shop counter screen.', false);
      }
    }`;
  card = card.replace(oldScanSuccess[0], newScanSuccess);
}

fs.writeFileSync('public/card.html', card, 'utf8');
console.log('public/card.html updated');

// ==========================================
// 2. UPDATE public/scan.html
// ==========================================
let scan = fs.readFileSync('public/scan.html', 'utf8');

// Auto-execute quick claim when user is already logged in on this phone
scan = scan.replace(
  `      if (savedPhone && savedToken) {
        document.getElementById('registerBox').classList.add('hidden');
        document.getElementById('quickCheckInBox').classList.remove('hidden');
        document.getElementById('quickPhoneLabel').textContent = savedPhone;
        targetPhone = savedPhone;
      }`,
  `      if (savedPhone && savedToken) {
        document.getElementById('registerBox').classList.add('hidden');
        document.getElementById('quickCheckInBox').classList.remove('hidden');
        document.getElementById('quickPhoneLabel').textContent = savedPhone;
        targetPhone = savedPhone;
        // Auto-claim immediately without extra button taps
        executeQuickClaim();
      }`
);

fs.writeFileSync('public/scan.html', scan, 'utf8');
console.log('public/scan.html updated');
