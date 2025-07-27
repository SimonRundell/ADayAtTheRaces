import { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';
import { message } from 'antd';
import CreateRace from './createRace';
import NextRaces from './nextRaces';
import RunRace from './RunRace';
import { metresToFurlongs, removeTextInBrackets,capitalizeFirstLetter } from './common';
import Login from './login';
import UserStatus from './userStatus';
import GenerateRaceData from './generateRaceData';


function App() {
  const [updateList, setUpdateList] = useState(false);
  const [config, setConfig] = useState(null); // Initialize as null
  const [messageApi, contextHolder] = message.useMessage();
  const [activeRace, setActiveRace] = useState(null);
  const [raceResults, setRaceResults] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [triggerBets, setTriggerBets] = useState(false);

  useEffect(() => {
    axios.get('/.config.json')
      .then(response => {
        setConfig(response.data);
        // console.log('Config:', response.data);
        messageApi.success('Config loaded');
      })
      .catch(error => {
        console.error('Error fetching config:', error);
        messageApi.error('Error fetching config');
      });
  }, []);

  const finishRace = () => {
      setActiveRace(null);
      setRaceResults([]);
  }

  return (
    <>
      {contextHolder}
      {config ? (
        currentUser ? (
          <div>
            <div className="header-container">
              <h1>{config.appName}</h1>
              { (currentUser.admin === 1) ? (
                <span className="horiz-buttons">
                <CreateRace config={config} setUpdateList={setUpdateList} updateList={updateList} />
                <GenerateRaceData config={config} setUpdateList={setUpdateList} updateList={updateList} />
                </span>) : null }
              <img src="/assets/adatr_logo_transparent.png" alt="Logo" className="head-logo" />
            </div>
            {activeRace && (
              <>
                <div className="main-container">
                  {activeRace.racecourse} {activeRace.racetime} 
                  {capitalizeFirstLetter(activeRace.raceover)} {metresToFurlongs(activeRace.distance)}f {activeRace.going}
                </div>
                <div className="main-container">
                  <RunRace raceID={activeRace.id} 
                           config={config}
                           runners={activeRace.runners} 
                           distance={activeRace.distance} 
                           raceOver={activeRace.raceover} 
                           setRaceResults={setRaceResults}
                           setUpdateList={setUpdateList}
                           updateList={updateList}
                           currentUser={currentUser}
                           setCurrentUser={setCurrentUser}
                  />
                </div>
              </>
            )}
            <div className="main-container">
            <div>
            </div>
              <NextRaces config={config} updateList={updateList} 
                         setActiveRace={setActiveRace}
                          currentUser={currentUser}
                          setCurrentUser={setCurrentUser}
                          triggerBets={triggerBets}
                          setTriggerBets={setTriggerBets}/>
            </div>
            {raceResults.length > 0 && (
              <div className="results-container">
                <div className="results-header">
                  <img src="/assets/trophy.png" alt="Trophy" className="trophy" />
                  <h1>Results</h1>
                </div>
                <span className="close right" onClick={finishRace}>&times;</span>
                <div>{activeRace.racecourse} {activeRace.racetime} {capitalizeFirstLetter(activeRace.raceover)} {metresToFurlongs(activeRace.distance)}f 
                  Going: {activeRace.going}
                </div>
                {raceResults.map((result, index) => (
                  <p className="resultsheet" key={index}>
                    {` ${result.place}: ${removeTextInBrackets(result.name)}`}
                    <span className="box">{`${result.rating}`}</span>
                    <span>{`${result.odds}`}</span>
                  </p>
                ))}
              </div>
            )}
            <UserStatus config={config} currentUser={currentUser} 
                        setCurrentUser={setCurrentUser} triggerBets={triggerBets}/>
          </div>
        ) : (
          <Login config={config} setUserDetails={setCurrentUser} />
        )
      ) : (
        <p>Loading configuration...</p>
      )}
    </>
  );
}

export default App;