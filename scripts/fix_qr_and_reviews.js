const fs = require('fs');

// 1. Update tunnel_url.txt with the active public cloudflared tunnel
const activeTunnelUrl = 'https://chapel-sofa-watches-documentary.trycloudflare.com';
fs.writeFileSync('tunnel_url.txt', activeTunnelUrl, 'utf8');
console.log('tunnel_url.txt updated to:', activeTunnelUrl);

// 2. Fix server.js handleUpdateSettings to allow independent field updates (reviews, cooldown, reward)
let server = fs.readFileSync('server.js', 'utf8');

const oldSettingsValidation = `  const { shopSlug, shopId, rewardDescription, stampsTarget, cooldownHours, googleReviewUrl, instagramUrl } = req.body;
  const targetNum = parseInt(stampsTarget, 10);

  if (isNaN(targetNum) || targetNum < 2 || targetNum > 50) {
    return res.status(400).json({ success: false, message: 'Stamps required must be a valid number between 2 and 50.' });
  }

  const cleanReward = (rewardDescription || '').trim();
  if (!cleanReward) {
    return res.status(400).json({ success: false, message: 'Reward description cannot be empty.' });
  }

  const cleanReviewUrl = typeof googleReviewUrl === 'string' ? googleReviewUrl.trim() : '';
  const cleanInstagramUrl = typeof instagramUrl === 'string' ? instagramUrl.trim() : '';

  let parsedCooldown = 7;
  if (cooldownHours !== undefined && cooldownHours !== null && cooldownHours !== '') {
    const cd = parseFloat(cooldownHours);
    if (!isNaN(cd) && cd >= 0 && cd <= 720) {
      parsedCooldown = cd;
    }
  }`;

const newSettingsValidation = `  const { shopSlug, shopId, rewardDescription, stampsTarget, cooldownHours, googleReviewUrl, instagramUrl } = req.body;

  let targetNum = undefined;
  if (stampsTarget !== undefined && stampsTarget !== null && stampsTarget !== '') {
    const parsed = parseInt(stampsTarget, 10);
    if (isNaN(parsed) || parsed < 2 || parsed > 50) {
      return res.status(400).json({ success: false, message: 'Stamps required must be a valid number between 2 and 50.' });
    }
    targetNum = parsed;
  }

  let cleanReward = undefined;
  if (rewardDescription !== undefined && rewardDescription !== null) {
    const trimmed = String(rewardDescription).trim();
    if (trimmed) cleanReward = trimmed;
  }

  const cleanReviewUrl = typeof googleReviewUrl === 'string' ? googleReviewUrl.trim() : undefined;
  const cleanInstagramUrl = typeof instagramUrl === 'string' ? instagramUrl.trim() : undefined;

  let parsedCooldown = undefined;
  if (cooldownHours !== undefined && cooldownHours !== null && cooldownHours !== '') {
    const cd = parseFloat(cooldownHours);
    if (!isNaN(cd) && cd >= 0 && cd <= 720) {
      parsedCooldown = cd;
    }
  }`;

server = server.replace(oldSettingsValidation, newSettingsValidation);

// Update how updateData is constructed in handleUpdateSettings
const oldUpdateData = `      const updateData = {
        reward_description: cleanReward,
        stamps_target: targetNum,
        cooldown_hours: parsedCooldown,
        updated_at: new Date().toISOString()
      };`;

const newUpdateData = `      const finalReward = cleanReward !== undefined ? cleanReward : (shop.reward_description || '1 Free Item');
      const finalTarget = targetNum !== undefined ? targetNum : (shop.stamps_target || 10);
      const finalCooldown = parsedCooldown !== undefined ? parsedCooldown : (shop.cooldown_hours !== undefined ? shop.cooldown_hours : 7);
      const finalReviewUrl = cleanReviewUrl !== undefined ? cleanReviewUrl : (shop.google_review_url || '');
      const finalInstaUrl = cleanInstagramUrl !== undefined ? cleanInstagramUrl : (shop.instagram_url || '');

      const updateData = {
        reward_description: finalReward,
        stamps_target: finalTarget,
        cooldown_hours: finalCooldown,
        updated_at: new Date().toISOString()
      };`;

server = server.replace(oldUpdateData, newUpdateData);

