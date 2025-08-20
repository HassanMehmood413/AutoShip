import { useCallback, useEffect, useRef, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { createRoot } from 'react-dom/client';
import { getLocal, setLocal, onChange as onChangeLocalState } from '../../services/dbService';

import {
  Row,
  Table,
  ConfigProvider,
  Input,
  Button,
  InputNumber,
  Typography,
  notification,
  Tooltip,
  Popconfirm,
  App
} from 'antd';

import { Canvas, FabricImage } from 'fabric';

import { round } from 'lodash';
import { CloseOutlined } from '@material-ui/icons';

import { sleep } from '../../services/utils';
import '../../../dist/style.css';
import { IoMdClose } from 'react-icons/io';
import { getCurrencySymbolFromCurrentURL, getCurrencySymbolFromSelectedDomain } from '../../services/currencyUtils';

const { Text } = Typography;
const { TextArea } = Input;

const useStyles = makeStyles({
  mainDiv: {
    flexDirection: 'column',
    margin: '10px',
    gap: '10px'
  },
  imagesDiv: {
    gap: '10px'
  },
  header: {
    height: '400px'
  },
  headerIcon1: {
    height: '40px',
    width: '50px'
  },
  headerIcon2: {
    height: '200px',
    width: '200px'
  },
  buttonDiv: {
    alignItems: 'end',
    gap: '10px'
  }
});

const ProductPageDataBoxContent = ({ productTitle, inStock }) => {
  console.log('in ProductPageDataBox');
  const classes = useStyles();
  const { notification: notificationApi } = App.useApp();

  const [isFba, setIsFba] = useState(false);
  const [titles, setTitles] = useState([]);
  const [images, setImages] = useState([]);
  const [userId, setUserId] = useState('');
  const [isTitle, setIsTitle] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [brand, setSelectedBrand] = useState('');
  const [isTitleCleaned, setTitleCleaned] = useState(false);
  const [realPrice, setRealPrice] = useState(0);
  const [sellPrice, setSellPrice] = useState(0);
  const [breakevenPrice, setBreakevenPrice] = useState(0);
  const [fetchingTitle, setFetchingTitle] = useState(false);
  const [titleFetched, setTitleFetched] = useState(false);
  const [listingLoading, setListingLoading] = useState(false);
  const [isAsinAlreadyListed, setIsAsinAlreadyListed] = useState(false);
  const [isVeroBrand, setIsVeroBrand] = useState(false);
  const [currentTabLink, setCurrentTabLink] = useState('');
  const [useNoBrandOptimizer, setUseNoBrandOptimizer] = useState(false);

  // THIS PIECE OF CODE IS FROM PRODUCTICONSDATABOOX ---------------------------
  const [veroBrands, setVeroBrands] = useState([]);

  useEffect(() => {
    (async () => {
      const localBrands = (await getLocal('vero-brands')) || [];
      if (localBrands.length) {
        setVeroBrands(localBrands);
      }
    })();
  }, []);

  const ebay =
    'https://static.vecteezy.com/system/resources/previews/020/336/172/non_2x/ebay-logo-ebay-icon-free-free-vector.jpg';

  const handleEbayTabOpen = async () => {
    const userId = await getLocal('current-user');
    const domain = await getLocal(`selected-domain-${userId}`);

    let ebayLink = 'https://www.ebay.com';
    if (domain === 'UK') {
      ebayLink = 'https://www.ebay.co.uk';
    }

    window.open(
      `${ebayLink}/sch/i.html?_from=R40&_trksid=p4432023.m570.l1313&_nkw=${productTitle}&_sacat=0`,
      '_blank'
    );
  };

  function escapeRegex(string) {
    // Escape all special characters in the string
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Function to check if current item is on VeRO list
  const checkIsVero = () => {
    // First try to check using the vero-brand-icon element
    const veroDiv = document.querySelector('#vero-brand-icon');
    if (veroDiv && veroDiv.style.color === 'red') {
      return true;
    }

    // Fallback to manual VeRO checking using veroBrands array
    const currentTitle = document.querySelector('#productTitle')?.innerText || '';
    const veroFromTitle = veroBrands.find((brand) => {
      if (brand.length <= 1) return false; // Exclude single-character brands
      const escapedBrand = escapeRegex(brand); // Escape special characters
      const regex = new RegExp(`\\b${escapedBrand}\\b`, 'i'); // Exact word match, case-insensitive
      return regex.test(currentTitle);
    });

    return !!veroFromTitle;
  };

  const isVero = veroBrands.find((brand) => {
    if (brand.length <= 1) return false; // Exclude single-character brands
    const escapedBrand = escapeRegex(brand); // Escape special characters
    const regex = new RegExp(`\\b${escapedBrand}\\b`, 'i'); // Exact word match, case-insensitive
    return regex.test(productTitle);
  });
  // THIS PIECE OF CODE IS FROM PRODUCTICONSDATABOOX ---------------------------
  // END -----------------------------------------------------------------------

  const titlesRef = useRef(titles);
  const tabLinkRef = useRef(currentTabLink);

  useEffect(() => {
    titlesRef.current = titles;
  }, [titles]);

  useEffect(() => {
    tabLinkRef.current = currentTabLink; // Update the ref with the latest tabLink value
  }, [currentTabLink]);

  const checkUser = async () => {
    const userId = await getLocal('current-user');
    setUserId(userId || '');
  };

  useEffect(() => {
    setCurrentTabLink(window.location.href);
    checkUser();
    onChangeLocalState('listing-status', async (_, newValue) => {
      const asinElement = document.querySelector('input[id="ASIN"]');
      const asin = asinElement ? asinElement.value : null;
      const listingAsin = await getLocal('listing-asin');

      if (asin === listingAsin) {
        if (newValue === 'paused' || newValue === 'terminated') {
          await setLocal('listing-asin', null);
          await chrome.runtime.sendMessage({
            callback: 'closeTab'
          });
          window.close();
          return;
        }
        if (newValue === 'success' || newValue === 'error') {
          setListingLoading(false);
          if (newValue === 'success') {
            setIsAsinAlreadyListed(true);
            notificationApi.success({
              message: 'Listing',
              description: 'Product Listed Successfully',
              duration: 0
            });
          } else if (newValue === 'error') {
            const error = await getLocal('listing-error');
            // await setLocal('listing-error', null);
            // await setLocal('listing-status', null);
            notificationApi.error({
              message: 'Error',
              description: error,
              duration: 0
            });

            // check if close error listing enable
            const isBulkListing = await getLocal('is-bulk-listing');
            const closeTab = await getLocal('bulk-lister-close-listing');
            if (isBulkListing && closeTab) {
              window.close();
            }
          }
          await setLocal('listing-asin', null);
        }
      }
    });

    const intervalId = setInterval(() => {
      const currentLink = window.location.href;
      if (tabLinkRef.current && tabLinkRef.current !== currentLink) {
        clearInterval(intervalId);
        window.location.reload();
      }
    }, 1500);

    return () => clearInterval(intervalId);
  }, []);

  const removeCurrencySymbol = (amount) => {
    const regex = /[\$\€\£\¥\₹\₽\₩\¢\₫]/g;
    const filtered = amount.replace(regex, '').trim();
    return parseFloat(filtered);
  };


  // #################################################################################################
  // #################################################################################################
  // #################################################################################################

  // Amazon Sell Price Calculator - Standalone Browser Console Version
  // Run this on any Amazon product page to calculate selling prices with markup

  // Configuration - Modify these values as needed
  // const CONFIG = {
  //   markupPercentage: 20, // Default markup percentage (20%)
  //   endPrice: 2.50,       // Additional fixed amount to add at the end (e.g., £2.50 or $2.50)
  //   userId: 'default',    // User ID for local storage
  //   selectedDomain: 'UK'  // Default domain: 'USA', 'UK', or others
  // };

  // // Utility functions
  // function round(value, decimals = 2) {
  //   return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  // }

  // function removeCurrencySymbol(priceString) {
  //   if (!priceString) return 0;
  //   // Remove currency symbols and convert to number
  //   const cleaned = priceString.replace(/[£$€¥₹,\s]/g, '');
  //   return parseFloat(cleaned) || 0;
  // }

  // function getCurrencySymbolFromCurrentURL() {
  //   const hostname = window.location.hostname.toLowerCase();

  //   if (hostname.includes('.co.uk')) return '£';
  //   if (hostname.includes('.com')) return '$';
  //   if (hostname.includes('.de') || hostname.includes('.fr') ||
  //     hostname.includes('.es') || hostname.includes('.it')) return '€';
  //   if (hostname.includes('.co.jp')) return '¥';
  //   if (hostname.includes('.in')) return '₹';

  //   return '$'; // Default fallback
  // }

  // function getCurrencySymbolFromSelectedDomain(domain) {
  //   const currencyMap = {
  //     'USA': '$',
  //     'UK': '£',
  //     'Germany': '€',
  //     'France': '€',
  //     'Spain': '€',
  //     'Italy': '€',
  //     'Japan': '¥',
  //     'India': '₹'
  //   };

  //   return currencyMap[domain] || '$';
  // }

  // // Main function to get and calculate sell price
  // const getSellPrice = async () => {
  //   // Merge custom config with defaults

  //   console.log('=== AMAZON SELL PRICE CALCULATOR ===');
  //   console.log('Configuration:', config);

  //   // Try to find price using multiple selectors
  //   const priceSelectors = [
  //     'span[class="a-offscreen"]',
  //     '.reinventPricePriceToPayMargin',
  //     '.a-price .a-offscreen',
  //     '.a-price-whole',
  //     '#priceblock_dealprice',
  //     '#priceblock_ourprice',
  //     '.a-price.a-text-price .a-offscreen'
  //   ];

  //   let price = 0;
  //   let priceSource = '';

  //   // Try each selector
  //   for (let selector of priceSelectors) {
  //     const element = document.querySelector(selector);
  //     if (element) {
  //       let priceText = element.innerText || element.textContent || '';

  //       if (selector === '.reinventPricePriceToPayMargin') {
  //         priceText = priceText.replaceAll('\n', '');
  //       }

  //       const extractedPrice = removeCurrencySymbol(priceText);
  //       if (extractedPrice > 0) {
  //         price = extractedPrice;
  //         priceSource = selector;
  //         break;
  //       }
  //     }
  //   }

  //   if (price === 0) {
  //     console.log('❌ Could not find product price on this page');
  //     return null;
  //   }

  //   console.log(`✅ Price found: ${price} (from: ${priceSource})`);

  //   // Get currency symbol
  //   const currencyFromURL = getCurrencySymbolFromCurrentURL();
  //   const currencyFromDomain = getCurrencySymbolFromSelectedDomain(config.selectedDomain);
  //   const currency = currencyFromURL || currencyFromDomain;

  //   console.log(`Currency detected: ${currency}`);

  //   // Calculate breakeven price
  //   let breakevenPrice;
  //   if (config.selectedDomain === 'USA') {
  //     // Item List Price + 12.9% + $0.55 for USA
  //     breakevenPrice = round(price + price * 12.9 * 0.01 + 0.55, 2);
  //   } else {
  //     // Item List Price + 9.48% + £0.36 + £0.12 (or equivalent for other currencies)
  //     breakevenPrice = round(price + price * 9.48 * 0.01 + 0.36 + 0.12, 2);
  //   }

  //   // Calculate price with markup
  //   let sellPrice = price + price * config.markupPercentage * 0.01;
  //   sellPrice = round(sellPrice);
  //   sellPrice = sellPrice;

  //   if (config.endPrice) {
  //     sellPrice = sellPrice + config.endPrice;
  //   }
  //   // Get product title for context
  //   const titleElement = document.querySelector('#productTitle') ||
  //     document.querySelector('.product-title') ||
  //     document.querySelector('h1');
  //   const productTitle = titleElement ? titleElement.textContent.trim() : 'Unknown Product';

  //   // Display results
  //   console.log('\n=== RESULTS ===');
  //   console.log('Product:', productTitle);
  //   console.log('Original Price:', `${currency}${price}`);
  //   console.log('Breakeven Price:', `${currency}${breakevenPrice}`);
  //   console.log('Price with Markup:', `${currency}${round(price + price * config.markupPercentage * 0.01, 2)}`);
  //   console.log('End Price Addition:', `${currency}${config.endPrice}`);
  //   console.log('Final Sell Price:', `${currency}${sellPrice}`);
  //   console.log('Markup Percentage:', `${config.markupPercentage}%`);
  //   console.log('Total Profit Margin:', `${currency}${round(sellPrice - breakevenPrice, 2)}`);
  //   console.log('Profit vs Original:', `${currency}${round(sellPrice - price, 2)}`);

  //   // Return structured result
  //   return {
  //     product: productTitle,
  //     originalPrice: price,
  //     breakevenPrice: breakevenPrice,
  //     sellPrice: sellPrice,
  //     currency: currency,
  //     markupPercentage: config.markupPercentage,
  //     profitMargin: round(sellPrice - breakevenPrice, 2),
  //     profitVsOriginal: round(sellPrice - price, 2),
  //     endPriceAddition: config.endPrice,
  //     url: window.location.href,
  //     timestamp: new Date().toISOString()
  //   };
  // }

  // // Enhanced version with custom parameters
  // function calculateSellPrice(markupPercentage = 20, endPrice = 0, domain = 'UK') {
  //   return getSellPrice({
  //     markupPercentage: markupPercentage,
  //     endPrice: endPrice,
  //     selectedDomain: domain
  //   });
  // }

  // // Batch calculator for multiple markup percentages
  // function calculateMultipleMarkups(markupPercentages = [10, 15, 20, 25, 30]) {
  //   console.log('\n=== MULTIPLE MARKUP CALCULATIONS ===');

  //   const results = [];
  //   for (let markup of markupPercentages) {
  //     const result = getSellPrice({ markupPercentage: markup, endPrice: CONFIG.endPrice });
  //     if (result) {
  //       results.push(result);
  //       console.log(`${markup}% markup + ${result.currency}${result.endPriceAddition}: ${result.currency}${result.sellPrice} (total profit: ${result.currency}${result.profitVsOriginal})`);
  //     }
  //   }

  //   return results;
  // }

  // // Auto-detect and run
  // console.log('Amazon Sell Price Calculator loaded!');
  // console.log('\n📋 USAGE:');
  // console.log('• getSellPrice() - Calculate with default settings');
  // console.log('• calculateSellPrice(markup, endPrice, domain) - Custom calculation');
  // console.log('• calculateMultipleMarkups([10,20,30]) - Multiple markup percentages');
  // console.log('\n🔧 EXAMPLES:');
  // console.log('• calculateSellPrice(25) - 25% markup');
  // console.log('• calculateSellPrice(20, 5, "USA") - 20% markup, $5 end price, USA domain');
  // console.log('• calculateMultipleMarkups([15, 20, 25, 30]) - Compare different markups');

  // // Auto-run if on Amazon
  // if (window.location.hostname.includes('amazon')) {
  //   console.log('\n🚀 Amazon detected - running calculation with default settings (20% markup + £2.50 end price)...');
  //   getSellPrice();
  // } else {
  //   console.log('\n⚠️  Navigate to an Amazon product page to use this calculator');
  // }

  // #################################################################################################
  // #################################################################################################




  const getSellPrice = async () => {


    const priceSelectors = [
      'span[class="a-offscreen"]',
      '.reinventPricePriceToPayMargin',
      '.a-price .a-offscreen',
      '.a-price-whole',
      '#priceblock_dealprice',
      '#priceblock_ourprice', 
      '.a-price.a-text-price .a-offscreen',
      // Additional selectors for different Amazon page layouts
      '.a-price-range .a-offscreen',
      '#corePrice_feature_div .a-price .a-offscreen',
      '#corePrice_desktop .a-price .a-offscreen',
      '#apex_desktop .a-price .a-offscreen',
      '.a-price.a-size-medium .a-offscreen',
      '[data-a-price-type="minPrice"] .a-offscreen',
      '[data-testid="price-current"] .a-offscreen',
      '.a-price-current .a-offscreen',
      // Backup selectors without .a-offscreen
      '.a-price-whole:not(.a-offscreen)',
      '#priceblock_dealprice:not(.a-offscreen)',
      '#price_inside_buybox:not(.a-offscreen)'
    ];

    let price = 0;
    let priceSource = '';

    // Try each selector with enhanced debugging
    console.log('🔍 Attempting to find price with', priceSelectors.length, 'selectors...');
    
    for (let selector of priceSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        let priceText = element.innerText || element.textContent || '';
        console.log(`📝 Found element for "${selector}": "${priceText}"`);

        if (selector === '.reinventPricePriceToPayMargin') {
          priceText = priceText.replaceAll('\n', '');
        }

        const extractedPrice = removeCurrencySymbol(priceText);
        console.log(`💲 Extracted price from "${selector}": ${extractedPrice}`);
        
        if (extractedPrice > 0) {
          price = extractedPrice;
          priceSource = selector;
          console.log(`✅ Selected price: ${price} from selector: ${selector}`);
          break; // Use the first valid price found
        }
      }
    }

   
    console.log(`✅ Price found: ${price} (from: ${priceSource})`);



    let markupPercentage = (await getLocal('markup-percentage')) || 0;
    const endPrice = (await getLocal('end-price')) || 0;
    markupPercentage = parseFloat(
      markupPercentage === null ? 100 : markupPercentage
    );

    console.log(`✅ markdown found: ${markupPercentage} (from: ${endPrice})`)
    // Cache DOM queries to reduce reflo
    setRealPrice(price);
    ////////////////////////////////////////////
    // breakeven price
    const domain = await getLocal(`selected-domain-${userId}`);

    

    // Get currency symbol based on current page URL or selected domain
    const currencyFromURL = getCurrencySymbolFromCurrentURL();
    const currencyFromDomain = getCurrencySymbolFromSelectedDomain(domain);

    // Use URL-based currency if available, otherwise use domain setting
    const currency = currencyFromURL || currencyFromDomain;

    let bePrice = null;
    if (domain === 'USA') {
      // Item List Price + 12.9% + $0.55 for USA
      bePrice = `${currency}${round(price + price * 12.9 * 0.01 + 0.55, 2)}`;
    } else {
      // Item List Price + 9.48% + £0.36 + £0.12 (or equivalent for other currencies)
      bePrice = `${currency}${round(price + price * 9.48 * 0.01 + 0.36 + 0.12, 2)}`;
    }
    setBreakevenPrice(bePrice);

    // price with markup
    price = price + price * markupPercentage * 0.01;
    price = round(price);
    price = price + endPrice;
    setSellPrice(price);
  };

  // eslint-disable-next-line no-async-promise-executor
  const loadImage = async (canvas, placeholder, imageUrl, background) =>
    new Promise(async (resolve) => {
      const pugImg = new Image();
      pugImg.crossOrigin = 'anonymous';
      pugImg.onload = () => {
        const pug = new FabricImage(pugImg, {
          left: placeholder.left,
          top: placeholder.top,
          selectable: false,
          originX: 'left',
          originY: 'top'
        });

        const placeholderWidth = placeholder.width * placeholder.scaleX;
        const placeholderHeight = placeholder.height * placeholder.scaleY;
        // Calculate the scaling factors
        const scaleX = placeholderWidth / pugImg.width;
        const scaleY = placeholderHeight / pugImg.height;

        pug.set({
          scaleX,
          scaleY
        });
        // Remove the placeholder and add the image
        canvas.remove(placeholder);
        canvas.add(pug);
        canvas.requestRenderAll();
        resolve(true);
      };
      if (background) {
        const response = await chrome.runtime.sendMessage({
          payload: {
            url: imageUrl
          },
          callback: 'fetch'
        });
        if (response.success) pugImg.src = response.data;
      } else {
        pugImg.src = imageUrl;
      }
    });

  const generateImages = async () => {
    const tempImages = [...images];
    const useReviewImages = await getLocal('use-review-images');
    if (useReviewImages) {
      const reviewImagesDiv = document.querySelector(
        'div[cel_widget_id="cr-media-carousel_customer-reviews-detail-media_0"]'
      );
      const imagesButtons =
        reviewImagesDiv?.querySelectorAll('button[data-url*="images"]') || [];
      for (let i = 0; i < imagesButtons.length; i++) {
        const button = imagesButtons[i];
        const imageUrl = button ? button.getAttribute('data-url') || '' : '';
        if (imageUrl) tempImages.push(imageUrl);
      }
      setImages(tempImages);
      if (tempImages.length) return;
      else {
        notificationApi.error({
          message: 'Error',
          description: 'Review images not found.'
        });
      }
    }

    let imageTags = [];
    const imageBlocks = document.querySelectorAll(
      'li[data-csa-c-action="image-block-alt-image-hover"]'
    );
    if (imageBlocks?.length) {
      imageTags = imageBlocks;
    } else {
      const hoveredImage = document.querySelector(
        '.image.item.maintain-height.selected img'
      );
      imageTags.push(hoveredImage);
    }

    if (!imageTags.length) return;
    const useTemplate = await getLocal('use-image-template');
    const savedTemplate = await getLocal('collage-canvas-template');
    if (!savedTemplate && useTemplate) {
      // do something else
      notificationApi.error({
        message: 'Error',
        description: 'No template found to generate image.'
      });
    } else if (useTemplate) {
      for (let i = 0; i < imageTags.length; i++) {
        const testTemplateCanvas = new Canvas('testTemplateCanvas', {
          width: 800,
          height: 800
        });
        testTemplateCanvas.clear();
        await testTemplateCanvas.loadFromJSON(savedTemplate, () => {
          testTemplateCanvas.requestRenderAll();
        });
        // Find the placeholder and replace it with an image
        let placeholders = testTemplateCanvas?.getObjects();
        placeholders = placeholders.filter(
          (obj) => obj.id && obj.id.startsWith('images')
        );

        await imageTags[i]?.click();
        const imageTag = document.querySelector(
          '.image.item.maintain-height.selected img'
        );
        const imageUrl = imageTag?.src || '';
        if (!imageUrl) continue;
        // Load the image into all placeholders
        for (const placeholder of placeholders) {
          await loadImage(testTemplateCanvas, placeholder, imageUrl);
        }
      }

      const collageDataURL = testTemplateCanvas.toDataURL({
        format: 'png',
        quality: 1
      });
      tempImages.push(collageDataURL);
      if (testTemplateCanvas) {
        testTemplateCanvas.dispose();
      }
    }

    else {
      // If no template, process images normally
      for (let i = 0; i < imageTags.length; i++) {
        await imageTags[i]?.click();
        const imageTag = document.querySelector(
          '.image.item.maintain-height.selected img'
        );
        let imageUrl = imageTag?.src || '';
        const watermarkUrl = await getLocal('watermark-url');
        if (watermarkUrl) {
          const savedDefaultTemplate = await getLocal('default-collage-template');
          const defaultTemplateCanvas = new Canvas('defaultTemplateCanvas', {
            width: 800,
            height: 800
          });
          defaultTemplateCanvas.clear();
          await defaultTemplateCanvas.loadFromJSON(savedDefaultTemplate, () => {
            defaultTemplateCanvas.requestRenderAll();
          });
          // Find the placeholder and replace it with an image
          let placeholders = defaultTemplateCanvas?.getObjects();
          placeholders = placeholders.filter(
            (obj) => obj.id && obj.id.startsWith('images')
          );
          await loadImage(defaultTemplateCanvas, placeholders[0], imageUrl);
          await loadImage(
            defaultTemplateCanvas,
            placeholders[1],
            watermarkUrl,
            true
          );

          const collageDataURL = defaultTemplateCanvas.toDataURL({
            format: 'png',
            quality: 1
          });
          imageUrl = collageDataURL;
          if (defaultTemplateCanvas) {
            defaultTemplateCanvas.dispose();
          }
        }

        tempImages.push(imageUrl);
      }
    }
    setImages(tempImages);

    const closeButton = document.querySelector(
      'button[data-action="a-popover-close"]'
    );
    await sleep(2);
    if (closeButton) closeButton.click();
  };

  const cleanTitle = () => {
    const tempTitles = [...titlesRef.current];
    const { title } = tempTitles[0];

    const regex = new RegExp(brand, 'gi');
    if (brand && regex.test(title)) {
      let cleanedTitle = title.replace(regex, '').trim();
      cleanedTitle = cleanedTitle.replace(/\s\s+/g, ' ');
      tempTitles.push({
        id: 2,
        key: 'title-2',
        type: 'Filtered',
        title: cleanedTitle,
        characters: cleanedTitle.length
      });
      setTitles(tempTitles);
      setSelectedTitle(cleanedTitle);
      setTitleCleaned(true);
      return {
        cleanedTitle,
        cleanedTitles: tempTitles
      };
    }
  };

  // Remove all detected brand names (VeRO list + product brand) from the current title
  const cleanTitleNoBrand = () => {
    const tempTitles = [...titlesRef.current];
    const baseTitle = tempTitles?.[0]?.title || selectedTitle || '';
    if (!baseTitle) return;

    // Aggregate brand candidates: explicit brand on page + known VeRO brands
    const candidates = new Set();
    if (brand && brand.length > 1) candidates.add(brand);
    for (const b of veroBrands || []) { if (b && b.length > 1) candidates.add(b); }

    let cleaned = baseTitle;
    for (const b of candidates) {
      const escaped = escapeRegex(b);
      const rx = new RegExp(`\\b${escaped}\\b`, 'ig');
      cleaned = cleaned.replace(rx, ' ');
    }
    cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

    const id = tempTitles.length + 1;
    tempTitles.push({ id, key: `title-${id}`, type: 'Filtered (No Brand)', title: cleaned, characters: cleaned.length });
    setTitles(tempTitles);
    setSelectedTitle(cleaned);
    setTitleCleaned(true);
    return { cleanedTitle: cleaned, cleanedTitles: tempTitles };
  };

  const handleSnipeTitle = useCallback(
    async (_, { cleanedTitle, cleanedTitles } = {}) => {
      setFetchingTitle(true);
      try {
        const messages = [
          {
            role: 'system',
            content: 'You are a ebay SEO optimized title maker.'
          },
          {
            role: 'user',
            content: `${cleanedTitle || selectedTitle
              }/n i have this title please make SEO optimized 5 titles of less than 80 characters for ebay product and do not include amazon keyword in the title`
          }
        ];

        const tempTitles = cleanedTitles
          ? [...cleanedTitles]
          : [...titlesRef.current];
        for (let i = 0; i < 2; i++) {
          const payload = {
            model: 'gpt-4o-mini',
            messages,
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'response_title',
                schema: {
                  type: 'object',
                  properties: {
                    titles: {
                      type: 'array',
                      items: {
                        type: 'string'
                      }
                    }
                  },
                  required: ['titles']
                }
              }
            }
          };
          const response = await chrome.runtime.sendMessage({
            payload,
            callback: 'chat-gpt'
          });

          if (response?.success === false) {
            throw new Error(response.error);
          }

          messages.push(response);
          messages.push({
            role: 'user',
            content:
              'give me one perfect title of less than 80 characters for ebay product and do not include amazon keyword in the title'
          });

          const { titles: responseTitles } = JSON.parse(response.content);

          for (let j = 0; j < responseTitles.length; j++) {
            const id = tempTitles.length + 1;
            tempTitles.push({
              id,
              key: `title-${id}`,
              type: i === 0 ? 'Great' : 'Perfect',
              title: responseTitles[j],
              characters: responseTitles[j].length
            });
          }

          if (i === 1 && responseTitles?.[0]) {
            setSelectedTitle(responseTitles[0]);
          }

          setTitles(tempTitles);
        }

        setTitleFetched(true);
      } catch (error) {
        notificationApi.error({
          message: 'Open AI API Error',
          description: error
        });
        await handleListingError(error);
      }
      setFetchingTitle(false);
    },
    [titles, selectedTitle]
  );

  // No-Brand variant: enforces removal of brand/trademark names
  const handleSnipeTitleNoBrand = useCallback(
    async (_, { cleanedTitle, cleanedTitles } = {}) => {
      setFetchingTitle(true);
      try {
        // Build a comma-separated brand list for explicit instruction
        const brandCandidates = [];
        if (brand && brand.length > 1) brandCandidates.push(brand);
        for (const b of veroBrands || []) { if (b && b.length > 1) brandCandidates.push(b); }

        const messages = [
          { role: 'system', content: 'You are an eBay SEO title maker. You MUST remove any brand or trademark names from all outputs. Use generic descriptors only. Do not exceed 80 characters. No Amazon references.' },
          { role: 'user', content: `${cleanedTitle || selectedTitle}\nRules: Remove and avoid these brand/trademark names entirely: ${brandCandidates.join(', ')}. Provide 5 SEO-optimized options under 80 chars without brands.` }
        ];

        const tempTitles = cleanedTitles ? [...cleanedTitles] : [...titlesRef.current];
        for (let i = 0; i < 2; i++) {
          const payload = {
            model: 'gpt-4o-mini',
            messages,
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'response_title',
                schema: {
                  type: 'object',
                  properties: { titles: { type: 'array', items: { type: 'string' } } },
                  required: ['titles']
                }
              }
            }
          };
          const response = await chrome.runtime.sendMessage({ payload, callback: 'chat-gpt' });
          if (response?.success === false) throw new Error(response.error);

          messages.push(response);
          messages.push({ role: 'user', content: 'Give one perfect title under 80 chars without any brand/trademark names.' });

          const { titles: responseTitles } = JSON.parse(response.content);
          for (let j = 0; j < responseTitles.length; j++) {
            const id = tempTitles.length + 1;
            tempTitles.push({ id, key: `title-${id}`, type: i === 0 ? 'Great (No Brand)' : 'Perfect (No Brand)', title: responseTitles[j], characters: responseTitles[j].length });
          }
          if (i === 1 && responseTitles?.[0]) setSelectedTitle(responseTitles[0]);
          setTitles(tempTitles);
        }
        setTitleFetched(true);
      } catch (error) {
        notificationApi.error({ message: 'Open AI API Error', description: error });
        await handleListingError(error);
      }
      setFetchingTitle(false);
    },
    [titles, selectedTitle, veroBrands, brand]
  );

  const extractTextFromHTML = (htmlString) => {
    // Create a temporary DOM element to parse the HTML string
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;

    // Remove all script tags and their content
    const scriptTags = tempDiv.querySelectorAll('script');

    scriptTags.forEach(function (script) {
      script.parentNode.removeChild(script);
    });
    const styleTags = tempDiv.querySelectorAll('style');

    styleTags.forEach(function (script) {
      script.parentNode.removeChild(script);
    });

    // Extract text content from the remaining HTML elements
    return tempDiv.innerHTML;
  };

  const handleListProduct = useCallback(async (ignoreVero = false) => {
    // set asin
    const asinElement = document.querySelector('input[id="ASIN"]');
    if (!asinElement) {
      await handleListingError('ASIN element not found on page');
      return;
    }
    const asin = asinElement.value;
    await setLocal('listing-asin', asin);

    setListingLoading(true);
    await setLocal('listing-status', 'listing');
    await setLocal('listing-error', null);
    try {
      // Check for VeRO if not overriding
      if (!ignoreVero) {
        // First try to check using the vero-brand-icon element
        const veroDiv = document.querySelector('#vero-brand-icon');
        let isVeroFromElement = false;
        let verobrandFromElement = null;

        if (veroDiv) {
          verobrandFromElement = veroDiv.getAttribute('veroBrand');
          isVeroFromElement = veroDiv.style.color === 'red';
        }

        // Fallback to manual VeRO checking using veroBrands array
        const currentTitle = document.querySelector('#productTitle')?.innerText || '';
        const isVeroFromTitle = veroBrands.find((brand) => {
          if (brand.length <= 1) return false;
          const escapedBrand = escapeRegex(brand);
          const regex = new RegExp(`\\b${escapedBrand}\\b`, 'i');
          return regex.test(currentTitle);
        });

        const finalIsVero = isVeroFromElement || isVeroFromTitle;
        const finalVeroBrand = verobrandFromElement || isVeroFromTitle || 'Unknown brand';

        if (finalIsVero) {
          await handleListingError(
            `Item on Vero Banned list. Not Listed. ${finalVeroBrand} exists in the title`
          );
          return;
        }
      }

      const amazonTitle =
        document.querySelector('span#productTitle')?.innerText;

      let productDetailsAndAbout = document.querySelector(
        'div#productFactsDesktop_feature_div'
      );
      if (!productDetailsAndAbout?.innerHTML) {
        const productOverviewDiv = document
          .querySelector('div#productOverview_feature_div')
          ?.querySelector('table')?.innerHTML;
        const productAboutThisItem = document.querySelector(
          'div#featurebullets_feature_div'
        )?.innerHTML;

        productDetailsAndAbout = `${productOverviewDiv} \n ${productAboutThisItem}`;
      } else {
        productDetailsAndAbout = productDetailsAndAbout?.innerHTML;
      }

      let productVariantInfo = document.querySelector(
        'div[id=twisterContainer]'
      );
      if (productVariantInfo) {
        productVariantInfo = productVariantInfo.innerHTML;
      }

      let productDetailsDiv;
      productDetailsDiv = document.querySelector(
        'div#productDetails_feature_div'
      );

      if (!productDetailsDiv?.innerText) {
        productDetailsDiv = document.querySelector(
          'div#detailBulletsWrapper_feature_div'
        );
        if (!productDetailsDiv?.innerText) {
          const btfContentDivs = document.querySelectorAll(
            'div[id*="btfContent"]'
          );
          if (btfContentDivs.length) {
            const filterDivs = [];
            for (let i = 0; i < btfContentDivs.length; i += 1) {
              if (btfContentDivs[i].innerText) {
                filterDivs.push(btfContentDivs[i]);
              }
            }

            let content = '';
            for (let i = 0; i < filterDivs.length; i += 1) {
              content = content + filterDivs[i].innerHTML;
            }

            productDetailsDiv = content;
          }
        } else {
          productDetailsDiv = productDetailsDiv?.innerHTML;
        }
      } else {
        productDetailsDiv = productDetailsDiv?.innerHTML;
      }

      const parsedProductAbout = extractTextFromHTML(
        productDetailsAndAbout
      ).trim();
      const parsedProductDetails =
        extractTextFromHTML(productDetailsDiv).trim();
      const parsedVariantInfo = productVariantInfo
        ? extractTextFromHTML(productVariantInfo).trim()
        : '';

      const productDetails = `${amazonTitle} \n ${parsedVariantInfo} \n ${parsedProductAbout} \n ${parsedProductDetails}`;
      // productDetails = extractTextFromHTML(productDetails).replaceAll('\n', '').replace(/\s+/g, ' ').trim();

      const asinElement = document.querySelector('input[id="ASIN"]');
      const asin = asinElement ? asinElement.value : '';
      const listingObj = {
        title: selectedTitle,
        rawProductDetail: productDetails,
        price: sellPrice,
        images,
        asin
      };
      console.log(
        '🚀 ~ file: ProductPageDataBox.jsx:427 ~ listingObj:',
        listingObj
      );

      const listingStatus = await getLocal('listing-status');
      if (listingStatus === 'paused' || listingStatus === 'terminated') {
        await chrome.runtime.sendMessage({
          callback: 'closeTab'
        });
        window.close();
        return;
      }

      const alreadyListingData = await chrome.runtime.sendMessage({
        payload: {
          asin
        },
        callback: 'getListing'
      });

      const { listingData = {} } = alreadyListingData || {};
      if (!listingData) {
        const userId = await getLocal('current-user');
        const domain = await getLocal(`selected-domain-${userId}`);

        let ebayLink = 'https://www.ebay.com';
        if (domain === 'UK') {
          ebayLink = 'https://www.ebay.co.uk';
        }

        await setLocal(`ebay-listing-data-${userId}`, listingObj);
        const isBulkListing = await getLocal('is-bulk-listing');
        const target = isBulkListing ? '_self' : '_blank';

        window.open(
          `${ebayLink}/sl/prelist/identify?automation=true&title=${selectedTitle}`,
          target
        );
        // await chrome.runtime.sendMessage({
        //   payload: {
        //     url: `${ebayLink}/sl/prelist/identify?title=${selectedTitle}&automation=true`,
        //     active: false
        //   },
        //   callback: 'openTab'
        // });
      }
    } catch (error) {
      notificationApi.error({
        message: 'Error',
        description: error?.message || 'something went wrong'
      });
      await handleListingError(error?.message || 'something went wrong');
      setListingLoading(false);
    }
  }, [selectedTitle, sellPrice, images]);

  const handleOverrideVeroAndList = useCallback(async () => {
    // Show confirmation if product is on VeRO list
    if (isVero) {
      const confirmed = window.confirm(
        `This item is on the VeRO Banned List (${isVero}). Are you sure you want to override VeRO protection and list this item?`
      );
      if (!confirmed) {
        return;
      }
    }

    // Call handleListProduct with ignoreVero flag set to true
    await handleListProduct(true);
  }, [isVero, handleListProduct]);

  const columns = [
    {
      title: 'No.',
      dataIndex: 'id',
      key: 'id'
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type'
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title'
    },
    {
      title: 'Characters',
      dataIndex: 'characters',
      key: 'characters'
    },
    {
      key: 'action',
      title: 'Action',
      width: 19,
      render: (_, data) => {
        const { title } = data;
        return (
          <Button type='primary' onClick={() => setSelectedTitle(title)}>
            Select
          </Button>
        );
      }
    }
  ];

  const handleListingError = async (error) => {
    const isBulkListing = await getLocal('is-bulk-listing');
    const closeTab = await getLocal('bulk-lister-close-listing');
    if (error) await setLocal('listing-error', error);
    await setLocal('listing-status', 'error');
    // check if close error listing enable
    if (isBulkListing && closeTab) {
      window.close();
    }
  };

  const handleAutoListing = useCallback(async () => {
    try {
      const asinElement = document.querySelector('input[id="ASIN"]');
      if (!asinElement) {
        await handleListingError('ASIN element not found on page');
        return;
      }
      const asin = asinElement.value;
      await setLocal('listing-asin', asin);

      // check min max price rule
      const isBulkListing = await getLocal('is-bulk-listing');

      const bulkIgnoreVero = await getLocal('bulk-lister-ignore-vero');

      if (!bulkIgnoreVero) {
        // First try to check using the vero-brand-icon element
        const veroDiv = document.querySelector('#vero-brand-icon');
        let isVeroFromElement = false;
        let verobrandFromElement = null;

        if (veroDiv) {
          verobrandFromElement = veroDiv.getAttribute('veroBrand');
          isVeroFromElement = veroDiv.style.color === 'red';
        }

        // Fallback to manual VeRO checking using veroBrands array
        const currentTitle = document.querySelector('#productTitle')?.innerText || '';
        const isVeroFromTitle = veroBrands.find((brand) => {
          if (brand.length <= 1) return false;
          const escapedBrand = escapeRegex(brand);
          const regex = new RegExp(`\\b${escapedBrand}\\b`, 'i');
          return regex.test(currentTitle);
        });

        const finalIsVero = isVeroFromElement || isVeroFromTitle;
        const finalVeroBrand = verobrandFromElement || isVeroFromTitle || 'Unknown brand';

        if (finalIsVero) {
          await handleListingError(
            `Item on Vero Banned list. Not Listed. ${finalVeroBrand} exists in the title`
          );
          return;
        }
      }

      const minPrice = await getLocal('bulk-lister-min-price');
      const maxPrice = await getLocal('bulk-lister-max-price');
      if (isBulkListing && minPrice && realPrice < minPrice) {
        await handleListingError('Price should be greater than min price.');
        return;
      }
      if (isBulkListing && maxPrice && realPrice > maxPrice) {
        await handleListingError('Price should be less than max price.');
        return;
      }

      // check if isFba enable and if product is fba
      const requireFba = await getLocal('bulk-lister-fba');
      if (requireFba) {
        let shipFrom =
          document.querySelector(
            'div[data-csa-c-slot-id="odf-feature-text-desktop-fulfiller-info"]'
          )?.innerText || '';
        shipFrom = shipFrom.toLowerCase();
        if (!shipFrom.includes('amazon')) {
          await handleListingError('This is not Amazon Prime item.');
          return;
        }
      }

      // check if item is in stock or not
      const stockDiv = document.querySelector('#in-stock-icon');
      const isInStock = stockDiv?.style?.color === 'green' ? true : false;
      if (stockDiv && !isInStock) {
        await handleListingError('Item is not in stock');
        return;
      }

      const isAlreadyListed = await checkAlreadyListed();
      if (isAlreadyListed) {
        await handleListingError('This product is already listed.');
        return;
      }

      // is fba only
      await sleep(2);
      // Determine which title optimizer to use based on Lister setting
      const useNoBrand = await getLocal('bulk-lister-title-optimizer-no-brand');
      setUseNoBrandOptimizer(!!useNoBrand);
      let cleanedTitleData;
      if (useNoBrand) {
        cleanedTitleData = cleanTitleNoBrand();
        await sleep(2);
        await handleSnipeTitleNoBrand(undefined, cleanedTitleData);
      } else {
        cleanedTitleData = cleanTitle();
        await sleep(2);
        await handleSnipeTitle(undefined, cleanedTitleData);
      }
      await sleep(2);
      const listProductButton = document.querySelector('#listProductButton');
      if (listProductButton && !listProductButton.disabled) {
        listProductButton.click();
      } else if (listProductButton && listProductButton.disabled) {
        // Check if it's disabled due to VeRO and try override button if available
        const overrideButton = document.querySelector('#overrideVeroBtn');
        if (overrideButton && !overrideButton.disabled && bulkIgnoreVero) {
          overrideButton.click();
        } else {
          const disabledReason = listProductButton.getAttribute('title') || 'Button is disabled';
          await handleListingError(`Cannot auto-list: ${disabledReason}`);
          return;
        }
      } else {
        await handleListingError('List Product button not found on page');
        return;
      }
    } catch (error) {
      notificationApi.error({
        message: 'Auto Listing Error',
        description: error.message
      });
      await handleListingError(error.message);
    }
  }, [realPrice]);

  const handleDeleteListing = async () => {
    const asinElement = document.querySelector('input[id="ASIN"]');
    const asin = asinElement ? asinElement.value : '';

    // 1) Try to fetch listing data to get eBay listing ID (itemId)
    let listingId = null;
    try {
      const res = await chrome.runtime.sendMessage({
        payload: { asin },
        callback: 'getListing'
      });
      const listingData = res?.listingData || {};
      // Try common keys
      listingId = listingData.itemId || listingData.listingId || listingData.id || null;
    } catch (e) {
      // ignore
    }

    // 2) Request DB deletion by ASIN (existing behavior)
    const listingDeleted = await chrome.runtime.sendMessage({
      payload: { asin },
      callback: 'deleteListing'
    });

    // 3) If we know the eBay listing id, open Active Listings to end that listing via automation
    if (listingId) {
      try {
        const userId = await getLocal('current-user');
        const domain = await getLocal(`selected-domain-${userId}`);
        let ebayLink = 'https://www.ebay.com';
        if (domain === 'UK') ebayLink = 'https://www.ebay.co.uk';

        // Share the target listing id and intent with the content script
        await setLocal('end-single-listing-id', String(listingId));

        await chrome.runtime.sendMessage({
          payload: {
            url: `${ebayLink}/sh/lst/active?action=pagination&sort=timeRemaining&limit=200&localType=end-single`,
            active: false
          },
          callback: 'openTab'
        });
      } catch (e) {
        // Fallback silently if we cannot open end-single flow
      }
    }

    if (listingDeleted?.success) {
      notificationApi.success({
        message: 'Listing',
        description: listingDeleted?.message,
        duration: 0
      });
      setIsAsinAlreadyListed(false);
    }
  };



  const checkAlreadyListed = async () => {
    try {
      const asinElement = document.querySelector('input[id="ASIN"]');
      const asin = asinElement ? asinElement.value : '';
      const alreadyListingData = await chrome.runtime.sendMessage({
        payload: {
          asin
        },
        callback: 'getListing'
      });

      const { listingData, success } = alreadyListingData || {};
      if (success && listingData && Object.keys(listingData).length > 0) {
        setIsAsinAlreadyListed(true);
      } else {
        setIsAsinAlreadyListed(false);
      }
      return listingData;
    } catch (error) {
      console.log('🚀 ~ useEffect ~ error:', error);
    }
  };

  useEffect(() => {
    if (isTitle && images.length) {
      const urlParams = new URLSearchParams(window.location.search);
      const isAutoList = urlParams.get('autoList');
      if (isAutoList) {
        console.log('Auto-listing triggered due to URL parameter: autoList=true');
        handleAutoListing();

      }
    }
  }, [isTitle, images]);

  useEffect(() => {
    if (userId) {
      getSellPrice();
      generateImages();
      const title = document.querySelector('#productTitle')?.innerText || '';
      if (title) {
        setTitles([
          {
            id: 1,
            key: 'title-1',
            type: 'Actual',
            title: title,
            characters: title.length
          }
        ]);

        setSelectedTitle(title);
        setIsTitle(true);
      }

      const brandDivs = document.querySelectorAll('.po-brand > td');
      const brand = brandDivs?.[1]?.innerText || '';
      if (brand) setSelectedBrand(brand);

      const veroDiv = document.querySelector('#vero-brand-icon');
      const isVero = veroDiv?.style?.color === 'red' ? true : false;

      if (veroDiv && isVero) {
        setIsVeroBrand(true);
      }

      // check if is fba/prime then
      let shipFrom =
        document.querySelector(
          'div[data-csa-c-slot-id="odf-feature-text-desktop-fulfiller-info"]'
        )?.innerText || '';
      shipFrom = shipFrom.toLowerCase();
      if (shipFrom && shipFrom.includes('amazon')) {
        setIsFba(true);
      }

      getSellPrice();

      checkAlreadyListed();
    }
  }, [userId]);



  const toolOptions = [
    {
      id: 'snipeTitleButton',
      disabled: !selectedTitle || titleFetched || isAsinAlreadyListed,
      loading: fetchingTitle,
      label: 'AI Title Optimizer',
      icon: 'https://i.imgur.com/DIl4cqj.png',
      action: handleSnipeTitle,
      CustomTooltip: ({ children }) => <>{children}</>
    },
    {
      id: 'snipeTitleNoBrandButton',
      disabled: !selectedTitle || titleFetched || isAsinAlreadyListed,
      loading: fetchingTitle,
      label: 'AI Title Optimizer (No Brand Name)',
      icon: 'https://i.imgur.com/DIl4cqj.png',
      action: () => {
        const data = cleanTitleNoBrand();
        return handleSnipeTitleNoBrand(undefined, data);
      },
      CustomTooltip: ({ children }) => <>{children}</>
    },
    {
      id: 'listProductButton',
      disabled: isAsinAlreadyListed || selectedTitle.length > 80 || checkIsVero(),
      loading: listingLoading,
      label: 'List Product',
      icon: 'https://i.imgur.com/L2kfQnU.png',
      action: () => handleListProduct(),
      CustomTooltip: ({ children }) => (
        <Tooltip
          title={
            isAsinAlreadyListed
              ? 'Item is already listed'
              : selectedTitle.length > 80
                ? 'Title length should be less then or equal to 80 characters'
                : checkIsVero()
                  ? 'Item on VeRO list - Use Override VeRO & List button instead'
                  : ''
          }
        >
          {children}
        </Tooltip>
      )
    },
    {
      id: 'overrideVeroBtn',
      disabled: isAsinAlreadyListed || selectedTitle.length > 80 || !checkIsVero(),
      loading: listingLoading,
      label: 'Override VeRO & List',
      icon: 'https://i.imgur.com/qWgQ9dk.png',
      action: handleOverrideVeroAndList,
      CustomTooltip: ({ children }) => (
        <Tooltip
          title={
            isAsinAlreadyListed
              ? 'Item is already listed'
              : selectedTitle.length > 80
                ? 'Title length should be less then or equal to 80 characters'
                : !checkIsVero()
                  ? 'Item must be on VeRO list to use this button'
                  : isFba
                    ? 'Override VeRO protection and list this item'
                    : ''
          }
        >
          {children}
        </Tooltip>
      )
    }
  ];

  // thumbs: LaIYkA7

  if (userId)
    return (
      <div>
        <div className='p-4 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4'>
          {/* Left Side */}
          <div className='lg:col-span-1 xl:col-span-1'>
            {/* Breakeven Price Row */}
            <div className='flex justify-between gap-4'>
              <div className='flex flex-col'>
                <p className='text-blue-500 font-bold text-2xl'>
                  {breakevenPrice}
                </p>
                <p className='text-blue-500 font-medium opacity-70 whitespace-nowrap'>
                  Breakeven Price
                </p>
              </div>
              <div className='w-full'>
                <div className='text-center relative'>
                  <div className='absolute top-[9px] w-full border-b' />
                  <span className='bg-white px-4 relative font-semibold text-neutral-500'>
                    Item Info
                  </span>
                </div>
                <div className='w-full flex gap-2'>
                  {/* SEARCH TITLE ON EBAY */}
                  <Button
                    onClick={() => {
                      handleEbayTabOpen();
                    }}
                    className='w-full flex justify-start items-center gap-2 border border-black border-opacity-[0.07] bg-[#D9D9D920] hover:border-opacity-50 hover:bg-[#D9D9D933] rounded-lg px-2 py-1 text-xs disabled:opacity-50'
                  >
                    <img
                      className='w-6 h-6 object-center object-contain'
                      src={'https://i.imgur.com/1MM3gmC.png'}
                      alt={'icon'}
                    />
                    <span>Search Title On Ebay</span>
                  </Button>
                </div>
              </div>
            </div>
            {/* Item Info */}
            <div className='mt-2 flex gap-2'>
              {/* Not In Stock */}
              <Button className='w-[40%] flex justify-start items-center gap-2 border border-black border-opacity-[0.07] bg-[#D9D9D920] hover:border-opacity-50 hover:bg-[#D9D9D933] rounded-lg px-2 py-1 text-xs disabled:opacity-50'>
                <img
                  className='w-6 h-6 object-center object-contain'
                  src={`https://i.imgur.com/${inStock ? 'kluZUDS' : 'LaIYkA7'
                    }.png`}
                  alt={'icon'}
                />
                <span>{inStock ? 'In Stock' : 'Not In Stock'}</span>
              </Button>
              {/* Item On Vero Banned List */}
              <Button
                onClick={() => { }}
                className='w-[60%] flex justify-start items-center gap-2 border border-black border-opacity-[0.07] bg-[#D9D9D920] hover:border-opacity-50 hover:bg-[#D9D9D933] rounded-lg px-2 py-1 text-xs disabled:opacity-50'
              >
                <img
                  className='w-6 h-6 object-center object-contain'
                  src={`https://i.imgur.com/${isVero ? 'LaIYkA7' : 'kluZUDS'
                    }.png`}
                  alt={'icon'}
                />
                <span>
                  {isVero
                    ? `Item on VeRO Banned List: ${isVero}`
                    : 'Not on VeRO List'}
                </span>
              </Button>
            </div>
            {/* Listing Status */}
            <div className='mt-2 flex gap-2'>
              {isAsinAlreadyListed ? (
                <>
                  {/* Already Listed Status - clickable to open user's eBay listing */}
                  <Button
                    onClick={async () => {
                      try {
                        // Try to open the specific listing by id if we have it; otherwise open Active Listings
                        const asinElement = document.querySelector('input[id="ASIN"]');
                        const asin = asinElement ? asinElement.value : '';
                        // fetch listing again to ensure we have latest id
                        const res = await chrome.runtime.sendMessage({ payload: { asin }, callback: 'getListing' });
                        const data = res?.listingData || {};
                        const itemId = data.itemId || data.listingId || data.id || null;
                        const userId = await getLocal('current-user');
                        const domain = await getLocal(`selected-domain-${userId}`);
                        let ebayLink = 'https://www.ebay.com';
                        if (domain === 'UK') ebayLink = 'https://www.ebay.co.uk';
                        const url = itemId ? `${ebayLink}/itm/${itemId}` : `${ebayLink}/sh/lst/active`;
                        await chrome.runtime.sendMessage({ payload: { url, active: true }, callback: 'openTab' });
                      } catch (e) { /* noop */ }
                    }}
                    className='w-[40%] flex justify-start items-center gap-2 border border-blue-500 bg-blue-50 text-blue-700 rounded-lg px-2 py-1 text-xs hover:bg-blue-100 cursor-pointer'
                  >
                    <img
                      className='w-6 h-6 object-center object-contain'
                      src={ebay}
                      alt={'eBay'}
                    />
                    <span>Already Listed</span>
                  </Button>
                  {/* Delete Listing Button */}
                  <Popconfirm
                    title='Delete the listing'
                    description='Are you sure to delete this listing?'
                    placement='left'
                    onConfirm={() => handleDeleteListing()}
                    okText='Yes'
                    cancelText='No'
                  >
                    <Button className='w-[60%] flex justify-start items-center gap-2 border border-amber-500 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg px-2 py-1 text-xs'>
                      <img
                        className='w-6 h-6 object-center object-contain'
                        src={ebay}
                        alt={'eBay'}
                      />
                      <span>Delete listing product</span>
                    </Button>
                  </Popconfirm>
                </>
              ) : (
                /* Not Currently Listed */
                <Button className='w-full flex justify-start items-center gap-2 border border-green-500 bg-green-50 text-green-700 rounded-lg px-2 py-1 text-xs'>
                  <img
                    className='w-6 h-6 object-center object-contain'
                    src='https://i.imgur.com/kluZUDS.png'
                    alt={'icon'}
                  />
                  <span>Not Currently Listed</span>
                </Button>
              )}
            </div>
            {/* Images Row */}
            <div className='mt-3'>
              <div className='text-center relative'>
                <div className='absolute top-[9px] w-full border-b' />
                <span className='bg-white px-4 relative font-semibold text-neutral-500'>
                  Images
                </span>
              </div>
              <ul className='mt-4 grid grid-cols-3 list-none gap-2'>
                {images.map((url, i) => (
                  <li
                    key={i}
                    className='list-none p-2 border rounded-lg relative hover:bg-neutral-50 cursor-pointer'
                  >
                    <img src={url} className='w-40 h-40 object-contain' />
                    <button
                      onClick={() => {
                        const temp = [...images];
                        temp.splice(i, 1);
                        setImages(temp);
                      }}
                      className='absolute z-10 w-6 h-6 flex justify-center items-center bg-white rounded-full top-3 left-3'
                    >
                      <IoMdClose size={20} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {/* Right Side */}
          <div className='lg:col-span-1 xl:col-span-2'>
            {/* Toolbar */}
            <div className='flex flex-wrap justify-end gap-4'>
              {toolOptions.map(
                (
                  { action, icon, label, id, disabled, loading, CustomTooltip },
                  i
                ) => (
                  <CustomTooltip key={i}>
                    <Button
                      id={id}
                      loading={loading}
                      disabled={disabled}
                      onClick={() => action()}
                      key={i}
                      className='flex items-center gap-2 border border-black border-opacity-[0.07] bg-[#D9D9D920] hover:border-opacity-50 hover:bg-[#D9D9D933] rounded-lg px-2 py-1 text-xs disabled:opacity-50'
                    >
                      <img
                        className='w-6 h-6 object-center object-contain'
                        src={icon}
                        alt={label}
                      />
                      <span>{label}</span>
                    </Button>
                  </CustomTooltip>
                )
              )}
              <div className='flex items-center gap-2 text-sm'>
                <img
                  className='w-6 h-6 object-center object-contain'
                  src={'https://i.imgur.com/BtbDm3y.png'}
                  alt={'Icon'}
                />
                <span>Sell it for: </span>
              </div>
              <InputNumber
                value={sellPrice}
                onChange={(value) => setSellPrice(value)}
                className='w-20'
              />
            </div>
            {/* Fieldbox */}
            <TextArea
              className='my-4 !max-h-20 w-full border border-black border-opacity-[0.07] bg-[#D9D9D920] hover:border-opacity-50 rounded-lg px-2 py-1 text-sm'
              row={3}
              value={selectedTitle || ''}
              onChange={(e) => setSelectedTitle(e.target.value)}
            />
            {/* Table */}
            <div>
              <ConfigProvider
                theme={{
                  components: {
                    Table: {
                      // headerBg: "#1ea76b",
                    }
                  }
                }}
              >
                <Table
                  columns={columns}
                  dataSource={titles}
                  pagination={false}
                  style={{
                    width: '100%'
                  }}
                />
              </ConfigProvider>
            </div>
          </div>
        </div>
      </div>
    );

  return (
    <>
      {userId && (
        <Row className={classes.mainDiv}>
          <Row className={classes.imagesDiv}>
            {images.map((imageUrl, index) => (
              <div key={`image-div-${index}`}>
                <CloseOutlined
                  style={{
                    position: 'absolute',
                    fill: 'red',
                    cursor: 'pointer',
                    fontSize: '30px'
                  }}
                  onClick={() => {
                    const temp = [...images];
                    temp.splice(index, 1);
                    setImages(temp);
                  }}
                />
                <img
                  key={`image-${index}`}
                  className={classes.headerIcon2}
                  src={imageUrl}
                  alt='No Image'
                />
              </div>
            ))}
          </Row>
          <Row>
            <ConfigProvider
              theme={{
                components: {
                  Table: {
                    headerBg: '#1ea76b'
                  }
                }
              }}
            >
              <Table
                columns={columns}
                dataSource={titles}
                pagination={false}
                style={{
                  width: '100%'
                }}
              />
            </ConfigProvider>
          </Row>
          <Row>
            <TextArea
              row={3}
              value={selectedTitle || ''}
              onChange={(e) => setSelectedTitle(e.target.value)}
            />
          </Row>
          <Row className={classes.buttonDiv}>
            <Button
              id='snipeTitleButton'
              type='primary'
              disabled={!selectedTitle || titleFetched || isAsinAlreadyListed}
              loading={fetchingTitle}
              onClick={handleSnipeTitle}
            >
              AI Title Optimizer
            </Button>
            <Tooltip
              title={
                isAsinAlreadyListed
                  ? 'Item is already listed'
                  : selectedTitle.length > 80
                    ? 'Title length should be less then or equal to 80 characters'
                    : isFba
                      ? ''
                      : ''
              }
            >
              <Button
                id='listProductButton'
                type='primary'
                loading={listingLoading}
                onClick={() => handleListProduct()}
                disabled={
                  isAsinAlreadyListed || !isFba || selectedTitle.length > 80
                }
              >
                List Product
              </Button>
            </Tooltip>
            <Row style={{ flexDirection: 'column' }}>
              <Text>Sell it for</Text>
              <InputNumber
                style={{ width: '150px' }}
                value={sellPrice}
                onChange={(value) => setSellPrice(value)}
              />
            </Row>
            <Row style={{ flexDirection: 'column' }}>
              <Text>Breakeven Price</Text>
              <Text strong>{breakevenPrice || 'N/A'}</Text>
            </Row>
            {/* <Row style={{ flexDirection: 'column' }}>
                <Text>
                  Similar Item Number
                </Text>
                <InputNumber disabled style={{ width: '150px' }} />
              </Row> */}
            {/* <Button type='primary'>Import</Button> */}
          </Row>
          <canvas id='imageGenerationCanvas' style={{ display: 'none' }} />
          <canvas
            id='defaultImageGenerationCanvas'
            style={{ display: 'none' }}
          />
        </Row>
      )}
    </>
  );
};

const ProductPageDataBox = (props) => {
  return (
    <ConfigProvider>
      <App>
        <ProductPageDataBoxContent {...props} />
      </App>
    </ConfigProvider>
  );
};

export default ProductPageDataBox;
