/**
 * login.jsx — email/password login form.
 *
 * Sends plain-text credentials (HTTPS in production); the server
 * handles bcrypt comparison and returns a signed JWT.
 *
 * @author  Simon Rundell for CodeMonkey Design Ltd.
 * @license CC BY-NC-SA 4.0
 */

import React, { useState } from 'react';
import { Modal, message, Spin } from 'antd';
import axios    from 'axios';
import Register from './register';

const Login = ({ config, onLogin }) => {
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [failedLogin,  setFailedLogin]  = useState(false);
  const [messageApi,   contextHolder]   = message.useMessage();
  const [isLoading,    setIsLoading]    = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data } = await axios.post(config.api + '/auth/login', { email, password });
      onLogin(data.user, data.token);
    } catch (err) {
      setFailedLogin(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {isLoading && (
        <div className="central-overlay-spinner">
          <div className="spinner-content"><Spin size="large" /></div>
        </div>
      )}
      {contextHolder}
      <Modal
        title="Login Failed"
        centered
        open={failedLogin}
        footer={null}
        onCancel={() => setFailedLogin(false)}
      >
        <p>Sorry, your login failed. Please check your email and password.</p>
        <button onClick={() => setFailedLogin(false)}>OK</button>
      </Modal>

      {showRegister ? (
        <Register config={config} setShowRegister={setShowRegister} />
      ) : (
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
              <div className="form-group-button">
                <button type="submit">Login</button>
              </div>
            </form>
            <button onClick={() => setShowRegister(true)}>Register (free)</button>
          </div>
          <p className="small">
            This is a game for entertainment purposes only. No real money is involved.
            <br /><strong>Please gamble responsibly in the real world.</strong><br />
            Horses and their ratings/odds are based on real horses but are not real in this game.
          </p>
        </div>
      )}
    </>
  );
};

export default Login;
