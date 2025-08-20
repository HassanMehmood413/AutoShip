class AmazonScraper {
    constructor() {
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
        ];
    }

    getRandomUserAgent() {
        return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async fetchPage(url) {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': this.getRandomUserAgent(),
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.text();
        } catch (error) {
            console.error('Error fetching page:', error);
            throw error;
        }
    }

    parseHTML(htmlString) {
        const parser = new DOMParser();
        return parser.parseFromString(htmlString, 'text/html');
    }

    isSponsored(container) {
        // Check for sponsored indicators
        const sponsoredIndicators = [
            'span[data-component-type="s-sponsored-label"]',
            'span:contains("Sponsored")',
            '.s-sponsored-label',
            '[data-sponsored="true"]'
        ];

        for (const selector of sponsoredIndicators) {
            if (container.querySelector(selector)) {
                return true;
            }
        }

        // Check text content for "Sponsored"
        const textContent = container.textContent.toLowerCase();
        return textContent.includes('sponsored');
    }

    extractProductData(container) {
        try {
            // Title
            const titleSelectors = [
                'h2.a-size-mini span',
                'h2 .a-size-medium',
                'h2 .a-size-base-plus',
                'h2 a span'
            ];
            
            let title = 'N/A';
            for (const selector of titleSelectors) {
                const element = container.querySelector(selector);
                if (element) {
                    title = element.textContent.trim();
                    break;
                }
            }

            // Price
            const priceSelectors = [
                '.a-price-whole',
                '.a-price .a-offscreen',
                '.a-price-range'
            ];
            
            let price = 'N/A';
            for (const selector of priceSelectors) {
                const element = container.querySelector(selector);
                if (element) {
                    price = element.textContent.trim();
                    // Try to get decimal part
                    const decimalElement = container.querySelector('.a-price-fraction');
                    if (decimalElement) {
                        price += '.' + decimalElement.textContent.trim();
                    }
                    break;
                }
            }

            // Rating
            const ratingElement = container.querySelector('.a-icon-alt');
            const rating = ratingElement ? ratingElement.textContent.trim() : 'N/A';

            // Number of reviews
            const reviewsElement = container.querySelector('[data-action="s-show-all-reviews-link"] span');
            const reviews = reviewsElement ? reviewsElement.textContent.trim() : 'N/A';

            // Product URL
            const linkElement = container.querySelector('h2 a');
            const productUrl = linkElement ? 
                new URL(linkElement.href, 'https://www.amazon.co.uk').href : 'N/A';

            // Image URL
            const imgElement = container.querySelector('.s-image');
            const imageUrl = imgElement ? imgElement.src : 'N/A';

            // Prime availability
            const primeElement = container.querySelector('[aria-label*="Prime"]');
            const hasPrime = !!primeElement;

            // Availability
            const availabilityElement = container.querySelector('[data-cy="availability-recipe"]');
            const availability = availabilityElement ? availabilityElement.textContent.trim() : 'N/A';

            return {
                title,
                price,
                rating,
                reviews,
                url: productUrl,
                imageUrl,
                hasPrime,
                availability
            };
        } catch (error) {
            console.error('Error extracting product data:', error);
            return null;
        }
    }

    async scrapeProducts(url, maxProducts = 10, delayRange = [2000, 5000]) {
        const products = [];
        let page = 1;

        console.log(`Starting to scrape ${maxProducts} products...`);

        while (products.length < maxProducts) {
            console.log(`Scraping page ${page}...`);

            try {
                // Construct page URL
                const pageUrl = page === 1 ? url : `${url}&page=${page}`;
                
                // Fetch page
                const htmlContent = await this.fetchPage(pageUrl);
                const doc = this.parseHTML(htmlContent);

                // Find product containers
                const productContainers = doc.querySelectorAll('[data-component-type="s-search-result"]');

                if (productContainers.length === 0) {
                    console.log('No more products found');
                    break;
                }

                let pageProducts = 0;
                for (const container of productContainers) {
                    if (products.length >= maxProducts) break;

                    // Skip sponsored products
                    if (this.isSponsored(container)) {
                        console.log('Skipping sponsored product');
                        continue;
                    }

                    const productData = this.extractProductData(container);
                    if (productData && productData.title !== 'N/A') {
                        products.push(productData);
                        pageProducts++;
                        console.log(`Scraped product ${products.length}: ${productData.title.substring(0, 50)}...`);
                    }
                }

                if (pageProducts === 0) {
                    console.log('No valid products found on this page');
                    break;
                }

                // Random delay between requests
                const delay = Math.random() * (delayRange[1] - delayRange[0]) + delayRange[0];
                console.log(`Waiting ${delay / 1000}s before next request...`);
                await this.delay(delay);

                page++;

            } catch (error) {
                console.error(`Error scraping page ${page}:`, error);
                break;
            }
        }

        return products.slice(0, maxProducts);
    }

    downloadJSON(products, filename = 'amazon_products.json') {
        const dataStr = JSON.stringify(products, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        
        URL.revokeObjectURL(url);
    }

    downloadCSV(products, filename = 'amazon_products.csv') {
        if (products.length === 0) return;

        const headers = Object.keys(products[0]);
        const csvContent = [
            headers.join(','),
            ...products.map(product => 
                headers.map(header => 
                    `"${(product[header] || '').toString().replace(/"/g, '""')}"`
                ).join(',')
            )
        ].join('\n');

        const dataBlob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        
        URL.revokeObjectURL(url);
    }
}

