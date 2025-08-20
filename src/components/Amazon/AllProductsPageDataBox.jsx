import { makeStyles } from '@material-ui/core/styles';
import { getLocal } from '../../services/dbService';
import '../../../dist/style.css';

const useStyles = makeStyles({
  mainDiv: {
    flexDirection: 'row',
    margin: '10px',
    gap: '10px'
  },
  imagesDiv: {
    gap: '10px'
  },
  header: {
    height: '400px'
  },
  header1: {
    display: 'flex',
    paddingLeft: '38px',
    paddingBottom: '15px',
    paddingTop: '5px'
  },
  header2: {
    paddingLeft: '10px',
    paddingTop: '7px',
    marginLeft: '18px',
    backgroundColor: '#5a74ff',
    color: 'white',
    fontWeight: 'bold',
    padding: '10px',
    borderRadius: '5px',
    display: 'inline-block',
    cursor: 'pointer'
  },
  headerIcon1: {
    height: '40px',
    width: '50px'
  },
  headerIcon2: {
    width: '52px',
    height: '38px',
    borderRadius: '5px'
  },
  headerIcon3: {
    paddingLeft: '10px'
  },
  buttonDiv: {
    alignItems: 'end',
    gap: '10px'
  }
});

const AllProductsPageDatabox = ({ productTitle, asin }) => {
  const classes = useStyles();

  // const localEbayIcon = chrome.runtime.getURL('img/ebay-icon.jpeg');
  // console.log('\n localEbayIcon', localEbayIcon);

  const ebay = 'https://static.vecteezy.com/system/resources/previews/020/336/172/non_2x/ebay-logo-ebay-icon-free-free-vector.jpg';

  const handleEbayTabOpen = async () => {
    const userId = await getLocal('current-user');
    const domain = await getLocal(`selected-domain-${userId}`);

    let ebayLink = 'https://www.ebay.com';
    if (domain === 'UK') {
      ebayLink = 'https://www.ebay.co.uk';
    }

    window.open(`${ebayLink}/sch/i.html?_from=R40&_trksid=p4432023.m570.l1313&_nkw=${productTitle}&_sacat=0`, '_blank');
  };

  const handleAmazonTabOpen = async () => {
    const userId = await getLocal('current-user');
    const domain = await getLocal(`selected-domain-${userId}`);

    let amazonLink = 'https://www.amazon.com';
    if (domain === 'UK') {
      amazonLink = 'https://www.amazon.co.uk';
    }

    window.open(`${amazonLink}/dp/${asin}?autoList=true`, '_blank');
  };

  const options = [
    {
      label: 'Search Tilte (Active)',
      action: () => { handleEbayTabOpen(); },
      icon: 'https://i.imgur.com/1MM3gmC.png'
    },
    {
      label: 'Search Tilte (Sold)',
      action: () => { handleEbayTabOpen(); },
      icon: 'https://i.imgur.com/1MM3gmC.png'
    },
    {
      label: 'Quick List',
      action: () => { handleEbayTabOpen(); },
      icon: 'https://i.imgur.com/1MM3gmC.png'
    },
    {
      label: 'Add to Lister Queue',
      action: () => { handleEbayTabOpen(); },
      icon: 'https://i.imgur.com/XL4inzI.png'
    },
  ]

  return (
    <div className='p-4 flex flex-col gap-2'>
      {options.map(({action,icon,label},i) => (
        <button onClick={() => action()} key={i} className='w-full flex items-center gap-2 border border-black border-opacity-[0.07] bg-[#D9D9D920] hover:border-opacity-50 hover:bg-[#D9D9D933] rounded-lg px-2 py-1 text-xs'>
          <img className='w-6 h-6 object-center object-contain' src={icon} alt={label} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
};

export default AllProductsPageDatabox;
