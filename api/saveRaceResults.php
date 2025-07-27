<?php

include 'setup.php';

$results = $receivedData['results'];
$raceID = intval($receivedData['raceID']);

$query = "UPDATE tblrace SET status = 2, result = ? WHERE id = ?";

$stmt = $mysqli->prepare($query);

$stmt->bind_param("si", $results, $raceID);

if ($stmt->execute()) {
    send_response("Results recorded " . $receivedData['results'], 200);
} else {
    send_response("Query failed to execute: " . $mysqli->error, 500);
}

$stmt->close();
$mysqli->close();
?>