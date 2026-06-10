/**
 * userStatus.jsx — fixed footer showing wallet balance, open bets, and
 * a history of settled bets with profit/loss figures.
 *
 * @author  Simon Rundell for CodeMonkey Design Ltd.
 * @license CC BY-NC-SA 4.0
 */

import { useState, useEffect } from 'react';
import axios        from 'axios';
import { Drawer, message } from 'antd';
import { removeTextInBrackets, stripRacecourse } from './common';

/** Return "1st", "2nd", "3rd", "4th", etc. */
const ordinal = n => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

function UserStatus({ config, currentUser, setCurrentUser, triggerBets }) {
  const [messageApi,   contextHolder] = message.useMessage();
  const [currentBets,  setCurrentBets]  = useState([]);
  const [pastBets,     setPastBets]     = useState([]);
  const [showBets,     setShowBets]     = useState(false);

  useEffect(() => {
    const fetchBets = async () => {
      const [openResult, pastResult] = await Promise.allSettled([
        axios.get(config.api + '/races/bets'),
        axios.get(config.api + '/races/past-bets'),
      ]);

      if (openResult.status === 'fulfilled') {
        setCurrentBets(Array.isArray(openResult.value.data) ? openResult.value.data : []);
      } else {
        messageApi.error('Failed to fetch open bets');
      }

      if (pastResult.status === 'fulfilled') {
        setPastBets(Array.isArray(pastResult.value.data) ? pastResult.value.data : []);
      }
      // Past-bets failure is silent — it does not block the open-bets display
    };
    fetchBets();
  }, [config, currentUser, triggerBets]);

  const formatTime = (dt) => {
    if (!dt) return '';
    const d = new Date(dt);
    return isNaN(d) ? dt : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {contextHolder}
      {currentUser && (
        <>
          <div className="fixedMessage">
            Welcome {currentUser.nickname},
            {currentUser.admin === 1 ? ' (Admin) ' : ' '}
            Balance: £{parseFloat(currentUser.wallet).toFixed(2)}
            <span>
              <button onClick={() => setShowBets(true)} className="smallgap">Open Bets</button>
            </span>
            <span className="close" onClick={setCurrentUser}>&times;</span>
          </div>

          <Drawer title="Your Bets" onClose={() => setShowBets(false)} open={showBets}>

            {/* ── Open bets ──────────────────────────────────── */}
            <h4 className="drawer-section-head">Open Bets</h4>
            {currentBets.length === 0 ? (
              <p className="drawer-empty">No open bets.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Racecourse</th>
                    <th>Time</th>
                    <th>Horse</th>
                    <th>Stake</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {currentBets.map((bet, i) => (
                    <tr key={bet.id ?? i}>
                      <td>{stripRacecourse(bet.racecourse)}</td>
                      <td>{formatTime(bet.racetime)}</td>
                      <td>{removeTextInBrackets(bet.horseName)}</td>
                      <td>£{parseFloat(bet.stake).toFixed(2)}</td>
                      <td>{bet.ew ? 'E/W' : 'Win'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <hr className="drawer-divider" />

            {/* ── Past bets ──────────────────────────────────── */}
            <h4 className="drawer-section-head">Past Bets</h4>
            {pastBets.length === 0 ? (
              <p className="drawer-empty">No settled bets yet.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Race</th>
                    <th>Horse</th>
                    <th>Stake</th>
                    <th>Pos</th>
                    <th>Returns</th>
                    <th>Net</th>
                  </tr>
                </thead>
                <tbody>
                  {pastBets.map(bet => (
                    <tr key={bet.id}>
                      <td>
                        {stripRacecourse(bet.racecourse)}<br />
                        <span className="time-small">{formatTime(bet.racetime)}</span>
                      </td>
                      <td>
                        {removeTextInBrackets(bet.horseName)}<br />
                        <span className="time-small">{bet.ew ? 'E/W' : 'Win'} @ {bet.odds ?? '—'}</span>
                      </td>
                      <td>£{bet.stake.toFixed(2)}</td>
                      <td>{bet.place ? ordinal(bet.place) : <span className="loss">U/P</span>}</td>
                      <td>{bet.returns > 0 ? `£${bet.returns.toFixed(2)}` : '—'}</td>
                      <td className={bet.net >= 0 ? 'profit' : 'loss'}>
                        {bet.net >= 0 ? '+' : ''}£{Math.abs(bet.net).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <hr className="drawer-divider" />
            <p>Wallet: £{parseFloat(currentUser.wallet).toFixed(2)}</p>
          </Drawer>
        </>
      )}
    </>
  );
}

export default UserStatus;
