import { createRoot } from 'react-dom/client';

import Tracker from './Tracker';

const container = document.querySelector('#tracker-page');
const root = createRoot(container);
root.render(<Tracker />);
