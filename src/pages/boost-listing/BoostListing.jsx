import { useEffect } from 'react';
import { useState } from 'react';
import {
  Button,
  Select,
  Typography,
  Card,
  Space,
  InputNumber,
  Modal,
  Row,
  Checkbox,
  Flex,
  Tooltip,
  TimePicker,
  Switch,
  notification
} from 'antd';
import { SettingOutlined, InfoCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import {
  getLocal,
  setLocal,
  onChange as onChangeLocalState
} from '../../services/dbService';

import EndSellSimilarInfo from './end-sell-similar-info.png';
import { PagesLayout } from '../../components/shared/pagesLayout';
import { PageBtn } from '../../components/shared/buttons';

const { Title, Text } = Typography;

const BoostListing = () => {
  const [endSellSimilarModal, setEndSellSimilarModal] = useState(false);
  const [scheduleSettingModal, setScheduleSettingModal] = useState(false);
  const [infoModal, setInfoModal] = useState(false);
  const [offerStatus, setOfferStatus] = useState('');
  const [autoRepeat, setAutoRepeat] = useState(false);
  const [autoClose, setAutoClose] = useState(false);
  const [endSellSettings, setEndSellSettings] = useState({
    minimumSold: 0,
    minimumViews: 0,
    hoursLeft: 0
  });
  const [scheduleSettings, setScheduleSettings] = useState({
    status: 'false',
    startTime: '',
    interval: 0
  });
  const [currentTime, setCurrentTime] = useState('');
  const [reviseOffersLoading, setReviseOffersLoading] = useState(false);
  const [endSellListingLoading, setEndSellListingLoading] = useState(false);
  const [endSellListingPercentage, setEndSellListingPercentage] = useState(0);
  const [allListLink, setAllListingLink] = useState('');

  useEffect(() => {
    onChangeLocalState('revise-offers-status', async (_, newValue) => {
      if (newValue !== 'revising') {
        setReviseOffersLoading(false);
      }
    });
    onChangeLocalState('end-sell-listing-status', async (_, newValue) => {
      if (newValue !== 'inprogress') {
        setEndSellListingLoading(false);
      }
    });
    onChangeLocalState('end-sell-similar-percentage', async (_, newValue) => {
      setEndSellListingPercentage(newValue || 0);
    });

    const loadStates = async () => {
      const userId = await getLocal('current-user');
      const domain = await getLocal(`selected-domain-${userId}`);

      let ebayLink = 'https://www.ebay.com';
      if (domain === 'UK') {
        ebayLink = 'https://www.ebay.co.uk';
      }
      setAllListingLink(
        `${ebayLink}/sh/lst/active?action=sort&sort=scheduledStartDate&limit=200`
      );

      const oStatus = (await getLocal('offer-status')) || '';
      if (oStatus) setOfferStatus(oStatus);

      const aClose = (await getLocal('auto-close')) || false;
      if (aClose) setAutoClose(aClose);

      const aRepeat = (await getLocal('auto-repeat')) || false;
      if (aRepeat) setAutoRepeat(aRepeat);

      const settings = await getLocal('end-sell-similar-settings');
      if (settings) setEndSellSettings(settings);

      const sSettings = await getLocal('boost-listing-schedule-settings');
      if (sSettings) setScheduleSettings(sSettings);
    };
    loadStates();

    const intervalId = setInterval(() => {
      const time = new Date().toLocaleTimeString();
      setCurrentTime(time);
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const handleSettingsChange = async (key, value) => {
    let settingsObj = {};
    const previousSettings = await getLocal('end-sell-similar-settings');
    if (!previousSettings) {
      settingsObj = {
        [key]: value
      };
    } else {
      settingsObj = {
        ...previousSettings,
        [key]: value
      };
    }

    setEndSellSettings(settingsObj);
    await setLocal('end-sell-similar-settings', settingsObj);
  };

  const handleScheduleSettingsChange = async (key, value) => {
    let settingsObj = {};
    const previousSettings = await getLocal('boost-listing-schedule-settings');
    if (!previousSettings) {
      settingsObj = {
        [key]: value
      };
    } else {
      settingsObj = {
        ...previousSettings,
        [key]: value
      };
    }

    setScheduleSettings(settingsObj);
    await setLocal('boost-listing-schedule-settings', settingsObj);
  };

  const handleEndSellListings = async () => {
    setEndSellListingLoading(true);
    await setLocal('end-sell-listing-status', 'inprogress');
    await setLocal('end-sell-current-index', 0);
    await setLocal('end-sell-total-listing', 0);

    const userId = await getLocal('current-user');
    const domain = await getLocal(`selected-domain-${userId}`);

    let ebayLink = 'https://www.ebay.com';
    if (domain === 'UK') {
      ebayLink = 'https://www.ebay.co.uk';
    }
    //https://www.ebay.com/sh/lst/active?action=pagination&sort=timeRemaining&limit=200
    await chrome.runtime.sendMessage({
      payload: {
        url: `${ebayLink}/sh/lst/active?action=pagination&sort=timeRemaining&limit=200&localType=end-sell`,
        active: false
      },
      callback: 'openTab'
    });
  };

  const handleReviseOffers = async () => {
    setReviseOffersLoading(true);
    await setLocal('revise-offers-status', 'revising');
    await setLocal('revise-listing-option-index', 0);
    const userId = await getLocal('current-user');
    const domain = await getLocal(`selected-domain-${userId}`);

    let ebayLink = 'https://www.ebay.com';
    if (domain === 'UK') {
      ebayLink = 'https://www.ebay.co.uk';
    }
    //https://www.ebay.com/sh/lst/active?action=sort&sort=scheduledStartDate&limit=200
    await chrome.runtime.sendMessage({
      payload: {
        url: `${ebayLink}/sh/lst/active?action=sort&sort=scheduledStartDate&limit=200&localType=revise`,
        active: false
      },
      callback: 'openTab'
    });
  };

  const handleScheduleSettingsOk = async () => {
    if (
      scheduleSettings.status === 'true'
      && (!scheduleSettings.startTime || !scheduleSettings.interval)
    ) {
      notification.success({
        message: 'Error',
        description: 'Please set start time and interval'
      });
      return;
    }
    setScheduleSettingModal(false);
    await chrome.runtime.sendMessage({
      payload: {},
      callback: 'scheduleBoostListings'
    });
  };

  return (
    <PagesLayout dimensions='max-w-6xl'>
      <div className='w-full flex justify-center'>
        <div className='container max-w-5xl space-y-4'>
          <div className='flex flex-col'>
            <h1 className='font-bold text-center text-2xl mb-2'>
              Boost Listings
            </h1>
            <p className='text-center text-lg'>
              There are two main ways to boost your listings
            </p>
          </div>
          <div className='flex w-full gap-4'>
            <div className='flex-1 flex flex-col'>
              <div className='flex flex-col gap-2items-center justify-between'>
                <div>
                  <h2 className='font-bold text-lg'>End + Sell Similar</h2>
                  <p className=''>
                    This tool can be used to end all your listings and then
                    relist them. This helps make your listings go to the top of
                    the search results.
                  </p>
                  <button
                    onClick={() => setInfoModal(true)}
                    className='underline'
                  >
                    How to configure eBay
                  </button>
                  <p className='text-red-500 text-sm'>
                    WARNING: If you have more listings than your eBay plan
                    includes without fees, then you'll end up paying for listing
                    fee's above all your allowed listings when using this tool.
                    Use with caution. Your limit resets monthly.
                  </p>
                </div>
                <h3 className='mt-4 font-semibold'>Settings</h3>
                <div>
                  <p className='text-sm'>Optional. Enter 0 to ignore option.</p>
                </div>
                <div className='mt-4'>
                  <Flex vertical gap={10}>
                    <Row
                      style={{
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '5px'
                      }}
                    >
                      <Tooltip title="Set the maximum number of sales an item should have to be considered for relisting. Items with sales less than or equal to this number will be targeted. For example, setting this to '5' will target items that have sold 5 times or fewer.">
                        <Text className='!mb-0'>Minimum Sold: </Text>
                      </Tooltip>
                      <InputNumber
                        min={0}
                        value={endSellSettings?.minimumSold || 0}
                        onChange={(value) =>
                          handleSettingsChange('minimumSold', value)
                        }
                      />
                    </Row>
                    <Row
                      style={{
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '5px'
                      }}
                    >
                      <Tooltip title="Define the minimum views threshold. Items with views not exceeding this number are considered under performing. For instance, entering '100' will target items that have received fewer than 100 views.">
                        <Text className='!mb-0'>Minimum Views: </Text>
                      </Tooltip>
                      <InputNumber
                        min={0}
                        value={endSellSettings?.minimumViews || 0}
                        onChange={(value) =>
                          handleSettingsChange('minimumViews', value)
                        }
                      />
                    </Row>
                    <Row
                      style={{
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '5px'
                      }}
                    >
                      <Tooltip title="Specify how many hours left until the listing ends. Items with a remaining time less than this will be flagged for relisting. Setting this to '24' targets items ending within the next 24 hours.">
                        <Text className='!mb-0'>Hours Left: </Text>
                      </Tooltip>
                      <InputNumber
                        min={0}
                        value={endSellSettings?.hoursLeft || 0}
                        onChange={(value) =>
                          handleSettingsChange('hoursLeft', value)
                        }
                      />
                    </Row>
                    <Row
                      style={{
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '5px'
                      }}
                    >
                      <Tooltip title='Enable this option to automatically close the browser tab once the process is complete. This is useful for running the tool in the background.'>
                        <Text className='!mb-0'>Auto Close: </Text>
                      </Tooltip>
                      <Checkbox
                        checked={autoClose}
                        onChange={async (e) => {
                          setAutoClose(e.target.checked);
                          setLocal('auto-close', e.target.checked);
                        }}
                      />
                    </Row>
                    <Row
                      style={{
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '5px'
                      }}
                    >
                      <Tooltip title='Enable this option to automatically repeat the process until no more low-performing items are found. This is useful for bulk relisting.'>
                        <Text className='!mb-0'>Auto Repeat: </Text>
                      </Tooltip>
                      <Checkbox
                        checked={autoRepeat}
                        onChange={async (e) => {
                          setAutoRepeat(e.target.checked);
                          setLocal('auto-repeat', e.target.checked);
                        }}
                      />
                    </Row>
                  </Flex>
                </div>
              </div>
              <div className='mt-4 flex flex-col'>
                <h3 className='font-semibold'>Run It</h3>
                <p className=''>
                  You can either run this now for all items, or schedule it for
                  a future date:
                </p>
              </div>
              <div className='flex justify-between items-center gap-2 mt-2'>
                <PageBtn
                  variant='blue'
                  loading={endSellListingLoading}
                  onClick={handleEndSellListings}
                >
                  End + Sell Similar Now
                </PageBtn>
                <span className='px-2'>OR</span>
                <PageBtn
                  variant='blue'
                  loading={endSellListingLoading}
                  onClick={() => setScheduleSettingModal(true)}
                >
                  End + Sell Similar Schedule
                </PageBtn>
              </div>
              <p className='text-sm mt-2'>
                <span className='font-semibold'>Progress: </span>
                {endSellListingPercentage}%
              </p>
            </div>
            <span className='py-2 lg:py-0 text-center w-full lg:w-auto lg:flex lg:px-2 relative lg:top-20'>
              OR
            </span>
            <div className='flex-1 flex flex-col'>
              <h2 className='font-bold text-lg'>Offers</h2>
              <p className=''>
                A good way to boost sales is allowing people to submit offers on
                your listings. TIP: You can set on each listing to auto-decline
                offers below certain percentages of the list price, to save you
                getting flooded with low unwanted offers.
              </p>
              <div className='flex flex-col gap-2 mt-2'>
                <Select
                  value={offerStatus}
                  onChange={async (val) => {
                    await setLocal('offer-status', val);
                    setOfferStatus(val);
                  }}
                  style={{ width: '100%' }}
                  options={[
                    { value: 'on', label: 'Turn On Offers' },
                    { value: 'off', label: 'Turn Off Offers' }
                  ]}
                />
                <PageBtn
                  variant='blue'
                  customClass='w-full'
                  loading={reviseOffersLoading}
                  onClick={handleReviseOffers}
                >
                  Revise All Active Listings Now
                </PageBtn>
              </div>
              <p className='text-sm mt-2'>
                <span className='font-semibold'>Progress: </span>
                {endSellListingPercentage}%
              </p>
            </div>
          </div>
          <Modal
            title='End & Sell Similar Setting'
            className='create-location'
            centered
            width={300}
            open={endSellSimilarModal}
            footer={null}
            onCancel={() => setEndSellSimilarModal(false)}
          >
            <Flex vertical gap={10}>
              <Row
                style={{
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '5px'
                }}
              >
                <Tooltip title="Set the maximum number of sales an item should have to be considered for relisting. Items with sales less than or equal to this number will be targeted. For example, setting this to '5' will target items that have sold 5 times or fewer.">
                  <Text className='!mb-0'>Minimum Sold: </Text>
                </Tooltip>
                <InputNumber
                  min={0}
                  value={endSellSettings?.minimumSold || 0}
                  onChange={(value) =>
                    handleSettingsChange('minimumSold', value)
                  }
                />
              </Row>
              <Row
                style={{
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '5px'
                }}
              >
                <Tooltip title="Define the minimum views threshold. Items with views not exceeding this number are considered under performing. For instance, entering '100' will target items that have received fewer than 100 views.">
                  <Text className='!mb-0'>Minimum Views: </Text>
                </Tooltip>
                <InputNumber
                  min={0}
                  value={endSellSettings?.minimumViews || 0}
                  onChange={(value) =>
                    handleSettingsChange('minimumViews', value)
                  }
                />
              </Row>
              <Row
                style={{
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '5px'
                }}
              >
                <Tooltip title="Specify how many hours left until the listing ends. Items with a remaining time less than this will be flagged for relisting. Setting this to '24' targets items ending within the next 24 hours.">
                  <Text className='!mb-0'>Hours Left: </Text>
                </Tooltip>
                <InputNumber
                  min={0}
                  value={endSellSettings?.hoursLeft || 0}
                  onChange={(value) => handleSettingsChange('hoursLeft', value)}
                />
              </Row>
              <Row
                style={{
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '5px'
                }}
              >
                <Tooltip title='Enable this option to automatically close the browser tab once the process is complete. This is useful for running the tool in the background.'>
                  <Text className='!mb-0'>Auto Close: </Text>
                </Tooltip>
                <Checkbox
                  checked={autoClose}
                  onChange={async (e) => {
                    setAutoClose(e.target.checked);
                    setLocal('auto-close', e.target.checked);
                  }}
                />
              </Row>
              <Row
                style={{
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '5px'
                }}
              >
                <Tooltip title='Enable this option to automatically repeat the process until no more low-performing items are found. This is useful for bulk relisting.'>
                  <Text className='!mb-0'>Auto Repeat: </Text>
                </Tooltip>
                <Checkbox
                  checked={autoRepeat}
                  onChange={async (e) => {
                    setAutoRepeat(e.target.checked);
                    setLocal('auto-repeat', e.target.checked);
                  }}
                />
              </Row>
            </Flex>
          </Modal>
          <Modal
            title='End & Sell Similar Schedule'
            className='create-location'
            centered
            width={350}
            open={scheduleSettingModal}
            onCancel={() => {
              setScheduleSettingModal(false);
              handleScheduleSettingsOk('ok');
            }}
            onOk={() => handleScheduleSettingsOk('cancel')}
          >
            <Flex vertical gap={10}>
              <Row
                style={{
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '5px'
                }}
              >
                <Tooltip title="Set the maximum number of sales an item should have to be considered for relisting. Items with sales less than or equal to this number will be targeted. For example, setting this to '5' will target items that have sold 5 times or fewer.">
                  <Text className='!mb-0'>Status: </Text>
                </Tooltip>
                <Switch
                  checkedChildren='Enabled'
                  unCheckedChildren='Disabled'
                  checked={scheduleSettings.status === 'true' ? true : false}
                  onChange={(val) =>
                    handleScheduleSettingsChange(
                      'status',
                      val ? 'true' : 'false'
                    )
                  }
                />
              </Row>
              <Row
                style={{
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '5px'
                }}
              >
                <Tooltip title="Set the maximum number of sales an item should have to be considered for relisting. Items with sales less than or equal to this number will be targeted. For example, setting this to '5' will target items that have sold 5 times or fewer.">
                  <Text className='!mb-0'>Schedule Start Time: </Text>
                </Tooltip>
                <TimePicker
                  format='HH:mm'
                  defaultValue={
                    scheduleSettings.startTime
                      ? dayjs(scheduleSettings.startTime, 'hh:mm')
                      : dayjs('00:00', 'hh:mm')
                  }
                  onChange={(_, value) =>
                    handleScheduleSettingsChange('startTime', value)
                  }
                />
              </Row>
              <Row
                style={{
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '5px'
                }}
              >
                <Tooltip title="Define the minimum views threshold. Items with views not exceeding this number are considered under performing. For instance, entering '100' will target items that have received fewer than 100 views.">
                  <Text className='!mb-0'>Schedule Interval: </Text>
                </Tooltip>
                <Select
                  value={scheduleSettings.interval}
                  onChange={(value) =>
                    handleScheduleSettingsChange('interval', value)
                  }
                  style={{ width: 100 }}
                  options={[
                    { value: 1, label: '1 Hours' },
                    { value: 2, label: '2 Hours' },
                    { value: 3, label: '3 Hours' },
                    { value: 4, label: '4 Hours' },
                    { value: 5, label: '5 Hours' },
                    { value: 6, label: '6 Hours' },
                    { value: 7, label: '7 Hours' },
                    { value: 8, label: '8 Hours' },
                    { value: 9, label: '9 Hours' },
                    { value: 10, label: '10 Hours' },
                    { value: 11, label: '11 Hours' },
                    { value: 12, label: '12 Hours' },
                    { value: 13, label: '13 Hours' },
                    { value: 14, label: '14 Hours' },
                    { value: 15, label: '15 Hours' },
                    { value: 16, label: '16 Hours' },
                    { value: 17, label: '17 Hours' },
                    { value: 18, label: '18 Hours' },
                    { value: 19, label: '19 Hours' },
                    { value: 20, label: '20 Hours' },
                    { value: 21, label: '21 Hours' },
                    { value: 22, label: '22 Hours' },
                    { value: 23, label: '33 Hours' },
                    { value: 24, label: '24 Hours' }
                  ]}
                />
              </Row>
            </Flex>
          </Modal>
          <Modal
            title='Welcome to Boost Listings'
            className='create-location'
            centered
            width={1050}
            open={infoModal}
            footer={null}
            onCancel={() => setInfoModal(false)}
          >
            <div>
              <p>
                This tool helps you automatically end and relist low-performing
                listings to boost their visibility on eBay. Set filters,
                schedule automation, and let the tool manage your listings
                efficiently. Ensure to configure settings below before starting.
              </p>
              <p>
                Please turn on <strong>Customize ended listings view</strong>{' '}
                with the following options:
              </p>
              <ul>
                <li>Views (30 days)</li>
                <li>Item number</li>
                <li>Sold quantity</li>
                <li>Start date</li>
                <li>Available quantity</li>
              </ul>
              <p>
                For detailed steps, refer to the image below or visit this{' '}
                <a
                  id='activeListingLink'
                  href={allListLink}
                  target='_blank'
                  rel='noreferrer'
                >
                  link
                </a>{' '}
                and click on the <strong>customize</strong> button to see the
                options.
              </p>
              <img
                alt='Customize Ended Listings View'
                width={600}
                src={EndSellSimilarInfo}
              />
            </div>
          </Modal>
        </div>
      </div>
    </PagesLayout>
  );
};

export default BoostListing;
