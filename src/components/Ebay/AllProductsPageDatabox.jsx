import { BsPersonCircle } from "react-icons/bs";
import { FcStatistics } from "react-icons/fc";
import { IoMdCopy } from "react-icons/io";
import { IoIosSave } from "react-icons/io";
import { makeStyles } from "@material-ui/core/styles";
import { message, notification, Typography } from "antd";
import { getLocal, setLocal } from "../../services/dbService";
import "../../../dist/style.css";
import "./style.css";
import { useState } from "react";
import { useEffect } from "react";
import { round } from "lodash";
import { ebayOverlayOptions } from "../../constants/ebay-overlay-options";
import { getCurrencySymbolFromCurrentURL, getCurrencySymbolFromSelectedDomain } from "../../services/currencyUtils";

const { Text } = Typography;

const useStyles = makeStyles({
  div1: {
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
  },
  div2: {
    borderRadius: "25px",
    backgroundColor: "#a6ea99",
    color: "white",
    borderColor: "#a6ea99",
    fontWeight: "bolder",
  },
  div3: {
    display: "flex",
    alignItems: "center",
  },
  div4: {
    display: "flex",
    alignItems: "center",
    padding: "5px",
  },
});

const IconWithTooltip = ({ element, tooltip }) => (
  <div className="icon-container">
    {element}
    <span className="tooltip">{tooltip}</span>
  </div>
);

