<?php

include 'setup.php';

// Check that data has been received, i.e., runners is populated
if (isset($receivedData['runners'])) {
    $runners = json_encode($receivedData['runners']); // Stringify the JSON data
    $raceName = $receivedData['racecourse'];
    $raceTime = $receivedData['raceTime'];
    $raceDistance = $receivedData['distance'];
    $raceOver = $receivedData['raceOver'];
    $going = $receivedData['going'];

    // Prepare the SQL query to insert race details
    $stmt = $mysqli->prepare("INSERT INTO tblrace (racecourse, racetime, distance, raceover, going, runners) 
                                VALUES (?, ?, ?, ?, ?, ?)");
    if ($stmt) {
        $stmt->bind_param("ssisss", $raceName, $raceTime, $raceDistance, $raceOver, $going, $runners);
        if ($stmt->execute()) {
            $insertedId = $mysqli->insert_id; // Get the ID of the inserted record
            send_response(["message" => "Race details inserted successfully", "id" => $insertedId]);
        } else {
            send_response("Failed to execute the SQL statement: " . $stmt->error, 500);
        }
        $stmt->close();
    } else {
        send_response("Failed to prepare the SQL statement: " . $mysqli->error, 500);
    }
} else {
    send_response("Runners not specified", 400);
}

?>