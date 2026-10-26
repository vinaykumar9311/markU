const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '../server.js');
let code = fs.readFileSync(serverFile, 'utf8');

// 1. In /api/owner/dashboard (Supabase branch)
code = code.replace(
  "const googleReviewUrl = activeShop.google_review_url || activeShop.googleReviewUrl || localShop.googleReviewUrl || '';\n      const instagramUrl = activeShop.instagram_url || activeShop.instagramUrl || localShop.instagramUrl || '';",
  "const googleReviewUrl = activeShop.google_review_url || activeShop.googleReviewUrl || localShop.googleReviewUrl || '';\n      const instagramUrl = activeShop.instagram_url || activeShop.instagramUrl || localShop.instagramUrl || '';\n      const logoUrl = activeShop.logo_url || activeShop.logoUrl || localShop.logoUrl || '';"
);

code = code.replace(
  "googleReviewUrl: s.google_review_url || s.googleReviewUrl || loc.googleReviewUrl || '',\n          instagramUrl: s.instagram_url || s.instagramUrl || loc.instagramUrl || ''",
  "googleReviewUrl: s.google_review_url || s.googleReviewUrl || loc.googleReviewUrl || '',\n          instagramUrl: s.instagram_url || s.instagramUrl || loc.instagramUrl || '',\n          logoUrl: s.logo_url || s.logoUrl || loc.logoUrl || ''"
);

code = code.replace(
  "googleReviewUrl,\n          instagramUrl\n        },",
  "googleReviewUrl,\n          instagramUrl,\n          logoUrl\n        },"
);

// 2. In /api/owner/dashboard (Local fallback branch)
code = code.replace(
  "googleReviewUrl: activeShop.googleReviewUrl || '',\n      instagramUrl: activeShop.instagramUrl || ''\n    },",
  "googleReviewUrl: activeShop.googleReviewUrl || '',\n      instagramUrl: activeShop.instagramUrl || '',\n      logoUrl: activeShop.logoUrl || ''\n    },"
);

code = code.replace(
  "googleReviewUrl: s.googleReviewUrl || '',\n      instagramUrl: s.instagramUrl || ''\n    })),",
  "googleReviewUrl: s.googleReviewUrl || '',\n      instagramUrl: s.instagramUrl || '',\n      logoUrl: s.logoUrl || ''\n    })),"
);

// 3. In handleUpdateSettings
code = code.replace(
  "const { shopSlug, shopId, rewardDescription, stampsTarget, cooldownHours, googleReviewUrl, instagramUrl } = req.body;",
  "const { shopSlug, shopId, rewardDescription, stampsTarget, cooldownHours, googleReviewUrl, instagramUrl, logoUrl } = req.body;\n  const cleanLogoUrl = typeof logoUrl === 'string' ? logoUrl.trim() : undefined;"
);

code = code.replace(
  "const finalInstaUrl = cleanInstagramUrl !== undefined ? cleanInstagramUrl : (shop.instagram_url || '');",
  "const finalInstaUrl = cleanInstagramUrl !== undefined ? cleanInstagramUrl : (shop.instagram_url || '');\n      const finalLogoUrl = cleanLogoUrl !== undefined ? cleanLogoUrl : (shop.logo_url || shop.logoUrl || (loadLocalDb().shops[shop.slug] && loadLocalDb().shops[shop.slug].logoUrl) || '');"
);

code = code.replace(
  `        await supabase
          .from('shops')
          .update({
            ...updateData,
            google_review_url: finalReviewUrl,
            instagram_url: finalInstaUrl
          })
          .eq('id', shop.id);`,
  `        try {
          await supabase
            .from('shops')
            .update({
              ...updateData,
              google_review_url: finalReviewUrl,
              instagram_url: finalInstaUrl,
              logo_url: finalLogoUrl
            })
            .eq('id', shop.id);
        } catch (lErr) {
          await supabase
            .from('shops')
            .update({
              ...updateData,
              google_review_url: finalReviewUrl,
              instagram_url: finalInstaUrl
            })
            .eq('id', shop.id);
        }`
);

