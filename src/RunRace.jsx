import React, { useState, useEffect, useRef } from 'react';
import { message } from 'antd';
import { removeTextInBrackets, capitalizeFirstLetter } from './common';
import axios from 'axios';

const RunRace = ({ config, raceID, runners, distance, raceOver, 
                   setRaceResults, setUpdateList, updateList,
                   currentUser, setCurrentUser}) => {
                    
  const [chances, setChances] = useState([]);
  const [raceProgress, setRaceProgress] = useState([]);
  const [raceCount, setRaceCount] = useState(0);
  const [messageApi, contextHolder] = message.useMessage();
  const raceStartedRef = useRef(false);
  const localRaceProgressRef = useRef([]);
  const numberRunners = runners.length;
  const [openBets, setOpenBets] = useState([]);
  const [weighting, setWeighting] = useState([]);
  const [thisRaceWinnings, setThisRaceWinnings] = useState(0);
  const [showWinningsModal, setShowWinningsModal] = useState(false);  

  useEffect(() => {
    const createChances = (runners, raceOver) => {
      const newChances = [];
      runners.forEach(runner => {
        const thisRating = runner[`horse${capitalizeFirstLetter(raceOver)}Rating`];
        
        // Calculate random boost once per runner
        const randomBoost = Math.floor(Math.random() * 10);
        if (randomBoost === 5) {
          console.log("It's a specially good day for", runner['id']);
          for (let j = 0; j < 30; j++) {
            newChances.push(runner['id']);
          }
        }

        for (let i = 0; i < thisRating; i++) {
          newChances.push(runner['id']);
        }
      });
      setChances(newChances);
    };

    if (runners.length > 0) {
      createChances(runners, raceOver);

      // sort runners into a new array by rating
      const sortedRunners = runners.slice().sort((a, b) => b[`horse${capitalizeFirstLetter(raceOver)}Rating`] - a[`horse${capitalizeFirstLetter(raceOver)}Rating`]);
      setWeighting(sortedRunners);
      console.log("Weighting:", sortedRunners);
    }
  }, [runners, raceOver]);

  useEffect(() => {
    if (chances.length > 0 && !raceStartedRef.current) {
      raceStartedRef.current = true;
      messageApi.info("Race is underway");
      runRace();
    }
  }, [chances, messageApi]);

  const runRace = async () => {
    var localRaceResults = [];
    var placeCounter = 1;

    localRaceProgressRef.current = runners.map(runner => ({
      id: runner.id,
      name: runner.horseName,
      distance: 0,
      odds: runner.odds,
      rating: runner[`horse${capitalizeFirstLetter(raceOver)}Rating`]
    }));
  
    setRaceProgress(localRaceProgressRef.current); // Initialize raceProgress state

    // sort runners into a new array by rating
    setWeighting(localRaceProgressRef.current.slice().sort((a, b) => b.rating - a.rating));
    console.log("Weighting:", localRaceProgressRef.current.slice().sort((a, b) => b.rating - a.rating));
  
    while (localRaceResults.length < runners.length-1) { // trying to resolve the last hoprse home error

      const randomIndex = Math.floor(Math.random() * chances.length);
      setRaceCount(prevCount => prevCount + 1);
      const mover = chances[randomIndex];

      var moveDistance = 0;

      if (mover !== weighting[0].id) {   // only move if not the top rated horse
        moveDistance = Math.floor(Math.random() * 3);
      } else {
        moveDistance = 1;
      }

      // add a little extra boost for a random horse
      const randomBoost = Math.floor(Math.random() * 200);
      if (randomBoost === 25) {
        console.log("Boost for", mover);
        var boostMove = 5;
      } else {
        var boostMove = 0;
      }
  
      localRaceProgressRef.current = localRaceProgressRef.current.map(runner => {
        if (runner.id === mover) {
          return { ...runner, distance: runner.distance + moveDistance + boostMove };
        }
        return runner;
      });
  
      setRaceProgress([...localRaceProgressRef.current]); // Update raceProgress state

      const sortedProgress = [...localRaceProgressRef.current].sort((a, b) => b.distance - a.distance);
      if (placeCounter <= sortedProgress.length && sortedProgress[placeCounter - 1].distance >= distance) {
        localRaceResults.push({ ...sortedProgress[placeCounter - 1], place: placeCounter});
        console.log("Place:", placeCounter, " -> ", sortedProgress[placeCounter - 1]);
        setRaceResults([...localRaceResults]); // Ensure state is updated with a new array
        // console.log("Filtering out:", sortedProgress[placeCounter - 1].id, " Remaining Runners:", runners.length - localRaceResults.length);
        setChances(prevChances => prevChances.filter(chance => chance !== sortedProgress[placeCounter - 1].id));
        placeCounter++;

      }
      await new Promise(resolve => setTimeout(resolve, 10)); // wait 0.01 seconds for debugging
    }
  
    console.log("Last horse home:", localRaceProgressRef.current.find(runner => runner.distance < distance));
    const lastHorseID = localRaceProgressRef.current.find(runner => runner.distance < distance).id;
    console.log("The id of that last horse is", lastHorseID);
    localRaceResults.push({ ...localRaceProgressRef.current.find(runner => runner.distance < distance), place: numberRunners});
    setRaceResults([...localRaceResults]); 
    localRaceProgressRef.current = localRaceProgressRef.current.map(runner => {
      if (runner.id === lastHorseID) {
      return { ...runner, distance: distance };
      }
      return runner;
    });
    setRaceProgress([...localRaceProgressRef.current]);


    saveResults(raceID, localRaceResults);

    settleBets(localRaceResults);

    console.log("Results:", localRaceResults);

    raceStartedRef.current = false;
    setUpdateList(!updateList);

    messageApi.success("Race is complete");
  };


  // Get Bets for this race
  const settleBets = async (raceResults) => {
    const jsonData = { raceID: raceID };
    console.log("Getting Bets: ", jsonData);  
    try {
      const response = await axios.post(`${config.api}/getRaceBets.php`, jsonData);
      const data = response.data;
      setOpenBets(data);
      console.log("Open Bets:", data);
  
      // go through open bets and compare to raceResults
      checkBets(data, raceResults);
    } catch (error) {
      console.error("Error getting bets:", error);
    }
  };

  const workOutOdds = (odds) => {
      // convert a string fractional odd like 2:1 to a decimal
      const oddsArray = odds.split("/");
      return oddsArray[0] / oddsArray[1] + 1;
  }
  
    const checkBets = (openBets, raceResults) => {
    const topThree = raceResults.slice(0, 3).map(result => ({
      id: result.id,
      odds: result.odds,
      ew: result.ew,
      stake: result.stake,
      place: result.place
    }));
    console.log("Top Three:", topThree);
  
    const topThreeIds = topThree.map(result => result.id);
    console.log("Top Three IDs:", topThreeIds);
  
    const betsArray = Object.values(openBets).filter(bet => typeof bet === 'object'); // Filter out non-object entries like status_code
    console.log("Bets Array:", betsArray);
  
    const calculateEwMultiplier = (numberRunners, place) => {
      if (numberRunners >= 12 && numberRunners <= 15 && place <= 3) {
        return 0.25; // 1/4 odds for 1st, 2nd, and 3rd place in handicapped races with 12-15 runners
      } else if (numberRunners >= 8 && place <= 3) {
        return 0.20; // 1/5 odds for 1st, 2nd, and 3rd place with 8+ runners
      } else if (numberRunners >= 5 && place <= 2) {
        return 0.25; // 1/4 odds for 1st and 2nd place with 5-7 runners
      } else if (numberRunners >= 1 && place === 1) {
        return 1; // Win only bet for 1-4 runners
      }
      return 0; // No payout for other places
    };
    
    betsArray.forEach(bet => {
      const numberRunners = runners.length;
      if (topThreeIds.includes(bet.horseID)) {
        const winningHorse = topThree.find(horse => horse.id === bet.horseID);
        const ewMultiplier = bet.ew ? calculateEwMultiplier(numberRunners, winningHorse.place) : 1;
        const winnings = bet.stake * workOutOdds(winningHorse.odds) * ewMultiplier;
        console.log(`Bet on horseID ${bet.horseID} came ${winningHorse.place} at ${winningHorse.odds}!`);
        console.log(`Winnings: £${winnings.toFixed(2)}`);
        setThisRaceWinnings(thisRaceWinnings + winnings);
        setShowWinningsModal(true);
        setCurrentUser(prevUser => ({ ...prevUser, wallet: prevUser.wallet + winnings }));
      } else {
        console.log(`Bet on horseID ${bet.horseID} did not place.`);
      }
    });
  };

  const closeWinnings = () => {
    setShowWinningsModal(false);
  }

  const saveResults = async (raceID, raceResults) => {
    const jsonData = { raceID: raceID, results: JSON.stringify(raceResults)};
    console.log("Saving Results: ", jsonData);
    try {
      const response = await axios.post(`${config.api}/saveRaceResults.php`, jsonData);
      console.log("Results saved:", response.data);
    } catch (error) {
      console.error("Error saving results:", error);
    }
  }


  return (
    <>
      {contextHolder}
      
        <div className="race-container">
          {raceProgress.map((runner, index) => (
            <div
              key={runner.id}
              className="runner"
              style={{ left: `${(runner.distance / distance) * 100}%`, top: `${index * 10}%` }}
            >
              <img src="/assets/racehorse_small.gif" alt="Racehorse" />
              <span className="vvsmall">{removeTextInBrackets(runner.name)}</span>
            </div>
          ))}
        </div>
        {showWinningsModal && (
          <div className="winnings-modal">
            <div className="winnings-header">
              <img src="/assets/winnings.gif" alt="winnings" className="winnings-header-img" />
              <h1>Winnings</h1>

              <button className="smalltop" onClick={closeWinnings}>Close</button>
            </div>
            <p className="winnings-text">Your wallet has been increased by £{thisRaceWinnings.toFixed(2)} and now stands at <strong>£{currentUser.wallet.toFixed(2)}</strong></p>
          </div>
        )}
    </>
  );
};

export default RunRace;