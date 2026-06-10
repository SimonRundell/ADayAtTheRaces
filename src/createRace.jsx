/**
 * createRace.jsx — admin panel for race pool management.
 *
 * Race generation now happens server-side. This component
 * is just a trigger button that calls the admin topup endpoint.
 *
 * @author  Simon Rundell for CodeMonkey Design Ltd.
 * @license CC BY-NC-SA 4.0
 */

import { useState } from 'react';
import axios        from 'axios';
import { message }  from 'antd';

const CreateRace = ({ config }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [busy,       setBusy]       = useState(false);

  const fillPool = async () => {
    setBusy(true);
    try {
      const { data } = await axios.post(config.api + '/admin/topup');
      messageApi.success(data.message);
    } catch (err) {
      messageApi.error(err.response?.data?.message ?? 'Error filling race pool');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {contextHolder}
      {/* <button onClick={fillPool} disabled={busy}>
        {busy ? 'Filling…' : 'Fill Race Pool'}
      </button> */}
    </>
  );
};

export default CreateRace;
