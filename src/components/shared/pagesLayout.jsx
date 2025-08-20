const links = [
  { label: 'Finder', href: 'product-hunter.html' },
  { label: 'Tracker', href: 'tracker.html' },
  { label: 'Lister', href: 'bulk-lister.html' },
  { label: 'Scanner', href: 'competitor-search.html' },
  { label: 'Boost Listings', href: 'boost-listing.html' },
  { label: 'Image Template', href: 'collage-template-editor.html' },
  { label: 'Listing Setup', href: 'listing-setup.html' },
  { label: 'Settings', href: 'settings.html' },
];

export function PagesLayout({ children, dimensions }) {
  const isCurrentPage = i => window.location.pathname.includes(links[i].href);
  return (
    <div className='bg-gradient-to-br from-blue-200 to-red-200 text-base text-start flex justify-center items-center min-h-screen'>
      <div className={`border-t-white border-l-white border-t-2 border-l-2 shadow-lg bg-white bg-opacity-75 rounded-lg overflow-hidden mx-4 my-8 container flex h-full min-h-[600px] ${dimensions ? dimensions : 'max-w-7xl'}`}>
        {/* Sidebar */}
        <div className='w-60 border-r'>
          <div className='w-full h-full flex flex-col'>
            {/* Logo */}
            <div className='my-8 w-full flex justify-center'>
              <img src='https://i.imgur.com/TaDLquz.png' className='w-24' alt='ecommerce logo' />
            </div>
            <ul className='divide-y-2'>
              {links.map(({ href, label }, i) => (
                <li key={i} className={`p-4 pl-8 w-full ${isCurrentPage(i) ? 'bg-white' : ''}`}>
                  <button
                    onClick={() => {
                      chrome.tabs.create({
                        url: chrome.runtime.getURL(href)
                      });
                    }}
                    className={`hover:underline text-start ${isCurrentPage(i) ? 'font-bold' : 'font-medium opacity-50'}`}
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className='w-full my-4 p-4'>{children}</div>
      </div>
    </div>
  );
}
