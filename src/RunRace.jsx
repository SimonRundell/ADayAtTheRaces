/**
 * RunRace.jsx — live race viewer.
 *
 * The simulation runs entirely on the server. This component is a pure
 * receiver: it listens to Socket.io events, renders the animated horse
 * positions, and shows a winnings modal when the user has won.
 *
 * @author  Simon Rundell for CodeMonkey Design Ltd.
 * @license CC BY-NC-SA 4.0
 */

import { useState, useEffect } from 'react';
import { removeTextInBrackets } from './common';

/**
 * @param {object}   props
 * @param {object}   props.socket        - Socket.io client instance
 * @param {object}   props.activeRace    - race object (id, runners, distance, …)
 * @param {Function} props.setRaceResults
 * @param {object}   props.currentUser
 * @param {Function} props.setCurrentUser
 */
const RunRace = ({ socket, activeRace, setRaceResults, currentUser, setCurrentUser }) => {
  const { runners, distance } = activeRace;

  // Initialise each runner at the start line
  const [raceProgress, setRaceProgress] = useState(
    runners.map(r => ({ id: r.id, name: r.horseName, distance: 0, odds: r.odds }))
  );

  const [winnings,     setWinnings]     = useState(0);
  const [showWinnings, setShowWinnings] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const onTick = (progress) => setRaceProgress(progress);

    const onResult = ({ results, winningsMap }) => {
      setRaceResults(results);
      const myWinnings = winningsMap[currentUser?.id];
      if (myWinnings > 0) {
        setWinnings(myWinnings);
        setShowWinnings(true);
        // Wallet was updated server-side; reflect it locally
        setCurrentUser(prev => ({ ...prev, wallet: prev.wallet + myWinnings }));
      }
    };

    socket.on('race:tick',   onTick);
    socket.on('race:result', onResult);

    return () => {
      socket.off('race:tick',   onTick);
      socket.off('race:result', onResult);
    };
  }, [socket, currentUser?.id]);

  return (
    <>
      <div className="race-container">
        {raceProgress.map((runner, index) => (
          <div
            key={runner.id}
            className="runner"
            style={{
              left: `${(runner.distance / distance) * 100}%`,
              top:  `${index * 10}%`,
            }}
          >
            <img src="/assets/racehorse_transparent.gif" alt="Racehorse" />
            <span className="vvsmall">{removeTextInBrackets(runner.name)}</span>
          </div>
        ))}
      </div>

      {showWinnings && (
        <div className="winnings-modal">
          <div className="winnings-header">
            <img src="/assets/winnings.gif" alt="winnings" className="winnings-header-img" />
            <h1>Winnings</h1>
            <button className="smalltop" onClick={() => setShowWinnings(false)}>Close</button>
          </div>
          <p className="winnings-text">
            You won <strong>£{winnings.toFixed(2)}</strong> — wallet now{' '}
            <strong>£{parseFloat(currentUser?.wallet ?? 0).toFixed(2)}</strong>
          </p>
        </div>
      )}
    </>
  );
};

export default RunRace;
