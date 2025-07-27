import { useState } from 'react';
import axios from 'axios';
import { message } from 'antd';
import CryptoJS from 'crypto-js';

function Register({ config, setShowRegister }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nickname, setNickname] = useState('');
    const [messageApi, contextHolder] = message.useMessage();

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Hash the password with MD5

        if (email === '' || password === '' || nickname === '') {
            message.error('Please fill in all fields');
            return;
        }

        const hashedPassword = CryptoJS.MD5(password).toString();

        const jsonData = { email: email, passwordHash: hashedPassword, nickname: nickname };
        console.log("JSONData:", jsonData);
        const response = await axios.post(config.api + '/insertUser.php', jsonData);
        const data = response.data;
        message.success(data.message);
        setShowRegister(false);

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
                            <label>eMail</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email"
                            />
                        </div>
                        <div className='form-group'>
                            <label>Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                            />
                        </div>
                        <div className='form-group'>
                            <label>Nickname</label>
                            <input
                                type="text"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                placeholder="Nickname"
                            />
                        </div>
                        <div className='form-group-button'>
                            <button type="submit">Register</button>
                            <button type="button" className="smalltop" onClick={() => setShowRegister(false)}>Cancel</button>
                        </div>
                    </form>
                </div>
            </div> 
        </>
    );
}

export default Register;