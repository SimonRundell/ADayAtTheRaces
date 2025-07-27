<?php

include 'setup.php';

$raceID=intval($receivedData['raceID']);
$horseID=intval($receivedData['horseID']);
$stake=floatval($receivedData['stake']);
$punterID=intval($receivedData['punterID']);
$ew=intval($receivedData['ew']); // Fixed variable name

$query = "INSERT INTO tblbets (raceID, horseID, stake, punterID, ew) VALUES (?,? ,?, ?, ?)";
$stmt = $mysqli->prepare($query);
$stmt->bind_param('iidii', $raceID, $horseID, $stake, $punterID, $ew); // Changed 'iifii' to 'iiddi'

if ($stmt->execute()) {
    send_response('Bet placed successfully', 200); 
} else {
    send_response('Failed to place bet with error: ' . $stmt->error, 500); 
}

$stmt->close();

?>

