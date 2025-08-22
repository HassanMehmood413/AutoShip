import { useEffect, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  Typography,
  Button,
  Input,
  InputNumber,
  Checkbox,
  Select,
  Layout,
  Space,
  Modal,
  notification,
} from "antd";

import {
  getLocal,
  onChange as onChangeLocalState,
  setLocal,
} from "../../services/dbService";
import { PagesLayout } from "../../components/shared/pagesLayout";
import { PageBtn } from "../../components/shared/buttons";
import "./style.css";
import { isEmpty } from "lodash";

const { Content } = Layout;
const { Title } = Typography;
const { TextArea } = Input;

const useStyles = makeStyles({
  mainDiv: {
    height: "98%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
    background: "#f6f6f6",
  },
  header: {
    marginTop: "1px",
  },
  mainBox: {
    height: "calc(100% - 70px)",
    gap: "10px",
    flexDirection: "column",
    width: "1200px",
    background: "white",
    padding: "15px",
    borderRadius: "5px",
    boxShadow: "0 0 5px rgba(0,0,0,0.1)",
  },
  toolBar: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  permissionBox: {
    display: "flex",
    justifyContent: "center",
    fontSize: "45px",
  },
});

const Tracker = () => {
  const classes = useStyles();

  const [tracking, setTracking] = useState(false);
  const [trackerFilters, setTrackerFilters] = useState({
    stockMonitorEnabled: false,
    priceMonitorEnabled: false,
    priceMonitorWithEndingPriceEnabled: false,
    stockMonitorType: "",
    priceMonitorType: "markup",
    restockQuantity: 0,
    priceMarkupPercentage: 0,
    priceMarkupValue: 0,
    priceTriggerThreshold: 0,
    priceMonitorEndingPrices: "",
  });
  const [ruleBasedSettings, setRuleBasedSettings] = useState({
    itemWithNoSku: {
      status: false,
      action: "nothing",
    },
    itemWithBrokenSku: {
      status: false,
      action: "nothing",
    },
    itemsNotFoundOnAmazon: {
      status: false,
      action: "nothing",
    },
    itemsWithSales: {
      status: false,
      action: "delete",
      sales: 0,
      days: 0,
    },
  });
  const [continuousTracking, setContinuousTracking] = useState(false);
  const [trackingTimeout, setTrackingTimeout] = useState(0);
  const [trackingTimeoutCompleteScan, setTrackingTimeoutCompleteScan] =
    useState(0);
  const [trackerPageNumber, setTrackerPageNumber] = useState(1);
  const [logging, setLogging] = useState(false);
  const [pinTabs, setPinTabs] = useState(false);
  const [tabId, setTabId] = useState("");
  const [logs, setLogs] = useState([]);
  const [logsModel, setLogsModel] = useState(false);
  const [summary, setSummary] = useState([]);
  const [summaryModel, setSummaryModal] = useState(false);

  useEffect(() => {
    const loadStates = async () => {
      const userId = await getLocal("current-user");
      const domain = await getLocal(`selected-domain-${userId}`);

      let ebayLink = "https://www.ebay.com";
      if (domain === "UK") {
        ebayLink = "https://www.ebay.co.uk";
      }

      const tFilters = (await getLocal("tracker-filters")) || {};
      if (tFilters) setTrackerFilters(tFilters);
      console.log("🚀 ~ :113 ~ tFilters:", tFilters);

      const rbSettings = (await getLocal("rule-based-settings")) || {};
      if (!isEmpty(rbSettings)) setRuleBasedSettings(rbSettings);
      console.log("🚀 ~ :122 ~ rbSettings:", rbSettings);

      const cTracking = (await getLocal("continuous-tracking")) || false;
      if (cTracking) setContinuousTracking(cTracking);

      const tTimeout = (await getLocal("tracking-timeout")) || 0;
      if (tTimeout) setTrackingTimeout(tTimeout);

      const tTimeoutCompleteScan =
        (await getLocal("tracking-timeout-complete-scan")) || 0;
      if (tTimeoutCompleteScan) setTrackingTimeoutCompleteScan(tTimeout);

      const tPageNumber = (await getLocal("tracker-page-number")) || 1;
      if (tPageNumber) setTrackerPageNumber(tPageNumber);

      const logging = (await getLocal("logging")) || false;
      if (logging) setLogging(logging);

      const pTabs = (await getLocal("pin-tabs")) || false;
      if (pTabs) setPinTabs(pTabs);

      const localLogs = (await getLocal("tracker-logs")) || false;
      if (localLogs) setLogs(localLogs);

      const tSummary = (await getLocal("tracker-summary")) || false;
      if (tSummary) setSummary(tSummary);
    };
    loadStates();

    onChangeLocalState("tracking", async (_oldValue, newValue) => {
      setTracking(newValue);
    });
    onChangeLocalState("tracker-logs", async (_oldValue, newValue) => {
      setLogs(newValue);
    });
    onChangeLocalState("tracker-summary", async (_oldValue, newValue) => {
      setSummary(newValue);
    });
  }, []);

  const handleTrackerFiltersChange = async (key, value) => {
    let settingsObj = {};
    const previousSettings = await getLocal("tracker-filters");
    if (!previousSettings) {
      settingsObj = {
        [key]: value,
      };
    } else {
      settingsObj = {
        ...previousSettings,
        [key]: value,
      };
    }

    setTrackerFilters(settingsObj);
    await setLocal("tracker-filters", settingsObj);
  };

  const handleRuleBasedSettingChange = async (key, subKey, value) => {
    let settingsObj = {};
    const previousSettings = (await getLocal("rule-based-settings")) || {};
    if (!previousSettings) {
      settingsObj = {
        [key]: {
          [subKey]: value,
        },
      };
    } else {
      settingsObj = {
        ...previousSettings,
        [key]: {
          ...previousSettings[key],
          [subKey]: value,
        },
      };
    }

    setRuleBasedSettings(settingsObj);
    await setLocal("rule-based-settings", settingsObj);
  };

  const checkRules = () => {
    console.log("🚀 ~ :199 ~ trackerFilters:", trackerFilters);
    console.log("🚀 ~ :199 ~ ruleBasedSettings:", ruleBasedSettings);
    if (
      !trackerFilters.priceMonitorEnabled &&
      !trackerFilters.stockMonitorEnabled &&
      !trackerFilters.priceMonitorWithEndingPriceEnabled &&
      !ruleBasedSettings.itemWithNoSku.status &&
      !ruleBasedSettings.itemWithBrokenSku.status &&
      !ruleBasedSettings.itemsNotFoundOnAmazon.status &&
      !ruleBasedSettings.itemsWithSales.status
    ) {
      notification.error({
        message: "Error",
        description:
          "Please enable any tracking filter or rules based settings",
      });
      return false;
    }
    if (
      trackerFilters.stockMonitorEnabled &&
      trackerFilters?.restockQuantity < 0
    ) {
      notification.error({
        message: "Error",
        description:
          "Please provide restock quantity. It should be greater than equal to 0.",
      });
      return false;
    }
    if (
      trackerFilters.priceMonitorEnabled &&
      trackerFilters.priceMonitorType === "markup" &&
      !trackerFilters.priceMarkupPercentage
    ) {
      notification.error({
        message: "Error",
        description: "Please provide markup percentage",
      });
      return false;
    }
    if (
      trackerFilters.priceMonitorEnabled &&
      trackerFilters.priceMonitorType === "variable" &&
      !trackerFilters.priceMarkupValue
    ) {
      notification.error({
        message: "Error",
        description: "Please provide markup value",
      });
      return false;
    }
    if (
      trackerFilters.priceMonitorEnabled &&
      trackerFilters?.priceTriggerThreshold < 0
    ) {
      notification.error({
        message: "Error",
        description:
          "Please provide price trigger threshold. It should be greater than equal to 0.",
      });
      return false;
    }
    if (
      trackerFilters.priceMonitorWithEndingPriceEnabled &&
      !trackerFilters.priceMonitorEndingPrices
    ) {
      notification.error({
        message: "Error",
        description: "Please provide ending prices",
      });
      return false;
    }
    if (
      ruleBasedSettings.itemsWithSales.status &&
      (!ruleBasedSettings.itemsWithSales.days ||
        !ruleBasedSettings.itemsWithSales.sales)
    ) {
      notification.error({
        message: "Error",
        description: "Please provide sales and days",
      });
      return false;
    }
    return true;
  };

  const handleStartTracking = async () => {
    // check validation
    if (!checkRules()) return;

    const userId = await getLocal("current-user");
    const domain = await getLocal(`selected-domain-${userId}`);
    setTracking(true);
    await setLocal("tracking", true);
    await setLocal("tracker-current-index", 0);
    await setLocal("tracker-total-listing", 0);
    await setLocal("tracker-logs", []);
    await setLocal("tracker-summary", []);

    let ebayLink = "https://www.ebay.com";
    if (domain === "UK") {
      ebayLink = "https://www.ebay.co.uk";
    }

    // https://www.ebay.com/sh/lst/active?action=pagination&sort=timeRemaining&limit=200&offset=400
    let url = `${ebayLink}/sh/lst/active?action=pagination&sort=timeRemaining&limit=200&localType=tracking`;
    if (trackerPageNumber > 1) {
      const offset = (trackerPageNumber - 1) * 200;
      url = `${ebayLink}/sh/lst/active?action=pagination&sort=timeRemaining&limit=200&offset=${offset}&localType=tracking`;
    }
    const { id } = await chrome.runtime.sendMessage({
      payload: {
        url,
        active: false,
        pinned: pinTabs,
      },
      callback: "openTab",
    });
    setTabId(id);
  };

  const handleStopTracking = async () => {
    setTracking(false);
    await setLocal("tracking", false);
    await setLocal("tracker-current-index", 0);
    await setLocal("tracker-total-listing", 0);
    await chrome.runtime.sendMessage({
      callback: "closeTargetTab",
      payload: tabId,
    });
  };

  return (
    <PagesLayout>
      <div className="w-full flex justify-center px-2">
        <Layout className="tracker-layout">
          <Content className="tracker-content">
            <div className="section">
              <h1 className="font-bold text-2xl">Tracker</h1>
              <p>
                For a full guide on how to use the tracker please watch this
                video:{" "}
                <a
                  href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-blue-500"
                >
                  How to use the tracker
                </a>
              </p>
            </div>

            <div className="section">
              <Title level={5}>Setup</Title>

              {/* <div className='filter-row'>
            <Checkbox
              checked={trackerFilters?.stockMonitorEnabled || false}
              onChange={(e) => handleTrackerFiltersChange('stockMonitorEnabled', e.target.checked)}
            >
              Enable Stock Monitor
            </Checkbox>
            <Select
              className='inline-select'
              value={trackerFilters?.stockMonitorType}
              onChange={(value) => handleTrackerFiltersChange('stockMonitorType', value)}
            >
              <Select.Option value='all'>All Items</Select.Option>
            </Select>
            <div className='label-input-group'>
              <span className='input-label'>Restock Quantity:</span>
              <InputNumber
                value={trackerFilters?.restockQuantity}
                className='small-input'
                onChange={(value) => handleTrackerFiltersChange('restockQuantity', value)}
              />
            </div>
          </div> */}

              <div className="filter-row">
                <Checkbox
                  checked={trackerFilters?.priceMonitorEnabled}
                  onChange={(e) =>
                    handleTrackerFiltersChange(
                      "priceMonitorEnabled",
                      e.target.checked
                    )
                  }
                >
                  Enable Price Monitor
                </Checkbox>
                <Select
                  className="inline-select"
                  value={trackerFilters?.priceMonitorType}
                  onChange={(value) =>
                    handleTrackerFiltersChange("priceMonitorType", value)
                  }
                >
                  <Select.Option value="markup">Markup Pricing</Select.Option>
                  <Select.Option value="variable">
                    Variable Pricing
                  </Select.Option>
                </Select>
                {trackerFilters?.priceMonitorType === "markup" && (
                  <div className="label-input-group">
                    <span className="input-label">Markup Percentage (%):</span>
                    <InputNumber
                      value={trackerFilters?.priceMarkupPercentage}
                      className="small-input"
                      onChange={(value) =>
                        handleTrackerFiltersChange(
                          "priceMarkupPercentage",
                          value
                        )
                      }
                    />
                  </div>
                )}
                {trackerFilters?.priceMonitorType === "variable" && (
                  <div className="label-input-group">
                    <span className="input-label">Markup Value:</span>
                    <InputNumber
                      className="small-input"
                      min={0}
                      value={trackerFilters?.priceMarkupValue}
                      onChange={(value) =>
                        handleTrackerFiltersChange("priceMarkupValue", value)
                      }
                    />
                  </div>
                )}

                <div className="label-input-group">
                  <span className="input-label">
                    Price Trigger Threshold (±$):
                  </span>
                  <InputNumber
                    className="small-input"
                    min={0}
                    value={trackerFilters?.priceTriggerThreshold}
                    onChange={(value) =>
                      handleTrackerFiltersChange("priceTriggerThreshold", value)
                    }
                  />
                </div>
              </div>
            </div>

            <div className="section">
              <Title level={5}>Rules</Title>

              <div className="rule-row">
                <Checkbox
                  checked={trackerFilters?.stockMonitorEnabled || false}
                  onChange={(e) =>
                    handleTrackerFiltersChange(
                      "stockMonitorEnabled",
                      e.target.checked
                    )
                  }
                >
                  IF available on Amazon, Change Ebay Available Quantity To:
                </Checkbox>
                {/* <Select
              className='inline-select'
              value={trackerFilters?.stockMonitorType}
              onChange={(value) => handleTrackerFiltersChange('stockMonitorType', value)}
            >
              <Select.Option value='all'>All Items</Select.Option>
            </Select> */}
                <div
                  className="label-input-group"
                  style={{ marginLeft: "8px" }}
                >
                  <InputNumber
                    value={trackerFilters?.restockQuantity}
                    className="small-input"
                    onChange={(value) =>
                      handleTrackerFiltersChange("restockQuantity", value)
                    }
                  />
                </div>
              </div>

              <div className="filter-row">
                <Checkbox
                  checked={trackerFilters?.priceMonitorWithEndingPriceEnabled}
                  onChange={(e) =>
                    handleTrackerFiltersChange(
                      "priceMonitorWithEndingPriceEnabled",
                      e.target.checked
                    )
                  }
                >
                  ONLY update eBay Item IF Price Ends:
                </Checkbox>
                <Input
                  className="medium-input"
                  placeholder="99, 97, 95"
                  value={trackerFilters?.priceMonitorEndingPrices}
                  onChange={(e) =>
                    handleTrackerFiltersChange(
                      "priceMonitorEndingPrices",
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="rule-row">
                <Checkbox
                  checked={ruleBasedSettings?.itemWithNoSku?.status}
                  onChange={(e) =>
                    handleRuleBasedSettingChange(
                      "itemWithNoSku",
                      "status",
                      e.target.checked
                    )
                  }
                >
                  IF Item has no SKU
                </Checkbox>
                <Select
                  defaultValue="delete"
                  className="action-select"
                  value={ruleBasedSettings?.itemWithNoSku?.action}
                  onChange={(value) =>
                    handleRuleBasedSettingChange(
                      "itemWithNoSku",
                      "action",
                      value
                    )
                  }
                >
                  <Select.Option value="nothing">Do nothing</Select.Option>
                  <Select.Option value="delete">Delete</Select.Option>
                  <Select.Option value="out-of-stock">
                    Make Out of Stock
                  </Select.Option>
                </Select>
              </div>

              <div className="rule-row">
                <Checkbox
                  checked={ruleBasedSettings?.itemWithBrokenSku?.status}
                  onChange={(e) =>
                    handleRuleBasedSettingChange(
                      "itemWithBrokenSku",
                      "status",
                      e.target.checked
                    )
                  }
                >
                  IF Item has SKU, but it isn’t in your database
                </Checkbox>
                <Select
                  defaultValue="delete"
                  className="action-select"
                  value={ruleBasedSettings?.itemWithBrokenSku?.action}
                  onChange={(value) =>
                    handleRuleBasedSettingChange(
                      "itemWithBrokenSku",
                      "action",
                      value
                    )
                  }
                >
                  <Select.Option value="nothing">Do nothing</Select.Option>
                  <Select.Option value="delete">Delete</Select.Option>
                  <Select.Option value="out-of-stock">
                    Make Out of Stock
                  </Select.Option>
                </Select>
              </div>

              <div className="rule-row">
                <Checkbox
                  checked={ruleBasedSettings?.itemsNotFoundOnAmazon?.status}
                  onChange={(e) =>
                    handleRuleBasedSettingChange(
                      "itemsNotFoundOnAmazon",
                      "status",
                      e.target.checked
                    )
                  }
                >
                  IF item is no longer found on Amazon (Deleted listing or bad
                  URL)
                </Checkbox>
                <Select
                  defaultValue="delete"
                  className="action-select"
                  value={ruleBasedSettings?.itemsNotFoundOnAmazon?.action}
                  onChange={(value) =>
                    handleRuleBasedSettingChange(
                      "itemsNotFoundOnAmazon",
                      "action",
                      value
                    )
                  }
                >
                  <Select.Option value="nothing">Do nothing</Select.Option>
                  <Select.Option value="delete">Delete</Select.Option>
                  <Select.Option value="out-of-stock">
                    Make Out of Stock
                  </Select.Option>
                </Select>
              </div>

              <div className="rule-row">
                <Checkbox
                  checked={ruleBasedSettings?.itemsWithSales?.status}
                  onChange={(e) =>
                    handleRuleBasedSettingChange(
                      "itemsWithSales",
                      "status",
                      e.target.checked
                    )
                  }
                >
                  IF item has done
                </Checkbox>
                <Input
                  className="tiny-input"
                  type="number"
                  value={ruleBasedSettings?.itemsWithSales?.sales}
                  onChange={(e) =>
                    handleRuleBasedSettingChange(
                      "itemsWithSales",
                      "sales",
                      e.target.value
                    )
                  }
                />
                <span className="rule-text">or less sales in the last</span>
                <Input
                  className="tiny-input"
                  type="number"
                  value={ruleBasedSettings?.itemsWithSales?.days}
                  onChange={(e) =>
                    handleRuleBasedSettingChange(
                      "itemsWithSales",
                      "days",
                      e.target.value
                    )
                  }
                />
                <span className="rule-text">days then</span>
                <Select
                  defaultValue="delete"
                  className="action-select"
                  value={ruleBasedSettings?.itemsWithSales?.action}
                  onChange={(value) =>
                    handleRuleBasedSettingChange(
                      "itemsWithSales",
                      "action",
                      value
                    )
                  }
                >
                  <Select.Option value="delete">Delete</Select.Option>
                  <Select.Option value="out-of-stock">
                    Make Out of Stock
                  </Select.Option>
                </Select>
              </div>
            </div>

            <div className="section">
              <Title level={5}>Tracker Settings</Title>

              <div className="setting-row">
                <div className="label-input-group">
                  <span className="input-label">
                    Start Start at Page Number:
                  </span>
                  <Input
                    type="number"
                    className="medium-input"
                    value={trackerPageNumber}
                    onChange={async (e) => {
                      await setLocal("tracker-page-number", e.target.value);
                      setTrackerPageNumber(e.target.value);
                    }}
                  />
                </div>
              </div>

              <div className="setting-row">
                <div className="label-input-group">
                  <span className="input-label">
                    Tracking Timeout between items (in seconds):
                  </span>
                  <Input
                    type="number"
                    className="medium-input"
                    value={trackingTimeout}
                    onChange={async (e) => {
                      await setLocal("tracking-timeout", e.target.value);
                      setTrackingTimeout(e.target.value);
                    }}
                  />
                </div>
              </div>

              <Title level={5}>Continuous Tracking</Title>
              <p className="mb-4 max-w-lg">
                If enabled the tracker keeps running forever on a loop, until
                stopped. It is highly recommended you add a timeout between
                complete scans if you have less than 1000+ items.
              </p>

              <div className="setting-row">
                <Checkbox
                  checked={continuousTracking}
                  onChange={async (e) => {
                    console.log("1231231", e.target.checked);
                    await setLocal("continuous-tracking", e.target.checked);
                    setContinuousTracking(e.target.checked);
                  }}
                >
                  Enable Continuous Tracking
                </Checkbox>
              </div>

              <div className="setting-row">
                <div className="label-input-group">
                  <span className="input-label">
                    Tracking Timeout between complete scan (in minutes):
                  </span>
                  <Input
                    type="number"
                    className="medium-input"
                    value={trackingTimeoutCompleteScan}
                    onChange={async (e) => {
                      await setLocal(
                        "tracking-timeout-complete-scan",
                        e.target.value
                      );
                      setTrackingTimeoutCompleteScan(e.target.value);
                    }}
                  />
                </div>
              </div>

              <div className="setting-row">
                <Space>
                  {/* <Checkbox
                checked={logging}
                onChange={async (e) => {
                  await setLocal('logging', e.target.checked);
                  setLogging(e.target.checked);
                }}
              >
                Logs
              </Checkbox> */}
                  <Button type="default" onClick={() => setLogsModel(true)}>
                    Open Logs
                  </Button>
                  <Button
                    type="default"
                    onClick={async () => await setLocal("tracker-logs", [])}
                  >
                    Clear Logs
                  </Button>
                </Space>
              </div>
              <div className="setting-row">
                <Space>
                  <Button type="default" onClick={() => setSummaryModal(true)}>
                    Open Summary
                  </Button>
                  <Button
                    type="default"
                    onClick={async () => await setLocal("tracker-summary", [])}
                  >
                    Clear Summary
                  </Button>
                </Space>
              </div>

              <div className="setting-row">
                <Checkbox
                  checked={pinTabs}
                  onChange={async (e) => {
                    await setLocal("pin-tabs", e.target.checked);
                    setPinTabs(e.target.checked);
                  }}
                >
                  Pin Tabs
                </Checkbox>
              </div>
            </div>

            <div className="start-tracking">
              {/* <Checkbox checked={startTracking} onChange={(e) => setStartTracking(e.target.checked)}>
            Start Tracking
          </Checkbox> */}
              <PageBtn
                variant="green"
                loading={tracking}
                onClick={() => handleStartTracking()}
              >
                START
              </PageBtn>
              {tracking && (
                <div className="ml-2 start-tracking">
                  <PageBtn
                    variant="amber"
                    onClick={() => {}}
                  >
                    Pause Tracker
                  </PageBtn>
                  <PageBtn
                    variant="red"
                    onClick={() => handleStopTracking()}
                  >
                    Stop Tracker
                  </PageBtn>
                </div>
              )}
              <PageBtn
                variant="red"
                onClick={() => handleStopTracking()}
              >
                Stop & Reset to Default Settings
              </PageBtn>
            </div>

            {/* Item Number Input */}
            {/* <div className='section'>
          <div className='item-number-container'>
            <div className='item-number-label'>Item Number</div>
            <Input className='item-number-input' />
            <div className='item-number-label'>Test</div>
          </div>
        </div> */}
          </Content>
          <Modal
            title="Logs"
            className="create-location"
            centered
            width={800}
            height={800}
            open={logsModel}
            footer={null}
            onCancel={() => setLogsModel(false)}
          >
            <TextArea
              value={logs?.join("\n") || ""}
              rows={20}
              placeholder="Logs"
            />
          </Modal>
          <Modal
            title="Summary"
            className="create-location"
            centered
            width={800}
            height={800}
            open={summaryModel}
            footer={null}
            onCancel={() => setSummaryModal(false)}
          >
            <TextArea
              value={summary?.join("\n") || ""}
              rows={20}
              placeholder="Logs"
            />
          </Modal>
        </Layout>
      </div>
    </PagesLayout>
  );
};

export default Tracker;
