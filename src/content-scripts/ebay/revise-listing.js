import { getLocal, setLocal, onChange } from '../../services/dbService';
import { sleep } from '../../services/utils';

console.log('\n *** Revise Ebay Listing Script Running ***');

window.addEventListener('load', async function () {
  const response = await chrome.runtime.sendMessage({
    callback: 'checkUser'
  });

  if (response.success) {
    reviseListing();
  } else {
    console.log('\n ### User is not logged in or not enable ###');
  }
});

const reviseListing = async () => {
  const localType = document.querySelector('.app-header__center')?.innerText || '';
  console.log('🚀 ~ localType:', localType);
  const reviseStatus = await getLocal('revise-offers-status');
  console.log('🚀 ~ reviseStatus:', reviseStatus);
  if (!localType || reviseStatus !== 'revising') return;

  if (localType === 'Revise listings') {
    // wait for the data to load
    let tries = 0;
    while (tries < 10) {
      const dataLoaded = document.querySelector('.app-summary__bottom');
      if (dataLoaded) break;
      tries += 1;
      await sleep(1);
    }
    await sleep(3);

    const selectAllButton = document.querySelector('input[aria-label*="Select all"]');
    console.log('🚀 ~ selectAllButton:', selectAllButton);
    await sleep(1.5);
    if (!selectAllButton) return;
    await selectAllButton.click();
    await sleep(2.5);

    const bulkEditButton = document.querySelector('.menu-button.bulk-edit-menu button');
    console.log('🚀 ~ bulkEditButton:', bulkEditButton);
    if (!bulkEditButton) return;
    const parent = bulkEditButton.parentElement;
    let options = parent.querySelectorAll('.bulk-edit-menu--clickable-item');
    options = [...options];
    const offersButton = options.find(item => item.innerText === 'Offers');
    console.log('🚀 ~ offersButton:', offersButton);
    if (!offersButton) return;
    await offersButton.click();
    await sleep(2.5);

    // check if modal open or not
    tries = 0;
    while (tries < 10) {
      const footer = document.querySelector('.panel-footer__cta');
      if (footer) {
        const offerStatus = await getLocal('offer-status');
        if (offerStatus === 'on') {
          // allow offers button
          document.querySelector('input[value="BULK_OFFER_ENABLE_OFFERS"]').click();
        } else {
          // don't allow offers button
          document.querySelector('input[value="BULK_OFFER_DISABLE_OFFERS"]').click();
        }
        await sleep(2);

        // apply after selecting offer option
        let buttons = footer.querySelectorAll('button');
        buttons = [...buttons];
        const applyButton = buttons.find(item => item.innerText === 'Apply');
        console.log('🚀 ~ applyButton:', applyButton);
        if (applyButton) applyButton.click();
        await sleep(8);
        break;
      }
      tries += 1;
      await sleep(1);
    }
    if (tries === 10) return;

    // check if modal closed or not
    tries = 0;
    while (tries < 10) {
      const footer = document.querySelector('.panel-footer__cta');
      console.log('🚀 ~ footer:', footer);
      if (!footer) break;
      tries += 1;
      await sleep(1);
    }
    if (tries === 10) return;

    console.log('completed');
    // submit
    const submitButton = document.querySelector('.call-to-actions__submit-btn');
    console.log('🚀 ~ submitButton 76:', submitButton);
    if (!submitButton) return;
    await submitButton.click();
    await sleep(2.5);

    // wait for the submit button
    tries = 0;
    while (tries < 10) {
      const modal = document.querySelector('.keyboard-trap--active');
      if (modal) {
        let buttons = modal.querySelectorAll('button');
        buttons = [...buttons];
        const submitButton = buttons.find(item => item.innerText.includes('Submit'));
        console.log('🚀 ~ submitButton 88:', submitButton);
        if (submitButton) submitButton.click(); //for testing
        break;
      }
      tries += 1;
      await sleep(1);
    }

    // when for the confirmation
    tries = 0;
    while (tries < 10) {
      const confirmation = document.querySelector('.inline-notice__main');

      if (confirmation && confirmation.innerText.includes('listings are now live')) {
        // load main link
        const userId = await getLocal('current-user');
        const domain = await getLocal(`selected-domain-${userId}`);

        let ebayLink = 'https://www.ebay.com';
        if (domain === 'UK') {
          ebayLink = 'https://www.ebay.co.uk';
        }
        window.location.href = `${ebayLink}/sh/lst/active?action=sort&sort=scheduledStartDate&limit=200&localType=revise`;
        break;
      }
      tries += 1;
      await sleep(2);
    }
  }
  if (localType === 'end-sell') {
    // 
  }
};