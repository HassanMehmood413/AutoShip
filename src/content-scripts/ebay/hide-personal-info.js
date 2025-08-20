import { getLocal, onChange as onChangeLocalState } from '../../services/dbService';

console.log('\n *** Ebay Hide Perosnal Info Script Running ***');
onChangeLocalState('hide-personal-information', (_, newValue) => {
  if (newValue) {
    document.body.style.filter = 'blur(7px)';
  } else {
    document.body.style.filter = 'none';
  }
});

(async () => {
  const hidePeronalInfo = await getLocal('hide-personal-information');
  if (hidePeronalInfo) {
    document.body.style.filter = 'blur(7px)';
  } else {
    document.body.style.filter = 'none';
  }
})();
