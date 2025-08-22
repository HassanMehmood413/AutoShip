import { makeStyles } from '@material-ui/core/styles';
import {
  Row,
  Typography,
  Input,
  Button
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { getLocal, setLocal } from '../../services/dbService';

const { Title } = Typography;
const { TextArea } = Input;

const useStyles = makeStyles({
  mainDiv: {
    height: '98%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    background: '#f6f6f6'
  },
  header: {
    marginTop: '1px'
  },
  mainBox: {
    height: 'calc(100% - 70px)',
    gap: '10px',
    flexDirection: 'column',
    width: '1200px',
    background: 'white',
    padding: '15px',
    borderRadius: '5px',
    boxShadow: '0 0 5px rgba(0,0,0,0.1)'
  },
  toolBar: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: '5px'
  },
  permissionBox: {
    display: 'flex',
    justifyContent: 'center',
    fontSize: '45px'
  }
});

const VeroBrands = () => {
  const classes = useStyles();
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    (async () => {
      const localBrands = await getLocal('vero-brands');
      if (localBrands.length) {
        setBrands(localBrands);
      }
    })();
  }, []);

  const handleSave = useCallback(async () => {
    let tempBrands = [...brands];
    tempBrands = [...new Set(tempBrands)];
    await setLocal('vero-brands', tempBrands);
    setBrands(tempBrands);
  }, [brands]);

  const isAdmin = true;
  if (!isAdmin) {
    return (
      <div className={classes.permissionBox}>
        You Do not have permission to view this page
      </div>
    );
  }

  return (
    <div className={classes.mainDiv}>
      <Row>
        <Title className={classes.header} level={2}>Vero Brands</Title>
      </Row>
      <Row className={classes.mainBox}>
        <Row className={classes.toolBar}>
          {/* <Button>Get</Button> */}
          <Button
            onClick={handleSave}
          >
            Save
          </Button>
        </Row>
        <TextArea
          style={{ height: '85%' }}
          value={brands.join('\n')}
          onChange={(e) => {
            if (e.target.value) setBrands(e.target.value.split('\n'));
            else setBrands([]);
          }}
        />
      </Row>
    </div>
  );
};

export default VeroBrands;
