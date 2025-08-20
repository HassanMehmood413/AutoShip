
import { notification } from 'antd';
import { getLocal, setLocal, onChange } from '../../services/dbService';
import { sleep } from '../../services/utils';
import { extend } from 'lodash';

console.log('\n *** Ebay List Product Page Script Running ***');

// Robust initializer to avoid missing the load event on SPA-like navigations
const __startListProductUK = async () => {
  if (window.__ebayListInitStartedUK) return;
  window.__ebayListInitStartedUK = true;
  try {
    const response = await chrome.runtime.sendMessage({ callback: 'checkUser' });
    if (response?.success !== false) {
      listProduct();
    } else {
      console.log('\n ### User is not logged in or not enabled ###');
    }
  } catch (e) {
    console.log('checkUser failed, proceeding to listProduct as fallback (UK):', e?.message);
    listProduct();
  }
};

// Start immediately if document is already ready
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  setTimeout(__startListProductUK, 0);
}

// Also hook into DOMContentLoaded/load as secondary triggers
window.addEventListener('DOMContentLoaded', __startListProductUK);
window.addEventListener('load', __startListProductUK);

// Watchdog: if still not started, try when key elements appear (handles slow hydration)
(function setupEbayInitWatchdogUK() {
  let attempts = 0;
  const maxAttempts = 15; // ~22.5s with 1.5s interval
  const intervalId = setInterval(() => {
    if (window.__ebayListInitStartedUK) {
      clearInterval(intervalId);
      return;
    }
    attempts += 1;
    const readyMarker = document.querySelector('input[aria-label="Title"], div[data-key="REQUIRED_GROUP"], form[action*="listing"], [data-testid*="listing"]');
    if (readyMarker) {
      __startListProductUK();
    }
    if (attempts >= maxAttempts) {
      clearInterval(intervalId);
    }
  }, 1500);
})();

window.addEventListener('beforeunload', async () => {
  await chrome.runtime.sendMessage({
    payload: {},
    callback: 'clearListingData'
  });
  await setLocal('listing-status', null);
});

// Function to create a file object and simulate the upload
const processImageForEbay = async (imageBlob, minWidth = 500, minHeight = 500) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    img.onload = () => {
      try {
        const { width, height } = img;
        console.log(`Processing image: ${width}x${height}`);
        
        // Calculate new dimensions to ensure both width and height meet minimum requirements
        let newWidth = Math.max(width, minWidth);
        let newHeight = Math.max(height, minHeight);
        
        // If image is smaller than minimum, scale it up maintaining aspect ratio
        if (width < minWidth || height < minHeight) {
          const scaleWidth = minWidth / width;
          const scaleHeight = minHeight / height;
          const scale = Math.max(scaleWidth, scaleHeight);
          
          newWidth = Math.round(width * scale);
          newHeight = Math.round(height * scale);
        }
        
        // Set canvas dimensions
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        // Fill with white background (in case of transparency)
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, newWidth, newHeight);
        
        // Draw and resize image
        ctx.drawImage(img, 0, 0, newWidth, newHeight);
        
        // Convert canvas to blob
        canvas.toBlob((processedBlob) => {
          if (processedBlob) {
            console.log(`Image processed: ${width}x${height} -> ${newWidth}x${newHeight}`);
            resolve(processedBlob);
          } else {
            reject(new Error('Failed to process image'));
          }
        }, 'image/jpeg', 0.95); // 95% quality for better image quality
        
      } catch (error) {
        console.error('Error processing image:', error);
        reject(error);
      }
    };
    
    img.onerror = (error) => {
      console.error('Error loading image:', error);
      reject(new Error('Failed to load image'));
    };
    
    // Create object URL for the image
    const imageUrl = URL.createObjectURL(imageBlob);
    img.src = imageUrl;
  });
};

const uploadFile = async (fileInput, file) => {
  const dataTransfer = new DataTransfer(); // Create a new DataTransfer object
  dataTransfer.items.add(file); // Add the file to the dataTransfer object
  fileInput.files = dataTransfer.files; // Assign the files to the input element

  // Trigger change event to simulate the user selecting the file
  const event = new Event('change', { bubbles: true });
  await fileInput.dispatchEvent(event);
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

const updateListingData = async (draftId, reqData) => {
  const srtHeader = await getLocal('srt-header');
  const myHeaders = new Headers();
  myHeaders.append('content-type', 'application/json; charset=UTF-8');
  myHeaders.append('srt', srtHeader);

  const requestOptions = {
    method: 'PUT',
    headers: myHeaders,
    body: JSON.stringify(reqData),
    redirect: 'follow'
  };

  const ebayLink = `https://www.ebay.co.uk/sl/list/api/listing_draft/${draftId}?mode=AddItem&module_versions=Attribute%3AV2`;

  let response = await fetch(ebayLink, requestOptions);
  if (response.status === 200) {
    response = await response.json();
    return response;
  }

  throw new Error('something went wrong with ebay api');
};

const getRequiredValues = async ({
  description,
  keys
}) => {
  const payload = {
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a product attributes maker, you will provide me key value JSON object of required attributes list from a product description'
      },
      {
        role: 'user',
        content: `${description} /n Here is the product description, i need values for these attributes ${keys} as a JSON Object`
      }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'response',
        schema: {
          type: 'object',
          properties: {},
          additionalProperties: {
            anyOf: [
              {
                type: 'string'
              },
              {
                type: 'number'
              },
              {
                type: 'boolean'
              }
            ]
          }
        }
      }
    }
  };
  const response = await chrome.runtime.sendMessage({
    payload,
    callback: 'chat-gpt'
  });
  if (response?.success === false) {
    notification.error({
      message: 'Open AI API Error',
      description: response.error
    });
    throw new Error(response.error);
  }
  const parsedResponse = JSON.parse(response.content);
  return parsedResponse;
};

