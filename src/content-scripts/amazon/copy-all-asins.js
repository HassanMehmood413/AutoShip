// Amazon Results Page Enhancer
(function() {
  // Helper: Extract ASIN from product URL
  function extractASIN(url) {
    const match = url.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})/);
    return match ? (match[1] || match[2]) : null;
  }

  // Helper: Show toast notification
  function showToast(message) {
    let toast = document.getElementById('asin-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'asin-toast';
      toast.style.position = 'fixed';
      toast.style.top = '60px';
      toast.style.right = '30px';
      toast.style.background = '#ff9900';
      toast.style.color = '#222';
      toast.style.padding = '10px 18px';
      toast.style.borderRadius = '6px';
      toast.style.fontWeight = 'bold';
      toast.style.zIndex = 99999;
      toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 2500);
  }

  // 1. Inject 'Copy All ASINs' button
  function injectCopyAllButton() {
    // Find the results header or a good place to inject
    const resultsHeader = document.querySelector('#search .s-desktop-width-max .sg-col-20-of-24') || document.querySelector('#search');
    if (!resultsHeader || document.getElementById('copy-all-asins-btn')) return;
    // Gather all ASINs on the page
    const productLinks = Array.from(document.querySelectorAll('a[href*="/dp/"]')).filter(a => a.closest('[data-asin]'));
    const asins = Array.from(new Set(productLinks.map(a => extractASIN(a.href)).filter(Boolean)));
    // Create the button
    const btn = document.createElement('button');
    btn.id = 'copy-all-asins-btn';
    btn.textContent = `Copy All ASIN’s (Total: ${asins.length})`;
    btn.style.background = 'linear-gradient(135deg, #ff9900 0%, #ff7700 100%)';
    btn.style.color = 'white';
    btn.style.fontWeight = 'bold';
    btn.style.border = '1px solid #e47911';
    btn.style.padding = '12px 24px';
    btn.style.borderRadius = '8px';
    btn.style.margin = '15px 0 20px 0';
    btn.style.cursor = 'pointer';
    btn.style.fontSize = '16px';
    btn.style.boxShadow = '0 4px 12px rgba(255, 153, 0, 0.3)';
    btn.style.transition = 'all 0.3s ease';
    btn.style.textShadow = '0 1px 2px rgba(0,0,0,0.2)';
    btn.style.letterSpacing = '0.5px';
    btn.onmouseover = () => {
      btn.style.transform = 'translateY(-2px)';
      btn.style.boxShadow = '0 6px 16px rgba(255, 153, 0, 0.4)';
    };
    btn.onmouseout = () => {
      btn.style.transform = 'translateY(0)';
      btn.style.boxShadow = '0 4px 12px rgba(255, 153, 0, 0.3)';
    };
    btn.onclick = () => {
      navigator.clipboard.writeText(asins.join('\n'));
      btn.textContent = 'Copied';
      btn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
      showToast(`${asins.length} ASIN${asins.length === 1 ? '' : 's'} Copied to Clipboard (Total: ${asins.length})`);
      setTimeout(() => {
        btn.textContent = `Copy All ASIN's (Total: ${asins.length})`;
        btn.style.background = 'linear-gradient(135deg, #ff9900 0%, #ff7700 100%)';
      }, 2000);
    };
    // Insert the button
    resultsHeader.prepend(btn);
  }

  // 2. Inject 'List ASIN' button for each product in bottom-right corner
  function injectListASINButtons() {
    // Remove old buttons and sidebar
    document.querySelectorAll('.list-asin-over-image').forEach(el => el.remove());
    document.querySelectorAll('.asin-button-container').forEach(el => el.remove());
    document.querySelectorAll('#asin-sidebar').forEach(el => el.remove());
    
    // For each product
    document.querySelectorAll('[data-asin][data-component-type="s-search-result"]').forEach(product => {
      const asin = product.getAttribute('data-asin');
      if (!asin) return;
      
      // Avoid duplicate buttons
      if (product.querySelector('.list-asin-btn')) return;
      
      // Create the button
      const btn = document.createElement('button');
      btn.className = 'list-asin-btn';
      btn.textContent = `LIST ASIN: ${asin}`;
      btn.style.background = 'linear-gradient(135deg, #232f3e 0%, #1a252f 100%)';
      btn.style.color = 'white';
      btn.style.fontWeight = 'bold';
      btn.style.border = '1px solid #37475a';
      btn.style.padding = '6px 10px';
      btn.style.borderRadius = '6px';
      btn.style.cursor = 'pointer';
      btn.style.fontSize = '11px';
      btn.style.transition = 'all 0.2s ease';
      btn.style.boxShadow = '0 2px 6px rgba(35, 47, 62, 0.3)';
      btn.style.textShadow = '0 1px 1px rgba(0,0,0,0.3)';
      btn.style.zIndex = '1000';
      
      // Position button in bottom-right corner of product container
      btn.style.position = 'absolute';
      btn.style.bottom = '10px';
      btn.style.right = '10px';
      
      btn.onmouseover = () => {
        btn.style.transform = 'translateY(-1px)';
        btn.style.boxShadow = '0 4px 10px rgba(35, 47, 62, 0.4)';
      };
      btn.onmouseout = () => {
        btn.style.transform = 'translateY(0)';
        btn.style.boxShadow = '0 2px 6px rgba(35, 47, 62, 0.3)';
      };
      
      // Handle click with robust event prevention
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        navigator.clipboard.writeText(asin);
        btn.textContent = 'Copied!';
        btn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
        showToast(`ASIN ${asin} copied to clipboard`);
        
        setTimeout(() => {
          btn.textContent = `LIST ASIN: ${asin}`;
          btn.style.background = 'linear-gradient(135deg, #232f3e 0%, #1a252f 100%)';
        }, 2000);
        
        return false;
      }, true);
      
      // Make sure the product container has relative positioning
      product.style.position = 'relative';
      
      // Add button to product container
      product.appendChild(btn);
    });
  }

  // Run on page load and on DOM changes
  function run() {
    injectCopyAllButton();
    injectListASINButtons();
  }
  run();
  // Observe for dynamic page changes
  const observer = new MutationObserver(run);
  observer.observe(document.body, { childList: true, subtree: true });
})();