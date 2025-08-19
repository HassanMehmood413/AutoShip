import { makeStyles } from "@material-ui/core/styles";
import {
  Row,
  Typography,
  Button,
  Input,
  Col,
  InputNumber,
  Checkbox,
  notification,
  Modal,
  Table,
  Tooltip,
  ConfigProvider,
  Progress,
  Card,
  Statistic,
} from "antd";
import { useCallback, useEffect, useRef, useState } from "react";

import { sleep } from "../../services/utils";
import { getLocal, setLocal } from "../../services/dbService";
import { round } from "lodash";
import { PagesLayout } from "../../components/shared/pagesLayout";
import { PageBtn } from "../../components/shared/buttons";

const { Title, Text } = Typography;
const { TextArea } = Input;

window.addEventListener("beforeunload", async () => {
  await setLocal("listing-status", null);
  await setLocal("is-bulk-listing", false);
});

const useStyles = makeStyles({
  mainDiv: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  header: {
    marginTop: "1px",
  },
  box: {
    gap: "5px",
    flexDirection: "column",
    width: "900px",
    background: "#f6f6f6",
    padding: "15px",
  },
  listingButtons: {
    marginTop: "5px",
    gap: "5px",
  },
});

const BulkLister = () => {
  const classes = useStyles();
  const [links, setLinks] = useState([]);
  const [newLinks, setNewLinks] = useState([]);
  const [report, setReport] = useState([]);
  const [isListing, setIsListing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [position, setPosition] = useState(0);
  const linksRef = useRef(links);
  const reportRef = useRef(report);
  const [minPrice, setMinPrice] = useState(null);
  const [maxPrice, setMaxPrice] = useState(null);
  const [isFba, setIsFba] = useState(null);
  const [closeListing, setCloseListing] = useState(null);
  const [ignoreVero, setIgnoreVero] = useState(false);
  const [useNoBrandOptimizer, setUseNoBrandOptimizer] = useState(false);
  const [pauseLoading, setPauseLoading] = useState(null);
  const [terminateLoading, setTerminateLoading] = useState(null);
  const [reportModel, setReportModel] = useState(false);

  // New state for daily limits and time delays
  const [dailyLimit, setDailyLimit] = useState(100);
  const [timeDelay, setTimeDelay] = useState(2); // minutes
  const [dailyProgress, setDailyProgress] = useState(0);
  const [lastListingDate, setLastListingDate] = useState(null);
  const [isWaitingDelay, setIsWaitingDelay] = useState(false);
  const [nextListingTime, setNextListingTime] = useState(null);
  const [countdown, setCountdown] = useState(0);

  const getStates = async () => {
    const minP = await getLocal("bulk-lister-min-price");
    if (minP) setMinPrice(minP);

    const maxP = await getLocal("bulk-lister-max-price");
    if (maxP) setMaxPrice(maxP);

    const fba = await getLocal("bulk-lister-fba");
    if (fba !== null) setIsFba(fba);

    const cListing = await getLocal("bulk-lister-close-listing");
    if (cListing !== null) setCloseListing(cListing);

    const ignoreVeroSetting = await getLocal("bulk-lister-ignore-vero");
    if (ignoreVeroSetting !== null) setIgnoreVero(ignoreVeroSetting);

    const noBrandSetting = await getLocal("bulk-lister-title-optimizer-no-brand");
    if (noBrandSetting !== null) setUseNoBrandOptimizer(noBrandSetting);

    // Load daily limit and time delay settings
    const savedDailyLimit = await getLocal("bulk-lister-daily-limit");
    if (savedDailyLimit !== null) setDailyLimit(savedDailyLimit);

    const savedTimeDelay = await getLocal("bulk-lister-time-delay");
    if (savedTimeDelay !== null) setTimeDelay(savedTimeDelay);

    // Check for daily reset first
    const today = new Date().toDateString();
    const savedLastDate = await getLocal("bulk-lister-last-date");

    console.log('🗓️ Daily Reset Check:', { today, savedLastDate, isNewDay: savedLastDate !== today });

    if (savedLastDate !== today) {
      // It's a new day - reset everything
      console.log('🆕 New day detected - resetting daily progress to 0');
      setDailyProgress(0);
      await setLocal(`bulk-lister-daily-progress-${today}`, 0);
      await setLocal("bulk-lister-last-date", today);

      // Clean up previous day's data
      if (savedLastDate) {
        await setLocal(`bulk-lister-daily-progress-${savedLastDate}`, null);
      }
    } else {
      // Same day - load existing progress
      const savedProgress = await getLocal(`bulk-lister-daily-progress-${today}`);
      console.log('📊 Loading today\'s progress:', savedProgress);
      if (savedProgress !== null) {
        setDailyProgress(savedProgress);
      } else {
        // First time today - initialize to 0
        setDailyProgress(0);
        await setLocal(`bulk-lister-daily-progress-${today}`, 0);
      }
    }

    setLastListingDate(today);

    // Check for URLs from product hunter
    const urlsFromHunter = await getLocal("bulk-lister-urls");
    const shouldClearExisting = await getLocal("bulk-lister-clear-existing");

    if (urlsFromHunter && urlsFromHunter.length > 0) {
      // If clear flag is set, clear existing links first
      if (shouldClearExisting) {
        setLinks([]); // Clear existing links
        await setLocal("bulk-lister-clear-existing", false); // Reset the flag
      }

      setLinks(urlsFromHunter);
      // Clear the URLs from storage after loading them
      await setLocal("bulk-lister-urls", null);

      // Show notification that URLs were loaded
      const message = shouldClearExisting
        ? `${urlsFromHunter.length} Amazon URLs have been loaded from Product Hunter (existing queue cleared)`
        : `${urlsFromHunter.length} Amazon URLs have been loaded from Product Hunter`;

      notification.success({
        message: "URLs Loaded",
        description: message
      });
    }
  };

  useEffect(() => {
    getStates();
  }, []);

  // Check for daily reset when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        console.log('👀 Page became visible - checking for daily reset');
        await checkDailyReset();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also check on component mount
    checkDailyReset();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    linksRef.current = links;
  }, [links]);

  useEffect(() => {
    reportRef.current = report;
  }, [report]);

  const isValidLink = (url) => {
    // const amazonRegex = /^(https?:\/\/)?(www\.)?amazon\.(com|ca|co\.uk|de|fr|in|it|es|co\.jp|com\.br)\/(?:[^\/]+\/)?(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[\/?]|$)/;

    // (com|ca|co\.uk|de|fr|in|it|es|co\.jp|com\.br)
    const amazonRegex =
      /^(https?:\/\/)?(www\.)?amazon\.(com|ca|co\.uk|de|fr|in|it|es|co\.jp|com\.br)\/(?:[^\/]+\/)?(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[\/?]|$)/;
    // const amazonRegex = /^(https?:\/\/)?(www\.)?amazon\.com\/(?:[^\/]+\/)?(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[\/?]|$)/;

    return amazonRegex.test(url);
  };

  const processLink = async (index) => {
    const link = linksRef.current[index];
    console.log(`Processing: ${link}`);
    // Simulate processing time
    if (isValidLink(link)) {
      // await setLocal('processing-link', link);
      const asin = link.split("/")[4];
      await setLocal("listing-asin", asin);

      await chrome.runtime.sendMessage({
        payload: {
          url: `${link}?autoList=true`,
          active: false,
        },
        callback: "openTab",
      });
      await setLocal("listing-status", "listing");
      let listingStatus = "listing";
      while (listingStatus === "listing") {
        listingStatus = await getLocal("listing-status");
        console.log(
          "🚀 ~ file: BulkLister.jsx:63 ~ listingStatus:",
          listingStatus
        );
        await sleep(2);
      }
      console.log("status: ", listingStatus);
      console.log("link: ", link);
      return listingStatus;
    } else {
      notification.error({
        message: "Invalid Product Link",
        description: link,
      });
    }
  };

  const processLinks = async () => {
    // Check daily limit before starting
    if (hasReachedDailyLimit()) {
      notification.warning({
        message: "Daily Limit Reached",
        description: `You have reached your daily limit of ${dailyLimit} listings. Come back tomorrow to continue.`,
      });
      return;
    }

    await setLocal("is-bulk-listing", true);
    setIsListing(true);
    let localIndex = position;
    let dailyCount = 0;

    while (localIndex < linksRef.current.length) {
      // Check daily limit before each listing
      if (hasReachedDailyLimit()) {
        notification.success({
          message: "Daily Limit Reached",
          description: `Processed ${dailyCount} items today. Daily limit of ${dailyLimit} reached. Listing will resume tomorrow.`,
        });
        break;
      }

      const status = await processLink(localIndex);

      if (status === "paused") {
        await setLocal("is-bulk-listing", false);
        setPauseLoading(false);
        setIsListing(false);
        return;
      }

      if (status === "terminated") {
        setTerminateLoading(false);
        break;
      }

      if (status === "error") {
        const error = await getLocal("listing-error");
        const currentReport = reportRef.current;
        setReport([
          ...currentReport,
          {
            link: linksRef.current[localIndex],
            status: "Error",
            error,
          },
        ]);
      }

      if (status === "success") {
        const currentReport = reportRef.current;

        // Check if listing was properly saved to database
        const savedToDb = await getLocal('listing-saved-to-db');
        const dbError = await getLocal('listing-db-error');

        let dbStatus = 'Listed';
        let statusColor = 'green';

        if (savedToDb === true) {
          dbStatus = 'Listed & Saved to DB';
          statusColor = 'green';
        } else if (savedToDb === false) {
          dbStatus = 'Listed (DB Save Failed)';
          statusColor = 'orange';
        } else {
          dbStatus = 'Listed (DB Status Unknown)';
          statusColor = 'blue';
        }

        setReport([
          ...currentReport,
          {
            link: linksRef.current[localIndex],
            status: dbStatus,
            statusColor,
            dbSaved: savedToDb,
            error: savedToDb === false ? (dbError || 'Database save failed') : null
          },
        ]);

        // Clear the database save status
        await setLocal('listing-saved-to-db', null);
        await setLocal('listing-db-error', null);

        // Update daily progress for successful listings
        await updateDailyProgress(1);
        dailyCount++;

        // Wait for delay after successful listing (except for the last item)
        if (localIndex < linksRef.current.length - 1 && !hasReachedDailyLimit()) {
          await waitForDelay();
        }
      }

      localIndex += 1;
      setPosition((prevIndex) => prevIndex + 1);

      // Don't remove items from queue, just move position forward
      // This way users can see the full queue and what's been processed
    }

    await setLocal("is-bulk-listing", false);
    setIsListing(false);

    // Show completion message with database stats
    const totalProcessed = reportRef.current.length;
    const dbSaveSuccesses = reportRef.current.filter(r => r.dbSaved === true).length;
    const dbSaveFailures = reportRef.current.filter(r => r.dbSaved === false).length;

    if (linksRef.current.length === 0) {
      notification.success({
        message: "Queue Complete",
        description: `All items processed. Listed: ${dailyCount}, DB Saved: ${dbSaveSuccesses}, DB Failed: ${dbSaveFailures}`,
        duration: 10
      });
      setPosition(0);
    } else if (hasReachedDailyLimit()) {
      notification.info({
        message: "Queue Paused - Daily Limit Reached",
        description: `Listed: ${dailyCount}, DB Saved: ${dbSaveSuccesses}, DB Failed: ${dbSaveFailures}. ${linksRef.current.length} items remain for tomorrow.`,
        duration: 10
      });
    }
  };

  const handleListClick = () => {
    if (links.length > 0) {
      processLinks();
    }
  };

  // const handleListClick = useCallback(async () => {
  //   setIsListing(true);
  //   for (let i = 0; i < links.length; i++) {
  //     console.log('🚀 ~ file: BulkLister.jsx:52 ~ links:', links);
  //     setPosition(i + 1);
  //     const link = links[i];
  //     console.log('🚀 ~ file: BulkLister.jsx:55 ~ link:', link);
  //     await sleep(5);
  //   }
  //   setIsListing(false);
  // }, [links]);

  const handlePriceChange = async (type, value) => {
    if (type === "min") {
      setMinPrice(value);
      await setLocal("bulk-lister-min-price", value);
    } else {
      setMaxPrice(value);
      await setLocal("bulk-lister-max-price", value);
    }
  };

  const handleFbaChange = async (value) => {
    setIsFba(value);
    await setLocal("bulk-lister-fba", value);
  };

  const handleCloseListingChange = async (value) => {
    setCloseListing(value);
    await setLocal("bulk-lister-close-listing", value);
  };

  const handleIgnoreVeroChange = async (value) => {
    setIgnoreVero(value);
    await setLocal("bulk-lister-ignore-vero", value);
  };

  const handleNoBrandChange = async (value) => {
    setUseNoBrandOptimizer(value);
    await setLocal("bulk-lister-title-optimizer-no-brand", value);
  };

  const handleDailyLimitChange = async (value) => {
    setDailyLimit(value);
    await setLocal("bulk-lister-daily-limit", value);
  };

  const handleTimeDelayChange = async (value) => {
    setTimeDelay(value);
    await setLocal("bulk-lister-time-delay", value);
  };

  const updateDailyProgress = async (increment = 1) => {
    const today = new Date().toDateString();

    // Double-check for daily reset before updating
    const savedLastDate = await getLocal("bulk-lister-last-date");
    if (savedLastDate !== today) {
      console.log('⚠️ Daily reset detected during progress update - resetting first');
      await checkDailyReset();
      return;
    }

    const newProgress = Math.min(dailyProgress + increment, dailyLimit); // Cap at daily limit
    console.log('📊 Updating daily progress:', { current: dailyProgress, increment, new: newProgress, limit: dailyLimit });

    setDailyProgress(newProgress);
    await setLocal(`bulk-lister-daily-progress-${today}`, newProgress);
  };

  const hasReachedDailyLimit = () => {
    return dailyProgress >= dailyLimit;
  };

  const getRemainingListings = () => {
    return Math.max(0, dailyLimit - dailyProgress);
  };

  const checkDailyReset = async () => {
    const today = new Date().toDateString();
    const savedLastDate = await getLocal("bulk-lister-last-date");

    console.log('🔄 Checking daily reset:', { today, savedLastDate, isNewDay: savedLastDate !== today });

    if (savedLastDate !== today) {
      console.log('🆕 Daily reset triggered - resetting progress to 0');
      setDailyProgress(0);
      setLastListingDate(today);
      await setLocal(`bulk-lister-daily-progress-${today}`, 0);
      await setLocal("bulk-lister-last-date", today);

      // Show reset notification
      notification.info({
        message: "Daily Reset",
        description: "Daily listing progress has been reset for the new day.",
        duration: 4
      });
    }
  };

  const handleManualReset = async () => {
    const today = new Date().toDateString();
    setDailyProgress(0);
    await setLocal(`bulk-lister-daily-progress-${today}`, 0);

    notification.success({
      message: "Manual Reset Complete",
      description: "Daily progress has been manually reset to 0.",
      duration: 3
    });
  };

  const waitForDelay = async () => {
    if (timeDelay <= 0) return;

    setIsWaitingDelay(true);
    const delayMs = timeDelay * 60 * 1000; // Convert minutes to milliseconds
    const nextTime = new Date(Date.now() + delayMs);
    setNextListingTime(nextTime);

    // Update countdown every second
    const countdownInterval = setInterval(() => {
      const now = new Date();
      const remaining = Math.max(0, Math.ceil((nextTime - now) / 1000));
      setCountdown(remaining);

      if (remaining <= 0) {
        clearInterval(countdownInterval);
        setIsWaitingDelay(false);
        setNextListingTime(null);
        setCountdown(0);
      }
    }, 1000);

    await sleep(timeDelay * 60); // Wait for the delay period
    clearInterval(countdownInterval);
    setIsWaitingDelay(false);
    setNextListingTime(null);
    setCountdown(0);
  };

  const handlePause = async () => {
    setPauseLoading(true);
    setIsPaused(true);
    await setLocal("listing-status", "paused");
  };

  const handleSkipCurrentLink = async () => {
    // setPauseLoading(true);
    // setIsPaused(true);
    // await setLocal('listing-status', 'paused');
    await setLocal("listing-status", "error");
    await setLocal("listing-error", "this product skipped by user");
    // await sleep(2.5);
    // const tempLinks = [...linksRef.current];
    // tempLinks.splice(position, 1);
    // setLinks(tempLinks);
    // await sleep(2.5);
    // setPosition(prev => prev - 1);
    // setIsPaused(false);
    // handleListClick();
  };

  const handleResume = async () => {
    setIsPaused(false);
    handleListClick();
  };

  const handleReset = async () => {
    setTerminateLoading(true);
    await setLocal("listing-status", "terminated");
  };

  const columns = [
    {
      key: "Link",
      title: "Link",
      dataIndex: "link",
      width: 90,
      ellipsis: {
        showTitle: false,
      },
      render: (value, data) => {
        return (
          <Tooltip title={value}>
            <a
              href={data.value}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                chrome.runtime.sendMessage({
                  payload: {
                    url: value,
                    active: false,
                  },
                  callback: "openTab",
                });
              }}
            >
              {value}
            </a>
          </Tooltip>
        );
      },
    },
    {
      key: "Status",
      title: "Status",
      dataIndex: "status",
      width: 30,
      render: (value, record) => {
        const color = record.statusColor || 'black';
        return (
          <span style={{ color }}>
            {value}
          </span>
        );
      },
    },
    {
      key: "Error",
      title: "Error",
      dataIndex: "error",
      width: 80,
      ellipsis: {
        showTitle: false,
      },
      render: (value) => {
        return <Tooltip title={value}>{value}</Tooltip>;
      },
    },
  ];

  const styles = {
    numInput:
      "w-24 text-sm px-2 border rounded-lg border-neutral-500 bg-neutral-50 text-black",
  };

  return (
    <PagesLayout>
      <div className="w-full flex justify-center">
        <div className="container max-w-3xl">
          <div>
            <h1 className="font-bold text-2xl mb-2">Lister</h1>
            <h3 className="font-medium">
              Enter Amazon product links below, separated by new lines
            </h3>
          </div>
          <div>
            <TextArea
              value={links.join("\n")}
              onChange={(e) => {
                if (e.target.value) setLinks(e.target.value.split("\n"));
                else setLinks([]);
              }}
              className="bg-neutral-50 p-4 mt-2 max-h-80 h-40 w-full rounded-lg border"
            />

            {/* Daily Limit and Time Delay Controls */}
            <Card className="mt-4 bg-blue-50 border-blue-200">
              <div className="mb-4">
                <h4 className="font-semibold text-blue-800 mb-3">Daily Listing Controls</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">Daily Limit:</span>
                    <InputNumber
                      min={1}
                      max={1000}
                      value={dailyLimit}
                      onChange={handleDailyLimitChange}
                      className={styles.numInput}
                      placeholder="100"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">Delay (minutes):</span>
                    <InputNumber
                      min={0}
                      max={60}
                      value={timeDelay}
                      onChange={handleTimeDelayChange}
                      className={styles.numInput}
                      placeholder="2"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">Today's Progress:</span>
                    <div className="text-lg font-bold text-blue-600">
                      {dailyProgress} / {dailyLimit}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">Remaining Today:</span>
                    <div className="text-lg font-bold text-green-600">
                      {getRemainingListings()}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">Reset:</span>
                    <PageBtn
                      variant="red"
                      size="small"
                      onClick={handleManualReset}
                      disabled={isListing}
                    >
                      Reset Daily
                    </PageBtn>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Daily Progress</span>
                    <span className="text-sm text-gray-600">
                      {Math.round((dailyProgress / dailyLimit) * 100)}%
                    </span>
                  </div>
                  <Progress
                    percent={Math.round((dailyProgress / dailyLimit) * 100)}
                    status={hasReachedDailyLimit() ? "success" : "active"}
                    strokeColor={hasReachedDailyLimit() ? "#52c41a" : "#1890ff"}
                  />
                </div>

                {/* Countdown Timer */}
                {isWaitingDelay && nextListingTime && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-yellow-800">
                        Next listing in:
                      </span>
                      <span className="text-sm font-bold text-yellow-900">
                        {countdown > 60 ? `${Math.floor(countdown / 60)}m ${countdown % 60}s` : `${countdown}s`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Debug Info */}
                <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
                  <div>Today: {new Date().toDateString()}</div>
                  <div>Last Reset: {lastListingDate || 'Never'}</div>
                  <div>Limit Reached: {hasReachedDailyLimit() ? 'Yes' : 'No'}</div>
                  <div>Storage Key: bulk-lister-daily-progress-{new Date().toDateString()}</div>
                </div>
              </div>
            </Card>

            {/* Price and Other Filters */}
            <div className="flex gap-4 flex-wrap mt-4">
              <div className="flex items-center gap-2">
                <span>Min Price: </span>
                <InputNumber
                  min={1}
                  value={minPrice}
                  onChange={(val) => handlePriceChange("min", val)}
                  className={styles.numInput}
                />
              </div>
              <div className="flex items-center gap-2">
                <span>Max Price: </span>
                <InputNumber
                  min={1}
                  value={maxPrice}
                  onChange={(val) => handlePriceChange("max", val)}
                  className={styles.numInput}
                />
              </div>

            </div>

            <div className="flex flex-col gap-y-4 mt-8 mb-8 gap-x-4">
              <div className="flex items-center gap-2 text-4xl">
                <Checkbox
                  checked={ignoreVero}
                  onChange={async (ee) => handleIgnoreVeroChange(ee.target.checked)}
                >
                  Ignore VeRO Protection
                </Checkbox>
              </div>
              <div className="flex items-center gap-2 text-4xl">
                <Checkbox
                  checked={useNoBrandOptimizer}
                  onChange={async (ee) => handleNoBrandChange(ee.target.checked)}
                >
                  Use AI Title Optimizer (No Brand Name) Version?
                </Checkbox>
              </div>
              <div className="flex items-center gap-2 text-4xl">
                <Checkbox
                  checked={isFba}
                  onChange={async (ee) => handleFbaChange(ee.target.checked)}
                >
                  Require Prime/FBA Only
                </Checkbox>
              </div>
              <div className="flex items-center gap-2 text-4xl">
                <Checkbox
                  checked={closeListing}
                  onChange={async (ee) =>
                    handleCloseListingChange(ee.target.checked)
                  }
                >
                  Close Errored Listing
                </Checkbox>
              </div>
            </div>


            <div className="font-medium flex flex-wrap gap-3 mt-8 mb-8">
              <PageBtn
                variant="blue"
                disabled={!links.length || isPaused || hasReachedDailyLimit()}
                loading={isListing}
                onClick={handleListClick}
              >
                {hasReachedDailyLimit() ? "Daily Limit Reached" : "List"}
              </PageBtn>
              <PageBtn
                disabled={!isListing || isPaused}
                loading={pauseLoading}
                onClick={handlePause}
              >
                Pause
              </PageBtn>
              <PageBtn disabled={!isPaused} onClick={handleResume}>
                Resume
              </PageBtn>
              <PageBtn
                disabled={isListing || !links.length || isPaused}
                onClick={() => setLinks([])}
              >
                Clear Links
              </PageBtn>
              <PageBtn variant="blue" onClick={() => handleSkipCurrentLink()}>
                Skip Current Link
              </PageBtn>
              <PageBtn
                variant="red"
                disabled={!isListing || isPaused}
                loading={terminateLoading}
                onClick={handleReset}
              >
                Reset & Terminate
              </PageBtn>
            </div>


            {/* Queue Status */}
            <div className="flex">

              <div className="flex gap-6 items-center mt-8 ml-auto">
                <div className="text-center">
                  <div className="text-sm text-gray-600">Queue Progress</div>
                  <div className="text-lg font-bold">
                    {position} / {links.length}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Remaining</div>
                  <div className="text-lg font-bold text-orange-600">
                    {Math.max(0, links.length - position)}
                  </div>
                </div>
              </div>
            </div>



            {/* Queue Progress Bar */}
            {links.length > 0 && (
              <div className="mt-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Queue Progress</span>
                  <span className="text-sm text-gray-600">
                    {links.length ? round((position / links.length) * 100, 2) : 0}%
                  </span>
                </div>
                <Progress
                  percent={links.length ? round((position / links.length) * 100, 2) : 0}
                  status="active"
                  strokeColor="#722ed1"
                />
              </div>
            )}
            <div>
              <div className="flex justify-between items-center">
                <h3 className="font-medium mt-6 mb-2">
                  Add More Links To Running List
                </h3>
                <PageBtn
                  variant="blue"
                  disabled={!newLinks.length}
                  onClick={useCallback(() => {
                    setLinks((prev) => [...prev, ...newLinks]);
                    setNewLinks([]);
                  }, [links, newLinks])}
                >
                  Add
                </PageBtn>
              </div>
              <TextArea
                value={newLinks.join("\n")}
                onChange={(e) => {
                  if (e.target.value) setNewLinks(e.target.value.split("\n"));
                  else setNewLinks([]);
                }}
                className="bg-neutral-50 p-4 mt-2 max-h-40 h-20 w-full rounded-lg border"
              />
            </div>
          </div>
          <div>
            <h3 className="font-medium my-2">Status Report Table</h3>
            <div className="border rounded-lg">
              <ConfigProvider>
                <Table
                  columns={columns}
                  loading={false}
                  dataSource={report || []}
                  pagination={false}
                />
              </ConfigProvider>
            </div>
          </div>
        </div>
      </div>
    </PagesLayout>
  );

  return (
    <div className={classes.mainDiv}>
      <Row>
        <Title className={classes.header} level={2}>
          Lister
        </Title>
      </Row>
      <Row className={classes.box}>
        <Title level={5} style={{ marginTop: "0px", marginBottom: "0px" }}>
          Enter Amazon product links below, separated by new lines:
        </Title>
        <TextArea
          rows={10}
          value={links.join("\n")}
          onChange={(e) => {
            if (e.target.value) setLinks(e.target.value.split("\n"));
            else setLinks([]);
          }}
        />
        <Row className={classes.listingButtons}>
          <Button
            type="primary"
            disabled={!links.length || isPaused}
            loading={isListing}
            onClick={handleListClick}
          >
            List
          </Button>
          <Button
            type="primary"
            disabled={!isListing || isPaused}
            loading={pauseLoading}
            onClick={handlePause}
          >
            Pause
          </Button>
          <Button type="primary" disabled={!isPaused} onClick={handleResume}>
            Resume
          </Button>
          <Button
            danger
            type="primary"
            disabled={isListing || !links.length || isPaused}
            onClick={() => setLinks([])}
          >
            Clear Links
          </Button>
          <Button
            danger
            type="primary"
            disabled={!isListing || isPaused}
            loading={terminateLoading}
            onClick={handleReset}
          >
            Reset & Terminate
          </Button>
        </Row>
        <Row className={classes.listingButtons}>
          <Col>
            <Text className="!mb-0">Position: </Text>
            <InputNumber
              value={isListing ? position + 1 : position}
              disabled={true}
            />
            <Text className="!mb-0"> / {links.length}</Text>
          </Col>
          <Col>
            <Button type="primary" onClick={() => setReportModel(true)}>
              Status Report
            </Button>
          </Col>
          <Col>
            <Button type="primary" onClick={() => handleSkipCurrentLink()}>
              Skip Current Link
            </Button>
          </Col>
        </Row>
        {/* <Row className={classes.listingButtons}>
          <Col>
            <Text
              className='!mb-0'
            >
              Thread Count: {' '}
            </Text>
            <Select
              defaultValue={1}
              options={[
                {
                  label: '1',
                  value: 1
                },
                {
                  label: '2',
                  value: 2
                },
                {
                  label: '3',
                  value: 3
                }
              ]}
            />
          </Col>
        </Row> */}
        <Row
          style={{
            marginTop: "5px",
            gap: "5px",
          }}
        >
          <Col>
            <Text>Min Price: </Text>
            <InputNumber
              min={1}
              value={minPrice}
              onChange={(val) => handlePriceChange("min", val)}
            />
          </Col>
          <Col>
            <Text>Max Price: </Text>
            <InputNumber
              min={1}
              value={maxPrice}
              onChange={(val) => handlePriceChange("max", val)}
            />
          </Col>
        </Row>
        <Row style={{ marginTop: "10px" }}>
          <Col>
            <Checkbox
              checked={ignoreVero}
              onChange={async (ee) => handleIgnoreVeroChange(ee.target.checked)}
            >
              Ignore VeRO Protection
            </Checkbox>
          </Col>
        </Row>
        <Row style={{ marginTop: "10px" }}>
          <Col>
            <Checkbox
              checked={isFba}
              onChange={async (ee) => handleFbaChange(ee.target.checked)}
            >
              Require Prime/FBA Only
            </Checkbox>
          </Col>
        </Row>
        {/* <Checkbox
          checked={isFba}
          onChange={async (ee) => handleFbaChange(ee.target.checked)}
        >
          FBA Only
        </Checkbox> */}
        <Checkbox
          checked={closeListing}
          onChange={async (ee) => handleCloseListingChange(ee.target.checked)}
        >
          Close Errored Listing
        </Checkbox>
        <Row>
          <Text>
            Progress{" "}
            {links.length ? round((position / links.length) * 100, 2) : 0}%
          </Text>
        </Row>
        <Title level={5} style={{ marginTop: "0px", marginBottom: "0px" }}>
          Add more links to running list:
        </Title>
        <Row
          style={{
            alignItems: "center",
            justifyContent: "space-between",
            gap: "5px",
          }}
        >
          <TextArea
            rows={2}
            value={newLinks.join("\n")}
            onChange={(e) => {
              if (e.target.value) setNewLinks(e.target.value.split("\n"));
              else setNewLinks([]);
            }}
          />
          <Row style={{ gap: "5px" }}>
            {/* <Button type='primary' style={{ height: '26px', width: '60px' }}>Import</Button> */}
            <Button
              type="primary"
              style={{ height: "26px", width: "60px" }}
              disabled={!newLinks.length}
              onClick={useCallback(() => {
                setLinks((prev) => [...prev, ...newLinks]);
                setNewLinks([]);
              }, [links, newLinks])}
            >
              Add
            </Button>
          </Row>
        </Row>
      </Row>
      <Modal
        title="Status Report"
        className="create-location"
        centered
        width={800}
        open={reportModel}
        footer={null}
        onCancel={() => setReportModel(false)}
      >
        <Table
          style={{ height: "60vh" }}
          loading={false}
          columns={columns}
          dataSource={report || []}
          pagination={false}
          scroll={{ y: 500, x: 600 }}
        />
      </Modal>
    </div>
  );
};

export default BulkLister;
