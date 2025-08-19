import * as Callbacks from '../../services/helpers/contentScript';

// Create unique instance ID for this content script
window.contentScriptId = `script-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

console.log('🔧 Amazon Product Hunter Content Script Loaded!');
console.log('🔧 Content script instance ID:', window.contentScriptId);
console.log('Current URL:', window.location.href);
console.log('Available callbacks:', Object.keys(Callbacks));

// Attempt resume if previous page initiated No-Limit scraping
try { maybeResumeNoLimit(); } catch (_) {}

// ========================= No-Limit Resume Helpers =========================
const NL_PRODUCTS_KEY = 'amazon-no-limit-products';
const NL_CONTINUE_KEY = 'amazon-no-limit-continue';
const NL_MAX_KEY = 'amazon-no-limit-max';
const NL_PAGE_COUNT_KEY = 'amazon-no-limit-pages';
const NO_LIMIT_PAGE_CAP = 20;

function getNoLimitProducts() {
  try {
    const raw = localStorage.getItem(NL_PRODUCTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

function setNoLimitProducts(products) {
  try {
    localStorage.setItem(NL_PRODUCTS_KEY, JSON.stringify(products || []));
  } catch (_) {}
}

function clearNoLimitState() {
  try {
    localStorage.removeItem(NL_PRODUCTS_KEY);
    localStorage.removeItem(NL_CONTINUE_KEY);
    localStorage.removeItem(NL_MAX_KEY);
    localStorage.removeItem(NL_PAGE_COUNT_KEY);
  } catch (_) {}
}

// Auto-resume in No-Limit mode after navigation between pages
async function maybeResumeNoLimit() {
  try {
    const shouldContinue = localStorage.getItem(NL_CONTINUE_KEY) === 'true';
    const maxStr = localStorage.getItem(NL_MAX_KEY);
    const max = parseInt(maxStr || '1000000', 10);
    if (!shouldContinue || window.isScrapingInProgress) return;

    console.log('🔁 Resuming No-Limit scraping on new page...');
    window.scrapeNoWait = true;
    try { localStorage.setItem(NL_CONTINUE_KEY, 'false'); } catch (_) {}
    // Construct onProgress callback (same as in onMessage handler)
    const onProgress = (progressData) => {
      try {
        chrome.runtime.sendMessage({
          callback: 'updateScrapingProgress',
          payload: {
            ...progressData
          }
        });
      } catch (e) {
        console.log('Progress send failed (resume), will continue:', e?.message);
      }
    };
    // Wait a bit to ensure the page has results
    setTimeout(() => {
      window.scrapeAmazonProducts(max, onProgress).catch(err => console.log('Resume scrape error:', err));
    }, 1200);
  } catch (e) {
    console.log('No-Limit resume check failed:', e?.message);
  }
}

// Enhanced Amazon Product Scraper with Multi-page Support
window.scrapeAmazonProducts = async function(maxProducts, onProgress) {
    console.log('🚀 scrapeAmazonProducts called with:', { maxProducts, hasOnProgress: !!onProgress });
    
    if (!maxProducts || maxProducts <= 0) {
        console.log('❌ Please specify a valid number of products to scrape');
        return [];
    }
    
    // Prevent multiple simultaneous scraping operations
    if (window.isScrapingInProgress) {
        console.log('❌ Scraping already in progress, please wait...');
        return [];
    }
    
    window.isScrapingInProgress = true;
    console.log(`🔍 Starting to scrape ${maxProducts} products with multi-page support...`);
    
    try {
        const products = [];
        const seenAsins = new Set(); // Track ASINs to prevent duplicates
        let currentPage = 1;
        let scrapedFromCurrentPage = 0;
        // Initialize page counter for No-Limit mode
        if (window.scrapeNoWait) {
            try {
                const existing = parseInt(localStorage.getItem(NL_PAGE_COUNT_KEY) || '1', 10);
                if (!existing || existing < 1) {
                    localStorage.setItem(NL_PAGE_COUNT_KEY, '1');
                }
            } catch (_) {}
        }
        
        // Send initial progress - status only, no products
        if (onProgress) {
            let percent = 0;
            if (window.scrapeNoWait) {
                try {
                    const pc = parseInt(localStorage.getItem(NL_PAGE_COUNT_KEY) || '1', 10);
                    percent = Math.min(Math.floor(((pc - 1) / NO_LIMIT_PAGE_CAP) * 100), 99);
                } catch (_) { percent = 0; }
            } else {
                percent = Math.min((products.length / maxProducts) * 100, 100);
            }
            onProgress({
                current: products.length,
                total: maxProducts,
                percent: Number(percent.toFixed(2)),
                status: 'Starting to scrape products...',
                products: [], // Empty products array for initial status
                isComplete: false
            });
        }
    
    while (products.length < maxProducts) {
        console.log(`\n📄 Scraping page ${currentPage}...`);
        
        // Update progress status only - no products sent to UI yet
        if (onProgress) {
            let percent;
            if (window.scrapeNoWait) {
                try {
                    const pc = parseInt(localStorage.getItem(NL_PAGE_COUNT_KEY) || String(currentPage), 10);
                    percent = Math.min(Math.floor(((pc - 1) / NO_LIMIT_PAGE_CAP) * 100), 99);
                } catch (_) { percent = 0; }
            } else {
                percent = Math.min((products.length / maxProducts) * 100, 100);
            }
            onProgress({
                current: products.length,
                total: maxProducts,
                percent: Number(percent.toFixed(2)),
                status: `Scraping page ${currentPage}...`,
                products: [], // Don't send intermediate products to UI
                isComplete: false
            });
        }
        
        // Get products from current page
        const pageProducts = await window.scrapeCurrentPage(maxProducts - products.length, seenAsins);
        
        if (pageProducts.length === 0) {
            console.log(`❌ No products found on page ${currentPage}`);
            break;
        }
        
        // Add products from this page
        products.push(...pageProducts);
        // Persist running list for No-Limit background mode (survives navigation)
        if (window.scrapeNoWait) {
            const aggregated = getNoLimitProducts();
            const byAsin = new Map(aggregated.filter(p => p && p.asin).map(p => [p.asin, p]));
            for (const p of pageProducts) {
                if (p && p.asin && !byAsin.has(p.asin)) byAsin.set(p.asin, p);
            }
            setNoLimitProducts(Array.from(byAsin.values()));
        }
        scrapedFromCurrentPage = pageProducts.length;
        
        console.log(`✅ Page ${currentPage}: Found ${pageProducts.length} products (Total: ${products.length}/${maxProducts})`);
        
        // Update progress after scraping current page - status only, no products yet
        if (onProgress) {
            let currentProgress;
            if (window.scrapeNoWait) {
                try {
                    const pc = parseInt(localStorage.getItem(NL_PAGE_COUNT_KEY) || String(currentPage), 10);
                    currentProgress = Math.min(Math.floor((pc / NO_LIMIT_PAGE_CAP) * 100), 99);
                } catch (_) { currentProgress = 0; }
            } else {
                currentProgress = Math.min((products.length / maxProducts) * 100, 100);
            }
            onProgress({
                current: products.length,
                total: maxProducts,
                percent: Number(currentProgress.toFixed(2)),
                status: `Page ${currentPage} complete`,
                products: [], // Don't send intermediate products to UI
                isComplete: false
            });
        }
        
        // If we have enough products, stop
        if (products.length >= maxProducts) {
            console.log(`🎯 Target reached! Scraped ${products.length} products.`);
            break;
        }
        
        // Check if we can go to next page
        const hasNextPage = await window.hasNextPageAndNavigate();
        if (!hasNextPage) {
            console.log(`📄 No more pages available. Scraped ${products.length} products from ${currentPage} pages.`);
            break;
        }
        
        currentPage++;

        // In No-Limit mode, enforce a hard cap of 20 pages
        if (window.scrapeNoWait) {
            try {
                const pageCount = parseInt(localStorage.getItem(NL_PAGE_COUNT_KEY) || '1', 10) + 1;
                localStorage.setItem(NL_PAGE_COUNT_KEY, String(pageCount));
                if (pageCount >= NO_LIMIT_PAGE_CAP) {
                    console.log(`🛑 No-Limit page cap reached (${NO_LIMIT_PAGE_CAP}). Finalizing...`);
                    break;
                }
            } catch (_) {}
        }

        // If running in No-Wait mode, persist state and navigate, letting the next page's script resume
        if (window.scrapeNoWait) {
            try { localStorage.setItem(NL_CONTINUE_KEY, 'true'); } catch (_) {}
            if (onProgress) {
                onProgress({
                    current: products.length,
                    total: maxProducts,
                    percent: Math.min((products.length / maxProducts) * 100, 100),
                    status: `Loading page ${currentPage}...`,
                    products: [],
                    isComplete: false
                });
            }
            console.log(`⏭️ Moving to page ${currentPage} (No-Wait resume)...`);
            // Click already performed in hasNextPageAndNavigate; simply return to allow navigation
            return [];
        }

        // Normal flow: wait for next page to load and continue in the same execution context (if SPA)
        if (onProgress) {
            let percent;
            if (window.scrapeNoWait) {
                try {
                    const pc = parseInt(localStorage.getItem(NL_PAGE_COUNT_KEY) || String(currentPage), 10);
                    percent = Math.min(Math.floor((pc / NO_LIMIT_PAGE_CAP) * 100), 99);
                } catch (_) { percent = 0; }
            } else {
                percent = Math.min((products.length / maxProducts) * 100, 100);
            }
            onProgress({
                current: products.length,
                total: maxProducts,
                percent: Number(percent.toFixed(2)),
                status: `Loading page ${currentPage}...`,
                products: [], // Don't send intermediate products to UI
                isComplete: false
            });
        }
        console.log(`⏭️ Moving to page ${currentPage}...`);
        await window.waitForPageLoad();
    }
    
        console.log(`\n🎉 Multi-page scraping complete! Total products: ${products.length} from ${currentPage} pages`);
        
        // ONLY NOW send the final complete results to UI
        if (onProgress) {
            const finalProducts = window.scrapeNoWait ? getNoLimitProducts() : products;
            const pagesStr = localStorage.getItem(NL_PAGE_COUNT_KEY);
            const pages = pagesStr ? parseInt(pagesStr, 10) : currentPage;
            onProgress({
                current: finalProducts.length,
                total: maxProducts,
                percent: 100,
                status: `✅ Scraping complete! Found ${finalProducts.length} products from ${pages} pages`,
                products: [...finalProducts],
                isComplete: true
            });
            try {
                // Push completion state to background one more time to ensure UI receives it
                chrome.runtime.sendMessage({
                    callback: 'updateScrapingProgress',
                    payload: {
                        current: finalProducts.length,
                        total: maxProducts,
                        percent: 100,
                        status: `✅ Scraping complete! Found ${finalProducts.length} products from ${pages} pages`,
                        products: [...finalProducts],
                        isComplete: true
                    }
                });
            } catch (_) {}
        }
        
        if (products.length > 0) {
            // Display results summary
            console.log(`\n📊 Final Summary:`);
            console.log(`Total products: ${products.length}`);
            console.log(`Pages scraped: ${currentPage}`);
            console.log(`Products with prices: ${products.filter(p => p.price !== 'N/A').length}`);
            console.log(`Products with ratings: ${products.filter(p => p.rating !== 'N/A').length}`);
            console.log(`Prime products: ${products.filter(p => p.hasPrime).length}`);
            console.log(`Unique ASINs: ${new Set(products.map(p => p.asin).filter(asin => asin !== 'N/A')).size}`);
        }
        
        // Reset the scraping flag
        window.isScrapingInProgress = false;
        if (window.scrapeNoWait) clearNoLimitState();
        
        return products;
        
    } catch (error) {
        console.error('❌ Error during scraping:', error);
        window.isScrapingInProgress = false;
        return [];
    }
}

// Best-effort enrichment: fetch product detail page to extract rating and reviews
window.enrichRatingReviews = async function(productUrl) {
    try {
        if (!productUrl || productUrl === 'N/A') return null;
        // Normalize URL to canonical dp link when possible
        const dpMatch = productUrl.match(/\/dp\/([A-Z0-9]{10})/i) || productUrl.match(/\/gp\/product\/([A-Z0-9]{10})/i);
        let url = productUrl;
        if (dpMatch && dpMatch[1]) {
            const asin = dpMatch[1];
            const origin = location.origin || (location.protocol + '//' + location.host);
            url = `${origin}/dp/${asin}`;
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);
        const res = await fetch(url, { credentials: 'include', signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) return null;
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');

        // Rating candidates on PDP
        const ratingCandidates = [
            '#acrPopover .a-icon-alt',
            'span[data-hook="rating-out-of-text"]',
            '#averageCustomerReviews .a-icon-alt',
            '.a-icon-star .a-icon-alt'
        ];
        let rating = 'N/A';
        for (const sel of ratingCandidates) {
            const el = doc.querySelector(sel);
            if (!el) continue;
            const text = el.getAttribute('aria-label') || el.textContent || '';
            const m = text.match(/(\d+\.?\d*)\s*out\s*of/i) || text.match(/(\d+\.?\d*)\s*stars/i);
            if (m) { rating = m[1]; break; }
        }

        // Reviews count candidates on PDP
        const reviewsCandidates = [
            '#acrCustomerReviewText',
            'span[data-hook="total-review-count"]',
            '#acrCustomerReviewLink #acrCustomerReviewText'
        ];
        let reviews = 'N/A';
        for (const sel of reviewsCandidates) {
            const el = doc.querySelector(sel);
            if (!el) continue;
            const text = el.textContent || '';
            const m = text.match(/[\d,]+/);
            if (m) { reviews = m[0].replace(/,/g, ''); break; }
        }

        // Validate
        const rNum = parseFloat(rating);
        if (isNaN(rNum) || rNum < 0 || rNum > 5) rating = 'N/A';
        const rvNum = parseInt(reviews.replace(/[^\d]/g, ''));
        if (isNaN(rvNum) || rvNum < 0) reviews = 'N/A';

        if (rating === 'N/A' && reviews === 'N/A') return null;
        return { rating, reviews };
    } catch (e) {
        return null;
    }
}

// Scrape products from current page only
window.scrapeCurrentPage = async function(maxProductsNeeded, seenAsins) {
    const products = [];
    
    // Try multiple selectors for different Amazon layouts
    const selectors = [
        '[data-component-type="s-search-result"]',
        '.s-result-item[data-component-type="s-search-result"]',
        '.s-result-item',
        '[data-asin]:not([data-asin=""])',
        '.s-card-container',
        '.sg-col-inner .s-card-container',
        '[data-cy="asin-faceout-container"]',
        '[data-testid="product-card"]',
        '.puis-card-container'
    ];
    
    let productContainers = [];
    
    // Try each selector until we find products
    for (const selector of selectors) {
        productContainers = document.querySelectorAll(selector);
        console.log(`Trying selector "${selector}": found ${productContainers.length} containers`);
        if (productContainers.length > 0) break;
    }
    
    if (productContainers.length === 0) {
        console.log('❌ No product containers found on current page');
        return [];
    }
    
    console.log(`✅ Found ${productContainers.length} product containers on current page`);
    
    let detailFetches = 0;
    const maxDetailFetches = 5; // cap extra network calls per page
    for (let i = 0; i < productContainers.length && products.length < maxProductsNeeded; i++) {
        const container = productContainers[i];
        
        // Skip sponsored products
        if (window.isSponsored(container)) {
            console.log(`⏭️  Skipping sponsored product ${i + 1}`);
            continue;
        }
        
        let productData = window.extractProductData(container);
        
        // Enhanced validation - only accept products with complete data
        if (productData && 
            productData.title && productData.title !== 'N/A' && productData.title.length > 0 &&
            productData.price && productData.price !== 'N/A' &&
            productData.asin && productData.asin !== 'N/A') {
            // Try to enrich rating/reviews from PDP if missing
            if ((productData.rating === 'N/A' || productData.reviews === 'N/A') && detailFetches < maxDetailFetches) {
                const enriched = await window.enrichRatingReviews(productData.url);
                detailFetches += 1;
                if (enriched) {
                    if (productData.rating === 'N/A' && enriched.rating) productData.rating = enriched.rating;
                    if (productData.reviews === 'N/A' && enriched.reviews) productData.reviews = enriched.reviews;
                }
            }
            // Check for duplicate ASIN across all pages
            const asin = productData.asin;
            if (asin && asin !== 'N/A' && seenAsins.has(asin)) {
                console.log(`⏭️  Skipping duplicate product with ASIN: ${asin}`);
                continue;
            }
            
            // Add ASIN to seen set and add product
            if (asin && asin !== 'N/A') {
                seenAsins.add(asin);
            }
            
            // Log data quality info
            const hasRating = productData.rating && productData.rating !== 'N/A';
            const hasReviews = productData.reviews && productData.reviews !== 'N/A';
            
            if (!hasRating || !hasReviews) {
                console.log(`⚠️ Product ${products.length + 1} has missing data: ${productData.title.substring(0, 30)}... | Price: ${productData.price} | Rating: ${hasRating ? productData.rating : 'MISSING'} | Reviews: ${hasReviews ? productData.reviews : 'MISSING'} | ASIN: ${productData.asin}`);
            } else {
                console.log(`✅ Product ${products.length + 1}: ${productData.title.substring(0, 30)}... | Price: ${productData.price} | Rating: ${productData.rating} | Reviews: ${productData.reviews} | ASIN: ${productData.asin}`);
            }
            
            products.push(productData);
        } else {
            console.log(`❌ Skipping invalid product ${i + 1}: missing essential data (title, price, or ASIN)`);
        }
    }
    
    return products;
}

// Check if next page exists and navigate to it
window.hasNextPageAndNavigate = async function() {
    // Look for next page button with multiple selectors
    const nextPageSelectors = [
        'a[aria-label="Go to next page"]',
        'a[aria-label="Next"]',
        '.s-pagination-next',
        '.a-pagination-next',
        '.s-pagination-item.s-pagination-next',
        '.a-last a',
        'a[aria-label="Next page"]',
        '.s-pagination-strip .s-pagination-item:last-child a:not(.s-pagination-disabled)',
        '.a-pagination .a-last:not(.a-disabled) a'
    ];
    
    let nextButton = null;
    
    for (const selector of nextPageSelectors) {
        nextButton = document.querySelector(selector);
        if (nextButton && !nextButton.classList.contains('s-pagination-disabled') && !nextButton.classList.contains('a-disabled')) {
            console.log(`✅ Found next page button with selector: ${selector}`);
            break;
        }
    }
    
    if (!nextButton) {
        console.log('❌ No next page button found');
        return false;
    }
    
    // Check if the button is disabled
    if (nextButton.classList.contains('s-pagination-disabled') || 
        nextButton.classList.contains('a-disabled') ||
        nextButton.getAttribute('aria-disabled') === 'true') {
        console.log('❌ Next page button is disabled');
        return false;
    }
    
    // Scroll the next button into view to avoid Amazon lazy/hydration quirks
    try {
        nextButton.scrollIntoView({ behavior: 'instant', block: 'center' });
    } catch (_) {}

    // Click the next page button
    console.log('🔄 Clicking next page button...');
    try {
        // Use a more robust click path
        nextButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        return true;
    } catch (error) {
        console.error('❌ Error clicking next page button:', error);
        return false;
    }
}

// Wait for page to load after navigation
window.waitForPageLoad = async function() {
    return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 30; // 15 seconds max wait
        
        const checkPageLoad = () => {
            attempts++;
            
            // Check if page is loading
            const loadingIndicators = document.querySelectorAll('.s-spinner, .a-spinner, [data-testid="loading"]');
            const hasLoadingIndicators = loadingIndicators.length > 0;
            
            // Check if products are loaded
            const productContainers = document.querySelectorAll('[data-component-type="s-search-result"], .s-result-item');
            const hasProducts = productContainers.length > 0;
            
            // Ensure we start at page 1 if no explicit pagination param is present and the first page link exists
            // (prevents accidental landing on page 2 due to Amazon autoredirects)
            if (attempts === 2) {
                try {
                    const pageOneLink = document.querySelector('.s-pagination-item[href*="page=1"], a[href*="page=1"]');
                    const currentHasPageParam = /[?&]page=\d+/.test(window.location.search);
                    if (pageOneLink && !currentHasPageParam) {
                        const href = pageOneLink.getAttribute('href');
                        if (href) {
                            const absolute = href.startsWith('http') ? href : new URL(href, location.origin).toString();
                            console.log('↩️ Normalizing to page=1:', absolute);
                            window.location.assign(absolute);
                            return; // wait for navigation
                        }
                    }
                } catch (_) {}
            }
            
            if (!hasLoadingIndicators && hasProducts && attempts > 3) {
                console.log(`✅ Page loaded after ${attempts * 500}ms`);
                resolve();
                return;
            }
            
            if (attempts >= maxAttempts) {
                console.log(`⚠️ Max wait time reached (${maxAttempts * 500}ms), proceeding anyway`);
                resolve();
                return;
            }
            
            setTimeout(checkPageLoad, 500);
        };
        
        // Start checking after a short delay
        setTimeout(checkPageLoad, 1000);
    });
}

window.tryAlternativeMethod = function(maxProducts, onProgress) {
    console.log('🔄 Trying alternative scraping method...');
    
    const products = [];
    const seenAsins = new Set(); // Track ASINs to prevent duplicates
    
    // Look for any elements that might contain product information
    const possibleContainers = document.querySelectorAll('div[data-asin], div[data-index], .s-item-container, .s-search-result, .s-result-item, [data-cy="asin-faceout-container"], [data-testid="product-card"], .puis-card-container, .AdHolder, .s-card-container');
    
    console.log(`Found ${possibleContainers.length} possible containers`);
    
    // Send initial progress for alternative method
    if (onProgress) {
        onProgress({
            current: 0,
            total: maxProducts,
            status: 'Trying alternative scraping method...',
            products: []
        });
    }
    
    for (let i = 0; i < possibleContainers.length && products.length < maxProducts; i++) {
        const container = possibleContainers[i];
        
        if (window.isSponsored(container)) continue;
        
        const productData = window.extractProductData(container);
        if (productData && productData.title && productData.title !== 'N/A' && productData.title.length > 5) {
            // Check for duplicate ASIN
            const asin = productData.asin;
            if (asin && asin !== 'N/A' && seenAsins.has(asin)) {
                console.log(`⏭️  Alt method - Skipping duplicate product with ASIN: ${asin}`);
                continue;
            }
            
            // Add ASIN to seen set and add product
            if (asin && asin !== 'N/A') {
                seenAsins.add(asin);
            }
            
            products.push(productData);
            console.log(`✅ Alt method - Product ${products.length}: ${productData.title.substring(0, 50)}...`);
            console.log(`   ASIN: ${asin}`);
            
            // Send progress update
            if (onProgress) {
                const progressPercent = Math.min((products.length / maxProducts) * 100, 100);
                onProgress({
                    current: products.length,
                    total: maxProducts,
                    percent: progressPercent,
                    status: `Alternative method - Scraped ${products.length} of ${maxProducts} products...`,
                    products: products
                });
            }
        }
    }
    
    if (products.length === 0) {
        console.log('🔄 Trying final fallback method...');
        // Final fallback: look for any div with common Amazon product patterns
        const fallbackContainers = document.querySelectorAll('div[class*="s-result"], div[class*="product"], div[class*="item"], div[id*="result"], div[data-uuid], div[data-cel-widget]');
        console.log(`Found ${fallbackContainers.length} fallback containers`);
        
        for (let i = 0; i < fallbackContainers.length && products.length < maxProducts; i++) {
            const container = fallbackContainers[i];
            if (window.isSponsored(container)) continue;
            
            const productData = window.extractProductData(container);
            if (productData && productData.title && productData.title !== 'N/A' && productData.title.length > 5) {
                // Check for duplicate ASIN
                const asin = productData.asin;
                if (asin && asin !== 'N/A' && seenAsins.has(asin)) {
                    console.log(`⏭️  Fallback - Skipping duplicate product with ASIN: ${asin}`);
                    continue;
                }
                
                // Add ASIN to seen set and add product
                if (asin && asin !== 'N/A') {
                    seenAsins.add(asin);
                }
                
                products.push(productData);
                console.log(`✅ Fallback - Product ${products.length}: ${productData.title.substring(0, 50)}...`);
                console.log(`   ASIN: ${asin}`);
            }
        }
        
        if (products.length === 0) {
            console.log(`
            ❌ Still no products found. Try these troubleshooting steps:

            1. Make sure you're on an Amazon search results page
            2. Wait for the page to fully load
            3. Try scrolling down to load more products
            4. Check if you're logged in to Amazon
            5. Try running: debugAmazonPage() for more info
            `);
        }
    }
    
    return products;
}

window.isSponsored = function(container) {
    if (!container) return false;
    // Only rely on explicit sponsored markers to avoid false positives like the substring "ad" in normal words
    const sponsoredSelectors = [
        '[data-component-type="s-sponsored-label"]',
        '.s-sponsored-label',
        '[data-sponsored="true"]',
        '.AdHolder',
        '.s-sponsored-list-item',
        '[aria-label*="Sponsored"]',
        '[aria-label="Sponsored"]'
    ];
    for (const selector of sponsoredSelectors) {
        try {
            if (container.querySelector(selector)) return true;
        } catch (_) {
            // ignore invalid selector errors
        }
    }
    return false;
}

window.extractProductData = function(container) {
    try {
        // Title - try multiple selectors
        const titleSelectors = [
            'h2 a span',
            'h2 .a-size-medium',
            'h2 .a-size-base-plus',
            'h2 span',
            '.a-size-base-plus',
            '.a-size-medium',
            '.s-size-mini',
            'a[data-cy="title-recipe-link"] span'
        ];
        let title = 'N/A';
        for (const selector of titleSelectors) {
            const element = container.querySelector(selector);
            if (element && element.textContent.trim().length > 0) {
                title = element.textContent.trim();
                break;
            }
        }

        // Price - comprehensive extraction with multiple strategies
        let price = 'N/A';
        
        // Strategy 1: Look for price elements with currency symbols
        const priceSelectors = [
            '.a-price .a-offscreen',
            '.a-price .a-price-whole',
            '.a-price-range .a-offscreen',
            '.a-price-range .a-price-whole',
            '.a-price .a-price-whole + .a-price-fraction',
            '.a-price-range .a-price-whole + .a-price-fraction',
            '.a-price .a-price-symbol + .a-price-whole',
            '.a-price-range .a-price-symbol + .a-price-whole',
            '.a-price .a-price-fraction',
            '.a-price-range .a-price-fraction',
            '.a-price .a-price-symbol',
            '.a-price-range .a-price-symbol',
        ];
        
        for (const selector of priceSelectors) {
            const element = container.querySelector(selector);
            if (element && element.textContent.trim().length > 0) {
                const priceText = element.textContent.trim();
                // Validate that this looks like a price
                if (priceText.match(/[£$€¥₹]|\d+\.\d{2}|\d+,\d{2}/) && !priceText.includes('XBOX') && !priceText.includes('PlayStation')) {
                    price = priceText;
                    break;
                }
            }
        }
        
        // Strategy 2: Look for any element containing price patterns
        if (price === 'N/A') {
            const allElements = container.querySelectorAll('*');
            for (const element of allElements) {
                const text = element.textContent.trim();
                // Look for price patterns: £XX.XX, £XX,XX, $XX.XX, etc.
                if (text.match(/[£$€¥₹]\s*\d+[.,]\d{2}|[£$€¥₹]\s*\d+/) && 
                    !text.includes('XBOX') && 
                    !text.includes('PlayStation') && 
                    text.length < 30 &&
                    !text.includes('out of') &&
                    !text.includes('stars')) {
                    price = text;
                    break;
                }
            }
        }
        
        // Strategy 3: Look for aria-labels containing price information
        if (price === 'N/A') {
            const priceElements = container.querySelectorAll('[aria-label*="price"], [aria-label*="£"], [aria-label*="$"]');
            for (const element of priceElements) {
                const ariaLabel = element.getAttribute('aria-label');
                if (ariaLabel && ariaLabel.match(/[£$€¥₹]\s*\d+[.,]\d{2}|[£$€¥₹]\s*\d+/)) {
                    price = ariaLabel;
                    break;
                }
            }
        }
        
        // Strategy 4: Look for data attributes containing price
        if (price === 'N/A') {
            const dataElements = container.querySelectorAll('[data-price], [data-currency]');
            for (const element of dataElements) {
                const dataPrice = element.getAttribute('data-price') || element.getAttribute('data-currency');
                if (dataPrice && dataPrice.match(/[£$€¥₹]\s*\d+[.,]\d{2}|[£$€¥₹]\s*\d+/)) {
                    price = dataPrice;
                    break;
                }
            }
        }

        // Enhanced Rating extraction with multiple fallbacks and parsing
        let rating = 'N/A';
        
        // Try to get rating from aria-label first (most reliable)
        const ratingElements = [
            container.querySelector('.a-icon-alt'),
            container.querySelector('[aria-label*="stars"]'),
            container.querySelector('[aria-label*="out of"]'),
            container.querySelector('[data-cy="reviews-block"] .a-icon-alt'),
            container.querySelector('.a-star-medium .a-icon-alt'),
            container.querySelector('.a-star .a-icon-alt')
        ];
        
        for (const element of ratingElements) {
            if (element) {
                const ariaLabel = element.getAttribute('aria-label');
                const textContent = element.textContent;
                
                // Try aria-label first
                if (ariaLabel) {
                    const ratingMatch = ariaLabel.match(/(\d+\.?\d*)\s*out\s*of/i);
                    if (ratingMatch) {
                        rating = ratingMatch[1];
                        break;
                    }
                }
                
                // Try text content as fallback
                if (textContent && textContent.trim().length > 0) {
                    const ratingMatch = textContent.match(/(\d+\.?\d*)\s*out\s*of/i);
                    if (ratingMatch) {
                        rating = ratingMatch[1];
                        break;
                    }
                }
            }
        }
        
        // If still no rating, try other selectors
        if (rating === 'N/A') {
            const fallbackSelectors = [
                '[aria-label*="out of 5 stars"]',
                '.a-icon-star span.a-icon-alt',
                '.a-declarative .a-icon-alt'
            ];
            
            for (const selector of fallbackSelectors) {
                const element = container.querySelector(selector);
                if (element) {
                    const text = element.getAttribute('aria-label') || element.textContent;
                    if (text) {
                        const ratingMatch = text.match(/(\d+\.?\d*)/);
                        if (ratingMatch && parseFloat(ratingMatch[1]) <= 5) {
                            rating = ratingMatch[1];
                            break;
                        }
                    }
                }
            }
        }

        // Enhanced Reviews count extraction with multiple strategies
        let reviews = 'N/A';
        
        // Strategy 1: Look for reviews in link to customer reviews
        const reviewsLink = container.querySelector('a[href*="#customerReviews"]') || 
                           container.querySelector('a[href*="customerReviews"]');
        if (reviewsLink) {
            const linkText = reviewsLink.textContent || reviewsLink.innerText;
            if (linkText) {
                const reviewMatch = linkText.match(/[\d,]+/);
                if (reviewMatch) {
                    reviews = reviewMatch[0].replace(/,/g, '');
                }
            }
        }
        
        // Strategy 2: Look for aria-labels containing ratings
        if (reviews === 'N/A') {
            const ariaElements = [
                container.querySelector('[aria-label*="ratings"]'),
                container.querySelector('[aria-label*="rating"]'),
                container.querySelector('[aria-label*="customer reviews"]'),
                container.querySelector('span[aria-label*="ratings"]')
            ];
            
            for (const element of ariaElements) {
                if (element) {
                    const ariaLabel = element.getAttribute('aria-label');
                    if (ariaLabel) {
                        const reviewMatch = ariaLabel.match(/[\d,]+/);
                        if (reviewMatch) {
                            reviews = reviewMatch[0].replace(/,/g, '');
                            break;
                        }
                    }
                }
            }
        }
        
        // Strategy 3: Look for text content with number patterns
        if (reviews === 'N/A') {
            const textSelectors = [
                '.a-size-base.s-underline-text',
                '.a-link-normal .a-size-base',
                '.a-row.a-size-small span',
                '.a-link-normal .a-size-small',
                '.a-size-base'
            ];
            
            for (const selector of textSelectors) {
                const element = container.querySelector(selector);
                if (element && element.textContent.trim().length > 0) {
                    const text = element.textContent.trim();
                    // Look for patterns like "1,234", "234 ratings", etc.
                    if (/\d/.test(text) && (text.includes('rating') || text.match(/^\d+[,\d]*$/))) {
                        const reviewMatch = text.match(/[\d,]+/);
                        if (reviewMatch) {
                            reviews = reviewMatch[0].replace(/,/g, '');
                            break;
                        }
                    }
                }
            }
        }
        
        // Strategy 4: Look in all elements for review count patterns
        if (reviews === 'N/A') {
            const allElements = container.querySelectorAll('*');
            for (const element of allElements) {
                const text = element.textContent || element.innerText;
                if (text && text.length < 20) { // Keep it short to avoid irrelevant matches
                    // Look for patterns like "1,234 ratings", "(234)", etc.
                    if (text.match(/^\d+[,\d]*\s*(rating|review)/i) || 
                        text.match(/^\(\d+[,\d]*\)$/) ||
                        (text.match(/^\d+[,\d]*$/) && parseInt(text.replace(/,/g, '')) > 0 && parseInt(text.replace(/,/g, '')) < 1000000)) {
                        const reviewMatch = text.match(/[\d,]+/);
                        if (reviewMatch) {
                            reviews = reviewMatch[0].replace(/,/g, '');
                            break;
                        }
                    }
                }
            }
        }

        // Product URL
        const linkSelectors = [
            'h2 a',
            'a[data-cy="title-recipe-link"]',
            '.a-link-normal'
        ];
        let productUrl = 'N/A';
        for (const selector of linkSelectors) {
            const element = container.querySelector(selector);
            if (element && element.href) {
                productUrl = element.href;
                break;
            }
        }

        // Image - improved for lazy loading
        let imageUrl = 'N/A';
        const imgElement = container.querySelector('.s-image, img[data-image-index], img.s-img, img');
        if (imgElement) {
            imageUrl = imgElement.src || imgElement.getAttribute('data-src') || imgElement.getAttribute('data-lazy') || 'N/A';
        }

        // Prime
        const primeElement = container.querySelector('[aria-label*="Prime"], .a-icon-prime');
        const hasPrime = !!primeElement;

        // ASIN (Amazon Standard Identification Number)
        const asin = container.getAttribute('data-asin') || 'N/A';

        // Validate essential data - skip products with missing critical information
        if (!title || title === 'N/A' || title.length === 0) {
            console.log(`⚠️ Skipping product - missing title. ASIN: ${asin}`);
            return null;
        }
        
        if (!price || price === 'N/A') {
            console.log(`⚠️ Skipping product - missing price. Title: ${title.substring(0, 50)}...`);
            return null;
        }
        
        if (!asin || asin === 'N/A') {
            console.log(`⚠️ Skipping product - missing ASIN. Title: ${title.substring(0, 50)}...`);
            return null;
        }

        // Clean and validate rating
        if (rating !== 'N/A') {
            const numericRating = parseFloat(rating);
            if (isNaN(numericRating) || numericRating < 0 || numericRating > 5) {
                rating = 'N/A';
            } else {
                rating = numericRating.toString();
            }
        }

        // Clean and validate reviews count
        if (reviews !== 'N/A') {
            const numericReviews = parseInt(reviews.replace(/[^\d]/g, ''));
            if (isNaN(numericReviews) || numericReviews < 0) {
                reviews = 'N/A';
            } else {
                reviews = numericReviews.toString();
            }
        }

        console.log(`✅ Extracted complete product data: Title: ${title.substring(0, 30)}..., Price: ${price}, Rating: ${rating}, Reviews: ${reviews}, ASIN: ${asin}`);

        return {
            title,
            price,
            rating,
            reviews,
            url: productUrl,
            imageUrl,
            hasPrime,
            asin
        };
    } catch (error) {
        console.error('Error extracting product:', error);
        return null;
    }
}



// Count products on the page to prevent duplicates
window.countAmazonProducts = function() {
    console.log('🔍 Counting Amazon products on page...');
    
    // Try multiple selectors for different Amazon layouts
    const selectors = [
        '[data-component-type="s-search-result"]',
        '.s-result-item[data-component-type="s-search-result"]',
        '.s-result-item',
        '[data-asin]:not([data-asin=""])',
        '.s-card-container',
        '.sg-col-inner .s-card-container',
        '[data-cy="asin-faceout-container"]',
        '[data-testid="product-card"]',
        '.puis-card-container'
    ];
    
    let productContainers = [];
    
    // Try each selector until we find products
    for (const selector of selectors) {
        productContainers = document.querySelectorAll(selector);
        console.log(`Trying selector "${selector}": found ${productContainers.length} containers`);
        if (productContainers.length > 0) break;
    }
    
    // Filter out sponsored products
    const nonSponsoredProducts = Array.from(productContainers).filter(container => !window.isSponsored(container));
    
    console.log(`✅ Found ${productContainers.length} total containers, ${nonSponsoredProducts.length} non-sponsored products`);
    
    return {
        success: true,
        productCount: nonSponsoredProducts.length,
        totalContainers: productContainers.length,
        nonSponsoredCount: nonSponsoredProducts.length
    };
};

// Debug function to help troubleshoot
window.debugAmazonPage = function() {
    console.log('🔍 Debugging Amazon page structure...');
    
    const allDivs = document.querySelectorAll('div');
    console.log(`Total divs on page: ${allDivs.length}`);
    
    const withDataAsin = document.querySelectorAll('[data-asin]');
    console.log(`Elements with data-asin: ${withDataAsin.length}`);
    
    const searchResults = document.querySelectorAll('[data-component-type="s-search-result"]');
    console.log(`Elements with s-search-result: ${searchResults.length}`);
    
    const sResultItems = document.querySelectorAll('.s-result-item');
    console.log(`Elements with s-result-item class: ${sResultItems.length}`);
    
    const cardContainers = document.querySelectorAll('.s-card-container');
    console.log(`Elements with s-card-container: ${cardContainers.length}`);
    
    // Check URL
    console.log(`Current URL: ${window.location.href}`);
    console.log(`Is Amazon domain: ${window.location.href.includes('amazon')}`);
    console.log(`Is search page: ${window.location.href.includes('/s?')}`);
    
    // Look for any h2 elements (titles)
    const h2Elements = document.querySelectorAll('h2');
    console.log(`H2 elements found: ${h2Elements.length}`);
    
    if (h2Elements.length > 0) {
        console.log('Sample H2 content:', h2Elements[0].textContent.substring(0, 100));
    }
    
    // Debug price elements
    const priceElements = document.querySelectorAll('.a-price, .a-price-whole, .a-price-fraction, .a-offscreen');
    console.log(`Price elements found: ${priceElements.length}`);
    if (priceElements.length > 0) {
        console.log('Sample price elements:');
        for (let i = 0; i < Math.min(5, priceElements.length); i++) {
            console.log(`  ${i + 1}. "${priceElements[i].textContent.trim()}"`);
        }
    }
    
    // Debug all elements with currency symbols
    const allElements = document.querySelectorAll('*');
    const currencyElements = [];
    for (const element of allElements) {
        const text = element.textContent.trim();
        if (text.match(/[£$€¥₹]\s*\d+[.,]\d{2}|[£$€¥₹]\s*\d+/) && text.length < 50) {
            currencyElements.push({
                text: text,
                tagName: element.tagName,
                className: element.className
            });
        }
    }
    console.log(`Elements with currency symbols found: ${currencyElements.length}`);
    if (currencyElements.length > 0) {
        console.log('Sample currency elements:');
        for (let i = 0; i < Math.min(10, currencyElements.length); i++) {
            console.log(`  ${i + 1}. "${currencyElements[i].text}" (${currencyElements[i].tagName}.${currencyElements[i].className})`);
        }
    }
    
    return {
        success: true,
        message: 'Debug completed successfully',
        data: {
            totalDivs: allDivs.length,
            withDataAsin: withDataAsin.length,
            searchResults: searchResults.length,
            sResultItems: sResultItems.length,
            cardContainers: cardContainers.length,
            h2Elements: h2Elements.length,
            priceElements: priceElements.length,
            isAmazonDomain: window.location.href.includes('amazon'),
            isSearchPage: window.location.href.includes('/s?')
        }
    };
}

// Add global functions for testing
window.testAmazonScraper = () => {
  console.log('Testing Amazon scraper from global scope...');
  return { success: true, message: 'Content script is working!' };
};

window.debugAmazonPageGlobal = () => {
  console.log('Debug Amazon page from global scope...');
  return window.debugAmazonPage();
};

window.scrapeAmazonProductsGlobal = async (maxProducts) => {
  console.log('Scrape Amazon products from global scope...');
  if (!maxProducts || maxProducts <= 0) {
    return { success: false, message: 'Please specify a valid number of products to scrape' };
  }
  try {
    const products = await window.scrapeAmazonProducts(maxProducts);
    return { success: true, products: products, total: products.length };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

// Add the working scraper code as a fallback
window.scrapeAmazonProductsWorking = async (maxProducts) => {
  console.log(`🔍 Starting to scrape ${maxProducts} products with working method...`);
  if (!maxProducts || maxProducts <= 0) {
    return { success: false, message: 'Please specify a valid number of products to scrape' };
  }
  try {
    const products = await window.scrapeAmazonProducts(maxProducts);
    return { success: true, products: products, total: products.length };
  } catch (error) {
    console.error('Working scraper failed:', error);
    return { success: false, message: error.message };
  }
};

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  try {
    console.log('🔧 Content script received message:', req.callback);
    console.log('🔧 Message payload:', req.payload);
    console.log('🔧 Current scraping flag status:', window.isScrapingInProgress);
    console.log('🔧 Content script instance ID:', window.contentScriptId || 'unknown');
    
    // Only respond to scraping messages if this is the primary content script instance
    if (req.callback === 'scrapeAmazonProducts') {
      // Check if another instance has already completed scraping
      if (window.lastScrapingResult && window.lastScrapingResult.products && window.lastScrapingResult.products.length > 0) {
        console.log('🔧 Found existing scraping result from another instance:', window.lastScrapingResult);
        sendResponse(window.lastScrapingResult);
        return true;
      }
      
      // Check if another instance is already handling scraping
      if (window.isScrapingInProgress) {
        console.log('🔧 Another scraping instance already in progress, waiting for result...');
        
        // Wait for the result to be available
        const checkForResult = () => {
          if (window.lastScrapingResult && window.lastScrapingResult.products) {
            console.log('🔧 Scraping result now available:', window.lastScrapingResult);
            sendResponse(window.lastScrapingResult);
          } else {
            setTimeout(checkForResult, 500);
          }
        };
        
        setTimeout(checkForResult, 500);
        return true; // Keep message channel open
      }
    }
    
    if (req.callback === 'resumeNoLimit') {
      console.log('🔁 resumeNoLimit message received');
      (async () => { try { await maybeResumeNoLimit(); } catch (_) {} })();
      sendResponse({ success: true });
    } else if (req.callback === 'debugAmazonPage') {
      console.log('🔧 Calling debugAmazonPage...');
      const result = window.debugAmazonPage();
      console.log('🔧 Debug result:', result);
      sendResponse(result);
    } else if (req.callback === 'countAmazonProducts') {
      console.log('🔧 Calling countAmazonProducts...');
      const result = window.countAmazonProducts();
      console.log('🔧 Count result:', result);
      sendResponse(result);
    } else if (req.callback === 'scrapeAmazonProducts') {
      console.log('🔧 Calling scrapeAmazonProducts...');
      console.log('🔧 Max products requested:', req.payload?.maxProducts);
      console.log('🔧 Scrape type:', req.payload?.scrapeType);
      console.log('🔧 Is scraping already in progress?', window.isScrapingInProgress);
      (async () => {
        try {
          const maxProducts = req.payload?.maxProducts;
          console.log('🔧 Processing maxProducts:', maxProducts);
          if (!maxProducts || maxProducts <= 0) {
            console.log('🔧 Invalid maxProducts, sending error response');
            sendResponse({ success: false, message: 'Please specify a valid number of products to scrape' });
            return;
          }
          
          // Create progress callback to send updates to background script
          const onProgress = (progressData) => {
            console.log('🔧 Sending progress update:', progressData);
            chrome.runtime.sendMessage({
              callback: 'updateScrapingProgress',
              payload: {
                ...progressData,
                tabId: req.payload?.tabId
              }
            });
          };
          
          console.log('🔧 About to call window.scrapeAmazonProducts...');
          // In No-Wait mode, mark flag so scraper persists across navigations and return early
          if (req.payload?.noWait) {
            window.scrapeNoWait = true;
            try { localStorage.setItem(NL_MAX_KEY, String(maxProducts)); } catch (_) {}
            // Kick off scraping but don't await to avoid losing the message channel during navigation
            window.scrapeAmazonProducts(maxProducts, onProgress)
              .then((products) => {
                window.lastScrapingResult = {
                  success: true,
                  products: products,
                  total: products?.length || 0,
                  timestamp: Date.now(),
                  source: 'product-hunter.js',
                  instanceId: window.contentScriptId
                };
                console.log('🔧 Scrape completed in background (noWait)');
              })
              .catch((error) => console.log('🔧 Background scrape error (noWait):', error));
            sendResponse({ success: true, started: true });
            return;
          }

          // Normal mode: await and return results
          const products = await window.scrapeAmazonProducts(maxProducts, onProgress);
          console.log('🔧 scrapeAmazonProducts completed, products count:', products?.length);
          window.lastScrapingResult = {
            success: true, 
            products: products, 
            total: products.length,
            timestamp: Date.now(),
            source: 'product-hunter.js',
            instanceId: window.contentScriptId
          };
          console.log('🔧 Scrape result stored globally:', window.lastScrapingResult);
          sendResponse(window.lastScrapingResult);
        } catch (error) {
          console.log('🔧 Scrape error:', error);
          sendResponse({ success: false, message: error.message });
        }
      })();
      return true; // IMPORTANT: Return true for async response
    } else if (req.callback === 'stopAmazonScraping') {
      console.log('🔧 Calling stopAmazonScraping...');
      const result = { success: true, message: 'Scraping stopped' };
      sendResponse(result);
    } else if (req.callback === 'testContentScript') {
      console.log('🔧 Calling testContentScript...');
      const result = { success: true, message: 'Content script is working!' };
      sendResponse(result);
    } else {
      console.log('🔧 Handling other callback:', req.callback);
      // Handle other existing callbacks
      if (Callbacks[req.callback]) {
        Callbacks[req.callback](req.payload);
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, message: 'Callback not found' });
      }
    }
  } catch (e) {
    console.log('❌ Error in content script:', e);
    sendResponse({ success: false, message: e.message });
  }
  return true;
});

document.onreadystatechange = async () => {
  console.log('🔧 Product Hunter - Document state:', document.readyState);
  if (document.readyState === 'complete') {
    // Initialize the enhanced scraper
    console.log('🔧 Product Hunter - Enhanced Amazon Product Scraper Ready!');
    // Removed automatic call to old AmazonProductHunter to prevent duplication
  }
};

// ============================================
// USAGE INSTRUCTIONS:
// ============================================

console.log(`
🚀 Enhanced Amazon Product Scraper with Multi-Page Support Ready!

Usage:
1. scrapeAmazonProducts(10)     // Scrape 10 products (auto-paginates if needed)
2. scrapeAmazonProducts(50)     // Scrape 50 products across multiple pages
3. scrapeAmazonProducts(n)      // Scrape n products (specify your number)

New Multi-Page Features:
✓ Automatically navigates to next pages if needed
✓ Continues scraping until target number is reached
✓ Prevents duplicate products across pages (ASIN tracking)
✓ Real-time progress updates during multi-page scraping
✓ Handles pagination buttons and page loading automatically

Troubleshooting:
- debugAmazonPage()             // Check page structure
- Make sure you're on Amazon search results page
- Wait for page to fully load before running

The scraper will:
✓ Skip sponsored products
✓ Extract product details
✓ Show results in console
✓ Work with different Amazon layouts
✓ Display results in the extension UI
✓ Auto-navigate to next pages when needed
✓ Track unique products across pages

Example: scrapeAmazonProducts(25) will scrape 25 products automatically 
across multiple pages if a single page doesn't have enough products!
`);