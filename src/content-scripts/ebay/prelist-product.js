
import { setLocal, onChange, getLocal } from '../../services/dbService';
import { sleep } from '../../services/utils';

console.log('\n *** Ebay Pre-List Product Page Script Running ***');

window.addEventListener('load', async function () {
  const response = await chrome.runtime.sendMessage({
    callback: 'checkUser'
  });

  if (response.success) {
    preListProduct();
  } else {
    console.log('\n ### User is not logged in or not enable ###');
  }
});

onChange('listing-status', async (_, newValue) => {
  if (newValue === 'paused' || newValue === 'terminated') {
    await chrome.runtime.sendMessage({
      callback: 'closeTab'
    });
    window.close();
    return;
  }
  if (newValue === 'error') {
    // check if close error listing enable
    const isBulkListing = await getLocal('is-bulk-listing');
    const closeTab = await getLocal('bulk-lister-close-listing');
    if (isBulkListing && closeTab) {
      await chrome.runtime.sendMessage({
        callback: 'closeTab'
      });
      window.close();
      return;
    }
  }
});

const preListProduct = async () => {
  console.log('eBay pre-list product fully loaded!');
  let alreadycheck = false
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const automation = urlParams.get('automation');
    if (automation) {
      const newWithTags = Array.from(
        document.querySelectorAll('ul.condition-button-list button.condition-button')
      ).find(btn => {
        const lbl = btn.querySelector('span.bold-text.medium-text');
        return lbl && lbl.textContent.trim().toLowerCase() === 'new with tags';
      });

      if (newWithTags) {
        newWithTags.click();
        console.log('✅ Clicked “New with tags”');
        setTimeout(() => {
          const cont = document.querySelector(
            'button.prelist-radix__condition-grading-cta.btn--primary'
          );
          if (cont) {
            cont.click();
            console.log('✅ Clicked “Continue”');
            alreadycheck = true
          } else {
            console.warn('⚠️ “Continue” button not found');
          }
        }, 300);
      }

      else if (!newWithTags) {
        console.log('⚠️ “New with tags” button not found');
        setTimeout(() => {
          const continuePrimary = document.querySelector(
            'button.prelist-radix__condition-grading-cta.btn--primary'
          );
          const continueFallback = document.querySelector(
            'button.prelist-radix__next-action.btn--secondary'
          );
          const toClick = continuePrimary || continueFallback;

          if (toClick) {
            toClick.click();
            console.log('✅ Clicked →', toClick.textContent.trim());
          } else {
            console.warn('⚠️ Neither Continue nor Continue without match was found');
          }
        }, 500);
        const newWithTags = Array.from(
          document.querySelectorAll('ul.condition-button-list button.condition-button')
        ).find(btn => {
          const lbl = btn.querySelector('span.bold-text.medium-text');
          return lbl && lbl.textContent.trim().toLowerCase() === 'new with tags';
        });
        if (newWithTags) {
          newWithTags.click();
          console.log('✅ Clicked “New with tags”');
          setTimeout(() => {
            const cont = document.querySelector(
              'button.prelist-radix__condition-grading-cta.btn--primary'
            );
            if (cont) {
              cont.click();
              console.log('✅ Clicked “Continue”');
              alreadycheck = true
            } else {
              console.warn('⚠️ “Continue” button not found');
            }
          }, 300);
        }
      }

    };

    // check if continue button exist
    console.log("CHECK IF CONTINUE BUTTON EXIST")

    let continueButton = document.querySelector('.prelist-radix__next-action');
    if (continueButton) await continueButton.click();


    // checking if asked for select category
    console.log('CHECKING IF ASKED FOR SELECT CATEGORY')
    const categoryDiv = document.querySelector('.category-picker');
    if (categoryDiv) {
      const categoryButtons = categoryDiv.querySelectorAll('.category-picker__suggested-section .se-field-card__body');
      if (categoryButtons?.length) {
        await categoryButtons[0].click();
      }
    }

    await sleep(5);
    continueButton = document.querySelector('.prelist-radix__next-action');
    if (continueButton) await continueButton.click();
    // selecting condition
    let conditionBox = null;
    while (!conditionBox) {
      conditionBox = document.querySelector('.condition-picker-radix');
      await sleep(1);
    }
    let conditionCheckboxes = conditionBox.querySelectorAll('.se-radio-group__option');
    conditionCheckboxes = [...conditionCheckboxes];
    conditionCheckboxes = conditionCheckboxes.filter(item => item.innerText.includes('New'));
    const newCondition = conditionCheckboxes?.[0] || null;
    // let newCondition = conditionCheckboxes.find(item => item.innerText === 'New');
    // if (!newCondition) {
    //   newCondition = conditionCheckboxes.find(item => item.innerText === 'New with box');
    // }
    if (newCondition) {
      await newCondition?.querySelector('input')?.click();

      const listingStatus = await getLocal('listing-status');
      if (listingStatus === 'paused' || listingStatus === 'terminated') {
        await chrome.runtime.sendMessage({
          callback: 'closeTab'
        });
        window.close();
        return;
      }

      // continue to listing button
      let continueListingButton = document.querySelector('.condition-dialog-radix__continue-btn');
      if (continueListingButton) {
        await sleep(.1);
        await continueListingButton.click();
      } else {
        continueListingButton = document.querySelector('.condition-dialog-non-block-radix__continue-btn');
        await sleep(.1);
        await continueListingButton.click();
      }

    }
  } catch (error) {
    await setLocal('listing-status', 'error');
    await setLocal('listing-error', error.message);
    const isBulkListing = await getLocal('is-bulk-listing');
    const closeTab = await getLocal('bulk-lister-close-listing');
    // check if close error listing enable
    if (isBulkListing && closeTab) {
      await chrome.runtime.sendMessage({
        callback: 'closeTab'
      });
      window.close();
    }
  }
};
