import { createRoot } from 'react-dom/client';

import EbayItemsScanner from './EbayItemsScanner';

const container = document.querySelector('#ebay-items-scanner-page');
const root = createRoot(container);
root.render(<EbayItemsScanner />);
