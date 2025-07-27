<?php

include 'setup.php';

$query = "INSERT INTO tbluser (email, passwordHash, nickname) VALUES (?, ?, ?)";

$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info("Prepare failed: " . $mysqli->error);
    send_response("Prepare failed: " . $mysqli->error, 500);
} else {
    $stmt->bind_param("sss", $receivedData['email'], $receivedData['passwordHash'], $receivedData['nickname']);
    if (!$stmt->execute()) {
        log_info("Execute failed: " . $stmt->error);
        send_response("Execute failed: " . $stmt->error, 500);
    } else {
        send_response("User created", 200);
    }
}

$stmt->close();
?>
