
import { setLocal, getLocal } from '../../services/dbService';

console.log('\n *** Ebay Scan Listings Page Script Running ***');

window.addEventListener('load', async function () {
  const response = await chrome.runtime.sendMessage({
    callback: 'checkUser'
  });

  if (response.success) {
    scanListings();
  } else {
    console.log('\n ### User is not logged in or not enable ###');
  }
});

window.addEventListener('beforeunload', async () => {
  setLocal('scan-listing-status', null);
  setLocal('scan-listing-error', null);
});

const scanListings = async () => {
  console.log('eBay scan listing fully loaded!');
  try {
    const scanListingStatus = await getLocal('scan-listing-status');
    console.log('🚀 ~ file: scan-listings.js:45 ~ scanListingStatus:', scanListingStatus);
    if (scanListingStatus !== 'scanning') return;

    const myHeaders = new Headers();
    myHeaders.append('accept', 'application/json');
    myHeaders.append('accept-language', 'en-GB,en-US;q=0.9,en;q=0.8');

    const requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow'
    };

    const res = await fetch(window.location.href, requestOptions);
    const jsonRes = await res.json();
    const listings = jsonRes?.gridData?.model?.members || [];
    const skus = [];
    for (let i = 0; i < listings.length; i++) {
      const { text } = listings[i]?.listingSKU?.content?.[0]?.textSpans?.[0] || {};
      if (text) skus.push(text);
    }
    let scannedSkus = await getLocal('duplicate-checker-skus') || [];
    scannedSkus = [...scannedSkus, ...skus];
    await setLocal('duplicate-checker-skus', scannedSkus);
    await setLocal('scan-listing-status', 'scanned');
    await chrome.runtime.sendMessage({
      callback: 'closeTab'
    });
    window.close();
  } catch (error) {
    console.log('🚀 ~ file: scan-listings.js:48 ~ error:', error);
    await setLocal('scan-listing-status', 'error');
    await setLocal('scan-listing-error', error.message);
    await chrome.runtime.sendMessage({
      callback: 'closeTab'
    });
    window.close();
  }
};
