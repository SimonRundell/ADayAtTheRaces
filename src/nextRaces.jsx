/**
 * nextRaces.jsx — upcoming race card with bet placement and race start.
 *
 * Race start triggers the server-side engine which broadcasts to all
 * connected clients via Socket.io. Bet placement and fund deduction
 * happen atomically in the REST endpoint.
 *
 * @author  Simon Rundell for CodeMonkey Design Ltd.
 * @license CC BY-NC-SA 4.0
 */

import { useState, useEffect } from 'react';
import { message }             from 'antd';
import {
  metresToFurlongs, stripRacecourse,
  removeTextInBrackets, calculateOdds, capitalizeFirstLetter,
} from './common.js';
import axios from 'axios';

function NextRaces({ config, updateList, currentUser, setCurrentUser, triggerBets, setTriggerBets, setNextRaceTime }) {
  const [nextRaces,     setNextRaces]     = useState([]);
  const [messageApi,    contextHolder]    = message.useMessage();
  const [showRaceModal, setShowRaceModal] = useState(false);
  const [currentRace,   setCurrentRace]   = useState(null);
  const [showBetModal,  setShowBetModal]  = useState(false);
  const [betRunner,     setBetRunner]     = useState(null);
  const [ewBet,         setEwBet]         = useState(false);
  const [stake,         setStake]         = useState(0);
  const [hoveredRunner, setHoveredRunner] = useState(null);

  const formatRaceTime = (dt) => {
    if (!dt) return '';
    const d = new Date(dt);
    return isNaN(d) ? dt : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    const fetchNextRaces = async () => {
      try {
        const { data } = await axios.get(config.api + '/races/card');
        setNextRaces(data);
        setNextRaceTime?.(data[0]?.racetime ?? null);
      } catch {
        messageApi.error('Error fetching race card');
      }
    };
    fetchNextRaces();
  }, [updateList]);

  const showRaceDetails = (race) => {
    const updatedRunners = calculateOdds(race.runners, race.raceover);
    setCurrentRace({ ...race, runners: updatedRunners });
    setShowRaceModal(true);
  };

  const placeBet = (runner) => {
    setBetRunner(runner);
    setShowBetModal(true);
  };

  const closeBetModal = () => {
    setShowBetModal(false);
    setBetRunner(null);
    setStake(0);
    setEwBet(false);
  };

  const confirmBet = async () => {
    const betTotal = ewBet ? stake * 2 : stake;
    try {
      const { data } = await axios.post(config.api + '/races/bet', {
        raceID:  currentRace.id,
        horseID: betRunner.id,
        stake:   betTotal,
        ew:      ewBet,
      });
      setCurrentUser(prev => ({ ...prev, wallet: data.wallet }));
      messageApi.success('Bet placed');
      closeBetModal();
      setTriggerBets(t => !t);
    } catch (err) {
      messageApi.error(err.response?.data?.message ?? 'Error placing bet');
    }
  };

  return (
    <>
      {contextHolder}
      {nextRaces.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Racecourse</th>
              <th>Time</th>
              <th>Type</th>
              <th>Distance</th>
              <th>Going</th>
              <th>Runners</th>
            </tr>
          </thead>
          <tbody>
            {nextRaces.map(race => (
              <tr key={race.id}>
                <td>
                  {race.id}<br />
                  <span className="smallpad rctitle">{stripRacecourse(race.racecourse)}</span>
                  <span className="smallpad">
                    <button onClick={() => showRaceDetails(race)}>Race Details &amp; Bets</button>
                  </span>
                </td>
                <td>{formatRaceTime(race.racetime)}</td>
                <td>{capitalizeFirstLetter(race.raceover)}</td>
                <td>{metresToFurlongs(race.distance)} f</td>
                <td>{race.going}</td>
                <td>
                  <ul>
                    {race.runners.map((runner, i) => (
                      <li key={i}>{removeTextInBrackets(runner.horseName)}</li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No races listed</p>
      )}

      {/* ── Race details & bet modal ─────────────────────────────── */}
      {showRaceModal && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={() => setShowRaceModal(false)}>&times;</span>
            <h2>{stripRacecourse(currentRace.racecourse)} — {formatRaceTime(currentRace.racetime)}</h2>
            <p>
              {capitalizeFirstLetter(currentRace.raceover)} over {metresToFurlongs(currentRace.distance)}f
              &nbsp;&nbsp;<strong>Going:</strong> {currentRace.going}
            </p>
            <table>
              <thead>
                <tr><th>Name</th><th>Rating</th><th>Odds</th><th>Place Bet</th></tr>
              </thead>
              <tbody>
                {currentRace.runners.map((runner, i) => (
                  <tr key={i}>
                    <td
                      onMouseEnter={() => setHoveredRunner(runner.id)}
                      onMouseLeave={() => setHoveredRunner(null)}
                    >
                      {runner.horseName}
                      {runner.form ? ` — ${runner.form.join(',')}` : ''}
                      <div className={`runner-details ${hoveredRunner === runner.id ? 'show' : ''}`}>
                        <table><tbody>
                          {currentUser?.admin === 1 && (
                            <>
                              <tr><td><strong>ID:</strong></td><td>{runner.id}</td></tr>
                              <tr>
                                <td><strong>Rating:</strong></td>
                                <td>
                                  {runner.horseFlatRating  ? <span className="smallgap">Flat: {runner.horseFlatRating}</span>  : null}
                                  {runner.horseChaseRating ? <span className="smallgap">Chase: {runner.horseChaseRating}</span> : null}
                                  {runner.horseHurdleRating? <span className="smallgap">Hurdle: {runner.horseHurdleRating}</span>: null}
                                </td>
                              </tr>
                            </>
                          )}
                          <tr><td><strong>Age:</strong></td><td>{runner.horseYear}</td></tr>
                          <tr><td><strong>Sex:</strong></td><td>{runner.horseSex}</td></tr>
                          <tr><td><strong>Trainer:</strong></td><td>{runner.horseTrainer}</td></tr>
                          <tr><td><strong>Dam:</strong></td><td>{runner.horseDam}</td></tr>
                          <tr><td><strong>Sire:</strong></td><td>{runner.horseSire}</td></tr>
                        </tbody></table>
                      </div>
                    </td>
                    <td>
                      {currentRace.raceover === 'flat'   && runner.horseFlatRating}
                      {currentRace.raceover === 'chase'  && runner.horseChaseRating}
                      {currentRace.raceover === 'hurdle' && runner.horseHurdleRating}
                    </td>
                    <td>{runner.odds}</td>
                    <td><button onClick={() => placeBet(runner)}>Place Bet</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Bet placement modal ──────────────────────────────────── */}
      {showBetModal && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={closeBetModal}>&times;</span>
            <p className="resultsheet">
              Place Bet on {removeTextInBrackets(betRunner.horseName)} at {betRunner.odds}
            </p>
            <table className="bet-form"><tbody>
              <tr>
                <td className="noborder">Stake:</td>
                <td className="noborder">
                  <div className="input-group">
                    £ <input type="text" placeholder="0.00"
                        onChange={e => setStake(parseFloat(e.target.value) || 0)} />
                  </div>
                </td>
              </tr>
              <tr>
                <td className="noborder">Each Way?</td>
                <td className="noborder">
                  <input type="checkbox" onChange={e => setEwBet(e.target.checked)} />
                </td>
              </tr>
              <tr>
                <td>Total:</td>
                <td className="noborder">
                  <span className="texttype">£ {(ewBet ? stake * 2 : stake).toFixed(2)}</span>
                </td>
              </tr>
              <tr className="noborder">
                <td colSpan="2" className="form-group-button noborder">
                  <button onClick={confirmBet}>Place Bet</button>
                </td>
              </tr>
            </tbody></table>
          </div>
        </div>
      )}
    </>
  );
}

export default NextRaces;
