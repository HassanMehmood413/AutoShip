// Injects a 'View SKU' button into each eBay Active Listings row

(function() {
  // Add the skuToAsin function for consistent decoding (browser-compatible)
  const skuToAsin = (sku) => {
    try {
      return atob(sku);
    } catch (error) {
      console.error('Error decoding SKU:', error);
      return null; // Return null if decoding fails
    }
  };

  function waitForTableAndInject() {
    // eBay Active Listings table selector (update if needed)
    const table = document.querySelector('table[role="grid"]');
    if (!table) {
      setTimeout(waitForTableAndInject, 1000);
      return;
    }
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
      // Avoid duplicate buttons
      if (row.querySelector('.view-sku-btn')) return;
      // Try to get the title cell (update selector if needed)
      const titleCell = row.querySelector('a, .title, .shui-dt-column__title');
      if (!titleCell) return;
      const title = titleCell.textContent.trim();
      // Try to get the SKU or unique identifier
      // (You may want to use a data attribute or another cell)
      // For now, use the title as the key
      // Create the button
      const btn = document.createElement('button');
      btn.textContent = 'View SKU';
      btn.className = 'view-sku-btn';
      btn.style.marginLeft = '8px';
      btn.style.background = '#232f3e';
      btn.style.color = 'white';
      btn.style.border = 'none';
      btn.style.padding = '4px 10px';
      btn.style.borderRadius = '4px';
      btn.style.cursor = 'pointer';
      btn.title = 'View listing';
      btn.onclick = async (e) => {
        e.stopPropagation();
        try {
          const baseEbay = `${location.protocol}//${location.host}`;

          // Prefer database to resolve the exact listing URL
          let finalUrl = null;

          // Extract SKU (Base64 ASIN) from row
          const skuCell = row.querySelector('[data-testid="custom-label"], .custom-label, input[name="customLabel"], .shui-dt-column__listingSKU');
          const skuVal = skuCell ? (skuCell.value || skuCell.innerText || '').trim() : '';
          const asin = skuVal ? skuToAsin(skuVal) : null;

          if (asin) {
            try {
              const res = await chrome.runtime.sendMessage({
                callback: 'getListing',
                payload: { asin }
              });
              const listingData = res?.listingData || {};
              const dbUrl = listingData.listingUrl || listingData.url || null;
              const itemId = listingData.itemId || listingData.listingId || listingData.id || null;
              if (dbUrl) finalUrl = dbUrl;
              else if (itemId) finalUrl = `${baseEbay}/itm/${itemId}`;
            } catch (_) {}
          }

          // Fallbacks: row data-id or title link
          if (!finalUrl) {
            const rowItemId = row.getAttribute('data-id');
            if (rowItemId) finalUrl = `${baseEbay}/itm/${rowItemId}`;
          }
          if (!finalUrl) {
            const titleAnchor = row.querySelector('a[href*="/itm/"]');
            if (titleAnchor && titleAnchor.href) finalUrl = titleAnchor.href;
          }

          // Last resort: Active listings
          if (!finalUrl) finalUrl = `${baseEbay}/sh/lst/active`;

          window.open(finalUrl, '_blank');
        } catch (error) {
          console.error('Error opening listing URL:', error);
          const baseEbay = `${location.protocol}//${location.host}`;
          window.open(`${baseEbay}/sh/lst/active`, '_blank');
        }
      };
      // Inject the button after the title
      titleCell.parentElement.appendChild(btn);
    });
  }
  waitForTableAndInject();
  // Optionally, observe for dynamic changes
  const observer = new MutationObserver(waitForTableAndInject);
  observer.observe(document.body, { childList: true, subtree: true });
})(); 