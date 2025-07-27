<?php

include 'setup.php';

$query = "SELECT * FROM tblrace WHERE status = 0 ORDER BY id ASC";

$result = $mysqli->query($query);

if ($result) {
    $races = [];
    while ($row = $result->fetch_assoc()) {
        $races[] = $row;
    }
    send_response($races);
} else {
    send_response("Failed to execute the SQL query: " . $mysqli->error, 500);
}

?>