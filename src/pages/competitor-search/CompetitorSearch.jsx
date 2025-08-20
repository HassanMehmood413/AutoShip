import React, { useState, useRef, useEffect } from "react";
import {
  Input,
  Button,
  Select,
  Card,
  Typography,
  Space,
  notification,
} from "antd";
import "antd/dist/reset.css";

import {
  getLocal,
  setLocal,
  onChange as onChangeLocalState,
} from "../../services/dbService";
import { sleep } from "../../services/utils";
import { PagesLayout } from "../../components/shared/pagesLayout";
import { PageBtn } from "../../components/shared/buttons";

const { TextArea } = Input;
const { Title } = Typography;

window.addEventListener("beforeunload", async () => {
  await setLocal("competitor-search-status", null);
  await setLocal("is-competitor-search", null);
});

// Domain configuration mapping
const DOMAIN_CONFIG = {
  USA: {
    label: "eBay.com (USA)",
    value: "USA",
    baseUrl: "https://www.ebay.com",
    storageKey: "competitor-search-seller-names-USA"
  },
  UK: {
    label: "eBay.co.uk (UK)",
    value: "UK", 
    baseUrl: "https://www.ebay.co.uk",
    storageKey: "competitor-search-seller-names-UK"
  },
  Germany: {
    label: "eBay.de (Germany)",
    value: "Germany",
    baseUrl: "https://www.ebay.de",
    storageKey: "competitor-search-seller-names-Germany"
  },
  France: {
    label: "eBay.fr (France)",
    value: "France",
    baseUrl: "https://www.ebay.fr",
    storageKey: "competitor-search-seller-names-France"
  },
  Italy: {
    label: "eBay.it (Italy)",
    value: "Italy",
    baseUrl: "https://www.ebay.it",
    storageKey: "competitor-search-seller-names-Italy"
  },
  Spain: {
    label: "eBay.es (Spain)",
    value: "Spain",
    baseUrl: "https://www.ebay.es",
    storageKey: "competitor-search-seller-names-Spain"
  },
  Australia: {
    label: "eBay.com.au (Australia)",
    value: "Australia",
    baseUrl: "https://www.ebay.com.au",
    storageKey: "competitor-search-seller-names-Australia"
  },
  Canada: {
    label: "eBay.ca (Canada)",
    value: "Canada",
    baseUrl: "https://www.ebay.ca",
    storageKey: "competitor-search-seller-names-Canada"
  }
};

// Domain detection function
const detectDomainFromSeller = (sellerInput) => {
  if (!sellerInput) return null;
  
  const input = sellerInput.toLowerCase().trim();
  
  // Check for full URLs with various patterns
  const domainPatterns = [
    { pattern: /ebay\.com[\/\?]/, domain: 'USA' },
    { pattern: /ebay\.co\.uk[\/\?]/, domain: 'UK' },
    { pattern: /ebay\.de[\/\?]/, domain: 'Germany' },
    { pattern: /ebay\.fr[\/\?]/, domain: 'France' },
    { pattern: /ebay\.it[\/\?]/, domain: 'Italy' },
    { pattern: /ebay\.es[\/\?]/, domain: 'Spain' },
    { pattern: /ebay\.com\.au[\/\?]/, domain: 'Australia' },
    { pattern: /ebay\.ca[\/\?]/, domain: 'Canada' }
  ];
  
  for (const { pattern, domain } of domainPatterns) {
    if (pattern.test(input)) {
      return domain;
    }
  }
  
  // For usernames only, we'll use the currently selected domain
  return null;
};

// Extract username from various input formats
const extractUsername = (sellerInput) => {
  if (!sellerInput) return null;
  
  const input = sellerInput.trim();
  
  // Handle full URLs
  const urlMatch = input.match(/ebay\.[a-z.]+\/usr\/([^\/\s]+)/i);
  if (urlMatch) {
    return urlMatch[1];
  }
  
  // Handle search URLs
  const searchMatch = input.match(/[?&]_ssn=([^&\s]+)/i);
  if (searchMatch) {
    return searchMatch[1];
  }
  
  // Assume it's already a username
  return input;
};

