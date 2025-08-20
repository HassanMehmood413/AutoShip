import { ChatGpt } from './services/open-ai';
import { setLocal, getLocal } from './services/dbService';
import { DEFAULT_COLLAGE_TEMPLATE, VERO_BRANDS } from './services/utils';

chrome.runtime.onInstalled.addListener(async () => {
  await setLocal('default-collage-template', DEFAULT_COLLAGE_TEMPLATE);
  await setLocal('product-hunter-settings', { isPrime: true, resultFetchLimit: 2 });
  await setLocal('run-script-status', '');
  await setLocal('offer-status', 'off');
  await setLocal('end-sell-similar-settings', {
    minimumSold: 0,
    minimumViews: 0,
    hoursLeft: 0
  });
  await setLocal('vero-brands', VERO_BRANDS);
  await setLocal('tracker-filters', {
    stockMonitorEnabled: false,
    priceMonitorEnabled: false,
    priceMonitorWithEndingPriceEnabled: false,
    stockMonitorType: '',
    priceMonitorType: 'markup',
    restockQuantity: 0,
    priceMarkupPercentage: 0,
    priceMarkupValue: 0,
    priceTriggerThreshold: 0,
    priceMonitorEndingPrices: ''
  });
  await setLocal('tracking-timeout-complete-scan', 1);
  await setLocal('rule-based-settings', {
    itemWithNoSku: {
      status: false,
      action: 'nothing'
    },
    itemWithBrokenSku: {
      status: false,
      action: 'nothing'
    },
    itemsNotFoundOnAmazon: {
      status: false,
      action: 'nothing'
    },
    itemsWithSales: {
      status: false,
      action: 'delete',
      sales: 0,
      days: 0
    }
  });
});

// const PATIOM_PRODUCT_API_URL = 'https://chrome-eb-am-backend.vercel.app';
const PATIOM_PRODUCT_API_URL = 'http://localhost:3001'; // local

const loginUser = async ({ email, password }) => {
  const myHeaders = new Headers();
  myHeaders.append('Content-Type', 'application/json');

  const raw = JSON.stringify({
    email,
    password
  });

  const requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow'
  };

  let loginRequest = await fetch(`${PATIOM_PRODUCT_API_URL}/v1/auth/sign-in`, requestOptions);
  loginRequest = await loginRequest.json();
  if (loginRequest?.success) {
    const { token, user } = loginRequest;
    const { userId, name, role, status } = user;

    if (status === 'disabled') {
      return {
        success: false,
        error: 'You are disabled by admin'
      };
    }

    await setLocal('user', {
      userId,
      name,
      email,
      role,
      status
    });

    await setLocal('user-token', token);
    await setLocal('current-user', userId);
    await setLocal('auth-state', 'logged-in');

    return {
      success: true
    };
  } else {
    // Check if it's a subscription-related error
    if (loginRequest?.needsSubscription) {
      return {
        success: false,
        error: loginRequest.message,
        needsSubscription: true,
        subscriptionUrl: loginRequest.subscriptionUrl
      };
    }
    
    return {
      success: false,
      error: loginRequest.message
    };
  }
};

const createUser = async ({ name, email, password }) => {
  const myHeaders = new Headers();
  myHeaders.append('Content-Type', 'application/json');

  const raw = JSON.stringify({
    name,
    email,
    password
  });

  const requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow'
  };

  let response = await fetch(`${PATIOM_PRODUCT_API_URL}/v1/auth/add-user`, requestOptions);
  response = await response.json();
  if (response?.success) {
    return {
      success: true
    };
  } else {
    return {
      success: false,
      error: response.message || response.error
    };
  }
};

const checkUser = async () => {
  const token = await getLocal('user-token');
  if (!token) {
    await setLocal('auth-state', 'logged-out');
    await setLocal('user', {});
    await setLocal('current-user', '');
    await setLocal('user-token', '');

    return { success: false };
  }

  const myHeaders = new Headers();
  myHeaders.append('Authorization', `Bearer ${token}`);
  const requestOptions = {
    method: 'GET',
    headers: myHeaders,
    redirect: 'follow'
  };

  let loginRequest = await fetch(`${PATIOM_PRODUCT_API_URL}/v1/user/get-user-status`, requestOptions);
  loginRequest = await loginRequest.json();

  if (loginRequest?.success && loginRequest?.userStatus === 'enabled') {
    await setLocal('auth-state', 'logged-in');
  } else {
    await setLocal('auth-state', 'logged-out');
    await setLocal('user', {});
    await setLocal('current-user', '');
    await setLocal('user-token', '');

    return { success: false };
  }

  return {
    success: true
  };
};

