import { ceil, round } from 'lodash';
import { Buffer } from 'buffer';

import { getLocal, setLocal } from '../../services/dbService';
import { sleep } from '../../services/utils';

console.log('\n *** Ebay Tracking Script Running ***');

window.addEventListener('load', async function () {
  const response = await chrome.runtime.sendMessage({
    callback: 'checkUser'
  });

  if (response.success) {
    tracking();
  } else {
    console.log('\n ### User is not logged in or not enable ###');
  }
});

// window.addEventListener('beforeunload', async () => {
//   setLocal('revise-offers-status', null);
//   setLocal('end-sell-listing-status', null);
// });

const setInput = (element, value) => {
  return new Promise((resolve) => {
    const prototype = Object.getPrototypeOf(element);
    const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    valueSetter.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    resolve(true);
  });
};

const skuToAsin = (sku) => {
  try {
    return atob(sku);
  } catch (error) {
    console.error('Error decoding SKU:', error);
    return null; // Return null if decoding fails
  }
};

const isValidASIN = (asin) => {
  const asinRegex = /^[A-Z0-9]{10}$/;
  return asinRegex.test(asin);
};

const endListing = async ({
  tableRow,
  itemId,
  localIndex
}) => {
  // end & sell similar
  tableRow.querySelector('.shui-dt-column__lineActions button')?.click();
  await sleep(1);

  const dialog = document.querySelector('div[class*="keyboard-trap--active"]');
  let list = dialog.querySelectorAll('li');
  list = [...list];

  // end listing
  const endListingListItem = list.find(item => item.innerText === 'End listing');
  const endListingButton = endListingListItem.querySelector('button');
  console.log('🚀 ~ endListingButton:', endListingButton);
  await endListingButton?.click();

  // wait for the end listing popup
  let endListingButton2 = null;
  let tries = 0;
  while (tries < 10) {
    const footer = document.querySelector('.se-end-listing__footer-actions');
    if (footer) {
      let buttons = footer.querySelectorAll('button');
      buttons = [...buttons];
      endListingButton2 = buttons.find(item => item.innerText === 'End listing');
      console.log('🚀 ~ endListingButton2:', endListingButton2);
      break;
    }
    tries += 1;
    await sleep(1);
  }

  console.log('🚀 ~ :100 ~ endListingButton2:', endListingButton2);
  if (endListingButton2) {
    // delete from db
    await chrome.runtime.sendMessage({
      payload: {
        listingId: itemId
      },
      callback: 'deleteListingWithId'
    });

    localIndex += 1;
    await setLocal('tracker-current-index', localIndex);
    await sleep(3);

    await updateLogs(`${itemId}: Item deleted`);
    await updateSummary(`${itemId}: Item deleted`);
    await updateLogs('------------------------------------------------');
    endListingButton2.click();
  }
};

const updateLogs = async (log) => {
  const logs = await getLocal('tracker-logs') || [];
  logs.push(log);
  await setLocal('tracker-logs', logs);
};

const updateSummary = async (summary) => {
  const summaries = await getLocal('tracker-summary') || [];
  summaries.push(summary);
  await setLocal('tracker-summary', summaries);
};

const removeCurrencySymbol = (amount) => {
  const regex = /[\$\€\£\¥\₹\₽\₩\¢\₫]/g;
  const filtered = amount.replace(regex, '').trim();
  return filtered;
};

const getAmazonProductDoc = async (url) => {
  const res = await chrome.runtime.sendMessage({
    payload: url,
    callback: 'fetchAmazonProduct'
  });
  if (res?.ProductResponse) {
    const resText = res.ProductResponse;
    const parser = new DOMParser();
    const doc = parser.parseFromString(resText, 'text/html');
    return doc;
  }
  return null;
};

const getAmazonPrice = async (doc) => {
  let price = doc.querySelector('span[class="a-offscreen"]')?.innerText || '0';
  console.log('🚀 ~ :134 ~ price:', price);
  if (price === '0') {
    price = doc.querySelector('.reinventPricePriceToPayMargin')?.innerText?.replaceAll('\n', '') || '0';
    console.log('🚀 ~ :137 ~ price:', price);
  }
  price = removeCurrencySymbol(price);
  return price;
};

const updateStock = async (tableRow, restockQuantity) => {
  const availableQuantityElement = tableRow.querySelector('.shui-dt-column__availableQuantity');
  const editButton = availableQuantityElement.querySelector('button[column="availableQuantity"]');
  await editButton?.click();
  await sleep(1);
  const form = document.querySelector('form[class="inline-edit-price"]');
  const submitButton = form.querySelector('button[type="submit"]');
  const inputField = form.querySelector('input[name*="[availableQuantity]"]');
  await setInput(inputField, restockQuantity);
  await sleep(0.5);
  await submitButton?.click();

  let isPopupClosed = false;
  while (!isPopupClosed) {
    await sleep(1);
    isPopupClosed = document.querySelector('form[class="inline-edit-price"]');
  }
};

