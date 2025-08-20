import { createRoot } from 'react-dom/client';
import ProductHunter from './ProductHunter';

const container = document.querySelector('#product-hunter-page');
const root = createRoot(container);
root.render(<ProductHunter />);
