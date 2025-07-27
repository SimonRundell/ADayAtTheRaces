import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { capitalizeFirstLetter } from './common.js';

function generateRaceData({ config, updateList, setUpdateList }) {
  const [raceList, setRaceList] = useState(null);
  const [chances, setChances] = useState([]);
  const [weighting, setWeighting] = useState([]);
  const [runners, setRunners] = useState([]);
  const [numberRunners, setNumberRunners] = useState(0);
  const [currentRaceOver, setCurrentRaceOver] = useState(null);
  const [currentRace, setCurrentRace] = useState(null);
  const [currentDistance, setCurrentDistance] = useState(null);
  const localRaceProgressRef = useRef([]);
  const [raceProgress, setRaceProgress] = useState(null);
  const [raceCount, setRaceCount] = useState(0);
  const [raceResults, setRaceResults] = useState([]);
  const [remainingRaces, setRemainingRaces] = useState(0);

  useEffect(() => {
    const fetchNextRaces = async () => {
      try {
        const response = await axios.get(config.api + '/getRaceCard.php', {
          headers: {
            'Accept': 'application/json',
          },
        });
        const results = response.data;
        if (typeof results === 'object' && !Array.isArray(results)) {
          const filteredResults = Object.values(results).filter(result => result.id !== '200' && result.status_code !== 200);
          setRaceList(filteredResults);
          setRemainingRaces(filteredResults.length - 1);
        } else {
          console.error('Unexpected data format:', results);
        }
      } catch (error) {
        console.error('Error fetching data:', error.message);
      }
    };
    fetchNextRaces();
  }, [config.api]);

  const createChances = (runners, raceOver) => {
    const newChances = [];
    setNumberRunners(runners.length);
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

  const setRunnersAsync = (runners) => {
    return new Promise((resolve) => {
      const horses = JSON.parse(runners);
      setRunners(horses);
      resolve(horses);
    });
  };

  const setChancesAsync = (runners, raceOver) => {
    return new Promise((resolve) => {
      setCurrentRaceOver(raceOver);
      createChances(runners, raceOver);
      
      // sort runners into a new array by rating
      const sortedRunners = runners.slice().sort((a, b) => b[`horse${capitalizeFirstLetter(raceOver)}Rating`] - a[`horse${capitalizeFirstLetter(raceOver)}Rating`]);
      setWeighting(sortedRunners);
      console.log("Weighting:", sortedRunners);
      resolve();
    });
  };

  const runAllRaces = async () => {
    console.log("Running all");
    for (const race of raceList.slice(0, -1)) {
      setRemainingRaces(prevRemainingRaces => prevRemainingRaces - 1); // Use functional update
      setCurrentRace(race.id);
      setCurrentDistance(race.distance);
      const horses = await setRunnersAsync(race.runners);
      console.log("Runners have been set: ", horses);
      await setChancesAsync(horses, race.raceover);
    }
  };

  useEffect(() => {
    if (chances.length > 0) {
      console.log("Chances have been updated:", chances);
      // now let's actually run the race
      var localRaceResults = [];
      var placeCounter = 1;

      localRaceProgressRef.current = runners.map(runner => ({
        id: runner.id,
        name: runner.horseName,
        distance: 0,
        odds: runner.odds,
        rating: runner[`horse${capitalizeFirstLetter(currentRaceOver)}Rating`]
      }));
    
      setRaceProgress(localRaceProgressRef.current); // Initialize raceProgress state

      while (localRaceResults.length < runners.length - 1) { // trying to resolve the last horse home error

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
        var boostMove = randomBoost === 25 ? 5 : 0;
    
        localRaceProgressRef.current = localRaceProgressRef.current.map(runner => {
          if (runner.id === mover) {
            return { ...runner, distance: runner.distance + moveDistance + boostMove };
          }
          return runner;
        });
    
        setRaceProgress([...localRaceProgressRef.current]); // Update raceProgress state

        const sortedProgress = [...localRaceProgressRef.current].sort((a, b) => b.distance - a.distance);
        
        if (placeCounter <= sortedProgress.length && sortedProgress[placeCounter - 1].distance >= currentDistance) {
          localRaceResults.push({ ...sortedProgress[placeCounter - 1], place: placeCounter });
          console.log("Place:", placeCounter, " -> ", sortedProgress[placeCounter - 1]);
          setRaceResults([...localRaceResults]); // Ensure state is updated with a new array
          console.log("Filtering out:", sortedProgress[placeCounter - 1].id, " Remaining Runners:", runners.length - localRaceResults.length);
          setChances(prevChances => prevChances.filter(chance => chance !== sortedProgress[placeCounter - 1].id));
          placeCounter++;
          if (placeCounter === numberRunners) {
            console.log("That should be the last horse");
            break;
          }
        }
      }
    
      console.log("Last horse home:", localRaceProgressRef.current.find(runner => runner.distance < currentDistance));
      const lastHorseID = localRaceProgressRef.current.find(runner => runner.distance < currentDistance).id;
      console.log("The id of that last horse is", lastHorseID);
      localRaceResults.push({ ...localRaceProgressRef.current.find(runner => runner.distance < currentDistance), place: numberRunners });
      setRaceResults([...localRaceResults]); 
      localRaceProgressRef.current = localRaceProgressRef.current.map(runner => {
        if (runner.id === lastHorseID) {
          return { ...runner, distance: currentDistance };
        }
        return runner;
      });
      setRaceProgress([...localRaceProgressRef.current]);

      saveResults(currentRace, localRaceResults);
    }
  }, [chances]);

  const saveResults = async (raceID, raceResults) => {
    const jsonData = { raceID: raceID, results: JSON.stringify(raceResults) };
    console.log("Saving Results: ", jsonData);
    try {
      const response = await axios.post(`${config.api}/saveRaceResults.php`, jsonData);
      console.log("Results saved:", response.data);
      setUpdateList(!updateList);
    } catch (error) {
      console.error("Error saving results:", error);
    }
  };

  return (
    <div>
      <button onClick={runAllRaces}>Run {remainingRaces} Races</button>
    </div>
  );
}

export default generateRaceData;