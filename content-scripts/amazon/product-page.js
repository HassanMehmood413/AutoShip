import { createRoot } from 'react-dom/client';

import ProductPageIconsDataBox from '../../components/Amazon/ProductIconsDataBox';
import ProductPageDataBox from '../../components/Amazon/ProductPageDataBox';
import { sleep } from '../../services/utils.js';

const ShowDataBox = async (visibleProduct, productTitle, inStock) => {
  const newDiv = document.createElement('div');
  newDiv.id = 'main-product-info-div';

  const divForIcons = document.createElement('div');
  divForIcons.id = 'div-for-icons';

  const root = createRoot(newDiv);
  const iconsRoot = createRoot(divForIcons);

  // iconsRoot.render(<ProductPageIconsDataBox  />);
  if (productTitle) {
    productTitle.parentNode.insertBefore(divForIcons, productTitle.nextSibling);
  }

  await sleep(1);
  root.render(<ProductPageDataBox productTitle={productTitle?.innerText} inStock={inStock} />);
  visibleProduct?.parentNode?.insertBefore(newDiv, visibleProduct);
};

(async () => {
  console.log('\n Amazon Product Page Script Running');

  const response = await chrome.runtime.sendMessage({
    callback: 'checkUser'
  });

  console.log('\n checkUser => response', response);
  if (response.success) {
    let visibleProduct = null;
    while (!visibleProduct) {
      visibleProduct = document.querySelector('#a-page');
      await sleep(1);
    }

    const isVisible = visibleProduct.getAttribute('articleCovered');
    if (isVisible)  return;

    visibleProduct?.setAttribute('articleCovered', true);
    document.querySelector('#skiplink')?.remove();

    const productTitle = document.querySelector('span[id="productTitle"]:not([articlecovered])');
    productTitle?.setAttribute('articleCovered', true);

    const inStock = document.querySelector('div[data-feature-name="availabilityInsideBuyBox"]');
    ShowDataBox(visibleProduct, productTitle, inStock);
  } else {
    console.log('\n ### User is not logged in or not enable ###');
  }
})();
