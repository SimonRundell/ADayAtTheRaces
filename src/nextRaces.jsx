import { useState, useEffect } from 'react';
import { message } from 'antd';
import { metresToFurlongs, stripRacecourse, removeTextInBrackets, calculateOdds, capitalizeFirstLetter } from './common.js';
import axios from 'axios';

function NextRaces({ config, updateList, setActiveRace, currentUser, setCurrentUser, triggerBets, setTriggerBets }) {
  const [nextRaces, setNextRaces] = useState([]);
  const [messageApi, contextHolder] = message.useMessage();
  const [showRaceModal, setShowRaceModal] = useState(false);
  const [currentRace, setCurrentRace] = useState(null);
  const [showBetModal, setShowBetModal] = useState(false);
  const [betRunner, setBetRunner] = useState(null);
  const [ewBet, setEwBet] = useState(false);
  const [stake, setStake] = useState(0);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [hoveredRunner, setHoveredRunner] = useState(null);

  useEffect(() => {
    const fetchNextRaces = async () => {
      try {
        const response = await fetch(config.api + '/getRaceCard.php');
        const results = await response.json();
        if (results && typeof results === 'object' && !Array.isArray(results)) {
          const racesArray = Object.values(results).filter(item => typeof item === 'object' && item !== null);
          // Parse the runners JSON string for each race
          const parsedRacesArray = racesArray.map(race => ({
            ...race,
            runners: JSON.parse(race.runners)
          }));

          setNextRaces(parsedRacesArray);
          // console.log("Parsed Races:", parsedRacesArray);
        } else {
          setNextRaces([]);
          messageApi.error('Unexpected data format');
        }
        // console.log(results);
      } catch (error) {
        messageApi.error('Error fetching data: ' + error.message);
      }
    };
    fetchNextRaces();
  }, [updateList]);

  const startRace = async (race) => {

    // Calculate odds and update the race object
    const updatedRunners = calculateOdds(race.runners, race.raceover);
    const updatedRace = { ...race, runners: updatedRunners };

    const startData = { raceID: race.id, status: 1 };
    console.log("Start Data:", startData);
    const response = await fetch(config.api + '/updateRaceStatus.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(startData)
    });

    setCurrentRace(updatedRace);
    setActiveRace(updatedRace);
  };

   const showRaceDetails = async (race) => {
    console.log("Selected Race", race);
    console.log("Race Type:", race.raceover);
  
    // Sort the runners array based on the raceover value
    const sortedRunners = [...race.runners].sort((a, b) => {
      if (race.raceover === "flat") {
        return (b.horseFlatRating || 0) - (a.horseFlatRating || 0);
      } else if (race.raceover === "chase") {
        return (b.horseChaseRating || 0) - (a.horseChaseRating || 0);
      } else if (race.raceover === "hurdle") {
        return (b.horseHurdleRating || 0) - (a.horseHurdleRating || 0);
      }
      return 0;
    });
  
    // Calculate the odds for each runner
    const updatedRunners = calculateOdds(race.runners, race.raceover);

    // Update the race object with the sorted runners and their odds
    const updatedRace = { ...race, runners: updatedRunners };
  
    setCurrentRace(updatedRace);
    setShowRaceModal(true);
  }

  const placeBet = (runner) => {
    setBetRunner(runner);
    console.log("Place Bet on:", runner.id, runner.horseName, "at odds", runner.odds);
    setShowBetModal(true);
  };

  const handleStakeChange = (e) => {
    setStake(parseFloat(e.target.value) || 0);
  };

  const confirmBet = async () => {
    const betTotal = ewBet ? stake * 2 : stake;
    console.log("Confirm Bet on:", betRunner.id, betRunner.horseName, "at odds", 
                betRunner.odds, "Stake: £", betTotal,
                "Each Way:", ewBet);

    if (ewBet) {
      var ewSelected = 1;
    } else {
      var ewSelected = 0;
    }

    const betData = { raceID: currentRace.id, horseID: betRunner.id, punterID: currentUser.id, stake: betTotal, ew: ewSelected };
    console.log("Bet Data:", betData);

    const response = await fetch(config.api + '/placeBet.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(betData)
    });

    const result = await response.json();
    console.log("Bet Result:", result);
    if (result && result.status_code === 200) {
      messageApi.success('Bet placed successfully');
      closeBetModal();
      takeBet(currentUser, betTotal);
      setTriggerBets(!triggerBets);
    } else {
      messageApi.error('Error placing bet');
    }
    
  };

  const closeBetModal = () => {
    setShowBetModal(false);
    setBetRunner(null);
    setStake(0);
    setEwBet(false);
  }

  const takeBet = (currentUser, totalCost) => {

    if (currentUser.wallet >= totalCost) {
      console.log("Take Bet for", totalCost);
      messageApi.success('Bet placed successfully');

      // Deduct the total cost from the user's wallet
      const updatedUser = { ...currentUser, wallet: currentUser.wallet - totalCost };
      setCurrentUser(updatedUser);
      // now update the user's wallet in the database
      const userData = { userID: currentUser.id, wallet: updatedUser.wallet };
      console.log("User Data:", userData);

      axios.post(config.api + '/updateWallet.php', userData)
        .then(response => {
          console.log("Wallet update response:", response.data);
        })
        .catch(error => {
          console.error("Error updating wallet:", error);
          messageApi.error('Error updating wallet');
        });
      
      
      return true;
    } else {
      console.log("Insufficient funds to take bet");
      messageApi.error('Insufficient funds to place bet');
      return false;
    }

  }

  const moreDetails = (runner) => {
      setHoveredRunner(runner.id);
  }                             

  const lessDetails = () => {
    setHoveredRunner(null);
  }

  return (
    <>
      {contextHolder}
      {nextRaces.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Racecourse</th>
              <th>Race Time</th>
              <th>Event</th>
              <th>Distance</th>
              <th>Going</th>
              <th>Runners</th>
            </tr>
          </thead>
          <tbody>
            {nextRaces.map((race, index) => (
              <tr key={race.id}>
                <td>{race.id}<br />
                <span className="smallpad rctitle">{stripRacecourse(race.racecourse)}</span>
                <span className="smallpad"><button onClick={()=>startRace(race)}>Start Race</button></span>
                <span className="smallpad"><button onClick={()=>showRaceDetails(race)}>Race Details & Bets</button></span></td>
                <td>{race.racetime}</td>
                <td>{capitalizeFirstLetter(race.raceover)}</td>
                <td>{metresToFurlongs(race.distance)} f</td>
                <td>{race.going}</td>
                <td>
                  <ul>
                    {race.runners.map((runner, runnerIndex) => (
                      <li key={runnerIndex}>{removeTextInBrackets(runner.horseName)}</li>
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
      {showRaceModal && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={() => setShowRaceModal(false)}>&times;</span>
            <h2>{stripRacecourse(currentRace.racecourse)} - {currentRace.racetime}</h2>
            <p>{capitalizeFirstLetter(currentRace.raceover)} over {metresToFurlongs(currentRace.distance)}f
              &nbsp;&nbsp;<strong>Going:</strong> {currentRace.going}</p>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Rating</th>
                  <th>Odds</th>
                  <th>Place Bet</th>
                </tr>
              </thead>
              <tbody>
                {currentRace.runners.map((runner, runnerIndex) => (
                  <tr key={runnerIndex}>
                                       <td onMouseEnter={() => moreDetails(runner)} onMouseLeave={lessDetails}>{runner.horseName} {runner.form
                            ? runner.form.join(',')
                            : runner.form}
                      <div className={`runner-details ${hoveredRunner === runner.id ? 'show' : ''}`}>
                        <table>
                          <tbody>
                            {currentUser.admin ===1 && (
                              <>
                              <tr>
                                <td><strong>Horse ID:</strong></td>
                                <td>{runner.id}</td>
                              </tr>
                              <tr>
                                <td><strong>Rating:</strong></td>
                                <td>
                                  {runner.horseFlatRating ? <span className="smallgap">Flat: {runner.horseFlatRating}</span> : null}
                                  {runner.horseChaseRating ? <span className="smallgap">Chase: {runner.horseChaseRating}</span> : null}
                                  {runner.horseHurdleRating ? <span className="smallgap">Hurdle: {runner.horseHurdleRating}</span> : null}
                                </td>
                              </tr>
                              </>
                            )}
                            <tr>
                              <td><strong>Form:</strong></td>
                              <td>{runner.form
                            ? runner.form.join(',')
                            : runner.form}</td>
                            </tr>
                            <tr>
                              <td><strong>Age:</strong></td>
                              <td>{runner.horseYear}</td>
                            </tr>
                            <tr>
                              <td><strong>Sex:</strong></td>
                              <td>{runner.horseSex}</td>
                            </tr>
                            <tr>
                              <td><strong>Trainer:</strong></td>
                              <td>{runner.horseTrainer}</td>
                            </tr>
                            <tr>
                              <td><strong>Dam:</strong></td>
                              <td>{runner.horseDam}</td>
                            </tr>
                            <tr>
                              <td><strong>Sire:</strong></td>
                              <td>{runner.horseSire}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </td>
                    <td>
                      {currentRace.raceover === "flat" && runner.horseFlatRating ? runner.horseFlatRating : null}
                      {currentRace.raceover === "chase" && runner.horseChaseRating ? runner.horseChaseRating : null}
                      {currentRace.raceover === "hurdle" && runner.horseHurdleRating ? runner.horseHurdleRating : null}
                    </td>
                    <td>{runner.odds}</td>
                    <td><button onClick={()=>placeBet(runner)}>Place Bet</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    
    {showBetModal && (
      <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={closeBetModal}>&times;</span>
            <p className="resultsheet">Place Bet on {removeTextInBrackets(betRunner.horseName)} at {betRunner.odds}</p>
            <table className="bet-form">
              <tbody>
                <tr>
                  <td className="noborder">Stake:</td>
                  <td className="noborder">
                    <div className="input-group">
                      £ <input type="text" id="stake" name="stake" placeholder="0.00" onChange={handleStakeChange}/>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="noborder">Each Way?</td>
                  <td className="noborder"><input type="checkbox" id="ew" name="ew" onChange={(e) => setEwBet(e.target.checked)} /></td>
                </tr>
                <tr>
                  <td>Total:</td>
                  <td className="noborder"><span className="texttype">£ {(ewBet ? stake * 2 : stake).toFixed(2)}</span></td>
                </tr>
                <tr className="noborder">
                  <td colSpan="2" className="form-group-button noborder">
                    <button onClick={confirmBet}>Place Bet</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
      </div>
    )}
    </>
  );
}

export default NextRaces;