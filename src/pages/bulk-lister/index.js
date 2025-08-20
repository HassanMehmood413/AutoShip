import { createRoot } from 'react-dom/client';

import BulkLister from './BulkLister';

const container = document.querySelector('#bulk-lister-page');
const root = createRoot(container);
root.render(<BulkLister />);
