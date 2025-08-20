import { createRoot } from 'react-dom/client';
import CollageTemplateEditor from './CollageTemplateEditor';

const container = document.querySelector('#collage-template-editor-page');
const root = createRoot(container);
root.render(<CollageTemplateEditor />);
