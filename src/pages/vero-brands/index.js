import { createRoot } from 'react-dom/client';

import VeroBrands from './VeroBrands';

const container = document.querySelector('#vero-brands-page');
const root = createRoot(container);
root.render(<VeroBrands />);