const getAllUsers = async () => {
  const token = await getLocal('user-token');

  const myHeaders = new Headers();
  myHeaders.append('Authorization', `Bearer ${token}`);
  const requestOptions = {
    method: 'GET',
    headers: myHeaders,
    redirect: 'follow'
  };

  let response = await fetch(`${PATIOM_PRODUCT_API_URL}/v1/user/get-all-users`, requestOptions);
  response = await response.json();

  if (response?.success) {
    const { users } = response;
    return {
      success: true,
      users
    };
  } else {
    return {
      success: false,
      error: response.message || response.error
    };
  }
};

const updateUserStatus = async ({ userId, status }) => {
  const token = await getLocal('user-token');

  const myHeaders = new Headers();
  myHeaders.append('Content-Type', 'application/json');
  myHeaders.append('Authorization', `Bearer ${token}`);

  const raw = JSON.stringify({
    userId,
    status
  });

  const requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow'
  };

  let response = await fetch(`${PATIOM_PRODUCT_API_URL}/v1/user/update-user-status`, requestOptions);
  response = await response.json();

  if (response?.success) {
    return {
      success: true
    };
  } else {
    return {
      success: false,
      error: response.message || response.error
    };
  }
};

const addListing = async ({
  listingId,
  asin,
  sku,
  draftId
}) => {
  const token = await getLocal('user-token');

  const myHeaders = new Headers();
  myHeaders.append('Content-Type', 'application/json');
  myHeaders.append('Authorization', `Bearer ${token}`);

  const raw = JSON.stringify({
    listingId,
    asin,
    sku,
    draftId
  });

  const requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow'
  };

  let response = await fetch(`${PATIOM_PRODUCT_API_URL}/v1/listing/add-listing`, requestOptions);
  response = await response.json();

  if (response?.success) {
    // Store successful database save status
    await setLocal('listing-saved-to-db', true);
    console.log('✅ Listing successfully saved to database');
    return {
      success: true
    };
  } else {
    // Store failed database save status
    await setLocal('listing-saved-to-db', false);
    console.error('❌ Failed to save listing to database:', response.message || response.error);
    return {
      success: false,
      error: response.message || response.error
    };
  }
};

const getListing = async ({
  asin
}) => {
  const token = await getLocal('user-token');

  const myHeaders = new Headers();
  myHeaders.append('Content-Type', 'application/json');
  myHeaders.append('Authorization', `Bearer ${token}`);

  const requestOptions = {
    method: 'GET',
    headers: myHeaders,
    redirect: 'follow'
  };

  let response = await fetch(`${PATIOM_PRODUCT_API_URL}/v1/listing/get-listing?asin=${asin}`, requestOptions);
  response = await response.json();

  if (response?.success) {
    return {
      ...response
    };
  } else {
    return {
      success: false,
      error: response.message || response.error
    };
  }
};

const getAllListing = async () => {
  const token = await getLocal('user-token');

  const myHeaders = new Headers();
  myHeaders.append('Content-Type', 'application/json');
  myHeaders.append('Authorization', `Bearer ${token}`);

  const requestOptions = {
    method: 'GET',
    headers: myHeaders,
    redirect: 'follow'
  };

  let response = await fetch(`${PATIOM_PRODUCT_API_URL}/v1/listing/get-all-listing`, requestOptions);
  response = await response.json();

  if (response?.success) {
    return {
      ...response
    };
  } else {
    return {
      success: false,
      error: response.message || response.error
    };
  }
};

const deleteListing = async ({
  asin
}) => {
  const token = await getLocal('user-token');

  const myHeaders = new Headers();
  myHeaders.append('Content-Type', 'application/json');
  myHeaders.append('Authorization', `Bearer ${token}`);

  const raw = JSON.stringify({
    asin
  });

  const requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow'
  };

  let response = await fetch(`${PATIOM_PRODUCT_API_URL}/v1/listing/delete-listing`, requestOptions);
  response = await response.json();

  if (response?.success) {
    return {
      ...response
    };
  } else {
    return {
      success: false,
      error: response.message || response.error
    };
  }
};

