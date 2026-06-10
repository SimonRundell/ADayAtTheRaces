/**
 * register.jsx — new user registration form.
 *
 * @author  Simon Rundell for CodeMonkey Design Ltd.
 * @license CC BY-NC-SA 4.0
 */

import { useState } from 'react';
import axios        from 'axios';
import { message }  from 'antd';

function Register({ config, setShowRegister }) {
  const [email,      setEmail]    = useState('');
  const [password,   setPassword] = useState('');
  const [nickname,   setNickname] = useState('');
  const [messageApi, contextHolder] = message.useMessage();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || !nickname) {
      messageApi.error('Please fill in all fields');
      return;
    }
    try {
      await axios.post(config.api + '/auth/register', { email, password, nickname });
      messageApi.success('Registration successful — please log in');
      setTimeout(() => setShowRegister(false), 1500);
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Registration failed';
      messageApi.error(msg);
    }
  };

  return (
    <>
      {contextHolder}
      <div className="login-container">
        <div className="login-header">
          <p>{config.appName}</p>
          <img src="/assets/adatr_logo_transparent.png" alt="Logo" className="head-logo" />
        </div>
        <div className="login-form">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email}
                onChange={e => setEmail(e.target.value)} placeholder="Email" />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={password}
                onChange={e => setPassword(e.target.value)} placeholder="Password" />
            </div>
            <div className="form-group">
              <label>Nickname</label>
              <input type="text" value={nickname}
                onChange={e => setNickname(e.target.value)} placeholder="Nickname" />
            </div>
            <div className="form-group-button">
              <button type="submit">Register</button>
              <button type="button" className="smalltop"
                onClick={() => setShowRegister(false)}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default Register;
