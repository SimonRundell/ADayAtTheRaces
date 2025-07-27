<?php

include 'setup.php';

$raceID=intval($receivedData['raceID']);

$query = "SELECT * FROM tblbets WHERE raceID = ?";

$stmt = $mysqli->prepare($query);
$stmt->bind_param('i', $raceID);

if ($stmt->execute()) {
    $result = $stmt->get_result();
    $bets = array();
    while ($row = $result->fetch_assoc()) {
        $bets[] = $row;
    }
    send_response($bets, 200);
} else {
    send_response('Failed to get bets with error: ' . $stmt->error, 500);
}

$stmt->close();

?>