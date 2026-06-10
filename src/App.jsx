/**
 * App.jsx — root component.
 *
 * Manages authentication (JWT), the Socket.io connection, and top-level
 * race state. Race simulation now runs server-side; this component
 * receives race events via the socket and routes them to child components.
 *
 * @author  Simon Rundell for CodeMonkey Design Ltd.
 * @license CC BY-NC-SA 4.0
 */

import { useState, useEffect } from 'react';
import './App.css';
import axios     from 'axios';
import { message } from 'antd';
import { io }    from 'socket.io-client';

import CreateRace from './createRace';
import NextRaces  from './nextRaces';
import RunRace    from './RunRace';
import { metresToFurlongs, removeTextInBrackets, capitalizeFirstLetter } from './common';
import Login      from './login';
import UserStatus from './userStatus';

/**
 * Full-width bar showing a live digital clock and a countdown to the next race.
 * @param {object}  props
 * @param {string|null} props.nextRaceTime - ISO/MySQL datetime string of the next race
 * @param {boolean}     props.raceActive   - true while a race is in progress
 */
function ClockBar({ nextRaceTime, raceActive }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = now.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });

  let countdownNode = null;
  if (raceActive) {
    countdownNode = <span className="countdown-value">Race in progress</span>;
  } else if (nextRaceTime) {
    const diff = new Date(nextRaceTime) - now;
    if (diff > 0) {
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      countdownNode = (
        <>Next race in{' '}
          <span className="countdown-value">
            {mins}:{String(secs).padStart(2, '0')}
          </span>
        </>
      );
    } else {
      countdownNode = <span className="countdown-value">Starting&hellip;</span>;
    }
  }

  return (
    <div className="clock-bar">
      <div className="digital-clock">{timeStr}</div>
      {countdownNode && <div className="countdown-display">{countdownNode}</div>}
    </div>
  );
}

/** Decode JWT payload without verification to restore session from localStorage. */
function decodeToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return (payload.exp && Date.now() / 1000 > payload.exp) ? null : payload;
  } catch {
    return null;
  }
}

function App() {
  const [config,       setConfig]       = useState(null);
  const [messageApi,   contextHolder]   = message.useMessage();
  const [updateList,   setUpdateList]   = useState(false);
  const [activeRace,   setActiveRace]   = useState(null);
  const [raceResults,  setRaceResults]  = useState([]);
  const [triggerBets,  setTriggerBets]  = useState(false);
  const [socket,       setSocket]       = useState(null);
  const [nextRaceTime, setNextRaceTime] = useState(null);

  // Seed from decoded JWT payload; wallet is refreshed from /auth/me below
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = localStorage.getItem('adatr_token');
    if (!stored) return null;
    const d = decodeToken(stored);
    return d ? { id: d.id, email: d.email, nickname: d.nickname, admin: d.admin, wallet: 0 } : null;
  });

  // Restore session from localStorage on first load (lazy initialisers run once)
  const [token, setToken] = useState(() => {
    const stored = localStorage.getItem('adatr_token');
    if (!stored || !decodeToken(stored)) {
      localStorage.removeItem('adatr_token');
      return null;
    }
    axios.defaults.headers.common['Authorization'] = `Bearer ${stored}`;
    return stored;
  });

  // Load public config
  useEffect(() => {
    axios.get('/.config.json')
      .then(r => setConfig(r.data))
      .catch(() => messageApi.error('Failed to load configuration'));
  }, []);

  // Refresh wallet (and validate token) once config is ready
  useEffect(() => {
    if (!token || !config) return;
    axios.get(config.api + '/auth/me')
      .then(r => setCurrentUser(r.data))
      .catch(() => handleLogout());
  }, [config?.api, token]);

  // Create / destroy Socket.io connection when token or config changes
  useEffect(() => {
    if (!token || !config) return;
    const s = io(config.socketUrl, { auth: { token } });
    setSocket(s);
    return () => { s.disconnect(); setSocket(null); };
  }, [token, config?.socketUrl]);

  // Global socket events
  useEffect(() => {
    if (!socket) return;

    socket.on('race:starting', (raceInfo) => {
      setRaceResults([]);
      setActiveRace({
        id:         raceInfo.raceID,
        racecourse: raceInfo.racecourse,
        raceover:   raceInfo.raceover,
        distance:   raceInfo.distance,
        going:      raceInfo.going,
        racetime:   raceInfo.racetime,
        runners:    raceInfo.runners,
      });
    });

    socket.on('race:pool-updated', () => setUpdateList(u => !u));

    return () => {
      socket.off('race:starting');
      socket.off('race:pool-updated');
    };
  }, [socket]);

  const handleLogin = (user, userToken) => {
    localStorage.setItem('adatr_token', userToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
    setToken(userToken);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('adatr_token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setCurrentUser(null);
    setActiveRace(null);
    setRaceResults([]);
  };

  const finishRace = () => {
    setActiveRace(null);
    setRaceResults([]);
  };

  return (
    <>
      {contextHolder}
      {config ? (
        currentUser ? (
          <div>
            <div className="header-container">
              <h1>{config.appName}</h1>
              {currentUser.admin === 1 && (
                <span className="horiz-buttons">
                  <CreateRace config={config} />
                </span>
              )}
              <img src="/assets/adatr_logo_transparent.png" alt="Logo" className="head-logo" />
            </div>

            <ClockBar nextRaceTime={nextRaceTime} raceActive={!!activeRace} />

            {activeRace && (
              <>
                <div className="main-container">
                  {activeRace.racecourse} &nbsp;
                  {capitalizeFirstLetter(activeRace.raceover)} &nbsp;
                  {metresToFurlongs(activeRace.distance)}f &nbsp;
                  {activeRace.going}
                </div>
                <div className="main-container">
                  <RunRace
                    key={activeRace.id}
                    socket={socket}
                    activeRace={activeRace}
                    setRaceResults={setRaceResults}
                    currentUser={currentUser}
                    setCurrentUser={setCurrentUser}
                  />
                </div>
              </>
            )}

            <div className="main-container">
              <NextRaces
                config={config}
                updateList={updateList}
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
                triggerBets={triggerBets}
                setTriggerBets={setTriggerBets}
                setNextRaceTime={setNextRaceTime}
              />
            </div>

            {raceResults.length > 0 && (
              <div className="results-container">
                <div className="results-header">
                  <img src="/assets/trophy.png" alt="Trophy" className="trophy" />
                  <h1>Results</h1>
                </div>
                <span className="close right" onClick={finishRace}>&times;</span>
                <div>
                  {activeRace?.racecourse} &nbsp;
                  {activeRace && capitalizeFirstLetter(activeRace.raceover)} &nbsp;
                  {activeRace && metresToFurlongs(activeRace.distance)}f &nbsp;
                  Going: {activeRace?.going}
                </div>
                {raceResults.map((result, i) => (
                  <p className="resultsheet" key={i}>
                    {`${result.place}: ${removeTextInBrackets(result.name)}`}
                    <span className="box">{result.rating}</span>
                    <span>{result.odds}</span>
                  </p>
                ))}
              </div>
            )}

            <UserStatus
              config={config}
              currentUser={currentUser}
              setCurrentUser={handleLogout}
              triggerBets={triggerBets}
            />
          </div>
        ) : (
          <Login config={config} onLogin={handleLogin} />
        )
      ) : (
        <p>Loading configuration...</p>
      )}
    </>
  );
}

export default App;
