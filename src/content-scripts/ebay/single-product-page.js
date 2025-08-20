
import { createRoot } from 'react-dom/client';

import { Buffer } from 'buffer';
import { Tooltip } from 'antd';

import ProductPageIconsDataBox from '../../components/Ebay/AllProductsPageDatabox';

import { setLocal, getLocal } from '../../services/dbService';

console.log('\n *** Ebay Single Product Page Script Running ***');

window.addEventListener('load', async function () {
  const response = await chrome.runtime.sendMessage({
    callback: 'checkUser'
  });

  if (response.success) {
    singleProductPage();
  } else {
    console.log('\n ### User is not logged in or not enable ###');
  }
});

const getEbaySellerUsername = (url) => {
  const parsedUrl = new URL(url);
  const pathParts = parsedUrl.pathname.split('/');
  const strIndex = pathParts.indexOf('str');
  return pathParts[strIndex + 1];
};

const handleSearchClick = async (asin) => {
  console.log('🚀 ~ file: single-product-page.js:24 ~ asin:', asin);
  console.log('hello');
  const userId = await getLocal('current-user');
  const domain = await getLocal(`selected-domain-${userId}`);

  let amazonLink = 'https://www.amazon.com';
  if (domain === 'UK') {
    amazonLink = 'https://www.amazon.co.uk';
  }

  window.open(`${amazonLink}/dp/${asin}`, '_blank');
  // await chrome.runtime.sendMessage({
  //   payload: {
  //     url: `${link}?autoList=true`,
  //     active: false
  //   },
  //   callback: 'openTab'
  // });
};

const skuToAsin = (sku) => {
  try {
    return atob(sku);
  } catch (error) {
    console.error('Error decoding SKU:', error);
    return null; // Return null if decoding fails
  }
};

export const removeCurrencySymbol = (amount) => {
  const regex = /[\$\€\£\¥\₹\₽\₩\¢\₫]/g;
  const filtered = amount.replace(regex, '').trim();
  return parseFloat(filtered);
};

const singleProductPage = async () => {
  console.log('eBay single product page fully loaded!');
  try {
    let itemId = document.querySelector('.ux-layout-section__textual-display--itemId')?.innerText || '';
    itemId = itemId?.split(':')?.[1] || '';
    console.log('🚀 ~ file: single-product-page.js:31 ~ itemId:', itemId);

    // document.querySelector('.ux-layout-section--LISTING').querySelectorAll('.ux-layout-section__row')[3].innerText.split(':\n\t\n')
    // const listingDataDiv = true;
    let listingDataDiv = document.querySelector('.ux-layout-section--LISTING');
    console.log('🚀 ~ file: single-product-page.js:47 ~ listingDataDiv:', listingDataDiv);
    if (listingDataDiv) {
      listingDataDiv = listingDataDiv.querySelectorAll('.ux-layout-section__row') || [];
      let sku = '';
      // const sku = 'QjA5WDVZMURDUg'; // for testing
      for (let i = 0; i < listingDataDiv.length; i++) {
        const section = listingDataDiv[i];
        console.log(section.innerText);
        if (section.innerText.includes('Custom label')) {
          const splittedText = section.innerText.split(':\n\t\n');
          sku = splittedText[1];
        }
      }
    }
    // if (itemId) {
    //   // check item id exist in

    //   const titleDiv = document.querySelector('div[data-testid="x-item-title"]');
    //   console.log('🚀 ~ file: single-product-page.js:23 ~ titleDiv:', titleDiv);
    //   const newDiv = document.createElement('div');
    //   newDiv.id = 'search-listing-link';
    //   newDiv.style.width = '30px';
    //   const root = createRoot(newDiv);
    //   root.render(
    //     <Tooltip
    //       title='Go to Amazon'
    //     >
    //       <SearchOutlined
    //         style={{
    //           cursor: 'pointer',
    //           fill: 'blue',
    //           fontSize: '30px'
    //         }}
    //         onClick={handleSearchClick}
    //       />
    //     </Tooltip>
    //   );
    //   titleDiv?.append(newDiv);
    // }
    const storeUrlElement = document.querySelector('.x-sellercard-atf__info__about-seller a');
    if (!storeUrlElement) {
      console.log('Store URL element not found');
      return;
    }
    const storeUrl = storeUrlElement.href;
    const storeName = getEbaySellerUsername(storeUrl);
    
    let sellerCards = document.querySelectorAll('.x-sellercard-atf__data-item');
    sellerCards = [...sellerCards];
    const contactDiv = sellerCards.find(item => item.innerText.includes('Contact seller'));
    if (!contactDiv) {
      console.log('Contact seller div not found');
      return;
    }
    const linkElement = contactDiv.querySelector('a');
    if (!linkElement) {
      console.log('Contact seller link not found');
      return;
    }
    const link = linkElement.href;
    console.log('🚀 ~ file: single-product-page.js:154 ~ link:', link);
    const parsedUrl = new URL(link);
    console.log('🚀 ~ file: single-product-page.js:156 ~ parsedUrl:', parsedUrl);
    const sellerName = parsedUrl.searchParams.get('requested');

    const prouctLink = window.location.href;
    const productIdMatch = prouctLink.match(/\/(\d+)(?:\?|\b)/);
    if (!productIdMatch) {
      console.log('Product ID not found in URL');
      return;
    }
    const productId = productIdMatch[1];

    const title = document.querySelector('.x-item-title__mainTitle')?.innerText;

    let price = document.querySelector('div[data-testid="x-price-primary"]')?.innerText;
    price = removeCurrencySymbol(price);

    const imageUrl = document.querySelector('.ux-image-carousel-item.active')?.src;


    const newDiv = document.createElement('div');
    newDiv.id = 'main-product-info-div';

    const root = createRoot(newDiv);

    root.render(<ProductPageIconsDataBox
      storeName={storeName}
      productId={productId}
      dataToBeCopied={{
        title,
        price,
        itemNumber: productId,
        image: imageUrl,
        username: sellerName
      }}
    />);

    const container = document.querySelector('.x-item-title');
    container?.after(newDiv);
  } catch (error) {
    console.log('🚀 ~ file: scan-listings.js:48 ~ error:', error);

  }
};