// Extension-specific functions
class AmazonScraperExtension {
    constructor() {
        this.scraper = new AmazonScraper();
    }

    // Function to inject into Amazon page and scrape current page
    async scrapeCurrentPage(maxProducts = 10) {
        if (!window.location.href.includes('amazon.')) {
            throw new Error('Not on Amazon page');
        }

        const products = [];
        const productContainers = document.querySelectorAll('[data-component-type="s-search-result"]');

        for (const container of productContainers) {
            if (products.length >= maxProducts) break;

            if (this.scraper.isSponsored(container)) continue;

            const productData = this.scraper.extractProductData(container);
            if (productData && productData.title !== 'N/A') {
                products.push(productData);
            }
        }

        return products;
    }

    // Function to scrape multiple pages (use with caution in extension)
    async scrapeMultiplePages(url, maxProducts = 10) {
        return await this.scraper.scrapeProducts(url, maxProducts);
    }
}

// Usage examples for browser extension

// Example 1: Scrape current Amazon page
async function scrapeCurrentAmazonPage() {
    const extensionScraper = new AmazonScraperExtension();
    
    try {
        const products = await extensionScraper.scrapeCurrentPage(20);
        console.log('Scraped products:', products);
        
        // Download results
        extensionScraper.scraper.downloadJSON(products, 'current_page_products.json');
        
        return products;
    } catch (error) {
        console.error('Error scraping current page:', error);
    }
}

// Example 2: Scrape from URL (multiple pages)
async function scrapeFromURL() {
    const scraper = new AmazonScraper();
    const url = "https://www.amazon.co.uk/s?k=xbox+game&rh=p_n_free_shipping_eligible%3A20930951031%2Cp_n_age_range%3A405737011&dc&crid=17XSQM3Q5BCFF&qid=1747763759&rnid=405736011&sprefix=xbox+game%2Caps%2C104&ref=sr_nr_p_n_age_range_1&ds=v1%3A17m4Oh28n8%2BO7d0ovDCI8ulcJse4stuXWcXa8jf%2BT5E";
    
    try {
        const products = await scraper.scrapeProducts(url, 25);
        console.log(`Scraped ${products.length} products:`, products);
        
        // Download results
        scraper.downloadJSON(products, 'xbox_games.json');
        scraper.downloadCSV(products, 'xbox_games.csv');
        
        return products;
    } catch (error) {
        console.error('Error scraping:', error);
    }
}

// Example 3: Content script for extension
function initExtensionScraper() {
    // Add button to Amazon pages
    if (window.location.href.includes('amazon.') && window.location.href.includes('/s?')) {
        const button = document.createElement('button');
        button.textContent = 'Scrape Products';
        button.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 9999;
            background: #ff9900;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
        `;
        
        button.addEventListener('click', async () => {
            const numProducts = prompt('How many products do you want to scrape?', '20');
            if (numProducts) {
                button.textContent = 'Scraping...';
                button.disabled = true;
                
                try {
                    const products = await scrapeCurrentAmazonPage(parseInt(numProducts));
                    alert(`Successfully scraped ${products.length} products! Check console for details.`);
                } catch (error) {
                    alert('Error scraping products: ' + error.message);
                }
                
                button.textContent = 'Scrape Products';
                button.disabled = false;
            }
        });
        
        document.body.appendChild(button);
    }
}

// Initialize extension when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExtensionScraper);
} else {
    initExtensionScraper();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AmazonScraper, AmazonScraperExtension };
}