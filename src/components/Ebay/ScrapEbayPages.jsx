import moment from 'moment';
import {
  useEffect,
  useState
} from 'react';
import { makeStyles } from '@material-ui/core/styles';
import {
  Button,
  Checkbox,
  Select
} from 'antd';
import { uniqBy, round } from 'lodash';

import {
  getLocal,
  setLocal,
  onChange as onChangeLocalState
} from '../../services/dbService';
import { getCurrencySymbolFromCurrentURL, getCurrencySymbolFromSelectedDomain } from '../../services/currencyUtils';

import './style.css';
import { sleep } from '../../services/utils';
import { removeCurrencySymbol } from '../../content-scripts/ebay/product-page';

const useStyles = makeStyles({
  div1: {
    display: 'flex',
    gap: '5px',
    paddingTop: '15px'
  },
  div2: {
    paddingTop: '15px'
  },
  div3: {
    marginTop: '15px',
    border: '0.5px solid grey',
    width: '405px',
    borderRadius: '5px',
    backgroundColor: '#f9f9f9'
  },
  p1: {
    fontWeight: 'bolder',
    paddingLeft: '12px'
  },
  p2: {
    paddingLeft: '12px'
  },
  select1: {
    paddingLeft: '12px',
    width: '120px',
    marginBottom: '15px'
  }
});

