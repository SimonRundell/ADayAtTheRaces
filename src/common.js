// common functions and components

export const metresToFurlongs = (metres) => {
    const furlongs = metres / 201.168;
    return parseFloat(furlongs.toFixed(1));
}

export const stripRacecourse = (name) => {
    return name.replace(' Racecourse', '');
}

export const removeTextInBrackets = (str) => {
    if (!str || str === '') {
        return '';
    } else {
        return str.replace(/\(.*?\)/g, '');
    }
}

// Function to capitalize the first letter of a string
export const capitalizeFirstLetter = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function calculateOdds(horses, raceover) {
    // Step 1: Calculate the sum of all ratings
    // console.log("Calculating odds for", raceover, " and the following horses", horses);

    const totalRating = horses.reduce((sum, horse) => sum + horse[`horse${capitalizeFirstLetter(raceover)}Rating`], 0);

    // Step 2: Calculate probabilities and odds
    const horsesWithOdds = horses.map(horse => {
        const rating = horse[`horse${capitalizeFirstLetter(raceover)}Rating`];
        const probability = rating / totalRating;
        const decimalOdds = (1 - probability) / probability;
        const fractionalOdds = Math.round(decimalOdds); // Round to nearest integer
        return {
            ...horse, // Include all existing properties of the horse
            id: horse.id, // Include the id property
            probability: (probability * 100).toFixed(2) + "%", // Probability in percentage
            decimalOdds: decimalOdds.toFixed(2), // Odds as decimal
            odds: `${fractionalOdds}/1` // Odds as x/1
        };
    });

    // Step 3: Sort horses by probability (numerical comparison)
    horsesWithOdds.sort((a, b) => parseFloat(b.probability) - parseFloat(a.probability));

    // Step 4: Adjust odds
    if (horsesWithOdds.length > 0) {
        // Adjust the highest probability horse's odds to be half
        horsesWithOdds[0].decimalOdds = (horsesWithOdds[0].decimalOdds / 2).toFixed(2);
        horsesWithOdds[0].odds = `${Math.round(horsesWithOdds[0].decimalOdds)}/1`;
    }

    if (horsesWithOdds.length > 1) {
        // Adjust the two lowest probability horses' odds to be double
        const lastIndex = horsesWithOdds.length - 1;
        horsesWithOdds[lastIndex].decimalOdds = (horsesWithOdds[lastIndex].decimalOdds * 2).toFixed(2);
        horsesWithOdds[lastIndex].odds = `${Math.round(horsesWithOdds[lastIndex].decimalOdds)}/1`;

        if (horsesWithOdds.length > 2) {
            horsesWithOdds[lastIndex - 1].decimalOdds = (horsesWithOdds[lastIndex - 1].decimalOdds * 2).toFixed(2);
            horsesWithOdds[lastIndex - 1].odds = `${Math.round(horsesWithOdds[lastIndex - 1].decimalOdds)}/1`;
        }
    }

    console.log("Horses with odds", horsesWithOdds);

    return horsesWithOdds;
}

