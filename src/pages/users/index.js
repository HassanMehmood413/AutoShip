import { createRoot } from 'react-dom/client';

import UsersPage from './UsersPage';

const container = document.querySelector('#users-page');
const root = createRoot(container);
root.render(<UsersPage />);
