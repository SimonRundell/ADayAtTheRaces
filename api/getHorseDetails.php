<?php

include 'setup.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['id'])) {
    $horseId = intval($_GET['id']);

    // Prepare the SQL query to get horse details
    $stmt = $mysqli->prepare("SELECT * FROM tblhorse WHERE id = ?");
    if ($stmt) {
        $stmt->bind_param("i", $horseId);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($result->num_rows > 0) {
            $horseDetails = $result->fetch_assoc();
            send_response($horseDetails);
        } else {
            send_response("Horse not found", 404);
        }
        $stmt->close();
    } else {
        send_response("Failed to prepare the SQL statement: " . $mysqli->error, 500);
    }
} else {
    send_response("Invalid request method or missing horse ID", 400);
}

?>