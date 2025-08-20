import { createRoot } from 'react-dom/client';
import { uniqBy } from 'lodash';
import AllProductsPageDatabox from '../../components/Amazon/AllProductsPageDataBox';

import { getLocal, setLocal, onChange as onChangeLocalState } from '../dbService';
import { sleep } from '../utils';

// Amazon Scraper Class
class AmazonScraper {
    constructor() {
        this.isScraping = false;
        this.scrapedProducts = [];
        this.currentProgress = 0;
        this.totalProducts = 0;
    }

    // Debug function to check Amazon page structure
    debugAmazonPage() {
        console.log('🔍 Debugging Amazon page...');
        
        const result = {
            isAmazonPage: window.location.href.includes('amazon.'),
            hasSearchResults: !!document.querySelector('span[data-component-type="s-search-results"]'),
            productContainers: document.querySelectorAll('[data-component-type="s-search-result"]').length,
            sponsoredProducts: document.querySelectorAll('span[data-component-type="s-sponsored-label"]').length,
            pageTitle: document.title,
            url: window.location.href
        };

        console.log('📊 Debug Results:', result);
        
        if (result.isAmazonPage && result.hasSearchResults && result.productContainers > 0) {
            console.log('✅ Page is ready for scraping!');
            return { success: true, message: 'Page ready for scraping', data: result };
        } else {
            console.log('❌ Page not suitable for scraping');
            return { success: false, message: 'Page not suitable for scraping', data: result };
        }
    }

    // Check if product is sponsored
    isSponsored(container) {
        const sponsoredIndicators = [
            'span[data-component-type="s-sponsored-label"]',
            '.s-sponsored-label',
            '[data-sponsored="true"]'
        ];

        for (const selector of sponsoredIndicators) {
            if (container.querySelector(selector)) {
                return true;
            }
        }

        const textContent = container.textContent.toLowerCase();
        return textContent.includes('sponsored');
    }

    // Extract product data from container
    extractProductData(container) {
        try {
            // Title
            const titleSelectors = [
                'h2.a-size-mini span',
                'h2 .a-size-medium',
                'h2 .a-size-base-plus',
                'h2 a span'
            ];
            
            let title = 'N/A';
            for (const selector of titleSelectors) {
                const element = container.querySelector(selector);
                if (element) {
                    title = element.textContent.trim();
                    break;
                }
            }

            // Price
            const priceSelectors = [
                '.a-price-whole',
                '.a-price .a-offscreen',
                '.a-price-range'
            ];
            
            let price = 'N/A';
            for (const selector of priceSelectors) {
                const element = container.querySelector(selector);
                if (element) {
                    price = element.textContent.trim();
                    const decimalElement = container.querySelector('.a-price-fraction');
                    if (decimalElement) {
                        price += '.' + decimalElement.textContent.trim();
                    }
                    break;
                }
            }

            // Rating
            const ratingElement = container.querySelector('.a-icon-alt');
            const rating = ratingElement ? ratingElement.textContent.trim() : 'N/A';

            // Reviews
            const reviewsElement = container.querySelector('[data-action="s-show-all-reviews-link"] span');
            const reviews = reviewsElement ? reviewsElement.textContent.trim() : 'N/A';

            // Product URL
            const linkElement = container.querySelector('h2 a');
            const productUrl = linkElement ? linkElement.href : 'N/A';

            // Image URL
            const imgElement = container.querySelector('.s-image');
            const imageUrl = imgElement ? imgElement.src : 'N/A';

            // Prime availability
            const primeElement = container.querySelector('[aria-label*="Prime"]');
            const hasPrime = !!primeElement;

            return {
                title,
                price,
                rating,
                reviews,
                url: productUrl,
                imageUrl,
                hasPrime,
                availability: 'In Stock'
            };
        } catch (error) {
            console.error('Error extracting product data:', error);
            return null;
        }
    }

