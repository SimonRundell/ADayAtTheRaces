<?php

include 'setup.php';

// Check that the required parameters are received
if (isset($_GET['view']) && isset($_GET['index'])) {
    $view = $_GET['view'];
    $index = intval($_GET['index']);

    // Prepare the SQL query to get the horse ID at the specified index
    $query = "SELECT id FROM $view LIMIT 1 OFFSET ?";
    $stmt = $mysqli->prepare($query);
    if ($stmt) {
        $stmt->bind_param("i", $index);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($result->num_rows > 0) {
            $row = $result->fetch_assoc();
            send_response(["id" => $row['id']]);
        } else {
            send_response("Horse not found at the specified index", 404);
        }
        $stmt->close();
    } else {
        send_response("Failed to prepare the SQL statement: " . $mysqli->error, 500);
    }
} else {
    send_response("Required parameters not specified", 400);
}

?>