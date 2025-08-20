import { createRoot } from 'react-dom/client';
import ListingSetup from './ListingSetUp';

const container = document.querySelector('#listing-setup-page');
const root = createRoot(container);
root.render(<ListingSetup />); 