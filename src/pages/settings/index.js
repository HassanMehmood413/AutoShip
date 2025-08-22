import { createRoot } from 'react-dom/client';

import Settings from './Settings';

console.log('Settings index.js is being processed by webpack');

const container = document.querySelector('#app-settings');
const root = createRoot(container);
root.render(<Settings />); 