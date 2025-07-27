import { useState, useEffect } from 'react';
import axios from 'axios';
import { Drawer, message } from 'antd';
import { removeTextInBrackets } from './common';

function UserStatus({ config, currentUser, setCurrentUser, triggerBets }) {
    const [messageApi, contextHolder] = message.useMessage();
    const [currentBets, setCurrentBets] = useState([]);
    const [showBets, setShowBets] = useState(false);

    useEffect(() => {
        const fetchBets = async () => {
            const jasonData = { userID: currentUser.id };
            try {
                const response = await fetch(config.api + '/getBets.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(jasonData)
                });
                const results = await response.json();
                if (results && typeof results === 'object' && !Array.isArray(results)) {
                    const betsArray = Object.values(results).filter(item => typeof item === 'object' && item !== null);
                    setCurrentBets(betsArray); 
                    console.log("Bets:", betsArray);
                } else {
                    setCurrentBets([]);
                    messageApi.error('Unexpected data format');
                }
            } catch (error) {
                messageApi.error('Failed to fetch bets');
            }
        };
        fetchBets();
    }, [config, currentUser, triggerBets]);

    const onClose = () => {
        setShowBets(false);
    }

  
    return (
        <>
        {contextHolder}
        <div>
            {currentUser ? (
                <>
                <div className="fixedMessage">
                Welcome {currentUser.nickname},
                {currentUser.admin === 1 ? " (Admin) " : " "}
                Current Balance: £{currentUser.wallet.toFixed(2)}
                <span><button onClick={()=>setShowBets(true)} className="smallgap">Open Bets</button></span>
                {currentBets && (
                    <span className="close" onClick={() => setCurrentUser(null)}>&times;</span>
                )}
               </div>
               <Drawer title="Your Open Bets" onClose={onClose} open={showBets}>
                     <table>
                         <thead>
                             <tr>
                                 <th>Racecourse</th>
                                 <th>Race Time</th>
                                 <th>Horse</th>
                                 <th>Stake</th>
                                 <th>Type</th>
                             </tr>
                         </thead>
                         <tbody>
                             {currentBets.map((bet, index) => (
                                 <tr key={bet.id || index}>
                                     <td>{bet.racecourse}</td>
                                     <td>{bet.racetime}</td>
                                     <td>{removeTextInBrackets(bet.horseName)}</td>
                                     <td>£{bet.stake}</td>
                                     <td>{bet.ew ? "E/W" : "Win"}</td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                     <hr />
                     <p>Your wallet contains: £ {currentUser.wallet.toFixed(2)}</p>
                </Drawer>
               <div>

               </div>



               </>
            ) : (
                <h2>Please login</h2>
            )}
        </div>
        </>
    );


}

export default UserStatus;
