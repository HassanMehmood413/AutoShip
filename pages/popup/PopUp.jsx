import React, { useEffect, useMemo, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import {
  Row,
  Typography,
  Button,
  Input,
  Col,
  InputNumber,
  Select,
  Switch
} from 'antd';

import {
  getLocal,
  onChange as onChangeLocalState,
  setLocal
} from '../../services/dbService';
import EcomMiracle from './ecom-miracle.png';
import EcomMiracleBlack from './ecom-miracle-black.png';
import ProductHunter from '../product-hunter/ProductHunter';
import BoostListing from '../boost-listing/BoostListing';
import BulkLister from '../bulk-lister/BulkLister';
import CompetitorScanner from '../competitor-search/CompetitorSearch';
import { FaAngleDown, FaAngleRight } from 'react-icons/fa';
import { countries } from './counties';
const { Title, Text } = Typography;

const helps = [
  { label: 'Manage Subscriptions' },
  { label: 'Support Community' },
  { label: 'Instruction Videos' }
];

const useStyles = makeStyles({
  mainDiv: {
    width: '680px',
    minHeight: '340px',
    maxHeight: '480px',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    padding: '10px',
    gap: '10px'
  },
  header: {
    height: '40px'
  },
  headerIcon1: {
    height: '40px',
    width: '50px'
  },
  headerIcon2: {
    height: '100px'
  },
  userSection: {
    height: '70px',
    padding: '5px',
    display: 'flex',
    border: '1px solid black',
    borderRadius: '5px'
  },
  loggedInSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '3px'
  },
  userButton: {
    height: '25px',
    background: '#000000'
  },
  blackButton: {
    height: '30px',
    background: '#000000'
  },
  imageSection: {
    display: 'flex',
    flexDirection: 'column'
  },
  imageSectionInput: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  imageUrlSaveButton: {
    float: 'right',
    background: '#000000'
  },
  watermark: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '150px',
    margin: '10px 0',
    background: '#dbeafe'
  },
  watermarkWithImage: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '150px',
    margin: '10px'
  },
  advanceFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  loginBox: {
    height: '340px',
    flexDirection: 'column',
    alignContent: 'center',
    justifyContent: 'center',
    gap: '10px'
  }
});

const LoginUI = () => {
  const classes = useStyles();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);

  const handleLogin = async () => {
    setLoginLoading(true);
    setLoginError('');
    setSubscriptionInfo(null);
    
    const response = await chrome.runtime.sendMessage({
      payload: {
        email,
        password
      },
      callback: 'loginUser'
    });

    if (!response?.success) {
      if (response?.needsSubscription) {
        setSubscriptionInfo({
          error: response.error,
          subscriptionUrl: response.subscriptionUrl
        });
      } else {
        setLoginError(response.error);
      }
    }

    setLoginLoading(false);
  };

  const handleSubscriptionRedirect = () => {
    if (subscriptionInfo?.subscriptionUrl) {
      chrome.tabs.create({ url: subscriptionInfo.subscriptionUrl });
    }
  };

  return (
    <Row gutter={12} className={classes.loginBox}>
      <Title level={4} style={{ textAlign: 'center' }}>
        Login
      </Title>
      <Row style={{ flexDirection: 'column', width: '250px' }}>
        <Text>Email</Text>
        <Input
          placeholder='Enter Email'
          onChange={(e) => setEmail(e.target.value)}
        />
      </Row>
      <Row style={{ flexDirection: 'column', width: '250px' }}>
        <Text>Password</Text>
        <Input
          type='password'
          placeholder='Enter Password'
          onChange={(e) => setPassword(e.target.value)}
        />
      </Row>
      <Button
        type='primary'
        className={classes.blackButton}
        disabled={!email || !password}
        loading={loginLoading}
        onClick={handleLogin}
      >
        {loginLoading ? 'Logging In' : 'Login'}
      </Button>
      {loginError && <Text type='danger'>{loginError}</Text>}
      {subscriptionInfo && (
        <div style={{ textAlign: 'center', marginTop: '10px' }}>
          <Text type='danger' style={{ display: 'block', marginBottom: '10px' }}>
            {subscriptionInfo.error}
          </Text>
          <Button
            type='primary'
            style={{ backgroundColor: '#ff9900', borderColor: '#ff9900' }}
            onClick={handleSubscriptionRedirect}
          >
            Subscribe Now
          </Button>
        </div>
      )}
    </Row>
  );
};

