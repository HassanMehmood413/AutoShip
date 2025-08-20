import moment from 'moment';
import {
  useEffect,
  useState
} from 'react';
import { makeStyles } from '@material-ui/core/styles';
import {
  Row,
  Typography,
  Button,
  Col,
  InputNumber,
  Card,
  Image,
  message,
  notification
} from 'antd';
import { BsPersonCircle } from 'react-icons/bs';
import { FcStatistics } from 'react-icons/fc';
import { IoMdCopy } from 'react-icons/io';
import { IoIosSave } from 'react-icons/io';
import { FaAmazon } from 'react-icons/fa';
import { MdImageSearch } from 'react-icons/md';
import { FiTrash2 } from 'react-icons/fi';
import { isEmpty } from 'lodash';

import {
  getLocal,
  setLocal
} from '../../services/dbService';

import './style.css';

const { Title, Text } = Typography;

const useStyles = makeStyles({
  mainDiv: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    background: '#f6f6f6'
  },
  header: {
    marginTop: '1px'
  },
  filterBox: {
    gap: '10px',
    flexDirection: 'column',
    width: '900px',
    background: 'white',
    padding: '15px',
    borderRadius: '5px',
    boxShadow: '0 0 5px rgba(0,0,0,0.1)'
  },
  filterGroup: {
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  productsBox: {
    gap: '5px',
    flexDirection: 'column',
    width: '900px',
    background: '#f6f6f6'
  },
  actionButton: {
    fontSize: '10px',
    cursor: 'pointer'
  },
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    overflow: 'scroll'
  },
  listingButtons: {
    marginTop: '5px',
    gap: '5px'
  },
  soldHistoryStyling: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid grey'
  }
});

