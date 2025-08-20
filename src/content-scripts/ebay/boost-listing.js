import { ceil, round } from 'lodash';
import { getLocal, setLocal } from '../../services/dbService';
import { sleep } from '../../services/utils';

console.log('\n *** Boost Ebay Listing Script Running ***');

window.addEventListener('load', async function () {
  const response = await chrome.runtime.sendMessage({
    callback: 'checkUser'
  });

  if (response.success) {
    boostListing();
  } else {
    console.log('\n ### User is not logged in or not enable ###');
  }
});

// window.addEventListener('beforeunload', async () => {
//   setLocal('revise-offers-status', null);
//   setLocal('end-sell-listing-status', null);
// });

const timeToMinutes = (timeStr) => {
  const daysMatch = timeStr.match(/(\d+)d/);
  const hoursMatch = timeStr.match(/(\d+)h/);
  const minutesMatch = timeStr.match(/(\d+)m/);

  const days = daysMatch ? parseInt(daysMatch[1], 10) : 0;
  const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
  const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;

  return (days * 24 * 60) + (hours * 60) + minutes;
};

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

const boostListing = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const localType = urlParams.get('localType');
  if (!localType) return;

  const reviseStatus = await getLocal('revise-offers-status');
  const endSellStatus = await getLocal('end-sell-listing-status');
  if (localType === 'revise') {
    let localIndex = 0;
    const optionIndex = await getLocal('revise-listing-option-index');
    console.log('🚀 ~ optionIndex:', optionIndex);
    if (optionIndex) localIndex = optionIndex;
    await document.querySelector('#shui-dt-checkall')?.click();
    const editButton = document.evaluate('//button[contains(., "Edit")]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)?.singleNodeValue;
    const editButtonParent = editButton.parentElement;
    const options = editButtonParent.querySelectorAll('a[class*="fake-menu-button__item"]');
    const option = options[localIndex];
    console.log('🚀 ~ option:', option);
    await setLocal('revise-listing-option-index', localIndex + 1);

    if (option) {
      option.click();
      // eslint-disable-next-line no-constant-condition
      let tries = 0;
      while (tries < 10) {
        const modal = document.querySelector('.keyboard-trap--active');
        if (modal) {
          let buttons = modal.querySelectorAll('button');
          buttons = [...buttons];
          const continueButton = buttons.find(item => item.innerText === 'Continue');
          console.log('🚀 ~ continueButton:', continueButton);
          if (continueButton) continueButton.click();
          break;
        }
        tries += 1;
        await sleep(1);
      }
    }

    if (localIndex === options.length) {
      await setLocal('revise-offers-status', 'success');
      await setLocal('revise-listing-option-index', 0);

      await chrome.runtime.sendMessage({
        callback: 'closeTab'
      });
      window.close();
    }
  }
  if (localType === 'end-sell') {
    const {
      minimumSold,
      minimumViews,
      hoursLeft
    } = await getLocal('end-sell-similar-settings');
    const endSellCurrentIndex = await getLocal('end-sell-current-index') || 0;
    console.log('🚀 ~ endSellCurrentIndex:', endSellCurrentIndex);
    const totalListing = await getLocal('end-sell-total-listing') || 0;
    console.log('🚀 ~ totalListing:', totalListing);
    let localIndex = endSellCurrentIndex;
    let localTotalListing = totalListing;
    console.log('🚀 ~ minimumSold:', minimumSold);
    console.log('🚀 ~ minimumViews:', minimumViews);
    const minuteLeft = hoursLeft * 60;
    console.log('🚀 ~ minuteLeft:', minuteLeft);

    if (!localTotalListing) {
      const totalListingDiv = document.querySelector('.results-count').innerText;
      console.log('🚀 ~ totalListingDiv:', totalListingDiv);
      const numbers = totalListingDiv.match(/\d+/g);
      localTotalListing = parseInt(numbers.join(''));
      await setLocal('end-sell-total-listing', localTotalListing);
    }
    console.log('🚀 ~ localTotalListing 117:', localTotalListing);
    const totalPages = ceil(localTotalListing / 200);
    console.log('🚀 ~ totalPages:', totalPages);

    const table = document.querySelector('table[role="grid"]');
    const tableRows = table.querySelectorAll('tr[class="grid-row"]');
    console.log('🚀 ~ tableRows:', tableRows.length);

    console.log('before if');
    console.log('🚀 ~ localTotalListing:', localTotalListing);
    console.log('🚀 ~ localIndex:', localIndex);
    // check if all listings completed
    if (localIndex >= localTotalListing) {
      console.log('in if');
      await setLocal('sell-similar-status', 'false');
      await setLocal('end-sell-listing-status', 'success');
      await setLocal('end-sell-current-index', 0);
      await setLocal('end-sell-total-listing', 0);

      await chrome.runtime.sendMessage({
        callback: 'closeTab'
      });
      window.close();
    }

    for (let i = 0; i < tableRows.length; i++) {
      const tableRow = tableRows[i];
      const itemId = tableRow.getAttribute('data-id');
      console.log('🚀 ~ itemId:', itemId);
      let soldQuantity = tableRow.querySelector('.shui-dt-column__soldQuantity')?.innerText || '0';
      soldQuantity = parseInt(soldQuantity);
      console.log('🚀 ~ soldQuantity:', soldQuantity);
      let views = tableRow.querySelector('.shui-dt-column__visitCount')?.innerText || '0';
      views = parseInt(views);
      console.log('🚀 ~ views:', views);
      const timeLeft = tableRow.querySelector('.shui-dt-column__timeRemaining')?.innerText || '0';
      console.log('🚀 ~ timeLeft:', timeLeft);
      const timeLeftMinutes = timeToMinutes(timeLeft);
      console.log('🚀 ~ timeLeftMinutes:', timeLeftMinutes);

      // filter items according to settings
      if (soldQuantity < minimumSold || views < minimumViews || timeLeftMinutes < minuteLeft) {
        localIndex += 1;
        await setLocal('end-sell-current-index', localIndex);
        const percentage = round((localIndex / localTotalListing) * 100, 2);
        console.log('🚀 ~ percentage:', percentage);
        await setLocal('end-sell-similar-percentage', percentage);
        continue;
      }

      // end & sell similar
      tableRow.querySelector('.shui-dt-column__lineActions button')?.click();
      await sleep(1);

      const dialog = document.querySelector('div[class*="keyboard-trap--active"]');
      let list = dialog.querySelectorAll('li');
      list = [...list];
      const sellSimilarListItem = list.find(item => item.innerText === 'Sell similar');
      const sellSimilarATag = sellSimilarListItem.querySelector('a');
      const sellSimilarLink = sellSimilarATag?.href || '';
      console.log('🚀 ~ sellSimilarLink:', sellSimilarLink);
      await setLocal('sell-similar-status', 'true');
      await chrome.runtime.sendMessage({
        payload: {
          url: sellSimilarLink,
          active: false
        },
        callback: 'openTab'
      });

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

      if (endListingButton2) {
        // delete from db
        await chrome.runtime.sendMessage({
          payload: {
            listingId: itemId
          },
          callback: 'deleteListingWithId'
        });

        localIndex += 1;
        await setLocal('end-sell-current-index', localIndex);
        const percentage = round((localIndex / localTotalListing) * 100, 2);
        console.log('🚀 ~ percentage:', percentage);
        await setLocal('end-sell-similar-percentage', percentage);
        await sleep(3);

        endListingButton2.click();
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
    }
  }
  // End a single listing by id quickly (opened by background with localType=end-single)
  if (localType === 'end-single') {
    try {
      const targetIdRaw = await getLocal('end-single-listing-id');
      const targetId = targetIdRaw ? String(targetIdRaw) : '';
      if (!targetId) return;

      const table = document.querySelector('table[role="grid"]');
      if (!table) return;
      const rows = table.querySelectorAll('tr[class="grid-row"]');
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const itemId = row.getAttribute('data-id');
        if (String(itemId) !== targetId) continue;

        // open row actions
        row.querySelector('.shui-dt-column__lineActions button')?.click();
        await sleep(1);

        const dialog = document.querySelector('div[class*="keyboard-trap--active"]');
        if (!dialog) break;
        let items = [...dialog.querySelectorAll('li')];
        const endListingEntry = items.find(x => x.innerText === 'End listing');
        const endBtn = endListingEntry?.querySelector('button');
        await endBtn?.click();

        // confirm popup
        let confirmBtn = null;
        for (let tries = 0; tries < 10; tries++) {
          const footer = document.querySelector('.se-end-listing__footer-actions');
          if (footer) {
            const buttons = [...footer.querySelectorAll('button')];
            confirmBtn = buttons.find(b => b.innerText === 'End listing');
            break;
          }
          await sleep(1);
        }

        if (confirmBtn) {
          await sleep(1);
          confirmBtn.click();
        }

        break;
      }

      // done
      await setLocal('end-single-listing-id', null);
      await sleep(2.5);
      await chrome.runtime.sendMessage({ callback: 'closeTab' });
      window.close();
    } catch (e) {
      // best-effort; close
      await chrome.runtime.sendMessage({ callback: 'closeTab' });
      window.close();
    }
  }
  // Check if a SKU already exists in Active Listings (opened as localType=check-exists)
  if (localType === 'check-exists') {
    try {
      // mark processing
      await setLocal('check-exists-result', 'processing');
      const targetSku = await getLocal('check-exists-sku');
      if (!targetSku) {
        await setLocal('check-exists-result', false);
        await chrome.runtime.sendMessage({ callback: 'closeTab' });
        window.close();
        return;
      }

      const findMatchOnPage = () => {
        const table = document.querySelector('table[role="grid"]');
        if (!table) return false;
        const rows = table.querySelectorAll('tr.grid-row');
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const skuCell = row.querySelector('[data-testid="custom-label"], .custom-label, input[name="customLabel"], .shui-dt-column__listingSKU');
          const skuVal = (skuCell?.value || skuCell?.innerText || '').trim();
          if (skuVal && skuVal === String(targetSku)) return true;
        }
        return false;
      };

      // total pages
      const totalListingDiv = document.querySelector('.results-count')?.innerText || '';
      let totalPages = 1;
      try {
        const numbers = totalListingDiv.match(/\d+/g);
        const totalItems = numbers ? parseInt(numbers.join('')) : 0;
        if (totalItems > 200) {
          totalPages = Math.ceil(totalItems / 200);
        }
      } catch (_) {}

      let found = findMatchOnPage();
      let currentPage = 1;
      while (!found && currentPage < totalPages) {
        const gotoPageInput = document.querySelector('.go-to-page input');
        const gotoPageButton = document.querySelector('.go-to-page button');
        if (!gotoPageInput || !gotoPageButton) break;
        currentPage += 1;
        const prototype = Object.getPrototypeOf(gotoPageInput);
        const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
        valueSetter?.call(gotoPageInput, String(currentPage));
        gotoPageInput.dispatchEvent(new Event('input', { bubbles: true }));
        gotoPageButton.click();
        await sleep(2.5);
        found = findMatchOnPage();
      }

      await setLocal('check-exists-result', !!found);
      await sleep(0.5);
      await chrome.runtime.sendMessage({ callback: 'closeTab' });
      window.close();
    } catch (e) {
      await setLocal('check-exists-result', false);
      await chrome.runtime.sendMessage({ callback: 'closeTab' });
      window.close();
    }
  }
};