import { createRoot } from 'react-dom/client';

import ProductPageIconsDataBox from '../../components/Ebay/AllProductsPageDatabox';
import ScrapEbayPages from '../../components/Ebay/ScrapEbayPages';

import { sleep } from '../../services/utils';
import { getLocal } from '../../services/dbService';

const ShowDataBox = ({
  visibleProduct,
  storeName,
  productId,
  dataToBeCopied
}) => {
  const newDiv = document.createElement('div');
  newDiv.id = 'main-product-info-div';

  const root = createRoot(newDiv);

  root.render(<ProductPageIconsDataBox
    storeName={storeName}
    productId={productId}
    dataToBeCopied={dataToBeCopied}
  />);

  visibleProduct?.insertAdjacentElement('afterend', newDiv);
};

export const removeCurrencySymbol = (amount) => {
  const regex = /[\$\€\£\¥\₹\₽\₩\¢\₫]/g;
  const filtered = amount.replace(regex, '').trim();
  return parseFloat(filtered);
};

(async () => {
  try {
    await sleep(3);
    console.log('\n *** Ebay Product Page Script Running ***');
    console.log('Current URL:', document.URL);

    // Add message listener for manual extraction triggers
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('Content script received message:', message);
      
      if (message.action === 'ping') {
        console.log('Ping received, responding...');
        sendResponse({ 
          success: true, 
          message: 'Content script is running',
          url: document.URL,
          timestamp: message.data.timestamp
        });
        return true;
      }
      
      if (message.action === 'triggerExtraction') {
        console.log('Manual extraction triggered:', message.data);
        
        // Find the ScrapEbayPages component and trigger extraction
        const extractButton = document.querySelector('#extract-titles-dev');
        if (extractButton) {
          console.log('Found extract button, clicking...');
          extractButton.click();
          sendResponse({ success: true, message: 'Extraction started' });
        } else {
          console.log('Extract button not found');
          sendResponse({ success: false, message: 'Extract button not found' });
        }
        return true; // Keep the message channel open for async response
      }
    });

    const response = await chrome.runtime.sendMessage({
      callback: 'checkUser'
    });

    if (response.success) {
      console.log('User check successful, proceeding with script...');
      
      // Wait a bit more for DOM to be fully loaded
      await sleep(2);

      // Robust product detection across various eBay layouts
      let allProducts = [];
      const productSelectors = [
        'li.s-item:not([articlecovered])',
        'li[id*="item"]:not([articlecovered])',
        '.srp-results .s-item:not([articlecovered])',
        '[data-testid*="item"]:not([articlecovered])',
        '.srp-item:not([articlecovered])',
        '.s-item__wrapper:not([articlecovered])'
      ];
      for (const selector of productSelectors) {
        const found = document.querySelectorAll(selector);
        if (found && found.length > 0) {
          allProducts = found;
          console.log(`Found ${found.length} products using selector: ${selector}`);
          break;
        }
      }
      if (!allProducts || allProducts.length === 0) {
        allProducts = document.querySelectorAll('[class*="s-item"], [id*="item"], [class*="srp-item"]');
        console.log(`Fallback product detection found ${allProducts.length} elements`);
      }
      console.log('Found products:', allProducts.length);

      const currentUrl = document.URL;
    
    // Handle store pages (/str/)
    if (currentUrl?.includes('/str/')) {
      console.log('Store page detected:', currentUrl);
      const storeName = currentUrl.split('/str/')[1]?.split('?')[0]?.split('/')[0];
      console.log('Store name extracted:', storeName);
      
      if (storeName) {
        // Try multiple selectors to find a visible section to add the button
        let storeHeader = document.querySelector('.str-header__store-info') || 
                         document.querySelector('.str-header__store-details') ||
                         document.querySelector('[class*="store-info"]') ||
                         document.querySelector('[class*="store-details"]') ||
                         document.querySelector('.str-header__content') ||
                         document.querySelector('.str-header__main') ||
                         document.querySelector('[class*="str-header"]:not(.str-header__banner)') ||
                         document.querySelector('.str-header') ||
                         document.querySelector('main') ||
                         document.querySelector('header') ||
                         document.body;
        
        console.log('Store header element found:', storeHeader);
        
        if (storeHeader) {
          const buttonDiv = document.createElement('div');
          buttonDiv.style.cssText = 'margin: 15px 0; padding: 10px 15px; background: #f8f9fa; border: 2px solid #007cba; border-radius: 6px; display: inline-block; position: relative; z-index: 1000; box-shadow: 0 2px 4px rgba(0,0,0,0.1);';
          
          const button = document.createElement('button');
          button.textContent = "All Seller's Sold Items";
          button.style.cssText = 'background: #007cba; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);';
          button.onclick = async () => {
            // Always respect the current country domain the user is on
            // Fallback to https://www.ebay.com if origin is not an eBay domain
            const origin = (window.location && window.location.origin) || '';
            const ebayLink = origin.includes('ebay.') ? origin.replace('http:', 'https:') : 'https://www.ebay.com';
            window.open(`${ebayLink}/sch/i.html?_dkr=1&_fsrp=1&iconV2Request=true&_blrs=recall_filtering&_ssn=${storeName}&_ipg=240&_oac=1&LH_Sold=1`, '_blank');
          };
          
          buttonDiv.appendChild(button);
          storeHeader.appendChild(buttonDiv);
          console.log('Button added to store page');
        } else {
          console.log('No store header element found');
        }
      } else {
        console.log('Could not extract store name from URL');
      }
    }
    
    // Handle search pages (existing logic)
    if (currentUrl?.includes('store_name=') || currentUrl?.includes('_ssn=')) {
      console.log('Search page detected, looking for insertion point...');

      const findInsertionPoint = () => {
        const candidates = [
          'div.str-search-wrap',
          '#srp-river-header',
          '.srp-controls',
          '.srp-controls__control',
          '.srp-rail__left',
          '.x-hero__header',
          '#mainContent .srp-controls__control',
          '#mainContent .srp-controls',
          '#mainContent'
        ];
        for (const sel of candidates) {
          const el = document.querySelector(sel);
          if (el) {
            console.log('Insertion candidate found:', sel);
            return el;
          }
        }
        return null;
      };

      const containerExists = !!document.getElementById('scrap-ebay-div');
      const target = findInsertionPoint();
      if (!containerExists && target) {
        const newDiv = document.createElement('div');
        newDiv.id = 'scrap-ebay-div';
        const root = createRoot(newDiv);
        root.render(<ScrapEbayPages document={document} ebayProducts={allProducts} />);

        // Prefer placing right after target for consistent layout
        target.insertAdjacentElement('afterend', newDiv);
        console.log('ScrapEbayPages inserted after best candidate');
      } else if (!containerExists) {
        // Safe default: top of main content, no fixed-position fallback
        const main = document.querySelector('#mainContent') || document.body;
        const newDiv = document.createElement('div');
        newDiv.id = 'scrap-ebay-div';
        const root = createRoot(newDiv);
        root.render(<ScrapEbayPages document={document} ebayProducts={allProducts} />);
        main.insertAdjacentElement('afterbegin', newDiv);
        console.log('ScrapEbayPages inserted at top of main content as safe default');
      }
    }

    for (let i = 0; i < allProducts.length; i += 1) {
      try {
        const visibleProduct = allProducts[i];
        if (!visibleProduct) {
          console.log('Skipping undefined product at index:', i);
          continue;
        }
        
        let sellerIdSpan = visibleProduct.querySelector('span[class*="s-item__seller-info"]');
        if (!sellerIdSpan) {
          const wrapper = visibleProduct.querySelector('div[class*="s-item__wrapper"]');
          if (wrapper) {
            sellerIdSpan = wrapper.querySelector('div[class*="s-item__info"]');
          }
        }
        if (document.querySelector('ul.srp-list')) {
          sellerIdSpan = visibleProduct.querySelector('div[class*="s-item__details"]');
          console.log("NEW SELLER ID", sellerIdSpan);
        }

        if (!sellerIdSpan) {
          console.log('No seller ID span found for product at index:', i);
          continue;
        }

        // Align with selectors using lower-case attribute
        visibleProduct?.setAttribute('articlecovered', 'true');

      let storeName = visibleProduct.querySelector('span[class="s-item__seller-info-text"]')?.innerText;
      if (storeName) {
        storeName = storeName.split(' (')[0];
      } else {
        let productDetailPageLink =
          visibleProduct.querySelector('a[class*="s-item__link"]')?.href ||
          visibleProduct.querySelector('a[href*="/itm/"]')?.href ||
          visibleProduct.querySelector('a[href*="/p/"]')?.href ||
          null;
        if (productDetailPageLink) {
          // Normalize to current country origin to avoid CORS (e.g., keep on .co.uk when browsing UK)
          try {
            const currentOrigin = (window.location && window.location.origin ? window.location.origin : 'https://www.ebay.com').replace('http:', 'https:');
            let url = new URL(productDetailPageLink, currentOrigin);
            if (url.origin !== currentOrigin) {
              url = new URL(url.pathname + url.search, currentOrigin);
            }
            productDetailPageLink = url.toString();
          } catch (_e) {
            // ignore normalization errors and use original link
          }
          try {
            const resp = await chrome.runtime.sendMessage({
              callback: 'fetchHtml',
              payload: { url: productDetailPageLink }
            });
            if (resp?.success && resp?.data) {
              const htmlData = new DOMParser().parseFromString(resp.data, 'text/html');
              const sellerCardInfoDiv = htmlData.querySelector('div[class="x-sellercard-atf__info"]');
              if (sellerCardInfoDiv) {
                storeName = sellerCardInfoDiv.querySelector('span[class*="ux-textspans"]')?.innerText;
              }
            }
          } catch (fetchError) {
            console.log('Error fetching product detail page via background:', fetchError);
            storeName = 'Unknown Seller';
          }
        } else {
          storeName = 'Unknown Seller';
        }
      }

      let productDetailLink =
        visibleProduct.querySelector('a[class*="s-item__link"]')?.href ||
        visibleProduct.querySelector('a[href*="/itm/"]')?.href ||
        visibleProduct.querySelector('a[href*="/p/"]')?.href ||
        visibleProduct.querySelector('a')?.href ||
        null;
      if (!productDetailLink) {
        console.log('No product detail link found for product at index:', i);
        continue;
      }
      
      // More robust product ID extraction
      let productId = null;
      try {
        const patterns = [
          /\/itm\/([0-9]{7,15})\b/i,
          /[?&]item=([0-9]{7,15})\b/i,
          /\/p\/([0-9]{7,15})\b/i,
          /\/itm\/.*?\/([0-9]{7,15})\b/i,
          /\/(\d{7,15})(?:\?|\b)/
        ];
        for (const rx of patterns) {
          const m = productDetailLink.match(rx);
          if (m && m[1]) { productId = m[1]; break; }
        }
        if (!productId) {
          const possibleAttrs = ['data-itemid', 'data-id', 'data-listingid', 'data-epid'];
          for (const attr of possibleAttrs) {
            const val = visibleProduct.getAttribute(attr);
            if (val && /\d{7,15}/.test(val)) { productId = (val.match(/\d{7,15}/) || [null])[0]; break; }
          }
        }
        if (!productId) {
          // Fallback stable hash avoids generic placeholders; do not depend on later variables
          const snippet = (visibleProduct?.innerText || '').slice(0, 64);
          const stable = (productDetailLink || '') + '|' + snippet;
          let h = 0; for (let j = 0; j < stable.length; j += 1) { h = (h * 31 + stable.charCodeAt(j)) >>> 0; }
          productId = `url:${h}`;
        }
      } catch (_) {
        productId = `url:${Math.random().toString(36).slice(2)}`;
      }

      let title = visibleProduct.querySelector('div[class="s-item__title"]')?.innerText
        || visibleProduct.querySelector('h3[class*="s-item__title"]')?.innerText
        || visibleProduct.querySelector('span[role="heading"]')?.innerText
        || visibleProduct.querySelector('[class*="title"]')?.innerText
        || visibleProduct.querySelector('a[role="heading"]')?.innerText
        || visibleProduct.querySelector('h3, h2, h4')?.innerText
        || 'No Title';
      const priceDiv = visibleProduct.querySelector('span[class="s-item__price"]')
        || visibleProduct.querySelector('[data-testid="price"], .x-price-primary .ux-textspans, span.ux-textspans--BOLD');
      let price = '0';
      if (priceDiv) {
        const priceElements = priceDiv.querySelectorAll('.POSITIVE');
        if (priceElements.length) {
          price = priceElements[priceElements.length - 1]?.innerText || '0';
        } else {
          price = priceDiv.innerText || '0';
        }
        price = removeCurrencySymbol(price);
      }

      let imageLink = visibleProduct.querySelector('img')?.src
        || visibleProduct.querySelector('img[data-src]')?.getAttribute('data-src')
        || visibleProduct.querySelector('img[data-async-src]')?.getAttribute('data-async-src')
        || visibleProduct.querySelector('source[srcset]')?.getAttribute('srcset')?.split(' ')[0]
        || '';
      const isProductSponsored = visibleProduct.querySelector('span[data-w="pSnosroed"]') ? true : false;
      let soldAt = visibleProduct.querySelector('span[class*="s-item__caption--signal"]')?.innerText || '';
      if (soldAt) {
        soldAt = soldAt.split('Sold ')[1] || '';
      }

      // Backfill missing fields by fetching product detail page if necessary
      try {
        const needsDetail = !title || title === 'No Title' || !price || Number(price) === 0 || !imageLink || !storeName || storeName === 'Unknown Seller';
        if (needsDetail && productDetailLink) {
          // Normalize link to current country origin
          let normalizedLink = productDetailLink;
          try {
            const currentOrigin = (window.location && window.location.origin ? window.location.origin : 'https://www.ebay.com').replace('http:', 'https:');
            let url = new URL(productDetailLink, currentOrigin);
            if (url.origin !== currentOrigin) {
              url = new URL(url.pathname + url.search, currentOrigin);
            }
            normalizedLink = url.toString();
          } catch (_) {}

          const resp = await chrome.runtime.sendMessage({
            callback: 'fetchHtml',
            payload: { url: normalizedLink }
          });
          if (resp?.success && (resp?.html || resp?.data)) {
            const htmlText = resp.html || resp.data;
            const pd = new DOMParser().parseFromString(htmlText, 'text/html');

            if (!title || title === 'No Title') {
              title = pd.querySelector('#itemTitle')?.innerText?.replace(/^Details about\s*/i, '').trim()
                || pd.querySelector('h1[itemprop="name"]')?.innerText?.trim()
                || pd.querySelector('h1.x-item-title__mainTitle')?.innerText?.trim()
                || pd.querySelector('h1[data-testid="x-item-title"] .ux-textspans')?.innerText?.trim()
                || title;
            }

            if (!price || Number(price) === 0) {
              const priceText = pd.querySelector('#prcIsum')?.innerText
                || pd.querySelector('#mm-saleDscPrc')?.innerText
                || pd.querySelector('span[itemprop="price"]')?.getAttribute('content')
                || pd.querySelector('div.x-price-primary span.ux-textspans')?.innerText
                || pd.querySelector('span.ux-textspans--BOLD')?.innerText
                || '';
              if (priceText) price = removeCurrencySymbol(String(priceText));
            }

            if (!imageLink) {
              imageLink = pd.querySelector('#icImg')?.src
                || pd.querySelector('img#icImg')?.src
                || pd.querySelector('div.ux-image-carousel img')?.src
                || pd.querySelector('img[src*="i.ebayimg.com"]')?.src
                || pd.querySelector('img[data-src]')?.getAttribute('data-src')
                || pd.querySelector('img[data-async-src]')?.getAttribute('data-async-src')
                || pd.querySelector('source[srcset]')?.getAttribute('srcset')?.split(' ')[0]
                || imageLink;
            }

            if (!storeName || storeName === 'Unknown Seller') {
              const fallbackSeller = pd.querySelector('#RightSummaryPanel .mbg-nw')?.innerText
                || pd.querySelector('a[href*="/usr/"] span.ux-textspans')?.innerText
                || pd.querySelector('a[href*="/usr/"]')?.innerText
                || pd.querySelector('a[href*="/str/"]')?.innerText;
              if (fallbackSeller) storeName = fallbackSeller;
            }
          }
        }
      } catch (_) {}

      const dataToBeCopied = {
        title,
        price,
        sponsored: isProductSponsored ? true : false,
        itemNumber: productId,
        image: imageLink,
        username: storeName
      };

      ShowDataBox({
        visibleProduct: sellerIdSpan,
        storeName,
        productId,
        dataToBeCopied
      });
      } catch (productError) {
        console.error('Error processing product at index:', i, productError);
        continue;
      }
    }
  } else {
    console.log('\n ### User is not logged in or not enable ###');
  }
  } catch (error) {
    console.error('Error in Ebay Product Page Script:', error);
    console.log('Script execution failed, but continuing...');
  }
})();
