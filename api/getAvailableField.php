<?php

include 'setup.php';

if (isset($receivedData['view'])) {
    $view = $receivedData['view'];

    // Prepare the SQL query to count the number of entries in the view
    $stmt = $mysqli->prepare("SELECT COUNT(*) as count FROM $view");
    if ($stmt) {
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $count = $row['count'];

        // Send the response with the count
        send_response(['count' => $count]);
    } else {
        send_response("Failed to prepare the SQL statement: " . $mysqli->error, 500);
    }
} else {
    send_response("View not specified", 400);
}
?>