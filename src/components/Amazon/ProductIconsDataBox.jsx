import { BiCheckShield } from 'react-icons/bi';
import { HiOutlineHandThumbUp } from 'react-icons/hi2';
import { CloseOutlined } from '@material-ui/icons';
import { getLocal } from '../../services/dbService';
import { useEffect, useState } from 'react';
import { Tooltip } from 'antd';

const ProductPageIconsDataBox = ({ productTitle, inStock }) => {
  const classes = useStyles();
  const [veroBrands, setVeroBrands] = useState([]);

  useEffect(() => {
    (async () => {
      const localBrands = await getLocal('vero-brands') || [];
      if (localBrands.length) {
        setVeroBrands(localBrands);
      }
    })();
  }, []);

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

  function escapeRegex(string) {
    // Escape all special characters in the string
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  const isVero = veroBrands.find((brand) => {
    if (brand.length <= 1) return false; // Exclude single-character brands
    const escapedBrand = escapeRegex(brand); // Escape special characters
    const regex = new RegExp(`\\b${escapedBrand}\\b`, 'i'); // Exact word match, case-insensitive
    return regex.test(productTitle);
  });

  return (
    <div>
      <Tooltip
        title={isVero ? `Item on Vero Banned List: ${isVero}` : 'Not on Vero List'}
      >
        {
          isVero ? (
            <CloseOutlined
              id='vero-brand-icon'
              veroBrand={isVero}
              style={{
                fontSize: '40px',
                color: 'red'
              }}
            />
          ) : (
            <BiCheckShield
              id='vero-brand-icon'
              veroBrand={isVero}
              size={40}
              color='green'
            />
          )
        }
      </Tooltip>
      <Tooltip
        title='Search Item on Ebay'
      >
        <img
          className={classes.headerIcon2}
          src={ebay}
          alt='NO_IMAGE'
          onClick={() => handleEbayTabOpen()}
          style={{ cursor: 'pointer' }}
        />
      </Tooltip>
      <Tooltip
        title={inStock ? 'In Stock' : 'Not In Stock'}
      >
        <HiOutlineHandThumbUp
          id='in-stock-icon'
          size={40}
          className={classes.headerIcon3}
          color={inStock ? 'green' : 'red'}
        />
      </Tooltip>
    </div>
  );
};

export default ProductPageIconsDataBox;
