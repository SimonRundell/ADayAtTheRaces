<?php

include 'setup.php';

$userID=intval($receivedData['userID']);
$wallet=floatval($receivedData['wallet']);

$query = "UPDATE tbluser SET wallet = ? WHERE id = ?";

$stmt = $mysqli->prepare($query);
$stmt->bind_param('di', $wallet, $userID);

if ($stmt->execute()) {
    send_response('Wallet updated successfully', 200); 
} else {
    send_response('Failed to update wallet with error: ' . $stmt->error, 500); 
}

$stmt->close();

?>

