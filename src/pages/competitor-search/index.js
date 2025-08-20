import { createRoot } from 'react-dom/client';

import CompetitorSearch from './CompetitorSearch';

const container = document.querySelector('#competitor-search-page');
const root = createRoot(container);
root.render(<CompetitorSearch />);