code = code.replace(
  "db.shops[shop.slug].googleReviewUrl = finalReviewUrl;\n        db.shops[shop.slug].instagramUrl = finalInstaUrl;\n        saveLocalDb(db);",
  "db.shops[shop.slug].googleReviewUrl = finalReviewUrl;\n        db.shops[shop.slug].instagramUrl = finalInstaUrl;\n        if (finalLogoUrl !== undefined) db.shops[shop.slug].logoUrl = finalLogoUrl;\n        saveLocalDb(db);"
);

code = code.replace(
  "googleReviewUrl: finalReviewUrl,\n          instagramUrl: finalInstaUrl\n        }\n      });",
  "googleReviewUrl: finalReviewUrl,\n          instagramUrl: finalInstaUrl,\n          logoUrl: finalLogoUrl\n        }\n      });"
);

// In handleUpdateSettings local fallback
code = code.replace(
  "shop.rewardDescription = cleanReward;\n  shop.stampsTarget = targetNum;",
  "shop.rewardDescription = cleanReward !== undefined ? cleanReward : shop.rewardDescription;\n  shop.stampsTarget = targetNum !== undefined ? targetNum : shop.stampsTarget;\n  if (cleanLogoUrl !== undefined) shop.logoUrl = cleanLogoUrl;"
);

code = code.replace(
  "googleReviewUrl: cleanReviewUrl,\n      instagramUrl: cleanInstagramUrl\n    }\n  });",
  "googleReviewUrl: cleanReviewUrl !== undefined ? cleanReviewUrl : (shop.googleReviewUrl || ''),\n      instagramUrl: cleanInstagramUrl !== undefined ? cleanInstagramUrl : (shop.instagramUrl || ''),\n      logoUrl: shop.logoUrl || ''\n    }\n  });"
);

// 4. In /api/shop/:slug/info
code = code.replace(
  "const googleReviewUrl = shop?.google_review_url || shop?.googleReviewUrl || localShop.googleReviewUrl || '';\n  const instagramUrl = shop?.instagram_url || shop?.instagramUrl || localShop.instagramUrl || '';",
  "const googleReviewUrl = shop?.google_review_url || shop?.googleReviewUrl || localShop.googleReviewUrl || '';\n  const instagramUrl = shop?.instagram_url || shop?.instagramUrl || localShop.instagramUrl || '';\n  const logoUrl = shop?.logo_url || shop?.logoUrl || localShop.logoUrl || '';"
);

code = code.replace(
  "googleReviewUrl,\n      instagramUrl\n    }\n  });\n});",
  "googleReviewUrl,\n      instagramUrl,\n      logoUrl\n    }\n  });\n});"
);

// 5. In /api/shop/:slug/live-qr
code = code.replace(
  "googleReviewUrl: shop.google_review_url || shop.googleReviewUrl || '',\n        instagramUrl: shop.instagram_url || shop.instagramUrl || ''\n      },",
  "googleReviewUrl: shop.google_review_url || shop.googleReviewUrl || '',\n        instagramUrl: shop.instagram_url || shop.instagramUrl || '',\n        logoUrl: shop.logo_url || shop.logoUrl || (loadLocalDb().shops[slug] && loadLocalDb().shops[slug].logoUrl) || ''\n      },"
);

// 6. In /api/customer/:shopSlug/:phone
code = code.replace(
  "const googleReviewUrl = shop?.google_review_url || shop?.googleReviewUrl || localShop.googleReviewUrl || '';\n  const instagramUrl = shop?.instagram_url || shop?.instagramUrl || localShop.instagramUrl || '';",
  "const googleReviewUrl = shop?.google_review_url || shop?.googleReviewUrl || localShop.googleReviewUrl || '';\n  const instagramUrl = shop?.instagram_url || shop?.instagramUrl || localShop.instagramUrl || '';\n  const logoUrl = shop?.logo_url || shop?.logoUrl || localShop.logoUrl || '';"
);

code = code.replace(
  "googleReviewUrl,\n      instagramUrl\n    },\n    card: {",
  "googleReviewUrl,\n      instagramUrl,\n      logoUrl\n    },\n    card: {"
);

fs.writeFileSync(serverFile, code, 'utf8');
console.log('server.js successfully patched for logoUrl support');