const updatePrice = async (tableRow, price) => {
  const priceElement = tableRow.querySelector('.shui-dt-column__price');
  const editButton = priceElement.querySelector('button[column="price"]');
  await editButton?.click();
  await sleep(3);
  const form = document.querySelector('form[class="inline-edit-price"]');
  const submitButton = form.querySelector('button[type="submit"]');
  const inputField = form.querySelector('input[name*="[price]');
  await setInput(inputField, price);
  await sleep(0.5);
  await submitButton?.click();

  let isPopupClosed = false;
  while (!isPopupClosed) {
    await sleep(1);
    isPopupClosed = document.querySelector('form[class="inline-edit-price"]');
  }
};

const tracking = async () => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const localType = urlParams.get('localType');
    console.log('🚀 ~ :50 ~ localType:', localType);
    if (!localType || localType !== 'tracking') return;
    const isTracking = await getLocal('tracking');
    console.log('🚀 ~ :52 ~ isTracking:', isTracking);
    if (!isTracking) return;

    const userId = await getLocal('current-user');
    const domain = await getLocal(`selected-domain-${userId}`);

    let amazonLink = 'https://www.amazon.com/dp';
    let ebayLink = 'https://www.ebay.com';
    if (domain === 'UK') {
      amazonLink = 'https://www.amazon.co.uk/dp';
      ebayLink = 'https://www.ebay.co.uk';
    }

    const {
      stockMonitorEnabled,
      priceMonitorEnabled,
      priceMonitorWithEndingPriceEnabled,
      stockMonitorType,
      priceMonitorType,
      restockQuantity,
      priceMarkupPercentage,
      priceMarkupValue,
      priceTriggerThreshold,
      priceMonitorEndingPrices = ''
    } = await getLocal('tracker-filters') || {};
    const {
      itemWithNoSku,
      itemWithBrokenSku,
      itemsNotFoundOnAmazon,
      itemsWithSales
    } = await getLocal('rule-based-settings') || {};
    const continuousTracking = await getLocal('continuous-tracking') || false;
    const trackingTimeout = await getLocal('tracking-timeout') || 0;
    const trackingTimeoutCompleteScan = await getLocal('tracking-timeout-complete-scan') || 0;
    const logging = await getLocal('logging') || false;

    const trackerCurrentIndex = await getLocal('tracker-current-index') || 0;
    console.log('🚀 ~ trackerCurrentIndex:', trackerCurrentIndex);
    const totalListing = await getLocal('tracker-total-listing') || 0;
    console.log('🚀 ~ totalListing:', totalListing);
    let localIndex = trackerCurrentIndex;
    let localTotalListing = totalListing;

    if (!localTotalListing) {
      const totalListingDiv = document.querySelector('.results-count').innerText;
      console.log('🚀 ~ totalListingDiv:', totalListingDiv);
      const numbers = totalListingDiv.match(/\d+/g);
      localTotalListing = parseInt(numbers.join(''));
      await setLocal('tracker-total-listing', localTotalListing);
    }
    console.log('🚀 ~ localTotalListing 117:', localTotalListing);
    const totalPages = ceil(localTotalListing / 200);
    console.log('🚀 ~ totalPages:', totalPages);

    const table = document.querySelector('table[role="grid"]');
    const tableRows = table.querySelectorAll('tr[class="grid-row"]');
    console.log('🚀 ~ tableRows:', tableRows.length);

    if (!tableRows.length) {
      await updateLogs('Items not exist');

      await setLocal('tracker-current-index', 0);
      await setLocal('tracking', false);
      await setLocal('tracker-total-listing', 0);

      await updateLogs('Tracking completed');
      await chrome.runtime.sendMessage({
        callback: 'closeTab'
      });
      window.close();
    }

    console.log('before if');
    console.log('🚀 ~ localTotalListing:', localTotalListing);
    console.log('🚀 ~ localIndex:', localIndex);

    // check if all listings completed
    if (localIndex >= localTotalListing) {
      await setLocal('tracker-current-index', 0);
      if (!continuousTracking) {
        await setLocal('tracking', false);
        await setLocal('tracker-total-listing', 0);

        await updateLogs('Tracking completed');
        await chrome.runtime.sendMessage({
          callback: 'closeTab'
        });
        window.close();
      }
    }

    for (let i = 0; i < tableRows.length; i++) {
      const tableRow = tableRows[i];
      const itemId = tableRow.getAttribute('data-id');
      console.log('🚀 ~ itemId:', itemId);
      const skuElement = tableRow.querySelector('.shui-dt-column__listingSKU');
      const sku = skuElement?.innerText || '';
      let soldQuantity = tableRow.querySelector('.shui-dt-column__soldQuantity')?.innerText || '0';
      soldQuantity = parseInt(soldQuantity);
      let price = tableRow.querySelector('.shui-dt-column__price .col-price__current')?.innerText || '0';
      price = removeCurrencySymbol(price);
      console.log('🚀 ~ :288 ~ price:', price);

      await updateLogs(`Tracking item: ${itemId}`);

      // check rule based settings
      let action = '';
      const asin = skuToAsin(sku);
      let amazonProductDoc = null;

      if (itemWithNoSku?.status && skuElement && !sku) {
        await updateLogs(`${itemId}: Item SKU not available`);
        if (itemWithNoSku?.action) action = itemWithNoSku.action;
      } else if (itemWithBrokenSku?.status && skuElement && !isValidASIN(asin || '')) {
        await updateLogs(`${itemId}: Item has broken SKU`);
        action = itemWithBrokenSku?.action || '';
      } else if (itemsNotFoundOnAmazon?.status && skuElement && asin) {
        // fetch amazon product details
        amazonProductDoc = await getAmazonProductDoc(`${amazonLink}/${asin}`);
        const isExist = amazonProductDoc?.querySelector(`div[data-csa-c-asin=${asin}]`);
        console.log('🚀 ~ :306 ~ isExist:', isExist);
        if (!isExist) {
          action = itemsNotFoundOnAmazon?.action || '';
          await updateLogs(`${itemId}: Not Amazon Related SKU`);
        }
      } else if (itemsWithSales?.status && soldQuantity < itemsWithSales?.sales) {
        await updateLogs(`${itemId}: Item has broken SKU`);
        action = itemsWithSales?.action || '';
      }

      console.log('🚀 ~ :243 ~ action:', action);
      await updateLogs(`${itemId}: Action to perform: ${action ? action : stockMonitorEnabled ? 'Checking stock' : priceMonitorEnabled ? 'Checking price' : 'N/A'}`);

      // perform determined action
      if (action === 'delete') {
        // delete the listing
        await updateLogs(`${itemId}: Deleting the item`);
        await endListing({
          tableRow,
          itemId,
          localIndex
        });
      } else if (action === 'out-of-stock') {
        // make out of stock listing
        await updateLogs(`${itemId}: Making item out of stock`);
        await updateStock(tableRow, 0);
        await updateLogs(`${itemId}: Item out of stocked`);
        // await updateLogs(`${itemId}: Item can not be out of stock. The quantity must be a valid number greater than 0`);
      } else if (action !== 'nothing' && (stockMonitorEnabled || priceMonitorEnabled)) {
        // check tracker filters
        const endingPrices = priceMonitorEndingPrices?.split(',') || [];
        console.log('🚀 ~ :325 ~ endingPrices:', endingPrices);
        const decimalPrice = price?.split('.')?.[1] || null;
        console.log('🚀 ~ :327 ~ decimalPrice:', decimalPrice);
        // if priceMonitorWithEndingPriceEnabled and price not includes then skip the item
        if (priceMonitorWithEndingPriceEnabled && !endingPrices.includes(decimalPrice)) {
          console.log('in if 330');
          localIndex += 1;
          await setLocal('tracker-current-index', localIndex);
        } else {
          await updateLogs(`${itemId}: Checking if stock or price need to be updated or not.`);
          console.log('in else 334');
          // track stock and price
          if (!amazonProductDoc) amazonProductDoc = await getAmazonProductDoc(`${amazonLink}/${asin}`);
          let amazonPrice = await getAmazonPrice(amazonProductDoc);
          console.log('🚀 ~ :338 ~ amazonPrice:', amazonPrice);

          // check if stock monitor enabled
          if (stockMonitorEnabled) {
            const inStock = amazonProductDoc.querySelector('div[data-feature-name="availabilityInsideBuyBox"]');
            console.log('🚀 ~ :343 ~ inStock:', inStock);
            if (inStock) {
              // update stock
              await updateLogs(`${itemId}: Updating item stock`);

              await updateStock(tableRow, restockQuantity || 0); // default 1 if quantity is not set

              await updateLogs(`${itemId}: Item restocked`);
              await updateSummary(`${itemId}: Item stock updated`);
            } else {
              await updateLogs(`${itemId}: Making item out of stock`);
              await updateLogs(`${itemId}: Item can not be out of stock. The quantity must be a valid number greater than 0`);
            }
          }

          // update price if need to update
          if (priceMonitorEnabled && amazonPrice) {
            console.log('🚀 ~ :359 ~ amazonPrice:', amazonPrice);
            price = parseFloat(price);
            console.log('🚀 ~ :365 ~ price:', price);
            amazonPrice = parseFloat(amazonPrice);
            let markupPercentage = await getLocal('markup-percentage');
            console.log('🚀 ~ :368 ~ markupPercentage:', markupPercentage);
            markupPercentage = parseFloat(markupPercentage === null ? 100 : markupPercentage);
            markupPercentage = markupPercentage / 100;
            console.log('🚀 ~ :370 ~ markupPercentage:', markupPercentage);
            // x = y / (1 + percentage)
            // x is actual price
            // y is price
            // percentage is markup percentage

            const actualPrice = price / (1 + markupPercentage);
            console.log('🚀 ~ :372 ~ actualPrice:', actualPrice);
            const difference = amazonPrice - actualPrice;
            console.log('🚀 ~ :366 ~ difference:', difference);

            // check threshold criteria
            if ((difference > 0 && difference >= priceTriggerThreshold)
              || (difference < 0 && difference <= (-1 * priceTriggerThreshold))
            ) {
              // update price
              console.log('🚀 ~ :390 ~ priceMarkupPercentage:', priceMarkupPercentage);
              console.log('🚀 ~ :390 ~ priceMonitorType:', priceMonitorType);
              let priceToUpdate = amazonPrice;
              if (priceMonitorType === 'markup') {
                priceToUpdate = priceToUpdate + priceToUpdate * priceMarkupPercentage * 0.01;
              } else {
                priceToUpdate = priceToUpdate + priceMarkupValue;
              }
              priceToUpdate = round(priceToUpdate, 2);
              console.log('🚀 ~ :394 ~ priceToUpdate:', priceToUpdate);
              await updateLogs(`${itemId}: Updating item price`);
              await updateLogs(`${itemId}: Amazon price before ${actualPrice}`);
              await updateLogs(`${itemId}: Amazon price now ${amazonPrice}`);
              await updateLogs(`${itemId}: Ebay price to update ${priceToUpdate}`);
              await updateLogs(`${itemId}: Reason -> Price difference ${Math.abs(difference)}`);
              await updatePrice(tableRow, priceToUpdate);
              await updateLogs(`${itemId}: Item price updated`);
              await updateSummary(`${itemId}: Item price updated`);
            } else {
              await updateLogs(`${itemId}: Price not updated. Criteria not matched.`);
              await updateLogs(`${itemId}: Amazon price before ${actualPrice}`);
              await updateLogs(`${itemId}: Amazon price now ${amazonPrice}`);
              await updateLogs(`${itemId}: Reason -> Price difference ${Math.abs(difference)}`);
            }
          } else {
            await updateLogs(`${itemId}: Amazon price not found`);
          }

          localIndex += 1;
          await setLocal('tracker-current-index', localIndex);
        }
      } else {
        localIndex += 1;
        await setLocal('tracker-current-index', localIndex);
      }

      // check if tracking timeout
      console.log('🚀 ~ :398 ~ trackingTimeout:', trackingTimeout);
      await updateLogs('------------------------------------------------');
      if (trackingTimeout) {
        await updateLogs(`----------------- Item Tracking Timeout ${trackingTimeout} Seconds -----------------`);
        await sleep(trackingTimeout);
      }
    }

    // move to next page as page items completed
    const gotoPageInput = document.querySelector('.go-to-page input');
    if (gotoPageInput) {
      const currentPage = parseInt(gotoPageInput.value);
      if (currentPage < totalPages) {
        const gotoPageButton = document.querySelector('.go-to-page button');
        await setInput(gotoPageInput, currentPage + 1);
        await sleep(1);
        await gotoPageButton.click();
        await sleep(2.5);
        window.location.reload();
      }
    } else {
      await updateLogs('----------------- Finished -----------------');
      // check if continuous tracking
      if (continuousTracking) {
        if (trackingTimeoutCompleteScan) {
          await updateLogs(`----------------- Continuous Tracking Timeout ${trackingTimeoutCompleteScan} Minutes -----------------`);
          await sleep(trackingTimeoutCompleteScan * 60);
        }
        window.location.href = `${ebayLink}/sh/lst/active?action=pagination&sort=timeRemaining&limit=200&localType=tracking`;
      } else {
        await updateLogs('Tracking completed');
        await setLocal('tracker-current-index', 0);
        await setLocal('tracking', false);
        await setLocal('tracker-total-listing', 0);
        await chrome.runtime.sendMessage({
          callback: 'closeTab'
        });
        window.close();
      }
    }
  } catch (error) {
    console.log('🚀 ~ :258 ~ error:', error);
    await updateLogs(error.message);
    await updateLogs(error?.stack || '');
    await setLocal('tracker-current-index', 0);
    await setLocal('tracking', false);
    await setLocal('tracker-total-listing', 0);
    await chrome.runtime.sendMessage({
      callback: 'closeTab'
    });
    window.close();
  }
};