const CompetitorScanner = () => {
  const [currentScanningUser, setCurrentScanningUser] = useState("");
  const [isCompetitorSearch, setIsCompetitorSearch] = useState(false);
  const [position, setPosition] = useState(0);
  const [totalCompetitorSearch, setTotalCompetitorSearch] = useState(0);
  const [soldWithin, setSoldWithin] = useState(90);
  const [selectedDomain, setSelectedDomain] = useState("USA");
  const [sellerNames, setSellerNames] = useState([]);
  const [currentUser, setCurrentUser] = useState([]);
  const sellerNamesRef = useRef(sellerNames);
  const [report, setReport] = useState([]);
  const reportRef = useRef(report);
  const [sellerItemProgress, setSellerItemProgress] = useState({ seller: '', processed: 0, total: 0, percent: 0 });
  const [lastNotifiedSeller, setLastNotifiedSeller] = useState('');

  useEffect(() => {
    const checkEbayScrappedProducts = async () => {
      const currentUserId = await getLocal("current-user");
      const soldWithin = await getLocal("competitor-search-sold-within");
      if (!soldWithin) {
        await setLocal("competitor-search-sold-within", 90);
        setSoldWithin(90);
      } else {
        setSoldWithin(soldWithin);
      }
      await setLocal("is-competitor-search", false);
      setIsCompetitorSearch(false);
      setCurrentUser(currentUserId);
      
      // Load the selected domain
      const domain = await getLocal(`selected-domain-${currentUserId}`);
      setSelectedDomain(domain || "USA");
      
      // Migrate existing sellers if needed
      await migrateExistingSellers();
      
      // Load sellers for the selected domain
      await loadSellersForDomain(domain || "USA");

      // Subscribe to live per-seller item progress updates
      try {
        onChangeLocalState('competitor-search-progress', (key, progress) => {
          if (progress && typeof progress === 'object') {
            setSellerItemProgress({
              seller: progress.seller || '',
              processed: Number(progress.processed) || 0,
              total: Number(progress.total) || 0,
              percent: Number(progress.percent) || 0,
            });
          }
        });
      } catch (e) {
        console.log('Unable to subscribe to competitor-search-progress:', e?.message);
      }
    };

    checkEbayScrappedProducts();
  }, []);

  // Migrate existing sellers to domain-based storage
  const migrateExistingSellers = async () => {
    try {
      // Check if migration has already been done
      const migrationDone = await getLocal("competitor-search-migration-done");
      if (migrationDone) return;

      // Get existing sellers from old storage
      const oldSellers = await getLocal("competitor-search-seller-names-persisted");
      if (oldSellers && oldSellers.length > 0) {
        // Get current domain to assign old sellers
        const currentUserId = await getLocal("current-user");
        const domain = await getLocal(`selected-domain-${currentUserId}`) || "USA";
        const domainConfig = DOMAIN_CONFIG[domain];
        
        if (domainConfig) {
          // Save old sellers to the current domain
          await setLocal(domainConfig.storageKey, oldSellers);
          console.log(`Migrated ${oldSellers.length} sellers to ${domain} domain`);
        }
      }

      // Mark migration as done
      await setLocal("competitor-search-migration-done", true);
    } catch (error) {
      console.error("Error during migration:", error);
    }
  };

  // Load sellers for a specific domain
  const loadSellersForDomain = async (domain) => {
    const domainConfig = DOMAIN_CONFIG[domain];
    if (!domainConfig) return;
    
    const localSellerNames = await getLocal(domainConfig.storageKey);
    if (localSellerNames?.length) {
      setSellerNames(localSellerNames);
      setTotalCompetitorSearch(localSellerNames.length);
    } else {
      setSellerNames([]);
      setTotalCompetitorSearch(0);
    }
  };

  // Handle domain change
  const handleDomainChange = async (newDomain) => {
    setSelectedDomain(newDomain);
    await loadSellersForDomain(newDomain);
  };

  useEffect(() => {
    sellerNamesRef.current = sellerNames;
    setTotalCompetitorSearch(sellerNames.length);
  }, [sellerNames]);

  // Notify when items progress reaches 100% for a seller (real-time)
  useEffect(() => {
    try {
      if (sellerItemProgress && sellerItemProgress.percent === 100 && sellerItemProgress.seller) {
        if (sellerItemProgress.seller !== lastNotifiedSeller) {
          notification.success({
            message: 'Seller Completed',
            description: `${sellerItemProgress.seller} items processed: ${sellerItemProgress.processed}/${sellerItemProgress.total}`,
            duration: 3,
          });
          setLastNotifiedSeller(sellerItemProgress.seller);
        }
      }
    } catch (_) {}
  }, [sellerItemProgress, lastNotifiedSeller]);

  const processSeller = async (index) => {
    const sellerName = sellerNames[index];
    console.log(`Processing: ${sellerName}`);
    
    if (!sellerName) {
      console.error("Invalid seller name:", sellerName);
      notification.error({
        message: "Invalid Seller Name",
        description: sellerName || "Empty seller name",
      });
      return "error";
    }

    const domainConfig = DOMAIN_CONFIG[selectedDomain];
    const baseUrl = domainConfig.baseUrl;

    console.log("Base URL:", baseUrl);
    
    try {
      // Open the tab for this seller and wait for extraction completion
      await chrome.runtime.sendMessage({
        payload: {
          url: `${baseUrl}/sch/i.html?_ssn=${sellerName}&store_name=${sellerName}&_ipg=240&_oac=1&LH_Sold=1&Competitor_Search=true`,
          active: false,
        },
        callback: "openTab",
      });
      
      console.log("Opened tab for:", sellerName);

      // Poll extension storage for competitor-search-status until success/error/stop
      const startTime = Date.now();
      let finalStatus = null;
      while (true) {
        const status = await getLocal('competitor-search-status');
        if (status === 'success' || status === 'error' || status === 'stop') { finalStatus = status; break; }
        if (Date.now() - startTime > 600000) break; // 10 min max per seller
        await sleep(2);
      }

      console.log(`✅ Processing finished for ${sellerName} with status: ${finalStatus}`);
      return finalStatus || "success";
      
    } catch (error) {
      console.error(`Error processing ${sellerName}:`, error);
      await setLocal("competitor-search-error", error.message);
      return "error";
    }
  };

  const processSellers = async () => {
    setIsCompetitorSearch(true);
    setPosition(0); // Reset position to start from beginning
    setReport([]); // Clear previous reports
    
    // Set global scraping status
    await setLocal("is-competitor-search", true);
    await setLocal('competitor-search-progress', { seller: '', processed: 0, total: 0, percent: 0 });
    
    // Get current sellers list
    const currentSellers = [...sellerNames];
    console.log("🚀 Starting to process sellers:", currentSellers);
    
    for (let i = 0; i < currentSellers.length; i++) {
      const sellerName = currentSellers[i];
      console.log(`📊 Processing seller ${i + 1}/${currentSellers.length}: ${sellerName}`);
      
      setCurrentScanningUser(sellerName);
      setPosition(i + 1);
      
      const status = await processSeller(i);
      
      if (status === "stop") {
        console.log("⏹️ Processing stopped by user");
        setIsCompetitorSearch(false);
        await setLocal("is-competitor-search", false);
        return;
      }
      
      if (status === "error") {
        const error = await getLocal("competitor-search-error");
        setReport(prev => [
          ...prev,
          {
            name: sellerName,
            status: "Error",
            error: error || "Unknown error occurred",
            timestamp: new Date().toLocaleTimeString()
          },
        ]);
        console.log(`❌ Error processing ${sellerName}:`, error);
      }
      
      if (status === "success") {
        setReport(prev => [
          ...prev,
          {
            name: sellerName,
            status: "Scrapping Done",
            timestamp: new Date().toLocaleTimeString()
          },
        ]);
        notification.success({
          message: "Scrapping Complete",
          description: `Finished scraping for ${sellerName}.`,
          duration: 3,
        });
        console.log(`✅ Successfully opened tab for ${sellerName}`);
      }
      
      // Small delay between processing to avoid overwhelming the system
      await sleep(2);
    }

    console.log("🎉 All sellers processed successfully!");
    notification.success({
      message: "Competitor Search Complete",
      description: `Successfully opened tabs for ${currentSellers.length} sellers. Data is being collected in the background.`,
      duration: 5,
    });
    
    setIsCompetitorSearch(false);
    setCurrentScanningUser("");
    await setLocal("is-competitor-search", false);
    await setLocal('competitor-search-progress', { seller: '', processed: 0, total: 0, percent: 0 });
  };

  const handleProcessSellers = () => {
    console.log("\n sellerNames", sellerNames);
    console.log("Selected domain:", selectedDomain);
    console.log("Total sellers to process:", sellerNames.length);
    
    if (sellerNames.length > 0) {
      processSellers();
    } else {
      notification.warning({
        message: "No Sellers to Process",
        description: "Please add some sellers to the list before running the scan.",
      });
    }
  };

  const handleStop = async () => {
    setIsCompetitorSearch(false);
    await setLocal("competitor-search-status", "stop");
  };

  const setCompetitorSearchFilters = async (key, value) => {
    console.log("\n setCompetitorSearchFilters", key, typeof value, value);
    await setLocal([key], value);
  };

  const handleReset = async () => {
    const domainConfig = DOMAIN_CONFIG[selectedDomain];
    await setLocal(domainConfig.storageKey, []);
    setSellerNames([]);
  };

  const ChangeSellersList = async (value) => {
    const domainConfig = DOMAIN_CONFIG[selectedDomain];
    if (!domainConfig) return;

    let names = value.split("\n");
    names = [...new Set(names)].filter(name => name.trim()); // Remove duplicates and empty lines
    console.log("🚀 ~ ChangeSellersList ~ names:", names);

    // Process each name to detect domain and extract username
    const processedNames = [];
    const domainGroups = {};

    for (const name of names) {
      const detectedDomain = detectDomainFromSeller(name);
      const username = extractUsername(name);
      
      if (username) {
        const targetDomain = detectedDomain || selectedDomain;
        
        if (!domainGroups[targetDomain]) {
          domainGroups[targetDomain] = [];
        }
        domainGroups[targetDomain].push(username);
        
        // Add to current domain's list if it matches
        if (targetDomain === selectedDomain) {
          processedNames.push(username);
        }
      }
    }

    // Save sellers to their respective domain storage
    for (const [domain, usernames] of Object.entries(domainGroups)) {
      const domainConfig = DOMAIN_CONFIG[domain];
      if (domainConfig) {
        const existingSellers = await getLocal(domainConfig.storageKey) || [];
        const updatedSellers = [...new Set([...existingSellers, ...usernames])];
        await setLocal(domainConfig.storageKey, updatedSellers);
      }
    }

    // Update current domain's display
    await setLocal(domainConfig.storageKey, processedNames);
    setSellerNames(processedNames);
  };



  // Show all sellers across all domains
  const showAllSellers = async () => {
    const allSellers = {};
    
    for (const [domain, config] of Object.entries(DOMAIN_CONFIG)) {
      const sellers = await getLocal(config.storageKey) || [];
      if (sellers.length > 0) {
        allSellers[domain] = sellers;
      }
    }
    
    console.log("📊 All Sellers Across Domains:", allSellers);
    
    let message = "All saved sellers:\n\n";
    for (const [domain, sellers] of Object.entries(allSellers)) {
      message += `${DOMAIN_CONFIG[domain].label}:\n`;
      sellers.forEach(seller => {
        message += `  • ${seller}\n`;
      });
      message += "\n";
    }
    
    notification.info({
      message: "All Saved Sellers",
      description: message,
      duration: 10,
    });
  };

  // Get seller count for current domain
  const getCurrentDomainSellerCount = () => {
    return sellerNames.length;
  };

  // Get total seller count across all domains
  const getTotalSellerCount = async () => {
    let total = 0;
    for (const config of Object.values(DOMAIN_CONFIG)) {
      const sellers = await getLocal(config.storageKey) || [];
      total += sellers.length;
    }
    return total;
  };

  // Test function to simulate processing multiple sellers
  const testProcessing = async () => {
    setIsCompetitorSearch(true);
    setPosition(0);
    setReport([]);
    
    const testSellers = ["test_seller_1", "test_seller_2", "test_seller_3"];
    console.log("🧪 Testing processing with:", testSellers);
    
    for (let i = 0; i < testSellers.length; i++) {
      const sellerName = testSellers[i];
      console.log(`📊 Test processing seller ${i + 1}/${testSellers.length}: ${sellerName}`);
      
      setCurrentScanningUser(sellerName);
      setPosition(i + 1);
      
      // Simulate processing delay
      await sleep(1);
      
      // Simulate success
      setReport(prev => [
        ...prev,
        {
          name: sellerName,
          status: "Tab Opened - Processing in Background",
          timestamp: new Date().toLocaleTimeString()
        },
      ]);
      
      console.log(`✅ Test: Successfully processed ${sellerName}`);
    }
    
    console.log("🎉 Test processing completed!");
    notification.success({
      message: "Test Complete",
      description: `Successfully processed ${testSellers.length} test sellers`,
      duration: 3,
    });
    
    setIsCompetitorSearch(false);
    setCurrentScanningUser("");
  };

  return (
    <PagesLayout dimensions="max-w-4xl">
      <div className="w-full flex justify-center">
        <div className="container max-w-lg space-y-4">
          <h1 className="font-bold text-2xl">Scanner</h1>
          
          {/* Platform/Country Dropdown */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Platform/Country:</label>
            <Select
              style={{ width: '100%' }}
              value={selectedDomain}
              onChange={handleDomainChange}
              options={Object.values(DOMAIN_CONFIG).map(config => ({
                label: config.label,
                value: config.value
              }))}
              placeholder="Select platform/country"
            />
            <div className="text-xs text-gray-500">
              Current: {DOMAIN_CONFIG[selectedDomain]?.label} • Sellers: {getCurrentDomainSellerCount()}
            </div>
          </div>

          <h2 className="font-bold text-xl">Saved Sellers</h2>
          <TextArea
            rows={6}
            className="max-h-40 my-1"
            placeholder="Enter competitors..."
            value={sellerNames.join("\n")}
            onChange={(e) => ChangeSellersList(e.target.value)}
          />
          <div className="flex justify-between gap-2">
            <div className="flex gap-2">
              <PageBtn
                variant="blue"
                onClick={() => handleProcessSellers()}
                disabled={isCompetitorSearch || !sellerNames.length}
                loading={isCompetitorSearch}
              >
                Run
              </PageBtn>
              <PageBtn
                onClick={() => handleStop()}
                disabled={!isCompetitorSearch}
              >
                Stop
              </PageBtn>
            </div>
            <div className="flex gap-2">
              <PageBtn
                variant="red"
                onClick={handleReset}
                disabled={isCompetitorSearch}
              >
                Reset (Removes All Items)
              </PageBtn>
              <PageBtn
                variant="purple"
                onClick={showAllSellers}
                disabled={isCompetitorSearch}
              >
                Show All Sellers
              </PageBtn>
              {report.length > 0 && (
                <PageBtn
                  variant="gray"
                  onClick={() => setReport([])}
                  disabled={isCompetitorSearch}
                >
                  Clear Results
                </PageBtn>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between items-center gap-2">
              <p>Get Total Sold History:</p>
              <Select
                defaultValue="off"
                style={{ width: 120 }}
                options={[
                  { value: false, label: "Off" },
                  { value: true, label: "On" },
                ]}
                onChange={(e) =>
                  setCompetitorSearchFilters(
                    "competitor-search-sold-history",
                    e
                  )
                }
              />
            </div>
            <div className="flex justify-between items-center gap-2">
              <p>Only Scan Items That Sold within:</p>
              <Select
                defaultValue="Last 90 Days"
                style={{ width: 120 }}
                value={soldWithin}
                options={[
                  { value: 1, label: "Last 1 Day" },
                  { value: 3, label: "Last 3 Days" },
                  { value: 7, label: "Last 7 Days" },
                  { value: 14, label: "Last 14 Days" },
                  { value: 21, label: "Last 21 Days" },
                  { value: 30, label: "Last 30 Days" },
                  { value: 60, label: "Last 60 Days" },
                  { value: 90, label: "Last 90 Days" },
                ]}
                onChange={(e) => {
                  setSoldWithin(e);
                  setCompetitorSearchFilters(
                    "competitor-search-sold-within",
                    e
                  );
                }}
              />
            </div>
          </div>
          <div className="text-sm">
            <div className="flex gap-2 items-center">
              <span>Current Position:</span>
              <span>{isCompetitorSearch ? position : 0} / {totalCompetitorSearch || 0}</span>
            </div>
            <div className="flex gap-2 items-center">
              <span>Competitor Count:</span>
              <span>{totalCompetitorSearch || 0}</span>
            </div>
            <div className="flex gap-2 items-center">
              <span>Scanning User:</span>
              <span className="font-medium">{currentScanningUser || "None"}</span>
            </div>
            {isCompetitorSearch && (
              <>
                <div className="flex gap-2 items-center">
                  <span>Seller Progress:</span>
                  <span className="text-blue-600">
                    {totalCompetitorSearch > 0 ? Math.round((position / totalCompetitorSearch) * 100) : 0}%
                  </span>
                </div>
                <div className="flex gap-2 items-center">
                  <span>Items Progress:</span>
                  <span className="text-green-600">
                    {sellerItemProgress?.processed || 0} / {sellerItemProgress?.total || 0} ({sellerItemProgress?.percent || 0}%)
                  </span>
                </div>
              </>
            )}
          </div>
          
          {/* Processing Results */}
          {report.length > 0 && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold text-lg mb-3">Processing Results</h3>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {report.map((item, index) => (
                  <div key={index} className={`p-2 rounded text-sm ${
                    item.status === "Scrapping Done" || item.status === "Tab Opened - Processing in Background" ? "bg-green-100 text-green-800" :
                    item.status === "Error" ? "bg-red-100 text-red-800" :
                    "bg-gray-100 text-gray-800"
                  }`}>
                    <div className="flex justify-between items-start">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-xs">{item.timestamp}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>{item.status}</span>
                      {item.status === "Error" && item.error && (
                        <span className="text-xs opacity-75">Error: {item.error}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs text-gray-600">
                Total processed: {report.length} | 
                Successful: {report.filter(r => r.status === "Scrapping Done" || r.status === "Tab Opened - Processing in Background").length} | 
                Errors: {report.filter(r => r.status === "Error").length}
              </div>
            </div>
          )}
          
          <div className="flex justify-end">
            <PageBtn
              variant="blue"
              className="show-items-btn"
              onClick={() =>
                chrome.tabs.create({
                  url: chrome.runtime.getURL("ebay-items-scanner.html"),
                })
              }
            >
              Show Results in Ebay Grabber
            </PageBtn>
          </div>
        </div>
      </div>
    </PagesLayout>
  );
};

export default CompetitorScanner;