// Update the Supabase update call
const oldSupabaseUpdate = `      try {
        await supabase
          .from('shops')
          .update({
            ...updateData,
            google_review_url: cleanReviewUrl,
            instagram_url: cleanInstagramUrl
          })
          .eq('id', shop.id);
      } catch (colErr) {
        // Fallback if columns not yet added to remote table
        await supabase.from('shops').update(updateData).eq('id', shop.id);
      }

      // Sync local cache
      const db = loadLocalDb();
      if (db.shops[shop.slug]) {
        db.shops[shop.slug].rewardDescription = cleanReward;
        db.shops[shop.slug].stampsTarget = targetNum;
        db.shops[shop.slug].cooldownHours = parsedCooldown;
        db.shops[shop.slug].googleReviewUrl = cleanReviewUrl;
        db.shops[shop.slug].instagramUrl = cleanInstagramUrl;
        saveLocalDb(db);
      }

      return res.json({
        success: true,
        message: 'Settings updated successfully!',
        shop: {
          id: shop.id,
          name: shop.name,
          slug: shop.slug,
          rewardDescription: cleanReward,
          stampsTarget: targetNum,
          cooldownHours: parsedCooldown,
          googleReviewUrl: cleanReviewUrl,
          instagramUrl: cleanInstagramUrl
        }
      });`;

const newSupabaseUpdate = `      try {
        await supabase
          .from('shops')
          .update({
            ...updateData,
            google_review_url: finalReviewUrl,
            instagram_url: finalInstaUrl
          })
          .eq('id', shop.id);
      } catch (colErr) {
        await supabase.from('shops').update(updateData).eq('id', shop.id);
      }

      // Sync local cache
      const db = loadLocalDb();
      if (db.shops[shop.slug]) {
        db.shops[shop.slug].rewardDescription = finalReward;
        db.shops[shop.slug].stampsTarget = finalTarget;
        db.shops[shop.slug].cooldownHours = finalCooldown;
        db.shops[shop.slug].googleReviewUrl = finalReviewUrl;
        db.shops[shop.slug].instagramUrl = finalInstaUrl;
        saveLocalDb(db);
      }

      return res.json({
        success: true,
        message: 'Settings updated successfully!',
        shop: {
          id: shop.id,
          name: shop.name,
          slug: shop.slug,
          rewardDescription: finalReward,
          stampsTarget: finalTarget,
          cooldownHours: finalCooldown,
          googleReviewUrl: finalReviewUrl,
          instagramUrl: finalInstaUrl
        }
      });`;

server = server.replace(oldSupabaseUpdate, newSupabaseUpdate);

fs.writeFileSync('server.js', server, 'utf8');
console.log('server.js handleUpdateSettings fixed');

// 3. Fix public/card.html so reviews always show their links and QR scanner works flawlessly
let card = fs.readFileSync('public/card.html', 'utf8');

// Update review link handling in renderCard
const oldSocialLogic = `      // Handle Google Review and Instagram Link Visibility
      const googleBtn = document.getElementById('cardGoogleReviewBtn');
      const instaBtn = document.getElementById('cardInstagramBtn');
      const socialBox = document.getElementById('socialLinksBox');

      let hasSocial = false;
      if (shop?.googleReviewUrl && shop.googleReviewUrl.trim()) {
        googleBtn.href = shop.googleReviewUrl.trim();
        googleBtn.classList.remove('hidden');
        googleBtn.classList.add('flex');
        hasSocial = true;
      } else {
        googleBtn.classList.add('hidden');
        googleBtn.classList.remove('flex');
      }

      if (shop?.instagramUrl && shop.instagramUrl.trim()) {
        let insta = shop.instagramUrl.trim();
        if (insta.startsWith('@')) insta = 'https://instagram.com/' + insta.slice(1);
        else if (!insta.startsWith('http')) insta = 'https://instagram.com/' + insta;
        instaBtn.href = insta;
        instaBtn.classList.remove('hidden');
        instaBtn.classList.add('flex');
        hasSocial = true;
      } else {
        instaBtn.classList.add('hidden');
        instaBtn.classList.remove('flex');
      }

      if (hasSocial) {
        socialBox.classList.remove('hidden');
      } else {
        socialBox.classList.add('hidden');
      }`;

