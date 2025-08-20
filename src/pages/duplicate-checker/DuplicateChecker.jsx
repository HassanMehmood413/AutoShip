import { useEffect } from 'react';
import { useState } from 'react';
import { Button, Input, Select, Typography, Card, Space, Divider, message, InputNumber, notification } from 'antd';
import { makeStyles } from '@material-ui/core/styles';
import { Buffer } from 'buffer';

import { getLocal, setLocal, onChange as onChangeLocalState } from '../../services/dbService';
import constants from '../../../constants';

const { TextArea } = Input;
const { Title } = Typography;

const useStyles = makeStyles({
  mainDiv: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  header: {
    marginTop: '1px'
  },
  box: {
    gap: '5px',
    flexDirection: 'column',
    width: '900px',
    background: '#f6f6f6',
    padding: '15px'
  },
  listingButtons: {
    marginTop: '5px',
    gap: '5px'
  }
});

const DuplicateChecker = () => {
  const classes = useStyles();

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(200);
  const [savedSkus, setSavedSkus] = useState([]);
  const [duplicateSkus, setDuplicateSkus] = useState([]);
  const [importSkus, setImportSkus] = useState([]);
  const [urls, setUrls] = useState([]);
  const [urlAsins, setUrlAsins] = useState([]);
  const [asinsToSkus, setAsinsToSkus] = useState([]);
  const [skus, setSkus] = useState([]);
  const [skusToAsins, setSkusToAsins] = useState([]);
  const [asins, setAsins] = useState([]);
  const [batchNumber, setBatchNumber] = useState('1');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    onChangeLocalState('duplicate-checker-skus', async (_, newValue) => {
      const duplicates = newValue.filter((val, i) => newValue.includes(val, i + 1));
      setSavedSkus(newValue);
      setDuplicateSkus(duplicates);
    });
    onChangeLocalState('scan-listing-status', async (_, newValue) => {
      if (newValue === 'scanned') {
        setLoading(false);
      }
      if (newValue === 'error') {
        const error = await getLocal('scan-listing-error');

        notification.error({
          message: 'Error',
          description: error
        });
        setLoading(false);
      }
    });

    const loadStates = async () => {
      const storageSkus = await getLocal('duplicate-checker-skus') || [];
      const duplicates = storageSkus.filter((val, i) => storageSkus.includes(val, i + 1));
      setSavedSkus(storageSkus);
      setDuplicateSkus(duplicates);
      const pSize = await getLocal('duplicate-checker-page-size');
      const pNumber = await getLocal('duplicate-checker-page-number');
      setPageNumber(pNumber || 1);
      setPageSize(pSize || 200);
      const scanStatus = await getLocal('scan-listing-status');
      if (scanStatus === 'scanning') setLoading(true);
    };
    loadStates();
  }, []);

  const handleImportSku = async () => {
    const filtered = importSkus.filter(item => item);
    const tempScannedSkus = [...savedSkus, ...filtered];
    setSavedSkus(tempScannedSkus);
    await setLocal('duplicate-checker-skus', tempScannedSkus);
  };

  const handleClearSkus = async () => {
    await setLocal('duplicate-checker-skus', []);
    setSavedSkus([]);
    setDuplicateSkus([]);
    setImportSkus([]);
  };

  const handleRemoveDuplicates = async () => {
    const tempSkus = [...savedSkus];
    const uniqueArray = [...new Set(tempSkus)];
    await setLocal('duplicate-checker-skus', uniqueArray);
    setSavedSkus(uniqueArray);
    setDuplicateSkus([]);
  };

  const copyToClip = () => {
    navigator.clipboard.writeText(savedSkus.join('\n'));
    message.success('Text Copied');
  };

  const getASINFromURL = (url) => {
    const asinRegex = /\/([A-Za-z0-9]{10})(?:[/?]|$)/;
    const match = url.match(asinRegex);
    return match ? match[1] : 'ASIN not found.';
  };

  const handleUrlToAsin = () => {
    const asins = [];
    for (let i = 0; i < urls.length; i++) {
      asins.push(getASINFromURL(urls[i]));
    }
    setUrlAsins(asins);
  };


  const asinToSku = (asin) => {
    // Convert the ASIN to Base64 (browser-compatible)
    return btoa(asin).replace(/=+$/, ''); // Remove padding "="
  };

  const skuToAsin = (sku) => {
    try {
      return atob(sku);
    } catch (error) {
      console.error('Error decoding SKU:', error);
      return null; // Return null if decoding fails
    }
  };

  const handleAsinsToSkus = () => {
    const skus = [];
    for (let i = 0; i < asinsToSkus.length; i++) {
      skus.push(asinToSku(asinsToSkus[i]));
    }
    setSkus(skus);
  };

  const handleSkusToAsins = () => {
    const asins = [];
    for (let i = 0; i < skusToAsins.length; i++) {
      asins.push(skuToAsin(skusToAsins[i]));
    }
    setAsins(asins);
  };

  const handlePageSizeChange = async (val) => {
    setPageSize(val);
    await setLocal('duplicate-checker-page-size', val);
  };
  const handlePageNumberChange = async (val) => {
    setPageNumber(val);
    await setLocal('duplicate-checker-page-number', val);
  };

  const handleScanningSkus = async () => {
    setLoading(true);
    const userId = await getLocal('current-user');
    const domain = await getLocal(`selected-domain-${userId}`);

    let ebayLink = 'https://www.ebay.com';
    if (domain === 'UK') {
      ebayLink = 'https://www.ebay.co.uk';
    }

    //https://www.ebay.co.uk/sh/lst/active?limit=25&sort=listingSKU&action=pagination
    //https://www.ebay.com/sh/lst/active?offset=0&limit=200&sort=listingSKU
    await chrome.runtime.sendMessage({
      payload: {
        url: `${ebayLink}/sh/lst/active?offset=${pageNumber === 1 ? 0 : pageNumber * pageSize}&limit=${pageSize}&sort=listingSKU&action=pagination`,
        active: false
      },
      callback: 'openTab'
    });
    await setLocal('scan-listing-status', 'scanning');
  };

  return (
    <div style={{ padding: '0px 16px 16px 16px' }}>
      <Title level={3}>Duplicate Checker</Title>
      <p className='mb-4'>This scans your eBay account to grab all of the SKUs, please wait until its complete.</p>

      <Space
        direction='vertical'
        size='large'
        style={{
          width: '100%'
        }}
      >
        <Card>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '12px'
            }}
          >
            <Button
              type='primary'
              loading={loading}
              onClick={handleScanningSkus}
            >
              Start Scanning for SKUs
            </Button>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px'
            }}
          >
            <span>Page Number:</span>
            <InputNumber
              value={pageNumber}
              onChange={val => handlePageNumberChange(val)}
              style={{ width: 80 }}
            />
            <span>Results per page:</span>
            <Select
              defaultValue={pageSize}
              onChange={val => handlePageSizeChange(val)}
              style={{ width: 120 }}
              options={[
                { value: 25, label: '25' },
                { value: 50, label: '50' },
                { value: 100, label: '100' },
                { value: 200, label: '200' }
              ]}
            />
          </div>

          <TextArea
            value={savedSkus.join('\n')}
            rows={6}
            placeholder='Scanned SKUs'
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '8px',
              marginTop: '12px'
            }}
          >
            <span>Total SKUs Saved So Far: {savedSkus.length}</span>
            <Button onClick={handleClearSkus}>Clear SKUS</Button>
            <Button onClick={handleRemoveDuplicates}>Remove Duplicates</Button>
            <Button type='primary' onClick={copyToClip}>Save SKUs to clipboard</Button>
          </div>
        </Card>

        <Card title='Import SKUs'>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <TextArea
              rows={5}
              placeholder='Enter SKUs separated with new lines'
              value={importSkus.join('\n')}
              onChange={(e) => {
                if (e.target.value) setImportSkus(e.target.value.split('\n'));
                else setImportSkus([]);
              }}
            />
            <TextArea
              value={duplicateSkus.join('\n')}
              rows={5}
              placeholder='No duplicate SKUS found'
            />
          </div>
          <div style={{ marginTop: '12px' }}>
            <Button
              disabled={!importSkus.length}
              onClick={handleImportSku}
            >
              Import SKUS
            </Button>
            <div style={{ marginTop: '8px' }}>
              {/* <span style={{ marginRight: '8px' }}>Choose Batch Number:</span>
              <Input
                value={batchNumber}
                onChange={e => setBatchNumber(e.target.value)}
                style={{ width: 60 }}
              /> */}
              <Button>Open Duplicate SKUS in new tab (10 at a time)</Button>
            </div>
          </div>
        </Card>

        <Card title='Advanced Users'>
          <Space direction='vertical' size='large' style={{ width: '100%' }}>
            <div>
              <p>Convert ASINS to SKUS</p>
              <Space direction='vertical' style={{ width: '100%' }}>
                <Space direction='horizontal' style={{ width: '100%' }}>
                  <TextArea
                    value={asinsToSkus.join('\n')}
                    onChange={(e) => {
                      if (e.target.value) setAsinsToSkus(e.target.value.split('\n'));
                      else setAsinsToSkus([]);
                    }}
                    rows={5}
                    placeholder='Enter ASINS separated with new lines'
                    style={{ width: '400px' }}
                  />
                  <TextArea
                    value={skus.join('\n')}
                    rows={5}
                    placeholder='Results will appear here'
                    style={{ width: '400px' }}
                  />
                </Space>
                <Button onClick={handleAsinsToSkus}>Convert ASINS to SKUS</Button>
              </Space>
            </div>

            <Divider style={{ margin: '0px' }} />

            <div>
              <p>Convert SKUS to ASINS</p>
              <Space direction='vertical' style={{ width: '100%' }}>
                <Space direction='horizontal' style={{ width: '100%' }}>
                  <TextArea
                    value={skusToAsins.join('\n')}
                    onChange={(e) => {
                      if (e.target.value) setSkusToAsins(e.target.value.split('\n'));
                      else setSkusToAsins([]);
                    }}
                    rows={5}
                    placeholder='Enter SKUS separated with new lines'
                    style={{ width: '400px' }}
                  />
                  <TextArea
                    value={asins.join('\n')}
                    rows={5}
                    placeholder='Results will appear here'
                    style={{ width: '400px' }}
                  />
                </Space>
                <Button onClick={handleSkusToAsins}>Convert SKUS to ASINS</Button>
              </Space>
            </div>

            <Divider style={{ margin: '0px' }} />

            <div>
              <p>Convert URL to ASIN</p>
              <Space direction='vertical' style={{ width: '100%' }}>
                <Space direction='horizontal' style={{ width: '100%' }}>
                  <TextArea
                    value={urls.join('\n')}
                    onChange={(e) => {
                      if (e.target.value) setUrls(e.target.value.split('\n'));
                      else setUrls([]);
                    }}
                    rows={5}
                    placeholder='Enter URLs separated with new lines'
                    style={{ width: '400px' }}
                  />
                  <TextArea
                    value={urlAsins.join('\n')}
                    rows={5}
                    placeholder='Results will appear here'
                    style={{ width: '400px' }}
                  />
                </Space>
                <Button onClick={handleUrlToAsin}>Convert URL to ASIN</Button>
              </Space>
            </div>
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default DuplicateChecker;
