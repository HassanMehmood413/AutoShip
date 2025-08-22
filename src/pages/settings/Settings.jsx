import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  setLocal
} from '../../services/dbService';
import { PagesLayout } from '../../components/shared/pagesLayout';

const { Title, Text } = Typography;

// Define components outside to prevent re-creation on every render
const PricingSetupComponent = React.memo(({ markupPercentage, setMarkupPercentage, endPrice, setEndPrice, selectedDomain, handleDomainChange }) => {
  const [localMarkup, setLocalMarkup] = useState(markupPercentage);
  const [localEndPrice, setLocalEndPrice] = useState(endPrice);

  useEffect(() => {
    setLocalMarkup(markupPercentage);
  }, [markupPercentage]);

  useEffect(() => {
    setLocalEndPrice(endPrice);
  }, [endPrice]);

  const handleSetValues = async () => {
    console.log('Set Values clicked!', { localMarkup, localEndPrice });
    
    // Save markup percentage
    setMarkupPercentage(localMarkup);
    await setLocal('markup-percentage', localMarkup);
    
    // Save end price
    setEndPrice(localEndPrice);
    await setLocal('end-price', localEndPrice);
    
    // Show success message (optional)
    alert('Values saved successfully!');
  };

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Title level={5} className='!mb-0'>
            Markup Percentage
          </Title>
          <input
            type="text"
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
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Title level={5} className='!mb-0'>
            End Price
          </Title>
          <input
            type="text"
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
        <Row gutter={[16, 16]}>
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
        <div style={{ 
          borderTop: '1px solid #f0f0f0', 
          margin: '16px 0',
          paddingTop: '16px' 
        }}>
          <Row gutter={[16, 16]}>
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
  });

const useStyles = makeStyles({
  mainDiv: {
    margin: '10px 15px 10px 15px'
  },
  header: {
    marginTop: '1px'
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
  blackButton: {
    height: '30px',
    background: '#000000'
  }
});

const Settings = () => {
  const classes = useStyles();
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
  const [localScheduleListingTime, setLocalScheduleListingTime] = useState(null);
  const [country, setCountry] = useState(null);
  const [localHidePersonalInformation, setLocalHidePersonalInformation] = useState(false);

  const loadLocalStates = async () => {
    const userId = await getLocal('current-user');
    const selectedDomain = await getLocal(`selected-domain-${userId}`);
    const localCountry = await getLocal('user-country');
    const localWatermark = await getLocal('watermark-url');
    const localMarkupPercentage = await getLocal('markup-percentage');
    const localEndPrice = await getLocal('end-price');
    const localVeroProtection = await getLocal('vero-protection');
    const localAutoListing = await getLocal('auto-listing');
    const localReviewImages = await getLocal('use-review-images');
    const localImageTemplate = await getLocal('use-image-template');
    const localHidePersonalInformation = await getLocal('hide-personal-information');
    const localScheduleTime = await getLocal('schedule-listing-time');
    const localVeroBrands = await getLocal('vero-brands');

    if (localMarkupPercentage !== null) setMarkupPercentage(localMarkupPercentage);
    if (localEndPrice !== null) setEndPrice(localEndPrice);
    if (selectedDomain) {
      setSelectedDomain(selectedDomain);
    } else {
      setSelectedDomain('UK');
      await setLocal(`selected-domain-${userId}`, 'UK');
    }
    if (localCountry) setCountry(localCountry);
    if (localWatermark) setWatermarkUrl(localWatermark);
    if (localVeroProtection !== null) setVeroProtection(localVeroProtection);
    if (localAutoListing !== null) setAutoListing(localAutoListing);
    if (localReviewImages !== null) setReviewImages(localReviewImages);
    if (localImageTemplate !== null) setImageTemplate(localImageTemplate);
    if (localHidePersonalInformation) setLocalHidePersonalInformation(localHidePersonalInformation);
    if (localScheduleTime !== null) setLocalScheduleListingTime(localScheduleTime);
    if (localVeroBrands?.length) setTotalVeroBrands(localVeroBrands.length);
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
    await setLocal(`selected-domain-${userId}`, value);
    setSelectedDomain(value);
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

  // Extract Pricing Setup Component to prevent recreation on renders

  // Extract Country Component
  const CountryComponent = () => {
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
                }
              ]}
              onChange={(value) => handleDomainChange(value)}
            />
          </Col>
        </Row>
      </div>
    );
  };

  // Extract Images Setup Component
  const ImagesSetupComponent = () => {
    return (
      <div>
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
      </div>
    );
  };

  // Extract Listing Setup Component
  const ListingSetupComponent = () => {
    return (
      <div>
        <div className='mb-4 p-4 bg-blue-50 rounded-lg'>
          <Button
            type='primary'
            className={`${classes.blackButton} w-full mb-3`}
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
  };

  // Extract Schedule Listing Component
  const ScheduleListingComponent = () => {
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
  };

  // Extract Vero Component
  const VeroComponent = () => {
    return (
      <div>
        <Row className='items-center justify-between'>
          <Title level={5}>Total Brands: {totalVeroBrands}</Title>
          <Button
            type='primary'
            className={classes.blackButton}
            onClick={() =>
              chrome.tabs.create({
                url: chrome.runtime.getURL('vero-brands.html')
              })
            }
          >
            Manage Brands
          </Button>
        </Row>
        <Row className='items-center justify-between'>
          <Title level={5}>Vero Protection</Title>
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
  };

  // Extract Duplicate Fixer Component
  const DuplicateFixerComponent = () => {
    return (
      <div>
        <Row className='items-center justify-between'>
          <Title level={5}>Duplicate Checker</Title>
          <Button
            type='primary'
            className={classes.blackButton}
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
  };

  useEffect(() => {
    loadLocalStates();
    checkUser();
  }, []);

  const settingOptions = [
    {
      label: 'Country',
      Component: CountryComponent
    },
    {
      label: 'Images Setup',
      Component: ImagesSetupComponent
    },
    {
      label: 'Listing Setup',
      Component: ListingSetupComponent
    },
    {
      label: 'Pricing Setup',
      Component: PricingSetupComponent
    },
    {
      label: 'Schedule Listing',
      Component: ScheduleListingComponent
    },
    {
      label: 'Vero',
      Component: VeroComponent
    },
    {
      label: 'Duplicate Fixer',
      Component: DuplicateFixerComponent
    }
  ];

  return (
    <PagesLayout>
      <div className={classes.mainDiv}>
        <Row>
          <Title className={classes.header} level={3}>
            Settings
          </Title>
        </Row>
        <Row>
          <Col span={24}>
            <div className='flex flex-col gap-4'>
              {settingOptions.map((option, i) => (
                <div key={i} className='border rounded-lg p-4'>
                  <div className='flex items-center justify-between mb-4'>
                    <Title level={4} className='!mb-0'>
                      {option.label}
                    </Title>
                    <button
                      className='text-blue-600 hover:text-blue-800'
                      onClick={() => setIndex(index === i ? -1 : i)}
                    >
                      {index === i ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <div style={{ display: index === i ? 'block' : 'none' }}>
                                        {option.label === 'Pricing Setup' ? (
                      <PricingSetupComponent 
                        markupPercentage={markupPercentage}
                        setMarkupPercentage={setMarkupPercentage}
                        endPrice={endPrice}
                        setEndPrice={setEndPrice}
                        selectedDomain={selectedDomain}
                        handleDomainChange={handleDomainChange}
                      />
                    ) : (
                       <option.Component />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Col>
        </Row>
      </div>
    </PagesLayout>
  );
};

export default Settings; 