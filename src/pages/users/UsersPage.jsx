import { useEffect, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import {
  Row,
  Col,
  Typography,
  Button,
  Table,
  Input,
  notification,
  Popconfirm,
  Modal
} from 'antd';

import {
  getLocal,
  onChange as onChangeLocalState
} from '../../services/dbService';

import './style.css';

const { Title, Text } = Typography;

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
    justifyContent: 'space-between'
  },
  permissionBox: {
    display: 'flex',
    justifyContent: 'center',
    fontSize: '45px'
  }
});

const Users = () => {
  const classes = useStyles();
  const [role, setRole] = useState('');
  const [userLoading, setUsersLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [addUserModal, setAddUserModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const checkUser = async () => {
    const user = await getLocal('user');
    if (user) {
      const { role } = user;
      setRole(role);
    } else {
      setRole('');
    }
  };

  const getAllUsers = async () => {
    setUsersLoading(true);
    const response = await chrome.runtime.sendMessage({
      payload: {},
      callback: 'getAllUsers'
    });
    if (response?.success) {
      const { users = [] } = response || {};
      setUsers(users);
    } else {
      notification.error({
        message: 'Fetching users failed',
        description: response.error
      });
    }
    setUsersLoading(false);
  };

  useEffect(() => {
    checkUser();
    onChangeLocalState('user', checkUser);
  }, []);

  useEffect(() => {
    if (role === 'admin') {
      getAllUsers();
    }
  }, [role]);

  const handleAddUser = async () => {
    setUsersLoading(true);
    const response = await chrome.runtime.sendMessage({
      payload: {
        name,
        email,
        password
      },
      callback: 'createUser'
    });
    if (response?.success) {
      handleModalClose();
      getAllUsers();
    } else {
      notification.error({
        message: 'Creating users failed',
        description: response.error
      });
    }
    setUsersLoading(false);
  };

  const handleStatusChange = async (userId, status) => {
    setUsersLoading(true);
    const response = await chrome.runtime.sendMessage({
      payload: {
        userId,
        status
      },
      callback: 'updateUserStatus'
    });
    if (response?.success) {
      getAllUsers();
    } else {
      notification.error({
        message: 'Updating user status failed',
        description: response.error
      });
    }
    setUsersLoading(false);
  };

  const handleModalClose = () => {
    setAddUserModal(false);
    setName('');
    setEmail('');
    setPassword('');
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 200
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 200
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 200,
      render: (value) => value?.toUpperCase() || ''
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, data) => {
        const { _id, status } = data;
        return (
          <Row>
            <Popconfirm
              title='Update User Status'
              description={`Are you sure to ${status === 'enabled' ? 'disable' : 'enable'} this user`}
              placement='left'
              disabled={['HOLD', 'SHIPPED'].includes(status)}
              onConfirm={() => handleStatusChange(_id, status === 'enabled' ? 'disabled' : 'enabled')}
              okText='Yes'
              cancelText='No'
            >
              <Button type='primary'>
                {status === 'enabled' ? 'Disable' : 'Enable'}
              </Button>
            </Popconfirm>
          </Row>
        );
      }
    }
  ];

  if (!role || role === 'user') {
    return (
      <div className={classes.permissionBox}>
        {
          !role ? 'Sign in to view all users' : 'You Do not have permission to view this page'
        }
      </div>
    );
  }

  return (
    <div className={classes.mainDiv}>
      <Row>
        <Title className={classes.header} level={2}>Users</Title>
      </Row>
      <Row className={classes.mainBox}>
        <Row className={classes.toolBar}>
          <Input
            placeholder='Search With Email'
            style={{ width: '50%' }}
          />
          <Button
            type='primary'
            onClick={() => setAddUserModal(true)}
          >
            Add User
          </Button>
        </Row>
        <Row
          style={{ height: 'calc(100% - 45px)' }}
        >
          <Table
            className='users-table'
            columns={columns}
            dataSource={users?.map((item, index) => ({ ...item, key: index }))}
            pagination={false}
            loading={userLoading}
            style={{
              width: '100%',
              marginTop: '10px'
            }}
          />
        </Row>
      </Row>
      <Modal
        title='Create Location'
        className='create-location'
        open={addUserModal}
        onOk={() => handleAddUser()}
        onCancel={() => handleModalClose()}
        okButtonProps={{
          disabled: (!name || !email || !password)
        }}
      >
        <Row
          style={{
            flexDirection: 'column',
            gap: '5px'
          }}
        >
          <Row gutter={16}>
            <Col span={24}>
              <Text>
                Name
              </Text>
              <Input
                placeholder='Please enter name'
                onChange={(e) => setName(e.target.value)}
              />
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Text>
                Email
              </Text>
              <Input
                placeholder='Please enter email'
                type='email'
                onChange={(e) => setEmail(e.target.value)}
              />
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Text>
                Password
              </Text>
              <Input
                placeholder='Please enter password'
                onChange={(e) => setPassword(e.target.value)}
              />
            </Col>
          </Row>
        </Row>
      </Modal>
    </div >
  );
};

export default Users;
