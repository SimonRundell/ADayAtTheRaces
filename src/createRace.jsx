import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { message, Spin } from 'antd';
import { calculateOdds } from './common';

const CreateRace = ({ config, setUpdateList, updateList }) => {
  const [countRunners, setCountRunners] = useState(0);
  const [raceList, setRaceList] = useState([]);
  const [racecourse, setRacecourse] = useState('');
  const [raceOver, setRaceOver] = useState('');
  const [raceTime, setRaceTime] = useState('');
  const [distance, setDistance] = useState(0);
  const [going, setGoing] = useState('');
  const [messageApi, contextHolder] = message.useMessage();
  const [displayNewRace, setDisplayNewRace] = useState(false);
  const [triggerCreateRace, setTriggerCreateRace] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [triggerRunRace, setTriggerRunRace] = useState(false);

  // once
  // useEffect(() => {
  //   if (triggerCreateRace) {
  //     createNextRace();
  //     setTriggerCreateRace(false);
  //   }
  // }, [triggerCreateRace]);

  // useEffect(() => {
  //   if (triggerRunRace) {
  //     runRace(raceList, distance);
  //     setTriggerRunRace(false);
  //   }
  // }, [triggerRunRace, raceList, distance]);

  // x 50 races
  useEffect(() => {
    const createRaces = async () => {
      for (let i = 0; i < 500; i++) {
        await createNextRace();
      }
      setTriggerCreateRace(false);
    };
  
    if (triggerCreateRace) {
      createRaces();
    }
  }, [triggerCreateRace]);
  
  useEffect(() => {
    if (triggerRunRace) {
      runRace(raceList, distance);
      setTriggerRunRace(false);
    }
  }, [triggerRunRace, raceList, distance]);

  const newRace = () => {
    setRaceList([]);
    setRacecourse('');
    setRaceOver('');
    setRaceTime('');
    setDistance(0);
    setGoing('');
    setDisplayNewRace(false);
    console.log("Zeroing fields");
    setTriggerCreateRace(true);
  }

  const createNextRace = async () => {
    setIsLoading(true);
    const racecourses = [
      "Ascot Racecourse",
      "Aintree Racecourse",
      "Cheltenham Racecourse",
      "Epsom Downs Racecourse",
      "Exeter Racecourse",
      "Newmarket Racecourse",
      "Newton Abbott Racecourse",
      "York Racecourse",
      "Chester Racecourse",
      "Goodwood Racecourse",
      "Haydock Park Racecourse",
      "Sandown Park Racecourse",
      "Kempton Park Racecourse",
      "Doncaster Racecourse",
      "Windsor Racecourse",
      "Salisbury Racecourse",
      "Lingfield Park Racecourse",
      "Ayr Racecourse",
      "Musselburgh Racecourse",
      "Hamilton Park Racecourse",
      "Perth Racecourse",
      "Chepstow Racecourse",
      "Bangor-on-Dee Racecourse",
      "Ffos Las Racecourse",
      "Down Royal Racecourse",
      "Downpatrick Racecourse"
    ];

    const selectedRacecourse = racecourses[Math.floor(Math.random() * racecourses.length)];
    setRacecourse(selectedRacecourse);
    console.log("Racecourse is", selectedRacecourse);

    // Set next race in 15 mins
    const currentDate = new Date();
    const raceTimeValue = currentDate.getTime() + (15 * 60 * 1000);
    const raceTimeDate = new Date(raceTimeValue);
    const strTime = raceTimeDate.toISOString().slice(11, 16);
    setRaceTime(strTime);

    // What kind of race
    const raceTypes = ["viewhorseflatrating", "viewhorsechaserating", "viewhorsehurdlerating"];
    const raceOverTypes = ["flat", "chase", "hurdle"];
    const selection = Math.floor(Math.random() * raceTypes.length);
    
    const strRaceType = raceTypes[selection];
    const selectedRaceOver = raceOverTypes[selection];
    setRaceOver(selectedRaceOver);
    
    console.log("The selection is", selection, "so strRaceType is", strRaceType, "and raceOver is", selectedRaceOver); 
    const jsonData = { "view": strRaceType };
    console.log("Checking runners for", jsonData);

    try {
      const response = await axios.post(config.api + '/getAvailableField.php', jsonData);
      const count = response.data.count;
      console.log('Total runners in', strRaceType, "is", count);
      setCountRunners(count);
      const intRunners = Math.floor(Math.random() * 7) + 6;
      console.log('Number of Runners in this race is:', intRunners);

      if (count > 0) {
        const selectedRunners = [];
        while (selectedRunners.length < intRunners) {
          const randomIndex = Math.floor(Math.random() * count);
          if (!selectedRunners.includes(randomIndex) && randomIndex !== 0) {
            selectedRunners.push(randomIndex);
          }
        }

        const horseIdsPromises = selectedRunners.map(index =>
          axios.get(`${config.api}/getHorseID.php?view=${strRaceType}&index=${index}`)
        );
        const horseIdsResponses = await Promise.all(horseIdsPromises);
        const horseIds = horseIdsResponses.map(response => response.data.id);

        const horseDetailsPromises = horseIds.map(id =>
          axios.get(`${config.api}/getHorseDetails.php?id=${id}`)
        );
        const horseDetailsResponses = await Promise.all(horseDetailsPromises);
        const horseDetails = horseDetailsResponses.map(response => response.data);

        // Fetch horse form data
        const horseFormPromises = horseIds.map(id =>
          axios.get(`${config.api}/getHorseForm.php?horseID=${id}`)
        );
        const horseFormResponses = await Promise.all(horseFormPromises);
        const horseForms = horseFormResponses.map(response => {
          const { status_code, ...form } = response.data;
          return form;
        });

        // Combine horse details and form data
        const combinedHorseData = horseDetails.map((details, index) => ({
          ...details,
          form: horseForms[index]
        }));

        // Calculate the odds for each runner
        const updatedRunners = calculateOdds(combinedHorseData, selectedRaceOver);

        console.log("Updated Runners", updatedRunners);
        
        // Update the race object with the sorted runners and their odds            
        setRaceList(updatedRunners);

        // const distanceOptions = [402, 603, 804, 1005, 1207, 1408, 1609, 1810, 2000, 2200];
        const distanceOptions = [402, 603];
        const goingOptions = ["Good", "Good to Firm", "Good to Soft", "Soft"];
        const selectedDistance = distanceOptions[Math.floor(Math.random() * distanceOptions.length)];
        const selectedGoing = goingOptions[Math.floor(Math.random() * goingOptions.length)];
        setDistance(selectedDistance);
        setGoing(selectedGoing);

        // Validate required fields before inserting into the database
        if (!selectedRacecourse || !selectedDistance || !selectedRaceOver || !selectedGoing) {
          messageApi.error('Incomplete race data. Trying again.');
          return;
        }

        const jsonData2 = {
          racecourse: selectedRacecourse,
          raceTime: strTime,
          distance: selectedDistance,
          going: selectedGoing,
          runners: updatedRunners,
          raceOver: selectedRaceOver
        };

        console.log("Inserting", jsonData2);

        const response2 = await axios.post(config.api + '/insertRaceDetails.php', jsonData2);
        console.log('Inserted Race ID:', response2.data.id);
        messageApi.success("Another race manually added");
        setIsLoading(false);
        setUpdateList(!updateList);
      }
    
    } catch (error) {
      console.error('Error:', error);
      messageApi.error('Error creating race. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div>
        {isLoading && <div className="central-overlay-spinner">            
                  <div className="spinner-content">
                    <Spin size="large" />
                  </div>
        </div>}
      {contextHolder}
      <button onClick={newRace}>Create 500 Races</button>
    </div>
  );
};

export default CreateRace;