const PopUp = () => {
  const classes = useStyles();

  const [logoutLoading, setLogoutLoading] = useState(false);
  const [authState, setAuthState] = useState('checking');
  const [email, setEmail] = useState('');

  const checkUser = async () => {
    await setLocal('auth-state', 'checking');
    await chrome.runtime.sendMessage({
      payload: {},
      callback: 'checkUser'
    });
  };

  const authStateHandler = async (_, newValue) => {
    const user = await getLocal('user');
    if (user) {
      const { email } = user;
      setEmail(email);
    }

    setAuthState(newValue);
  };

  useEffect(() => {
    checkUser();
    onChangeLocalState('auth-state', authStateHandler);
  }, []);

  const handleLogoutUser = async () => {
    setLogoutLoading(true);

    await setLocal('auth-state', 'logged-out');
    await setLocal('user', {});
    await setLocal('current-user', '');
    await setLocal('user-token', '');

    setLogoutLoading(false);
    setEmail('');
  };

  const tabs = [
    {
      label: 'Finder',
      link: 'product-hunter.html',
      Component: ProductHunter
    },
    {
      label: 'Tracker',
      link: 'tracker.html',
      Component: () => {
        return <div>Tracker Component</div>;
      }
    },
    {
      label: 'Lister',
      link: 'bulk-lister.html',
      Component: BulkLister
    },
    {
      label: 'Scanner',
      link: 'competitor-search.html',
      Component: CompetitorScanner
    },
    {
      label: 'Booster',
      link: 'boost-listing.html',
      Component: BoostListing
    },
    {
      label: 'Settings',
      link: 'settings.html',
      Component: () => {
        const [index, setIndex] = useState(-1);
        const [imageUrl, setImageUrl] = useState('');
        const [watermarkUrl, setWatermarkUrl] = useState('');
        const [markupPercentage, setMarkupPercentage] = useState(100);
        const [endPrice, setEndPrice] = useState(0);
        const [selectedDomain, setSelectedDomain] = useState('UK');
        const [veroProtection, setVeroProtection] = useState(false);
        const [autoListing, setAutoListing] = useState(false);
        const [imageTemplate, setImageTemplate] = useState(false);
        const [reviewImages, setReviewImages] = useState(false);
        const [role, setRole] = useState('');
        const [totalVeroBrands, setTotalVeroBrands] = useState(0);
        const [localScheduleListingTime, setLocalScheduleListingTime] =
          useState(null);
        const [country, setCountry] = useState(null);
        const [localHidePersonalInformation, setLocalHidePersonalInformation] =
          useState(false);

        const loadLocalStates = async () => {
          const wUrl = await getLocal('watermark-url');
          if (wUrl) setWatermarkUrl(wUrl);

          const mPercentage = await getLocal('markup-percentage');
          if (mPercentage !== null) setMarkupPercentage(mPercentage);

          const ePrice = await getLocal('end-price');
          if (ePrice !== null) setEndPrice(ePrice);

          const userId = await getLocal('current-user');
          const domain = await getLocal(`selected-domain-${userId}`);
          if (domain) {
            setSelectedDomain(domain);
            await setLocal(`selected-domain-${userId}`, domain);
          } else {
            setSelectedDomain('UK');
            await setLocal(`selected-domain-${userId}`, 'UK');
          }

          // UNSURE ABOUT THIS COUNTRY
          const cr = await getLocal('user-country');
          if (cr) setCountry(cr);

          const veroBrands = await getLocal('vero-brands');
          if (veroBrands?.length) setTotalVeroBrands(veroBrands.length);

          const vProtection = await getLocal('vero-protection');
          if (vProtection !== null) setVeroProtection(vProtection);

          const aListing = await getLocal('auto-listing');
          if (aListing !== null) setAutoListing(aListing);

          const listingTime = await getLocal('schedule-listing-time');
          setLocalScheduleListingTime(listingTime);

          const hidePersonalInfo = await getLocal('hide-personal-information');
          setLocalHidePersonalInformation(hidePersonalInfo);
          const iTemplate = await getLocal('use-image-template');
          if (iTemplate !== null) setImageTemplate(iTemplate);

          const rImages = await getLocal('use-review-images');
          if (rImages !== null) setReviewImages(rImages);
        };

        const checkUser = async () => {
          const user = await getLocal('user');
          if (user) {
            const { role } = user;
            setRole(role);
          }
        };

        const handleDomainChange = async (value) => {
          const userId = await getLocal('current-user');
          setSelectedDomain(value);
          await setLocal(`selected-domain-${userId}`, value);
        };

        const handleScheduleTimeChange = async (value) => {
          setLocalScheduleListingTime(value);
          await setLocal('schedule-listing-time', value);
        };

        const handleCountryChange = async (value) => {
          setCountry(value);
          await setLocal('user-country', value);
        };

        const handleHidePersonalInformation = async (value) => {
          setLocalHidePersonalInformation(value);
          await setLocal('hide-personal-information', value);
        };

        useEffect(() => {
          loadLocalStates();
          checkUser();
        }, []);

        const settingOptions = [
          {
            label: 'Country',
            Component: () => {
              return (
                <div>
                  <Row>
                    <Col style={{ display: 'flex', gap: '1rem', alignItems: 'center'}}>
                      <Title level={5} className='!mb-0' style={{ width: '12rem' }}>
                        Select Domain
                      </Title>
                      <Select
                        className='!w-full'
                        placeholder='Select Domain'
                        value={selectedDomain}
                        options={[
                          {
                            label: 'USA',
                            value: 'USA'
                          },
                          {
                            label: 'UK',
                            value: 'UK'
                          },
                          {
                            label: 'DE',
                            value: 'DE'
                          },
                          {
                            label: 'FR',
                            value: 'FR'
                          },
                          {
                            label: 'IT',
                            value: 'IT'
                          },
                          {
                            label: 'AU',
                            value: 'AU'
                          },
                          {
                            label: 'CA',
                            value: 'CA'
                          },
                          
                        ]}
                        onChange={(value) => handleDomainChange(value)}
                      />
                    </Col>
                  </Row>
                </div>
              );
            }
          },
          {
            label: 'Images Setup',
            Component: () => {
              return (
                <div>
                  <Row className='items-center justify-between'>
                    <Title level={5}>Use Image Template</Title>
                    <Switch
                      value={imageTemplate}
                      onChange={async (value) => {
                        setImageTemplate(value);
                        setLocal('use-image-template', value);
                        if (value) {
                          setReviewImages(false);
                          await setLocal('use-review-images', false);
                        }
                      }}
                    />
                  </Row>
                  <Row className='mb-2'>
                    <div className='flex flex-col gap-2'>
                      <button className='text-sm text-blue-700 hover:underline' onClick={() => {
                        chrome.tabs.create({
                          url: chrome.runtime.getURL('listing-setup.html')
                        });
                      }}>Edit Image Template</button>
                    </div>
                  </Row>
                  <p className='mb-1'>Watermark</p>
                  <Row className={classes.imageSection}>
                    <Row className={classes.imageSectionInput}>
                      <Col span={18}>
                        <Input
                          placeholder='Enter Image Url'
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                        />
                      </Col>
                      <Col span={4}>
                        <Button
                          type='primary'
                          className={classes.imageUrlSaveButton}
                          disabled={!imageUrl}
                          onClick={() => {
                            setWatermarkUrl(imageUrl);
                            setLocal('watermark-url', imageUrl);
                            setImageUrl('');
                          }}
                        >
                          Save
                        </Button>
                      </Col>
                    </Row>
                    {watermarkUrl ? (
                      <Row className={classes.watermarkWithImage}>
                        <img style={{ height: '150px' }} src={watermarkUrl} />
                      </Row>
                    ) : (
                      <Row className={classes.watermark}>
                        <Text>Watermark</Text>
                      </Row>
                    )}
                  </Row>
                  <Row className='items-center justify-between mb-2'>
                    <Title level={5} className='!mb-0'>Auto Submit Listing</Title>
                    <Switch
                      value={autoListing}
                      onChange={(value) => {
                        setAutoListing(value);
                        setLocal('auto-listing', value);
                      }}
                    />
                  </Row>
                  <Row className='items-center justify-between mb-2'>
                    <Title level={5} className='!mb-0'>Use Review Images</Title>
                    <Switch
                      value={reviewImages}
                      onChange={async (value) => {
                        setReviewImages(value);
                        await setLocal('use-review-images', value);
                        if (value) {
                          setImageTemplate(false);
                          setLocal('use-image-template', false);
                        }
                      }}
                    />
                  </Row>
                  <Row className='items-center justify-between'>
                    <Title level={5} className='!mb-0'>Hide Personal Information</Title>
                    <Switch
                      value={localHidePersonalInformation}
                      onChange={(value) => handleHidePersonalInformation(value)}
                    />
                  </Row>
                </div>
              );
            }
          },
          {
            label: 'Listing Setup',
            Component: () => {
              return (
                <div>
                  <div className='mb-4 p-3 bg-blue-50 rounded-lg'>
                    <Button
                      type='primary'
                      className='w-full mb-3 bg-blue-600 hover:bg-blue-700'
                      onClick={() => {
                        chrome.tabs.create({
                          url: chrome.runtime.getURL('listing-setup.html')
                        });
                      }}
                    >
                      📝 Edit Image Template
                    </Button>
                    <div className='text-sm text-gray-700'>
                      <p className='font-medium mb-2'>Customize your eBay listings for different countries with correct terminology and rules.</p>
                      <div className='mb-2'>
                        <strong>Features:</strong>
                        <ul className='list-disc list-inside mt-1 space-y-1'>
                          <li>Country-specific terminology (Shipping vs Delivery)</li>
                          <li>Customizable banner colors and text</li>
                          <li>Up to 7 customizable sections per country</li>
                          <li>Custom listing text for each country</li>
                          <li>Enable/disable customizations per listing</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <Row className='items-center justify-between mb-2'>
                    <Title level={5} className='!mb-0'>Use Image Template</Title>
                    <Switch
                      value={imageTemplate}
                      onChange={async (value) => {
                        setImageTemplate(value);
                        setLocal('use-image-template', value);
                        if (value) {
                          setReviewImages(false);
                          await setLocal('use-review-images', false);
                        }
                      }}
                    />
                  </Row>
                  <Row className='items-center justify-between mb-2'>
                    <Title level={5} className='!mb-0'>Auto Submit Listing</Title>
                    <Switch
                      value={autoListing}
                      onChange={(value) => {
                        setAutoListing(value);
                        setLocal('auto-listing', value);
                      }}
                    />
                  </Row>
                  <Row className='items-center justify-between'>
                    <Title level={5} className='!mb-0'>Use Review Images</Title>
                    <Switch
                      value={reviewImages}
                      onChange={async (value) => {
                        setReviewImages(value);
                        await setLocal('use-review-images', value);
                        if (value) {
                          setImageTemplate(false);
                          setLocal('use-image-template', false);
                        }
                      }}
                    />
                  </Row>
                </div>
              );
            }
          },
          {
            label: 'Pricing Setup',
            Component: () => {
              const [localMarkup, setLocalMarkup] = useState(markupPercentage);
              const [localEndPrice, setLocalEndPrice] = useState(endPrice);

              const handleSetValues = async () => {
                console.log('Set Values clicked!', { localMarkup, localEndPrice });
                
                // Save markup percentage
                setMarkupPercentage(localMarkup);
                await setLocal('markup-percentage', localMarkup);
                
                // Save end price
                setEndPrice(localEndPrice);
                await setLocal('end-price', localEndPrice);
                
                // Show success message
                alert('Values saved successfully!');
              };

              return (
                <div>
                  <Row>
                    <Col>
                      <Title level={5} className='!mb-0'>
                        Markup Percentage
                      </Title>
                      <input
                        type="text"
                        className='simple-text-input'
                        placeholder='Enter Markup Percentage'
                        value={localMarkup}
                        onChange={(e) => setLocalMarkup(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '4px 11px',
                          border: '1px solid #d9d9d9',
                          borderRadius: '6px',
                          fontSize: '14px',
                          lineHeight: '1.5715',
                          backgroundColor: '#fff',
                          transition: 'all 0.3s'
                        }}
                      />
                    </Col>
                  </Row>
                  <Row>
                    <Col>
                      <Title level={5} className='!mb-0'>
                        End Price
                      </Title>
                      <input
                        type="text"
                        className='simple-text-input'
                        placeholder='Enter End Price'
                        value={localEndPrice}
                        onChange={(e) => setLocalEndPrice(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '4px 11px',
                          border: '1px solid #d9d9d9',
                          borderRadius: '6px',
                          fontSize: '14px',
                          lineHeight: '1.5715',
                          backgroundColor: '#fff',
                          transition: 'all 0.3s'
                        }}
                      />
                    </Col>
                  </Row>
                  <Row>
                    <Col>
                      <Title level={5} className='!mb-0'>
                        Select Domain
                      </Title>
                      <Select
                        className='!w-full'
                        placeholder='Select Domain'
                        value={selectedDomain}
                        options={[
                          {
                            label: 'USA',
                            value: 'USA'
                          },
                          {
                            label: 'UK',
                            value: 'UK'
                          }
                        ]}
                        onChange={(value) => handleDomainChange(value)}
                      />
                    </Col>
                  </Row>
                  <div style={{ 
                    borderTop: '1px solid #f0f0f0', 
                    margin: '16px 0',
                    paddingTop: '16px' 
                  }}>
                    <Row>
                      <Col span={24}>
                        <button 
                          onClick={handleSetValues}
                          style={{ 
                            backgroundColor: '#000', 
                            color: '#fff',
                            border: '1px solid #000',
                            borderRadius: '6px',
                            padding: '8px 16px',
                            width: '100%',
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.3s'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#333';
                            e.target.style.borderColor = '#333';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#000';
                            e.target.style.borderColor = '#000';
                          }}
                        >
                          Set Values
                        </button>
                      </Col>
                    </Row>
                  </div>
                </div>
              );
            }
          },
          {
            label: 'Schedule Listing',
            Component: () => {
              return (
                <div>
                  <Row>
                    <div className='control-item'>
                      <span className='control-label'>
                        Schedule Listing Time:
                      </span>
                      <Select
                        defaultValue='Disabled'
                        style={{ width: 120, paddingLeft: '5px' }}
                        options={[
                          { value: null, label: 'Disabled' },
                          { value: 1, label: '12 AM' },
                          { value: 2, label: '1 AM' },
                          { value: 3, label: '2 AM' },
                          { value: 4, label: '3 AM' },
                          { value: 5, label: '4 AM' },
                          { value: 6, label: '5 AM' },
                          { value: 7, label: '6 AM' },
                          { value: 8, label: '7 AM' },
                          { value: 9, label: '8 AM' },
                          { value: 10, label: '9 AM' },
                          { value: 11, label: '10 AM' },
                          { value: 12, label: '11 AM' },
                          { value: 13, label: '12 PM' },
                          { value: 14, label: '1 PM' },
                          { value: 15, label: '2 PM' },
                          { value: 16, label: '3 PM' },
                          { value: 17, label: '4 PM' },
                          { value: 18, label: '5 PM' },
                          { value: 19, label: '6 PM' },
                          { value: 20, label: '7 PM' },
                          { value: 21, label: '8 PM' },
                          { value: 22, label: '9 PM' },
                          { value: 23, label: '10 PM' },
                          { value: 24, label: '11 PM' }
                        ]}
                        value={localScheduleListingTime}
                        onChange={(e) => handleScheduleTimeChange(e)}
                      />
                    </div>
                  </Row>
                </div>
              );
            }
          },
          {
            label: 'Vero',
            Component: () => {
              return (
                <div>
                  <Row className='items-center justify-between'>
                    <Title level={5}>Total Brands: {totalVeroBrands}</Title>
                  </Row>
                  <Row className='items-center justify-between'>
                    <Title level={5}>Enable Vero Protection</Title>
                    <Switch
                      value={veroProtection}
                      onChange={(value) => {
                        setVeroProtection(value);
                        setLocal('vero-protection', value);
                      }}
                    />
                  </Row>
                </div>
              );
            }
          },
          {
            label: 'Duplicate Fixer',
            Component: () => {
              return (
                <div>
                  <Row className='items-center justify-between'>
                    <Title level={5}>Duplicate Checker</Title>
                    <Button
                      type='primary'
                      className='bg-black hover:bg-gray-800'
                      onClick={() => {
                        chrome.tabs.create({
                          url: chrome.runtime.getURL('duplicate-checker.html')
                        });
                      }}
                    >
                      Open Duplicate Checker
                    </Button>
                  </Row>
                  <Row>
                    <Text className='text-sm text-gray-600'>
                      Check and manage duplicate listings to avoid policy violations
                    </Text>
                  </Row>
                </div>
              );
            }
          }
        ];

        return (
          <div className='space-y-2'>
            {settingOptions.map(({ label, Component }, i) => (
              <div key={i} className='border border-gray-200 rounded-lg'>
                <button
                  onClick={() => (i === index ? setIndex(-1) : setIndex(i))}
                  className='w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 rounded-t-lg'
                >
                  {index === i ? <FaAngleDown /> : <FaAngleRight />} 
                  <span className='font-medium'>{label}</span>
                </button>
                {i === index && (
                  <div className='px-3 py-2 border-t border-gray-200 bg-gray-50 rounded-b-lg'>
                    <Component />
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      }
    }
  ];

  function MainUI2() {
    const [tabIndex, setTabIndex] = useState(5);
    const [role, setRole] = useState('');

    const handleTabClick = (index) => {
      const tabLink = tabs[index].link;
      if (tabLink && tabLink !== '#') {
        chrome.tabs.create({
          url: chrome.runtime.getURL(tabLink)
        });
      }
      setTabIndex(index);
    }; 

    const checkUser = async () => {
      const user = await getLocal('user');
      if (user) {
        const { role } = user;
        setRole(role);
      }
    };

    useEffect(() => {
      checkUser();
    }, []);

    return (
      <div>
        {/* Header */}
        <div className='flex justify-between p-2 w-full'>
          {/* Left Side */}
          <div className='flex align-center gap-4'>
            <img src={EcomMiracleBlack} alt='Ecommiracle' className='w-32' />
            <span className='relative  text-sm'>
              Logged in {email}
              <button onClick={handleLogoutUser} className='pl-2 underline text-[#ff9900] hover:font-semibold cursor-pointer'>
                Log Out?
              </button>
              {role === 'admin' && (
                <Button
                  type='primary'
                  className={classes.userButton}
                  onClick={() =>
                    chrome.tabs.create({
                      url: chrome.runtime.getURL('users.html')
                    })
                  }
                >
                Users
                </Button>
              )}
            </span>
          </div>
          {/* Right Side */}
          <div className=''>
            <span className='py-2 px-4 rounded-full bg-neutral-200 font-semibold'>
              RENEW
            </span>
          </div>
        </div>
        {/* Menu */}
        <div className='w-full text-sm text-white font-semibold grid grid-cols-6 bg-blue-400'>
          {tabs.map(({ label }, i) => (
            <button
              key={i}
              className={`py-2 ${
                i === tabIndex ? 'bg-blue-500' : ''
              } relative flex justify-center group`}
              onClick={() => handleTabClick(i)}
            >
              {label}
              <span
                className={`w-[calc(100%-3rem)] h-[2px] bg-white absolute bottom-0 left-6 ${
                  i === tabIndex ? 'opacity-100' : 'opacity-0'
                } group-hover:opacity-100`}
              />
            </button>
          ))}
        </div>
        {/* MAIN CONTENT HERE !!! */}
        <div className="px-4 py-2 max-h-80 overflow-y-auto">
          {tabIndex === 5 && tabs[5].Component && (() => {
            const SettingsComponent = tabs[5].Component;
            return <SettingsComponent />;
          })()}
          {tabIndex !== 5 && (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2">Welcome to eComMiracle</h3>
                <p className="text-sm">Click on any tab above to open the full page</p>
              </div>
            </div>
          )}
        </div>
        {/* Footer */}
        <p className='flex gap-2 text-sm my-4'>
          Help :{' '}
          <span className='flex gap-4'>
            {helps.map(({ label }, i) => (
              <span key={i} className='underline cursor-pointer'>
                {label}
              </span>
            ))}
          </span>
        </p>
      </div>
    );
  }

  const MainUI = () => {
    const [imageUrl, setImageUrl] = useState('');
    const [watermarkUrl, setWatermarkUrl] = useState('');
    const [markupPercentage, setMarkupPercentage] = useState(100);
    const [endPrice, setEndPrice] = useState(0);
    const [selectedDomain, setSelectedDomain] = useState('UK');
    const [veroProtection, setVeroProtection] = useState(false);
    const [autoListing, setAutoListing] = useState(false);
    const [imageTemplate, setImageTemplate] = useState(false);
    const [reviewImages, setReviewImages] = useState(false);
    const [role, setRole] = useState('');
    const [totalVeroBrands, setTotalVeroBrands] = useState(0);
    const [localScheduleListingTime, setLocalScheduleListingTime] =
      useState(null);
    const [localHidePersonalInformation, setLocalHidePersonalInformation] =
      useState(false);

    const loadLocalStates = async () => {
      const wUrl = await getLocal('watermark-url');
      if (wUrl) setWatermarkUrl(wUrl);

      const mPercentage = await getLocal('markup-percentage');
      if (mPercentage !== null) setMarkupPercentage(mPercentage);

      const ePrice = await getLocal('end-price');
      if (ePrice !== null) setEndPrice(ePrice);

      const userId = await getLocal('current-user');
      const domain = await getLocal(`selected-domain-${userId}`);
      if (domain) {
        setSelectedDomain(domain);
        await setLocal(`selected-domain-${userId}`, domain);
      } else {
        setSelectedDomain('UK');
        await setLocal(`selected-domain-${userId}`, 'UK');
      }

      const veroBrands = await getLocal('vero-brands');
      if (veroBrands?.length) setTotalVeroBrands(veroBrands.length);

      const vProtection = await getLocal('vero-protection');
      if (vProtection !== null) setVeroProtection(vProtection);

      const aListing = await getLocal('auto-listing');
      if (aListing !== null) setAutoListing(aListing);

      const listingTime = await getLocal('schedule-listing-time');
      setLocalScheduleListingTime(listingTime);

      const hidePersonalInfo = await getLocal('hide-personal-information');
      setLocalHidePersonalInformation(hidePersonalInfo);
      const iTemplate = await getLocal('use-image-template');
      if (iTemplate !== null) setImageTemplate(iTemplate);

      const rImages = await getLocal('use-review-images');
      if (rImages !== null) setReviewImages(rImages);
    };

    const checkUser = async () => {
      const user = await getLocal('user');
      if (user) {
        const { role } = user;
        setRole(role);
      }
    };

    const handleDomainChange = async (value) => {
      const userId = await getLocal('current-user');
      setSelectedDomain(value);
      await setLocal(`selected-domain-${userId}`, value);
    };

    const handleScheduleTimeChange = async (value) => {
      setLocalScheduleListingTime(value);
      await setLocal('schedule-listing-time', value);
    };

    const handleHidePersonalInformation = async (value) => {
      setLocalHidePersonalInformation(value);
      await setLocal('hide-personal-information', value);
    };

    useEffect(() => {
      loadLocalStates();
      checkUser();
    }, []);

    //Temp Check -> Handle this later

    return (
      <>
        <Row className={classes.header}>
          <img className={classes.headerIcon2} src={EcomMiracleBlack} />
        </Row>
        <Row className={classes.userSection}>
          <Col span={16}>
            <Title level={5}>Logged in as</Title>
            <Text>{email}</Text>
          </Col>
          <Col span={8} className={classes.loggedInSection}>
            <Button
              type='primary'
              className={classes.userButton}
              loading={logoutLoading}
              onClick={handleLogoutUser}
            >
              {logoutLoading ? 'Logging Out' : 'Logout'}
            </Button>
            {role === 'admin' && (
              <Button
                type='primary'
                className={classes.userButton}
                onClick={() =>
                  chrome.tabs.create({
                    url: chrome.runtime.getURL('users.html')
                  })
                }
              >
                Users
              </Button>
            )}
          </Col>
        </Row>
        <Row className={classes.imageSection}>
          <Row className={classes.imageSectionInput}>
            <Col span={18}>
              <Input
                placeholder='Enter Image Url'
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </Col>
            <Col span={6}>
              <Button
                type='primary'
                className={classes.imageUrlSaveButton}
                disabled={!imageUrl}
                onClick={() => {
                  setWatermarkUrl(imageUrl);
                  setLocal('watermark-url', imageUrl);
                  setImageUrl('');
                }}
              >
                Save
              </Button>
            </Col>
          </Row>
          {watermarkUrl ? (
            <Row className={classes.watermarkWithImage}>
              <img style={{ height: '150px' }} src={watermarkUrl} />
            </Row>
          ) : (
            <Row className={classes.watermark}>
              <Text>Watermark</Text>
            </Row>
          )}
        </Row>
        <Row>
          <Col span={24}>
            <Title level={5} className='!mb-0'>
              Markup Percentage
            </Title>
            <InputNumber
              className='!w-full'
              placeholder='Enter Markup Percentage'
              value={markupPercentage}
              onChange={(value) => {
                setMarkupPercentage(value);
                setLocal('markup-percentage', value);
              }}
            />
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Title level={5} className='!mb-0'>
              End Price
            </Title>
            <InputNumber
              className='!w-full'
              placeholder='Enter End Price'
              value={endPrice}
              onChange={(value) => {
                setEndPrice(value);
                setLocal('end-price', value);
              }}
            />
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Title level={5} className='!mb-0'>
              Select Domain
            </Title>
            <Select
              className='!w-full'
              placeholder='Select Domain'
              value={selectedDomain}
              options={[
                {
                  label: 'USA',
                  value: 'USA'
                },
                {
                  label: 'UK',
                  value: 'UK'
                }
              ]}
              onChange={(value) => handleDomainChange(value)}
            />
          </Col>
        </Row>
        <Row className='items-center justify-between'>
          <Button
            type='primary'
            className={classes.blackButton}
            onClick={() =>
              chrome.tabs.create({
                url: chrome.runtime.getURL('vero-brands.html')
              })
            }
          >
            Vero Brands
          </Button>
          <Title level={5}>Total Brands: {totalVeroBrands}</Title>
        </Row>
        <Row className='items-center justify-between'>
          <Title level={5}>Enable Vero Protection</Title>
          <Switch
            value={veroProtection}
            onChange={(value) => {
              setVeroProtection(value);
              setLocal('vero-protection', value);
            }}
          />
        </Row>
        <Row className='items-center justify-between'>
          <Title level={5}>Auto Submit Listing</Title>
          <Switch
            value={autoListing}
            onChange={(value) => {
              setAutoListing(value);
              setLocal('auto-listing', value);
            }}
          />
        </Row>
        <Row className='items-center justify-between'>
          <Title level={5}>Use Image Template</Title>
          <Switch
            value={imageTemplate}
            onChange={async (value) => {
              setImageTemplate(value);
              setLocal('use-image-template', value);
              if (value) {
                setReviewImages(false);
                await setLocal('use-review-images', false);
              }
            }}
          />
        </Row>
        <Row className='items-center justify-between'>
          <Title level={5}>Use Review Images</Title>
          <Switch
            value={reviewImages}
            onChange={async (value) => {
              setReviewImages(value);
              await setLocal('use-review-images', value);
              if (value) {
                setImageTemplate(false);
                setLocal('use-image-template', false);
              }
            }}
          />
        </Row>
        <Row className='items-center justify-between'>
          <Title level={5}>Hide Personal Information</Title>
          <Switch
            value={localHidePersonalInformation}
            onChange={(value) => handleHidePersonalInformation(value)}
          />
        </Row>
        <Row>
          <div className='control-item'>
            <span className='control-label'>Schedule Listing Time:</span>
            <Select
              defaultValue='Disabled'
              style={{ width: 120, paddingLeft: '5px' }}
              options={[
                { value: null, label: 'Disabled' },
                { value: 1, label: '12 AM' },
                { value: 2, label: '1 AM' },
                { value: 3, label: '2 AM' },
                { value: 4, label: '3 AM' },
                { value: 5, label: '4 AM' },
                { value: 6, label: '5 AM' },
                { value: 7, label: '6 AM' },
                { value: 8, label: '7 AM' },
                { value: 9, label: '8 AM' },
                { value: 10, label: '9 AM' },
                { value: 11, label: '10 AM' },
                { value: 12, label: '11 AM' },
                { value: 13, label: '12 PM' },
                { value: 14, label: '1 PM' },
                { value: 15, label: '2 PM' },
                { value: 16, label: '3 PM' },
                { value: 17, label: '4 PM' },
                { value: 18, label: '5 PM' },
                { value: 19, label: '6 PM' },
                { value: 20, label: '7 PM' },
                { value: 21, label: '8 PM' },
                { value: 22, label: '9 PM' },
                { value: 23, label: '10 PM' },
                { value: 24, label: '11 PM' }
              ]}
              value={localScheduleListingTime}
              onChange={(e) => handleScheduleTimeChange(e)}
            />
          </div>
        </Row>
        <Col className={classes.advanceFeatures}>
          <Title level={5}>Advance Features</Title>
          <Button
            type='primary'
            className={classes.blackButton}
            onClick={() =>
              chrome.tabs.create({
                url: chrome.runtime.getURL('listing-setup.html')
              })
            }
          >
            Image Template
          </Button>
          <Button
            type='primary'
            className={classes.blackButton}
            onClick={() =>
              chrome.tabs.create({
                url: chrome.runtime.getURL('product-hunter.html')
              })
            }
          >
            Product Hunter
          </Button>
          <Button
            type='primary'
            className={classes.blackButton}
            onClick={() =>
              chrome.tabs.create({
                url: chrome.runtime.getURL('bulk-lister.html')
              })
            }
          >
            Bulk Lister
          </Button>
          <Button
            type='primary'
            className={classes.blackButton}
            onClick={() =>
              chrome.tabs.create({
                url: chrome.runtime.getURL('competitor-search.html')
              })
            }
          >
            Competitor Search
          </Button>
          <Button
            type='primary'
            className={classes.blackButton}
            Competitor
            Search
            onClick={() =>
              chrome.tabs.create({
                url: chrome.runtime.getURL('duplicate-checker.html')
              })
            }
          >
            Duplicate Checker
          </Button>
          <Button
            type='primary'
            className={classes.blackButton}
            Competitor
            Search
            onClick={() =>
              chrome.tabs.create({
                url: chrome.runtime.getURL('boost-listing.html')
              })
            }
          >
            Boost Listing
          </Button>
          <Button
            type='primary'
            className={classes.blackButton}
            Competitor Search
            onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL('tracker.html') })}
          >
            Tracker
          </Button>
        </Col>
      </>
    );
  };

  return (
    <div className={classes.mainDiv}>
      {authState === 'checking' ? (
        <div
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            height: '340px',
            display: 'flex'
          }}
        >
          <Row gutter={12} className={classes.loginBox}>
            <Title level={3} style={{ textAlign: 'center' }}>
              Authenticating
            </Title>
          </Row>
        </div>
      ) : authState === 'logged-out' ? (
        <LoginUI />
      ) : (
        <MainUI2 />
      )}
    </div>
  );
};

export default PopUp;