const newSocialLogic = `      // Handle Google Review and Instagram Link Visibility (Always show with smart defaults)
      const googleBtn = document.getElementById('cardGoogleReviewBtn');
      const instaBtn = document.getElementById('cardInstagramBtn');
      const socialBox = document.getElementById('socialLinksBox');

      const shopName = shop?.name || 'Local Store';
      const cleanSlug = shop?.slug || shopSlug;

      // Google Review Link: Custom URL or direct Google Maps search for reviews
      let googleUrl = (shop?.googleReviewUrl && shop.googleReviewUrl.trim()) 
        ? shop.googleReviewUrl.trim() 
        : \`https://www.google.com/maps/search/?api=1&query=\${encodeURIComponent(shopName + ' reviews')}\`;

      // Instagram Link: Custom URL or Instagram search
      let instaUrl = (shop?.instagramUrl && shop.instagramUrl.trim()) ? shop.instagramUrl.trim() : '';
      if (!instaUrl) {
        instaUrl = \`https://www.instagram.com/explore/tags/\${encodeURIComponent(cleanSlug.replace(/[^a-z0-9]/gi, ''))}\`;
      } else {
        if (instaUrl.startsWith('@')) instaUrl = 'https://instagram.com/' + instaUrl.slice(1);
        else if (!instaUrl.startsWith('http')) instaUrl = 'https://instagram.com/' + instaUrl;
      }

      googleBtn.href = googleUrl;
      googleBtn.classList.remove('hidden');
      googleBtn.classList.add('flex');

      instaBtn.href = instaUrl;
      instaBtn.classList.remove('hidden');
      instaBtn.classList.add('flex');

      socialBox.classList.remove('hidden');`;

card = card.replace(oldSocialLogic, newSocialLogic);

// Upgrade onScanSuccess in card.html to instantly claim stamp if already authenticated
const oldOnScanSuccess = `    function onScanSuccess(decodedText) {
      closeQrScanner();
      try {
        const text = (decodedText || '').trim();
        if (text.startsWith('http://') || text.startsWith('https://')) {
          const urlObj = new URL(text);
          const scannedShop = urlObj.searchParams.get('shop') || shopSlug;
          const scannedToken = urlObj.searchParams.get('token');
          if (scannedToken) {
            window.location.href = \`/scan.html?shop=\${encodeURIComponent(scannedShop)}&token=\${encodeURIComponent(scannedToken)}\`;
            return;
          }
          window.location.href = text;
          return;
        }

        // Check if raw token or JSON
        let tokenVal = text;
        if (text.startsWith('{')) {
          try {
            const parsed = JSON.parse(text);
            if (parsed.token) tokenVal = parsed.token;
          } catch (e) {}
        }
        window.location.href = \`/scan.html?shop=\${encodeURIComponent(shopSlug)}&token=\${encodeURIComponent(tokenVal)}\`;
      } catch (err) {
        window.location.href = \`/scan.html?shop=\${encodeURIComponent(shopSlug)}&token=\${encodeURIComponent(decodedText)}\`;
      }
    }`;

const newOnScanSuccess = `    async function onScanSuccess(decodedText) {
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

        // If authenticated on pass, claim immediately in-place
        if (savedPhone && scannedToken) {
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
              showNotice('✓ Stamp collected successfully!', true);
              if (window.confetti) confetti({ particleCount: 60, spread: 70 });
              await loadCard(scannedShop, savedPhone, data.verificationToken || savedToken);
              return;
            } else if (data.code === 'COOLDOWN_ACTIVE') {
              showNotice('Stamp already collected! Cooldown is active.', false);
              await loadCard(scannedShop, savedPhone, savedToken);
              return;
            } else if (data.code === 'QR_ALREADY_USED' || data.code === 'EXPIRED_QR') {
              showNotice('Counter QR has refreshed. Please scan the current code.', false);
              return;
            }
          } catch (err) {
            console.error('In-page claim error:', err);
          }
        }

        // Fallback to scan gateway
        window.location.href = \`/scan.html?shop=\${encodeURIComponent(scannedShop)}&token=\${encodeURIComponent(scannedToken)}\`;
      } catch (err) {
        window.location.href = \`/scan.html?shop=\${encodeURIComponent(shopSlug)}&token=\${encodeURIComponent(decodedText)}\`;
      }
    }`;

card = card.replace(oldOnScanSuccess, newOnScanSuccess);

fs.writeFileSync('public/card.html', card, 'utf8');
console.log('public/card.html reviews and QR flow upgraded');