onChange('listing-status', async (_, newValue) => {
  if (newValue === 'paused' || newValue === 'terminated') {
    await chrome.runtime.sendMessage({
      callback: 'closeTab'
    });
    return;
  }
});

const listProduct = async () => {
  console.log('Ebay List Product fully loaded!');
  try {
    const userId = await getLocal('current-user');
    if (!userId) return;

    // get listing data from storage
    const listingData = await getLocal(`ebay-listing-data-${userId}`);
    console.log('🚀 ~ file: list-product-uk.js:197 ~ listingData:', listingData);
    if (!listingData) return;

    const urlParams = new URLSearchParams(window.location.search);
    const draftId = urlParams.get('draft_id');

    const {
      asin,
      title,
      price,
      images,
      rawProductDetail
    } = listingData;


    // unset title for hack
    const titleInput = document.querySelector('input[aria-label="Title"]');
    await setInput(titleInput, titleInput.value);

    await sleep(1);

    // find file input and set all images
    console.log('*** Uploading Images ***');
    const fileInput = document.querySelector('input[type="file"]');
    for (let i = 0; i < images.length; i++) {
      const imageUrl = images[i];
      try {
        const imageRes = await fetch(imageUrl);
        const imageBlob = await imageRes.blob();
        
        // Process image to ensure it meets eBay requirements
        const processedBlob = await processImageForEbay(imageBlob, 500, 500);
        
        const file = new File([processedBlob], `my-image${i}.jpg`, { type: 'image/jpeg' });
        await uploadFile(fileInput, file);
        await sleep(1);
      } catch (error) {
        console.error(`Failed to process image ${i}:`, error);
        // Continue with next image instead of failing completely
      }
    }

    // find required fields
    const requiredDiv = document.querySelector('div[data-key="REQUIRED_GROUP"]');
    const rFieldLabels = requiredDiv.querySelectorAll('.inputField__label');

    // field names for getting value from AI
    const rFieldNames = [];
    rFieldLabels.forEach(item => rFieldNames.push(item.innerText));
    console.log('🚀 ~ file: list-product.js:40 ~ rFieldNames:', rFieldNames);

    // after getting values, fill values
    const requiredValues = await getRequiredValues({
      description: rawProductDetail,
      keys: rFieldNames.join(', ')
    });

    const attributes = {};
    for (let i = 0; i < rFieldNames.length; i++) {
      const name = rFieldNames[i];
      if (requiredValues[name]) {
        extend(attributes, {
          [name]: [requiredValues[name]]
        });
      }
    }

    // Call ebay API to update all fields
    await updateListingData(draftId, {
      title,
      customLabel: `SKU-${draftId}-${asin}`,
      attributes,
      description: 'Test Description',
      price: String(price),
      format: 'FixedPrice',
      quantity: 1,
      auctionSelection: false,
      binPriceSelection: false,
      deliveryMethod: 'shippingOnlyMethod',
      domesticShippingService1: 'UK_OtherCourier',
      shippingPrimaryServicePaymentType: 'SP',
      priceMoreOptions: false,
      shippingMoreOptions: false,
      bestOfferEnabled: false,
      scheduleListingSelection: false,
      removedFields: [
        'quantitySelection',
        'duration',
        'reservePriceSelection',
        'startPrice',
        'intlShippingService1',
        'shippingIntlPrimaryServicePaymentType',
        'autoDeclineAmount'
      ]
    });

    const lStatus = await getLocal('listing-status');
    if (lStatus === 'paused' || lStatus === 'terminated') {
      await chrome.runtime.sendMessage({
        callback: 'closeTab'
      });
      return;
    }

    await setLocal(`ebay-post-listing-data-${userId}`, listingData);

    const listItButton = document.querySelector('button[data-key="listItCallToAction"]');
    if (listItButton) await listItButton.click();

    let listingStatus = 'pending';
    while (listingStatus === 'pending') {
      // const isListed = 'is now live';
      // if (isListed && isListed.toLowerCase().includes('is now live')) {
      //   listingStatus = 'success';
      //   await setLocal('listing-status', 'success');

      //   await chrome.runtime.sendMessage({
      //     payload: {
      //       draftId,
      //       asin,
      //       sku: `SKU-${draftId}-${asin}`
      //     },
      //     callback: 'addListing'
      //   });
      // }

      const isError = document.querySelector('.listGlobalMessageContainer--ERROR')?.innerText || '';
      if (isError) {
        listingStatus = 'error';
        await setLocal('listing-status', 'error');
        await setLocal('listing-error', isError);
        await setLocal(`ebay-post-listing-data-${userId}`, null);
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