const deleteListingWithId = async ({
  listingId
}) => {
  const token = await getLocal('user-token');

  const myHeaders = new Headers();
  myHeaders.append('Content-Type', 'application/json');
  myHeaders.append('Authorization', `Bearer ${token}`);

  const raw = JSON.stringify({
    listingId
  });

  const requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow'
  };

  let response = await fetch(`${PATIOM_PRODUCT_API_URL}/v1/listing/delete-listing-with-id`, requestOptions);
  response = await response.json();

  if (response?.success) {
    return {
      ...response
    };
  } else {
    return {
      success: false,
      error: response.message || response.error
    };
  }
};

const getEbayListings = async () => {
  const token = await getLocal('user-token');

  const myHeaders = new Headers();
  myHeaders.append('Content-Type', 'application/json');
  myHeaders.append('Authorization', `Bearer ${token}`);

  const raw = JSON.stringify({
    // asin
  });

  const requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow'
  };

  let response = await fetch(`${PATIOM_PRODUCT_API_URL}/v1/listing/delete-listing`, requestOptions);
  response = await response.json();

  if (response?.success) {
    return {
      ...response
    };
  } else {
    return {
      success: false,
      error: response.message || response.error
    };
  }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.callback === 'openTab') {
      (async () => {
        try {
          const res = await chrome.tabs.create(request.payload);
          // Proactively ensure content script injection for newly opened eBay tabs
          try {
            const targetTabId = res.id;
            const requestedUrl = request?.payload?.url || '';
            const EBAY_TLDS = '(com|co\\.uk|de|fr|it|es|com\\.au|ca)';
            const ebayUrlRegex = new RegExp(`^https://www\\.ebay\\.${EBAY_TLDS}/(sch|str)`);
            const startTime = Date.now();

            const onUpdatedHandler = async (tabId, changeInfo, tab) => {
              if (tabId !== targetTabId || changeInfo.status !== 'complete') return;
              try {
                const finalUrl = tab?.url || requestedUrl || '';
                const hasSellerQuery = /[?&](?:_ssn|store_name)=/i.test(finalUrl);
                const isEbay = /https:\/\/www\.ebay\./i.test(finalUrl);
                if (isEbay && (ebayUrlRegex.test(finalUrl) || hasSellerQuery)) {
                  await chrome.scripting.executeScript({
                    target: { tabId: targetTabId },
                    files: ['ebay_all_products_page.bundle.js']
                  });
                  try { chrome.tabs.onUpdated.removeListener(onUpdatedHandler); } catch (_) {}
                } else if (Date.now() - startTime > 60000) {
                  // Stop listening after 60s to avoid leaks
                  try { chrome.tabs.onUpdated.removeListener(onUpdatedHandler); } catch (_) {}
                }
              } catch (_) {
                // ignore and let global listener handle
              }
            };
            chrome.tabs.onUpdated.addListener(onUpdatedHandler);
          } catch (_) {}

          sendResponse(res);
        } catch (error) {
          sendResponse({
            success: false,
            error: error.message
          });
        }
      })();
      return true;
    } else if (request.callback === 'closeTab') {
      (async () => {
        try {
          await chrome.tabs.remove(sender.tab.id);
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({
            success: false,
            error: error.message
          });
        }
      })();
      return true;
    } else if (request.callback === 'closeTargetTab') {
      (async () => {
        try {
          await chrome.tabs.remove(request.payload);
        } catch (error) {
          sendResponse({
            success: false,
            error: error.message
          });
        }
      })();
      return true;
    } else if (request.callback === 'chat-gpt') {
      (async () => {
        try {
          const response = await ChatGpt(request.payload);
          sendResponse(response);
        } catch (error) {
          sendResponse({
            success: false,
            error: error.message
          });
        }
      })();
      return true;
    } else if (request.callback === 'loginUser') {
      (async () => {
        try {
          const response = await loginUser(request.payload);
          sendResponse(response);
        } catch (error) {
          sendResponse({
            success: false,
            error: error.message
          });
        }
      })();
      return true;
    } else if (request.callback === 'checkUser') {
      (async () => {
        try {
          const response = await checkUser();
          sendResponse(response);
        } catch (error) {
          await setLocal('auth-state', 'logged-out');
          await setLocal('user', {});
          await setLocal('current-user', '');
          await setLocal('user-token', '');
          sendResponse({
            success: false,
            error: error.message
          });
        }
      })();
      return true;
    } else if (request.callback === 'getAllUsers') {
      (async () => {
        try {
          const response = await getAllUsers();
          sendResponse(response);
        } catch (error) {
          sendResponse({
            success: false,
            error: error.message
          });
        }
      })();
      return true;
    } else if (request.callback === 'updateUserStatus') {
      (async () => {
        try {
          const response = await updateUserStatus(request.payload);
          sendResponse(response);
        } catch (error) {
          sendResponse({
            success: false,
            error: error.message
          });
        }
      })();
      return true;
    } else if (request.callback === 'createUser') {
      (async () => {
        try {
          const response = await createUser(request.payload);
          sendResponse(response);
        } catch (error) {
          sendResponse({
            success: false,
            error: error.message
          });
        }
      })();
      return true;
    } else if (request.callback === 'openChromePopupScreen') {
      chrome.tabs.create({ url: chrome.runtime.getURL(request.payload.screenToOpen) });
      sendResponse({ success: true });
    } else if (request.callback === 'clearListingData') {
      (async () => {
        try {
          const userId = await getLocal('current-user');
          await setLocal(`ebay-listing-data-${userId}`, null);
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({
            success: false,
            error: error.message
          });
        }
      })();
      return true;
    } else if (request.callback === 'clearPostListingData') {
      (async () => {
        try {
          const userId = await getLocal('current-user');
          await setLocal(`ebay-post-listing-data-${userId}`, null);
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({
            success: false,
            error: error.message
          });
        }
      })();
      return true;
    } else if (request.callback === 'addListing') {
      (async () => {
        try {
          console.log('💾 Background: Attempting to save listing to database:', request.payload);
          const response = await addListing(request.payload);
          console.log('💾 Background: Database response:', response);
          sendResponse(response);
        } catch (error) {
          console.error('💾 Background: Database save error:', error);
          sendResponse({
            success: false,
            error: error.message || 'Database communication failed'
          });
        }
      })();
      return true;
    } else if (request.callback === 'getListing') {
      (async () => {
        try {
          const response = await getListing(request.payload);
          sendResponse(response);
        } catch (error) {
          sendResponse({
            success: false,
            error: error.message
          });
        }
      })();
      return true;
    } else if (request.callback === 'getAllListing') {
      (async () => {
        try {
          const response = await getAllListing();
          sendResponse(response);
        } catch (error) {
          sendResponse({
            success: false,
            error: error.message
          });
        }
      })();
      return true;
    } else if (request.callback === 'deleteListing') {
      (async () => {
        try {
          const response = await deleteListing(request.payload);
          sendResponse(response);
        } catch (error) {
          sendResponse({
            success: false,
            error: error.message
          });
        }
      })();
      return true;
    } else if (request.callback === 'deleteListingWithId') {
      (async () => {
        try {
          const response = await deleteListingWithId(request.payload);
          sendResponse(response);
        } catch (error) {
          sendResponse({
            success: false,
            error: error.message
          });
        }
      })();
      return true;
    } else if (request.callback === 'fetch') {
      (async () => {
        try {
          const response = await fetch(request.payload.url);
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = reader.result; // Base64 encoded image data
            sendResponse({
              success: true,
              data: base64data // Send Base64 as the response
            });
          };
          reader.onerror = (error) => {
            sendResponse({
              success: false,
              error: error.message
            });
          };
          reader.readAsDataURL(blob);
        } catch (error) {
          sendResponse({
            success: false,
            error: error.message
          });
        }
      })();
      return true;
    } else if (request.callback === 'fetchHtml') {
      (async () => {
        try {
          const res = await fetch(request.payload.url, { redirect: 'follow' });
          const text = await res.text();
          sendResponse({ success: true, data: text, status: res.status });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true;
    } else if (request.callback === 'scheduleBoostListings') {
      (async () => {
        try {
          const {
            status,
            startTime,
            interval
          } = await getLocal('boost-listing-schedule-settings');

          if (status === 'true') {
            const [hours, minutes] = startTime.split(':').map(Number);
            const now = new Date();
            const firstRun = new Date();

            firstRun.setHours(hours, minutes, 0, 0);

            // If the scheduled time has already passed today, set it for the next cycle
            if (firstRun < now) {
              firstRun.setTime(firstRun.getTime() + interval * 60 * 60 * 1000);
            }

            const delayInMinutes = (firstRun - now) / (1000 * 60);

            console.log(`Next execution in ${delayInMinutes} minutes`);

            chrome.alarms.clear('end-sell-similar', () => {
              chrome.alarms.create('end-sell-similar', { delayInMinutes, periodInMinutes: interval * 60 });
            });
          } else {
            await chrome.alarms.clear('end-sell-similar');
          }

          sendResponse({
            success: true
          });

        } catch (error) {
          sendResponse({
            success: false,
            error: error.message
          });
        }
      })();
      return true;
    } else if (request.callback === 'fetchAmazonProduct') {
      (async () => {
        try {
          const res = await fetch(request.payload);
          const resText = await res.text();

          sendResponse({
            success: true,
            ProductResponse: resText
          });

        } catch (error) {
          sendResponse({
            success: false,
            error: error.message
          });
        }
      })();
      return true;
    } else if (request.callback === 'debugAmazonPage') {
      (async () => {
        try {
          // Use specific tab ID if provided, otherwise find Amazon tabs
          let targetTabId = request.payload?.tabId;
          
          if (!targetTabId) {
            // Fallback to finding Amazon tabs
            let tabs = await chrome.tabs.query({ url: '*://*.amazon.com/*' });
            if (tabs.length === 0) {
              tabs = await chrome.tabs.query({ url: '*://*.amazon.co.uk/*' });
            }
            if (tabs.length === 0) {
              tabs = await chrome.tabs.query({ url: '*://amazon.com/*' });
            }
            if (tabs.length === 0) {
              tabs = await chrome.tabs.query({ url: '*://amazon.co.uk/*' });
            }
            
            console.log('Background script found Amazon tabs:', tabs);
            
            if (tabs.length === 0) {
              sendResponse({
                success: false,
                error: 'No Amazon tab found. Please open an Amazon page first.'
              });
              return;
            }
            targetTabId = tabs[0].id;
          }
          
          console.log('Using tab ID for debug:', targetTabId);
          const response = await chrome.tabs.sendMessage(targetTabId, {
            callback: 'debugAmazonPage',
            payload: request.payload
          });
          sendResponse(response);
        } catch (error) {
          sendResponse({
            success: false,
            error: error.message
          });
        }
      })();
      return true;
    } else if (request.callback === 'scrapeAmazonProducts') {
      (async () => {
        try {
          console.log('🚀 Background: Received scrapeAmazonProducts request:', request.payload);
          
          // Use specific tab ID if provided, otherwise find Amazon tabs
          let targetTabId = request.payload?.tabId;
          
          // If forceTabId is set, ALWAYS use the provided tabId
          if (request.payload?.forceTabId && targetTabId) {
            console.log('🚀 Background: FORCING use of specific tab ID:', targetTabId);
          } else if (!targetTabId) {
            // Fallback to finding Amazon tabs
            let tabs = await chrome.tabs.query({ url: '*://*.amazon.com/*' });
            if (tabs.length === 0) {
              tabs = await chrome.tabs.query({ url: '*://*.amazon.co.uk/*' });
            }
            if (tabs.length === 0) {
              tabs = await chrome.tabs.query({ url: '*://amazon.com/*' });
            }
            if (tabs.length === 0) {
              tabs = await chrome.tabs.query({ url: '*://amazon.co.uk/*' });
            }
            
            console.log('🚀 Background script found Amazon tabs for scraping:', tabs);
            
            if (tabs.length === 0) {
              console.log('🚀 Background: No Amazon tabs found');
              sendResponse({
                success: false,
                error: 'No Amazon tab found. Please open an Amazon page first.'
              });
              return;
            }
            targetTabId = tabs[0].id;
          }
          
          console.log('🚀 Background: Using tab ID for scraping:', targetTabId);
          console.log('🚀 Background: Sending message to content script...');
          console.log('🚀 Background: Message payload being sent:', request.payload);

          // First check if tab exists and get its info
          try {
            const tabInfo = await chrome.tabs.get(targetTabId);
            console.log('🚀 Background: Tab info:', { id: tabInfo.id, url: tabInfo.url, status: tabInfo.status });
          } catch (tabError) {
            console.log('🚀 Background: Error getting tab info:', tabError);
          }

          // If caller prefers not to wait (e.g. unlimited scrape), fire-and-forget to avoid channel timeout
          if (request.payload?.noWait) {
            try {
              // Do not await; navigation between pages would otherwise close the channel
              chrome.tabs.sendMessage(targetTabId, {
                callback: 'scrapeAmazonProducts',
                payload: request.payload
              }).catch((e) => console.log('Non-blocking sendMessage error (expected if page navigates):', e?.message));
            } catch (e) {
              console.log('Non-blocking sendMessage threw synchronously:', e?.message);
            }
            // Immediately store a progress stub so UI starts polling
            try {
              await setLocal('amazon-scraping-progress', {
                status: 'Starting no-limit scraping...',
                percent: 0,
                current: 0,
                total: request.payload?.maxProducts || 1000000,
                isComplete: false,
              });
            } catch (_) {}
            sendResponse({ success: true, started: true });
            return; // Return after immediate ack
          }

          const response = await chrome.tabs.sendMessage(targetTabId, {
            callback: 'scrapeAmazonProducts',
            payload: request.payload
          });

          console.log('🚀 Background: Received response from content script:', response);
          console.log('🚀 Background: Response type:', typeof response);
          console.log('🚀 Background: Response success:', response?.success);
          console.log('🚀 Background: Response products length:', response?.products?.length);
          sendResponse(response);
        } catch (error) {
          sendResponse({
            success: false,
            error: error.message
          });
        }
      })();
      return true;
    } else if (request.callback === 'stopAmazonScraping') {
      (async () => {
        try {
          // Use specific tab ID if provided, otherwise find Amazon tabs
          let targetTabId = request.payload?.tabId;
          
          if (!targetTabId) {
            // Fallback to finding Amazon tabs
            let tabs = await chrome.tabs.query({ url: '*://*.amazon.com/*' });
            if (tabs.length === 0) {
              tabs = await chrome.tabs.query({ url: '*://*.amazon.co.uk/*' });
            }
            if (tabs.length === 0) {
              tabs = await chrome.tabs.query({ url: '*://amazon.com/*' });
            }
            if (tabs.length === 0) {
              tabs = await chrome.tabs.query({ url: '*://amazon.co.uk/*' });
            }
            
            if (tabs.length === 0) {
              sendResponse({
                success: false,
                error: 'No Amazon tab found.'
              });
              return;
            }
            targetTabId = tabs[0].id;
          }
          
          console.log('Using tab ID for stopping scraping:', targetTabId);
          const response = await chrome.tabs.sendMessage(targetTabId, {
            callback: 'stopAmazonScraping',
            payload: request.payload
          });
          sendResponse(response);
        } catch (error) {
          sendResponse({
            success: false,
            error: error.message
          });
        }
      })();
      return true;
    } else if (request.callback === 'updateScrapingProgress') {
      (async () => {
        try {
          // Store progress data for the UI to access
          await setLocal('amazon-scraping-progress', request.payload);
          // Also persist final products so UI can read them even if a progress poll is missed
          if (request.payload?.isComplete && Array.isArray(request.payload?.products) && request.payload.products.length > 0) {
            try {
              const userId = await getLocal('current-user');
              // Store raw products; UI maps them for display
              await setLocal(`amazon-hunted-products-${userId}`, request.payload.products);
            } catch (_) {}
          }
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({
            success: false,
            error: error.message
          });
        }
      })();
      return true;
    } else if (request.callback === 'testContentScript') {
      (async () => {
        try {
          // Send message to content script to test communication
          const tabs = await chrome.tabs.query({ url: '*://*.amazon.com/*' });
          if (tabs.length === 0) {
            sendResponse({
              success: false,
              error: 'No Amazon tab found. Please open an Amazon page first.'
            });
            return;
          }
          const response = await chrome.tabs.sendMessage(tabs[0].id, {
            callback: 'testContentScript'
          });
          sendResponse(response);
        } catch (error) {
          sendResponse({
            success: false,
            error: error.message
          });
        }
      })();
      return true;
    }
    // Callbacks[req.callback](req.payload);
  } catch (e) {
    console.log(e);
  }
  // Do not return true here. Each async handler above already returns true explicitly.
  // Returning true here for all messages causes senders to wait for a response that will never come.
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const { url } = tab;

  let originUrl = url;
  if (url && !url?.includes('www.ebay')) {
    const newURL = new URL(url);
    originUrl = newURL.origin;
  }

  if (changeInfo.status === 'complete') {
    if (originUrl.includes('www.amazon.')) {
      // Check for product pages
      const productRegex = /https?:\/\/(www\.)?amazon\.(com|co\.uk)\/([A-Za-z0-9-]+\/)?(gp\/product|dp)\/[A-Z0-9]{10}(\/|\?|$)/;
      const isProductPage = productRegex.test(url);
      
      // Check for search pages
      const searchRegex = /https?:\/\/(www\.)?amazon\.(com|co\.uk)\/s\?/;
      const isSearchPage = searchRegex.test(url);
      
      if (isProductPage) {
        console.log('\n going to run Amazon product page content script');
        chrome.scripting.executeScript({
          target: { tabId },
          files: ['amazon_main_product.bundle.js']
        });
      } else if (isSearchPage) {
        console.log('\n checking if Amazon search page content script needed');
        
        // Check if manual injection already happened to prevent conflicts
        chrome.scripting.executeScript({
          target: { tabId },
          func: () => {
            return window.manualContentScriptInjected || false;
          }
        }).then((results) => {
          const manualInjectionExists = results && results[0] && results[0].result;
          
          if (!manualInjectionExists) {
            console.log('\n going to run Amazon search page content script');
            chrome.scripting.executeScript({
              target: { tabId },
              files: ['amazon_product_hunter_script.bundle.js']
            }).then(async () => {
              // Prompt resume if a no-limit run was in progress
              try {
                await chrome.tabs.sendMessage(tabId, { callback: 'resumeNoLimit' });
              } catch (_) {}
            });
          } else {
            console.log('\n skipping auto-injection - manual injection detected');
            // Even with manual injection, prompt resume in case of navigation
            chrome.tabs.sendMessage(tabId, { callback: 'resumeNoLimit' }).catch(() => {});
          }
        }).catch((error) => {
          // If we can't check, proceed with auto-injection
          console.log('\n going to run Amazon search page content script (fallback)');
          chrome.scripting.executeScript({
            target: { tabId },
            files: ['amazon_product_hunter_script.bundle.js']
          }).then(() => {
            chrome.tabs.sendMessage(tabId, { callback: 'resumeNoLimit' }).catch(() => {});
          });
        });
      } else {
        console.log('\n not on a supported Amazon page (product or search)');
      }
    } else if (originUrl.includes('www.ebay.')) {
      // Support multiple eBay country domains
      const EBAY_TLDS = '(com|co\\.uk|de|fr|it|es|com\\.au|ca)';
      const regex = new RegExp(`^https://www\\.ebay\\.${EBAY_TLDS}/(sch|str)`);
      const isMatch = regex.test(url);
      if (isMatch) {
        console.log('\n going to run Ebay content script');

        chrome.scripting.executeScript({
          target: { tabId },
          files: ['ebay_all_products_page.bundle.js']
        });
      } else {
        console.log('\n not on the correct link - URL:', url);
      }
    } else {
      console.log('\n not on the correct store', originUrl);
    }
  }
});