    // Main scraping function with progress tracking
    async scrapeAmazonProducts(maxProducts = 20) {
        if (this.isScraping) {
            console.log('⚠️ Scraping already in progress...');
            return { success: false, message: 'Scraping already in progress' };
        }

        this.isScraping = true;
        this.scrapedProducts = [];
        this.currentProgress = 0;
        this.totalProducts = 0;

        console.log(`🚀 Starting to scrape ${maxProducts} products...`);

        try {
            // Debug the page first
            const debugResult = this.debugAmazonPage();
            if (!debugResult.success) {
                this.isScraping = false;
                return debugResult;
            }

            const productContainers = document.querySelectorAll('[data-component-type="s-search-result"]');
            this.totalProducts = Math.min(productContainers.length, maxProducts);

            console.log(`📦 Found ${productContainers.length} products, targeting ${this.totalProducts}`);

            let scrapedCount = 0;
            for (const container of productContainers) {
                if (scrapedCount >= maxProducts) break;

                // Skip sponsored products
                if (this.isSponsored(container)) {
                    console.log('⏭️ Skipping sponsored product');
                    continue;
                }

                const productData = this.extractProductData(container);
                if (productData && productData.title !== 'N/A') {
                    this.scrapedProducts.push(productData);
                    scrapedCount++;
                    
                    // Update progress
                    this.currentProgress = (scrapedCount / this.totalProducts) * 100;
                    console.log(`✅ Scraped ${scrapedCount}/${this.totalProducts}: ${productData.title.substring(0, 50)}...`);
                    
                    // Send progress update
                    await this.updateProgress();
                }
            }

            this.isScraping = false;
            console.log(`🎉 Scraping completed! Found ${this.scrapedProducts.length} products`);
            
            return {
                success: true,
                message: `Successfully scraped ${this.scrapedProducts.length} products`,
                products: this.scrapedProducts,
                total: this.scrapedProducts.length
            };

        } catch (error) {
            this.isScraping = false;
            console.error('❌ Error during scraping:', error);
            return {
                success: false,
                message: `Scraping failed: ${error.message}`,
                error: error.message
            };
        }
    }

    // Update progress and send to background
    async updateProgress() {
        const progressData = {
            current: this.currentProgress,
            total: this.totalProducts,
            scraped: this.scrapedProducts.length,
            products: this.scrapedProducts
        };

        // Send progress to background script
        await chrome.runtime.sendMessage({
            callback: 'updateScrapingProgress',
            payload: progressData
        });
    }

    // Stop scraping
    stopScraping() {
        this.isScraping = false;
        console.log('🛑 Scraping stopped by user');
        return { success: true, message: 'Scraping stopped' };
    }
}

// Global scraper instance
const amazonScraper = new AmazonScraper();

const waitForSelector = async (document, element) => new Promise((resolve) => {
  let selector;
  let setTimeoutIntervalId = '';
  const setIntervalId = setInterval(() => {
    selector = document.querySelector(element);
    if (selector) {
      clearTimeout(setTimeoutIntervalId);
      clearInterval(setIntervalId);
      resolve(selector);
    }
  }, 500);

  setTimeoutIntervalId = setTimeout(async () => {
    clearInterval(setIntervalId);
    resolve(selector);
  }, 10000);
});

const updateTitle = () => {
  document.title = 'chrome extension installed';
};

const getProductHtmlData = async (domain, asin, title) => {
  let amazonLink = 'https://www.amazon.com';
  if (domain === 'UK') {
    amazonLink = 'https://www.amazon.co.uk';
  }

  const response = await fetch(`${amazonLink}/dp/${asin}`, {
    headers: {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'accept-language': 'en-US,en;q=0.9',
      'cache-control': 'max-age=0',
      'device-memory': '8',
      'downlink': '10',
      'dpr': '2',
      'ect': '4g',
      'priority': 'u=0, i',
      'rtt': '200',
      'sec-ch-device-memory': '8',
      'sec-ch-dpr': '2',
      'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-ch-viewport-width': '1721',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'same-origin',
      'sec-fetch-user': '?1',
      'upgrade-insecure-requests': '1',
      'viewport-width': '1721'
    },
    'referrer': `${amazonLink}/s?k=${title}`,
    'referrerPolicy': 'strict-origin-when-cross-origin',
    'body': null,
    'method': 'GET',
    'mode': 'cors',
    'credentials': 'include'
  });

  const res = await response.text();
  const htmlData = new DOMParser().parseFromString(res, 'text/html');
  return htmlData;
};

