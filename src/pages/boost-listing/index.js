import { createRoot } from 'react-dom/client';

import BoostListing from './BoostListing';

const container = document.querySelector('#boost-listing-page');
const root = createRoot(container);
root.render(<BoostListing />);