const ProductPageIconsDataBox = ({ storeName, productId, dataToBeCopied }) => {
  const { username } = dataToBeCopied;
  const [segment, setSegment] = useState("not-found");
  const [view, setView] = useState("gallery");
  const [breakevenPrice, setBreakevenPrice] = useState(0);

  useEffect(() => {
    const pathSegments = window.location.pathname.split("/").filter(Boolean);
    setSegment(pathSegments[0] || "not-found");
    let isListView = document.querySelector("ul.srp-list");
    setView(isListView ? "list" : "gallery");
  }, []);

  const getBreakevenPrice = async () => {
    const { price } = dataToBeCopied;
    // breakeven price
    const userId = await getLocal("current-user");
    const domain = await getLocal(`selected-domain-${userId}`);
    
    // Get currency symbol based on current page URL or selected domain
    const currencyFromURL = getCurrencySymbolFromCurrentURL();
    const currencyFromDomain = getCurrencySymbolFromSelectedDomain(domain);
    
    // Use URL-based currency if available, otherwise use domain setting
    const currency = currencyFromURL || currencyFromDomain;
    
    let bePrice = null;
    if (domain === "USA") {
      // Item List Price + 12.9% + $0.55 for USA
      bePrice = `${currency}${round(price - price * 12.9 * 0.01 + 0.55, 2)}`;
    } else {
      // Item List Price + 9.48% + £0.36 + £0.12 (or equivalent for other currencies)
      bePrice = `${currency}${round(price - price * 9.48 * 0.01 + 0.36 + 0.12, 2)}`;
    }
    setBreakevenPrice(bePrice);
  };

  useEffect(() => {
    getBreakevenPrice();
  }, []);

  const amazon =
    "https://images.seeklogo.com/logo-png/40/2/amazon-icon-logo-png_seeklogo-405254.png";
  const ebay =
    "https://upload.wikimedia.org/wikipedia/commons/1/1b/EBay_logo.svg";
  const teraPeak =
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS4mJgVrZkAzQiX_ujPnn23JaYq23YFNqCj-w&s";
  const googleLens =
    "https://www.techjuice.pk/wp-content/uploads/2021/03/unnamed-1.png";
  const sold = "https://i.imgur.com/VCXetLv.png";

  const googleLensLink = `https://lens.google.com/uploadbyurl?url=${dataToBeCopied.image}&hl=en-US`;

  const copyToClip = () => {
    navigator.clipboard.writeText(JSON.stringify(dataToBeCopied));
    message.success("Text Copied");
  };

  const saveEbaySeller = async () => {
    try {
      const userId = await getLocal("current-user");
      const domain = (await getLocal(`selected-domain-${userId}`)) || "USA";
      const storageKey = `competitor-search-seller-names-${domain}`;

      let ebaySellers = (await getLocal(storageKey)) || [];
      ebaySellers = [...new Set([...ebaySellers, username?.trim()])].filter(Boolean);

      await setLocal(storageKey, ebaySellers);

      // Keep backward compatibility: update legacy key too (used for migration once)
      const legacy = (await getLocal("competitor-search-seller-names-persisted")) || [];
      const legacyUpdated = [...new Set([...legacy, username?.trim()])].filter(Boolean);
      await setLocal("competitor-search-seller-names-persisted", legacyUpdated);

      message.success("eBay seller saved to current country");
    } catch (e) {
      console.error("Failed to save eBay seller:", e);
      message.error("Failed to save seller");
    }
  };

  const handleTerapeakSearch = async () => {
    const messages = [
      {
        role: "user",
        content: `${dataToBeCopied.title}/n Describe the item with 3 KEY WORDS that shoppers would search for. And pick the best one.`,
      },
    ];

    let response = await chrome.runtime.sendMessage({
      payload: {
        model: "gpt-4o-mini",
        messages,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "response_title",
            schema: {
              type: "object",
              properties: {
                titles: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                },
              },
              required: ["titles"],
            },
          },
        },
      },
      callback: "chat-gpt",
    });

    if (response?.success === false) {
      notification.error({
        message: "Open AI API Error",
        description: response.error,
      });
      return;
    }

    response = JSON.parse(response.content);

    const { titles } = response;
    const userId = await getLocal("current-user");
    const domain = await getLocal(`selected-domain-${userId}`);

    let ebayLink = "https://www.ebay.com";
    if (domain === "UK") {
      ebayLink = "https://www.ebay.co.uk";
    }

    const terapeakLink = `${ebayLink}/sh/research?keywords=${titles[1]}&dayRange=30&categoryId=0&offset=0&limit=50&sorting=-itemssold&tabName=SOLD&marketplace=EBAY-US&tz=America/Toronto&minPrice=0`;
    window.open(terapeakLink, "_blank");
  };

  const handleOpenNewTab = async (platform, link) => {
    const userId = await getLocal("current-user");
    const domain = await getLocal(`selected-domain-${userId}`);

    let ebayLink = "https://www.ebay.com";
    let amazonLink = "https://www.amazon.com";

    if (domain === "UK") {
      ebayLink = "https://www.ebay.co.uk";
      amazonLink = "https://www.amazon.co.uk";
    }

    let openTabLink = ebayLink;
    if (platform === "amazon") {
      openTabLink = amazonLink;
    }

    window.open(`${openTabLink}${link}`, "_blank");
  };

  const options = {
    ebayTools: [
      {
        ...ebayOverlayOptions.allSellerSoldItem,
        action: () => {
          handleOpenNewTab('ebay', `/sch/i.html?_dkr=1&_fsrp=1&iconV2Request=true&_blrs=recall_filtering&_ssn=${username}&_ipg=240&_oac=1&LH_Sold=1`)
        },
      },
      {
        ...ebayOverlayOptions.whatTheySold,
        action: () => {
          handleOpenNewTab('ebay', `/bin/purchaseHistory?item=${productId}`)
        },
      },
      {
        ...ebayOverlayOptions.copyInfo,
        action: () => {
          copyToClip()
        },
      },
      {
        ...ebayOverlayOptions.sendSellerToScanner,
        action: () => {
          saveEbaySeller()
        },
      },
      {
        ...ebayOverlayOptions.searchTitleActive,
        action: () => {
          handleOpenNewTab('ebay', `/sch/i.html?_from=R40&_trksid=p4432023.m570.l1313&_nkw=${dataToBeCopied.title}&_sacat=0`)
        },
      },
      {
        ...ebayOverlayOptions.searchTitleSold,
        action: () => {
          handleOpenNewTab('ebay', `/sch/i.html?_nkw=${dataToBeCopied.title}&_odkw=${dataToBeCopied.title}&LH_Sold=1&_sop=13&LH_ItemCondition=1000&LH_FS=1`)
        },
      },
    ],
    searchTools: [
      {
        ...ebayOverlayOptions.amazon,
        action: () => {
          handleOpenNewTab('amazon', `/s?k=${dataToBeCopied.title}`)
        },
      },
      {
        ...ebayOverlayOptions.googleImages,
        action: () => {
          window.open(googleLensLink, '_blank')
        },
      },
    ],
  };

  if (segment === "sch" && view === "list") {
    return (
      <div className="relative">
        <div className="absolute -top-16 right-0 flex flex-col">
          <h4 className="text-lg font-bold text-right text-blue-800">
            {breakevenPrice || "0.00"}
          </h4>
          <p className="text-xs font-medium text-blue-500">Breakeven Price</p>
        </div>
        <div className="flex gap-3 flex-wrap mb-2">
          {[...options.ebayTools, ...options.searchTools].map(
            ({ label, icon, action }, i) => (
              <button
                onClick={() => action()}
                key={i}
                className="flex items-center gap-2 border border-black border-opacity-[0.07] bg-[#D9D9D920] hover:border-opacity-50 hover:bg-[#D9D9D933] rounded-lg px-2 py-1 text-xs"
              >
                <img
                  className="w-4 h-4 object-center object-contain"
                  src={icon}
                  alt={label}
                />
                <span className="text-start">{label}</span>
              </button>
            )
          )}
        </div>
      </div>
    );
  }

  if (segment === "sch" && view === "gallery")
    return (
      <div className="flex flex-col gap-2 text-xs">
        {/* Breakeven Price */}
        <div className="flex flex-col">
          <h4 className="text-lg font-bold text-blue-800">
            {breakevenPrice || "0.00"}
          </h4>
          <p className="text-xs font-medium text-blue-500">Breakeven Price</p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-center relative">
            <div className="absolute top-[9px] w-full border-b"></div>
            <span className="bg-white px-4 relative font-semibold text-neutral-500">
              Ebay Tools
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1 text-[11px]">
            {options.ebayTools.map(({ label, icon, action }, i) => (
              <button
                onClick={() => action()}
                key={i}
                className="w-full flex items-center gap-2 border border-black border-opacity-[0.07] bg-[#D9D9D920] hover:border-opacity-50 hover:bg-[#D9D9D933] rounded-lg px-2 py-1"
              >
                <img
                  className="w-4 h-4 object-center object-contain"
                  src={icon}
                  alt={label}
                />
                <span className="text-start">{label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-center relative">
            <div className="absolute top-[9px] w-full border-b"></div>
            <span className="bg-white px-4 relative font-semibold text-neutral-500">
              Other Tools
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1 text-[11px]">
            {options.searchTools.map(({ label, icon, action }, i) => (
              <button
                onClick={() => action()}
                key={i}
                className="w-full flex items-center gap-2 border border-black border-opacity-[0.07] bg-[#D9D9D920] hover:border-opacity-50 hover:bg-[#D9D9D933] rounded-lg px-2 py-1"
              >
                <img
                  className="w-4 h-4 object-center object-contain"
                  src={icon}
                  alt={label}
                />
                <span className="text-start">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );

  if (segment === "itm") {
    return (
      <div className="relative flex flex-col gap-2 text-xs">
        <div className="mt-2 flex justify-between items-center">
          {/* AMAZON SKU */}
          <button
            onClick={async () => {
              try {
                // Get the SKU from the current eBay listing
                const skuElement = document.querySelector('input[name="customLabel"]') || 
                                  document.querySelector('[data-testid="custom-label"]') ||
                                  document.querySelector('.custom-label');
                
                if (skuElement && skuElement.value) {
                  const sku = skuElement.value;
                  console.log('Found SKU:', sku);
                  
                  // Convert SKU to ASIN using browser-compatible function
                  let asin = '';
                  try {
                    asin = atob(sku);
                    console.log('Decoded ASIN:', asin);
                  } catch (error) {
                    console.error('Error decoding SKU to ASIN:', error);
                    // Try to find ASIN in the page content
                    const asinMatch = document.body.textContent.match(/ASIN[:\s]+([A-Z0-9]{10})/i);
                    if (asinMatch) {
                      asin = asinMatch[1];
                      console.log('Found ASIN in page content:', asin);
                    }
                  }
                  
                  if (asin) {
                    // Use the handleSearchClick logic from magnifying glass
                    console.log('🚀 ~ ASIN:', asin);
                    const userId = await getLocal('current-user');
                    const domain = await getLocal(`selected-domain-${userId}`);

                    let amazonLink = 'https://www.amazon.com';
                    if (domain === 'UK') {
                      amazonLink = 'https://www.amazon.co.uk';
                    }

                    window.open(`${amazonLink}/dp/${asin}`, '_blank');
                  } else {
                    // Fallback: search Amazon with the product title
                    const searchQuery = encodeURIComponent(dataToBeCopied.title || '');
                    const userId = await getLocal("current-user");
                    const domain = await getLocal(`selected-domain-${userId}`);
                    
                    let amazonLink = "https://www.amazon.com";
                    if (domain === "UK") {
                      amazonLink = "https://www.amazon.co.uk";
                    }
                    
                    window.open(`${amazonLink}/s?k=${searchQuery}`, "_blank");
                  }
                } else {
                  // No SKU found, search by title
                  const searchQuery = encodeURIComponent(dataToBeCopied.title || '');
                  const userId = await getLocal("current-user");
                  const domain = await getLocal(`selected-domain-${userId}`);
                  
                  let amazonLink = "https://www.amazon.com";
                  if (domain === "UK") {
                    amazonLink = "https://www.amazon.co.uk";
                  }
                  
                  window.open(`${amazonLink}/s?k=${searchQuery}`, "_blank");
                }
              } catch (error) {
                console.error('Error opening Amazon SKU:', error);
                // Fallback to title search
                const searchQuery = encodeURIComponent(dataToBeCopied.title || '');
                window.open(`https://www.amazon.com/s?k=${searchQuery}`, "_blank");
              }
            }}
            className="flex items-center gap-2 border border-black border-opacity-[0.07] bg-[#D9D9D920] hover:border-opacity-50 hover:bg-[#D9D9D933] rounded-lg px-3 py-2"
          >
            <img
              className="w-4 h-4 object-center object-contain"
              src={ebayOverlayOptions.amazon.icon}
              alt={ebayOverlayOptions.amazon.label}
            />
            <span className="text-start">
              View SKU
            </span>
          </button>
          {/* Breakeven Price */}
          <div className="justify-end flex flex-col">
            <h4 className="text-lg font-bold text-blue-800 text-right">
              {breakevenPrice || "0.00"}
            </h4>
            <p className="text-xs font-medium text-blue-500">Breakeven Price</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-center relative">
            <div className="absolute top-[9px] w-full border-b border-solid border-neutral-200"></div>
            <span className="bg-white px-4 relative font-semibold text-neutral-500">
              Ebay Tools
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1 text-[13px]">
            {options.ebayTools.map(({ label, icon, action }, i) => (
              <button
                onClick={() => action()}
                key={i}
                className="w-full flex items-center gap-2 border border-black border-opacity-[0.07] bg-[#D9D9D920] hover:border-opacity-50 hover:bg-[#D9D9D933] rounded-lg px-3 py-2"
              >
                <img
                  className="w-4 h-4 object-center object-contain"
                  src={icon}
                  alt={label}
                />
                <span className="text-start">{label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-center relative">
            <div className="absolute top-[9px] w-full border-b border-solid border-neutral-200"></div>
            <span className="bg-white px-4 relative font-semibold text-neutral-500">
              Other Tools
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1 text-[13px]">
            {options.searchTools.map(({ label, icon, action }, i) => (
              <button
                onClick={() => action()}
                key={i}
                className="w-full flex items-center gap-2 border border-black border-opacity-[0.07] bg-[#D9D9D920] hover:border-opacity-50 hover:bg-[#D9D9D933] rounded-lg px-3 py-2"
              >
                <img
                  className="w-4 h-4 object-center object-contain"
                  src={icon}
                  alt={label}
                />
                <span className="text-start">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  console.log("HAS SKIPPED A PAGE", segment, view)

  return <></>;

  return (
    <div style={{ marginTop: "1rem" }}>
      <div
        style={{
          display: "flex",
          gap: "1rem",
          cursor: "pointer",
        }}
      >
        <IconWithTooltip
          element={
            <div
              onClick={() =>
                handleOpenNewTab(
                  "ebay",
                  `/sch/i.html?_dkr=1&_fsrp=1&iconV2Request=true&_blrs=recall_filtering&_ssn=${username}&_ipg=240&_oac=1&LH_Sold=1`
                )
              }
            >
              <BsPersonCircle size={24} color="black" className="icon" />
            </div>
          }
          tooltip="Open ebay's seller sold items"
        />
        <IconWithTooltip
          element={
            <div
              onClick={() =>
                handleOpenNewTab(
                  "ebay",
                  `/bin/purchaseHistory?item=${productId}`
                )
              }
            >
              <FcStatistics size={24} color="blue" className="icon" />
            </div>
          }
          tooltip="Check how many sold"
        />
        <IconWithTooltip
          element={
            <div onClick={() => copyToClip()}>
              <IoMdCopy size={24} className="icon" />
            </div>
          }
          tooltip="Snipe the Title and Price, Saves this to Clipboard"
        />
        <IconWithTooltip
          element={
            <div onClick={() => saveEbaySeller()}>
              <IoIosSave size={24} color="#a5c7fa" className="icon" />
            </div>
          }
          tooltip="Save eBay Seller"
        />
      </div>
      <div
        style={{
          marginTop: "1rem",
          borderTop: "1px solid #e5e5e5",
          paddingTop: "1rem ",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        {/* <div style={{ display: 'flex' }}>
        <div style={{
          width: '6rem',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          cursor: 'pointer'
        }}>
          <IconWithTooltip
            element={
              <div onClick={() => handleOpenNewTab('ebay', `/sch/i.html?_dkr=1&_fsrp=1&iconV2Request=true&_blrs=recall_filtering&_ssn=${username}&_ipg=240&_oac=1&LH_Sold=1`)}>
                <BsPersonCircle
                  size={24}
                  color='black'
                  className='icon'
                />
              </div>
            }
            tooltip="Open ebay's seller sold items"
          />
          <IconWithTooltip
            element={
              <div onClick={() => handleOpenNewTab('ebay', `/bin/purchaseHistory?item=${productId}`)}>
                <FcStatistics
                  size={24}
                  color='blue'
                  className='icon'
                />
              </div>
            }
            tooltip='Check how many sold'
          />
          <IconWithTooltip
            element={
              <div onClick={() => copyToClip()}>
                <IoMdCopy
                  size={24}
                  className='icon'
                />
              </div>
            }
            tooltip='Snipe the Title and Price, Saves this to Clipboard'
          />
          <IconWithTooltip
            element={
              <div onClick={() => saveEbaySeller()}>
                <IoIosSave
                  size={24}
                  color='#a5c7fa'
                  className='icon'
                />
              </div>
            }
            tooltip='Save eBay Seller'
          />
        </div>
      </div> */}
        {/* pending task */}
        {/* <div>
        <Button
          className={classes.div2}
          size='large'
        >
          List to Ebay
        </Button>
      </div> */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <p style={{ fontSize: "1.55rem", fontWeight: "bolder" }}>
            {breakevenPrice || "N/A"}
          </p>
          <p style={{ opacity: "70%", fontSize: ".85rem" }}>Breakeven Price</p>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
            <IconWithTooltip
              element={
                <img
                  className="icon"
                  style={{
                    width: "40px",
                    height: "40px",
                    cursor: "pointer",
                  }}
                  src={amazon}
                  alt="NO_IMAGE"
                  onClick={() =>
                    handleOpenNewTab("amazon", `/s?k=${dataToBeCopied.title}`)
                  }
                />
              }
              tooltip="Search Amazon for this item"
            />
            <IconWithTooltip
              element={
                <img
                  className="icon"
                  style={{
                    width: "40px",
                    height: "40px",
                    cursor: "pointer",
                  }}
                  src={ebay}
                  alt="NO_IMAGE"
                  onClick={() =>
                    handleOpenNewTab(
                      "ebay",
                      `/sch/i.html?_from=R40&_trksid=p4432023.m570.l1313&_nkw=${dataToBeCopied.title}&_sacat=0`
                    )
                  }
                />
              }
              tooltip="Search eBay for this item"
            />
            <IconWithTooltip
              element={
                <img
                  className="icon"
                  style={{
                    width: "40px",
                    height: "40px",
                    cursor: "pointer",
                  }}
                  src={googleLens}
                  alt="NO_IMAGE"
                  onClick={() => window.open(googleLensLink, "_blank")}
                />
              }
              tooltip="Search Google for this item"
            />
            <IconWithTooltip
              element={
                <img
                  className="icon"
                  style={{
                    width: "40px",
                    height: "40px",
                    cursor: "pointer",
                  }}
                  src={sold}
                  alt="NO_IMAGE"
                  onClick={() =>
                    handleOpenNewTab(
                      "ebay",
                      `/sch/i.html?_nkw=${dataToBeCopied.title}&_odkw=${dataToBeCopied.title}&LH_Sold=1&_sop=13&LH_ItemCondition=1000&LH_FS=1`
                    )
                  }
                />
              }
              tooltip="Search eBay for sold items"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPageIconsDataBox;
