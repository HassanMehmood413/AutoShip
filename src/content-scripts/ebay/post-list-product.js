
import { getLocal, setLocal, onChange } from '../../services/dbService';
import { sleep } from '../../services/utils';
import { asinToSku } from './list-product';

console.log('\n *** Ebay Post List Product Page Script Running ***');

window.addEventListener('load', async function () {
  const response = await chrome.runtime.sendMessage({
    callback: 'checkUser'
  });

  if (response.success) {
    postListProduct();
  } else {
    console.log('\n ### User is not logged in or not enable ###');
  }
});

window.addEventListener('beforeunload', async () => {
  await chrome.runtime.sendMessage({
    payload: {},
    callback: 'clearPostListingData'
  });
  await setLocal('listing-status', null);
});


onChange('listing-status', async (_, newValue) => {
  if (newValue === 'paused' || newValue === 'terminated') {
    await chrome.runtime.sendMessage({
      callback: 'closeTab'
    });
    window.close();
    return;
  }
});

const postListProduct = async () => {
  console.log('Ebay Post List Product fully loaded!');
  try {
    const userId = await getLocal('current-user');
    if (!userId) return;

    // get listing data from storage
    const listingData = await getLocal(`ebay-post-listing-data-${userId}`);
    if (!listingData) return;

    const urlParams = new URLSearchParams(window.location.search);
    const draftId = urlParams.get('draft_id');

    const { asin } = listingData;

    const sku = asinToSku(asin);
    let listingStatus = 'pending';
    while (listingStatus === 'pending') {
      const isListed = document.querySelector('.nsoHeroContainer__ContentContainer__title')?.innerText || '';
      if (isListed && isListed.toLowerCase().includes('your item’s listed')) {
        listingStatus = 'success';
        await setLocal('listing-status', 'success');
        let listingId = document.querySelector('.success__body-item-id')?.innerText || '';
        listingId = listingId?.split('-')?.[1] || '';

        await chrome.runtime.sendMessage({
          payload: {
            listingId,
            asin,
            sku
          },
          callback: 'addListing'
        });
      }

      await sleep(1);
    }
  } catch (error) {
    await setLocal('listing-status', 'error');
  }
  // close tab once everything is done
  await chrome.runtime.sendMessage({
    callback: 'closeTab'
  });
};
