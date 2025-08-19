import { createRoot } from 'react-dom/client';

import PopUp from './PopUp';

const container = document.querySelector('#app-popup');
const root = createRoot(container);
root.render(<PopUp />);
