<?php

include 'setup.php';

$userID=intval($receivedData['userID']);

$query = "SELECT * FROM viewbetdetails WHERE punterID = ? AND paidOut = 0 AND status=0";

$stmt = $mysqli->prepare($query);
$stmt->bind_param('i', $userID);

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