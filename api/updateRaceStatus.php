<?php

include 'setup.php';

$status = intval($receivedData['status']);
$raceID = intval($receivedData['raceID']);

$query = "UPDATE tblrace SET status = ? WHERE id = ?";

$stmt = $mysqli->prepare($query);

$stmt->bind_param("ii", $status, $raceID);

if ($stmt->execute()) {
    send_response("Race Status Updated to " . $receivedData['status'], 200);
} else {
    send_response("Query failed to execute: " . $mysqli->error, 500);
}

$stmt->close();
$mysqli->close();
?>
