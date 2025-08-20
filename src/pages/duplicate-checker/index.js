import { createRoot } from 'react-dom/client';

import DuplicateChecker from './DuplicateChecker';

const container = document.querySelector('#duplicate-checker-page');
const root = createRoot(container);
root.render(<DuplicateChecker />);