chrome.webRequest.onBeforeSendHeaders.addListener(async (details) => {
  const { url, requestHeaders } = details;
  if (!url.includes('skip_validation')) {
    const solAutHeader = requestHeaders.find(item => item.name === 'srt');
    if (solAutHeader) {
      await setLocal('srt-header', solAutHeader.value);
    }
  }
}, {
  urls: [
    'https://www.ebay.com/lstng/api/listing_draft/*',
    'https://www.ebay.co.uk/lstng/api/listing_draft/*',
    'https://www.ebay.co.uk/sl/list/api/listing_draft/*'
  ]
}, ['requestHeaders']);

// Task execution
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'end-sell-similar') {
    console.log('Executing End Sell Similar task at:', new Date().toLocaleTimeString());
    await setLocal('end-sell-listing-status', 'inprogress');
    await setLocal('end-sell-current-index', 0);
    await setLocal('end-sell-total-listing', 0);

    const userId = await getLocal('current-user');
    const domain = await getLocal(`selected-domain-${userId}`);

    let ebayLink = 'https://www.ebay.com';
    if (domain === 'UK') {
      ebayLink = 'https://www.ebay.co.uk';
    }
    chrome.tabs.create({
      url: `${ebayLink}/sh/lst/active?action=pagination&sort=timeRemaining&limit=200&localType=end-sell`,
      active: false
    });
  }
});
