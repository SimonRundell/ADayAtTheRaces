<?php

include 'setup.php';

if (isset($_GET['horseID'])) {
    $horseID = $_GET['horseID'];

    $query = "SELECT horse_ids, horse_places FROM viewhorseplacings WHERE JSON_SEARCH(horse_ids, 'one', ?) IS NOT NULL";
    
    $stmt = $mysqli->prepare($query);
    $stmt->bind_param('s', $horseID); // Bind the horseID as a string parameter
    if ($stmt->execute()) {
        $result = $stmt->get_result();
        $form = array();
        while ($row = $result->fetch_assoc()) {
            $horse_ids = json_decode($row['horse_ids']);
            $horse_places = json_decode($row['horse_places']);
            $index = array_search((int)$horseID, $horse_ids);
            if ($index !== false) {
                $form[] = $horse_places[$index];
            }
        }
        send_response($form, 200);
    } else {
        send_response("Failed to execute the SQL statement: " . $stmt->error, 500);
    }

} else {
    send_response("Required parameters not specified", 400);
}

?>