const EbayItemsScanner = () => {
  const classes = useStyles();

  const [allEbayHuntedProducts, setAllEbayHuntedProducts] = useState([]);
  const [minimumSold, setMinimumSold] = useState(0);
  const [itemSoldWithin, setItemSoldWithin] = useState(0);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState('USA');
  const [totalCompetitors, setTotalCompetitors] = useState('N/A');
  const [soldHistoryData, setSoldHistoryData] = useState([{ key: '1', days: 1, totalSold: 0 },
    { key: '2', days: 3, totalSold: 0 },
    { key: '3', days: 7, totalSold: 0 },
    { key: '4', days: 14, totalSold: 0 },
    { key: '5', days: 30, totalSold: 0 },
    { key: '6', days: 60, totalSold: 0 },
    { key: '7', days: 90, totalSold: 0 }]);

  const amazon = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQV5wT5R7vumVlrrcVIzxKqoqNYtNmpJqwMIQ&s';
  const ebay = 'https://static.vecteezy.com/system/resources/previews/020/336/172/non_2x/ebay-logo-ebay-icon-free-free-vector.jpg';
  const teraPeak = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS4mJgVrZkAzQiX_ujPnn23JaYq23YFNqCj-w&s';
  const googleLens = 'https://www.techjuice.pk/wp-content/uploads/2021/03/unnamed-1.png';
  const sold = 'https://uxwing.com/wp-content/themes/uxwing/download/e-commerce-currency-shopping/sold-icon.png';

  const IconWithTooltip = ({ element, tooltip }) => (
    <div className='icon-container'>
      {element}
      <span className='tooltip'>{tooltip}</span>
    </div>
  );

  const copyToClip = (dataToBeCopied) => {
    navigator.clipboard.writeText(JSON.stringify(dataToBeCopied));
    message.success('Text Copied');
  };

  const saveEbaySeller = async (storeName) => {
    let ebaySellers = await getLocal('competitor-search-seller-names-persisted') || [];
    ebaySellers = [...ebaySellers, storeName];
    ebaySellers = [...new Set(ebaySellers)];

    await setLocal('competitor-search-seller-names-persisted', ebaySellers);

    message.success('Ebay Seller Saved');
  };

  const handleTerapeakSearch = async (title) => {
    const messages = [{
      role: 'user',
      content: `${title}/n Describe the item with 3 KEY WORDS that shoppers would search for. And pick the best one.`
    }];

    let response = await chrome.runtime.sendMessage({
      payload: {
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
              required: [
                'titles'
              ]
            }
          }
        }
      },
      callback: 'chat-gpt'
    });

    if (response?.success === false) {
      notification.error({
        message: 'Open AI API Error',
        description: response.error
      });
      return;
    }

    response = JSON.parse(response.content);

    const { titles } = response;

    const userId = await getLocal('current-user');
    const domain = await getLocal(`selected-domain-${userId}`);

    let ebayLink = 'https://www.ebay.com';
    if (domain === 'UK') {
      ebayLink = 'https://www.ebay.co.uk';
    }

    const terapeakLink = `${ebayLink}/sh/research?keywords=${titles[1]}&dayRange=30&categoryId=0&offset=0&limit=50&sorting=-itemssold&tabName=SOLD&marketplace=EBAY-US&tz=America/Toronto&minPrice=0`;
    window.open(terapeakLink, '_blank');
  };

  const handleApplyFilters = async () => {
    try {
      console.log("🔍 Applying filters...");
      
      // Get the original data from storage
      const ebayHuntedProducts = await getLocal(`ebay-hunted-products-${currentUserId}`);
      let filteredProducts = ebayHuntedProducts || [];

      if (!isFilterApplied) {
        console.log("Applying filters with criteria:", {
          minimumSold,
          itemSoldWithin,
          minPrice,
          maxPrice
        });

        if (minimumSold > 0) {
          filteredProducts = filteredProducts.filter(item => (item.totalSold || 0) >= minimumSold);
          console.log(`Filtered by minimum sold (${minimumSold}): ${filteredProducts.length} items`);
        }

        if (itemSoldWithin > 0) {
          const startDate = moment().subtract(itemSoldWithin, 'days').toDate();
          const endDate = moment().toDate();

          filteredProducts = filteredProducts.filter(product => {
            if (!product.soldAt) return false;
            const productDate = new Date(product.soldAt);
            return productDate >= startDate && productDate <= endDate;
          });
          console.log(`Filtered by sold within (${itemSoldWithin} days): ${filteredProducts.length} items`);
        }

        if (minPrice > 0) {
          const regex = /[\d.]+/;
          filteredProducts = filteredProducts.filter((obj) => {
            if (!obj.price) return false;
            let price = obj.price.match(regex);
            price = price ? parseFloat(price) : 0;
            return price >= minPrice;
          });
          console.log(`Filtered by min price (${minPrice}): ${filteredProducts.length} items`);
        }

        if (maxPrice > 0) {
          const regex = /[\d.]+/;
          filteredProducts = filteredProducts.filter((obj) => {
            if (!obj.price) return false;
            let price = obj.price.match(regex);
            price = price ? parseFloat(price) : 0;
            return price <= maxPrice;
          });
          console.log(`Filtered by max price (${maxPrice}): ${filteredProducts.length} items`);
        }
      } else {
        // Cancel filters - restore original data
        console.log("Canceling filters, restoring original data");
        filteredProducts = ebayHuntedProducts || [];
      }

      if (!filteredProducts.length) {
        notification.warning({
          message: 'Filter Results',
          description: 'No items match the selected criteria.'
        });
      } else {
        notification.success({
          message: 'Filters Applied',
          description: `Found ${filteredProducts.length} matching items.`
        });
      }

      // Process sold history for filtered products
      for (let i = 0; i < filteredProducts.length; i += 1) {
        const { soldHistory = {} } = filteredProducts[i] || {};
        if (!isEmpty(soldHistory)) {
          const data = [];
          for (const [key, value] of Object.entries(soldHistory)) {
            data.push({
              key,
              days: key,
              totalSold: value
            });
          }
          filteredProducts[i]['updatedSoldHistory'] = data;
        }
      }
      
      setAllEbayHuntedProducts(filteredProducts);
      setIsFilterApplied(!isFilterApplied);
      
      console.log("✅ Filters applied successfully");
      
    } catch (error) {
      console.error("Error applying filters:", error);
      notification.error({
        message: "Filter Error",
        description: "Failed to apply filters. Please try again."
      });
    }
  };

  const handleClearItems = async () => {
    try {
      // Add confirmation dialog
      const confirmed = window.confirm(
        "Are you sure you want to clear all eBay hunted products? This action cannot be undone."
      );
      
      if (!confirmed) {
        return;
      }
      
      console.log("🗑️ Clearing all items...");
      
      const currentUserId = await getLocal('current-user');
      await setLocal(`ebay-hunted-products-${currentUserId}`, []);
      
      // Also clear any alternative storage keys
      const allStorageData = await chrome.storage.local.get(null);
      const productKeys = Object.keys(allStorageData).filter(key => key.includes('ebay-hunted-products'));
      
      for (const key of productKeys) {
        await setLocal(key, []);
      }
      
      setAllEbayHuntedProducts([]);
      setIsFilterApplied(false);
      
      // Reset filter inputs
      setMinimumSold(0);
      setItemSoldWithin(0);
      setMinPrice(0);
      setMaxPrice(0);
      
      notification.success({
        message: "Items Cleared",
        description: "All eBay hunted products have been cleared successfully."
      });
      
    } catch (error) {
      console.error("Error clearing items:", error);
      notification.error({
        message: "Clear Error",
        description: "Failed to clear items. Please try again."
      });
    }
  };

  const handleRefreshData = async () => {
    try {
      setIsLoading(true);
      console.log("🔄 Refreshing data...");
      
      const userId = await getLocal('current-user');
      const domain = await getLocal(`selected-domain-${userId}`) || 'USA';
      setSelectedDomain(domain);
      const competitorsList = await getLocal(`competitor-search-seller-names-${domain}`);
      setTotalCompetitors(Array.isArray(competitorsList) ? competitorsList.length : 'N/A');

      const ebayHuntedProducts = await getLocal(`ebay-hunted-products-${userId}`);
      
      if (!ebayHuntedProducts || ebayHuntedProducts.length === 0) {
        notification.info({
          message: "No Data",
          description: "No eBay hunted products found. Run the competitor scanner first."
        });
        setIsLoading(false);
        return;
      }
      
      // Process the products
      for (let i = 0; i < ebayHuntedProducts.length; i += 1) {
        const { soldHistory = {} } = ebayHuntedProducts[i] || {};
        if (!isEmpty(soldHistory)) {
          const data = [];
          for (const [key, value] of Object.entries(soldHistory)) {
            data.push({
              key,
              days: key,
              totalSold: value
            });
          }
          ebayHuntedProducts[i]['updatedSoldHistory'] = data;
        }
      }
      
      // Attempt to backfill missing fields for loaded products
      const repaired = await backfillMissingProducts(ebayHuntedProducts, domain);

      setAllEbayHuntedProducts(repaired);
      setIsFilterApplied(false);
      
      notification.success({
        message: "Data Refreshed",
        description: `Loaded ${ebayHuntedProducts.length} items.`
      });
      
      console.log("✅ Data refreshed successfully");
      
    } catch (error) {
      console.error("Error refreshing data:", error);
      notification.error({
        message: "Refresh Error",
        description: "Failed to refresh data. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getEbayBaseUrl = (domain) => {
    switch (domain) {
      case 'UK': return 'https://www.ebay.co.uk';
      case 'Germany': return 'https://www.ebay.de';
      case 'France': return 'https://www.ebay.fr';
      case 'Italy': return 'https://www.ebay.it';
      case 'Spain': return 'https://www.ebay.es';
      case 'Australia': return 'https://www.ebay.com.au';
      case 'Canada': return 'https://www.ebay.ca';
      default: return 'https://www.ebay.com';
    }
  };

  const parseSoldFromDetail = (doc) => {
    try {
      const candidates = [
        'div.d-quantity__availability',
        'div.x-quantity__availability',
        '#RightSummaryPanel',
        'div[class*="availability"]',
        'a[href*="sold"]',
      ];
      for (const sel of candidates) {
        const el = doc.querySelector(sel);
        const txt = el?.innerText || '';
        const m = txt.match(/([0-9]{1,6})\s+sold/i);
        if (m && m[1]) return Number(m[1]);
      }
    } catch (_) {}
    return null;
  };

  const backfillMissingProducts = async (products, domain) => {
    try {
      if (!Array.isArray(products) || products.length === 0) return products || [];
      const baseUrl = getEbayBaseUrl(domain);
      const updated = [...products];
      let changed = false;

      const processIndex = async (i) => {
        const item = updated[i] || {};
        const missingTitle = !item.title || item.title === 'No Title' || item.title === 'N/A';
        const missingPrice = !item.price || item.price === '0' || item.price === 'N/A';
        const missingImage = !item.image || item.image === 'N/A';
        const missingSoldAt = !item.soldAt || item.soldAt === 'N/A';
        const missingTotalSold = !item.totalSold || item.totalSold === 'N/A' || Number(item.totalSold) === 0;

        if (!(missingTitle || missingPrice || missingImage || missingSoldAt || missingTotalSold)) return;
        const itemNumber = item.itemNumber;
        if (!itemNumber || !/\d{7,15}/.test(String(itemNumber))) return;

        // Fetch product detail page via background to avoid CORS
        let detailHtml = '';
        try {
          const detailUrl = `${baseUrl}/itm/${itemNumber}`;
          const resp = await chrome.runtime.sendMessage({ callback: 'fetchHtml', payload: { url: detailUrl } });
          if (resp?.success && (resp?.html || resp?.data)) {
            detailHtml = resp.html || resp.data;
          }
        } catch (_) {}

        if (detailHtml) {
          try {
            const doc = new DOMParser().parseFromString(detailHtml, 'text/html');
            if (missingTitle) {
              const newTitle = doc.querySelector('#itemTitle')?.innerText?.replace(/^Details about\s*/i, '').trim()
                || doc.querySelector('h1[itemprop="name"]')?.innerText?.trim()
                || doc.querySelector('h1.x-item-title__mainTitle')?.innerText?.trim()
                || doc.querySelector('h1[data-testid="x-item-title"] .ux-textspans')?.innerText?.trim();
              if (newTitle) { item.title = newTitle; changed = true; }
            }
            if (missingPrice) {
              const priceText = doc.querySelector('#prcIsum')?.innerText
                || doc.querySelector('#mm-saleDscPrc')?.innerText
                || doc.querySelector('span[itemprop="price"]')?.getAttribute('content')
                || doc.querySelector('div.x-price-primary span.ux-textspans')?.innerText
                || doc.querySelector('span.ux-textspans--BOLD')?.innerText;
              if (priceText) { item.price = priceText; changed = true; }
            }
            if (missingImage) {
              const img = doc.querySelector('#icImg')?.src
                || doc.querySelector('img#icImg')?.src
                || doc.querySelector('div.ux-image-carousel img')?.src
                || doc.querySelector('img[src*="i.ebayimg.com"]')?.src
                || doc.querySelector('img[data-src]')?.getAttribute('data-src')
                || doc.querySelector('img[data-async-src]')?.getAttribute('data-async-src')
                || doc.querySelector('source[srcset]')?.getAttribute('srcset')?.split(' ')[0];
              if (img) { item.image = img; changed = true; }
            }
            if ((!item.sellerName || item.sellerName === 'Unknown Seller' || item.sellerName === 'N/A')) {
              const fallbackSeller = doc.querySelector('#RightSummaryPanel .mbg-nw')?.innerText
                || doc.querySelector('a[href*="/usr/"] span.ux-textspans')?.innerText
                || doc.querySelector('a[href*="/usr/"]')?.innerText
                || doc.querySelector('a[href*="/str/"]')?.innerText;
              if (fallbackSeller) { item.sellerName = fallbackSeller; changed = true; }
            }
            if (missingTotalSold) {
              const soldFromDetail = parseSoldFromDetail(doc);
              if (soldFromDetail !== null) { item.totalSold = soldFromDetail; changed = true; }
            }
          } catch (_) {}
        }

        // If soldAt or totalSold still missing, try purchase history
        if (missingSoldAt || missingTotalSold) {
          try {
            const histUrl = `${baseUrl}/bin/purchaseHistory?item=${itemNumber}`;
            const histResp = await chrome.runtime.sendMessage({ callback: 'fetchHtml', payload: { url: histUrl } });
            const html = histResp?.html || histResp?.data || '';
            if (html) {
              const ph = new DOMParser().parseFromString(html, 'text/html');
              const table = ph?.querySelector('table.app-table__table');
              const rows = table?.querySelectorAll('tr.app-table__row') || [];
              let total = 0;
              let latestDate = null;
              if (rows.length > 0) {
                const header = table?.querySelector('tr.app-table__header-row');
                const headers = header?.querySelectorAll('th') || [];
                let quantityIndex = 0;
                let dateIndex = 0;
                for (let k = 0; k < headers.length; k += 1) {
                  const t = headers[k].innerText.toLowerCase();
                  if (t === 'quantity') quantityIndex = k;
                  if (t.includes('purchase')) dateIndex = k;
                }
                for (let r = 0; r < rows.length; r += 1) {
                  const tds = rows[r].querySelectorAll('td');
                  const q = Number(tds[quantityIndex]?.innerText || '0');
                  const dText = tds[dateIndex]?.innerText || '';
                  total += isNaN(q) ? 0 : q;
                  // Normalize date formats commonly used by eBay
                  const formats = ['DD MMM YYYY [at] h:mm:ssa [GMT]', 'DD MMM YYYY', 'D MMM YYYY', 'MMM DD, YYYY', 'YYYY-MM-DD'];
                  let m = null;
                  for (const f of formats) {
                    const parsed = moment(dText, f, true);
                    if (parsed.isValid()) { m = parsed; break; }
                  }
                  if (m && (!latestDate || m.isAfter(latestDate))) latestDate = m;
                }
              }
              if (missingTotalSold && total > 0) { item.totalSold = total; changed = true; }
              if (missingSoldAt && latestDate) { item.soldAt = latestDate.format('DD MMM YYYY'); changed = true; }
            }
          } catch (_) {}
        }
      };

      // Run with small concurrency to speed up repair
      const needing = [];
      for (let i = 0; i < updated.length; i += 1) {
        const it = updated[i] || {};
        const missing = (!it.title || it.title === 'No Title' || it.title === 'N/A')
          || (!it.price || it.price === '0' || it.price === 'N/A')
          || (!it.image || it.image === 'N/A')
          || (!it.soldAt || it.soldAt === 'N/A')
          || (!it.totalSold || it.totalSold === 'N/A' || Number(it.totalSold) === 0);
        if (missing) needing.push(i);
      }
      const pool = 6;
      for (let s = 0; s < needing.length; s += pool) {
        const batch = needing.slice(s, s + pool);
        await Promise.all(batch.map(processIndex));
      }

      if (changed) {
        try {
          const uid = await getLocal('current-user');
          await setLocal(`ebay-hunted-products-${uid}`, updated);
        } catch (_) {}
      }
      return updated;
    } catch (_) {
      return products || [];
    }
  };

  const handleExportTitlesToClipboard = () => {
    try {
      if (!allEbayHuntedProducts || allEbayHuntedProducts.length === 0) {
        notification.warning({
          message: "No Data",
          description: "No items to export. Please load data first."
        });
        return;
      }
      
      let allTitles = allEbayHuntedProducts.map(item => item.title).filter(title => title);
      const titlesText = allTitles.join('\n');

      navigator.clipboard.writeText(titlesText);
      message.success(`Exported ${allTitles.length} titles to clipboard`);
      
      console.log("✅ Titles exported successfully");
      
    } catch (error) {
      console.error("Error exporting titles:", error);
      notification.error({
        message: "Export Error",
        description: "Failed to export titles. Please try again."
      });
    }
  };

  const handleAddTitlesToFinder = async () => {
    try {
      const titles = (allEbayHuntedProducts || [])
        .map((p) => (p?.title ? String(p.title).trim() : ''))
        .filter(Boolean);
      const unique = Array.from(new Set(titles));

      const userId = await getLocal('current-user');
      await setLocal('product-hunter-titles', unique);
      await setLocal('product-hunter-titles-persisted', unique);
      await setLocal(`result-percentage-add-value-${userId}`, unique.length ? 100 / unique.length : 0);

      notification.success({
        message: 'Titles Added to Finder',
        description: `${unique.length} titles added to eComMiracle Searcher.`
      });
    } catch (error) {
      notification.error({
        message: 'Add to Finder Failed',
        description: error?.message || 'Unexpected error'
      });
    }
  };

  const handleCopyTitleOnly = async (title) => {
    try {
      await navigator.clipboard.writeText(title || '');
      message.success('Title copied');
    } catch (e) {
      message.error('Failed to copy title');
    }
  };

  const handleSearchAmazonSimple = (title) => {
    try {
      handleOpenNewTab('amazon', `/s?k=${encodeURIComponent(title || '')}`);
    } catch (_) {}
  };

  const handleSearchGoogleImages = (title) => {
    try {
      const url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(title || '')}`;
      window.open(url, '_blank');
    } catch (_) {}
  };

  const handleRemoveItem = async (index) => {
    try {
      const updated = [...allEbayHuntedProducts];
      if (index >= 0 && index < updated.length) {
        updated.splice(index, 1);
        setAllEbayHuntedProducts(updated);
        // Persist removal
        const userId = currentUserId || (await getLocal('current-user'));
        await setLocal(`ebay-hunted-products-${userId}`, updated);
        message.success('Removed');
      }
    } catch (e) {
      message.error('Failed to remove');
    }
  };

  const handleOpenNewTab = async (platform, link) => {
    const userId = await getLocal('current-user');
    const domain = await getLocal(`selected-domain-${userId}`);

    let ebayLink = 'https://www.ebay.com';
    let amazonLink = 'https://www.amazon.com';

    if (domain === 'UK') {
      ebayLink = 'https://www.ebay.co.uk';
      amazonLink = 'https://www.amazon.co.uk';
    }

    let openTabLink = ebayLink;
    if (platform === 'amazon') {
      openTabLink = amazonLink;
    }

    window.open(`${openTabLink}${link}`, '_blank');
  };

  const handleTestData = async () => {
    try {
      console.log("🧪 Adding test data...");
      
      const testData = [
        {
          title: "Ohocut Boho Shower Curtain Green Shower Curtain Cute Floral Shower Curtains for",
          price: "£17.80",
          soldAt: "28 Jan 2025",
          itemNumber: "226434038719",
          sellerName: "suemporium",
          breakevenPrice: "£16.59",
          totalSold: 6,
          image: "https://i.ebayimg.com/images/g/abc123/s-l1600.jpg",
          soldHistory: {
            "1": 1,
            "3": 1,
            "7": 1,
            "14": 1,
            "30": 1,
            "60": 2,
            "90": 6
          }
        },
        {
          title: "Kids Makeup Sets for Girls, Girls Toys for 3 4 5 6 7 Year Old Girls Makeup Sets",
          price: "£23.29",
          soldAt: "28 Jan 2025",
          itemNumber: "226483732505",
          sellerName: "toysrus_uk",
          breakevenPrice: "£20.50",
          totalSold: 12,
          image: "https://i.ebayimg.com/images/g/def456/s-l1600.jpg",
          soldHistory: {
            "1": 2,
            "3": 3,
            "7": 5,
            "14": 8,
            "30": 10,
            "60": 11,
            "90": 12
          }
        },
        {
          title: "Wireless Bluetooth Headphones Noise Cancelling Over Ear Gaming Headset",
          price: "£45.99",
          soldAt: "27 Jan 2025",
          itemNumber: "226483732506",
          sellerName: "tech_store",
          breakevenPrice: "£40.00",
          totalSold: 3,
          image: "https://i.ebayimg.com/images/g/ghi789/s-l1600.jpg",
          soldHistory: {
            "1": 0,
            "3": 1,
            "7": 2,
            "14": 2,
            "30": 3,
            "60": 3,
            "90": 3
          }
        }
      ];
      
      // Process the test data
      for (let i = 0; i < testData.length; i += 1) {
        const { soldHistory = {} } = testData[i] || {};
        if (!isEmpty(soldHistory)) {
          const data = [];
          for (const [key, value] of Object.entries(soldHistory)) {
            data.push({
              key,
              days: key,
              totalSold: value
            });
          }
          testData[i]['updatedSoldHistory'] = data;
        }
      }
      
      await setLocal(`ebay-hunted-products-${currentUserId}`, testData);
      setAllEbayHuntedProducts(testData);
      setIsFilterApplied(false);
      
      notification.success({
        message: "Test Data Added",
        description: `Added ${testData.length} test items for demonstration.`
      });
      
      console.log("✅ Test data added successfully");
      
    } catch (error) {
      console.error("Error adding test data:", error);
      notification.error({
        message: "Test Data Error",
        description: "Failed to add test data. Please try again."
      });
    }
  };

  const handleDebugStorage = async () => {
    try {
      console.log("🔍 Debugging storage...");
      
      const allStorageData = await chrome.storage.local.get(null);
      console.log("All storage data:", allStorageData);
      
      const userId = await getLocal('current-user');
      console.log("Current user ID:", userId);
      
      const productKeys = Object.keys(allStorageData).filter(key => key.includes('ebay-hunted-products'));
      console.log("Product keys found:", productKeys);
      
      const competitorSearchStatus = await getLocal('competitor-search-status');
      const isCompetitorSearch = await getLocal('is-competitor-search');
      
      let debugInfo = `Storage Debug Info:\n\n`;
      debugInfo += `Current User ID: ${userId}\n`;
      debugInfo += `Product Keys: ${productKeys.join(', ')}\n`;
      debugInfo += `Competitor Search Status: ${competitorSearchStatus}\n`;
      debugInfo += `Is Competitor Search Running: ${isCompetitorSearch}\n\n`;
      
      if (productKeys.length > 0) {
        productKeys.forEach(key => {
          const products = allStorageData[key];
          debugInfo += `${key}: ${products?.length || 0} products\n`;
          if (products && products.length > 0) {
            debugInfo += `Sample: ${products[0]?.title?.substring(0, 50)}...\n`;
          }
        });
      }
      
      console.log(debugInfo);
      
      notification.info({
        message: "Debug Info",
        description: `Found ${productKeys.length} product keys. Check console for details.`,
        duration: 5,
      });
      
    } catch (error) {
      console.error("Error debugging storage:", error);
      notification.error({
        message: "Debug Error",
        description: "Failed to debug storage. Check console for error."
      });
    }
  };

  const handleForceReload = async () => {
    try {
      setIsLoading(true);
      console.log("🔄 Force reloading data...");
      
      // Clear any cached data
      setAllEbayHuntedProducts([]);
      
      // Wait a moment for state to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Reload data
      const userId = await getLocal('current-user');
      const allStorageData = await chrome.storage.local.get(null);
      const productKeys = Object.keys(allStorageData).filter(key => key.includes('ebay-hunted-products'));
      
      let ebayHuntedProducts = null;
      
      if (productKeys.includes(`ebay-hunted-products-${userId}`)) {
        ebayHuntedProducts = allStorageData[`ebay-hunted-products-${userId}`];
      } else if (productKeys.length > 0) {
        const alternativeKey = productKeys[0];
        ebayHuntedProducts = allStorageData[alternativeKey];
      }
      
      if (ebayHuntedProducts && ebayHuntedProducts.length > 0) {
        // Process the products
        for (let i = 0; i < ebayHuntedProducts.length; i += 1) {
          const { soldHistory = {} } = ebayHuntedProducts[i] || {};
          if (!isEmpty(soldHistory)) {
            const data = [];
            for (const [key, value] of Object.entries(soldHistory)) {
              data.push({
                key,
                days: key,
                totalSold: value
              });
            }
            ebayHuntedProducts[i]['updatedSoldHistory'] = data;
          }
        }
        
        setAllEbayHuntedProducts(ebayHuntedProducts);
        notification.success({
          message: "Data Reloaded",
          description: `Successfully loaded ${ebayHuntedProducts.length} items.`
        });
      } else {
        notification.warning({
          message: "No Data",
          description: "No items found in storage. Run the competitor scanner first."
        });
      }
      
    } catch (error) {
      console.error("Error force reloading:", error);
      notification.error({
        message: "Reload Error",
        description: "Failed to reload data. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestCompetitorSearch = async () => {
    try {
      console.log("🧪 Testing competitor search flow...");
      
      const userId = await getLocal('current-user');
      console.log("Current user ID:", userId);
      
      // Set up test sellers
      const testSellers = ['theswisslink', 'dangerousdrummer'];
      await setLocal(`competitor-search-seller-names-UK`, testSellers);
      
      // Set domain to UK
      await setLocal(`selected-domain-${userId}`, 'UK');
      
      // Set competitor search parameters
      await setLocal(`competitor-search-sold-history`, 'On');
      await setLocal(`competitor-search-sold-within`, 30);
      
      // Start competitor search
      await setLocal('is-competitor-search', true);
      await setLocal('competitor-search-status', null);
      
      notification.info({
        message: "Test Setup Complete",
        description: "Competitor search test data set up. Please run the competitor scanner now.",
        duration: 5,
      });
      
    } catch (error) {
      console.error("Error setting up test:", error);
      notification.error({
        message: "Test Setup Error",
        description: "Failed to set up test data."
      });
    }
  };

  const handleShowDataStatus = async () => {
    try {
      console.log("📊 Showing data status...");
      
      const userId = await getLocal('current-user');
      const allStorageData = await chrome.storage.local.get(null);
      const productKeys = Object.keys(allStorageData).filter(key => key.includes('ebay-hunted-products'));
      
      let statusInfo = `Data Status Report:\n\n`;
      statusInfo += `Current User ID: ${userId}\n`;
      statusInfo += `Product Keys Found: ${productKeys.length}\n\n`;
      
      let totalProducts = 0;
      
      for (const key of productKeys) {
        const products = allStorageData[key];
        const count = products?.length || 0;
        totalProducts += count;
        statusInfo += `${key}: ${count} products\n`;
        
        if (count > 0) {
          statusInfo += `  Sample: ${products[0]?.title?.substring(0, 50)}...\n`;
          statusInfo += `  Price: ${products[0]?.price}\n`;
          statusInfo += `  Seller: ${products[0]?.sellerName}\n\n`;
        }
      }
      
      statusInfo += `Total Products Across All Keys: ${totalProducts}\n`;
      statusInfo += `Current Display Count: ${allEbayHuntedProducts?.length || 0}\n`;
      
      console.log(statusInfo);
      
      notification.info({
        message: "Data Status",
        description: `Found ${totalProducts} total products across ${productKeys.length} storage keys. Check console for details.`,
        duration: 8,
      });
      
    } catch (error) {
      console.error("Error showing data status:", error);
      notification.error({
        message: "Status Error",
        description: "Failed to show data status."
      });
    }
  };

  const handleManualContentScript = async () => {
    try {
      console.log("🔧 Manually triggering content script...");
      
      // Get current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        notification.error({
          message: "No Active Tab",
          description: "Please navigate to an eBay page first."
        });
        return;
      }
      
      console.log("Current tab URL:", tab.url);
      
      // Check if we're on an eBay page
      if (!tab.url.includes('ebay.co.uk') && !tab.url.includes('ebay.com')) {
        notification.error({
          message: "Not on eBay",
          description: "Please navigate to an eBay page first."
        });
        return;
      }
      
      // Manually execute the content script
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['ebay_all_products_page.bundle.js']
        });
        
        notification.success({
          message: "Content Script Executed",
          description: "Content script has been manually executed. Check console for results."
        });
        
      } catch (error) {
        console.error("Content script execution error:", error);
        
        if (error.message.includes('permission')) {
          notification.error({
            message: "Permission Error",
            description: "Extension needs to be reloaded. Please reload the extension in chrome://extensions/"
          });
        } else {
          notification.error({
            message: "Execution Error",
            description: "Failed to execute content script. Check console for details."
          });
        }
      }
      
    } catch (error) {
      console.error("Error in manual content script:", error);
      notification.error({
        message: "Manual Script Error",
        description: "Failed to trigger content script."
      });
    }
  };

  const handleMonitorDataCollection = async () => {
    try {
      console.log("📊 Monitoring data collection process...");
      
      // Check if competitor search is running
      const isCompetitorSearch = await getLocal('is-competitor-search');
      const competitorSearchStatus = await getLocal('competitor-search-status');
      
      console.log("Competitor search running:", isCompetitorSearch);
      console.log("Competitor search status:", competitorSearchStatus);
      
      // Check for any recent data
      const userId = await getLocal('current-user');
      const allStorageData = await chrome.storage.local.get(null);
      const productKeys = Object.keys(allStorageData).filter(key => key.includes('ebay-hunted-products'));
      
      let totalProducts = 0;
      let recentProducts = 0;
      
      for (const key of productKeys) {
        const products = allStorageData[key];
        const count = products?.length || 0;
        totalProducts += count;
        
        // Check for products added in the last 5 minutes
        if (products && products.length > 0) {
          const now = Date.now();
          const fiveMinutesAgo = now - (5 * 60 * 1000);
          
          for (const product of products) {
            if (product.timestamp && product.timestamp > fiveMinutesAgo) {
              recentProducts++;
            }
          }
        }
      }
      
      let statusInfo = `Data Collection Monitor:\n\n`;
      statusInfo += `Competitor Search Running: ${isCompetitorSearch}\n`;
      statusInfo += `Competitor Search Status: ${competitorSearchStatus}\n`;
      statusInfo += `Total Products in Storage: ${totalProducts}\n`;
      statusInfo += `Recent Products (last 5 min): ${recentProducts}\n`;
      statusInfo += `Storage Keys: ${productKeys.join(', ')}\n\n`;
      
      if (isCompetitorSearch) {
        statusInfo += `✅ Competitor search is currently running\n`;
        statusInfo += `📊 Check eBay tabs for data collection progress\n`;
        statusInfo += `🔍 Look for "ScrapEbayPages inserted" messages in console\n`;
      } else {
        statusInfo += `⏸️ No competitor search currently running\n`;
        statusInfo += `🚀 Start competitor search to collect data\n`;
      }
      
      console.log(statusInfo);
      
      notification.info({
        message: "Data Collection Monitor",
        description: `Total: ${totalProducts} products, Recent: ${recentProducts}, Status: ${competitorSearchStatus || 'Not Running'}`,
        duration: 8,
      });
      
    } catch (error) {
      console.error("Error monitoring data collection:", error);
      notification.error({
        message: "Monitor Error",
        description: "Failed to monitor data collection process."
      });
    }
  };

  const handleManualExtractData = async () => {
    try {
      console.log("🔧 Manually triggering data extraction...");
      
      // Get current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        notification.error({
          message: "No Active Tab",
          description: "Please navigate to an eBay page first."
        });
        return;
      }
      
      console.log("Current tab URL:", tab.url);
      
      // Check if we're on an eBay search page
      if (!tab.url.includes('ebay.co.uk/sch/') && !tab.url.includes('ebay.com/sch/')) {
        notification.error({
          message: "Not on eBay Search Page",
          description: "Please navigate to an eBay search page (URL should contain /sch/)."
        });
        return;
      }
      
      // Send message to trigger extraction
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'triggerExtraction',
          data: {
            runByCompetitorSearch: true
          }
        });
        
        notification.success({
          message: "Extraction Triggered",
          description: "Data extraction has been manually triggered. Check the eBay page for progress."
        });
        
      } catch (error) {
        console.error("Error sending message to tab:", error);
        
        if (error.message.includes('Could not establish connection')) {
          notification.error({
            message: "Content Script Not Ready",
            description: "The content script is not ready. Please refresh the eBay page and try again."
          });
        } else {
          notification.error({
            message: "Extraction Error",
            description: "Failed to trigger extraction. Check console for details."
          });
        }
      }
      
    } catch (error) {
      console.error("Error in manual extract:", error);
      notification.error({
        message: "Manual Extract Error",
        description: "Failed to trigger manual extraction."
      });
    }
  };

  const handleCheckEbayTabs = async () => {
    try {
      console.log("🔍 Checking eBay tabs status...");
      
      // Get all tabs
      const tabs = await chrome.tabs.query({});
      const ebayTabs = tabs.filter(tab => 
        tab.url && (tab.url.includes('ebay.co.uk/sch/') || tab.url.includes('ebay.com/sch/'))
      );
      
      console.log("Found eBay tabs:", ebayTabs.length);
      
      for (const tab of ebayTabs) {
        console.log(`Tab ${tab.id}: ${tab.url}`);
        
        try {
          // Try to send a message to check if content script is running
          const response = await chrome.tabs.sendMessage(tab.id, {
            action: 'ping',
            data: { timestamp: Date.now() }
          });
          
          console.log(`Tab ${tab.id} content script response:`, response);
          
        } catch (error) {
          console.log(`Tab ${tab.id} content script error:`, error.message);
        }
      }
      
      // Check storage for any recent activity
      const allStorageData = await chrome.storage.local.get(null);
      const productKeys = Object.keys(allStorageData).filter(key => key.includes('ebay-hunted-products'));
      
      console.log("Product keys in storage:", productKeys);
      
      for (const key of productKeys) {
        const products = allStorageData[key];
        console.log(`${key}: ${products?.length || 0} products`);
        
        if (products && products.length > 0) {
          console.log("Sample product:", products[0]);
        }
      }
      
      notification.info({
        message: "eBay Tabs Check",
        description: `Found ${ebayTabs.length} eBay tabs, ${productKeys.length} product keys in storage. Check console for details.`,
        duration: 8,
      });
      
    } catch (error) {
      console.error("Error checking eBay tabs:", error);
      notification.error({
        message: "Check Error",
        description: "Failed to check eBay tabs status."
      });
    }
  };

  const handleTestCompetitorSearchFlow = async () => {
    try {
      console.log("🧪 Testing competitor search flow...");
      
      const userId = await getLocal('current-user');
      console.log("Current user ID:", userId);
      
      // Set up test sellers
      const testSellers = ['theswisslink', 'dangerousdrummer'];
      await setLocal(`competitor-search-seller-names-UK`, testSellers);
      
      // Set domain to UK
      await setLocal(`selected-domain-${userId}`, 'UK');
      
      // Set competitor search parameters
      await setLocal(`competitor-search-sold-history`, 'On');
      await setLocal(`competitor-search-sold-within`, 30);
      
      // Start competitor search
      await setLocal('is-competitor-search', true);
      await setLocal('competitor-search-status', null);
      
      // Open the first test seller page
      const firstSeller = testSellers[0];
      const ebayUrl = `https://www.ebay.co.uk/sch/i.html?_ssn=${firstSeller}&store_name=${firstSeller}&_ipg=240&_oac=1&LH_Sold=1&Competitor_Search=true`;
      
      console.log("Opening test URL:", ebayUrl);
      
      const tab = await chrome.tabs.create({
        url: ebayUrl,
        active: false
      });
      
      console.log("Opened tab:", tab.id);
      
      notification.success({
        message: "Test Flow Started",
        description: `Opened test page for ${firstSeller}. Check the tab for content script execution.`,
        duration: 5,
      });
      
    } catch (error) {
      console.error("Error in test flow:", error);
      notification.error({
        message: "Test Flow Error",
        description: "Failed to start test flow."
      });
    }
  };

  const handleTriggerCurrentTabExtraction = async () => {
    try {
      console.log("🔧 Triggering extraction on current eBay tab...");
      
      // Get all tabs
      const tabs = await chrome.tabs.query({});
      const ebayTabs = tabs.filter(tab => 
        tab.url && (tab.url.includes('ebay.co.uk/sch/') || tab.url.includes('ebay.com/sch/'))
      );
      
      if (ebayTabs.length === 0) {
        notification.error({
          message: "No eBay Tabs Found",
          description: "Please open an eBay search page first."
        });
        return;
      }
      
      // Use the first eBay tab
      const targetTab = ebayTabs[0];
      console.log("Targeting tab:", targetTab.id, targetTab.url);
      
      try {
        // Send message to trigger extraction
        const response = await chrome.tabs.sendMessage(targetTab.id, {
          action: 'triggerExtraction',
          data: {
            runByCompetitorSearch: true,
            forceStart: true
          }
        });
        
        console.log("Extraction response:", response);
        
        if (response && response.success) {
          notification.success({
            message: "Extraction Started",
            description: "Data extraction has been triggered. Check the eBay page for progress."
          });
        } else {
          notification.warning({
            message: "Extraction Not Started",
            description: response?.message || "Could not start extraction. Check console for details."
          });
        }
        
      } catch (error) {
        console.error("Error sending message to tab:", error);
        
        if (error.message.includes('Could not establish connection')) {
          notification.error({
            message: "Content Script Not Ready",
            description: "Please refresh the eBay page and try again."
          });
        } else {
          notification.error({
            message: "Communication Error",
            description: "Failed to communicate with the eBay page."
          });
        }
      }
      
    } catch (error) {
      console.error("Error triggering extraction:", error);
      notification.error({
        message: "Trigger Error",
        description: "Failed to trigger extraction."
      });
    }
  };

  useEffect(() => {
    const checkData = async () => {
      try {
        setIsLoading(true);
        console.log("🔄 Loading eBay hunted products...");
        
        const userId = await getLocal('current-user');
        console.log("Current user ID:", userId);
        
        if (!userId) {
          console.error("No user ID found");
          notification.error({
            message: "User Error",
            description: "No user ID found. Please log in again."
          });
          setIsLoading(false);
          return;
        }
        
        // Get all storage data to debug
        const allStorageData = await chrome.storage.local.get(null);
        console.log("All storage keys:", Object.keys(allStorageData));
        
        // Look for any ebay-hunted-products keys
        const productKeys = Object.keys(allStorageData).filter(key => key.includes('ebay-hunted-products'));
        console.log("Found product keys:", productKeys);
        
        let ebayHuntedProducts = null;
        
        // Try the current user's key first
        if (productKeys.includes(`ebay-hunted-products-${userId}`)) {
          ebayHuntedProducts = allStorageData[`ebay-hunted-products-${userId}`];
          console.log(`Using current user key: ebay-hunted-products-${userId}`);
        } else if (productKeys.length > 0) {
          // Use any available key
          const alternativeKey = productKeys[0];
          ebayHuntedProducts = allStorageData[alternativeKey];
          console.log(`Using alternative key: ${alternativeKey}`);
        }
        
        console.log("Loaded products:", ebayHuntedProducts?.length || 0);
        
        if (!ebayHuntedProducts || ebayHuntedProducts.length === 0) {
          console.log("No products found in any storage key");
          
          // Check if competitor search is running
          const competitorSearchStatus = await getLocal('competitor-search-status');
          const isCompetitorSearch = await getLocal('is-competitor-search');
          console.log("Competitor search status:", competitorSearchStatus);
          console.log("Is competitor search running:", isCompetitorSearch);
          
          notification.info({
            message: "No Data Found",
            description: "No eBay hunted products found. Run the competitor scanner first to collect data."
          });
        } else {
          // Process the products
          console.log("Processing products...");
          for (let i = 0; i < ebayHuntedProducts.length; i += 1) {
            const { soldHistory = {} } = ebayHuntedProducts[i] || {};
            if (!isEmpty(soldHistory)) {
              const data = [];
              for (const [key, value] of Object.entries(soldHistory)) {
                data.push({
                  key,
                  days: key,
                  totalSold: value
                });
              }
              ebayHuntedProducts[i]['updatedSoldHistory'] = data;
            }
          }
          
          console.log("Sample product:", ebayHuntedProducts[0]);
        }

        // Load domain and competitor count
        const domain = await getLocal(`selected-domain-${userId}`) || 'USA';
        setSelectedDomain(domain);
        const competitorsList = await getLocal(`competitor-search-seller-names-${domain}`);
        setTotalCompetitors(Array.isArray(competitorsList) ? competitorsList.length : 'N/A');

        // Attempt backfill for missing values on initial load
        const repaired = await backfillMissingProducts(ebayHuntedProducts || [], domain);
        setCurrentUserId(userId);
        setAllEbayHuntedProducts(repaired || []);
        
        console.log("✅ Data loading completed");
        
      } catch (error) {
        console.error("Error loading data:", error);
        notification.error({
          message: "Data Loading Error",
          description: "Failed to load eBay hunted products. Please try refreshing the page."
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkData();
  }, []);

  return (
    <div className={classes.mainDiv}>
      <Row>
        <Title className={classes.header} level={2}>Proceed to Filter Results</Title>
      </Row>
      <Row className={classes.filterBox}>
        <Row className={classes.filterGroup}>
          <Row
            style={{
              flexDirection: 'column'
            }}
          >
            <Text>
              Minimum Sold Quantity
            </Text>
            <InputNumber
              style={{ width: '280px' }}
              placeholder='Enter minimum total sold'
              min={0}
              onChange={(value) => setMinimumSold(value)}
              value={minimumSold}
            />
          </Row>
          <Row
            style={{
              flexDirection: 'column'
            }}
          >
            <Text>
              Min Price
            </Text>
            <InputNumber
              style={{ width: '280px' }}
              placeholder='Enter Min Price'
              min={0}
              onChange={(value) => setMinPrice(value)}
              value={minPrice}
            />
          </Row>
        </Row>
        <Row className={classes.filterGroup}>
          <Row
            style={{
              flexDirection: 'column'
            }}
          >
            <Text>
              Sold Within (Days)
            </Text>
            <InputNumber
              style={{ width: '280px' }}
              placeholder='Enter no of days the item was sold'
              min={0}
              onChange={(value) => setItemSoldWithin(value)}
              value={itemSoldWithin}
            />
          </Row>
          <Row
            style={{
              flexDirection: 'column'
            }}
          >
            <Text>
              Max Price
            </Text>
            <InputNumber
              style={{ width: '280px' }}
              placeholder='Enter Max Price'
              min={0}
              onChange={(value) => setMaxPrice(value)}
              value={maxPrice}
            />
          </Row>
        </Row>
        <Row className={classes.listingButtons}>
          <Button
            type='primary'
            onClick={() => handleApplyFilters()}
          >
            {!isFilterApplied ? 'Apply Filters' : 'Cancel Filters'}
          </Button>
          <Button
            danger type='primary'
            onClick={() => handleClearItems()}
          >
            Clear Items
          </Button>
          <Button
            type='primary'
            onClick={() => handleAddTitlesToFinder()}
          >
            Add Titles to Finder ({allEbayHuntedProducts?.length || 0})
          </Button>
        </Row>
      </Row>
      <Row className={classes.productsBox}>
        {isLoading ? (
          <div style={{ 
            width: '100%', 
            textAlign: 'center', 
            padding: '50px',
            background: 'white',
            borderRadius: '5px',
            boxShadow: '0 0 5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '18px', marginBottom: '10px' }}>Loading eBay hunted products...</div>
            <div style={{ fontSize: '14px', color: '#666' }}>Please wait while we fetch your data</div>
          </div>
        ) : allEbayHuntedProducts?.length === 0 ? (
          <div style={{ 
            width: '100%', 
            textAlign: 'center', 
            padding: '50px',
            background: 'white',
            borderRadius: '5px',
            boxShadow: '0 0 5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '18px', marginBottom: '10px' }}>No items found</div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
              No eBay hunted products available. Run the competitor scanner first to collect data.
            </div>
            <Button type="primary" onClick={handleRefreshData}>
              Refresh Data
            </Button>
          </div>
        ) : (
          allEbayHuntedProducts?.map((item, index) => (
            <Card
              key={index}
              style={{ width: '100%' }}
            >
              <Row
                style={{ width: '100%' }}
              >
                <Col
                  span={5}
                  style={{ display: 'flex', alignItems: 'center' }}
                >
                  <Image
                    width={160}
                    height={160}
                    style={{ height: '160px', width: '160px' }}
                    src={item?.image}
                  />
                </Col>
                <Col
                  span={14}
                  style={{ display: 'flex', flexDirection: 'column' }}
                >
                  <Text
                    style={{
                      fontWeight: '700',
                      fontFamily: 'sans-serif'
                    }}
                  >
                    {item?.title || 'N/A'}
                  </Text>
                  <Text strong>
                    Price:
                    {' '}
                    <Text type='secondary'>{item?.price || 'N/A'}</Text>
                  </Text>
                  <Text strong>
                    Total Competitors:
                    {' '}
                    <Text type='secondary'>N/A</Text>
                  </Text>
                  <Text strong>
                    Date Sold:
                    {' '}
                    <Text type='secondary'>{item?.soldAt || 'N/A'}</Text>
                  </Text>
                  <Text strong>
                    Item Number:
                    {' '}
                    <Text type='secondary'>{item?.itemNumber || 'N/A'}</Text>
                  </Text>
                  <Text strong>
                    Seller Name:
                    {' '}
                    <Text type='secondary'>{item?.sellerName || 'N/A'}</Text>
                  </Text>
                  <Text strong>
                    Break-even Price:
                    {' '}
                    <Text type='secondary'>{item?.breakevenPrice || 'N/A'}</Text>
                  </Text>
                  <Text strong>
                    Total Sold:
                    {' '}
                    <Text type='secondary'>{item?.totalSold || 'N/A'}</Text>
                  </Text>
                  <div style={{
                    marginTop: '15px',
                    marginLeft: '15px',
                    border: '1px solid grey',
                    width: '200px'
                  }}>
                    <Row style={{
                      backgroundColor: '#4691fd'

                    }}>
                      <Col span={12} className={classes.soldHistoryStyling}>
                        <div>Last X Days</div>
                      </Col>
                      <Col span={12} className={classes.soldHistoryStyling}>
                        <div>Total Sold</div>
                      </Col>
                    </Row>

                    {item?.updatedSoldHistory?.map((item, index) => (
                      <Row key={index}>
                        <Col span={12} className={classes.soldHistoryStyling}>
                          {item.days}
                        </Col>
                        <Col span={12} className={classes.soldHistoryStyling}>
                          <span>{item.totalSold}</span>
                        </Col>
                      </Row>
                    ))}
                  </div>
                </Col>
                <Col span={5}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'stretch', width: '100%' }}>
                    <Button block size="small" icon={<FaAmazon />} onClick={() => handleSearchAmazonSimple(item.title)}>Search on Amazon</Button>
                    <Button block size="small" icon={<MdImageSearch />} onClick={() => handleSearchGoogleImages(item.title)}>Search on Google Images</Button>
                    <Button block size="small" type="link" icon={<IoMdCopy />} onClick={() => handleCopyTitleOnly(item.title)}>Copy Title</Button>
                    <Button block size="small" danger icon={<FiTrash2 />} onClick={() => handleRemoveItem(index)}>Remove</Button>
                  </div>
                </Col>
              </Row>
            </Card>
          ))
        )}
      </Row>
    </div>
  );
};

export default EbayItemsScanner;