const extractRatings = (text) => {
  const regex = /(\d{1,3}(?:,\d{3})*)(?=\n\d+\+ bought in past month)/g;
  const matches = text.match(regex);
  return matches;
};

const AmazonProductHunter = async () => {
  const response = await chrome.runtime.sendMessage({
    callback: 'checkUser'
  });

  onChangeLocalState('run-script-status', async (_, newValue) => {
    if (newValue === 'pause' || newValue === 'terminate') {
      const userId = await getLocal('current-user');
      await setLocal(`run-script-${userId}`, false);
      if (newValue === 'terminate') {
        await setLocal('run-script-status', '');
      }
      await chrome.runtime.sendMessage({
        callback: 'closeTab'
      });
      window.close();
      return;
    }
  });

  if (response.success) {
    const userId = await getLocal('current-user');
    const runScript = await getLocal(`run-script-${userId}`);
    const runScriptStatus = await getLocal('run-script-status');
    console.log('🚀 ~ file: contentScript.js:94 ~ runScriptStatus:', runScriptStatus);

    if (runScript) {
      console.log('\n runScriptStatus', runScriptStatus);
      if (runScriptStatus === 'pause' || runScriptStatus === 'terminate') {
        await setLocal(`run-script-${userId}`, false);
        if (runScriptStatus === 'terminate') {
          await setLocal('run-script-status', '');
        }
        await chrome.runtime.sendMessage({
          callback: 'closeTab'
        });
        window.close();
        return;
      }

      const alreadyListedProducts = await chrome.runtime.sendMessage({
        callback: 'getAllListing'
      });

      console.log('\n alreadyListedProducts', alreadyListedProducts);
      const { listingsData = [] } = alreadyListedProducts || {};

      const titles = await getLocal('product-hunter-titles');

      const settings = await getLocal('product-hunter-settings');
      const {
        resultFetchLimit = 0,
        minPrice = 0,
        maxPrice = 0,
        minReviews = 0,
        maxReviews = 0,
        isPrime = false,
        amazonChoice = false,
        bestSeller = false,
        duplicateItem = false,
        veroItem = false,
        removeBooks = false,
        amazonIsSeller = false,
        itemsWithWords = '',
        highestReviewed = false
      } = settings || {};

      // if (amazonIsSeller) {
      //   const domain = await getLocal(`selected-domain-${userId}`);

      //   let d = 'com';
      //   if (domain === 'UK') {
      //     d = 'co.uk';
      //   }

      //   const amazonLiItem = await waitForSelector(document, `li[aria-label="Amazon.${d}"]`);
      //   const amazonElement = document.querySelector(`li[aria-label="Amazon.${d}"]`);
      //   console.log('\n amazon check box', amazonElement?.querySelector('input')?.checked);
      //   if (amazonElement && !amazonElement.querySelector('input')?.checked) {
      //     amazonLiItem?.querySelector('i[class*="a-icon-checkbox"]')?.click();

      //     return;
      //   }
      // }

      // if (highestReviewed) {
      //   document.querySelector('span[data-csa-c-func-deps="aui-da-a-dropdown-button"]').click();
      //   await sleep(1);
      //   const allOptions = document.querySelector('div[class="a-popover-wrapper"]').querySelectorAll('li');
      //   const selectedValue = document.querySelector('span[class="a-dropdown-prompt"]').innerText;
      //   if (!selectedValue?.toLowerCase()?.includes('customer review')) {
      //     for (let i = 0; i < allOptions.length; i += 1) {
      //       const value = allOptions[i].innerText;
      //       if (value.toLowerCase().includes('customer review')) {
      //         console.log('\n value', value);
      //         allOptions[i].querySelector('a').click();

      //         return;
      //       }
      //     }
      //   }
      // }

      const checkPreviousScrappedProducts = await getLocal(`amazon-hunted-products-${userId}`) || [];
      const percentageValueToAdd = await getLocal(`result-percentage-add-value-${userId}`);
      const percentage = await getLocal(`result-percentage-${userId}`);
      const domain = await getLocal(`selected-domain-${userId}`);
      let singleTitleFetchLimit = await getLocal('single-title-fetch-limit');
      if (!singleTitleFetchLimit) singleTitleFetchLimit = 0;

      console.log('\n singleTitleFetchLimit', singleTitleFetchLimit);
      let productsFetched = singleTitleFetchLimit;
      console.log('\n productsFetched', productsFetched);
      console.log('\n resultFetchLimit', resultFetchLimit);

      for (let i = 0; i < titles.length; i += 1) {
        await waitForSelector(document, 'span[data-component-type="s-search-results"]');

        const allProducts = document.querySelectorAll('div[data-component-type="s-search-result"]');
        await setLocal('product-hunter-logs', `found ${allProducts.length} products`);

        // let limitedProducts = Array.from(allProducts);
        // if (resultFetchLimit) {
        //   limitedProducts = Array.from(allProducts).slice(0, resultFetchLimit);
        // }

        console.log('\n allProducts', allProducts.length);
        for (let j = 0; j < allProducts.length; j += 1) {
          // Check if we've reached the user's limit based on products actually fetched, not loop index
          if (resultFetchLimit && productsFetched >= resultFetchLimit) {
            await setLocal('single-title-fetch-limit', 0);
            console.log(`\n Reached user limit of ${resultFetchLimit} products. Stopping scraping.`);
            break;
          }

          // get asin
          const asin = allProducts[j]?.getAttribute('data-asin');
          await setLocal('product-hunter-logs', `hunting ${asin} data`);

          // if already listed
          if (listingsData.includes(asin)) {
            await setLocal('product-hunter-logs', `${asin} already listed on ebay`);
            continue;
          }

          // check if item is amazon choice or not
          if (amazonChoice) {
            //id="B0032RMX3U-amazons-choice"
            if (!allProducts[j].querySelector('span[id*="-amazons-choice"]')) {
              await setLocal('product-hunter-logs', `${asin} is not amazon choice`);
              continue;
            }
          }
          // check if item is best seller or not
          if (bestSeller) {
            //id="B0C59CLN29-best-seller"
            if (!allProducts[j].querySelector('span[id*="-best-seller"]')) {
              await setLocal('product-hunter-logs', `${asin} is not best seller`);
              continue;
            }
          }

          // check is prime or not
          let productHtmlData = null;
          if (isPrime && asin) {
            productHtmlData = await getProductHtmlData(domain, asin, titles[i]);
            let shipFrom = productHtmlData.querySelector('div[data-csa-c-slot-id="odf-feature-text-desktop-fulfiller-info"]')?.innerText || '';
            shipFrom = shipFrom.toLowerCase();
            if (shipFrom && !shipFrom.includes('amazon')) {
              await setLocal('product-hunter-logs', `${asin} is not prime`);
              continue;
            }
          }

          // Enhanced image extraction with multiple fallbacks
          const imageLink = allProducts[j].querySelector('img[class="s-image"]')?.src || 
                           allProducts[j].querySelector('img[data-image-latency="s-product-image"]')?.src ||
                           allProducts[j].querySelector('img.s-product-image')?.src || '';
          await setLocal('product-hunter-logs', `hunted image link: ${imageLink}`);

          // Enhanced title extraction with multiple fallbacks
          const titleDiv = allProducts[j].querySelector('div[data-cy="title-recipe"]');
          const title = titleDiv?.querySelector('a[href*="/"]')?.innerText || 
                       allProducts[j].querySelector('h2 a span')?.innerText ||
                       allProducts[j].querySelector('h2.a-size-mini span')?.innerText ||
                       allProducts[j].querySelector('[data-cy="title-recipe"] span')?.innerText || '';
          await setLocal('product-hunter-logs', `hunted title: ${title}`);

          // Enhanced brand extraction with multiple fallbacks  
          const brand = allProducts[j].querySelector('[data-cy="title-recipe"] .a-color-secondary')?.innerText ||
                       allProducts[j].querySelector('.s-size-mini .a-color-secondary')?.innerText ||
                       allProducts[j].querySelector('.a-color-secondary.a-text-normal')?.innerText ||
                       title.split(' ')[0] || ''; // Use first word of title as fallback
          await setLocal('product-hunter-logs', `hunted brand: ${brand}`);

          // Enhanced price extraction with multiple fallbacks and retry logic
          const priceDiv = allProducts[j].querySelector('div[data-cy="price-recipe"]');
          let price = priceDiv?.querySelector('span[class="a-offscreen"]')?.innerText || 
                     priceDiv?.querySelector('.a-price-whole')?.innerText ||
                     priceDiv?.querySelector('.a-price .a-offscreen')?.innerText || '';
          
          if (!price) {
            const anotherPriceDiv = allProducts[j].querySelector('div[data-cy="secondary-offer-recipe"]');
            price = anotherPriceDiv?.querySelector('span[class="a-color-base"]')?.innerText || 
                   anotherPriceDiv?.querySelector('.a-price .a-offscreen')?.innerText ||
                   allProducts[j].querySelector('.a-price .a-offscreen')?.innerText ||
                   allProducts[j].querySelector('.a-price-whole')?.innerText || '';
          }

          // If still no price found, try to get from product page
          if (!price && asin) {
            try {
              if (!productHtmlData) {
                productHtmlData = await getProductHtmlData(domain, asin, titles[i]);
              }
              price = productHtmlData?.querySelector('span[class="a-offscreen"]')?.innerText || 
                     productHtmlData?.querySelector('.a-price .a-offscreen')?.innerText ||
                     productHtmlData?.querySelector('.a-price-whole')?.innerText ||
                     productHtmlData?.querySelector('#priceblock_dealprice')?.innerText ||
                     productHtmlData?.querySelector('#price_inside_buybox')?.innerText || '';
            } catch (error) {
              console.log(`Error fetching price for ${asin}:`, error);
            }
          }
          
          // Clean price and validate
          if (price && typeof price === 'string') {
            price = price.trim();
            // Skip products with no valid price
            if (!price || price === '0' || price === '' || price.toLowerCase().includes('unavailable')) {
              await setLocal('product-hunter-logs', `${asin} has no valid price, skipping`);
              continue;
            }
          }
          
          await setLocal('product-hunter-logs', `hunted price: ${price}`);

          // Enhanced reviews extraction with multiple fallbacks and retry logic
          let reviews = '0';
          let rating = '0';
          
          // Try to get reviews from product listing first
          const reviewSpan = allProducts[j].querySelector('a[href*="#customerReviews"] span') ||
                            allProducts[j].querySelector('.a-icon-alt') ||
                            allProducts[j].querySelector('[data-cy="reviews-block"] span');
          
          if (reviewSpan?.innerText) {
            const reviewText = reviewSpan.innerText;
            // Extract number from text like "4.5 out of 5 stars" or "1,234 ratings"
            const reviewMatch = reviewText.match(/[\d,]+/);
            if (reviewMatch) {
              reviews = reviewMatch[0].replace(/,/g, '');
            }
          }
          
          // Try to get rating from product listing
          const ratingElement = allProducts[j].querySelector('.a-icon-alt') ||
                               allProducts[j].querySelector('[aria-label*="stars"]') ||
                               allProducts[j].querySelector('[aria-label*="out of"]');
          
          if (ratingElement?.getAttribute('aria-label')) {
            const ratingText = ratingElement.getAttribute('aria-label');
            const ratingMatch = ratingText.match(/(\d+\.?\d*)\s*out\s*of/i);
            if (ratingMatch) {
              rating = ratingMatch[1];
            }
          }
          
          // If no reviews found from listing, try product page
          if ((reviews === '0' || rating === '0') && asin) {
            try {
              if (!productHtmlData) {
                productHtmlData = await getProductHtmlData(domain, asin, titles[i]);
              }
              
              if (productHtmlData) {
                // Try multiple selectors for reviews count
                if (reviews === '0') {
                  const reviewElements = [
                    productHtmlData.querySelector('#acrCustomerReviewText'),
                    productHtmlData.querySelector('[data-hook="total-review-count"]'),
                    productHtmlData.querySelector('.cr-widget-ACR .a-size-base'),
                    productHtmlData.querySelector('#reviewsMedley [data-hook="total-review-count"]')
                  ];
                  
                  for (const element of reviewElements) {
                    if (element?.innerText) {
                      const reviewMatch = element.innerText.match(/[\d,]+/);
                      if (reviewMatch) {
                        reviews = reviewMatch[0].replace(/,/g, '');
                        break;
                      }
                    }
                  }
                }
                
                // Try multiple selectors for rating
                if (rating === '0') {
                  const ratingElements = [
                    productHtmlData.querySelector('#acrPopover'),
                    productHtmlData.querySelector('[data-hook="rating-out-of-text"]'),
                    productHtmlData.querySelector('.a-icon-alt'),
                    productHtmlData.querySelector('[class*="a-star"] .a-icon-alt')
                  ];
                  
                  for (const element of ratingElements) {
                    if (element?.innerText || element?.getAttribute('aria-label')) {
                      const text = element.innerText || element.getAttribute('aria-label');
                      const ratingMatch = text.match(/(\d+\.?\d*)\s*out\s*of/i);
                      if (ratingMatch) {
                        rating = ratingMatch[1];
                        break;
                      }
                    }
                  }
                }
              }
            } catch (error) {
              console.log(`Error fetching reviews for ${asin}:`, error);
            }
          }
          
          await setLocal('product-hunter-logs', `hunted reviews: ${reviews}, rating: ${rating}`);

          let pushProduct = false;
          const floatPrice = parseFloat(String(price).replace(/[^0-9.]/g, ''));
          const floatReviews = Number(reviews.replace(/,/g, ''));

          if (minPrice && maxPrice) {
            if (minPrice <= floatPrice && floatPrice <= maxPrice) pushProduct = true;
          } else if (minPrice && !maxPrice) {
            if (minPrice <= floatPrice) pushProduct = true;
          } else if (!minPrice && maxPrice) {
            if (floatPrice <= maxPrice) pushProduct = true;
          } else if (!minPrice && !maxPrice) {
            if (!pushProduct) pushProduct = true;
          }
          if (minPrice || maxPrice) {
            await setLocal('product-hunter-logs', 'price rules evaluated');
          }

          if (pushProduct && amazonChoice) {
            if (allProducts[j].querySelector('span[id*="-amazons-choice-label"]')) {
              pushProduct = true;
            } else {
              pushProduct = false;
            }
          }

          if (pushProduct) {
            if (minReviews && maxReviews) {
              if (minReviews <= floatReviews && floatReviews <= maxReviews) {
                pushProduct = true;
              } else {
                pushProduct = false;
              }
            } else if (minReviews && !maxReviews) {
              if (minReviews <= floatReviews) {
                pushProduct = true;
              } else {
                pushProduct = false;
              }
            } else if (!minReviews && maxReviews) {
              if (floatReviews <= maxReviews) {
                pushProduct = true;
              } else {
                pushProduct = false;
              }
            } else if (!minReviews && !maxReviews) {
              if (!minPrice && !maxPrice && !pushProduct) pushProduct = true;
            }

            if (minReviews || maxReviews) {
              await setLocal('product-hunter-logs', 'review rules evaluated');
            }
          }

          if (pushProduct && (duplicateItem || runScriptStatus === 'resume')) {
            if (duplicateItem && listingsData.includes(asin)) {
              pushProduct = false;
            } else {
              const alreadyHunted = checkPreviousScrappedProducts.find((item) => item.asin === asin);
              if (!alreadyHunted) {
                pushProduct = true;
              } else {
                pushProduct = false;
              }
            }
          }

          if (pushProduct && removeBooks) {
            if (productHtmlData) {
              const category = productHtmlData.querySelector('#nav-search-label-id')?.innerText || '';
              if (category.toLowerCase().includes('book')) {
                continue;
              } else if (category.toLowerCase().includes('all')) {
                const catDiv = productHtmlData.querySelector('#nav-subnav')?.getAttribute('data-category') || '';
                if (catDiv.toLowerCase().includes('book')) continue;
              }
            } else {
              productHtmlData = await getProductHtmlData(domain, asin, titles[i]);
              const category = productHtmlData.querySelector('#nav-search-label-id')?.innerText || '';
              if (category.toLowerCase().includes('book')) {
                continue;
              } else if (category.toLowerCase().includes('all')) {
                const catDiv = productHtmlData.querySelector('#nav-subnav')?.getAttribute('data-category') || '';
                if (catDiv.toLowerCase().includes('book')) continue;
              }
            }
          }

          if (pushProduct && removeBooks) {
            if (!title?.toLowerCase().includes('book') && !title?.toLowerCase().includes('books')
              && !brand?.toLowerCase().includes('book') && !brand?.toLowerCase().includes('books')) {
              pushProduct = true;
            } else {
              pushProduct = false;
            }
          }

          const veroBrands = await getLocal('vero-brands') || [];
          if (pushProduct && veroItem) {
            for (let i = 0; i < veroBrands.length; i += 1) {
              const veroBrand = veroBrands[i].toLowerCase();
              if (!title?.toLowerCase().includes(veroBrand) && !brand?.toLowerCase().includes(veroBrand)) {
                await setLocal('product-hunter-logs', `${asin} is not vero`);
                pushProduct = true;
              } else {
                await setLocal('product-hunter-logs', `${asin} is vero`);
                pushProduct = false;
                break;
              }
            }
          }

          if (pushProduct && bestSeller) {
            const bestSellerTag = allProducts[j].querySelector('span[id*="-best-seller-label"]');
            if (bestSellerTag) {
              pushProduct = true;
            } else {
              pushProduct = false;
            }
          }

          if (pushProduct && itemsWithWords) {
            const itemsWithWordsList = itemsWithWords.split('\n');
            for (let i = 0; i < itemsWithWordsList.length; i += 1) {
              const word = itemsWithWordsList[i].toLowerCase();
              if (!title?.toLowerCase().includes(word) && !brand?.toLowerCase().includes(word)) {
                await setLocal('product-hunter-logs', `${asin} contains some words`);
                pushProduct = true;
              } else {
                await setLocal('product-hunter-logs', `${asin} contains some words`);
                pushProduct = false;
                break;
              }
            }
          }

          if (pushProduct) {
            // Validate that we have essential data before saving
            if (!title || !price || !asin || !imageLink) {
              await setLocal('product-hunter-logs', `${asin} missing essential data - title: ${!!title}, price: ${!!price}, image: ${!!imageLink}, skipping`);
              continue;
            }
            
            let productLink = `https://www.amazon.com/dp/${asin}`;
            if (domain === 'UK') {
              productLink = `https://www.amazon.co.uk/dp/${asin}`;
            }

            const scrappedProduct = {
              originalTitle: titles[i],
              amazonImageLink: imageLink,
              amazonTitle: title,
              amazonPrice: price,
              amazonReviews: floatReviews,
              amazonRating: parseFloat(rating) || 0, // Add rating to scraped data
              amazonProductLink: productLink,
              scrappedAt: new Date(),
              asin,
              brand
            };
            // scrappedProducts.push(scrappedProduct);
            const previousScrappedProducts = await getLocal(`amazon-hunted-products-${userId}`);
            if (previousScrappedProducts?.length) {
              previousScrappedProducts.push(scrappedProduct);

              const uniqueProducts = uniqBy(previousScrappedProducts, 'asin');
              await setLocal(`amazon-hunted-products-${userId}`, uniqueProducts);
            } else {
              await setLocal(`amazon-hunted-products-${userId}`, [scrappedProduct]);
            }

            productsFetched += 1;
            console.log('\n productsFetched + 1', productsFetched);
          }
        }

        await setLocal('single-title-fetch-limit', productsFetched);

        // Check if we've reached the limit before looking for next page
        const remainingProducts = resultFetchLimit - productsFetched;
        console.log('\n remainingProducts', remainingProducts);
        
        let nextPage;
        if (remainingProducts > 0) {
          nextPage = document.querySelector('a[aria-label*="next page"]');
        } else {
          console.log(`\n Reached user limit of ${resultFetchLimit} products. Not looking for next page.`);
        }

        // If we've reached the limit, stop completely regardless of next page availability
        if (resultFetchLimit && productsFetched >= resultFetchLimit) {
          console.log(`\n SCRAPING COMPLETE: Fetched ${productsFetched} products (limit: ${resultFetchLimit})`);
          await setLocal('single-title-fetch-limit', 0);
          return;
        }
        
        if (nextPage) {
          console.log('\n next page available', nextPage);
          const nextPageLink = nextPage.href;
          console.log('\n nextPageLink', nextPageLink);
          window.location.href = nextPageLink;
          return;
        } else {
          const newtitleArray = titles.slice(i + 1, titles.length);
          if (newtitleArray.length) {
            await setLocal('product-hunter-titles', newtitleArray);
            const domain = await getLocal(`selected-domain-${userId}`);

            let amazonLink = 'https://www.amazon.com';
            let marketplaceId = 'ATVPDKIKX0DER';
            if (domain === 'UK') {
              amazonLink = 'https://www.amazon.co.uk';
              marketplaceId = 'A3P5ROKL5A1OLE';
            }
            amazonLink += `/s?k=${encodeURIComponent(newtitleArray[0])}`;

            if (amazonIsSeller) {
              amazonLink += `&rh=p_6:${marketplaceId}`;
            }
            if (highestReviewed) {
              amazonLink += 's=review-rank';
            }

            let percentageValue = percentage + percentageValueToAdd;
            if (!percentage) percentageValue = percentageValueToAdd;

            await setLocal(`result-percentage-${userId}`, percentageValue);
            await setLocal('single-title-fetch-limit', 0);
            window.location.href = amazonLink;
          } else {
            // close the tab
            let percentageValue = percentage + percentageValueToAdd;
            if (!percentage) percentageValue = percentageValueToAdd;

            await setLocal('single-title-fetch-limit', 0);
            await setLocal(`result-percentage-${userId}`, percentageValue);
            await setLocal(`result-percentage-add-value-${userId}`, 0);
            await setLocal(`run-script-${userId}`, false);

            console.log('\n now closing the tab');
            await chrome.runtime.sendMessage({
              callback: 'closeTab'
            });

            return;
          }
        }
      }

      await setLocal('single-title-fetch-limit', 0);
      await setLocal(`result-percentage-${userId}`, 100);
      await setLocal(`result-percentage-add-value-${userId}`, 0);
      await setLocal(`run-script-${userId}`, false);
    }
  }
};

// URL Scraping Callback Functions
const debugAmazonPage = async (payload) => {
  console.log('🔍 Debug Amazon Page called');
  return amazonScraper.debugAmazonPage();
};

const scrapeAmazonProducts = async (payload) => {
  console.log('🚀 Scrape Amazon Products called');
  const { maxProducts = 20 } = payload || {};
  return await amazonScraper.scrapeAmazonProducts(maxProducts);
};

const stopAmazonScraping = async (payload) => {
  console.log('🛑 Stop Amazon Scraping called');
  return amazonScraper.stopScraping();
};

// Export callback functions
export {
  AmazonProductHunter,
  updateTitle,
  debugAmazonPage,
  scrapeAmazonProducts,
  stopAmazonScraping
};

// Test function to verify content script is working
export const testContentScript = () => {
  console.log('✅ Content script test function called successfully!');
  return { success: true, message: 'Content script is working!' };
};