const ScrapEbayPage = ({
  document,
  ebayProducts
}) => {
  const classes = useStyles();

  const { Option } = Select;

  const [getSoldHistory, setGetSoldHistory] = useState('Off');
  const [extractingTitles, setExtractingTitles] = useState(false);
  const [titlesCleared, setTitlesCleared] = useState(false);
  const [totalEbayHuntedProducts, setTotalEbayHuntedProducts] = useState(0);
  const [scrapAllPagesCheckbox, setScrapAllPagesCheckbox] = useState(false);
  const [runByCompetitorSearch, setRunByCompetitorSearch] = useState('false');

  const changeSoldHistory = (soldHistoryObject, day, lastDate, purchaseDate) => {
    let history = soldHistoryObject;
    if (moment(purchaseDate).isAfter(lastDate)) {
      history = {
        ...history,
        [day]: (history[day] || 0) + 1
      };
    } else {
      history = {
        ...history,
        [day]: (history[day] || 0)
      };
    }

    return history;
  };

  const handleEbayExtractTitles = async (currentValue) => {
    try {
      setExtractingTitles(true);
      setTitlesCleared(false);
  
      const currentUserId = await getLocal('current-user');
      const domain = await getLocal(`selected-domain-${currentUserId}`);
      await setLocal(`extract-current-state-${currentUserId}`, currentValue);
  
      const getSoldHistoryCheck = await getLocal(`get-sold-history-check-${currentUserId}`);
      const localEbayHuntedProducts = await getLocal(`ebay-hunted-products-${currentUserId}`);
      let competitorSearchSoldHistory;
      let competitorSearchSoldWithin;
      let competitorSearch = new URLSearchParams(window.location.search);
      competitorSearch = competitorSearch.get('Competitor_Search');
      if (competitorSearch === 'true') {
        competitorSearchSoldHistory = await getLocal('competitor-search-sold-history');
        competitorSearchSoldWithin = await getLocal('competitor-search-sold-within');
      }

      const cookie = document.cookie;
  
      const requestOptions = {
        method: 'GET',
        headers: {
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'accept-language': 'en-US,en;q=0.9',
          'cache-control': 'max-age=0',
          cookie
        },
        redirect: 'follow'
      };
  
      if (currentValue !== 'Stop Extracting Titles') {
        const ebayHuntedProducts = [];
        let scrappingProducts = ebayProducts;

        // Helper to find product nodes using multiple selectors
        const findProductNodes = () => {
          const selectors = [
            'li.s-item:not([articlecovered])',
            '.s-item:not([articlecovered])',
            'li[id*="item"]:not([articlecovered])',
            '.srp-results li.s-item:not([articlecovered])',
            '[data-testid*="item"]:not([articlecovered])',
            '.srp-item:not([articlecovered])',
            '.s-item__wrapper:not([articlecovered])'
          ];
          let best = { nodes: null, count: 0, selector: '' };
          for (const selector of selectors) {
            const found = document.querySelectorAll(selector);
            const count = found ? found.length : 0;
            if (count > best.count) {
              best = { nodes: found, count, selector };
            }
          }
          if (best.count > 0) {
            console.log(`Found ${best.count} products using selector: ${best.selector}`);
            return best.nodes;
          }
          const anchors = Array.from(document.querySelectorAll('a[href*="/itm/"]'));
          const containers = anchors
            .map(a => a.closest('li.s-item') || a.closest('[class*="s-item"]') || a.closest('[role="listitem"]') || a.closest('li') || a.parentElement)
            .filter(Boolean);
          const unique = Array.from(new Set(containers));
          console.log(`Anchor fallback produced ${unique.length} containers`);
          return unique;
        };

        // Wait for products to render (helps when auto-started)
        const waitForProducts = async (minCount = 20, maxWaitMs = 15000) => {
          const start = Date.now();
          let lastCount = 0;
          while (Date.now() - start < maxWaitMs) {
            const found = findProductNodes();
            const count = found?.length || 0;
            if (count >= minCount) return found;
            if (count > lastCount) lastCount = count;
            try { window.scrollTo(0, Math.min(document.body.scrollHeight, 4000)); } catch (_) {}
            await sleep(0.5);
          }
          return findProductNodes();
        };

        try {
          scrappingProducts = await waitForProducts(20, 15000);
        } catch (scanErr) {
          console.log('DOM scan failed, will use provided products prop if available:', scanErr?.message);
        }
        
        if (!scrappingProducts || scrappingProducts.length === 0) {
          console.log('No products found to process');
          setExtractingTitles(false);
          return;
        }

        // Apply optional max-items limit from settings (0 = unlimited)
        const maxItemsSetting = (await getLocal('competitor-search-limit')) || 0;
        const maxCount = Number.isFinite(Number(maxItemsSetting)) && Number(maxItemsSetting) > 0
          ? Number(maxItemsSetting)
          : scrappingProducts.length;

        // Initialize live progress for competitor search (if applicable)
        const qsForSeller = new URLSearchParams(window.location.search);
        const currentSellerQS = qsForSeller.get('_ssn') || qsForSeller.get('store_name') || '';
        try {
          await setLocal('competitor-search-progress', {
            seller: currentSellerQS,
            processed: 0,
            total: Math.min(scrappingProducts.length, maxCount),
            percent: 0
          });
        } catch (_) {}

        console.log(`Starting to process ${Math.min(scrappingProducts.length, maxCount)} of ${scrappingProducts.length} products...`);
        for (let i = 0; i < Math.min(scrappingProducts.length, maxCount); i += 1) {
          try {
            console.log(`Processing product ${i + 1}/${scrappingProducts.length}...`);
            const visibleProduct = scrappingProducts[i];
            if (!visibleProduct) {
              console.log('Skipping undefined product at index:', i);
              continue;
            }

            let soldAt1 = visibleProduct.querySelector('span[class*="s-item__caption--signal"]')?.innerText || '';
            if (soldAt1) {
              soldAt1 = soldAt1.split('Sold ')[1];
            }

            if (competitorSearchSoldWithin) {
              try {
                const date = moment().subtract(competitorSearchSoldWithin, 'days').toDate();
                if (soldAt1) {
                  // Try multiple date formats that eBay might use
                  let soldDate;
                  const formats = ['DD MMM YYYY', 'D MMM YYYY', 'MMM DD, YYYY', 'YYYY-MM-DD'];
                  for (const format of formats) {
                    soldDate = moment(soldAt1, format, true);
                    if (soldDate.isValid()) break;
                  }
                  
                  if (!soldDate || !soldDate.isValid()) {
                    console.log('Could not parse sold date:', soldAt1);
                    continue;
                  }
                  
                  if (soldDate.isAfter(date)) {
                    // do nothing
                  } else {
                    continue;
                  }
                }
              } catch (dateError) {
                console.log('Error processing date for product at index:', i, dateError);
                continue;
              }
            }

            let sellerIdSpan = visibleProduct.querySelector('span[class*="s-item__seller-info"]');
            if (!sellerIdSpan) {
              const wrapper = visibleProduct.querySelector('div[class*="s-item__wrapper"]');
              if (wrapper) {
                sellerIdSpan = wrapper.querySelector('div[class*="s-item__info"]');
              }
            }
          // Mark as processed using lower-case attribute to match selectors
          try { visibleProduct?.setAttribute('articlecovered', 'true'); } catch (_) {}
  
          let storeName = visibleProduct.querySelector('span[class="s-item__seller-info-text"]')?.innerText;
          if (storeName) {
            storeName = storeName.split(' (')[0];
          } else {
            const rawLink = visibleProduct.querySelector('a[class="s-item__link"]')?.href;
            if (rawLink) {
              try {
                // Normalize to current country origin to avoid cross-origin redirects
                let normalizedLink = rawLink;
                try {
                  const currentOrigin = (window.location && window.location.origin ? window.location.origin : 'https://www.ebay.com').replace('http:', 'https:');
                  let url = new URL(rawLink, currentOrigin);
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
                  const htmlData = new DOMParser().parseFromString(htmlText, 'text/html');
                const sellerCardInfoDiv = htmlData.querySelector('div[class="x-sellercard-atf__info"]');
                storeName = sellerCardInfoDiv?.querySelector('span[class*="ux-textspans"]')?.innerText || 'Unknown Seller';
                } else {
                  storeName = 'Unknown Seller';
                }
              } catch (fetchError) {
                console.log('Failed to fetch seller name from product page (bg):', fetchError);
                storeName = 'Unknown Seller';
              }
            } else {
              storeName = 'Unknown Seller';
            }
          }
  
          // Fast fallback for seller/store pages: use query params or page header
          try {
            if (!storeName || storeName === 'Unknown Seller') {
              const qs = new URLSearchParams(window.location.search);
              const qpSeller = qs.get('_ssn') || qs.get('store_name');
              const headerSeller = document.querySelector('a[href*="/usr/"] span.ux-textspans')?.innerText
                || document.querySelector('a[href*="/usr/"]')?.innerText
                || document.querySelector('a[href*="/str/"]')?.innerText;
              const fallback = qpSeller || headerSeller;
              if (fallback) storeName = fallback;
            }
          } catch (_) {}
  
            // Prefer canonical item link; fall back to any item link inside the card
            let productDetailLink = visibleProduct.querySelector('a[class*="s-item__link"]')?.href
              || visibleProduct.querySelector('a[href*="/itm/"]')?.href
              || visibleProduct.querySelector('a[href*="item="]')?.href
              || visibleProduct.querySelector('a')?.href;
          if (!productDetailLink) {
            console.log('No product detail link found for product at index:', i);
            continue;
          }
          
          // Robust item ID extraction from multiple URL and DOM patterns
          let productId = null;
          try {
            const patterns = [
              /\/itm\/([0-9]{7,15})\b/i,
              /[?&]item=([0-9]{7,15})\b/i,
              /\/p\/([0-9]{7,15})\b/i,
              /\/itm\/.*?\/([0-9]{7,15})\b/i
            ];
            for (const rx of patterns) {
              const m = productDetailLink.match(rx);
              if (m && m[1]) { productId = m[1]; break; }
            }
            if (!productId) {
              // Try DOM attributes that sometimes contain numeric IDs
              const possibleAttrs = ['data-itemid', 'data-id', 'data-listingid', 'data-epid'];
              for (const attr of possibleAttrs) {
                const val = visibleProduct.getAttribute(attr);
                if (val && /\d{7,15}/.test(val)) { productId = (val.match(/\d{7,15}/) || [null])[0]; break; }
              }
            }
            if (!productId) {
              // Fallback: generate a stable hash from URL and nearby DOM text (avoid later variables)
              const snippet = (visibleProduct?.innerText || '').slice(0, 64);
              const stable = (productDetailLink || '') + '|' + snippet;
              let h = 0; for (let j = 0; j < stable.length; j += 1) { h = (h * 31 + stable.charCodeAt(j)) >>> 0; }
              productId = `url:${h}`;
            }
          } catch (_) {
            // As ultimate fallback
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
          }
          const priceWithoutSymbol = removeCurrencySymbol(price);
          
          // Get currency symbol based on current page URL or selected domain
          const currencyFromURL = getCurrencySymbolFromCurrentURL();
          const currencyFromDomain = getCurrencySymbolFromSelectedDomain(domain);
          
          // Use URL-based currency if available, otherwise use domain setting
          const currency = currencyFromURL || currencyFromDomain;
          
          let bePrice = null;
          if (domain === 'USA') {
            // Item List Price + 12.9% + $0.55 for USA
            bePrice = `${currency}${round(priceWithoutSymbol - priceWithoutSymbol * 12.9 * 0.01 + 0.55, 2)}`;
          } else {
            // Item List Price + 9.48% + £0.36 + £0.12 (or equivalent for other currencies)
            bePrice = `${currency}${round(priceWithoutSymbol - priceWithoutSymbol * 9.48 * 0.01 + 0.36 + 0.12, 2)}`;
          }
  
          let imageLink = visibleProduct.querySelector('img')?.src
            || visibleProduct.querySelector('img[data-src]')?.getAttribute('data-src')
            || visibleProduct.querySelector('img[data-async-src]')?.getAttribute('data-async-src')
            || visibleProduct.querySelector('source[srcset]')?.getAttribute('srcset')?.split(' ')[0];
  
          let soldAt = visibleProduct.querySelector('span[class*="s-item__caption--signal"]')?.innerText
            || visibleProduct.querySelector('span.s-item__hotness')?.innerText
            || visibleProduct.querySelector('span[aria-label*="sold" i]')?.getAttribute('aria-label')
            || '';
          if (soldAt) {
            soldAt = soldAt.split('Sold ')[1];
          }

          // Backfill missing fields (title/price/image/seller/soldAt) by fetching product detail and purchase history if necessary
          try {
            const needsDetail = !title || title === 'No Title' || !price || price === '0' || !imageLink || !storeName || storeName === 'Unknown Seller' || !soldAt;
            if (needsDetail && productDetailLink) {
              let normalizedDetailLink = productDetailLink;
              try {
                const currentOrigin = (window.location && window.location.origin ? window.location.origin : 'https://www.ebay.com').replace('http:', 'https:');
                let url = new URL(productDetailLink, currentOrigin);
                if (url.origin !== currentOrigin) {
                  url = new URL(url.pathname + url.search, currentOrigin);
                }
                normalizedDetailLink = url.toString();
              } catch (_) {}

              const respDetail = await chrome.runtime.sendMessage({
                callback: 'fetchHtml',
                payload: { url: normalizedDetailLink }
              });
              if (respDetail?.success && (respDetail?.html || respDetail?.data)) {
                const htmlTextDetail = respDetail.html || respDetail.data;
                const pd = new DOMParser().parseFromString(htmlTextDetail, 'text/html');

                if (!title || title === 'No Title') {
                  title = pd.querySelector('#itemTitle')?.innerText?.replace(/^Details about\s*/i, '').trim()
                    || pd.querySelector('h1[itemprop="name"]')?.innerText?.trim()
                    || pd.querySelector('h1.x-item-title__mainTitle')?.innerText?.trim()
                    || pd.querySelector('h1[data-testid="x-item-title"] .ux-textspans')?.innerText?.trim()
                    || title;
                }

                if (!price || price === '0') {
                  const priceText = pd.querySelector('#prcIsum')?.innerText
                    || pd.querySelector('#mm-saleDscPrc')?.innerText
                    || pd.querySelector('span[itemprop="price"]')?.getAttribute('content')
                    || pd.querySelector('div.x-price-primary span.ux-textspans')?.innerText
                    || pd.querySelector('span.ux-textspans--BOLD')?.innerText
                    || price;
                  if (priceText) price = priceText;
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

              // If soldAt still missing, try purchase history page to get last sold date
              if (!soldAt && productId) {
                let ebayLink = 'https://www.ebay.com';
                if (domain === 'UK') ebayLink = 'https://www.ebay.co.uk';
                try {
                  let respHist = await fetch(`${ebayLink}/bin/purchaseHistory?item=${productId}`, requestOptions);
                  respHist = await respHist.text();
                  const ph = new DOMParser().parseFromString(respHist, 'text/html');
                  const firstRow = ph?.querySelector('table.app-table__table tr.app-table__row');
                  if (firstRow) {
                    const cells = firstRow.querySelectorAll('td');
                    // Attempt to find a date-like cell
                    let dateCellText = '';
                    for (let c = 0; c < cells.length; c += 1) {
                      const txt = cells[c].innerText || '';
                      if (/\d{1,2}\s+[A-Za-z]{3}\s+\d{4}/.test(txt) || /\d{4}-\d{2}-\d{2}/.test(txt) || /[A-Za-z]{3}\s+\d{1,2},\s*\d{4}/.test(txt)) {
                        dateCellText = txt;
                        break;
                      }
                    }
                    if (dateCellText) {
                      soldAt = dateCellText;
                    }
                  }
                } catch (_) {}
              }
            }
          } catch (_) {}

          // Recompute breakeven price if price was updated
          try {
            const priceWithoutSymbol2 = removeCurrencySymbol(price);
            if (domain === 'USA') {
              bePrice = `${currency}${round(priceWithoutSymbol2 - priceWithoutSymbol2 * 12.9 * 0.01 + 0.55, 2)}`;
            } else {
              bePrice = `${currency}${round(priceWithoutSymbol2 - priceWithoutSymbol2 * 9.48 * 0.01 + 0.36 + 0.12, 2)}`;
            }
          } catch (_) {}

          // Update live progress after processing this item
          try {
            const processedNow = i + 1;
            const totalNow = Math.min(scrappingProducts.length, maxCount);
            await setLocal('competitor-search-progress', {
              seller: currentSellerQS,
              processed: processedNow,
              total: totalNow,
              percent: Math.round((processedNow / totalNow) * 100)
            });
          } catch (_) {}

          let pushProduct = true;
          if (competitorSearchSoldWithin) {
            const date = moment().subtract(competitorSearchSoldWithin, 'days').toDate();
            if (soldAt) {
              // Try multiple date formats that eBay might use
              let soldDate;
              const formats = ['DD MMM YYYY', 'D MMM YYYY', 'MMM DD, YYYY', 'YYYY-MM-DD'];
              for (const format of formats) {
                soldDate = moment(soldAt, format, true);
                if (soldDate.isValid()) break;
              }
              
              if (soldDate && soldDate.isValid() && soldDate.isAfter(date)) {
                // do nothing
              } else {
                pushProduct = false;
              }
            }
          }
  
          let quantity = 0;
          let soldHistory = {};

          if (((getSoldHistoryCheck && competitorSearch !== 'true') || (competitorSearchSoldHistory && competitorSearch === 'true')) && productId) {
            const last1Day = moment().subtract(1, 'day').toDate();
            const last3Days = moment().subtract(3, 'days').toDate();
            const last7Days = moment().subtract(7, 'days').toDate();
            const last14Days = moment().subtract(14, 'days').toDate();
            const last30Days = moment().subtract(30, 'days').toDate();
            const last60Days = moment().subtract(60, 'days').toDate();
            const last90Days = moment().subtract(90, 'days').toDate();

            let ebayLink = 'https://www.ebay.com';
            if (domain === 'UK') {
              ebayLink = 'https://www.ebay.co.uk';
            }
  
            let response;
            try {
              response = await fetch(`${ebayLink}/bin/purchaseHistory?item=${productId}`, requestOptions);
            } catch (error) {
              await sleep(2);
              response = await fetch(`${ebayLink}/bin/purchaseHistory?item=${productId}`, requestOptions);
            }

            response = await response.text();
            const htmlData = new DOMParser().parseFromString(response, 'text/html');
  
            const table = htmlData?.querySelector('table.app-table__table');
            const tableHeader = table?.querySelector('tr.app-table__header-row');
            const allTablesHeaderCells = tableHeader?.querySelectorAll('th');
            let quantityCellIndex = 0;
            let dateOfPurchaseIndex = 0;

            for (let k = 0; k < allTablesHeaderCells?.length; k += 1) {
              if (allTablesHeaderCells[k].innerText.toLowerCase() === 'quantity') {
                quantityCellIndex = k;
              } else if (allTablesHeaderCells[k].innerText.toLowerCase().includes('purchase')) {
                dateOfPurchaseIndex = k;
              }
            }
  
            const allRows = table?.querySelectorAll('tr.app-table__row');
  
            for (let i = 0; i < allRows?.length; i += 1) {
              const quan = allRows[i].querySelectorAll('td')[quantityCellIndex].innerText;
              let dateOfPurchase = allRows[i].querySelectorAll('td')[dateOfPurchaseIndex].innerText;
              const format = 'DD MMM YYYY [at] h:mm:ssa [GMT]';

              dateOfPurchase = moment(dateOfPurchase, format).toDate();
              soldHistory = changeSoldHistory(soldHistory, '1', last1Day, dateOfPurchase);
              soldHistory = changeSoldHistory(soldHistory, '3', last3Days, dateOfPurchase);
              soldHistory = changeSoldHistory(soldHistory, '7', last7Days, dateOfPurchase);
              soldHistory = changeSoldHistory(soldHistory, '14', last14Days, dateOfPurchase);
              soldHistory = changeSoldHistory(soldHistory, '30', last30Days, dateOfPurchase);
              soldHistory = changeSoldHistory(soldHistory, '60', last60Days, dateOfPurchase);
              soldHistory = changeSoldHistory(soldHistory, '90', last90Days, dateOfPurchase);

              quantity += Number(quan);
            }
  
            const product = ebayHuntedProducts.find(product => product.itemNumber === productId);
            if (product) {
              product.totalSold = quantity;
            }
            await sleep(1);
          }
  
          if (pushProduct) {
            const scrappedProduct = {
              image: imageLink,
              title,
              price,
              breakevenPrice: bePrice,
              soldAt,
              itemNumber: productId,
              sellerName: storeName,
              soldHistory,
              totalSold: quantity
            };
              // scrappedProducts.push(scrappedProduct);
            const previousScrappedProducts = await getLocal(`ebay-hunted-products-${currentUserId}`);
            if (previousScrappedProducts?.length) {
              previousScrappedProducts.push(scrappedProduct);
  
              const uniqueProducts = uniqBy(previousScrappedProducts, 'itemNumber');
              await setLocal(`ebay-hunted-products-${currentUserId}`, uniqueProducts);
              console.log(`✅ Successfully saved product ${productId} to storage. Total products: ${uniqueProducts.length}`);
            } else {
              await setLocal(`ebay-hunted-products-${currentUserId}`, [scrappedProduct]);
              console.log(`✅ Successfully saved first product ${productId} to storage. Total products: 1`);
            }
  
            const alreadyScrapped = localEbayHuntedProducts?.find(obj => obj.itemNumber === productId);
            if (!alreadyScrapped) {
              ebayHuntedProducts.push({
                image: imageLink,
                title,
                price,
                breakevenPrice: bePrice,
                soldAt,
                itemNumber: productId,
                sellerName: storeName,
                soldHistory
              });
            }
          }

          const getCurrentExtractState = await getLocal(`extract-current-state-${currentUserId}`);
          if (getCurrentExtractState === 'Stop Extracting Titles') {
            await setLocal(`extract-titles-${currentUserId}`, false);
            break;
          }
          } catch (productError) {
            console.log('Error processing product at index:', i, productError);
            continue;
          }
        }
  
        setTotalEbayHuntedProducts(ebayHuntedProducts?.length || 0);
        // const allProducts = [...ebayHuntedProducts, ...localEbayHuntedProducts || []];
        // await setLocal(`ebay-hunted-products-${currentUserId}`, uniqueProducts);
        setExtractingTitles(false);
        
        // Ensure all data is saved before proceeding
        console.log('Extraction completed, ensuring data is saved...');
        await sleep(1);
  
        const scrapAllPages = await getLocal(`scrap-all-pages-${currentUserId}`);
        const shouldPaginate = document.URL.includes('store_name=') || document.URL.includes('_ssn=');
        if (currentValue !== 'Stop Extracting Titles' && scrapAllPages && shouldPaginate) {
          await setLocal(`extract-titles-${currentUserId}`, true);
          const nextPageAvailable = document.querySelector('a[class*="pagination__next"]');
  
          if (nextPageAvailable) {
            nextPageAvailable.click();
          } else {
            await setLocal(`extract-titles-${currentUserId}`, false);
          }
        } else {
          await setLocal(`extract-titles-${currentUserId}`, false);
        }

        console.log('~ handleEbayExtractTitles ~ runByCompetitorSearch:', runByCompetitorSearch);

        let competitorSearch = new URLSearchParams(window.location.search);
        competitorSearch = competitorSearch.get('Competitor_Search');
        if (runByCompetitorSearch || competitorSearch === 'true') {
          console.log('\n seller done');
          
          // Add delay to ensure data is saved before closing
          console.log('Waiting 3 seconds for data to be saved...');
          await sleep(3);
          
          // Verify data was saved before closing
          const savedProducts = await getLocal(`ebay-hunted-products-${currentUserId}`);
          const savedCount = savedProducts?.length || 0;
          console.log(`Final verification: ${savedCount} products saved to storage`);

          // Request background to close this tab first
          console.log('Requesting tab close...');
          try {
            await chrome.runtime.sendMessage({ callback: 'closeTab' });
          } catch (e) {
            console.log('closeTab message failed (will rely on content window close if needed):', e?.message);
          }

          // Only mark success if at least one product was saved
          if (savedCount > 0) {
            await setLocal('competitor-search-status', 'success');
          } else {
            await setLocal('competitor-search-status', 'error');
            await setLocal('competitor-search-error', 'No products scraped');
          }

          // Do not call window.close() here to avoid racing with status update.
          // Background closeTab handler will close the tab.
          return;
        }
      } else {
        await setLocal(`extract-titles-${currentUserId}`, false);
      }
    } catch (error) {
      console.log('🚀 ~ handleEbayExtractTitles ~ error:', error);
      // do nothing
      await setLocal('competitor-search-status', 'error');
      await setLocal('competitor-search-error', error?.message);
    }
  };

  const handleChangeSoldHistory = async (value) => {
    const currentUserId = await getLocal('current-user');
    if (value === 'On') {
      await setLocal(`get-sold-history-check-${currentUserId}`, true);
      setGetSoldHistory('On');
    } else {
      await setLocal(`get-sold-history-check-${currentUserId}`, false);
      setGetSoldHistory('Off');
    }
  };

  const handleClearTitles = async () => {
    const currentUserId = await getLocal('current-user');
    await setLocal(`ebay-hunted-products-${currentUserId}`, []);
    setTotalEbayHuntedProducts(0);
    setTitlesCleared(true);
  };

  const handleChromeScreen = async () => {
    // chrome.tabs.create({ url: chrome.runtime.getURL('ebay-items-scanner.html')})
    await chrome.runtime.sendMessage({
      payload: {
        screenToOpen: 'ebay-items-scanner.html'
      },
      callback: 'openChromePopupScreen'
    });
  };

  const handleScrapCheckbox = async (checked) => {
    const currentUserId = await getLocal('current-user');

    await setLocal(`scrap-all-pages-${currentUserId}`, checked);
    setScrapAllPagesCheckbox(checked);
  };

  const changeHuntedProducts = (param1, huntedProducts) => {
    setTotalEbayHuntedProducts(huntedProducts?.length || 0);
  };

  useEffect(() => {
    const checkData = async () => {
      const userId = await getLocal('current-user');
      const getSoldHistoryCheck = await getLocal(`get-sold-history-check-${userId}`);
      if (getSoldHistoryCheck) setGetSoldHistory('On');

      const ebayHuntedProducts = await getLocal(`ebay-hunted-products-${userId}`);
      setTotalEbayHuntedProducts(ebayHuntedProducts?.length || 0);

      const scrapAllPages = await getLocal(`scrap-all-pages-${userId}`);
      setScrapAllPagesCheckbox(scrapAllPages || false);
      const extractTitles = await getLocal(`extract-titles-${userId}`);

      const qs = new URLSearchParams(window.location.search);
      const competitorSearchParam = qs.get('Competitor_Search');
      const hasSellerQuery = qs.has('_ssn') || qs.has('store_name');
      const competitorDetected = competitorSearchParam === 'true' || hasSellerQuery;
      console.log('\n competitorSearch', typeof competitorSearchParam, competitorSearchParam, 'hasSellerQuery', hasSellerQuery);
      setRunByCompetitorSearch(competitorDetected ? 'true' : competitorSearchParam);
      if (competitorDetected) {
        // set local states
        const competitorSearchSoldHistory = await getLocal('competitor-search-sold-history');
        if (competitorSearchSoldHistory) setGetSoldHistory('On');
      }

      onChangeLocalState(`ebay-hunted-products-${userId}`, changeHuntedProducts);
      console.log('Checking auto-extraction conditions:', { scrapAllPages, extractTitles, competitorSearch: competitorDetected });
      
      if ((scrapAllPages && extractTitles) || competitorDetected) {
        console.log('Auto-extraction condition met, waiting for products then clicking...');
        const autoStart = async () => {
          const start = Date.now();
          while (Date.now() - start < 15000) {
            const list = document.querySelectorAll('li.s-item, .s-item, li[id*="item"], .srp-item');
            if (list && list.length >= 20) break;
            await sleep(0.5);
          }
          const extractButton = document.querySelector('#extract-titles-dev');
          if (extractButton) extractButton.click();
        };
        autoStart();
      }
    };

    checkData();
  }, []);

  return (
    <div>
      <div className={classes.div1}>
        <Button
          id='extract-titles-dev'
          style={{
            backgroundColor: !extractingTitles ? '#5db85c' : '#E93D35',
            color: 'white',
            borderColor: !extractingTitles ? '#5db85c' : '#E93D35'
          }}
          onClick={() => handleEbayExtractTitles(!extractingTitles ? 'Extract All Titles' : 'Stop Extracting Titles')}
        >
          {!extractingTitles ? 'Extract All Titles' : 'Stop Extracting Titles'}
        </Button>
        <Button
          style={{
            backgroundColor: '#f0ad4e',
            color: 'white',
            borderColor: '#f0ad4e'
          }}
          onClick={() => handleClearTitles()}
        >
          {`${!titlesCleared ? 'Clear Titles' : 'Titles Cleared'} (${totalEbayHuntedProducts})`}
        </Button>
        <Button
          style={{
            backgroundColor: '#5bc0de',
            color: 'white',
            borderColor: '#5bc0de'
          }}
          onClick={() => handleChromeScreen()}
        >
          Filter Titles
        </Button>
      </div>
      <div className={classes.div2}>
        <Checkbox
          onChange={(e) => handleScrapCheckbox(e.target.checked)}
          checked={scrapAllPagesCheckbox}
        >
          Scrape All Pages
        </Checkbox>
      </div>
      <div className={classes.div3}>
        <p className={classes.p1}>{'Enable \'Total Sold\' to access complete sales history.'}</p>
        <p className={classes.p1}>{'Note: This setting will slow down the scanning process.'}</p>
        <p className={classes.p2}>{'Get Total Sold History:'}</p>
        <Select
          className={classes.select1}
          onChange={(e) => handleChangeSoldHistory(e)}
          value={getSoldHistory}
        >
          <Option value='Off'>Off</Option>
          <Option value='On'>On</Option>
        </Select>
      </div>
    </div>
  );
};

export default ScrapEbayPage;
